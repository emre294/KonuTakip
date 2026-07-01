import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

function SettingRow({ icon, label, value, onPress, rightElement, colors }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  rightElement?: React.ReactNode;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as never} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null)}
    </TouchableOpacity>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { profile, achievements, questions, sessions, studyStreak } = useApp();

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
            <View style={[styles.profileAvatar, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <Text style={styles.profileInitial}>{(profile.name[0] ?? "K").toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileMeta}>{profile.grade === "12" ? "12. Sınıf" : "Mezun"} • {fieldLabel}</Text>
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
          <SettingRow icon="layers" label="Çalışma Alanı" value={fieldLabel} colors={colors} />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <Section title="ÇALIŞMA" colors={colors}>
          <SettingRow icon="bar-chart-2" label="İstatistikler" onPress={() => router.push("/statistics")} colors={colors} />
          <SettingRow icon="award" label="Başarılar" value={`${unlockedCount}/${achievements.length}`} onPress={() => router.push("/achievements")} colors={colors} />
          <SettingRow icon="zap" label="AI Çalışma Koçu" onPress={() => router.push("/ai-coach")} colors={colors} />
          <SettingRow icon="flame" label="Çalışma Serisi" value={`${studyStreak} gün`} colors={colors} />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(500)}>
        <Section title="GÖRÜNÜM" colors={colors}>
          <SettingRow
            icon="sun"
            label="Tema"
            value={colorScheme === "dark" ? "Koyu" : "Açık"}
            colors={colors}
            rightElement={
              <View style={[styles.themeBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.themeBadgeText, { color: colors.primary }]}>Sistem</Text>
              </View>
            }
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)}>
        <Section title="UYGULAMA" colors={colors}>
          <SettingRow icon="info" label="Versiyon" value="1.0.0" colors={colors} />
          <SettingRow icon="help-circle" label="Sorular ve Cevaplar" colors={colors}
            onPress={() => Alert.alert("Yardım", "KonuTakip hakkında sorularınız için geliştirici ekibiyle iletişime geçin.")}
          />
        </Section>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(360).duration(500)}>
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
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  profileCard: {
    borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 28,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  profileAvatar: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  profileInitial: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  profileMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  sectionCard: {
    borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14, borderBottomWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  themeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  themeBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 8 },
  statBox: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
