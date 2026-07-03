import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { AYT_EXAM_DATE, AYT_SUBJECTS_BY_FIELD, TYT_EXAM_DATE, TYT_SUBJECTS } from "@/data/subjects";
import { getRandomQuote, Quote } from "@/data/quotes";
import { useColors } from "@/hooks/useColors";

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

function pad(n: number) { return String(n).padStart(2, "0"); }

function CountdownCard({ title, date, color, colors }: {
  title: string; date: Date; color: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const cd = useCountdown(date);
  return (
    <View style={[styles.countdownCard, { backgroundColor: color }]}>
      <Text style={styles.countdownTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.countdownDays}>{cd.days}</Text>
      <Text style={styles.countdownDayLabel}>GÜN KALDI</Text>
      <View style={styles.countdownHms}>
        <Text style={styles.countdownHmsText}>{pad(cd.hours)}:{pad(cd.minutes)}:{pad(cd.seconds)}</Text>
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CircleProgress({ pct, color, size }: { pct: number; color: string; size: number }) {
  const safePct = Math.max(0, Math.min(100, pct));
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(safePct, { duration: 900 });
  }, [safePct]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  // Fit "100%" comfortably: 4-char labels get a smaller font size
  const label = safePct > 0 ? `${safePct}%` : "0%";
  const fontSize = label.length >= 4 ? 14 : 17;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color + "22"}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Colored progress arc — dashoffset=circumference at 0% so nothing is visible */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize,
          color: safePct > 0 ? color : color + "50",
          textAlign: "center",
          includeFontPadding: false,
        }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function ProgressCard({ title, pct, color, colors }: { title: string; pct: number; color: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={[styles.progressCard, { backgroundColor: colors.card, flex: 1 }]}>
      <CircleProgress pct={pct} color={color} size={84} />
      <Text style={[styles.progressTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>tamamlandı</Text>
    </View>
  );
}

function getMotivationMessage(overallPct: number): { text: string; emoji: string } {
  if (overallPct === 0)   return { text: "Harika bir başlangıç seni bekliyor!", emoji: "🌟" };
  if (overallPct < 10)    return { text: "Her büyük başarı ilk konuyla başlar. Devam et!", emoji: "🚀" };
  if (overallPct < 25)    return { text: "Güzel bir başlangıç! Her gün biraz daha ilerliyorsun.", emoji: "💪" };
  if (overallPct < 40)    return { text: "Çalışmaların meyve vermeye başlıyor. Harika gidiyorsun!", emoji: "📈" };
  if (overallPct < 55)    return { text: "Yarıya yaklaştın! Her soru seni hedefe yaklaştırıyor.", emoji: "🎯" };
  if (overallPct < 70)    return { text: "Yarıyı geçtin! Çok az kaldı, dur durma!", emoji: "⚡" };
  if (overallPct < 80)    return { text: "Harika ilerliyorsun! Hedef artık çok yakın.", emoji: "🔥" };
  if (overallPct < 90)    return { text: "Neredeyse hazırsın! Son düzlüğe girdin.", emoji: "🏆" };
  if (overallPct < 100)   return { text: "Sadece birkaç konu kaldı. Sen yapabilirsin!", emoji: "✨" };
  return { text: "Tüm konuları tamamladın! Artık tekrar ve denemeler zamanı.", emoji: "🎉" };
}

function MotivationBanner({ tytPct, aytPct, colors }: {
  tytPct: number; aytPct: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const overall = Math.round((tytPct + aytPct) / 2);
  const { text, emoji } = getMotivationMessage(overall);

  return (
    <View style={[styles.motivationBanner, { backgroundColor: colors.accent }]}>
      <Text style={styles.motivationEmoji}>{emoji}</Text>
      <Text style={[styles.motivationText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

function RemainingTopicsCard({ tytPct, aytPct, profile, topicCompletion, totalSolvedQuestions, colors }: {
  tytPct: number; aytPct: number;
  profile: import("@/contexts/AppContext").UserProfile | null;
  topicCompletion: Record<string, boolean>;
  totalSolvedQuestions: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const { tytTotal, tytDone, aytTotal, aytDone } = useMemo(() => {
    const tytTopics = TYT_SUBJECTS.flatMap(s => s.topics);
    const aytTopics = profile ? (AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? []).flatMap(s => s.topics) : [];
    return {
      tytTotal: tytTopics.length,
      tytDone: tytTopics.filter(t => topicCompletion[t.id]).length,
      aytTotal: aytTopics.length,
      aytDone: aytTopics.filter(t => topicCompletion[t.id]).length,
    };
  }, [profile, topicCompletion]);

  const totalDone = tytDone + aytDone;
  const totalAll = tytTotal + aytTotal;
  const totalRemaining = totalAll - totalDone;

  return (
    <View style={[styles.remainingCard, { backgroundColor: colors.card }]}>
      <View style={styles.remainingHeader}>
        <Ionicons name="checkbox-outline" size={18} color={colors.success} />
        <Text style={[styles.remainingTitle, { color: colors.foreground }]}>Konu Durumu</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/subjects")} style={[styles.remainingLink, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.remainingLinkText, { color: colors.primary }]}>Konulara git</Text>
          <Feather name="arrow-right" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.remainingRow}>
        <View style={styles.remainingItem}>
          <Text
            style={[styles.remainingValue, { color: colors.success }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.5}
          >
            {totalDone}
          </Text>
          <Text style={[styles.remainingLabel, { color: colors.mutedForeground }]}>Tamamlanan</Text>
        </View>
        <View style={[styles.remainingDivider, { backgroundColor: colors.border }]} />
        <View style={styles.remainingItem}>
          <Text
            style={[styles.remainingValue, { color: colors.warning }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.5}
          >
            {totalRemaining}
          </Text>
          <Text style={[styles.remainingLabel, { color: colors.mutedForeground }]}>Kalan</Text>
        </View>
        <View style={[styles.remainingDivider, { backgroundColor: colors.border }]} />
        <View style={styles.remainingItem}>
          <Text
            style={[styles.remainingValue, { color: colors.primary }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.4}
          >
            {totalSolvedQuestions.toLocaleString("tr-TR")}
          </Text>
          <Text style={[styles.remainingLabel, { color: colors.mutedForeground }]}>Çözülen Soru</Text>
        </View>
      </View>

      <View style={[styles.totalProgressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.totalProgressFill, {
          width: `${totalAll > 0 ? (totalDone / totalAll) * 100 : 0}%`,
          backgroundColor: colors.success,
        }]} />
      </View>
      <Text style={[styles.totalProgressPct, { color: colors.mutedForeground }]}>
        {totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0}% genel ilerleme
      </Text>
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
    scale.value = withSequence(withSpring(0.94), withSpring(1));
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
          {session.completed && <Feather name="check" size={13} color="#fff" />}
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
  const { profile, sessions, completeSession, tytProgress, aytProgress, totalTopicsCompleted, studyStreak, topicCompletion, totalSolvedQuestions } = useApp();
  const [quote] = useState<Quote>(getRandomQuote);

  const today = new Date().toISOString().split("T")[0];
  const todaySessions = useMemo(() => sessions.filter((s) => s.date === today), [sessions, today]);
  const pendingSessions = useMemo(() => sessions.filter((s) => s.date < today && !s.completed), [sessions, today]);

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
          <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.quoteText, { color: colors.foreground }]}>"{quote.text}"</Text>
          <Text style={[styles.quoteAuthor, { color: colors.mutedForeground }]}>— {quote.author}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <MotivationBanner tytPct={tytProgress} aytPct={aytProgress} colors={colors} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sınava Geri Sayım</Text>
        <View style={styles.countdownRow}>
          <CountdownCard title="TYT 2027" date={TYT_EXAM_DATE} color="#2563EB" colors={colors} />
          <View style={{ width: 12 }} />
          <CountdownCard title="AYT 2027" date={AYT_EXAM_DATE} color="#7C3AED" colors={colors} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Konu İlerlemesi</Text>
        <View style={styles.progressRow}>
          <ProgressCard title="TYT" pct={tytProgress} color={colors.primary} colors={colors} />
          <View style={{ width: 12 }} />
          <ProgressCard title="AYT" pct={aytProgress} color="#7C3AED" colors={colors} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(500)}>
        <RemainingTopicsCard
          tytPct={tytProgress}
          aytPct={aytProgress}
          profile={profile}
          topicCompletion={topicCompletion}
          totalSolvedQuestions={totalSolvedQuestions}
          colors={colors}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(500)}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkbox-outline" size={21} color={colors.success} />
            <Text
              style={[styles.statValue, { color: colors.foreground }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.5}
            >
              {totalTopicsCompleted}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Konu</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="flame" size={21} color={colors.warning} />
            <Text
              style={[styles.statValue, { color: colors.foreground }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.5}
            >
              {studyStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Gün Serisi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={21} color={colors.primary} />
            <Text
              style={[styles.statValue, { color: colors.foreground }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.5}
            >
              {sessions.filter((s) => s.completed).length}
            </Text>
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
          <View style={[styles.warningBanner, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>{pendingSessions.length} gecikmiş görev var</Text>
          </View>
        )}

        {todaySessions.length === 0 ? (
          <View style={[styles.emptyTask, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={30} color={colors.mutedForeground} />
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
            <Ionicons name="bar-chart-outline" size={21} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>İstatistikler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/mock-exams")} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <Ionicons name="clipboard-outline" size={21} color={colors.success} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Deneme</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/achievements")} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <Ionicons name="trophy-outline" size={21} color={colors.warning} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Başarılar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/ai-coach")} style={[styles.quickAction, { backgroundColor: colors.card }]}>
            <Ionicons name="sparkles-outline" size={21} color="#7C3AED" />
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
    borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  quoteText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22, marginBottom: 8 },
  quoteAuthor: { fontSize: 12, fontFamily: "Inter_400Regular" },
  motivationBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, marginBottom: 22,
  },
  motivationEmoji: { fontSize: 22 },
  motivationText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  seeAll: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  countdownRow: { flexDirection: "row", marginBottom: 26 },
  countdownCard: {
    flex: 1, borderRadius: 20, padding: 16, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  countdownTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)", marginBottom: 6 },
  countdownDays: { fontSize: 44, fontFamily: "Inter_700Bold", color: "#fff", lineHeight: 52 },
  countdownDayLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", letterSpacing: 1, marginBottom: 10 },
  countdownHms: { backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  countdownHmsText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: 1 },
  progressRow: { flexDirection: "row", marginBottom: 14 },
  progressCard: {
    borderRadius: 18, padding: 18, alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  progressTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  progressSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  remainingCard: {
    borderRadius: 18, padding: 16, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  remainingHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  remainingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  remainingLink: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  remainingLinkText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  remainingRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  remainingValue: {
    fontSize: 24, fontFamily: "Inter_700Bold",
    alignSelf: "stretch", textAlign: "center",
  },
  remainingLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  remainingItem: { flex: 1, alignItems: "center", gap: 2 },
  remainingDivider: { width: 1, height: 36 },
  totalProgressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  totalProgressFill: { height: "100%", borderRadius: 3 },
  totalProgressPct: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 26 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statValue: {
    fontSize: 20, fontFamily: "Inter_700Bold",
    alignSelf: "stretch", textAlign: "center",
  },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, padding: 11,
    borderRadius: 12, borderWidth: 1, marginBottom: 10,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyTask: {
    borderRadius: 18, padding: 30, alignItems: "center", gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  addPlanBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  taskList: { gap: 10, marginBottom: 26 },
  taskItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderRadius: 14, padding: 13,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  taskLeft: { flexDirection: "row", alignItems: "center", gap: 11, flex: 1 },
  taskCheck: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  taskInfo: { flex: 1 },
  taskSubject: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  taskTopic: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  taskRight: { alignItems: "flex-end", gap: 2 },
  taskTime: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  taskQuestions: { fontSize: 11, fontFamily: "Inter_400Regular" },
  quickActions: { flexDirection: "row", gap: 8, marginTop: 6 },
  quickAction: {
    flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  quickActionText: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
});
