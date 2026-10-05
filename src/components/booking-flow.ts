import { experienceAgents } from '../data/experience.ts';
import {
  advanceBooking,
  backBooking,
  cancelBooking,
  createBookingState,
  getBookingDateOptions,
  getBookingSlots,
  restartBooking,
  updateBookingDraft,
  type BookingDraft,
  type BookingErrors,
  type BookingStep,
} from '../domain/booking.ts';

const stepOrder: Exclude<BookingStep, 'confirmation'>[] = [
  'agent',
  'date-time',
  'details',
  'review',
];

const dateLabel = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function option(document: Document, value: string, text: string): HTMLOptionElement {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = text;
  return element;
}

function fieldControl(flow: HTMLElement, field: keyof BookingDraft): HTMLElement | null {
  if (field === 'agentId') return flow.querySelector<HTMLInputElement>('input[name="agentId"]');
  return flow.querySelector<HTMLElement>(`[name="${field}"]`);
}

function initialiseFlow(flow: HTMLElement): void {
  const document = flow.ownerDocument;
  const panel = flow.querySelector<HTMLElement>('[data-booking-panel]');
  const confirmation = flow.querySelector<HTMLElement>('[data-booking-confirmation]');
  const form = flow.querySelector<HTMLFormElement>('[data-booking-form]');
  const status = flow.querySelector<HTMLElement>('[data-booking-status]');
  const agentOptions = flow.querySelector<HTMLElement>('[data-agent-options]');
  const dateSelect = flow.querySelector<HTMLSelectElement>('select[name="date"]');
  const timeSelect = flow.querySelector<HTMLSelectElement>('select[name="time"]');

  if (!panel || !confirmation || !form || !status || !agentOptions || !dateSelect || !timeSelect) return;

  const bookingPanel = panel;
  const bookingConfirmation = confirmation;
  const bookingForm = form;
  const bookingStatus = status;
  const bookingAgentOptions = agentOptions;
  const bookingDateSelect = dateSelect;
  const bookingTimeSelect = timeSelect;

  let state = createBookingState();
  let context = {
    now: new Date(),
    allowedAgentIds: experienceAgents.map((agent) => agent.id),
  };
  let returnFocus: HTMLElement | null = null;

  if (!bookingAgentOptions.querySelector('input[name="agentId"]')) {
    for (const agent of experienceAgents) {
      const label = document.createElement('label');
      label.className = 'agent-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'agentId';
      input.value = agent.id;
      input.required = true;
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = agent.name;
      const role = document.createElement('small');
      role.textContent = agent.role;
      copy.append(name, role);
      label.append(input, copy);
      bookingAgentOptions.append(label);
    }
  }

  function fillDates(): void {
    bookingDateSelect.replaceChildren(option(document, '', 'Choose a date'));
    for (const date of getBookingDateOptions(context.now)) {
      const label = dateLabel.format(new Date(`${date}T12:00:00.000Z`));
      bookingDateSelect.append(option(document, date, label));
    }
  }

  function fillTimes(date: string): void {
    bookingTimeSelect.replaceChildren(option(document, '', 'Choose a time'));
    for (const slot of getBookingSlots(date, context.now)) {
      bookingTimeSelect.append(option(document, slot.time, slot.label));
    }
    bookingTimeSelect.disabled = !date;
  }

  function readDraft(): BookingDraft {
    return {
      agentId: flow.querySelector<HTMLInputElement>('input[name="agentId"]:checked')?.value ?? '',
      date: bookingDateSelect.value,
      time: bookingTimeSelect.value,
      name: flow.querySelector<HTMLInputElement>('input[name="name"]')?.value ?? '',
      email: flow.querySelector<HTMLInputElement>('input[name="email"]')?.value ?? '',
      phone: flow.querySelector<HTMLInputElement>('input[name="phone"]')?.value ?? '',
      note: flow.querySelector<HTMLTextAreaElement>('textarea[name="note"]')?.value ?? '',
    };
  }

  function syncStateFromControls(): void {
    state = updateBookingDraft(state, readDraft());
  }

  function syncControlsFromState(): void {
    for (const input of flow.querySelectorAll<HTMLInputElement>('input[name="agentId"]')) {
      input.checked = input.value === state.draft.agentId;
    }
    bookingDateSelect.value = state.draft.date;
    fillTimes(state.draft.date);
    bookingTimeSelect.value = state.draft.time;

    for (const field of ['name', 'email', 'phone'] as const) {
      const input = flow.querySelector<HTMLInputElement>(`input[name="${field}"]`);
      if (input) input.value = state.draft[field];
    }
    const note = flow.querySelector<HTMLTextAreaElement>('textarea[name="note"]');
    if (note) note.value = state.draft.note;
  }

  function clearErrors(): void {
    for (const error of flow.querySelectorAll<HTMLElement>('[data-error-for]')) error.textContent = '';
    for (const control of flow.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
      control.removeAttribute('aria-invalid');
    }
  }

  function showErrors(errors: BookingErrors): void {
    clearErrors();
    for (const [field, message] of Object.entries(errors)) {
      const error = flow.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
      if (error) error.textContent = message;
      if (field === 'agentId') {
        for (const input of flow.querySelectorAll<HTMLInputElement>('input[name="agentId"]')) {
          input.setAttribute('aria-invalid', 'true');
        }
      } else {
        fieldControl(flow, field as keyof BookingDraft)?.setAttribute('aria-invalid', 'true');
      }
    }

    const firstField = Object.keys(errors)[0] as keyof BookingDraft | undefined;
    if (firstField) fieldControl(flow, firstField)?.focus();
  }

  function showStep(step: Exclude<BookingStep, 'confirmation'>, focusHeading = true): void {
    bookingPanel.hidden = false;
    bookingConfirmation.hidden = true;
    for (const section of flow.querySelectorAll<HTMLElement>('[data-booking-step]')) {
      section.hidden = section.dataset.bookingStep !== step;
    }
    for (const progress of flow.querySelectorAll<HTMLElement>('[data-progress-step]')) {
      if (progress.dataset.progressStep === step) progress.setAttribute('aria-current', 'step');
      else progress.removeAttribute('aria-current');
    }
    if (step === 'review') updateReview();
    if (focusHeading) {
      flow.querySelector<HTMLElement>(`[data-booking-step="${step}"] [data-step-heading]`)?.focus();
    }
  }

  function updateReview(): void {
    const agent = experienceAgents.find((candidate) => candidate.id === state.draft.agentId);
    const values: Record<keyof BookingDraft, string> = {
      ...state.draft,
      agentId: agent ? `${agent.name} — ${agent.role}` : '',
      date: bookingDateSelect.selectedOptions[0]?.textContent ?? state.draft.date,
      time: `${state.draft.time} Jersey time (demo)`,
      phone: state.draft.phone || 'Not provided',
      note: state.draft.note || 'Not provided',
    };
    for (const [field, value] of Object.entries(values)) {
      const target = flow.querySelector<HTMLElement>(`[data-review="${field}"]`);
      if (target) target.textContent = value;
    }
  }

  function openFlow(opener: HTMLElement): void {
    returnFocus = opener;
    context = { ...context, now: new Date() };
    state = restartBooking(state);
    fillDates();
    syncControlsFromState();
    clearErrors();
    bookingStatus.textContent = '';
    flow.querySelector<HTMLElement>('[data-booking-launcher]')?.setAttribute('hidden', '');
    showStep('agent');
  }

  for (const opener of flow.querySelectorAll<HTMLElement>('[data-booking-open]')) {
    opener.addEventListener('click', () => openFlow(opener));
  }

  bookingForm.addEventListener('submit', (event) => event.preventDefault());
  bookingForm.addEventListener('change', (event) => {
    if (!(event.target instanceof document.defaultView!.HTMLElement)) return;
    if (event.target.matches('select[name="date"]')) {
      fillTimes(bookingDateSelect.value);
    }
    syncStateFromControls();
    const name = event.target.getAttribute('name');
    if (name) {
      const error = flow.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (error) error.textContent = '';
      event.target.removeAttribute('aria-invalid');
    }
  });

  for (const next of flow.querySelectorAll<HTMLElement>('[data-booking-next]')) {
    next.addEventListener('click', () => {
      syncStateFromControls();
      const result = advanceBooking(state, context);
      state = result.state;
      if (Object.keys(result.errors).length) {
        showErrors(result.errors);
        bookingStatus.textContent = 'Check the highlighted field before continuing.';
        return;
      }
      clearErrors();
      bookingStatus.textContent = '';
      if (state.step !== 'confirmation') showStep(state.step);
    });
  }

  for (const back of flow.querySelectorAll<HTMLElement>('[data-booking-back]')) {
    back.addEventListener('click', () => {
      syncStateFromControls();
      state = backBooking(state);
      if (state.step !== 'confirmation') showStep(state.step);
    });
  }

  for (const cancel of flow.querySelectorAll<HTMLElement>('[data-booking-cancel]')) {
    cancel.addEventListener('click', () => {
      state = cancelBooking(state);
      syncControlsFromState();
      clearErrors();
      bookingPanel.hidden = true;
      bookingConfirmation.hidden = true;
      flow.querySelector<HTMLElement>('[data-booking-launcher]')?.removeAttribute('hidden');
      bookingStatus.textContent = 'Booking demo cancelled. Nothing was sent or saved.';
      returnFocus?.focus();
    });
  }

  flow.querySelector<HTMLElement>('[data-booking-confirm]')?.addEventListener('click', () => {
    syncStateFromControls();
    const result = advanceBooking(state, context);
    state = result.state;
    if (Object.keys(result.errors).length) {
      showErrors(result.errors);
      bookingStatus.textContent = 'Check the highlighted field before confirming.';
      return;
    }
    syncControlsFromState();
    clearErrors();
    bookingPanel.hidden = true;
    bookingConfirmation.hidden = false;
    bookingStatus.textContent = 'Demo confirmed. Nothing was sent or saved.';
    flow.querySelector<HTMLElement>('[data-confirmation-heading]')?.focus();
  });

  flow.querySelector<HTMLElement>('[data-booking-restart]')?.addEventListener('click', () => {
    state = restartBooking(state);
    fillDates();
    syncControlsFromState();
    clearErrors();
    bookingStatus.textContent = '';
    showStep('agent');
  });

  document.defaultView?.addEventListener('pagehide', () => {
    state = cancelBooking(state);
    syncControlsFromState();
  }, { once: true });

  fillDates();
  fillTimes('');
  for (const step of stepOrder) {
    const section = flow.querySelector<HTMLElement>(`[data-booking-step="${step}"]`);
    if (section) section.hidden = step !== 'agent';
  }
}

export function initBookingFlows(root: ParentNode = document): void {
  for (const flow of root.querySelectorAll<HTMLElement>('[data-booking-flow]')) initialiseFlow(flow);
}
