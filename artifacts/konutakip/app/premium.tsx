/**
 * Premium screen — presented as a modal from settings or any PremiumGate CTA.
 *
 * Billing integration:
 *   ✓ Reads products dynamically from Google Play via useBilling()
 *   ✓ Shows real prices from Google Play (no hardcoded values)
 *   ✓ Upgrade button triggers real purchase flow
 *   ✓ Restore button triggers real restore flow
 *   ✓ Graceful handling: no internet, billing unavailable, cancelled, pending, error
 *   ✓ Loading skeleton while products are being fetched
 *   ✓ Friendly placeholder when products are unavailable
 */

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PREMIUM_COLOR } from "@/components/PremiumBadge";
import { useBilling } from "@/contexts/BillingContext";
import { useColors } from "@/hooks/useColors";
import { PRODUCT_IDS } from "@/utils/billing";
import { FEATURE_REGISTRY } from "@/utils/premium/FeatureRegistry";

// ─── Benefits data ────────────────────────────────────────────────────────────

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  ...FEATURE_REGISTRY.map((f) => ({
    icon: f.icon,
    title: f.title,
    description: f.description,
  })),
  {
    icon: "star",
    title: "Tüm Gelecek Özellikler",
    description: "Premium üyeler tüm yeni özelliklere öncelikli erişim kazanır.",
  },
];

// ─── Benefit row ──────────────────────────────────────────────────────────────

function BenefitRow({
  benefit,
  colors,
  index,
}: {
  benefit: Benefit;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(400)}>
      <View style={[styles.benefitRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.benefitIcon, { backgroundColor: PREMIUM_COLOR + "18" }]}>
          <Feather name={benefit.icon as never} size={18} color={PREMIUM_COLOR} />
        </View>
        <View style={styles.benefitText}>
          <Text style={[styles.benefitTitle, { color: colors.foreground }]}>
            {benefit.title}
          </Text>
          <Text
            style={[styles.benefitDesc, { color: colors.mutedForeground }]}
          >
            {benefit.description}
          </Text>
        </View>
        <Feather
          name="check-circle"
          size={18}
          color={PREMIUM_COLOR}
          style={styles.benefitCheck}
        />
      </View>
    </Animated.View>
  );
}

// ─── Price display ────────────────────────────────────────────────────────────

function PriceDisplay({
  price,
  isLoading,
  isAvailable,
  colors,
}: {
  price: string | null;
  isLoading: boolean;
  isAvailable: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (isLoading) {
    return (
      <View style={styles.priceLoadingWrap}>
        <ActivityIndicator size="small" color={PREMIUM_COLOR} />
      </View>
    );
  }
  if (!isAvailable || !price) {
    return (
      <View style={styles.priceUnavailableWrap}>
        <Text style={[styles.priceUnavailableText, { color: colors.mutedForeground }]}>
          —
        </Text>
      </View>
    );
  }
  // Split the price into currency symbol and amount for visual hierarchy.
  // If the price string starts with a currency symbol, display them separately.
  // Otherwise display the whole string as the amount.
  const match = price.match(/^([^\d\s,.]*)(.+)$/);
  const symbol = match?.[1] ?? "";
  const amount = match?.[2] ?? price;

  return (
    <View style={styles.priceWrap}>
      {symbol ? (
        <Text style={[styles.priceCurrency, { color: PREMIUM_COLOR }]}>{symbol}</Text>
      ) : null}
      <Text style={[styles.priceAmount, { color: PREMIUM_COLOR }]} numberOfLines={1}>
        {amount}
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    products,
    purchase,
    restore,
    isLoading: billingLoading,
    isConnected,
    error: billingError,
    clearError,
  } = useBilling();

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = Math.max(insets.bottom, 16) + 24;

  // Google Play Billing only works on Android. On other platforms show a
  // graceful unavailability note instead of broken purchase buttons.
  const isBillingPlatform = Platform.OS === "android";

  const monthlyProduct = products.find((p) => p.productId === PRODUCT_IDS.MONTHLY);
  const displayPrice = monthlyProduct?.localizedPrice ?? null;

  // Products are considered available when billing loaded without error and
  // we have at least one product to show.
  const productsAvailable = !billingLoading && products.length > 0;

  // Billing is unavailable when: wrong platform, not connected, or errored on load
  const billingUnavailable =
    !isBillingPlatform ||
    (!billingLoading && !isConnected && products.length === 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleUpgrade() {
    if (!isBillingPlatform || purchaseLoading || restoreLoading) return;
    clearError();
    setPurchaseLoading(true);
    try {
      await purchase(PRODUCT_IDS.MONTHLY);
    } finally {
      setPurchaseLoading(false);
    }
  }

  async function handleRestore() {
    if (!isBillingPlatform || purchaseLoading || restoreLoading) return;
    clearError();
    setRestoreLoading(true);
    try {
      const restored = await restore();
      if (restored) {
        router.back();
      }
    } finally {
      setRestoreLoading(false);
    }
  }

  const buttonsDisabled =
    billingLoading ||
    purchaseLoading ||
    restoreLoading ||
    billingUnavailable;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topPad + 16,
        paddingBottom: botPad,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Premium
          </Text>
          <View style={styles.headerSpacer} />
        </View>
      </Animated.View>

      {/* Hero card */}
      <Animated.View entering={FadeInDown.delay(60).duration(500)}>
        <View style={[styles.heroCard, { backgroundColor: PREMIUM_COLOR }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>
                KonuTakip Premium
              </Text>
              <Text style={styles.heroSub}>
                AI destekli çalışma deneyimi
              </Text>
            </View>
            <View
              style={[
                styles.heroIconWrap,
                { backgroundColor: "rgba(255,255,255,0.22)" },
              ]}
            >
              <Text style={styles.heroStar}>★</Text>
            </View>
          </View>
          <Text style={styles.heroBody}>
            Premium üyelikle AI özelliklerine, gelişmiş analitiğe ve çok daha
            fazlasına erişerek sınav hazırlığını bir üst seviyeye taşı.
          </Text>
        </View>
      </Animated.View>

      {/* Plan card */}
      <Animated.View entering={FadeInDown.delay(120).duration(500)}>
        <View
          style={[
            styles.planCard,
            { backgroundColor: colors.card, borderColor: PREMIUM_COLOR + "50" },
          ]}
        >
          <View style={styles.planHeader}>
            <View style={styles.planTextWrap}>
              <Text style={[styles.planName, { color: colors.foreground }]}>
                Aylık Abonelik
              </Text>
              <Text style={[styles.planBilling, { color: colors.mutedForeground }]}>
                Her ay otomatik yenilenir · İstediğin zaman iptal et
              </Text>
            </View>
            <PriceDisplay
              price={displayPrice}
              isLoading={billingLoading && isBillingPlatform}
              isAvailable={productsAvailable}
              colors={colors}
            />
          </View>

          <View style={[styles.planDivider, { backgroundColor: colors.border }]} />

          {/* Plan note — contextual based on billing state */}
          <View style={styles.planNote}>
            <Feather
              name={billingUnavailable ? "alert-circle" : "info"}
              size={13}
              color={colors.mutedForeground}
            />
            <Text
              style={[styles.planNoteText, { color: colors.mutedForeground }]}
            >
              {!isBillingPlatform
                ? "Google Play aboneliği yalnızca Android cihazlarda kullanılabilir."
                : billingLoading
                  ? "Fiyat bilgisi Google Play'den yükleniyor..."
                  : productsAvailable
                    ? "Google Play üzerinden güvenli ödeme · Türk Lirası cinsinden faturalanır"
                    : "Google Play bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin."}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Benefits list */}
      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          NELER DAHIL
        </Text>
        <View style={[styles.benefitsCard, { backgroundColor: colors.card }]}>
          {BENEFITS.map((benefit, index) => (
            <BenefitRow
              key={benefit.title}
              benefit={benefit}
              colors={colors}
              index={index}
            />
          ))}
        </View>
      </Animated.View>

      {/* Error banner */}
      {billingError && billingError.code !== "pending" && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <View
            style={[styles.errorBanner, { backgroundColor: colors.card, borderColor: "#ef444440" }]}
          >
            <Feather name="alert-triangle" size={14} color="#ef4444" style={styles.errorIcon} />
            <Text style={[styles.errorText, { color: "#ef4444" }]}>
              {billingError.message}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Pending purchase banner */}
      {billingError?.code === "pending" && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <View
            style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: PREMIUM_COLOR + "40" }]}
          >
            <Feather name="clock" size={14} color={PREMIUM_COLOR} style={styles.errorIcon} />
            <Text style={[styles.infoText, { color: PREMIUM_COLOR }]}>
              {billingError.message}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Upgrade button */}
      <Animated.View entering={FadeInDown.delay(280).duration(500)}>
        <TouchableOpacity
          style={[
            styles.upgradeBtn,
            { backgroundColor: PREMIUM_COLOR },
            buttonsDisabled && styles.btnDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleUpgrade}
          disabled={buttonsDisabled}
          accessibilityLabel="Premium'a geç"
          accessibilityRole="button"
        >
          {purchaseLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.upgradeBtnText}>
              {billingUnavailable && isBillingPlatform
                ? "Bağlanıyor..."
                : "★  Premium'a Geç"}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Restore button */}
      <Animated.View entering={FadeInDown.delay(320).duration(500)}>
        <TouchableOpacity
          style={[
            styles.restoreBtn,
            { borderColor: colors.border },
            buttonsDisabled && styles.btnDisabled,
          ]}
          activeOpacity={0.7}
          onPress={handleRestore}
          disabled={buttonsDisabled}
          accessibilityLabel="Satın alımları geri yükle"
          accessibilityRole="button"
        >
          {restoreLoading ? (
            <ActivityIndicator color={colors.mutedForeground} size="small" />
          ) : (
            <>
              <Feather name="refresh-cw" size={15} color={colors.mutedForeground} style={styles.restoreBtnIcon} />
              <Text style={[styles.restoreBtnText, { color: colors.mutedForeground }]}>
                Satın Alımları Geri Yükle
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Legal note */}
      <Animated.View entering={FadeInDown.delay(360).duration(500)}>
        <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
          {isBillingPlatform
            ? "Abonelik Google Play üzerinden yönetilir. İptal için Google Play Abonelikler sayfasını ziyaret et. Faturalama bir sonraki dönem başlamadan en az 24 saat önce iptal edilmezse otomatik olarak yenilenir."
            : "Abonelik yönetimi yalnızca Android cihazlarda kullanılabilir."}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerSpacer: { width: 40 },

  // Hero
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    gap: 12,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroTextWrap: { flex: 1, flexShrink: 1 },
  heroTitle: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    marginTop: 3,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroStar: { fontSize: 24, color: "#fff" },
  heroBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },

  // Plan card
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  planTextWrap: { flex: 1, flexShrink: 1 },
  planName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  planBilling: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    lineHeight: 16,
  },
  priceWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 2,
    flexShrink: 0,
  },
  priceCurrency: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  priceAmount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  priceLoadingWrap: {
    width: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  priceUnavailableWrap: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  priceUnavailableText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  planDivider: { height: 1, marginVertical: 12 },
  planNote: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  planNoteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },

  // Benefits
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.9,
    marginBottom: 8,
    paddingLeft: 4,
  },
  benefitsCard: {
    borderRadius: 16,
    marginBottom: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  benefitDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  benefitCheck: { flexShrink: 0 },

  // Error / info banners
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  errorIcon: { flexShrink: 0, marginTop: 1 },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },

  // Buttons
  upgradeBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 54,
    shadowColor: PREMIUM_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  restoreBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    minHeight: 50,
  },
  restoreBtnIcon: { flexShrink: 0 },
  restoreBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", flexShrink: 1 },
  btnDisabled: { opacity: 0.55 },

  // Legal
  legalNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
});
