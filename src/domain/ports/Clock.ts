/**
 * Abstraction over "now", so domain logic that depends on time (quota resets,
 * token expiry, retry backoff) can be tested deterministically without
 * mocking global Date.
 */
export interface Clock {
  /** Current instant. */
  now(): Date;
}
