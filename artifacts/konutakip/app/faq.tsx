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
    answer: "Tamamladığın her konu, ilgili TYT veya AYT ilerleme yüzdesini otomatik olarak günceller.",
  },
  {
    question: "Çalışma alanımı sonradan değiştirebilir miyim?",
    answer: "Evet. Ayarlar bölümünden çalışma alanını değiştirebilirsin. AYT dersleri ve ilerleme hesaplamaları yeni alanına göre güncellenir.",
  },
  {
    question: "Tekrar hatırlatmaları nasıl çalışıyor?",
    answer: "Kaydettiğin yanlış sorular tekrar sistemine girer. Tekrar zamanı gelen sorular sana yeniden çalışman için gösterilir.",
  },
  {
    question: "Uygulamayı güncellersem bilgilerim kaybolur mu?",
    answer: "Hayır. Tamamlanan konuların, planların ve soru kayıtların normal uygulama güncellemelerinden etkilenmez.",
  },
  {
    question: "Çalışma hatırlatmalarını özelleştirebilir miyim?",
    answer: "Evet. Ayarlar bölümünden bildirim günlerini ve saatlerini değiştirebilirsin.",
  },
  {
    question: "Deneme sonuçlarımı nasıl kaydedebilirim?",
    answer: "Ana sayfadaki Deneme butonundan TYT ve AYT sonuçlarını ayrı ayrı kaydedebilir ve gelişimini takip edebilirsin.",
  },
  {
    question: "AI Çalışma Koçu nasıl çalışıyor?",
    answer: "AI Koç, çalışma verilerini inceleyerek eksiklerin ve hedeflerin doğrultusunda kişisel öneriler oluşturur.",
  },
  {
    question: "Soru bankasına fotoğraf ve PDF ekleyebilir miyim?",
    answer: "Evet. Galeriden görsel, kameradan fotoğraf veya PDF dosyası ekleyebilirsin.",
  },
  {
    question: "Neden Premium olmalıyım?",
    answer: "Premium; AI Öğretmen, fotoğraf ve PDF analizi ile gelişmiş çalışma araçlarına erişim sağlar. Anlamadığın sorularda hızlı ve kişisel destek alırsın.",
  },
  {
    question: "Premium üyeliğin avantajları nelerdir?",
    answer: "AI destekli konu anlatımı, adım adım soru çözümü, görsel analizi, PDF inceleme ve yeni Premium özelliklere öncelikli erişim sunar.",
  },
  {
    question: "AI Öğretmen neler yapabilir?",
    answer: "Konu anlatabilir, soruları çözebilir, yanlışlarını açıklayabilir, yüklediğin görselleri analiz edebilir ve istediğinde mini test hazırlayabilir.",
  },
  {
    question: "Fotoğraf analizi nasıl çalışıyor?",
    answer: "Kamera veya galeriden soru görseli yüklediğinde AI Öğretmen görseli inceleyerek soruyu adım adım açıklar.",
  },
  {
    question: "PDF analizi nasıl çalışıyor?",
    answer: "Metin içeren PDF dosyaları okunarak analiz edilir. Taranmış PDF'lerde ilgili sayfanın ekran görüntüsünü yüklemek daha iyi sonuç verir.",
  },
  {
    question: "AI Öğretmen her cevapta mini test oluşturur mu?",
    answer: "Hayır. Mini test yalnızca açıkça istediğinde hazırlanır.",
  },
  {
    question: "Premium üyelik nasıl etkinleşir?",
    answer: "Google Play satın almayı onayladığında Premium özellikler uygulama içinde otomatik olarak açılır.",
  },
  {
    question: "Satın alımımı geri yükleyebilir miyim?",
    answer: "Evet. Premium ekranındaki Satın Alımları Geri Yükle seçeneğini kullanabilirsin.",
  },
  {
    question: "Premium aboneliğimi iptal edebilir miyim?",
    answer: "Evet. Aboneliğini Google Play Abonelikler bölümünden istediğin zaman iptal edebilirsin.",
  },
  {
    question: "Premium satın alma güvenli mi?",
    answer: "Evet. Ödeme Google Play tarafından gerçekleştirilir. KonuTakip kart veya ödeme bilgilerini saklamaz.",
  },
  {
    question: "Premium başka cihazda çalışır mı?",
    answer: "Aynı Google Play hesabıyla giriş yapıp Satın Alımları Geri Yükle seçeneğini kullanabilirsin.",
  },
  {
    question: "Premium özellikleri internet gerektirir mi?",
    answer: "AI Öğretmen, görsel ve PDF analizi internet gerektirir. Temel konu takip özellikleri çevrimdışı kullanılabilir.",
  },
];

function FAQItem({ item, index, colors }: {
  item: typeof FAQ_ITEMS[0];
  index: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(350)}>
      <View
        style={[
          styles.faqCard,
          {
            backgroundColor: colors.card,
            borderColor: open ? colors.primary + "30" : colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setOpen((current) => !current)}
          activeOpacity={0.8}
          style={styles.faqHeader}
        >
          <View
            style={[
              styles.faqNum,
              { backgroundColor: open ? colors.primary : colors.secondary },
            ]}
          >
            <Text
              style={[
                styles.faqNumText,
                { color: open ? "#fff" : colors.primary },
              ]}
            >
              S{index + 1}
            </Text>
          </View>

          <Text style={[styles.faqQuestion, { color: colors.foreground }]}>
            {item.question}
          </Text>

          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {open ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <View
              style={[
                styles.faqAnswer,
                { borderTopColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.faqAnswerText,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.answer}
              </Text>
            </View>
          </Animated.View>
        ) : null}
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
  faqAnswer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  faqAnswerText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
