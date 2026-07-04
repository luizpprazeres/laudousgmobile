import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

const BAR_COUNT = 32;

type Mode = "recording" | "transcribing";

type Props = {
  transcript?: string;
  showCursor?: boolean;
  /** "recording" mostra timer + waveform animado; "transcribing" mostra
   *  spinner + waveform mais quieto. */
  mode?: Mode;
  /** Nível de áudio REAL (0..1) vindo do metering do expo-av. Quando presente,
   *  o waveform desliza com o nível capturado (evidência de que o mic ouve);
   *  sem ele, cai no modo animado antigo. */
  level?: number | null;
};

export function RecordingOverlay({
  transcript = "Aguardando áudio…",
  showCursor = true,
  mode = "recording",
  level = null,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.3),
  );
  const [seconds, setSeconds] = useState(0);
  const cursor = useRef(new Animated.Value(1)).current;
  const levelRef = useRef<number | null>(level);
  levelRef.current = level;
  const insets = useSafeAreaInsets();
  const isRecording = mode === "recording";

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => {
        const real = levelRef.current;
        if (isRecording && real !== null) {
          // Buffer deslizante com o nível real (mesmo padrão do overlay iOS).
          const next = prev.slice(1);
          next.push(Math.max(0.08, real));
          return next;
        }
        return prev.map(() =>
          isRecording ? 0.2 + Math.random() * 0.8 : 0.15 + Math.random() * 0.25,
        );
      });
      if (isRecording) setSeconds((s) => s + 0.1);
    }, 80);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursor, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursor, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    // Para o loop explicitamente no unmount — evita rodar em background
    // depois do componente ser desmontado (acontece quando o usuário toca
    // em parar gravação e o overlay sai de tela).
    return () => loop.stop();
  }, [cursor]);

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = Math.floor(seconds % 60).toString().padStart(2, "0");

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + 50 }]}
      pointerEvents="box-none"
    >
      <View style={styles.headerRow}>
        <View style={styles.live}>
          {isRecording ? (
            <>
              <View style={styles.liveDot} />
              <Text style={[styles.liveLabel, { color: t.danger }]}>
                GRAVANDO
              </Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color={t.brand} />
              <Text style={[styles.liveLabel, { color: t.brand }]}>
                TRANSCREVENDO
              </Text>
            </>
          )}
        </View>
        {isRecording ? (
          <Text style={styles.timer}>
            {mm}:{ss}
          </Text>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.transcript}>
          {transcript}
          {showCursor ? (
            <Animated.Text style={[styles.cursor, { opacity: cursor }]}>
              {" "}
              ▎
            </Animated.Text>
          ) : null}
        </Text>
        <Text style={styles.help}>
          {isRecording
            ? "Toque em parar quando terminar. A IA estrutura automaticamente."
            : "Aguarde — pode levar alguns segundos."}
        </Text>
      </View>

      <View style={styles.waveform}>
        {bars.map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              minHeight: 4,
              backgroundColor: t.brand,
              borderRadius: 2,
              opacity: isRecording ? 0.85 : 0.4,
              marginHorizontal: 1.5,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 90,
      // Overlay quase opaco sobre a tela — segue o tema pra não virar
      // texto claro sobre fundo branco no dark mode (bg = #0B0B0F).
      backgroundColor:
        t.mode === "dark" ? "rgba(11,11,15,0.95)" : "rgba(255,255,255,0.95)",
      flexDirection: "column",
      zIndex: 100,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    headerRow: {
      paddingHorizontal: 22,
      paddingVertical: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    live: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.danger,
      shadowColor: t.danger,
      shadowOpacity: 0.18,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
    },
    liveLabel: {
      fontSize: 13,
      fontFamily: FONT.semibold,
      letterSpacing: 0.6,
    },
    timer: {
      fontSize: 17,
      fontFamily: FONT.semibold,
      color: t.text,
      fontVariant: ["tabular-nums"],
    },
    body: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: "center",
    },
    transcript: {
      fontSize: 22,
      lineHeight: 32,
      color: t.text,
      fontFamily: FONT.body,
    },
    cursor: {
      color: t.brand,
      fontFamily: FONT.bold,
    },
    help: {
      fontSize: 14,
      color: t.textMute,
      marginTop: 16,
      fontFamily: FONT.body,
    },
    waveform: {
      paddingHorizontal: 28,
      paddingBottom: 28,
      flexDirection: "row",
      alignItems: "center",
      height: 70,
    },
  });
}
