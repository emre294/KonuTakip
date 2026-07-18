/**
 * PremiumGate — wraps any screen or component that requires Premium access.
 *
 * Behaviour:
 *   • Premium user  → renders {children} unchanged.
 *   • Free user     → renders a clean "locked" UI explaining what Premium
 *                     unlocks and offering a direct path to /premium.
 *
 * Usage:
 *   <PremiumGate featureId={PremiumFeature.AI_TEACHER} featureName="AI Öğretmen">
 *     <MyPremiumFeatureScreen />
 *   </PremiumGate>
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { usePremium } from "@/contexts/PremiumContext";
import { PREMIUM_COLOR } from "@/components/PremiumBadge";
import type { PremiumFeatureId } from "@/utils/premium";
import { FEATURE_REGISTRY_MAP } from "@/utils/premium/FeatureRegistry";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PremiumGateProps {
  /** Children rendered when the user IS on Premium. */
  children: React.ReactNode;
  /**
   * The feature ID from PremiumFeature enum.
   * Used to auto-fill name and description from the registry when not overridden.
   */
  featureId?: PremiumFeatureId;
  /** Turkish display name shown in the locked state heading. Falls back to registry. */
  featureName?: string;
  /**
   * One-sentence explanation of what the feature does.
   * Falls back to registry description when featureId is provided.
   */
  featureDescription?: string;
  /**
   * Optional container style for the locked state wrapper.
   * Useful for matching the parent screen's padding/background.
   */
  lockedContainerStyle?: ViewStyle;
}

// ─── Locked UI ────────────────────────────────────────────────────────────────

function LockedView({
  featureName,
  featureDescription,
  containerStyle,
}: {
  featureName: string;
  featureDescription?: string;
  containerStyle?: ViewStyle;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.lockedRoot,
        { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) + 24 },
        containerStyle,
      ]}
    >
      {/* Lock icon */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.iconWrap}>
        <View style={[styles.iconCircle, { backgroundColor: PREMIUM_COLOR + "18" }]}>
          <Text style={styles.lockEmoji}>★</Text>
        </View>
      </Animated.View>

      {/* Heading */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.textBlock}>
        <Text style={[styles.premiumLabel, { color: PREMIUM_COLOR }]}>Premium Özellik</Text>
        <Text
          style={[styles.featureName, { color: colors.foreground }]}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {featureName}
        </Text>
        {featureDescription ? (
          <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>
            {featureDescription}
          </Text>
        ) : null}
      </Animated.View>

      {/* Info card */}
      <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.infoCardWrap}>
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: PREMIUM_COLOR + "40" },
          ]}
        >
          <View style={styles.infoRow}>
            <Feather name="lock" size={15} color={PREMIUM_COLOR} style={styles.infoIcon} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Bu özellik Premium üyelik gerektirir.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* CTA button */}
      <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.upgradeBtn, { backgroundColor: PREMIUM_COLOR }]}
          activeOpacity={0.85}
          onPress={() => router.push("/premium")}
        >
          <Text style={styles.upgradeBtnText}>★  Premium'a Geç</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Gate ─────────────────────────────────────────────────────────────────────

export function PremiumGate({
  children,
  featureId,
  featureName,
  featureDescription,
  lockedContainerStyle,
}: PremiumGateProps) {
  const { isPremium } = usePremium();

  if (isPremium) {
    return <>{children}</>;
  }

  // Resolve name and description from registry when featureId is provided
  const registryEntry = featureId ? FEATURE_REGISTRY_MAP.get(featureId) : undefined;
  const resolvedName = featureName ?? registryEntry?.name ?? "Premium Özellik";
  const resolvedDesc = featureDescription ?? registryEntry?.description;

  return (
    <LockedView
      featureName={resolvedName}
      featureDescription={resolvedDesc}
      containerStyle={lockedContainerStyle}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  lockedRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
  },
  iconWrap: {
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  lockEmoji: {
    fontSize: 36,
    color: PREMIUM_COLOR,
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
    alignSelf: "stretch",
  },
  premiumLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  featureName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  featureDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 2,
  },
  infoCardWrap: {
    alignSelf: "stretch",
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoIcon: {
    flexShrink: 0,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  ctaWrap: {
    alignSelf: "stretch",
  },
  upgradeBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
