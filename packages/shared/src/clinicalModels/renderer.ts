import type {
  AbdomenTotalDopplerInput,
  ClinicalModelInput,
  DopplerArterialMmssInput,
  DopplerVenosoMmssInput,
  QuadrilInfantilInput,
  ThoraxInput,
} from "./contracts";
import { BALIK_PLEURAL_EFFUSION_METHOD, calculateBalikPleuralEffusionVolume, isBalikEligible, validateClinicalModelInput } from "./contracts";

const pt = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
/** Texto livre do médico vira uma frase com um único ponto final. */
const sentence = (text: string) => `${text.trim().replace(/[.;,:\s]+$/u, "")}.`;
const sideName = (side: "right" | "left") => side === "right" ? "direito" : "esquerdo";
const flowLabel = { hepatopetal: "hepatopetal", hepatofugal: "hepatofugal", ausente: "ausente", outro: "com padrão descrito pelo médico" } as const;

function renderAbdomen(data: AbdomenTotalDopplerInput) {
  const vessel = (label: string, v: { caliberCm?: number; velocityCms?: number; flow?: keyof typeof flowLabel }) =>
    `${label} com calibre de ${pt(v.caliberCm!)} cm, velocidade de ${pt(v.velocityCms!)} cm/s e fluxo ${flowLabel[v.flow!]}.`;
  const optional = [
    ["Veias hepáticas", data.hepaticVeins], ["Veia esplênica", data.splenicVein],
    ["Veia mesentérica superior", data.superiorMesentericVein], ["Artéria hepática comum", data.commonHepaticArtery],
  ] as const;
  const lines = [vessel("Tronco da veia porta", data.portalVein), ...optional.flatMap(([label, value]) => value.evaluated ? [vessel(label, value)] : [])];
  if (data.portalPathology.status !== "absent") lines.push(sentence(data.portalPathology.evidence!));
  const suspected = data.portalPathology.status === "suspected";
  const portalPrefix = suspected ? "Achados suspeitos de" : "Sinais ultrassonográficos de";
  const conclusion = data.portalPathology.status === "absent"
    ? "Estudo Doppler do sistema esplâncnico sem alterações nos parâmetros informados."
    : data.portalPathology.kind === "portal_thrombosis" ? `${portalPrefix} trombose portal.`
      : data.portalPathology.kind === "portal_hypertension" ? `${portalPrefix} hipertensão portal.`
        : suspected ? "Achados suspeitos de alteração do sistema portal, conforme descritos acima." : "Alteração do sistema portal, conforme descrita acima.";
  return `ULTRASSONOGRAFIA DO ABDOME TOTAL COM DOPPLER COLORIDO\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo multifrequencial, abrangendo todo o abdome. Foram realizados múltiplos cortes em planos ortogonais.${data.documentationPhoto === "include" ? " A documentação fotográfica foi realizada conforme a preferência configurada." : ""}\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${data.abdomenReport}\n\nDOPPLER DO SISTEMA ESPLÂNCNICO:\n${lines.join("\n")}\n\nCONCLUSÃO:\n${conclusion}`;
}

const indicationLabel = { elective: "avaliação eletiva", thrombosis_research: "pesquisa de trombose", catheter: "avaliação relacionada a cateter" } as const;
const phaseLabel = { acute: "aguda", subacute: "subaguda", chronic: "crônica", indeterminate: "indeterminada" } as const;
const catheterRelationLabel = { adjacent: "adjacente", around_catheter: "ao redor do cateter", occlusive: "oclusiva" } as const;
function venousSide(data: DopplerVenosoMmssInput, side: "right" | "left") {
  const s = data[side];
  if (!s.examined) return "";
  const thrombosis = s.deepSystem === "thrombosis" || s.superficialSystem === "thrombosis" || s.internalJugular === "thrombosis";
  const lines = [
    `Membro superior ${sideName(side)}:`,
    `Sistema venoso profundo ${s.deepSystem === "patent" ? "pérvio nos segmentos avaliados" : s.deepSystem === "thrombosis" ? "com sinais de trombose" : "não avaliado por completo"}.`,
    `Sistema venoso superficial ${s.superficialSystem === "patent" ? "pérvio nos segmentos avaliados" : s.superficialSystem === "thrombosis" ? "com sinais de trombose" : "não avaliado por completo"}.`,
  ];
  if (s.internalJugular !== "not_assessed") lines.push(`Veia jugular interna ${s.internalJugular === "patent" ? "pérvia" : "com sinais de trombose"}.`);
  if (s.competenceTested) lines.push(`Pesquisa de refluxo ${s.reflux === "present" ? "positiva" : "negativa"}.`);
  if (s.catheter.present) lines.push(`Cateter no segmento ${s.catheter.segment}, com relação ${catheterRelationLabel[s.catheter.relation as keyof typeof catheterRelationLabel]}.`);
  if (thrombosis && s.thrombosisPhase !== "not_applicable") lines.push(`Aspecto temporal da trombose: ${phaseLabel[s.thrombosisPhase]}.`);
  return lines.join("\n");
}
function venousConclusion(data: DopplerVenosoMmssInput, side: "right" | "left") {
  const s = data[side];
  if (!s.examined) return "";
  const territories = [s.deepSystem === "thrombosis" ? "sistema venoso profundo" : "", s.superficialSystem === "thrombosis" ? "sistema venoso superficial" : "", s.internalJugular === "thrombosis" ? "veia jugular interna" : ""].filter(Boolean);
  const result = territories.length ? `Trombose no ${territories.join(" e ")} do membro superior ${sideName(side)}.` : `Não se identificam sinais de trombose nos segmentos venosos avaliados do membro superior ${sideName(side)}.`;
  return s.competenceTested && s.reflux === "present" ? `${result} Refluxo venoso detectado.` : result;
}
function renderVenous(data: DopplerVenosoMmssInput) {
  const sections = (["right", "left"] as const).map((side) => venousSide(data, side)).filter(Boolean);
  const conclusion = (["right", "left"] as const).map((side) => venousConclusion(data, side)).filter(Boolean);
  return `DOPPLER VENOSO DE MEMBRO SUPERIOR\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, análise espectral, Doppler colorido e manobras de compressão seriada. Indicação: ${indicationLabel[data.indication]}.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${sections.join("\n\n")}\n\nCONCLUSÃO:\n${conclusion.join("\n")}`;
}

const arterialStatusLabel = { stenosis: "Estenose", occlusion: "Oclusão", other: "Outra alteração" } as const;
const outletResultLabel = { negative: "negativo", positive: "positivo", indeterminate: "indeterminado" } as const;
function arterialSide(data: DopplerArterialMmssInput, side: "right" | "left") {
  const s = data[side];
  if (!s.examined) return "";
  const velocities = Object.entries(s.psvCms).map(([vessel, value]) => `${vessel}: velocidade de pico sistólico de ${pt(value)} cm/s.`);
  const lines = [`Membro superior ${sideName(side)}:`, s.status === "normal" ? "Artérias avaliadas pérvias, com padrão espectral preservado." : `${arterialStatusLabel[s.status]} em ${s.affectedVessel}.`, ...velocities];
  if (s.stenosisPercent != null) lines.push(`Estenose estimada em ${pt(s.stenosisPercent)}%.`);
  if (s.distalPattern) lines.push(`Padrão distal: ${sentence(s.distalPattern)}`);
  if (s.thoracicOutlet.evaluated) lines.push(`Desfiladeiro torácico: manobras ${s.thoracicOutlet.maneuvers}; posições ${s.thoracicOutlet.positions}; resultado ${outletResultLabel[s.thoracicOutlet.result]}.`);
  return lines.join("\n");
}
function arterialConclusion(data: DopplerArterialMmssInput, side: "right" | "left") {
  const s = data[side];
  if (!s.examined) return "";
  const base = s.status === "normal"
    ? `Estudo arterial do membro superior ${sideName(side)} sem alterações hemodinâmicas significativas.`
    : s.status === "stenosis"
      ? `Estenose de ${s.affectedVessel}${s.stenosisPercent != null ? `, estimada em ${pt(s.stenosisPercent)}%` : ""}, no membro superior ${sideName(side)}.`
      : s.status === "occlusion"
        ? `Oclusão de ${s.affectedVessel} no membro superior ${sideName(side)}.`
        : `Alteração de ${s.affectedVessel} no membro superior ${sideName(side)}, conforme descrita acima.`;
  if (!s.thoracicOutlet.evaluated) return base;
  const outlet = s.thoracicOutlet.result === "positive"
    ? "Manobras posicionais positivas para compressão arterial no desfiladeiro torácico."
    : s.thoracicOutlet.result === "negative"
      ? "Manobras posicionais negativas para compressão arterial no desfiladeiro torácico."
      : "Avaliação do desfiladeiro torácico com resultado indeterminado.";
  return `${base} ${outlet}`;
}
function renderArterial(data: DopplerArterialMmssInput) {
  const sections = (["right", "left"] as const).map((side) => arterialSide(data, side)).filter(Boolean);
  const conclusion = (["right", "left"] as const).map((side) => arterialConclusion(data, side)).filter(Boolean);
  return `DOPPLER ARTERIAL DE MEMBRO SUPERIOR\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, análise espectral e mapeamento com Doppler colorido.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${sections.join("\n\n")}\n\nCONCLUSÃO:\n${conclusion.join("\n")}`;
}

const pleuralLineLabel = { regular: "regular", irregular: "irregular", not_assessed: "não avaliada" } as const;
const slidingLabel = { present: "presente", absent: "ausente", not_assessed: "não avaliado" } as const;
const distributionLabel = { none: "ausente", focal: "focal", multifocal: "multifocal", diffuse: "difusa" } as const;
const findingLabel = { not_seen: "não identificada", suspected: "suspeita", confirmed: "confirmada" } as const;
function thoraxSide(data: ThoraxInput, side: "right" | "left") {
  const s = data[side];
  const effusion = s.effusion.present
    ? isBalikEligible(s.effusion.context)
      ? `Derrame pleural com separação máxima de ${pt(s.effusion.separationMm)} mm e volume estimado de ${pt(calculateBalikPleuralEffusionVolume(s.effusion))} mL pelo método de Balik.`
      : `Derrame pleural com separação máxima de ${pt(s.effusion.separationMm)} mm; volume não calculado fora do domínio validado do método de Balik.`
    : "Não se identifica derrame pleural.";
  return [`Hemitórax ${sideName(side)}:`, `Linha pleural ${pleuralLineLabel[s.pleuralLine]}; deslizamento pleural ${slidingLabel[s.sliding]}.`, s.linesB.count ? `${s.linesB.count} linhas B, com distribuição ${distributionLabel[s.linesB.distribution]}.` : "Não foram registradas linhas B.", effusion, `Consolidação ${findingLabel[s.consolidation]}. Atelectasia ${findingLabel[s.atelectasis]}. Sinais de pneumotórax: ${findingLabel[s.pneumothorax]}.`].join("\n");
}
function thoraxConclusionSide(data: ThoraxInput, side: "right" | "left") {
  const s = data[side];
  const findings: string[] = [];
  if (s.pleuralLine === "irregular") findings.push("irregularidade da linha pleural");
  if (s.sliding === "absent") findings.push("ausência de deslizamento pleural");
  if (s.effusion.present) findings.push(isBalikEligible(s.effusion.context) ? `derrame pleural estimado em ${pt(calculateBalikPleuralEffusionVolume(s.effusion))} mL` : `derrame pleural com separação máxima de ${pt(s.effusion.separationMm)} mm, sem estimativa volumétrica`);
  if (s.linesB.count > 0) findings.push(`${s.linesB.count} linhas B de distribuição ${distributionLabel[s.linesB.distribution]}`);
  if (s.consolidation !== "not_seen") findings.push(`consolidação ${findingLabel[s.consolidation]}`);
  if (s.atelectasis !== "not_seen") findings.push(`atelectasia ${findingLabel[s.atelectasis]}`);
  if (s.pneumothorax !== "not_seen") findings.push(`pneumotórax ${findingLabel[s.pneumothorax]}`);
  if (findings.length) return `Hemitórax ${sideName(side)}: ${findings.join(", ")}.`;
  if (s.pleuralLine === "not_assessed" || s.sliding === "not_assessed") return `Hemitórax ${sideName(side)} com avaliação pleural incompleta.`;
  return `Hemitórax ${sideName(side)} sem alterações ecográficas significativas.`;
}
function renderThorax(data: ThoraxInput) {
  const hasEffusion = [data.right, data.left].some((side) => side.effusion.present && isBalikEligible(side.effusion.context));
  const methodNote = hasEffusion ? `\n\nNOTA DA ESTIMATIVA:\n${BALIK_PLEURAL_EFFUSION_METHOD.formula}; ${BALIK_PLEURAL_EFFUSION_METHOD.population}; ${BALIK_PLEURAL_EFFUSION_METHOD.measurement}. DOI ${BALIK_PLEURAL_EFFUSION_METHOD.doi}. Erro absoluto médio aproximado de ${BALIK_PLEURAL_EFFUSION_METHOD.meanAbsoluteErrorMl} mL; a estimativa não determina conduta automaticamente.` : "";
  const conclusion = `${thoraxConclusionSide(data, "right")}\n${thoraxConclusionSide(data, "left")}${data.correlationSuggested ? "\nSugere-se correlação clínica." : ""}`;
  return `ULTRASSONOGRAFIA DE TÓRAX\n\nCOMENTÁRIOS:\nExame realizado com transdutores convexo e linear, com avaliação bilateral das regiões anterior, lateral e posterior do tórax.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${thoraxSide(data, "right")}\n\n${thoraxSide(data, "left")}\n${data.limitation ? `\nLimitação: ${sentence(data.limitation)}` : ""}${methodNote}\n\nCONCLUSÃO:\n${conclusion}`;
}

const roofLabel = { normal: "bem formado", rounded: "arredondado", deficient: "deficiente", not_assessed: "não avaliado" } as const;
const cartilageLabel = { normal: "preservado", displaced: "deslocado", not_assessed: "não avaliado" } as const;
const headLabel = { centered: "centrada", decentered: "descentrada", dislocated: "luxada", not_assessed: "não avaliada" } as const;
const labrumLabel = { normal: "em posição habitual", everted: "evertido", interposed: "interposto", not_assessed: "não avaliado" } as const;
function hipSide(data: QuadrilInfantilInput, side: "right" | "left") {
  const s = data[side];
  if (!s.adequateStandardPlane) return `Quadril ${sideName(side)}: corte padrão inadequado; classificação não emitida.`;
  return `Quadril ${sideName(side)}: teto ósseo ${roofLabel[s.bonyRoof]}, teto cartilaginoso ${cartilageLabel[s.cartilaginousRoof]}, cabeça femoral ${headLabel[s.femoralHead]}, labrum ${labrumLabel[s.labrumPosition]}, ângulo alfa de ${pt(s.alphaDeg!)}°, ângulo beta de ${pt(s.betaDeg!)}°${s.coveragePercent != null ? ` e cobertura de ${pt(s.coveragePercent)}%` : ""}. Classificação de Graf ${s.grafClassification}.`;
}
function renderHip(data: QuadrilInfantilInput) {
  return `ULTRASSONOGRAFIA DOS QUADRIS DO LACTENTE\n\nCOMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, utilizando cortes coronais padronizados segundo a técnica de Graf. Idade: ${data.ageDays!} dias.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${hipSide(data, "right")}\n${hipSide(data, "left")}\n\nCONCLUSÃO:\nQuadril direito classificado como Graf ${data.right.grafClassification}.\nQuadril esquerdo classificado como Graf ${data.left.grafClassification}.${data.recommendation ? `\n${data.recommendation}` : ""}`;
}

export function renderClinicalModelReport(value: unknown): string {
  const validated = validateClinicalModelInput(value, { requirePhysicianReview: false });
  if (!validated.success) throw new Error(validated.issues.map((entry) => entry.message).join(" "));
  const data: ClinicalModelInput = validated.data;
  switch (data.categoryCode) {
    case "ABDOMEN_TOTAL_DOPPLER": return renderAbdomen(data);
    case "DOPPLER_VENOSO_MMSS": return renderVenous(data);
    case "DOPPLER_ARTERIAL_MMSS": return renderArterial(data);
    case "TORAX": return renderThorax(data);
    case "QUADRIL_INFANTIL": return renderHip(data);
  }
}
