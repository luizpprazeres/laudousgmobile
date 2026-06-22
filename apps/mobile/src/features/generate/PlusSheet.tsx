import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { C, FONT } from "@/ui/tokens";
import { Ruler, X } from "@/ui/icons";

/**
 * Ações secundárias do composer.
 *   - calc:   abre CalculatorsSheet com calculadoras já prontas
 *   - clear:  reseta o editor
 */
type Action = "calc" | "clear";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (a: Action) => void;
};

type Item = {
  id: Action;
  label: string;
  sub: string;
  Icon: typeof Ruler;
  color: string;
};

const ITEMS: Item[] = [
  {
    id: "calc",
    label: "Calculadoras",
    sub: "IG, Doppler obstétrico, anemia fetal",
    Icon: Ruler,
    color: "#F59E0B",
  },
  {
    id: "clear",
    label: "Limpar achados",
    sub: "Começar do zero",
    Icon: X,
    color: "#EF4444",
  },
];

export function PlusSheet({ open, onClose, onPick }: Props) {
  return (
    <Sheet open={open} onClose={onClose} height={320}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}>
        {ITEMS.map((it) => (
          <Pressable
            key={it.id}
            onPress={() => {
              onPick(it.id);
              onClose();
            }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
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
  label: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  sub: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 1,
    fontFamily: FONT.body,
  },
});
