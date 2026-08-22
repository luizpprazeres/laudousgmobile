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

/**
 * CALIBRAÇÃO EMPÍRICA da interação `HAS crônica × peso` no modelo de MoM da PAM.
 *
 * Wright A 2015, Tabela 2, publica −0,000421118 por kg acima de 69. O software
 * oficial da FMF (v1.0.44) usa um valor diferente. Medimos 7 pontos à mão, no
 * app, variando SÓ peso e hipertensão crônica (mesma paciente no resto):
 *
 *   peso  HAS   MoM PAM que o FMF exibiu
 *    69   não   1,07        69   sim   0,95
 *    95   não   1,01        95   sim   0,91
 *   120   não   0,98       120   sim   0,89
 *   120   não   0,99  (a 13s6d — confirma que os termos de IG estão certos)
 *
 * O desvio é ZERO em 69 kg (onde a interação não atua) e cresce linearmente com
 * o peso — assinatura de que o efeito PRINCIPAL da HAS está certo e só a
 * inclinação da interação difere. Ajuste de 2 parâmetros nos 7 pontos:
 * resíduo máximo 0,23% no MoM, contra ±0,5% de incerteza do próprio
 * arredondamento de 2 casas da tela. Ou seja: explica os dados até o limite do
 * que eles conseguem distinguir.
 *
 * Sobrava também um deslocamento CONSTANTE de +0,00357 em log10 (0,83% no MoM),
 * a princípio confundido entre intercepto, idade, diabetes e história familiar —
 * todos fixos naqueles 7 pontos. Um **8º ponto** (mesmo perfil, 69 kg, sem HAS,
 * **sem diabetes e sem história familiar**, 13s6d → FMF exibiu 1,11) separou:
 *
 *   - o resíduo NÃO mudou ao remover diabetes e história familiar
 *     (0,00463 contra 0,0033–0,0036, dentro da incerteza) ⇒ não vem delas;
 *   - altura, etnia, paridade e tabagismo contribuem ZERO nesses pontos
 *     (todos na categoria de referência ou centrados em zero);
 *   - se viesse do coeficiente de IDADE, ele teria de ser 1,199e-3 — **2,7× o
 *     publicado** e muito fora do IC95% [3,955e-4; 4,830e-4]. Implausível.
 *
 * Resta o INTERCEPTO. Com a interação corrigida, os 8 resíduos têm dispersão de
 * 0,00175 em log10, contra ~0,0040 de amplitude que o próprio arredondamento de
 * 2 casas já produz. É constante. Aplicado globalmente.
 *
 * ⚠️ Isto é calibração empírica contra o comportamento observado, não parâmetro
 * publicado. Substituir assim que a FMF fornecer os valores vigentes — o
 * apêndice de 2020 diz que eles estão em fetalmedicine.com, mas não achamos a
 * página; o caminho é `softwaresupport@fetalmedicine.org`.
 */
export const CAL_MAP_HAS_PESO  = -1.8859e-4;    // substitui −4.211180e-4
export const CAL_MAP_INTERCEPTO = -0.003568;    // soma a 1.943223919 (NEGATIVO:
// o MoM da FMF é MAIOR que o nosso ⇒ a mediana dela é MENOR ⇒ baixa o intercepto)
export const CAL_ORIGEM = 'medição manual no FMF v1.0.44 em 22/08/2026, 8 pontos';

/** log10 da PAM esperada — Wright A 2015, Tabela 2 (efeitos de 1º trimestre). */
export function log10MapEsperada(p) {
  const ga = p.gaDias - 77;
  const wt = p.peso - 69;
  const ht = p.altura - 164;
  const age = p.idade - 35;
  const afro = I(p.etnia === 'afro');
  const has = I(p.hipertensaoCronica);

  return 1.943223919 + CAL_MAP_INTERCEPTO   // intercepto CALIBRADO (ver acima)
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
    + CAL_MAP_HAS_PESO * has * wt          // interação HAS × peso — CALIBRADA (ver acima)
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
