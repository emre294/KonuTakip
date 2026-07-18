/**
 * GooglePlayBillingProvider — production Google Play Billing implementation.
 *
 * Uses react-native-iap (v15+) which wraps the official Google Play Billing
 * Library. All IAP calls are Android-only; the provider is a no-op on other
 * platforms.
 *
 * Responsibilities:
 *  - Connection lifecycle (connect / disconnect / auto-reconnect)
 *  - Product fetching with real prices from Google Play
 *  - Purchase flow: initiate → listen → verify → acknowledge → callback
 *  - Restore flow: query active subscriptions → callback
 *  - Pending purchase support (e.g. cash payments, parental approval)
 *  - Error mapping to BillingErrorCode
 *
 * Do NOT import React or use hooks here — this is a plain class.
 */

import { Platform } from "react-native";
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  getActiveSubscriptions,
  ErrorCode,
} from "react-native-iap";
import type { Purchase } from "react-native-iap";

import {
  PRODUCT_IDS,
  ALL_PRODUCT_IDS,
  type ProductId,
  type BillingProduct,
  type BillingPurchase,
  type BillingError,
  type BillingErrorCode,
  type IBillingService,
  type BillingCallbacks,
} from "./types";
import { BillingLogger } from "./BillingLogger";
import { verifyPurchase } from "./verification/PurchaseVerifier";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 2_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapErrorCode(code: ErrorCode | string): BillingErrorCode {
  switch (code) {
    case ErrorCode.BillingUnavailable:
    case ErrorCode.IapNotAvailable:
    case ErrorCode.FeatureNotSupported:
      return "unavailable";
    case ErrorCode.UserCancelled:
      return "cancelled";
    case ErrorCode.AlreadyOwned:
      return "already_owned";
    case ErrorCode.NetworkError:
      return "network_error";
    case ErrorCode.Pending:
    case ErrorCode.DeferredPayment:
      return "pending";
    case ErrorCode.ServiceDisconnected:
    case ErrorCode.ConnectionClosed:
    case ErrorCode.NotPrepared:
      return "not_connected";
    default:
      return "unknown";
  }
}

function mapIapPurchase(purchase: Purchase): BillingPurchase | null {
  if (!purchase.purchaseToken || !purchase.productId) return null;
  return {
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken,
    transactionId:
      // PurchaseAndroid has transactionId; PurchaseCommon falls back to id
      (purchase as { transactionId?: string }).transactionId ??
      (purchase as { id?: string }).id ??
      "",
    purchaseTime: purchase.transactionDate,
    purchaseState:
      purchase.purchaseState === "purchased"
        ? "purchased"
        : purchase.purchaseState === "pending"
          ? "pending"
          : "unknown",
    isAcknowledged:
      (purchase as { isAcknowledgedAndroid?: boolean }).isAcknowledgedAndroid ??
      false,
  };
}

/** Extract the formatted display price from an Android subscription product. */
function extractPrice(product: Record<string, unknown>): string {
  // Try cross-platform subscriptionOffers first (react-native-iap v15+)
  const offers = product.subscriptionOffers as Array<{ displayPrice?: string }> | undefined;
  const offerPrice = offers?.[0]?.displayPrice;
  if (offerPrice) return offerPrice;

  // Fallback: legacy Android offer details
  const legacyOffers = product.subscriptionOfferDetailsAndroid as
    | Array<{ pricingPhases?: { pricingPhaseList?: Array<{ formattedPrice?: string }> } }>
    | undefined;
  return legacyOffers?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ?? "—";
}

/** Extract the offer token required for requestPurchase on Android. */
function extractOfferToken(product: Record<string, unknown>): string | null {
  const offers = product.subscriptionOffers as
    | Array<{ offerTokenAndroid?: string }>
    | undefined;
  const token = offers?.[0]?.offerTokenAndroid;
  if (token) return token;

  const legacyOffers = product.subscriptionOfferDetailsAndroid as
    | Array<{ offerToken?: string }>
    | undefined;
  return legacyOffers?.[0]?.offerToken ?? null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class GooglePlayBillingProvider implements IBillingService {
  // ── Connection state ────────────────────────────────────────────────────────
  private _connected = false;
  private _reconnectAttempts = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ── IAP listeners ───────────────────────────────────────────────────────────
  private _purchaseListener: { remove: () => void } | null = null;
  private _errorListener: { remove: () => void } | null = null;

  // ── External callbacks (set by BillingContext) ──────────────────────────────
  private _callbacks: BillingCallbacks | null = null;

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Register callbacks before calling initialize().
   * BillingContext calls this once on mount with the appropriate handlers.
   */
  setCallbacks(callbacks: BillingCallbacks): void {
    this._callbacks = callbacks;
  }

  async isBillingAvailable(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      await initConnection();
      return true;
    } catch {
      return false;
    }
  }

  /** Initialize billing: connect + set up listeners. */
  async initialize(): Promise<void> {
    await this.connect();
  }

  /** Connect to Google Play Billing. Idempotent. */
  async connect(): Promise<void> {
    if (this._connected) return;
    if (Platform.OS !== "android") {
      BillingLogger.log("Billing skipped (non-Android platform)");
      return;
    }
    try {
      await initConnection();
      this._connected = true;
      this._reconnectAttempts = 0;
      BillingLogger.event("Connected");
      this._callbacks?.onConnectionChange(true);
      this._setupListeners();
    } catch (err) {
      BillingLogger.error("Connection failed", err);
      this._connected = false;
      this._callbacks?.onConnectionChange(false);
      throw err;
    }
  }

  /** Disconnect from Google Play Billing and clean up listeners. */
  async disconnect(): Promise<void> {
    this._clearListeners();
    this._clearReconnectTimer();
    if (!this._connected) return;
    try {
      await endConnection();
    } catch {
      // Non-fatal — already disconnecting
    }
    this._connected = false;
    BillingLogger.event("Disconnected");
  }

  /**
   * Fetch subscription products with real prices from Google Play.
   * Returns an empty array when billing is unavailable or products not found.
   */
  async queryProducts(): Promise<BillingProduct[]> {
    if (!this._connected) {
      BillingLogger.warn("queryProducts: not connected");
      return [];
    }
    try {
      const results = await fetchProducts({
        skus: ALL_PRODUCT_IDS,
        type: "subs",
      });
      if (!results || results.length === 0) return [];

      const products: BillingProduct[] = [];
      for (const item of results) {
        const raw = item as unknown as Record<string, unknown>;
        // Only process Android subscriptions
        if (raw.platform !== "android" || raw.type !== "subs") {
          continue;
        }
        const productId = (raw.id ?? raw.productId) as string;

        if (!ALL_PRODUCT_IDS.includes(productId as ProductId)) continue;

        products.push({
          productId: productId as ProductId,
          title: (raw.title ?? raw.nameAndroid ?? productId) as string,
          description: (raw.description ?? "") as string,
          localizedPrice: extractPrice(raw),
          currency: (raw.currency ?? "") as string,
          offerToken: extractOfferToken(raw),
          type: "monthly",
        });
      }

      BillingLogger.log(
        "Products fetched",
        products.map((p) => `${p.productId}: ${p.localizedPrice}`)
      );
      return products;
    } catch (err) {
      BillingLogger.error("queryProducts failed", err);
      return [];
    }
  }

  /** Initiate the monthly subscription purchase flow. */
  async purchaseMonthlySubscription(): Promise<void> {
    return this._purchase(PRODUCT_IDS.MONTHLY);
  }

  /**
   * Query all purchases made by the user.
   * Used for debugging and manual status checks.
   */
  async queryPurchases(): Promise<BillingPurchase[]> {
    try {
      const purchases = await getAvailablePurchases();
      return purchases.flatMap((p) => {
        const mapped = mapIapPurchase(p);
        return mapped ? [mapped] : [];
      });
    } catch (err) {
      BillingLogger.error("queryPurchases failed", err);
      return [];
    }
  }

  /**
   * Lightweight check: returns true when the user has at least one active
   * Google Play subscription for any of the known product IDs.
   *
   * Used by BillingContext for periodic expiry checks on app foreground.
   * Does NOT trigger the full restore flow or call any callbacks.
   *
   * Returns false (not true) on any error — network issues, connection drops,
   * offline state — so callers must never revoke premium based on a false return
   * value caused by an exception. The catch in BillingContext provides an
   * additional safety net.
   */
  async checkActiveSubscription(): Promise<boolean> {
    if (!this._connected) return false;
    try {
      const active = await getActiveSubscriptions(ALL_PRODUCT_IDS);
      return active.length > 0;
    } catch {
      // Treat any error as "unknown" — never revoke on uncertainty.
      return false;
    }
  }

  /**
   * Restore purchases for the current Google account.
   * Checks active subscriptions first, falls back to available purchases.
   * Returns true when an active entitlement is found and restored.
   */
  async restorePurchases(): Promise<boolean> {
    if (!this._connected) {
      try {
        await this.connect();
      } catch {
        return false;
      }
    }

    try {
      // 1. Check active subscriptions (most reliable)
      const active = await getActiveSubscriptions(ALL_PRODUCT_IDS);
      if (active && active.length > 0) {
        const sub = active[0];
        BillingLogger.event("RestoreFound (active subscription)", sub.productId);

        const purchase: BillingPurchase = {
          productId: sub.productId,
          purchaseToken: sub.purchaseToken ?? sub.purchaseTokenAndroid ?? "",
          transactionId: sub.transactionId,
          purchaseTime: sub.transactionDate,
          purchaseState: "purchased",
          isAcknowledged: true,
        };
        await this._callbacks?.onPurchaseSuccess(purchase);
        return true;
      }

      // 2. Fallback: check available purchases
      const available = await getAvailablePurchases();
      const relevant = available.filter((p) =>
        ALL_PRODUCT_IDS.includes(p.productId as ProductId)
      );

      if (relevant.length === 0) {
        BillingLogger.log("No purchases to restore");
        return false;
      }

      // Use the most recent purchase
      const latest = [...relevant].sort(
        (a, b) => b.transactionDate - a.transactionDate
      )[0];
      const mapped = mapIapPurchase(latest);
      if (!mapped || mapped.purchaseState !== "purchased") return false;

      await this._callbacks?.onPurchaseSuccess(mapped);
      BillingLogger.event("Restored", mapped.productId);
      return true;
    } catch (err) {
      BillingLogger.error("restorePurchases failed", err);
      return false;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async _purchase(productId: ProductId): Promise<void> {
    if (!this._connected) {
      const err: BillingError = {
        code: "not_connected",
        message: "Ödeme sistemi bağlı değil. Lütfen tekrar deneyin.",
      };
      this._callbacks?.onPurchaseError(err);
      return;
    }

    // Resolve the offer token for this product
    let offerToken: string | null = null;
    try {
      const products = await this.queryProducts();
      offerToken = products.find((p) => p.productId === productId)?.offerToken ?? null;
    } catch {
      // Non-fatal — proceed without offer token
    }

    BillingLogger.log("Initiating purchase", { productId, offerToken });

    try {
      await requestPurchase({
        request: {
          // Use 'google' (current) instead of deprecated 'android'
          google: {
            skus: [productId],
            ...(offerToken
              ? { subscriptionOffers: [{ sku: productId, offerToken }] }
              : {}),
          },
        },
        type: "subs",
      });
      // Purchase result is delivered via purchaseUpdatedListener — not here.
    } catch (err) {
      // requestPurchase may throw for synchronous errors (e.g. item not found).
      // Most errors (including user cancellation) arrive via purchaseErrorListener.
      BillingLogger.error("requestPurchase threw synchronously", err);
    }
  }

  private _setupListeners(): void {
    this._clearListeners();

    // ── Purchase update listener ─────────────────────────────────────────────
    this._purchaseListener = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        BillingLogger.event("PurchaseUpdated", {
          productId: purchase.productId,
          state: purchase.purchaseState,
        });

        const mapped = mapIapPurchase(purchase);
        if (!mapped) {
          BillingLogger.warn("Could not map purchase", purchase);
          return;
        }

        // Pending purchase (e.g. cash payment, parental approval)
        if (mapped.purchaseState === "pending") {
          BillingLogger.event("PurchasePending", mapped.productId);
          this._callbacks?.onPurchasePending(mapped);
          return;
        }

        if (mapped.purchaseState !== "purchased") {
          BillingLogger.warn("Unexpected purchase state", mapped.purchaseState);
          return;
        }

        try {
          // 1. Verify purchase
          const verification = await verifyPurchase(mapped);
          if (!verification.isValid) {
            BillingLogger.error("Verification failed", verification.error);
            this._callbacks?.onPurchaseError({
              code: "unknown",
              message: verification.error ?? "Satın alma doğrulanamadı.",
            });
            return;
          }

          // 2. Acknowledge — required within 3 days or Google auto-refunds
          await finishTransaction({ purchase, isConsumable: false });
          BillingLogger.event("PurchaseAcknowledged", mapped.productId);

          // 3. Update premium status via callback
          await this._callbacks?.onPurchaseSuccess(mapped);
          BillingLogger.event("PremiumGranted", mapped.productId);
        } catch (err) {
          BillingLogger.error("Error processing purchase", err);
          this._callbacks?.onPurchaseError({
            code: "unknown",
            message:
              "Satın alma işlenirken bir hata oluştu. Lütfen destek ile iletişime geçin.",
          });
        }
      }
    );

    // ── Purchase error listener ──────────────────────────────────────────────
    this._errorListener = purchaseErrorListener((error) => {
      BillingLogger.error("PurchaseError", {
        code: error.code,
        message: error.message,
      });

      const code = mapErrorCode(error.code);

      // Auto-reconnect on service disconnection
      if (code === "not_connected") {
        this._connected = false;
        this._callbacks?.onConnectionChange(false);
        this._scheduleReconnect();
        return;
      }

      // User cancellation — don't show as an error in the UI
      if (code === "cancelled") {
        BillingLogger.log("Purchase cancelled by user");
        return;
      }

      this._callbacks?.onPurchaseError({
        code,
        message: error.message ?? "Satın alma başarısız.",
        debugMessage: error.debugMessage ?? undefined,
      });
    });
  }

  private _clearListeners(): void {
    this._purchaseListener?.remove();
    this._errorListener?.remove();
    this._purchaseListener = null;
    this._errorListener = null;
  }

  /** Exponential-backoff reconnect with a capped attempt count. */
  private _scheduleReconnect(): void {
    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      BillingLogger.warn(
        `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`
      );
      return;
    }
    this._clearReconnectTimer();
    const delay =
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this._reconnectAttempts);
    BillingLogger.log(
      `Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`
    );
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectAttempts++;
      try {
        await this.connect();
      } catch {
        this._scheduleReconnect();
      }
    }, delay);
  }

  private _clearReconnectTimer(): void {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }
}
