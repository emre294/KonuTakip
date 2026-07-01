import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { AYT_EXAM_DATE, TYT_EXAM_DATE } from "@/data/subjects";
import { getRandomQuote, Quote } from "@/data/quotes";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

function useCountdown(targetDate: Date) {
  const [diff, setDiff] = useState(targetDate.getTime() - Date.now());
  useEffect(() => {
    const timer = setInterval(() => setDiff(targetDate.getTime() - Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function CountdownUnit({ value, label, colors }: { value: number; label: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.countUnit}>
      <Text style={[styles.countValue, { color: "#fff" }]}>{String(value).padStart(2, "0")}</Text>
      <Text style={[styles.countLabel, { color: "rgba(255,255,255,0.75)" }]}>{label}</Text>
    </View>
  );
}

function CountdownCard({ title, date, gradient1, gradient2, colors }: {
  title: string; date: Date; gradient1: string; gradient2: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const cd = useCountdown(date);
  return (
    <View style={[styles.countdownCard, { backgroundColor: gradient1 }]}>
      <Text style={[styles.countdownTitle, { color: "#fff" }]}>{title}</Text>
      <View style={styles.countdownRow}>
        <CountdownUnit value={cd.days} label="GÜN" colors={colors} />
        <Text style={[styles.countSep, { color: "rgba(255,255,255,0.6)" }]}>:</Text>
        <CountdownUnit value={cd.hours} label="SAAT" colors={colors} />
        <Text style={[styles.countSep, { color: "rgba(255,255,255,0.6)" }]}>:</Text>
        <CountdownUnit value={cd.minutes} label="DAK" colors={colors} />
        <Text style={[styles.countSep, { color: "rgba(255,255,255,0.6)" }]}>:</Text>
        <CountdownUnit value={cd.seconds} label="SAN" colors={colors} />
      </View>
    </View>
  );
}

function CircleProgress({ pct, color, size }: { pct: number; color: string; size: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: color + "30", position: "absolute" }]} />
      <View style={[{
        width: size, height: size, borderRadius: size / 2, borderWidth: 4,
        borderColor: color, position: "absolute",
        borderRightColor: "transparent", borderBottomColor: "transparent",
        transform: [{ rotate: `${(pct / 100) * 360 - 90}deg` }],
      }]} />
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: size > 70 ? 22 : 16, color }}>
        {pct}%
      </Text>
    </View>
  );
}

function ProgressCard({ title, pct, color, colors }: { title: string; pct: number; color: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const anim = useSharedValue(0);
  useEffect(() => {
    anim.value = withTiming(pct, { duration: 1200 });
  }, [pct]);

  return (
    <View style={[styles.progressCard, { backgroundColor: colors.card, flex: 1 }]}>
      <CircleProgress pct={pct} color={color} size={76} />
      <Text style={[styles.progressTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>Tamamlandı</Text>
    </View>
  );
}

function TaskItem({ session, onComplete, colors }: {
  session: import("@/contexts/AppContext").DailySession;
  onComplete: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handleComplete() {
    scale.value = withSequence(withSpring(0.93), withSpring(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }

  return (
    <Animated.View style={[animStyle, styles.taskItem, { backgroundColor: session.completed ? colors.muted : colors.card }]}>
      <View style={styles.taskLeft}>
        <TouchableOpacity
          onPress={handleComplete}
          disabled={session.completed}
          style={[styles.taskCheck, { borderColor: session.completed ? colors.success : colors.border, backgroundColor: session.completed ? colors.success : "transparent" }]}
        >
          {session.completed && <Feather name="check" size={14} color="#fff" />}
        </TouchableOpacity>
        <View style={styles.taskInfo}>
          <Text style={[styles.taskSubject, { color: session.completed ? colors.mutedForeground : colors.foreground, textDecorationLine: session.completed ? "line-through" : "none" }]}>
            {session.subjectName}
          </Text>
          <Text style={[styles.taskTopic, { color: colors.mutedForeground }]} numberOfLines={1}>{session.topic}</Text>
        </View>
      </View>
      <View style={styles.taskRight}>
        <Text style={[styles.taskTime, { color: colors.primary }]}>{session.time}</Text>
        <Text style={[styles.taskQuestions, { color: colors.mutedForeground }]}>{session.targetQuestions} soru</Text>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, sessions, completeSession, tytProgress, aytProgress, totalTopicsCompleted, studyStreak } = useApp();
  const [quote] = useState<Quote>(getRandomQuote);

  const today = new Date().toISOString().split("T")[0];
  const todaySessions = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const pendingSessions = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    return sessions.filter((s) => s.date < now && !s.completed);
  }, [sessions]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(500)}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Merhaba,</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>{profile?.name ?? "Öğrenci"}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/achievements")} style={[styles.streakBadge, { backgroundColor: colors.warning + "20" }]}>
            <Ionicons name="flame" size={16} color={colors.warning} />
            <Text style={[styles.streakText, { color: colors.warning }]}>{studyStreak}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <View style={[styles.quoteCard, { backgroundColor: colors.card }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.quoteText, { color: colors.foreground }]}>"{quote.text}"</Text>
          <Text style={[styles.quoteAuthor, { color: colors.mutedForeground }]}>— {quote.author}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Geri Sayım</Text>
        <View style={styles.countdownsRow}>
          <CountdownCard title="TYT 2027" date={TYT_EXAM_DATE} gradient1="#2563EB" gradient2="#1D4ED8" colors={colors} />
          <View style={{ width: 12 }} />
          <CountdownCard title="AYT 2027" date={AYT_EXAM_DATE} gradient1="#7C3AED" gradient2="#6D28D9" colors={colors} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>İlerleme</Text>
        <View style={styles.progressRow}>
          <ProgressCard title="TYT" pct={tytProgress} color={colors.primary} colors={colors} />
          <View style={{ width: 12 }} />
          <ProgressCard title="AYT" pct={aytProgress} color="#7C3AED" colors={colors} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(500)}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkbox-outline" size={22} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalTopicsCompleted}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Konu</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="flame" size={22} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{studyStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Gün Serisi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{sessions.filter((s) => s.completed).length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Oturum</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Bugünün Planı</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/plan")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Tümü</Text>
          </TouchableOpacity>
        </View>

        {pendingSessions.length > 0 && (
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "40" }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>{pendingSessions.length} gecikmiş görev var</Text>
          </View>
        )}

        {todaySessions.length === 0 ? (
          <View style={[styles.emptyTask, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Bugün için plan yok</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/plan")} style={[styles.addPlanBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Plan Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.taskList}>
            {todaySessions.map((s) => (
              <TaskItem key={s.id} session={s} onComplete={() => completeSession(s.id)} colors={colors} />
            ))}
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(360).duration(500)}>
        <View style={styles.quickActions}>
          <TouchableOpacity onPress={() => router.push("/statistics")} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>İstatistikler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/achievements")} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <Ionicons name="trophy-outline" size={22} color={colors.warning} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Başarılar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/ai-coach")} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <Ionicons name="sparkles-outline" size={22} color="#7C3AED" />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>AI Koç</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  quoteCard: {
    borderRadius: 20, padding: 20, marginBottom: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  quoteText: { fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  countdownsRow: { flexDirection: "row", marginBottom: 28 },
  countdownCard: {
    flex: 1, borderRadius: 20, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  countdownTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 12, opacity: 0.9 },
  countdownRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  countUnit: { alignItems: "center" },
  countValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  countLabel: { fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 2 },
  countSep: { fontSize: 18, fontFamily: "Inter_700Bold", paddingBottom: 10 },
  progressRow: { flexDirection: "row", marginBottom: 16 },
  progressCard: {
    borderRadius: 20, padding: 20, alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  progressTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 12,
    borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyTask: {
    borderRadius: 20, padding: 32, alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  addPlanBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  taskList: { gap: 10, marginBottom: 28 },
  taskItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  taskCheck: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  taskInfo: { flex: 1 },
  taskSubject: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  taskTopic: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  taskRight: { alignItems: "flex-end", gap: 2 },
  taskTime: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  taskQuestions: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quickActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  quickAction: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  quickActionText: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
});
