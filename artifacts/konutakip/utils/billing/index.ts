/**
 * Billing module — public exports.
 *
 * Consumers should import from here rather than from individual files:
 *   import { BillingManager, useBilling, PRODUCT_IDS } from "@/utils/billing";
 *
 * To update Product IDs: edit utils/billing/config.ts only.
 */

export * from "./config";
export * from "./types";
export { BillingManager } from "./BillingManager";
export { BillingLogger } from "./BillingLogger";
export { verifyPurchase } from "./verification/PurchaseVerifier";
export type { VerificationResult } from "./verification/PurchaseVerifier";
