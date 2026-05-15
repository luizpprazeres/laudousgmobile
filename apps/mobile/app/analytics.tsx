import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getMeAnalytics, type MeAnalytics } from "@/lib/api";
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState } from "@/ui/EmptyState";
import { Bar } from "@/ui/icons";
import { CATS, FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

const CATEGORY_COLORS = new Map(CATS.map((cat) => [cat.id, cat.color]));

export default function AnalyticsScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getMeAnalytics();
        if (alive) setData(result);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.brand} />
        <Text style={styles.centerText}>Carregando analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={styles.errorTitle}>Não foi possível carregar analytics</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data || data.total_reports === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <PageHeader title="Analytics" />
        <EmptyState
          icon={<Bar size={28} color={t.brand} />}
          title="Sem dados ainda"
          message="Faça seu primeiro laudo para começar a ver estatísticas reais da sua conta."
          action={{
            label: "Gerar laudo",
            onPress: () => router.push("/generate"),
          }}
        />
      </View>
    );
  }

  const kpis = [
    {
      value: formatNumber(data.total_reports),
      label: "laudos totais",
      sub: `${formatNumber(data.reports_last_30d)} nos últimos 30 dias`,
    },
    {
      value: formatNumber(data.reports_last_7d),
      label: "últimos 7 dias",
      sub: "produção recente",
    },
    {
      value: data.avg_latency_ms === null ? "-" : formatDuration(data.avg_latency_ms),
      label: "tempo médio",
      sub: "até finalizar a geração",
    },
    {
      value: `$${data.total_cost_usd.toFixed(4)}`,
      label: "custo estimado",
      sub: `${Math.round(data.edits_ratio * 100)}% com edição final`,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Analytics" />

      <ScrollView
        contentContainerStyle={{
          paddingTop: 4,
          paddingHorizontal: 16,
          paddingBottom: 32 + insets.bottom,
        }}
      >
        <Text style={styles.sectionHeader}>Sua produção</Text>
        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiSub}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeader, { marginTop: 22 }]}>
          Categorias mais usadas
        </Text>
        <View style={styles.catsCard}>
          {data.top_categories.length === 0 ? (
            <Text style={styles.emptyInline}>Nenhuma categoria registrada.</Text>
          ) : (
            data.top_categories.map((category, index) => (
              <View
                key={category.code}
                style={[
                  styles.catRow,
                  index < data.top_categories.length - 1 && styles.catRowDivider,
                ]}
              >
                <View
                  style={[
                    styles.catBullet,
                    {
                      backgroundColor:
                        CATEGORY_COLORS.get(
                          category.code as (typeof CATS)[number]["id"],
                        ) ?? "#9CA3AF",
                    },
                  ]}
                />
                <Text style={styles.catName}>{category.label}</Text>
                <Text style={styles.catCount}>{category.count}</Text>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push("/historico")}
          style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
        >
          <Text style={styles.linkTitle}>Ver laudos recentes</Text>
          <Text style={styles.linkText}>Abrir histórico completo da sua conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDuration(ms: number) {
  if (ms < 1_000) return `${ms}ms`;
  const seconds = Math.round(ms / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    centerText: {
      marginTop: 12,
      fontFamily: FONT.body,
      fontSize: 14,
      color: t.textSec,
    },
    errorTitle: {
      fontFamily: FONT.semibold,
      color: t.text,
      fontSize: 16,
      textAlign: "center",
    },
    errorText: {
      marginTop: 8,
      fontFamily: FONT.body,
      color: t.textSec,
      fontSize: 13,
      textAlign: "center",
    },
    sectionHeader: {
      fontSize: 12,
      color: t.textSec,
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
      backgroundColor: t.card,
      padding: 14,
      borderRadius: 14,
      flexBasis: "48%",
      flexGrow: 1,
    },
    kpiVal: {
      fontFamily: FONT.displayBold,
      fontSize: 28,
      color: t.text,
      lineHeight: 30,
    },
    kpiLabel: {
      fontSize: 12,
      color: t.textSec,
      marginTop: 4,
      fontFamily: FONT.medium,
    },
    kpiSub: {
      fontSize: 10.5,
      color: t.textMute,
      marginTop: 4,
      fontFamily: FONT.body,
    },
    catsCard: {
      backgroundColor: t.card,
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
      borderBottomColor: t.separator,
    },
    catBullet: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    catName: {
      flex: 1,
      fontSize: 14,
      color: t.text,
      fontFamily: FONT.medium,
    },
    catCount: {
      fontSize: 14,
      color: t.text,
      fontFamily: FONT.semibold,
      fontVariant: ["tabular-nums"],
    },
    emptyInline: {
      fontFamily: FONT.body,
      color: t.textSec,
      fontSize: 13,
      paddingVertical: 14,
    },
    linkCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 16,
      marginTop: 14,
    },
    pressed: {
      opacity: 0.72,
    },
    linkTitle: {
      fontFamily: FONT.semibold,
      color: t.text,
      fontSize: 14,
    },
    linkText: {
      fontFamily: FONT.body,
      color: t.textSec,
      fontSize: 12,
      marginTop: 3,
    },
  });
}
