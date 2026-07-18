/**
 * PurchaseVerifier — abstracted purchase verification layer.
 *
 * Current implementation: local validation (token presence + purchase state).
 *
 * Production upgrade path:
 *   Replace the TODO block with a fetch() call to your backend.
 *   The function signature and VerificationResult shape stay the same,
 *   so all call-sites (GooglePlayBillingProvider) require zero changes.
 *
 *   Backend endpoint contract:
 *     POST /api/billing/verify
 *     Body: { purchaseToken: string; productId: string; platform: "android" }
 *     Response: { isValid: boolean; expiresAt: string | null; error?: string }
 */

import type { BillingPurchase } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerificationResult {
  /** True when the purchase is genuine and should unlock Premium. */
  isValid: boolean;
  /**
   * ISO-8601 expiration date from the verification backend.
   * null until server-side verification is implemented.
   */
  expiresAt: string | null;
  /** Human-readable reason when isValid is false. */
  error?: string;
}

// ─── Verifier ─────────────────────────────────────────────────────────────────

/**
 * Verify a purchase before granting Premium access.
 *
 * @param purchase - The mapped BillingPurchase from react-native-iap.
 * @returns VerificationResult indicating whether Premium should be granted.
 */
export async function verifyPurchase(
  purchase: BillingPurchase
): Promise<VerificationResult> {
  // ── Local guards ───────────────────────────────────────────────────────────

  if (!purchase.purchaseToken) {
    return { isValid: false, expiresAt: null, error: "Missing purchase token" };
  }

  if (purchase.purchaseState !== "purchased") {
    return {
      isValid: false,
      expiresAt: null,
      error: `Purchase not in 'purchased' state: ${purchase.purchaseState}`,
    };
  }

  // ── TODO: Server-side verification ─────────────────────────────────────────
  //
  // Uncomment and adapt when a backend endpoint is available:
  //
  // try {
  //   const apiBase = process.env.EXPO_PUBLIC_API_URL ?? "";
  //   const response = await fetch(`${apiBase}/api/billing/verify`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       purchaseToken: purchase.purchaseToken,
  //       productId: purchase.productId,
  //       platform: "android",
  //     }),
  //   });
  //   if (!response.ok) {
  //     return { isValid: false, expiresAt: null, error: "Server rejected purchase" };
  //   }
  //   const data = (await response.json()) as {
  //     isValid: boolean;
  //     expiresAt: string | null;
  //     error?: string;
  //   };
  //   return { isValid: data.isValid, expiresAt: data.expiresAt ?? null, error: data.error };
  // } catch {
  //   return { isValid: false, expiresAt: null, error: "Verification network error" };
  // }

  // ── Local-only approval (token + state already validated above) ────────────
  return { isValid: true, expiresAt: null };
}
