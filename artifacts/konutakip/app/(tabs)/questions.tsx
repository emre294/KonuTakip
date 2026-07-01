import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
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
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, Question } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_SUBJECTS, Subject } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

function QuestionCard({ question, onUnderstood, colors }: {
  question: Question; onUnderstood: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const needsReview = !question.understood && question.nextReviewDate <= today;

  return (
    <View style={[styles.qCard, { backgroundColor: colors.card, borderLeftColor: question.understood ? colors.success : needsReview ? colors.warning : colors.border, borderLeftWidth: 3 }]}>
      <View style={styles.qTop}>
        <View style={styles.qMeta}>
          <Text style={[styles.qDate, { color: colors.mutedForeground }]}>{question.addedDate}</Text>
          {needsReview && !question.understood && (
            <View style={[styles.reviewBadge, { backgroundColor: colors.warning + "20" }]}>
              <Ionicons name="refresh-outline" size={12} color={colors.warning} />
              <Text style={[styles.reviewText, { color: colors.warning }]}>Tekrar Zamanı</Text>
            </View>
          )}
          {question.understood && (
            <View style={[styles.reviewBadge, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={12} color={colors.success} />
              <Text style={[styles.reviewText, { color: colors.success }]}>Anladım</Text>
            </View>
          )}
        </View>
      </View>
      {question.notes ? (
        <Text style={[styles.qNotes, { color: colors.foreground }]}>{question.notes}</Text>
      ) : null}
      <Text style={[styles.qReview, { color: colors.mutedForeground }]}>
        Sonraki tekrar: {question.nextReviewDate}
      </Text>
      {!question.understood && (
        <TouchableOpacity
          onPress={() => { onUnderstood(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          style={[styles.understoodBtn, { backgroundColor: colors.success + "20" }]}
        >
          <Feather name="check" size={14} color={colors.success} />
          <Text style={[styles.understoodText, { color: colors.success }]}>Bu Soruyu Anladım</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SubjectSection({ subject, questions, onUnderstood, colors }: {
  subject: Subject; questions: Question[];
  onUnderstood: (id: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (questions.length === 0) return null;
  const pending = questions.filter((q) => !q.understood).length;

  return (
    <View style={[styles.subjectSection, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        onPress={() => { setExpanded((e) => !e); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.subjectHeader}
        activeOpacity={0.8}
      >
        <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
        <Text style={[styles.subjectName, { color: colors.foreground }]}>{subject.name}</Text>
        <View style={styles.subjectRight}>
          {pending > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.warning }]}>
              <Text style={styles.badgeText}>{pending}</Text>
            </View>
          )}
          <Text style={[styles.subjectCount, { color: colors.mutedForeground }]}>{questions.length} soru</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.qList, { borderTopColor: colors.border }]}>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} onUnderstood={() => onUnderstood(q.id)} colors={colors} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function QuestionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, questions, addQuestion, markQuestionUnderstood } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [notes, setNotes] = useState("");

  const allSubjects: Subject[] = [
    ...TYT_SUBJECTS,
    ...(profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : []),
  ];

  function handleSave() {
    if (!selectedSubjectId) {
      Alert.alert("Hata", "Lütfen bir ders seçin.");
      return;
    }
    addQuestion({ subjectId: selectedSubjectId, subjectName: selectedSubjectName, notes });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setNotes("");
    setSelectedSubjectId("");
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;
  const totalPending = questions.filter((q) => !q.understood).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.pageHeader}>
            <View>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Soru Bankam</Text>
              <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
                {totalPending > 0 ? `${totalPending} tekrar edilecek soru` : "Tüm sorular tamamlandı"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {questions.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="help-circle-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Soru bankası boş</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Yanlış yaptığın soruları ekle, spaced-repetition sistemi hatırlatır</Text>
          </Animated.View>
        ) : (
          <View style={styles.sections}>
            {allSubjects.map((s) => (
              <SubjectSection
                key={s.id}
                subject={s}
                questions={questions.filter((q) => q.subjectId === s.id)}
                onUnderstood={markQuestionUnderstood}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Soru Ekle</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Ders Seç</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {allSubjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => { setSelectedSubjectId(s.id); setSelectedSubjectName(s.name); }}
                  style={[styles.subjectChip, { backgroundColor: selectedSubjectId === s.id ? s.color : colors.card, borderColor: s.color }]}
                >
                  <Text style={[styles.chipText, { color: selectedSubjectId === s.id ? "#fff" : colors.foreground }]} numberOfLines={1}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notlar / Neden yanlış yaptın?</Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Soruyu neden yanlış yaptığını not al..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
            />

            <View style={[styles.infoBox, { backgroundColor: colors.accent }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Soru eklendikten 7 gün sonra otomatik tekrar bildirimleri başlar.
              </Text>
            </View>

            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  empty: { borderRadius: 20, padding: 40, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sections: { gap: 12 },
  subjectSection: { borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  subjectHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  subjectRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  subjectCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qList: { borderTopWidth: 1, padding: 12, gap: 10 },
  qCard: { borderRadius: 12, padding: 14, gap: 6 },
  qTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  qMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  qDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reviewBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reviewText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  qNotes: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  qReview: { fontSize: 12, fontFamily: "Inter_400Regular" },
  understoodBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: "flex-start", marginTop: 4 },
  understoodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  subjectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8, maxWidth: 140 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  infoBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, alignItems: "flex-start", marginTop: 12 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
