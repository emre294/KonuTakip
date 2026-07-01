import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_SUBJECTS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const CHART_W = width - 80;
const BAR_MAX_H = 100;

function BarChart({ data, colors }: {
  data: { label: string; value: number; color: string }[];
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.barChart}>
      {data.map((d, i) => (
        <View key={i} style={styles.barGroup}>
          <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{d.value}</Text>
          <View style={[styles.barBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.barFill,
                { height: Math.max(4, (d.value / maxVal) * BAR_MAX_H), backgroundColor: d.color },
              ]}
            />
          </View>
          <Text style={[styles.barLabel, { color: colors.mutedForeground }]} numberOfLines={2}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function StatCard({ title, value, sub, icon, color, colors }: {
  title: string; value: string | number; sub?: string; icon: string; color: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as never} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {sub ? <Text style={[styles.statSub, { color: color }]}>{sub}</Text> : null}
    </View>
  );
}

export default function StatisticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, topicCompletion, sessions, questions, studyStreak, studyDays, tytProgress, aytProgress, totalTopicsCompleted } = useApp();

  const completedSessions = sessions.filter((s) => s.completed);

  const subjectTopicCounts = useMemo(() => {
    const allSubjects = [...TYT_SUBJECTS, ...(profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : [])];
    return allSubjects
      .map((s) => ({
        label: s.name.split(" ")[0],
        value: s.topics.filter((t) => topicCompletion[t.id]).length,
        total: s.topics.length,
        color: s.color,
      }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [profile, topicCompletion]);

  const strongestSubject = subjectTopicCounts[0];
  const weakestSubject = [...subjectTopicCounts].sort((a, b) => (a.value / a.total) - (b.value / b.total))[0];

  const last7Days = useMemo(() => {
    const result: { label: string; value: number; color: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("tr-TR", { weekday: "short" });
      const sessionCount = sessions.filter((s) => s.date === dateStr).length;
      result.push({ label: dayName, value: sessionCount, color: colors.primary });
    }
    return result;
  }, [sessions, colors.primary]);

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
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>İstatistikler</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <View style={styles.grid}>
          <StatCard title="Tamamlanan Konu" value={totalTopicsCompleted} icon="checkbox-outline" color={colors.success} colors={colors} />
          <StatCard title="Çalışma Serisi" value={`${studyStreak} gün`} icon="flame-outline" color={colors.warning} colors={colors} />
          <StatCard title="TYT İlerlemesi" value={`${tytProgress}%`} icon="trending-up-outline" color={colors.primary} colors={colors} />
          <StatCard title="AYT İlerlemesi" value={`${aytProgress}%`} icon="trending-up-outline" color="#7C3AED" colors={colors} />
          <StatCard title="Toplam Oturum" value={completedSessions.length} icon="calendar-outline" color={colors.primary} colors={colors} />
          <StatCard title="Soru Bankası" value={questions.length} icon="help-circle-outline" color={colors.warning} colors={colors} />
          <StatCard title="Çalışılan Günler" value={studyDays.length} icon="today-outline" color={colors.success} colors={colors} />
          <StatCard
            title="Anlaşılan Sorular"
            value={questions.filter((q) => q.understood).length}
            icon="checkmark-circle-outline"
            color={colors.success}
            colors={colors}
          />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Haftalık Oturum Aktivitesi</Text>
          <BarChart data={last7Days} colors={colors} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Ders Bazlı Tamamlanan Konu</Text>
          <BarChart
            data={subjectTopicCounts.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
            colors={colors}
          />
        </View>
      </Animated.View>

      {strongestSubject && (
        <Animated.View entering={FadeInDown.delay(240).duration(500)}>
          <View style={styles.insightsRow}>
            <View style={[styles.insightCard, { backgroundColor: colors.success + "15", flex: 1 }]}>
              <Ionicons name="trophy-outline" size={20} color={colors.success} />
              <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>En Güçlü Ders</Text>
              <Text style={[styles.insightValue, { color: colors.foreground }]}>{strongestSubject.label}</Text>
              <Text style={[styles.insightPct, { color: colors.success }]}>{strongestSubject.value}/{strongestSubject.total} konu</Text>
            </View>
            {weakestSubject && weakestSubject.label !== strongestSubject.label && (
              <View style={[styles.insightCard, { backgroundColor: colors.warning + "15", flex: 1 }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
                <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Gelişim Alanı</Text>
                <Text style={[styles.insightValue, { color: colors.foreground }]}>{weakestSubject.label}</Text>
                <Text style={[styles.insightPct, { color: colors.warning }]}>{weakestSubject.value}/{weakestSubject.total} konu</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: {
    width: (width - 52) / 2, borderRadius: 16, padding: 16, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statTitle: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 20 },
  barChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: BAR_MAX_H + 44 },
  barGroup: { alignItems: "center", gap: 4, flex: 1 },
  barValue: { fontSize: 10, fontFamily: "Inter_500Medium" },
  barBg: { width: "60%", height: BAR_MAX_H, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  insightsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  insightCard: { borderRadius: 16, padding: 16, gap: 6 },
  insightLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  insightValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  insightPct: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
