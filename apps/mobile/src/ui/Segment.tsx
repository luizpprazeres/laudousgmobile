import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FONT, type ColorTokens } from "./tokens";
import { useColorTokens } from "./useColorTokens";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  dot?: boolean;
};

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
};

export function Segment<T extends string>({ value, onChange, options }: Props<T>) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.btn, active && styles.btnActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View style={styles.btnInner}>
              <Text
                style={[
                  styles.label,
                  active ? styles.labelActive : styles.labelIdle,
                ]}
              >
                {o.label}
              </Text>
              {o.dot ? <View style={[styles.dot, active && styles.dotActive]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    // Capsule estilo iOS: pill ativa verde (brand) com texto branco.
    wrap: {
      flexDirection: "row",
      backgroundColor: t.fill1,
      borderRadius: 999,
      padding: 3,
      marginHorizontal: 16,
    },
    btn: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    btnActive: {
      backgroundColor: t.brand,
    },
    btnInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    label: {
      fontSize: 13,
    },
    labelActive: {
      color: "#fff",
      fontFamily: FONT.semibold,
    },
    labelIdle: {
      color: t.text2,
      fontFamily: FONT.medium,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.brand,
    },
    dotActive: {
      backgroundColor: "#fff",
    },
  });
}
