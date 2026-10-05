import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const controllerModulePath = '../../src/components/booking-flow.ts';

function bookingMarkup(): string {
  return `
    <section data-booking-flow>
      <button type="button" data-booking-open>Start booking demo</button>
      <div data-booking-panel hidden>
        <form novalidate data-booking-form>
          <ol>
            <li data-progress-step="agent">Agent</li>
            <li data-progress-step="date-time">Date and time</li>
            <li data-progress-step="details">Your details</li>
            <li data-progress-step="review">Review</li>
          </ol>
          <section data-booking-step="agent">
            <h3 tabindex="-1" data-step-heading>Choose an agent</h3>
            <div data-agent-options></div>
            <p id="booking-agent-error" data-error-for="agentId"></p>
            <button type="button" data-booking-next>Continue</button>
            <button type="button" data-booking-cancel>Cancel</button>
          </section>
          <section data-booking-step="date-time" hidden>
            <h3 tabindex="-1" data-step-heading>Choose a date and time</h3>
            <label>Date<select name="date" aria-describedby="booking-date-error"><option value="">Choose a date</option></select></label>
            <p id="booking-date-error" data-error-for="date"></p>
            <label>Time<select name="time" aria-describedby="booking-time-error" disabled><option value="">Choose a time</option></select></label>
            <p id="booking-time-error" data-error-for="time"></p>
            <button type="button" data-booking-back>Back</button>
            <button type="button" data-booking-next>Continue</button>
            <button type="button" data-booking-cancel>Cancel</button>
          </section>
          <section data-booking-step="details" hidden>
            <h3 tabindex="-1" data-step-heading>Your details</h3>
            <label>Name<input name="name" /></label><p data-error-for="name"></p>
            <label>Email<input name="email" /></label><p data-error-for="email"></p>
            <label>Phone<input name="phone" /></label><p data-error-for="phone"></p>
            <label>Note<textarea name="note"></textarea></label><p data-error-for="note"></p>
            <button type="button" data-booking-back>Back</button>
            <button type="button" data-booking-next>Review</button>
            <button type="button" data-booking-cancel>Cancel</button>
          </section>
          <section data-booking-step="review" hidden>
            <h3 tabindex="-1" data-step-heading>Review your request</h3>
            <span data-review="agentId"></span><span data-review="date"></span>
            <span data-review="time"></span><span data-review="name"></span>
            <span data-review="email"></span><span data-review="phone"></span>
            <span data-review="note"></span>
            <button type="button" data-booking-back>Back</button>
            <button type="button" data-booking-confirm>Confirm (demo)</button>
            <button type="button" data-booking-cancel>Cancel</button>
          </section>
        </form>
      </div>
      <div data-booking-confirmation hidden>
        <h3 tabindex="-1" data-confirmation-heading>Demo - nothing has been sent</h3>
        <button type="button" data-booking-restart>Start again</button>
      </div>
      <p data-booking-status aria-live="polite"></p>
    </section>
  `;
}

async function initialise(document: Document): Promise<void> {
  const module = await import(controllerModulePath);
  module.initBookingFlows(document);
}

function click(window: Window, element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event);
}

function change(window: Window, element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string): void {
  element.value = value;
  element.dispatchEvent(new window.Event('change', { bubbles: true }) as unknown as Event);
}

async function reachDetails(window: Window, document: Document): Promise<void> {
  click(window, document.querySelector('[data-booking-open]'));
  const firstAgent = document.querySelector<HTMLInputElement>('input[name="agentId"]');
  expect(firstAgent).not.toBeNull();
  if (firstAgent) {
    firstAgent.checked = true;
    firstAgent.dispatchEvent(new window.Event('change', { bubbles: true }) as unknown as Event);
  }
  click(window, document.querySelector('[data-booking-step="agent"] [data-booking-next]'));

  const date = document.querySelector<HTMLSelectElement>('select[name="date"]');
  expect(date?.options.length).toBeGreaterThan(1);
  change(window, date!, date!.options[1]!.value);
  const time = document.querySelector<HTMLSelectElement>('select[name="time"]');
  expect(time?.options.length).toBe(17);
  change(window, time!, time!.options[1]!.value);
  click(window, document.querySelector('[data-booking-step="date-time"] [data-booking-next]'));
}

function fillDetails(window: Window, document: Document): void {
  change(window, document.querySelector<HTMLInputElement>('input[name="name"]')!, 'Ada Lovelace');
  change(window, document.querySelector<HTMLInputElement>('input[name="email"]')!, 'ada@example.com');
  change(window, document.querySelector<HTMLInputElement>('input[name="phone"]')!, '+44 1534 123456');
  change(window, document.querySelector<HTMLTextAreaElement>('textarea[name="note"]')!, 'Morning, please.');
}

describe('booking flow DOM controller', () => {
  let window: Window;
  let document: Document;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T12:00:00.000Z'));
    window = new Window({ url: 'https://example.test/property/demo' });
    document = window.document as unknown as Document;
    document.body.innerHTML = bookingMarkup();
  });

  afterEach(() => {
    window.close();
    vi.useRealTimers();
  });

  it('opens on the agent step and moves focus to its heading', async () => {
    await initialise(document);
    const opener = document.querySelector('[data-booking-open]');

    click(window, opener);

    expect(document.querySelector<HTMLElement>('[data-booking-panel]')?.hidden).toBe(false);
    expect(document.activeElement).toBe(document.querySelector('[data-booking-step="agent"] [data-step-heading]'));
    expect(document.querySelectorAll('input[name="agentId"]')).toHaveLength(2);
  });

  it('keeps an invalid step open, announces the error and focuses the first invalid field', async () => {
    await initialise(document);
    click(window, document.querySelector('[data-booking-open]'));

    click(window, document.querySelector('[data-booking-step="agent"] [data-booking-next]'));

    expect(document.querySelector('[data-error-for="agentId"]')?.textContent).toBe('Choose an agent.');
    expect(document.activeElement).toBe(document.querySelector('input[name="agentId"]'));
    expect(document.querySelector<HTMLElement>('[data-booking-step="agent"]')?.hidden).toBe(false);
  });

  it('preserves entered values on Back', async () => {
    await initialise(document);
    await reachDetails(window, document);
    fillDetails(window, document);
    click(window, document.querySelector('[data-booking-step="details"] [data-booking-next]'));

    click(window, document.querySelector('[data-booking-step="review"] [data-booking-back]'));

    expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('Ada Lovelace');
    expect(document.querySelector<HTMLTextAreaElement>('textarea[name="note"]')?.value).toBe('Morning, please.');
    expect(document.activeElement).toBe(document.querySelector('[data-booking-step="details"] [data-step-heading]'));
  });

  it('confirms without network or persistence, clears personal values, and restarts blank', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const storageSpy = vi.spyOn(window.localStorage, 'setItem');
    const historySpy = vi.spyOn(window.history, 'pushState');
    await initialise(document);
    await reachDetails(window, document);
    fillDetails(window, document);
    click(window, document.querySelector('[data-booking-step="details"] [data-booking-next]'));

    click(window, document.querySelector('[data-booking-confirm]'));

    expect(document.querySelector<HTMLElement>('[data-booking-confirmation]')?.hidden).toBe(false);
    expect(document.activeElement).toBe(document.querySelector('[data-confirmation-heading]'));
    expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(historySpy).not.toHaveBeenCalled();

    click(window, document.querySelector('[data-booking-restart]'));
    expect(document.querySelector<HTMLInputElement>('input[name="agentId"]:checked')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="email"]')?.value).toBe('');
    expect(document.activeElement).toBe(document.querySelector('[data-booking-step="agent"] [data-step-heading]'));
  });

  it('Cancel discards values, closes the flow and restores focus to its opener', async () => {
    await initialise(document);
    const opener = document.querySelector('[data-booking-open]');
    await reachDetails(window, document);
    fillDetails(window, document);

    click(window, document.querySelector('[data-booking-step="details"] [data-booking-cancel]'));

    expect(document.querySelector<HTMLElement>('[data-booking-panel]')?.hidden).toBe(true);
    expect(document.querySelector<HTMLInputElement>('input[name="name"]')?.value).toBe('');
    expect(document.querySelector('[data-booking-status]')?.textContent).toContain('Nothing was sent or saved');
    expect(document.activeElement).toBe(opener);
  });
});
