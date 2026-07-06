import { Feather, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useApp, Question, QuestionAttachment } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_SUBJECTS, Subject } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

const SCREEN = Dimensions.get("window");

// ─── Zoomable image (pinch + double-tap) ─────────────────────────────────────

function ZoomableImage({ uri, onScaleChange }: {
  uri: string;
  onScaleChange?: (isZoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  function notifyScale(s: number) {
    onScaleChange?.(s > 1.05);
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      if (scale.value < 1.15) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        runOnJS(notifyScale)(1);
      } else {
        savedScale.value = scale.value;
        runOnJS(notifyScale)(scale.value);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        runOnJS(notifyScale)(1);
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
        runOnJS(notifyScale)(2.5);
      }
    });

  const composed = Gesture.Simultaneous(pinch, doubleTap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.viewerPage, animStyle]}>
        <Image
          source={{ uri }}
          style={styles.viewerImage}
          contentFit="contain"
          transition={180}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Full-screen image viewer ────────────────────────────────────────────────

function ImageViewerModal({ visible, images, initialIndex, onClose }: {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 220 });
    if (visible) {
      setFlatListScrollEnabled(true);
    }
  }, [visible]);

  React.useEffect(() => {
    if (visible && listRef.current && images.length > 1) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  function handleScaleChange(isZoomed: boolean) {
    setFlatListScrollEnabled(!isZoomed);
  }

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderImage = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <ZoomableImage uri={item} onScaleChange={handleScaleChange} />
    ),
    []
  );

  const topInset = insets.top + (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.viewerBackdrop, backdropStyle]}>

        {/* Header: counter + zoom hint + close */}
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.viewerHeader, { paddingTop: topInset + 12 }]}
        >
          <View style={styles.viewerCounter}>
            <Text style={styles.viewerCounterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
          <View style={styles.viewerHint}>
            <Feather name="zoom-in" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.viewerHintText}>Yakınlaştırmak için sıkıştır</Text>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
            style={styles.viewerClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Image pager */}
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderImage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEnabled={flatListScrollEnabled}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN.width,
            offset: SCREEN.width * index,
            index,
          })}
          initialScrollIndex={initialIndex}
        />

        {/* Dot indicators */}
        {images.length > 1 && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.viewerDots, { paddingBottom: insets.bottom + 24 }]}
          >
            {images.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.viewerDot,
                  { backgroundColor: i === currentIndex ? "#fff" : "rgba(255,255,255,0.35)" },
                  i === currentIndex && styles.viewerDotActive,
                ]}
              />
            ))}
          </Animated.View>
        )}

        {/* Double-tap hint pill */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={[styles.doubleTapHint, { bottom: insets.bottom + (images.length > 1 ? 64 : 32) }]}
        >
          <Text style={styles.doubleTapHintText}>2× dokunarak yakınlaştır</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Attachment thumbnail ─────────────────────────────────────────────────────

function AttachmentThumb({ att, onRemove, onOpenViewer, colors }: {
  att: QuestionAttachment;
  onRemove?: () => void;
  onOpenViewer?: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (att.type === "image") {
    return (
      <View style={styles.thumbWrap}>
        <TouchableOpacity onPress={onOpenViewer} activeOpacity={0.85} disabled={!onOpenViewer}>
          <Image source={{ uri: att.uri }} style={styles.thumb} contentFit="cover" />
          {onOpenViewer && (
            <View style={styles.thumbZoomHint}>
              <Feather name="maximize-2" size={10} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
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

// ─── Question card ────────────────────────────────────────────────────────────

const QuestionCard = React.memo(function QuestionCard({ question, onUnderstood, onEdit, onDelete, onOpenImage, colors }: {
  question: Question;
  onUnderstood: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenImage: (images: string[], startIndex: number) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const needsReview = !question.understood && question.nextReviewDate <= today;
  const imageAttachments = question.attachments.filter((a) => a.type === "image");

  return (
    <View style={[styles.qCard, {
      backgroundColor: colors.card,
      borderLeftColor: question.understood ? colors.success : needsReview ? colors.warning : colors.border,
      borderLeftWidth: 3,
    }]}>
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
          {!question.understood && (
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="timer-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{question.reminderInterval ?? 7}g</Text>
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
          {question.attachments.map((att, i) => {
            const imageIndex = att.type === "image"
              ? imageAttachments.findIndex((img) => img.uri === att.uri)
              : -1;
            return (
              <AttachmentThumb
                key={i}
                att={att}
                colors={colors}
                onOpenViewer={att.type === "image"
                  ? () => onOpenImage(imageAttachments.map((a) => a.uri), imageIndex)
                  : undefined
                }
              />
            );
          })}
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
});

// ─── Subject section ──────────────────────────────────────────────────────────

function SubjectSection({ subject, questions, onUnderstood, onEdit, onDelete, onOpenImage, colors }: {
  subject: Subject; questions: Question[];
  onUnderstood: (id: string) => void;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  onOpenImage: (images: string[], startIndex: number) => void;
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
              onOpenImage={onOpenImage}
              colors={colors}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Add / edit question modal ────────────────────────────────────────────────

const REMINDER_OPTIONS: { value: 3 | 5 | 7; label: string; desc: string }[] = [
  { value: 3, label: "3 Gün", desc: "Zor" },
  { value: 5, label: "5 Gün", desc: "Orta" },
  { value: 7, label: "7 Gün", desc: "Kolay" },
];

function QuestionFormModal({ visible, onClose, editingQuestion, onSave, allSubjects, colors }: {
  visible: boolean;
  onClose: () => void;
  editingQuestion: Question | null;
  onSave: (subjectId: string, subjectName: string, notes: string, attachments: QuestionAttachment[], reminderInterval: 3 | 5 | 7) => void;
  allSubjects: Subject[];
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [selectedId, setSelectedId] = useState(editingQuestion?.subjectId ?? "");
  const [selectedName, setSelectedName] = useState(editingQuestion?.subjectName ?? "");
  const [notes, setNotes] = useState(editingQuestion?.notes ?? "");
  const [attachments, setAttachments] = useState<QuestionAttachment[]>(editingQuestion?.attachments ?? []);
  const [reminderInterval, setReminderInterval] = useState<3 | 5 | 7>(editingQuestion?.reminderInterval ?? 7);

  React.useEffect(() => {
    if (visible) {
      setSelectedId(editingQuestion?.subjectId ?? "");
      setSelectedName(editingQuestion?.subjectName ?? "");
      setNotes(editingQuestion?.notes ?? "");
      setAttachments(editingQuestion?.attachments ?? []);
      setReminderInterval(editingQuestion?.reminderInterval ?? 7);
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
    onSave(selectedId, selectedName, notes, attachments, reminderInterval);
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

        <KeyboardAwareScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
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

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tekrar Aralığı</Text>
          <View style={styles.intervalRow}>
            {REMINDER_OPTIONS.map((opt) => {
              const active = reminderInterval === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setReminderInterval(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.intervalBtn, {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.intervalBtnLabel, { color: active ? "#fff" : colors.foreground }]}>{opt.label}</Text>
                  <Text style={[styles.intervalBtnDesc, { color: active ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
              {`${reminderInterval} gün sonra tekrar hatırlatması alacaksın.`}
            </Text>
          </View>

          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveBtnText, { color: "#fff" }]}>
              {editingQuestion ? "Güncelle" : "Kaydet"}
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function QuestionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, questions, addQuestion, updateQuestion, updateQuestionReminder, deleteQuestion, markQuestionUnderstood } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  // Stable derived values — recomputed only when profile or questions change.
  const allSubjects = useMemo<Subject[]>(() => [
    ...TYT_SUBJECTS,
    ...(profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : []),
  ], [profile]);

  // Pre-group questions by subjectId so each SubjectSection doesn't re-filter
  // the full questions array on every render of QuestionsScreen.
  const questionsBySubject = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const q of questions) {
      const bucket = map.get(q.subjectId);
      if (bucket) bucket.push(q);
      else map.set(q.subjectId, [q]);
    }
    return map;
  }, [questions]);

  function handleOpenImage(images: string[], startIndex: number) {
    setViewerImages(images);
    setViewerStartIndex(startIndex);
    setViewerVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSave(
    subjectId: string,
    subjectName: string,
    notes: string,
    attachments: QuestionAttachment[],
    reminderInterval: 3 | 5 | 7
  ) {
    if (editingQuestion) {
      updateQuestion(editingQuestion.id, { notes, attachments });
      if (reminderInterval !== editingQuestion.reminderInterval) {
        updateQuestionReminder(editingQuestion.id, reminderInterval);
      }
    } else {
      addQuestion({ subjectId, subjectName, notes, attachments, reminderInterval });
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
  const totalPending = useMemo(() => questions.filter((q) => !q.understood).length, [questions]);

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
                questions={questionsBySubject.get(s.id) ?? []}
                onUnderstood={markQuestionUnderstood}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenImage={handleOpenImage}
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

      <ImageViewerModal
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={viewerStartIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  thumbZoomHint: {
    position: "absolute", bottom: 5, right: 5,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 5, padding: 3,
  },
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
  intervalRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  intervalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    alignItems: "center", gap: 2,
  },
  intervalBtnLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  intervalBtnDesc: { fontSize: 10, fontFamily: "Inter_400Regular" },
  uploadButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  uploadBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12 },
  uploadBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  attachmentsPreview: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  infoBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, alignItems: "flex-start", marginTop: 8 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },

  // ── Image viewer ──
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
    justifyContent: "center",
  },
  viewerHeader: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  viewerCounter: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  viewerCounterText: {
    color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5,
  },
  viewerHint: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  viewerHintText: {
    color: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Inter_400Regular",
  },
  viewerClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  viewerPage: {
    width: SCREEN.width,
    height: SCREEN.height,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: SCREEN.width,
    height: SCREEN.height,
  },
  viewerDots: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7,
  },
  viewerDot: { width: 6, height: 6, borderRadius: 3 },
  viewerDotActive: { width: 20, height: 6, borderRadius: 3 },
  doubleTapHint: {
    position: "absolute", alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
  },
  doubleTapHintText: {
    color: "rgba(255,255,255,0.55)", fontSize: 11, fontFamily: "Inter_400Regular",
  },
});
