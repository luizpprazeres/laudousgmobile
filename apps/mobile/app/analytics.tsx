import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageHeader } from "@/ui/PageHeader";
import { C, FONT } from "@/ui/tokens";

const KPIS = [
  { val: "142", label: "laudos no mês", sub: "+18% vs. abril" },
  { val: "3,4h", label: "tempo economizado", sub: "vs. digitar manual" },
  { val: "94%", label: "taxa de aprovação", sub: "pós-revisão" },
  { val: "2,8s", label: "geração média", sub: "por laudo" },
];

const BARS = [40, 65, 85, 50, 95, 70, 30];
const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

const CATS_DATA = [
  { name: "Obstétrica", color: "#EC4899", count: 58, pct: 41 },
  { name: "Abdome Total", color: "#059669", count: 32, pct: 22 },
  { name: "Tireoide", color: "#0EA5E9", count: 24, pct: 17 },
  { name: "Mamária", color: "#F43F5E", count: 18, pct: 13 },
  { name: "Outros", color: "#9CA3AF", count: 10, pct: 7 },
];

const BAR_CHART_HEIGHT = 110;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <PageHeader title="Analytics" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 4,
          paddingHorizontal: 16,
          paddingBottom: 32 + insets.bottom,
        }}
      >
        {/* Este mês — KPIs grid 2x2 */}
        <Text style={styles.sectionHeader}>Este mês</Text>
        <View style={styles.kpiGrid}>
          {KPIS.map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{k.val}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiSub}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* Esta semana — bar chart */}
        <Text style={[styles.sectionHeader, { marginTop: 22 }]}>Esta semana</Text>
        <View style={styles.chartCard}>
          <View style={styles.barsRow}>
            {BARS.map((h, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: (h / 100) * BAR_CHART_HEIGHT,
                        backgroundColor: i === 4 ? C.brand : C.fill1,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartFooter}>
            <Text style={styles.chartFooterLabel}>Pico na sexta</Text>
            <Text style={styles.chartFooterValue}>19 laudos</Text>
          </View>
        </View>

        {/* Top especialidades */}
        <Text style={[styles.sectionHeader, { marginTop: 22 }]}>
          Top especialidades
        </Text>
        <View style={styles.catsCard}>
          {CATS_DATA.map((c, i) => (
            <View
              key={c.name}
              style={[
                styles.catRow,
                i < CATS_DATA.length - 1 && styles.catRowDivider,
              ]}
            >
              <View style={[styles.catBullet, { backgroundColor: c.color }]} />
              <Text style={styles.catName}>{c.name}</Text>
              <Text style={styles.catCount}>{c.count}</Text>
              <Text style={styles.catPct}>{c.pct}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    color: C.textSec,
    fontFamily: FONT.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
    marginHorizontal: 6,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    backgroundColor: C.card,
    padding: 14,
    borderRadius: 14,
    flexBasis: "48%",
    flexGrow: 1,
  },
  kpiVal: {
    fontFamily: FONT.displayBold,
    fontSize: 28,
    color: C.text,
    lineHeight: 28,
    letterSpacing: -0.7,
  },
  kpiLabel: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 4,
    fontFamily: FONT.medium,
  },
  kpiSub: {
    fontSize: 10.5,
    color: C.textMute,
    marginTop: 4,
    fontFamily: FONT.body,
  },
  chartCard: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 14,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    height: BAR_CHART_HEIGHT + 22, // chart + day labels gap
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barTrack: {
    width: "100%",
    height: BAR_CHART_HEIGHT,
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
  },
  barDay: {
    fontSize: 10,
    color: C.textSec,
    fontFamily: FONT.medium,
  },
  chartFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
  },
  chartFooterLabel: {
    fontSize: 11,
    color: C.textSec,
    fontFamily: FONT.body,
  },
  chartFooterValue: {
    fontSize: 11,
    color: C.brand,
    fontFamily: FONT.semibold,
  },
  catsCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  catRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  catBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    fontFamily: FONT.medium,
  },
  catCount: {
    fontSize: 14,
    color: C.text,
    fontFamily: FONT.semibold,
    fontVariant: ["tabular-nums"],
  },
  catPct: {
    fontSize: 12,
    color: C.textSec,
    minWidth: 32,
    textAlign: "right",
    fontFamily: FONT.body,
  },
});
