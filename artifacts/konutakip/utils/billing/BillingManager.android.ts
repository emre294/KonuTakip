/**
 * BillingManager.ts — no-op stub for non-Android platforms (web, iOS, Expo Go).
 *
 * Metro bundler resolves BillingManager.android.ts on Android, which imports
 * the real GooglePlayBillingProvider. On every other platform (web, iOS) this
 * stub is used instead, so react-native-iap is never bundled outside Android.
 *
 * TypeScript uses this file for all type-checking regardless of platform, so
 * the public surface must match GooglePlayBillingProvider exactly.
 */

import type { BillingCallbacks, BillingProduct, BillingPurchase } from "./types";

class NativeBillingStub {
  // Called by BillingContext before initialize() to register event handlers.
  setCallbacks(_callbacks: BillingCallbacks): void {}

  async isBillingAvailable(): Promise<boolean> {
    return false;
  }

  async initialize(): Promise<void> {}

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {}

  async queryProducts(): Promise<BillingProduct[]> {
    return [];
  }

  async purchaseMonthlySubscription(): Promise<void> {}

  async restorePurchases(): Promise<boolean> {
    return false;
  }

  async queryPurchases(): Promise<BillingPurchase[]> {
    return [];
  }

  async checkActiveSubscription(): Promise<boolean> {
    return false;
  }
}

export const BillingManager = new NativeBillingStub();
