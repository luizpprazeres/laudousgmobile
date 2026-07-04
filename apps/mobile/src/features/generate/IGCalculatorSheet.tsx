import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calcByDUM,
  calcByUSG,
  parseDateBR,
  type IGResult,
} from "@/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { Cal, Ruler } from "@/ui/icons";

type Tab = "dum" | "usg";

type Props = {
  open: boolean;
  initialTab?: Tab;
  onClose: () => void;
  /** Recebe o bloco pronto pra inserir no textarea de achados. */
  onInsert: (bloco: string) => void;
};

/**
 * Sheet nativa de calculadora de IG — port do IGCalculatorPanel original.
 * Lógica em @laudousg/shared/calculators (gestationalAge.ts).
 *
 * 2 abas: DUM (data da última menstruação) ou Pela 1ª USG (data + IG na época).
 * Datas aceitas em DD/MM/AAAA via TextInput simples (sem date picker nativo
 * pra evitar dependência adicional). parseDateBR já trata.
 */
export function IGCalculatorSheet({
  open,
  initialTab = "dum",
  onClose,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<Tab>(initialTab);

  // DUM
  const [dumValue, setDumValue] = useState("");
  // USG
  const [usgDate, setUsgDate] = useState("");
  const [usgWeeks, setUsgWeeks] = useState("");
  const [usgDays, setUsgDays] = useState("");

  // Sincroniza initialTab quando o sheet reabre
  useMemo(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const dumResult: IGResult | null = useMemo(() => {
    const dum = parseDateBR(dumValue);
    return dum ? calcByDUM({ dum }) : null;
  }, [dumValue]);

  const usgResult: IGResult | null = useMemo(() => {
    const d = parseDateBR(usgDate);
    const w = parseInt(usgWeeks, 10);
    const dy = parseInt(usgDays, 10);
    if (!d || Number.isNaN(w) || Number.isNaN(dy)) return null;
    return calcByUSG({ usgDate: d, usgWeeks: w, usgDays: dy });
  }, [usgDate, usgWeeks, usgDays]);

  const handleInsert = (result: IGResult) => {
    onInsert(result.insertBloco + "\n\n");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Calcular IG" height={520}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TabBtn
            label="Pela DUM"
            icon={<Cal size={16} color={tab === "dum" ? t.brand : t.textSec} />}
            active={tab === "dum"}
            onPress={() => setTab("dum")}
          />
          <TabBtn
            label="Pela 1ª USG"
            icon={
              <Ruler size={16} color={tab === "usg" ? t.brand : t.textSec} />
            }
            active={tab === "usg"}
            onPress={() => setTab("usg")}
          />
        </View>

        {tab === "dum" ? (
          <View style={styles.section}>
            <Text style={styles.label}>Data da última menstruação (DUM)</Text>
            <TextInput
              value={dumValue}
              onChangeText={setDumValue}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={t.textMute}
              keyboardType="numbers-and-punctuation"
              style={styles.input}
              maxLength={10}
            />
            {dumResult ? (
              <ResultCard result={dumResult} onInsert={handleInsert} />
            ) : (
              <Hint />
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>Data do exame anterior</Text>
            <TextInput
              value={usgDate}
              onChangeText={setUsgDate}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={t.textMute}
              keyboardType="numbers-and-punctuation"
              style={styles.input}
              maxLength={10}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>
              IG na data do exame
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                value={usgWeeks}
                onChangeText={setUsgWeeks}
                placeholder="Semanas"
                placeholderTextColor={t.textMute}
                keyboardType="numeric"
                style={[styles.input, { flex: 1 }]}
                maxLength={2}
              />
              <TextInput
                value={usgDays}
                onChangeText={setUsgDays}
                placeholder="Dias 0–6"
                placeholderTextColor={t.textMute}
                keyboardType="numeric"
                style={[styles.input, { flex: 1 }]}
                maxLength={1}
              />
            </View>

            {usgResult ? (
              <ResultCard result={usgResult} onInsert={handleInsert} />
            ) : (
              <Hint />
            )}
          </View>
        )}
      </View>
    </Sheet>
  );
}

function TabBtn({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      {icon}
      <Text
        style={[
          styles.tabText,
          active && { color: t.brand, fontFamily: FONT.semibold },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ResultCard({
  result,
  onInsert,
}: {
  result: IGResult;
  onInsert: (r: IGResult) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultRow}>
        <Text style={styles.resultKey}>IG atual</Text>
        <Text style={styles.resultValueStrong}>{result.label}</Text>
      </View>
      <View style={styles.resultRow}>
        <Text style={styles.resultKey}>DPP</Text>
        <Text style={styles.resultValue}>
          {result.dpp.toLocaleDateString("pt-BR")}
        </Text>
      </View>
      <Pressable
        onPress={() => onInsert(result)}
        style={({ pressed }) => [
          styles.insertBtn,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.insertBtnText}>Inserir no laudo</Text>
      </Pressable>
    </View>
  );
}

function Hint() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <Text style={styles.hint}>
      Preencha os campos pra ver o cálculo automático.
    </Text>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    tabs: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 18,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: t.fill1,
    },
    tabActive: {
      backgroundColor: t.brandLight,
    },
    tabText: {
      fontSize: 14,
      color: t.textSec,
      fontFamily: FONT.medium,
    },
    section: {},
    label: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.medium,
      marginBottom: 6,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    input: {
      fontSize: 16,
      color: t.text,
      fontFamily: FONT.body,
      backgroundColor: t.fill1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: t.separator,
      // Web: remover outline azul
      // @ts-expect-error — outline* not in RN types
      outlineStyle: "none",
      outlineWidth: 0,
    },
    hint: {
      fontSize: 13,
      color: t.textMute,
      fontStyle: "italic",
      marginTop: 16,
      textAlign: "center",
    },
    resultCard: {
      marginTop: 18,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.brandLight,
      borderWidth: 1,
      borderColor: t.brand + "33",
    },
    resultRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    resultKey: {
      fontSize: 12,
      color: t.brandDeep,
      fontFamily: FONT.medium,
    },
    resultValue: {
      fontSize: 13,
      color: t.brandDeep,
      fontFamily: FONT.semibold,
    },
    resultValueStrong: {
      fontSize: 15,
      color: t.brandDeep,
      fontFamily: FONT.bold,
    },
    insertBtn: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: t.brand,
      alignItems: "center",
    },
    insertBtnText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: FONT.semibold,
      letterSpacing: 0.3,
    },
  });
}
