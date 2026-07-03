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

import { useApp, DailySession } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_SUBJECTS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";
import { ActivePicker, DatePickerField, PickerOverlay, TimePickerField } from "@/components/pickers";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

function groupByDate(sessions: DailySession[]): Record<string, DailySession[]> {
  const groups: Record<string, DailySession[]> = {};
  for (const s of sessions) {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  return groups;
}

function SessionCard({ session, onComplete, onDelete, colors }: {
  session: DailySession; onComplete: () => void; onDelete: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isPast = session.date < today && !session.completed;

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderLeftColor: session.completed ? colors.success : isPast ? colors.warning : colors.primary, borderLeftWidth: 3 }]}>
      <View style={styles.sessionTop}>
        <View style={styles.sessionLeft}>
          <Text style={[styles.sessionSubject, { color: colors.foreground }]}>{session.subjectName}</Text>
          <Text style={[styles.sessionTopic, { color: colors.mutedForeground }]} numberOfLines={1}>{session.topic}</Text>
          {session.notes ? <Text style={[styles.sessionNotes, { color: colors.mutedForeground }]} numberOfLines={1}>{session.notes}</Text> : null}
        </View>
        <View style={styles.sessionRight}>
          <Text style={[styles.sessionTime, { color: colors.primary }]}>{session.time}</Text>
          <Text style={[styles.sessionQ, { color: colors.mutedForeground }]}>{session.targetQuestions} soru</Text>
        </View>
      </View>
      <View style={[styles.sessionActions, { borderTopColor: colors.border }]}>
        {!session.completed ? (
          <TouchableOpacity onPress={onComplete} style={[styles.completeBtn, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check" size={14} color={colors.success} />
            <Text style={[styles.completeBtnText, { color: colors.success }]}>Tamamlandı</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.completedBadge, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.completedText, { color: colors.success }]}>Tamamlandı</Text>
          </View>
        )}
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, sessions, addSession, completeSession, deleteSession } = useApp();
  const [showModal, setShowModal] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [topic, setTopic] = useState("");
  const [targetQ, setTargetQ] = useState("20");
  const [notes, setNotes] = useState("");
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const allSubjects = [
    ...TYT_SUBJECTS,
    ...(profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : []),
  ];

  const grouped = groupByDate([...sessions].sort((a, b) => a.date.localeCompare(b.date)));
  const sortedDates = Object.keys(grouped).sort();

  function saveSession() {
    if (!selectedSubjectId || !topic.trim()) {
      Alert.alert("Hata", "Lütfen ders ve konu seçin.");
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Hata", "Lütfen geçerli bir tarih seçin.");
      return;
    }
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert("Hata", "Lütfen geçerli bir saat seçin.");
      return;
    }
    addSession({
      date,
      time,
      subjectId: selectedSubjectId,
      subjectName: selectedSubjectName,
      topic: topic.trim(),
      targetQuestions: parseInt(targetQ) || 20,
      notes: notes.trim(),
      completed: false,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setTopic("");
    setNotes("");
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.pageHeader}>
            <View>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Günlük Plan</Text>
              <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>Çalışma oturumlarını planla</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {sortedDates.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz plan yok</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>+ butonuna basarak ilk oturumunu ekle</Text>
          </Animated.View>
        ) : (
          sortedDates.map((d) => (
            <Animated.View key={d} entering={FadeInDown.duration(400)}>
              <View style={[styles.dateHeader, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.dateLabel, { color: colors.primary }]}>{formatDate(d)}</Text>
              </View>
              <View style={styles.dayList}>
                {grouped[d].map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onComplete={() => { completeSession(s.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                    onDelete={() => deleteSession(s.id)}
                    colors={colors}
                  />
                ))}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Oturum Ekle</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tarih</Text>
            <DatePickerField value={date} onChange={setDate} colors={colors} onOpen={() => setActivePicker("date")} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Saat</Text>
            <TimePickerField value={time} onChange={setTime} colors={colors} onOpen={() => setActivePicker("time")} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Ders</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
              {allSubjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => { setSelectedSubjectId(s.id); setSelectedSubjectName(s.name); }}
                  style={[styles.subjectChip, { backgroundColor: selectedSubjectId === s.id ? s.color : colors.card, borderColor: s.color }]}
                >
                  <Text style={[styles.subjectChipText, { color: selectedSubjectId === s.id ? "#fff" : colors.foreground }]} numberOfLines={1}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Konu</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={topic}
              onChangeText={setTopic}
              placeholder="Konu adı..."
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Hedef Soru Sayısı</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={targetQ}
              onChangeText={setTargetQ}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notlar (opsiyonel)</Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Çalışma notları..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity onPress={saveSession} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>

          {activePicker && (
            <PickerOverlay
              activePicker={activePicker}
              dateValue={date}
              timeValue={time}
              onChangeDate={setDate}
              onChangeTime={setTime}
              onClose={() => setActivePicker(null)}
              colors={colors}
            />
          )}
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
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  dateHeader: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  dateLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  dayList: { gap: 10, marginBottom: 20 },
  sessionCard: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sessionTop: { flexDirection: "row", padding: 14, gap: 12 },
  sessionLeft: { flex: 1 },
  sessionSubject: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  sessionTopic: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sessionNotes: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, fontStyle: "italic" },
  sessionRight: { alignItems: "flex-end", gap: 2 },
  sessionTime: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sessionQ: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  completeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  completeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  completedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { padding: 4 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  subjectPicker: { marginBottom: 4 },
  subjectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8, maxWidth: 140 },
  subjectChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
