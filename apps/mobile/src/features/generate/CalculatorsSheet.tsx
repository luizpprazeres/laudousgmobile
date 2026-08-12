import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { Cal, Ruler, Bar, Layers, Sparkle } from "@/ui/icons";

export type CalcKey =
  | "ig"
  | "doppler"
  | "hadlock"
  | "ila"
  | "anemia"
  | "ductoVenoso"
  | "preEclampsia"
  | "afc"
  | "birads"
  | "tirads"
  | "volProstata"
  | "volResidual"
  | "volTireoide"
  | "volUtero";

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

type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Obstétricas",
    items: [
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
        key: "hadlock",
        label: "Peso fetal (Hadlock)",
        sub: "Estimativa por biometria + percentil (Hadlock 4, 1985)",
        Icon: Bar,
        color: "#6366F1",
      },
      {
        key: "ila",
        label: "ILA 4 quadrantes",
        sub: "Líquido amniótico pela técnica de Phelan (1987)",
        Icon: Layers,
        color: "#0EA5E9",
      },
      {
        key: "anemia",
        label: "Anemia fetal (MCA-PSV)",
        sub: "Risco por Doppler da cerebral média (Mari, 2000)",
        Icon: Sparkle,
        color: "#EF4444",
      },
      {
        key: "ductoVenoso",
        label: "Ducto venoso",
        sub: "IP + onda A com percentil por IG (FMF)",
        Icon: Ruler,
        color: "#8B5CF6",
      },
      {
        key: "preEclampsia",
        label: "Risco de pré-eclâmpsia",
        sub: "Fatores clínicos + Doppler de uterinas (11–14 sem)",
        Icon: Sparkle,
        color: "#D946EF",
      },
    ],
  },
  {
    title: "Ginecologia",
    items: [
      {
        key: "afc",
        label: "Contagem de folículos antrais",
        sub: "Reserva ovariana + padrão SOP (Rotterdam)",
        Icon: Layers,
        color: "#14B8A6",
      },
      {
        key: "volUtero",
        label: "Volume uterino",
        sub: "Elipsoide + faixa por status hormonal",
        Icon: Bar,
        color: "#F43F5E",
      },
    ],
  },
  {
    title: "Mama e tireoide",
    items: [
      {
        key: "birads",
        label: "BI-RADS",
        sub: "Categorias 0–6 com conduta e risco",
        Icon: Layers,
        color: "#EC4899",
      },
      {
        key: "tirads",
        label: "ACR TI-RADS",
        sub: "Pontuação do nódulo + conduta por tamanho",
        Icon: Bar,
        color: "#0EA5E9",
      },
      {
        key: "volTireoide",
        label: "Volume tireoideano",
        sub: "Soma dos lobos (elipsoide) + limite por sexo",
        Icon: Ruler,
        color: "#22C55E",
      },
    ],
  },
  {
    title: "Urologia",
    items: [
      {
        key: "volProstata",
        label: "Volume prostático",
        sub: "Elipsoide + densidade do PSA",
        Icon: Bar,
        color: "#F59E0B",
      },
      {
        key: "volResidual",
        label: "Resíduo pós-miccional",
        sub: "Volume vesical residual + classificação",
        Icon: Layers,
        color: "#64748B",
      },
    ],
  },
];

/**
 * Lista de calculadoras clínicas (paridade iOS: 14). Cada item abre seu
 * próprio sheet; lista rola dentro do sheet.
 */
export function CalculatorsSheet({ open, onClose, onPick }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Sheet open={open} onClose={onClose} title="Calculadoras" height={620}>
      <ScrollView
        style={{ maxHeight: 540 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((sec) => (
          <View key={sec.title}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            {sec.items.map((it) => (
              <Pressable
                key={it.key}
                onPress={() => {
                  onPick(it.key);
                  onClose();
                }}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: it.color + "18" }]}
                >
                  <it.Icon size={20} color={it.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{it.label}</Text>
                  <Text style={styles.sub}>{it.sub}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    sectionTitle: {
      fontSize: 12.5,
      fontFamily: FONT.semibold,
      color: t.textMute,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: 14,
      marginBottom: 6,
      marginLeft: 4,
    },
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
