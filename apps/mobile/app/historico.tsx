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
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState } from "@/ui/EmptyState";
import { Chevron, Folder, Search } from "@/ui/icons";
import { CATS, FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { supabase } from "@/lib/supabase";

type ReportRow = {
  id: string;
  category_code: string;
  status: "draft" | "awaiting_clarify" | "generated" | "blocked" | "published" | "discarded";
  generated_output: string | null;
  final_output: string | null;
  raw_input: string;
  created_at: string;
};

type Group = {
  title: string;
  items: ReportRow[];
};

const CATEGORY_MAP = new Map(CATS.map((cat) => [cat.id, cat]));

function withAlpha(hex: string) {
  return hex + "22";
}

export default function HistoricoScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: sbError } = await supabase
        .from("reports")
        .select("id, category_code, status, generated_output, final_output, raw_input, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!alive) return;
      if (sbError) {
        setError(sbError.message);
        setReports([]);
      } else {
        setReports((data ?? []) as ReportRow[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const groups = useMemo(() => groupReports(reports), [reports]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.brand} />
        <Text style={styles.centerText}>Carregando histórico...</Text>
      </View>
    );
  }

  if (reports.length === 0 && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <PageHeader title="Histórico" />
        <EmptyState
          icon={<Folder size={28} color={t.brand} />}
          title="Nenhum laudo ainda"
          message={'Nenhum laudo ainda. Toque em "Gerar laudo" pra começar.'}
          action={{
            label: "Gerar laudo",
            onPress: () => router.push("/generate"),
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Histórico" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        <View style={styles.searchWrap}>
          <View style={styles.searchPill}>
            <Search size={16} color={t.textMute} />
            <Text style={styles.searchText}>Últimos 50 laudos da sua conta</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Erro ao carregar histórico</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.title}>
            <Text style={styles.groupHeader}>{group.title}</Text>
            <View style={styles.list}>
              {group.items.map((report, index) => {
                const cat = categoryFor(report.category_code);
                const text = report.final_output || report.generated_output || report.raw_input;
                return (
                  <Pressable
                    key={report.id}
                    onPress={() => router.push(`/report/${report.id}`)}
                    style={({ pressed }) => [
                      styles.row,
                      index < group.items.length - 1 && styles.rowDivider,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: withAlpha(cat.color) },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: cat.color }]}>
                        {cat.label[0]}
                      </Text>
                    </View>

                    <View style={styles.rowMain}>
                      <Text style={styles.patient} numberOfLines={1}>
                        {cat.label}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {excerpt(text)}
                      </Text>
                    </View>

                    <View style={styles.rowRight}>
                      <Text style={styles.time}>{relativeTime(report.created_at)}</Text>
                      <Text style={[styles.badge, badgeStyle(report.status, t)]}>
                        {statusLabel(report.status)}
                      </Text>
                    </View>

                    <Chevron color={t.textGhost} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function categoryFor(code: string) {
  return (
    CATEGORY_MAP.get(code as (typeof CATS)[number]["id"]) ?? {
      id: code,
      label: code.replaceAll("_", " "),
      color: "#9CA3AF",
      sub: "",
    }
  );
}

function groupReports(reports: ReportRow[]): Group[] {
  const buckets: Group[] = [
    { title: "Hoje", items: [] },
    { title: "Ontem", items: [] },
    { title: "Últimos 7 dias", items: [] },
    { title: "Anteriores", items: [] },
  ];
  const now = startOfDay(new Date());
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const report of reports) {
    const day = startOfDay(new Date(report.created_at));
    if (day.getTime() === now.getTime()) buckets[0].items.push(report);
    else if (day.getTime() === yesterday.getTime()) buckets[1].items.push(report);
    else if (day >= weekAgo) buckets[2].items.push(report);
    else buckets[3].items.push(report);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function excerpt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Sem texto registrado";
  return clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
}

function relativeTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function statusLabel(status: ReportRow["status"]) {
  const labels: Record<ReportRow["status"], string> = {
    draft: "Draft",
    awaiting_clarify: "Draft",
    generated: "Done",
    blocked: "Blocked",
    published: "Done",
    discarded: "Draft",
  };
  return labels[status];
}

function badgeStyle(status: ReportRow["status"], t: ColorTokens) {
  if (status === "blocked") {
    return { backgroundColor: t.warningBg, color: t.warningText };
  }
  if (status === "generated" || status === "published") {
    return { backgroundColor: t.brandLight, color: t.brandDeep };
  }
  return { backgroundColor: t.fill1, color: t.textSec };
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
    searchWrap: {
      paddingTop: 6,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    searchPill: {
      backgroundColor: t.fill1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchText: {
      fontSize: 15,
      color: t.textMute,
      fontFamily: FONT.body,
    },
    errorCard: {
      backgroundColor: t.card,
      marginHorizontal: 12,
      borderRadius: 12,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.warningText,
    },
    errorTitle: {
      fontFamily: FONT.semibold,
      color: t.text,
      fontSize: 14,
    },
    errorText: {
      marginTop: 4,
      fontFamily: FONT.body,
      color: t.textSec,
      fontSize: 12,
    },
    groupHeader: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.semibold,
      paddingHorizontal: 22,
      paddingTop: 14,
      paddingBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    list: {
      backgroundColor: t.card,
      marginHorizontal: 12,
      borderRadius: 12,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    pressed: {
      opacity: 0.72,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarText: {
      fontFamily: FONT.bold,
      fontSize: 14,
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
    },
    patient: {
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.semibold,
    },
    meta: {
      fontSize: 12,
      color: t.textSec,
      marginTop: 1,
      fontFamily: FONT.body,
    },
    rowRight: {
      alignItems: "flex-end",
      gap: 3,
    },
    time: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.body,
      fontVariant: ["tabular-nums"],
    },
    badge: {
      fontSize: 9.5,
      fontFamily: FONT.bold,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      letterSpacing: 0.3,
      overflow: "hidden",
    },
  });
}
