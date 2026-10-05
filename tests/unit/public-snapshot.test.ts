import { describe, expect, it } from 'vitest';
import type { ListingRecord, ReviewItem } from '../../src/domain/types.ts';
import { projectPublicSnapshot, publicIdForKey } from '../../src/export/public-snapshot.ts';

function listing(overrides: Partial<ListingRecord> = {}): ListingRecord {
  return {
    key: 'wix:private-source-key',
    originSection: 'residential-listing',
    presentationSection: 'residential',
    geography: 'jersey',
    sourceOrder: 4,
    operation: 'sale',
    statusLiteral: 'FOR SALE',
    statusNormalised: 'open',
    title: 'Example Home',
    locality: 'St Helier',
    confidential: false,
    descriptionOriginal: 'PRIVATE_DESCRIPTION_SENTINEL',
    bedrooms: 2,
    bathrooms: 1,
    figures: [{
      type: 'sale_price', amountPence: 450_000_00, currency: 'GBP', period: null,
      originalText: '£450,000', underReview: false,
    }],
    media: [{
      sourceUrl: 'https://static.example/PRIVATE_MEDIA_SENTINEL.jpg',
      sourceFileName: 'PRIVATE_MEDIA_SENTINEL.jpg', width: 1200, height: 900,
      position: 0, localPath: null, alt: null,
    }],
    legalNotice: null,
    sourceUrl: 'https://www.hamptonestatesjersey.com/residential-properties',
    retrievedOn: '2026-10-04',
    notSeenInLastRun: false,
    ...overrides,
  };
}

function review(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: 'review-private', entityKey: 'wix:private-source-key', field: 'price', kind: 'figure',
    originalValue: 'PRIVATE_REVIEW_VALUE', reason: 'PRIVATE_REVIEW_REASON',
    sourceUrl: 'https://example.invalid/private-review', retrievedAt: '2026-10-04T00:00:00Z',
    ...overrides,
  };
}

describe('private SQLite to public snapshot projection', () => {
  it('exports only the closed public contract and removes pending values', () => {
    const result = projectPublicSnapshot(
      { listings: [listing()], reviewItems: [review()] },
      {
        agents: [{
          public_id: 'agent-one', name: 'Agent One', role: 'Negotiator', phones: ['01534 000000'],
          email: 'office@example.com', portrait: null,
        }],
        curatedListings: [],
      },
    );

    expect(result.data.listings).toHaveLength(1);
    expect(result.data.listings[0]).toMatchObject({
      title: 'Example Home', description_public: null, description_withheld: false,
      figures: [], calculator: null,
      media: [{
        public_path: '/illustrations/photograph-unavailable.svg', width: 1200, height: 900,
        alt: 'Photograph unavailable for Example Home',
      }],
    });
    expect(Object.keys(result.data.listings[0] ?? {})).toEqual([
      'public_id', 'section', 'geography', 'tab', 'source_order', 'operation',
      'status_literal', 'status_normalised', 'title', 'locality', 'description_public',
      'description_withheld', 'bedrooms', 'bathrooms', 'figures', 'media', 'legal_notice',
      'source', 'similar_ids', 'calculator', 'demo',
    ]);
    expect(result.report.omittedValues).toEqual([{ record_ref: result.data.listings[0]?.public_id, field: 'price' }]);
    const publicJson = JSON.stringify(result.data);
    for (const privateValue of [
      'PRIVATE_DESCRIPTION_SENTINEL', 'PRIVATE_MEDIA_SENTINEL', 'PRIVATE_REVIEW_VALUE',
      'PRIVATE_REVIEW_REASON', 'originalText', 'localPath', 'sourceFileName',
    ]) expect(publicJson).not.toContain(privateValue);
  });

  it('excludes ineligible records and reports only opaque references and reasons', () => {
    const excluded = [
      listing({ key: 'not-seen', title: 'Not Seen', notSeenInLastRun: true }),
      listing({ key: 'empty-title', title: '' }),
      listing({ key: 'confidential', title: 'PRIVATE_CONFIDENTIAL_TITLE', confidential: true }),
      listing({ key: 'no-tab', title: 'Unknown operation', operation: 'unknown' }),
    ];
    const result = projectPublicSnapshot({ listings: excluded, reviewItems: [] }, { agents: [], curatedListings: [] });

    expect(result.data.listings).toEqual([]);
    expect(result.report.excluded.map(item => item.reason)).toEqual([
      'not-seen', 'empty-title', 'confidential-unresolved', 'no-public-tab',
    ]);
    expect(JSON.stringify(result.report)).not.toContain('PRIVATE_CONFIDENTIAL_TITLE');
  });

  it('excludes a listing when a pending field cannot be safely omitted', () => {
    const result = projectPublicSnapshot(
      { listings: [listing()], reviewItems: [review({ field: 'title' })] },
      { agents: [], curatedListings: [] },
    );

    expect(result.data.listings).toEqual([]);
    expect(result.report.excluded).toEqual([{
      record_ref: publicIdForKey('wix:private-source-key'),
      reason: 'pending-unresolved',
    }]);
  });

  it('applies approved private overrides, ranks each group and produces stable opaque ids', () => {
    const a = listing({ key: 'source-a', title: 'Alpha', sourceOrder: 9 });
    const b = listing({ key: 'source-b', title: 'Beta', sourceOrder: 2 });
    const result = projectPublicSnapshot(
      { listings: [a, b], reviewItems: [] },
      {
        agents: [], curatedListings: [],
        overrides: { 'source-a': { presentationSection: 'commercial' } },
      },
    );
    const repeated = projectPublicSnapshot(
      { listings: [a, b], reviewItems: [] },
      {
        agents: [], curatedListings: [],
        overrides: { 'source-a': { presentationSection: 'commercial' } },
      },
    );

    expect(result).toEqual(repeated);
    expect(result.data.listings.map(item => [item.title, item.section, item.tab, item.source_order])).toEqual([
      ['Alpha', 'commercial', null, 0],
      ['Beta', 'residential', 'for-sale', 0],
    ]);
    for (const item of result.data.listings) {
      expect(item.public_id).toMatch(/^property-[a-f0-9]{16}$/);
      expect(item.public_id).not.toContain(item.title.toLowerCase());
      expect(item.public_id).not.toContain('source');
    }
  });

  it('calculates reviewed mortgage inputs and similar ids only among exported listings', () => {
    const reference = listing({ key: 'reference', title: 'Reference', sourceOrder: 0 });
    const candidate = listing({
      key: 'candidate', title: 'Candidate', sourceOrder: 1,
      figures: [{
        type: 'sale_price', amountPence: 500_000_00, currency: 'GBP', period: null,
        originalText: '£500,000', underReview: false,
      }],
    });
    const result = projectPublicSnapshot(
      { listings: [reference, candidate], reviewItems: [] },
      { agents: [], curatedListings: [] },
    );
    const byTitle = new Map(result.data.listings.map(item => [item.title, item]));

    expect(byTitle.get('Reference')?.calculator).toEqual({ price_gbp: 450_000 });
    expect(byTitle.get('Reference')?.similar_ids).toEqual([byTitle.get('Candidate')?.public_id]);
    expect(byTitle.get('Candidate')?.similar_ids).toEqual([byTitle.get('Reference')?.public_id]);
  });

  it('uses only curated local media and demo flags that match a source snapshot', () => {
    const source = listing({ title: 'Curated Home' });
    const curated = {
      ...projectPublicSnapshot({ listings: [source], reviewItems: [] }, { agents: [], curatedListings: [] }).data.listings[0]!,
      public_id: 'old-id',
      media: [{ public_path: '/preview-private/curated.avif', width: 415, height: 415, alt: 'Curated photo' }],
      demo: { aerial: null, tour3d: true },
    };
    const result = projectPublicSnapshot(
      { listings: [source], reviewItems: [] },
      { agents: [], curatedListings: [curated] },
    );

    expect(result.data.listings[0]?.media).toEqual(curated.media);
    expect(result.data.listings[0]?.demo).toEqual(curated.demo);
    expect(result.data.listings[0]?.public_id).not.toBe('old-id');
  });

  it('uses a downloaded primary image when no verified curated photograph exists', () => {
    const source = listing({ key: 'downloaded', title: 'Downloaded Home' });
    const downloadedPath = `/preview-private/projected/${publicIdForKey(source.key)}.jpg`;
    const curatedPlaceholder = projectPublicSnapshot(
      { listings: [source], reviewItems: [] },
      { agents: [], curatedListings: [] },
    ).data.listings[0]!;
    const result = projectPublicSnapshot(
      { listings: [source], reviewItems: [] },
      {
        agents: [], curatedListings: [curatedPlaceholder],
        cachedMedia: {
          downloaded: {
            public_path: downloadedPath,
            width: 800,
            height: 600,
            alt: 'Primary photograph of Downloaded Home',
          },
        },
      },
    );

    expect(result.data.listings[0]?.media).toEqual([{
      public_path: downloadedPath,
      width: 800,
      height: 600,
      alt: 'Primary photograph of Downloaded Home',
    }]);
  });

  it('rejects cached media paths that are not the expected opaque local file', () => {
    const source = listing({ key: 'downloaded', title: 'Downloaded Home' });
    const result = projectPublicSnapshot(
      { listings: [source], reviewItems: [] },
      {
        agents: [], curatedListings: [],
        cachedMedia: {
          downloaded: {
            public_path: '/preview-private/projected/../../private-source.jpg',
            width: 800, height: 600, alt: 'Untrusted path',
          },
        },
      },
    );

    expect(result.data.listings[0]?.media[0]?.public_path).toBe('/illustrations/photograph-unavailable.svg');
  });

  it('strips unlisted nested keys from curated media, agents, legal notices and tour configuration', () => {
    const source = listing({
      title: 'Strict Contract',
      legalNotice: { disclaimer: 'Public disclaimer', aml: 'Public AML', privateSentinel: 'LEGAL_SECRET' } as never,
    });
    const baseline = projectPublicSnapshot(
      { listings: [source], reviewItems: [] },
      { agents: [], curatedListings: [] },
    ).data.listings[0]!;
    const result = projectPublicSnapshot(
      { listings: [source], reviewItems: [] },
      {
        curatedListings: [{
          ...baseline,
          media: [{
            public_path: '/preview-private/strict.avif', width: 415, height: 415,
            alt: 'Strict photo', privateSentinel: 'MEDIA_SECRET',
          } as never],
        }],
        agents: [{
          public_id: 'agent-one', name: 'Agent One', role: 'Negotiator', phones: [], email: null,
          portrait: {
            public_path: '/preview-private/agent.avif', width: 415, height: 415,
            alt: 'Agent portrait', privateSentinel: 'PORTRAIT_SECRET',
          } as never,
          privateSentinel: 'AGENT_SECRET',
        } as never],
        tour3d: {
          provider_origin: 'https://sketchfab.com', embed_url: 'https://sketchfab.com/models/6fc3a756dacd40af8c6e4e3b8e674ea2/embed?dnt=1',
          model_uid: '6fc3a756dacd40af8c6e4e3b8e674ea2',
          model_title: 'Example', author: 'Author', author_url: 'https://example.com',
          licence: 'CC BY 4.0', licence_url: 'https://creativecommons.org/licenses/by/4.0/',
          evidence_ref: 'R-12', label_en: 'Example - not this property', privateSentinel: 'TOUR_SECRET',
          guided_stops: [{ id: 'kitchen', label_en: 'Kitchen', eye: [1, 2, 3], target: [4, 5, 6] }],
          transit_waypoints: [{ after_stop: 'kitchen', eye: [2, 3, 4], target: [5, 6, 7] }],
        } as never,
      },
    );

    expect(JSON.stringify(result.data)).not.toMatch(/(LEGAL|MEDIA|PORTRAIT|AGENT|TOUR)_SECRET/);
    expect(Object.keys(result.data.listings[0]!.media[0]!)).toEqual(['public_path', 'width', 'height', 'alt']);
    expect(Object.keys(result.data.agents[0]!.portrait!)).toEqual(['public_path', 'width', 'height', 'alt']);
    expect(Object.keys(result.data.tour3d!)).toEqual([
      'provider_origin', 'embed_url', 'model_title', 'author', 'author_url',
      'model_uid', 'licence', 'licence_url', 'evidence_ref', 'label_en',
      'guided_stops', 'transit_waypoints',
    ]);
    expect(Object.keys(result.data.tour3d!.guided_stops[0]!)).toEqual(['id', 'label_en', 'eye', 'target']);
    expect(Object.keys(result.data.tour3d!.transit_waypoints[0]!)).toEqual(['after_stop', 'eye', 'target']);
  });

  it('fails projection for an invalid 3D configuration instead of silently publishing it', () => {
    expect(() => projectPublicSnapshot(
      { listings: [listing()], reviewItems: [] },
      {
        agents: [], curatedListings: [],
        tour3d: {
          provider_origin: 'http://sketchfab.com', embed_url: 'https://sketchfab.com/embed',
          model_uid: '6fc3a756dacd40af8c6e4e3b8e674ea2',
          model_title: 'Example', author: 'Author', author_url: 'https://example.com',
          licence: 'CC BY 4.0', licence_url: 'https://creativecommons.org/licenses/by/4.0/',
          evidence_ref: 'R-12', label_en: 'Example - not this property',
          guided_stops: [{ id: 'kitchen', label_en: 'Kitchen', eye: [1, 2, 3], target: [4, 5, 6] }],
          transit_waypoints: [],
        },
      },
    )).toThrow('Invalid Tour3D configuration');
  });

  it('rejects a 3D embed URL that does not identify the configured model UID', () => {
    expect(() => projectPublicSnapshot(
      { listings: [listing()], reviewItems: [] },
      {
        agents: [], curatedListings: [],
        tour3d: {
          provider_origin: 'https://sketchfab.com',
          embed_url: 'https://sketchfab.com/models/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/embed?dnt=1',
          model_uid: '6fc3a756dacd40af8c6e4e3b8e674ea2',
          model_title: 'Example', author: 'Author', author_url: 'https://example.com',
          licence: 'CC BY 4.0', licence_url: 'https://creativecommons.org/licenses/by/4.0/',
          evidence_ref: 'R-12', label_en: 'Example - not this property',
          guided_stops: [{ id: 'kitchen', label_en: 'Kitchen', eye: [1, 2, 3], target: [4, 5, 6] }],
          transit_waypoints: [],
        },
      },
    )).toThrow('Invalid Tour3D configuration');
  });
});
