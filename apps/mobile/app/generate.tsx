import { useReducer, useRef, useState } from "react";
import type { Audio as AudioNS } from "expo-av";
import {
  Image,
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
import { generateReportStream, type MockScenario } from "@/lib/api";
import { Banner, type BannerSeverity } from "@/ui/Banner";
import { Segment } from "@/ui/Segment";
import { Suggestion } from "@/ui/Suggestion";
import { C, CATS, Category, FONT } from "@/ui/tokens";
import {
  Cal,
  Layers,
  Menu,
  Mic,
  Plus,
  Quote,
  Ruler,
  Send,
  Stop,
} from "@/ui/icons";
import { CategorySheet } from "@/features/generate/CategorySheet";
import { MenuSheet } from "@/features/generate/MenuSheet";
import { PlusSheet } from "@/features/generate/PlusSheet";
import { RecordingOverlay } from "@/features/generate/RecordingOverlay";
import {
  ensureMicPermission,
  startRecording,
  stopAndUpload,
} from "@/features/generate/transcribe";

const DEFAULT_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111";

const SNIPPETS: Record<string, string> = {
  usg:
    "IG pela 1ª USG (8s2d em 03/12/2025): 28 semanas e 6 dias.\nDPP corrigida: 17/07/2026.\n\n",
  frase:
    "Feto único, vivo, em apresentação cefálica, dorso à esquerda. Batimentos cardíacos fetais de 142 bpm, regulares. Movimentos fetais ativos.\n\n",
};

// Tab "extra" (calculadoras) escondida por enquanto: todas as calculadoras
// ainda são placeholders "em breve" — mostrar 7 itens não-funcionais passa
// impressão de mockup. Reabilitar quando alguma calc estiver real.
type Tab = "achados" | "laudo";

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(generateReducer, initialGenerateState);
  const [tab, setTab] = useState<Tab>("achados");
  const [cat, setCat] = useState<Category>(CATS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  // Mock OFF por default — antes era "happy" em DEV mas isso fazia toda
  // geração cair no /api/generate/mock, que retorna PELVE_FEMININA fixo
  // e não persiste no DB (laudo sumia do histórico). FAB DEV abaixo ainda
  // permite alternar manualmente pra testar cenários (clarify/blocked/etc).
  const [mock, setMock] = useState<MockScenario | null>(null);
  const [notice, setNotice] = useState<{
    severity: BannerSeverity;
    title?: string;
    message: string;
  } | null>(null);
  const aborterRef = useRef<AbortController | null>(null);
  const recordingRef = useRef<AudioNS.Recording | null>(null);

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
      const rec = recordingRef.current;
      recordingRef.current = null;
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
      const rec = await startRecording();
      recordingRef.current = rec;
      dispatch({ type: "START_REC" });
    } catch (e) {
      setNotice({
        severity: "error",
        title: "Microfone indisponível",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const onPlusAction = (a: "camera" | "model" | "calc" | "clear") => {
    if (a === "model") {
      setCatOpen(true);
      return;
    }
    if (a === "clear") {
      dispatch({ type: "RESET" });
      setTab("achados");
      return;
    }
    // "calc" e "camera" ainda não implementadas — banner explícito
    if (a === "calc") {
      setNotice({
        severity: "info",
        title: "Calculadoras em desenvolvimento",
        message:
          "IG, biometria fetal, percentis Doppler e demais calculadoras clínicas chegam em breve.",
      });
      return;
    }
    setNotice({
      severity: "info",
      title: "Análise de imagem em desenvolvimento",
      message: "Em breve você poderá enviar prints de USG e a IA extrai medidas automaticamente.",
    });
  };

  const cycleMock = () => {
    const order: (MockScenario | null)[] = [
      "happy",
      "clarify",
      "blocked",
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
          <Menu size={22} color={C.text} />
          {/* Texto "LaudoUSG" verde + mini-marca à direita. Texto na cor
              da brand (C.brand) reforça identidade; logo ao lado funciona
              como pequena assinatura visual. */}
          <Text style={styles.brandText}>LaudoUSG</Text>
          <Image
            source={require("../assets/brand/logos/logo-laudousg-transparent.png")}
            style={{ width: 36, height: 24 }}
            resizeMode="contain"
            accessibilityLabel="LaudoUSG"
          />
        </Pressable>
        {/* Chip da categoria: mostra a especialidade selecionada e abre o
            CategorySheet ao tocar. Substitui o chip "mock" técnico antigo. */}
        <Pressable
          onPress={() => setCatOpen(true)}
          style={[styles.catChip, { borderColor: cat.color + "55" }]}
          accessibilityRole="button"
          accessibilityLabel={`Categoria atual: ${cat.label}. Tocar para mudar.`}
          hitSlop={6}
        >
          <View style={[styles.catChipDot, { backgroundColor: cat.color }]} />
          <Text style={styles.catChipText} numberOfLines={1}>
            {cat.label}
          </Text>
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
              onChangeModel={() => setCatOpen(true)}
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
        <View style={styles.composerRow} pointerEvents="box-none">
          <Pressable
            onPress={() => setPlusOpen(true)}
            disabled={micBusy}
            style={[
              styles.sideBtn,
              { opacity: micBusy ? 0.35 : 1 },
            ]}
            accessibilityLabel="Mais ações"
          >
            <Plus size={22} color={C.text2} />
          </Pressable>

          <Pressable
            onPress={onMicToggle}
            disabled={isStreaming || transcribing}
            style={[
              styles.recBtn,
              {
                backgroundColor: recording ? C.danger : C.brand,
                shadowColor: recording ? C.danger : C.brand,
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
            {recording ? (
              <Stop size={16} color="#fff" />
            ) : (
              <Mic size={18} color="#fff" />
            )}
            <Text style={styles.recBtnText}>
              {recording
                ? "Parar gravação"
                : transcribing
                  ? "Transcrevendo…"
                  : "Gravar achados"}
            </Text>
          </Pressable>

          <Pressable
            onPress={hasContent && !generating && !micBusy ? startGenerate : undefined}
            disabled={!hasContent || generating || micBusy}
            style={[
              styles.sideBtn,
              {
                opacity: micBusy ? 0.35 : hasContent ? 1 : 0.55,
              },
            ]}
            accessibilityLabel="Gerar laudo"
          >
            <Send
              size={18}
              color={hasContent && !micBusy ? C.brand : C.textGhost}
            />
          </Pressable>
        </View>
      </View>

      {/* Overlays */}
      {recording ? (
        <RecordingOverlay
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
      />
      <PlusSheet
        open={plusOpen}
        onClose={() => setPlusOpen(false)}
        onPick={onPlusAction}
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
  onSnippet: (key: "usg" | "frase") => void;
  onChangeModel: () => void;
  editable: boolean;
  cat: Category;
};

function AchadosBody({
  text,
  hasContent,
  onChangeText,
  onSnippet,
  onChangeModel,
  editable,
  cat,
}: AchadosProps) {
  // Bug fix crítico: o TextInput PRECISA estar sempre presente, antes era
  // condicional ao hasContent → tela vazia ficava só com Suggestions e
  // o médico não conseguia digitar livre. Agora textarea sempre disponível,
  // com placeholder amigável; Suggestions ficam abaixo só quando vazio.
  return (
    <View>
      <TextInput
        value={text}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        textAlignVertical="top"
        placeholder={
          hasContent
            ? "Continue digitando ou ditando…"
            : `Digite os achados do exame de ${cat.label.toLowerCase()}…\nEx: "Fígado normal. Vesícula com cálculo de 1,2 cm. Rins normais."`
        }
        placeholderTextColor={C.textMute}
        style={styles.editor}
      />

      {!hasContent ? (
        <>
          <Text style={[styles.emptySub, { marginTop: 14 }]}>
            A IA organiza no padrão de {cat.label}.
          </Text>

          <Text style={styles.sectionLabel}>Inserir</Text>
          {/* IG pela 1ª USG só faz sentido em categorias obstétricas.
              Esconde nas demais pra não confundir o médico. */}
          {isObstetrica(cat.id) ? (
            <Suggestion
              icon={<Ruler size={18} color={C.textSec} />}
              label="IG pela 1ª USG (exemplo)"
              hint="inserir"
              onPress={() => onSnippet("usg")}
            />
          ) : null}
          {/* Frases salvas — ainda não implementado, mostra estado real */}
          <Suggestion
            icon={<Layers size={18} color={C.textSec} />}
            label="Trocar modelo"
            hint={cat.label}
            onPress={onChangeModel}
          />

          <Text style={styles.emptyHint}>
            Toque o microfone para ditar ou comece a digitar acima.
          </Text>
        </>
      ) : null}
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
import type { SanityIssue } from "@laudousg/shared";

type LaudoProps = {
  state: GenerateState;
  cat: Category;
  onCancel: () => void;
  onAnswerClarify: (qid: string, ans: string) => void;
  onResume: () => void;
  onOpenReport: (id: string) => void;
  onReset: () => void;
};

function LaudoBody({
  state,
  cat,
  onCancel,
  onAnswerClarify,
  onResume,
  onOpenReport,
  onReset,
}: LaudoProps) {
  const today = new Date().toLocaleDateString("pt-BR");
  const time = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (state.kind === "generating" || state.kind === "done") {
    const isStreaming = state.kind === "generating";
    const text =
      state.kind === "generating" ? state.streamedText : state.finalText;
    return (
      <View>
        <Text style={[styles.eyebrow, { color: cat.color }]}>
          Ultrassonografia {cat.label.toLowerCase()}
        </Text>
        <Text style={styles.laudoMeta}>
          {today} · {time}
        </Text>

        {state.kind === "generating" && state.structured ? (
          <View style={styles.pipelineRow}>
            <View style={[styles.pipeDot, { backgroundColor: C.brand }]} />
            <Text style={styles.pipelineText}>
              {state.structured.categoria_detectada} · {state.structured.tipo_exame}
            </Text>
          </View>
        ) : null}

        <Text style={styles.laudoText}>
          {text || (isStreaming ? "Estruturando achados…" : "")}
          {isStreaming ? <Text style={styles.cursor}> ▎</Text> : null}
        </Text>

        {state.kind === "generating" ? (
          <Pressable onPress={onCancel} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Cancelar geração</Text>
          </Pressable>
        ) : null}

        {state.kind === "done" ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <Pressable
              onPress={() => onOpenReport(state.reportId)}
              style={[styles.primaryBtn, { flex: 1 }]}
            >
              <Text style={styles.primaryBtnText}>Abrir detalhes</Text>
            </Pressable>
            <Pressable onPress={onReset} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Novo</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  if (state.kind === "clarifying") {
    return (
      <View>
        <Text style={[styles.eyebrow, { color: C.brand }]}>
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
              placeholderTextColor={C.textMute}
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

  if (state.kind === "blocked") {
    return (
      <View>
        <View style={styles.bannerCritical}>
          <Text style={styles.bannerTitle}>Sanity check pediu revisão</Text>
          <Text style={styles.bannerBody}>{state.reason}</Text>
        </View>
        {state.sanity.issues.map((i: SanityIssue, idx: number) => (
          <View key={idx} style={styles.issueRow}>
            <Text style={styles.issueSev}>{i.severity}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.issueType}>{i.type}</Text>
              <Text style={styles.issueDetail}>{i.detail}</Text>
            </View>
          </View>
        ))}
        <Pressable
          onPress={onReset}
          style={[styles.secondaryBtn, { marginTop: 18 }]}
        >
          <Text style={styles.secondaryBtnText}>Voltar e revisar</Text>
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
      <Text style={{ color: C.brand, fontFamily: FONT.semibold }}>Gerar</Text>{" "}
      com achados preenchidos para ver o laudo aqui.
    </Text>
  );
}

// ─── Extra (calculadoras) ─────────────────────────────────────────
function ExtraBody() {
  // Por enquanto todas as calculadoras estão como placeholder.
  // Implementação real virá em fase seguinte (P3 mínimo viável é o gerador).
  // Marca claramente "em breve" pra não criar expectativa de funcionalidade.
  return (
    <View>
      <Text style={[styles.emptyTitle, { marginTop: 8 }]}>
        Calculadoras clínicas
      </Text>
      <Text style={styles.emptySub}>
        Em desenvolvimento. Toque pra receber notificação quando estiver
        disponível.
      </Text>

      <Text style={styles.sectionLabel}>Obstétricas</Text>
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Idade gestacional (DUM)" hint="em breve" />
      <Suggestion icon={<Ruler size={18} color={C.textSec} />} label="Biometria fetal" hint="em breve" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="FMF — Risco trissomias" hint="em breve" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Doppler — IR, IP, S/D" hint="em breve" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Anemia fetal (PVS-ACM)" hint="em breve" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Restrição (RCF)" hint="em breve" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Gemelaridade" hint="em breve" />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
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
    fontSize: 17,
    fontFamily: FONT.bold,
    color: C.brand,
    letterSpacing: -0.2,
  },
  // Chip da categoria atual no header (toca pra mudar)
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  catChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catChipText: {
    color: C.text,
    fontSize: 13,
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
    color: C.textSec,
    marginBottom: 6,
    fontFamily: FONT.body,
  },
  emptySub: {
    fontSize: 16,
    color: C.textMute,
    marginBottom: 28,
    fontFamily: FONT.body,
  },
  sectionLabel: {
    fontSize: 11,
    color: C.textMute,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: FONT.bold,
  },
  emptyHint: {
    fontSize: 13,
    color: C.textGhost,
    marginTop: 32,
    fontStyle: "italic",
    fontFamily: FONT.body,
  },
  editor: {
    fontSize: 17,
    lineHeight: 26,
    color: C.text,
    minHeight: 280,
    fontFamily: FONT.body,
    padding: 0,
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
    color: C.text,
    marginBottom: 4,
  },
  laudoMeta: {
    fontSize: 12,
    color: C.textSec,
    marginBottom: 18,
    fontFamily: FONT.body,
  },
  laudoText: {
    fontSize: 16,
    lineHeight: 25,
    color: C.text,
    fontFamily: FONT.body,
  },
  laudoEmpty: {
    fontSize: 17,
    lineHeight: 25,
    color: C.textMute,
    fontFamily: FONT.body,
  },
  cursor: {
    color: C.brand,
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
    color: C.textSec,
    fontFamily: FONT.medium,
  },

  qLabel: {
    fontSize: 15,
    color: C.text,
    marginBottom: 6,
    fontFamily: FONT.medium,
  },
  qInput: {
    fontSize: 15,
    color: C.text,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.card,
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
    color: C.danger,
    fontFamily: FONT.semibold,
    marginBottom: 4,
  },
  bannerBody: {
    fontSize: 14,
    color: C.text,
    fontFamily: FONT.body,
  },
  issueRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  issueSev: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: C.danger,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    width: 72,
  },
  issueType: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  issueDetail: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
    fontFamily: FONT.body,
  },

  primaryBtn: {
    backgroundColor: C.brand,
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
    backgroundColor: C.fill1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: C.text,
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
    backgroundColor: C.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sideBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.separator,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  recBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: FONT.semibold,
  },
});
