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
  calcularTIRADS,
  TI_COMPOSICAO,
  TI_ECOGENICIDADE,
  TI_FOCOS,
  TI_FORMA,
  TI_MARGEM,
  tiradsLabel,
  type TIComposicao,
  type TIEcogenicidade,
  type TIFocos,
  type TIForma,
  type TIMargem,
  type TIRADSResult,
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
 * Sheet nativa de ACR TI-RADS — port do TIRADSCalculatorSheet.swift.
 * Lógica em @laudousg/shared (tirads.ts). Cada picker de menu do iOS vira
 * uma linha de chips selecionáveis.
 */
export function TIRADSCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [composicao, setComposicao] = useState<TIComposicao>(
    "Sólido ou quase totalmente sólido",
  );
  const [ecogenicidade, setEcogenicidade] =
    useState<TIEcogenicidade>("Hipoecoico");
  const [forma, setForma] = useState<TIForma>("Mais larga que alta");
  const [margem, setMargem] = useState<TIMargem>("Lisa ou mal definida");
  const [focos, setFocos] = useState<TIFocos[]>([
    "Nenhum ou caudas de cometa grandes",
  ]);
  const [tamanho, setTamanho] = useState("");

  const result: TIRADSResult | null = useMemo(() => {
    const tam = decimal(tamanho);
    if (tam == null || !(tam > 0)) return null;
    return calcularTIRADS({
      composicao,
      ecogenicidade,
      forma,
      margem,
      focosEcogenicos: focos,
      maiorEixoCm: tam,
    });
  }, [composicao, ecogenicidade, forma, margem, focos, tamanho]);

  const isSerious =
    result?.categoria === "tr4" || result?.categoria === "tr5";

  const handleInsert = (r: TIRADSResult) => {
    onInsert(r.insertBloco);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="TI-RADS" height={720}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Pontuação ACR TI-RADS por 5 features do nódulo. Determina recomendação
          de PAAF ou seguimento por tamanho.
        </Text>

        <ChipRow
          title="Composição"
          options={TI_COMPOSICAO}
          value={composicao}
          onChange={setComposicao}
        />
        <ChipRow
          title="Ecogenicidade"
          options={TI_ECOGENICIDADE}
          value={ecogenicidade}
          onChange={setEcogenicidade}
        />
        <ChipRow
          title="Forma"
          options={TI_FORMA}
          value={forma}
          onChange={setForma}
        />
        <ChipRow
          title="Margem"
          options={TI_MARGEM}
          value={margem}
          onChange={setMargem}
        />
        <MultiChipRow
          title="Focos ecogênicos (podem ser somados)"
          options={TI_FOCOS}
          values={focos}
          onChange={setFocos}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>
          Maior eixo do nódulo (cm)
        </Text>
        <TextInput
          value={tamanho}
          onChangeText={setTamanho}
          placeholder="ex: 1,8"
          placeholderTextColor={t.textMute}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        {result ? (
          <View style={styles.resultBox}>
            <Text
              style={[
                styles.resultTitle,
                isSerious && { color: t.warningText },
              ]}
            >
              {tiradsLabel(result.categoria)}
            </Text>
            <Text style={styles.resultMeta}>
              {result.pontos} pontos no total
            </Text>
            <Text style={styles.resultDesc}>{result.recomendacao}</Text>
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
            Informe o maior eixo do nódulo pra ver a categoria e a conduta.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function decimal(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isNaN(v) ? null : v;
}

function ChipRow<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiChipRow<T extends string>({
  title,
  options,
  values,
  onChange,
}: {
  title: string;
  options: readonly T[];
  values: T[];
  onChange: (v: T[]) => void;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const none = options[0];
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => {
                if (opt === none) onChange(active ? [] : [opt]);
                else onChange(active ? values.filter((item) => item !== opt) : [...values.filter((item) => item !== none), opt]);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    helper: {
      fontSize: 13,
      color: t.textSec,
      fontFamily: FONT.body,
      marginBottom: 4,
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
    resultMeta: {
      fontSize: 12,
      color: t.textSec,
      fontFamily: FONT.body,
      marginTop: 4,
    },
    resultDesc: {
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
