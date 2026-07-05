import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calcularAnemiaMCAPSV,
  AnemiaSeverityLabel,
  type AnemiaMCAPSVResult,
} from "@/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Bloco pronto pra inserir no textarea de achados. */
  onInsert: (bloco: string) => void;
};

const WEEK_OPTIONS = Array.from({ length: 23 }, (_, i) => 18 + i); // 18..40
const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Sheet nativa de anemia fetal por MCA-PSV (Mari, 2000) — port do
 * AnemiaMCAPSVCalculatorSheet.swift. Lógica em @laudousg/shared
 * (anemia.ts → calcularAnemiaMCAPSV). Validado pra IG entre 18 e 40 semanas.
 */
export function AnemiaCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [igWeeks, setIgWeeks] = useState(28);
  const [igDays, setIgDays] = useState(0);
  const [psv, setPsv] = useState("");

  const result: AnemiaMCAPSVResult | null = useMemo(() => {
    const v = decimal(psv);
    if (v == null) return null;
    return calcularAnemiaMCAPSV({ igWeeks, igDays, psvCmSec: v });
  }, [igWeeks, igDays, psv]);

  const handleInsert = (r: AnemiaMCAPSVResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Anemia fetal (MCA-PSV)" height={600}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Risco de anemia fetal pela velocidade de pico sistólico da artéria
          cerebral média (Mari, 2000).
        </Text>
        <Text style={styles.helperMuted}>
          Validado pra IG entre 18 e 40 semanas.
        </Text>

        <Text style={[styles.section, { marginTop: 4 }]}>
          Idade gestacional
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stepper
            label="Semanas"
            value={igWeeks}
            options={WEEK_OPTIONS}
            suffix="sem"
            onChange={setIgWeeks}
          />
          <Stepper
            label="Dias"
            value={igDays}
            options={DAY_OPTIONS}
            suffix="d"
            onChange={setIgDays}
          />
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={styles.label}>MCA-PSV (pico sistólico)</Text>
          <TextInput
            value={psv}
            onChangeText={setPsv}
            placeholder="ex: 55 cm/s"
            placeholderTextColor={t.textMute}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        {result ? (
          <View style={styles.resultBox}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={styles.resultMom}>{formatMom(result.mom)} MoM</Text>
              <Text style={styles.resultPsv}>
                PSV {formatBR(result.psv)} cm/s
              </Text>
            </View>
            <Text style={styles.resultMedian}>
              Mediana esperada: {formatBR(result.medianExpected)} cm/s
            </Text>
            <Text
              style={[
                styles.resultLabel,
                result.severity !== "normal" && { color: t.warningText },
              ]}
            >
              {AnemiaSeverityLabel[result.severity]}
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
            Informe a IG e o MCA-PSV pra ver o MoM e a classificação.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function formatMom(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

// 1 decimal com vírgula (idêntico ao Swift).
function formatBR(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

function decimal(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

function Stepper({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  suffix: string;
  onChange: (v: number) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt} {suffix}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    helper: {
      fontSize: 13,
      color: t.textSec,
      fontFamily: FONT.body,
      marginBottom: 2,
      lineHeight: 18,
    },
    helperMuted: {
      fontSize: 12,
      color: t.textMute,
      fontFamily: FONT.body,
      marginBottom: 16,
    },
    section: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.medium,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    label: {
      fontSize: 11,
      color: t.textMute,
      fontFamily: FONT.medium,
      marginBottom: 4,
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
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 9,
      backgroundColor: t.fill1,
      borderWidth: 1,
      borderColor: t.separator,
    },
    chipActive: {
      backgroundColor: t.brandLight,
      borderColor: t.brand + "55",
    },
    chipText: {
      fontSize: 13,
      color: t.textSec,
      fontFamily: FONT.medium,
    },
    chipTextActive: {
      color: t.brandDeep,
      fontFamily: FONT.semibold,
    },
    resultBox: {
      marginTop: 22,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.brandLight,
      borderWidth: 1,
      borderColor: t.brand + "33",
    },
    resultMom: {
      fontSize: 26,
      color: t.brandDeep,
      fontFamily: FONT.bold,
    },
    resultPsv: {
      fontSize: 14,
      color: t.textSec,
      fontFamily: FONT.body,
    },
    resultMedian: {
      fontSize: 12,
      color: t.textMute,
      fontFamily: FONT.body,
      marginTop: 2,
    },
    resultLabel: {
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.medium,
      marginTop: 6,
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
