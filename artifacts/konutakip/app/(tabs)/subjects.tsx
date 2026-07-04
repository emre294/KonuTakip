import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, FIELD_LABELS, Subject, TYT_SUBJECTS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

// ─── Reminder modal ────────────────────────────────────────────────────────────

interface ReminderModalProps {
  visible: boolean;
  topicName: string;
  subjectName: string;
  currentInterval: 3 | 5 | 7 | null;
  onSelect: (interval: 3 | 5 | 7) => void;
  onRemove: () => void;
  onClose: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function ReminderModal({
  visible, topicName, subjectName, currentInterval,
  onSelect, onRemove, onClose, colors,
}: ReminderModalProps) {
  const intervals: (3 | 5 | 7)[] = [3, 5, 7];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={rStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[rStyles.sheet, { backgroundColor: colors.card }]}>
        <View style={[rStyles.header, { borderBottomColor: colors.border }]}>
          <View style={[rStyles.bellCircle, { backgroundColor: colors.warning + "20" }]}>
            <Feather name="bell" size={20} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[rStyles.title, { color: colors.foreground }]}>Konu Hatırlatması</Text>
            <Text style={[rStyles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {subjectName} › {topicName}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[rStyles.prompt, { color: colors.mutedForeground }]}>
          Kaç günde bir hatırlatılsın?
        </Text>

        {intervals.map((interval) => {
          const active = currentInterval === interval;
          return (
            <TouchableOpacity
              key={interval}
              onPress={() => { onSelect(interval); onClose(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={[
                rStyles.option,
                { backgroundColor: active ? colors.warning + "15" : colors.secondary, borderColor: active ? colors.warning : "transparent" },
              ]}
            >
              <Feather name="clock" size={16} color={active ? colors.warning : colors.mutedForeground} />
              <Text style={[rStyles.optionText, { color: active ? colors.warning : colors.foreground }]}>
                Her {interval} günde bir hatırlat
              </Text>
              {active && <Feather name="check" size={16} color={colors.warning} />}
            </TouchableOpacity>
          );
        })}

        {currentInterval && (
          <TouchableOpacity
            onPress={() => { onRemove(); onClose(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[rStyles.removeBtn, { borderColor: colors.destructive + "60" }]}
          >
            <Feather name="bell-off" size={15} color={colors.destructive} />
            <Text style={[rStyles.removeBtnText, { color: colors.destructive }]}>Hatırlatmayı kaldır</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

// ─── Topic row ─────────────────────────────────────────────────────────────────

interface TopicRowProps {
  topicId: string;
  topicName: string;
  completed: boolean;
  solvedCount: number;
  hasReminder: boolean;
  onToggle: () => void;
  onSetSolved: (count: number) => void;
  onBellPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function TopicRow({
  topicId, topicName, completed, solvedCount, hasReminder,
  onToggle, onSetSolved, onBellPress, colors,
}: TopicRowProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withTiming(0.96, { duration: 70 }, () => {
      scale.value = withTiming(1, { duration: 120 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  return (
    <Animated.View style={animStyle}>
      <View style={[styles.topicRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={styles.topicCheckBtn}>
          <View style={[
            styles.topicCheck,
            { borderColor: completed ? colors.success : colors.border, backgroundColor: completed ? colors.success : "transparent" },
          ]}>
            {completed && <Feather name="check" size={11} color="#fff" />}
          </View>
        </TouchableOpacity>

        <Text
          style={[styles.topicName, { color: completed ? colors.mutedForeground : colors.foreground, textDecorationLine: completed ? "line-through" : "none" }]}
          numberOfLines={2}
        >
          {topicName}
        </Text>

        <View style={styles.topicRight}>
          <TextInput
            style={[
              styles.solvedInput,
              { backgroundColor: colors.secondary, color: colors.foreground, borderColor: colors.border },
              // Shrink font slightly so 5-digit numbers fit without reflowing the row
              solvedCount >= 10000 ? { fontSize: 10 } : solvedCount >= 1000 ? { fontSize: 11 } : null,
              // Android: strip implicit font padding so the input sits on the
              // same optical baseline as the "soru" label and bell icon.
              Platform.OS === "android" && { textAlignVertical: "center", includeFontPadding: false, paddingVertical: 0 },
            ]}
            value={solvedCount > 0 ? String(solvedCount) : ""}
            onChangeText={(v) => {
              const n = parseInt(v.replace(/[^0-9]/g, "")) || 0;
              onSetSolved(n);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            maxLength={5}
            selectTextOnFocus
          />
          <Text style={[styles.soruLabel, { color: colors.mutedForeground }]}>soru</Text>
          <TouchableOpacity onPress={onBellPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather
              name={hasReminder ? "bell" : "bell-off"}
              size={14}
              color={hasReminder ? colors.warning : colors.border}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Subject card ──────────────────────────────────────────────────────────────

interface SubjectCardProps {
  subject: Subject;
  topicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;
  topicReminders: Record<string, { interval: 3 | 5 | 7; nextDate: string }>;
  onToggle: (id: string) => void;
  onSetSolved: (topicId: string, count: number) => void;
  onBellPress: (topicId: string, topicName: string, subjectName: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function SubjectCard({
  subject, topicCompletion, topicSolvedQuestions, topicReminders,
  onToggle, onSetSolved, onBellPress, colors,
}: SubjectCardProps) {
  const { hasCompletedSessionTodayForSubject } = useApp();
  const [expanded, setExpanded] = useState(false);

  // Informational, non-blocking warning: if a Daily Study Plan session for this
  // subject was already completed (and counted) today, manually logging solved
  // questions here too may double-count the same questions across the two
  // independent counters (topicSolvedQuestions vs dailySolvedQuestions).
  function handleSetSolved(topicId: string, count: number) {
    if (count > 0 && hasCompletedSessionTodayForSubject(subject.id)) {
      Alert.alert(
        "Bilgi",
        `${subject.name} için bugün Günlük Plan'dan tamamlanmış bir oturum zaten var. Bu soruları da manuel girersen aynı sorular iki istatistikte sayılabilir.`
      );
    }
    onSetSolved(topicId, count);
  }

  const completed = subject.topics.filter((t) => topicCompletion[t.id]).length;
  const remaining = subject.topics.length - completed;
  const pct = subject.topics.length > 0 ? Math.round((completed / subject.topics.length) * 100) : 0;
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  // Measured from the real rendered content — the topics list is always mounted
  // (just clipped via animated height), so onLayout gives us its true height.
  const contentHeight = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  // Easing curves: expand uses standard decelerate, collapse uses accelerate
  const EXPAND_EASING = Easing.bezier(0.0, 0.0, 0.2, 1);
  const COLLAPSE_EASING = Easing.bezier(0.4, 0.0, 1.0, 1);

  function handleContentLayout(measuredHeight: number) {
    contentHeight.value = measuredHeight;
    if (expanded) {
      // Keep an already-expanded card in sync if content height changes
      // (e.g. topics added/removed) without re-triggering the animation.
      height.value = measuredHeight;
    }
  }

  function toggle() {
    if (expanded) {
      height.value = withTiming(0, { duration: 220, easing: COLLAPSE_EASING });
      opacity.value = withTiming(0, { duration: 160, easing: COLLAPSE_EASING });
    } else {
      height.value = withTiming(contentHeight.value, { duration: 280, easing: EXPAND_EASING });
      opacity.value = withTiming(1, { duration: 220, easing: EXPAND_EASING });
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
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Animated.View style={contentStyle}>
        <View
          style={[styles.topicsContainer, { borderTopColor: colors.border }]}
          onLayout={(e) => handleContentLayout(e.nativeEvent.layout.height)}
        >
          {subject.topics.map((t) => (
            <TopicRow
              key={t.id}
              topicId={t.id}
              topicName={t.name}
              completed={!!topicCompletion[t.id]}
              solvedCount={topicSolvedQuestions[t.id] ?? 0}
              hasReminder={!!topicReminders[t.id]}
              onToggle={() => onToggle(t.id)}
              onSetSolved={(count) => handleSetSolved(t.id, count)}
              onBellPress={() => onBellPress(t.id, t.name, subject.name)}
              colors={colors}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Exam section ──────────────────────────────────────────────────────────────

interface ExamSectionProps {
  title: string;
  subjects: Subject[];
  topicCompletion: Record<string, boolean>;
  topicSolvedQuestions: Record<string, number>;
  topicReminders: Record<string, { interval: 3 | 5 | 7; nextDate: string }>;
  onToggle: (id: string) => void;
  onSetSolved: (topicId: string, count: number) => void;
  onBellPress: (topicId: string, topicName: string, subjectName: string) => void;
  accentColor: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function ExamSection({
  title, subjects, topicCompletion, topicSolvedQuestions, topicReminders,
  onToggle, onSetSolved, onBellPress, accentColor, colors,
}: ExamSectionProps) {
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
            <SubjectCard
              key={s.id}
              subject={s}
              topicCompletion={topicCompletion}
              topicSolvedQuestions={topicSolvedQuestions}
              topicReminders={topicReminders}
              onToggle={onToggle}
              onSetSolved={onSetSolved}
              onBellPress={onBellPress}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function SubjectsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    profile, topicCompletion, toggleTopic,
    topicSolvedQuestions, setTopicSolvedQuestion,
    topicReminders, setTopicReminder, removeTopicReminder,
  } = useApp();

  const aytSubjects = profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : [];
  const fieldLabel = profile ? FIELD_LABELS[profile.studyField] : "AYT";

  const [reminderModal, setReminderModal] = useState<{
    topicId: string; topicName: string; subjectName: string;
  } | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  const handleBellPress = useCallback((topicId: string, topicName: string, subjectName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReminderModal({ topicId, topicName, subjectName });
  }, []);

  const handleReminderSelect = useCallback(async (interval: 3 | 5 | 7) => {
    if (!reminderModal) return;
    try {
      await setTopicReminder(reminderModal.topicId, reminderModal.topicName, reminderModal.subjectName, interval);
    } catch (err) {
      Alert.alert("Hata", "Hatırlatma ayarlanamadı. Bildirim izinlerini kontrol edin.");
    }
  }, [reminderModal, setTopicReminder]);

  const handleReminderRemove = useCallback(async () => {
    if (!reminderModal) return;
    await removeTopicReminder(reminderModal.topicId);
  }, [reminderModal, removeTopicReminder]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Konular</Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Tamamladığın konuları işaretle ve çözdüğün soru sayısını gir</Text>
        </Animated.View>

        <ExamSection
          title="TYT — Temel Yeterlilik"
          subjects={TYT_SUBJECTS}
          topicCompletion={topicCompletion}
          topicSolvedQuestions={topicSolvedQuestions}
          topicReminders={topicReminders}
          onToggle={toggleTopic}
          onSetSolved={setTopicSolvedQuestion}
          onBellPress={handleBellPress}
          accentColor="#2563EB"
          colors={colors}
        />

        <ExamSection
          title={`AYT — ${fieldLabel}`}
          subjects={aytSubjects}
          topicCompletion={topicCompletion}
          topicSolvedQuestions={topicSolvedQuestions}
          topicReminders={topicReminders}
          onToggle={toggleTopic}
          onSetSolved={setTopicSolvedQuestion}
          onBellPress={handleBellPress}
          accentColor="#7C3AED"
          colors={colors}
        />
      </ScrollView>

      {reminderModal && (
        <ReminderModal
          visible={!!reminderModal}
          topicName={reminderModal.topicName}
          subjectName={reminderModal.subjectName}
          currentInterval={topicReminders[reminderModal.topicId]?.interval ?? null}
          onSelect={handleReminderSelect}
          onRemove={handleReminderRemove}
          onClose={() => setReminderModal(null)}
          colors={colors}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24 },
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
  topicRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 10, borderBottomWidth: 1, minHeight: 52,
  },
  topicCheckBtn: { padding: 2 },
  topicCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  topicName: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  // flexGrow: 0 ensures the right cluster never expands and displaces topicName
  topicRight: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0, flexGrow: 0 },
  solvedInput: {
    // Fixed dimensions — wide enough for 5 digits at the smallest font, never grows
    width: 54, height: 30, borderRadius: 8, borderWidth: 1,
    fontSize: 12, fontFamily: "Inter_500Medium",
    textAlign: "center", paddingHorizontal: 2,
  },
  soruLabel: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
});

const rStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1 },
  bellCircle: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  prompt: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 10 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5,
  },
  optionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  removeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, padding: 12, marginTop: 4, borderWidth: 1,
  },
  removeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
