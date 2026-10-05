import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readSnapshot } from '../../../src/importer/sqlite.ts';
import { formatImportSummary, runImport } from '../../../src/importer/run.ts';

const origin = 'https://www.hamptonestatesjersey.com';
const publicResolve = async () => [{ address: '93.184.216.34', family: 4 }];
const fixturePath = fileURLToPath(new URL('../../fixtures/importer/embedded-listings.html', import.meta.url));
const residentialHtml = readFileSync(fixturePath, 'utf8');
const realResidentialHtml = readFileSync(fileURLToPath(new URL('../../fixtures/importer/wix-real-residential.html', import.meta.url)), 'utf8');
const realCommercialPage1 = readFileSync(fileURLToPath(new URL('../../fixtures/importer/wix-real-commercial-page1.html', import.meta.url)), 'utf8');
const realCommercialPage2 = readFileSync(fileURLToPath(new URL('../../fixtures/importer/wix-real-commercial-page2.html', import.meta.url)), 'utf8');
const commercialHtml = residentialHtml
  .replaceAll('victoria-street-demo', 'commercial-one-demo')
  .replaceAll('trinity-rental-demo', 'commercial-two-demo');

function fakeSite(routes: Readonly<Record<string, Response | Error>>) {
  const hits: string[] = [];
  const fetch = async (input: string | URL): Promise<Response> => {
    const url = String(input);
    hits.push(url);
    const result = routes[url];
    if (!result) return new Response('missing', { status: 404 });
    if (result instanceof Error) throw result;
    return result.clone();
  };
  return { fetch, hits };
}

describe('runImport', () => {
  it('discovers configured residential, commercial and team sources, writes SQLite, and returns a summary', async () => {
    const outputPath = join(await mkdtemp(join(tmpdir(), 'hampton-import-')), 'provisional.sqlite');
    const site = fakeSite({
      [`${origin}/robots.txt`]: new Response('', { status: 404 }),
      [`${origin}/residential-properties`]: new Response(residentialHtml),
      [`${origin}/commercial-properties`]: new Response(commercialHtml),
      [`${origin}/meet-the-team`]: new Response('<html><body>Team snapshot</body></html>'),
    });
    let time = 0;

    const summary = await runImport({
      outputPath,
      sources: {
        residentialUrl: `${origin}/residential-properties`,
        commercialUrls: [`${origin}/commercial-properties`],
        teamUrl: `${origin}/meet-the-team`,
      },
      fetch: site.fetch,
      resolve: publicResolve,
      now: () => new Date('2026-10-04T12:00:00.000Z'),
      monotonicNow: () => time,
      sleep: async (ms) => { time += ms; },
    });

    expect(summary).toMatchObject({
      complete: true,
      outputPath,
      counts: { listings: 4, residential: 2, commercial: 2, pending: 0, errors: 0 },
      sources: { residential: 'complete', commercial: 'complete', team: 'complete' },
    });
    expect(existsSync(outputPath)).toBe(true);
    const snapshot = readSnapshot(outputPath);
    expect(snapshot.listings).toHaveLength(4);
    expect(snapshot.listings.filter((listing) => listing.originSection === 'commercial-sitemap')).toHaveLength(2);
    expect(formatImportSummary(summary)).toContain('Import complete - provisional SQLite written');
    expect(formatImportSummary(summary)).toContain('Listings: 4 (residential 2, commercial 2)');
  });

  it('does not write a partial SQLite file when a supplied discovery source fails', async () => {
    const outputPath = join(await mkdtemp(join(tmpdir(), 'hampton-import-')), 'provisional.sqlite');
    const site = fakeSite({
      [`${origin}/robots.txt`]: new Response('', { status: 404 }),
      [`${origin}/residential-properties`]: new Response(residentialHtml),
      [`${origin}/meet-the-team`]: new Response('temporary failure', { status: 503 }),
    });
    let time = 0;

    const summary = await runImport({
      outputPath,
      sources: {
        residentialUrl: `${origin}/residential-properties`,
        teamUrl: `${origin}/meet-the-team`,
      },
      fetch: site.fetch,
      resolve: publicResolve,
      now: () => new Date('2026-10-04T12:00:00.000Z'),
      monotonicNow: () => time,
      sleep: async (ms) => { time += ms; },
      limits: { retryDelaysMs: [0, 0] },
    });

    expect(summary.complete).toBe(false);
    expect(summary.cause).toMatch(/team.*status/i);
    expect(summary.sources.team).toBe('failed');
    expect(summary.counts.errors).toBe(1);
    expect(existsSync(outputPath)).toBe(false);
    expect(formatImportSummary(summary)).toContain('Import INCOMPLETE');
  });

  it('accepts a real-shape residential store and a complete set of commercial SSR pages', async () => {
    const outputPath = join(await mkdtemp(join(tmpdir(), 'hampton-import-')), 'provisional.sqlite');
    const site = fakeSite({
      [`${origin}/robots.txt`]: new Response('', { status: 404 }),
      [`${origin}/residential-properties`]: new Response(realResidentialHtml),
      [`${origin}/commercial-properties?page=1`]: new Response(realCommercialPage1),
      [`${origin}/commercial-properties?page=2`]: new Response(realCommercialPage2),
    });
    let time = 0;

    const summary = await runImport({
      outputPath,
      sources: {
        residentialUrl: `${origin}/residential-properties`,
        commercialUrls: [`${origin}/commercial-properties?page=1`, `${origin}/commercial-properties?page=2`],
      },
      fetch: site.fetch,
      resolve: publicResolve,
      now: () => new Date('2026-10-04T12:00:00.000Z'),
      monotonicNow: () => time,
      sleep: async (ms) => { time += ms; },
    });

    expect(summary).toMatchObject({ complete: true, counts: { listings: 5, residential: 2, commercial: 3 } });
    expect(readSnapshot(outputPath).listings.filter((listing) => listing.presentationSection === 'commercial')).toHaveLength(3);
  });

  it('does not write SQLite when the configured commercial SSR pages do not cover totalPages', async () => {
    const outputPath = join(await mkdtemp(join(tmpdir(), 'hampton-import-')), 'provisional.sqlite');
    const site = fakeSite({
      [`${origin}/robots.txt`]: new Response('', { status: 404 }),
      [`${origin}/residential-properties`]: new Response(realResidentialHtml),
      [`${origin}/commercial-properties?page=1`]: new Response(realCommercialPage1),
    });
    let time = 0;

    const summary = await runImport({
      outputPath,
      sources: {
        residentialUrl: `${origin}/residential-properties`,
        commercialUrls: [`${origin}/commercial-properties?page=1`],
      },
      fetch: site.fetch,
      resolve: publicResolve,
      now: () => new Date('2026-10-04T12:00:00.000Z'),
      monotonicNow: () => time,
      sleep: async (ms) => { time += ms; },
    });

    expect(summary.complete).toBe(false);
    expect(summary.cause).toMatch(/commercial.*pages.*2/i);
    expect(existsSync(outputPath)).toBe(false);
  });
});
