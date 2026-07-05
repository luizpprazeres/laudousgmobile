import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { calcularILA, ILALabel, type ILAResult } from "@/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Bloco pronto pra inserir no textarea de achados. */
  onInsert: (bloco: string) => void;
};

/**
 * Sheet nativa de ILA 4 quadrantes (Phelan, 1987) — port do
 * ILA4QCalculatorSheet.swift. Lógica em @laudousg/shared (ila4q.ts).
 */
export function ILA4QCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");

  const result: ILAResult | null = useMemo(() => {
    const v1 = decimal(q1);
    const v2 = decimal(q2);
    const v3 = decimal(q3);
    const v4 = decimal(q4);
    if (v1 == null || v2 == null || v3 == null || v4 == null) return null;
    return calcularILA({ q1: v1, q2: v2, q3: v3, q4: v4 });
  }, [q1, q2, q3, q4]);

  const handleInsert = (r: ILAResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="ILA 4 quadrantes" height={560}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Soma das medidas verticais dos maiores bolsões nos 4 quadrantes
          (técnica de Phelan, 1987).
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field
            label="Quadrante superior direito (Q1)"
            value={q1}
            onChange={setQ1}
          />
          <Field
            label="Quadrante superior esquerdo (Q2)"
            value={q2}
            onChange={setQ2}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Field
            label="Quadrante inferior direito (Q3)"
            value={q3}
            onChange={setQ3}
          />
          <Field
            label="Quadrante inferior esquerdo (Q4)"
            value={q4}
            onChange={setQ4}
          />
        </View>

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTotal}>{formatCm(result.total)} cm</Text>
            <Text
              style={[
                styles.resultLabel,
                result.classification !== "normal" && {
                  color: t.warningText,
                },
              ]}
            >
              {ILALabel[result.classification]}
            </Text>
            <Pressable
              onPress={() => handleInsert(result)}
              style={({ pressed }) => [
                styles.insertBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.insertBtnText}>Inserir no laudo</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>
            Preencha os 4 quadrantes pra ver o ILA e a classificação.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

// Total exibido no card: sempre 1 decimal com vírgula (idêntico ao Swift).
function formatCm(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

function decimal(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="cm"
        placeholderTextColor={t.textMute}
        keyboardType="decimal-pad"
        style={styles.input}
      />
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    helper: {
      fontSize: 13,
      color: t.textSec,
      fontFamily: FONT.body,
      marginBottom: 18,
      lineHeight: 18,
    },
    label: {
      fontSize: 11,
      color: t.textMute,
      fontFamily: FONT.medium,
      marginBottom: 4,
      minHeight: 30,
    },
    input: {
      fontSize: 16,
      color: t.text,
      fontFamily: FONT.body,
      backgroundColor: t.fill1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: t.separator,
      // @ts-expect-error — outline* web-only, no-op nativo
      outlineStyle: "none",
      outlineWidth: 0,
    },
    resultBox: {
      marginTop: 22,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.brandLight,
      borderWidth: 1,
      borderColor: t.brand + "33",
    },
    resultTotal: {
      fontSize: 26,
      color: t.brandDeep,
      fontFamily: FONT.bold,
    },
    resultLabel: {
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.medium,
      marginTop: 4,
      lineHeight: 20,
    },
    insertBtn: {
      marginTop: 14,
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
    hint: {
      fontSize: 13,
      color: t.textMute,
      fontStyle: "italic",
      marginTop: 24,
      textAlign: "center",
    },
  });
}
