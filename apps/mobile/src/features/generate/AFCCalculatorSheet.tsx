import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { calcularAFC, type AFCResult } from "@/shared";
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
 * Sheet nativa da contagem de folículos antrais (AFC) — port do
 * AFCCalculatorSheet.swift. Lógica em @laudousg/shared (afc.ts).
 */
export function AFCCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [direito, setDireito] = useState("");
  const [esquerdo, setEsquerdo] = useState("");

  const result: AFCResult | null = useMemo(() => {
    const d = integer(direito);
    const e = integer(esquerdo);
    if (d == null || e == null) return null;
    return calcularAFC({ direito: d, esquerdo: e });
  }, [direito, esquerdo]);

  const handleInsert = (r: AFCResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  const abnormal = result != null && result.classification !== "normal";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Folículos antrais (AFC)"
      height={520}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Contagem de folículos antrais (2-10 mm) em cada ovário. Marcador de
          reserva ovariana.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Field label="Ovário direito" value={direito} onChange={setDireito} />
          <Field
            label="Ovário esquerdo"
            value={esquerdo}
            onChange={setEsquerdo}
          />
        </View>

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTotal}>
              Total: {result.total} folículos
            </Text>
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
            Informe a contagem de cada ovário pra ver o total e a classificação.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const CLASSIFICATION_LABEL: Record<AFCResult["classification"], string> = {
  diminuida: "Reserva ovariana diminuída",
  normal: "Reserva ovariana normal",
  alta: "Reserva ovariana alta",
  sopSuspeita:
    "Achados morfológicos sugestivos de síndrome dos ovários policísticos (SOP)",
};

function classificationLabel(r: AFCResult): string {
  return CLASSIFICATION_LABEL[r.classification];
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={t.textMute}
        keyboardType="number-pad"
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
      marginBottom: 2,
      lineHeight: 18,
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
    resultBox: {
      marginTop: 22,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.brandLight,
      borderWidth: 1,
      borderColor: t.brand + "33",
    },
    resultTotal: {
      fontSize: 22,
      color: t.brandDeep,
      fontFamily: FONT.bold,
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
