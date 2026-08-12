import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { CATS, Category, FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { CheckCircle } from "@/ui/icons";

type Props = {
  open: boolean;
  onClose: () => void;
  current: string;
  onPick: (cat: Category) => void;
};

export function CategorySheet({ open, onClose, current, onPick }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Sheet open={open} onClose={onClose} title="Escolher especialidade" height={620}>
      <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 32 }}>
        {CATS.map((cat) => {
          const active = cat.id === current;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                onPick(cat);
                onClose();
              }}
              style={[styles.row, active && styles.rowActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.iconBox, { backgroundColor: cat.color + "22" }]}>
                <Text style={[styles.iconLetter, { color: cat.color }]}>
                  {cat.label[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{cat.label}</Text>
                <Text style={styles.sub}>{cat.sub}</Text>
              </View>
              {active ? <CheckCircle size={20} color={t.brand} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 2,
    },
    rowActive: {
      backgroundColor: t.card,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    iconLetter: {
      fontSize: 17,
      fontFamily: FONT.bold,
    },
    label: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 16,
    },
    sub: {
      color: t.textSec,
      fontSize: 13,
      marginTop: 2,
      fontFamily: FONT.body,
    },
  });
}
