import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calcularPreEclampsia,
  type PreEclampsiaResult,
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

const IG_OPTIONS = Array.from({ length: 14 }, (_, i) => 11 + i); // 11..24

/**
 * Sheet nativa da triagem de pré-eclâmpsia (1º trimestre, FMF simplificado) —
 * port do PreEclampsiaCalculatorSheet.swift. Lógica em @laudousg/shared
 * (preEclampsia.ts).
 */
export function PreEclampsiaCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [idade, setIdade] = useState("");
  const [imc, setImc] = useState("");
  const [map, setMap] = useState("");
  const [uterinaPi, setUterinaPi] = useState("");
  const [igWeeks, setIgWeeks] = useState(12);
  const [primigesta, setPrimigesta] = useState(false);
  const [antecedentePE, setAntecedentePE] = useState(false);
  const [hasOrSLE, setHasOrSLE] = useState(false);

  const result: PreEclampsiaResult | null = useMemo(() => {
    const i = integer(idade);
    const bm = decimal(imc);
    const m = decimal(map);
    const pi = decimal(uterinaPi);
    if (i == null || bm == null || m == null || pi == null) return null;
    return calcularPreEclampsia({
      idadeMaterna: i,
      imc: bm,
      mapMmHg: m,
      uterinaPiMedio: pi,
      igWeeks,
      primigesta,
      antecedentePE,
      hasOrSLE,
    });
  }, [
    idade,
    imc,
    map,
    uterinaPi,
    igWeeks,
    primigesta,
    antecedentePE,
    hasOrSLE,
  ]);

  const handleInsert = (r: PreEclampsiaResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pré-eclâmpsia (1T)"
      height={720}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Triagem simplificada de risco de pré-eclâmpsia no 1º trimestre. Versão
          MVP (FMF simplificado — sem PAPP-A/PlGF).
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Field
            label="Idade (anos)"
            value={idade}
            onChange={setIdade}
            keyboardType="number-pad"
          />
          <Field
            label="IMC (kg/m²)"
            value={imc}
            onChange={setImc}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Field
            label="MAP (mmHg)"
            value={map}
            onChange={setMap}
            keyboardType="decimal-pad"
          />
          <Field
            label="IP médio uterinas"
            value={uterinaPi}
            onChange={setUterinaPi}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={[styles.section, { marginTop: 18 }]}>
          Idade gestacional
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {IG_OPTIONS.map((opt) => {
            const active = opt === igWeeks;
            return (
              <Pressable
                key={opt}
                onPress={() => setIgWeeks(opt)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {opt} sem
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[styles.section, { marginTop: 18 }]}>
          Fatores de risco materno
        </Text>
        <ToggleRow
          label="Primigesta"
          value={primigesta}
          onChange={setPrimigesta}
        />
        <ToggleRow
          label="Antecedente de pré-eclâmpsia"
          value={antecedentePE}
          onChange={setAntecedentePE}
        />
        <ToggleRow
          label="HAS / DM / LES / SAF"
          value={hasOrSLE}
          onChange={setHasOrSLE}
        />

        {result ? (
          <View style={styles.resultBox}>
            <Text
              style={[
                styles.resultRisk,
                result.risk === "alto"
                  ? { color: t.warningText }
                  : result.risk === "intermediario"
                    ? { color: t.brandDeep }
                    : { color: t.text },
              ]}
            >
              {riskLabel(result)}
            </Text>
            <Text style={styles.resultPontos}>
              Pontuação: {result.pontos}
            </Text>
            <Text style={styles.resultRec}>{riskRecomendacao(result)}</Text>
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
            Preencha idade, IMC, MAP e IP médio das uterinas pra ver o risco.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const RISK_LABEL: Record<PreEclampsiaResult["risk"], string> = {
  baixo: "Baixo risco de pré-eclâmpsia",
  intermediario: "Risco intermediário de pré-eclâmpsia",
  alto: "Alto risco de pré-eclâmpsia",
};

const RISK_RECOMENDACAO: Record<PreEclampsiaResult["risk"], string> = {
  baixo: "Acompanhamento de rotina pré-natal.",
  intermediario:
    "Considerar profilaxia com AAS 100-150 mg/dia até 36 semanas. Reavaliar com Doppler de uterinas no 2º trimestre.",
  alto: "Recomenda-se profilaxia com AAS 100-150 mg/dia (preferencialmente iniciada antes de 16 semanas) + acompanhamento em centro de medicina fetal. Monitorar com Doppler de uterinas seriado.",
};

function riskLabel(r: PreEclampsiaResult): string {
  return RISK_LABEL[r.risk];
}

function riskRecomendacao(r: PreEclampsiaResult): string {
  return RISK_RECOMENDACAO[r.risk];
}

function decimal(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

function integer(s: string): number | null {
  const trimmed = s.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType: "number-pad" | "decimal-pad";
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={t.textMute}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: t.separator, true: t.brand }}
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
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    toggleLabel: {
      flex: 1,
      fontSize: 14,
      color: t.text,
      fontFamily: FONT.body,
    },
    resultBox: {
      marginTop: 22,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.brandLight,
      borderWidth: 1,
      borderColor: t.brand + "33",
    },
    resultRisk: {
      fontSize: 20,
      fontFamily: FONT.bold,
    },
    resultPontos: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.body,
      marginTop: 4,
    },
    resultRec: {
      fontSize: 14,
      color: t.text,
      fontFamily: FONT.body,
      marginTop: 8,
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
