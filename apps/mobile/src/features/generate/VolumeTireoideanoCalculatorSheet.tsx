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
  calcularVolumeTireoideano,
  vtLabel,
  vtSexLabel,
  type VTResult,
  type VTSex,
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

const SEXES: VTSex[] = ["feminino", "masculino"];

/**
 * Sheet nativa de volume tireoideano (soma dos lobos, elipsoide) — port do
 * VolumeTireoideanoCalculatorSheet.swift. Lógica em @laudousg/shared.
 * O picker segmentado de sexo do iOS vira dois chips.
 */
export function VolumeTireoideanoCalculatorSheet({
  open,
  onClose,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [sex, setSex] = useState<VTSex>("feminino");
  const [dW, setDW] = useState("");
  const [dH, setDH] = useState("");
  const [dL, setDL] = useState("");
  const [eW, setEW] = useState("");
  const [eH, setEH] = useState("");
  const [eL, setEL] = useState("");

  const result: VTResult | null = useMemo(() => {
    return calcularVolumeTireoideano({
      sex,
      direito: {
        widthCm: decimal(dW) ?? 0,
        heightCm: decimal(dH) ?? 0,
        lengthCm: decimal(dL) ?? 0,
      },
      esquerdo: {
        widthCm: decimal(eW) ?? 0,
        heightCm: decimal(eH) ?? 0,
        lengthCm: decimal(eL) ?? 0,
      },
    });
  }, [sex, dW, dH, dL, eW, eH, eL]);

  const handleInsert = (r: VTResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Volume tireoideano"
      height={720}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Volume tireoideano pela soma dos lobos (fórmula do elipsoide). Istmo
          geralmente não é incluído.
        </Text>

        <Text style={styles.label}>Sexo</Text>
        <View style={styles.chipWrap}>
          {SEXES.map((s) => {
            const active = s === sex;
            return (
              <Pressable
                key={s}
                onPress={() => setSex(s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {vtSexLabel(s)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <LobeGroup
          title="Lobo direito"
          w={dW}
          h={dH}
          l={dL}
          onW={setDW}
          onH={setDH}
          onL={setDL}
        />
        <LobeGroup
          title="Lobo esquerdo"
          w={eW}
          h={eH}
          l={eL}
          onW={setEW}
          onH={setEH}
          onL={setEL}
        />

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>
              {fmt1(result.volumeTotal)} mL
            </Text>
            <Text
              style={[
                styles.resultLabel,
                result.classification !== "normal" && {
                  color: t.warningText,
                },
              ]}
            >
              {vtLabel(result.classification)}
            </Text>
            <Text style={styles.resultMeta}>
              Direito: {fmt1(result.volumeDireito)} mL · Esquerdo:{" "}
              {fmt1(result.volumeEsquerdo)} mL
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
            Preencha ao menos um lobo pra ver o volume total e a classificação.
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

function LobeGroup({
  title,
  w,
  h,
  l,
  onW,
  onH,
  onL,
}: {
  title: string;
  w: string;
  h: string;
  l: string;
  onW: (v: string) => void;
  onH: (v: string) => void;
  onL: (v: string) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.section}>{title}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Field label="Largura (cm)" value={w} onChange={onW} />
        <Field label="AP (cm)" value={h} onChange={onH} />
        <Field label="Comprimento (cm)" value={l} onChange={onL} />
      </View>
    </View>
  );
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
      minHeight: 30,
    },
    chipWrap: {
      flexDirection: "row",
      gap: 8,
    },
    chip: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 9,
      backgroundColor: t.fill1,
      borderWidth: 1,
      borderColor: t.separator,
      alignItems: "center",
    },
    chipActive: {
      backgroundColor: t.brandLight,
      borderColor: t.brand + "55",
    },
    chipText: {
      fontSize: 14,
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
