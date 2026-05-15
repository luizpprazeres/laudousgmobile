import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, FONT } from "./tokens";
import { AlertOctagon, AlertTriangle, CheckCircle, Info, X } from "./icons";

export type BannerSeverity = "error" | "warning" | "success" | "info";

type Props = {
  severity?: BannerSeverity;
  title?: string;
  message: string;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
};

type Tone = {
  bg: string;
  fg: string;
  Icon: typeof Info;
};

const TONE: Record<BannerSeverity, Tone> = {
  error: {
    bg: "rgba(255,59,48,0.10)",
    fg: C.danger,
    Icon: AlertOctagon,
  },
  warning: {
    bg: "rgba(245,158,11,0.12)",
    fg: "#B45309",
    Icon: AlertTriangle,
  },
  success: {
    bg: C.brandLight,
    fg: C.brandDeep,
    Icon: CheckCircle,
  },
  info: {
    bg: "rgba(10,132,255,0.10)",
    fg: "#0A66C2",
    Icon: Info,
  },
};

export function Banner({
  severity = "info",
  title,
  message,
  onDismiss,
  action,
}: Props) {
  const tone = TONE[severity];
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: tone.bg },
        {
          opacity: enter,
          transform: [
            {
              translateY: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 0],
              }),
            },
          ],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconBox}>
        <tone.Icon size={18} color={tone.fg} />
      </View>
      <View style={styles.body}>
        {title ? (
          <Text style={[styles.title, { color: tone.fg }]} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        <Text style={styles.message}>{message}</Text>
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={6} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: tone.fg }]}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={styles.closeBtn}
          accessibilityLabel="Fechar"
        >
          <X size={16} color={tone.fg} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  iconBox: {
    paddingTop: 1,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    letterSpacing: 0.1,
  },
  message: {
    fontSize: 14,
    color: C.text,
    fontFamily: FONT.body,
    lineHeight: 19,
  },
  actionBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  actionText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
  },
  closeBtn: {
    paddingTop: 1,
    paddingHorizontal: 2,
  },
});
