import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { Cal, Ruler } from "@/ui/icons";

export type CalcKey = "ig" | "doppler";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (key: CalcKey) => void;
};

type Item = {
  key: CalcKey;
  label: string;
  sub: string;
  Icon: typeof Cal;
  color: string;
};

const ITEMS: Item[] = [
  {
    key: "ig",
    label: "Idade gestacional",
    sub: "Por DUM ou pela 1ª USG (ACOG PB 700)",
    Icon: Cal,
    color: "#EC4899",
  },
  {
    key: "doppler",
    label: "Doppler obstétrico",
    sub: "Umbilical · ACM · uterinas · RCP (Barcelona FMF)",
    Icon: Ruler,
    color: "#F97316",
  },
];

/**
 * Lista de calculadoras clínicas. Cada item abre seu próprio sheet.
 */
export function CalculatorsSheet({ open, onClose, onPick }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Sheet open={open} onClose={onClose} title="Calculadoras" height={360}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}>
        {ITEMS.map((it) => (
          <Pressable
            key={it.key}
            onPress={() => {
              onPick(it.key);
              onClose();
            }}
            style={({ pressed }) => [
              styles.row,
              pressed && { opacity: 0.7 },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: it.color + "18" }]}>
              <it.Icon size={20} color={it.color} />
            </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{it.label}</Text>
                <Text style={styles.sub}>{it.sub}</Text>
              </View>
            </Pressable>
        ))}
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
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: t.card,
      marginBottom: 6,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: 16,
      fontFamily: FONT.semibold,
      color: t.text,
    },
    sub: {
      fontSize: 13,
      color: t.textSec,
      marginTop: 1,
      fontFamily: FONT.body,
    },
  });
}
