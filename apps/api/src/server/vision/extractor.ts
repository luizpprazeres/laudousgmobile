/**
 * Parsing, validação e merge de respostas da Vision API.
 * Port 1:1 do laudousg/lib/vision/extractor.ts.
 */

import type { BiometricData, Category } from "./types";

/** Campos IR/IP Doppler — usados no merge inteligente do módulo especializado. */
export const DOPPLER_INDEX_FIELDS: (keyof BiometricData)[] = [
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
        if (value && !merged[key as keyof BiometricData]) {
          merged[key as keyof BiometricData] = value;
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
      if (!DOPPLER_INDEX_FIELDS.includes(k) && value && !merged[k]) {
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
