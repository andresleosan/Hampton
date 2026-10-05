import { describe, expect, it } from 'vitest';
import { inferOperation, normalisePrice, normaliseStatus } from '../../../src/importer/normalise.ts';

describe('normalisePrice', () => {
  it('preserves a monthly negotiable price and stores GBP as integer pence', () => {
    expect(normalisePrice('£1,900 per month (negotiable)', 'rent')).toEqual({
      figure: {
        type: 'rent',
        amountPence: 190_000,
        currency: 'GBP',
        period: 'month',
        originalText: '£1,900 per month (negotiable)',
        underReview: false,
      },
      review: null,
    });
  });

  it.each(['POA', 'Confidential', 'Negotiable', ''])('never invents a zero amount for %j', (literal) => {
    const result = normalisePrice(literal, 'sale');
    expect(result.figure?.originalText).toBe(literal);
    expect(result.figure?.amountPence).toBeNull();
  });

  it('refuses to guess when one field contains multiple amounts', () => {
    const result = normalisePrice('Premium £90,000; rental £60,000 PA', 'lease');
    expect(result.figure).toBeNull();
    expect(result.review).toMatch(/multiple monetary amounts/i);
  });

  it('refuses an unfamiliar number format instead of misreading it', () => {
    const result = normalisePrice('£125.000,50', 'sale');
    expect(result.figure).toBeNull();
    expect(result.review).toMatch(/unsupported monetary format/i);
  });
});

describe('status normalisation', () => {
  it.each([
    ['FOR SALE', 'sale', 'open'],
    ['TO LET', 'rent', 'open'],
    ['UNDER OFFER', 'sale', 'open'],
    ['SOLD', 'sale', 'closed'],
    ['LET', 'rent', 'closed'],
    ['', 'unknown', 'none'],
  ] as const)('maps %j faithfully', (literal, operation, expected) => {
    expect(normaliseStatus(literal, operation)).toBe(expected);
  });

  it('infers only explicit source operations', () => {
    expect(inferOperation('FOR SALE')).toBe('sale');
    expect(inferOperation('TO LET')).toBe('rent');
    expect(inferOperation('Something novel')).toBe('unknown');
  });
});
