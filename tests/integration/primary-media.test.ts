import { access, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PublicListing } from '../../src/domain/public-contract.ts';
import type { ListingRecord } from '../../src/domain/types.ts';
import { availablePrimaryMedia, downloadPrimaryMedia } from '../../src/export/primary-media.ts';
import type { HttpClient } from '../../src/importer/http.ts';

function listing(key: string, title: string, first: string, second: string): ListingRecord {
  return {
    key, originSection: 'residential-listing', presentationSection: 'residential', geography: 'jersey',
    sourceOrder: 0, operation: 'sale', statusLiteral: 'FOR SALE', statusNormalised: 'open',
    title, locality: null, confidential: false, descriptionOriginal: null, bedrooms: null, bathrooms: null,
    figures: [], legalNotice: null, sourceUrl: 'https://www.hamptonestatesjersey.com/residential-properties',
    retrievedOn: '2026-10-04', notSeenInLastRun: false,
    media: [
      { sourceUrl: first, sourceFileName: 'first.jpg', width: 800, height: 600, position: 0, localPath: null, alt: null },
      { sourceUrl: second, sourceFileName: 'second.jpg', width: 600, height: 400, position: 1, localPath: null, alt: null },
    ],
  };
}

describe('bounded primary photograph cache', () => {
  it('requests at most the first image, preserves curated photos, caches success and records rejection', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hampton-primary-media-'));
    const outputDirectory = join(root, 'projected');
    const manifestPath = join(root, 'manifest.json');
    const normal = listing('normal', 'Normal Home', 'https://static.wixstatic.com/media/normal.jpg', 'https://static.wixstatic.com/media/never.jpg');
    const curated = listing('curated', 'Curated Home', 'https://static.wixstatic.com/media/curated.jpg', 'https://static.wixstatic.com/media/never-curated.jpg');
    const rejected = listing('rejected', 'Rejected Home', 'https://static.wixstatic.com/media/rejected.svg', 'https://static.wixstatic.com/media/never-rejected.jpg');
    const curatedPublic = {
      title: 'Curated Home', source: { url: curated.sourceUrl, retrieved_on: curated.retrievedOn },
      media: [{ public_path: '/preview-private/curated.avif', width: 415, height: 415, alt: 'Curated photo' }],
    } as PublicListing;
    const requests: string[] = [];
    const http = {
      async get(url: string | URL) {
        const value = String(url);
        requests.push(value);
        const type = value.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
        return { url: value, status: 200, headers: new Headers({ 'content-type': type }), bytes: new Uint8Array([1, 2, 3]) };
      },
      async getText() { throw new Error('not used'); },
      setRobots() {},
    } satisfies HttpClient;

    const first = await downloadPrimaryMedia({
      snapshot: { listings: [normal, curated, rejected], reviewItems: [] },
      curatedListings: [curatedPublic], outputDirectory, manifestPath, http,
      eligibleKeys: new Set([normal.key, curated.key, rejected.key]),
    });

    expect(requests).toEqual([normal.media[0]!.sourceUrl, rejected.media[0]!.sourceUrl]);
    expect(requests).not.toContain(normal.media[1]!.sourceUrl);
    expect(first.media.normal?.public_path).toMatch(/^\/preview-private\/projected\/property-[a-f0-9]{16}\.jpg$/);
    expect(first.media.curated).toBeUndefined();
    expect(first.failures).toEqual([{ record_ref: expect.stringMatching(/^property-/), reason: 'unsupported-content-type' }]);

    const noNetwork = {
      async get() { throw new Error('cache miss'); },
      async getText() { throw new Error('not used'); },
      setRobots() {},
    } satisfies HttpClient;
    const second = await downloadPrimaryMedia({
      snapshot: { listings: [normal], reviewItems: [] },
      curatedListings: [], outputDirectory, manifestPath, http: noNetwork,
      eligibleKeys: new Set([normal.key]),
    });
    expect(second.media).toEqual(first.media);
    expect(JSON.parse(await readFile(manifestPath, 'utf8'))).toEqual(second);

    const changed = listing('normal', 'Normal Home', 'https://static.wixstatic.com/media/replacement.jpg', 'https://static.wixstatic.com/media/never.jpg');
    const failedReplacement = {
      async get() { throw new Error('replacement unavailable'); },
      async getText() { throw new Error('not used'); },
      setRobots() {},
    } satisfies HttpClient;
    const third = await downloadPrimaryMedia({
      snapshot: { listings: [changed], reviewItems: [] },
      curatedListings: [], outputDirectory, manifestPath, http: failedReplacement,
      eligibleKeys: new Set([changed.key]),
    });
    expect(third.media.normal).toBeUndefined();
    expect(third.sources.normal).toBeUndefined();
    expect(third.failures).toEqual([{ record_ref: expect.stringMatching(/^property-/), reason: 'download-failed' }]);
    const oldFilename = first.media.normal!.public_path.split('/').at(-1)!;
    await expect(access(join(outputDirectory, oldFilename))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(availablePrimaryMedia(first, outputDirectory)).toEqual({});
  });

  it('purges a previously cached file when the listing is no longer publicly eligible', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hampton-primary-media-ineligible-'));
    const outputDirectory = join(root, 'projected');
    const manifestPath = join(root, 'manifest.json');
    const normal = listing('normal', 'Normal Home', 'https://static.wixstatic.com/media/normal.jpg', 'https://static.wixstatic.com/media/never.jpg');
    const http = {
      async get(url: string | URL) {
        return { url: String(url), status: 200, headers: new Headers({ 'content-type': 'image/jpeg' }), bytes: new Uint8Array([1]) };
      },
      async getText() { throw new Error('not used'); },
      setRobots() {},
    } satisfies HttpClient;
    const cached = await downloadPrimaryMedia({
      snapshot: { listings: [normal], reviewItems: [] }, curatedListings: [],
      eligibleKeys: new Set([normal.key]), outputDirectory, manifestPath, http,
    });
    const filename = cached.media.normal!.public_path.split('/').at(-1)!;

    const purged = await downloadPrimaryMedia({
      snapshot: { listings: [normal], reviewItems: [] }, curatedListings: [],
      eligibleKeys: new Set(), outputDirectory, manifestPath,
      http: { ...http, async get() { throw new Error('ineligible listing requested'); } },
    });

    expect(purged.media).toEqual({});
    await expect(access(join(outputDirectory, filename))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
