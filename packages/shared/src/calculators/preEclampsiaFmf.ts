/**
 * Risco de pré-eclâmpsia — modelo de RISCOS COMPETITIVOS da Fetal Medicine
 * Foundation, 1º trimestre (11+0 a 13+6 semanas), feto único.
 *
 * Especificação: Wright D, Wright A, Nicolaides KH. "The competing risk approach
 * for prediction of preeclampsia." Am J Obstet Gynecol 2020;223:12-23.e7,
 * apêndice "Competing risk approach for prediction of PE: algorithm
 * specification". Tabelas 1 (a priori), 3 (verossimilhança), 4 (truncamento do
 * MoM) e 5 (covariância).
 *
 * Modelos de mediana (MoM):
 *   PAM       — Wright A et al., Ultrasound Obstet Gynecol 2015;45:698-706, Tab. 2
 *   IP uterino — Tayyar A et al., Ultrasound Obstet Gynecol 2015;45:689-697, Tab. 2
 *
 * ⚠️ Port de `packages/fmf/src/*.mjs`, que é a fonte de verdade e onde ficam a
 * validação e as notas de calibração. Qualquer mudança aqui exige rodar
 * `node packages/fmf/validacao/paridade-fmf.manual.mjs` e o golden deste pacote.
 *
 * NÃO é software certificado nem endossado pela FMF.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Contrato
// ─────────────────────────────────────────────────────────────────────────────

export type PeEtnia = "branca" | "afro" | "sul-asiatica" | "leste-asiatica";
export type PeParidade = "nulipara" | "multipara-sem-pe" | "multipara-com-pe";

export interface PeGestante {
  /** anos, na data provável do parto */
  idade: number;
  /** kg, aferido na consulta de 1º trimestre */
  peso: number;
  /** cm */
  altura: number;
  /** idade gestacional ATUAL em dias (77 a 99) */
  gaDias: number;
  etnia: PeEtnia;
  paridade: PeParidade;
  /** anos desde o parto anterior — obrigatório em multíparas */
  intervaloAnos?: number | null;
  /** semanas — obrigatório em multíparas */
  igPartoAnterior?: number | null;
  /** Z-score do peso ao nascer anterior — obrigatório em multípara COM PE */
  zEscorePesoAnterior?: number | null;
  /** mãe da paciente teve pré-eclâmpsia */
  histFamiliarPE: boolean;
  /** concepção por fertilização in vitro */
  fiv: boolean;
  hipertensaoCronica: boolean;
  /** diabetes tipo 1 ou 2 */
  diabetes: boolean;
  /** LES ou síndrome antifosfolípide */
  lesSaf: boolean;
  fumante: boolean;
}

export interface PeMedidas {
  /** PAM em mmHg. Use `pamDeAfericoes()` para obtê-la a partir das pressões. */
  pamMmHg?: number | null;
  /** IP médio das artérias uterinas, (direita + esquerda)/2, transabdominal */
  utaPiMedio?: number | null;
  /**
   * Quantas aferições de pressão originaram a PAM. O protocolo da FMF são 4
   * (dois braços, duas vezes); com menos, o laudo declara isso. Não muda o
   * cálculo — muda o que o laudo afirma.
   */
  afericoesPam?: number | null;
}

export interface PeAfericao {
  sistolica: number;
  diastolica: number;
}

export interface PePam {
  /** média das PAM individuais, em mmHg */
  pamMmHg: number;
  afericoes: number;
  /** as 4 aferições do protocolo da FMF estão presentes */
  protocoloCompleto: boolean;
}

/**
 * PAM a partir das aferições de pressão.
 *
 * `PAM = (PAS + 2×PAD) / 3` para cada aferição; a PAM final é a média delas.
 * O protocolo da FMF são **4 aferições** — braço direito e esquerdo, duas vezes
 * cada. Aceitamos de 1 a 4 porque na rotina brasileira o ultrassonografista
 * costuma receber uma pressão só; o resultado é o mesmo cálculo, com mais ruído,
 * e o laudo passa a declarar quantas foram.
 */
export function pamDeAfericoes(afericoes: PeAfericao[]): PePam {
  const validas = afericoes.filter(
    (a) =>
      Number.isFinite(a.sistolica) &&
      Number.isFinite(a.diastolica) &&
      a.sistolica > a.diastolica &&
      a.sistolica >= 50 && a.sistolica <= 300 &&
      a.diastolica >= 20 && a.diastolica <= 200
  );
  if (validas.length === 0) {
    throw new PeErroDeDominio("nenhuma aferição de pressão válida");
  }
  const soma = validas.reduce((s, a) => s + (a.sistolica + 2 * a.diastolica) / 3, 0);
  return {
    pamMmHg: soma / validas.length,
    afericoes: validas.length,
    protocoloCompleto: validas.length >= 4,
  };
}

export interface PeMarcador {
  nome: "map" | "utaPi";
  mom: number;
  /** o log10 MoM saiu dos limites da Tabela 4 e foi truncado */
  truncado: boolean;
}

export interface PeResultado {
  /** identifica o conjunto de parâmetros — não misturar famílias */
  versaoParametros: string;
  /** média da distribuição gaussiana da IG (semanas) ao parto COM PE */
  priorMean: number;
  priorSd: number;
  /** `max(24, IG atual)` — o risco é condicionado a partir daqui */
  gCurrent: number;
  marcadores: PeMarcador[];
  /** probabilidades (0..1) de PE com parto antes de 37, 34 e 32 semanas */
  riscos: { 37: number; 34: number; 32: number };
  /** `1 em N` para o corte de 37 semanas */
  umEmN: number;
  /** o risco antes de 37 semanas atingiu o corte da FMF de 1:100 */
  altoRisco: boolean;
  /** bloco pronto para inserir no laudo */
  insertBloco: string;
}

/** Erro de domínio: o dado não permite um cálculo confiável. Nunca devolver NaN. */
export class PeErroDeDominio extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PeErroDeDominio";
  }
}

/**
 * Corte da FMF para profilaxia com AAS: risco de PE pré-termo (< 37 semanas)
 * de 1 em 100. É o corte que o software oficial usa e o do ensaio ASPRE.
 *
 * A FMF observa que, em população predominantemente branca, 1 em 150 seria
 * razoável (detecção 80% em vez de 70%), mas que isso levaria a taxa de rastreio
 * positivo em mulheres negras a ~40%. Mantemos o padrão da FMF.
 */
export const PE_CORTE_ALTO_RISCO = 1 / 100;

export const PE_VERSAO_PARAMETROS = "FMF/AJOG-2020+cal-2026-08-22";

// ─────────────────────────────────────────────────────────────────────────────
// A priori — Wright 2020, Tabela 1 (idêntica a Wright 2015, Tabela 2)
// ─────────────────────────────────────────────────────────────────────────────

const SIGMA = 6.8833;

/** Truncamento das características maternas, aplicado ANTES do a priori. */
const TRUNC = {
  idade: [12, 55],
  peso: [34, 190],
  altura: [127, 198],
  intervaloAnos: [0.25, 15],
  igPartoAnterior: [24, 42],
} as const;

const trunc = (v: number, [lo, hi]: readonly [number, number]) =>
  Math.min(Math.max(v, lo), hi);

/**
 * A salvaguarda da HAS crônica do Wright 2015 (p. 62.e7) está DESLIGADA:
 * a conferência no software oficial em 22/08/2026 mostrou que a FMF não a
 * aplica. Neste ponto o software diverge do próprio paper — ver o README de
 * `packages/fmf/`. Não religar em silêncio.
 */
const SALVAGUARDA_HAS = false;

function mediaComRamoHAS(g: PeGestante, comHAS: boolean): number {
  const idade = trunc(g.idade, TRUNC.idade);
  const peso = trunc(g.peso, TRUNC.peso);
  const altura = trunc(g.altura, TRUNC.altura);

  let mu = 54.3637;
  mu += -0.206886 * Math.max(0, idade - 35);
  mu += 0.117110 * (altura - 164);

  if (g.etnia === "afro") mu += -2.6786;
  if (g.etnia === "sul-asiatica") mu += -1.1290;
  if (g.lesSaf) mu += -3.0519;
  if (g.fiv) mu += -1.6327;

  if (comHAS) {
    // peso, história familiar e diabetes NÃO se somam à hipertensão crônica
    mu += -7.2897;
  } else {
    mu += -0.0694096 * (peso - 69);
    if (g.histFamiliarPE) mu += -1.7154;
    if (g.diabetes) mu += -3.3899;
  }

  if (g.paridade === "multipara-com-pe") {
    const igAnt = trunc(g.igPartoAnterior as number, TRUNC.igPartoAnterior);
    mu += -8.1667;
    mu += 0.0271988 * Math.pow(igAnt - 24, 2);
  } else if (g.paridade === "multipara-sem-pe") {
    const igAnt = trunc(g.igPartoAnterior as number, TRUNC.igPartoAnterior);
    const inter = trunc(g.intervaloAnos as number, TRUNC.intervaloAnos);
    mu += -4.3350;
    mu += -4.15137651 * Math.pow(inter, -1);
    mu += 9.21473572 * Math.pow(inter, -0.5);
    mu += 0.01549673 * Math.pow(igAnt - 24, 2);
  }

  return mu;
}

export function mediaIgPartoComPE(g: PeGestante): number {
  if (!g.hipertensaoCronica) return mediaComRamoHAS(g, false);
  return SALVAGUARDA_HAS
    ? Math.min(mediaComRamoHAS(g, true), mediaComRamoHAS(g, false))
    : mediaComRamoHAS(g, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// MoM dos marcadores
// ─────────────────────────────────────────────────────────────────────────────

const I = (b: boolean) => (b ? 1 : 0);

/**
 * Calibrações da PAM contra o software oficial (v1.0.44, 8 pontos medidos à mão
 * em 22/08/2026). NÃO são parâmetros publicados — ver `packages/fmf/README.md`.
 *   · interação HAS×peso: a FMF usa −1,8859e-4 onde Wright A 2015 publica −4,211180e-4
 *   · intercepto: −0,003568
 * O modelo do IP uterino bate SEM calibração.
 */
const CAL_MAP_HAS_PESO = -1.8859e-4;
const CAL_MAP_INTERCEPTO = -0.003568;

export function log10MapEsperada(g: PeGestante): number {
  const ga = g.gaDias - 77;
  const wt = g.peso - 69;
  const ht = g.altura - 164;
  const age = g.idade - 35;
  const afro = I(g.etnia === "afro");
  const has = I(g.hipertensaoCronica);

  return (
    1.943223919 + CAL_MAP_INTERCEPTO +
    0.000209037 * ga -
    0.000020452 * ga * ga +
    0.000439271 * age +
    0.001193313 * wt -
    0.000008823 * wt * wt -
    0.000206306 * ht -
    0.004523672 * I(g.fumante) -
    0.001191227 * afro -
    0.000050679 * afro * ga +
    0.051007216 * has +
    CAL_MAP_HAS_PESO * has * wt +
    0.004445020 * I(g.diabetes) +
    0.005976240 * I(g.histFamiliarPE) -
    0.009402127 * I(g.paridade === "multipara-sem-pe") +
    0.000744526 * (g.paridade === "multipara-sem-pe" ? (g.intervaloAnos as number) : 0) +
    0.006091903 * I(g.paridade === "multipara-com-pe")
  );
}

export function log10UtaPiEsperado(g: PeGestante): number {
  const ga = g.gaDias - 77;
  const wt = g.peso - 69;
  const age = g.idade - 35;
  const comPE = g.paridade === "multipara-com-pe";

  return (
    0.255731426 -
    0.004407905 * ga -
    0.000888890 * wt +
    0.000006006 * wt * wt +
    0.000008322 * wt * ga -
    0.001117349 * age +
    0.000015061 * age * ga +
    0.018069553 * I(g.etnia === "afro") +
    0.004971474 * I(comPE) -
    0.006836336 * (comPE && g.zEscorePesoAnterior != null ? g.zEscorePesoAnterior : 0) -
    0.005119599 * (comPE && g.igPartoAnterior != null ? g.igPartoAnterior - 40 : 0)
  );
}

export const mapMoM = (pam: number, g: PeGestante) =>
  pam / Math.pow(10, log10MapEsperada(g));
export const utaPiMoM = (ip: number, g: PeGestante) =>
  ip / Math.pow(10, log10UtaPiEsperado(g));

// ─────────────────────────────────────────────────────────────────────────────
// Verossimilhança e covariância — Wright 2020, Tabelas 3, 4 e 5 (visita de 12 sem)
// ─────────────────────────────────────────────────────────────────────────────

const VEROSSIMILHANCA = {
  map: { b0: 0.088997, b1: -0.0016711 },
  utaPi: { b0: 0.5861, b1: -0.014233 },
} as const;

/** Média do log10 MoM dado parto com PE em `t` semanas. Truncada em zero. */
function mediaLog10MoM(marcador: "map" | "utaPi", t: number): number {
  const { b0, b1 } = VEROSSIMILHANCA[marcador];
  return t < -b0 / b1 ? b0 + b1 * t : 0;
}

/** Truncamento do log10 MoM OBSERVADO — regra distinta da acima, ambas obrigatórias. */
const TRUNC_LOG10_MOM = {
  map: [-0.1224076, 0.12240759],
  utaPi: [-0.4216152, 0.42161519],
} as const;

/** Covariância (não correlação). "sigma.pe is also used for normals". */
const COV: Record<string, number> = {
  "map:map": 0.00141396,
  "utaPi:utaPi": 0.01630906,
  "map:utaPi": -0.0002726,
};
const cov = (a: string, b: string) => COV[`${a}:${b}`] ?? COV[`${b}:${a}`];

// ─────────────────────────────────────────────────────────────────────────────
// Núcleo numérico
// ─────────────────────────────────────────────────────────────────────────────

const LN_2PI = Math.log(2 * Math.PI);

/**
 * Leitura de índice na grade de integração. O `apps/api` compila com
 * `noUncheckedIndexedAccess`, que marca TODO acesso indexado como
 * `number | undefined` — inclusive em `Float64Array`. Os índices deste módulo
 * são provadamente internos à grade (`0..N`), então a garantia fica concentrada
 * aqui, num lugar só, em vez de espalhada em `!` pelo laço numérico.
 */
const at = (arr: Float64Array, i: number): number => arr[i] as number;

const logDnorm = (t: number, mu: number, sd: number) =>
  -0.5 * (((t - mu) / sd) ** 2 + LN_2PI) - Math.log(sd);

/** log-densidade normal univariada a partir da variância. */
function logDmvnorm1(x0: number, m0: number, s00: number): number {
  const d = x0 - m0;
  return -0.5 * ((d * d) / s00 + Math.log(s00) + LN_2PI);
}

/** log-densidade normal bivariada a partir da covariância. */
function logDmvnorm2(
  x0: number, x1: number,
  m0: number, m1: number,
  s00: number, s01: number, s11: number
): number {
  const det = s00 * s11 - s01 * s01;
  if (!(det > 0)) throw new PeErroDeDominio("matriz de covariância não positiva definida");
  const d0 = x0 - m0;
  const d1 = x1 - m1;
  const q = (s11 * d0 * d0 - 2 * s01 * d0 * d1 + s00 * d1 * d1) / det;
  return -0.5 * (q + Math.log(det) + 2 * LN_2PI);
}

/** Φ — CDF normal padrão. erfc de Chebyshev (Numerical Recipes), erro < 1,2e-7. */
function pnorm(z: number): number {
  const x = -z / Math.SQRT2;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.5 * a);
  const ans =
    t *
    Math.exp(
      -a * a - 1.26551223 +
        t * (1.00002368 +
          t * (0.37409196 +
            t * (0.09678418 +
              t * (-0.18628806 +
                t * (0.27886807 +
                  t * (-1.13520398 +
                    t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    );
  return 0.5 * (x >= 0 ? ans : 2 - ans);
}

/** Janela da visita de 12 semanas — Wright 2020: 77 a 99 dias. */
export const PE_JANELA_DIAS: readonly [number, number] = [77, 99];

const FAIXAS_MEDIDA = { pamMmHg: [50, 180], utaPiMedio: [0.2, 6] } as const;
const FAIXAS_PLAUSIVEL = { idade: [8, 70], peso: [20, 300], altura: [100, 230] } as const;

function validar(g: PeGestante, m: PeMedidas): void {
  for (const k of ["idade", "peso", "altura", "gaDias"] as const) {
    const v = g[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new PeErroDeDominio(`${k}: valor ausente ou inválido`);
    }
  }
  const [d0, d1] = PE_JANELA_DIAS;
  if (g.gaDias < d0 || g.gaDias > d1) {
    throw new PeErroDeDominio(
      `idade gestacional de ${g.gaDias} dias fora da janela do modelo de 1º trimestre (${d0}–${d1} dias)`
    );
  }
  for (const [k, [lo, hi]] of Object.entries(FAIXAS_PLAUSIVEL)) {
    const v = g[k as "idade" | "peso" | "altura"];
    if (v < lo || v > hi) throw new PeErroDeDominio(`${k}=${v} implausível (aceito ${lo}–${hi})`);
  }
  for (const [k, [lo, hi]] of Object.entries(FAIXAS_MEDIDA)) {
    const v = m[k as keyof PeMedidas];
    if (v == null) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new PeErroDeDominio(`${k}: valor inválido`);
    }
    if (v < lo || v > hi) throw new PeErroDeDominio(`${k}=${v} fora da faixa aceita (${lo}–${hi})`);
  }
  // Sem imputação silenciosa: o modelo usa estes campos, não os inventamos.
  if (g.paridade === "multipara-com-pe") {
    if (g.igPartoAnterior == null) {
      throw new PeErroDeDominio("multípara com PE anterior exige a IG do parto anterior");
    }
    if (g.zEscorePesoAnterior == null) {
      throw new PeErroDeDominio("multípara com PE anterior exige o Z-score do peso ao nascer anterior");
    }
  }
  if (g.paridade === "multipara-sem-pe") {
    if (g.igPartoAnterior == null) {
      throw new PeErroDeDominio("multípara exige a IG do parto anterior");
    }
    if (!(typeof g.intervaloAnos === "number" && g.intervaloAnos > 0)) {
      throw new PeErroDeDominio("multípara exige o intervalo entre gestações em anos (> 0)");
    }
  }
}

const truncaMom = (v: number, [lo, hi]: readonly [number, number]) =>
  Math.min(Math.max(v, lo), hi);

const CORTES = [37, 34, 32] as const;

export function calcularPreEclampsiaFmf(g: PeGestante, med: PeMedidas = {}): PeResultado {
  validar(g, med);

  const priorMean = mediaIgPartoComPE(g);
  const gCurrent = Math.max(24, g.gaDias / 7);

  const mk: { nome: "map" | "utaPi"; mom: number; x: number; truncado: boolean }[] = [];
  if (med.pamMmHg != null) {
    const mom = mapMoM(med.pamMmHg, g);
    const bruto = Math.log10(mom);
    const x = truncaMom(bruto, TRUNC_LOG10_MOM.map);
    mk.push({ nome: "map", mom, x, truncado: x !== bruto });
  }
  if (med.utaPiMedio != null) {
    const mom = utaPiMoM(med.utaPiMedio, g);
    const bruto = Math.log10(mom);
    const x = truncaMom(bruto, TRUNC_LOG10_MOM.utaPi);
    mk.push({ nome: "utaPi", mom, x, truncado: x !== bruto });
  }

  const riscos = { 37: 0, 34: 0, 32: 0 } as PeResultado["riscos"];

  if (mk.length === 0) {
    // Sem marcadores o posterior é o próprio a priori — forma fechada.
    const base = pnorm((gCurrent - priorMean) / SIGMA);
    for (const G of CORTES) {
      riscos[G] = G <= gCurrent ? 0 : (pnorm((G - priorMean) / SIGMA) - base) / (1 - base);
    }
  } else {
    // Extrai para escalares nomeados: o núcleo numérico não indexa arrays.
    const a = mk[0]!;
    const b = mk.length === 2 ? mk[1]! : null;
    const sAA = cov(a.nome, a.nome)!;
    const sBB = b ? cov(b.nome, b.nome)! : 0;
    const sAB = b ? cov(a.nome, b.nome)! : 0;

    const G0 = gCurrent;
    const G1 = 100;
    const N = 15200;
    const h = (G1 - G0) / N;

    const logF = new Float64Array(N + 1);
    let logMax = -Infinity;
    for (let i = 0; i <= N; i++) {
      const t = G0 + i * h;
      const v =
        logDnorm(t, priorMean, SIGMA) +
        (b
          ? logDmvnorm2(a.x, b.x, mediaLog10MoM(a.nome, t), mediaLog10MoM(b.nome, t), sAA, sAB, sBB)
          : logDmvnorm1(a.x, mediaLog10MoM(a.nome, t), sAA));
      logF[i] = v;
      if (v > logMax) logMax = v;
    }
    if (!Number.isFinite(logMax)) {
      throw new PeErroDeDominio("verossimilhança degenerada — medidas incompatíveis com o modelo");
    }

    const f = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) f[i] = Math.exp(at(logF, i) - logMax);

    const acum = new Float64Array(N + 1);
    for (let i = 2; i <= N; i += 2) {
      acum[i] = at(acum, i - 2) + (h / 3) * (at(f, i - 2) + 4 * at(f, i - 1) + at(f, i));
    }
    for (let i = 1; i <= N; i += 2) acum[i] = (at(acum, i - 1) + at(acum, i + 1)) / 2;
    const total = at(acum, N);
    if (!(total > 0) || !Number.isFinite(total)) {
      throw new PeErroDeDominio("integral do posterior nula ou não finita");
    }

    const emG = (G: number): number => {
      if (G <= G0) return 0;
      if (G >= G1) return total;
      const u = (G - G0) / h;
      const i = Math.floor(u);
      return at(acum, i) + (at(acum, i + 1) - at(acum, i)) * (u - i);
    };

    for (const G of CORTES) {
      const r = emG(G) / total;
      if (!Number.isFinite(r) || r < 0 || r > 1) {
        throw new PeErroDeDominio(`risco inválido para o corte de ${G} semanas`);
      }
      riscos[G] = r;
    }
  }

  const marcadores: PeMarcador[] = mk.map((m) => ({
    nome: m.nome, mom: m.mom, truncado: m.truncado,
  }));
  const umEmN = riscos[37] > 0 ? Math.round(1 / riscos[37]) : Infinity;
  const altoRisco = riscos[37] >= PE_CORTE_ALTO_RISCO;

  return {
    versaoParametros: PE_VERSAO_PARAMETROS,
    priorMean, priorSd: SIGMA, gCurrent,
    marcadores, riscos, umEmN, altoRisco,
    insertBloco: formatarBlocoPreEclampsia(g, med, marcadores, umEmN, altoRisco),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloco de laudo
// ─────────────────────────────────────────────────────────────────────────────

const n1 = (v: number) => v.toFixed(1).replace(".", ",");
const n2 = (v: number) => v.toFixed(2).replace(".", ",");
const milhar = (n: number) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function formatarBlocoPreEclampsia(
  g: PeGestante,
  med: PeMedidas,
  marcadores: PeMarcador[],
  umEmN: number,
  altoRisco: boolean
): string {
  const sem = Math.floor(g.gaDias / 7);
  const dias = g.gaDias % 7;

  const usados = ["história materna"];
  if (med.pamMmHg != null) usados.push("PAM");
  if (med.utaPiMedio != null) usados.push("IP das artérias uterinas");

  const linhas: string[] = [
    "RASTREIO DE PRÉ-ECLÂMPSIA (1º trimestre)",
    "",
    `Idade gestacional: ${sem} semanas e ${dias} dias`,
  ];

  if (med.pamMmHg != null) {
    const mom = marcadores.find((m) => m.nome === "map");
    const n = med.afericoesPam ?? null;
    const origem =
      n == null ? ""
      : n >= 4 ? " (4 aferições)"
      : n === 1 ? " (aferição única)"
      : ` (${n} aferições)`;
    linhas.push(
      `Pressão arterial média: ${n1(med.pamMmHg)} mmHg${origem}` +
        (mom ? ` — ${n2(mom.mom)} MoM` : "")
    );
  }
  if (med.utaPiMedio != null) {
    const mom = marcadores.find((m) => m.nome === "utaPi");
    linhas.push(
      `IP médio das artérias uterinas: ${n2(med.utaPiMedio)}` +
        (mom ? ` (${n2(mom.mom)} MoM)` : "")
    );
  }

  linhas.push(
    "",
    `Risco de pré-eclâmpsia com parto antes de 37 semanas: 1 em ${milhar(umEmN)}`,
    `Calculado com: ${usados.join(", ")}.`,
    ""
  );

  if (altoRisco) {
    linhas.push(
      "Risco AUMENTADO para pré-eclâmpsia pré-termo (corte de 1 em 100).",
      "Recomenda-se profilaxia com ácido acetilsalicílico 150 mg à noite, do " +
        "primeiro trimestre até 36 semanas, conforme o ensaio ASPRE, a critério " +
        "do médico assistente."
    );
  } else {
    linhas.push(
      "Risco não aumentado para pré-eclâmpsia pré-termo (corte de 1 em 100).",
      "Seguimento pré-natal de rotina."
    );
  }

  const ressalvas: string[] = [];
  if (med.afericoesPam != null && med.afericoesPam < 4) {
    ressalvas.push(
      "a pressão arterial média foi obtida de " +
        (med.afericoesPam === 1 ? "uma única aferição" : `${med.afericoesPam} aferições`) +
        "; o protocolo da Fetal Medicine Foundation prevê quatro (ambos os " +
        "braços, duas vezes), o que reduz a variabilidade da medida"
    );
  }
  if (marcadores.some((m) => m.truncado)) {
    ressalvas.push(
      "valor de marcador fora da faixa do modelo, truncado conforme a especificação"
    );
  }
  if (ressalvas.length > 0) {
    linhas.push("", `Ressalvas: ${ressalvas.join("; ")}.`);
  }

  linhas.push(
    "",
    "Baseado no modelo de riscos competitivos da Fetal Medicine Foundation " +
      "(Wright D, Wright A, Nicolaides KH. Am J Obstet Gynecol 2020;223:12-23). " +
      "Não constitui software certificado pela FMF."
  );

  return linhas.join("\n");
}
