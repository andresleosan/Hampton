import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEmbeddedListings } from '../../../src/importer/parser.ts';

const fixturePath = fileURLToPath(new URL('../../fixtures/importer/embedded-listings.html', import.meta.url));
const html = readFileSync(fixturePath, 'utf8');
const realResidential = readFileSync(fileURLToPath(new URL('../../fixtures/importer/wix-real-residential.html', import.meta.url)), 'utf8');
const realCommercialPage1 = readFileSync(fileURLToPath(new URL('../../fixtures/importer/wix-real-commercial-page1.html', import.meta.url)), 'utf8');
const context = {
  sourceUrl: 'https://www.hamptonestatesjersey.com/properties',
  retrievedAt: '2026-10-04T12:00:00.000Z',
  originSection: 'residential-listing' as const,
};

describe('parseEmbeddedListings', () => {
  it('reads synthetic Hampton-shaped embedded JSON without executing source HTML', () => {
    const result = parseEmbeddedListings(html, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      key: 'wix:victoria-street-demo',
      title: 'Victoria Street',
      operation: 'sale',
      statusLiteral: 'FOR SALE',
      statusNormalised: 'open',
      sourceUrl: 'https://www.hamptonestatesjersey.com/property/victoria-street-demo',
    });
    expect(result.records[0]?.title).not.toContain('<');
    expect(result.records[0]?.figures[0]).toMatchObject({ amountPence: 47_500_000, originalText: '£475,000' });
    expect(result.records[0]?.media[0]).toMatchObject({
      sourceUrl: 'https://static.wixstatic.com/media/demo-victoria.jpg',
      width: 1600,
      height: 1067,
    });
    expect(result.records[1]?.figures[0]).toMatchObject({
      amountPence: 190_000,
      type: 'rent',
      period: 'month',
    });
  });

  it('rejects a missing, truncated, empty or still-paginated data block', () => {
    expect(parseEmbeddedListings('<html></html>', context)).toMatchObject({ ok: false });
    expect(parseEmbeddedListings(html.replace('</html>', ''), context)).toMatchObject({ ok: false });
    const empty = html.replace(/"items": \[[\s\S]*?\]\s*\n\s*}/, '"items": []\n      }');
    expect(parseEmbeddedListings(empty, context)).toMatchObject({ ok: false });
    expect(parseEmbeddedListings(html.replace('"hasNext": false', '"hasNext": true'), context)).toMatchObject({ ok: false });
  });

  it('parses the real Wix residential store shape and preserves source literals', () => {
    const result = parseEmbeddedListings(realResidential, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.discovery).toEqual({ kind: 'dataset', currentPage: 1, totalPages: 1, complete: true });
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      key: 'wix:11111111-1111-4111-8111-111111111111',
      title: 'Example Cottage',
      statusLiteral: 'FOR SALE',
      sourceUrl: context.sourceUrl,
      bedrooms: 3,
      bathrooms: 1,
    });
    expect(result.records[0]?.figures[0]).toMatchObject({ originalText: '£650,000', amountPence: 65_000_000 });
    expect(result.records[0]?.media).toEqual([
      expect.objectContaining({ sourceUrl: 'https://static.wixstatic.com/media/demo_main~mv2.jpg', width: 1200, height: 800, position: 0 }),
      expect.objectContaining({ sourceUrl: 'https://static.wixstatic.com/media/demo_garden~mv2.jpg', width: 1000, height: 700, position: 1 }),
    ]);
  });

  it('rejects a real Wix residential store without a coherent positive end signal', () => {
    const incomplete = realResidential.replace('"loaded": 2', '"loaded": 1');
    expect(parseEmbeddedListings(incomplete, context)).toMatchObject({ ok: false, cause: expect.stringMatching(/dataset.*complete|end signal/i) });
  });

  it('preserves a Wix million-suffix price literal while normalising its value', () => {
    const millionPrice = realResidential.replace('£650,000', '£4.75m');
    const result = parseEmbeddedListings(millionPrice, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records[0]?.figures[0]).toMatchObject({ originalText: '£4.75m', amountPence: 475_000_000 });
  });

  it('parses coherent commercial SSR groups and reports explicit pagination', () => {
    const result = parseEmbeddedListings(realCommercialPage1, {
      ...context,
      sourceUrl: 'https://www.hamptonestatesjersey.com/commercial-properties',
      originSection: 'commercial-sitemap',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.discovery).toEqual({ kind: 'ssr-pagination', currentPage: 1, totalPages: 2, complete: false });
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      key: 'wix:33333333-3333-4333-8333-333333333333',
      presentationSection: 'commercial',
      statusLiteral: 'For Sale',
      title: 'Example Café',
      locality: 'Confidential',
      sourceUrl: 'https://www.hamptonestatesjersey.com/commercial-properties/example-cafe',
    });
    expect(result.records[0]?.figures[0]).toMatchObject({ originalText: '£95,000', amountPence: 9_500_000 });
  });

  it('rejects an incomplete commercial SSR group instead of silently returning a partial record', () => {
    const incomplete = realCommercialPage1.replace('"comp-ke8ur8bf__44444444-4444-4444-8444-444444444444"', '"unrelated-component__44444444-4444-4444-8444-444444444444"');
    expect(parseEmbeddedListings(incomplete, {
      ...context,
      sourceUrl: 'https://www.hamptonestatesjersey.com/commercial-properties',
      originSection: 'commercial-sitemap',
    })).toMatchObject({ ok: false, cause: expect.stringMatching(/SSR group.*coherent/i) });
  });

  it('rejects orphaned commercial SSR components when the title component is missing', () => {
    const orphaned = realCommercialPage1.replace('"comp-ke8ur893__44444444-4444-4444-8444-444444444444"', '"unrelated-title__44444444-4444-4444-8444-444444444444"');
    expect(parseEmbeddedListings(orphaned, {
      ...context,
      sourceUrl: 'https://www.hamptonestatesjersey.com/commercial-properties',
      originSection: 'commercial-sitemap',
    })).toMatchObject({ ok: false, cause: expect.stringMatching(/SSR group.*coherent/i) });
  });
});
