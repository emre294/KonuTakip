import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { useApp, MockExamResult } from "@/contexts/AppContext";
import { FIELD_LABELS, StudyField } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";
import { ActivePicker, DatePickerField, PickerOverlay } from "@/components/pickers";

// ─── Local date helper (avoids UTC ↔ local midnight shift) ───────────────────

function localDateISO(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ─── Official ÖSYM maximum net limits ──────────────────────────────────────────

const TYT_NET_LIMITS: Record<string, number> = {
  turkish: 40,   // Türkçe
  math:    40,   // Temel Matematik
  science: 20,   // Fen Bilimleri
  social:  20,   // Sosyal Bilimler
};

const AYT_NET_LIMITS: Record<string, number> = {
  aytMath:    40, // AYT Matematik
  physics:    14, // Fizik
  chemistry:  13, // Kimya
  biology:    13, // Biyoloji
  literature: 24, // Türk Dili ve Edebiyatı
  history1:   10, // Tarih 1
  geography1:  6, // Coğrafya 1
  history2:   11, // Tarih 2
  geography2:  11, // Coğrafya 2
  philosophy:  12, // Felsefe Grubu
  religion:    6, // Din Kültürü
};

const AYT_FIELD_SUBJECTS: Record<StudyField, { key: string; label: string }[]> = {
  sayisal: [
    { key: "aytMath", label: "AYT Matematik" },
    { key: "physics", label: "Fizik" },
    { key: "chemistry", label: "Kimya" },
    { key: "biology", label: "Biyoloji" },
  ],
  esitAgirlik: [
    { key: "aytMath", label: "AYT Matematik" },
    { key: "literature", label: "Türk Dili ve Edebiyatı" },
    { key: "history1", label: "Tarih 1" },
    { key: "geography1", label: "Coğrafya 1" },
  ],
  sozel: [
    { key: "literature", label: "Türk Dili ve Edebiyatı" },
    { key: "history1", label: "Tarih 1" },
    { key: "geography1", label: "Coğrafya 1" },
    { key: "history2", label: "Tarih 2" },
    { key: "geography2", label: "Coğrafya 2" },
    { key: "philosophy", label: "Felsefe Grubu" },
    { key: "religion", label: "Din Kültürü" },
  ],
};

function NetInput({ label, value, onChange, maxNet, colors }: {
  label: string; value: string; onChange: (v: string) => void;
  maxNet?: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  function handleChange(v: string) {
    // Clamp at input time so users cannot enter impossible net values
    if (maxNet !== undefined) {
      const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
      if (num > maxNet) { onChange(String(maxNet)); return; }
    }
    onChange(v);
  }
  return (
    <View style={styles.netInputRow}>
      <Text style={[styles.netLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[styles.netInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
        value={value}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        placeholder={maxNet !== undefined ? `0–${maxNet}` : "0.00"}
        placeholderTextColor={colors.mutedForeground}
      />
    </View>
  );
}

function ExamCard({ result, onDelete, colors }: {
  result: MockExamResult; onDelete: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isTYT = result.type === "TYT";
  const accentColor = isTYT ? colors.primary : "#7C3AED";

  return (
    <View style={[styles.examCard, { backgroundColor: colors.card, borderLeftColor: accentColor, borderLeftWidth: 3 }]}>
      <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
        <View style={styles.examCardHeader}>
          <View style={[styles.examTypeBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.examTypeBadgeText}>{result.type}</Text>
          </View>
          <View style={styles.examCardMid}>
            {result.name ? (
              <Text style={[styles.examCardName, { color: colors.foreground }]}>{result.name}</Text>
            ) : null}
            <Text style={[styles.examCardDate, { color: result.name ? colors.mutedForeground : colors.foreground }]}>{result.date}</Text>
            <Text style={[styles.examCardTotal, { color: accentColor }]}>Toplam: {result.totalNet.toFixed(2)} net</Text>
          </View>
          <View style={styles.examCardRight}>
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.examDetails, { borderTopColor: colors.border }]}>
          {isTYT ? (
            <>
              <DetailRow label="Türkçe" value={result.turkishNet} colors={colors} />
              <DetailRow label="Matematik" value={result.mathNet} colors={colors} />
              <DetailRow label="Fen Bilimleri" value={result.scienceNet} colors={colors} />
              <DetailRow label="Sosyal Bilimler" value={result.socialNet} colors={colors} />
            </>
          ) : (
            Object.entries(result.fieldNets).map(([k, v]) => (
              <DetailRow key={k} label={k} value={v} colors={colors} />
            ))
          )}
          {result.notes ? <Text style={[styles.examNotes, { color: colors.mutedForeground }]}>{result.notes}</Text> : null}
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value.toFixed(2)}</Text>
    </View>
  );
}

function AddExamModal({ visible, onClose, onSave, profile, colors }: {
  visible: boolean;
  onClose: () => void;
  onSave: (r: Omit<MockExamResult, "id">) => void;
  profile: import("@/contexts/AppContext").UserProfile | null;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [examName, setExamName] = useState("");
  const [examType, setExamType] = useState<"TYT" | "AYT">("TYT");
  const [date, setDate] = useState(() => localDateISO(0));
  const [turkish, setTurkish] = useState("");
  const [math, setMath] = useState("");
  const [science, setScience] = useState("");
  const [social, setSocial] = useState("");
  const [fieldNets, setFieldNets] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // Date window: today and the previous 7 days (local time, avoids UTC midnight drift)
  const todayISO = localDateISO(0);
  const minDateISO = localDateISO(-7);

  const aytSubjects = profile ? AYT_FIELD_SUBJECTS[profile.studyField] : AYT_FIELD_SUBJECTS.sayisal;

  function updateFieldNet(key: string, val: string) {
    setFieldNets((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    if (!examName.trim()) {
      setNameError(true);
      return;
    }

    // ── Date validation ──────────────────────────────────────────────────────
    if (date > todayISO || date < minDateISO) {
      Alert.alert("Geçersiz Tarih", "Lütfen bugün veya son 7 gün içindeki bir tarih seçin.");
      return;
    }

    // ── Net limit validation ─────────────────────────────────────────────────
    const p = (v: string) => parseFloat(v) || 0;
    if (examType === "TYT") {
      if (p(turkish) > TYT_NET_LIMITS.turkish) {
        Alert.alert("Geçersiz Net", `Türkçe için maksimum net ${TYT_NET_LIMITS.turkish}'dir.`); return;
      }
      if (p(math) > TYT_NET_LIMITS.math) {
        Alert.alert("Geçersiz Net", `Temel Matematik için maksimum net ${TYT_NET_LIMITS.math}'dir.`); return;
      }
      if (p(science) > TYT_NET_LIMITS.science) {
        Alert.alert("Geçersiz Net", `Fen Bilimleri için maksimum net ${TYT_NET_LIMITS.science}'dir.`); return;
      }
      if (p(social) > TYT_NET_LIMITS.social) {
        Alert.alert("Geçersiz Net", `Sosyal Bilimler için maksimum net ${TYT_NET_LIMITS.social}'dir.`); return;
      }
    } else {
      for (const s of aytSubjects) {
        const limit = AYT_NET_LIMITS[s.key];
        if (limit !== undefined && p(fieldNets[s.key] ?? "0") > limit) {
          Alert.alert("Geçersiz Net", `${s.label} için maksimum net ${limit}'dir.`); return;
        }
      }
    }

    setNameError(false);

    if (examType === "TYT") {
      const total = p(turkish) + p(math) + p(science) + p(social);
      onSave({
        name: examName.trim(),
        date, type: "TYT",
        turkishNet: p(turkish), mathNet: p(math), scienceNet: p(science), socialNet: p(social),
        fieldNets: {}, totalNet: total, notes,
      });
    } else {
      const nets: Record<string, number> = {};
      let total = 0;
      for (const s of aytSubjects) {
        const v = p(fieldNets[s.key] ?? "0");
        nets[s.label] = v;
        total += v;
      }
      onSave({
        name: examName.trim(),
        date, type: "AYT",
        turkishNet: 0, mathNet: 0, scienceNet: 0, socialNet: 0,
        fieldNets: nets, totalNet: total, notes,
      });
    }

    setExamName(""); setTurkish(""); setMath(""); setScience(""); setSocial(""); setFieldNets({}); setNotes("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        {/* Date picker overlay — rendered here so it sits above the modal content
            without nesting a second Modal (which is unreliable on Android). */}
        {activePicker && (
          <PickerOverlay
            activePicker={activePicker}
            dateValue={date}
            timeValue=""
            onChangeDate={setDate}
            onChangeTime={() => {}}
            onClose={() => setActivePicker(null)}
            colors={colors}
            minDate={minDateISO}
            maxDate={todayISO}
          />
        )}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Deneme Ekle</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Deneme Adı *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: nameError ? colors.destructive : colors.border, color: colors.foreground }]}
            value={examName}
            onChangeText={(v) => { setExamName(v); if (v.trim()) setNameError(false); }}
            placeholder="Örn: Özdebir TYT Denemesi, 3D AYT Denemesi..."
            placeholderTextColor={colors.mutedForeground}
            autoFocus
          />
          {nameError && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>Deneme adı zorunludur</Text>
          )}

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Sınav Türü</Text>
          <View style={styles.typeRow}>
            {(["TYT", "AYT"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setExamType(t)}
                style={[styles.typeBtn, { backgroundColor: examType === t ? (t === "TYT" ? colors.primary : "#7C3AED") : colors.card, borderColor: t === "TYT" ? colors.primary : "#7C3AED" }]}
              >
                <Text style={[styles.typeBtnText, { color: examType === t ? "#fff" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tarih</Text>
          <DatePickerField
            value={date}
            onChange={setDate}
            colors={colors}
            onOpen={() => setActivePicker("date")}
            minDate={minDateISO}
            maxDate={todayISO}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Net Sayıları</Text>
          <View style={[styles.netsCard, { backgroundColor: colors.card }]}>
            {examType === "TYT" ? (
              <>
                <NetInput label="Türkçe" value={turkish} onChange={setTurkish} maxNet={TYT_NET_LIMITS.turkish} colors={colors} />
                <NetInput label="Temel Matematik" value={math} onChange={setMath} maxNet={TYT_NET_LIMITS.math} colors={colors} />
                <NetInput label="Fen Bilimleri" value={science} onChange={setScience} maxNet={TYT_NET_LIMITS.science} colors={colors} />
                <NetInput label="Sosyal Bilimler" value={social} onChange={setSocial} maxNet={TYT_NET_LIMITS.social} colors={colors} />
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Toplam Net</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>
                    {((parseFloat(turkish) || 0) + (parseFloat(math) || 0) + (parseFloat(science) || 0) + (parseFloat(social) || 0)).toFixed(2)}
                  </Text>
                </View>
              </>
            ) : (
              <>
                {aytSubjects.map((s) => (
                  <NetInput key={s.key} label={s.label} value={fieldNets[s.key] ?? ""} onChange={(v) => updateFieldNet(s.key, v)} maxNet={AYT_NET_LIMITS[s.key]} colors={colors} />
                ))}
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground }]}>Toplam Net</Text>
                  <Text style={[styles.totalValue, { color: "#7C3AED" }]}>
                    {aytSubjects.reduce((acc, s) => acc + (parseFloat(fieldNets[s.key] ?? "0") || 0), 0).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notlar (opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Eksik konu, gözlem..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function MockExamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, mockExamResults, addMockExamResult, deleteMockExamResult } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "TYT" | "AYT">("ALL");

  const tytResults = mockExamResults.filter((r) => r.type === "TYT");
  const aytResults = mockExamResults.filter((r) => r.type === "AYT");

  const filtered = filter === "ALL" ? [...mockExamResults].sort((a, b) => b.date.localeCompare(a.date))
    : mockExamResults.filter((r) => r.type === filter).sort((a, b) => b.date.localeCompare(a.date));

  const highestTYT = tytResults.length ? Math.max(...tytResults.map((r) => r.totalNet)) : 0;
  const highestAYT = aytResults.length ? Math.max(...aytResults.map((r) => r.totalNet)) : 0;

  function handleDelete(id: string) {
    Alert.alert("Denemeyi Sil", "Bu deneme sonucu kalıcı olarak silinecek.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteMockExamResult(id) },
    ]);
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.headerMid}>
              <Text style={[styles.pageTitle, { color: colors.foreground }]}>Deneme Takibi</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => router.push("/exam-analytics")} style={[styles.analyticsBtn, { backgroundColor: colors.secondary }]}>
                <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {mockExamResults.length > 0 && (
          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.summaryLabel}>En Yüksek TYT</Text>
                <Text style={styles.summaryValue}>{highestTYT.toFixed(2)}</Text>
                <Text style={styles.summarySub}>{tytResults.length} deneme</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#7C3AED" }]}>
                <Text style={styles.summaryLabel}>En Yüksek AYT</Text>
                <Text style={styles.summaryValue}>{highestAYT.toFixed(2)}</Text>
                <Text style={styles.summarySub}>{aytResults.length} deneme</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(120).duration(500)}>
          <View style={styles.filterRow}>
            {(["ALL", "TYT", "AYT"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterBtn, { backgroundColor: filter === f ? colors.primary : colors.card }]}
              >
                <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
                  {f === "ALL" ? "Tümü" : f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {filtered.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, { backgroundColor: colors.card }]}>
            <Ionicons name="clipboard-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz deneme yok</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              + butonuna basarak ilk deneme sonucunu ekle
            </Text>
            <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Deneme Ekle</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.list}>
            {filtered.map((r) => (
              <Animated.View key={r.id} entering={FadeInDown.duration(400)}>
                <ExamCard result={r} onDelete={() => handleDelete(r.id)} colors={colors} />
              </Animated.View>
            ))}
          </View>
        )}

        {mockExamResults.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push("/exam-analytics")}
            style={[styles.analyticsLink, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
            <Text style={[styles.analyticsLinkText, { color: colors.foreground }]}>Performans Analizini Görüntüle</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddExamModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={addMockExamResult}
        profile={profile}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerMid: { flex: 1 },
  headerRight: { flexDirection: "row", gap: 8 },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  analyticsBtn: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 18, padding: 16, gap: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  summaryValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  summarySub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  empty: { borderRadius: 20, padding: 36, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, marginTop: 6 },
  list: { gap: 12 },
  examCard: {
    borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: "hidden",
  },
  examCardHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  examTypeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  examTypeBadgeText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  examCardMid: { flex: 1 },
  examCardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  examCardDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  examCardTotal: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 1 },
  examCardRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  examDetails: { borderTopWidth: 1, padding: 16, gap: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  examNotes: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 4 },
  analyticsLink: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16,
    borderWidth: 1, marginTop: 16,
  },
  analyticsLinkText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 12 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  typeRow: { flexDirection: "row", gap: 12 },
  typeBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1.5 },
  typeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  netsCard: { borderRadius: 14, overflow: "hidden" },
  netInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  netLabel: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  netInput: { width: 80, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
