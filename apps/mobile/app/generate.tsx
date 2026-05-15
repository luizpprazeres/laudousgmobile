import { useReducer, useRef, useState } from "react";
import {
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
import { LaudoUSGLogo } from "@/ui/LaudoUSGLogo";

const DEFAULT_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111";

const SNIPPETS: Record<string, string> = {
  usg:
    "IG pela 1ª USG (8s2d em 03/12/2025): 28 semanas e 6 dias.\nDPP corrigida: 17/07/2026.\n\n",
  frase:
    "Feto único, vivo, em apresentação cefálica, dorso à esquerda. Batimentos cardíacos fetais de 142 bpm, regulares. Movimentos fetais ativos.\n\n",
};

const MOCK_TRANSCRIPTION =
  "Feto único, vivo, em apresentação cefálica, dorso à esquerda. Batimentos cardíacos fetais de 142 bpm, regulares.\n\nBiometria:\n- DBP 7,2 cm\n- CC 26,8 cm\n- CA 24,1 cm\n- CF 5,4 cm\n\n";

type Tab = "achados" | "laudo" | "extra";

export default function GenerateScreen() {
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(generateReducer, initialGenerateState);
  const [tab, setTab] = useState<Tab>("achados");
  const [cat, setCat] = useState<Category>(CATS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [mock, setMock] = useState<MockScenario | null>(__DEV__ ? "happy" : null);
  const [notice, setNotice] = useState<{
    severity: BannerSeverity;
    title?: string;
    message: string;
  } | null>(null);
  const aborterRef = useRef<AbortController | null>(null);

  const text =
    "text" in state ? (state as { text: string }).text : "";
  const hasContent = text.trim().length > 0;
  const recording = state.kind === "recording";
  const generating = state.kind === "generating";
  const isStreaming = generating || state.kind === "done";

  const startGenerate = async () => {
    if (state.kind !== "ready") return;
    setTab("laudo");
    dispatch({ type: "GENERATE" });
    const ac = new AbortController();
    aborterRef.current = ac;
    try {
      for await (const ev of generateReportStream(
        {
          raw_input: text || "(input em branco — modo mock)",
          writing_style_id: DEFAULT_WRITING_STYLE_ID,
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
  };

  const cancelGenerate = () => {
    aborterRef.current?.abort();
    dispatch({ type: "RESET" });
    setTab("achados");
  };

  const insertSnippet = (key: keyof typeof SNIPPETS) => {
    dispatch({ type: "EDIT_TEXT", text: text + SNIPPETS[key] });
  };

  const onMicToggle = () => {
    if (recording) {
      dispatch({ type: "STOP_REC" });
      // stub Deepgram: simula transcrição instantânea
      setTimeout(() => {
        dispatch({ type: "TRANSCRIPTION_DONE", text: MOCK_TRANSCRIPTION });
      }, 250);
      return;
    }
    if (state.kind === "idle" || state.kind === "ready") {
      dispatch({ type: "START_REC" });
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
    if (a === "calc") {
      setTab("extra");
      return;
    }
    setNotice({
      severity: "info",
      title: "Em breve",
      message: "Análise de imagem por IA chega na próxima sessão.",
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
          <LaudoUSGLogo size="sm" variant="auto" showTagline={false} />
        </Pressable>
        {__DEV__ ? (
          <Pressable onPress={cycleMock} style={styles.devChip}>
            <Text style={styles.devChipText}>
              mock: {mock ?? "real"}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.navBtn} />
        )}
      </View>

      {/* Tabs */}
      <View style={{ paddingTop: 4 }}>
        <Segment<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "achados", label: "Achados", dot: hasContent },
            { value: "laudo", label: "Laudo" },
            { value: "extra", label: "Extra" },
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
              onResume={() => {
                setNotice({
                  severity: "info",
                  title: "Em breve",
                  message:
                    "Retomada com respostas do clarify chega na próxima sessão.",
                });
              }}
              onOpenReport={(id) => router.push(`/report/${id}`)}
              onReset={() => {
                dispatch({ type: "RESET" });
                setTab("achados");
              }}
            />
          )}

          {tab === "extra" && <ExtraBody />}
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
            disabled={recording}
            style={[
              styles.sideBtn,
              { opacity: recording ? 0.35 : 1 },
            ]}
            accessibilityLabel="Mais ações"
          >
            <Plus size={22} color={C.text2} />
          </Pressable>

          <Pressable
            onPress={onMicToggle}
            disabled={isStreaming}
            style={[
              styles.recBtn,
              {
                backgroundColor: recording ? C.danger : C.brand,
                shadowColor: recording ? C.danger : C.brand,
                opacity: isStreaming ? 0.6 : 1,
              },
            ]}
            accessibilityLabel={recording ? "Parar gravação" : "Gravar achados"}
          >
            {recording ? (
              <Stop size={16} color="#fff" />
            ) : (
              <Mic size={18} color="#fff" />
            )}
            <Text style={styles.recBtnText}>
              {recording ? "Parar gravação" : "Gravar achados"}
            </Text>
          </Pressable>

          <Pressable
            onPress={hasContent && !generating && !recording ? startGenerate : undefined}
            disabled={!hasContent || generating || recording}
            style={[
              styles.sideBtn,
              {
                opacity: recording ? 0.35 : hasContent ? 1 : 0.55,
              },
            ]}
            accessibilityLabel="Gerar laudo"
          >
            <Send
              size={18}
              color={hasContent && !recording ? C.brand : C.textGhost}
            />
          </Pressable>
        </View>
      </View>

      {/* Overlays */}
      {recording ? (
        <RecordingOverlay transcript="Aguardando microfone…" />
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
  if (hasContent) {
    return (
      <TextInput
        value={text}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        textAlignVertical="top"
        placeholder="Continue digitando ou ditando…"
        placeholderTextColor={C.textMute}
        style={styles.editor}
      />
    );
  }
  return (
    <View>
      <Text style={styles.emptyTitle}>
        Toque o microfone para ditar ou comece a digitar.
      </Text>
      <Text style={styles.emptySub}>
        A IA organiza no padrão de {cat.label}.
      </Text>

      <Text style={styles.sectionLabel}>Inserir</Text>
      <Suggestion
        icon={<Ruler size={18} color={C.textSec} />}
        label="IG pela 1ª USG"
        hint="calcular"
        onPress={() => onSnippet("usg")}
      />
      <Suggestion
        icon={<Quote size={18} color={C.textSec} />}
        label="Frases salvas"
        hint="12"
        onPress={() => onSnippet("frase")}
      />
      <Suggestion
        icon={<Layers size={18} color={C.textSec} />}
        label="Trocar modelo"
        hint={cat.label}
        onPress={onChangeModel}
      />

      <Text style={styles.emptyHint}>
        Suas frases recentes e calculadoras aparecem aqui conforme você laudar.
      </Text>
    </View>
  );
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
        <Text style={styles.laudoTitle}>Laudo gerado</Text>
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
  return (
    <View>
      <Text style={styles.sectionLabel}>Obstétricas</Text>
      <Suggestion
        icon={<Cal size={18} color={C.textSec} />}
        label="Idade gestacional (DUM)"
        hint="28+4s"
      />
      <Suggestion
        icon={<Ruler size={18} color={C.textSec} />}
        label="Biometria fetal"
      />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="FMF — Risco trissomias" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Doppler — IR, IP, S/D" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Anemia fetal (PVS-ACM)" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Restrição (RCF)" />
      <Suggestion icon={<Cal size={18} color={C.textSec} />} label="Gemelaridade" />
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
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  devChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FFF3CD",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#F0BB31",
  },
  devChipText: {
    color: "#946700",
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
    paddingTop: 8,
    zIndex: 110,
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
