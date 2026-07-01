import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
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

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { profile, achievements, questions, sessions, studyStreak, mockExamResults } = useApp();

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
        <Section title="GÖRÜNÜM" colors={colors}>
          <SettingRow
            icon="sun"
            label="Tema"
            value={colorScheme === "dark" ? "Koyu" : "Açık"}
            colors={colors}
            last
            rightElement={
              <View style={[styles.themeBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.themeBadgeText, { color: colors.primary }]}>Sistem</Text>
              </View>
            }
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(500)}>
        <Section title="YARDIM" colors={colors}>
          <SettingRow icon="help-circle" label="Sık Sorulan Sorular" onPress={() => router.push("/faq")} colors={colors} last />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).duration(500)}>
        <Section title="UYGULAMA" colors={colors}>
          <SettingRow icon="info" label="Versiyon" value="1.1.0" colors={colors} last />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(500)}>
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
  themeBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7 },
  themeBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statBox: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
