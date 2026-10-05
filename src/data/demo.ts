import type { PublicData, PublicListing } from '../domain/public-contract.ts';

const home: PublicListing = {
  public_id: 'harbour-light-house', section: 'residential', geography: 'jersey', tab: 'for-sale', source_order: 0,
  operation: 'sale', status_literal: 'For sale · demo', status_normalised: 'open',
  title: 'Harbour Light House', locality: 'St Aubin · fictional setting',
  description_public: 'Demo property — fictional. A quiet, imagined coastal home with generous living spaces, a sheltered garden and room to gather. All details and illustrations are synthetic examples; this is not an available property.',
  description_withheld: false, bedrooms: 3, bathrooms: 2,
  figures: [{ type: 'sale_price', amount: 895000, currency: 'GBP', period: null, label_en: 'Guide price · demo', display_text: '£895,000', under_review: false }],
  media: [{ public_path: '/illustrations/harbour-house.svg', width: 1440, height: 1080, alt: 'Demo illustration of a cream house, garden and blue coastal horizon; fictional property.' }],
  legal_notice: null, source: null, similar_ids: [], calculator: null, demo: { aerial: null, tour3d: false },
};

export const demoData: PublicData = { listings: [home], agents: [], tour3d: null };
