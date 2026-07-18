// ─── PremiumManager ───────────────────────────────────────────────────────────
export { PremiumManager, PremiumFeature } from "./PremiumManager";
export type {
  PremiumStatus,
  PremiumTier,
  PremiumFeatureId,
  SubscriptionType,
} from "./PremiumManager";

// ─── FeatureRegistry ──────────────────────────────────────────────────────────
export {
  FEATURE_REGISTRY,
  FEATURE_REGISTRY_MAP,
  // Queries
  getActiveFeatures,
  getComingSoonFeatures,
  getFeaturesByCategory,
  // Feature Access Engine
  canUse,
  isPremiumFeature,
  isComingSoon,
  isEnabled,
  getLockedReason,
} from "./FeatureRegistry";
export type {
  PremiumFeatureDescriptor,
  FeatureCategory,
  MinimumPremiumVersion,
} from "./FeatureRegistry";
