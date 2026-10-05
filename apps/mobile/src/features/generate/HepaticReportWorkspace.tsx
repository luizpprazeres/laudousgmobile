import { hepaticQualityAcquisitionIssues } from "@laudousg/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Clipboard from "expo-clipboard";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  renderHepaticElastographyReport,
  renderHepaticMultiparametricReport,
  type HepaticAssessment,
  type HepaticModule,
  type HepaticModuleKey,
} from "@laudousg/shared";
import { FONT } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import {
  HEPATIC_ANDROID_CONFIGURATION,
  HEPATIC_INTEGRATED_INTERPRETATION_REFERENCE,
  createInitialHepaticAssessment,
  hasApprovedHepaticQualityConfiguration,
  hepaticAndroidModelName,
  type HepaticAndroidModelCode,
  type HepaticModuleConfiguration,
} from "./hepaticModels";
import {
  HEPATIC_ISSUE_LABELS,
  HEPATIC_METHODS,
  HEPATIC_UNITS,
  buildHepaticCorrelation,
  buildHepaticQuality,
  buildHepaticTechniquePatch,
  calculateHepaticIqrRatio,
  canCalculateHepaticIqrRatio,
  changeHepaticMethod,
  changeHepaticModuleStatus,
  changeHepaticUnit,
  clearHepaticMeasurement,
  editHepaticModule,
  hepaticWorkspaceReadiness,
  optionalHepaticText,
  parseHepaticNumber,
  replaceHepaticAssessmentContext,
  reviewHepaticAssessment,
  reviewHepaticModule,
  tryHepaticEdit,
  upsertHepaticMeasurement,
  type HepaticCorrelationDraft,
  type HepaticMethod,
  type HepaticUnit,
} from "./hepaticWorkspace";
import {
  canReleaseHepaticReport,
  hepaticReportPersisted,
  hepaticReportPersistenceFailed,
  hepaticReportReviewed,
  hepaticReportReviewFailed,
  initialHepaticReportFlow,
  invalidateHepaticReportFlow,
  persistHepaticReportDraft,
  reviewHepaticReport,
  startHepaticReportPersistence,
  startHepaticReportReview,
  type HepaticSend,
} from "./hepaticReportFlow";

type Props = {
  category: HepaticAndroidModelCode;
  /** `authedFetch`: o JWT da sessão identifica o médico no servidor. */
  send: HepaticSend;
  /** Id do usuário autenticado; as confirmações precisam ser dele (a API recusa outro ator). */
  getPhysicianId: () => Promise<string>;
};

type Tokens = ReturnType<typeof useColorTokens>;
type Option = { value: string; label: string };

const now = () => new Date().toISOString();
const moduleLabel = (key: HepaticModuleKey) => (key === "stiffness" ? "Rigidez hepática" : "Gordura hepática");

function render(category: HepaticAndroidModelCode, value: HepaticAssessment): string {
  return category === "ELASTOGRAFIA_HEPATICA" ? renderHepaticElastographyReport(value) : renderHepaticMultiparametricReport(value);
}

/**
 * Workspace hepático estruturado (Android). Mesmo fluxo da Web: dados técnicos
 * e confirmações médicas no contrato `hepatic-assessment/v1`; o texto final é
 * renderizado pelo SERVIDOR, salvo como rascunho pendente e só liberado para
 * cópia depois da revisão médica vinculada à revisão e ao texto exatos.
 */
export function HepaticReportWorkspace({ category, send, getPhysicianId }: Props) {
  const t = useColorTokens();
  const [value, setValue] = useState<HepaticAssessment>(() => createInitialHepaticAssessment(category));
  const [physicianId, setPhysicianId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [flow, setFlow] = useState(initialHepaticReportFlow);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [editError, setEditError] = useState<string | null>(null);
  const [indicationDraft, setIndicationDraft] = useState(value.indication ?? "");
  const editRevision = useRef(0);

  useEffect(() => {
    let active = true;
    getPhysicianId()
      .then((id) => { if (active) setPhysicianId(id); })
      .catch(() => { if (active) setAuthError("Sessão expirada. Entre novamente."); });
    return () => { active = false; };
  }, [getPhysicianId]);

  const readiness = useMemo(() => hepaticWorkspaceReadiness(value), [value]);
  const localPreview = useMemo(() => {
    if (!readiness.canConclude) return "";
    try { return render(category, value); } catch { return ""; }
  }, [category, readiness.canConclude, value]);
  const released = canReleaseHepaticReport(flow);
  const visibleReport = flow.phase === "editing" ? localPreview : (flow.persisted?.generatedOutput ?? localPreview);
  const busy = flow.phase === "persisting" || flow.phase === "reviewing";
  const lacksQualityRegistry = !hasApprovedHepaticQualityConfiguration(HEPATIC_ANDROID_CONFIGURATION);

  function update(next: HepaticAssessment) {
    if (busy) return;
    editRevision.current += 1;
    setValue(next);
    setFlow((current) => invalidateHepaticReportFlow(current));
    setCopyState("idle");
  }

  /** Toda edição do contrato passa aqui: entrada recusada vira aviso, não exceção. */
  function apply(edit: () => HepaticAssessment) {
    if (busy) return;
    const result = tryHepaticEdit(edit);
    if (!result.ok) { setEditError(result.message); return; }
    setEditError(null);
    update(result.value);
  }

  async function persist() {
    if (!localPreview || !readiness.canConclude || busy) return;
    const startedAt = editRevision.current;
    const started = startHepaticReportPersistence(flow);
    setFlow(started);
    try {
      const persisted = await persistHepaticReportDraft(send, value, flow.persisted);
      if (editRevision.current === startedAt) setFlow(hepaticReportPersisted(persisted));
    } catch (error) {
      if (editRevision.current === startedAt) {
        setFlow(hepaticReportPersistenceFailed(started, error instanceof Error ? error.message : "Não foi possível salvar o rascunho."));
      }
    }
  }

  async function confirmReview() {
    if (!flow.persisted || flow.phase !== "pending_review") return;
    const startedAt = editRevision.current;
    const reviewing = startHepaticReportReview(flow);
    setFlow(reviewing);
    try {
      await reviewHepaticReport(send, flow.persisted);
      if (editRevision.current === startedAt) setFlow(hepaticReportReviewed(reviewing));
    } catch (error) {
      if (editRevision.current === startedAt) {
        setFlow(hepaticReportReviewFailed(reviewing, error instanceof Error ? error.message : "Não foi possível confirmar a revisão."));
      }
    }
  }

  async function copy() {
    if (!released || !flow.persisted) return;
    try { await Clipboard.setStringAsync(flow.persisted.generatedOutput); setCopyState("copied"); }
    catch { setCopyState("error"); }
  }

  const title = released
    ? "Laudo revisado e liberado"
    : flow.persisted ? "Rascunho salvo · revisão pendente"
      : readiness.canConclude ? "Laudo pronto para salvar" : "Dados e revisões pendentes";

  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ color: t.brand, fontSize: 11, fontFamily: FONT.bold, letterSpacing: 1 }}>MODELO HEPÁTICO ESTRUTURADO</Text>
        <Text style={{ color: t.text, fontSize: 20, fontFamily: FONT.bold }}>{hepaticAndroidModelName(category)}</Text>
        <Text style={{ color: t.textSec, fontSize: 12 }}>Revisão {value.revision} · ativação conjunta pendente</Text>
      </View>
      {authError ? <Notice tone="error" t={t}>{authError}</Notice> : null}
      {editError ? <Notice tone="error" t={t}>{editError}</Notice> : null}
      {lacksQualityRegistry ? (
        <Notice tone="warn" t={t}>
          Configuração técnica ainda pendente. Os métodos podem ser preenchidos, mas a conclusão permanece bloqueada até existir
          um critério de qualidade aprovado para o equipamento e a unidade usados. Nenhuma referência clínica foi presumida.
        </Notice>
      ) : null}

      {physicianId ? (
        <View style={{ gap: 12, opacity: busy ? 0.6 : 1 }} pointerEvents={busy ? "none" : "auto"}>
          <Card title="Dados do exame" t={t}>
            <Input
              label="Indicação clínica"
              value={indicationDraft}
              onChange={(raw) => {
                setIndicationDraft(raw);
                const indication = optionalHepaticText(raw);
                if (indication !== value.indication) apply(() => replaceHepaticAssessmentContext(value, { indication }));
              }}
              t={t}
            />
          </Card>
          {(["stiffness", "fat"] as const).map((key) => (
            <ModuleEditor
              key={`${key}-${value.modules[key].status}`}
              moduleKey={key}
              value={value}
              apply={apply}
              physicianId={physicianId}
              configuration={HEPATIC_ANDROID_CONFIGURATION[key]}
              t={t}
            />
          ))}
          {value.purpose === "multiparametric" ? (
            <CorrelationEditor value={value} apply={apply} physicianId={physicianId} t={t} />
          ) : null}
          <View
            accessibilityRole="summary"
            style={{ gap: 6, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: readiness.canConclude ? t.brand : "#D97706", backgroundColor: t.fill2 }}
          >
            <Text style={{ color: t.text, fontFamily: FONT.bold }}>{readiness.canConclude ? "Pronto para concluir" : "Revisão pendente"}</Text>
            {readiness.issues.length ? readiness.issues.map((issue, index) => (
              <Text key={`${issue.path}-${issue.code}-${index}`} style={{ color: t.text, fontSize: 12 }}>
                • {HEPATIC_ISSUE_LABELS[issue.code] ?? issue.code} <Text style={{ color: t.textSec, fontSize: 10 }}>{issue.path}</Text>
              </Text>
            )) : <Text style={{ color: t.textSec, fontSize: 12 }}>Dados técnicos e interpretações médicas estão vinculados à revisão atual.</Text>}
          </View>
        </View>
      ) : !authError ? <Text style={{ color: t.textSec }}>Confirmando a sessão…</Text> : null}

      <Card title="Prévia clínica" t={t}>
        <Text style={{ color: t.text, fontFamily: FONT.bold }}>{title}</Text>
        <Text selectable={released} style={{ color: t.text, fontSize: 14, lineHeight: 21 }}>
          {visibleReport || "A prévia será liberada quando os dados técnicos, o critério de qualidade aplicável e as interpretações médicas estiverem confirmados."}
        </Text>
        {flow.error ? <Notice tone="error" t={t}>{flow.error}</Notice> : null}
        {flow.phase === "pending_review" ? <Notice tone="warn" t={t}>Leia o texto salvo e confirme a revisão médica para liberar a cópia e o status pronto na Sala.</Notice> : null}
        {released ? <Notice tone="ok" t={t}>Revisão vinculada ao texto e à revisão {flow.persisted?.contentRevision}. Laudo pronto para a Sala.</Notice> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {flow.phase === "editing" || flow.phase === "persisting" ? (
            <Action
              label={flow.phase === "persisting" ? "Salvando…" : flow.persisted ? "Atualizar rascunho" : "Gerar e salvar rascunho"}
              disabled={!localPreview || flow.phase === "persisting" || !physicianId}
              onPress={() => void persist()}
              primary
              t={t}
            />
          ) : null}
          {(flow.phase === "pending_review" || flow.phase === "reviewing") && flow.persisted ? (
            <Action
              label={flow.phase === "reviewing" ? "Confirmando…" : "Confirmar revisão médica"}
              disabled={flow.phase === "reviewing"}
              onPress={() => void confirmReview()}
              primary
              t={t}
            />
          ) : null}
          <Action
            label={copyState === "copied" ? "Copiado" : copyState === "error" ? "Falha ao copiar" : "Copiar laudo"}
            disabled={!released}
            onPress={() => void copy()}
            t={t}
          />
        </View>
      </Card>
    </View>
  );
}

function ModuleEditor({ moduleKey, value, apply, physicianId, configuration, t }: {
  moduleKey: HepaticModuleKey;
  value: HepaticAssessment;
  apply: (edit: () => HepaticAssessment) => void;
  physicianId: string;
  configuration: HepaticModuleConfiguration;
  t: Tokens;
}) {
  const moduleValue = value.modules[moduleKey];
  const [interpretation, setInterpretation] = useState(moduleValue.interpretation?.text ?? "");
  const [reasonDraft, setReasonDraft] = useState(moduleValue.reason ?? "");
  const [qualityMetrics, setQualityMetrics] = useState<Record<string, string>>({});
  const [unitDraft, setUnitDraft] = useState<HepaticUnit | "">(moduleValue.measurements.find((item) => item.role === "median")?.unit ?? "");
  const [medianDraft, setMedianDraft] = useState(() => draftOf(moduleValue, "median"));
  const [iqrDraft, setIqrDraft] = useState(() => draftOf(moduleValue, "iqr"));
  const [hoursDraft, setHoursDraft] = useState(moduleValue.fasting?.hours == null ? "" : String(moduleValue.fasting.hours));
  const [technique, setTechnique] = useState({
    manufacturer: moduleValue.equipment?.manufacturer ?? "",
    model: moduleValue.equipment?.model ?? "",
    probe: moduleValue.equipment?.probe ?? "",
    count: moduleValue.acquisition?.count ? String(moduleValue.acquisition.count) : "",
    lobe: moduleValue.acquisition?.lobe ?? ("right" as const),
    depthCm: moduleValue.acquisition?.depthCm ? String(moduleValue.acquisition.depthCm) : "",
    roi: moduleValue.acquisition?.roi ?? "",
    position: moduleValue.acquisition?.position ?? "",
  });
  const [confounders, setConfounders] = useState({
    etiologicContext: moduleValue.confounders?.etiologicContext ?? "",
    items: moduleValue.confounders?.items.join("\n") ?? "",
  });

  const active = moduleValue.status === "performed" || moduleValue.status === "partially_limited";
  const median = moduleValue.measurements.find((item) => item.role === "median");
  const iqr = moduleValue.measurements.find((item) => item.role === "iqr");
  const units = moduleValue.method ? HEPATIC_UNITS[moduleValue.method] : [];
  const unit: HepaticUnit | undefined = median?.unit ?? (unitDraft || units[0]);
  const acquisitionIssues = hepaticQualityAcquisitionIssues(moduleValue);
  const qualityConfiguration = moduleValue.method ? configuration.qualityByMethod[moduleValue.method] : undefined;
  useEffect(() => { setQualityMetrics({}); }, [moduleValue.method, unit, moduleValue.equipment?.manufacturer, moduleValue.equipment?.model]);
  const techniquePatch = buildHepaticTechniquePatch(technique, configuration.protocolReference);
  const patch = (next: Partial<HepaticModule>) => apply(() => editHepaticModule(value, moduleKey, next));

  function setMeasurement(role: "median" | "iqr", raw: string) {
    (role === "median" ? setMedianDraft : setIqrDraft)(raw);
    if (!raw.trim()) return apply(() => clearHepaticMeasurement(value, moduleKey, role));
    const parsed = parseHepaticNumber(raw);
    // Digitação parcial ("5,") fica só no rascunho do campo, fora do contrato.
    if (parsed === null || !unit) return;
    apply(() => upsertHepaticMeasurement(value, moduleKey, {
      id: `${moduleKey}-${role}`, role, value: parsed, unit, origin: "manual", source: configuration.measurementReference,
    }));
  }

  function registerQuality() {
    const quality = buildHepaticQuality({
      module: moduleValue, unit, configuration: qualityConfiguration, metricDrafts: qualityMetrics, physicianId, assessedAt: now(),
    });
    if (quality) patch({ quality });
  }

  return (
    <Card title={moduleLabel(moduleKey)} t={t}>
      <Select
        label="Status"
        value={moduleValue.status}
        options={[
          { value: "not_performed", label: "Não realizado" },
          { value: "performed", label: "Realizado" },
          { value: "partially_limited", label: "Parcialmente limitado" },
          { value: "not_feasible", label: "Não realizável" },
        ]}
        onChange={(status) => apply(() => changeHepaticModuleStatus(value, moduleKey, status as HepaticModule["status"]))}
        t={t}
      />
      {moduleValue.status === "partially_limited" || moduleValue.status === "not_feasible" ? (
        <Input
          label="Motivo da limitação"
          value={reasonDraft}
          onChange={(raw) => {
            setReasonDraft(raw);
            const reason = optionalHepaticText(raw);
            if (reason !== moduleValue.reason) patch({ reason });
          }}
          t={t}
        />
      ) : null}
      {active ? (
        <>
          <Select
            label="Método"
            value={moduleValue.method ?? ""}
            options={HEPATIC_METHODS[moduleKey].map((method) => ({ value: method, label: method }))}
            onChange={(raw) => {
              const method = raw as HepaticMethod;
              setUnitDraft(HEPATIC_UNITS[method][0] ?? "");
              setMedianDraft(""); setIqrDraft("");
              apply(() => changeHepaticMethod(value, moduleKey, method));
            }}
            t={t}
          />
          <Input label="Fabricante" value={technique.manufacturer} onChange={(manufacturer) => setTechnique((c) => ({ ...c, manufacturer }))} t={t} />
          <Input label="Modelo do equipamento" value={technique.model} onChange={(model) => setTechnique((c) => ({ ...c, model }))} t={t} />
          <Input label="Transdutor (opcional)" value={technique.probe} onChange={(probe) => setTechnique((c) => ({ ...c, probe }))} t={t} />
          <Input label="Número de aquisições" value={technique.count} onChange={(count) => setTechnique((c) => ({ ...c, count }))} numeric t={t} />
          <Select
            label="Lobo"
            value={technique.lobe}
            options={[{ value: "right", label: "Direito" }, { value: "left", label: "Esquerdo" }]}
            onChange={(lobe) => setTechnique((c) => ({ ...c, lobe: lobe as "right" | "left" }))}
            t={t}
          />
          <Input label="Profundidade (cm)" value={technique.depthCm} onChange={(depthCm) => setTechnique((c) => ({ ...c, depthCm }))} numeric t={t} />
          <Input label="ROI" value={technique.roi} onChange={(roi) => setTechnique((c) => ({ ...c, roi }))} t={t} />
          <Input label="Posição do paciente" value={technique.position} onChange={(position) => setTechnique((c) => ({ ...c, position }))} t={t} />
          <Action
            label={moduleValue.equipment && moduleValue.acquisition ? "Aplicar alterações da técnica" : "Aplicar técnica e aquisição"}
            disabled={!techniquePatch}
            onPress={() => techniquePatch && patch(techniquePatch)}
            t={t}
          />

          <Select
            label="Jejum"
            value={moduleValue.fasting?.status ?? "unknown"}
            options={[{ value: "unknown", label: "Não informado" }, { value: "fasting", label: "Em jejum" }, { value: "non_fasting", label: "Sem jejum" }]}
            onChange={(status) => {
              const fastingStatus = status as "fasting" | "non_fasting" | "unknown";
              const hours = fastingStatus === "fasting" ? parseHepaticNumber(hoursDraft) ?? undefined : undefined;
              patch({ fasting: { status: fastingStatus, hours } });
            }}
            t={t}
          />
          {moduleValue.fasting?.status === "fasting" ? (
            <Input
              label="Horas de jejum"
              value={hoursDraft}
              numeric
              onChange={(raw) => {
                setHoursDraft(raw);
                const hours = parseHepaticNumber(raw);
                if (hours !== null) patch({ fasting: { status: "fasting", hours } });
              }}
              t={t}
            />
          ) : null}

          <Select
            label="Unidade nativa"
            value={unit ?? ""}
            options={units.map((item) => ({ value: item, label: item }))}
            onChange={(raw) => {
              setUnitDraft(raw as HepaticUnit);
              if (raw === unit) return;
              setMedianDraft(""); setIqrDraft("");
              if (moduleValue.measurements.length || moduleValue.quality) apply(() => changeHepaticUnit(value, moduleKey));
            }}
            t={t}
          />
          {!moduleValue.method ? <Text style={{ color: t.textSec, fontSize: 12 }}>Selecione o método para informar as medidas.</Text> : (
            <>
              <Input label={`Mediana (${unit ?? "—"})`} value={medianDraft} onChange={(raw) => setMeasurement("median", raw)} numeric t={t} />
              <Input label={`IQR (${unit ?? "—"})`} value={iqrDraft} onChange={(raw) => setMeasurement("iqr", raw)} numeric t={t} />
              <Action label="Calcular IQR/mediana" disabled={!canCalculateHepaticIqrRatio(moduleValue)} onPress={() => apply(() => calculateHepaticIqrRatio(value, moduleKey))} t={t} />
              {moduleValue.derived[0] ? (
                <Text style={{ color: t.textSec, fontSize: 12 }}>IQR/mediana: {moduleValue.derived[0].value.toFixed(1).replace(".", ",")}%</Text>
              ) : null}
            </>
          )}

          <SubCard title="Fatores de confusão" hint="A revisão deve ser refeita após qualquer edição aplicada." t={t}>
            <Input label="Contexto etiológico" value={confounders.etiologicContext} onChange={(etiologicContext) => setConfounders((c) => ({ ...c, etiologicContext }))} t={t} />
            <Input label="Fatores presentes (um por linha)" value={confounders.items} onChange={(items) => setConfounders((c) => ({ ...c, items }))} multiline t={t} />
            <Action
              label={moduleValue.confounders?.reviewed ? "Reconfirmar revisão dos fatores" : "Confirmar revisão dos fatores"}
              disabled={!confounders.etiologicContext.trim()}
              onPress={() => patch({ confounders: {
                reviewed: true,
                etiologicContext: confounders.etiologicContext.trim(),
                items: confounders.items.split("\n").map((item) => item.trim()).filter(Boolean),
              } })}
              t={t}
            />
          </SubCard>

          <SubCard title="Qualidade técnica" t={t}>
            {acquisitionIssues.length > 0 && <Text style={{ color: "#B45309", fontSize: 12 }}>{acquisitionIssues.join(" ")}</Text>}
            {qualityConfiguration ? qualityConfiguration.metrics.map((metric) => metric.code === "protocol-confirmed" ? (
              <Action key={metric.code} label={`${qualityMetrics[metric.code] === "1" ? "✓ " : "□ "}${metric.label}`} onPress={() => { setQualityMetrics((current) => ({ ...current, [metric.code]: current[metric.code] === "1" ? "" : "1" })); if (moduleValue.quality) patch({ quality: undefined }); }} t={t} />
            ) : metric.source === "derived_iqr_median_percent" ? (
              <Text key={metric.code} style={{ color: t.text, fontSize: 12 }}>IQR/mediana: {moduleValue.derived[0] ? `${moduleValue.derived[0].value.toFixed(1)}%` : "calcule a partir da mediana e do IQR"}</Text>
            ) : (
              <Input
                key={metric.code}
                label={`${metric.label} (${metric.unit})`}
                value={qualityMetrics[metric.code] ?? ""}
                onChange={(raw) => setQualityMetrics((current) => ({ ...current, [metric.code]: raw }))}
                numeric
                t={t}
              />
            )) : <Text style={{ color: "#B45309", fontSize: 12 }}>Critério versionado não configurado para este método.</Text>}
            <Action
              label={moduleValue.quality?.assessment === "adequate" ? "Qualidade adequada registrada" : "Registrar qualidade adequada"}
              disabled={!qualityConfiguration || !moduleValue.equipment || !unit || !moduleValue.derived[0] || qualityMetrics["protocol-confirmed"] !== "1" || acquisitionIssues.length > 0}
              onPress={registerQuality}
              t={t}
            />
          </SubCard>

          <SubCard title="Interpretação médica" t={t}>
            <Input label="Texto da interpretação" value={interpretation} onChange={setInterpretation} multiline t={t} />
            <Action
              label="Confirmar interpretação deste módulo"
              disabled={!interpretation.trim()}
              onPress={() => apply(() => reviewHepaticModule(value, moduleKey, {
                text: interpretation, physicianId, confirmedAt: now(), reference: configuration.interpretationReference,
              }))}
              primary
              t={t}
            />
            {moduleValue.interpretation?.status === "physician_confirmed" ? (
              <Text style={{ color: t.brand, fontSize: 12, fontFamily: FONT.bold }}>Revisada pelo médico nesta versão.</Text>
            ) : null}
          </SubCard>
        </>
      ) : null}
    </Card>
  );
}

function draftOf(moduleValue: HepaticModule, role: "median" | "iqr"): string {
  const measurement = moduleValue.measurements.find((item) => item.role === role);
  return measurement ? String(measurement.value).replace(".", ",") : "";
}

function CorrelationEditor({ value, apply, physicianId, t }: {
  value: HepaticAssessment;
  apply: (edit: () => HepaticAssessment) => void;
  physicianId: string;
  t: Tokens;
}) {
  const [draft, setDraft] = useState<HepaticCorrelationDraft>({
    modeB: value.correlation?.modeB ?? "",
    doppler: value.correlation?.doppler ?? "",
    concordance: value.correlation?.concordance ?? "not_assessed",
    physicianResolution: value.correlation?.physicianResolution ?? "",
  });
  const [integrated, setIntegrated] = useState(value.integratedInterpretation?.text ?? "");
  const correlation = buildHepaticCorrelation(draft);
  return (
    <Card title="Correlação multiparamétrica" t={t}>
      <Input label="Modo B" value={draft.modeB} onChange={(modeB) => setDraft((c) => ({ ...c, modeB }))} multiline t={t} />
      <Input label="Doppler" value={draft.doppler} onChange={(doppler) => setDraft((c) => ({ ...c, doppler }))} multiline t={t} />
      <Select
        label="Concordância"
        value={draft.concordance}
        options={[{ value: "not_assessed", label: "Não avaliada" }, { value: "concordant", label: "Concordante" }, { value: "discordant", label: "Discordante" }]}
        onChange={(concordance) => setDraft((c) => ({ ...c, concordance: concordance as HepaticCorrelationDraft["concordance"] }))}
        t={t}
      />
      {draft.concordance === "discordant" ? (
        <Input label="Resolução médica" value={draft.physicianResolution} onChange={(physicianResolution) => setDraft((c) => ({ ...c, physicianResolution }))} multiline t={t} />
      ) : null}
      <Action
        label={value.correlation ? "Aplicar alterações da correlação" : "Aplicar correlação"}
        disabled={!correlation}
        onPress={() => correlation && apply(() => replaceHepaticAssessmentContext(value, { correlation }))}
        t={t}
      />
      <SubCard title="Conclusão integrada" hint="Confirme depois de revisar os dois módulos; qualquer edição exige nova confirmação." t={t}>
        <Input label="Texto da conclusão integrada" value={integrated} onChange={setIntegrated} multiline t={t} />
        <Action
          label="Confirmar conclusão integrada"
          disabled={!integrated.trim()}
          onPress={() => apply(() => reviewHepaticAssessment(value, {
            text: integrated, physicianId, confirmedAt: now(), reference: HEPATIC_INTEGRATED_INTERPRETATION_REFERENCE,
          }))}
          primary
          t={t}
        />
        {value.integratedInterpretation?.status === "physician_confirmed" ? (
          <Text style={{ color: t.brand, fontSize: 12, fontFamily: FONT.bold }}>Conclusão integrada confirmada nesta versão.</Text>
        ) : null}
      </SubCard>
    </Card>
  );
}

function Card({ title, t, children }: { title: string; t: Tokens; children: ReactNode }) {
  return (
    <View style={{ gap: 9, borderRadius: 16, padding: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.separator }}>
      <Text style={{ color: t.text, fontFamily: FONT.bold }}>{title}</Text>
      {children}
    </View>
  );
}

function SubCard({ title, hint, t, children }: { title: string; hint?: string; t: Tokens; children: ReactNode }) {
  return (
    <View style={{ gap: 8, borderRadius: 12, padding: 10, backgroundColor: t.fill2 }}>
      <Text style={{ color: t.text, fontFamily: FONT.bold, fontSize: 13 }}>{title}</Text>
      {hint ? <Text style={{ color: t.textSec, fontSize: 11 }}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function Notice({ tone, t, children }: { tone: "warn" | "error" | "ok"; t: Tokens; children: ReactNode }) {
  const color = tone === "error" ? "#B91C1C" : tone === "warn" ? "#B45309" : t.brand;
  return (
    <View accessibilityRole={tone === "error" ? "alert" : "text"} style={{ borderRadius: 12, padding: 10, borderWidth: 1, borderColor: color, backgroundColor: t.fill2 }}>
      <Text style={{ color: t.text, fontSize: 12, lineHeight: 17 }}>{children}</Text>
    </View>
  );
}

function Input({ label, value, onChange, t, numeric = false, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void; t: Tokens; numeric?: boolean; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: t.textSec, fontSize: 12, fontFamily: FONT.medium }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        // Limite do schema compartilhado para textos (2000).
        maxLength={2000}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{ minHeight: multiline ? 86 : 44, color: t.text, backgroundColor: t.bg, borderWidth: 1, borderColor: t.separator, borderRadius: 11, paddingHorizontal: 11, paddingVertical: multiline ? 10 : 0 }}
      />
    </View>
  );
}

function Select({ label, value, options, onChange, t }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; t: Tokens }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: t.textSec, fontSize: 12, fontFamily: FONT.medium }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={{ minHeight: 40, justifyContent: "center", borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: value === option.value ? t.brand : t.separator, backgroundColor: value === option.value ? t.fill2 : t.bg }}
          >
            <Text style={{ color: t.text, fontSize: 12 }}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Action({ label, onPress, disabled = false, primary = false, t }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; t: Tokens }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 16, borderWidth: 1, borderColor: primary ? t.brand : t.separator, backgroundColor: primary ? t.brand : t.bg, opacity: disabled ? 0.45 : 1 }}
    >
      <Text style={{ color: primary ? "#FFFFFF" : t.text, fontFamily: FONT.bold, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
