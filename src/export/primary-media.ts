import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { PublicListing } from '../domain/public-contract.ts';
import type { ListingRecord } from '../domain/types.ts';
import type { HttpClient } from '../importer/http.ts';
import type { ImportSnapshot } from '../importer/sqlite.ts';
import { publicIdForKey } from './public-snapshot.ts';

type PublicMedia = PublicListing['media'][number];

export interface PrimaryMediaManifest {
  media: Record<string, PublicMedia>;
  sources: Record<string, string>;
  failures: Array<{ record_ref: string; reason: string }>;
}

export interface DownloadPrimaryMediaOptions {
  snapshot: ImportSnapshot;
  curatedListings: readonly PublicListing[];
  eligibleKeys: ReadonlySet<string>;
  outputDirectory: string;
  manifestPath: string;
  http: HttpClient;
}

const EMPTY_MANIFEST: PrimaryMediaManifest = { media: {}, sources: {}, failures: [] };

export async function readPrimaryMediaManifest(path: string): Promise<PrimaryMediaManifest> {
  try {
    const value = JSON.parse(await readFile(path, 'utf8')) as Partial<PrimaryMediaManifest>;
    return {
      media: value.media && typeof value.media === 'object' ? value.media : {},
      sources: value.sources && typeof value.sources === 'object' ? value.sources : {},
      failures: Array.isArray(value.failures) ? value.failures : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return structuredClone(EMPTY_MANIFEST);
    throw error;
  }
}

export function availablePrimaryMedia(
  manifest: PrimaryMediaManifest,
  outputDirectory: string,
): Record<string, PublicMedia> {
  const available: Record<string, PublicMedia> = {};
  for (const [key, media] of Object.entries(manifest.media)) {
    const expected = new RegExp(`^/preview-private/projected/${publicIdForKey(key)}\\.(?:jpg|png|webp)$`);
    const filename = media.public_path.split('/').at(-1);
    if (filename && expected.test(media.public_path) && existsSync(join(outputDirectory, filename))) {
      available[key] = media;
    }
  }
  return available;
}

function hasCuratedPhotograph(listing: ListingRecord, curatedListings: readonly PublicListing[]): boolean {
  const curated = curatedListings.find(item => item.title === listing.title && item.source?.url === listing.sourceUrl);
  return curated?.media.some(media => media.public_path.startsWith('/preview-private/')) === true;
}

function extensionFor(contentType: string | null): string | null {
  const normalized = contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  return null;
}

function failureReason(error: unknown): string {
  if (error && typeof error === 'object' && 'kind' in error && typeof error.kind === 'string') return error.kind;
  return 'download-failed';
}

async function atomicWrite(path: string, value: string | Uint8Array): Promise<void> {
  const destination = resolve(path);
  const temporary = `${destination}.tmp-${process.pid}`;
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, value, { flag: 'wx' });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function downloadPrimaryMedia(options: DownloadPrimaryMediaOptions): Promise<PrimaryMediaManifest> {
  const previous = await readPrimaryMediaManifest(options.manifestPath);
  const result: PrimaryMediaManifest = {
    media: { ...previous.media },
    sources: { ...previous.sources },
    failures: [],
  };
  await mkdir(options.outputDirectory, { recursive: true });
  const activeKeys = new Set(options.snapshot.listings.map(listing => listing.key));
  for (const key of Object.keys(result.media)) {
    if (!activeKeys.has(key)) delete result.media[key];
  }
  for (const key of Object.keys(result.sources)) {
    if (!activeKeys.has(key)) delete result.sources[key];
  }

  for (const listing of options.snapshot.listings) {
    if (!options.eligibleKeys.has(listing.key)
      || listing.notSeenInLastRun || listing.confidential || listing.title.trim() === '' || listing.media.length === 0
      || hasCuratedPhotograph(listing, options.curatedListings)) {
      delete result.media[listing.key];
      delete result.sources[listing.key];
      continue;
    }
    const source = listing.media[0]!;
    const cached = result.media[listing.key];
    const cachedFilename = cached?.public_path.split('/').at(-1);
    if (cached && cachedFilename && result.sources[listing.key] === source.sourceUrl
      && existsSync(join(options.outputDirectory, cachedFilename))) continue;
    delete result.media[listing.key];
    delete result.sources[listing.key];

    const recordRef = publicIdForKey(listing.key);
    try {
      const response = await options.http.get(source.sourceUrl, 'image');
      if (response.status < 200 || response.status >= 300) {
        result.failures.push({ record_ref: recordRef, reason: 'http-status' });
        continue;
      }
      const extension = extensionFor(response.headers.get('content-type'));
      if (!extension) {
        result.failures.push({ record_ref: recordRef, reason: 'unsupported-content-type' });
        continue;
      }
      const filename = `${recordRef}.${extension}`;
      await atomicWrite(join(options.outputDirectory, filename), response.bytes);
      result.media[listing.key] = {
        public_path: `/preview-private/projected/${filename}`,
        width: source.width,
        height: source.height,
        alt: source.alt?.trim() || `Primary photograph of ${listing.title}`,
      };
      result.sources[listing.key] = source.sourceUrl;
    } catch (error) {
      result.failures.push({ record_ref: recordRef, reason: failureReason(error) });
    }
  }

  const retainedFiles = new Set(Object.values(result.media).map(media => media.public_path.split('/').at(-1)));
  for (const entry of await readdir(options.outputDirectory, { withFileTypes: true })) {
    if (entry.isFile() && /^property-[a-f0-9]{16}\.(?:jpg|png|webp)$/.test(entry.name)
      && !retainedFiles.has(entry.name)) {
      await rm(join(options.outputDirectory, entry.name), { force: true });
    }
  }

  await atomicWrite(options.manifestPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
