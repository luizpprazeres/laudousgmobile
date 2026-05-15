import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT } from "./tokens";
import { Chevron } from "./icons";

type Props = {
  icon: ReactNode;
  label: string;
  hint?: string;
  onPress?: () => void;
};

export function Suggestion({ icon, label, hint, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: C.fill2 }}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: C.fill2 },
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
        <Chevron size={14} color={C.textGhost} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 4,
    marginHorizontal: -4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.separator,
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
    color: C.text,
    fontFamily: FONT.body,
  },
  hint: {
    fontSize: 14,
    color: C.textMute,
    fontVariant: ["tabular-nums"],
    fontFamily: FONT.body,
  },
  chev: {
    flexDirection: "row",
    alignItems: "center",
  },
});
