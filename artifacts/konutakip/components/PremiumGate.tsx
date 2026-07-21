/**
 * PremiumGate — wraps any screen or component that requires Premium access.
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

import { PREMIUM_COLOR } from "@/components/PremiumBadge";
import { usePremium } from "@/contexts/PremiumContext";
import { useColors } from "@/hooks/useColors";
import type { PremiumFeatureId } from "@/utils/premium";
import { FEATURE_REGISTRY_MAP } from "@/utils/premium/FeatureRegistry";

interface PremiumGateProps {
  children: React.ReactNode;
  featureId?: PremiumFeatureId;
  featureName?: string;
  featureDescription?: string;
  lockedContainerStyle?: ViewStyle;
}

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
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
        containerStyle,
      ]}
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.iconWrap}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: `${PREMIUM_COLOR}18` },
          ]}
        >
          <Feather name="lock" size={40} color={PREMIUM_COLOR} />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={styles.textBlock}
      >
        <Text style={[styles.premiumLabel, { color: PREMIUM_COLOR }]}>
          PREMIUM ÖZELLİK
        </Text>

        <Text style={[styles.featureName, { color: colors.foreground }]}>
          {featureName}
        </Text>

        {featureDescription ? (
          <Text
            style={[
              styles.featureDescription,
              { color: colors.mutedForeground },
            ]}
          >
            {featureDescription}
          </Text>
        ) : null}
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(160).duration(400)}
        style={styles.infoCardWrap}
      >
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: `${PREMIUM_COLOR}40`,
            },
          ]}
        >
          <Feather name="star" size={18} color={PREMIUM_COLOR} />

          <Text
            style={[
              styles.infoText,
              { color: colors.mutedForeground },
            ]}
          >
            Bu özelliğe erişmek için Premium üyeliğe geçmelisin.
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(240).duration(400)}
        style={styles.ctaWrap}
      >
        <TouchableOpacity
          style={[
            styles.upgradeButton,
            { backgroundColor: PREMIUM_COLOR },
          ]}
          activeOpacity={0.85}
          onPress={() => router.push("/premium")}
        >
          <Feather name="zap" size={20} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

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

  const registryEntry = featureId
    ? FEATURE_REGISTRY_MAP.get(featureId)
    : undefined;

  const resolvedName =
    featureName ?? registryEntry?.title ?? "Premium Özellik";

  const resolvedDescription =
    featureDescription ?? registryEntry?.description;

  return (
    <LockedView
      featureName={resolvedName}
      featureDescription={resolvedDescription}
      containerStyle={lockedContainerStyle}
    />
  );
}

const styles = StyleSheet.create({
  lockedRoot: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  premiumLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.8,
    textAlign: "center",
  },
  featureName: {
    width: "100%",
    fontSize: 30,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  featureDescription: {
    width: "100%",
    maxWidth: 440,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  infoCardWrap: {
    width: "100%",
  },
  infoCard: {
    width: "100%",
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
  ctaWrap: {
    width: "100%",
  },
  upgradeButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
});
