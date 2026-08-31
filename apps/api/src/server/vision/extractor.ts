/**
 * Parsing, validação e merge de respostas da Vision API.
 * Port 1:1 do laudousg/lib/vision/extractor.ts.
 */

import type { BiometricData, BreastFinding, Category, ThyroidMeasurements, ThyroidNodule } from "./types";

const THYROID_VALUES = {
  lobe: new Set(["lobo_direito", "lobo_esquerdo", "istmo"]),
  echogenicity: new Set(["anecoica_homogenea", "anecoica_finos_ecos", "anecoica_septos", "anecoica_componentes_solidos", "solida_areas_anecoicas", "solida_calcificacao_parede", "hiperecoica", "isoecoica", "hipoecoica"]),
  margin: new Set(["regular", "irregular", "espiculada"]),
  halo: new Set(["fino_regular", "espesso_irregular", "sem_halo"]),
  shape: new Set(["mais_larga_que_alta", "mais_alta_que_larga"]),
  calcifications: new Set(["sem", "casca_ovo", "grosseiras", "micro"]),
  vascularization: new Set(["sem", "periferica", "periferica_maior_central", "central_maior_periferica", "exclusiva_central"]),
} as const;

const BREAST_VALUES = {
  side: new Set(["direita", "esquerda"]),
  type: new Set(["cisto_simples", "multiplos_cistos", "nodulo", "calcificacoes"]),
  echogenicity: new Set(["hipoecoico", "isoecoico", "anecoico", "hiperecoico"]),
  shape: new Set(["oval", "redonda", "irregular"]),
  margin: new Set(["circunscrita", "indistinta", "angular", "microlobulada", "espiculada"]),
  orientation: new Set(["paralela", "nao_paralela"]),
  posterior: new Set(["nenhuma", "reforco", "sombra"]),
  calcifications: new Set(["grosseiras", "microcalcificacoes", "em_nodulo", "intraductais", "fora_nodulo", "microcalc"]),
} as const;

function thyroidValue(value: unknown, allowed: ReadonlySet<string>): string | undefined {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return allowed.has(normalized) ? normalized : undefined;
}

function positiveCm(value: unknown): string | undefined {
  const raw = typeof value === "string" || typeof value === "number" ? String(value).trim().toLowerCase() : "";
  const match = raw.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  let number = Number.parseFloat(match[0]);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  if (raw.includes("mm")) number /= 10;
  if (!raw.includes("mm") && !raw.includes("cm") && typeof value !== "number") {
    // O prompt devolve números unitless já convertidos para cm.
    number = Number.parseFloat(match[0]);
  }
  if (number > 20) return undefined;
  return Number(number.toFixed(2)).toString();
}

function thyroidMeasurements(value: unknown): ThyroidMeasurements | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const result = { a: positiveCm(row.a), b: positiveCm(row.b), c: positiveCm(row.c) };
  return Object.values(result).some(Boolean) ? result : undefined;
}

function thyroidNodules(value: unknown): ThyroidNodule[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.flatMap((entry): ThyroidNodule[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const lobe = thyroidValue(row.lobe, THYROID_VALUES.lobe);
    if (!lobe) return [];
    const nodule: ThyroidNodule = {
      lobe: lobe as ThyroidNodule["lobe"],
      c1: positiveCm(row.c1), c2: positiveCm(row.c2), c3: positiveCm(row.c3),
      location: typeof row.location === "string" ? row.location.trim().slice(0, 120) || undefined : undefined,
      echogenicity: thyroidValue(row.echogenicity, THYROID_VALUES.echogenicity),
      margin: thyroidValue(row.margin, THYROID_VALUES.margin),
      halo: thyroidValue(row.halo, THYROID_VALUES.halo),
      shape: thyroidValue(row.shape, THYROID_VALUES.shape),
      calcifications: thyroidValue(row.calcifications, THYROID_VALUES.calcifications),
      vascularization: thyroidValue(row.vascularization, THYROID_VALUES.vascularization),
    };
    return nodule.c1 || nodule.c2 || nodule.c3 ? [nodule] : [];
  });
  return result.length ? result.slice(0, 12) : undefined;
}

function breastFindings(value: unknown): BreastFinding[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.flatMap((entry): BreastFinding[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    const side = thyroidValue(row.side, BREAST_VALUES.side);
    const type = thyroidValue(row.type, BREAST_VALUES.type);
    if (!side || !type) return [];
    const finding: BreastFinding = {
      side: side as BreastFinding["side"],
      type: type as BreastFinding["type"],
      c1: positiveCm(row.c1), c2: positiveCm(row.c2), c3: positiveCm(row.c3),
      location: typeof row.location === "string" ? row.location.trim().slice(0, 120) || undefined : undefined,
      hour: typeof row.hour === "string" ? row.hour.trim().slice(0, 30) || undefined : undefined,
      distanceSkin: positiveCm(row.distanceSkin),
      distanceNipple: positiveCm(row.distanceNipple),
      echogenicity: thyroidValue(row.echogenicity, BREAST_VALUES.echogenicity),
      shape: thyroidValue(row.shape, BREAST_VALUES.shape),
      margin: thyroidValue(row.margin, BREAST_VALUES.margin),
      orientation: thyroidValue(row.orientation, BREAST_VALUES.orientation),
      posterior: thyroidValue(row.posterior, BREAST_VALUES.posterior),
      calcifications: thyroidValue(row.calcifications, BREAST_VALUES.calcifications),
    };
    return finding.c1 || finding.c2 || finding.c3 || finding.type === "calcificacoes" ? [finding] : [];
  });
  return result.length ? result.slice(0, 20) : undefined;
}

/** Campos IR/IP Doppler — usados no merge inteligente do módulo especializado. */
type DopplerIndexField =
  | "irRightUterine" | "ipRightUterine" | "irLeftUterine" | "ipLeftUterine"
  | "irUmbilical" | "ipUmbilical" | "irMCA" | "ipMCA"
  | "irDuctusVenosus" | "ipDuctusVenosus";

export const DOPPLER_INDEX_FIELDS: DopplerIndexField[] = [
  "irRightUterine",
  "ipRightUterine",
  "irLeftUterine",
  "ipLeftUterine",
  "irUmbilical",
  "ipUmbilical",
  "irMCA",
  "ipMCA",
  "irDuctusVenosus",
  "ipDuctusVenosus",
];

/**
 * Valida IR/IP sem tentar classificar normalidade. O intervalo é apenas uma
 * barreira contra datas, horários e velocidades confundidos com índices.
 */
function validateIndex(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const n = parseFloat(ip);
  return !isNaN(n) && n >= 0.2 && n <= 3 ? ip : undefined;
}

/**
 * Parses Vision API response and extracts JSON data.
 * @throws Error se JSON não puder ser extraído/validado.
 */
export function parseVisionResponse(
  content: string,
  category: Category,
): BiometricData {
  try {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
    }
    return validateBiometricData(parsed, category);
  } catch (error) {
    console.error("[vision/extractor] parse failed:", error);
    throw new Error("Não foi possível extrair dados da imagem");
  }
}

/**
 * Valida e sanitiza dados biométricos com validação por categoria.
 */
export function validateBiometricData(
  data: Record<string, unknown>,
  category: Category,
): BiometricData {
  const s = (v: unknown) =>
    v !== undefined && v !== null && String(v).trim() !== ""
      ? String(v)
      : undefined;

  const result: BiometricData = {};

  // Standard fields — all obstetric categories
  result.dbp = s(data.dbp);
  result.cc = s(data.cc);
  result.ca = s(data.ca);
  result.cf = s(data.cf);
  result.weight = s(data.weight);
  result.weightVariation = s(data.weightVariation);
  // Normalizar símbolo de variação: "+/-" e variantes → "±"
  if (result.weightVariation) {
    result.weightVariation = result.weightVariation
      .replace(/\+\s*\/\s*-/g, "±")
      .replace(/\+\s*\/\s*−/g, "±")
      .replace(/\+-/g, "±");
  }
  result.percentile = s(data.percentile);
  result.gestAge = s(data.gestAge);
  result.gestAgeLMP = s(data.gestAgeLMP);
  result.gestAgeBiometry = s(data.gestAgeBiometry);

  // Doppler-specific fields. O parser especializado usa esta categoria mesmo
  // quando o exame-base é Obstétrica ou Morfológico.
  if (category === "DOPPLER_OBSTETRICO") {
    result.irRightUterine = validateIndex(s(data.irRightUterine));
    result.ipRightUterine = validateIndex(s(data.ipRightUterine));
    result.irLeftUterine = validateIndex(s(data.irLeftUterine));
    result.ipLeftUterine = validateIndex(s(data.ipLeftUterine));
    result.irUmbilical = validateIndex(s(data.irUmbilical));
    result.ipUmbilical = validateIndex(s(data.ipUmbilical));
    result.irMCA = validateIndex(s(data.irMCA));
    result.ipMCA = validateIndex(s(data.ipMCA));
    result.irDuctusVenosus = validateIndex(s(data.irDuctusVenosus));
    result.ipDuctusVenosus = validateIndex(s(data.ipDuctusVenosus));
  }

  // Morfológico 2T complementary fields
  if (category === "MORFOLOGICO") {
    result.tibia = s(data.tibia);
    result.fibula = s(data.fibula);
    result.humerus = s(data.humerus);
    result.radius = s(data.radius);
    result.ulna = s(data.ulna);
    result.cerebellum = s(data.cerebellum);
    result.cisternaMagna = s(data.cisternaMagna);
    result.binocularDistance = s(data.binocularDistance);
    result.ila = s(data.ila);
    result.gender = s(data.gender);
  }

  if (category === "TIREOIDE") {
    result.thyroidRightLobe = thyroidMeasurements(data.thyroidRightLobe);
    result.thyroidLeftLobe = thyroidMeasurements(data.thyroidLeftLobe);
    result.thyroidIsthmus = thyroidMeasurements(data.thyroidIsthmus);
    result.thyroidNodules = thyroidNodules(data.thyroidNodules);
  }

  if (category === "MAMARIA") result.breastFindings = breastFindings(data.breastFindings);

  // Remove undefined keys
  for (const key of Object.keys(result) as (keyof BiometricData)[]) {
    if (result[key] === undefined) delete result[key];
  }

  return result;
}

/**
 * Merge de múltiplos BiometricData.
 *
 * Modo padrão: first-wins.
 *
 * Modo dopplerAware (DOPPLER_OBSTETRICO): campos IP vêm EXCLUSIVAMENTE do
 * resultado com mais campos IP preenchidos; biometria continua first-wins.
 * Evita que o modelo de biometria alucine sobre os IPs corretos extraídos
 * pelo modelo Doppler especializado.
 */
export function mergeBiometricData(
  dataArray: BiometricData[],
  options?: { dopplerAware?: boolean },
): BiometricData {
  if (!options?.dopplerAware) {
    const merged: BiometricData = {};
    for (const data of dataArray) {
      for (const [key, value] of Object.entries(data)) {
        if (key === "thyroidNodules" && Array.isArray(value)) {
          const existing = merged.thyroidNodules ?? [];
          const seen = new Set(existing.map((n) => `${n.lobe}|${n.c1}|${n.c2}|${n.c3}|${n.location ?? ""}`));
          for (const nodule of value) {
            const id = `${nodule.lobe}|${nodule.c1}|${nodule.c2}|${nodule.c3}|${nodule.location ?? ""}`;
            if (!seen.has(id)) { existing.push(nodule); seen.add(id); }
          }
          merged.thyroidNodules = existing;
          continue;
        }
        if (key === "breastFindings" && Array.isArray(value)) {
          const existing = merged.breastFindings ?? [];
          const seen = new Set(existing.map((f) => `${f.side}|${f.type}|${f.c1}|${f.c2}|${f.c3}|${f.location ?? ""}|${f.hour ?? ""}`));
          for (const finding of value) {
            const id = `${finding.side}|${finding.type}|${finding.c1}|${finding.c2}|${finding.c3}|${finding.location ?? ""}|${finding.hour ?? ""}`;
            if (!seen.has(id)) { existing.push(finding); seen.add(id); }
          }
          merged.breastFindings = existing;
          continue;
        }
        if (value && !merged[key as keyof BiometricData]) {
          (merged as unknown as Record<string, unknown>)[key] = value;
        }
      }
    }
    return merged;
  }

  const scores = dataArray.map(
    (d) => DOPPLER_INDEX_FIELDS.filter((f) => d[f] !== undefined).length,
  );
  const maxScore = Math.max(...scores);
  const dopplerWinner = maxScore > 0 ? dataArray[scores.indexOf(maxScore)] : undefined;

  const merged: BiometricData = {};

  // 1. Biometria: first-wins excluindo campos IP
  for (const data of dataArray) {
    for (const [key, value] of Object.entries(data)) {
      const k = key as keyof BiometricData;
      if (!DOPPLER_INDEX_FIELDS.includes(k as DopplerIndexField) && value && !merged[k]) {
        merged[k] = value;
      }
    }
  }

  // 2. IP: somente do vencedor Doppler
  if (dopplerWinner) {
    for (const field of DOPPLER_INDEX_FIELDS) {
      if (dopplerWinner[field]) {
        merged[field] = dopplerWinner[field];
      }
    }
  }

  return merged;
}
