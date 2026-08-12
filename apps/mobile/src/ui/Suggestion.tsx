import { ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FONT, type ColorTokens } from "./tokens";
import { useColorTokens } from "./useColorTokens";
import { Chevron } from "./icons";

type Props = {
  icon: ReactNode;
  label: string;
  hint?: string;
  onPress?: () => void;
};

export function Suggestion({ icon, label, hint, onPress }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: t.fill2 }}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: t.fill2 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.chev}>
        <Chevron size={14} color={t.textGhost} />
      </View>
    </Pressable>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 13,
      paddingHorizontal: 4,
      marginHorizontal: -4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.separator,
      borderRadius: 6,
    },
    iconBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      flex: 1,
      fontSize: 16,
      color: t.text,
      fontFamily: FONT.body,
    },
    hint: {
      fontSize: 14,
      color: t.textMute,
      fontVariant: ["tabular-nums"],
      fontFamily: FONT.body,
    },
    chev: {
      flexDirection: "row",
      alignItems: "center",
    },
  });
}
