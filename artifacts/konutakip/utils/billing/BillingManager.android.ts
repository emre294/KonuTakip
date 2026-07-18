/**
 * BillingManager.android.ts — Android-only entry point.
 *
 * Metro bundler resolves this file exclusively on Android builds,
 * so react-native-iap (and its native modules) are never bundled on web or iOS.
 *
 * All other platforms fall through to BillingManager.ts (the no-op stub).
 */

import { GooglePlayBillingProvider } from "./GooglePlayBillingProvider";

export const BillingManager = new GooglePlayBillingProvider();
