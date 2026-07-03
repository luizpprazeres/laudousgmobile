/**
 * Biometria fetal DETERMINÍSTICA — mata a classe de bug "cm ecoado como mm".
 *
 * Boletim 02/07 (laudo 62f15728): o bloco da calculadora do app ("Biometria fetal:
 * DBP: 7.46 cm / CC: 28.13 cm / ...") passou pela extração LLM, que converteu o DBP
 * certo (74,6 mm) mas ECOOU CC/CA/CF sem o ×10 ("28,1 mm", "5,8 mm") — multiplicação
 * não-determinística. O CF 5,8 mm passou pelo measureSanity (bounds estáticos [3,100]
 * cobrem gestação inicial) e chegou ao laudo.
 *
 * Estratégia (Constituição: cálculo é do CÓDIGO, não do LLM):
 * 1. `mergeBiometriaEstruturada` — o bloco "Biometria fetal:" é gerado por MÁQUINA
 *    (ImageAnalysisService.format do app iOS, labels fixos, unidade explícita).
 *    Parse determinístico + override dos campos extraídos. Mesmo padrão do
 *    mergeStructuredIg (DOPPLER_OBSTETRICO).
 * 2. `reconcileBiometriaUnidade` — ditado por VOZ com "cm" explícito: se a extração
 *    devolveu o valor SEM o ×10 (mm ≈ valor em cm), corrige deterministicamente.
 *    Só corrige esse caso exato; qualquer outra divergência fica intocada.
 * 3. `igSemanasPorCf` — fórmula canônica do projeto (HadlockCalculator.swift,
 *    gestationalAgeByFemur: semanas = 10.35 + 2.46·cfCm + 0.17·cfCm²) para o check
 *    IG×CF do measureSanity (pega o que escapar de 1–2, ex.: ditado sem unidade).
 *
 * Feto ÚNICO apenas (gemelar: bloco/ditado ambíguo quanto a qual feto — não tocar).
 * Flag: OBST_BIOMETRIA_DET (default OFF).
 */

import type { ObstetricaFindings } from "./OBSTETRICA";

type Feto = ObstetricaFindings["fetos"][number];

/** Arredonda a 1 casa decimal (74.6, 281.3). */
function r1(v: number): number {
  return Math.round(v * 10) / 10;
}

function toNum(s: string): number {
  return parseFloat(s.replace(",", "."));
}

/** valor + unidade → mm. cm → ×10; mm → como está. */
function toMm(valor: number, unidade: string): number {
  return /^cm$/i.test(unidade) ? r1(valor * 10) : r1(valor);
}

export type BiometriaBloco = {
  dbp_mm: number | null;
  cc_mm: number | null;
  ca_mm: number | null;
  cf_mm: number | null;
  peso_g: number | null;
  peso_variacao_g: number | null;
};

/**
 * Parse do bloco estruturado "Biometria fetal:" (formato de máquina do app iOS).
 * Exige o CABEÇALHO do bloco (marcador de origem máquina) — linhas "DBP: 7.46 cm"
 * soltas sem o cabeçalho não ativam o parser (conservador, zero falso-positivo).
 * Retorna null se o bloco não existe ou nenhum campo foi lido.
 */
export function parseBiometriaFetalBlock(rawInput: string): BiometriaBloco | null {
  if (!/Biometria\s+fetal\s*:/i.test(rawInput)) return null;

  const linha = (label: RegExp): { valor: number; unidade: string } | null => {
    const re = new RegExp(
      `^\\s*(?:${label.source})\\s*:\\s*(\\d+(?:[.,]\\d+)?)\\s*(cm|mm)\\s*$`,
      "im",
    );
    const m = rawInput.match(re);
    if (!m || m[1] === undefined || m[2] === undefined) return null;
    return { valor: toNum(m[1]), unidade: m[2] };
  };
  const grama = (label: RegExp): number | null => {
    const re = new RegExp(
      `^\\s*(?:${label.source})\\s*:\\s*(?:±\\s*)?(\\d+(?:[.,]\\d+)?)\\s*g\\s*$`,
      "im",
    );
    const m = rawInput.match(re);
    return m && m[1] !== undefined ? r1(toNum(m[1])) : null;
  };

  const dbp = linha(/DBP/);
  const cc = linha(/CC/);
  const ca = linha(/CA/);
  const cf = linha(/CF/);
  const peso = grama(/Peso\s+fetal\s+estimado/);
  const variacao = grama(/Varia[çc][ãa]o\s+do\s+peso/);

  const out: BiometriaBloco = {
    dbp_mm: dbp ? toMm(dbp.valor, dbp.unidade) : null,
    cc_mm: cc ? toMm(cc.valor, cc.unidade) : null,
    ca_mm: ca ? toMm(ca.valor, ca.unidade) : null,
    cf_mm: cf ? toMm(cf.valor, cf.unidade) : null,
    peso_g: peso,
    peso_variacao_g: variacao,
  };
  const algum = Object.values(out).some((v) => v !== null);
  return algum ? out : null;
}

/**
 * Sobrescreve o campo extraído com o valor do bloco? SÓ quando a extração:
 * (a) dropou o campo (null); (b) já bate com o bloco (idempotente); ou
 * (c) ecoou o valor em cm sem o ×10 (o bug do boletim 02/07).
 * Qualquer OUTRO valor = possível correção FALADA pelo médico depois de colar o
 * bloco ("na verdade o fêmur tem 60") — precedência da casa: comando explícito >
 * achados estruturados → preserva a extração.
 */
function blocoVence(atual: number | null, blocoMm: number): boolean {
  return (
    atual === null ||
    Math.abs(atual - blocoMm) < 0.05 ||
    Math.abs(atual - blocoMm / 10) < 0.05
  );
}

/**
 * Override determinístico: campos do bloco da calculadora (máquina→máquina; o LLM
 * só podia degradá-los) corrigem a extração — cirúrgico, via blocoVence().
 * Feto único apenas.
 */
export function mergeBiometriaEstruturada(
  f: ObstetricaFindings,
  rawInput: string,
): ObstetricaFindings {
  if ((f.numero_fetos ?? 1) >= 2 || f.fetos.length !== 1) return f;
  const feto0 = f.fetos[0];
  if (!feto0) return f;
  const bloco = parseBiometriaFetalBlock(rawInput);
  if (!bloco) return f;
  const feto: Feto = { ...feto0 };
  const campos = ["dbp_mm", "cc_mm", "ca_mm", "cf_mm", "peso_g", "peso_variacao_g"] as const;
  for (const c of campos) {
    const b = bloco[c];
    if (b !== null && blocoVence(feto[c], b)) feto[c] = b;
  }
  return { ...f, fetos: [feto] };
}

/** Labels de biometria no ditado por voz (siglas + por extenso). */
const VOZ_LABELS: ReadonlyArray<readonly [keyof BiometriaBloco & keyof Feto, RegExp]> = [
  ["dbp_mm", /(?:DBP|BPD|di[âa]metro\s+biparietal)/i],
  ["cc_mm", /(?:CC|HC|circunfer[êe]ncia\s+(?:da\s+cabe[çc]a|cef[áa]lica))/i],
  ["ca_mm", /(?:CA|AC|circunfer[êe]ncia\s+abdominal)/i],
  ["cf_mm", /(?:CF|FL|comprimento\s+do\s+f[êe]mur)/i],
];

/**
 * Reconciliação de unidade no ditado por VOZ: "cm"/"centímetros" EXPLÍCITO no
 * ditado ("CF de 5,76 centímetros") e a extração devolveu o número SEM o ×10
 * (cf_mm ≈ 5.76) → corrige para 57,6. É o único caso corrigido: se o campo já
 * está ≈ cm×10 (certo) ou é qualquer outro valor, não toca. Feto único apenas.
 */
export function reconcileBiometriaUnidade(
  f: ObstetricaFindings,
  rawInput: string,
): ObstetricaFindings {
  if ((f.numero_fetos ?? 1) >= 2 || f.fetos.length !== 1) return f;
  const feto0 = f.fetos[0];
  if (!feto0) return f;
  const feto: Feto = { ...feto0 };
  let mudou = false;
  for (const [campo, label] of VOZ_LABELS) {
    const atual = feto[campo];
    if (atual === null || typeof atual !== "number") continue;
    const re = new RegExp(
      `\\b(?:${label.source})\\b[^\\d\\n]{0,25}(\\d+(?:[.,]\\d+)?)\\s*(?:cm|cent[íi]metros?)\\b`,
      "i",
    );
    const m = rawInput.match(re);
    if (!m || m[1] === undefined) continue;
    const ditadoCm = toNum(m[1]);
    // Extração ecoou o valor em cm sem converter → aplica o ×10 que faltou.
    if (Math.abs(atual - ditadoCm) < 0.05) {
      feto[campo] = r1(ditadoCm * 10);
      mudou = true;
    }
  }
  return mudou ? { ...f, fetos: [feto] } : f;
}

/**
 * IG estimada pelo CF — fórmula canônica do projeto (portada de
 * HadlockCalculator.gestationalAgeByFemur, app iOS): usada SÓ para plausibilidade
 * (o check IG×CF do measureSanity), nunca para datar gestação no laudo.
 */
export function igSemanasPorCf(cfMm: number): number | null {
  if (!Number.isFinite(cfMm) || cfMm <= 1) return null;
  const cfCm = cfMm / 10;
  const semanas = 10.35 + 2.46 * cfCm + 0.17 * cfCm * cfCm;
  return Number.isFinite(semanas) && semanas > 0 ? semanas : null;
}
