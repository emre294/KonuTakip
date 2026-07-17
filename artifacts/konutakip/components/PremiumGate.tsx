/**
 * PremiumGate — wraps any screen or component that requires Premium access.
 *
 * Behaviour:
 *   • Premium user  → renders {children} unchanged.
 *   • Free user     → renders a clean "locked" UI explaining what Premium
 *                     unlocks and offering a direct path to /premium.
 *
 * Usage:
 *   <PremiumGate featureName="AI Soru Üretici" featureDescription="...">
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PremiumGateProps {
  /** Children rendered when the user IS on Premium. */
  children: React.ReactNode;
  /** Turkish display name shown in the locked state heading. */
  featureName: string;
  /**
   * One-sentence explanation of what the feature does.
   * Shown in the locked state subtitle.
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
        { backgroundColor: colors.background, paddingBottom: insets.bottom + 40 },
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
        <Text style={[styles.featureName, { color: colors.foreground }]}>{featureName}</Text>
        {featureDescription ? (
          <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>
            {featureDescription}
          </Text>
        ) : null}
      </Animated.View>

      {/* Info card */}
      <Animated.View entering={FadeInDown.delay(160).duration(400)}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: PREMIUM_COLOR + "40" }]}>
          <View style={styles.infoRow}>
            <Feather name="lock" size={15} color={PREMIUM_COLOR} />
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
  featureName,
  featureDescription,
  lockedContainerStyle,
}: PremiumGateProps) {
  const { isPremium } = usePremium();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <LockedView
      featureName={featureName}
      featureDescription={featureDescription}
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
    paddingHorizontal: 32,
    gap: 24,
  },
  iconWrap: {
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  lockEmoji: {
    fontSize: 40,
    color: PREMIUM_COLOR,
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
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
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: "stretch",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    alignItems: "center",
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
  },
});
