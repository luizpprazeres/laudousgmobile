import { getAccessToken } from "@/lib/api";

/**
 * Análise de imagem de USG (biometria obstétrica) — espelho fiel do
 * ImageAnalysisService do iOS: 1 request por imagem (até 3), merge dos
 * resultados no cliente (primeiro valor não-nulo vence) e formatação em
 * seções PT idênticas às do Swift. Backend: POST /api/analyze-image
 * (modo single: { imageBase64, category, gemelar }).
 */

export const SUPPORTED_IMAGING_CATEGORIES = [
  "OBSTETRICA",
  "DOPPLER_OBSTETRICO",
  "MORFOLOGICO",
] as const;

export type ImagingCategory = (typeof SUPPORTED_IMAGING_CATEGORIES)[number];

export function canAnalyzeCategory(catId: string): catId is ImagingCategory {
  return (SUPPORTED_IMAGING_CATEGORIES as readonly string[]).includes(catId);
}

export type BiometricData = {
  dbp?: string;
  cc?: string;
  ca?: string;
  cf?: string;
  weight?: string;
  weightVariation?: string;
  percentile?: string;
  gestAge?: string;
  gestAgeLMP?: string;
  gestAgeBiometry?: string;
  irRightUterine?: string;
  ipRightUterine?: string;
  irLeftUterine?: string;
  ipLeftUterine?: string;
  irUmbilical?: string;
  ipUmbilical?: string;
  irMCA?: string;
  ipMCA?: string;
  irDuctusVenosus?: string;
  ipDuctusVenosus?: string;
  tibia?: string;
  fibula?: string;
  humerus?: string;
  radius?: string;
  ulna?: string;
  cerebellum?: string;
  cisternaMagna?: string;
  binocularDistance?: string;
  ila?: string;
  gender?: string;
};

type AnalyzeResponse = {
  success: boolean;
  data?: BiometricData;
  model?: string;
  empty?: boolean;
  message?: string;
  error?: string;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function analyzeOne(
  imageBase64: string,
  category: ImagingCategory,
  includeDoppler: boolean,
): Promise<BiometricData | null> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}/api/analyze-image`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageBase64,
      category,
      gemelar: false,
      modules:
        includeDoppler && category !== "DOPPLER_OBSTETRICO"
          ? ["DOPPLER_OBSTETRICO"]
          : [],
    }),
  });
  let payload: AnalyzeResponse;
  try {
    payload = (await res.json()) as AnalyzeResponse;
  } catch {
    throw new Error(`Falha ao analisar imagem (HTTP ${res.status}).`);
  }
  if (!res.ok || !payload.success) {
    throw new Error(payload.error || `Falha ao analisar imagem (HTTP ${res.status}).`);
  }
  if (payload.empty || !payload.data) return null;
  return payload.data;
}

/** Analisa até 3 imagens em sequência (como o iOS). Retorna os dados válidos. */
export async function analyzeImages(
  imagesBase64: string[],
  category: ImagingCategory,
  onProgress?: (done: number, total: number) => void,
  options?: { includeDoppler?: boolean },
): Promise<BiometricData[]> {
  const batch = imagesBase64.slice(0, 3);
  const results: BiometricData[] = [];
  for (let i = 0; i < batch.length; i++) {
    const data = await analyzeOne(
      batch[i],
      category,
      category === "DOPPLER_OBSTETRICO" || options?.includeDoppler === true,
    );
    if (data) results.push(data);
    onProgress?.(i + 1, batch.length);
  }
  return results;
}

function merge(results: BiometricData[]): BiometricData {
  return results.reduce<BiometricData>((partial, next) => {
    const out: BiometricData = { ...partial };
    (Object.keys(next) as (keyof BiometricData)[]).forEach((k) => {
      if (out[k] === undefined && next[k] !== undefined) out[k] = next[k];
    });
    return out;
  }, {});
}

function rows(pairs: Array<[string, string | undefined]>): string[] {
  return pairs
    .filter(([, v]) => v !== undefined && v.trim() !== "")
    .map(([label, v]) => `${label}: ${v}`);
}

/** Formata as seções em PT — labels idênticos ao ImageAnalysisService.format do iOS. */
export function formatBiometric(
  results: BiometricData[],
  category: ImagingCategory,
): string {
  const m = merge(results);
  const sections: string[] = [];

  const biometria = rows([
    ["DBP", m.dbp],
    ["CC", m.cc],
    ["CA", m.ca],
    ["CF", m.cf],
    ["Peso fetal estimado", m.weight],
    ["Variação do peso", m.weightVariation],
    ["Percentil", m.percentile],
    ["IG", m.gestAge],
    ["IG pela DUM", m.gestAgeLMP],
    ["IG pela biometria", m.gestAgeBiometry],
  ]);
  if (biometria.length > 0) {
    sections.push("Biometria fetal:\n" + biometria.join("\n"));
  }

  const doppler = rows([
    ["IR uterina direita", m.irRightUterine],
    ["IP uterina direita", m.ipRightUterine],
    ["IR uterina esquerda", m.irLeftUterine],
    ["IP uterina esquerda", m.ipLeftUterine],
    ["IR artéria umbilical", m.irUmbilical],
    ["IP artéria umbilical", m.ipUmbilical],
    ["IR artéria cerebral média", m.irMCA],
    ["IP artéria cerebral média", m.ipMCA],
    ["IR ducto venoso", m.irDuctusVenosus],
    ["IP ducto venoso", m.ipDuctusVenosus],
  ]);
  if (doppler.length > 0) {
    sections.push("Doppler obstétrico:\n" + doppler.join("\n"));
  }

  const morfologico = rows([
    ["Tíbia", m.tibia],
    ["Fíbula", m.fibula],
    ["Úmero", m.humerus],
    ["Rádio", m.radius],
    ["Ulna", m.ulna],
    ["Cerebelo", m.cerebellum],
    ["Cisterna magna", m.cisternaMagna],
    ["Distância binocular", m.binocularDistance],
    ["ILA", m.ila],
    ["Sexo fetal", m.gender],
  ]);
  if (
    (category === "MORFOLOGICO" || morfologico.length > 0) &&
    morfologico.length > 0
  ) {
    sections.push("Medidas morfológicas:\n" + morfologico.join("\n"));
  }

  return sections.join("\n\n");
}
