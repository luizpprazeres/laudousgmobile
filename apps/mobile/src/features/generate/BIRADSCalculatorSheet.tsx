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
  BIRADS_CATEGORIES,
  BIRADS_SERIOUS,
  biradsDescricao,
  biradsLabel,
  biradsProbMalignidade,
  calcularBIRADS,
  type BIRADSCategory,
  type BIRADSResult,
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
 * Sheet nativa de BI-RADS (ACR 5th Ed.) — port do BIRADSCalculatorSheet.swift.
 * Lógica em @laudousg/shared (birads.ts). O picker de menu do iOS vira chips.
 */
export function BIRADSCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [category, setCategory] = useState<BIRADSCategory>("1");
  const [lateralidade, setLateralidade] = useState("");

  const result: BIRADSResult = useMemo(
    () => calcularBIRADS(category, lateralidade),
    [category, lateralidade],
  );

  const isSerious = BIRADS_SERIOUS.includes(category);

  const handleInsert = (r: BIRADSResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="BI-RADS" height={620}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Categoria BI-RADS (ACR 5th Ed.) com recomendação clínica de conduta.
        </Text>

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chipWrap}>
          {BIRADS_CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {biradsLabel(c)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>
          Lateralidade (opcional)
        </Text>
        <TextInput
          value={lateralidade}
          onChangeText={setLateralidade}
          placeholder="ex: mama direita"
          placeholderTextColor={t.textMute}
          style={styles.input}
        />

        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{biradsLabel(category)}</Text>
          <Text
            style={[
              styles.resultDesc,
              isSerious && { color: t.warningText },
            ]}
          >
            {biradsDescricao(category)}
          </Text>
          <Text style={styles.resultMeta}>
            Probabilidade de malignidade: {biradsProbMalignidade(category)}
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
      </ScrollView>
    </Sheet>
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
      fontSize: 22,
      color: t.brandDeep,
      fontFamily: FONT.bold,
    },
    resultDesc: {
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
  });
}
