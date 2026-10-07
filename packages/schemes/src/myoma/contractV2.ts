import { z } from "zod";
import { MyomaEchoSchema } from "./contract";

/**
 * Contrato clínico `myoma-scheme/v2` — DORMENTE.
 *
 * Nenhuma UI, renderer ou migração lê este módulo; ele não é reexportado por
 * `myoma/index.ts`, então ativar exige importá-lo de propósito. O v1
 * (`contract.ts`) segue sendo o contrato em uso e não é tocado.
 *
 * Diferenças em relação ao v1:
 * - guarda as relações que definem a FIGO (endométrio, serosa, pedículo,
 *   sítio, parede) em vez de só o número;
 * - aceita FIGO declarada simples (0–8) ou híbrida (endométrio-serosa, ex.: 2-5)
 *   sem reduzir a híbrida a uma categoria simples;
 * - deriva a categoria só quando as relações bastam; faltou dado → incompleta,
 *   sem categoria presumida; contradição → conflito, que bloqueia o contrato;
 * - três dimensões com unidade explícita; volume (elipsoide) é calculado mas
 *   só é exibido com opt-in (`display.showVolume`, desligado por padrão).
 *
 * A categoria resolvida nunca é gravada no contrato: é sempre recalculada por
 * `resolveMyomaFigoV2`, para não divergir das relações que a sustentam.
 */

/** Sítio do mioma. Fora do corpo uterino é FIGO 8. */
export const MyomaSiteV2Schema = z.enum([
  "nao_informado",
  "corpo_uterino",
  "cervical",
  "ligamento_largo",
  "parasitario",
  "outro_atipico",
]);
export type MyomaSiteV2 = z.infer<typeof MyomaSiteV2Schema>;

const ATYPICAL_SITES: readonly MyomaSiteV2[] = ["cervical", "ligamento_largo", "parasitario", "outro_atipico"];

/** Parede uterina. Descritiva: não participa da derivação FIGO. */
export const MyomaWallV2Schema = z.enum([
  "nao_informada",
  "anterior",
  "posterior",
  "fundica",
  "lateral_direita",
  "lateral_esquerda",
]);
export type MyomaWallV2 = z.infer<typeof MyomaWallV2Schema>;

/**
 * Relação com o endométrio. As frações referem-se à parte do mioma contida no
 * miométrio, como no texto da FIGO (1: < 50% intramural; 2: ≥ 50%; 3: 100%).
 * `contato_grau_nao_informado` = toca o endométrio, mas a fração não foi dita.
 */
export const MyomaEndometrialRelationSchema = z.enum([
  "nao_informado",
  "sem_contato",
  "contato_grau_nao_informado",
  "intracavitario",
  "submucoso_intramural_menor_50",
  "submucoso_intramural_maior_igual_50",
  "contato_intramural_100",
]);
export type MyomaEndometrialRelation = z.infer<typeof MyomaEndometrialRelationSchema>;

/** Relação com a serosa (5: ≥ 50% intramural; 6: < 50%; 7: exofítico com pedículo). */
export const MyomaSerosalRelationSchema = z.enum([
  "nao_informado",
  "sem_contato",
  "contato_grau_nao_informado",
  "subseroso_intramural_maior_igual_50",
  "subseroso_intramural_menor_50",
  "subseroso_exofitico",
]);
export type MyomaSerosalRelation = z.infer<typeof MyomaSerosalRelationSchema>;

export const MyomaPedicleSchema = z.enum(["nao_informado", "ausente", "presente"]);
export type MyomaPedicle = z.infer<typeof MyomaPedicleSchema>;

const ENDOMETRIAL_CATEGORY: Partial<Record<MyomaEndometrialRelation, 0 | 1 | 2 | 3>> = {
  intracavitario: 0,
  submucoso_intramural_menor_50: 1,
  submucoso_intramural_maior_igual_50: 2,
  contato_intramural_100: 3,
};
const SEROSAL_CATEGORY: Partial<Record<MyomaSerosalRelation, 5 | 6 | 7>> = {
  subseroso_intramural_maior_igual_50: 5,
  subseroso_intramural_menor_50: 6,
  subseroso_exofitico: 7,
};

const HybridEndometrialSchema = z.union([z.literal(2), z.literal(3)]);
const HybridSerosalSchema = z.union([z.literal(5), z.literal(6)]);

/**
 * FIGO declarada pelo médico. Híbrida = mioma que toca endométrio E serosa;
 * o primeiro número é a relação com o endométrio (2–3), o segundo com a serosa
 * (5–6). O tipo 1 tem menos de 50% intramural e não alcança a serosa; 0 e 7 são
 * pediculados e não formam híbrido; 4 e 8 não têm par.
 */
export const MyomaFigoV2Schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("simples"), category: z.number().int().min(0).max(8) }).strict(),
  z.object({ kind: z.literal("hibrida"), endometrial: HybridEndometrialSchema, serosal: HybridSerosalSchema }).strict(),
]);
export type MyomaFigoV2 = z.infer<typeof MyomaFigoV2Schema>;

export const MyomaDimensionUnitSchema = z.enum(["mm", "cm"]);
export type MyomaDimensionUnit = z.infer<typeof MyomaDimensionUnitSchema>;

const MAX_AXIS_MM = 500;

/** Três eixos ortogonais na unidade em que foram ditados. Ordem livre. */
export const MyomaDimensionsV2Schema = z.object({
  unit: MyomaDimensionUnitSchema,
  values: z.tuple([
    z.number().finite().positive(),
    z.number().finite().positive(),
    z.number().finite().positive(),
  ]),
}).strict().superRefine((value, context) => {
  const factor = value.unit === "cm" ? 10 : 1;
  value.values.forEach((axis, index) => {
    if (axis * factor > MAX_AXIS_MM) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["values", index], message: `Eixo acima de ${MAX_AXIS_MM} mm.` });
    }
  });
});
export type MyomaDimensionsV2 = z.infer<typeof MyomaDimensionsV2Schema>;

export const MyomaFindingV2Schema = z.object({
  id: z.string().min(1),
  site: MyomaSiteV2Schema,
  wall: MyomaWallV2Schema,
  endometrium: MyomaEndometrialRelationSchema,
  serosa: MyomaSerosalRelationSchema,
  pedicle: MyomaPedicleSchema,
  declaredFigo: MyomaFigoV2Schema.nullable(),
  dimensions: MyomaDimensionsV2Schema.nullable(),
  echo: MyomaEchoSchema.nullable(),
}).strict();
export type MyomaFindingV2 = z.infer<typeof MyomaFindingV2Schema>;

/** Achado vazio: tudo "não informado". Nada é presumido. */
export function newMyomaFindingV2(id: string, patch: Partial<Omit<MyomaFindingV2, "id">> = {}): MyomaFindingV2 {
  return {
    id,
    site: "nao_informado",
    wall: "nao_informada",
    endometrium: "nao_informado",
    serosa: "nao_informado",
    pedicle: "nao_informado",
    declaredFigo: null,
    dimensions: null,
    echo: null,
    ...patch,
  };
}

export function formatMyomaFigoV2(figo: MyomaFigoV2): string {
  return figo.kind === "simples" ? `FIGO ${figo.category}` : `FIGO ${figo.endometrial}-${figo.serosal}`;
}

export function sameMyomaFigoV2(a: MyomaFigoV2, b: MyomaFigoV2): boolean {
  if (a.kind === "simples" && b.kind === "simples") return a.category === b.category;
  if (a.kind === "hibrida" && b.kind === "hibrida") return a.endometrial === b.endometrial && a.serosal === b.serosal;
  return false;
}

// ---------------------------------------------------------------------------
// Resolução da FIGO
// ---------------------------------------------------------------------------

export type MyomaFigoField = "site" | "wall" | "endometrium" | "serosa" | "pedicle" | "declaredFigo";

export type MyomaFigoConflictCode =
  | "pediculo_ausente_com_relacao_pediculada"
  | "pediculo_sem_ancoragem"
  | "pediculo_com_relacao_sessil"
  | "pediculado_nao_forma_hibrido"
  | "hibrida_anatomicamente_incompativel"
  | "sitio_atipico_com_contato_endometrial"
  | "parede_incompativel_com_sitio"
  | "declarada_diverge_das_relacoes";

export interface MyomaFigoConflict {
  code: MyomaFigoConflictCode;
  fields: MyomaFigoField[];
  message: string;
}

export type MyomaFigoMissing =
  | "site"
  | "endometrium"
  | "endometrium_grade"
  | "serosa"
  | "serosa_grade"
  | "pedicle"
  | "pedicle_insertion";

export type MyomaFigoResolution =
  | { status: "resolvida"; figo: MyomaFigoV2; source: "declarada" | "derivada" | "declarada_e_derivada" }
  | { status: "incompleta"; figo: null; missing: MyomaFigoMissing[] }
  | { status: "conflito"; figo: null; conflicts: MyomaFigoConflict[] };

type Derivation =
  | { kind: "complete"; figo: MyomaFigoV2 }
  | { kind: "incomplete"; missing: MyomaFigoMissing[] };

const touchesEndometrium = (relation: MyomaEndometrialRelation) => relation !== "nao_informado" && relation !== "sem_contato";
const touchesSerosa = (relation: MyomaSerosalRelation) => relation !== "nao_informado" && relation !== "sem_contato";
const SESSILE_ENDOMETRIAL: readonly MyomaEndometrialRelation[] = [
  "submucoso_intramural_menor_50",
  "submucoso_intramural_maior_igual_50",
  "contato_intramural_100",
];
const SESSILE_SEROSAL: readonly MyomaSerosalRelation[] = [
  "subseroso_intramural_maior_igual_50",
  "subseroso_intramural_menor_50",
];

/** Contradições entre as relações, independentes da FIGO declarada. */
function relationConflicts(finding: MyomaFindingV2): MyomaFigoConflict[] {
  const conflicts: MyomaFigoConflict[] = [];
  const { site, wall, endometrium, serosa, pedicle } = finding;
  const intracavitary = endometrium === "intracavitario";
  const exophytic = serosa === "subseroso_exofitico";

  if (pedicle === "ausente" && (intracavitary || exophytic)) {
    conflicts.push({
      code: "pediculo_ausente_com_relacao_pediculada",
      fields: ["pedicle", intracavitary ? "endometrium" : "serosa"],
      message: "Intracavitário (FIGO 0) e subseroso exofítico (FIGO 7) exigem pedículo; o pedículo foi dado como ausente.",
    });
  }
  if (intracavitary && exophytic) {
    conflicts.push({
      code: "pediculado_nao_forma_hibrido",
      fields: ["endometrium", "serosa"],
      message: "O mioma não pode ser ao mesmo tempo intracavitário e subseroso exofítico.",
    });
  } else if (intracavitary && touchesSerosa(serosa)) {
    conflicts.push({
      code: "pediculado_nao_forma_hibrido",
      fields: ["endometrium", "serosa"],
      message: "Mioma intracavitário pediculado (FIGO 0) não toca a serosa; FIGO 0 não forma híbrido.",
    });
  } else if (exophytic && touchesEndometrium(endometrium)) {
    conflicts.push({
      code: "pediculado_nao_forma_hibrido",
      fields: ["endometrium", "serosa"],
      message: "Mioma subseroso pediculado (FIGO 7) não toca o endométrio; FIGO 7 não forma híbrido.",
    });
  }
  if (endometrium === "submucoso_intramural_menor_50" && touchesSerosa(serosa)) {
    conflicts.push({
      code: "hibrida_anatomicamente_incompativel",
      fields: ["endometrium", "serosa"],
      message: "FIGO 1 tem menos de 50% do diâmetro no miométrio e não forma lesão transmural em contato com a serosa.",
    });
  }
  if (pedicle === "presente") {
    if (endometrium === "sem_contato" && serosa === "sem_contato") {
      conflicts.push({
        code: "pediculo_sem_ancoragem",
        fields: ["pedicle", "endometrium", "serosa"],
        message: "Pedículo presente sem contato com endométrio nem serosa: não há onde o pedículo se insira.",
      });
    }
    if (!intracavitary && !exophytic && (SESSILE_ENDOMETRIAL.includes(endometrium) || SESSILE_SEROSAL.includes(serosa))) {
      conflicts.push({
        code: "pediculo_com_relacao_sessil",
        fields: ["pedicle", SESSILE_ENDOMETRIAL.includes(endometrium) ? "endometrium" : "serosa"],
        message: "Pedículo presente com relação séssil (FIGO 1–3 ou 5–6); pediculado é FIGO 0 ou 7.",
      });
    }
  }
  if ((site === "ligamento_largo" || site === "parasitario") && touchesEndometrium(endometrium)) {
    conflicts.push({
      code: "sitio_atipico_com_contato_endometrial",
      fields: ["site", "endometrium"],
      message: "Mioma do ligamento largo ou parasitário não pode tocar o endométrio.",
    });
  }
  if (site === "cervical" && wall === "fundica") {
    conflicts.push({
      code: "parede_incompativel_com_sitio",
      fields: ["site", "wall"],
      message: "Mioma cervical não pode estar na parede fúndica.",
    });
  }
  return conflicts;
}

/** Categoria a partir das relações; pressupõe ausência de conflito interno. */
function deriveFromRelations(finding: MyomaFindingV2): Derivation {
  const { site, endometrium, serosa, pedicle } = finding;
  if (ATYPICAL_SITES.includes(site)) return { kind: "complete", figo: { kind: "simples", category: 8 } };

  const missing: MyomaFigoMissing[] = [];
  if (site === "nao_informado") missing.push("site");

  if (endometrium === "intracavitario" || serosa === "subseroso_exofitico") {
    if (pedicle === "nao_informado") missing.push("pedicle");
    if (missing.length) return { kind: "incomplete", missing };
    return { kind: "complete", figo: { kind: "simples", category: endometrium === "intracavitario" ? 0 : 7 } };
  }

  if (endometrium === "nao_informado") missing.push("endometrium");
  if (endometrium === "contato_grau_nao_informado") missing.push("endometrium_grade");
  if (serosa === "nao_informado") missing.push("serosa");
  if (serosa === "contato_grau_nao_informado") missing.push("serosa_grade");
  // Pedículo presente sem relação pediculada declarada: não presumir 0 nem 7.
  if (pedicle === "presente") missing.push("pedicle_insertion");
  if (missing.length) return { kind: "incomplete", missing: [...new Set(missing)] };

  const endometrial = ENDOMETRIAL_CATEGORY[endometrium] as 1 | 2 | 3 | undefined;
  const serosal = SEROSAL_CATEGORY[serosa] as 5 | 6 | undefined;
  if ((endometrial === 2 || endometrial === 3) && serosal !== undefined) {
    return { kind: "complete", figo: { kind: "hibrida", endometrial, serosal } };
  }
  return { kind: "complete", figo: { kind: "simples", category: endometrial ?? serosal ?? 4 } };
}

interface ExpectedProfile {
  atypicalSite: boolean;
  endometrium?: MyomaEndometrialRelation;
  serosa?: MyomaSerosalRelation;
  pedicle?: Exclude<MyomaPedicle, "nao_informado">;
}

function expectedProfile(figo: MyomaFigoV2): ExpectedProfile {
  if (figo.kind === "hibrida") {
    const endometrium = (Object.keys(ENDOMETRIAL_CATEGORY) as MyomaEndometrialRelation[]).find((key) => ENDOMETRIAL_CATEGORY[key] === figo.endometrial)!;
    const serosa = (Object.keys(SEROSAL_CATEGORY) as MyomaSerosalRelation[]).find((key) => SEROSAL_CATEGORY[key] === figo.serosal)!;
    return { atypicalSite: false, endometrium, serosa, pedicle: "ausente" };
  }
  const { category } = figo;
  if (category === 8) return { atypicalSite: true };
  const endometrium = (Object.keys(ENDOMETRIAL_CATEGORY) as MyomaEndometrialRelation[]).find((key) => ENDOMETRIAL_CATEGORY[key] === category) ?? "sem_contato";
  const serosa = (Object.keys(SEROSAL_CATEGORY) as MyomaSerosalRelation[]).find((key) => SEROSAL_CATEGORY[key] === category) ?? "sem_contato";
  return { atypicalSite: false, endometrium, serosa, pedicle: category === 0 || category === 7 ? "presente" : "ausente" };
}

/** Campos informados que contradizem a FIGO declarada. "Não informado" nunca contradiz. */
function declarationMismatches(finding: MyomaFindingV2, figo: MyomaFigoV2): MyomaFigoField[] {
  const expected = expectedProfile(figo);
  const fields: MyomaFigoField[] = [];
  if (finding.site !== "nao_informado" && ATYPICAL_SITES.includes(finding.site) !== expected.atypicalSite) fields.push("site");
  if (expected.atypicalSite) return fields; // FIGO 8 cervical pode ter qualquer relação local.
  const endometriumMatches = finding.endometrium === "nao_informado"
    || finding.endometrium === expected.endometrium
    || (finding.endometrium === "contato_grau_nao_informado" && expected.endometrium !== "sem_contato");
  if (!endometriumMatches) fields.push("endometrium");
  const serosaMatches = finding.serosa === "nao_informado"
    || finding.serosa === expected.serosa
    || (finding.serosa === "contato_grau_nao_informado" && expected.serosa !== "sem_contato");
  if (!serosaMatches) fields.push("serosa");
  if (finding.pedicle !== "nao_informado" && finding.pedicle !== expected.pedicle) fields.push("pedicle");
  return fields;
}

/**
 * Resolve a FIGO de um achado.
 * - conflito: relações contraditórias entre si ou com a FIGO declarada (bloqueia);
 * - resolvida: FIGO declarada compatível com tudo que foi informado, ou derivada
 *   quando as relações bastam;
 * - incompleta: sem declaração e relações insuficientes — nenhuma categoria.
 */
export function resolveMyomaFigoV2(finding: MyomaFindingV2): MyomaFigoResolution {
  const conflicts = relationConflicts(finding);
  const declared = finding.declaredFigo;
  if (declared) {
    const fields = declarationMismatches(finding, declared);
    if (fields.length) {
      conflicts.push({
        code: "declarada_diverge_das_relacoes",
        fields: ["declaredFigo", ...fields],
        message: `${formatMyomaFigoV2(declared)} declarada contradiz: ${fields.join(", ")}.`,
      });
    }
  }
  if (conflicts.length) return { status: "conflito", figo: null, conflicts };

  const derived = deriveFromRelations(finding);
  if (declared) {
    if (derived.kind === "incomplete") return { status: "resolvida", figo: declared, source: "declarada" };
    // Sem divergência campo a campo a derivação coincide; a checagem é defensiva.
    if (sameMyomaFigoV2(declared, derived.figo)) return { status: "resolvida", figo: declared, source: "declarada_e_derivada" };
    return {
      status: "conflito",
      figo: null,
      conflicts: [{
        code: "declarada_diverge_das_relacoes",
        fields: ["declaredFigo"],
        message: `${formatMyomaFigoV2(declared)} declarada, mas as relações derivam ${formatMyomaFigoV2(derived.figo)}.`,
      }],
    };
  }
  if (derived.kind === "complete") return { status: "resolvida", figo: derived.figo, source: "derivada" };
  return { status: "incompleta", figo: null, missing: derived.missing };
}

// ---------------------------------------------------------------------------
// Medidas e volume
// ---------------------------------------------------------------------------

export function myomaDimensionsMm(dimensions: MyomaDimensionsV2): [number, number, number] {
  const factor = dimensions.unit === "cm" ? 10 : 1;
  const [a, b, c] = dimensions.values;
  return [a * factor, b * factor, c * factor];
}

/** Maior eixo em mm — equivalente ao `sizeMaxMm` do v1. */
export function myomaMaxAxisMm(dimensions: MyomaDimensionsV2 | null): number | null {
  return dimensions ? Math.max(...myomaDimensionsMm(dimensions)) : null;
}

/** Volume do elipsoide (π/6 × a × b × c) em cm³. Uso interno; exibição é opt-in. */
export function myomaEllipsoidVolumeCm3(dimensions: MyomaDimensionsV2 | null): number | null {
  if (!dimensions) return null;
  const [a, b, c] = myomaDimensionsMm(dimensions).map((mm) => mm / 10) as [number, number, number];
  return (Math.PI / 6) * a * b * c;
}

// ---------------------------------------------------------------------------
// Envelope do contrato
// ---------------------------------------------------------------------------

export const MYOMA_SCHEME_V2_CONTRACT_VERSION = "myoma-scheme/v2" as const;

export const MyomaSchemeV2DisplaySchema = z.object({
  showVolume: z.boolean().default(false),
}).strict();
export type MyomaSchemeV2Display = z.infer<typeof MyomaSchemeV2DisplaySchema>;

/**
 * Conflito bloqueia o contrato. Achado incompleto é aceito (fica sem
 * categoria), mas impede o envio — ver `canSendMyomaSchemeV2`.
 */
export const MyomaSchemeV2ContractSchema = z.object({
  contractVersion: z.literal(MYOMA_SCHEME_V2_CONTRACT_VERSION),
  examType: z.literal("MIOMAS"),
  display: MyomaSchemeV2DisplaySchema.default({ showVolume: false }),
  findings: z.array(MyomaFindingV2Schema).min(1).max(20),
}).strict().superRefine((value, context) => {
  if (new Set(value.findings.map((finding) => finding.id)).size !== value.findings.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["findings"], message: "Identificadores de miomas devem ser únicos." });
  }
  value.findings.forEach((finding, index) => {
    const resolution = resolveMyomaFigoV2(finding);
    if (resolution.status !== "conflito") return;
    for (const conflict of resolution.conflicts) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["findings", index, conflict.fields[0]!], message: conflict.message });
    }
  });
});
export type MyomaSchemeV2Contract = z.infer<typeof MyomaSchemeV2ContractSchema>;

export function createMyomaSchemeV2Contract(findings: unknown, display?: Partial<MyomaSchemeV2Display>): MyomaSchemeV2Contract | null {
  const parsed = MyomaSchemeV2ContractSchema.safeParse({
    contractVersion: MYOMA_SCHEME_V2_CONTRACT_VERSION,
    examType: "MIOMAS",
    display,
    findings,
  });
  return parsed.success ? parsed.data : null;
}

/** Devolve o contrato normalizado apenas quando todo achado tem FIGO resolvida. */
export function parseSendableMyomaSchemeV2(value: unknown): MyomaSchemeV2Contract | null {
  const parsed = MyomaSchemeV2ContractSchema.safeParse(value);
  if (!parsed.success || !parsed.data.findings.every((finding) => resolveMyomaFigoV2(finding).status === "resolvida")) return null;
  return parsed.data;
}

/** Pronto para envio, sem prometer que defaults foram gravados no objeto original. */
export function canSendMyomaSchemeV2(value: unknown): boolean {
  return parseSendableMyomaSchemeV2(value) !== null;
}

/** Volume formatado só quando o contrato pediu (`display.showVolume`). */
export function myomaVolumeLabelV2(contract: MyomaSchemeV2Contract, finding: MyomaFindingV2): string | null {
  if (!contract.display.showVolume) return null;
  const volume = myomaEllipsoidVolumeCm3(finding.dimensions);
  if (volume === null) return null;
  return `${volume.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} cm³`;
}
