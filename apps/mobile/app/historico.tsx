import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState } from "@/ui/EmptyState";
import { Chevron, Folder, Search, Send } from "@/ui/icons";
import { CATS, FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { supabase } from "@/lib/supabase";
import { pushReportToSala } from "@/lib/api";
import { stripReviewMarkers } from "@/features/generate/reviewMarkers";

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

type DateRange = "all" | "today" | "7d" | "30d";

const RANGES: Array<{ value: DateRange; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

const CATEGORY_MAP = new Map(CATS.map((cat) => [cat.id, cat]));

function withAlpha(hex: string) {
  return hex + "22";
}

/** Busca sem acentos/caixa (pt-BR). */
function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function HistoricoScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros (paridade iOS HistoryFilterBar)
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRange>("all");
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());

  // Multi-seleção (paridade iOS multi-delete)
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Feedback do envio p/ Sala
  const [salaMsg, setSalaMsg] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);

  async function load() {
    setError(null);
    const { data, error: sbError } = await supabase
      .from("reports")
      .select(
        "id, category_code, status, generated_output, final_output, raw_input, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (sbError) {
      setError(sbError.message);
      setReports([]);
    } else {
      setReports((data ?? []) as ReportRow[]);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Categorias presentes nos laudos carregados (chips de filtro)
  const availableCats = useMemo(() => {
    const codes = [...new Set(reports.map((r) => r.category_code))];
    return codes.map((code) => categoryFor(code));
  }, [reports]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const now = Date.now();
    const rangeMs: Record<DateRange, number> = {
      all: Infinity,
      today: 0, // tratado abaixo (startOfDay)
      "7d": 7 * 24 * 3600_000,
      "30d": 30 * 24 * 3600_000,
    };
    const todayStart = startOfDay(new Date()).getTime();

    return reports.filter((r) => {
      if (range === "today") {
        if (new Date(r.created_at).getTime() < todayStart) return false;
      } else if (range !== "all") {
        if (now - new Date(r.created_at).getTime() > rangeMs[range]) return false;
      }
      if (catFilter.size > 0 && !catFilter.has(r.category_code)) return false;
      if (q) {
        const cat = categoryFor(r.category_code);
        const haystack = normalize(
          `${cat.label} ${r.category_code} ${r.final_output ?? ""} ${r.generated_output ?? ""} ${r.raw_input}`,
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, query, range, catFilter]);

  const groups = useMemo(() => groupReports(filtered), [filtered]);
  const hasFilters = query.trim() !== "" || range !== "all" || catFilter.size > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((r) => r.id)));
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  function confirmDelete() {
    if (selected.size === 0 || deleting) return;
    Alert.alert(
      `Excluir ${selected.size} laudo(s)?`,
      "Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const ids = [...selected];
            const { error: delError } = await supabase
              .from("reports")
              .delete()
              .in("id", ids);
            setDeleting(false);
            if (delError) {
              Alert.alert("Erro ao excluir", delError.message);
              return;
            }
            setReports((prev) => prev.filter((r) => !selected.has(r.id)));
            exitSelection();
          },
        },
      ],
    );
  }

  async function pushToSala(reportId: string) {
    if (pushingId) return;
    setPushingId(reportId);
    try {
      await pushReportToSala(reportId);
      setSalaMsg("Laudo enviado para a Sala do Auxiliar.");
    } catch {
      setSalaMsg("Falha ao enviar para a Sala. Verifique a sessão de turno.");
    } finally {
      setPushingId(null);
      setTimeout(() => setSalaMsg(null), 3500);
    }
  }

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

      <ScrollView
        contentContainerStyle={{
          paddingBottom: (selecting ? 96 : 32) + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.brand}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchWrap}>
          <View style={styles.searchPill}>
            <Search size={16} color={t.textMute} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar em laudos"
              placeholderTextColor={t.textMute}
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Text style={styles.clearX}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Chips: período + seleção */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {RANGES.map((r) => (
            <Pressable
              key={r.value}
              onPress={() => setRange(r.value)}
              style={[styles.chip, range === r.value && styles.chipOn]}
            >
              <Text
                style={[styles.chipText, range === r.value && styles.chipTextOn]}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.chipDivider} />
          {availableCats.map((cat) => {
            const on = catFilter.has(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() =>
                  setCatFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  })
                }
                style={[styles.chip, on && { backgroundColor: withAlpha(cat.color) }]}
              >
                <Text style={[styles.chipText, on && { color: cat.color }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
          {hasFilters ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setRange("all");
                setCatFilter(new Set());
              }}
              style={styles.chip}
            >
              <Text style={[styles.chipText, { color: t.danger }]}>Limpar</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={styles.toolbarRow}>
          <Text style={styles.resultCount}>
            {filtered.length} laudo(s)
          </Text>
          {selecting ? (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <Pressable onPress={selectAll} hitSlop={8}>
                <Text style={styles.toolbarAction}>Todos</Text>
              </Pressable>
              <Pressable onPress={exitSelection} hitSlop={8}>
                <Text style={styles.toolbarAction}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setSelecting(true)} hitSlop={8}>
              <Text style={styles.toolbarAction}>Selecionar</Text>
            </Pressable>
          )}
        </View>

        {salaMsg ? (
          <View style={styles.salaToast}>
            <Text style={styles.salaToastText}>{salaMsg}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Erro ao carregar histórico</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {filtered.length === 0 && !error ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              Nenhum laudo com esses filtros.
            </Text>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.title}>
            <Text style={styles.groupHeader}>{group.title}</Text>
            <View style={styles.list}>
              {group.items.map((report, index) => {
                const cat = categoryFor(report.category_code);
                const text = stripReviewMarkers(
                  report.final_output || report.generated_output || report.raw_input,
                );
                const isSelected = selected.has(report.id);
                return (
                  <Pressable
                    key={report.id}
                    onPress={() =>
                      selecting
                        ? toggleSelect(report.id)
                        : router.push(`/report/${report.id}`)
                    }
                    onLongPress={() => {
                      if (!selecting) {
                        setSelecting(true);
                        toggleSelect(report.id);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      index < group.items.length - 1 && styles.rowDivider,
                      pressed && styles.pressed,
                    ]}
                  >
                    {selecting ? (
                      <View
                        style={[
                          styles.selectBox,
                          isSelected && styles.selectBoxOn,
                        ]}
                      >
                        {isSelected ? (
                          <Text style={styles.selectMark}>✓</Text>
                        ) : null}
                      </View>
                    ) : (
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
                    )}

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

                    {selecting ? null : (
                      <Pressable
                        onPress={() => pushToSala(report.id)}
                        hitSlop={8}
                        style={styles.salaBtn}
                        accessibilityLabel="Enviar para a Sala do Auxiliar"
                      >
                        {pushingId === report.id ? (
                          <ActivityIndicator size="small" color={t.brand} />
                        ) : (
                          <Send size={16} color={t.textMute} />
                        )}
                      </Pressable>
                    )}

                    {selecting ? null : <Chevron color={t.textGhost} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Barra inferior do modo seleção */}
      {selecting ? (
        <View
          style={[
            styles.selectionBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 },
          ]}
        >
          <Text style={styles.selectionCount}>
            {selected.size} selecionado(s)
          </Text>
          <Pressable
            onPress={confirmDelete}
            disabled={selected.size === 0 || deleting}
            style={[
              styles.deleteBtn,
              (selected.size === 0 || deleting) && { opacity: 0.5 },
            ]}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.deleteBtnText}>Excluir</Text>
            )}
          </Pressable>
        </View>
      ) : null}
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
      paddingBottom: 4,
    },
    searchPill: {
      backgroundColor: t.fill1,
      borderRadius: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 9,
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.body,
    },
    clearX: {
      color: t.textMute,
      fontSize: 14,
      paddingHorizontal: 2,
    },
    chipsRow: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: t.fill1,
    },
    chipOn: {
      backgroundColor: t.brand,
    },
    chipText: {
      fontSize: 12.5,
      color: t.textSec,
      fontFamily: FONT.semibold,
    },
    chipTextOn: {
      color: "#fff",
    },
    chipDivider: {
      width: StyleSheet.hairlineWidth,
      height: 20,
      backgroundColor: t.separator,
      marginHorizontal: 2,
    },
    toolbarRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 22,
      paddingTop: 2,
      paddingBottom: 4,
    },
    resultCount: {
      fontSize: 12,
      color: t.textMute,
      fontFamily: FONT.medium,
    },
    toolbarAction: {
      fontSize: 13,
      color: t.brand,
      fontFamily: FONT.semibold,
    },
    salaToast: {
      marginHorizontal: 16,
      marginBottom: 6,
      backgroundColor: t.brandLight,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    salaToastText: {
      color: t.brandDeep,
      fontSize: 12.5,
      fontFamily: FONT.medium,
    },
    noResults: {
      padding: 24,
      alignItems: "center",
    },
    noResultsText: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 13,
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
    selectBox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: t.textGhost,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 7,
      backgroundColor: t.card,
    },
    selectBoxOn: {
      backgroundColor: t.brand,
      borderColor: t.brand,
    },
    selectMark: {
      color: "#fff",
      fontSize: 13,
      fontFamily: FONT.bold,
      lineHeight: 15,
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
    salaBtn: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    selectionBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: t.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.separator,
    },
    selectionCount: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
    deleteBtn: {
      minWidth: 110,
      minHeight: 42,
      borderRadius: 10,
      backgroundColor: t.danger,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },
    deleteBtnText: {
      color: "#fff",
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
  });
}
