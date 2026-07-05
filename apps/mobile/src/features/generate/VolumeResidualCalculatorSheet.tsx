import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { calcularVolumeResidual, vrLabel, type VRResult } from "@/shared";
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
 * Sheet nativa de volume residual pós-miccional (elipsoide) — port do
 * VolumeResidualCalculatorSheet.swift. Lógica em @laudousg/shared.
 */
export function VolumeResidualCalculatorSheet({
  open,
  onClose,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");

  const result: VRResult | null = useMemo(() => {
    const w = decimal(width);
    const h = decimal(height);
    const l = decimal(length);
    if (w == null || h == null || l == null) return null;
    return calcularVolumeResidual({ widthCm: w, heightCm: h, lengthCm: l });
  }, [width, height, length]);

  const handleInsert = (r: VRResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Resíduo pós-miccional"
      height={560}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Volume residual pós-miccional. Medir a bexiga imediatamente após
          esvaziamento.
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="Transverso (cm)" value={width} onChange={setWidth} />
          <Field label="AP (cm)" value={height} onChange={setHeight} />
          <Field
            label="Longitudinal (cm)"
            value={length}
            onChange={setLength}
          />
        </View>

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{fmt0(result.volumeMl)} mL</Text>
            <Text
              style={[
                styles.resultLabel,
                result.classification !== "ausente" && {
                  color: t.warningText,
                },
              ]}
            >
              {vrLabel(result.classification)}
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
            Preencha as 3 dimensões pra ver o volume residual.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function fmt0(v: number): string {
  return v.toFixed(0);
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
