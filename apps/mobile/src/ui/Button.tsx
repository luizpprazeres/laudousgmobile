import { useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { FONT, RADIUS, SPACING } from "./tokens";
import { useColorTokens } from "./useColorTokens";

/**
 * PrimaryButton / SecondaryButton — paridade com o DesignSystem do app Swift
 * (LaudoUSG/Components/PrimaryButton.swift). PrimaryButton: brand verde,
 * 48px, radius 12, texto branco semibold. SecondaryButton: card + borda,
 * 40px, radius 8, texto secundário. Ambos com animação de press (scale +
 * opacity), como o PressableButtonStyle do Swift.
 */

const BRAND = "#059669";

function usePressAnim(pressedScale: number) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const animate = (toScale: number, toOpacity: number) => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: toScale,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: toOpacity,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };
  return {
    scale,
    opacity,
    onPressIn: () => animate(pressedScale, 0.92),
    onPressOut: () => animate(1, 1),
  };
}

type PrimaryProps = {
  title: string;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function PrimaryButton({
  title,
  icon,
  loading = false,
  disabled = false,
  onPress,
  style,
}: PrimaryProps) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnim(0.96);
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityState={{ disabled: isOff, busy: loading }}
    >
      <Animated.View
        style={[
          {
            minHeight: 48,
            borderRadius: RADIUS.xl,
            backgroundColor: BRAND,
            opacity: isOff ? 0.5 * 1 : opacity,
            transform: [{ scale }],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: SPACING.md,
            gap: SPACING.xs,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text
              style={{
                color: "#fff",
                fontFamily: FONT.semibold,
                fontSize: 16,
                letterSpacing: 0.2,
              }}
            >
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

type SecondaryProps = {
  title: string;
  icon?: ReactNode;
  onPress: () => void;
  style?: ViewStyle;
};

export function SecondaryButton({
  title,
  icon,
  onPress,
  style,
}: SecondaryProps) {
  const t = useColorTokens();
  const { scale, opacity, onPressIn, onPressOut } = usePressAnim(0.98);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            minHeight: 44,
            borderRadius: RADIUS.lg,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.separator,
            opacity,
            transform: [{ scale }],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: SPACING.md,
            gap: SPACING.xs,
          },
          style,
        ]}
      >
        {icon}
        <Text
          style={{
            color: t.textSec,
            fontFamily: FONT.medium,
            fontSize: 15,
          }}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Wrapper só pra centralizar ícone+texto quando precisar fora dos botões. */
export function Row({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
      {children}
    </View>
  );
}
