import { describe, expect, it } from 'vitest';
import {
  PRICE_MAX_PENCE,
  computeMortgage,
  depositFromPercent,
  formatMoneyInput,
  formatPence,
  formatPercentInput,
  parseMoneyInput,
  parsePercentInput,
  parseYearsInput,
  penceToBasisPoints,
  roundPenceHalfAwayFromZero,
  validateCalculator,
} from '../../../src/domain/mortgage.ts';

describe('mortgage input grammar', () => {
  it.each([
    ['125000', 12_500_000],
    ['125,000', 12_500_000],
    ['£125,000.50', 12_500_050],
    ['125,000.5', 12_500_050],
    ['£100,000,000', PRICE_MAX_PENCE],
    ['0', 0],
    ['0.01', 1],
    [' 125000\t', 12_500_000],
  ])('parses unambiguous GBP input %s', (raw, pence) => {
    expect(parseMoneyInput(raw)).toEqual({ ok: true, pence });
  });

  it.each([
    '', ' £125000', '125 000', '1,00,000', '125.000,50', '12,5',
    '125,000.505', '1e5', '-5', '£ 5', '0x10', '125000\n', '1,2345',
    '12,50', '.5', '5.', '££5', '5£', '١٢٣', '99999999999999999999',
  ])('rejects the whole ambiguous GBP input %j', raw => {
    expect(parseMoneyInput(raw)).toEqual({ ok: false });
  });

  it.each([
    ['10', 1000], ['12.5', 1250], ['12.50%', 1250], ['0', 0], ['100', 10_000], ['20.01', 2001],
  ])('parses percentage input %s into basis points', (raw, basisPoints) => {
    expect(parsePercentInput(raw)).toEqual({ ok: true, basisPoints });
  });

  it.each(['', '12,5', '5.125', '£5', '%', '.5', '-1', '1e1', '1 2', '12.5 %', 'NaN', 'Infinity', '12%%'])
    ('rejects invalid percentage input %j', raw => {
      expect(parsePercentInput(raw)).toEqual({ ok: false });
    });

  it.each([['1', 1], ['25', 25], ['40', 40]])('parses whole years %s', (raw, years) => {
    expect(parseYearsInput(raw)).toEqual({ ok: true, years });
  });

  it.each(['', '25.0', '25.5', '2,5', '1e1', '-1', '٢', 'Infinity'])
    ('rejects invalid years %j', raw => {
      expect(parseYearsInput(raw)).toEqual({ ok: false });
    });
});

describe('mortgage rounding and formatting', () => {
  it.each([[0.5, 1], [2.5, 3], [8333.5, 8334], [-2.5, -3], [8333.4, 8333]])
    ('rounds %s pence half away from zero', (raw, expected) => {
      expect(roundPenceHalfAwayFromZero(raw)).toBe(expected);
    });

  it('recovers a half-penny left one floating-point step below the boundary', () => {
    const raw = 8333.5 - 2 ** -39;
    expect(Math.round(raw)).toBe(8333);
    expect(roundPenceHalfAwayFromZero(raw)).toBe(8334);
  });

  it('rejects non-finite rounding and never returns negative zero', () => {
    expect(() => roundPenceHalfAwayFromZero(Number.NaN)).toThrow(RangeError);
    expect(() => roundPenceHalfAwayFromZero(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(Object.is(roundPenceHalfAwayFromZero(-1e-9), 0)).toBe(true);
  });

  it('formats GBP with en-GB grouping after rounding in pence', () => {
    expect(formatPence(888_487.8867834162)).toBe('£8,884.88');
    expect(formatPence(10_661_854.641400993)).toBe('£106,618.55');
    expect(formatPence(8333.5)).toBe('£83.34');
    expect(formatPence(-1e-9)).toBe('£0.00');
  });

  it('formats editable money and percentage values back into accepted grammar', () => {
    expect(formatMoneyInput(12_500_000)).toBe('125,000');
    expect(formatMoneyInput(12_500_050)).toBe('125,000.50');
    expect(formatMoneyInput(1)).toBe('0.01');
    expect(formatPercentInput(1000)).toBe('10');
    expect(formatPercentInput(1250)).toBe('12.50');
    expect(parseMoneyInput(formatMoneyInput(12_500_050))).toEqual({ ok: true, pence: 12_500_050 });
    expect(parsePercentInput(formatPercentInput(1250))).toEqual({ ok: true, basisPoints: 1250 });
  });
});

describe('mortgage calculation', () => {
  it('matches the 12% one-year fixture and derives totals from the unrounded payment', () => {
    const result = computeMortgage({ pricePence: 10_000_000, depositPence: 0, ratePct: 12, years: 1 });
    expect(result.kind).toBe('payment');
    if (result.kind !== 'payment') throw new Error('Expected payment');
    expect(result.months).toBe(12);
    expect(result.monthlyPence).toBeCloseTo(888_487.886783417, 6);
    expect(formatPence(result.monthlyPence)).toBe('£8,884.88');
    expect(formatPence(result.totalPaidPence)).toBe('£106,618.55');
    expect(formatPence(result.totalInterestPence)).toBe('£6,618.55');
    expect(formatPence(roundPenceHalfAwayFromZero(result.monthlyPence) * 12)).toBe('£106,618.56');
  });

  it('uses the zero-interest branch', () => {
    const result = computeMortgage({ pricePence: 10_000_000, depositPence: 0, ratePct: 0, years: 1 });
    expect(result.kind).toBe('payment');
    if (result.kind !== 'payment') throw new Error('Expected payment');
    expect(formatPence(result.monthlyPence)).toBe('£8,333.33');
    expect(formatPence(result.totalPaidPence)).toBe('£100,000.00');
    expect(formatPence(result.totalInterestPence)).toBe('£0.00');
  });

  it('treats percent and GBP deposits equivalently', () => {
    const percentDeposit = depositFromPercent(12_500_000, 2000);
    expect(percentDeposit).toBe(2_500_000);
    expect(computeMortgage({ pricePence: 12_500_000, depositPence: percentDeposit, ratePct: 12, years: 1 }))
      .toEqual(computeMortgage({ pricePence: 12_500_000, depositPence: 2_500_000, ratePct: 12, years: 1 }));
    expect(penceToBasisPoints(2_500_000, 12_500_000)).toBe(2000);
  });

  it('rounds a percentage-derived half penny up and detects a full deposit', () => {
    expect(depositFromPercent(3, 5000)).toBe(2);
    expect(depositFromPercent(1, 5000)).toBe(1);
    expect(computeMortgage({ pricePence: 1, depositPence: 1, ratePct: 5, years: 1 }))
      .toEqual({ kind: 'no-mortgage-needed' });
  });

  it.each([
    { pricePence: 0, depositPence: 0, ratePct: 5, years: 25 },
    { pricePence: PRICE_MAX_PENCE + 1, depositPence: 0, ratePct: 5, years: 25 },
    { pricePence: 100, depositPence: 101, ratePct: 5, years: 25 },
    { pricePence: 100, depositPence: -1, ratePct: 5, years: 25 },
    { pricePence: 100, depositPence: 0, ratePct: 20.01, years: 25 },
    { pricePence: 100, depositPence: 0, ratePct: 5, years: 0 },
    { pricePence: 100, depositPence: 0, ratePct: 5, years: 41 },
    { pricePence: 100, depositPence: 0, ratePct: 5, years: 2.5 },
  ])('guards invalid programmatic input %#', input => {
    expect(() => computeMortgage(input)).toThrow(RangeError);
  });
});

describe('mortgage calculator validation', () => {
  const base = { price: '125,000', deposit: '10', depositMode: 'percent' as const, rate: '5', years: '25' };

  it('validates all fields and returns a calculation-ready input', () => {
    expect(validateCalculator(base)).toEqual({
      ok: true,
      input: { pricePence: 12_500_000, depositPence: 1_250_000, ratePct: 5, years: 25 },
    });
  });

  it('returns every field error and no partial input', () => {
    expect(validateCalculator({ ...base, price: '0', rate: '', years: '41' })).toEqual({
      ok: false,
      errors: {
        price: 'Enter a price above £0 and up to £100,000,000, for example 125,000 or 125,000.50.',
        rate: 'Enter an interest rate from 0 to 20%, with up to 2 decimal places.',
        years: 'Enter a whole number of years from 1 to 40.',
      },
    });
  });

  it('accepts exact limits and rejects values immediately beyond them', () => {
    expect(validateCalculator({ ...base, price: '0.01', deposit: '100.00%', rate: '20.00%', years: '40' }).ok).toBe(true);
    expect(validateCalculator({ ...base, price: '100,000,000', deposit: '0', rate: '0', years: '1' }).ok).toBe(true);
    expect(validateCalculator({ ...base, price: '100,000,000.01' })).toMatchObject({ ok: false, errors: { price: expect.any(String) } });
    expect(validateCalculator({ ...base, deposit: '100.01' })).toMatchObject({ ok: false, errors: { deposit: expect.any(String) } });
    expect(validateCalculator({ ...base, rate: '20.01' })).toMatchObject({ ok: false, errors: { rate: expect.any(String) } });
  });

  it('accepts a GBP deposit equal to price but rejects one penny more', () => {
    expect(validateCalculator({ ...base, depositMode: 'gbp', deposit: '£125,000' }).ok).toBe(true);
    expect(validateCalculator({ ...base, depositMode: 'gbp', deposit: '125,000.01' })).toMatchObject({
      ok: false,
      errors: { deposit: 'The deposit cannot be more than the price.' },
    });
  });
});
