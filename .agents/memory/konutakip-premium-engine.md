---
name: KonuTakip Premium Feature Engine
description: Full architecture of the Premium Feature Engine — registry, access engine, hooks, and components.
---

# KonuTakip Premium Feature Engine

## File map

```
utils/premium/
  PremiumManager.ts      — Singleton; persists status via AsyncStorage; billing stubs
  FeatureRegistry.ts     — Registry + Feature Access Engine (canUse, getLockedReason, …)
  index.ts               — Single re-export barrel

contexts/PremiumContext.tsx  — React layer over PremiumManager; reactive isPremium state

hooks/
  usePremiumFeature.ts   — Single-feature hook: { isEnabled, isPremium, isLoading, feature }
  usePremiumFeatures.ts  — Aggregate hook: { availableFeatures, lockedFeatures, comingSoonFeatures, … }

components/
  PremiumGate.tsx        — Full-screen locked overlay (wraps an entire screen)
  PremiumLockedCard.tsx  — Inline locked-feature card (use inside lists/grids)
  ComingSoonCard.tsx     — Inline coming-soon card with optional estimatedRelease chip
  PremiumBadge.tsx       — Small inline "PRO" badge; exports PREMIUM_COLOR = "#F59E0B"
```

## PremiumFeatureDescriptor fields

`id, title, description, category, enabled, premiumRequired, comingSoon, icon, badge?, versionIntroduced?, minimumPremiumVersion?, estimatedRelease?`

Note: old `name` field was renamed to `title` and `active` to `enabled`. Any new feature must use the new field names.

## FeatureCategory values

`"ai" | "analytics" | "planning" | "testing" | "study" | "future"`

## Feature Access Engine (all in FeatureRegistry.ts)

- `canUse(featureId, isPremium)` — main guard
- `isPremiumFeature(featureId)` — does it require premium?
- `isComingSoon(featureId)` — is it announced but not released?
- `isEnabled(featureId)` — built and not comingSoon?
- `getLockedReason(featureId, isPremium)` → Turkish string | null

## PremiumManager.ts — subscription type

`SubscriptionType = "monthly" | "yearly" | "trial" | "promotional" | "campaign"`

`grantPremium(subscriptionType, expiresAt, source)` — first arg changed from old signature.

**Why:** Needed to support billing-type-aware analytics and future gate rules (e.g. yearly-only features).

**How to apply:** PremiumContext.grantPremium mirrors the same signature. When billing is integrated, pass the correct type from the Google Play response.

## Activating a new feature

1. Add ID to `PremiumFeature` const in PremiumManager.ts
2. Add entry to `FEATURE_REGISTRY` in FeatureRegistry.ts with `enabled: true, comingSoon: false`
3. Wrap screen with `<PremiumGate featureId={...}>` or inline with `<PremiumLockedCard featureId={...}>`

No other files change.

## TypeScript discipline

`tsc --noEmit` must always pass with zero output before any commit.
