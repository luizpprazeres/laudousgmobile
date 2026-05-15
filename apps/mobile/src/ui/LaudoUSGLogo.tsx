import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { FONT, TAGLINE } from "./tokens";
import { useColorTokens } from "./useColorTokens";

type LogoSize = "sm" | "md" | "lg";

/**
 * Three variants:
 *   - "auto"     → follows the OS color scheme (transparent over light, white over dark)
 *   - "default"  → forces the dark wordmark + transparent PNG (use over light backgrounds)
 *   - "white"    → forces white wordmark + white PNG (use over dark backgrounds / photos)
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
    iconPx: number;
    wordmark: number;
    tagline: number;
    gap: number;
  }
> = {
  sm: { iconPx: 24, wordmark: 16, tagline: 8, gap: 8 },
  md: { iconPx: 36, wordmark: 20, tagline: 9, gap: 10 },
  lg: { iconPx: 48, wordmark: 30, tagline: 11, gap: 12 },
};

const TRANSPARENT_PNG = require("../../assets/brand/logos/logo-laudousg-transparent.png");
const WHITE_PNG = require("../../assets/brand/logos/logo-laudousg-white.png");

export function LaudoUSGLogo({
  size = "md",
  variant = "auto",
  showTagline,
  style,
}: Props) {
  const t = useColorTokens();
  const dims = SIZE_MAP[size];

  // resolve variant
  const isWhite = variant === "white" || (variant === "auto" && t.bg === "#0B0B0F");

  const mainColor = isWhite ? "#ffffff" : t.wordmark;
  const accentColor = isWhite ? "rgba(255,255,255,0.65)" : t.wordmarkAccent;
  const subColor = isWhite ? "rgba(255,255,255,0.45)" : t.wordmarkSub;

  const renderTagline = showTagline ?? size !== "sm";

  return (
    <View style={[styles.row, { gap: dims.gap }, style]}>
      <Image
        source={isWhite ? WHITE_PNG : TRANSPARENT_PNG}
        style={{ width: dims.iconPx, height: dims.iconPx }}
        resizeMode="contain"
        accessibilityLabel="LaudoUSG"
      />
      <View>
        <Text
          style={{
            color: mainColor,
            fontFamily: FONT.bold,
            fontSize: dims.wordmark,
            letterSpacing: -0.4,
            includeFontPadding: false,
          }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
