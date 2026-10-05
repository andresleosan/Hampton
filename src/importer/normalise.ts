import type {
  FigureType,
  MoneyFigure,
  Operation,
  Period,
  StatusNormalised,
} from '../domain/types.ts';

export interface PriceNormalisation {
  figure: MoneyFigure | null;
  review: string | null;
}

const NULL_AMOUNT = /^(?:poa|price on application|confidential|negotiable)?$/i;
const GBP_AMOUNT = /£\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/g;
const EUROPEAN_GBP = /£\s*\d{1,3}(?:\.\d{3})+,\d{2}/;

export function inferOperation(statusLiteral: string): Operation {
  const status = statusLiteral.trim().toUpperCase();
  if (/\b(?:FOR SALE|SOLD|SALE AGREED)\b/.test(status)) return 'sale';
  if (/\b(?:TO LET|FOR RENT|LET|LET AGREED)\b/.test(status)) return 'rent';
  return 'unknown';
}

export function normaliseStatus(literal: string, _operation: Operation): StatusNormalised {
  const status = literal.trim().replace(/\s+/g, ' ').toUpperCase();
  if (status === '') return 'none';
  if (/^(?:SOLD|SALE AGREED|LET|LET AGREED|SOLD SUBJECT TO CONTRACT)$/.test(status)) return 'closed';
  if (/^(?:FOR SALE|TO LET|FOR RENT|AVAILABLE|UNDER OFFER)$/.test(status)) return 'open';
  return 'none';
}

function figureType(text: string, operation: Operation): FigureType {
  if (/\bpremium\b/i.test(text)) return 'premium';
  if (/\bturnover\b/i.test(text)) return 'turnover';
  if (/\b(?:rent|rental|pcm|per month|per week|per annum|p\.a\.|pa)\b/i.test(text)) return 'rent';
  if (operation === 'rent' || operation === 'lease') return 'rent';
  if (operation === 'premium') return 'premium';
  if (operation === 'sale') return 'sale_price';
  return 'other';
}

function periodFrom(text: string): Period {
  if (/\b(?:per month|pcm)\b/i.test(text)) return 'month';
  if (/\b(?:per week|pw)\b/i.test(text)) return 'week';
  if (/\b(?:per annum|p\.a\.|pa)\b/i.test(text)) return 'year';
  return null;
}

export function normalisePrice(originalText: string, operation: Operation): PriceNormalisation {
  const trimmed = originalText.trim();
  const base = {
    type: figureType(originalText, operation),
    period: periodFrom(originalText),
    originalText,
    underReview: false,
  } as const;

  if (NULL_AMOUNT.test(trimmed)) {
    return { figure: { ...base, amountPence: null, currency: null }, review: null };
  }
  if (EUROPEAN_GBP.test(originalText)) {
    return { figure: null, review: 'Unsupported monetary format; no amount was normalised.' };
  }

  const matches = [...originalText.matchAll(GBP_AMOUNT)];
  if (matches.length > 1) {
    return { figure: null, review: 'Multiple monetary amounts are ambiguous in one source field.' };
  }
  if (matches.length === 0) {
    return { figure: null, review: 'No unambiguous supported monetary amount was found.' };
  }

  const poundsText = matches[0]![0].replace(/[^\d.]/g, '');
  const pounds = Number(poundsText);
  if (!Number.isFinite(pounds)) {
    return { figure: null, review: 'The monetary amount is not finite.' };
  }
  return {
    figure: {
      ...base,
      amountPence: Math.round(pounds * 100),
      currency: 'GBP',
    },
    review: null,
  };
}
