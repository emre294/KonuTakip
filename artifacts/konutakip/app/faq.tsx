import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const FAQ_ITEMS = [
  {
    question: "TYT ve AYT ilerleme yüzdem nasıl hesaplanıyor?",
    answer:
      "İlerlemen, seçtiğin çalışma alanının resmi konu listesine göre hesaplanır. Her tamamladığın konu, ilerleme yüzdeni otomatik olarak günceller. TYT için tüm dersler, AYT için seçtiğin alana göre ilgili dersler baz alınır.",
  },
  {
    question: "Çalışma alanımı sonradan değiştirebilir miyim?",
    answer:
      "Evet. Ayarlar sayfasından çalışma alanını istediğin zaman değiştirebilirsin. Dersler ve ilerleme hesaplamaların otomatik olarak yeni seçimine göre güncellenir. Tamamlanmış TYT konuların etkilenmez.",
  },
  {
    question: "Tekrar hatırlatmaları nasıl çalışıyor?",
    answer:
      "Kaydettiğin her yanlış soru, tekrar sistemine otomatik olarak girer. 7 gün sonra tekrar zamanı bildirimi alırsın. Bu soruyu 'Anladım' olarak işaretleyene kadar her hafta soru bankasında vurgulanmaya devam eder.",
  },
  {
    question: "Uygulamayı güncellesem ilerleme bilgilerim kaybolur mu?",
    answer:
      "Hayır. Çalışma ilerlemeniz, tamamlanan konular, kayıtlı sorular ve istatistikler güvenli şekilde cihazında saklanır. Uygulama güncellemelerinden etkilenmez.",
  },
  {
    question: "Çalışma hatırlatmalarını özelleştirebilir miyim?",
    answer:
      "Evet. Tercihlerine uygun hatırlatma saatlerini Ayarlar sayfasından seçebilirsin. Uygulama bildirimler alarmlarla değil, sessiz push notification olarak iletilir.",
  },
  {
    question: "Deneme sınavı sonuçlarımı nasıl kaydedebilirim?",
    answer:
      "Ana sayfadaki 'Deneme' hızlı erişim butonundan veya Ayarlar'daki 'Deneme Takibi' seçeneğinden Deneme Sınavı Takip sayfasına ulaşabilirsin. TYT ve AYT için ayrı ayrı net sayılarını kaydedebilirsin.",
  },
  {
    question: "AI Çalışma Koçu nasıl çalışıyor?",
    answer:
      "AI Koç, gerçek çalışma verilerini (tamamlanan konular, çalışma serisi, soru bankası, oturum planları) analiz ederek kişiselleştirilmiş öneriler oluşturur. İnternet bağlantısı gerektirmez — tüm hesaplamalar cihazında yapılır.",
  },
  {
    question: "Soru bankasına fotoğraf ve PDF ekleyebilir miyim?",
    answer:
      "Evet. Soru bankasına soru eklerken galeriden fotoğraf, kamerayla anlık çekim veya PDF dosyası ekleyebilirsin. Ayrıca neden yanlış yaptığına dair yazılı not da ekleyebilirsin.",
  },
];

function FAQItem({ item, index, colors }: {
  item: typeof FAQ_ITEMS[0];
  index: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [open, setOpen] = useState(false);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  function toggle() {
    if (open) {
      height.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    } else {
      height.value = withTiming(999, { duration: 350 });
      opacity.value = withTiming(1, { duration: 300 });
    }
    setOpen((o) => !o);
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: open ? colors.primary + "30" : colors.border }]}>
        <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.faqHeader}>
          <View style={[styles.faqNum, { backgroundColor: open ? colors.primary : colors.secondary }]}>
            <Text style={[styles.faqNumText, { color: open ? "#fff" : colors.primary }]}>S{index + 1}</Text>
          </View>
          <Text style={[styles.faqQuestion, { color: colors.foreground }]}>{item.question}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Animated.View style={contentStyle}>
          <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
            <Text style={[styles.faqAnswerText, { color: colors.mutedForeground }]}>{item.answer}</Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function FAQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Sık Sorulan Sorular</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
          <Ionicons name="help-circle" size={28} color="#fff" />
          <View>
            <Text style={styles.heroTitle}>Nasıl yardımcı olabiliriz?</Text>
            <Text style={styles.heroSub}>{FAQ_ITEMS.length} sık sorulan soru</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.list}>
        {FAQ_ITEMS.map((item, i) => (
          <FAQItem key={i} item={item} index={i} colors={colors} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroBanner: {
    borderRadius: 18, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  heroTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  list: { gap: 12 },
  faqCard: {
    borderRadius: 16, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  faqHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  faqNum: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  faqNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  faqQuestion: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 20 },
  faqAnswer: { borderTopWidth: 1, padding: 16, paddingTop: 14 },
  faqAnswerText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
