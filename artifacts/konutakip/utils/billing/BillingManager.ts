/**
 * BillingManager — singleton instance of GooglePlayBillingProvider.
 *
 * Import this everywhere billing functionality is needed.
 * BillingContext is the primary consumer; direct use in components is
 * discouraged — prefer the useBilling() hook instead.
 *
 * Singleton rationale: the Google Play Billing connection is a global resource.
 * A single instance prevents duplicate connections and listener registrations.
 */

import { GooglePlayBillingProvider } from "./GooglePlayBillingProvider";

export const BillingManager = new GooglePlayBillingProvider();
