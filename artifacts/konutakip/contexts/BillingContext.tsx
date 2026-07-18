/**
 * BillingContext — React interface over BillingManager.
 *
 * Provides the rest of the app with reactive billing state and purchase
 * actions without prop-drilling.
 *
 * Provider placement: inside PremiumProvider so it can call grantPremium /
 * revokePremium when purchase events arrive.
 *
 * Usage:
 *   const { products, purchase, restore, isConnected, isLoading, error } = useBilling();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { usePremium } from "@/contexts/PremiumContext";
import {
  BillingManager,
  BillingLogger,
  PRODUCT_IDS,
  type BillingError,
  type BillingProduct,
  type BillingPurchase,
  type ProductId,
} from "@/utils/billing";
import type { SubscriptionType } from "@/utils/premium";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSubscriptionType(productId: string): SubscriptionType {
  return productId === PRODUCT_IDS.YEARLY ? "yearly" : "monthly";
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface BillingContextValue {
  /** Subscription products fetched from Google Play (empty until loaded). */
  products: BillingProduct[];
  /**
   * Initiate a purchase for the given product ID.
   * Result (success or error) is delivered via context state, not a return value.
   */
  purchase: (productId: ProductId) => Promise<void>;
  /**
   * Restore previous Google Play purchases for the current account.
   * Returns true when an active entitlement is found and Premium is restored.
   */
  restore: () => Promise<boolean>;
  /** True while the billing connection and initial product fetch are in progress. */
  isLoading: boolean;
  /** True when the Google Play Billing service is connected. */
  isConnected: boolean;
  /** Last billing error, or null when everything is fine. */
  error: BillingError | null;
  /** Clear the current error (e.g. after displaying it to the user). */
  clearError: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BillingContext = createContext<BillingContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { grantPremium } = usePremium();

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(Platform.OS === "android");
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [error, setError] = useState<BillingError | null>(null);

  // Keep latest callbacks in refs so the BillingManager closure never goes stale.
  const grantPremiumRef = useRef(grantPremium);
  grantPremiumRef.current = grantPremium;

  useEffect(() => {
    // Google Play Billing is Android-only.
    if (Platform.OS !== "android") {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Register callbacks before initializing so no events are missed.
    BillingManager.setCallbacks({
      onPurchaseSuccess: async (purchase: BillingPurchase) => {
        if (cancelled) return;
        const subscriptionType = getSubscriptionType(purchase.productId);
        await grantPremiumRef.current(subscriptionType, null, "google_play");
        setError(null);
        BillingLogger.event("PremiumGranted via purchase", {
          productId: purchase.productId,
          subscriptionType,
        });
      },

      onPurchaseError: (err: BillingError) => {
        if (cancelled) return;
        setError(err);
      },

      onPurchasePending: (_purchase: BillingPurchase) => {
        if (cancelled) return;
        // Pending = user payment hasn't been processed yet (e.g. cash at kiosk,
        // parental approval). Don't grant Premium yet — the purchaseUpdatedListener
        // will fire again once the payment clears.
        setError({
          code: "pending",
          message:
            "Satın alma işleminiz onay bekliyor. Onaylandığında Premium otomatik olarak aktif olacak.",
        });
      },

      onConnectionChange: (connected: boolean) => {
        if (cancelled) return;
        setIsConnected(connected);
      },
    });

    (async () => {
      try {
        await BillingManager.initialize();
        if (cancelled) return;
        setIsConnected(true);

        // Fetch products with real prices from Google Play.
        const fetched = await BillingManager.queryProducts();
        if (cancelled) return;
        setProducts(fetched);
      } catch (err) {
        if (cancelled) return;
        BillingLogger.error("Billing initialization failed", err);
        setError({
          code: "unavailable",
          message: "Ödeme sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      BillingManager.disconnect().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  const purchase = useCallback(async (productId: ProductId): Promise<void> => {
    setError(null);
    if (productId === PRODUCT_IDS.MONTHLY) {
      await BillingManager.purchaseMonthlySubscription();
    } else {
      await BillingManager.purchaseYearlySubscription();
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const restored = await BillingManager.restorePurchases();
      if (!restored) {
        setError({
          code: "unknown",
          message: "Geri yüklenecek aktif abonelik bulunamadı.",
        });
      }
      return restored;
    } catch {
      setError({
        code: "unknown",
        message: "Satın alımlar geri yüklenemedi. Lütfen tekrar deneyin.",
      });
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <BillingContext.Provider
      value={{ products, purchase, restore, isConnected, isLoading, error, clearError }}
    >
      {children}
    </BillingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
