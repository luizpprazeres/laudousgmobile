import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { calcularHadlock, type BiometryResult } from "@/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Bloco pronto pra inserir no textarea de achados. */
  onInsert: (bloco: string) => void;
};

const WEEK_OPTIONS = Array.from({ length: 22 }, (_, i) => 20 + i); // 20..41
const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Sheet nativa de peso fetal (Hadlock 4, 1985) — port do
 * HadlockCalculatorSheet.swift. Lógica em @laudousg/shared (hadlock.ts).
 *
 * Aceita medidas em mm ou cm (converte automático). Percentil pela curva
 * Intergrowth-21st (default do app). Sexo não detectado no RN → unisex.
 */
export function HadlockCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [dbp, setDbp] = useState("");
  const [cc, setCc] = useState("");
  const [ca, setCa] = useState("");
  const [cf, setCf] = useState("");
  const [igWeeks, setIgWeeks] = useState(30);
  const [igDays, setIgDays] = useState(0);

  const result: BiometryResult | null = useMemo(() => {
    const d = decimal(dbp);
    const c = decimal(cc);
    const a = decimal(ca);
    const f = decimal(cf);
    if (d == null || c == null || a == null || f == null) return null;
    return calcularHadlock({
      dbp: d,
      cc: c,
      ca: a,
      cf: f,
      igWeeks,
      igDays,
      sex: "unisex",
    });
  }, [dbp, cc, ca, cf, igWeeks, igDays]);

  const handleInsert = (r: BiometryResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Peso fetal (Hadlock)" height={640}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Estimativa de peso fetal por biometria (Hadlock 4, 1985).
        </Text>
        <Text style={styles.helperMuted}>
          Aceita medidas em mm ou cm — converte automático.
        </Text>

        <Field
          label="DBP (Diâmetro biparietal)"
          value={dbp}
          onChange={setDbp}
          placeholder="ex: 72 mm ou 7,2 cm"
        />
        <Field
          label="CC (Circunferência da cabeça)"
          value={cc}
          onChange={setCc}
          placeholder="ex: 280 mm"
          style={{ marginTop: 10 }}
        />
        <Field
          label="CA (Circunferência abdominal)"
          value={ca}
          onChange={setCa}
          placeholder="ex: 260 mm"
          style={{ marginTop: 10 }}
        />
        <Field
          label="CF (Comprimento do fêmur)"
          value={cf}
          onChange={setCf}
          placeholder="ex: 56 mm"
          style={{ marginTop: 10 }}
        />

        <Text style={[styles.section, { marginTop: 18 }]}>
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

        {result ? (
          <View style={styles.resultBox}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={styles.resultWeight}>{result.weightGrams} g</Text>
              <Text style={styles.resultVar}>±{result.weightVariation} g</Text>
            </View>
            <Text
              style={[
                styles.resultPct,
                (result.isSGA || result.isLGA) && { color: t.warningText },
              ]}
            >
              {result.percentileLabel}
            </Text>
            <Text style={styles.resultSource}>
              Cálculo via {sourceName(result)}
            </Text>
            {result.isSGA ? (
              <Text style={styles.warn}>
                ⚠️ Peso abaixo do esperado (PIG) — considerar Doppler
                obstétrico em 1-2 semanas.
              </Text>
            ) : result.isLGA ? (
              <Text style={styles.warn}>
                ⚠️ Peso acima do esperado (GIG) — considerar avaliação de
                macrossomia.
              </Text>
            ) : null}
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
            Preencha as 4 medidas pra ver o peso estimado e o percentil.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function sourceName(r: BiometryResult): string {
  const map: Record<string, string> = {
    intergrowth21st: "Intergrowth-21st",
    hadlock1991: "Hadlock 1991",
    whoMulticentre2017: "WHO Multicentre 2017",
  };
  return map[r.percentileSourceUsed] ?? r.percentileSourceUsed;
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
    resultWeight: {
      fontSize: 26,
      color: t.brandDeep,
      fontFamily: FONT.bold,
    },
    resultVar: {
      fontSize: 14,
      color: t.textSec,
      fontFamily: FONT.body,
    },
    resultPct: {
      fontSize: 15,
      color: t.text,
      fontFamily: FONT.medium,
      marginTop: 4,
    },
    resultSource: {
      fontSize: 12,
      color: t.textMute,
      fontFamily: FONT.body,
      marginTop: 2,
    },
    warn: {
      fontSize: 12,
      color: t.warningText,
      fontFamily: FONT.body,
      marginTop: 8,
      lineHeight: 17,
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
