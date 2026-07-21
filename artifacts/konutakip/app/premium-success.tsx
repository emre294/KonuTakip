import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

import { useTheme } from "@/contexts/ThemeContext";

const PREMIUM_COLOR = "#F59E0B";

const CONFETTI = [
  { left: "8%", top: "12%", rotate: "-24deg", symbol: "◆" },
  { left: "20%", top: "23%", rotate: "18deg", symbol: "●" },
  { left: "34%", top: "10%", rotate: "30deg", symbol: "▲" },
  { left: "67%", top: "11%", rotate: "-18deg", symbol: "●" },
  { left: "80%", top: "22%", rotate: "28deg", symbol: "◆" },
  { left: "91%", top: "13%", rotate: "-30deg", symbol: "▲" },
  { left: "14%", top: "42%", rotate: "15deg", symbol: "▲" },
  { left: "87%", top: "43%", rotate: "-15deg", symbol: "◆" },
];

export default function PremiumSuccessScreen() {
  const { resolved } = useTheme();

  const colors =
    resolved === "dark"
      ? {
          background: "#0B1020",
          card: "#141B2D",
          foreground: "#F8FAFC",
          mutedForeground: "#94A3B8",
          border: "#263247",
        }
      : {
          background: "#F8FAFC",
          card: "#FFFFFF",
          foreground: "#0F172A",
          mutedForeground: "#64748B",
          border: "#E2E8F0",
        };

  useEffect(() => {
    const timeout = setTimeout(() => {}, 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={styles.container}>
        {CONFETTI.map((item, index) => (
          <Animated.Text
            key={`${item.left}-${item.top}`}
            entering={FadeIn.delay(index * 80).duration(500)}
            style={[
              styles.confetti,
              {
                left: item.left as `${number}%`,
                top: item.top as `${number}%`,
                transform: [{ rotate: item.rotate }],
                color: index % 2 === 0 ? PREMIUM_COLOR : "#7C3AED",
              },
            ]}
          >
            {item.symbol}
          </Animated.Text>
        ))}

        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[
            styles.iconOuter,
            {
              backgroundColor: PREMIUM_COLOR + "18",
              borderColor: PREMIUM_COLOR + "45",
            },
          ]}
        >
          <View
            style={[
              styles.iconInner,
              { backgroundColor: PREMIUM_COLOR },
            ]}
          >
            <Feather name="check" size={42} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(180).duration(500)}
          style={styles.textArea}
        >
          <View style={styles.badge}>
            <Feather name="award" size={13} color="#7C4A03" />
            <Text style={styles.badgeText}>PREMIUM AKTİF</Text>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Aramıza hoş geldin!
          </Text>

          <Text
            style={[
              styles.description,
              { color: colors.mutedForeground },
            ]}
          >
            KonuTakip Premium hesabın başarıyla aktif edildi. Artık tüm
            Premium özellikleri kullanabilirsin.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(320).duration(500)}
          style={[
            styles.featureCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <FeatureRow
            icon="message-circle"
            text="AI Öğretmeni ile sınırsız konu desteği"
            color={colors.foreground}
          />
          <FeatureRow
            icon="target"
            text="Kişisel AI çalışma koçu"
            color={colors.foreground}
          />
          <FeatureRow
            icon="bar-chart-2"
            text="Gelişmiş performans analizleri"
            color={colors.foreground}
          />
          <FeatureRow
            icon="calendar"
            text="Sana özel çalışma planları"
            color={colors.foreground}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(450).duration(500)}
          style={styles.actions}
        >
          <Pressable
            onPress={() => router.replace("/ai-teacher")}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: PREMIUM_COLOR,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Feather name="zap" size={19} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              AI Öğretmeni Aç
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.foreground },
              ]}
            >
              Ana Sayfaya Dön
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({
  icon,
  text,
  color,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  text: string;
  color: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Feather name={icon} size={17} color={PREMIUM_COLOR} />
      </View>

      <Text style={[styles.featureText, { color }]}>{text}</Text>

      <Feather name="check-circle" size={18} color={PREMIUM_COLOR} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 24,
    alignItems: "center",
  },
  confetti: {
    position: "absolute",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  iconOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  textArea: {
    width: "100%",
    alignItems: "center",
    marginBottom: 25,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FDE68A",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F59E0B55",
  },
  badgeText: {
    color: "#7C4A03",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    maxWidth: 330,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlign: "center",
  },
  featureCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  featureRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: PREMIUM_COLOR + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  actions: {
    width: "100%",
    gap: 11,
    marginTop: "auto",
  },
  primaryButton: {
    height: 56,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryButton: {
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

