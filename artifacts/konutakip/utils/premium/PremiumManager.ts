/**
 * PremiumManager — single source of truth for premium status.
 *
 * Responsibilities:
 *  - Persist and retrieve premium status via AsyncStorage.
 *  - Expose a simple isPremium() check consumed by PremiumContext.
 *  - Provide stub entry-points for future Google Play Billing integration.
 *  - Provide a stub entry-point for future subscription expiration handling.
 *
 * This file intentionally contains NO React code so it can be tested
 * in isolation and imported from any context or utility.
 *
 * ─── Future integration points ────────────────────────────────────────────────
 *  1. Google Play Billing:
 *       Replace initializeBilling() and purchaseMonthlySubscription() stubs
 *       with react-native-purchases (RevenueCat) or google-play-billing calls.
 *  2. Subscription expiration:
 *       Populate expiresAt on grant, then call checkExpiration() on app launch
 *       and foreground transition to auto-revoke lapsed subscriptions.
 *  3. Server-side receipt validation:
 *       Add validateReceiptWithServer() before calling grantPremium().
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "konutakip_premium_v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PremiumTier = "free" | "premium";

export interface PremiumStatus {
  tier: PremiumTier;
  /** ISO date string — null for free users or lifetime grants */
  grantedAt: string | null;
  /** ISO date string — null until expiration tracking is implemented */
  expiresAt: string | null;
  /** Human-readable source; useful for debugging and analytics */
  source: "none" | "google_play" | "manual_grant" | "restore";
}

/**
 * Future Premium features.
 * Add new values here as each feature is built so PremiumGate can reference
 * a typed enum rather than raw strings.
 */
export const PremiumFeature = {
  AI_QUESTION_GENERATOR: "ai_question_generator",
  AI_TEACHER: "ai_teacher",
  ADVANCED_ANALYTICS: "advanced_analytics",
  AI_STUDY_COACH_PRO: "ai_study_coach_pro",
  AI_MINI_EXAMS: "ai_mini_exams",
  PERSONALIZED_STUDY_PLANS: "personalized_study_plans",
} as const;

export type PremiumFeatureId = (typeof PremiumFeature)[keyof typeof PremiumFeature];

// ─── Default status ────────────────────────────────────────────────────────────

const DEFAULT_STATUS: PremiumStatus = {
  tier: "free",
  grantedAt: null,
  expiresAt: null,
  source: "none",
};

// ─── PremiumManager class ─────────────────────────────────────────────────────

class PremiumManagerClass {
  private _status: PremiumStatus = { ...DEFAULT_STATUS };
  private _loaded = false;

  // ── Initialisation ──────────────────────────────────────────────────────────

  /** Load persisted status from AsyncStorage. Call once on app start. */
  async load(): Promise<PremiumStatus> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PremiumStatus>;
        this._status = {
          tier: parsed.tier ?? "free",
          grantedAt: parsed.grantedAt ?? null,
          expiresAt: parsed.expiresAt ?? null,
          source: parsed.source ?? "none",
        };
      } else {
        this._status = { ...DEFAULT_STATUS };
      }
    } catch {
      this._status = { ...DEFAULT_STATUS };
    }
    this._loaded = true;
    return this._status;
  }

  // ── Status queries ──────────────────────────────────────────────────────────

  /** Returns true if the user currently has an active Premium subscription. */
  isPremium(): boolean {
    if (!this._loaded) return false;
    if (this._status.tier !== "premium") return false;

    // TODO (expiration): uncomment once expiresAt is populated by billing.
    // if (this._status.expiresAt) {
    //   const expired = new Date(this._status.expiresAt) <= new Date();
    //   if (expired) {
    //     this.revokePremium().catch(() => {});
    //     return false;
    //   }
    // }

    return true;
  }

  /** Full status object — use for display or debugging. */
  getStatus(): PremiumStatus {
    return { ...this._status };
  }

  // ── Status mutations ────────────────────────────────────────────────────────

  /**
   * Grant Premium access.
   * @param expiresAt - ISO date string for subscription expiry. Pass null for
   *   lifetime / manual grants.
   * @param source - Where this grant originated.
   */
  async grantPremium(
    expiresAt: string | null = null,
    source: PremiumStatus["source"] = "manual_grant"
  ): Promise<void> {
    this._status = {
      tier: "premium",
      grantedAt: new Date().toISOString(),
      expiresAt,
      source,
    };
    await this._persist();
  }

  /** Revoke Premium and revert to free tier. */
  async revokePremium(): Promise<void> {
    this._status = { ...DEFAULT_STATUS };
    await this._persist();
  }

  // ── Google Play Billing stubs ───────────────────────────────────────────────
  // Replace these with real implementations when integrating billing.

  /**
   * [STUB] Initialize Google Play Billing connection.
   * Call once on app start before any purchase flow.
   *
   * Future implementation: connect to RevenueCat / Google Play Billing SDK,
   * fetch available products, and verify existing entitlements.
   */
  async initializeBilling(): Promise<void> {
    // TODO: initialize react-native-purchases or google-play-billing
    return Promise.resolve();
  }

  /**
   * [STUB] Launch the monthly subscription purchase flow.
   * Returns true on a successful purchase.
   *
   * Future implementation:
   *   const info = await Purchases.purchaseProduct("konutakip_premium_monthly");
   *   if (info.activeSubscriptions.includes("konutakip_premium_monthly")) {
   *     await this.grantPremium(info.expirationDate, "google_play");
   *     return true;
   *   }
   *   return false;
   */
  async purchaseMonthlySubscription(): Promise<boolean> {
    // TODO: implement Google Play Billing purchase flow
    return Promise.resolve(false);
  }

  /**
   * [STUB] Restore previous purchases for this Google account.
   * Returns true if an active entitlement was found and restored.
   *
   * Future implementation:
   *   const info = await Purchases.restorePurchases();
   *   if (info.activeSubscriptions.length > 0) {
   *     await this.grantPremium(info.expirationDate, "restore");
   *     return true;
   *   }
   *   return false;
   */
  async restorePurchases(): Promise<boolean> {
    // TODO: implement purchase restore via Google Play Billing
    return Promise.resolve(false);
  }

  /**
   * [STUB] Check whether the current subscription has expired.
   * Call on every app foreground transition once expiresAt is populated.
   */
  async checkExpiration(): Promise<void> {
    // TODO: implement expiration check once expiresAt is set by billing
    return Promise.resolve();
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this._status));
    } catch {
      // Persistence failure is non-fatal — in-memory state is still correct
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const PremiumManager = new PremiumManagerClass();
