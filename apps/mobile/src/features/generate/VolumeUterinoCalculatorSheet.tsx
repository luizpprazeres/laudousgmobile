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
  calcularVolumeUterino,
  VU_STATUS,
  vuStatusLabel,
  type VUHormonalStatus,
  type VUResult,
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
 * Sheet nativa de volume uterino (elipsoide, referência por status hormonal)
 * — port do VolumeUterinoCalculatorSheet.swift. Lógica em @laudousg/shared.
 * O picker de menu de status hormonal do iOS vira chips.
 */
export function VolumeUterinoCalculatorSheet({
  open,
  onClose,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState("");
  const [status, setStatus] = useState<VUHormonalStatus>("nulipara");

  const result: VUResult | null = useMemo(() => {
    const w = decimal(width);
    const h = decimal(height);
    const l = decimal(length);
    if (w == null || h == null || l == null) return null;
    return calcularVolumeUterino({
      widthCm: w,
      heightCm: h,
      lengthCm: l,
      status,
    });
  }, [width, height, length, status]);

  const handleInsert = (r: VUResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Volume uterino" height={640}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Volume uterino pela fórmula do elipsoide. Referências de normalidade
          variam por status hormonal e paridade.
        </Text>

        <Text style={styles.label}>Status hormonal</Text>
        <View style={styles.chipWrap}>
          {VU_STATUS.map((s) => {
            const active = s === status;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {vuStatusLabel(s)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Field
            label="Comprimento (cm)"
            value={length}
            onChange={setLength}
          />
          <Field label="AP (cm)" value={height} onChange={setHeight} />
          <Field label="Largura (cm)" value={width} onChange={setWidth} />
        </View>

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{fmt1(result.volumeCc)} mL</Text>
            <Text
              style={[
                styles.resultLabel,
                result.classification !== "normal" && {
                  color: t.warningText,
                },
              ]}
            >
              {result.conclusao}
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
            Preencha as 3 dimensões pra ver o volume e a referência.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function fmt1(v: number): string {
  return v.toFixed(1).replace(".", ",");
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
      marginBottom: 8,
      minHeight: 15,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
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
