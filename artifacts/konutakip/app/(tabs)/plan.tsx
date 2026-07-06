import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, DailySession, RepeatType } from "@/contexts/AppContext";
import { AYT_SUBJECTS_BY_FIELD, TYT_SUBJECTS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";
import { ActivePicker, DatePickerField, PickerOverlay, TimePickerField } from "@/components/pickers";

// ─── One-time info card session guard ────────────────────────────────────────
// Module-level flag: once dismissed in a session, never re-show even if the
// AsyncStorage write fails. Storage is still attempted for cross-session persistence.
let _infoCardDismissedThisSession = false;

// ─── Turkish weekday labels (0=Sun … 6=Sat) ───────────────────────────────────

const WD_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const WD_FULL  = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}

function getRepeatLabel(session: DailySession): string {
  if (session.repeatType === "every_day") return "Her Gün";
  if (session.repeatType === "every_week") {
    const days = (session.weekdays ?? []).slice().sort((a, b) => a - b).map(d => WD_SHORT[d]);
    return days.length ? days.join(", ") : "Her Hafta";
  }
  return "";
}

function groupByDate(sessions: DailySession[]): Record<string, DailySession[]> {
  const groups: Record<string, DailySession[]> = {};
  for (const s of sessions) {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  return groups;
}

// ─── RepeatSelector ───────────────────────────────────────────────────────────

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: "one_time",   label: "Tek Seferlik" },
  { value: "every_day",  label: "Her Gün" },
  { value: "every_week", label: "Her Hafta" },
];

function RepeatSelector({
  value, onChange, colors,
}: {
  value: RepeatType;
  onChange: (v: RepeatType) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.repeatRow}>
      {REPEAT_OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.repeatBtn,
              { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.repeatBtnText, { color: active ? "#fff" : colors.mutedForeground }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── WeekdayPicker ────────────────────────────────────────────────────────────

function WeekdayPicker({
  selected, onChange, colors,
}: {
  selected: number[];
  onChange: (days: number[]) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  // Order: Mon Tue Wed Thu Fri Sat Sun  (display order)
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];
  return (
    <View style={styles.weekdayRow}>
      {displayOrder.map(wd => {
        const active = selected.includes(wd);
        return (
          <TouchableOpacity
            key={wd}
            onPress={() => {
              if (active) {
                onChange(selected.filter(d => d !== wd));
              } else {
                onChange([...selected, wd]);
              }
            }}
            style={[
              styles.wdChip,
              { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.wdChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
              {WD_SHORT[wd]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

function SessionCard({
  session, onComplete, onDelete, colors,
}: {
  session: DailySession;
  onComplete: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const isOneTime = session.repeatType === "one_time";
  const completedToday = !isOneTime && (session.completedDates?.includes(today) ?? false);
  const isPast = isOneTime && session.date < today && !session.completed;
  const borderColor = (session.completed || completedToday)
    ? colors.success
    : isPast
    ? colors.warning
    : colors.primary;

  return (
    <View style={[styles.sessionCard, { backgroundColor: colors.card, borderLeftColor: borderColor }]}>
      <View style={styles.sessionTop}>
        <View style={styles.sessionLeft}>
          <Text style={[styles.sessionSubject, { color: colors.foreground }]}>{session.subjectName}</Text>
          <Text style={[styles.sessionTopic, { color: colors.mutedForeground }]} numberOfLines={1}>{session.topic}</Text>
          {session.notes ? (
            <Text style={[styles.sessionNotes, { color: colors.mutedForeground }]} numberOfLines={1}>{session.notes}</Text>
          ) : null}
          {!isOneTime && (
            <View style={[styles.repeatBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="repeat" size={11} color={colors.primary} />
              <Text style={[styles.repeatBadgeText, { color: colors.primary }]}>{getRepeatLabel(session)}</Text>
            </View>
          )}
        </View>
        <View style={styles.sessionRight}>
          <Text style={[styles.sessionTime, { color: colors.primary }]}>{session.time}</Text>
          <Text style={[styles.sessionQ, { color: colors.mutedForeground }]}>{session.targetQuestions} soru</Text>
        </View>
      </View>
      <View style={[styles.sessionActions, { borderTopColor: colors.border }]}>
        {isOneTime ? (
          !session.completed ? (
            <TouchableOpacity
              onPress={onComplete}
              style={[styles.completeBtn, { backgroundColor: colors.success + "20" }]}
            >
              <Feather name="check" size={14} color={colors.success} />
              <Text style={[styles.completeBtnText, { color: colors.success }]}>Tamamlandı</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.completedBadge, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={14} color={colors.success} />
              <Text style={[styles.completedText, { color: colors.success }]}>Tamamlandı</Text>
            </View>
          )
        ) : completedToday ? (
          // Recurring — already completed today
          <View style={[styles.completedBadge, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[styles.completedText, { color: colors.success }]}>Bugün Tamamlandı</Text>
          </View>
        ) : (
          // Recurring — not yet completed today
          <TouchableOpacity
            onPress={onComplete}
            style={[styles.completeBtn, { backgroundColor: colors.success + "20" }]}
          >
            <Feather name="check" size={14} color={colors.success} />
            <Text style={[styles.completeBtnText, { color: colors.success }]}>Tamamlandı</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Plan screen ──────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, sessions, addSession, completeSession, deleteSession } = useApp();
  const [showModal, setShowModal] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [repeatType, setRepeatType] = useState<RepeatType>("one_time");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [topic, setTopic] = useState("");
  const [targetQ, setTargetQ] = useState("20");
  const [notes, setNotes] = useState("");
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // ── One-time info card ───────────────────────────────────────────────────
  const INFO_KEY = "plan_daily_tracking_info_seen";
  const [showInfoCard, setShowInfoCard] = useState(false);

  useEffect(() => {
    if (_infoCardDismissedThisSession) return;
    AsyncStorage.getItem(INFO_KEY).then(val => {
      if (!val) setShowInfoCard(true);
    }).catch(() => {});
  }, []);

  function dismissInfoCard() {
    _infoCardDismissedThisSession = true; // session-level guard — no reshow even if storage fails
    setShowInfoCard(false);
    AsyncStorage.setItem(INFO_KEY, "1").catch(() => {
      // Storage write failed; the session guard already prevents reshow this session.
      // On next launch the card will reappear and try again.
    });
  }

  // ── Per-field inline validation errors ────────────────────────────────────
  const [errSubject,  setErrSubject]  = useState("");
  const [errTopic,    setErrTopic]    = useState("");
  const [errTargetQ,  setErrTargetQ]  = useState("");
  const [errDate,     setErrDate]     = useState("");
  const [errTime,     setErrTime]     = useState("");

  const allSubjects = useMemo(() => [
    ...TYT_SUBJECTS,
    ...(profile ? AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [] : []),
  ], [profile]);

  // ── Derived session lists — memoized so they only recompute when sessions changes ─
  const recurringSessions = useMemo(() => sessions.filter(s => s.repeatType !== "one_time"), [sessions]);
  const oneTimeSessions   = useMemo(() => sessions.filter(s => s.repeatType === "one_time"), [sessions]);
  const grouped    = useMemo(() => groupByDate([...oneTimeSessions].sort((a, b) => a.date.localeCompare(b.date))), [oneTimeSessions]);
  const sortedDates = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // ── Save session ─────────────────────────────────────────────────────────────
  function saveSession() {
    // Clear all errors first, then set only the first failing field's error.
    setErrSubject(""); setErrTopic(""); setErrTargetQ(""); setErrDate(""); setErrTime("");

    if (!selectedSubjectId) {
      setErrSubject("Lütfen bir ders seçin.");
      return;
    }
    if (repeatType === "one_time" && !topic.trim()) {
      setErrTopic("Lütfen çalışacağınız konuyu girin.");
      return;
    }
    if (!targetQ.trim() || isNaN(Number(targetQ)) || Number(targetQ) <= 0) {
      setErrTargetQ("Lütfen çözeceğiniz soru sayısını girin.");
      return;
    }
    if (repeatType === "one_time" && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      setErrDate("Lütfen bir tarih seçin.");
      return;
    }
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      setErrTime("Lütfen bir saat seçin.");
      return;
    }
    if (repeatType === "every_week" && selectedWeekdays.length === 0) {
      Alert.alert("Hata", "Lütfen en az bir gün seçin.");
      return;
    }
    addSession({
      date: repeatType === "one_time" ? date : new Date().toISOString().split("T")[0],
      time,
      subjectId: selectedSubjectId,
      subjectName: selectedSubjectName,
      topic: topic.trim(),
      targetQuestions: parseInt(targetQ) || 20,
      notes: notes.trim(),
      completed: false,
      repeatType,
      weekdays: repeatType === "every_week" ? selectedWeekdays : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  }

  function closeModal() {
    setShowModal(false);
    setErrSubject(""); setErrTopic(""); setErrTargetQ(""); setErrDate(""); setErrTime("");
    setRepeatType("one_time");
    setSelectedWeekdays([]);
    setTopic("");
    setNotes("");
    setSelectedSubjectId("");
    setSelectedSubjectName("");
    setTargetQ("20");
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;
  const hasAnySessions = recurringSessions.length > 0 || sortedDates.length > 0;

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

        {/* ── One-time Daily Tracking info card ──────────────────────────── */}
        {showInfoCard && (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.infoCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <View style={styles.infoCardTop}>
              <View style={styles.infoCardTitleRow}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={[styles.infoCardTitle, { color: colors.primary }]}>📊 Günlük Soru Takibi</Text>
              </View>
              <TouchableOpacity onPress={dismissInfoCard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.infoCardBody, { color: colors.foreground }]}>
              {"Günlük planını tamamladığında, belirlediğin soru sayısı otomatik olarak istatistiklerine eklenir. Böylece aynı soru sayısını tekrar manuel olarak girmen gerekmez."}
            </Text>
            <Text style={[styles.infoCardSub, { color: colors.mutedForeground }]}>
              {"Bu özellik yalnızca Günlük Plan üzerinden tamamlanan oturumlar için geçerlidir."}
            </Text>
          </Animated.View>
        )}

        {!hasAnySessions ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz plan yok</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>+ butonuna basarak ilk oturumunu ekle</Text>
          </Animated.View>
        ) : (
          <>
            {/* ── Recurring sessions ─────────────────────────────────────────── */}
            {recurringSessions.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <View style={[styles.sectionHeader, { backgroundColor: colors.secondary }]}>
                  <Feather name="repeat" size={13} color={colors.primary} />
                  <Text style={[styles.sectionLabel, { color: colors.primary }]}>Tekrarlayan Oturumlar</Text>
                </View>
                <View style={styles.dayList}>
                  {recurringSessions.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onComplete={() => {
                        const added = completeSession(s.id);
                        if (added > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }}
                      onDelete={() => deleteSession(s.id)}
                      colors={colors}
                    />
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ── One-time sessions (date-grouped) ────────────────────────────── */}
            {sortedDates.map(d => (
              <Animated.View key={d} entering={FadeInDown.duration(400)}>
                <View style={[styles.dateHeader, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.dateLabel, { color: colors.primary }]}>{formatDate(d)}</Text>
                </View>
                <View style={styles.dayList}>
                  {grouped[d].map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      onComplete={() => {
                        const added = completeSession(s.id);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        if (added > 0) {
                          Alert.alert(
                            "Oturum tamamlandı ✅",
                            `${added} soru otomatik olarak Günlük Plan istatistiklerine eklendi.`
                          );
                        }
                      }}
                      onDelete={() => deleteSession(s.id)}
                      colors={colors}
                    />
                  ))}
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Add session modal ─────────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Oturum Ekle</Text>
            <TouchableOpacity onPress={closeModal}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            {/* Repeat type */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tekrar</Text>
            <RepeatSelector value={repeatType} onChange={setRepeatType} colors={colors} />

            {/* Date — only for one-time */}
            {repeatType === "one_time" && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tarih</Text>
                <DatePickerField value={date} onChange={v => { setDate(v); setErrDate(""); }} colors={colors} onOpen={() => setActivePicker("date")} />
                {errDate ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{errDate}</Text> : null}
              </>
            )}

            {/* Time — always */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Saat</Text>
            <TimePickerField value={time} onChange={v => { setTime(v); setErrTime(""); }} colors={colors} onOpen={() => setActivePicker("time")} />
            {errTime ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{errTime}</Text> : null}

            {/* Weekday picker — only for every_week */}
            {repeatType === "every_week" && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Günler</Text>
                <WeekdayPicker selected={selectedWeekdays} onChange={setSelectedWeekdays} colors={colors} />
              </>
            )}

            {/* Subject */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Ders</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
              {allSubjects.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => { setSelectedSubjectId(s.id); setSelectedSubjectName(s.name); setErrSubject(""); }}
                  style={[
                    styles.subjectChip,
                    { backgroundColor: selectedSubjectId === s.id ? s.color : colors.card, borderColor: s.color },
                  ]}
                >
                  <Text
                    style={[styles.subjectChipText, { color: selectedSubjectId === s.id ? "#fff" : colors.foreground }]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {errSubject ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{errSubject}</Text> : null}

            {/* Topic */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              {repeatType === "one_time" ? "Konu" : "Konu (opsiyonel)"}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: errTopic ? colors.destructive : colors.border, color: colors.foreground }]}
              value={topic}
              onChangeText={v => { setTopic(v); if (v.trim()) setErrTopic(""); }}
              placeholder={repeatType === "one_time" ? "Konu adı..." : "Her gün farklı konu çalışabilirsiniz."}
              placeholderTextColor={colors.mutedForeground}
            />
            {errTopic ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{errTopic}</Text> : null}

            {/* Target questions */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Hedef Soru Sayısı</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: errTargetQ ? colors.destructive : colors.border, color: colors.foreground }]}
              value={targetQ}
              onChangeText={v => { setTargetQ(v); if (v.trim() && !isNaN(Number(v)) && Number(v) > 0) setErrTargetQ(""); }}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.mutedForeground}
            />
            {errTargetQ ? <Text style={[styles.fieldError, { color: colors.destructive }]}>{errTargetQ}</Text> : null}

            {/* Notes */}
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
          </KeyboardAwareScrollView>

          {activePicker && (
            <PickerOverlay
              activePicker={activePicker}
              dateValue={date}
              timeValue={time}
              onChangeDate={v => { setDate(v); setErrDate(""); }}
              onChangeTime={v => { setTime(v); setErrTime(""); }}
              onClose={() => setActivePicker(null)}
              colors={colors}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  empty: { borderRadius: 20, padding: 40, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  dateHeader: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10 },
  dateLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  dayList: { gap: 10, marginBottom: 20 },

  sessionCard: {
    borderRadius: 16, overflow: "hidden", borderLeftWidth: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sessionTop: { flexDirection: "row", padding: 14, gap: 12 },
  sessionLeft: { flex: 1, gap: 2 },
  sessionSubject: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sessionTopic: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sessionNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  repeatBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  repeatBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sessionRight: { alignItems: "flex-end", gap: 2 },
  sessionTime: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sessionQ: { fontSize: 12, fontFamily: "Inter_400Regular" },

  sessionActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  completeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  completeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  completedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  recurringBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  recurringBadgeText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  deleteBtn: { padding: 4 },

  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },

  repeatRow: { flexDirection: "row", gap: 8 },
  repeatBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  repeatBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  weekdayRow: { flexDirection: "row", gap: 6 },
  wdChip: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  wdChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  subjectPicker: { marginBottom: 4 },
  subjectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8, maxWidth: 140 },
  subjectChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  infoCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20, gap: 8 },
  infoCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoCardBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  infoCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  fieldError: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
