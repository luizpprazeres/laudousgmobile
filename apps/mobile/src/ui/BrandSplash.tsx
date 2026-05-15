import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LaudoUSGLogo } from "./LaudoUSGLogo";
import { useColorTokens } from "./useColorTokens";

type Props = {
  /** Mostra o spinner discreto sob o logo. Default: true. */
  showSpinner?: boolean;
};

/**
 * Splash visual reutilizável — usado nas transições entre o splash nativo do Expo
 * e a primeira tela renderizada (loading de fontes em _layout, gate de auth em index).
 *
 * Background combina com `expo.splash.backgroundColor` ("#ecfdf5") no app.json
 * para evitar flash de cor entre splash nativo → splash in-app → tela final.
 *
 * Em dark mode, o fundo vira o `bg` do tema e o logo automaticamente troca pra
 * variante "white" via `variant="auto"`.
 */
export function BrandSplash({ showSpinner = true }: Props) {
  const t = useColorTokens();
  // Em light mode usa a cor exata do splash nativo (#ecfdf5 = emerald.50)
  // pra não haver flash. Em dark mode usa o bg do tema.
  const bg = t.bg === "#F2F2F7" ? "#ecfdf5" : t.bg;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <LaudoUSGLogo size="lg" variant="auto" showTagline />
      {showSpinner ? (
        <ActivityIndicator
          color={t.brand}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  spinner: {
    marginTop: 32,
  },
});
