import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type {
  ListingRecord,
  MediaRecord,
  Operation,
  OriginSection,
  ReviewItem,
  ReviewKind,
} from '../domain/types.ts';
import { inferOperation, normalisePrice, normaliseStatus } from './normalise.ts';
import { assertAllowedUrl } from './policy.ts';

export interface ParserContext {
  sourceUrl: string;
  retrievedAt: string;
  originSection: OriginSection;
}

export interface DiscoverySignal {
  kind: 'dataset' | 'legacy' | 'ssr-pagination';
  currentPage: number;
  totalPages: number;
  complete: boolean;
}

export type ParseResult =
  | { ok: true; records: ListingRecord[]; review: ReviewItem[]; discovery: DiscoverySignal }
  | { ok: false; cause: string };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as UnknownRecord : null;
}

function plainText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([\da-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function count(value: unknown): number | null {
  const number = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  return typeof number === 'number' && Number.isInteger(number) && number >= 0 ? number : null;
}

function makeReview(
  entityKey: string,
  field: string,
  kind: ReviewKind,
  originalValue: string,
  reason: string,
  sourceUrl: string,
  retrievedAt: string,
): ReviewItem {
  const id = createHash('sha256')
    .update([entityKey, field, kind, sourceUrl, originalValue].join('|'))
    .digest('hex')
    .slice(0, 16);
  return { id, entityKey, field, kind, originalValue, reason, sourceUrl, retrievedAt };
}

function mediaFrom(value: unknown, position: number, entityKey: string, ctx: ParserContext, review: ReviewItem[]): MediaRecord | null {
  const image = asRecord(value);
  const rawUrl = typeof image?.url === 'string' ? image.url : '';
  const width = count(image?.width);
  const height = count(image?.height);
  if (!rawUrl || !width || !height) {
    review.push(makeReview(entityKey, 'media', 'fetch', JSON.stringify(value), 'Image metadata lacks URL or positive dimensions.', ctx.sourceUrl, ctx.retrievedAt));
    return null;
  }
  let url: URL;
  try {
    url = assertAllowedUrl(rawUrl, 'image');
  } catch (error) {
    review.push(makeReview(entityKey, 'media', 'fetch', rawUrl, error instanceof Error ? error.message : 'Rejected image destination.', rawUrl, ctx.retrievedAt));
    return null;
  }
  return {
    sourceUrl: url.href,
    sourceFileName: basename(decodeURIComponent(url.pathname)),
    width,
    height,
    position,
    localPath: null,
    alt: plainText(image?.alt),
  };
}

function operationFrom(value: unknown, status: string): Operation {
  if (value === 'sale' || value === 'rent' || value === 'lease' || value === 'premium' || value === 'unknown') return value;
  if (typeof value === 'string') {
    if (/\b(?:to buy|for sale)\b/i.test(value)) return 'sale';
    if (/\b(?:to rent|to let|for rent)\b/i.test(value)) return 'rent';
    if (/\blease\b/i.test(value)) return 'lease';
    if (/\bpremium\b/i.test(value)) return 'premium';
  }
  return inferOperation(status);
}

function priceFromLiteral(literal: string, operation: Operation): ReturnType<typeof normalisePrice> {
  const million = literal.trim().match(/^£\s*(\d+(?:\.\d+)?)\s*m(?:illion)?\s*$/i);
  if (!million) return normalisePrice(literal, operation);
  const pounds = Number(million[1]) * 1_000_000;
  const result = normalisePrice(`£${pounds}`, operation);
  return result.figure
    ? { ...result, figure: { ...result.figure, originalText: literal } }
    : result;
}

function wixImage(value: unknown, alt: unknown = null): UnknownRecord | null {
  if (typeof value !== 'string' || !value.startsWith('wix:image://v1/')) return null;
  const [path, fragment = ''] = value.slice('wix:image://v1/'.length).split('#', 2);
  const slash = path?.indexOf('/') ?? -1;
  const slug = slash >= 0 ? path!.slice(0, slash) : path;
  if (!slug || !/^[\w~.-]+$/.test(slug)) return null;
  const params = new URLSearchParams(fragment);
  const width = count(params.get('originWidth'));
  const height = count(params.get('originHeight'));
  return { url: `https://static.wixstatic.com/media/${slug}`, width, height, alt };
}

function galleryImage(value: unknown): UnknownRecord | null {
  const gallery = asRecord(value);
  if (!gallery || (gallery.type !== undefined && gallery.type !== 'image')) return null;
  const settings = asRecord(gallery.settings);
  const fromSrc = wixImage(gallery.src, gallery.alt);
  const slug = typeof gallery.slug === 'string' && /^[\w~.-]+$/.test(gallery.slug) ? gallery.slug : null;
  if (fromSrc) {
    return {
      ...fromSrc,
      width: count(settings?.width) ?? fromSrc.width,
      height: count(settings?.height) ?? fromSrc.height,
    };
  }
  return slug ? {
    url: `https://static.wixstatic.com/media/${slug}`,
    width: count(settings?.width),
    height: count(settings?.height),
    alt: gallery.alt,
  } : null;
}

function realMedia(item: UnknownRecord): unknown[] {
  const values: UnknownRecord[] = [];
  const primary = wixImage(item.image, item.title);
  if (primary) values.push(primary);
  if (Array.isArray(item.gallery)) {
    for (const raw of item.gallery) {
      const image = galleryImage(raw);
      if (image) values.push(image);
    }
  }
  const seen = new Set<string>();
  return values.filter((value) => {
    const url = String(value.url ?? '');
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function listingFromItem(item: UnknownRecord, sourceOrder: number, ctx: ParserContext, review: ReviewItem[]): ListingRecord {
  const rawUrl = typeof item.url === 'string' ? item.url : '';
  let sourceUrl: string;
  try {
    sourceUrl = assertAllowedUrl(rawUrl, 'page').href;
  } catch (error) {
    throw error instanceof Error ? error : new Error(`Listing item ${sourceOrder} has an invalid URL.`);
  }
  const id = typeof item._id === 'string' && item._id.trim() ? item._id.trim() : null;
  const key = id ? `wix:${id}` : `url:${sourceUrl}`;
  const statusLiteral = plainText(item.status) ?? '';
  const operation = operationFrom(item.operation ?? item.type, statusLiteral);
  const title = plainText(item.title) ?? '';
  if (title === '') {
    review.push(makeReview(key, 'title', 'empty-in-source', '', 'The source publishes an empty listing title.', sourceUrl, ctx.retrievedAt));
  }
  const priceLiteral = typeof item.price === 'string' ? item.price : '';
  const price = priceFromLiteral(priceLiteral, operation);
  if (price.review) {
    review.push(makeReview(key, 'price', 'figure', priceLiteral, price.review, sourceUrl, ctx.retrievedAt));
  }
  const images = Array.isArray(item.images) ? item.images : [];
  const media = images
    .map((image, position) => mediaFrom(image, position, key, ctx, review))
    .filter((image): image is MediaRecord => image !== null)
    .map((image, position) => ({ ...image, position }));
  const locality = plainText(item.locality);
  const disclaimer = plainText(item.disclaimer);
  const aml = plainText(item.aml);

  return {
    key,
    originSection: ctx.originSection,
    presentationSection: ctx.originSection === 'commercial-sitemap' ? 'commercial' : 'residential',
    geography: ctx.originSection === 'international-listing' ? 'international' : 'jersey',
    sourceOrder,
    operation,
    statusLiteral,
    statusNormalised: normaliseStatus(statusLiteral, operation),
    title,
    locality,
    confidential: locality?.toLowerCase() === 'confidential',
    descriptionOriginal: plainText(item.description),
    bedrooms: count(item.bedrooms),
    bathrooms: count(item.bathrooms),
    figures: price.figure ? [price.figure] : [],
    media,
    legalNotice: disclaimer || aml ? { disclaimer: disclaimer ?? '', aml: aml ?? '' } : null,
    sourceUrl,
    retrievedOn: ctx.retrievedAt.slice(0, 10),
    notSeenInLastRun: false,
  };
}

function schemaFields(root: UnknownRecord, collection: string): UnknownRecord | null {
  const apps = asRecord(root.appsWarmupData);
  const binding = asRecord(apps?.dataBinding);
  const schemas = asRecord(binding?.schemas);
  return asRecord(asRecord(schemas?.[collection])?.fields);
}

function parseRealDataset(root: UnknownRecord, ctx: ParserContext): ParseResult | null {
  const apps = asRecord(root.appsWarmupData);
  const binding = asRecord(apps?.dataBinding);
  const store = asRecord(binding?.dataStore);
  if (!store) return null;
  const collection = ctx.originSection === 'international-listing' ? 'InternationalDataset' : 'ResidentialDataset';
  const fields = schemaFields(root, collection);
  const recordsByCollection = asRecord(store.recordsByCollectionId);
  const records = asRecord(recordsByCollection?.[collection]);
  const infos = asRecord(store.recordInfosByDatasetId);
  if (!fields || !records || !infos) return { ok: false, cause: `The Wix ${collection} schema/store is missing.` };
  for (const field of ['_id', 'title', 'price3', 'status', 'image', 'gallery']) {
    if (!(field in fields)) return { ok: false, cause: `The Wix ${collection} schema is missing ${field}.` };
  }

  const recordKeys = Object.keys(records);
  const candidates = Object.values(infos).map(asRecord).filter((value): value is UnknownRecord => value !== null);
  const info = candidates.find((candidate) => candidate.collectionId === collection)
    ?? candidates.find((candidate) => Array.isArray(candidate.itemIds)
      && candidate.itemIds.length === recordKeys.length
      && candidate.itemIds.every((id) => typeof id === 'string' && id in records));
  const size = asRecord(info?.datasetSize);
  const itemIds = info?.itemIds;
  if (!info || !Array.isArray(itemIds) || !size
      || !Number.isInteger(size.total) || !Number.isInteger(size.loaded)
      || size.total !== size.loaded || size.loaded !== itemIds.length || itemIds.length !== recordKeys.length
      || itemIds.some((id) => typeof id !== 'string' || !(id in records))) {
    return { ok: false, cause: `The Wix ${collection} dataset has no coherent positive end signal.` };
  }
  if (itemIds.length === 0) return { ok: false, cause: `The Wix ${collection} dataset unexpectedly contains zero items.` };

  const review: ReviewItem[] = [];
  const parsed: ListingRecord[] = [];
  try {
    for (const [sourceOrder, id] of itemIds.entries()) {
      const record = asRecord(records[id as string]);
      if (!record || record._id !== id) return { ok: false, cause: `The Wix ${collection} record identity is incoherent.` };
      parsed.push(listingFromItem({
        ...record,
        url: ctx.sourceUrl,
        price: record.price3,
        locality: record.location,
        images: realMedia(record),
        aml: record.antiml,
      }, sourceOrder, ctx, review));
    }
  } catch (error) {
    return { ok: false, cause: error instanceof Error ? error.message : `Invalid ${collection} record.` };
  }
  return {
    ok: true,
    records: parsed,
    review,
    discovery: { kind: 'dataset', currentPage: 1, totalPages: 1, complete: true },
  };
}

const COMMERCIAL_COMPONENTS = Object.freeze({
  image: 'comp-ke8ur88a',
  status: 'comp-ke8ur88o',
  title: 'comp-ke8ur893',
  locality: 'comp-ke8ur89b1',
  description: 'comp-ke8ur8ao',
  price: 'comp-ke8ur8b1',
  link: 'comp-ke8ur8bf',
});

function parseCommercialSsr(root: UnknownRecord, ctx: ParserContext): ParseResult | null {
  const fields = schemaFields(root, 'CommercialProperties');
  if (!fields) return null;
  for (const field of ['_id', 'title', 'price', 'status', 'image']) {
    if (!(field in fields)) return { ok: false, cause: `The Wix CommercialProperties schema is missing ${field}.` };
  }
  const platform = asRecord(root.platform);
  const updates = platform?.ssrPropsUpdates;
  const pages = asRecord(root.pages);
  const typeMap = asRecord(pages?.compIdToTypeMap);
  if (!Array.isArray(updates) || !typeMap) return { ok: false, cause: 'The commercial SSR props are missing.' };
  const expectedTypes: Readonly<Record<string, string>> = {
    [COMMERCIAL_COMPONENTS.image]: 'WPhoto',
    [COMMERCIAL_COMPONENTS.status]: 'WRichText',
    [COMMERCIAL_COMPONENTS.title]: 'WRichText',
    [COMMERCIAL_COMPONENTS.locality]: 'WRichText',
    [COMMERCIAL_COMPONENTS.description]: 'WRichText',
    [COMMERCIAL_COMPONENTS.price]: 'WRichText',
    [COMMERCIAL_COMPONENTS.link]: 'SiteButton',
  };
  if (Object.entries(expectedTypes).some(([id, type]) => typeMap[id] !== type)) {
    return { ok: false, cause: 'The commercial SSR component schema is incoherent.' };
  }
  const props: UnknownRecord = {};
  for (const update of updates) {
    const part = asRecord(update);
    if (!part) return { ok: false, cause: 'The commercial SSR props update is not an object.' };
    for (const [key, value] of Object.entries(part)) {
      if (key in props) return { ok: false, cause: `The commercial SSR prop ${key} is duplicated.` };
      props[key] = value;
    }
  }
  const paginationIds = Object.entries(typeMap).filter(([, type]) => type === 'Pagination').map(([id]) => id);
  const paginationValues = paginationIds.map((id) => asRecord(props[id])).filter((value): value is UnknownRecord => value !== null);
  if (paginationValues.length !== 1) return { ok: false, cause: 'The commercial SSR pagination signal is missing or ambiguous.' };
  const currentPage = paginationValues[0]!.currentPage;
  const totalPages = paginationValues[0]!.totalPages;
  if (!Number.isInteger(currentPage) || !Number.isInteger(totalPages)
      || (currentPage as number) < 1 || (totalPages as number) < 1 || (currentPage as number) > (totalPages as number)) {
    return { ok: false, cause: 'The commercial SSR pagination signal is invalid.' };
  }

  const suffixesByComponent = Object.values(COMMERCIAL_COMPONENTS).map((component) => {
    const prefix = `${component}__`;
    return Object.keys(props).filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  });
  const suffixes = suffixesByComponent[2] ?? [];
  if (suffixes.length === 0) return { ok: false, cause: 'The commercial SSR page unexpectedly contains zero item groups.' };
  if (new Set(suffixes).size !== suffixes.length || suffixes.some((suffix) => !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(suffix))) {
    return { ok: false, cause: 'The commercial SSR group identifiers are incoherent.' };
  }
  const expectedSuffixes = new Set(suffixes);
  if (suffixesByComponent.some((candidate) => candidate.length !== expectedSuffixes.size
      || candidate.some((suffix) => !expectedSuffixes.has(suffix)))) {
    return { ok: false, cause: 'The commercial SSR groups are not coherent across required components.' };
  }

  const review: ReviewItem[] = [];
  const records: ListingRecord[] = [];
  try {
    for (const [sourceOrder, suffix] of suffixes.entries()) {
      const group = Object.fromEntries(Object.entries(COMMERCIAL_COMPONENTS).map(([field, component]) => [field, asRecord(props[`${component}__${suffix}`])]));
      if (Object.values(group).some((value) => value === null)) {
        return { ok: false, cause: `The commercial SSR group ${suffix} is not coherent.` };
      }
      const image = group.image!;
      const link = asRecord(group.link!.link);
      const href = typeof link?.href === 'string' ? link.href : '';
      records.push(listingFromItem({
        _id: suffix,
        url: href,
        status: group.status!.html,
        title: group.title!.html,
        locality: group.locality!.html,
        description: group.description!.html,
        price: plainText(group.price!.html) ?? '',
        images: [{
          url: `https://static.wixstatic.com/media/${String(image.uri ?? '')}`,
          width: image.width,
          height: image.height,
          alt: image.fallbackTitle,
        }],
      }, sourceOrder, ctx, review));
    }
  } catch (error) {
    return { ok: false, cause: error instanceof Error ? error.message : 'Invalid commercial SSR item.' };
  }
  return {
    ok: true,
    records,
    review,
    discovery: {
      kind: 'ssr-pagination',
      currentPage: currentPage as number,
      totalPages: totalPages as number,
      complete: currentPage === totalPages,
    },
  };
}

export function parseEmbeddedListings(html: string, ctx: ParserContext): ParseResult {
  try {
    assertAllowedUrl(ctx.sourceUrl, 'page');
  } catch (error) {
    return { ok: false, cause: error instanceof Error ? error.message : 'Invalid source URL.' };
  }
  if (!/<\/html\s*>\s*$/i.test(html.trim())) return { ok: false, cause: 'The source document is truncated.' };

  const block = html.match(/<script\b(?=[^>]*\bid=["']wix-warmup-data["'])[^>]*>([\s\S]*?)<\/script\s*>/i);
  if (!block?.[1]) return { ok: false, cause: 'The embedded Wix data block is missing.' };

  let root: UnknownRecord | null;
  try {
    root = asRecord(JSON.parse(block[1]));
  } catch {
    return { ok: false, cause: 'The embedded Wix data block is invalid JSON.' };
  }
  if (!root) return { ok: false, cause: 'The embedded Wix data block root is not an object.' };

  if (ctx.originSection === 'commercial-sitemap') {
    const commercial = parseCommercialSsr(root, ctx);
    if (commercial) return commercial;
  } else {
    const dataset = parseRealDataset(root, ctx);
    if (dataset) return dataset;
  }

  const pagination = asRecord(root?.pagination);
  if (pagination?.hasNext !== false) return { ok: false, cause: 'Listing pagination has not reached a positive end signal.' };
  if (!Array.isArray(root?.items) || root.items.length === 0) return { ok: false, cause: 'The listing source unexpectedly contains zero items.' };

  const records: ListingRecord[] = [];
  const review: ReviewItem[] = [];
  for (const [sourceOrder, value] of root.items.entries()) {
    const item = asRecord(value);
    if (!item) return { ok: false, cause: `Listing item ${sourceOrder} is not an object.` };
    try {
      records.push(listingFromItem(item, sourceOrder, ctx, review));
    } catch (error) {
      return { ok: false, cause: error instanceof Error ? error.message : `Listing item ${sourceOrder} has an invalid URL.` };
    }
  }
  return {
    ok: true,
    records,
    review,
    discovery: { kind: 'legacy', currentPage: 1, totalPages: 1, complete: true },
  };
}
