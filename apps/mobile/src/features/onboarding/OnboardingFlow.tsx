import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Audio as AudioNS } from "expo-av";
import { generateReportStream } from "@/lib/api";
import {
  ensureMicPermission,
  startRecording,
  stopAndUpload,
} from "@/features/generate/transcribe";
import { PrimaryButton } from "@/ui/Button";
import { FONT, RADIUS, SPACING, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

/**
 * Onboarding 6 steps — port do iOS OnboardingFlow (welcome → micPermission →
 * firstRecording → processing → firstLaudo → completion). Diferenças
 * deliberadas do port: transcrição SEMPRE Whisper batch (decisão D1 — no iOS o
 * onboarding também usa Whisper), sem confete/matchedGeometry (anotado como
 * polish futuro). Fotos = as mesmas do iOS (comprimidas).
 */

type Step =
  | "welcome"
  | "micPermission"
  | "firstRecording"
  | "processing"
  | "firstLaudo"
  | "completion";

const STAGES = [
  "Áudio transcrito",
  "Achados estruturados",
  "Regras clínicas conferidas",
  "Laudo nascendo na tela",
  "Salvo no histórico",
] as const;

const RECORD_SECONDS = 5;
const DEFAULT_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111";

const IMAGES: Partial<Record<Step, number>> = {
  welcome: require("../../../assets/onboarding/OnboardingWelcome.jpg"),
  micPermission: require("../../../assets/onboarding/OnboardingMic.jpg"),
  completion: require("../../../assets/onboarding/OnboardingDone.jpg"),
};

export function OnboardingFlow({
  displayName,
  onFinish,
}: {
  displayName: string | null;
  /** Chamado tanto em "Concluir/Entrar no app" quanto em "Pular". */
  onFinish: () => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("welcome");
  const [micDenied, setMicDenied] = useState(false);

  // firstRecording
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recordingRef = useRef<AudioNS.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // processing
  const [stageIndex, setStageIndex] = useState(-1);
  const [streamed, setStreamed] = useState("");
  const [finalText, setFinalText] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      abortRef.current?.abort();
      recordingRef.current?.stopAndUnloadAsync().catch(() => undefined);
    },
    [],
  );

  async function askMicPermission() {
    try {
      await ensureMicPermission();
      setMicDenied(false);
      setStep("firstRecording");
    } catch {
      setMicDenied(true);
    }
  }

  async function startFirstRecording() {
    if (recording || transcribing) return;
    try {
      recordingRef.current = await startRecording();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= RECORD_SECONDS) {
            if (timerRef.current) clearInterval(timerRef.current);
            void stopFirstRecording();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setGenError("Não foi possível iniciar a gravação.");
    }
  }

  async function stopFirstRecording() {
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return;
    setRecording(false);
    setTranscribing(true);
    try {
      const result = await stopAndUpload(rec);
      setTranscript(result.transcript);
      setTranscribing(false);
    } catch (e) {
      setTranscribing(false);
      setGenError(
        e instanceof Error ? e.message : "Falha ao transcrever o áudio.",
      );
    }
  }

  async function runGeneration() {
    if (!transcript) return;
    setStep("processing");
    setGenError(null);
    setStageIndex(0); // "Áudio transcrito" já é verdade aqui
    setStreamed("");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let sawToken = false;
      // Acumulador LOCAL — o state `streamed` no done seria closure velha
      // (bug apontado pelo Dex1: primeiro laudo podia vir vazio).
      let acc = "";
      for await (const ev of generateReportStream(
        {
          raw_input: transcript,
          writing_style_id: DEFAULT_WRITING_STYLE_ID,
          category_hint: "ABDOMEN_TOTAL",
        },
        ac.signal,
      )) {
        if (ev.type === "structured") setStageIndex(1);
        if (ev.type === "rag" || ev.type === "validator") setStageIndex(2);
        if (ev.type === "token") {
          if (!sawToken) {
            sawToken = true;
            setStageIndex(3);
          }
          acc += ev.delta;
          setStreamed(acc);
        }
        if (ev.type === "done") {
          setStageIndex(4);
          setFinalText(ev.final_text || acc);
          setTimeout(() => setStep("firstLaudo"), 700);
        }
        if (ev.type === "error") {
          setGenError(ev.message);
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setGenError(e instanceof Error ? e.message : String(e));
    }
  }

  const greeting = displayName?.trim()
    ? `Bem-vindo, ${displayName.trim().split(" ")[0]}.`
    : "Bem-vindo.";

  const stepIndex = [
    "welcome",
    "micPermission",
    "firstRecording",
    "processing",
    "firstLaudo",
    "completion",
  ].indexOf(step);

  return (
    <View style={styles.root}>
      {/* Progresso + Pular (sempre visível, como no iOS) */}
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.dots}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= stepIndex && styles.dotOn]}
            />
          ))}
        </View>
        <Pressable onPress={onFinish} hitSlop={10} accessibilityRole="button">
          <Text style={styles.skip}>Pular</Text>
        </Pressable>
      </View>

      {step === "welcome" ? (
        <StepScaffold
          image={IMAGES.welcome}
          title={greeting}
          body="O LaudoUSG transforma seu ditado em laudo estruturado, pronto para revisar e assinar. Vamos fazer o primeiro juntos?"
          cta="Vamos lá"
          onPress={() => setStep("micPermission")}
          styles={styles}
          insets={insets.bottom}
        />
      ) : null}

      {step === "micPermission" ? (
        <StepScaffold
          image={IMAGES.micPermission}
          title="Sua voz é o teclado"
          body={
            micDenied
              ? "Permissão negada. Abra Ajustes → Apps → LaudoUSG → Permissões e ative o Microfone. Depois volte aqui."
              : "O áudio vira texto na hora. Não guardamos áudio nem dado de paciente."
          }
          cta={micDenied ? "Tentar de novo" : "Permitir microfone"}
          onPress={askMicPermission}
          secondaryLabel={micDenied ? "Fechar onboarding" : undefined}
          onSecondary={micDenied ? onFinish : undefined}
          styles={styles}
          insets={insets.bottom}
        />
      ) : null}

      {step === "firstRecording" ? (
        <View style={styles.content}>
          <View style={styles.catPill}>
            <View style={styles.catDot} />
            <Text style={styles.catPillText}>Abdome Total</Text>
          </View>
          <Text style={styles.title}>Grave seus primeiros achados</Text>
          <Text style={styles.body}>
            Sugestão: “fígado normal, vesícula sem cálculos, rins normais”.
            A gravação para sozinha em {RECORD_SECONDS} segundos.
          </Text>

          <View style={styles.micArea}>
            {recording ? <PulsingBars t={t} /> : null}
            <Pressable
              onPress={recording ? stopFirstRecording : startFirstRecording}
              disabled={transcribing}
              style={[styles.micBtn, recording && styles.micBtnRec]}
              accessibilityRole="button"
            >
              {transcribing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.micIcon}>{recording ? "■" : "🎙"}</Text>
              )}
            </Pressable>
            <Text style={styles.timer}>
              {recording
                ? `00:0${Math.min(seconds, RECORD_SECONDS)} / 00:0${RECORD_SECONDS}`
                : transcribing
                  ? "Transcrevendo…"
                  : transcript
                    ? "Transcrito ✓"
                    : "Toque para gravar"}
            </Text>
          </View>

          {transcript ? (
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : null}
          {genError && !transcript ? (
            <Text style={styles.error}>{genError}</Text>
          ) : null}

          <View style={{ flex: 1 }} />
          <View style={{ paddingBottom: insets.bottom + SPACING.lg }}>
            <PrimaryButton
              title="Gerar meu primeiro laudo"
              disabled={!transcript}
              onPress={runGeneration}
            />
          </View>
        </View>
      ) : null}

      {step === "processing" ? (
        <View style={styles.content}>
          <Text style={styles.title}>Seu laudo está nascendo</Text>
          <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
            {STAGES.map((label, i) => (
              <View key={label} style={styles.stageRow}>
                <View
                  style={[styles.stageDot, i <= stageIndex && styles.stageDotOn]}
                >
                  {i <= stageIndex ? (
                    <Text style={styles.stageCheck}>✓</Text>
                  ) : null}
                </View>
                <Text
                  style={[styles.stageLabel, i <= stageIndex && styles.stageLabelOn]}
                >
                  {label}
                </Text>
                {i === stageIndex + 1 && !genError ? (
                  <ActivityIndicator size="small" color={t.brand} />
                ) : null}
              </View>
            ))}
          </View>

          {streamed ? (
            <ScrollView style={styles.previewCard}>
              <Text style={styles.previewText}>{streamed}▎</Text>
            </ScrollView>
          ) : null}

          {genError ? (
            <View style={{ gap: SPACING.xs, marginTop: SPACING.md }}>
              <Text style={styles.error}>{genError}</Text>
              <PrimaryButton title="Tentar novamente" onPress={runGeneration} />
              <Pressable onPress={onFinish} style={styles.linkBtn}>
                <Text style={styles.link}>Pular</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {step === "firstLaudo" ? (
        <View style={styles.content}>
          <Text style={styles.title}>Foi você que fez.</Text>
          <Text style={styles.body}>
            Ditado vira laudo estruturado — revise, edite e assine.
          </Text>
          <ScrollView style={styles.laudoCard}>
            <Text style={styles.laudoText}>{finalText}</Text>
          </ScrollView>
          <View style={{ paddingBottom: insets.bottom + SPACING.lg }}>
            <PrimaryButton title="Concluir" onPress={() => setStep("completion")} />
          </View>
        </View>
      ) : null}

      {step === "completion" ? (
        <StepScaffold
          image={IMAGES.completion}
          title="Foi assim. Agora é com você."
          body="Cada laudo fica salvo no histórico, pronto para copiar, editar e compartilhar."
          cta="Entrar no app"
          onPress={onFinish}
          styles={styles}
          insets={insets.bottom}
        />
      ) : null}
    </View>
  );
}

function StepScaffold({
  image,
  title,
  body,
  cta,
  onPress,
  secondaryLabel,
  onSecondary,
  styles,
  insets,
}: {
  image?: number;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  styles: ReturnType<typeof makeStyles>;
  insets: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      {image ? (
        <Image source={image} style={styles.photo} resizeMode="cover" />
      ) : null}
      <View style={styles.scaffoldBottom}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <View style={{ height: SPACING.md }} />
        <PrimaryButton title={cta} onPress={onPress} />
        {secondaryLabel && onSecondary ? (
          <Pressable onPress={onSecondary} style={styles.linkBtn}>
            <Text style={styles.link}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
        <View style={{ height: insets + SPACING.lg }} />
      </View>
    </View>
  );
}

/** Barras pulsantes simples durante a gravação (sem nível real — Whisper batch). */
function PulsingBars({ t }: { t: ColorTokens }) {
  const anims = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration: 380 + i * 90,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 380 + i * 70,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 14, height: 40, alignItems: "center" }}>
      {anims.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 36,
            borderRadius: 3,
            backgroundColor: t.brand,
            transform: [{ scaleY: v }],
          }}
        />
      ))}
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.bg,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xs,
    },
    dots: {
      flexDirection: "row",
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.fill1,
    },
    dotOn: {
      backgroundColor: t.brand,
    },
    skip: {
      color: t.textSec,
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
    content: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
    },
    photo: {
      width: "100%",
      flex: 1,
      borderBottomLeftRadius: RADIUS.xxl,
      borderBottomRightRadius: RADIUS.xxl,
    },
    scaffoldBottom: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    title: {
      color: t.text,
      fontFamily: FONT.displayBold,
      fontSize: 26,
    },
    body: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 14.5,
      lineHeight: 21,
      marginTop: SPACING.xs,
    },
    catPill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.card,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom: SPACING.sm,
    },
    catDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.brand,
    },
    catPillText: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 13,
    },
    micArea: {
      alignItems: "center",
      marginTop: SPACING.xl,
    },
    micBtn: {
      width: 108,
      height: 108,
      borderRadius: 54,
      backgroundColor: t.brand,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    micBtnRec: {
      backgroundColor: t.danger,
    },
    micIcon: {
      fontSize: 40,
      color: "#fff",
    },
    timer: {
      marginTop: SPACING.sm,
      color: t.textSec,
      fontFamily: FONT.medium,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
    },
    transcriptCard: {
      marginTop: SPACING.md,
      backgroundColor: t.card,
      borderRadius: RADIUS.xl,
      padding: SPACING.sm,
      maxHeight: 140,
    },
    transcriptText: {
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 14,
      lineHeight: 20,
    },
    stageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    stageDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: t.textGhost,
      alignItems: "center",
      justifyContent: "center",
    },
    stageDotOn: {
      backgroundColor: t.brand,
      borderColor: t.brand,
    },
    stageCheck: {
      color: "#fff",
      fontSize: 12,
      fontFamily: FONT.bold,
      lineHeight: 14,
    },
    stageLabel: {
      color: t.textMute,
      fontFamily: FONT.medium,
      fontSize: 14.5,
      flex: 1,
    },
    stageLabelOn: {
      color: t.text,
    },
    previewCard: {
      marginTop: SPACING.md,
      backgroundColor: t.card,
      borderRadius: RADIUS.xl,
      padding: SPACING.sm,
      maxHeight: 260,
    },
    previewText: {
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 13.5,
      lineHeight: 20,
    },
    laudoCard: {
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
      backgroundColor: t.card,
      borderRadius: RADIUS.xl,
      padding: SPACING.md,
      flex: 1,
    },
    laudoText: {
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 14.5,
      lineHeight: 22,
    },
    error: {
      color: t.danger,
      fontFamily: FONT.medium,
      fontSize: 13,
      marginTop: SPACING.xs,
    },
    linkBtn: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    link: {
      color: t.textSec,
      fontFamily: FONT.semibold,
      fontSize: 14,
    },
  });
}
