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
  calcularVolumeProstatico,
  vpLabel,
  type VPResult,
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

/**
 * Sheet nativa de volume prostático (elipsoide W×H×L×0,523 + densidade de PSA)
 * — port do VolumeProstaticoCalculatorSheet.swift. Lógica em @laudousg/shared.
 */
export function VolumeProstaticoCalculatorSheet({
  open,
  onClose,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [psa, setPsa] = useState("");

  const result: VPResult | null = useMemo(() => {
    const w = decimal(width);
    const h = decimal(height);
    const l = decimal(length);
    if (w == null || h == null || l == null) return null;
    return calcularVolumeProstatico({
      widthCm: w,
      heightCm: h,
      lengthCm: l,
      psaNgPerMl: decimal(psa),
    });
  }, [width, height, length, psa]);

  const handleInsert = (r: VPResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Volume prostático" height={620}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Volume prostático pela fórmula do elipsoide (W × H × L × 0,523). PSA
          opcional para cálculo da densidade.
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="Transverso (cm)" value={width} onChange={setWidth} />
          <Field label="AP (cm)" value={height} onChange={setHeight} />
          <Field
            label="Crânio-caudal (cm)"
            value={length}
            onChange={setLength}
          />
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>
          PSA (ng/mL) — opcional
        </Text>
        <TextInput
          value={psa}
          onChangeText={setPsa}
          placeholder="ex: 2,5"
          placeholderTextColor={t.textMute}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>
              {formatCc(result.volumeCc)} cm³
            </Text>
            <Text
              style={[
                styles.resultLabel,
                result.classification !== "normal" && {
                  color: t.warningText,
                },
              ]}
            >
              {vpLabel(result.classification)}
            </Text>
            {result.psaDensity != null ? (
              <Text
                style={[
                  styles.resultMeta,
                  result.psaDensityElevated && { color: t.warningText },
                ]}
              >
                PSA density: {formatDensity(result.psaDensity)} ng/mL/cc
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
            Preencha as 3 dimensões pra ver o volume e a classificação.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function formatCc(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

function formatDensity(v: number): string {
  return v.toFixed(2).replace(".", ",");
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
        placeholder="0"
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
    resultTitle: {
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
    resultMeta: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.body,
      marginTop: 4,
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
