/**
 * ComingSoonCard — inline coming-soon feature card.
 *
 * Use this to show an announced feature that is not yet available.
 * Displays an estimated release date when provided by the registry.
 *
 * Responsive. No fixed heights. Grows with content.
 *
 * Usage:
 *   <ComingSoonCard featureId={PremiumFeature.SMART_REVIEW_SYSTEM} />
 *
 *   // Or with explicit strings:
 *   <ComingSoonCard
 *     title="Akıllı Tekrar Sistemi"
 *     description="Spaced repetition ile konuları tekrar planla."
 *     estimatedRelease="Q3 2025"
 *   />
 */

import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";
import { FEATURE_REGISTRY_MAP } from "@/utils/premium/FeatureRegistry";
import type { PremiumFeatureId } from "@/utils/premium";

// ─── Accent colour for coming-soon state (purple / indigo) ────────────────────
const COMING_SOON_COLOR = "#8B5CF6";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComingSoonCardProps {
  /**
   * Feature ID for automatic registry lookup.
   * When provided, title, description, icon and estimatedRelease are resolved
   * from the registry automatically.
   */
  featureId?: PremiumFeatureId;
  /** Override the title resolved from the registry. */
  title?: string;
  /** Override the description resolved from the registry. */
  description?: string;
  /** Feather icon name. Defaults to "clock". */
  icon?: string;
  /** Human-readable estimated release (e.g. "Q3 2025"). */
  estimatedRelease?: string;
  /** Optional style for the card's outer container. */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComingSoonCard({
  featureId,
  title,
  description,
  icon,
  estimatedRelease,
  style,
}: ComingSoonCardProps) {
  const colors = useColors();

  // Resolve metadata from registry when featureId is provided
  const entry = featureId ? FEATURE_REGISTRY_MAP.get(featureId) : undefined;

  const resolvedTitle = title ?? entry?.title ?? "Yakında";
  const resolvedDesc =
    description ?? entry?.description ?? "Bu özellik çok yakında kullanıma sunulacak.";
  const resolvedIcon = icon ?? entry?.icon ?? "clock";
  const resolvedRelease = estimatedRelease ?? entry?.estimatedRelease;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: COMING_SOON_COLOR + "35" },
        style,
      ]}
    >
      {/* Icon + text row */}
      <View style={styles.row}>
        {/* Icon badge */}
        <View style={[styles.iconWrap, { backgroundColor: COMING_SOON_COLOR + "15" }]}>
          <Feather name={resolvedIcon as never} size={18} color={COMING_SOON_COLOR} />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.foreground }]}
              numberOfLines={2}
            >
              {resolvedTitle}
            </Text>
            <View style={[styles.badge, { backgroundColor: COMING_SOON_COLOR + "18" }]}>
              <Text style={[styles.badgeText, { color: COMING_SOON_COLOR }]}>YAKINDA</Text>
            </View>
          </View>
          <Text
            style={[styles.description, { color: colors.mutedForeground }]}
            numberOfLines={3}
          >
            {resolvedDesc}
          </Text>
        </View>
      </View>

      {/* Estimated release chip */}
      {resolvedRelease ? (
        <View style={[styles.releaseChip, { borderColor: COMING_SOON_COLOR + "40" }]}>
          <Feather name="calendar" size={12} color={COMING_SOON_COLOR} style={styles.chipIcon} />
          <Text style={[styles.chipText, { color: COMING_SOON_COLOR }]}>
            Tahmini: {resolvedRelease}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
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
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  releaseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  chipIcon: {
    flexShrink: 0,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
