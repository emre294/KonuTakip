/**
 * BillingContext â€” React interface over BillingManager.
 *
 * Provides the rest of the app with reactive billing state and purchase
 * actions without prop-drilling.
 *
 * Provider placement: inside PremiumProvider so it can call grantPremium /
 * revokePremium when purchase events arrive.
 *
 * Usage:
 *   const { products, purchase, restore, isConnected, isLoading, error } = useBilling();
 *
 * Platform behaviour:
 *   â€¢ Android dev/production build â†’ billing fully active
 *   â€¢ Android Expo Go              â†’ billing disabled (react-native-iap absent)
 *   â€¢ iOS / Web                    â†’ billing disabled
 *
 * The exported `isBillingSupported` constant lets any screen show appropriate
 * messaging without repeating the platform + Expo Go detection logic.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";

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

// â”€â”€â”€ Platform guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// react-native-iap requires a real native build.  It is absent from:
//   â€¢ Expo Go ("storeClient" execution environment)
//   â€¢ Expo Web
//   â€¢ iOS (Google Play is Android-only)
//
// Checking executionEnvironment at module load is safe: it's a compile-time
// constant injected by Expo and never changes during a session.

const isExpoGo = Constants.executionEnvironment === "storeClient";

/**
 * True only when Google Play Billing can actually function:
 *   - Running on Android
 *   - NOT running in Expo Go (which lacks the react-native-iap native module)
 *
 * Export allows premium.tsx and other screens to adapt their UI messaging
 * without duplicating this detection logic.
 */
export const isBillingSupported: boolean =
  Platform.OS === "android" && !isExpoGo;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getSubscriptionType(_productId: string): SubscriptionType {
  // Only one subscription plan exists: konutakip_premium_aylik (monthly).
  return "monthly";
}

// â”€â”€â”€ Context shape â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  purchaseCompletedAt: number | null;
  purchaseSource: "purchase" | "restore" | null;
  clearPurchaseSuccess: () => void;
}

// â”€â”€â”€ Context â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BillingContext = createContext<BillingContextValue | null>(null);

// â”€â”€â”€ Provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { grantPremium, revokePremium, isPremium } = usePremium();

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(isBillingSupported);
  const [products, setProducts] = useState<BillingProduct[]>([]);
  const [error, setError] = useState<BillingError | null>(null);
  const [purchaseCompletedAt, setPurchaseCompletedAt] =
    useState<number | null>(null);
  const [purchaseSource, setPurchaseSource] = useState<
    "purchase" | "restore" | null
  >(null);

  // Keep latest callbacks in refs so BillingManager closures never go stale.
  const restoreInProgressRef = useRef(false);

  const grantPremiumRef = useRef(grantPremium);
  grantPremiumRef.current = grantPremium;

  const revokePremiumRef = useRef(revokePremium);
  revokePremiumRef.current = revokePremium;

  // Track current premium and connection state in refs for use inside the
  // AppState listener (which captures a snapshot at registration time).
  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;

  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  // â”€â”€ Effect 1: Billing initialisation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    // Billing only runs in a real Android build (dev build or production).
    // Expo Go on Android, iOS, and Web all take the early-exit path.
    if (!isBillingSupported) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    // Register callbacks BEFORE initializing so no purchase events are missed.
    BillingManager.setCallbacks({
      onPurchaseSuccess: async (purchase: BillingPurchase) => {
        if (cancelled) return;
        const subscriptionType = getSubscriptionType(purchase.productId);
        await grantPremiumRef.current(subscriptionType, null, "google_play");
        setError(null);
        setPurchaseSource(
          restoreInProgressRef.current ? "restore" : "purchase"
        );
        setPurchaseCompletedAt(Date.now());
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
        // Pending = payment not yet processed (e.g. cash at kiosk, parental
        // approval).  Do NOT grant Premium â€” the purchaseUpdatedListener fires
        // again once the payment clears.
        setError({
          code: "pending",
          message:
            "SatÄ±n alma iÅŸleminiz onay bekliyor. OnaylandÄ±ÄŸÄ±nda Premium otomatik olarak aktif olacak.",
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

        // Fetch real prices from Google Play.
        const fetched = await BillingManager.queryProducts();
        if (cancelled) return;
        setProducts(fetched);
        if (fetched.length === 0) {
          setError({
            code: "no_products",
            message:
              "Google Play aboneliÄŸi bulunamadÄ±. Play Console Ã¼rÃ¼nÃ¼nÃ¼n yayÄ±nlandÄ±ÄŸÄ±nÄ± ve premium-aylik base planÄ±nÄ±n aktif olduÄŸunu kontrol edin.",
          });
        }

        // Restore an existing Google Play subscription on every app launch.
        // This also grants Premium through the same verified callback used by
        // a newly completed purchase.
        restoreInProgressRef.current = true;
        try {
          await BillingManager.restorePurchases();
        } finally {
          restoreInProgressRef.current = false;
        }
        if (cancelled) return;
      } catch (err) {
        if (cancelled) return;
        BillingLogger.error("Billing initialization failed", err);
        setError({
          code: "unavailable",
          message:
            "Ã–deme sistemi ÅŸu anda kullanÄ±lamÄ±yor. LÃ¼tfen daha sonra tekrar deneyin.",
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

  // â”€â”€ Effect 2: Subscription expiry check (auto-revoke) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // When the app returns to the foreground, verify that the Google Play
  // subscription is still active.  If it has lapsed (cancelled, expired,
  // refunded) while the app was backgrounded, revoke Premium immediately so
  // the user cannot keep accessing gated features after their subscription ends.
  //
  // Safety rules (all must be true before a revoke is attempted):
  //   1. isBillingSupported â€” we're on a real Android build.
  //   2. isConnectedRef     â€” billing service is connected; avoids false
  //                           negatives when the device is offline.
  //   3. isPremiumRef       â€” user is actually premium; no point checking otherwise.
  //   4. checkActiveSubscription returns false explicitly (not via exception).
  //      Errors (network, timeout) are caught and treated as "unknown" â€” we
  //      never revoke based on a failure.

  useEffect(() => {
    if (!isBillingSupported) return;

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (
        nextState === "active" &&
        isConnectedRef.current &&
        isPremiumRef.current
      ) {
        BillingManager.checkActiveSubscription()
          .then((hasActive) => {
            if (!hasActive) {
              BillingLogger.event("Subscription expired â€” revoking Premium");
              return revokePremiumRef.current();
            }
          })
          .catch(() => {
            // Non-fatal: never revoke when we cannot confirm the subscription
            // status (e.g. offline, Google Play temporarily unavailable).
          });
      }
    });

    return () => appStateSub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const purchase = useCallback(async (_productId: ProductId): Promise<void> => {
    setError(null);
    // Only one plan: konutakip_premium_aylik (monthly).
    BillingLogger.event("PurchaseRequested", { productId: _productId });
    await BillingManager.purchaseMonthlySubscription();
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setError(null);
    restoreInProgressRef.current = true;

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
    } finally {
      restoreInProgressRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearPurchaseSuccess = useCallback(() => {
    setPurchaseCompletedAt(null);
    setPurchaseSource(null);
  }, []);

  return (
    <BillingContext.Provider
      value={{
        products,
        purchase,
        restore,
        isConnected,
        isLoading,
        error,
        clearError,
        purchaseCompletedAt,
        purchaseSource,
        clearPurchaseSuccess,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

// â”€â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used within BillingProvider");
  return ctx;
}
