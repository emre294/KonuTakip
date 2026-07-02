import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
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
import { ThemePreference, useTheme } from "@/contexts/ThemeContext";
import { FIELD_LABELS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

function SettingRow({ icon, label, value, onPress, rightElement, colors, last }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  rightElement?: React.ReactNode; last?: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderBottomColor: last ? "transparent" : colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as never} size={17} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <Feather name="chevron-right" size={15} color={colors.mutedForeground} /> : null)}
    </TouchableOpacity>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Açık Mod", icon: "sun" },
  { value: "dark",  label: "Koyu Mod", icon: "moon" },
  { value: "system", label: "Sistem", icon: "smartphone" },
];

function ThemeSelector({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const { preference, setPreference } = useTheme();

  return (
    <View style={[styles.themeSelector, { backgroundColor: colors.muted, borderRadius: 14 }]}>
      {THEME_OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => { setPreference(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.themeOption,
              { backgroundColor: active ? colors.card : "transparent" },
              active && styles.themeOptionActive,
            ]}
            activeOpacity={0.7}
          >
            <Feather name={opt.icon as never} size={15} color={active ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.themeOptionText, { color: active ? colors.primary : colors.mutedForeground }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, achievements, questions, sessions, mockExamResults } = useApp();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const fieldLabel = profile ? FIELD_LABELS[profile.studyField] : "-";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Ayarlar</Text>
      </Animated.View>

      {profile && (
        <Animated.View entering={FadeInDown.delay(60).duration(500)}>
          <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
            <View style={[styles.profileAvatar, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
              <Text style={styles.profileInitial}>{(profile.name[0] ?? "K").toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileMeta}>{profile.grade === "12" ? "12. Sınıf" : "Mezun"} • {fieldLabel}</Text>
              <Text style={styles.profileTarget} numberOfLines={1}>{profile.targetUniversity} — {profile.targetDepartment}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Section title="HEDEFLER" colors={colors}>
          <SettingRow icon="target" label="Hedef Üniversite" value={profile?.targetUniversity ?? "-"} colors={colors} />
          <SettingRow icon="book-open" label="Hedef Bölüm" value={profile?.targetDepartment ?? "-"} colors={colors} />
          <SettingRow icon="trending-up" label="TYT Hedef Puan" value={`${profile?.tytTargetScore ?? "-"}`} colors={colors} />
          <SettingRow icon="trending-up" label="AYT Hedef Puan" value={`${profile?.aytTargetScore ?? "-"}`} colors={colors} />
          <SettingRow icon="layers" label="Çalışma Alanı" value={fieldLabel} colors={colors} last />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(500)}>
        <Section title="ANALİTİK" colors={colors}>
          <SettingRow icon="bar-chart-2" label="İstatistikler" onPress={() => router.push("/statistics")} colors={colors} />
          <SettingRow icon="clipboard" label="Deneme Takibi" value={`${mockExamResults.length} deneme`} onPress={() => router.push("/mock-exams")} colors={colors} />
          <SettingRow icon="trending-up" label="Deneme Analizi" onPress={() => router.push("/exam-analytics")} colors={colors} />
          <SettingRow icon="award" label="Başarılar" value={`${unlockedCount}/${achievements.length}`} onPress={() => router.push("/achievements")} colors={colors} />
          <SettingRow icon="zap" label="AI Çalışma Koçu" onPress={() => router.push("/ai-coach")} colors={colors} last />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>GÖRÜNÜM</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, padding: 14 }]}>
            <View style={styles.themeHeaderRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="sun" size={17} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground, flex: 1, marginLeft: 12 }]}>Tema</Text>
            </View>
            <ThemeSelector colors={colors} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(500)}>
        <Section title="YARDIM" colors={colors}>
          <SettingRow icon="help-circle" label="Sık Sorulan Sorular" onPress={() => router.push("/faq")} colors={colors} last />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).duration(500)}>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{sessions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Oturum</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{questions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Soru</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{unlockedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Başarı</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: "#7C3AED" }]}>{mockExamResults.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Deneme</Text>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  profileCard: {
    borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  profileAvatar: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  profileInitial: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  profileName: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  profileMeta: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  profileTarget: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.9, marginBottom: 8, paddingLeft: 4 },
  sectionCard: {
    borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 13, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  themeHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  themeSelector: { flexDirection: "row", padding: 4, gap: 4 },
  themeOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, paddingHorizontal: 4, borderRadius: 10,
  },
  themeOptionActive: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  themeOptionText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statBox: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
