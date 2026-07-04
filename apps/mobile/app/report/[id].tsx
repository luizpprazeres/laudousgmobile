import { useEffect, useMemo, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getReport, updateReportFinalOutput, type ReportDetail } from "@/lib/api";
import {
  renderReviewHighlighted,
  stripReviewMarkers,
} from "@/features/generate/reviewMarkers";
import { SHORT_MEDICAL_DISCLAIMER } from "@/legal/documents";
import { Segment } from "@/ui/Segment";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Tab = "report" | "findings" | "rag" | "meta";

const TABS = [
  { value: "report", label: "Laudo" },
  { value: "findings", label: "Entendido" },
  { value: "rag", label: "RAG" },
  { value: "meta", label: "Meta" },
] satisfies Array<{ value: Tab; label: string }>;

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<Tab>("report");
  const [data, setData] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getReport(id);
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
  }, [id]);

  // ── Edição inline + autosave (paridade iOS ReportDetail: debounce 1200ms) ──
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Última edição não persistida — flush em unmount/toggle p/ não perder texto
  // ao sair antes do debounce de 1200ms (review Dex1 04/07).
  const pendingSaveRef = useRef<{ reportId: string; text: string } | null>(null);

  function flushPendingSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (!pending) return;
    updateReportFinalOutput(pending.reportId, stripReviewMarkers(pending.text))
      .then(() => setSaveStatus("saved"))
      .catch((err) => {
        console.warn("[mobile] autosave do laudo (detalhe) falhou:", err);
        setSaveStatus("error");
      });
  }
  const flushRef = useRef(flushPendingSave);
  flushRef.current = flushPendingSave;

  useEffect(
    () => () => {
      flushRef.current(); // unmount (voltar pro histórico etc.) salva já
    },
    [],
  );

  const finalText = useMemo(() => {
    if (editedText !== null) return editedText;
    const report = data?.report;
    return report?.final_output || report?.generated_output || "";
  }, [data, editedText]);

  function toggleEditing() {
    if (editing) flushPendingSave(); // saindo do modo edição → salva já
    setEditing(!editing);
  }

  function onEditText(next: string) {
    if (!data) return;
    const reportId = data.report.id;
    setEditedText(next);
    setSaveStatus("saving");
    pendingSaveRef.current = { reportId, text: next };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushRef.current(), 1200);
  }

  async function copyReport() {
    if (!finalText) return;
    const cleanText = stripReviewMarkers(finalText);
    if (Platform.OS === "web" && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleanText);
      Alert.alert("Texto copiado");
      return;
    }
    await Clipboard.setStringAsync(cleanText);
    Alert.alert("Texto copiado");
  }

  async function shareReport() {
    if (!finalText) return;
    await Share.share({ message: stripReviewMarkers(finalText) });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} />
        <Text style={styles.centerText}>Carregando laudo...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Não foi possível abrir o laudo</Text>
        <Text style={styles.errorText}>{error ?? "Laudo não encontrado."}</Text>
      </View>
    );
  }

  const { report, latest_run: latestRun, rag_blocks: ragBlocks } = data;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 28 + insets.bottom },
        ]}
      >
        <View style={styles.summary}>
          <Text style={styles.kicker}>{report.category_code}</Text>
          <Text style={styles.title}>{statusLabel(report.status)}</Text>
          <Text style={styles.subtitle}>
            Atualizado em {formatDate(report.updated_at)}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={toggleEditing}
            disabled={!finalText}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
              !finalText && styles.disabled,
            ]}
          >
            <Text style={styles.actionText}>
              {editing ? "Visualizar" : "Editar"}
            </Text>
          </Pressable>
          <Pressable
            onPress={copyReport}
            disabled={!finalText}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.pressed,
              !finalText && styles.disabled,
            ]}
          >
            <Text style={styles.actionText}>Copiar texto</Text>
          </Pressable>
          <Pressable
            onPress={shareReport}
            disabled={!finalText}
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              pressed && styles.pressed,
              !finalText && styles.disabled,
            ]}
          >
            <Text style={styles.primaryText}>Compartilhar</Text>
          </Pressable>
        </View>

        <Segment value={tab} onChange={setTab} options={TABS} />

        {tab === "report" && saveStatus !== "idle" ? (
          <Text
            style={[
              styles.saveStatus,
              saveStatus === "error" && { color: "#FF3B30" },
            ]}
          >
            {saveStatus === "saving"
              ? "Salvando…"
              : saveStatus === "saved"
                ? "Salvo"
                : "Falha ao salvar — verifique a conexão"}
          </Text>
        ) : null}

        {tab === "report" ? (
          editing ? (
            <View style={styles.card}>
              <TextInput
                value={finalText}
                onChangeText={onEditText}
                multiline
                autoFocus
                textAlignVertical="top"
                style={styles.reportEditor}
              />
            </View>
          ) : (
            <ReportTab text={finalText} />
          )
        ) : null}
        {tab === "findings" ? (
          <JsonTab value={report.structured_findings ?? {}} />
        ) : null}
        {tab === "rag" ? (
          <RagTab ids={report.rag_blocks_used} blocks={ragBlocks} />
        ) : null}
        {tab === "meta" ? <MetaTab run={latestRun} /> : null}
      </ScrollView>
    </View>
  );
}

function ReportTab({ text }: { text: string }) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.card}>
      <Text selectable style={styles.reportText}>
        {text
          ? renderReviewHighlighted(text, styles.reviewMarker)
          : "Laudo ainda não gerado."}
      </Text>
      {text ? (
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            {SHORT_MEDICAL_DISCLAIMER}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function JsonTab({ value }: { value: unknown }) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <ScrollView horizontal style={styles.card} contentContainerStyle={styles.codeWrap}>
      <Text selectable style={styles.codeText}>
        {JSON.stringify(value, null, 2)}
      </Text>
    </ScrollView>
  );
}

function RagTab({
  ids,
  blocks,
}: {
  ids: string[];
  blocks: ReportDetail["rag_blocks"];
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  if (ids.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Nenhum bloco RAG registrado neste laudo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      {ids.map((id, index) => {
        const block = blocks.find((b) => b.id === id);
        return (
          <View
            key={id}
            style={[styles.ragRow, index < ids.length - 1 && styles.rowDivider]}
          >
            <View style={styles.ragMain}>
              <Text style={styles.ragTitle}>{block?.title ?? id}</Text>
              <Text style={styles.ragMeta}>
                {block?.kind ?? "bloco"} · prioridade {block?.priority ?? "-"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MetaTab({ run }: { run: ReportDetail["latest_run"] }) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  if (!run) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>Nenhuma run registrada.</Text>
      </View>
    );
  }

  const rows = [
    ["Resultado", run.outcome],
    ["Modelo structurer", run.model_structurer],
    ["Modelo writer", run.model_writer],
    ["Modelo sanity", run.model_sanity],
    ["Embedding", run.embedding_model],
    ["Latência total", formatMs(run.latency_ms_total)],
    ["Structurer", formatMs(run.latency_ms_structurer)],
    ["Writer", formatMs(run.latency_ms_writer)],
    ["Sanity", formatMs(run.latency_ms_sanity)],
    ["Tokens input", formatNumber(run.tokens_input)],
    ["Tokens output", formatNumber(run.tokens_output)],
    ["Custo USD", run.cost_usd === null ? "-" : `$${run.cost_usd.toFixed(6)}`],
  ];

  return (
    <View style={styles.listCard}>
      {rows.map(([label, value], index) => (
        <View
          key={label}
          style={[styles.metaRow, index < rows.length - 1 && styles.rowDivider]}
        >
          <Text style={styles.metaLabel}>{label}</Text>
          <Text selectable style={styles.metaValue}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    awaiting_clarify: "Aguardando esclarecimento",
    generated: "Laudo gerado",
    blocked: "Bloqueado para revisão",
    published: "Publicado",
    discarded: "Descartado",
  };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMs(value: number | null) {
  if (value === null) return "-";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function formatNumber(value: number | null) {
  return value === null ? "-" : value.toLocaleString("pt-BR");
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.bg,
    },
    content: {
      paddingTop: 14,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.bg,
      padding: 24,
    },
    centerText: {
      marginTop: 12,
      color: t.textSec,
      fontFamily: FONT.body,
    },
    errorTitle: {
      fontSize: 17,
      color: t.text,
      fontFamily: FONT.semibold,
    },
    errorText: {
      marginTop: 8,
      color: t.textSec,
      textAlign: "center",
      fontFamily: FONT.body,
    },
    summary: {
      paddingHorizontal: 20,
      paddingBottom: 14,
    },
    kicker: {
      color: t.brand,
      fontSize: 12,
      fontFamily: FONT.bold,
      letterSpacing: 0.4,
    },
    title: {
      color: t.text,
      fontSize: 24,
      fontFamily: FONT.displayBold,
      marginTop: 3,
    },
    subtitle: {
      color: t.textSec,
      fontSize: 13,
      fontFamily: FONT.body,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    actionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: t.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.separator,
    },
    primaryButton: {
      backgroundColor: t.brand,
      borderColor: t.brand,
    },
    pressed: {
      opacity: 0.72,
    },
    disabled: {
      opacity: 0.45,
    },
    actionText: {
      color: t.text,
      fontSize: 15,
      fontFamily: FONT.semibold,
    },
    primaryText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontFamily: FONT.semibold,
    },
    card: {
      backgroundColor: t.card,
      marginHorizontal: 16,
      marginTop: 14,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.separator,
    },
    listCard: {
      backgroundColor: t.card,
      marginHorizontal: 16,
      marginTop: 14,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.separator,
    },
    reportText: {
      color: t.text,
      fontSize: 15.5,
      lineHeight: 23,
      fontFamily: FONT.body,
    },
    reportEditor: {
      color: t.text,
      fontSize: 15.5,
      lineHeight: 23,
      fontFamily: FONT.body,
      minHeight: 320,
    },
    saveStatus: {
      marginHorizontal: 20,
      marginTop: 10,
      color: t.textMute,
      fontSize: 12,
      fontFamily: FONT.medium,
    },
    disclaimerCard: {
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: t.warningBg,
    },
    disclaimerText: {
      color: t.warningText,
      fontFamily: FONT.semibold,
      fontSize: 12,
      lineHeight: 17,
    },
    reviewMarker: {
      color: "#7C3AED",
      fontFamily: FONT.bold,
    },
    codeWrap: {
      paddingRight: 24,
    },
    codeText: {
      color: t.text,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: "Menlo",
    },
    emptyText: {
      color: t.textSec,
      fontFamily: FONT.body,
    },
    ragRow: {
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    ragMain: {
      gap: 3,
    },
    ragTitle: {
      color: t.text,
      fontSize: 15,
      fontFamily: FONT.semibold,
    },
    ragMeta: {
      color: t.textSec,
      fontSize: 12,
      fontFamily: FONT.body,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    metaLabel: {
      flex: 1,
      color: t.textSec,
      fontSize: 13,
      fontFamily: FONT.body,
    },
    metaValue: {
      flex: 1.2,
      color: t.text,
      textAlign: "right",
      fontSize: 13,
      fontFamily: FONT.medium,
    },
  });
}
