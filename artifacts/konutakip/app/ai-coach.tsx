import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Dimensions,
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
import { AYT_SUBJECTS_BY_FIELD, TYT_EXAM_DATE, TYT_SUBJECTS } from "@/data/subjects";
import { useColors } from "@/hooks/useColors";

interface Recommendation {
  type: "warning" | "info" | "success" | "tip";
  title: string;
  body: string;
  icon: string;
}

function RecommendationCard({ rec, colors }: { rec: Recommendation; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const colorMap = {
    warning: colors.warning,
    info: colors.primary,
    success: colors.success,
    tip: "#7C3AED",
  };
  const iconColor = colorMap[rec.type];

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={[styles.recCard, { backgroundColor: colors.card, borderLeftColor: iconColor, borderLeftWidth: 4 }]}>
        <View style={[styles.recIcon, { backgroundColor: iconColor + "20" }]}>
          <Ionicons name={rec.icon as never} size={22} color={iconColor} />
        </View>
        <View style={styles.recContent}>
          <Text style={[styles.recTitle, { color: colors.foreground }]}>{rec.title}</Text>
          <Text style={[styles.recBody, { color: colors.mutedForeground }]}>{rec.body}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function AICoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, topicCompletion, sessions, questions, tytProgress, aytProgress, studyStreak, studyDays, totalTopicsCompleted } = useApp();

  const recommendations = useMemo<Recommendation[]>(() => {
    const recs: Recommendation[] = [];
    const today = new Date().toISOString().split("T")[0];

    if (!profile) {
      recs.push({ type: "info", title: "Profil Oluştur", body: "Kişiselleştirilmiş önerileri görmek için önce profilini oluştur.", icon: "person-circle-outline" });
      return recs;
    }

    if (tytProgress === 0 && aytProgress === 0) {
      recs.push({ type: "tip", title: "Çalışmaya Başla", body: "Henüz hiç konu tamamlanmamış. İlk konunu tamamlayarak yolculuğunu başlat!", icon: "rocket-outline" });
    }

    const allTYT = TYT_SUBJECTS.flatMap((s) => s.topics);
    const completedTYT = allTYT.filter((t) => topicCompletion[t.id]).length;
    const tytRemaining = allTYT.length - completedTYT;

    if (tytRemaining > 0 && tytProgress < 80) {
      const daysToExam = Math.max(0, Math.floor((TYT_EXAM_DATE.getTime() - Date.now()) / 86400000));
      const topicsPerDay = daysToExam > 0 ? Math.ceil(tytRemaining / daysToExam) : tytRemaining;
      recs.push({
        type: "info",
        title: "TYT Hedef Hızı",
        body: `Sınava ${daysToExam} gün kaldı. TYT'yi bitirmek için günde yaklaşık ${topicsPerDay} konu çalışman gerekiyor.`,
        icon: "speedometer-outline",
      });
    }

    if (profile) {
      const aytSubjects = AYT_SUBJECTS_BY_FIELD[profile.studyField] ?? [];
      const allAYT = aytSubjects.flatMap((s) => s.topics);
      const completedAYT = allAYT.filter((t) => topicCompletion[t.id]).length;
      const aytRemaining = allAYT.length - completedAYT;
      if (aytRemaining > 0 && aytProgress < 50) {
        recs.push({
          type: "warning",
          title: "AYT İlerlemesi Düşük",
          body: `AYT'de %${aytProgress} tamamlandı. Özellikle ağırlıklı derslere odaklan ve her gün en az 2 AYT konusu çalış.`,
          icon: "alert-circle-outline",
        });
      }

      const subjectProgress = aytSubjects.map((s) => ({
        name: s.name,
        pct: s.topics.length > 0 ? (s.topics.filter((t) => topicCompletion[t.id]).length / s.topics.length) * 100 : 0,
      }));
      const neglected = subjectProgress.filter((s) => s.pct < 20);
      if (neglected.length > 0) {
        recs.push({
          type: "warning",
          title: "İhmal Edilen Dersler",
          body: `${neglected.map((s) => s.name).join(", ")} derslerinde çok az ilerleme var. Bu hafta bu derslere ağırlık ver.`,
          icon: "warning-outline",
        });
      }
    }

    if (studyStreak === 0 && studyDays.length > 0) {
      recs.push({
        type: "warning",
        title: "Seri Kırıldı",
        body: "Çalışma seriniz kırılmış. Bugün en az bir konu tamamlayarak serinizi yeniden başlatın!",
        icon: "flame-outline",
      });
    } else if (studyStreak >= 7) {
      recs.push({
        type: "success",
        title: `${studyStreak} Günlük Seri — Harika!`,
        body: "Tutarlılığın meyvelerini topluyorsun. Bu ritmi korumak uzun vadede en büyük avantajın.",
        icon: "flame-outline",
      });
    }

    const pendingQuestions = questions.filter((q) => {
      const days = Math.floor((Date.now() - new Date(q.addedDate).getTime()) / 86400000);
      return !q.understood && days >= 7;
    });
    if (pendingQuestions.length > 0) {
      recs.push({
        type: "info",
        title: `${pendingQuestions.length} Soru Tekrar Zamanı`,
        body: "Soru bankasında tekrar edilmesi gereken sorular var. Zayıf noktalarını güçlendirmek için hepsini gözden geçir.",
        icon: "refresh-circle-outline",
      });
    }

    const pendingSessions = sessions.filter((s) => s.date < today && !s.completed);
    if (pendingSessions.length > 0) {
      recs.push({
        type: "warning",
        title: `${pendingSessions.length} Gecikmiş Oturum`,
        body: "Planlanmış ama tamamlanmamış oturumlar var. Bugün bunları tamamlamaya çalış veya güncelle.",
        icon: "time-outline",
      });
    }

    if (totalTopicsCompleted >= 10 && sessions.filter((s) => s.completed).length === 0) {
      recs.push({
        type: "tip",
        title: "Günlük Plan Kur",
        body: "Konu çalışıyorsun ama henüz günlük oturum planlamadın. Planlı çalışmak verimliliği 2 katına çıkarır.",
        icon: "calendar-outline",
      });
    }

    const daysStudied = studyDays.length;
    const estimatedDailyTopics = daysStudied > 0 ? totalTopicsCompleted / daysStudied : 0;
    if (estimatedDailyTopics > 0) {
      recs.push({
        type: "success",
        title: "Günlük Tempo Analizi",
        body: `Günde ortalama ${estimatedDailyTopics.toFixed(1)} konu tamamlıyorsun. ${estimatedDailyTopics >= 3 ? "Bu tempo sınava kadar yetecek!" : "Tempoyu biraz artırabilirsen daha güvenli bir konuma gelirsin."}`,
        icon: "analytics-outline",
      });
    }

    recs.push({
      type: "tip",
      title: "Çalışma Yöntemi Önerisi",
      body: "Pomodoro tekniği dene: 25 dk çalış, 5 dk mola ver. Her 4 pomodorodan sonra 15-30 dk uzun mola. Bu yöntem odaklanmayı artırır.",
      icon: "timer-outline",
    });

    recs.push({
      type: "tip",
      title: "Aktif Tekrar",
      body: "Okuduğun konuyu okuduktan hemen sonra kapatıp başkasına anlat ya da not yaz. Aktif geri çağırma, pasif okumadan 3 kat daha etkili.",
      icon: "bulb-outline",
    });

    return recs;
  }, [profile, topicCompletion, sessions, questions, tytProgress, aytProgress, studyStreak, studyDays, totalTopicsCompleted]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>AI Çalışma Koçu</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <View style={[styles.heroCard, { backgroundColor: "#7C3AED" }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle} numberOfLines={2}>Kişisel Koçun</Text>
              <Text style={styles.heroSub} numberOfLines={2}>İlerleme analizin hazır</Text>
            </View>
            <View style={[styles.heroIcon, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="sparkles" size={28} color="#fff" />
            </View>
          </View>
          <Text style={styles.heroText}>
            Bugün için {recommendations.filter((r) => r.type === "warning").length} uyarı ve {recommendations.filter((r) => r.type === "success").length} pozitif tespit bulunuyor.
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {recommendations.length} kişiselleştirilmiş öneri
        </Text>
      </Animated.View>

      <View style={styles.recList}>
        {recommendations.map((r, i) => (
          <RecommendationCard key={i} rec={r} colors={colors} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroCard: {
    borderRadius: 20, padding: 24, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
    gap: 12,
  },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroTextWrap: { flex: 1, flexShrink: 1 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.9)", lineHeight: 20 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 16, paddingLeft: 4 },
  recList: { gap: 12 },
  recCard: {
    borderRadius: 16, padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  recIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recContent: { flex: 1, gap: 4 },
  recTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  recBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
