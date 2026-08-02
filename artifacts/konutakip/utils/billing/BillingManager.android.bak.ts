/**
 * Android billing entry point.
 *
 * Metro resolves this platform file on Android. Keep the no-op implementation
 * in BillingManager.ts for web/iOS only; Android must use the real provider or
 * the purchase button can never open Google Play.
 */

import { GooglePlayBillingProvider } from "./GooglePlayBillingProvider";

export const BillingManager = new GooglePlayBillingProvider();
