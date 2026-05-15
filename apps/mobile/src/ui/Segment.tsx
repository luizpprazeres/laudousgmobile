import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT } from "./tokens";

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
              {o.dot ? <View style={styles.dot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: C.fill1,
    borderRadius: 9,
    padding: 2,
    marginHorizontal: 16,
  },
  btn: {
    flex: 1,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: C.card,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
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
    color: C.text,
    fontFamily: FONT.semibold,
  },
  labelIdle: {
    color: C.text2,
    fontFamily: FONT.medium,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.brand,
  },
});
