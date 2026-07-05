import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { Audio as AudioNS } from "expo-av";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  generateReducer,
  initialGenerateState,
} from "@/features/generate/state";
import {
  generateReportStream,
  pushReportToSala,
  updateReportFinalOutput,
  type MockScenario,
} from "@/lib/api";
import { Banner, type BannerSeverity } from "@/ui/Banner";
import { Segment } from "@/ui/Segment";
import { CATS, Category, FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import {
  Chevron,
  Layers,
  Menu,
  Mic,
  Plus,
  Quote,
  Stop,
} from "@/ui/icons";
import { CategorySheet } from "@/features/generate/CategorySheet";
import { MenuSheet } from "@/features/generate/MenuSheet";
import { PlusSheet } from "@/features/generate/PlusSheet";
import { SalaPairingSheet } from "@/features/sala/SalaPairingSheet";
import { RecordingOverlay } from "@/features/generate/RecordingOverlay";
import { CalculatorsSheet, type CalcKey } from "@/features/generate/CalculatorsSheet";
import { IGCalculatorSheet } from "@/features/generate/IGCalculatorSheet";
import { DopplerCalculatorSheet } from "@/features/generate/DopplerCalculatorSheet";
import {
  ensureMicPermission,
  startRecording,
  stopAndUpload,
} from "@/features/generate/transcribe";
import {
  renderReviewHighlighted,
  stripReviewMarkers,
} from "@/features/generate/reviewMarkers";
import { SHORT_MEDICAL_DISCLAIMER } from "@/legal/documents";
import { FeedbackCard } from "@/features/feedback/FeedbackCard";
import { ImageAnalysisSheet } from "@/features/imaging/ImageAnalysisSheet";

const DEFAULT_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111";

const SNIPPETS: Record<string, string> = {
  dum:
    "IG pela DUM (DUM: __/__/____): __ semanas e __ dias.\nDPP: __/__/____.\n\n",
  usg:
    "IG pela 1ª USG (8s2d em 03/12/2025): 28 semanas e 6 dias.\nDPP corrigida: 17/07/2026.\n\n",
  frase:
    "Feto único, vivo, em apresentação cefálica, dorso à esquerda. Batimentos cardíacos fetais de 142 bpm, regulares. Movimentos fetais ativos.\n\n",
};

type Tab = "achados" | "laudo";

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [state, dispatch] = useReducer(generateReducer, initialGenerateState);
  const [tab, setTab] = useState<Tab>("achados");
  const [cat, setCat] = useState<Category>(CATS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [igCalcOpen, setIgCalcOpen] = useState(false);
  const [igCalcInitialTab, setIgCalcInitialTab] = useState<"dum" | "usg">("dum");
  const [dopplerCalcOpen, setDopplerCalcOpen] = useState(false);
  const [salaOpen, setSalaOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  // Mock OFF por default — antes era "happy" em DEV mas isso fazia toda
  // geração cair no /api/generate/mock, que retorna PELVE_FEMININA fixo
  // e não persiste no DB (laudo sumia do histórico). FAB DEV abaixo ainda
  // permite alternar manualmente pra testar cenários (clarify/error/slow).
  const [mock, setMock] = useState<MockScenario | null>(null);
  const [notice, setNotice] = useState<{
    severity: BannerSeverity;
    title?: string;
    message: string;
  } | null>(null);
  const aborterRef = useRef<AbortController | null>(null);
  const recordingRef = useRef<AudioNS.Recording | null>(null);
  // Nível de áudio real (metering) → waveform do overlay (P0 critique).
  const [micLevel, setMicLevel] = useState<number | null>(null);

  // ── Edição inline do laudo final (paridade iOS: autosave 600ms) ──
  const [editingLaudo, setEditingLaudo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Última edição ainda não persistida — flush em unmount/toggle/reset garante
  // que sair rápido não perde texto (review Dex1 04/07).
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
        console.warn("[mobile] autosave do laudo falhou:", err);
        setSaveStatus("error");
      });
  }
  const flushRef = useRef(flushPendingSave);
  flushRef.current = flushPendingSave;

  useEffect(() => {
    if (state.kind === "done") {
      // Peak-end: momento do laudo pronto merece confirmação tátil.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } else {
      flushRef.current(); // persiste edição pendente antes de sair do done
      setEditingLaudo(false);
      setSaveStatus("idle");
    }
  }, [state.kind]);

  useEffect(
    () => () => {
      flushRef.current(); // unmount: não perde a última edição
    },
    [],
  );

  function toggleEditingLaudo() {
    if (editingLaudo) flushPendingSave(); // saindo do modo edição → salva já
    setEditingLaudo(!editingLaudo);
  }

  function onEditFinal(nextText: string) {
    if (state.kind !== "done") return;
    const reportId = state.reportId;
    dispatch({ type: "EDIT_FINAL", text: nextText });
    setSaveStatus("saving");
    pendingSaveRef.current = { reportId, text: nextText };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => flushRef.current(), 600);
  }

  async function onCopyLaudo() {
    if (state.kind !== "done") return;
    try {
      await Clipboard.setStringAsync(stripReviewMarkers(state.finalText));
      setNotice({ severity: "success", message: "Laudo copiado." });
    } catch {
      setNotice({ severity: "error", message: "Não foi possível copiar." });
    }
  }

  const text =
    "text" in state ? (state as { text: string }).text : "";
  const hasContent = text.trim().length > 0;
  const recording = state.kind === "recording";
  const transcribing = state.kind === "transcribing";
  const generating = state.kind === "generating";
  const isStreaming = generating || state.kind === "done";
  const micBusy = recording || transcribing;

  const startGenerate = async () => {
    if (state.kind !== "ready") return;
    setTab("laudo");
    dispatch({ type: "GENERATE" });
    const ac = new AbortController();
    aborterRef.current = ac;
    try {
      for await (const ev of generateReportStream(
        {
          raw_input: text,
          writing_style_id: DEFAULT_WRITING_STYLE_ID,
          // Categoria escolhida pelo médico tem prioridade — structurer ainda
          // pode reclassificar se discordar do texto.
          category_hint: cat.id,
        },
        ac.signal,
        mock ?? undefined,
      )) {
        dispatch({ type: "SSE_EVENT", event: ev });
        // Auxiliar pareado vê laudo automaticamente — fire-and-forget.
        if (ev.type === "done" && ev.report_id) {
          publishCleanReportToSala(ev.report_id, ev.final_text);
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const raw = e instanceof Error ? e.message : String(e);
      // Erro mais útil pro usuário, log completo no console pra debug
      console.error("generate error:", e);
      const message = humanizeGenerateError(raw);
      dispatch({ type: "FAIL", message });
    }
  };

  const cancelGenerate = () => {
    aborterRef.current?.abort();
    dispatch({ type: "RESET" });
    setTab("achados");
  };

  const insertSnippet = (key: keyof typeof SNIPPETS) => {
    dispatch({ type: "EDIT_TEXT", text: text + SNIPPETS[key] });
  };

  const onMicToggle = async () => {
    // STOP path: para gravação, faz upload Whisper, dispatch transcript.
    if (recording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      const rec = recordingRef.current;
      recordingRef.current = null;
      setMicLevel(null);
      dispatch({ type: "STOP_REC" });
      if (!rec) {
        dispatch({ type: "FAIL", message: "Gravação perdida — tente de novo." });
        return;
      }
      try {
        const { transcript } = await stopAndUpload(rec);
        dispatch({ type: "TRANSCRIPTION_DONE", text: transcript });
      } catch (e) {
        // Volta o usuário para o estado inicial (com texto preservado),
        // e mostra o erro como notice em cima do composer.
        dispatch({ type: "RESET" });
        if (text) dispatch({ type: "EDIT_TEXT", text });
        setNotice({
          severity: "error",
          title: "Não consegui transcrever",
          message: e instanceof Error ? e.message : String(e),
        });
      }
      return;
    }

    // START path: gating + permissão + começa gravação.
    if (state.kind !== "idle" && state.kind !== "ready") return;

    if (Platform.OS === "web") {
      // expo-av Recording não tem suporte sólido em web. Damos um fallback
      // explícito até implementarmos MediaRecorder API nativo do browser.
      setNotice({
        severity: "warning",
        title: "Gravação só no app",
        message:
          "A gravação por microfone está disponível apenas no app iOS/Android. Use o teclado para digitar os achados aqui no navegador.",
      });
      return;
    }

    try {
      await ensureMicPermission();
      const rec = await startRecording((level) => setMicLevel(level));
      recordingRef.current = rec;
      // Confirmação tátil de que a captura começou (mão no transdutor,
      // olhos no monitor — critique 04/07).
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      dispatch({ type: "START_REC" });
    } catch (e) {
      setNotice({
        severity: "error",
        title: "Microfone indisponível",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onPlusAction = (a: "calc" | "image" | "clear") => {
    if (a === "image") {
      setImageOpen(true);
      return;
    }
    if (a === "clear") {
      if (!hasContent) return;
      // Ditado de minutos não pode sumir com 2 taps (critique P1).
      Alert.alert("Limpar achados?", "O texto ditado/digitado será apagado.", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            dispatch({ type: "RESET" });
            setTab("achados");
          },
        },
      ]);
      return;
    }
    if (a === "calc") {
      setCalcOpen(true);
      return;
    }
  };

  const cycleMock = () => {
    const order: (MockScenario | null)[] = [
      "happy",
      "clarify",
      "error",
      "slow",
      null,
    ];
    const idx = order.indexOf(mock);
    setMock(order[(idx + 1) % order.length]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={styles.navLeft}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Abrir menu"
        >
          <Menu size={22} color={t.text} />
          {/* Wordmark "LaudoUSG●" — igual ao iOS (sem logo no meio). */}
          <Text style={styles.brandText}>
            LaudoUSG<Text style={{ color: t.brand }}>.</Text>
          </Text>
        </Pressable>
        {/* Chip da categoria: mostra a especialidade selecionada e abre o
            CategorySheet ao tocar. Substitui o chip "mock" técnico antigo. */}
        <Pressable
          onPress={() => setCatOpen(true)}
          style={styles.catChip}
          accessibilityRole="button"
          accessibilityLabel={`Categoria atual: ${cat.label}. Tocar para mudar.`}
          hitSlop={6}
        >
          <View style={[styles.catChipDot, { backgroundColor: cat.color }]} />
          <Text style={styles.catChipText} numberOfLines={1}>
            {cat.label}
          </Text>
          <Chevron color={t.textGhost} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={{ paddingTop: 4 }}>
        <Segment<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "achados", label: "Achados", dot: hasContent },
            { value: "laudo", label: "Laudo" },
          ]}
        />
      </View>

      {notice ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Banner
            severity={notice.severity}
            title={notice.title}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        </View>
      ) : null}

      {/* Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 22,
            paddingTop: 20,
            paddingBottom: 140 + insets.bottom,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "achados" && (
            <AchadosBody
              text={text}
              hasContent={hasContent}
              onChangeText={(t) => dispatch({ type: "EDIT_TEXT", text: t })}
              onSnippet={insertSnippet}
              onOpenIG={(tab) => {
                setIgCalcInitialTab(tab);
                setIgCalcOpen(true);
              }}
              onOpenFrasesSalvas={() =>
                undefined
              }
              onUnimplemented={(label) =>
                undefined
              }
              editable={
                state.kind === "idle" ||
                state.kind === "ready" ||
                state.kind === "error"
              }
              cat={cat}
            />
          )}

          {tab === "laudo" && (
            <LaudoBody
              state={state}
              cat={cat}
              editing={editingLaudo}
              saveStatus={saveStatus}
              onToggleEdit={toggleEditingLaudo}
              onEditFinal={onEditFinal}
              onCopy={onCopyLaudo}
              onCancel={cancelGenerate}
              onAnswerClarify={(qid, ans) =>
                dispatch({
                  type: "ANSWER_CLARIFY",
                  questionId: qid,
                  answer: ans,
                })
              }
              onResume={async () => {
                // Retoma o pipeline após o médico responder o clarify.
                // Envia resume_from_report_id + clarify_answers; backend
                // pula o structurer e parte direto pro retriever com
                // findings persistidos + answers mescladas.
                if (state.kind !== "clarifying") return;
                const answers = Object.entries(state.answers)
                  .map(([qid, ans]) => ({ question_id: qid, answer: ans }))
                  .filter((a) => a.answer.trim().length > 0);
                if (answers.length === 0) {
                  setNotice({
                    severity: "warning",
                    title: "Respostas vazias",
                    message: "Responda pelo menos uma das perguntas antes de continuar.",
                  });
                  return;
                }
                dispatch({ type: "RESUME_AFTER_CLARIFY" });
                const ac = new AbortController();
                aborterRef.current = ac;
                try {
                  for await (const ev of generateReportStream(
                    {
                      raw_input: state.text,
                      writing_style_id: DEFAULT_WRITING_STYLE_ID,
                      category_hint: cat.id,
                      resume_from_report_id: state.reportId,
                      clarify_answers: answers,
                    },
                    ac.signal,
                    mock ?? undefined,
                  )) {
                    dispatch({ type: "SSE_EVENT", event: ev });
                    if (ev.type === "done" && ev.report_id) {
                      persistCleanFinalOutput(ev.report_id, ev.final_text);
                    }
                  }
                } catch (e) {
                  if ((e as Error).name === "AbortError") return;
                  dispatch({
                    type: "FAIL",
                    message: e instanceof Error ? e.message : String(e),
                  });
                }
              }}
              onOpenReport={(id) => router.push(`/report/${id}`)}
              onReset={() => {
                dispatch({ type: "RESET" });
                setTab("achados");
              }}
            />
          )}

          {/* tab "extra" oculta por enquanto — ver type Tab no topo */}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Composer */}
      <View
        style={[
          styles.composer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 22 },
        ]}
        pointerEvents="box-none"
      >
        {/* Layout iOS: [+] discreto · "Gerar laudo" central · mic circular */}
        <View style={styles.composerRow} pointerEvents="box-none">
          <Pressable
            onPress={() => setPlusOpen(true)}
            disabled={micBusy}
            style={[styles.sideBtn, { opacity: micBusy ? 0.35 : 1 }]}
            accessibilityLabel="Mais ações"
          >
            <Plus size={20} color={t.text2} />
          </Pressable>

          <Pressable
            onPress={hasContent && !generating && !micBusy ? startGenerate : undefined}
            disabled={!hasContent || generating || micBusy}
            style={[
              styles.generateBtn,
              { opacity: !hasContent || generating || micBusy ? 0.45 : 1 },
            ]}
            accessibilityLabel="Gerar laudo"
          >
            <Text style={styles.generateBtnText}>
              {generating ? "Gerando…" : "Gerar laudo"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onMicToggle}
            disabled={isStreaming || transcribing}
            style={[
              styles.micBtn,
              {
                backgroundColor: recording ? t.danger : t.brand,
                opacity: isStreaming ? 0.6 : 1,
              },
            ]}
            accessibilityLabel={
              recording
                ? "Parar gravação"
                : transcribing
                  ? "Transcrevendo"
                  : "Gravar achados"
            }
          >
            {transcribing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : recording ? (
              <Stop size={16} color="#fff" />
            ) : (
              <Mic size={19} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Overlays */}
      {recording ? (
        <RecordingOverlay
          level={micLevel}
          mode="recording"
          transcript="Falando para o microfone…"
        />
      ) : null}
      {transcribing ? (
        <RecordingOverlay
          mode="transcribing"
          transcript="Transcrevendo seu áudio com Whisper…"
          showCursor={false}
        />
      ) : null}

      <CategorySheet
        open={catOpen}
        onClose={() => setCatOpen(false)}
        current={cat.id}
        onPick={setCat}
      />
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNotice={(n) => setNotice(n)}
        onOpenSala={() => setSalaOpen(true)}
      />
      <ImageAnalysisSheet
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        categoryId={cat.id}
        onInsert={(block) =>
          dispatch({ type: "EDIT_TEXT", text: (text ? text + "\n\n" : "") + block })
        }
      />

      <SalaPairingSheet
        open={salaOpen}
        onClose={() => setSalaOpen(false)}
      />
      <PlusSheet
        open={plusOpen}
        onClose={() => setPlusOpen(false)}
        onPick={onPlusAction}
        categoryId={cat.id}
      />
      <CalculatorsSheet
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onPick={(key: CalcKey) => {
          if (key === "ig") {
            setIgCalcInitialTab("dum");
            setIgCalcOpen(true);
          } else if (key === "doppler") {
            setDopplerCalcOpen(true);
          }
        }}
      />
      <IGCalculatorSheet
        open={igCalcOpen}
        initialTab={igCalcInitialTab}
        onClose={() => setIgCalcOpen(false)}
        onInsert={(bloco) =>
          dispatch({ type: "EDIT_TEXT", text: text + bloco })
        }
      />
      <DopplerCalculatorSheet
        open={dopplerCalcOpen}
        findingsText={text}
        onClose={() => setDopplerCalcOpen(false)}
        onInsert={(bloco) =>
          dispatch({ type: "EDIT_TEXT", text: text + bloco })
        }
      />

      {/* DEV-only: floating mock toggle (substitui o antigo chip do header).
          Em build de produção (__DEV__ === false) isso some completamente. */}
      {__DEV__ ? (
        <Pressable onPress={cycleMock} style={styles.devMockFab} hitSlop={6}>
          <Text style={styles.devMockFabText}>
            mock: {mock ?? "real"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Achados (input) ──────────────────────────────────────────────
type AchadosProps = {
  text: string;
  hasContent: boolean;
  onChangeText: (t: string) => void;
  onSnippet: (key: "dum" | "usg" | "frase") => void;
  onOpenIG: (tab: "dum" | "usg") => void;
  onOpenFrasesSalvas: () => void;
  onUnimplemented: (label: string) => void;
  editable: boolean;
  cat: Category;
};

function persistCleanFinalOutput(reportId: string, output: string) {
  const clean = stripReviewMarkers(output);
  if (clean === output) return;
  updateReportFinalOutput(reportId, clean).catch((err) => {
    console.warn("[mobile] salvar final_output limpo falhou:", err);
  });
}

function publishCleanReportToSala(reportId: string, output: string) {
  const clean = stripReviewMarkers(output);
  const persist = clean === output
    ? Promise.resolve()
    : updateReportFinalOutput(reportId, clean);
  persist
    .then(() => pushReportToSala(reportId))
    .catch((err) => {
      console.warn("[mobile] preparar push limpo pra sala falhou:", err);
    });
}

type QuickAction = {
  key: string;
  label: string;
  onPress: () => void;
};

function buildQuickActions(
  catId: string,
  onOpenIG: (tab: "dum" | "usg") => void,
  _onOpenFrasesSalvas: () => void,
  _onUnimplemented: (label: string) => void,
): QuickAction[] {
  if (isObstetrica(catId)) {
    return [
      { key: "dum", label: "IG pela DUM", onPress: () => onOpenIG("dum") },
      { key: "usg", label: "IG pela 1ª USG", onPress: () => onOpenIG("usg") },
    ];
  }
  return [];
}

function AchadosBody({
  text,
  hasContent,
  onChangeText,
  onSnippet: _onSnippet,
  onOpenIG,
  onOpenFrasesSalvas,
  onUnimplemented,
  editable,
  cat,
}: AchadosProps) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const quickActions = buildQuickActions(
    cat.id,
    onOpenIG,
    onOpenFrasesSalvas,
    onUnimplemented,
  );
  return (
    <View>
      {/* Quick actions row: chips clicáveis com texto sublinhado, mesma
          tipografia do placeholder. Customizado por categoria (obstétricas
          ganham IG pela DUM / 1ª USG). ScrollView horizontal
          pra acomodar quando lista cresce sem quebrar layout. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {quickActions.map((qa, i) => (
          <Pressable
            key={qa.key}
            onPress={qa.onPress}
            disabled={!editable}
            style={({ pressed }) => [
              i > 0 && { marginLeft: 18 },
              pressed && { opacity: 0.5 },
            ]}
            hitSlop={6}
          >
            <Text style={styles.quickLink}>{qa.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <TextInput
        value={text}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        textAlignVertical="top"
        placeholder="Dite ou digite os achados."
        placeholderTextColor={t.textMute}
        style={styles.editor}
      />
    </View>
  );
}

function isObstetrica(catId: string): boolean {
  return (
    catId === "OBSTETRICA" ||
    catId === "MORFOLOGICO" ||
    catId === "DOPPLER_OBSTETRICO"
  );
}

/**
 * Converte erro técnico do generate em mensagem útil pro médico.
 * Console ainda recebe stack completa pra debug.
 */
function humanizeGenerateError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("não autenticado") || lower.includes("nao autenticado")) {
    return "Sua sessão expirou. Saia e entre de novo.";
  }
  if (lower.includes("401")) {
    return "Não foi possível autenticar com o servidor. Saia e entre de novo.";
  }
  if (lower.includes("invalid_writing_style")) {
    return "Estilo de escrita inválido. Verifique nas Preferências.";
  }
  if (lower.includes("resume_not_found")) {
    return "Não foi possível retomar o laudo (não encontrado).";
  }
  if (lower.includes("resume_empty_answers")) {
    return "Responda pelo menos uma das perguntas antes de continuar.";
  }
  if (lower.includes("resume_limit_reached")) {
    return "Limite de retomadas atingido. Recomece o laudo.";
  }
  if (lower.includes("pipeline_failure")) {
    return "O servidor encontrou um erro ao gerar. Tente novamente em alguns segundos.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Sem conexão com o servidor. Verifique sua internet.";
  }
  if (lower.includes("400")) {
    return "Dados inválidos no pedido. Recarregue a página.";
  }
  if (lower.includes("500") || lower.includes("502") || lower.includes("503")) {
    return "Servidor temporariamente indisponível. Tente em alguns segundos.";
  }
  // Erro desconhecido — mostra original pra debug
  return raw.length > 200 ? raw.slice(0, 200) + "…" : raw;
}

// ─── Laudo (output / streaming) ───────────────────────────────────
import type { GenerateState } from "@/features/generate/state";
import type { SanityIssue } from "@/shared";

type LaudoProps = {
  state: GenerateState;
  cat: Category;
  editing: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onToggleEdit: () => void;
  onEditFinal: (text: string) => void;
  onCopy: () => void;
  onCancel: () => void;
  onAnswerClarify: (qid: string, ans: string) => void;
  onResume: () => void;
  onOpenReport: (id: string) => void;
  onReset: () => void;
};

const SAVE_LABEL: Record<"idle" | "saving" | "saved" | "error", string> = {
  idle: "",
  saving: "Salvando…",
  saved: "Salvo",
  error: "Falha ao salvar",
};

function LaudoBody({
  state,
  cat,
  editing,
  saveStatus,
  onToggleEdit,
  onEditFinal,
  onCopy,
  onCancel,
  onAnswerClarify,
  onResume,
  onOpenReport,
  onReset,
}: LaudoProps) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  if (state.kind === "generating" || state.kind === "done") {
    const isStreaming = state.kind === "generating";
    const text =
      state.kind === "generating" ? state.streamedText : state.finalText;
    return (
      <View>
        {/* Sem cabeçalho "Ultrassonografia X" nem data/hora: a categoria já
            está no header e a hora no relógio — pedido do Luiz 04/07 (o laudo
            começa direto). */}
        {state.kind === "generating" && state.structured ? (
          <View style={styles.pipelineRow}>
            <View style={[styles.pipeDot, { backgroundColor: t.brand }]} />
            <Text style={styles.pipelineText}>
              {state.structured.categoria_detectada} · {state.structured.tipo_exame}
            </Text>
          </View>
        ) : null}

        {/* Toolbar do laudo pronto: Editar/Visualizar + status do autosave
            (Copiar virou a ação PRIMÁRIA no fim do fluxo — critique P0). */}
        {state.kind === "done" && text ? (
          <View style={styles.laudoToolbar}>
            <Pressable onPress={onToggleEdit} style={styles.toolbarBtn} hitSlop={6}>
              <Text style={styles.toolbarBtnText}>
                {editing ? "Visualizar" : "Editar"}
              </Text>
            </Pressable>
            <Text
              style={[
                styles.saveStatus,
                saveStatus === "error" && { color: t.danger },
              ]}
            >
              {SAVE_LABEL[saveStatus]}
            </Text>
          </View>
        ) : null}

        {state.kind === "done" && editing ? (
          <TextInput
            value={state.finalText}
            onChangeText={onEditFinal}
            multiline
            autoFocus
            textAlignVertical="top"
            style={[styles.laudoText, styles.laudoEditor]}
          />
        ) : (
          <Text style={styles.laudoText}>
            {text
              ? renderReviewHighlighted(text, styles.reviewMarker)
              : isStreaming
                ? "Estruturando achados…"
                : ""}
            {isStreaming ? <Text style={styles.cursor}> ▎</Text> : null}
          </Text>
        )}

        {state.kind === "done" && text ? (
          <CompactDisclaimer styles={styles} />
        ) : null}

        {state.kind === "done" && text ? (
          <FeedbackCard reportId={state.reportId} categoryCode={cat.id} />
        ) : null}

        {state.kind === "generating" ? (
          <Pressable onPress={onCancel} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Cancelar geração</Text>
          </Pressable>
        ) : null}

        {state.kind === "done" ? (
          <View style={{ gap: 10, marginTop: 18 }}>
            <Pressable
              onPress={onCopy}
              style={styles.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Copiar laudo</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => onOpenReport(state.reportId)}
                style={[styles.secondaryBtn, { flex: 1 }]}
              >
                <Text style={styles.secondaryBtnText}>Abrir detalhes</Text>
              </Pressable>
              <Pressable onPress={onReset} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Novo</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  if (state.kind === "clarifying") {
    return (
      <View>
        <Text style={[styles.eyebrow, { color: t.brand }]}>
          Validador clínico
        </Text>
        <Text style={styles.laudoTitle}>Antes de gerar, confirme:</Text>
        <Text style={styles.laudoMeta}>
          Respostas curtas ajudam o laudo a ficar consistente.
        </Text>

        {state.questions.map((q) => (
          <View key={q.id} style={{ marginTop: 16 }}>
            <Text style={styles.qLabel}>{q.question}</Text>
            <TextInput
              value={state.answers[q.id] ?? ""}
              onChangeText={(t) => onAnswerClarify(q.id, t)}
              placeholder="Sua resposta"
              placeholderTextColor={t.textMute}
              style={styles.qInput}
            />
          </View>
        ))}

        <Pressable
          onPress={onResume}
          style={[styles.primaryBtn, { marginTop: 18 }]}
        >
          <Text style={styles.primaryBtnText}>Continuar</Text>
        </Pressable>
      </View>
    );
  }

  if (state.kind === "error") {
    return (
      <View>
        <View style={styles.bannerCritical}>
          <Text style={styles.bannerTitle}>Algo deu errado</Text>
          <Text style={styles.bannerBody}>{state.message}</Text>
        </View>
        <Pressable
          onPress={onReset}
          style={[styles.secondaryBtn, { marginTop: 18 }]}
        >
          <Text style={styles.secondaryBtnText}>Recomeçar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Text style={styles.laudoEmpty}>
      Toque{" "}
      <Text style={{ color: t.brand, fontFamily: FONT.semibold }}>Gerar</Text>{" "}
      com achados preenchidos para ver o laudo aqui.
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
/**
 * Disclaimer legal compacto (1 linha, expansível) — mantém a função (CFM/loja)
 * sem terminar a jornada com um cartão de aviso gritante (critique P1).
 */
function CompactDisclaimer({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      onPress={() => setExpanded((e) => !e)}
      style={styles.disclaimerCompact}
      accessibilityRole="button"
    >
      <Text style={styles.disclaimerCompactText}>
        {expanded
          ? SHORT_MEDICAL_DISCLAIMER
          : "Minuta de IA — revise antes de assinar."}
        <Text style={styles.disclaimerMore}>
          {expanded ? "   ocultar" : "   saiba mais"}
        </Text>
      </Text>
    </Pressable>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: t.bg,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  brandText: {
    fontSize: 16.5,
    fontFamily: FONT.bold,
    color: t.brand,
    letterSpacing: -0.2,
  },
  // Chip da categoria atual no header (toca pra mudar)
  // Sem contorno/fundo — só ponto de cor + nome (iOS).
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 4,
    paddingVertical: 7,
    maxWidth: 190,
  },
  catChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catChipText: {
    color: t.text,
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
  // DEV-only floating mock toggle (canto inferior direito).
  // Move o ruído de debug pra fora do header.
  devMockFab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 50,
  },
  devMockFabText: {
    color: "#FFD66B",
    fontSize: 11,
    fontFamily: FONT.semibold,
    letterSpacing: 0.3,
  },

  emptyTitle: {
    fontSize: 18,
    lineHeight: 27,
    color: t.textSec,
    marginBottom: 6,
    fontFamily: FONT.body,
  },
  emptySub: {
    fontSize: 16,
    color: t.textMute,
    marginBottom: 28,
    fontFamily: FONT.body,
  },
  sectionLabel: {
    fontSize: 11,
    color: t.textMute,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: FONT.bold,
  },
  emptyHint: {
    fontSize: 13,
    color: t.textGhost,
    marginTop: 32,
    fontStyle: "italic",
    fontFamily: FONT.body,
  },
  // Linha horizontal de quick actions acima do textarea.
  quickRow: {
    paddingBottom: 14,
    alignItems: "center",
  },
  // Mesma tipografia do placeholder do editor (fontSize 17, FONT.body, cor
  // mute) só que com sublinhado pra deixar claro que é clicável.
  quickLink: {
    fontSize: 14.5,
    lineHeight: 22,
    color: t.textMute,
    fontFamily: FONT.body,
    textDecorationLine: "underline",
  },
  editor: {
    fontSize: 16,
    lineHeight: 24,
    color: t.text,
    minHeight: 280,
    fontFamily: FONT.body,
    padding: 0,
    // Em web (Expo Web) o <textarea> herda outline azul do browser ao focar
    // — quebra a sensação de "fundo infinito". RN Web entende essas propriedades
    // CSS-style direto via style. No iOS/Android nativo são no-ops, seguros.
    // @ts-expect-error — outline* não está nos types do RN, mas funciona em web.
    outlineStyle: "none",
    outlineWidth: 0,
    borderWidth: 0,
  },

  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: FONT.bold,
  },
  laudoTitle: {
    fontFamily: FONT.display,
    fontSize: 22,
    color: t.text,
    marginBottom: 4,
  },
  laudoMeta: {
    fontSize: 12,
    color: t.textSec,
    marginBottom: 18,
    fontFamily: FONT.body,
  },
  laudoText: {
    fontSize: 15,
    lineHeight: 23,
    color: t.text,
    fontFamily: FONT.body,
  },
  laudoToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  toolbarBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: t.fill1,
  },
  toolbarBtnText: {
    color: t.text,
    fontFamily: FONT.semibold,
    fontSize: 13,
  },
  saveStatus: {
    marginLeft: "auto",
    color: t.textMute,
    fontFamily: FONT.medium,
    fontSize: 12,
  },
  laudoEditor: {
    minHeight: 260,
    backgroundColor: t.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: t.separator,
  },
  disclaimerCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: t.warningBg,
  },
  disclaimerCompact: {
    marginTop: 14,
    paddingVertical: 4,
  },
  disclaimerCompactText: {
    color: t.warningText,
    fontFamily: FONT.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  disclaimerMore: {
    color: t.textMute,
    fontFamily: FONT.semibold,
    fontSize: 11.5,
    textDecorationLine: "underline",
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
  laudoEmpty: {
    fontSize: 17,
    lineHeight: 25,
    color: t.textMute,
    fontFamily: FONT.body,
  },
  cursor: {
    color: t.brand,
    fontFamily: FONT.bold,
  },
  pipelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -10,
    marginBottom: 16,
  },
  pipeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pipelineText: {
    fontSize: 12,
    color: t.textSec,
    fontFamily: FONT.medium,
  },

  qLabel: {
    fontSize: 15,
    color: t.text,
    marginBottom: 6,
    fontFamily: FONT.medium,
  },
  qInput: {
    fontSize: 15,
    color: t.text,
    padding: 12,
    borderRadius: 10,
    backgroundColor: t.card,
    fontFamily: FONT.body,
  },

  bannerCritical: {
    backgroundColor: "rgba(255,59,48,0.10)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 15,
    color: t.danger,
    fontFamily: FONT.semibold,
    marginBottom: 4,
  },
  bannerBody: {
    fontSize: 14,
    color: t.text,
    fontFamily: FONT.body,
  },
  issueRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.separator,
  },
  issueSev: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: t.danger,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    width: 72,
  },
  issueType: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: t.text,
  },
  issueDetail: {
    fontSize: 13,
    color: t.textSec,
    marginTop: 2,
    fontFamily: FONT.body,
  },

  primaryBtn: {
    backgroundColor: t.brand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: t.fill1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: t.text,
    fontSize: 15,
    fontFamily: FONT.medium,
  },

  composer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    zIndex: 110,
    // bg opaco evita o laudo gerado aparecer por baixo dos botões.
    backgroundColor: t.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.separator,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.fill1,
    alignItems: "center",
    justifyContent: "center",
  },
  generateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.brandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
}
