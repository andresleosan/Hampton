import { describe, expect, it } from 'vitest';
import type { PublicListing } from '../../src/domain/public-contract.ts';
import { commercialListings, featuredResidential, figurePeriodLabel, residentialTab } from '../../src/domain/catalogue.ts';

function item(id: string, section: PublicListing['section'], tab: PublicListing['tab'], order: number): PublicListing {
  return {
    public_id: id, section, geography: 'jersey', tab, source_order: order,
    operation: tab === 'to-let' ? 'rent' : 'sale', status_literal: 'OPEN', status_normalised: 'open',
    title: id, locality: null, description_public: null, description_withheld: false,
    bedrooms: null, bathrooms: null, figures: [],
    media: [{ public_path: '/illustrations/photograph-unavailable.svg', width: 1200, height: 900, alt: 'Unavailable' }],
    legal_notice: null, source: null, similar_ids: [], calculator: null, demo: { aerial: null, tour3d: false },
  };
}

describe('public catalogue selectors', () => {
  const data = [
    item('sale-later', 'residential', 'for-sale', 1),
    item('commercial', 'commercial', null, 0),
    item('rent', 'residential', 'to-let', 0),
    item('sale-first', 'residential', 'for-sale', 0),
  ];

  it('selects one residential tab without leaking other sections and preserves source rank', () => {
    expect(residentialTab(data, 'for-sale').map(listing => listing.public_id)).toEqual(['sale-first', 'sale-later']);
    expect(residentialTab(data, 'to-let').map(listing => listing.public_id)).toEqual(['rent']);
  });

  it('selects commercial listings independently', () => {
    expect(commercialListings(data).map(listing => listing.public_id)).toEqual(['commercial']);
  });

  it('chooses the first open for-sale residential listing for the home page', () => {
    expect(featuredResidential(data)?.public_id).toBe('sale-first');
  });

  it('normalises public figure periods without duplicating an existing literal', () => {
    expect(figurePeriodLabel({
      type: 'rent', amount: 1, currency: 'GBP', period: 'year', label_en: 'Rent',
      display_text: '£12,000', under_review: false,
    })).toBe('per annum');
    expect(figurePeriodLabel({
      type: 'rent', amount: 1, currency: 'GBP', period: 'month', label_en: 'Rent',
      display_text: '£1,000 PCM', under_review: false,
    })).toBeNull();
  });
});
