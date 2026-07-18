/**
 * usePremiumFeature — convenience hook for feature-level premium gating.
 *
 * Returns whether a specific premium feature is accessible to the current user.
 * Use this in components that need conditional rendering based on feature access,
 * without the full <PremiumGate> wrapper.
 *
 * Usage:
 *   const { isEnabled, isPremium, feature } = usePremiumFeature(PremiumFeature.AI_TEACHER);
 *   if (!isEnabled) return <LockedBanner />;
 */

import { usePremium } from "@/contexts/PremiumContext";
import { FEATURE_REGISTRY_MAP } from "@/utils/premium/FeatureRegistry";
import type { PremiumFeatureId } from "@/utils/premium";

export interface UsePremiumFeatureResult {
  /**
   * True when the user has premium AND the feature is active (built).
   * This is the main guard: gate your feature behind `isEnabled`.
   */
  isEnabled: boolean;
  /** True when the user has an active premium subscription. */
  isPremium: boolean;
  /** True while premium status is being loaded from storage. */
  isLoading: boolean;
  /** Feature descriptor from the registry, or undefined if the ID is unknown. */
  feature: ReturnType<typeof FEATURE_REGISTRY_MAP.get>;
}

export function usePremiumFeature(featureId: PremiumFeatureId): UsePremiumFeatureResult {
  const { isPremium, isLoading } = usePremium();
  const feature = FEATURE_REGISTRY_MAP.get(featureId);
  const isEnabled = isPremium && (feature?.active ?? false);

  return { isEnabled, isPremium, isLoading, feature };
}
