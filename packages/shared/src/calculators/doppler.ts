/**
 * Doppler Obstétrico — port literal do LaudoUSG original (lib/dopplerCalculator.ts).
 *
 * Implementa as fórmulas exatas da Fetal Medicine Barcelona
 * (fetalmedicinebarcelona.org). Coeficientes extraídos do calc.js oficial.
 *
 * Calcula z-score e percentil pra 5 parâmetros:
 *   - Artéria Umbilical (UA): patológico se z > 1.645 (>p95)
 *   - Artéria Cerebral Média (ACM): patológico se z < -1.645 (<p5)
 *   - Artérias Uterinas (média bilateral, log-normal): patológico se z > 1.645
 *   - Ratio Cerebroplacentário (RCP = ACM/UA): patológico se z < -1.645
 *   - Ducto venoso: patológico se z > 1.645
 *
 * Lógica pura, client-side. Sem deps.
 */

export interface DopplerInput {
  weeks: number;
  days: number;
  ipUmbilical: number;
  ipMCA: number;
  ipUterinaDireita: number;
  ipUterinaEsquerda: number;
}

export interface VesselResult {
  ip: number;
  zscore: number;
  percentile: number;
  /** Rótulo literal da calculadora Barcelona (inclui <1 e >99). */
  percentileLabel: string;
  pathological: boolean;
}

export interface DopplerResult {
  arteriaUmbilical: VesselResult;
  arteriaCerebralMedia: VesselResult;
  arteriasUterinas: VesselResult & { ipMedio: number };
  ratioCerebroplacentario: VesselResult;
}

export interface DopplerPartialInput {
  weeks: number;
  days: number;
  ipUmbilical?: number;
  ipMCA?: number;
  ipUterinaDireita?: number;
  ipUterinaEsquerda?: number;
  ipMedioUterinas?: number;
  ipDuctoVenoso?: number;
}

export interface DopplerPartialResult {
  arteriaUmbilical?: VesselResult;
  arteriaCerebralMedia?: VesselResult;
  arteriasUterinas?: VesselResult & { ipMedio: number };
  ratioCerebroplacentario?: VesselResult;
  ductoVenoso?: VesselResult;
}

export const DOPPLER_BARCELONA_ENGINE_VERSION = "FMB-CALCULATOR-V2021";
export const DOPPLER_BARCELONA_REFERENCE =
  "Percentis calculados com as equações da Calculadora v2021 disponibilizada pela Fetal Medicine Barcelona.";

/**
 * Limites literais do `calc.js` da Calculadora Barcelona v2021. Não usamos a
 * tabela normal interpolada aqui: ela arredondava z=1,646 para p95, embora o
 * próprio Barcelona o classifique como p96 e patológico.
 */
const BARCELONA_PERCENTILE_LOWER_BOUNDS: ReadonlyArray<readonly [number, number]> = [
  [2.6, 100], [2.18, 99], [1.97, 98], [1.81, 97],
  [1.6, 95], [1.52, 94], [1.45, 93], [1.38, 92], [1.31, 91], [1.26, 90],
  [1.2, 89], [1.17, 88], [1.1, 87], [1.07, 86], [1.02, 85], [0.98, 84],
  [0.94, 83], [0.9, 82], [0.86, 81], [0.84, 80], [0.79, 79], [0.76, 78],
  [0.72, 77], [0.69, 76], [0.67, 75], [0.63, 74], [0.61, 73], [0.57, 72],
  [0.54, 71], [0.51, 70], [0.48, 69], [0.46, 68], [0.43, 67], [0.4, 66],
  [0.37, 65], [0.34, 64], [0.32, 63], [0.3, 62], [0.27, 61], [0.24, 60],
  [0.22, 59], [0.19, 58], [0.17, 57], [0.14, 56], [0.12, 55], [0.09, 54],
  [0.07, 53], [0.05, 52], [0.03, 51], [-0.01, 50], [-0.035, 49],
  [-0.06, 48], [-0.08, 47], [-0.11, 46], [-0.13, 45], [-0.16, 44],
  [-0.185, 43], [-0.21, 42], [-0.24, 41], [-0.26, 40], [-0.28, 39],
  [-0.31, 38], [-0.34, 37], [-0.36, 36], [-0.4, 35], [-0.43, 34],
  [-0.45, 33], [-0.48, 32], [-0.5, 31], [-0.54, 30], [-0.565, 29],
  [-0.585, 28], [-0.62, 27], [-0.65, 26], [-0.69, 25], [-0.73, 24],
  [-0.75, 23], [-0.79, 22], [-0.83, 21], [-0.85, 20], [-0.89, 19],
  [-0.93, 18], [-0.97, 17], [-1.01, 16], [-1.04, 15], [-1.1, 14],
  [-1.14, 13], [-1.2, 12], [-1.25, 11], [-1.31, 10], [-1.37, 9],
  [-1.43, 8], [-1.51, 7], [-1.6, 6], [-1.645, 5], [-1.81, 4],
  [-1.97, 3], [-2.18, 2], [-2.6, 1],
];

export function zToBarcelonaDopplerPercentile(z: number): { value: number; label: string } {
  if (z > 1.645 && z < 1.81) return { value: 96, label: "96" };
  for (const [lowerBound, percentile] of BARCELONA_PERCENTILE_LOWER_BOUNDS) {
    if (z >= lowerBound) {
      return {
        value: percentile,
        label: percentile === 100 ? ">99" : String(percentile),
      };
    }
  }
  return { value: 0, label: "<1" };
}

function vesselResult(ip: number, zscore: number, pathological: boolean): VesselResult {
  const percentile = zToBarcelonaDopplerPercentile(zscore);
  return {
    ip,
    zscore,
    percentile: percentile.value,
    percentileLabel: percentile.label,
    pathological,
  };
}

function calcArteriaUmbilical(ga: number, ip: number): VesselResult {
  const mean = 3.55219 - 0.13558 * ga + 0.00174 * ga * ga;
  const sd = 0.299;
  const zscore = (ip - mean) / sd;
  return vesselResult(ip, zscore, zscore > 1.645);
}

function calcArteriaCerebralMedia(ga: number, ip: number): VesselResult {
  const mean = -2.7317 + 0.3335 * ga - 0.0058 * ga * ga;
  const sd = -0.88005 + 0.08182 * ga - 0.00133 * ga * ga;
  const zscore = (ip - mean) / sd;
  return vesselResult(ip, zscore, zscore < -1.645);
}

function calcArteriasUterinas(
  weeks: number,
  days: number,
  ipMedio: number,
): VesselResult & { ipMedio: number } {
  const totalDays = weeks * 7 + days;
  const logMedio = Math.log(ipMedio);
  const meanLog = 1.39 - 0.012 * totalDays + 1.98e-5 * totalDays * totalDays;
  const sdLog = 0.272 - 0.000259 * totalDays;
  const zscore = (logMedio - meanLog) / sdLog;
  const base = vesselResult(ipMedio, zscore, zscore > 1.645);
  return {
    ...base,
    ipMedio,
  };
}

function calcRatioCerebroplacentario(
  ga: number,
  ipMCA: number,
  ipUA: number,
): VesselResult {
  const ratio = ipMCA / ipUA;
  const mean = -4.0636 + 0.383 * ga - 0.0059 * ga * ga;
  const sd = -0.9664 + 0.09027 * ga - 0.0014 * ga * ga;
  const zscore = (ratio - mean) / sd;
  return vesselResult(ratio, zscore, zscore < -1.645);
}

function calcDuctoVenoso(ga: number, ip: number): VesselResult {
  const mean = 0.903 - 0.0116 * ga;
  const sd = 0.1483;
  const zscore = (ip - mean) / sd;
  return vesselResult(ip, zscore, zscore > 1.645);
}

/**
 * Calcula cada vaso de forma independente, respeitando as faixas do calc.js:
 * uterinas 11–44 semanas; umbilical, ACM, RCP e ducto venoso 20–44 semanas.
 * O percentil matemático nunca é substituído por uma interpretação clínica.
 */
export function calcularDopplerParcial(input: DopplerPartialInput): DopplerPartialResult {
  if (!Number.isInteger(input.weeks) || input.days < 0 || input.days > 6) return {};
  const ga = input.weeks + input.days / 7;
  const result: DopplerPartialResult = {};

  const ipMedioUterinas = input.ipMedioUterinas ?? (
    input.ipUterinaDireita !== undefined && input.ipUterinaEsquerda !== undefined
      ? Math.round(((input.ipUterinaDireita + input.ipUterinaEsquerda) / 2) * 1000) / 1000
      : undefined
  );
  if (input.weeks >= 11 && input.weeks <= 44 &&
      ipMedioUterinas !== undefined && ipMedioUterinas > 0.1 && ipMedioUterinas <= 10) {
    result.arteriasUterinas = calcArteriasUterinas(input.weeks, input.days, ipMedioUterinas);
  }
  if (input.weeks >= 20 && input.weeks <= 44) {
    if (input.ipUmbilical !== undefined && input.ipUmbilical > 0.1 && input.ipUmbilical <= 10) {
      result.arteriaUmbilical = calcArteriaUmbilical(ga, input.ipUmbilical);
    }
    if (input.ipMCA !== undefined && input.ipMCA > 0.1 && input.ipMCA <= 10) {
      result.arteriaCerebralMedia = calcArteriaCerebralMedia(ga, input.ipMCA);
    }
    if (input.ipDuctoVenoso !== undefined && input.ipDuctoVenoso > 0.1 && input.ipDuctoVenoso <= 10) {
      result.ductoVenoso = calcDuctoVenoso(ga, input.ipDuctoVenoso);
    }
    if (input.ipUmbilical !== undefined && input.ipMCA !== undefined &&
        input.ipUmbilical > 0.1 && input.ipUmbilical <= 10 &&
        input.ipMCA > 0.1 && input.ipMCA <= 10) {
      result.ratioCerebroplacentario = calcRatioCerebroplacentario(
        ga, input.ipMCA, input.ipUmbilical,
      );
    }
  }
  return result;
}

export function calcularDoppler(input: DopplerInput): DopplerResult {
  const result = calcularDopplerParcial(input);
  if (!result.arteriaUmbilical || !result.arteriaCerebralMedia ||
      !result.arteriasUterinas || !result.ratioCerebroplacentario) {
    throw new RangeError("Idade gestacional ou índices Doppler fora da faixa da calculadora Barcelona.");
  }
  return {
    arteriaUmbilical: result.arteriaUmbilical,
    arteriaCerebralMedia: result.arteriaCerebralMedia,
    arteriasUterinas: result.arteriasUterinas,
    ratioCerebroplacentario: result.ratioCerebroplacentario,
  };
}

/**
 * Formata o bloco de dopplervelocimetria pronto pra inserir nos achados.
 */
export function formatarBlocoDoppler(
  input: DopplerInput,
  result: DopplerResult,
): string {
  const {
    arteriaUmbilical: ua,
    arteriaCerebralMedia: acm,
    arteriasUterinas: uta,
    ratioCerebroplacentario: rcp,
  } = result;

  const fmt = (v: number, dec = 2) => v.toFixed(dec);
  const pct = (v: VesselResult) => `p${v.percentileLabel}`;

  const lines = [
    `IG: ${input.weeks}s${input.days}d`,
    ``,
    `DOPPLERVELOCIMETRIA:`,
    `Artéria umbilical: IP ${fmt(ua.ip)} (${pct(ua)})${ua.pathological ? " — ALTERADO" : ""}`,
    `Artéria cerebral média: IP ${fmt(acm.ip)} (${pct(acm)})${acm.pathological ? " — ALTERADO" : ""}`,
    `Artérias uterinas: IP médio ${fmt(uta.ipMedio)} [D ${fmt(input.ipUterinaDireita)} / E ${fmt(input.ipUterinaEsquerda)}] (${pct(uta)})${uta.pathological ? " — ALTERADO" : ""}`,
    `RCP: ${fmt(rcp.ip)} (${pct(rcp)})${rcp.pathological ? " — ALTERADO" : ""}`,
  ];

  return lines.join("\n");
}

export function formatarBlocoDopplerParcial(
  input: DopplerPartialInput,
  result: DopplerPartialResult,
): string {
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");
  const lines = [`IG: ${input.weeks}s${input.days}d`, "", "DOPPLERVELOCIMETRIA:"];
  if (result.arteriaUmbilical) {
    lines.push(`Artéria umbilical: IP ${fmt(result.arteriaUmbilical.ip)} (percentil ${result.arteriaUmbilical.percentileLabel}).`);
  }
  if (result.arteriaCerebralMedia) {
    lines.push(`Artéria cerebral média: IP ${fmt(result.arteriaCerebralMedia.ip)} (percentil ${result.arteriaCerebralMedia.percentileLabel}).`);
  }
  if (result.arteriasUterinas) {
    lines.push(`Artérias uterinas: IP médio ${fmt(result.arteriasUterinas.ipMedio)} (percentil ${result.arteriasUterinas.percentileLabel}).`);
  }
  if (result.ratioCerebroplacentario) {
    lines.push(`Relação cérebro-placentária: ${fmt(result.ratioCerebroplacentario.ip)} (percentil ${result.ratioCerebroplacentario.percentileLabel}).`);
  }
  if (result.ductoVenoso) {
    lines.push(`Ducto venoso: IP ${fmt(result.ductoVenoso.ip)} (percentil ${result.ductoVenoso.percentileLabel}).`);
  }
  lines.push(DOPPLER_BARCELONA_REFERENCE);
  return lines.join("\n");
}

/**
 * Auto-extração de IPs do texto livre — tolerante a transcrição de áudio.
 * Procura padrões "umbili...IP X.XX", "acm/cerebr...IP X.XX",
 * "uteri...dir/esq...IP X.XX". Normaliza vírgula → ponto. Ignora IR.
 *
 * Retorna apenas os campos encontrados; caller decide se preenche resto.
 */
export type DopplerIPExtraction = {
  ipUmbilical?: string;
  ipMCA?: string;
  ipUterinaDireita?: string;
  ipUterinaEsquerda?: string;
  ipDuctoVenoso?: string;
};

export function extrairIPsDoTexto(texto: string): DopplerIPExtraction {
  const t = texto.replace(/,/g, ".").toLowerCase();

  const ipApos = (pos: number): string | undefined => {
    const seg = t.slice(pos, pos + 150);
    // Captura "IP" seguido de número decimal (não "IR")
    const m = /\bip[\s:=]*([0-9]+\.[0-9]+)/.exec(seg);
    return m ? m[1] : undefined;
  };

  const result: DopplerIPExtraction = {};

  const umb = /umbili/.exec(t);
  if (umb) {
    const v = ipApos(umb.index);
    if (v) result.ipUmbilical = v;
  }

  const acm = /\bacm\b|cerebr/.exec(t);
  if (acm) {
    const v = ipApos(acm.index);
    if (v) result.ipMCA = v;
  }

  const ducto = /ducto\s+venoso/.exec(t);
  if (ducto) {
    const v = ipApos(ducto.index);
    if (v) result.ipDuctoVenoso = v;
  }

  const uteriRegex = /uteri/g;
  let match: RegExpExecArray | null;
  while ((match = uteriRegex.exec(t)) !== null) {
    const context = t.slice(match.index, match.index + 60);
    const ip = ipApos(match.index);
    if (!ip) continue;
    if (/dir|[\s\b]d[\s\b]/.test(context)) result.ipUterinaDireita = ip;
    else if (/esq|[\s\b]e[\s\b]/.test(context)) result.ipUterinaEsquerda = ip;
  }

  return result;
}
