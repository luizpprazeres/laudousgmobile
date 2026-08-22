/**
 * MoM dos marcadores biofísicos — 1º TRIMESTRE (11+0 a 13+6).
 *
 * PAM:  Wright A, Wright D, Ispas CA, Poon LC, Nicolaides KH.
 *       "Mean arterial pressure in the three trimesters of pregnancy: effects of
 *        maternal characteristics and clinical factors."
 *        Ultrasound Obstet Gynecol 2015;45:698-706. Tabela 2. DP: Tabela 3.
 *
 * UtA-PI: Tayyar A, Guerra L, Wright A, Wright D, Nicolaides KH.
 *       "Uterine artery pulsatility index in the three trimesters of pregnancy:
 *        effects of maternal characteristics and medical history."
 *        Ultrasound Obstet Gynecol 2015;45:689-697. Tabela 2. DP: Tabela 3.
 *
 * Ambos modelam log10(mediana esperada). MoM = medido / mediana esperada.
 * `ga` em DIAS, centrado em 77. Peso em kg (−69), altura em cm (−164),
 * idade em anos (−35). Intervalo entre gestações em ANOS.
 */

const I = (b) => (b ? 1 : 0);

/** log10 da PAM esperada — Wright A 2015, Tabela 2 (efeitos de 1º trimestre). */
export function log10MapEsperada(p) {
  const ga = p.gaDias - 77;
  const wt = p.peso - 69;
  const ht = p.altura - 164;
  const age = p.idade - 35;
  const afro = I(p.etnia === 'afro');
  const has = I(p.hipertensaoCronica);

  return 1.943223919
    + 0.000209037 * ga
    - 0.000020452 * ga * ga
    + 0.000439271 * age                    // efeito de idade é específico do 1º tri
    + 0.001193313 * wt
    - 0.000008823 * wt * wt
    - 0.000206306 * ht
    - 0.004523672 * I(p.fumante)
    - 0.001191227 * afro
    - 0.000050679 * afro * ga
    + 0.051007216 * has
    - 0.000421118 * has * wt               // interação HAS crônica × peso
    + 0.004445020 * I(p.diabetes)
    + 0.005976240 * I(p.histFamiliarPE)
    - 0.009402127 * I(p.paridade === 'multipara-sem-pe')
    + 0.000744526 * (p.paridade === 'multipara-sem-pe' ? p.intervaloAnos : 0)
    + 0.006091903 * I(p.paridade === 'multipara-com-pe');
}

/** log10 do IP uterino esperado — Tayyar 2015, Tabela 2 (efeitos de 1º trimestre). */
export function log10UtaPiEsperado(p) {
  const ga = p.gaDias - 77;
  const wt = p.peso - 69;
  const age = p.idade - 35;
  const comPE = p.paridade === 'multipara-com-pe';

  return 0.255731426
    - 0.004407905 * ga                      // efeito de 1º trimestre
    - 0.000888890 * wt
    + 0.000006006 * wt * wt
    + 0.000008322 * wt * ga
    - 0.001117349 * age
    + 0.000015061 * age * ga
    + 0.018069553 * I(p.etnia === 'afro')
    + 0.004971474 * I(comPE)
    - 0.006836336 * (comPE && p.zEscorePesoAnterior != null ? p.zEscorePesoAnterior : 0)
    - 0.005119599 * (comPE && p.igPartoAnterior != null ? p.igPartoAnterior - 40 : 0);
}

export const mapMoM    = (medida, p) => medida / Math.pow(10, log10MapEsperada(p));
export const utaPiMoM  = (medida, p) => medida / Math.pow(10, log10UtaPiEsperado(p));

/* ===================================================================== *
 *  FAMÍLIA DE PARÂMETROS VIGENTE — Wright D, Wright A, Nicolaides KH.
 *  "The competing risk approach for prediction of preeclampsia."
 *  Am J Obstet Gynecol 2020;223:12-23.e7 — APÊNDICE ("algorithm
 *  specification"), Tabelas 3, 4 e 5. É a especificação que a própria FMF
 *  publica como vigente. NÃO misturar com os valores do O'Gorman 2016.
 * ===================================================================== */

/**
 * Verossimilhança — média do log10 MoM em função da IG (em SEMANAS) ao parto
 * com PE. Wright 2020, Apêndice, Tabela 3 (visita de 12 semanas).
 * Regra do spec:  b0 + b1·t  se t < (−b0/b1);  senão 0.
 */
const VEROSSIMILHANCA_12S = {
  map:   { b0:  0.088997, b1: -0.0016711 },   // cruza 0 em 53,26 sem
  utaPi: { b0:  0.5861,   b1: -0.014233  },   // cruza 0 em 41,18 sem
  plgf:  { b0: -0.92352,  b1:  0.021584  },
};

/** Média esperada do log10 MoM do marcador, dado parto com PE em `gaSemanas`. */
export function mediaLog10MoM(marcador, gaSemanas) {
  const { b0, b1 } = VEROSSIMILHANCA_12S[marcador];
  const raiz = -b0 / b1;
  return gaSemanas < raiz ? b0 + b1 * gaSemanas : 0;
}

/**
 * Limites de truncamento do log10 MoM OBSERVADO — Wright 2020, Tabela 4.
 * Aplicados ao vetor `x` ANTES da densidade multivariada (o spec chama de
 * `log10(MoMT)`). Não confundir com o truncamento em zero da MÉDIA acima:
 * são duas regras distintas e ambas obrigatórias.
 */
export const TRUNC_LOG10_MOM_12S = {
  map:   [-0.1224076, 0.12240759],
  utaPi: [-0.4216152, 0.42161519],
  plgf:  [-0.5655099, 0.56550992],
};

/**
 * Matriz de COVARIÂNCIA (não correlação) — Wright 2020, Tabela 5, bloco de 12
 * semanas. O spec observa: "in the current configuration sigma.pe is also used
 * for normals" — uma matriz só serve aos dois grupos.
 */
export const COV_12S = {
  'map:map':     0.00141396,
  'utaPi:utaPi': 0.01630906,
  'map:utaPi':  -0.0002726,
  'plgf:plgf':   0.03147225,
  'map:plgf':   -0.0001907,
  'utaPi:plgf': -0.0034539,
};

/** Covariância entre dois marcadores, na ordem que vier. */
export function cov(a, b) {
  const v = COV_12S[`${a}:${b}`] ?? COV_12S[`${b}:${a}`];
  if (v === undefined) throw new Error(`covariância ausente para ${a}×${b}`);
  return v;
}
