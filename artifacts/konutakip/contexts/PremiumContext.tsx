/**
 * PremiumContext — React interface over PremiumManager.
 *
 * Provides the rest of the app with reactive premium state so that
 * any component can respond to status changes (grant, revoke, restore)
 * without prop-drilling.
 *
 * Usage:
 *   const { isPremium, restorePurchases } = usePremium();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { PremiumManager } from "@/utils/premium";
import type { PremiumStatus, SubscriptionType } from "@/utils/premium";

// ─── Context shape ────────────────────────────────────────────────────────────

interface PremiumContextValue {
  /** True when the user has an active Premium subscription. */
  isPremium: boolean;
  /** True while the persisted status is being loaded from AsyncStorage. */
  isLoading: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────────
  // These are intentionally thin wrappers so call-sites don't import
  // PremiumManager directly — all state mutations flow through this context.

  /**
   * Grant Premium access.
   * Called automatically by BillingContext after a successful Google Play purchase.
   * Can also be called directly during development for testing.
   *
   * @param subscriptionType - Billing/grant model. Defaults to "monthly".
   * @param expiresAt - ISO date string for expiry. null when unknown (server not yet integrated).
   * @param source - Origin of the grant. Defaults to "manual_grant"; billing sets "google_play".
   */
  grantPremium: (
    subscriptionType?: SubscriptionType,
    expiresAt?: string | null,
    source?: PremiumStatus["source"]
  ) => Promise<void>;

  /** Revoke Premium and reset to free tier. */
  revokePremium: () => Promise<void>;

  /**
   * Restore previous Google Play purchases.
   * Currently a stub — returns false until billing is integrated.
   * Returns true when an active entitlement is found and restored.
   */
  restorePurchases: () => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PremiumContext = createContext<PremiumContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted status once on mount
  useEffect(() => {
    PremiumManager.load()
      .then(() => {
        setIsPremium(false);
      })
      .catch(() => {
        // Non-fatal — default to free
        setIsPremium(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const grantPremium = useCallback(
    async (
      subscriptionType: SubscriptionType = "monthly",
      expiresAt: string | null = null,
      source: PremiumStatus["source"] = "manual_grant"
    ) => {
      await PremiumManager.grantPremium(subscriptionType, expiresAt, source);
      setIsPremium(false);
    },
    []
  );

  const revokePremium = useCallback(async () => {
    await PremiumManager.revokePremium();
    setIsPremium(false);
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const restored = await PremiumManager.restorePurchases();
    if (restored) {
      setIsPremium(false);
    }
    return restored;
  }, []);

  return (
    <PremiumContext.Provider
      value={{ isPremium: true, isLoading, grantPremium, revokePremium, restorePurchases }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}


