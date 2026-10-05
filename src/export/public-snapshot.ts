import { createHash } from 'node:crypto';
import type { PublicAgent, PublicData, PublicFigure, PublicListing, PublicTour3D } from '../domain/public-contract.ts';
import { similarIds } from '../domain/similar.ts';
import type { ListingRecord, ReviewItem } from '../domain/types.ts';
import type { ImportSnapshot } from '../importer/sqlite.ts';

type ListingOverride = Partial<Pick<ListingRecord, 'presentationSection' | 'geography' | 'operation'>>;

export interface ProjectionOptions {
  agents: readonly PublicAgent[];
  curatedListings: readonly PublicListing[];
  cachedMedia?: Readonly<Record<string, PublicListing['media'][number]>>;
  overrides?: Readonly<Record<string, ListingOverride>>;
  tour3d?: PublicTour3D | null;
}

export interface ProjectionReport {
  excluded: Array<{ record_ref: string; reason: 'not-seen' | 'empty-title' | 'confidential-unresolved' | 'no-public-tab' | 'pending-unresolved' }>;
  omittedValues: Array<{ record_ref: string; field: string }>;
}

export interface ProjectionResult {
  data: PublicData;
  report: ProjectionReport;
}

const PLACEHOLDER_PATH = '/illustrations/photograph-unavailable.svg';

export function publicIdForKey(key: string): string {
  return `property-${createHash('sha256').update(`hampton-public:${key}`).digest('hex').slice(0, 16)}`;
}

function applyOverride(listing: ListingRecord, override: ListingOverride | undefined): ListingRecord {
  if (!override) return listing;
  return {
    ...listing,
    ...(override.presentationSection === undefined ? {} : { presentationSection: override.presentationSection }),
    ...(override.geography === undefined ? {} : { geography: override.geography }),
    ...(override.operation === undefined ? {} : { operation: override.operation }),
  };
}

function publicTab(listing: ListingRecord): PublicListing['tab'] | undefined {
  if (listing.presentationSection === 'commercial') return null;
  if (listing.geography === 'international') return 'international';
  if (listing.statusNormalised === 'closed') return 'sold-let';
  if (listing.operation === 'sale') return 'for-sale';
  if (listing.operation === 'rent' || listing.operation === 'lease') return 'to-let';
  return undefined;
}

function figureLabel(type: PublicFigure['type'], underReview: boolean): string {
  if (underReview) return 'As published - under review';
  return {
    sale_price: 'Sale price',
    rent: 'Rent',
    premium: 'Premium',
    turnover: 'Turnover',
    other: 'Figure as published',
  }[type];
}

function publicFigures(listing: ListingRecord, pendingFields: ReadonlySet<string>): PublicFigure[] {
  if (pendingFields.has('price') || pendingFields.has('figures')) return [];
  return listing.figures.map((figure) => ({
    type: figure.type,
    amount: figure.amountPence === null ? null : figure.amountPence / 100,
    currency: figure.currency,
    period: figure.period,
    label_en: figureLabel(figure.type, figure.underReview),
    display_text: figure.originalText,
    under_review: figure.underReview,
  }));
}

function validCuratedMedia(listing: ListingRecord, curatedListings: readonly PublicListing[]): PublicListing['media'] | null {
  const curated = curatedListings.find(item => item.title === listing.title && item.source?.url === listing.sourceUrl);
  if (!curated || curated.media.length === 0) return null;
  const valid = curated.media.every(media => (
    media.public_path.startsWith('/preview-private/')
    && !media.public_path.startsWith('/preview-private/projected/')
    && Number.isSafeInteger(media.width) && media.width > 0
    && Number.isSafeInteger(media.height) && media.height > 0
    && media.alt.trim().length > 0
  ));
  return valid ? curated.media.map(media => ({
    public_path: media.public_path,
    width: media.width,
    height: media.height,
    alt: media.alt,
  })) : null;
}

function publicMedia(
  listing: ListingRecord,
  curatedListings: readonly PublicListing[],
  cachedMedia: ProjectionOptions['cachedMedia'],
): PublicListing['media'] {
  const downloaded = cachedMedia?.[listing.key];
  const expectedPath = `/preview-private/projected/${publicIdForKey(listing.key)}`;
  const validDownloaded = downloaded
    && new RegExp(`^${expectedPath}\\.(?:jpg|png|webp)$`).test(downloaded.public_path)
    && Number.isSafeInteger(downloaded.width) && downloaded.width > 0
    && Number.isSafeInteger(downloaded.height) && downloaded.height > 0
    && downloaded.alt.trim().length > 0;
  return validCuratedMedia(listing, curatedListings) ?? (validDownloaded ? [{
    public_path: downloaded.public_path,
    width: downloaded.width,
    height: downloaded.height,
    alt: downloaded.alt,
  }] : [{
    public_path: PLACEHOLDER_PATH,
    width: 1200,
    height: 900,
    alt: `Photograph unavailable for ${listing.title}`,
  }]);
}

function publicDemo(listing: ListingRecord, curatedListings: readonly PublicListing[]): PublicListing['demo'] {
  const curated = curatedListings.find(item => item.title === listing.title && item.source?.url === listing.sourceUrl);
  return { aerial: null, tour3d: curated?.demo.tour3d === true };
}

function pendingFieldsByEntity(reviewItems: readonly ReviewItem[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const item of reviewItems) {
    const fields = result.get(item.entityKey) ?? new Set<string>();
    fields.add(item.field);
    result.set(item.entityKey, fields);
  }
  return result;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareListings(left: ListingRecord, right: ListingRecord): number {
  const leftTab = publicTab(left);
  const rightTab = publicTab(right);
  const leftGroup = `${left.presentationSection}:${leftTab ?? 'commercial'}`;
  const rightGroup = `${right.presentationSection}:${rightTab ?? 'commercial'}`;
  const groupOrder = compareCodeUnits(leftGroup, rightGroup);
  if (groupOrder !== 0) return groupOrder;
  if (leftTab === 'international' && rightTab === 'international') {
    const leftClosed = left.statusNormalised === 'closed' ? 1 : 0;
    const rightClosed = right.statusNormalised === 'closed' ? 1 : 0;
    if (leftClosed !== rightClosed) return leftClosed - rightClosed;
  }
  return left.sourceOrder - right.sourceOrder || compareCodeUnits(left.key, right.key);
}

function calculatorFor(listing: ListingRecord, figures: readonly PublicFigure[]): PublicListing['calculator'] {
  if (listing.presentationSection !== 'residential' || listing.operation !== 'sale' || listing.statusNormalised !== 'open') return null;
  const eligible = figures.filter(figure => (
    figure.type === 'sale_price' && figure.currency === 'GBP' && !figure.under_review && figure.amount !== null
  ));
  return eligible.length === 1 ? { price_gbp: eligible[0]!.amount! } : null;
}

function publicLegalNotice(listing: ListingRecord): PublicListing['legal_notice'] {
  return listing.legalNotice ? {
    disclaimer: listing.legalNotice.disclaimer,
    aml: listing.legalNotice.aml,
  } : null;
}

function publicPortrait(agent: PublicAgent): PublicAgent['portrait'] {
  return agent.portrait ? {
    public_path: agent.portrait.public_path,
    width: agent.portrait.width,
    height: agent.portrait.height,
    alt: agent.portrait.alt,
  } : null;
}

function publicTour(tour: PublicTour3D | null | undefined): PublicTour3D | null {
  if (!tour) return null;
  let provider: URL;
  let embed: URL;
  let author: URL;
  let licence: URL;
  try {
    provider = new URL(tour.provider_origin);
    embed = new URL(tour.embed_url);
    author = new URL(tour.author_url);
    licence = new URL(tour.licence_url);
  } catch {
    throw new Error('Invalid Tour3D configuration.');
  }
  const textValues = [tour.model_title, tour.author, tour.licence, tour.evidence_ref];
  const validVector = (vector: unknown): vector is [number, number, number] => (
    Array.isArray(vector) && vector.length === 3 && vector.every(value => Number.isFinite(value))
  );
  const validStopIds = new Set(['kitchen', 'office', 'bathroom', 'laundry', 'master-bedroom']);
  const validLabels = new Set(['Kitchen', 'Office', 'Bathroom', 'Laundry', 'Master Bedroom']);
  const stopIds = new Set(tour.guided_stops.map(stop => stop.id));
  if (provider.protocol !== 'https:' || provider.origin !== tour.provider_origin
    || embed.protocol !== 'https:' || embed.origin !== provider.origin
    || embed.pathname !== `/models/${tour.model_uid}/embed`
    || author.protocol !== 'https:' || licence.protocol !== 'https:'
    || !/^[a-f0-9]{32}$/.test(tour.model_uid)
    || textValues.some(value => value.trim() === '')
    || tour.label_en !== 'Example - not this property'
    || tour.guided_stops.length === 0
    || stopIds.size !== tour.guided_stops.length
    || tour.guided_stops.some(stop => (
      !validStopIds.has(stop.id) || !validLabels.has(stop.label_en)
      || !validVector(stop.eye) || !validVector(stop.target)
    ))
    || tour.transit_waypoints.some(waypoint => (
      !stopIds.has(waypoint.after_stop)
      || !validVector(waypoint.eye) || !validVector(waypoint.target)
    ))) {
    throw new Error('Invalid Tour3D configuration.');
  }
  return {
    provider_origin: tour.provider_origin,
    embed_url: tour.embed_url,
    model_title: tour.model_title,
    author: tour.author,
    author_url: tour.author_url,
    model_uid: tour.model_uid,
    licence: tour.licence,
    licence_url: tour.licence_url,
    evidence_ref: tour.evidence_ref,
    label_en: tour.label_en,
    guided_stops: tour.guided_stops.map(stop => ({
      id: stop.id,
      label_en: stop.label_en,
      eye: [...stop.eye],
      target: [...stop.target],
    })),
    transit_waypoints: tour.transit_waypoints.map(waypoint => ({
      after_stop: waypoint.after_stop,
      eye: [...waypoint.eye],
      target: [...waypoint.target],
    })),
  };
}

export function projectPublicSnapshot(snapshot: ImportSnapshot, options: ProjectionOptions): ProjectionResult {
  const pending = pendingFieldsByEntity(snapshot.reviewItems);
  const report: ProjectionReport = { excluded: [], omittedValues: [] };
  const eligible: ListingRecord[] = [];

  for (const raw of snapshot.listings) {
    const listing = applyOverride(raw, options.overrides?.[raw.key]);
    const recordRef = publicIdForKey(raw.key);
    const pendingFields = pending.get(listing.key) ?? new Set<string>();
    const hasUnsafePendingField = [...pendingFields].some(field => field !== 'price' && field !== 'figures');
    const reason = listing.notSeenInLastRun ? 'not-seen'
      : listing.title.trim() === '' ? 'empty-title'
      : listing.confidential ? 'confidential-unresolved'
      : publicTab(listing) === undefined ? 'no-public-tab'
      : hasUnsafePendingField ? 'pending-unresolved'
      : null;
    if (reason !== null) {
      report.excluded.push({ record_ref: recordRef, reason });
      continue;
    }
    for (const field of [...pendingFields].sort(compareCodeUnits)) {
      report.omittedValues.push({ record_ref: recordRef, field });
    }
    eligible.push(listing);
  }

  eligible.sort(compareListings);
  const rankByGroup = new Map<string, number>();
  const idByKey = new Map(eligible.map(listing => [listing.key, publicIdForKey(listing.key)]));
  const comparableListings = eligible.map(listing => {
    const fields = pending.get(listing.key) ?? new Set<string>();
    if (!fields.has('price') && !fields.has('figures')) return listing;
    return { ...listing, figures: listing.figures.map(figure => ({ ...figure, underReview: true })) };
  });
  const comparableByKey = new Map(comparableListings.map(listing => [listing.key, listing]));

  const listings = eligible.map((listing): PublicListing => {
    const tab = publicTab(listing)!;
    const group = `${listing.presentationSection}:${tab ?? 'commercial'}`;
    const rank = rankByGroup.get(group) ?? 0;
    rankByGroup.set(group, rank + 1);
    const figures = publicFigures(listing, pending.get(listing.key) ?? new Set<string>());
    return {
      public_id: publicIdForKey(listing.key),
      section: listing.presentationSection,
      geography: listing.geography,
      tab,
      source_order: rank,
      operation: listing.operation,
      status_literal: listing.statusLiteral,
      status_normalised: listing.statusNormalised,
      title: listing.title,
      locality: listing.locality,
      description_public: null,
      description_withheld: false,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      figures,
      media: publicMedia(listing, options.curatedListings, options.cachedMedia),
      legal_notice: publicLegalNotice(listing),
      source: { url: listing.sourceUrl, retrieved_on: listing.retrievedOn },
      similar_ids: similarIds(comparableByKey.get(listing.key)!, comparableListings).map(key => idByKey.get(key)).filter((id): id is string => id !== undefined),
      calculator: calculatorFor(listing, figures),
      demo: publicDemo(listing, options.curatedListings),
    };
  });

  return {
    data: {
      listings,
      agents: options.agents.map(agent => ({
        public_id: agent.public_id,
        name: agent.name,
        role: agent.role,
        phones: [...agent.phones],
        email: agent.email,
        portrait: publicPortrait(agent),
      })),
      tour3d: publicTour(options.tour3d),
    },
    report,
  };
}
