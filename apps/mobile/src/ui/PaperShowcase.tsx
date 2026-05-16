import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { FONT } from "./tokens";

type Props = {
  width: number;
  height: number;
};

/**
 * PaperShowcase — motion design coreografado, 3 camadas:
 *
 *   Camada 1 (back): 8 papéis A4 pequenos caindo do topo, com drift +
 *     rotação. Faz o "field" eteréo de fundo (depth).
 *
 *   Camada 2 (mid): glow verde brand que pulsa lento atrás da cena
 *     principal. Dá vida ao fundo preto.
 *
 *   Camada 3 (hero): UMA folha A4 maior, protagonista, que executa
 *     ciclo de 7s:
 *       0.00–0.15 → sobe de baixo + rotaciona suave (entrada)
 *       0.15–0.55 → 4 linhas de texto crescem em width sequencial
 *                   (efeito typewriter visual, simulando laudo sendo escrito)
 *       0.55–0.65 → stamp verde "✓" aparece com scale bounce + rotação
 *       0.65–0.85 → hover sutil (sin) — papel completo "flutuando"
 *       0.85–1.00 → sobe pelo topo, fade out → volta pra 0
 *
 * Tudo em Animated nativo, useNativeDriver onde possível. Para width
 * animado das linhas, usamos non-native driver (necessário) — apenas em
 * 4 elementos pequenos, perf OK.
 */
export function PaperShowcase({ width, height }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { width, height, overflow: "hidden" }]}
    >
      <BackgroundPapers width={width} height={height} />
      <GlowOrb width={width} height={height} />
      <HeroPaper width={width} height={height} />
    </View>
  );
}

// ─── Camada 1: papéis de fundo ────────────────────────────────────
function BackgroundPapers({ width, height }: Props) {
  const papers = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const w = 14 + Math.random() * 22;
        return {
          id: i,
          xStart: Math.random() * width,
          driftAmount: 18 + Math.random() * 30,
          driftSign: Math.random() > 0.5 ? 1 : -1,
          w,
          h: w * 1.414,
          rotBase: -20 + Math.random() * 40,
          rotDelta: 10 + Math.random() * 18,
          peakOpacity: 0.1 + (w / 36) * 0.22,
          durationMs: 11000 + Math.random() * 9000,
          delayMs: Math.random() * 7000,
        };
      }),
    [width],
  );

  return (
    <>
      {papers.map((p) => (
        <BgPaper key={p.id} {...p} containerHeight={height} />
      ))}
    </>
  );
}

function BgPaper(props: {
  xStart: number;
  driftAmount: number;
  driftSign: number;
  w: number;
  h: number;
  rotBase: number;
  rotDelta: number;
  peakOpacity: number;
  durationMs: number;
  delayMs: number;
  containerHeight: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(props.delayMs),
        Animated.timing(progress, {
          toValue: 1,
          duration: props.durationMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, props.durationMs, props.delayMs]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-props.h - 30, props.containerHeight + 30],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      0,
      props.driftAmount * props.driftSign,
      0,
    ],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      `${props.rotBase}deg`,
      `${props.rotBase + props.rotDelta}deg`,
      `${props.rotBase - props.rotDelta * 0.5}deg`,
    ],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.88, 1],
    outputRange: [0, props.peakOpacity, props.peakOpacity, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: props.xStart,
        width: props.w,
        height: props.h,
        backgroundColor: "#f5f5f7",
        borderRadius: 1.5,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        borderColor: "rgba(0,0,0,0.06)",
        borderWidth: StyleSheet.hairlineWidth,
      }}
    />
  );
}

// ─── Camada 2: glow orb pulsante atrás da cena ─────────────────────
function GlowOrb({ width, height }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const orbSize = Math.min(width, height) * 0.85;
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.05],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.22],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: width / 2 - orbSize / 2,
        top: height * 0.32 - orbSize / 2,
        width: orbSize,
        height: orbSize,
        borderRadius: orbSize / 2,
        backgroundColor: "#10B981",
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Camada 3: papel hero protagonista ─────────────────────────────
const HERO_CYCLE_MS = 7000;
const HERO_LINES = [
  { startAt: 0.18, w: 0.92 },
  { startAt: 0.28, w: 1.0 },
  { startAt: 0.38, w: 0.85 },
  { startAt: 0.48, w: 0.55 },
];
// Janela de growth do typewriter pra cada linha (fração do ciclo)
const LINE_GROW_WINDOW = 0.07;

function HeroPaper({ width, height }: Props) {
  const cycle = useRef(new Animated.Value(0)).current;
  const stampScale = useRef(new Animated.Value(0)).current;
  const stampRotate = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;

  // Linha widths são valores não-nativos (precisamos animar `width`).
  const lineWidths = useRef(HERO_LINES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const cycleLoop = Animated.loop(
      Animated.timing(cycle, {
        toValue: 1,
        duration: HERO_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    cycleLoop.start();

    // Hover (oscilação sutil contínua, independente do cycle)
    const hoverLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hover, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hover, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    hoverLoop.start();

    // Coreografia das linhas + stamp usando listener no `cycle`
    const listener = cycle.addListener(({ value }) => {
      HERO_LINES.forEach((line, i) => {
        const local =
          (value - line.startAt) / LINE_GROW_WINDOW;
        const clamped = Math.max(0, Math.min(1, local));
        // Quando o ciclo "reseta" (value vai pra 0), reset todas as linhas
        if (value < 0.15) {
          lineWidths[i].setValue(0);
        } else if (value > 0.85) {
          // Mantém durante fade-out
        } else {
          lineWidths[i].setValue(clamped * line.w);
        }
      });

      // Stamp: aparece em 0.58 com bounce
      if (value > 0.58 && value < 0.85) {
        const local = Math.min(1, (value - 0.58) / 0.08);
        stampScale.setValue(easeOutBack(local));
        stampRotate.setValue(local);
      } else if (value < 0.15) {
        stampScale.setValue(0);
        stampRotate.setValue(0);
      }
    });

    return () => {
      cycleLoop.stop();
      hoverLoop.stop();
      cycle.removeListener(listener);
    };
  }, [cycle, hover, lineWidths, stampScale, stampRotate]);

  const heroW = Math.min(width * 0.5, 200);
  const heroH = heroW * 1.414;

  // Trajetória da folha hero ao longo do ciclo:
  //  0.0 → 0.15 : entra de baixo (translateY de +containerH/2 pra 0)
  //  0.15 → 0.85: fica parado (com hover sutil)
  //  0.85 → 1.0 : sobe e some pelo topo
  const heroTranslateY = cycle.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [height * 0.6, 0, 0, -height * 0.7],
  });
  const hoverY = hover.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  });
  const heroRotate = cycle.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: ["-12deg", "0deg", "0deg", "8deg"],
  });
  const heroOpacity = cycle.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  const stampScaleInterp = stampScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const stampRotateInterp = stampRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-20deg", "8deg"],
  });

  const positionTop = height * 0.16;
  const positionLeft = width / 2 - heroW / 2;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: positionLeft,
        top: positionTop,
        width: heroW,
        height: heroH,
        opacity: heroOpacity,
        transform: [{ translateY: heroTranslateY }, { rotate: heroRotate }],
      }}
    >
      <Animated.View
        style={{
          width: heroW,
          height: heroH,
          backgroundColor: "#ffffff",
          borderRadius: 4,
          shadowColor: "#10B981",
          shadowOpacity: 0.35,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 14 },
          elevation: 10,
          paddingHorizontal: heroW * 0.1,
          paddingTop: heroH * 0.12,
          transform: [{ translateY: hoverY }],
        }}
      >
        {/* Cabeçalho do "laudo" — bloco verde brand */}
        <View
          style={{
            width: heroW * 0.4,
            height: 4,
            backgroundColor: "#059669",
            borderRadius: 2,
            marginBottom: heroH * 0.06,
          }}
        />

        {/* Linhas com width animado */}
        {HERO_LINES.map((line, i) => (
          <Animated.View
            key={i}
            style={{
              height: heroH * 0.025,
              backgroundColor: "rgba(0,0,0,0.20)",
              borderRadius: 2,
              marginBottom: heroH * 0.035,
              width: lineWidths[i].interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            }}
          />
        ))}

        {/* Stamp verde "✓" no canto inferior direito */}
        <Animated.View
          style={{
            position: "absolute",
            right: heroW * 0.08,
            bottom: heroH * 0.08,
            width: heroW * 0.22,
            height: heroW * 0.22,
            borderRadius: heroW * 0.11,
            backgroundColor: "rgba(16,185,129,0.15)",
            borderWidth: 2,
            borderColor: "#10B981",
            alignItems: "center",
            justifyContent: "center",
            transform: [
              { scale: stampScaleInterp },
              { rotate: stampRotateInterp },
            ],
          }}
        >
          <Text
            style={{
              color: "#10B981",
              fontSize: heroW * 0.14,
              fontFamily: FONT.bold,
              lineHeight: heroW * 0.18,
            }}
          >
            ✓
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// Easing aproximado do easeOutBack (overshoot) — usado pelo stamp bounce
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const t = Math.max(0, Math.min(1, x));
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
