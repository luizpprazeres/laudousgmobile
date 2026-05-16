import { Pressable, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { C, FONT } from "@/ui/tokens";
import { Layers, Ruler, X } from "@/ui/icons";

/**
 * Ações secundárias do composer. "Trocar modelo" foi removida — a troca
 * de categoria já é feita pelo chip no header (mais direto). Mantemos:
 *   - calc: calculadoras (ainda em breve)
 *   - clear: reseta o editor
 *
 * "camera" também foi removida: backend ainda não processa imagem.
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
  Icon: typeof Layers;
  color: string;
  comingSoon?: boolean;
};

const ITEMS: Item[] = [
  {
    id: "calc",
    label: "Calculadoras",
    sub: "Doppler, FMF, gemelar",
    Icon: Ruler,
    color: "#F59E0B",
    comingSoon: true,
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
