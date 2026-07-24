/**
 * ScreenHeader — Shared back/close header for all non-tab Stack screens.
 *
 * Handles its own safe-area top padding so the calling screen does NOT
 * need to account for insets.top in its own scroll-view padding.
 *
 * Usage:
 *   // Card screen (back arrow)
 *   <ScreenHeader title="İstatistikler" />
 *
 *   // Modal screen (X close)
 *   <ScreenHeader variant="close" title="Premium" />
 *
 *   // Headless (no title, symmetrical placeholder keeps buttons aligned)
 *   <ScreenHeader />
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  /** Optional title shown centered between the back button and right slot. */
  title?: string;
  /**
   * "back"  → left-arrow (card screens, default)
   * "close" → × icon   (modal screens)
   */
  variant?: "back" | "close";
  /** Override the default navigation action. */
  onBack?: () => void;
  /** Optional element rendered in the right slot (keeps layout symmetrical). */
  rightElement?: React.ReactNode;
  /** Extra style on the root container. */
  style?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScreenHeader({
  title,
  variant = "back",
  onBack,
  rightElement,
  style,
}: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: topPad + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      {/* Back / close button */}
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.card }]}
        onPress={handleBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={variant === "close" ? "Kapat" : "Geri"}
      >
        <Feather
          name={variant === "close" ? "x" : "arrow-left"}
          size={20}
          color={colors.foreground}
        />
      </TouchableOpacity>

      {/* Center title */}
      {title != null ? (
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}

      {/* Right slot — placeholder keeps button centered when empty */}
      {rightElement != null ? rightElement : <View style={styles.placeholder} />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  flex: {
    flex: 1,
  },
  placeholder: {
    width: 40,
    flexShrink: 0,
  },
});
