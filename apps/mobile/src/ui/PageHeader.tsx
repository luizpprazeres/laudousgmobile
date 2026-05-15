import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FONT, type ColorTokens } from "./tokens";
import { useColorTokens } from "./useColorTokens";
import { ChevronLeft } from "./icons";

type Props = {
  title: string;
  backLabel?: string;
  onBack?: () => void;
};

export function PageHeader({ title, backLabel = "Laudar", onBack }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const handleBack = onBack ?? (() => router.back());
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 4 }]}>
      <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
        <ChevronLeft size={22} color={t.brand} />
        <Text style={styles.backLabel}>{backLabel}</Text>
      </Pressable>
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingBottom: 10,
      backgroundColor: t.bg,
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
      color: t.brand,
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
      color: t.text,
      fontFamily: FONT.semibold,
    },
  });
}
