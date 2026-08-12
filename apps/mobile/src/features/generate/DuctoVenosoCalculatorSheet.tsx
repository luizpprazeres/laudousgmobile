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
  calcularDuctoVenoso,
  type DuctoVenosoResult,
  type OndaA,
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

const WEEK_OPTIONS = Array.from({ length: 21 }, (_, i) => 20 + i); // 20..40

const ONDA_OPTIONS: { value: OndaA; label: string }[] = [
  { value: "positiva", label: "Positiva" },
  { value: "ausente", label: "Ausente" },
  { value: "reversa", label: "Reversa" },
];

/**
 * Sheet nativa do Doppler do ducto venoso (Z-score, Hecher 2001) — port do
 * DuctoVenosoCalculatorSheet.swift. Lógica em @laudousg/shared (ductoVenoso.ts).
 */
export function DuctoVenosoCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [pi, setPi] = useState("");
  const [igWeeks, setIgWeeks] = useState(28);
  const [ondaA, setOndaA] = useState<OndaA>("positiva");

  const result: DuctoVenosoResult | null = useMemo(() => {
    const p = decimal(pi);
    if (p == null) return null;
    return calcularDuctoVenoso({ igWeeks, pi: p, ondaA });
  }, [pi, igWeeks, ondaA]);

  const handleInsert = (r: DuctoVenosoResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  const abnormal = result != null && result.classification !== "normal";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ducto venoso (Z-score)"
      height={620}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Z-score do IP do ducto venoso fetal (Hecher 2001). Marcador de função
          cardíaca direita.
        </Text>

        <Text style={[styles.section, { marginTop: 16 }]}>
          Idade gestacional
        </Text>
        <Stepper
          value={igWeeks}
          options={WEEK_OPTIONS}
          suffix="sem"
          onChange={setIgWeeks}
        />

        <Field
          label="IP do ducto venoso"
          value={pi}
          onChange={setPi}
          placeholder="ex: 0,82"
          style={{ marginTop: 16 }}
        />

        <Text style={[styles.section, { marginTop: 18 }]}>Padrão da onda A</Text>
        <View style={styles.segment}>
          {ONDA_OPTIONS.map((opt) => {
            const active = opt.value === ondaA;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setOndaA(opt.value)}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {result ? (
          <View style={styles.resultBox}>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
            >
              <Text style={styles.resultZ}>
                Z {fmtSigned(result.zScore)}
              </Text>
              <Text style={styles.resultPct}>p{result.percentile}</Text>
            </View>
            <Text
              style={[styles.resultLabel, abnormal && { color: t.warningText }]}
            >
              {classificationLabel(result)}
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
            Informe o IP do ducto venoso pra ver o Z-score e o percentil.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const CLASSIFICATION_LABEL: Record<DuctoVenosoResult["classification"], string> =
  {
    normal: "Doppler do ducto venoso dentro da normalidade",
    limitrofe: "Doppler do ducto venoso limítrofe — recomenda-se vigilância",
    alterado:
      "Doppler do ducto venoso alterado — sugere comprometimento hemodinâmico fetal",
    ondaPatologica:
      "Padrão patológico ao Doppler do ducto venoso — sugere descompensação cardíaca direita",
  };

function classificationLabel(r: DuctoVenosoResult): string {
  return CLASSIFICATION_LABEL[r.classification];
}

function fmtSigned(v: number): string {
  const s = v.toFixed(2);
  return (v >= 0 ? "+" + s : s).replace(".", ",");
}

function decimal(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: object;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textMute}
        keyboardType="decimal-pad"
        style={styles.input}
      />
    </View>
  );
}

function Stepper({
  value,
  options,
  suffix,
  onChange,
}: {
  value: number;
  options: number[];
  suffix: string;
  onChange: (v: number) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
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
    segment: {
      flexDirection: "row",
      gap: 6,
    },
    segmentItem: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      backgroundColor: t.fill1,
      borderWidth: 1,
      borderColor: t.separator,
      alignItems: "center",
    },
    segmentItemActive: {
      backgroundColor: t.brandLight,
      borderColor: t.brand + "55",
    },
    segmentText: {
      fontSize: 13,
      color: t.textSec,
      fontFamily: FONT.medium,
    },
    segmentTextActive: {
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
    resultZ: {
      fontSize: 26,
      color: t.brandDeep,
      fontFamily: FONT.bold,
    },
    resultPct: {
      fontSize: 15,
      color: t.textSec,
      fontFamily: FONT.medium,
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
