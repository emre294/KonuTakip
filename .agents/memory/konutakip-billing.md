---
name: KonuTakip Google Play Billing
description: react-native-iap v15 billing infrastructure — architecture, API quirks, provider chain.
---

# KonuTakip Google Play Billing

## Architecture

```
utils/billing/
  types.ts                     — all shared types (PRODUCT_IDS, IBillingService, BillingError, callbacks)
  BillingLogger.ts             — __DEV__-gated console logger
  BillingManager.ts            — singleton: new GooglePlayBillingProvider()
  GooglePlayBillingProvider.ts — full IAP implementation
  verification/
    PurchaseVerifier.ts        — abstracted verification (local now, server-ready via TODO block)
  index.ts                     — public exports

contexts/BillingContext.tsx    — BillingProvider + useBilling() hook
```

Provider chain in _layout.tsx:
```
PremiumProvider > BillingProvider > GestureHandlerRootView > ...
```
BillingProvider MUST be inside PremiumProvider (calls grantPremium from usePremium).

## react-native-iap v15 API facts

- Requires `react-native-nitro-modules` as peer dep (both installed).
- `fetchProducts({ skus, type: 'subs' })` — fetch subscriptions.
- `requestPurchase({ request: { google: { skus, subscriptionOffers } }, type: 'subs' })` — NOT `android:`, use `google:` (android is deprecated).
- Products must be cast via `as unknown as Record<string, unknown>` before indexing — IAP union types don't have index signatures.
- Price lives at `product.subscriptionOffers[0].displayPrice` (cross-platform) or legacy `subscriptionOfferDetailsAndroid[0].pricingPhases.pricingPhaseList[0].formattedPrice`.
- `getActiveSubscriptions(skus?)` — takes optional SKU array, returns `ActiveSubscription[]`.
- `finishTransaction({ purchase, isConsumable: false })` — must pass original IAP Purchase object, not mapped BillingPurchase.
- Cancellations arrive via `purchaseErrorListener` with code `ErrorCode.UserCancelled` — do NOT surface as UI error.

## Product IDs
- Monthly subscription product: `konutakip_premium_aylik`
- Monthly base plan: `premium-aylik`
- Android application ID must exactly match Google Play Console: `com.konutakip.app`

## PremiumContext.grantPremium signature (updated)
Now accepts optional `source` parameter:
```typescript
grantPremium(subscriptionType?, expiresAt?, source?: PremiumStatus['source'])
```
BillingContext calls it with `source: 'google_play'`.

**Why:** Needed so billing-originated grants are distinguished from manual/test grants in PremiumStatus.source.

## Android entry point

The Android-specific `BillingManager.android.ts` file must export the real
`GooglePlayBillingProvider`. The platform file is preferred by Metro on
Android; exporting the no-op stub there makes every billing action silently do
nothing while web/iOS can continue using the stub in `BillingManager.ts`.

**Why:** A prior import state had the no-op implementation in the Android
platform file, which prevented `initConnection`, product loading, and
`requestPurchase` from ever running.

## Key constraints
- Billing is Android-only; Platform.OS check guards all calls.
- Auto-reconnect: exponential backoff, max 5 attempts, 2s base delay.
- Pending purchases: don't grant Premium; show info banner; listener re-fires when payment clears.
- Acknowledgement: `finishTransaction` called immediately after verification — Google auto-refunds after 3 days if unacknowledged.
