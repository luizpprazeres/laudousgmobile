/**
 * Doppler Obstétrico — port literal do LaudoUSG original (lib/dopplerCalculator.ts).
 *
 * Implementa as fórmulas exatas da Fetal Medicine Barcelona
 * (fetalmedicinebarcelona.org). Coeficientes extraídos do calc.js oficial.
 *
 * Calcula z-score e percentil pra 4 vasos:
 *   - Artéria Umbilical (UA): patológico se z > 1.645 (>p95)
 *   - Artéria Cerebral Média (ACM): patológico se z < -1.645 (<p5)
 *   - Artérias Uterinas (média bilateral, log-normal): patológico se z > 1.645
 *   - Ratio Cerebroplacentário (RCP = ACM/UA): patológico se z < -1.645
 *
 * Aplica 3 correções clínicas pós-cálculo pra evitar falsos positivos
 * (vide aplicarCorrecoesClincias).
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
  pathological: boolean;
}

export interface DopplerResult {
  arteriaUmbilical: VesselResult;
  arteriaCerebralMedia: VesselResult;
  arteriasUterinas: VesselResult & { ipMedio: number };
  ratioCerebroplacentario: VesselResult;
}

// Lookup table: z-score → percentile.
// Tabela compartilhada com a calculadora Barcelona FMF.
const Z_TABLE: [number, number][] = [
  [-3.719, 0.01],
  [-3.09, 0.1],
  [-2.576, 0.5],
  [-2.326, 1],
  [-2.054, 2],
  [-1.96, 2.5],
  [-1.881, 3],
  [-1.751, 4],
  [-1.645, 5],
  [-1.555, 6],
  [-1.476, 7],
  [-1.405, 8],
  [-1.341, 9],
  [-1.282, 10],
  [-1.227, 11],
  [-1.175, 12],
  [-1.126, 13],
  [-1.08, 14],
  [-1.036, 15],
  [-0.994, 16],
  [-0.954, 17],
  [-0.915, 18],
  [-0.878, 19],
  [-0.842, 20],
  [-0.806, 21],
  [-0.772, 22],
  [-0.739, 23],
  [-0.706, 24],
  [-0.674, 25],
  [-0.643, 26],
  [-0.613, 27],
  [-0.583, 28],
  [-0.553, 29],
  [-0.524, 30],
  [-0.496, 31],
  [-0.468, 32],
  [-0.44, 33],
  [-0.412, 34],
  [-0.385, 35],
  [-0.358, 36],
  [-0.332, 37],
  [-0.305, 38],
  [-0.279, 39],
  [-0.253, 40],
  [-0.228, 41],
  [-0.202, 42],
  [-0.176, 43],
  [-0.151, 44],
  [-0.126, 45],
  [-0.1, 46],
  [-0.075, 47],
  [-0.05, 48],
  [-0.025, 49],
  [0.0, 50],
  [0.025, 51],
  [0.05, 52],
  [0.075, 53],
  [0.1, 54],
  [0.126, 55],
  [0.151, 56],
  [0.176, 57],
  [0.202, 58],
  [0.228, 59],
  [0.253, 60],
  [0.279, 61],
  [0.305, 62],
  [0.332, 63],
  [0.358, 64],
  [0.385, 65],
  [0.412, 66],
  [0.44, 67],
  [0.468, 68],
  [0.496, 69],
  [0.524, 70],
  [0.553, 71],
  [0.583, 72],
  [0.613, 73],
  [0.643, 74],
  [0.674, 75],
  [0.706, 76],
  [0.739, 77],
  [0.772, 78],
  [0.806, 79],
  [0.842, 80],
  [0.878, 81],
  [0.915, 82],
  [0.954, 83],
  [0.994, 84],
  [1.036, 85],
  [1.08, 86],
  [1.126, 87],
  [1.175, 88],
  [1.227, 89],
  [1.282, 90],
  [1.341, 91],
  [1.405, 92],
  [1.476, 93],
  [1.555, 94],
  [1.645, 95],
  [1.751, 96],
  [1.881, 97],
  [1.96, 97.5],
  [2.054, 98],
  [2.326, 99],
  [2.576, 99.5],
  [3.09, 99.9],
  [3.719, 99.99],
];

function zToPercentile(z: number): number {
  const first = Z_TABLE[0]!;
  const last = Z_TABLE[Z_TABLE.length - 1]!;
  if (z <= first[0]) return first[1];
  if (z >= last[0]) return last[1];

  for (let i = 0; i < Z_TABLE.length - 1; i++) {
    const a = Z_TABLE[i]!;
    const b = Z_TABLE[i + 1]!;
    if (z >= a[0] && z < b[0]) {
      const t = (z - a[0]) / (b[0] - a[0]);
      const p = a[1] + t * (b[1] - a[1]);
      return Math.round(p);
    }
  }
  return 50;
}

function calcArteriaUmbilical(ga: number, ip: number): VesselResult {
  const mean = 3.55219 - 0.13558 * ga + 0.00174 * ga * ga;
  const sd = 0.299;
  const zscore = (ip - mean) / sd;
  const percentile = zToPercentile(zscore);
  return { ip, zscore, percentile, pathological: zscore > 1.645 };
}

function calcArteriaCerebralMedia(ga: number, ip: number): VesselResult {
  const mean = -2.7317 + 0.3335 * ga - 0.0058 * ga * ga;
  const sd = -0.88005 + 0.08182 * ga - 0.00133 * ga * ga;
  const zscore = (ip - mean) / sd;
  const percentile = zToPercentile(zscore);
  return { ip, zscore, percentile, pathological: zscore < -1.645 };
}

function calcArteriasUterinas(
  weeks: number,
  days: number,
  ipDireita: number,
  ipEsquerda: number,
): VesselResult & { ipMedio: number } {
  const totalDays = weeks * 7 + days;
  const ipMedio = (ipDireita + ipEsquerda) / 2;
  const logMedio = Math.log(ipMedio);
  const meanLog = 1.39 - 0.012 * totalDays + 1.98e-5 * totalDays * totalDays;
  const sdLog = 0.272 - 0.000259 * totalDays;
  const zscore = (logMedio - meanLog) / sdLog;
  const percentile = zToPercentile(zscore);
  return {
    ip: ipMedio,
    ipMedio,
    zscore,
    percentile,
    pathological: zscore > 1.645,
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
  const percentile = zToPercentile(zscore);
  return { ip: ratio, zscore, percentile, pathological: zscore < -1.645 };
}

/**
 * Correção clínica pós-cálculo — evita falsos positivos em gestações normais.
 *
 * Regra 1 — Artéria Umbilical (AU):
 *   Só é patológica quando ELEVADA (>p95, fluxo aumentado).
 *   Percentil BAIXO (<p10) não tem significado → exibir como p5, não alarmar.
 *   Rationale: IP umbilical naturalmente baixo não indica comprometimento.
 *
 * Regra 2 — ACM:
 *   Centralização só tem significado quando AU também está comprometida.
 *   ACM baixa isolada (sem AU elevada) → exibir como p5, não alarmar.
 *
 * Regra 3 — RCP:
 *   Mesma lógica da ACM: só relevante quando AU alterada.
 *
 * IMPORTANTE: z-scores e IPs brutos não são alterados; apenas os campos
 * { percentile, pathological } de exibição são corrigidos.
 */
function aplicarCorrecoesClincias(result: DopplerResult): DopplerResult {
  const uaAlterada = result.arteriaUmbilical.pathological;

  const auCorrigida: VesselResult =
    result.arteriaUmbilical.percentile < 10
      ? { ...result.arteriaUmbilical, percentile: 5, pathological: false }
      : result.arteriaUmbilical;

  const acmCorrigida: VesselResult =
    !uaAlterada && result.arteriaCerebralMedia.pathological
      ? { ...result.arteriaCerebralMedia, percentile: 5, pathological: false }
      : result.arteriaCerebralMedia;

  const rcpCorrigido: VesselResult =
    !uaAlterada && result.ratioCerebroplacentario.pathological
      ? {
          ...result.ratioCerebroplacentario,
          percentile: 5,
          pathological: false,
        }
      : result.ratioCerebroplacentario;

  return {
    arteriaUmbilical: auCorrigida,
    arteriaCerebralMedia: acmCorrigida,
    arteriasUterinas: result.arteriasUterinas,
    ratioCerebroplacentario: rcpCorrigido,
  };
}

export function calcularDoppler(input: DopplerInput): DopplerResult {
  const ga = input.weeks + input.days / 7;

  const arteriaUmbilical = calcArteriaUmbilical(ga, input.ipUmbilical);
  const arteriaCerebralMedia = calcArteriaCerebralMedia(ga, input.ipMCA);
  const arteriasUterinas = calcArteriasUterinas(
    input.weeks,
    input.days,
    input.ipUterinaDireita,
    input.ipUterinaEsquerda,
  );
  const ratioCerebroplacentario = calcRatioCerebroplacentario(
    ga,
    input.ipMCA,
    input.ipUmbilical,
  );

  const raw = {
    arteriaUmbilical,
    arteriaCerebralMedia,
    arteriasUterinas,
    ratioCerebroplacentario,
  };
  return aplicarCorrecoesClincias(raw);
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
  const pct = (v: number) => `p${v}`;

  const lines = [
    `IG: ${input.weeks}s${input.days}d`,
    ``,
    `DOPPLERVELOCIMETRIA:`,
    `Artéria umbilical: IP ${fmt(ua.ip)} (${pct(ua.percentile)})${ua.pathological ? " — ALTERADO" : ""}`,
    `Artéria cerebral média: IP ${fmt(acm.ip)} (${pct(acm.percentile)})${acm.pathological ? " — ALTERADO" : ""}`,
    `Artérias uterinas: IP médio ${fmt(uta.ipMedio)} [D ${fmt(input.ipUterinaDireita)} / E ${fmt(input.ipUterinaEsquerda)}] (${pct(uta.percentile)})${uta.pathological ? " — ALTERADO" : ""}`,
    `RCP: ${fmt(rcp.ip)} (${pct(rcp.percentile)})${rcp.pathological ? " — ALTERADO" : ""}`,
  ];

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
