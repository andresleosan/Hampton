import { describe, expect, test } from 'vitest';
import {
  advanceBooking,
  backBooking,
  cancelBooking,
  createBookingState,
  getBookingDateOptions,
  getBookingSlots,
  restartBooking,
  updateBookingDraft,
  validateBookingDraft,
  type BookingDraft,
} from '../../../src/domain/booking.ts';

const allowedAgentIds = ['gilberto-franco', 'joshua-franco'] as const;

function validDraft(): BookingDraft {
  return {
    agentId: 'gilberto-franco',
    date: '2026-07-17',
    time: '09:00',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 (0) 1534 123456',
    note: 'Please use the side entrance.',
  };
}

const julyContext = {
  now: new Date('2026-07-16T10:00:00.000Z'),
  allowedAgentIds,
};

describe('booking date window', () => {
  test('uses tomorrow through day 30 in Jersey and excludes weekends', () => {
    const dates = getBookingDateOptions(new Date('2026-03-27T12:00:00.000Z'));

    expect(dates[0]).toBe('2026-03-30');
    expect(dates).toContain('2026-04-24');
    expect(dates).not.toContain('2026-03-27');
    expect(dates).not.toContain('2026-03-28');
    expect(dates).not.toContain('2026-03-29');
    expect(dates).not.toContain('2026-04-27');
  });

  test('anchors tomorrow to Jersey when its calendar date differs from UTC', () => {
    const dates = getBookingDateOptions(new Date('2026-07-15T23:30:00.000Z'));

    expect(dates[0]).toBe('2026-07-17');
    expect(dates).not.toContain('2026-07-16');
  });
});

describe('booking slots', () => {
  test('offers exactly 16 half-hour demo slots from 09:00 through 16:30', () => {
    const slots = getBookingSlots('2026-07-17', julyContext.now);

    expect(slots).toHaveLength(16);
    expect(slots.map((slot) => slot.time)).toEqual([
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
      '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    ]);
    expect(slots.every((slot) => slot.label.endsWith(' (Demo)'))).toBe(true);
  });

  test('maps the same Jersey wall time to GMT in January and BST in July', () => {
    const january = getBookingSlots('2027-01-15', new Date('2027-01-14T12:00:00.000Z'));
    const july = getBookingSlots('2026-07-17', julyContext.now);

    expect(january[0]?.startsAt).toBe('2027-01-15T09:00:00.000Z');
    expect(july[0]?.startsAt).toBe('2026-07-17T08:00:00.000Z');
  });

  test('does not offer transition Sundays or duplicate instants around DST changes', () => {
    expect(getBookingSlots('2026-03-29', new Date('2026-03-27T12:00:00.000Z'))).toEqual([]);
    expect(getBookingSlots('2026-10-25', new Date('2026-10-23T12:00:00.000Z'))).toEqual([]);

    const springSlots = getBookingDateOptions(new Date('2026-03-20T12:00:00.000Z'))
      .flatMap((date) => getBookingSlots(date, new Date('2026-03-20T12:00:00.000Z')));
    expect(new Set(springSlots.map((slot) => slot.startsAt)).size).toBe(springSlots.length);
  });
});

describe('booking validation', () => {
  test('accepts a complete draft at the approved field limits and slot rules', () => {
    expect(validateBookingDraft(validDraft(), julyContext)).toEqual({});
  });

  test('rejects missing or unknown agents and invalid dates or times', () => {
    expect(validateBookingDraft({ ...validDraft(), agentId: '' }, julyContext).agentId)
      .toBe('Choose an agent.');
    expect(validateBookingDraft({ ...validDraft(), agentId: 'someone-else' }, julyContext).agentId)
      .toBe('Choose an available agent.');
    expect(validateBookingDraft({ ...validDraft(), date: '2026-07-16' }, julyContext).date)
      .toBe('Choose an available demo date.');
    expect(validateBookingDraft({ ...validDraft(), time: '08:30' }, julyContext).time)
      .toBe('Choose an available demo time.');
  });

  test('enforces the approved personal-detail lengths and formats', () => {
    expect(validateBookingDraft({ ...validDraft(), name: ' ' }, julyContext).name)
      .toBe('Enter your name.');
    expect(validateBookingDraft({ ...validDraft(), name: 'x'.repeat(101) }, julyContext).name)
      .toBe('Use 100 characters or fewer.');
    expect(validateBookingDraft({ ...validDraft(), email: 'not-an-email' }, julyContext).email)
      .toBe('Enter a valid email address.');
    expect(validateBookingDraft({ ...validDraft(), phone: '123' }, julyContext).phone)
      .toBe('Enter 7 to 20 permitted characters.');
    expect(validateBookingDraft({ ...validDraft(), phone: '123456@' }, julyContext).phone)
      .toBe('Use only digits, spaces, +, (, ), and -.');
    expect(validateBookingDraft({ ...validDraft(), note: 'x'.repeat(501) }, julyContext).note)
      .toBe('Use 500 characters or fewer.');
  });
});

describe('in-memory booking flow', () => {
  test('does not advance from a step with invalid fields', () => {
    const result = advanceBooking(createBookingState(), julyContext);

    expect(result.state.step).toBe('agent');
    expect(result.errors).toEqual({ agentId: 'Choose an agent.' });
  });

  test('Back preserves the values entered in memory', () => {
    let state = updateBookingDraft(createBookingState(), { agentId: 'gilberto-franco' });
    state = advanceBooking(state, julyContext).state;
    state = updateBookingDraft(state, { date: '2026-07-17', time: '09:00' });
    state = advanceBooking(state, julyContext).state;

    const backed = backBooking(state);
    expect(backed.step).toBe('date-time');
    expect(backed.draft).toMatchObject({
      agentId: 'gilberto-franco',
      date: '2026-07-17',
      time: '09:00',
    });
  });

  test('confirmation discards all personal values', () => {
    let state = updateBookingDraft(createBookingState(), validDraft());
    state = advanceBooking(state, julyContext).state;
    state = advanceBooking(state, julyContext).state;
    state = advanceBooking(state, julyContext).state;
    const confirmed = advanceBooking(state, julyContext);

    expect(confirmed.errors).toEqual({});
    expect(confirmed.state).toEqual({
      status: 'confirmed',
      step: 'confirmation',
      draft: {
        agentId: '', date: '', time: '', name: '', email: '', phone: '', note: '',
      },
    });
  });

  test('Cancel discards values and Start again creates a blank editing flow', () => {
    const edited = updateBookingDraft(createBookingState(), validDraft());
    const cancelled = cancelBooking(edited);

    expect(cancelled.status).toBe('closed');
    expect(cancelled.draft).toEqual(createBookingState().draft);
    expect(restartBooking(cancelled)).toEqual(createBookingState());
  });
});
