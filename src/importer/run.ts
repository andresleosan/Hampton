import type { ListingRecord, OriginSection, ReviewItem } from '../domain/types.ts';
import {
  HttpFailure,
  createHttpClient,
  type FetchLike,
  type HttpClient,
  type ImportLimits,
} from './http.ts';
import { parseEmbeddedListings, type DiscoverySignal } from './parser.ts';
import { writeProvisionalSnapshot } from './sqlite.ts';

export interface ImportSources {
  residentialUrl: string;
  commercialUrls?: readonly string[];
  teamUrl?: string;
}

export type SourceStatus = 'complete' | 'failed' | 'not-configured';

export interface ImportSummary {
  complete: boolean;
  cause: string | null;
  outputPath: string;
  runId: string;
  sources: {
    residential: SourceStatus;
    commercial: SourceStatus;
    team: SourceStatus;
  };
  counts: {
    listings: number;
    residential: number;
    commercial: number;
    pending: number;
    errors: number;
  };
  errors: string[];
}

export interface RunImportOptions {
  outputPath: string;
  sources: ImportSources;
  fetch?: FetchLike;
  resolve?: (hostname: string) => Promise<readonly { address: string; family: number }[]>;
  http?: HttpClient;
  limits?: Partial<ImportLimits>;
  now?: () => Date;
  monotonicNow?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}

function runIdFor(date: Date): string {
  return `run-${date.toISOString().replace(/[:.]/g, '-')}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof HttpFailure) return `${error.kind}${error.status ? ` HTTP ${error.status}` : ''}`;
  return error instanceof Error ? error.message : String(error);
}

function emptySummary(outputPath: string, runId: string, sources: ImportSources): ImportSummary {
  return {
    complete: false,
    cause: null,
    outputPath,
    runId,
    sources: {
      residential: 'failed',
      commercial: sources.commercialUrls?.length ? 'failed' : 'not-configured',
      team: sources.teamUrl ? 'failed' : 'not-configured',
    },
    counts: { listings: 0, residential: 0, commercial: 0, pending: 0, errors: 0 },
    errors: [],
  };
}

function fail(summary: ImportSummary, section: keyof ImportSummary['sources'], error: unknown): ImportSummary {
  const message = `${section}: ${errorMessage(error)}`;
  summary.sources[section] = 'failed';
  summary.cause = message;
  summary.errors.push(message);
  summary.counts.errors = summary.errors.length;
  return summary;
}

function parseListings(
  html: string,
  sourceUrl: string,
  retrievedAt: string,
  originSection: OriginSection,
): { listings: ListingRecord[]; review: ReviewItem[]; discovery: DiscoverySignal } {
  const result = parseEmbeddedListings(html, {
    sourceUrl,
    retrievedAt,
    originSection,
  });
  if (!result.ok) throw new Error(result.cause);
  return { listings: result.records, review: result.review, discovery: result.discovery };
}

function assertCompleteHtml(html: string): void {
  if (!/<\/html\s*>\s*$/i.test(html.trim())) throw new Error('source document is truncated');
  if (!/<body\b[^>]*>[\s\S]*\S[\s\S]*<\/body\s*>/i.test(html)) throw new Error('source returned no discoverable content');
}

/** Runs controlled, sequential discovery and writes SQLite only after every configured source completes. */
export async function runImport(options: RunImportOptions): Promise<ImportSummary> {
  const wallClock = options.now ?? (() => new Date());
  const startedAt = wallClock();
  const runId = runIdFor(startedAt);
  const summary = emptySummary(options.outputPath, runId, options.sources);
  const http = options.http ?? createHttpClient({
    fetch: options.fetch,
    resolve: options.resolve,
    limits: options.limits,
    now: options.monotonicNow,
    sleep: options.sleep,
  });
  const listings: ListingRecord[] = [];
  const reviewItems: ReviewItem[] = [];

  try {
    const response = await http.getText(options.sources.residentialUrl, 'page');
    const parsed = parseListings(response.body, response.url, startedAt.toISOString(), 'residential-listing');
    if (!parsed.discovery.complete) throw new Error('residential discovery has no positive end signal');
    listings.push(...parsed.listings);
    reviewItems.push(...parsed.review);
    summary.sources.residential = 'complete';
    summary.counts.residential = parsed.listings.length;
  } catch (error) {
    return fail(summary, 'residential', error);
  }

  if (options.sources.commercialUrls?.length) {
    try {
      const discoveries: DiscoverySignal[] = [];
      for (const url of options.sources.commercialUrls) {
        const response = await http.getText(url, 'page');
        const parsed = parseListings(response.body, response.url, startedAt.toISOString(), 'commercial-sitemap');
        listings.push(...parsed.listings);
        reviewItems.push(...parsed.review);
        summary.counts.commercial += parsed.listings.length;
        discoveries.push(parsed.discovery);
      }
      const kinds = new Set(discoveries.map((signal) => signal.kind));
      const totals = new Set(discoveries.map((signal) => signal.totalPages));
      const pages = new Set(discoveries.map((signal) => signal.currentPage));
      const totalPages = discoveries[0]?.totalPages ?? 0;
      if (kinds.size !== 1 || totals.size !== 1 || totalPages < 1 || pages.size !== discoveries.length
          || pages.size !== totalPages || Array.from({ length: totalPages }, (_value, index) => index + 1).some((page) => !pages.has(page))) {
        throw new Error(`commercial discovery pages do not cover 1..${totalPages || 'unknown'}`);
      }
      summary.sources.commercial = 'complete';
    } catch (error) {
      return fail(summary, 'commercial', error);
    }
  }

  if (options.sources.teamUrl) {
    try {
      const response = await http.getText(options.sources.teamUrl, 'page');
      assertCompleteHtml(response.body);
      summary.sources.team = 'complete';
    } catch (error) {
      return fail(summary, 'team', error);
    }
  }

  const keys = new Set<string>();
  for (const [sourceOrder, listing] of listings.entries()) {
    if (keys.has(listing.key)) return fail(summary, listing.presentationSection, new Error(`duplicate listing key ${listing.key}`));
    keys.add(listing.key);
    listing.sourceOrder = sourceOrder;
  }
  if (listings.length === 0) return fail(summary, 'residential', new Error('source returned zero listings'));

  summary.counts.listings = listings.length;
  summary.counts.pending = reviewItems.length;
  try {
    const finishedAt = wallClock();
    writeProvisionalSnapshot(options.outputPath, { listings, reviewItems }, {
      id: runId,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    });
  } catch (error) {
    summary.cause = `sqlite: ${errorMessage(error)}`;
    summary.errors.push(summary.cause);
    summary.counts.errors = summary.errors.length;
    return summary;
  }

  summary.complete = true;
  return summary;
}

export function formatImportSummary(summary: ImportSummary): string {
  const lines = [
    summary.complete ? 'Import complete - provisional SQLite written' : `Import INCOMPLETE${summary.cause ? `: ${summary.cause}` : ''}`,
    `Run: ${summary.runId}`,
    `SQLite: ${summary.outputPath}`,
    `Sources: residential=${summary.sources.residential}, commercial=${summary.sources.commercial}, team=${summary.sources.team}`,
    `Listings: ${summary.counts.listings} (residential ${summary.counts.residential}, commercial ${summary.counts.commercial})`,
    `Pending: ${summary.counts.pending}`,
    `Errors: ${summary.counts.errors}`,
  ];
  if (summary.errors.length) lines.push(...summary.errors.map((error) => `- ${error}`));
  return lines.join('\n');
}
