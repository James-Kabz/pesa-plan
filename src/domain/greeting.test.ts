import { describe, expect, it } from 'vitest';
import { getTimeGreeting } from './greeting';

function atLocalHour(hour: number): Date {
  const date = new Date(2026, 6, 24, hour, 0, 0);
  return date;
}

describe('time-aware greeting', () => {
  it('uses morning from 05:00 through 11:59', () => {
    expect(getTimeGreeting(atLocalHour(5))).toBe('Good morning');
    expect(getTimeGreeting(atLocalHour(11))).toBe('Good morning');
  });

  it('uses afternoon from 12:00 through 17:59', () => {
    expect(getTimeGreeting(atLocalHour(12))).toBe('Good afternoon');
    expect(getTimeGreeting(atLocalHour(17))).toBe('Good afternoon');
  });

  it('uses evening from 18:00 through 04:59', () => {
    expect(getTimeGreeting(atLocalHour(18))).toBe('Good evening');
    expect(getTimeGreeting(atLocalHour(4))).toBe('Good evening');
  });
});
