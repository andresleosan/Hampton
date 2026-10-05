import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const componentPath = 'src/components/MortgageCalculator.astro';

function componentSource(): string {
  expect(existsSync(componentPath), 'MortgageCalculator component exists').toBe(true);
  return existsSync(componentPath) ? readFileSync(componentPath, 'utf8') : '';
}

describe('mortgage calculator component', () => {
  it('presents four labelled, described inputs and announces validation and results', () => {
    const source = componentSource();

    expect(source).toContain('aria-labelledby="mortgage-title"');
    expect(source).toMatch(/<label[^>]+for="mortgage-price"[^>]*>Price/);
    expect(source).toMatch(/<label[^>]+for="mortgage-deposit"[^>]*>Deposit/);
    expect(source).toMatch(/<label[^>]+for="mortgage-rate"[^>]*>Annual interest rate/);
    expect(source).toMatch(/<label[^>]+for="mortgage-years"[^>]*>Mortgage term/);
    expect(source).toContain('aria-describedby="mortgage-rate-hint mortgage-rate-error"');
    expect(source).toContain('id="mortgage-errors"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('id="mortgage-result"');
  });

  it('starts with labelled illustrative defaults and calculates the initial demo estimate', () => {
    const source = componentSource();

    expect(source).toMatch(/id="mortgage-rate"[\s\S]*?value="5\.00"/);
    expect(source).toContain('Initial value: 10% deposit - illustrative and editable');
    expect(source).toContain('Initial value: 25-year term - illustrative and editable');
    expect(source).not.toContain('10% deposit - illustrative default');
    expect(source).not.toContain('25-year term - illustrative default');
    expect(source).toContain('Illustrative demo rate — editable; not current, offered or recommended.');
    expect(source).toContain('20% is a demo validity limit, not a recommended rate.');
    expect(source).toContain('Indicative only. Not a mortgage offer or financial advice.');
    expect(source).toContain('Figures rounded to the nearest penny.');
    expect(source).toContain("form.addEventListener('submit', event => {");
    expect(source).toMatch(/    \}\);\r?\n\r?\n    update\(\);/);
  });

  it('uses a compact field grid and an accessible segmented deposit control', () => {
    const source = componentSource();

    expect(source).toContain('class="calculator-fields"');
    expect(source).toMatch(/<fieldset class="deposit-mode"[\s\S]*?<legend>Deposit format<\/legend>/);
    expect(source).toMatch(/<span>Percentage<\/span>[\s\S]*?<span>Pounds<\/span>/);
    expect(source).toMatch(/\.calculator-fields\s*\{[\s\S]*?display:\s*grid/);
    expect(source).toMatch(/\.mortgage-form \.field\s*\{[\s\S]*?margin:\s*0/);
    expect(source).toMatch(/\.deposit-mode label\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  });

  it('keeps the advice boundary beside the primary result and makes assumptions secondary', () => {
    const source = componentSource();

    expect(source).toMatch(
      /data-payment-result[\s\S]*?class="monthly-payment"[\s\S]*?class="result-disclosure"[\s\S]*?Indicative only\. Not a mortgage offer or financial advice\./,
    );
    expect(source).toContain('<details class="assumptions">');
    expect(source).toContain('<summary>Assumptions behind this estimate</summary>');
    expect(source).not.toContain('class="advice-boundary"');
  });

  it('recalculates from the domain functions on every input change without network or persistence', () => {
    const source = componentSource();

    for (const name of [
      'computeMortgage',
      'depositFromPercent',
      'formatMoneyInput',
      'formatPence',
      'formatPercentInput',
      'penceToBasisPoints',
      'validateCalculator',
    ]) {
      expect(source, `uses ${name} from the mortgage domain`).toContain(name);
    }
    expect(source).toContain("form.addEventListener('input', update)");
    expect(source).toContain("form.addEventListener('change', update)");
    expect(source).toContain('No mortgage needed: the deposit covers the full price.');
    expect(source).not.toMatch(/\b(?:fetch|localStorage|sessionStorage|indexedDB)\b/);
  });
});
