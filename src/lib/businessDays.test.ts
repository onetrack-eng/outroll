import { describe, expect, it } from 'vitest';
import { addBusinessDays, addCalendarDays, isPast } from './businessDays';

// 2024-01-01 is a Monday (UTC) — used as a fixed anchor throughout so these tests don't
// depend on when they're run.
const MONDAY = new Date(Date.UTC(2024, 0, 1));
const FRIDAY = new Date(Date.UTC(2024, 0, 5));

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe('addBusinessDays', () => {
  it('adds simple weekday-only days without crossing a weekend', () => {
    expect(iso(addBusinessDays(MONDAY, 1))).toBe('2024-01-02'); // Tue
    expect(iso(addBusinessDays(MONDAY, 4))).toBe('2024-01-05'); // Fri
  });

  it('skips the weekend when the span crosses one', () => {
    expect(iso(addBusinessDays(MONDAY, 5))).toBe('2024-01-08'); // Mon (skips Sat/Sun)
    expect(iso(addBusinessDays(FRIDAY, 1))).toBe('2024-01-08'); // Fri -> Mon
  });

  it('skips two weekends for a full 7-business-day window starting on a Friday', () => {
    // This is the exact shape of the curator accept/post deadline math.
    expect(iso(addBusinessDays(FRIDAY, 7))).toBe('2024-01-16'); // Tue
  });

  it('never lands on a weekend', () => {
    for (let start = 0; start < 7; start += 1) {
      const startDate = new Date(Date.UTC(2024, 0, 1 + start));
      for (let count = 1; count <= 10; count += 1) {
        const result = addBusinessDays(startDate, count);
        const day = result.getUTCDay();
        expect(day).not.toBe(0);
        expect(day).not.toBe(6);
      }
    }
  });
});

describe('addCalendarDays', () => {
  it('adds raw calendar days regardless of weekends', () => {
    expect(iso(addCalendarDays(FRIDAY, 7))).toBe('2024-01-12'); // still Friday-to-Friday
    expect(iso(addCalendarDays(MONDAY, 1))).toBe('2024-01-02');
  });
});

describe('isPast', () => {
  it('returns true for a date well in the past', () => {
    expect(isPast(new Date(Date.UTC(2000, 0, 1)))).toBe(true);
  });

  it('returns false for a date well in the future', () => {
    expect(isPast(new Date(Date.UTC(3000, 0, 1)))).toBe(false);
  });
});
