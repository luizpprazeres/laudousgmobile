import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, FONT } from "@/ui/tokens";

const BAR_COUNT = 32;

type Props = {
  transcript?: string;
  showCursor?: boolean;
};

export function RecordingOverlay({
  transcript = "Aguardando áudio…",
  showCursor = true,
}: Props) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.3),
  );
  const [seconds, setSeconds] = useState(0);
  const cursor = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const id = setInterval(() => {
      setBars((prev) => prev.map(() => 0.2 + Math.random() * 0.8));
      setSeconds((s) => s + 0.1);
    }, 80);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Animated.loop(
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
    ).start();
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
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>GRAVANDO</Text>
        </View>
        <Text style={styles.timer}>
          {mm}:{ss}
        </Text>
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
          Toque em parar quando terminar. A IA estrutura automaticamente.
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
              backgroundColor: C.brand,
              borderRadius: 2,
              opacity: 0.85,
              marginHorizontal: 1.5,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 90,
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "column",
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
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
    backgroundColor: C.danger,
    shadowColor: C.danger,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  liveLabel: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.danger,
    letterSpacing: 0.6,
  },
  timer: {
    fontSize: 17,
    fontFamily: FONT.semibold,
    color: C.text,
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
    color: C.text,
    fontFamily: FONT.body,
  },
  cursor: {
    color: C.brand,
    fontFamily: FONT.bold,
  },
  help: {
    fontSize: 14,
    color: C.textMute,
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
