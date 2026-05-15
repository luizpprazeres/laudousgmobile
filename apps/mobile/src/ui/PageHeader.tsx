import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C, FONT } from "./tokens";
import { ChevronLeft } from "./icons";

type Props = {
  title: string;
  backLabel?: string;
  onBack?: () => void;
};

export function PageHeader({ title, backLabel = "Laudar", onBack }: Props) {
  const insets = useSafeAreaInsets();
  const handleBack = onBack ?? (() => router.back());
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
      <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={22} color={C.brand} />
        <Text style={styles.backLabel}>{backLabel}</Text>
      </Pressable>
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: C.bg,
    position: "relative",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backLabel: {
    color: C.brand,
    fontSize: 16,
    fontFamily: FONT.body,
  },
  titleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    color: C.text,
    fontFamily: FONT.semibold,
  },
});
