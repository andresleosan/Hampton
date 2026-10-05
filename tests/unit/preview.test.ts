import { describe, expect, it } from 'vitest';
import { demoData } from '../../src/data/demo.ts';
import * as preview from '../../src/data/preview.ts';
describe('versioned public listing preview', () => {
  it('loads the filtered public snapshot committed with the site', () => {
    expect(preview.DEFAULT_PUBLIC_SNAPSHOT_PATH).toBe('src/data/public-snapshot.json');
  });
  it('dates available listing photographs instead of marking them unavailable', () => {
    const listing = { ...demoData.listings[0],
      source: { url: 'https://www.hamptonestatesjersey.com/residential-properties', retrieved_on: '2026-10-04' },
      media: [{ public_path: '/preview-private/example.avif', width: 415, height: 415, alt: 'Living room' }],
    };
    expect(preview.photographLabel(listing)).toBe('Verified listing snapshot · checked 4 October 2026');
    expect(preview.photographLabel({ ...listing, media: [{ ...listing.media[0], public_path: '/illustrations/photograph-unavailable.svg' }] })).toBe('Property photograph unavailable in this demo preview');
    expect(preview.photographLabel(demoData.listings[0])).toBe('Demo illustration · fictional property, not a photograph');
  });
  it('loads a sourced snapshot without describing it as fictional', async () => {
    expect(preview.loadPreviewData).toBeTypeOf('function');
    const snapshot = { ...demoData, listings: [{ ...demoData.listings[0], title: 'Victoria Street', source: { url: 'https://www.hamptonestatesjersey.com/residential-properties', retrieved_on: '2026-10-04' } }] };
    const loaded = await preview.loadPreviewData(async () => JSON.stringify(snapshot));
    expect(loaded.listings[0].title).toBe('Victoria Street');
    expect(preview.listingLabel(loaded.listings[0])).toBe('Real Hampton listing snapshot · checked 4 October 2026 · demo preview');
  });
  it('uses labelled synthetic fallback only when a test or development caller supplies it explicitly', async () => {
    expect(preview.loadPreviewData).toBeTypeOf('function');
    const data = await preview.loadPreviewData(
      async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); },
      demoData,
    );
    expect(data).toEqual(demoData);
    expect(preview.listingLabel(data.listings[0])).toBe('Demo property — fictional');
  });
  it('fails a normal build when the committed public snapshot is absent', async () => {
    await expect(preview.loadPreviewData(async () => {
      throw Object.assign(new Error('missing public snapshot'), { code: 'ENOENT' });
    })).rejects.toThrow('missing public snapshot');
  });
  it('fails loudly for unreadable or malformed public data instead of hiding it', async () => {
    expect(preview.loadPreviewData).toBeTypeOf('function');
    await expect(preview.loadPreviewData(async () => 'invalid json')).rejects.toThrow();
    await expect(preview.loadPreviewData(async () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); })).rejects.toThrow('denied');
  });
});
