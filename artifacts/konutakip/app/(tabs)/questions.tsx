import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
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

import { useApp, Question, QuestionAttachment } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_SUBJECTS, Subject } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

function AttachmentThumb({ att, onRemove, colors }: {
  att: QuestionAttachment; onRemove?: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (att.type === "image") {
    return (
      <View style={styles.thumbWrap}>
        <Image source={{ uri: att.uri }} style={styles.thumb} contentFit="cover" />
        {onRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.thumbRemove}>
            <Feather name="x" size={12} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return (
    <View style={[styles.pdfThumb, { backgroundColor: colors.destructive + "15" }]}>
      <Ionicons name="document-text-outline" size={20} color={colors.destructive} />
      <Text style={[styles.pdfName, { color: colors.foreground }]} numberOfLines={1}>{att.name}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.thumbRemove}>
          <Feather name="x" size={12} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function QuestionCard({ question, onUnderstood, onEdit, onDelete, colors }: {
  question: Question;
  onUnderstood: () => void;
  onEdit: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const needsReview = !question.understood && question.nextReviewDate <= today;

  return (
    <View style={[styles.qCard, { backgroundColor: colors.card, borderLeftColor: question.understood ? colors.success : needsReview ? colors.warning : colors.border, borderLeftWidth: 3 }]}>
      <View style={styles.qHeader}>
        <View style={styles.qBadges}>
          <Text style={[styles.qDate, { color: colors.mutedForeground }]}>{question.addedDate}</Text>
          {needsReview && !question.understood && (
            <View style={[styles.badge, { backgroundColor: colors.warning + "20" }]}>
              <Ionicons name="refresh-outline" size={11} color={colors.warning} />
              <Text style={[styles.badgeText, { color: colors.warning }]}>Tekrar Zamanı</Text>
            </View>
          )}
          {question.understood && (
            <View style={[styles.badge, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={11} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Anladım</Text>
            </View>
          )}
        </View>
        <View style={styles.qActions}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="edit-2" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={15} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {question.notes ? (
        <Text style={[styles.qNotes, { color: colors.foreground }]}>{question.notes}</Text>
      ) : null}

      {question.attachments.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentRow}>
          {question.attachments.map((att, i) => (
            <AttachmentThumb key={i} att={att} colors={colors} />
          ))}
        </ScrollView>
      )}

      <Text style={[styles.qReview, { color: colors.mutedForeground }]}>Tekrar: {question.nextReviewDate}</Text>

      {!question.understood && (
        <TouchableOpacity
          onPress={() => { onUnderstood(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          style={[styles.understoodBtn, { backgroundColor: colors.success + "20" }]}
        >
          <Feather name="check" size={13} color={colors.success} />
          <Text style={[styles.understoodText, { color: colors.success }]}>Bu Soruyu Anladım</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SubjectSection({ subject, questions, onUnderstood, onEdit, onDelete, colors }: {
  subject: Subject; questions: Question[];
  onUnderstood: (id: string) => void;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
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
            <View style={[styles.pendingBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.pendingBadgeText}>{pending}</Text>
            </View>
          )}
          <Text style={[styles.subjectCount, { color: colors.mutedForeground }]}>{questions.length}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.qList, { borderTopColor: colors.border }]}>
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onUnderstood={() => onUnderstood(q.id)}
              onEdit={() => onEdit(q)}
              onDelete={() => onDelete(q.id)}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function QuestionFormModal({ visible, onClose, editingQuestion, onSave, allSubjects, colors }: {
  visible: boolean;
  onClose: () => void;
  editingQuestion: Question | null;
  onSave: (subjectId: string, subjectName: string, notes: string, attachments: QuestionAttachment[]) => void;
  allSubjects: Subject[];
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [selectedId, setSelectedId] = useState(editingQuestion?.subjectId ?? "");
  const [selectedName, setSelectedName] = useState(editingQuestion?.subjectName ?? "");
  const [notes, setNotes] = useState(editingQuestion?.notes ?? "");
  const [attachments, setAttachments] = useState<QuestionAttachment[]>(editingQuestion?.attachments ?? []);

  React.useEffect(() => {
    if (visible) {
      setSelectedId(editingQuestion?.subjectId ?? "");
      setSelectedName(editingQuestion?.subjectName ?? "");
      setNotes(editingQuestion?.notes ?? "");
      setAttachments(editingQuestion?.attachments ?? []);
    }
  }, [visible, editingQuestion]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("İzin Gerekli", "Fotoğraf galerisine erişim izni verilmedi."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAttachments((prev) => [...prev, { type: "image", uri: result.assets[0].uri, name: "image" }]);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("İzin Gerekli", "Kamera erişim izni verilmedi."); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setAttachments((prev) => [...prev, { type: "image", uri: result.assets[0].uri, name: "photo" }]);
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
      if (!result.canceled && result.assets[0]) {
        setAttachments((prev) => [...prev, { type: "pdf", uri: result.assets[0].uri, name: result.assets[0].name }]);
      }
    } catch {
      Alert.alert("Hata", "Dosya seçilemedi.");
    }
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    if (!selectedId) { Alert.alert("Hata", "Lütfen bir ders seçin."); return; }
    onSave(selectedId, selectedName, notes, attachments);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {editingQuestion ? "Soruyu Düzenle" : "Soru Ekle"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {!editingQuestion && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Ders Seç</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {allSubjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => { setSelectedId(s.id); setSelectedName(s.name); }}
                    style={[styles.subjectChip, { backgroundColor: selectedId === s.id ? s.color : colors.card, borderColor: s.color }]}
                  >
                    <Text style={[styles.chipText, { color: selectedId === s.id ? "#fff" : colors.foreground }]} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Neden Yanlış Yaptın?</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Hata nedenini yaz..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Fotoğraf / Dosya</Text>
          <View style={styles.uploadButtons}>
            <TouchableOpacity onPress={pickImage} style={[styles.uploadBtn, { backgroundColor: colors.secondary }]}>
              <Ionicons name="image-outline" size={18} color={colors.primary} />
              <Text style={[styles.uploadBtnText, { color: colors.primary }]}>Galeri</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={[styles.uploadBtn, { backgroundColor: colors.secondary }]}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={[styles.uploadBtnText, { color: colors.primary }]}>Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickDocument} style={[styles.uploadBtn, { backgroundColor: colors.muted }]}>
              <Ionicons name="document-outline" size={18} color={colors.destructive} />
              <Text style={[styles.uploadBtnText, { color: colors.destructive }]}>PDF</Text>
            </TouchableOpacity>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachmentsPreview}>
              {attachments.map((att, i) => (
                <AttachmentThumb key={i} att={att} onRemove={() => removeAttachment(i)} colors={colors} />
              ))}
            </View>
          )}

          <View style={[styles.infoBox, { backgroundColor: colors.accent }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              7 gün sonra otomatik tekrar zamanı başlar ve anlayana kadar haftada bir hatırlatır.
            </Text>
          </View>

          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveBtnText, { color: "#fff" }]}>
              {editingQuestion ? "Güncelle" : "Kaydet"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function QuestionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, questions, addQuestion, updateQuestion, deleteQuestion, markQuestionUnderstood } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const allSubjects: Subject[] = [
    ...TYT_SUBJECTS,
    ...(profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : []),
  ];

  function handleSave(subjectId: string, subjectName: string, notes: string, attachments: QuestionAttachment[]) {
    if (editingQuestion) {
      updateQuestion(editingQuestion.id, { notes, attachments });
    } else {
      addQuestion({ subjectId, subjectName, notes, attachments });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setEditingQuestion(null);
  }

  function handleEdit(q: Question) {
    setEditingQuestion(q);
    setShowModal(true);
  }

  function handleDelete(id: string) {
    Alert.alert("Soruyu Sil", "Bu soru kalıcı olarak silinecek. Emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => { deleteQuestion(id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
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
                {totalPending > 0 ? `${totalPending} tekrar edilecek soru` : questions.length > 0 ? "Harika! Tümü tamamlandı" : "Henüz soru eklenmedi"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setEditingQuestion(null); setShowModal(true); }} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {questions.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="help-circle-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Soru bankası boş</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Yanlış yaptığın soruları ekle — fotoğraf, PDF veya not ile kaydet
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.sections}>
            {allSubjects.map((s) => (
              <SubjectSection
                key={s.id}
                subject={s}
                questions={questions.filter((q) => q.subjectId === s.id)}
                onUnderstood={markQuestionUnderstood}
                onEdit={handleEdit}
                onDelete={handleDelete}
                colors={colors}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <QuestionFormModal
        visible={showModal}
        onClose={() => { setShowModal(false); setEditingQuestion(null); }}
        editingQuestion={editingQuestion}
        onSave={handleSave}
        allSubjects={allSubjects}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  empty: { borderRadius: 20, padding: 36, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sections: { gap: 12 },
  subjectSection: { borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  subjectHeader: { flexDirection: "row", alignItems: "center", padding: 15, gap: 10 },
  subjectDot: { width: 9, height: 9, borderRadius: 4.5 },
  subjectName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  subjectRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pendingBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  subjectCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qList: { borderTopWidth: 1, padding: 12, gap: 10 },
  qCard: { borderRadius: 12, padding: 14, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  qBadges: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  qActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  qDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  qNotes: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  attachmentRow: { marginTop: 2 },
  thumbWrap: { position: "relative", marginRight: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbRemove: {
    position: "absolute", top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#DC2626",
    alignItems: "center", justifyContent: "center",
  },
  pdfThumb: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, marginRight: 8, maxWidth: 160, position: "relative",
  },
  pdfName: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  qReview: { fontSize: 11, fontFamily: "Inter_400Regular" },
  understoodBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, alignSelf: "flex-start" },
  understoodText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  subjectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8, maxWidth: 140 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  uploadButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  uploadBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  uploadBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  attachmentsPreview: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  infoBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, alignItems: "flex-start", marginTop: 8 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
