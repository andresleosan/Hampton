const JERSEY_TIME_ZONE = 'Europe/Jersey';

export interface BookingDraft {
  agentId: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  note: string;
}

export interface BookingSlot {
  date: string;
  time: string;
  label: string;
  startsAt: string;
}

export type BookingStep = 'agent' | 'date-time' | 'details' | 'review' | 'confirmation';
export type BookingStatus = 'editing' | 'confirmed' | 'closed';
export type BookingErrors = Partial<Record<keyof BookingDraft, string>>;

export interface BookingState {
  status: BookingStatus;
  step: BookingStep;
  draft: BookingDraft;
}

export interface BookingContext {
  now: Date;
  allowedAgentIds: readonly string[];
}

export interface BookingTransition {
  state: BookingState;
  errors: BookingErrors;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const jerseyFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: JERSEY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const slotTimes = Array.from({ length: 16 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
});

function emptyDraft(): BookingDraft {
  return { agentId: '', date: '', time: '', name: '', email: '', phone: '', note: '' };
}

function jerseyParts(instant: Date): CalendarDate & { hour: number; minute: number } {
  const parts = Object.fromEntries(
    jerseyFormatter.formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

function formatDate(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function isWeekday(date: CalendarDate): boolean {
  const day = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return day >= 1 && day <= 5;
}

function parseDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const normalised = new Date(Date.UTC(date.year, date.month - 1, date.day));
  if (
    normalised.getUTCFullYear() !== date.year
    || normalised.getUTCMonth() + 1 !== date.month
    || normalised.getUTCDate() !== date.day
  ) return null;
  return date;
}

function matchingJerseyInstants(date: CalendarDate, time: string): Date[] {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const wallClockAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  const matches = new Map<number, Date>();

  for (let deltaMinutes = -120; deltaMinutes <= 120; deltaMinutes += 30) {
    const candidate = new Date(wallClockAsUtc + deltaMinutes * 60_000);
    const parts = jerseyParts(candidate);
    if (
      parts.year === date.year
      && parts.month === date.month
      && parts.day === date.day
      && parts.hour === hour
      && parts.minute === minute
    ) matches.set(candidate.getTime(), candidate);
  }

  return [...matches.values()].sort((left, right) => left.getTime() - right.getTime());
}

export function getBookingDateOptions(now: Date): string[] {
  const today = jerseyParts(now);
  const result: string[] = [];

  for (let dayNumber = 1; dayNumber <= 30; dayNumber += 1) {
    const date = addCalendarDays(today, dayNumber);
    if (isWeekday(date)) result.push(formatDate(date));
  }

  return result;
}

export function getBookingSlots(dateValue: string, now: Date): BookingSlot[] {
  if (!getBookingDateOptions(now).includes(dateValue)) return [];
  const date = parseDate(dateValue);
  if (!date) return [];

  return slotTimes.flatMap((time) => {
    const instants = matchingJerseyInstants(date, time);
    if (instants.length !== 1) return [];
    return [{ date: dateValue, time, label: `${time} (Demo)`, startsAt: instants[0].toISOString() }];
  });
}

export function validateBookingDraft(draft: BookingDraft, context: BookingContext): BookingErrors {
  const errors: BookingErrors = {};

  if (!draft.agentId) errors.agentId = 'Choose an agent.';
  else if (!context.allowedAgentIds.includes(draft.agentId)) errors.agentId = 'Choose an available agent.';

  const validDates = getBookingDateOptions(context.now);
  if (!draft.date) errors.date = 'Choose a date.';
  else if (!validDates.includes(draft.date)) errors.date = 'Choose an available demo date.';

  const validTimes = getBookingSlots(draft.date, context.now).map((slot) => slot.time);
  if (!draft.time) errors.time = 'Choose a time.';
  else if (!validTimes.includes(draft.time)) errors.time = 'Choose an available demo time.';

  const name = draft.name.trim();
  if (!name) errors.name = 'Enter your name.';
  else if (name.length > 100) errors.name = 'Use 100 characters or fewer.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  const phone = draft.phone.trim();
  if (phone && (phone.length < 7 || phone.length > 20)) {
    errors.phone = 'Enter 7 to 20 permitted characters.';
  } else if (phone && !/^[\d\s+()-]+$/.test(phone)) {
    errors.phone = 'Use only digits, spaces, +, (, ), and -.';
  }

  if (draft.note.length > 500) errors.note = 'Use 500 characters or fewer.';
  return errors;
}

export function createBookingState(): BookingState {
  return { status: 'editing', step: 'agent', draft: emptyDraft() };
}

export function updateBookingDraft(state: BookingState, patch: Partial<BookingDraft>): BookingState {
  if (state.status !== 'editing') return state;
  return { ...state, draft: { ...state.draft, ...patch } };
}

function errorsForStep(state: BookingState, context: BookingContext): BookingErrors {
  const allErrors = validateBookingDraft(state.draft, context);
  const fieldsByStep: Record<Exclude<BookingStep, 'confirmation'>, readonly (keyof BookingDraft)[]> = {
    agent: ['agentId'],
    'date-time': ['date', 'time'],
    details: ['name', 'email', 'phone', 'note'],
    review: ['agentId', 'date', 'time', 'name', 'email', 'phone', 'note'],
  };
  const fields = state.step === 'confirmation' ? [] : fieldsByStep[state.step];
  return Object.fromEntries(fields.filter((field) => allErrors[field]).map((field) => [field, allErrors[field]]));
}

export function advanceBooking(state: BookingState, context: BookingContext): BookingTransition {
  if (state.status !== 'editing' || state.step === 'confirmation') return { state, errors: {} };
  const errors = errorsForStep(state, context);
  if (Object.keys(errors).length > 0) return { state, errors };

  if (state.step === 'review') {
    return {
      state: { status: 'confirmed', step: 'confirmation', draft: emptyDraft() },
      errors: {},
    };
  }

  const nextStep: Record<Exclude<BookingStep, 'review' | 'confirmation'>, BookingStep> = {
    agent: 'date-time',
    'date-time': 'details',
    details: 'review',
  };
  return { state: { ...state, step: nextStep[state.step] }, errors: {} };
}

export function backBooking(state: BookingState): BookingState {
  if (state.status !== 'editing') return state;
  const previousStep: Partial<Record<BookingStep, BookingStep>> = {
    'date-time': 'agent',
    details: 'date-time',
    review: 'details',
  };
  const step = previousStep[state.step];
  return step ? { ...state, step } : state;
}

export function cancelBooking(_state: BookingState): BookingState {
  return { status: 'closed', step: 'agent', draft: emptyDraft() };
}

export function restartBooking(_state: BookingState): BookingState {
  return createBookingState();
}
