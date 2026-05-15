import { ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { FONT, type ColorTokens } from "./tokens";
import { useColorTokens } from "./useColorTokens";

type Props = {
  /** Render an icon in the rounded square. Pass an icon component instance. */
  icon: ReactNode;
  /** Bold short headline. */
  title: string;
  /** Supporting copy under the headline. */
  message?: string;
  /** Optional CTA button rendered below the message. */
  action?: {
    label: string;
    onPress: () => void;
  };
  /** Optional small label between icon and title (e.g. "EM BREVE"). */
  badge?: string;
  /** Optional override for the colored tint behind the icon. Defaults to brand. */
  iconTint?: string;
  style?: ViewStyle;
};

export function EmptyState({
  icon,
  title,
  message,
  action,
  badge,
  iconTint,
  style,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const tint = iconTint ?? t.brand;
  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: tint + "1F" },
        ]}
      >
        {icon}
      </View>
      {badge ? (
        <Text style={[styles.badge, { color: tint }]}>{badge}</Text>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={[styles.cta, { backgroundColor: t.brand }]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    iconBox: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    badge: {
      fontSize: 11,
      fontFamily: FONT.bold,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    title: {
      fontFamily: FONT.semibold,
      fontSize: 17,
      color: t.text,
      textAlign: "center",
      letterSpacing: -0.1,
    },
    message: {
      fontFamily: FONT.body,
      fontSize: 14,
      color: t.textSec,
      textAlign: "center",
      marginTop: 8,
      maxWidth: 280,
      lineHeight: 20,
    },
    cta: {
      borderRadius: 12,
      paddingHorizontal: 22,
      paddingVertical: 13,
      marginTop: 22,
      shadowColor: t.brand,
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    ctaText: {
      color: "#fff",
      fontSize: 15,
      fontFamily: FONT.semibold,
      letterSpacing: 0.2,
    },
  });
}
