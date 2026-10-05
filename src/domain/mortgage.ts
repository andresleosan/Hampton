const MONEY_RE = /^£?(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/;
const PERCENT_RE = /^(\d+)(?:\.(\d{1,2}))?%?$/;
const YEARS_RE = /^\d+$/;

export const PRICE_MAX_PENCE = 10_000_000_000;
export const RATE_MAX_BASIS_POINTS = 2_000;
export const YEARS_MIN = 1;
export const YEARS_MAX = 40;

export const VALIDATION_MESSAGES = {
  price: 'Enter a price above £0 and up to £100,000,000, for example 125,000 or 125,000.50.',
  depositPercent: 'Enter a deposit from 0 to 100%, with up to 2 decimal places.',
  depositGbp: 'Enter a deposit in pounds, for example 25,000 or 25,000.50.',
  depositOverPrice: 'The deposit cannot be more than the price.',
  rate: 'Enter an interest rate from 0 to 20%, with up to 2 decimal places.',
  years: 'Enter a whole number of years from 1 to 40.',
} as const;

export type MortgageInput = {
  pricePence: number;
  depositPence: number;
  ratePct: number;
  years: number;
};

export type MortgageResult =
  | { kind: 'no-mortgage-needed' }
  | {
      kind: 'payment';
      loanPence: number;
      months: number;
      monthlyPence: number;
      totalPaidPence: number;
      totalInterestPence: number;
    };

export type MortgageField = 'price' | 'deposit' | 'rate' | 'years';
export type DepositMode = 'percent' | 'gbp';

export interface CalculatorRaw {
  price: string;
  deposit: string;
  depositMode: DepositMode;
  rate: string;
  years: string;
}

export type CalculatorValidation =
  | { ok: true; input: MortgageInput }
  | { ok: false; errors: Partial<Record<MortgageField, string>> };

function trimAsciiEdges(value: string): string {
  return value.replace(/^[ \t]+|[ \t]+$/g, '');
}

function fullMatch(pattern: RegExp, value: string): RegExpExecArray | null {
  const match = pattern.exec(value);
  return match?.[0] === value ? match : null;
}

export function parseMoneyInput(s: string): { ok: true; pence: number } | { ok: false } {
  if (typeof s !== 'string') return { ok: false };
  const value = trimAsciiEdges(s);
  const match = fullMatch(MONEY_RE, value);
  if (!match) return { ok: false };

  const withoutPound = value.startsWith('£') ? value.slice(1) : value;
  const [wholeText, fractionText = ''] = withoutPound.replaceAll(',', '').split('.');
  const pounds = Number(wholeText);
  const fraction = fractionText.length === 0 ? 0 : Number(fractionText.padEnd(2, '0'));
  const pence = pounds * 100 + fraction;
  return Number.isSafeInteger(pounds) && Number.isSafeInteger(pence) ? { ok: true, pence } : { ok: false };
}

export function parsePercentInput(s: string): { ok: true; basisPoints: number } | { ok: false } {
  if (typeof s !== 'string') return { ok: false };
  const value = trimAsciiEdges(s);
  const match = fullMatch(PERCENT_RE, value);
  if (!match) return { ok: false };

  const whole = Number(match[1]);
  const fraction = match[2] === undefined ? 0 : Number(match[2].padEnd(2, '0'));
  const basisPoints = whole * 100 + fraction;
  return Number.isSafeInteger(whole) && Number.isSafeInteger(basisPoints) ? { ok: true, basisPoints } : { ok: false };
}

export function parseYearsInput(s: string): { ok: true; years: number } | { ok: false } {
  if (typeof s !== 'string') return { ok: false };
  const value = trimAsciiEdges(s);
  if (!fullMatch(YEARS_RE, value)) return { ok: false };
  const years = Number(value);
  return Number.isSafeInteger(years) ? { ok: true, years } : { ok: false };
}

export function roundPenceHalfAwayFromZero(pence: number): number {
  if (!Number.isFinite(pence)) throw new RangeError('Pence must be finite.');
  const absolute = Math.abs(pence);
  const rounded = Math.round(absolute + absolute * Number.EPSILON);
  if (rounded === 0) return 0;
  return pence < 0 ? -rounded : rounded;
}

const GBP_FORMAT = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPence(pence: number): string {
  return GBP_FORMAT.format(roundPenceHalfAwayFromZero(pence) / 100);
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be a safe integer.`);
}

function groupThousands(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatMoneyInput(pence: number): string {
  assertSafeInteger(pence, 'Pence');
  const sign = pence < 0 ? '-' : '';
  const absolute = Math.abs(pence);
  const pounds = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  return `${sign}${groupThousands(pounds)}${fraction === 0 ? '' : `.${String(fraction).padStart(2, '0')}`}`;
}

export function formatPercentInput(basisPoints: number): string {
  assertSafeInteger(basisPoints, 'Basis points');
  const sign = basisPoints < 0 ? '-' : '';
  const absolute = Math.abs(basisPoints);
  const whole = Math.floor(absolute / 100);
  const fraction = absolute % 100;
  return `${sign}${whole}${fraction === 0 ? '' : `.${String(fraction).padStart(2, '0')}`}`;
}

function monthlyPaymentPence(principalPence: number, ratePct: number, years: number): number {
  const months = years * 12;
  const monthlyRate = ratePct / 100 / 12;
  if (monthlyRate === 0) return principalPence / months;
  return principalPence * monthlyRate / (1 - (1 + monthlyRate) ** -months);
}

export function computeMortgage(input: MortgageInput): MortgageResult {
  const { pricePence, depositPence, ratePct, years } = input;
  if (!Number.isSafeInteger(pricePence) || pricePence <= 0 || pricePence > PRICE_MAX_PENCE) {
    throw new RangeError('Price is outside the demo limits.');
  }
  if (!Number.isSafeInteger(depositPence) || depositPence < 0 || depositPence > pricePence) {
    throw new RangeError('Deposit is outside the demo limits.');
  }
  if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > RATE_MAX_BASIS_POINTS / 100) {
    throw new RangeError('Interest rate is outside the demo limits.');
  }
  if (!Number.isInteger(years) || years < YEARS_MIN || years > YEARS_MAX) {
    throw new RangeError('Term is outside the demo limits.');
  }
  if (depositPence === pricePence) return { kind: 'no-mortgage-needed' };

  const loanPence = pricePence - depositPence;
  const months = years * 12;
  const monthlyPence = monthlyPaymentPence(loanPence, ratePct, years);
  const totalPaidPence = monthlyPence * months;
  return {
    kind: 'payment',
    loanPence,
    months,
    monthlyPence,
    totalPaidPence,
    totalInterestPence: totalPaidPence - loanPence,
  };
}

export function depositFromPercent(pricePence: number, basisPoints: number): number {
  assertSafeInteger(pricePence, 'Price');
  assertSafeInteger(basisPoints, 'Basis points');
  if (pricePence < 0 || basisPoints < 0) throw new RangeError('Deposit conversion values cannot be negative.');
  const product = pricePence * basisPoints;
  if (!Number.isSafeInteger(product)) throw new RangeError('Deposit conversion exceeds safe integer precision.');
  return Math.floor((product + 5_000) / 10_000);
}

export function penceToBasisPoints(depositPence: number, pricePence: number): number {
  assertSafeInteger(depositPence, 'Deposit');
  assertSafeInteger(pricePence, 'Price');
  if (depositPence < 0 || pricePence <= 0) throw new RangeError('Deposit conversion values are outside their limits.');
  const numerator = depositPence * 20_000 + pricePence;
  if (!Number.isSafeInteger(numerator)) throw new RangeError('Deposit conversion exceeds safe integer precision.');
  return Math.floor(numerator / (2 * pricePence));
}

export function validateCalculator(raw: CalculatorRaw): CalculatorValidation {
  const errors: Partial<Record<MortgageField, string>> = {};
  const parsedPrice = parseMoneyInput(raw.price);
  const pricePence = parsedPrice.ok ? parsedPrice.pence : null;
  const priceIsValid = pricePence !== null && pricePence > 0 && pricePence <= PRICE_MAX_PENCE;
  if (!priceIsValid) errors.price = VALIDATION_MESSAGES.price;

  let depositPence: number | null = null;
  if (raw.depositMode === 'percent') {
    const parsedDeposit = parsePercentInput(raw.deposit);
    if (!parsedDeposit.ok || parsedDeposit.basisPoints > 10_000) {
      errors.deposit = VALIDATION_MESSAGES.depositPercent;
    } else if (priceIsValid) {
      depositPence = depositFromPercent(pricePence, parsedDeposit.basisPoints);
    }
  } else if (raw.depositMode === 'gbp') {
    const parsedDeposit = parseMoneyInput(raw.deposit);
    if (!parsedDeposit.ok) {
      errors.deposit = VALIDATION_MESSAGES.depositGbp;
    } else if (priceIsValid && parsedDeposit.pence > pricePence) {
      errors.deposit = VALIDATION_MESSAGES.depositOverPrice;
    } else {
      depositPence = parsedDeposit.pence;
    }
  } else {
    errors.deposit = VALIDATION_MESSAGES.depositGbp;
  }

  const parsedRate = parsePercentInput(raw.rate);
  if (!parsedRate.ok || parsedRate.basisPoints > RATE_MAX_BASIS_POINTS) {
    errors.rate = VALIDATION_MESSAGES.rate;
  }

  const parsedYears = parseYearsInput(raw.years);
  if (!parsedYears.ok || parsedYears.years < YEARS_MIN || parsedYears.years > YEARS_MAX) {
    errors.years = VALIDATION_MESSAGES.years;
  }

  if (Object.keys(errors).length > 0 || !priceIsValid || depositPence === null || !parsedRate.ok || !parsedYears.ok) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    input: {
      pricePence,
      depositPence,
      ratePct: parsedRate.basisPoints / 100,
      years: parsedYears.years,
    },
  };
}
