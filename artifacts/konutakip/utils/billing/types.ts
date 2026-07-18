/**
 * Billing types — shared across all billing modules.
 *
 * Architecture notes:
 *  - PRODUCT_IDS holds the Google Play SKU strings.
 *  - IBillingService defines the public contract; swap implementations freely.
 *  - Callbacks are typed so providers can fire them without React dependencies.
 */

// ─── Product IDs ──────────────────────────────────────────────────────────────

export const PRODUCT_IDS = {
  MONTHLY: "monthly_premium",
  YEARLY: "yearly_premium",
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export const ALL_PRODUCT_IDS: ProductId[] = [
  PRODUCT_IDS.MONTHLY,
  PRODUCT_IDS.YEARLY,
];

// ─── Product ──────────────────────────────────────────────────────────────────

export interface BillingProduct {
  /** Google Play SKU string. */
  productId: ProductId;
  title: string;
  description: string;
  /** Formatted price string from Google Play, e.g. "₺99,99". */
  localizedPrice: string;
  /** ISO 4217 currency code, e.g. "TRY". */
  currency: string;
  /** Android offer token required for requestPurchase (null when unavailable). */
  offerToken: string | null;
  /** Canonical billing period for display logic. */
  type: "monthly" | "yearly";
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export type BillingPurchaseState = "purchased" | "pending" | "unknown";

export interface BillingPurchase {
  productId: string;
  purchaseToken: string;
  transactionId: string;
  purchaseTime: number;
  purchaseState: BillingPurchaseState;
  isAcknowledged: boolean;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export type BillingErrorCode =
  | "unavailable"
  | "not_connected"
  | "cancelled"
  | "pending"
  | "already_owned"
  | "network_error"
  | "no_products"
  | "unknown";

export interface BillingError {
  code: BillingErrorCode;
  message: string;
  debugMessage?: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface BillingState {
  isConnected: boolean;
  isLoading: boolean;
  products: BillingProduct[];
  error: BillingError | null;
}

// ─── Service interface ────────────────────────────────────────────────────────

/**
 * IBillingService — public contract for any billing provider.
 *
 * Implementations:
 *  - GooglePlayBillingProvider  (production, Android)
 *
 * Future:
 *  - AppStoreBillingProvider    (iOS, if needed)
 *  - MockBillingProvider        (development/testing)
 */
export interface IBillingService {
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  purchaseMonthlySubscription(): Promise<void>;
  purchaseYearlySubscription(): Promise<void>;
  restorePurchases(): Promise<boolean>;
  queryPurchases(): Promise<BillingPurchase[]>;
  queryProducts(): Promise<BillingProduct[]>;
  isBillingAvailable(): Promise<boolean>;
}

// ─── Callbacks ────────────────────────────────────────────────────────────────

export type PurchaseSuccessCallback = (purchase: BillingPurchase) => Promise<void>;
export type PurchaseErrorCallback = (error: BillingError) => void;
export type PurchasePendingCallback = (purchase: BillingPurchase) => void;
export type ConnectionChangeCallback = (isConnected: boolean) => void;

export interface BillingCallbacks {
  onPurchaseSuccess: PurchaseSuccessCallback;
  onPurchaseError: PurchaseErrorCallback;
  onPurchasePending: PurchasePendingCallback;
  onConnectionChange: ConnectionChangeCallback;
}
