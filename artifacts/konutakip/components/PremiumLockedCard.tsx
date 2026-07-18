/**
 * PremiumLockedCard — inline locked-feature card.
 *
 * Use this when you want to show a locked state inside a list or grid,
 * rather than the full-screen PremiumGate overlay.
 *
 * Responsive. No fixed heights. Grows with content.
 *
 * Usage:
 *   <PremiumLockedCard
 *     featureId={PremiumFeature.AI_TEACHER}
 *     onUpgrade={() => router.push("/premium")}
 *   />
 *
 *   // Or with explicit strings (no registry lookup needed):
 *   <PremiumLockedCard title="AI Öğretmen" description="..." />
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";

import { PREMIUM_COLOR } from "@/components/PremiumBadge";
import { useColors } from "@/hooks/useColors";
import {
  FEATURE_REGISTRY_MAP,
  getLockedReason,
  type PremiumFeatureDescriptor,
} from "@/utils/premium/FeatureRegistry";
import { usePremium } from "@/contexts/PremiumContext";
import type { PremiumFeatureId } from "@/utils/premium";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PremiumLockedCardProps {
  /**
   * Feature ID for automatic registry lookup.
   * When provided, title, description, and icon are resolved automatically.
   */
  featureId?: PremiumFeatureId;
  /** Override the title resolved from the registry. */
  title?: string;
  /** Override the description / lock reason resolved from the registry. */
  description?: string;
  /** Feather icon name. Defaults to "lock". */
  icon?: string;
  /** Called when the user taps the upgrade button. Defaults to router.push("/premium"). */
  onUpgrade?: () => void;
  /** Optional style for the card's outer container. */
  style?: ViewStyle;
  /** Whether to show the upgrade CTA button. Default: true. */
  showUpgradeButton?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PremiumLockedCard({
  featureId,
  title,
  description,
  icon,
  onUpgrade,
  style,
  showUpgradeButton = true,
}: PremiumLockedCardProps) {
  const colors = useColors();
  const { isPremium } = usePremium();

  // Resolve metadata from registry when featureId is provided
  const entry: PremiumFeatureDescriptor | undefined = featureId
    ? FEATURE_REGISTRY_MAP.get(featureId)
    : undefined;

  const resolvedTitle = title ?? entry?.title ?? "Premium Özellik";
  const resolvedDesc =
    description ??
    (featureId ? (getLockedReason(featureId, isPremium) ?? undefined) : undefined) ??
    "Bu özellik Premium üyelik gerektirir.";
  const resolvedIcon = icon ?? entry?.icon ?? "lock";

  function handleUpgrade() {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push("/premium");
    }
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: PREMIUM_COLOR + "35" },
        style,
      ]}
    >
      {/* Icon + text row */}
      <View style={styles.row}>
        {/* Icon badge */}
        <View style={[styles.iconWrap, { backgroundColor: PREMIUM_COLOR + "18" }]}>
          <Feather name={resolvedIcon as never} size={18} color={PREMIUM_COLOR} />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {resolvedTitle}
            </Text>
            <View style={[styles.proBadge, { backgroundColor: PREMIUM_COLOR }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {resolvedDesc}
          </Text>
        </View>
      </View>

      {/* Upgrade CTA */}
      {showUpgradeButton && (
        <TouchableOpacity
          style={[styles.upgradeBtn, { backgroundColor: PREMIUM_COLOR }]}
          activeOpacity={0.85}
          onPress={handleUpgrade}
        >
          <Feather name="star" size={14} color="#fff" style={styles.upgradeBtnIcon} />
          <Text style={styles.upgradeBtnText}>Premium'a Geç</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    flexShrink: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  proBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  proBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  upgradeBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 46,
  },
  upgradeBtnIcon: {
    flexShrink: 0,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
