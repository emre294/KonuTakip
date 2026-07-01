import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, Achievement } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const ICON_MAP: Record<string, string> = {
  star: "star-outline",
  zap: "flash-outline",
  book: "book-outline",
  award: "ribbon-outline",
  target: "target-outline",
  crown: "trophy-outline",
  calendar: "calendar-outline",
  "help-circle": "help-circle-outline",
};

function AchievementCard({ achievement, colors }: {
  achievement: Achievement;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const glow = useSharedValue(1);

  useEffect(() => {
    if (achievement.unlocked) {
      glow.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 1500 }), withTiming(1, { duration: 1500 })),
        -1,
        false
      );
    }
  }, [achievement.unlocked]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={glowStyle}>
      <View style={[
        styles.achCard,
        { backgroundColor: colors.card, borderColor: achievement.unlocked ? colors.warning : colors.border, borderWidth: achievement.unlocked ? 1.5 : 1 },
      ]}>
        <View style={[
          styles.achIcon,
          { backgroundColor: achievement.unlocked ? colors.warning + "20" : colors.muted },
        ]}>
          <Ionicons
            name={(ICON_MAP[achievement.icon] ?? "star-outline") as never}
            size={28}
            color={achievement.unlocked ? colors.warning : colors.mutedForeground}
          />
        </View>
        <View style={styles.achContent}>
          <Text style={[styles.achTitle, { color: achievement.unlocked ? colors.foreground : colors.mutedForeground }]}>
            {achievement.title}
          </Text>
          <Text style={[styles.achDesc, { color: colors.mutedForeground }]}>{achievement.description}</Text>
          {achievement.unlocked && achievement.unlockedDate ? (
            <Text style={[styles.achDate, { color: colors.warning }]}>
              {new Date(achievement.unlockedDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} tarihinde kazanıldı
            </Text>
          ) : null}
        </View>
        {achievement.unlocked ? (
          <Ionicons name="checkmark-circle" size={22} color={colors.warning} />
        ) : (
          <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} />
        )}
      </View>
    </Animated.View>
  );
}

export default function AchievementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { achievements } = useApp();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const pct = Math.round((unlockedCount / achievements.length) * 100);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Başarılar</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <View style={[styles.summaryCard, { backgroundColor: colors.warning }]}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryValue}>{unlockedCount}/{achievements.length}</Text>
            <Text style={styles.summaryLabel}>Başarı Kazanıldı</Text>
          </View>
          <View style={styles.summaryRight}>
            <View style={[styles.ringBg, { borderColor: "rgba(255,255,255,0.3)" }]}>
              <Text style={styles.ringPct}>{pct}%</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {unlockedCount > 0 ? `${unlockedCount} başarı tamamlandı` : "Henüz başarı kazanılmadı — ilk konunu tamamla!"}
        </Text>
      </Animated.View>

      <View style={styles.list}>
        {achievements
          .sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0))
          .map((a) => (
            <AchievementCard key={a.id} achievement={a} colors={colors} />
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryCard: {
    borderRadius: 20, padding: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  summaryLeft: { gap: 4 },
  summaryValue: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.85)" },
  summaryRight: {},
  ringBg: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  ringPct: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 16, paddingLeft: 4 },
  list: { gap: 12 },
  achCard: {
    borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  achIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  achContent: { flex: 1, gap: 2 },
  achTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  achDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  achDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
