/**
 * Billing Product Configuration — the ONLY place where Google Play SKU strings live.
 *
 * To switch to real subscription IDs after your Play Console release:
 *   1. Open Google Play Console → Your app → Monetize → Subscriptions
 *   2. Create a subscription for each tier and copy the Subscription ID
 *   3. Replace the two placeholder strings below — no other file needs to change
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO: Replace both placeholder IDs with real Play Console subscription IDs
 *       before the first production release.
 *
 * Expected format: reverse-domain notation, e.g.
 *   "com.yourcompany.konutakip.monthly"
 *   "com.yourcompany.konutakip.yearly"
 * ─────────────────────────────────────────────────────────────────────────────
 */

// TODO: Replace with the real Google Play Monthly Subscription ID
//       (Google Play Console → Subscriptions → Monthly plan → Subscription ID)
export const MONTHLY_PRODUCT_ID = "monthly_premium" as const;

// TODO: Replace with the real Google Play Yearly Subscription ID
//       (Google Play Console → Subscriptions → Yearly plan → Subscription ID)
export const YEARLY_PRODUCT_ID = "yearly_premium" as const;
