/**
 * usePremiumFeatures — aggregated hook for the full feature catalogue.
 *
 * Returns the complete feature list split into three buckets based on
 * the current user's premium status and each feature's access rules.
 *
 * Usage:
 *   const { availableFeatures, lockedFeatures, comingSoonFeatures, featureCount } =
 *     usePremiumFeatures();
 */

import { useMemo } from "react";

import { usePremium } from "@/contexts/PremiumContext";
import {
  FEATURE_REGISTRY,
  canUse,
  type PremiumFeatureDescriptor,
} from "@/utils/premium/FeatureRegistry";

// ─── Return shape ─────────────────────────────────────────────────────────────

export interface UsePremiumFeaturesResult {
  /**
   * Features the current user can access right now.
   * (enabled, not comingSoon, and premium requirement satisfied)
   */
  availableFeatures: PremiumFeatureDescriptor[];
  /**
   * Features the user cannot access because they require Premium
   * and the user is on the free tier.
   * (enabled, not comingSoon, premiumRequired: true, user not premium)
   */
  lockedFeatures: PremiumFeatureDescriptor[];
  /**
   * Features that are announced but not yet released.
   * (comingSoon: true, regardless of premium status)
   */
  comingSoonFeatures: PremiumFeatureDescriptor[];

  // ── Counts ──────────────────────────────────────────────────────────────────
  /** Total number of features in the registry. */
  featureCount: number;
  /** Number of features that require a Premium subscription. */
  premiumCount: number;
  /** Number of features that are available without Premium. */
  freeCount: number;

  // ── Loading ─────────────────────────────────────────────────────────────────
  /** True while premium status is being loaded from AsyncStorage. */
  isLoading: boolean;
  /** True if the current user has an active Premium subscription. */
  isPremium: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePremiumFeatures(): UsePremiumFeaturesResult {
  const { isPremium, isLoading } = usePremium();

  return useMemo((): UsePremiumFeaturesResult => {
    const availableFeatures: PremiumFeatureDescriptor[] = [];
    const lockedFeatures: PremiumFeatureDescriptor[] = [];
    const comingSoonFeatures: PremiumFeatureDescriptor[] = [];

    for (const feature of FEATURE_REGISTRY) {
      if (feature.comingSoon) {
        comingSoonFeatures.push(feature);
        continue;
      }
      if (canUse(feature.id, isPremium)) {
        availableFeatures.push(feature);
      } else {
        lockedFeatures.push(feature);
      }
    }

    const premiumCount = FEATURE_REGISTRY.filter((f) => f.premiumRequired).length;
    const freeCount = FEATURE_REGISTRY.filter((f) => !f.premiumRequired).length;

    return {
      availableFeatures,
      lockedFeatures,
      comingSoonFeatures,
      featureCount: FEATURE_REGISTRY.length,
      premiumCount,
      freeCount,
      isLoading,
      isPremium,
    };
  }, [isPremium, isLoading]);
}
