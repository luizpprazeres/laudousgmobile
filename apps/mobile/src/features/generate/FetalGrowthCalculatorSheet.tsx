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
  classifyFetalGrowth,
  formatFetalGrowthReport,
  type FetalGrowthInput,
} from "@/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  findingsText: string;
  onInsert: (bloco: string) => void;
};

type YesNo = "nao" | "sim";
type UaFlow = "present" | "absent" | "reversed";
type DvState = "normal" | "piAboveP95" | "absent" | "reversed" | "dicrotic";

function findWeightPercentile(text: string): string {
  const scope = text.match(/peso[^.\n]{0,90}/i)?.[0] ?? "";
  return scope.match(/percentil\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i)?.[1] ?? "";
}

export function FetalGrowthCalculatorSheet({
  open,
  onClose,
  findingsText,
  onInsert,
}: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [percentile, setPercentile] = useState("");
  const [source, setSource] = useState("Intergrowth-21st");
  const [weeks, setWeeks] = useState("");
  const [days, setDays] = useState("0");
  const [dopplerNormal, setDopplerNormal] = useState<YesNo>("nao");
  const [cpr, setCpr] = useState<YesNo>("nao");
  const [cprConfirmed, setCprConfirmed] = useState<YesNo>("nao");
  const [mca, setMca] = useState<YesNo>("nao");
  const [mcaConfirmed, setMcaConfirmed] = useState<YesNo>("nao");
  const [uterines, setUterines] = useState<YesNo>("nao");
  const [uaFlow, setUaFlow] = useState<UaFlow>("present");
  const [uaConfirmed, setUaConfirmed] = useState<YesNo>("nao");
  const [dv, setDv] = useState<DvState>("normal");
  const [dvConfirmed, setDvConfirmed] = useState<YesNo>("nao");
  const [ctg, setCtg] = useState<YesNo>("nao");

  useEffect(() => {
    if (!open || percentile) return;
    setPercentile(findWeightPercentile(findingsText));
  }, [findingsText, open, percentile]);

  const result = useMemo(() => {
    const efwPercentile = Number.parseFloat(percentile.replace(",", "."));
    if (!Number.isFinite(efwPercentile) || efwPercentile < 0 || efwPercentile > 100) {
      return null;
    }
    const w = Number.parseInt(weeks, 10);
    const d = Number.parseInt(days, 10);
    const input: FetalGrowthInput = {
      efwPercentile,
      efwPercentileSource: source.trim() || "Curva informada pelo médico",
      dopplerAssessmentCompleteAndNormal: dopplerNormal === "sim",
      cprBelowP5: { present: cpr === "sim", confirmed: cprConfirmed === "sim" },
      mcaPiBelowP5: { present: mca === "sim", confirmed: mcaConfirmed === "sim" },
      meanUterinePiAboveP95: uterines === "sim",
      umbilicalArteryEndDiastolicFlow: uaFlow,
      umbilicalFlowConfirmedInRequiredInterval: uaConfirmed === "sim",
      ductusVenosus: {
        piAboveP95: dv === "piAboveP95",
        diastolicFlow: dv === "absent" ? "absent" : dv === "reversed" ? "reversed" : "present",
        persistentDicroticVenousPulsations: dv === "dicrotic",
        confirmedAfter6To12Hours: dvConfirmed === "sim",
      },
      pathologicalCtg: ctg === "sim",
      ...(Number.isInteger(w) ? { gestationalWeeks: w } : {}),
      ...(Number.isInteger(d) ? { gestationalDays: d } : {}),
    };
    try {
      return classifyFetalGrowth(input);
    } catch {
      return null;
    }
  }, [
    cpr, cprConfirmed, ctg, days, dopplerNormal, dv, dvConfirmed, mca,
    mcaConfirmed, percentile, source, uaConfirmed, uaFlow, uterines, weeks,
  ]);

  return (
    <Sheet open={open} onClose={onClose} title="Crescimento fetal" height={690}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Distingue PIG de RCF e aplica os estágios de Gratacós sem fechar
          critérios que ainda exigem uma segunda medida.
        </Text>

        <View style={styles.row}>
          <Field label="Percentil do peso" value={percentile} onChange={setPercentile} placeholder="ex: 6" />
          <Field label="Semanas" value={weeks} onChange={setWeeks} placeholder="ex: 30" />
          <Field label="Dias" value={days} onChange={setDays} placeholder="0–6" />
        </View>
        <Text style={styles.label}>Curva do percentil</Text>
        <TextInput
          value={source}
          onChangeText={setSource}
          placeholder="Intergrowth-21st"
          placeholderTextColor={t.textMute}
          style={styles.input}
        />

        <Text style={styles.section}>Avaliação Doppler</Text>
        <Choice
          label="UA, ACM, RCP e uterinas completos e normais"
          value={dopplerNormal}
          options={[["nao", "Não"], ["sim", "Sim"]]}
          onChange={(v) => setDopplerNormal(v as YesNo)}
          styles={styles}
        />
        <Choice label="RCP abaixo do p5" value={cpr} options={[["nao", "Não"], ["sim", "Sim"]]} onChange={(v) => setCpr(v as YesNo)} styles={styles} />
        {cpr === "sim" ? <Choice label="Confirmada em duas medidas >12 h" value={cprConfirmed} options={[["nao", "Ainda não"], ["sim", "Sim"]]} onChange={(v) => setCprConfirmed(v as YesNo)} styles={styles} /> : null}
        <Choice label="IP da ACM abaixo do p5" value={mca} options={[["nao", "Não"], ["sim", "Sim"]]} onChange={(v) => setMca(v as YesNo)} styles={styles} />
        {mca === "sim" ? <Choice label="Confirmada em duas medidas >12 h" value={mcaConfirmed} options={[["nao", "Ainda não"], ["sim", "Sim"]]} onChange={(v) => setMcaConfirmed(v as YesNo)} styles={styles} /> : null}
        <Choice label="IP médio das uterinas acima do p95" value={uterines} options={[["nao", "Não"], ["sim", "Sim"]]} onChange={(v) => setUterines(v as YesNo)} styles={styles} />

        <Choice
          label="Fluxo diastólico na artéria umbilical"
          value={uaFlow}
          options={[["present", "Presente"], ["absent", "Ausente"], ["reversed", "Reverso"]]}
          onChange={(v) => setUaFlow(v as UaFlow)}
          styles={styles}
        />
        {uaFlow !== "present" ? <Choice label="Confirmado no intervalo exigido" value={uaConfirmed} options={[["nao", "Ainda não"], ["sim", "Sim"]]} onChange={(v) => setUaConfirmed(v as YesNo)} styles={styles} /> : null}

        <Choice
          label="Ducto venoso"
          value={dv}
          options={[["normal", "Normal"], ["piAboveP95", "IP > p95"], ["absent", "Diástole ausente"], ["reversed", "Diástole reversa"], ["dicrotic", "Pulsações dicróticas"]]}
          onChange={(v) => setDv(v as DvState)}
          styles={styles}
        />
        {dv !== "normal" ? <Choice label="Confirmado em duas medidas >6–12 h" value={dvConfirmed} options={[["nao", "Ainda não"], ["sim", "Sim"]]} onChange={(v) => setDvConfirmed(v as YesNo)} styles={styles} /> : null}
        <Choice label="CTG patológico" value={ctg} options={[["nao", "Não"], ["sim", "Sim"]]} onChange={(v) => setCtg(v as YesNo)} styles={styles} />

        {result ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{result.conclusion}</Text>
            {result.pendingCriteria.map((item) => (
              <Text key={item.code} style={styles.pending}>
                {item.label}: confirmação pendente.
              </Text>
            ))}
            {result.warnings.map((warning) => <Text key={warning} style={styles.pending}>{warning}</Text>)}
            <Text style={styles.reference}>{result.reportReference}</Text>
            <Pressable
              onPress={() => {
                onInsert(`${formatFetalGrowthReport(result)}\n\n`);
                onClose();
              }}
              style={({ pressed }) => [styles.insertButton, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.insertButtonText}>Inserir no laudo</Text>
            </Pressable>
          </View>
        ) : <Text style={styles.hint}>Informe um percentil entre 0 e 100.</Text>}
      </ScrollView>
    </Sheet>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={t.textMute} keyboardType="decimal-pad" style={styles.input} />
    </View>
  );
}

function Choice({ label, value, options, onChange, styles }: { label: string; value: string; options: string[][]; onChange: (v: string) => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map(([option, text]) => (
          <Pressable key={option} onPress={() => onChange(option ?? "")} style={[styles.chip, value === option && styles.chipActive]}>
            <Text style={[styles.chipText, value === option && styles.chipTextActive]}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    helper: { fontSize: 13, lineHeight: 18, color: t.textSec, fontFamily: FONT.body, marginBottom: 16 },
    row: { flexDirection: "row", gap: 8 },
    section: { marginTop: 20, marginBottom: 2, fontSize: 12, color: t.textSec, fontFamily: FONT.semibold, textTransform: "uppercase", letterSpacing: 0.5 },
    label: { fontSize: 11, color: t.textMute, fontFamily: FONT.medium, marginBottom: 5 },
    input: { fontSize: 15, color: t.text, fontFamily: FONT.body, backgroundColor: t.fill1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: t.separator },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { borderRadius: 9, borderWidth: 1, borderColor: t.separator, backgroundColor: t.fill1, paddingHorizontal: 10, paddingVertical: 7 },
    chipActive: { borderColor: t.brand, backgroundColor: t.brandLight },
    chipText: { fontSize: 12, color: t.textSec, fontFamily: FONT.medium },
    chipTextActive: { color: t.brand, fontFamily: FONT.semibold },
    resultBox: { marginTop: 22, padding: 14, borderRadius: 12, backgroundColor: t.brandLight, borderWidth: 1, borderColor: t.brand + "33" },
    resultTitle: { fontSize: 15, lineHeight: 21, color: t.text, fontFamily: FONT.semibold },
    pending: { marginTop: 7, fontSize: 12, lineHeight: 17, color: t.warningText, fontFamily: FONT.body },
    reference: { marginTop: 9, fontSize: 11, lineHeight: 15, color: t.textSec, fontFamily: FONT.body },
    insertButton: { marginTop: 14, borderRadius: 10, backgroundColor: t.brand, paddingVertical: 11, alignItems: "center" },
    insertButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: FONT.semibold },
    hint: { marginTop: 16, fontSize: 12, color: t.textMute, fontFamily: FONT.body },
  });
}
