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
  "TIREOIDE",
  "MAMARIA",
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
  thyroidRightLobe?: ThyroidMeasurements;
  thyroidLeftLobe?: ThyroidMeasurements;
  thyroidIsthmus?: ThyroidMeasurements;
  thyroidNodules?: ThyroidNodule[];
  breastFindings?: BreastFinding[];
};

export type ThyroidMeasurements = { a?: string; b?: string; c?: string };
export type ThyroidNodule = {
  lobe: "lobo_direito" | "lobo_esquerdo" | "istmo";
  c1?: string; c2?: string; c3?: string; location?: string;
  echogenicity?: string; margin?: string; halo?: string; shape?: string;
  calcifications?: string; vascularization?: string;
};
export type BreastFinding = {
  side: "direita" | "esquerda";
  type: "cisto_simples" | "multiplos_cistos" | "nodulo" | "calcificacoes";
  c1?: string; c2?: string; c3?: string; location?: string; hour?: string;
  distanceSkin?: string; distanceNipple?: string; echogenicity?: string;
  shape?: string; margin?: string; orientation?: string; posterior?: string;
  calcifications?: string;
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

export function mergeBiometric(results: BiometricData[]): BiometricData {
  return results.reduce<BiometricData>((partial, next) => {
    const out: BiometricData = { ...partial };
    (Object.keys(next) as (keyof BiometricData)[]).forEach((k) => {
      if (k === "thyroidNodules" && next.thyroidNodules) {
        const existing = out.thyroidNodules ?? [];
        const seen = new Set(existing.map((n) => `${n.lobe}|${n.c1}|${n.c2}|${n.c3}|${n.location ?? ""}`));
        for (const nodule of next.thyroidNodules) {
          const id = `${nodule.lobe}|${nodule.c1}|${nodule.c2}|${nodule.c3}|${nodule.location ?? ""}`;
          if (!seen.has(id)) { existing.push(nodule); seen.add(id); }
        }
        out.thyroidNodules = existing;
        return;
      }
      if (k === "breastFindings" && next.breastFindings) {
        const existing = out.breastFindings ?? [];
        const seen = new Set(existing.map((f) => `${f.side}|${f.type}|${f.c1}|${f.c2}|${f.c3}|${f.location ?? ""}|${f.hour ?? ""}`));
        for (const finding of next.breastFindings) {
          const id = `${finding.side}|${finding.type}|${finding.c1}|${finding.c2}|${finding.c3}|${finding.location ?? ""}|${finding.hour ?? ""}`;
          if (!seen.has(id)) { existing.push(finding); seen.add(id); }
        }
        out.breastFindings = existing;
        return;
      }
      if (out[k] === undefined && next[k] !== undefined) {
        (out as unknown as Record<string, unknown>)[k] = next[k];
      }
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
  const m = mergeBiometric(results);
  const sections: string[] = [];

  if (category === "TIREOIDE") {
    const thyroidRows = rows([
      ["Lobo direito", formatDimensions(m.thyroidRightLobe)],
      ["Lobo esquerdo", formatDimensions(m.thyroidLeftLobe)],
      ["Istmo", formatDimensions(m.thyroidIsthmus)],
    ]);
    if (thyroidRows.length) sections.push("Medidas da tireoide:\n" + thyroidRows.join("\n"));
    const nodules = (m.thyroidNodules ?? []).map((n, index) => {
      const dimensions = [n.c1, n.c2, n.c3].filter(Boolean).join(" x ");
      const details = [dimensions ? `${dimensions} cm` : "", n.location ?? ""].filter(Boolean).join(" · ");
      return `Nódulo ${index + 1} (${thyroidLobeLabel(n.lobe)}): ${details}`;
    });
    if (nodules.length) sections.push("Nódulos:\n" + nodules.join("\n"));
    return sections.join("\n\n");
  }

  if (category === "MAMARIA") {
    return (m.breastFindings ?? []).map((finding, index) => {
      const dimensions = [finding.c1, finding.c2, finding.c3].filter(Boolean).join(" x ");
      const details = [dimensions ? `${dimensions} cm` : "", finding.location ?? "", finding.hour ?? ""].filter(Boolean).join(" · ");
      const type = finding.type === "nodulo" ? "Nódulo" : finding.type === "cisto_simples" ? "Cisto simples" : finding.type === "multiplos_cistos" ? "Cistos múltiplos" : "Calcificações";
      return `${index + 1}. ${type} — mama ${finding.side}${details ? `: ${details}` : ""}`;
    }).join("\n");
  }

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
  if (category !== "DOPPLER_OBSTETRICO" && biometria.length > 0) {
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

function formatDimensions(value?: ThyroidMeasurements): string | undefined {
  const dimensions = value ? [value.a, value.b, value.c].filter(Boolean) : [];
  return dimensions.length ? `${dimensions.join(" x ")} cm` : undefined;
}

function thyroidLobeLabel(value: ThyroidNodule["lobe"]): string {
  if (value === "lobo_direito") return "lobo direito";
  if (value === "lobo_esquerdo") return "lobo esquerdo";
  return "istmo";
}
