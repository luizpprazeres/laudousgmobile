import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageHeader } from "@/ui/PageHeader";
import { Chevron } from "@/ui/icons";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type PrefItem = {
  label: string;
  value?: string;
  badge?: string;
  toggle?: boolean;
  destructive?: boolean;
};

type PrefSection = {
  title: string;
  items: PrefItem[];
};

// TODO(fase β): hidratar com profile real do Supabase + persistir mudanças.
const SECTIONS: PrefSection[] = [
  {
    title: "Conta",
    items: [
      { label: "Perfil", value: "Dr. Luiz Prazeres" },
      { label: "Email", value: "luizp02121@gmail.com" },
      { label: "Plano", badge: "PRO" },
    ],
  },
  {
    title: "Escrita",
    items: [
      { label: "Modelo padrão", value: "Padrão Dr. Luiz" },
      { label: "Calibragem de estilo", value: "Médio" },
      { label: "Auto-correção", toggle: true },
      { label: "Sanity check clínico", toggle: true },
    ],
  },
  {
    title: "Aparência",
    items: [
      { label: "Tema", value: "Sistema" },
      { label: "Tamanho do texto", value: "Padrão" },
    ],
  },
  {
    title: "Privacidade",
    items: [
      { label: "Exportar meus laudos" },
      { label: "Apagar dados locais", destructive: true },
    ],
  },
];

export default function PreferenciasScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Preferências" />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        {SECTIONS.map((sec) => (
          <View key={sec.title}>
            <Text style={styles.sectionHeader}>{sec.title}</Text>
            <View style={styles.list}>
              {sec.items.map((it, i) => (
                <View
                  key={it.label}
                  style={[
                    styles.row,
                    i < sec.items.length - 1 && styles.rowDivider,
                  ]}
                >
                  <Text
                    style={[
                      styles.label,
                      it.destructive && { color: t.danger },
                    ]}
                  >
                    {it.label}
                  </Text>

                  {it.value && <Text style={styles.value}>{it.value}</Text>}

                  {it.badge && <Text style={styles.badge}>{it.badge}</Text>}

                  {it.toggle && (
                    <View style={styles.toggle}>
                      <View style={styles.toggleKnob} />
                    </View>
                  )}

                  {!it.toggle && !it.destructive && (
                    <Chevron color={t.textGhost} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    sectionHeader: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 6,
      marginHorizontal: 22,
    },
    list: {
      backgroundColor: t.card,
      marginHorizontal: 12,
      borderRadius: 12,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.separator,
    },
    label: {
      flex: 1,
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.body,
    },
    value: {
      fontSize: 14,
      color: t.textSec,
      fontFamily: FONT.body,
    },
    badge: {
      backgroundColor: t.brandLight,
      color: t.brandDeep,
      fontSize: 11,
      fontFamily: FONT.bold,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      letterSpacing: 0.3,
      overflow: "hidden",
    },
    toggle: {
      width: 44,
      height: 26,
      borderRadius: 13,
      backgroundColor: t.brand,
      position: "relative",
    },
    toggleKnob: {
      position: "absolute",
      top: 2,
      left: 20,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#fff",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 3,
      elevation: 2,
    },
  });
}
