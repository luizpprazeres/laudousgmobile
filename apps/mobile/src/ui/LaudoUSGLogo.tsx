import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { FONT, TAGLINE } from "./tokens";
import { useColorTokens } from "./useColorTokens";

type LogoSize = "sm" | "md" | "lg";

/**
 * Wordmark "LaudoUSG" SEM bolinha — alinhado com web laudousg.com e iOS atual.
 *   - "Laudo" Inter Black 900 cor wordmark (#065F46 light, verde-claro dark)
 *   - "USG"   Inter Regular 400 cor wordmarkAccent (#059669 light)
 *
 * Variants:
 *   - "auto"     → follows OS color scheme
 *   - "default"  → forces dark wordmark (use over light backgrounds)
 *   - "white"    → forces white wordmark (use over dark backgrounds / photos)
 */
type LogoVariant = "auto" | "default" | "white";

type Props = {
  size?: LogoSize;
  variant?: LogoVariant;
  showTagline?: boolean;
  style?: ViewStyle;
};

const SIZE_MAP: Record<
  LogoSize,
  {
    wordmark: number;
    tagline: number;
  }
> = {
  sm: { wordmark: 18, tagline: 8 },
  md: { wordmark: 24, tagline: 9 },
  lg: { wordmark: 34, tagline: 11 },
};

export function LaudoUSGLogo({
  size = "md",
  variant = "auto",
  showTagline,
  style,
}: Props) {
  const t = useColorTokens();
  const dims = SIZE_MAP[size];

  const isWhite = variant === "white" || (variant === "auto" && t.mode === "dark");

  const mainColor = isWhite ? "#ffffff" : t.wordmark;
  const accentColor = isWhite ? "rgba(255,255,255,0.7)" : t.wordmarkAccent;
  const subColor = isWhite ? "rgba(255,255,255,0.45)" : t.wordmarkSub;

  const renderTagline = showTagline ?? size !== "sm";

  return (
    <View style={[styles.col, style]}>
      <Text
        style={{
          color: mainColor,
          fontFamily: FONT.black,
          fontSize: dims.wordmark,
          letterSpacing: -0.6,
          includeFontPadding: false,
        }}
        accessibilityLabel="LaudoUSG"
      >
        Laudo
        <Text
          style={{
            color: accentColor,
            fontFamily: FONT.body,
            fontSize: dims.wordmark,
          }}
        >
          USG
        </Text>
      </Text>
      {renderTagline ? (
        <Text
          style={{
            color: subColor,
            fontFamily: FONT.medium,
            fontSize: dims.tagline,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {TAGLINE}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
});
