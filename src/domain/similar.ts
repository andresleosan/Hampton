import type { ListingRecord, MoneyFigure } from './types.ts';
import type { PublicFigure, PublicListing } from './public-contract.ts';

const DEFAULT_MARGIN_PERCENT = 20;
const DEFAULT_MAX_RESULTS = 3;

type ComparableFigure = {
  pence: number;
  currency: string;
  period: MoneyFigure['period'];
};

function comparable(listing: ListingRecord): ComparableFigure | null {
  const type = listing.operation === 'sale' ? 'sale_price' : listing.operation === 'rent' ? 'rent' : null;
  if (type === null) return null;
  const figures = listing.figures.filter(figure => figure.type === type);
  if (figures.length !== 1) return null;
  const [figure] = figures;
  if (
    figure === undefined
    || figure.underReview
    || figure.amountPence === null
    || figure.currency === null
    || !Number.isSafeInteger(figure.amountPence)
    || figure.amountPence <= 0
    || (type === 'rent' && figure.period === null)
  ) {
    return null;
  }
  return { pence: figure.amountPence, currency: figure.currency, period: figure.period };
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function similarIds(
  reference: ListingRecord,
  all: readonly ListingRecord[],
  options: { marginPct: number; max: number } = { marginPct: DEFAULT_MARGIN_PERCENT, max: DEFAULT_MAX_RESULTS },
): string[] {
  if (
    !Number.isSafeInteger(options.marginPct)
    || options.marginPct < 0
    || !Number.isSafeInteger(options.max)
    || options.max < 0
  ) {
    throw new RangeError('Similar-property options must be non-negative safe integers.');
  }
  if (reference.statusNormalised === 'closed') return [];
  const referenceFigure = comparable(reference);
  if (referenceFigure === null) return [];

  return all
    .filter(candidate => candidate.key !== reference.key && candidate.statusNormalised !== 'closed')
    .filter(candidate => (
      candidate.operation === reference.operation
      && candidate.presentationSection === reference.presentationSection
      && candidate.geography === reference.geography
    ))
    .map(candidate => ({ candidate, figure: comparable(candidate) }))
    .filter((entry): entry is { candidate: ListingRecord; figure: ComparableFigure } => entry.figure !== null)
    .filter(({ figure }) => (
      figure.currency === referenceFigure.currency
      && figure.period === referenceFigure.period
      && 100 * Math.abs(figure.pence - referenceFigure.pence) <= options.marginPct * referenceFigure.pence
    ))
    .sort((left, right) => {
      const leftDifference = Math.abs(left.figure.pence - referenceFigure.pence);
      const rightDifference = Math.abs(right.figure.pence - referenceFigure.pence);
      return leftDifference - rightDifference
        || left.figure.pence - right.figure.pence
        || compareCodeUnits(left.candidate.key, right.candidate.key);
    })
    .slice(0, options.max)
    .map(({ candidate }) => candidate.key);
}

export function resolveSimilarListings<T extends { public_id: string }>(
  ids: readonly string[],
  all: readonly T[],
): T[] {
  const byId = new Map(all.map(listing => [listing.public_id, listing]));
  return ids.map(id => {
    const listing = byId.get(id);
    if (listing === undefined) throw new Error(`similar_ids references unknown public_id: ${id}`);
    return listing;
  });
}

function comparablePublic(listing: PublicListing): { pence: number; currency: string; period: PublicFigure['period'] } | null {
  const type = listing.operation === 'sale' ? 'sale_price' : listing.operation === 'rent' ? 'rent' : null;
  if (type === null) return null;
  const figures = listing.figures.filter(figure => figure.type === type);
  if (figures.length !== 1) return null;
  const figure = figures[0];
  if (figure === undefined || figure.under_review || figure.amount === null || figure.currency === null) return null;
  const pence = Math.round(figure.amount * 100);
  if (!Number.isSafeInteger(pence) || pence <= 0 || Math.abs(pence / 100 - figure.amount) > Number.EPSILON) return null;
  if (type === 'rent' && figure.period === null) return null;
  return { pence, currency: figure.currency, period: figure.period };
}

/** Revalidates exported similar ids at render time instead of trusting stale or hand-edited data. */
export function resolveEligibleSimilarListings(
  reference: PublicListing,
  ids: readonly string[],
  all: readonly PublicListing[],
  marginPct = DEFAULT_MARGIN_PERCENT,
  max = DEFAULT_MAX_RESULTS,
): PublicListing[] {
  if (reference.status_normalised === 'closed' || !Number.isSafeInteger(marginPct) || marginPct < 0
      || !Number.isSafeInteger(max) || max < 0) return [];
  const referenceFigure = comparablePublic(reference);
  if (referenceFigure === null) return [];

  return resolveSimilarListings(ids, all)
    .filter(candidate => candidate.public_id !== reference.public_id && candidate.status_normalised !== 'closed')
    .filter(candidate => candidate.operation === reference.operation
      && candidate.section === reference.section
      && candidate.geography === reference.geography)
    .map(candidate => ({ candidate, figure: comparablePublic(candidate) }))
    .filter((entry): entry is { candidate: PublicListing; figure: NonNullable<ReturnType<typeof comparablePublic>> } => entry.figure !== null)
    .filter(({ figure }) => figure.currency === referenceFigure.currency
      && figure.period === referenceFigure.period
      && 100 * Math.abs(figure.pence - referenceFigure.pence) <= marginPct * referenceFigure.pence)
    .slice(0, max)
    .map(({ candidate }) => candidate);
}
