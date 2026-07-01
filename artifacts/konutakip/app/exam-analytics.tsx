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

import { useApp, MockExamResult } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");
const CHART_HEIGHT = 120;
const CHART_PAD = 20;

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function StatSummaryCard({ title, value, sub, color, colors }: {
  title: string; value: string; sub?: string; color: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
      <View style={[styles.summaryDot, { backgroundColor: color + "25" }]}>
        <View style={[styles.summaryDotInner, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {sub ? <Text style={[styles.summarySub, { color }]}>{sub}</Text> : null}
    </View>
  );
}

function TotalNetChart({ results, color, colors }: {
  results: MockExamResult[]; color: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (results.length === 0) return (
    <View style={[styles.emptyChart, { backgroundColor: colors.muted }]}>
      <Text style={[styles.emptyChartText, { color: colors.mutedForeground }]}>Henüz veri yok</Text>
    </View>
  );

  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date));
  const totals = sorted.map((r) => r.totalNet);
  const maxVal = Math.max(...totals, 1);
  const minVal = Math.min(...totals, 0);
  const range = maxVal - minVal || 1;
  const chartW = width - 80 - CHART_PAD * 2;
  const stepX = results.length > 1 ? chartW / (results.length - 1) : chartW / 2;

  const points = sorted.map((r, i) => ({
    x: results.length > 1 ? i * stepX : chartW / 2,
    y: CHART_HEIGHT - ((r.totalNet - minVal) / range) * (CHART_HEIGHT - 16),
    total: r.totalNet,
    date: r.date.slice(5),
  }));

  const polyline = points.map((p) => `${p.x + CHART_PAD},${p.y}`).join(" ");

  return (
    <View>
      <View style={[styles.lineChart, { height: CHART_HEIGHT + 30 }]}>
        {/* Y-axis guides */}
        {[0, 0.5, 1].map((pct) => (
          <View key={pct} style={[styles.yGuide, { top: pct * CHART_HEIGHT, left: 0, right: 0, borderColor: colors.border }]} />
        ))}
        {/* Dots and labels */}
        {points.map((p, i) => (
          <View key={i} style={[styles.chartDot, { left: p.x + CHART_PAD - 4, top: p.y - 4, backgroundColor: color }]} />
        ))}
        {/* X labels */}
        <View style={[styles.xLabels, { top: CHART_HEIGHT + 4 }]}>
          {points.map((p, i) => (
            <Text key={i} style={[styles.xLabel, { color: colors.mutedForeground, left: p.x + CHART_PAD - 14 }]}>{p.date}</Text>
          ))}
        </View>
      </View>
      <View style={styles.dotValues}>
        {points.map((p, i) => (
          <Text key={i} style={[styles.dotValue, { color }]}>{p.total.toFixed(1)}</Text>
        ))}
      </View>
    </View>
  );
}

function SubjectBarChart({ data, color, colors }: {
  data: { label: string; values: number[] }[]; color: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (data.length === 0) return null;
  const avgs = data.map((d) => avg(d.values));
  const maxAvg = Math.max(...avgs, 1);
  const BAR_H = 80;

  return (
    <View style={styles.barChart}>
      {data.map((d, i) => {
        const h = Math.max(4, (avgs[i] / maxAvg) * BAR_H);
        return (
          <View key={i} style={styles.barGroup}>
            <Text style={[styles.barAvg, { color }]}>{avgs[i].toFixed(1)}</Text>
            <View style={[styles.barBg, { height: BAR_H, backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { height: h, backgroundColor: color }]} />
            </View>
            <Text style={[styles.barLabel, { color: colors.mutedForeground }]} numberOfLines={2}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ExamAnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mockExamResults, profile } = useApp();

  const tytResults = useMemo(() => mockExamResults.filter((r) => r.type === "TYT").sort((a, b) => a.date.localeCompare(b.date)), [mockExamResults]);
  const aytResults = useMemo(() => mockExamResults.filter((r) => r.type === "AYT").sort((a, b) => a.date.localeCompare(b.date)), [mockExamResults]);

  const highestTYT = tytResults.length ? Math.max(...tytResults.map((r) => r.totalNet)) : 0;
  const lowestTYT = tytResults.length ? Math.min(...tytResults.map((r) => r.totalNet)) : 0;
  const avgTYT = avg(tytResults.map((r) => r.totalNet));
  const highestAYT = aytResults.length ? Math.max(...aytResults.map((r) => r.totalNet)) : 0;
  const lowestAYT = aytResults.length ? Math.min(...aytResults.map((r) => r.totalNet)) : 0;
  const avgAYT = avg(aytResults.map((r) => r.totalNet));

  const tytSubjectData = useMemo(() => {
    if (!tytResults.length) return [];
    return [
      { label: "Türkçe", values: tytResults.map((r) => r.turkishNet) },
      { label: "Matematik", values: tytResults.map((r) => r.mathNet) },
      { label: "Fen Bil.", values: tytResults.map((r) => r.scienceNet) },
      { label: "Sosyal", values: tytResults.map((r) => r.socialNet) },
    ];
  }, [tytResults]);

  const aytSubjectData = useMemo(() => {
    if (!aytResults.length) return [];
    const fieldNetKeys = Object.keys(aytResults[0]?.fieldNets ?? {});
    return fieldNetKeys.map((k) => ({
      label: k.length > 10 ? k.slice(0, 10) + "…" : k,
      values: aytResults.map((r) => r.fieldNets[k] ?? 0),
    }));
  }, [aytResults]);

  // Monthly trend
  const monthlyTYT = useMemo(() => {
    const byMonth: Record<string, number[]> = {};
    for (const r of tytResults) {
      const m = r.date.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(r.totalNet);
    }
    return Object.entries(byMonth).sort().map(([month, vals]) => ({ label: month.slice(5), avg: avg(vals) }));
  }, [tytResults]);

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
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Deneme Analizi</Text>
          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      {mockExamResults.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.empty, { backgroundColor: colors.card }]}>
          <Ionicons name="bar-chart-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Henüz deneme verisi yok</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Deneme sonuçlarını kaydettikçe grafikler burada görünür</Text>
          <TouchableOpacity onPress={() => router.replace("/mock-exams")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Deneme Ekle</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <>
          {/* Summary stats */}
          <Animated.View entering={FadeInDown.delay(60).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Özet İstatistikler</Text>
            <View style={styles.summaryGrid}>
              <StatSummaryCard title="En Yüksek TYT" value={highestTYT.toFixed(2)} color={colors.success} colors={colors} />
              <StatSummaryCard title="En Yüksek AYT" value={highestAYT.toFixed(2)} color="#7C3AED" colors={colors} />
              <StatSummaryCard title="Ortalama TYT" value={avgTYT.toFixed(2)} color={colors.primary} colors={colors} />
              <StatSummaryCard title="Ortalama AYT" value={avgAYT.toFixed(2)} color="#7C3AED" colors={colors} />
              <StatSummaryCard title="En Düşük TYT" value={tytResults.length ? lowestTYT.toFixed(2) : "-"} color={colors.destructive} colors={colors} />
              <StatSummaryCard title="En Düşük AYT" value={aytResults.length ? lowestAYT.toFixed(2) : "-"} color={colors.destructive} colors={colors} />
              <StatSummaryCard title="Toplam TYT" value={String(tytResults.length)} sub="deneme" color={colors.primary} colors={colors} />
              <StatSummaryCard title="Toplam AYT" value={String(aytResults.length)} sub="deneme" color="#7C3AED" colors={colors} />
            </View>
          </Animated.View>

          {/* TYT Total Net progression */}
          {tytResults.length > 0 && (
            <Animated.View entering={FadeInDown.delay(120).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>TYT Toplam Net Gelişimi</Text>
                <TotalNetChart results={tytResults} color={colors.primary} colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* AYT Total Net progression */}
          {aytResults.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>AYT Toplam Net Gelişimi</Text>
                <TotalNetChart results={aytResults} color="#7C3AED" colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* TYT Subject breakdown */}
          {tytSubjectData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>TYT Ders Bazlı Ortalama Net</Text>
                <SubjectBarChart data={tytSubjectData} color={colors.primary} colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* AYT Subject breakdown */}
          {aytSubjectData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>AYT Ders Bazlı Ortalama Net</Text>
                <SubjectBarChart data={aytSubjectData} color="#7C3AED" colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* Monthly trend */}
          {monthlyTYT.length > 1 && (
            <Animated.View entering={FadeInDown.delay(220).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Aylık TYT Net Ortalaması</Text>
                <View style={styles.monthlyRow}>
                  {monthlyTYT.map((m, i) => {
                    const maxA = Math.max(...monthlyTYT.map((x) => x.avg), 1);
                    const h = Math.max(4, (m.avg / maxA) * 80);
                    return (
                      <View key={i} style={styles.monthlyBar}>
                        <Text style={[styles.monthlyAvg, { color: colors.primary }]}>{m.avg.toFixed(0)}</Text>
                        <View style={[styles.monthlyBarBg, { height: 80, backgroundColor: colors.border }]}>
                          <View style={[styles.monthlyBarFill, { height: h, backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.monthlyLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Best / Worst per subject */}
          {tytSubjectData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(240).duration(500)}>
              <View style={styles.insightsRow}>
                {(() => {
                  const avgs = tytSubjectData.map((d) => ({ label: d.label, avg: avg(d.values) }));
                  const best = avgs.reduce((a, b) => a.avg > b.avg ? a : b);
                  const worst = avgs.reduce((a, b) => a.avg < b.avg ? a : b);
                  return (
                    <>
                      <View style={[styles.insightCard, { backgroundColor: colors.success + "15", flex: 1 }]}>
                        <Ionicons name="trophy-outline" size={20} color={colors.success} />
                        <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>TYT'de En İyi</Text>
                        <Text style={[styles.insightValue, { color: colors.foreground }]}>{best.label}</Text>
                        <Text style={[styles.insightAvg, { color: colors.success }]}>ort. {best.avg.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.insightCard, { backgroundColor: colors.warning + "15", flex: 1 }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
                        <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>Gelişim Gereken</Text>
                        <Text style={[styles.insightValue, { color: colors.foreground }]}>{worst.label}</Text>
                        <Text style={[styles.insightAvg, { color: colors.warning }]}>ort. {worst.avg.toFixed(2)}</Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 14 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  summaryCard: {
    width: (width - 50) / 2, borderRadius: 16, padding: 14, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryDot: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  summaryDotInner: { width: 8, height: 8, borderRadius: 4 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryTitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  summarySub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 16 },
  lineChart: { position: "relative", marginBottom: 4 },
  yGuide: { position: "absolute", height: 1, borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed" },
  chartDot: { position: "absolute", width: 8, height: 8, borderRadius: 4 },
  xLabels: { position: "absolute", left: 0, right: 0, flexDirection: "row" },
  xLabel: { position: "absolute", fontSize: 9, fontFamily: "Inter_400Regular" },
  dotValues: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  dotValue: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  barChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 130 },
  barGroup: { alignItems: "center", gap: 4, flex: 1 },
  barAvg: { fontSize: 10, fontFamily: "Inter_500Medium" },
  barBg: { width: "55%", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  monthlyRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 110 },
  monthlyBar: { alignItems: "center", gap: 4, flex: 1 },
  monthlyAvg: { fontSize: 10, fontFamily: "Inter_500Medium" },
  monthlyBarBg: { width: "50%", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  monthlyBarFill: { borderRadius: 6, minHeight: 4 },
  monthlyLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  insightsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  insightCard: { borderRadius: 16, padding: 16, gap: 5 },
  insightLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  insightValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  insightAvg: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { borderRadius: 20, padding: 40, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 12, marginTop: 6 },
});
