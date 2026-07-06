import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

type Props = {
  /** Anima as "linhas de laudo" em loop (carregando). Default: true. */
  showSpinner?: boolean;
};

const LOGO = require("../../assets/brand/expo/logo-laudousg-transparent.png");

// Splash CLARA — o padrão do app é o modo claro; a splash preta antiga
// contrastava demais (pedido Luiz 06/07). Verdes da marca sobre branco.
const SPLASH_BG = "#FFFFFF";
const LINE_COLORS = ["#065F46", "#059669", "#34D399"];
const LINE_WIDTHS = [168, 128, 88];

/**
 * Splash visual reutilizável — transições entre a splash nativa e a primeira
 * tela. Animação leve em Animated core (sem lib nova): a logo entra com um
 * spring suave e, abaixo, três "linhas de laudo" aparecem em sequência e
 * ficam pulsando enquanto carrega — um laudo sendo escrito, na identidade
 * branco+verde. Sem texto: roda ANTES das fontes carregarem.
 */
export function BrandSplash({ showSpinner = true }: Props) {
  const logoIn = useRef(new Animated.Value(0)).current;
  const lines = useRef(
    LINE_WIDTHS.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    Animated.spring(logoIn, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 60,
    }).start();

    // Entrada em cascata (como o laudo sendo redigido, linha a linha)…
    const entrance = Animated.stagger(
      170,
      lines.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );

    if (!showSpinner) {
      entrance.start();
      return;
    }

    // …e depois um pulso contínuo em onda enquanto carrega.
    const pulse = Animated.loop(
      Animated.stagger(
        220,
        lines.map((v) =>
          Animated.sequence([
            Animated.timing(v, {
              toValue: 0.35,
              duration: 520,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 1,
              duration: 520,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );

    const seq = Animated.sequence([entrance, pulse]);
    seq.start();
    return () => seq.stop();
  }, [logoIn, lines, showSpinner]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={{
          opacity: logoIn,
          transform: [
            {
              scale: logoIn.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        }}
      >
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="LaudoUSG"
        />
      </Animated.View>

      <View style={styles.lines} accessibilityLabel="Carregando">
        {lines.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.line,
              {
                width: LINE_WIDTHS[i],
                backgroundColor: LINE_COLORS[i],
                opacity: v,
                transform: [
                  {
                    translateX: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-14, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 132,
    height: 164,
  },
  lines: {
    marginTop: 40,
    alignItems: "flex-start",
    gap: 10,
    width: 168,
  },
  line: {
    height: 7,
    borderRadius: 4,
  },
});
