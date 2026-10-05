import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Clipboard from "expo-clipboard";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import {
  calculateGrafSuggestion,
  calculateBalikPleuralEffusionVolume,
  isBalikEligible,
  type AbdomenTotalDopplerInput,
  type ClinicalModelCode,
  type ClinicalModelInput,
  type DopplerArterialMmssInput,
  type DopplerHepaticoInput,
  type DopplerVenosoMmssInput,
  type QuadrilInfantilInput,
  type ThoraxInput,
} from "@laudousg/shared";
import { FONT } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import {
  createAndroidClinicalDraft,
  serializeAndroidClinicalDraft,
  updateAndroidClinicalDraft,
  validateAndroidClinicalDraft,
} from "./clinicalModelFlow";

export type ClinicalCreatePayload = {
  categoryCode: ClinicalModelCode;
  examState: ClinicalModelInput;
  serializedExamState: string;
};

export type ClinicalPersistedDraft = {
  reportId: string;
  categoryCode: ClinicalModelCode;
  contentRevision: number;
  reportText: string;
  examState: ClinicalModelInput;
  warnings: string[];
};

export type ClinicalReleasePayload = ClinicalCreatePayload & {
  reportId: string;
  expectedRevision: number;
  expectedText: string;
};

type Props = {
  category: ClinicalModelCode;
  onCreate: (payload: ClinicalCreatePayload) => Promise<ClinicalPersistedDraft>;
  onRelease: (payload: ClinicalReleasePayload) => Promise<void>;
};

type Tokens = ReturnType<typeof useColorTokens>;
type Option = { value: string; label: string };

export function ClinicalModelWorkspace({ category, onCreate, onRelease }: Props) {
  const t = useColorTokens();
  const [value, setValue] = useState<ClinicalModelInput>(() => createAndroidClinicalDraft(category));
  const [persisted, setPersisted] = useState<ClinicalPersistedDraft | null>(null);
  const [preview, setPreview] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [released, setReleased] = useState(false);
  const [busy, setBusy] = useState<"generate" | "release" | null>(null);
  const [status, setStatus] = useState("");
  const requestVersion = useRef(0);

  useEffect(() => {
    requestVersion.current += 1;
    setValue(createAndroidClinicalDraft(category));
    setPersisted(null); setPreview(""); setIssues([]); setReleased(false); setBusy(null); setStatus("");
  }, [category]);

  function change(next: ClinicalModelInput) {
    requestVersion.current += 1;
    setValue(updateAndroidClinicalDraft(next));
    setPersisted(null); setPreview(""); setIssues([]); setReleased(false); setBusy(null); setStatus("");
  }

  async function generatePreview() {
    if (busy) return;
    const checked = validateAndroidClinicalDraft(value);
    if (!checked.success) {
      setIssues(checked.issues.map((entry) => entry.message));
      setPreview(""); return;
    }
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    const serializedExamState = serializeAndroidClinicalDraft(checked.data);
    setBusy("generate");
    setIssues(checked.issues.map((entry) => entry.message));
    setPersisted(null); setPreview(""); setReleased(false);
    setStatus("Gerando e salvando a prévia…");
    try {
      const created = await onCreate({
        categoryCode: category,
        examState: checked.data,
        serializedExamState,
      });
      if (requestVersion.current !== version) return;
      if (created.categoryCode !== category || created.examState.physicianReviewed) {
        throw new Error("A API devolveu um contrato clínico incompatível com o rascunho.");
      }
      if (serializeAndroidClinicalDraft(created.examState) !== serializedExamState) {
        throw new Error("A API devolveu achados diferentes dos que foram enviados.");
      }
      setPersisted(created);
      setPreview(created.reportText);
      setIssues([...checked.issues.map((entry) => entry.message), ...created.warnings]);
      setStatus("Prévia salva. Confira o texto antes de revisar.");
    } catch (error) {
      if (requestVersion.current !== version) return;
      setStatus(error instanceof Error ? error.message : "Não foi possível gerar a prévia clínica.");
    } finally {
      if (requestVersion.current === version) setBusy(null);
    }
  }

  async function reviewAndRelease() {
    if (!persisted || !preview || busy) return;
    const checked = validateAndroidClinicalDraft(value);
    if (!checked.success) {
      setIssues(checked.issues.map((entry) => entry.message)); return;
    }
    const currentSerialized = serializeAndroidClinicalDraft(checked.data);
    if (currentSerialized !== serializeAndroidClinicalDraft(persisted.examState)) {
      setPersisted(null); setPreview(""); setReleased(false);
      setStatus("Os achados mudaram. Gere uma nova prévia antes de revisar.");
      return;
    }
    const version = requestVersion.current;
    setBusy("release");
    try {
      const payload = {
        categoryCode: category,
        reportId: persisted.reportId,
        expectedRevision: persisted.contentRevision,
        expectedText: persisted.reportText,
        examState: checked.data,
        serializedExamState: currentSerialized,
      };
      await onRelease(payload);
      if (requestVersion.current !== version) return;
      setReleased(true);
      setIssues(checked.issues.map((entry) => entry.message));
      setStatus("Revisado e liberado.");
    } catch (error) {
      if (requestVersion.current !== version) return;
      setStatus(error instanceof Error ? error.message : "Não foi possível liberar o laudo.");
    } finally {
      if (requestVersion.current === version) setBusy(null);
    }
  }

  async function copy() {
    if (!released) return;
    await Clipboard.setStringAsync(preview);
    setStatus("Laudo revisado copiado.");
  }

  return <View style={{ gap: 12 }}>
    <View style={{ borderRadius: 16, padding: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.separator }}>
      <Text style={{ color: t.brand, fontFamily: FONT.bold, fontSize: 12, textTransform: "uppercase" }}>Modelo clínico estruturado</Text>
      <Text style={{ color: t.text, fontFamily: FONT.bold, fontSize: 18, marginTop: 4 }}>{modelName(category)}</Text>
      <Text style={{ color: t.textSec, fontSize: 12, marginTop: 5 }}>Preencha os achados, gere a prévia e só depois confirme a revisão médica.</Text>
    </View>

    {category === "ABDOMEN_TOTAL_DOPPLER" ? <AbdomenForm value={value as AbdomenTotalDopplerInput} onChange={change} t={t} /> : null}
    {category === "DOPPLER_HEPATICO" ? <DopplerHepaticoForm value={value as DopplerHepaticoInput} onChange={change} t={t} /> : null}
    {category === "DOPPLER_VENOSO_MMSS" ? <VenousForm value={value as DopplerVenosoMmssInput} onChange={change} t={t} /> : null}
    {category === "DOPPLER_ARTERIAL_MMSS" ? <ArterialForm value={value as DopplerArterialMmssInput} onChange={change} t={t} /> : null}
    {category === "TORAX" ? <ThoraxForm value={value as ThoraxInput} onChange={change} t={t} /> : null}
    {category === "QUADRIL_INFANTIL" ? <HipForm value={value as QuadrilInfantilInput} onChange={change} t={t} /> : null}

    {issues.length ? <Card title="Pendências clínicas" t={t}>{issues.map((message, index) => <Text key={`${message}-${index}`} style={{ color: "#B45309", fontSize: 12 }}>• {message}</Text>)}</Card> : null}
    <Pressable disabled={busy !== null} onPress={() => void generatePreview()} style={{ minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: t.fill2, opacity: busy ? 0.55 : 1 }}><Text style={{ color: t.text, fontFamily: FONT.bold }}>{busy === "generate" ? "Gerando…" : "Gerar prévia clínica"}</Text></Pressable>
    {preview ? <Card title="Prévia para conferência" t={t}><Text selectable style={{ color: t.text, lineHeight: 21 }}>{preview}</Text></Card> : null}
    {preview ? <Pressable disabled={busy !== null} onPress={() => void reviewAndRelease()} style={{ minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: t.brand, opacity: busy ? 0.55 : 1 }}><Text style={{ color: "#FFFFFF", fontFamily: FONT.bold }}>{busy === "release" ? "Liberando…" : "Revisei os achados — liberar"}</Text></Pressable> : null}
    {released ? <Pressable onPress={() => void copy()} style={{ minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.brand }}><Text style={{ color: t.brand, fontFamily: FONT.bold }}>Copiar laudo revisado</Text></Pressable> : null}
    {status ? <Text accessibilityRole="alert" style={{ color: released ? t.brand : t.textSec, fontSize: 12 }}>{status}</Text> : null}
  </View>;
}

function modelName(code: ClinicalModelCode) {
  return ({ ABDOMEN_TOTAL_DOPPLER: "Abdome total com Doppler", DOPPLER_HEPATICO: "Doppler hepático", DOPPLER_VENOSO_MMSS: "Doppler venoso de membro superior", DOPPLER_ARTERIAL_MMSS: "Doppler arterial de membro superior", TORAX: "Ultrassonografia de tórax", QUADRIL_INFANTIL: "Quadril infantil" } as const)[code];
}
function Card({ title, t, children }: { title: string; t: Tokens; children: ReactNode }) { return <View style={{ gap: 9, borderRadius: 16, padding: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.separator }}><Text style={{ color: t.text, fontFamily: FONT.bold }}>{title}</Text>{children}</View>; }
function Label({ children, t }: { children: ReactNode; t: Tokens }) { return <Text style={{ color: t.textSec, fontSize: 12, fontFamily: FONT.medium }}>{children}</Text>; }
function Input({ label, value, onChange, t, numeric = false, multiline = false }: { label: string; value: string; onChange: (value: string) => void; t: Tokens; numeric?: boolean; multiline?: boolean }) { return <View style={{ gap: 5 }}><Label t={t}>{label}</Label><TextInput value={value} onChangeText={onChange} keyboardType={numeric ? "decimal-pad" : "default"} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={{ minHeight: multiline ? 86 : 44, color: t.text, backgroundColor: t.bg, borderWidth: 1, borderColor: t.separator, borderRadius: 11, paddingHorizontal: 11, paddingVertical: multiline ? 10 : 0 }} /></View>; }
function NumberField({ label, value, onChange, t }: { label: string; value?: number; onChange: (value: number | undefined) => void; t: Tokens }) { return <Input label={label} t={t} numeric value={value == null ? "" : String(value).replace(".", ",")} onChange={(raw) => { const parsed = Number(raw.replace(",", ".")); onChange(raw.trim() && Number.isFinite(parsed) ? parsed : undefined); }} />; }
function Toggle({ label, value, onChange, t }: { label: string; value: boolean; onChange: (value: boolean) => void; t: Tokens }) { return <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Text style={{ color: t.text, fontSize: 13, flex: 1 }}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ true: t.brand }} /></View>; }
function Select({ label, value, options, onChange, t }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; t: Tokens }) { return <View style={{ gap: 5 }}><Label t={t}>{label}</Label><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{options.map((option) => <Pressable key={option.value} onPress={() => onChange(option.value)} style={{ minHeight: 38, justifyContent: "center", borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: value === option.value ? t.brand : t.separator, backgroundColor: value === option.value ? t.fill2 : t.bg }}><Text style={{ color: t.text, fontSize: 12 }}>{option.label}</Text></Pressable>)}</View></View>; }

const FLOW: Option[] = [{ value: "", label: "Pendente" }, { value: "hepatopetal", label: "Hepatopetal" }, { value: "hepatofugal", label: "Hepatofugal" }, { value: "ausente", label: "Ausente" }, { value: "outro", label: "Outro" }];
function AbdomenForm({ value, onChange, t }: { value: AbdomenTotalDopplerInput; onChange: (value: ClinicalModelInput) => void; t: Tokens }) {
  const set = (patch: Partial<AbdomenTotalDopplerInput>) => onChange({ ...value, ...patch });
  return <>
    <Card title="Veia porta · obrigatória" t={t}><NumberField label="Calibre (cm)" value={value.portalVein.caliberCm} onChange={(caliberCm) => set({ portalVein: { ...value.portalVein, caliberCm } })} t={t} /><NumberField label="Velocidade (cm/s)" value={value.portalVein.velocityCms} onChange={(velocityCms) => set({ portalVein: { ...value.portalVein, velocityCms } })} t={t} /><Select label="Fluxo" value={value.portalVein.flow ?? ""} options={FLOW} onChange={(flow) => set({ portalVein: { ...value.portalVein, flow: flow ? flow as NonNullable<typeof value.portalVein.flow> : undefined } })} t={t} /></Card>
    <Card title="Abdome" t={t}><Input label="Descrição completa" value={value.abdomenReport} onChange={(abdomenReport) => set({ abdomenReport })} t={t} multiline /><Select label="Documentação fotográfica" value={value.documentationPhoto} options={[{ value: "include", label: "Incluir" }, { value: "omit", label: "Omitir" }]} onChange={(documentationPhoto) => set({ documentationPhoto: documentationPhoto as typeof value.documentationPhoto })} t={t} /></Card>
    <Card title="Vasos opcionais" t={t}>{([['hepaticVeins', 'Veias hepáticas'], ['splenicVein', 'Veia esplênica'], ['superiorMesentericVein', 'Veia mesentérica superior'], ['commonHepaticArtery', 'Artéria hepática comum']] as const).map(([key, label]) => { const vessel = value[key]; return <View key={key} style={{ gap: 7, borderTopWidth: 1, borderTopColor: t.separator, paddingTop: 7 }}><Toggle label={label} value={vessel.evaluated} onChange={(evaluated) => set({ [key]: evaluated ? { evaluated: true } : { evaluated: false } } as Partial<AbdomenTotalDopplerInput>)} t={t} />{vessel.evaluated ? <><NumberField label="Calibre (cm)" value={vessel.caliberCm} onChange={(caliberCm) => set({ [key]: { ...vessel, caliberCm } } as Partial<AbdomenTotalDopplerInput>)} t={t} /><NumberField label="Velocidade (cm/s)" value={vessel.velocityCms} onChange={(velocityCms) => set({ [key]: { ...vessel, velocityCms } } as Partial<AbdomenTotalDopplerInput>)} t={t} /><Select label="Fluxo" value={vessel.flow ?? ""} options={FLOW} onChange={(flow) => set({ [key]: { ...vessel, flow: flow || undefined } } as Partial<AbdomenTotalDopplerInput>)} t={t} /></> : null}</View>; })}</Card>
    <Card title="Conclusão portal" t={t}><Select label="Situação" value={value.portalPathology.status} options={[{ value: "absent", label: "Ausente" }, { value: "suspected", label: "Suspeita" }, { value: "confirmed", label: "Confirmada" }]} onChange={(status) => set({ portalPathology: { status: status as typeof value.portalPathology.status, physicianConfirmed: status === "absent" } })} t={t} />{value.portalPathology.status !== "absent" ? <><Select label="Tipo" value={value.portalPathology.kind ?? ""} options={[{ value: "", label: "Selecione" }, { value: "portal_hypertension", label: "Hipertensão portal" }, { value: "portal_thrombosis", label: "Trombose portal" }, { value: "other", label: "Outra" }]} onChange={(kind) => set({ portalPathology: { ...value.portalPathology, kind: kind ? kind as NonNullable<typeof value.portalPathology.kind> : undefined } })} t={t} /><Input label="Critérios e achados" value={value.portalPathology.evidence ?? ""} onChange={(evidence) => set({ portalPathology: { ...value.portalPathology, evidence } })} t={t} multiline /><Toggle label="Conclusão confirmada" value={value.portalPathology.physicianConfirmed} onChange={(physicianConfirmed) => set({ portalPathology: { ...value.portalPathology, physicianConfirmed } })} t={t} /></> : null}</Card>
  </>;
}

const VASCULAR_PATENCY: Option[] = [
  { value: "not_assessed", label: "Pendente" },
  { value: "patent", label: "Pérvio" },
  { value: "thrombosis", label: "Trombose" },
];
const SPECTRAL_PATTERN: Option[] = [
  { value: "not_assessed", label: "Pendente" },
  { value: "preserved", label: "Preservado" },
  { value: "altered", label: "Alterado" },
  { value: "other", label: "Outro" },
];

function DopplerHepaticoForm({ value, onChange, t }: { value: DopplerHepaticoInput; onChange: (value: ClinicalModelInput) => void; t: Tokens }) {
  const set = (patch: Partial<DopplerHepaticoInput>) => onChange({ ...value, ...patch, normalHemodynamicsConfirmed: false });
  const setVessel = (
    key: "hepaticVeins" | "splenicVein" | "superiorMesentericVein" | "commonHepaticArtery",
    vessel: DopplerHepaticoInput[typeof key],
  ) => set({ [key]: vessel } as Partial<DopplerHepaticoInput>);
  const optional = [
    ["hepaticVeins", "Veias hepáticas"],
    ["splenicVein", "Veia esplênica"],
    ["superiorMesentericVein", "Veia mesentérica superior"],
    ["commonHepaticArtery", "Artéria hepática comum"],
  ] as const;

  return <>
    <Card title="Veia porta · obrigatória" t={t}>
      <Select label="Perviedade" value={value.portalVein.patency ?? "not_assessed"} options={VASCULAR_PATENCY} onChange={(patency) => set({ portalVein: { ...value.portalVein, patency: patency as NonNullable<typeof value.portalVein.patency> } })} t={t} />
      <NumberField label="Calibre (cm)" value={value.portalVein.caliberCm} onChange={(caliberCm) => set({ portalVein: { ...value.portalVein, caliberCm } })} t={t} />
      <NumberField label="Velocidade (cm/s)" value={value.portalVein.velocityCms} onChange={(velocityCms) => set({ portalVein: { ...value.portalVein, velocityCms } })} t={t} />
      <Select label="Direção do fluxo" value={value.portalVein.flow ?? ""} options={FLOW} onChange={(flow) => set({ portalVein: { ...value.portalVein, flow: flow ? flow as NonNullable<typeof value.portalVein.flow> : undefined } })} t={t} />
    </Card>

    <Card title="Vasos opcionais" t={t}>
      {optional.map(([key, label]) => {
        const vessel = value[key];
        return <View key={key} style={{ gap: 7, borderTopWidth: 1, borderTopColor: t.separator, paddingTop: 7 }}>
          <Toggle label={label} value={vessel.evaluated} onChange={(evaluated) => setVessel(key, evaluated ? { evaluated: true, patency: "not_assessed" } : { evaluated: false })} t={t} />
          {vessel.evaluated ? <>
            <Select label="Perviedade" value={vessel.patency ?? "not_assessed"} options={VASCULAR_PATENCY} onChange={(patency) => setVessel(key, { ...vessel, patency: patency as NonNullable<typeof vessel.patency> })} t={t} />
            <NumberField label="Calibre (cm)" value={vessel.caliberCm} onChange={(caliberCm) => setVessel(key, { ...vessel, caliberCm })} t={t} />
            {key !== "commonHepaticArtery" ? <NumberField label="Velocidade (cm/s)" value={vessel.velocityCms} onChange={(velocityCms) => setVessel(key, { ...vessel, velocityCms })} t={t} /> : null}
            <Select label="Direção do fluxo" value={vessel.flow ?? ""} options={FLOW} onChange={(flow) => setVessel(key, { ...vessel, flow: flow ? flow as NonNullable<typeof vessel.flow> : undefined })} t={t} />
            {key === "hepaticVeins" ? <Select label="Padrão espectral" value={vessel.spectralPattern ?? "not_assessed"} options={SPECTRAL_PATTERN} onChange={(spectralPattern) => setVessel(key, { ...vessel, spectralPattern: spectralPattern as NonNullable<typeof vessel.spectralPattern> })} t={t} /> : null}
            {key === "commonHepaticArtery" ? <>
              <NumberField label="Velocidade de pico sistólico (cm/s)" value={vessel.peakSystolicVelocityCms} onChange={(peakSystolicVelocityCms) => setVessel(key, { ...vessel, peakSystolicVelocityCms })} t={t} />
              <NumberField label="Velocidade diastólica final (cm/s)" value={vessel.endDiastolicVelocityCms} onChange={(endDiastolicVelocityCms) => setVessel(key, { ...vessel, endDiastolicVelocityCms })} t={t} />
              <NumberField label="Índice de resistência" value={vessel.resistanceIndex} onChange={(resistanceIndex) => setVessel(key, { ...vessel, resistanceIndex })} t={t} />
              <Select label="Padrão espectral" value={vessel.spectralPattern ?? "not_assessed"} options={SPECTRAL_PATTERN} onChange={(spectralPattern) => setVessel(key, { ...vessel, spectralPattern: spectralPattern as NonNullable<typeof vessel.spectralPattern> })} t={t} />
            </> : null}
          </> : null}
        </View>;
      })}
    </Card>

    <Card title="Conclusão vascular" t={t}>
      <Select
        label="Situação"
        value={value.portalPathology.status}
        options={[{ value: "not_assessed", label: "Pendente" }, { value: "absent", label: "Sem alteração" }, { value: "suspected", label: "Suspeita" }, { value: "confirmed", label: "Confirmada" }]}
        onChange={(status) => set({ portalPathology: { status: status as typeof value.portalPathology.status, physicianConfirmed: false } })}
        t={t}
      />
      {value.portalPathology.status === "suspected" || value.portalPathology.status === "confirmed" ? <>
        <Select label="Tipo" value={value.portalPathology.kind ?? ""} options={[{ value: "", label: "Selecione" }, { value: "portal_hypertension", label: "Hipertensão portal" }, { value: "portal_thrombosis", label: "Trombose portal" }, { value: "other", label: "Outra alteração" }]} onChange={(kind) => set({ portalPathology: { ...value.portalPathology, kind: kind ? kind as NonNullable<typeof value.portalPathology.kind> : undefined, physicianConfirmed: false } })} t={t} />
        <Input label="Critérios e achados" value={value.portalPathology.evidence ?? ""} onChange={(evidence) => set({ portalPathology: { ...value.portalPathology, evidence, physicianConfirmed: false } })} t={t} multiline />
        <Toggle label="Confirmo a conclusão da alteração" value={value.portalPathology.physicianConfirmed} onChange={(physicianConfirmed) => set({ portalPathology: { ...value.portalPathology, physicianConfirmed } })} t={t} />
      </> : null}
      {value.portalPathology.status === "absent" ? <Toggle
        label="Confirmo a coerência entre medidas, fluxos e conclusão normal"
        value={value.normalHemodynamicsConfirmed}
        onChange={(normalHemodynamicsConfirmed) => onChange({ ...value, normalHemodynamicsConfirmed })}
        t={t}
      /> : null}
    </Card>

    <View style={{ padding: 11, borderRadius: 12, backgroundColor: t.fill2 }}>
      <Text style={{ color: t.textSec, fontSize: 12 }}>Transplante hepático e TIPS ainda não fazem parte deste contrato.</Text>
    </View>
  </>;
}

const LATERALITY: Option[] = [{ value: "right", label: "Direito" }, { value: "left", label: "Esquerdo" }, { value: "bilateral", label: "Bilateral" }];
function VenousForm({ value, onChange, t }: { value: DopplerVenosoMmssInput; onChange: (value: ClinicalModelInput) => void; t: Tokens }) { const set = (patch: Partial<DopplerVenosoMmssInput>) => onChange({ ...value, ...patch }); return <><Card title="Protocolo" t={t}><Select label="Indicação" value={value.indication} options={[{ value: "elective", label: "Eletivo" }, { value: "thrombosis_research", label: "Pesquisa de trombose" }, { value: "catheter", label: "Cateter" }]} onChange={(indication) => set({ indication: indication as typeof value.indication })} t={t} /><Select label="Lateralidade" value={value.laterality} options={LATERALITY} onChange={(laterality) => set({ laterality: laterality as typeof value.laterality, right: { ...value.right, examined: laterality !== "left" }, left: { ...value.left, examined: laterality !== "right" } })} t={t} /></Card>{(["right", "left"] as const).filter((side) => value[side].examined).map((side) => <VenousSide key={side} side={side} value={value} set={set} t={t} />)}</>; }
function VenousSide({ side, value, set, t }: { side: "right" | "left"; value: DopplerVenosoMmssInput; set: (patch: Partial<DopplerVenosoMmssInput>) => void; t: Tokens }) { const s = value[side]; const patch = (next: Partial<typeof s>) => set({ [side]: { ...s, ...next } }); const patency = [{ value: "patent", label: "Pérvio" }, { value: "thrombosis", label: "Trombose" }, { value: "not_assessed", label: "Não avaliado" }]; return <Card title={`Membro ${side === "right" ? "direito" : "esquerdo"}`} t={t}><Select label="Sistema profundo" value={s.deepSystem} options={patency} onChange={(deepSystem) => patch({ deepSystem: deepSystem as typeof s.deepSystem })} t={t} /><Select label="Sistema superficial" value={s.superficialSystem} options={patency} onChange={(superficialSystem) => patch({ superficialSystem: superficialSystem as typeof s.superficialSystem })} t={t} /><Select label="Jugular interna" value={s.internalJugular} options={patency} onChange={(internalJugular) => patch({ internalJugular: internalJugular as typeof s.internalJugular })} t={t} /><Toggle label="Competência/refluxo testado" value={s.competenceTested} onChange={(competenceTested) => patch({ competenceTested, reflux: competenceTested ? "absent" : "not_assessed" })} t={t} />{s.competenceTested ? <Select label="Refluxo" value={s.reflux} options={[{ value: "absent", label: "Ausente" }, { value: "present", label: "Presente" }]} onChange={(reflux) => patch({ reflux: reflux as typeof s.reflux })} t={t} /> : null}<Toggle label="Cateter presente" value={s.catheter.present} onChange={(present) => patch({ catheter: present ? { present: true, relation: "adjacent", segment: "" } : { present: false } })} t={t} />{s.catheter.present ? <><Select label="Relação com cateter" value={s.catheter.relation ?? "adjacent"} options={[{ value: "adjacent", label: "Adjacente" }, { value: "around_catheter", label: "Ao redor" }, { value: "occlusive", label: "Oclusiva" }]} onChange={(relation) => patch({ catheter: { ...s.catheter, relation: relation as NonNullable<typeof s.catheter.relation> } })} t={t} /><Input label="Segmento" value={s.catheter.segment ?? ""} onChange={(segment) => patch({ catheter: { ...s.catheter, segment } })} t={t} /></> : null}<Select label="Fase" value={s.thrombosisPhase} options={[{ value: "not_applicable", label: "Não aplicável" }, { value: "acute", label: "Aguda" }, { value: "subacute", label: "Subaguda" }, { value: "chronic", label: "Crônica" }, { value: "indeterminate", label: "Indeterminada" }]} onChange={(thrombosisPhase) => patch({ thrombosisPhase: thrombosisPhase as typeof s.thrombosisPhase, phaseConfirmed: false })} t={t} />{!["not_applicable", "indeterminate"].includes(s.thrombosisPhase) ? <Toggle label="Fase confirmada" value={s.phaseConfirmed} onChange={(phaseConfirmed) => patch({ phaseConfirmed })} t={t} /> : null}</Card>; }

function ArterialForm({ value, onChange, t }: { value: DopplerArterialMmssInput; onChange: (value: ClinicalModelInput) => void; t: Tokens }) { const set = (patch: Partial<DopplerArterialMmssInput>) => onChange({ ...value, ...patch }); return <><Card title="Protocolo" t={t}><Select label="Lateralidade" value={value.laterality} options={LATERALITY} onChange={(laterality) => set({ laterality: laterality as typeof value.laterality, right: { ...value.right, examined: laterality !== "left" }, left: { ...value.left, examined: laterality !== "right" } })} t={t} /></Card>{(["right", "left"] as const).filter((side) => value[side].examined).map((side) => <ArterialSide key={side} side={side} value={value} set={set} t={t} />)}</>; }
function ArterialSide({ side, value, set, t }: { side: "right" | "left"; value: DopplerArterialMmssInput; set: (patch: Partial<DopplerArterialMmssInput>) => void; t: Tokens }) { const s = value[side]; const patch = (next: Partial<typeof s>) => set({ [side]: { ...s, ...next } }); const affected = s.affectedVessel ?? ""; const thoracic = s.thoracicOutlet.evaluated ? s.thoracicOutlet : null; return <Card title={`Membro ${side === "right" ? "direito" : "esquerdo"}`} t={t}><Select label="Resultado" value={s.status} options={[{ value: "normal", label: "Normal" }, { value: "stenosis", label: "Estenose" }, { value: "occlusion", label: "Oclusão" }, { value: "other", label: "Outra" }]} onChange={(status) => patch({ status: status as typeof s.status })} t={t} />{s.status !== "normal" ? <><Input label="Vaso afetado" value={affected} onChange={(affectedVessel) => patch({ affectedVessel, psvCms: {} })} t={t} /><NumberField label="VPS (cm/s)" value={affected ? s.psvCms[affected] : undefined} onChange={(number) => affected && patch({ psvCms: number == null ? {} : { [affected]: number } })} t={t} /><NumberField label="Estenose (%)" value={s.stenosisPercent} onChange={(stenosisPercent) => patch({ stenosisPercent })} t={t} />{s.stenosisPercent != null ? <><Toggle label="Dados suficientes" value={s.percentageDataSufficient} onChange={(percentageDataSufficient) => patch({ percentageDataSufficient })} t={t} /><Toggle label="Percentual confirmado" value={s.percentageConfirmed} onChange={(percentageConfirmed) => patch({ percentageConfirmed })} t={t} /></> : null}{["stenosis", "occlusion"].includes(s.status) ? <Input label="Padrão distal e reenchimento" value={s.distalPattern ?? ""} onChange={(distalPattern) => patch({ distalPattern })} t={t} multiline /> : null}</> : null}<Toggle label="Módulo de desfiladeiro torácico" value={s.thoracicOutlet.evaluated} onChange={(evaluated) => patch({ thoracicOutlet: evaluated ? { evaluated: true, maneuvers: "", positions: "", result: "indeterminate", physicianConfirmed: false } : { evaluated: false } })} t={t} />{thoracic ? <><Input label="Manobras" value={thoracic.maneuvers} onChange={(maneuvers) => patch({ thoracicOutlet: { ...thoracic, maneuvers } })} t={t} /><Input label="Posições" value={thoracic.positions} onChange={(positions) => patch({ thoracicOutlet: { ...thoracic, positions } })} t={t} /><Select label="Resultado" value={thoracic.result} options={[{ value: "negative", label: "Negativo" }, { value: "positive", label: "Positivo" }, { value: "indeterminate", label: "Indeterminado" }]} onChange={(result) => patch({ thoracicOutlet: { ...thoracic, result: result as typeof thoracic.result } })} t={t} /><Toggle label="Módulo confirmado" value={thoracic.physicianConfirmed} onChange={(physicianConfirmed) => patch({ thoracicOutlet: { ...thoracic, physicianConfirmed } })} t={t} /></> : null}</Card>; }

function ThoraxForm({ value, onChange, t }: { value: ThoraxInput; onChange: (value: ClinicalModelInput) => void; t: Tokens }) { const set = (patch: Partial<ThoraxInput>) => onChange({ ...value, ...patch }); return <>{(["right", "left"] as const).map((side) => <ThoraxSide key={side} side={side} value={value} set={set} t={t} />)}<Card title="Conclusão" t={t}><Input label="Limitação técnica" value={value.limitation ?? ""} onChange={(limitation) => set({ limitation: limitation || undefined })} t={t} multiline /><Toggle label="Sugerir correlação clínica" value={value.correlationSuggested} onChange={(correlationSuggested) => set({ correlationSuggested })} t={t} /></Card></>; }
function ThoraxSide({ side, value, set, t }: { side: "right" | "left"; value: ThoraxInput; set: (patch: Partial<ThoraxInput>) => void; t: Tokens }) {
  const s = value[side];
  const patch = (next: Partial<typeof s>) => set({ [side]: { ...s, ...next } });
  const effusion = s.effusion.present ? s.effusion : null;
  const balikEligible = effusion ? isBalikEligible(effusion.context) : false;
  const finding = [{ value: "not_seen", label: "Não vista" }, { value: "suspected", label: "Suspeita" }, { value: "confirmed", label: "Confirmada" }];
  return <Card title={`Hemitórax ${side === "right" ? "direito" : "esquerdo"}`} t={t}>
    <Select label="Linha pleural" value={s.pleuralLine} options={[{ value: "regular", label: "Regular" }, { value: "irregular", label: "Irregular" }, { value: "not_assessed", label: "Não avaliada" }]} onChange={(pleuralLine) => patch({ pleuralLine: pleuralLine as typeof s.pleuralLine })} t={t} />
    <Select label="Deslizamento" value={s.sliding} options={[{ value: "present", label: "Presente" }, { value: "absent", label: "Ausente" }, { value: "not_assessed", label: "Não avaliado" }]} onChange={(sliding) => patch({ sliding: sliding as typeof s.sliding })} t={t} />
    <NumberField label="Linhas B" value={s.linesB.count} onChange={(count) => patch({ linesB: { ...s.linesB, count: count ?? 0 } })} t={t} />
    <Select label="Distribuição" value={s.linesB.distribution} options={[{ value: "none", label: "Nenhuma" }, { value: "focal", label: "Focal" }, { value: "multifocal", label: "Multifocal" }, { value: "diffuse", label: "Difusa" }]} onChange={(distribution) => patch({ linesB: { ...s.linesB, distribution: distribution as typeof s.linesB.distribution } })} t={t} />
    <Select label="Consolidação" value={s.consolidation} options={finding} onChange={(consolidation) => patch({ consolidation: consolidation as typeof s.consolidation })} t={t} />
    <Select label="Atelectasia" value={s.atelectasis} options={finding} onChange={(atelectasis) => patch({ atelectasis: atelectasis as typeof s.atelectasis })} t={t} />
    <Select label="Pneumotórax" value={s.pneumothorax} options={finding} onChange={(pneumothorax) => patch({ pneumothorax: pneumothorax as typeof s.pneumothorax })} t={t} />
    <Toggle label="Derrame pleural" value={s.effusion.present} onChange={(present) => patch({ effusion: present ? { present: true, separationMm: 0, context: { adult: false, mechanicallyVentilated: false, supineTorso15Deg: false, endExpirationPosteriorAxillary: false, physicianConfirmed: false } } : { present: false } })} t={t} />
    {effusion ? <>
      <NumberField label="Separação máxima (mm)" value={effusion.separationMm || undefined} onChange={(separationMm) => patch({ effusion: { ...effusion, separationMm: separationMm ?? 0 } })} t={t} />
      {([['adult', 'Paciente adulto'], ['mechanicallyVentilated', 'Ventilação mecânica'], ['supineTorso15Deg', 'Supino, tronco a 15°'], ['endExpirationPosteriorAxillary', 'Fim da expiração, linha axilar posterior'], ['physicianConfirmed', 'Técnica confirmada']] as const).map(([key, label]) => <Toggle key={key} label={label} value={effusion.context[key]} onChange={(checked) => patch({ effusion: { ...effusion, context: { ...effusion.context, [key]: checked } } })} t={t} />)}
      <View style={{ padding: 10, borderRadius: 10, backgroundColor: t.fill2 }}>
        <Text style={{ color: t.text, fontSize: 12 }}>
          {balikEligible && effusion.separationMm > 0
            ? `Estimativa de Balik: ${calculateBalikPleuralEffusionVolume(effusion)} mL`
            : "A separação será descrita sem estimativa de volume até cumprir e confirmar o contexto de Balik."}
        </Text>
      </View>
    </> : null}
  </Card>;
}

function HipForm({ value, onChange, t }: { value: QuadrilInfantilInput; onChange: (value: ClinicalModelInput) => void; t: Tokens }) { const set = (patch: Partial<QuadrilInfantilInput>) => onChange({ ...value, ...patch }); return <><Card title="Paciente" t={t}><NumberField label="Idade (dias)" value={value.ageDays} onChange={(ageDays) => set({ ageDays, right: { ...value.right, grafClassification: undefined, classificationConfirmed: false }, left: { ...value.left, grafClassification: undefined, classificationConfirmed: false } })} t={t} /></Card>{(["right", "left"] as const).map((side) => <HipSide key={side} side={side} value={value} set={set} t={t} />)}<Card title="Controle ou encaminhamento" t={t}><Input label="Sugestão não vinculante" value={value.recommendation ?? ""} onChange={(recommendation) => set({ recommendation: recommendation || undefined, recommendationConfirmed: false })} t={t} multiline />{value.recommendation ? <Toggle label="Inserção confirmada" value={value.recommendationConfirmed} onChange={(recommendationConfirmed) => set({ recommendationConfirmed })} t={t} /> : null}</Card></>; }
function HipSide({ side, value, set, t }: { side: "right" | "left"; value: QuadrilInfantilInput; set: (patch: Partial<QuadrilInfantilInput>) => void; t: Tokens }) { const s = value[side]; const patch = (nextPatch: Partial<typeof s>) => { const next = { ...s, ...nextPatch, classificationConfirmed: nextPatch.classificationConfirmed ?? false }; const suggestion = calculateGrafSuggestion({ ageDays: value.ageDays, ...next }); set({ [side]: { ...next, grafClassification: suggestion.success ? suggestion.classification : undefined } }); }; const suggestion = calculateGrafSuggestion({ ageDays: value.ageDays, ...s }); return <Card title={`Quadril ${side === "right" ? "direito" : "esquerdo"}`} t={t}><Toggle label="Corte padrão adequado" value={s.adequateStandardPlane} onChange={(adequateStandardPlane) => patch({ adequateStandardPlane })} t={t} /><NumberField label="Ângulo alfa (°)" value={s.alphaDeg} onChange={(alphaDeg) => patch({ alphaDeg })} t={t} /><NumberField label="Ângulo beta (°)" value={s.betaDeg} onChange={(betaDeg) => patch({ betaDeg })} t={t} /><Select label="Teto ósseo" value={s.bonyRoof} options={[{ value: "normal", label: "Bem formado" }, { value: "rounded", label: "Arredondado" }, { value: "deficient", label: "Deficiente" }, { value: "not_assessed", label: "Não avaliado" }]} onChange={(bonyRoof) => patch({ bonyRoof: bonyRoof as typeof s.bonyRoof })} t={t} /><Select label="Teto cartilaginoso" value={s.cartilaginousRoof} options={[{ value: "normal", label: "Preservado" }, { value: "displaced", label: "Deslocado" }, { value: "not_assessed", label: "Não avaliado" }]} onChange={(cartilaginousRoof) => patch({ cartilaginousRoof: cartilaginousRoof as typeof s.cartilaginousRoof })} t={t} /><Select label="Cabeça femoral" value={s.femoralHead} options={[{ value: "centered", label: "Centrada" }, { value: "decentered", label: "Descentrada" }, { value: "dislocated", label: "Luxada" }, { value: "not_assessed", label: "Não avaliada" }]} onChange={(femoralHead) => patch({ femoralHead: femoralHead as typeof s.femoralHead })} t={t} /><Select label="Labrum" value={s.labrumPosition} options={[{ value: "normal", label: "Normal" }, { value: "everted", label: "Evertido" }, { value: "interposed", label: "Interposto" }, { value: "not_assessed", label: "Não avaliado" }]} onChange={(labrumPosition) => patch({ labrumPosition: labrumPosition as typeof s.labrumPosition })} t={t} /><NumberField label="Cobertura (%) · opcional" value={s.coveragePercent} onChange={(coveragePercent) => patch({ coveragePercent })} t={t} /><View style={{ padding: 10, borderRadius: 10, backgroundColor: t.fill2 }}><Text style={{ color: t.text, fontFamily: FONT.bold }}>{suggestion.success ? `Sugestão: Graf ${suggestion.classification}` : "Classificação pendente"}</Text>{!suggestion.success ? <Text style={{ color: t.textSec, fontSize: 11, marginTop: 3 }}>{suggestion.message}</Text> : null}</View>{suggestion.success ? <Toggle label="Confirmo a classificação calculada" value={s.classificationConfirmed} onChange={(classificationConfirmed) => patch({ classificationConfirmed })} t={t} /> : null}</Card>; }
