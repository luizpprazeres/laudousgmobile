import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  calcularDopplerParcial,
  extrairIPsDoTexto,
  formatarBlocoDopplerParcial,
  type DopplerPartialInput,
  type DopplerPartialResult,
  type VesselResult,
} from "@/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Texto atual dos achados — pra auto-extração de IPs via regex. */
  findingsText: string;
  /** Bloco pronto pra inserir no laudo. */
  onInsert: (bloco: string) => void;
};

type FormState = {
  weeks: string;
  days: string;
  ipUmbilical: string;
  ipMCA: string;
  ipUterinaDireita: string;
  ipUterinaEsquerda: string;
  ipDuctoVenoso: string;
};

const EMPTY: FormState = {
  weeks: "",
  days: "",
  ipUmbilical: "",
  ipMCA: "",
  ipUterinaDireita: "",
  ipUterinaEsquerda: "",
  ipDuctoVenoso: "",
};

/**
 * Sheet de Doppler Obstétrico com cálculo automático de percentis.
 * Port do DopplerCalculatorPanel original.
 *
 * Auto-extração: ao abrir, tenta extrair IPs do texto de achados (umbilical,
 * ACM, uterinas D/E) via regex tolerante a transcrição de áudio. User pode
 * editar manualmente os campos.
 *
 * Cálculo: fórmulas Barcelona (z-score → percentil), vaso a vaso e sem
 * substituir o percentil matemático por interpretação clínica.
 */
export function DopplerCalculatorSheet({
  open,
  onClose,
  findingsText,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [form, setForm] = useState<FormState>(EMPTY);

  // Ao abrir, tenta auto-preencher IPs a partir do texto de achados
  useEffect(() => {
    if (!open) return;
    const auto = extrairIPsDoTexto(findingsText || "");
    setForm((f) => ({
      ...f,
      ipUmbilical: auto.ipUmbilical ?? f.ipUmbilical,
      ipMCA: auto.ipMCA ?? f.ipMCA,
      ipUterinaDireita: auto.ipUterinaDireita ?? f.ipUterinaDireita,
      ipUterinaEsquerda: auto.ipUterinaEsquerda ?? f.ipUterinaEsquerda,
      ipDuctoVenoso: auto.ipDuctoVenoso ?? f.ipDuctoVenoso,
    }));
  }, [open, findingsText]);

  const parsed: DopplerPartialInput | null = useMemo(() => {
    const w = parseInt(form.weeks, 10);
    const d = parseInt(form.days, 10);
    const ua = parseFloat(form.ipUmbilical.replace(",", "."));
    const acm = parseFloat(form.ipMCA.replace(",", "."));
    const utd = parseFloat(form.ipUterinaDireita.replace(",", "."));
    const ute = parseFloat(form.ipUterinaEsquerda.replace(",", "."));
    const dv = parseFloat(form.ipDuctoVenoso.replace(",", "."));
    if (Number.isNaN(w) || Number.isNaN(d)) return null;
    const hasUterinas = !Number.isNaN(utd) && !Number.isNaN(ute);
    const hasOutroVaso = !Number.isNaN(ua) || !Number.isNaN(acm) || !Number.isNaN(dv);
    if (!hasUterinas && !hasOutroVaso) return null;
    return {
      weeks: w,
      days: d,
      ...(!Number.isNaN(ua) ? { ipUmbilical: ua } : {}),
      ...(!Number.isNaN(acm) ? { ipMCA: acm } : {}),
      ...(!Number.isNaN(dv) ? { ipDuctoVenoso: dv } : {}),
      ...(hasUterinas ? { ipUterinaDireita: utd, ipUterinaEsquerda: ute } : {}),
    };
  }, [form]);

  const result: DopplerPartialResult | null = useMemo(() => {
    if (!parsed) return null;
    const calculated = calcularDopplerParcial(parsed);
    return Object.keys(calculated).length > 0 ? calculated : null;
  }, [parsed]);
  const apenasUterinas = Number.parseInt(form.weeks, 10) < 20;

  const handleInsert = () => {
    if (!parsed || !result) return;
    const bloco = formatarBlocoDopplerParcial(parsed, result);
    onInsert(bloco + "\n\n");
    onClose();
  };

  const update = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Sheet open={open} onClose={onClose} title="Doppler obstétrico" height={620}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Percentis calculados pelas fórmulas Barcelona FMF. IPs do texto
          dos achados são pré-preenchidos automaticamente.
        </Text>

        {/* IG */}
        <Text style={styles.section}>Idade gestacional</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field
            label="Semanas"
            value={form.weeks}
            onChange={(v) => update("weeks", v)}
            placeholder="0–42"
            maxLength={2}
          />
          <Field
            label="Dias"
            value={form.days}
            onChange={(v) => update("days", v)}
            placeholder="0–6"
            maxLength={1}
          />
        </View>

        {/* IPs */}
        <Text style={[styles.section, { marginTop: 18 }]}>Índices de pulsatilidade (IP)</Text>
        {apenasUterinas ? (
          <Text style={styles.hint}>Antes de 20 semanas, a calculadora Barcelona disponível aceita somente os IPs das artérias uterinas.</Text>
        ) : (
          <>
            <Field
              label="Artéria umbilical"
              value={form.ipUmbilical}
              onChange={(v) => update("ipUmbilical", v)}
              placeholder="Ex: 0,95"
            />
            <Field
              label="Artéria cerebral média (ACM)"
              value={form.ipMCA}
              onChange={(v) => update("ipMCA", v)}
              placeholder="Ex: 1,75"
              style={{ marginTop: 10 }}
            />
            <Field
              label="Ducto venoso"
              value={form.ipDuctoVenoso}
              onChange={(v) => update("ipDuctoVenoso", v)}
              placeholder="Ex: 0,60"
              style={{ marginTop: 10 }}
            />
          </>
        )}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Field
            label="Uterina direita"
            value={form.ipUterinaDireita}
            onChange={(v) => update("ipUterinaDireita", v)}
            placeholder="Ex: 0,80"
          />
          <Field
            label="Uterina esquerda"
            value={form.ipUterinaEsquerda}
            onChange={(v) => update("ipUterinaEsquerda", v)}
            placeholder="Ex: 0,85"
          />
        </View>

        {/* Resultado */}
        {result ? (
          <View style={styles.resultBox}>
            {result.arteriaUmbilical ? <ResultLine label="Umbilical" v={result.arteriaUmbilical} /> : null}
            {result.arteriaCerebralMedia ? <ResultLine label="ACM" v={result.arteriaCerebralMedia} /> : null}
            {result.arteriasUterinas ? (
              <ResultLine
                label="Uterinas (média)"
                v={result.arteriasUterinas}
                extra={`D ${parsed?.ipUterinaDireita} / E ${parsed?.ipUterinaEsquerda}`}
              />
            ) : null}
            {result.ratioCerebroplacentario ? <ResultLine label="RCP" v={result.ratioCerebroplacentario} /> : null}
            {result.ductoVenoso ? <ResultLine label="Ducto venoso" v={result.ductoVenoso} /> : null}
            <Pressable
              onPress={handleInsert}
              style={({ pressed }) => [styles.insertBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.insertBtnText}>Inserir no laudo</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>
            Preencha a IG e ao menos um vaso. Para uterinas, informe direita e esquerda.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  style?: object;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={[{ flex: 1 }, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textMute}
        keyboardType="decimal-pad"
        maxLength={maxLength}
        style={styles.input}
      />
    </View>
  );
}

function ResultLine({
  label,
  v,
  extra,
}: {
  label: string;
  v: VesselResult;
  extra?: string;
}) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.resRow}>
      <Text style={styles.resLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.resIP}>
          IP {v.ip.toFixed(2)} · p{v.percentileLabel}
          {v.pathological ? "  ⚠" : ""}
        </Text>
        {extra ? <Text style={styles.resExtra}>{extra}</Text> : null}
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
      marginBottom: 16,
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
    resultBox: {
      marginTop: 22,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.brandLight,
      borderWidth: 1,
      borderColor: t.brand + "33",
    },
    resRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.brand + "22",
    },
    resLabel: {
      fontSize: 13,
      color: t.brandDeep,
      fontFamily: FONT.semibold,
    },
    resIP: {
      fontSize: 13,
      color: t.brandDeep,
      fontFamily: FONT.medium,
    },
    resExtra: {
      fontSize: 11,
      color: t.brandDeep,
      fontFamily: FONT.body,
      marginTop: 1,
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
