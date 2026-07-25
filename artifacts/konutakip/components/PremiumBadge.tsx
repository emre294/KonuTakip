/**
 * PremiumBadge — small inline badge that marks a feature as Premium-only.
 *
 * Render it next to any locked feature label so users understand at a glance
 * which capabilities require a subscription.
 *
 * Props:
 *   size  — "sm" (10px, for dense lists) | "md" (11px, default)
 *   style — optional ViewStyle overrides
 */

import React, { useEffect } from "react";
import { StyleSheet, Text, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// The amber/gold Premium brand colour — intentionally hard-coded so the badge
// reads the same in both light and dark mode without pulling from ThemeContext.
export const PREMIUM_COLOR = "#F59E0B";
export const PREMIUM_COLOR_LIGHT = "#FEF3C7";

interface PremiumBadgeProps {
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function PremiumBadge({ size = "md", style }: PremiumBadgeProps) {
  const fontSize = size === "sm" ? 9 : 10;
  const px = size === "sm" ? 5 : 7;
  const py = size === "sm" ? 2 : 3;
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        animatedStyle,
        { paddingHorizontal: px, paddingVertical: py },
        style,
      ]}
    >
      <Text style={[styles.crown, { fontSize: fontSize + 1 }]}>★</Text>
      <Text style={[styles.label, { fontSize }]}>PRO</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PREMIUM_COLOR,
    borderRadius: 6,
  },
  crown: {
    color: "#fff",
    lineHeight: undefined,
  },
  label: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
});
