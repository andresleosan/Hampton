import { describe, expect, it } from 'vitest';
import { resolveEligibleSimilarListings, resolveSimilarListings, similarIds } from '../../../src/domain/similar.ts';
import type { PublicListing } from '../../../src/domain/public-contract.ts';
import type { ListingRecord, MoneyFigure } from '../../../src/domain/types.ts';

function figure(amountPence: number | null, overrides: Partial<MoneyFigure> = {}): MoneyFigure {
  return {
    type: 'sale_price', amountPence, currency: 'GBP', period: null,
    originalText: amountPence === null ? 'POA' : String(amountPence), underReview: false,
    ...overrides,
  };
}

function listing(key: string, amountPence: number | null, overrides: Partial<ListingRecord> = {}): ListingRecord {
  return {
    key, originSection: 'residential-listing', presentationSection: 'residential', geography: 'jersey',
    sourceOrder: 0, operation: 'sale', statusLiteral: 'FOR SALE', statusNormalised: 'open',
    title: key, locality: null, confidential: false, descriptionOriginal: null, bedrooms: null, bathrooms: null,
    figures: [figure(amountPence)], media: [], legalNotice: null, sourceUrl: `https://example.test/${key}`,
    retrievedOn: '2026-10-04', notSeenInLastRun: false,
    ...overrides,
  };
}

describe('similarIds', () => {
  it('includes both 20% boundaries and excludes one penny beyond them', () => {
    const ref = listing('ref', 50_000_000);
    const all = [
      ref,
      listing('low-out', 39_999_900),
      listing('low-edge', 40_000_000),
      listing('high-edge', 60_000_000),
      listing('high-out', 60_000_100),
    ];
    expect(similarIds(ref, all)).toEqual(['low-edge', 'high-edge']);
  });

  it('returns at most three ordered by difference, then price, then code-unit key', () => {
    const ref = listing('ref', 50_000_000);
    const all = [
      listing('z', 49_000_000), listing('b', 51_000_000), listing('a', 51_000_000),
      listing('closest', 50_500_000), ref,
    ];
    expect(similarIds(ref, all)).toEqual(['closest', 'z', 'a']);
    expect(similarIds(ref, all, { marginPct: 10, max: 1 })).toEqual(['closest']);
  });

  it('does not mutate input and is deterministic across permutations', () => {
    const ref = listing('ref', 50_000_000);
    const candidates = [listing('c', 55_000_000), listing('a', 45_000_000), listing('b', 50_000_000)];
    const all = [ref, ...candidates];
    const snapshot = JSON.stringify(all);
    expect(similarIds(ref, all)).toEqual(['b', 'a', 'c']);
    expect(similarIds(ref, [candidates[2]!, candidates[0]!, ref, candidates[1]!])).toEqual(['b', 'a', 'c']);
    expect(JSON.stringify(all)).toBe(snapshot);
  });

  it('rejects an unreliable or closed reference', () => {
    const candidate = listing('candidate', 50_000_000);
    const references = [
      listing('closed', 50_000_000, { statusNormalised: 'closed' }),
      listing('null', null),
      listing('review', 50_000_000, { figures: [figure(50_000_000, { underReview: true })] }),
      listing('duplicate', 50_000_000, { figures: [figure(50_000_000), figure(50_000_000)] }),
      listing('lease', 50_000_000, { operation: 'lease' }),
    ];
    for (const ref of references) expect(similarIds(ref, [ref, candidate])).toEqual([]);
  });

  it('excludes self, closed, missing and reviewed candidates without relaxing the rule', () => {
    const ref = listing('ref', 50_000_000);
    const all = [
      ref,
      listing('closed', 50_000_000, { statusNormalised: 'closed' }),
      listing('none-is-open', 50_000_000, { statusNormalised: 'none' }),
      listing('missing', null),
      listing('reviewed', 50_000_000, { figures: [figure(50_000_000, { underReview: true })] }),
    ];
    expect(similarIds(ref, all)).toEqual(['none-is-open']);
    expect(similarIds(ref, [ref])).toEqual([]);
  });

  it('never mixes operation, currency, rental period, presentation section or geography', () => {
    const rent = (key: string, overrides: Partial<ListingRecord> = {}) => listing(key, 100_000, {
      operation: 'rent',
      figures: [figure(100_000, { type: 'rent', period: 'month' })],
      ...overrides,
    });
    const ref = rent('ref');
    const matchingInternational = rent('matching-international', { geography: 'international' });
    const internationalRef = rent('international-ref', { geography: 'international' });
    const all = [
      ref,
      rent('match'),
      rent('annual', { figures: [figure(100_000, { type: 'rent', period: 'year' })] }),
      rent('eur', { figures: [figure(100_000, { type: 'rent', period: 'month', currency: 'EUR' })] }),
      listing('sale', 100_000),
      rent('commercial', { presentationSection: 'commercial' }),
      matchingInternational,
    ];
    expect(similarIds(ref, all)).toEqual(['match']);
    expect(similarIds(internationalRef, [...all, internationalRef])).toEqual(['matching-international']);
  });

  it('uses only sale_price or rent, never turnover or other income', () => {
    const ref = listing('ref', 50_000_000, {
      figures: [figure(50_000_000), figure(3_000_000, { type: 'other', period: 'year' })],
    });
    const incomeOnly = listing('income-only', null, { figures: [figure(50_000_000, { type: 'turnover' })] });
    const sale = listing('sale', 50_000_000, { figures: [figure(50_000_000), figure(3_000_000, { type: 'turnover' })] });
    expect(similarIds(ref, [ref, incomeOnly, sale])).toEqual(['sale']);
    expect(similarIds(incomeOnly, [incomeOnly, sale])).toEqual([]);
  });

  it('compares the demo maximum with integer arithmetic', () => {
    const ref = listing('ref', 10_000_000_000);
    expect(similarIds(ref, [ref, listing('edge', 8_000_000_000), listing('outside', 7_999_999_900)]))
      .toEqual(['edge']);
  });
});

function publicListing(id: string, amount: number, overrides: Partial<PublicListing> = {}): PublicListing {
  return {
    public_id: id, section: 'residential', geography: 'jersey', tab: 'for-sale', source_order: 0,
    operation: 'sale', status_literal: 'FOR SALE', status_normalised: 'open', title: id, locality: 'Jersey',
    description_public: null, description_withheld: false, bedrooms: null, bathrooms: null,
    figures: [{ type: 'sale_price', amount, currency: 'GBP', period: null, label_en: 'Price', display_text: `£${amount}`, under_review: false }],
    media: [], legal_notice: null, source: null, similar_ids: [], calculator: null,
    demo: { aerial: null, tour3d: false },
    ...overrides,
  };
}

describe('resolveEligibleSimilarListings', () => {
  it('revalidates public ids against the reference context, reliability and inclusive 20% window', () => {
    const reference = publicListing('reference', 500_000);
    const candidates = [
      publicListing('valid', 600_000),
      publicListing('outside', 600_001),
      publicListing('closed', 500_000, { status_normalised: 'closed' }),
      publicListing('rent', 500_000, { operation: 'rent', figures: [{ type: 'rent', amount: 500_000, currency: 'GBP', period: 'month', label_en: 'Rent', display_text: '£500,000', under_review: false }] }),
      publicListing('commercial', 500_000, { section: 'commercial' }),
      publicListing('eur', 500_000, { figures: [{ type: 'sale_price', amount: 500_000, currency: 'EUR', period: null, label_en: 'Price', display_text: '€500,000', under_review: false }] }),
    ];

    expect(resolveEligibleSimilarListings(reference, candidates.map(item => item.public_id), [reference, ...candidates]))
      .toEqual([candidates[0]]);
  });

  it('hides results for an unreliable reference and limits validated candidates to three', () => {
    const reference = publicListing('reference', 500_000);
    const candidates = ['one', 'two', 'three', 'four'].map((id, index) => publicListing(id, 500_000 + index));
    expect(resolveEligibleSimilarListings(reference, candidates.map(item => item.public_id), [reference, ...candidates]))
      .toEqual(candidates.slice(0, 3));
    expect(resolveEligibleSimilarListings({ ...reference, status_normalised: 'closed' }, ['one'], [reference, ...candidates]))
      .toEqual([]);
  });
});

describe('resolveSimilarListings', () => {
  it('preserves id order and resolves an empty list', () => {
    const all = [{ public_id: 'p1' }, { public_id: 'p2' }, { public_id: 'p3' }];
    expect(resolveSimilarListings(['p3', 'p1'], all)).toEqual([all[2], all[0]]);
    expect(resolveSimilarListings([], all)).toEqual([]);
  });

  it('throws when similar_ids contains an unknown public id', () => {
    expect(() => resolveSimilarListings(['missing'], [{ public_id: 'p1' }]))
      .toThrow('similar_ids references unknown public_id: missing');
  });
});
