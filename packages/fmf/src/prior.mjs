/**
 * Modelo A PRIORI de pré-eclâmpsia — riscos competitivos da FMF.
 * Fonte: Wright D, Syngelaki A, Akolekar R, Poon LC, Nicolaides KH.
 *   "Competing risks model in screening for preeclampsia by maternal
 *    characteristics and medical history." Am J Obstet Gynecol 2015;213:62.e1-10.
 *   Tabela 2 (coeficientes) + σ = 6,8833 semanas.
 *
 * Devolve a MÉDIA (em semanas) da distribuição gaussiana da idade gestacional
 * ao parto COM pré-eclâmpsia. Risco antes de g = Φ((g − µ)/σ).
 *
 * ⚠️ Ainda SEM os marcadores (PAM, uterinas) — isto é só o a priori.
 */

export const SIGMA = 6.8833;

// Sinais conferidos pelos intervalos de confiança de 95% da Tabela 2,
// porque a extração de texto do PDF perde o sinal de menos.
const C = {
  constante:              54.3637,
  idadeAcima35:           -0.206886,   // IC −0,27 a −0,145 ; 0 se idade < 35
  altura:                  0.117110,   // IC 0,098 a 0,136 ; (altura_cm − 164)
  afroCaribenha:          -2.6786,     // IC −2,96 a −2,40
  sulAsiatica:            -1.1290,     // IC −1,65 a −0,61
  hipertensaoCronica:     -7.2897,     // IC −7,87 a −6,71
  lesSaf:                 -3.0519,     // IC −4,92 a −1,18
  fiv:                    -1.6327,     // IC −2,27 a −0,99
  // multípara COM PE anterior
  multipComPE:            -8.1667,     // IC −9,24 a −7,09
  multipComPE_igAnt2:      0.0271988,  // IC 0,0221 a 0,032 ; (IG_anterior − 24)²
  // multípara SEM PE anterior
  multipSemPE:            -4.3350,     // IC −5,81 a −2,86
  multipSemPE_int1:       -4.15137651, // IC −6,71 a −1,60 ; intervalo^(−1), anos
  multipSemPE_intMeio:     9.21473572, // IC 5,60 a 12,83 ; intervalo^(−0,5)
  multipSemPE_igAnt2:      0.01549673, // IC 0,0119 a 0,0191 ; (IG_anterior − 24)²
  // SÓ para mulheres SEM hipertensão crônica
  peso_semHAS:            -0.0694096,  // IC −0,0773 a −0,0615 ; (peso_kg − 69)
  histFamiliarPE_semHAS:  -1.7154,     // IC −2,23 a −1,20
  diabetes_semHAS:        -3.3899,     // IC −4,41 a −2,37
};

/**
 * @param p.idade anos
 * @param p.peso kg
 * @param p.altura cm
 * @param p.etnia 'branca'|'afro'|'sul-asiatica'|'leste-asiatica'|'mista'
 * @param p.hipertensaoCronica boolean
 * @param p.diabetes boolean (tipo 1 ou 2)
 * @param p.lesSaf boolean (LES / síndrome antifosfolípide)
 * @param p.fiv boolean (concepção por FIV)
 * @param p.histFamiliarPE boolean (mãe com PE)
 * @param p.paridade 'nulipara'|'multipara-sem-pe'|'multipara-com-pe'
 * @param p.igPartoAnterior semanas (só multíparas)
 * @param p.intervaloAnos anos desde o parto anterior (só multíparas)
 */
/**
 * Truncamento das características maternas — Wright 2020, Apêndice, Tabela 1.
 * O spec oficial manda aplicar ANTES de calcular a média. Sem isso, uma
 * paciente de 200 kg entra com peso 200 no modelo em vez de 190.
 */
export const TRUNC = {
  idade:            [12, 55],
  peso:             [34, 190],
  altura:           [127, 198],
  intervaloAnos:    [0.25, 15],
  igPartoAnterior:  [24, 42],
};
const trunc = (v, [lo, hi]) => Math.min(Math.max(v, lo), hi);

/** Média com um ramo de HAS explícito — usado pela salvaguarda abaixo. */
function mediaComRamoHAS(p0, comHAS) {
  const p = {
    ...p0,
    idade:  trunc(p0.idade,  TRUNC.idade),
    peso:   trunc(p0.peso,   TRUNC.peso),
    altura: trunc(p0.altura, TRUNC.altura),
    intervaloAnos:   p0.intervaloAnos   == null ? null : trunc(p0.intervaloAnos,   TRUNC.intervaloAnos),
    igPartoAnterior: p0.igPartoAnterior == null ? null : trunc(p0.igPartoAnterior, TRUNC.igPartoAnterior),
  };
  let mu = C.constante;

  mu += C.idadeAcima35 * Math.max(0, p.idade - 35);
  mu += C.altura * (p.altura - 164);

  if (p.etnia === 'afro') mu += C.afroCaribenha;
  if (p.etnia === 'sul-asiatica') mu += C.sulAsiatica;

  if (p.lesSaf) mu += C.lesSaf;
  if (p.fiv) mu += C.fiv;

  if (comHAS) {
    // Efeitos de peso, história familiar e diabetes NÃO se somam à HAS crônica.
    mu += C.hipertensaoCronica;
  } else {
    mu += C.peso_semHAS * (p.peso - 69);
    if (p.histFamiliarPE) mu += C.histFamiliarPE_semHAS;
    if (p.diabetes) mu += C.diabetes_semHAS;
  }

  if (p.paridade === 'multipara-com-pe') {
    mu += C.multipComPE;
    mu += C.multipComPE_igAnt2 * Math.pow(p.igPartoAnterior - 24, 2);
  } else if (p.paridade === 'multipara-sem-pe') {
    mu += C.multipSemPE;
    mu += C.multipSemPE_int1 * Math.pow(p.intervaloAnos, -1);
    mu += C.multipSemPE_intMeio * Math.pow(p.intervaloAnos, -0.5);
    mu += C.multipSemPE_igAnt2 * Math.pow(p.igPartoAnterior - 24, 2);
  }

  return mu;
}

export function mediaIgPartoComPE(p) {
  if (!p.hipertensaoCronica) return mediaComRamoHAS(p, false);

  // SALVAGUARDA DA HAS CRÔNICA — Wright 2015, p. 62.e7:
  //   "In extreme cases [...] the model predicts that those with a family history
  //    of preeclampsia, diabetes mellitus, and weight in excess of 100.5 kg will
  //    be protected by chronic hypertension. From the clinical perspective, this
  //    is implausible, and in practical applications, it should be avoided by
  //    taking the minimum of the means from the model with and without chronic
  //    hypertension."
  // Sem isto, obesa + diabética + história familiar COM HAS sai com risco MENOR
  // do que a mesma mulher sem HAS. Média menor = risco maior.
  return Math.min(mediaComRamoHAS(p, true), mediaComRamoHAS(p, false));
}

/**
 * erfc por aproximação racional de Chebyshev (Numerical Recipes `erfcc`).
 * Erro fracionário < 1,2e-7 em todo o domínio — sobra para riscos de 1 em 10.000.
 */
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const ans = t * Math.exp(
    -z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? ans : 2 - ans;
}

/** Φ — função de distribuição acumulada da normal padrão. */
export function pnorm(z) {
  return 0.5 * erfc(-z / Math.SQRT2);
}

/** Risco a priori de PE com parto antes de `semanas`. */
export function riscoAntesDe(p, semanas) {
  const mu = mediaIgPartoComPE(p);
  return pnorm((semanas - mu) / SIGMA);
}

export const umEmN = (r) => (r > 0 ? Math.round(1 / r) : Infinity);
