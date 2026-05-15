import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageHeader } from "@/ui/PageHeader";
import { Chevron, Search } from "@/ui/icons";
import { C, FONT } from "@/ui/tokens";

type HistItem = {
  id: string;
  patient: string;
  cat: string;
  catColor: string;
  time: string;
  status?: "Rascunho";
};

type HistGroup = {
  date: string;
  items: HistItem[];
};

const GROUPS: HistGroup[] = [
  {
    date: "Hoje",
    items: [
      { id: "OBS-0142", patient: "Maria S.", cat: "Obstétrica", catColor: "#EC4899", time: "14:32", status: "Rascunho" },
      { id: "OBS-0141", patient: "Beatriz O.", cat: "Doppler OB", catColor: "#F97316", time: "09:21" },
      { id: "ABD-0140", patient: "Roberto T.", cat: "Abdome", catColor: "#059669", time: "08:14" },
    ],
  },
  {
    date: "Ontem",
    items: [
      { id: "TIR-0139", patient: "Helena C.", cat: "Tireoide", catColor: "#0EA5E9", time: "17:48" },
      { id: "MAM-0138", patient: "Ana Paula L.", cat: "Mamária", catColor: "#F43F5E", time: "16:02" },
      { id: "OBS-0137", patient: "Sofia R.", cat: "Obstétrica", catColor: "#EC4899", time: "14:30" },
    ],
  },
  {
    date: "12 Mai",
    items: [
      { id: "PEL-0136", patient: "Renata B.", cat: "Pelve", catColor: "#A855F7", time: "11:55" },
      { id: "MOR-0135", patient: "Camila D.", cat: "Morfológico", catColor: "#8B5CF6", time: "09:40" },
    ],
  },
];

// Add 22 alpha = ~13% (0x22 = 34 / 255 ≈ 0.133)
function withAlpha(hex: string) {
  return hex + "22";
}

export default function HistoricoScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <PageHeader title="Histórico" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        <View style={styles.searchWrap}>
          <View style={styles.searchPill}>
            <Search size={16} color={C.textMute} />
            <Text style={styles.searchText}>Buscar paciente, ID, conteúdo…</Text>
          </View>
        </View>

        {GROUPS.map((group) => (
          <View key={group.date}>
            <Text style={styles.groupHeader}>{group.date}</Text>
            <View style={styles.list}>
              {group.items.map((it, i) => (
                <View
                  key={it.id}
                  style={[
                    styles.row,
                    i < group.items.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: withAlpha(it.catColor) },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: it.catColor }]}>
                      {it.cat[0]}
                    </Text>
                  </View>

                  <View style={styles.rowMain}>
                    <Text style={styles.patient}>{it.patient}</Text>
                    <Text style={styles.meta}>
                      {it.cat} · <Text style={styles.metaMono}>{it.id}</Text>
                    </Text>
                  </View>

                  <View style={styles.rowRight}>
                    <Text style={styles.time}>{it.time}</Text>
                    {it.status === "Rascunho" && (
                      <Text style={styles.badge}>RASCUNHO</Text>
                    )}
                  </View>

                  <Chevron color={C.textGhost} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchPill: {
    backgroundColor: C.fill1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchText: {
    fontSize: 15,
    color: C.textMute,
    fontFamily: FONT.body,
  },
  groupHeader: {
    fontSize: 12,
    color: C.textSec,
    fontFamily: FONT.semibold,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: {
    backgroundColor: C.card,
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: FONT.bold,
    fontSize: 14,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  patient: {
    fontSize: 15,
    color: C.text,
    fontFamily: FONT.semibold,
  },
  meta: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 1,
    fontFamily: FONT.body,
  },
  metaMono: {
    fontFamily: "Menlo",
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  time: {
    fontSize: 12,
    color: C.textSec,
    fontFamily: FONT.body,
    fontVariant: ["tabular-nums"],
  },
  badge: {
    backgroundColor: C.warningBg,
    color: C.warningText,
    fontSize: 9.5,
    fontFamily: FONT.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.3,
    overflow: "hidden",
  },
});
