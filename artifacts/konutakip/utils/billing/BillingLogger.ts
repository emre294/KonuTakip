/**
 * BillingLogger — development-only console logging for billing events.
 *
 * All methods are no-ops in production (__DEV__ === false).
 * Never log sensitive data (purchase tokens, payment info, user PII).
 */

const PREFIX = "[Billing]";

/* eslint-disable no-console */
export const BillingLogger = {
  log: (msg: string, ...args: unknown[]): void => {
    if (__DEV__) console.log(`${PREFIX} ${msg}`, ...args);
  },

  warn: (msg: string, ...args: unknown[]): void => {
    if (__DEV__) console.warn(`${PREFIX} ⚠ ${msg}`, ...args);
  },

  error: (msg: string, ...args: unknown[]): void => {
    if (__DEV__) console.error(`${PREFIX} ✖ ${msg}`, ...args);
  },

  /**
   * Logs a named billing lifecycle event with optional payload.
   * Use for purchase flows, connection changes, and state transitions.
   */
  event: (event: string, data?: unknown): void => {
    if (__DEV__) {
      console.log(
        `${PREFIX} [${event}]`,
        data !== undefined ? data : ""
      );
    }
  },
};
/* eslint-enable no-console */
