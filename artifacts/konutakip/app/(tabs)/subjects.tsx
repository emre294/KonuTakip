import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
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
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, FIELD_LABELS, Subject, TYT_SUBJECTS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

function TopicRow({ topicId, topicName, completed, onToggle, colors }: {
  topicId: string; topicName: string; completed: boolean;
  onToggle: () => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.topicRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={[
          styles.topicCheck,
          { borderColor: completed ? colors.success : colors.border, backgroundColor: completed ? colors.success : "transparent" }
        ]}>
          {completed && <Feather name="check" size={12} color="#fff" />}
        </View>
        <Text style={[styles.topicName, { color: completed ? colors.mutedForeground : colors.foreground, textDecorationLine: completed ? "line-through" : "none" }]}>
          {topicName}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SubjectCard({ subject, topicCompletion, onToggle, colors }: {
  subject: Subject; topicCompletion: Record<string, boolean>;
  onToggle: (id: string) => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const completed = subject.topics.filter((t) => topicCompletion[t.id]).length;
  const remaining = subject.topics.length - completed;
  const pct = subject.topics.length > 0 ? Math.round((completed / subject.topics.length) * 100) : 0;
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  function toggle() {
    if (expanded) {
      height.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    } else {
      height.value = withSpring(subject.topics.length * 52, { damping: 20 });
      opacity.value = withTiming(1, { duration: 300 });
    }
    setExpanded((e) => !e);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.subjectCard, { backgroundColor: colors.card }]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.subjectHeader}>
        <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
        <View style={styles.subjectInfo}>
          <Text style={[styles.subjectName, { color: colors.foreground }]}>{subject.name}</Text>
          <View style={styles.subjectMeta}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: subject.color }]} />
            </View>
          </View>
          <View style={styles.subjectStats}>
            <View style={styles.subjectStatItem}>
              <Feather name="check-circle" size={11} color={colors.success} />
              <Text style={[styles.subjectStatText, { color: colors.success }]}>{completed}</Text>
            </View>
            <Text style={[styles.subjectStatSep, { color: colors.border }]}>•</Text>
            <View style={styles.subjectStatItem}>
              <Feather name="circle" size={11} color={colors.mutedForeground} />
              <Text style={[styles.subjectStatText, { color: colors.mutedForeground }]}>{remaining} kalan</Text>
            </View>
            {pct > 0 && (
              <>
                <Text style={[styles.subjectStatSep, { color: colors.border }]}>•</Text>
                <Text style={[styles.pctText, { color: subject.color }]}>{pct}%</Text>
              </>
            )}
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      <Animated.View style={contentStyle}>
        <View style={[styles.topicsContainer, { borderTopColor: colors.border }]}>
          {subject.topics.map((t) => (
            <TopicRow
              key={t.id}
              topicId={t.id}
              topicName={t.name}
              completed={!!topicCompletion[t.id]}
              onToggle={() => onToggle(t.id)}
              colors={colors}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function ExamSection({ title, subjects, topicCompletion, onToggle, accentColor, colors }: {
  title: string; subjects: Subject[]; topicCompletion: Record<string, boolean>;
  onToggle: (id: string) => void; accentColor: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [open, setOpen] = useState(true);
  const allTopics = subjects.flatMap((s) => s.topics);
  const done = allTopics.filter((t) => topicCompletion[t.id]).length;
  const remaining = allTopics.length - done;
  const pct = allTopics.length > 0 ? Math.round((done / allTopics.length) * 100) : 0;

  return (
    <View style={styles.examSection}>
      <TouchableOpacity
        onPress={() => { setOpen((o) => !o); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={[styles.examHeader, { backgroundColor: accentColor }]}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.examTitle, { color: "#fff" }]}>{title}</Text>
          <View style={styles.examMetaRow}>
            <Text style={[styles.examPct, { color: "rgba(255,255,255,0.9)" }]}>
              {done}/{allTopics.length} konu{pct > 0 ? ` • %${pct}` : ""}
            </Text>
            {remaining > 0 && (
              <View style={styles.examRemainingBadge}>
                <Text style={styles.examRemainingText}>{remaining} kaldı</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color="#fff" />
      </TouchableOpacity>

      {open && (
        <View style={styles.subjectsContainer}>
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} topicCompletion={topicCompletion} onToggle={onToggle} colors={colors} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function SubjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, topicCompletion, toggleTopic } = useApp();

  const aytSubjects = profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : [];
  const fieldLabel = profile ? FIELD_LABELS[profile.studyField] : "AYT";

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Konular</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Tamamladığın konuları işaretle</Text>
      </Animated.View>

      <ExamSection
        title="TYT — Temel Yeterlilik"
        subjects={TYT_SUBJECTS}
        topicCompletion={topicCompletion}
        onToggle={toggleTopic}
        accentColor="#2563EB"
        colors={colors}
      />

      <ExamSection
        title={`AYT — ${fieldLabel}`}
        subjects={aytSubjects}
        topicCompletion={topicCompletion}
        onToggle={toggleTopic}
        accentColor="#7C3AED"
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 24 },
  examSection: { marginBottom: 24 },
  examHeader: {
    borderRadius: 20, padding: 20, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  examTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  examMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  examPct: { fontSize: 13, fontFamily: "Inter_500Medium" },
  examRemainingBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  examRemainingText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  subjectsContainer: { gap: 10 },
  subjectCard: {
    borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  subjectHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  subjectDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  subjectMeta: { marginBottom: 6 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  subjectStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  subjectStatItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  subjectStatText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subjectStatSep: { fontSize: 10 },
  pctText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  topicsContainer: { borderTopWidth: 1 },
  topicRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  topicCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  topicName: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
});
