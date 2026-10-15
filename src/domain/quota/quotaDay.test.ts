import { quotaDayKey } from './quotaDay';

describe('quotaDayKey', () => {
  it('returns the Pacific-time calendar date for a UTC instant', () => {
    // 2026-10-15T06:30:00Z is 2026-10-14T23:30:00 in America/Los_Angeles
    // (UTC-7 during PDT) — i.e. still "yesterday" in Pacific time.
    expect(quotaDayKey(new Date('2026-10-15T06:30:00Z'))).toBe('2026-10-14');
  });

  it('rolls over to the next day right after Pacific midnight', () => {
    // 2026-10-15T07:00:00Z is 2026-10-15T00:00:00 in America/Los_Angeles.
    expect(quotaDayKey(new Date('2026-10-15T07:00:00Z'))).toBe('2026-10-15');
  });

  it('accounts for PST (UTC-8) in winter, not just PDT (UTC-7)', () => {
    // 2026-01-15T07:30:00Z is 2026-01-14T23:30:00 in America/Los_Angeles
    // (UTC-8 during PST, no DST) — still "yesterday" in Pacific time.
    expect(quotaDayKey(new Date('2026-01-15T07:30:00Z'))).toBe('2026-01-14');
    // 2026-01-15T08:00:00Z is 2026-01-15T00:00:00 in America/Los_Angeles.
    expect(quotaDayKey(new Date('2026-01-15T08:00:00Z'))).toBe('2026-01-15');
  });
});
