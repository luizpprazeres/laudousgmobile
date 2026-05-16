import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { C, FONT } from "@/ui/tokens";
import { Cal, Layers, Ruler } from "@/ui/icons";

export type CalcKey = "ig" | "doppler" | "anemia";

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
  comingSoon?: boolean;
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
  {
    key: "anemia",
    label: "Anemia fetal (PSV-ACM)",
    sub: "MoM e classificação Barcelona",
    Icon: Layers,
    color: "#8B5CF6",
    comingSoon: true,
  },
];

/**
 * Lista de calculadoras clínicas. Cada item abre seu próprio sheet.
 * Calc com comingSoon ainda não tem UI implementada (lógica já portada
 * em @laudousg/shared, falta o wrapper de UI).
 */
export function CalculatorsSheet({ open, onClose, onPick }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Calculadoras" height={360}>
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}>
        {ITEMS.map((it) => (
          <Pressable
            key={it.key}
            onPress={() => {
              if (it.comingSoon) return;
              onPick(it.key);
              onClose();
            }}
            style={({ pressed }) => [
              styles.row,
              pressed && !it.comingSoon && { opacity: 0.7 },
              it.comingSoon && { opacity: 0.55 },
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: it.color + "18" }]}>
              <it.Icon size={20} color={it.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{it.label}</Text>
                {it.comingSoon ? (
                  <Text style={styles.soonBadge}>EM BREVE</Text>
                ) : null}
              </View>
              <Text style={styles.sub}>{it.sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.card,
    marginBottom: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  soonBadge: {
    fontSize: 9.5,
    fontFamily: FONT.bold,
    color: C.textMute,
    backgroundColor: C.fill1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.4,
    overflow: "hidden",
  },
  sub: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 1,
    fontFamily: FONT.body,
  },
});
