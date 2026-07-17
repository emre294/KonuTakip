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
   * In production this will be called by the billing callback after a
   * successful purchase; during development it can be called directly for testing.
   */
  grantPremium: (expiresAt?: string | null) => Promise<void>;

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
        setIsPremium(PremiumManager.isPremium());
      })
      .catch(() => {
        // Non-fatal — default to free
        setIsPremium(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const grantPremium = useCallback(async (expiresAt: string | null = null) => {
    await PremiumManager.grantPremium(expiresAt);
    setIsPremium(true);
  }, []);

  const revokePremium = useCallback(async () => {
    await PremiumManager.revokePremium();
    setIsPremium(false);
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const restored = await PremiumManager.restorePurchases();
    if (restored) {
      setIsPremium(PremiumManager.isPremium());
    }
    return restored;
  }, []);

  return (
    <PremiumContext.Provider
      value={{ isPremium, isLoading, grantPremium, revokePremium, restorePurchases }}
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
