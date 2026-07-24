/**
 * PremiumSuccessScreen — Full-screen Premium kutlama ekranı.
 *
 * Konfeti, altın parıltılar, glow efekti, staggered feature kartları,
 * Premium rozeti pulse animasyonu ve "Ders Çalışmaya Başla" butonu.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/contexts/ThemeContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const PREMIUM_COLOR = "#F59E0B";
const PREMIUM_GLOW  = "#F59E0B30";
const PURPLE        = "#7C3AED";

const CONFETTI_ITEMS = [
  { left: "5%",  top: "6%",  rotate: "-24deg", symbol: "◆", color: PREMIUM_COLOR },
  { left: "15%", top: "18%", rotate: "18deg",  symbol: "●", color: PURPLE },
  { left: "28%", top: "8%",  rotate: "30deg",  symbol: "▲", color: "#EC4899" },
  { left: "42%", top: "4%",  rotate: "-10deg", symbol: "★", color: PREMIUM_COLOR },
  { left: "58%", top: "9%",  rotate: "22deg",  symbol: "◆", color: "#3B82F6" },
  { left: "72%", top: "6%",  rotate: "-18deg", symbol: "●", color: PREMIUM_COLOR },
  { left: "84%", top: "17%", rotate: "28deg",  symbol: "▲", color: PURPLE },
  { left: "93%", top: "10%", rotate: "-30deg", symbol: "★", color: "#EC4899" },
  { left: "10%", top: "38%", rotate: "15deg",  symbol: "●", color: "#3B82F6" },
  { left: "90%", top: "40%", rotate: "-15deg", symbol: "◆", color: PREMIUM_COLOR },
  { left: "50%", top: "3%",  rotate: "8deg",   symbol: "✦", color: PREMIUM_COLOR },
  { left: "35%", top: "45%", rotate: "-20deg", symbol: "★", color: PURPLE },
] as const;

const FEATURES = [
  { icon: "cpu" as const,         label: "AI Öğretmen",             desc: "Sınırsız konu anlatımı" },
  { icon: "book-open" as const,   label: "Sınırsız Konu Anlatımı",  desc: "Her konuyu derinlemesine öğren" },
  { icon: "check-square" as const,label: "Akıllı Soru Çözümü",      desc: "Adım adım çözüm açıklamaları" },
  { icon: "target" as const,      label: "AI Koç",                  desc: "Kişisel çalışma analizi" },
  { icon: "calendar" as const,    label: "Kişisel Çalışma Planı",   desc: "YKS'ye özel haftalık program" },
  { icon: "bar-chart-2" as const, label: "Hata Analizi",            desc: "Zayıf noktalarını tespit et" },
  { icon: "award" as const,       label: "Premium Rozet",           desc: "Profilde altın premium rozeti" },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfettiParticle({
  item,
  index,
}: {
  item: (typeof CONFETTI_ITEMS)[number];
  index: number;
}) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1200 + index * 80 }),
          withTiming(0, { duration: 1200 + index * 80 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { rotate: item.rotate },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.Text
      entering={FadeIn.delay(index * 90).duration(600)}
      style={[
        styles.confetti,
        { left: item.left as `${number}%`, top: item.top as `${number}%`, color: item.color },
        style,
      ]}
    >
      {item.symbol}
    </Animated.Text>
  );
}

function GlowIcon() {
  const pulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withSpring(1.06), withSpring(1)),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 1000 }), withTiming(0.2, { duration: 1000 })),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle  = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12)}
      style={[styles.iconContainer, pulseStyle]}
    >
      {/* Glow halo */}
      <Animated.View style={[styles.glowHalo, glowStyle]} />

      {/* Outer ring */}
      <View style={[styles.iconOuter, { backgroundColor: PREMIUM_GLOW, borderColor: PREMIUM_COLOR + "45" }]}>
        {/* Inner circle */}
        <LinearGradient
          colors={[PREMIUM_COLOR, "#D97706"]}
          style={styles.iconInner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.iconEmoji}>⭐</Text>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

function FeatureCard({
  feature,
  index,
  cardBg,
  cardBorder,
  textColor,
  subColor,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subColor: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(340 + index * 70).duration(400)}
      style={[styles.featureCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: PREMIUM_COLOR + "18" }]}>
        <Feather name={feature.icon} size={18} color={PREMIUM_COLOR} />
      </View>
      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureLabel, { color: textColor }]}>{feature.label}</Text>
        <Text style={[styles.featureDesc, { color: subColor }]}>{feature.desc}</Text>
      </View>
      <Feather name="check-circle" size={18} color={PREMIUM_COLOR} />
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PremiumSuccessScreen() {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  const colors = isDark
    ? {
        background: "#080E1A",
        card: "#111927",
        foreground: "#F8FAFC",
        muted: "#94A3B8",
        border: "#1E2D42",
      }
    : {
        background: "#FFFBEB",
        card: "#FFFFFF",
        foreground: "#1C1917",
        muted: "#78716C",
        border: "#FDE68A",
      };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Floating confetti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {CONFETTI_ITEMS.map((item, i) => (
          <ConfettiParticle key={i} item={item} index={i} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Glow icon ── */}
        <GlowIcon />

        {/* ── Title block ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.titleBlock}>
          <View style={styles.premiumBadge}>
            <Feather name="award" size={13} color="#7C4A03" />
            <Text style={styles.premiumBadgeText}>PREMIUM AKTİF</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Premium'a Hoş Geldin! 🎉
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            KonuTakip'in tüm Premium özellikleri artık aktif.{"\n"}
            Başarıya giden yolda seni bekliyoruz!
          </Text>
        </Animated.View>

        {/* ── Feature cards ── */}
        <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.featuresWrapper}>
          {FEATURES.map((f, i) => (
            <FeatureCard
              key={f.label}
              feature={f}
              index={i}
              cardBg={colors.card}
              cardBorder={colors.border}
              textColor={colors.foreground}
              subColor={colors.muted}
            />
          ))}
        </Animated.View>

        {/* ── CTA buttons ── */}
        <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.actions}>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
          >
            <LinearGradient
              colors={[PREMIUM_COLOR, "#D97706"]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="zap" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Ders Çalışmaya Başla</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/ai-teacher")}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { backgroundColor: colors.card, borderColor: PREMIUM_COLOR + "50", opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name="cpu" size={17} color={PREMIUM_COLOR} />
            <Text style={[styles.secondaryBtnText, { color: PREMIUM_COLOR }]}>
              AI Öğretmeni Dene
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 36,
    gap: 24,
  },

  // Confetti
  confetti: {
    position: "absolute",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },

  // Glow icon
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowHalo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: PREMIUM_COLOR,
    opacity: 0.25,
  },
  iconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  iconEmoji: {
    fontSize: 40,
  },

  // Title block
  titleBlock: {
    width: "100%",
    alignItems: "center",
    gap: 10,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FDE68A",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#F59E0B55",
  },
  premiumBadgeText: {
    color: "#7C4A03",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },

  // Feature cards
  featuresWrapper: {
    width: "100%",
    gap: 10,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  featureLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  // CTA buttons
  actions: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
