import { ActivityIndicator, Image, StyleSheet, View } from "react-native";

type Props = {
  /** Mostra o spinner discreto sob o logo. Default: true. */
  showSpinner?: boolean;
};

const LOGO = require("../../assets/brand/logos/logo-laudousg-white.png");

// Preto puro OLED — mesma cor do login pra eliminar flash visual entre
// splash nativo → BrandSplash → /login. Splash nativo também é #000
// (app.json → expo.splash.backgroundColor).
const SPLASH_BG = "#000000";
const SPINNER_COLOR = "#10B981"; // brand verde

/**
 * Splash visual reutilizável — usado nas transições entre o splash nativo
 * do Expo e a primeira tela renderizada.
 *
 * Usa o logo white (mesmo do login) — funciona ANTES das fontes carregarem
 * (vide app/_layout.tsx). Fundo preto OLED em light e dark mode pra
 * continuidade visual com /login.
 */
export function BrandSplash({ showSpinner = true }: Props) {
  return (
    <View style={styles.root}>
      <Image
        source={LOGO}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="LaudoUSG"
      />
      {showSpinner ? (
        <ActivityIndicator
          color={SPINNER_COLOR}
          style={styles.spinner}
          accessibilityLabel="Carregando"
        />
      ) : null}
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
    // 1024×558 → aspect 1.83:1. Width 320 dá altura ~174 — bom equilíbrio mobile.
    // maxWidth garante que em telas pequenas o logo não vaze.
    width: 320,
    maxWidth: "75%",
    aspectRatio: 1024 / 558,
  },
  spinner: {
    marginTop: 36,
  },
});
