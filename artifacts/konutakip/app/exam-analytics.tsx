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
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, MockExamResult } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

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

// Premium SVG line chart with filled area, highlighted max/min
function PremiumLineChart({ results, color, label, colors }: {
  results: MockExamResult[];
  color: string;
  label: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const CHART_W = width - 80;
  const CHART_H = 180;
  const PAD = { top: 28, bottom: 44, left: 14, right: 14 };
  const gradId = `grad_${color.replace("#", "")}`;

  if (results.length === 0) {
    return (
      <View style={[styles.emptyChart, { backgroundColor: colors.muted }]}>
        <Text style={[styles.emptyChartText, { color: colors.mutedForeground }]}>Henüz veri yok</Text>
      </View>
    );
  }

  const sorted = [...results].sort((a, b) => a.date.localeCompare(b.date));
  const totals = sorted.map((r) => r.totalNet);
  const maxVal = Math.max(...totals);
  const minVal = Math.min(...totals);
  const range = maxVal - minVal || 1;

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;

  const pts = sorted.map((r, i) => {
    const x = PAD.left + (sorted.length > 1 ? (i / (sorted.length - 1)) * plotW : plotW / 2);
    const y = PAD.top + (1 - (r.totalNet - minVal) / range) * plotH;
    return { x, y, val: r.totalNet, date: r.date.slice(5), name: r.name ?? "" };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${CHART_H - PAD.bottom} L ${pts[0].x} ${CHART_H - PAD.bottom} Z`
    : "";

  const gridYs = [PAD.top, PAD.top + plotH / 2, PAD.top + plotH];
  const gridVals = [maxVal, (maxVal + minVal) / 2, minVal];

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {gridYs.map((gy, i) => (
          <Line
            key={i}
            x1={PAD.left} y1={gy}
            x2={CHART_W - PAD.right} y2={gy}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4,4"
            opacity={0.7}
          />
        ))}

        {/* Y-axis labels */}
        {gridVals.map((v, i) => (
          <SvgText
            key={i}
            x={0}
            y={gridYs[i] + 4}
            fontSize={9}
            fill={colors.mutedForeground}
            fontFamily="Inter_400Regular"
          >
            {v.toFixed(0)}
          </SvgText>
        ))}

        {/* Area fill */}
        {pts.length > 1 && (
          <Path d={areaPath} fill={`url(#${gradId})`} />
        )}

        {/* Line */}
        {pts.length > 1 && (
          <Path
            d={linePath}
            stroke={color}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {pts.map((p, i) => {
          const isMax = p.val === maxVal && results.length > 1;
          const isMin = p.val === minVal && results.length > 1;
          const dotColor = isMax ? "#16A34A" : isMin ? "#DC2626" : color;
          const r = isMax || isMin ? 7 : 5;
          return (
            <React.Fragment key={i}>
              {/* Outer glow for max/min */}
              {(isMax || isMin) && (
                <Circle cx={p.x} cy={p.y} r={r + 5} fill={dotColor} opacity={0.15} />
              )}
              <Circle cx={p.x} cy={p.y} r={r} fill={dotColor} stroke="#fff" strokeWidth={2} />
              {/* Value label */}
              <SvgText
                x={p.x}
                y={p.y - r - 6}
                textAnchor="middle"
                fontSize={isMax || isMin ? 11 : 9}
                fill={dotColor}
                fontWeight={isMax || isMin ? "700" : "500"}
              >
                {p.val.toFixed(1)}
              </SvgText>
              {/* Date label */}
              <SvgText
                x={p.x}
                y={CHART_H - PAD.bottom + 14}
                textAnchor="middle"
                fontSize={9}
                fill={colors.mutedForeground}
              >
                {p.date}
              </SvgText>
              {/* Exam name (if available, truncated) */}
              {p.name ? (
                <SvgText
                  x={p.x}
                  y={CHART_H - PAD.bottom + 26}
                  textAnchor="middle"
                  fontSize={8}
                  fill={colors.mutedForeground}
                  opacity={0.7}
                >
                  {p.name.length > 8 ? p.name.slice(0, 8) + "…" : p.name}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      {results.length > 1 && (
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>En yüksek</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#DC2626" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>En düşük</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Diğer</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function SubjectBarChart({ data, color, colors }: {
  data: { label: string; values: number[] }[];
  color: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  if (data.length === 0) return null;
  const avgs = data.map((d) => avg(d.values));
  const maxAvg = Math.max(...avgs, 1);
  const BAR_H = 90;

  return (
    <View style={styles.barChart}>
      {data.map((d, i) => {
        const h = Math.max(6, (avgs[i] / maxAvg) * BAR_H);
        const isTop = avgs[i] === Math.max(...avgs);
        return (
          <View key={i} style={styles.barGroup}>
            <Text style={[styles.barAvg, { color: isTop ? "#16A34A" : color }]}>{avgs[i].toFixed(1)}</Text>
            <View style={[styles.barBg, { height: BAR_H, backgroundColor: colors.muted }]}>
              <View style={[styles.barFill, {
                height: h,
                backgroundColor: isTop ? "#16A34A" : color,
              }]} />
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

  // TYT trend: is improving?
  const tytTrend = useMemo(() => {
    if (tytResults.length < 2) return null;
    const last = tytResults[tytResults.length - 1].totalNet;
    const prev = tytResults[tytResults.length - 2].totalNet;
    return last - prev;
  }, [tytResults]);

  const aytTrend = useMemo(() => {
    if (aytResults.length < 2) return null;
    const last = aytResults[aytResults.length - 1].totalNet;
    const prev = aytResults[aytResults.length - 2].totalNet;
    return last - prev;
  }, [aytResults]);

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
              <StatSummaryCard title="En Yüksek TYT" value={highestTYT.toFixed(2)} color="#16A34A" colors={colors} />
              <StatSummaryCard title="En Yüksek AYT" value={highestAYT.toFixed(2)} color="#7C3AED" colors={colors} />
              <StatSummaryCard title="Ortalama TYT" value={avgTYT.toFixed(2)} color={colors.primary} colors={colors} />
              <StatSummaryCard title="Ortalama AYT" value={avgAYT.toFixed(2)} color="#7C3AED" colors={colors} />
              <StatSummaryCard title="En Düşük TYT" value={tytResults.length ? lowestTYT.toFixed(2) : "-"} color={colors.destructive} colors={colors} />
              <StatSummaryCard title="En Düşük AYT" value={aytResults.length ? lowestAYT.toFixed(2) : "-"} color={colors.destructive} colors={colors} />
              <StatSummaryCard title="Toplam TYT" value={String(tytResults.length)} sub="deneme" color={colors.primary} colors={colors} />
              <StatSummaryCard title="Toplam AYT" value={String(aytResults.length)} sub="deneme" color="#7C3AED" colors={colors} />
            </View>
          </Animated.View>

          {/* Trend indicators */}
          {(tytTrend !== null || aytTrend !== null) && (
            <Animated.View entering={FadeInDown.delay(80).duration(500)}>
              <View style={styles.trendRow}>
                {tytTrend !== null && (
                  <View style={[styles.trendCard, { backgroundColor: tytTrend >= 0 ? "#16A34A15" : "#DC262615", flex: 1 }]}>
                    <Ionicons
                      name={tytTrend >= 0 ? "trending-up-outline" : "trending-down-outline"}
                      size={20}
                      color={tytTrend >= 0 ? "#16A34A" : "#DC2626"}
                    />
                    <View>
                      <Text style={[styles.trendLabel, { color: colors.mutedForeground }]}>Son TYT</Text>
                      <Text style={[styles.trendValue, { color: tytTrend >= 0 ? "#16A34A" : "#DC2626" }]}>
                        {tytTrend >= 0 ? "+" : ""}{tytTrend.toFixed(2)} net
                      </Text>
                    </View>
                  </View>
                )}
                {tytTrend !== null && aytTrend !== null && <View style={{ width: 10 }} />}
                {aytTrend !== null && (
                  <View style={[styles.trendCard, { backgroundColor: aytTrend >= 0 ? "#16A34A15" : "#DC262615", flex: 1 }]}>
                    <Ionicons
                      name={aytTrend >= 0 ? "trending-up-outline" : "trending-down-outline"}
                      size={20}
                      color={aytTrend >= 0 ? "#16A34A" : "#DC2626"}
                    />
                    <View>
                      <Text style={[styles.trendLabel, { color: colors.mutedForeground }]}>Son AYT</Text>
                      <Text style={[styles.trendValue, { color: aytTrend >= 0 ? "#16A34A" : "#DC2626" }]}>
                        {aytTrend >= 0 ? "+" : ""}{aytTrend.toFixed(2)} net
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* TYT progression chart */}
          {tytResults.length > 0 && (
            <Animated.View entering={FadeInDown.delay(120).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>TYT Toplam Net Gelişimi</Text>
                  <View style={[styles.cardBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.cardBadgeText, { color: colors.primary }]}>{tytResults.length} deneme</Text>
                  </View>
                </View>
                <PremiumLineChart results={tytResults} color={colors.primary} label="TYT" colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* AYT progression chart */}
          {aytResults.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>AYT Toplam Net Gelişimi</Text>
                  <View style={[styles.cardBadge, { backgroundColor: "#7C3AED20" }]}>
                    <Text style={[styles.cardBadgeText, { color: "#7C3AED" }]}>{aytResults.length} deneme</Text>
                  </View>
                </View>
                <PremiumLineChart results={aytResults} color="#7C3AED" label="AYT" colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* TYT subject breakdown */}
          {tytSubjectData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>TYT Ders Bazlı Ortalama Net</Text>
                <SubjectBarChart data={tytSubjectData} color={colors.primary} colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* AYT subject breakdown */}
          {aytSubjectData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>AYT Ders Bazlı Ortalama Net</Text>
                <SubjectBarChart data={aytSubjectData} color="#7C3AED" colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* Insights */}
          {tytSubjectData.length > 0 && (
            <Animated.View entering={FadeInDown.delay(220).duration(500)}>
              <View style={styles.insightsRow}>
                {(() => {
                  const avgs = tytSubjectData.map((d) => ({ label: d.label, avg: avg(d.values) }));
                  const best = avgs.reduce((a, b) => a.avg > b.avg ? a : b);
                  const worst = avgs.reduce((a, b) => a.avg < b.avg ? a : b);
                  return (
                    <>
                      <View style={[styles.insightCard, { backgroundColor: "#16A34A15", flex: 1 }]}>
                        <Ionicons name="trophy-outline" size={20} color="#16A34A" />
                        <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>TYT'de En İyi</Text>
                        <Text style={[styles.insightValue, { color: colors.foreground }]}>{best.label}</Text>
                        <Text style={[styles.insightAvg, { color: "#16A34A" }]}>ort. {best.avg.toFixed(2)}</Text>
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
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  summaryCard: {
    width: (width - 50) / 2, borderRadius: 16, padding: 14, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  summaryDot: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  summaryDotInner: { width: 8, height: 8, borderRadius: 4 },
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryTitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  summarySub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  trendRow: { flexDirection: "row", marginBottom: 16 },
  trendCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14 },
  trendLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  trendValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  card: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  cardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  cardBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyChart: { borderRadius: 12, padding: 24, alignItems: "center", justifyContent: "center" },
  emptyChartText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  chartLegend: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  barChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 140 },
  barGroup: { alignItems: "center", gap: 5, flex: 1 },
  barAvg: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  barBg: { width: "55%", borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { borderRadius: 8, minHeight: 6 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
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
