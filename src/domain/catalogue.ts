import type { PublicFigure, PublicListing } from './public-contract.ts';

export type ResidentialTab = Exclude<PublicListing['tab'], null>;

const bySourceOrder = (left: PublicListing, right: PublicListing) => left.source_order - right.source_order;

export function residentialTab(listings: readonly PublicListing[], tab: ResidentialTab): PublicListing[] {
  return listings.filter(listing => listing.section === 'residential' && listing.tab === tab).sort(bySourceOrder);
}

export function commercialListings(listings: readonly PublicListing[]): PublicListing[] {
  return listings.filter(listing => listing.section === 'commercial').sort(bySourceOrder);
}

export function featuredResidential(listings: readonly PublicListing[]): PublicListing | undefined {
  return residentialTab(listings, 'for-sale').find(listing => listing.status_normalised !== 'closed');
}

export function figurePeriodLabel(figure: PublicFigure): string | null {
  if (figure.period === null) return null;
  if (/\b(?:per\s+(?:month|week|annum)|pcm|pw|p\.?a\.?)\b/i.test(figure.display_text)) return null;
  return { month: 'per month', week: 'per week', year: 'per annum' }[figure.period];
}
