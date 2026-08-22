/**
 * Risco de pré-eclâmpsia — modelo de RISCOS COMPETITIVOS da FMF, 1º trimestre.
 *
 * ESPECIFICAÇÃO: Wright D, Wright A, Nicolaides KH. "The competing risk approach
 * for prediction of preeclampsia." Am J Obstet Gynecol 2020;223:12-23.e7 —
 * APÊNDICE, "Competing risk approach for prediction of PE: algorithm
 * specification". É o algoritmo que a própria FMF publica como vigente.
 *
 *   pe.mean(t) = b0 + b1·t  se t < (−b0/b1);  senão 0        (Tabela 3)
 *   h(t)       = dmvnorm(x, pe.mean(t), sigma.pe) · dnorm(t, prior.mean, prior.sd)
 *   r          = integ(h, g.current, g) / integ(h, g.current, ∞)
 *   g.current  = max(24, IG atual em semanas)
 *
 * onde `x` é o vetor de log10 MoM **truncado** pelos limites da Tabela 4.
 *
 * Risco A PRIORI: omitir o fator dmvnorm.
 */

import { mediaIgPartoComPE, SIGMA, pnorm, TRUNC } from './prior.mjs';
import { mapMoM, utaPiMoM, mediaLog10MoM, TRUNC_LOG10_MOM_12S, cov } from './mom.mjs';

export class ErroDeDominio extends Error {}

const LN_2PI = Math.log(2 * Math.PI);

/** log-densidade normal multivariada a partir da matriz de covariância (p = 1 ou 2). */
function logDmvnorm(x, media, S) {
  const p = x.length;
  if (p === 1) {
    const d = x[0] - media[0];
    return -0.5 * (d * d / S[0][0] + Math.log(S[0][0]) + LN_2PI);
  }
  const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
  if (!(det > 0)) throw new ErroDeDominio('matriz de covariância não é positiva definida');
  const d0 = x[0] - media[0], d1 = x[1] - media[1];
  // forma quadrática com a inversa de 2×2
  const q = (S[1][1] * d0 * d0 - 2 * S[0][1] * d0 * d1 + S[0][0] * d1 * d1) / det;
  return -0.5 * (q + Math.log(det) + p * LN_2PI);
}

const logDnorm = (t, mu, sd) => -0.5 * (((t - mu) / sd) ** 2 + LN_2PI) - Math.log(sd);

/** Janela da visita de 12 semanas — Wright 2020, Apêndice: 77 a 99 dias. */
export const JANELA_12S_DIAS = [77, 99];

const FAIXAS_MEDIDA = {
  pamMmHg:    [50, 180],
  utaPiMedio: [0.2, 6],
};

function exigirNumero(nome, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new ErroDeDominio(`${nome}: valor ausente ou inválido`);
  }
}

function validar(p, med) {
  for (const k of ['idade', 'peso', 'altura', 'gaDias']) exigirNumero(k, p[k]);

  const [d0, d1] = JANELA_12S_DIAS;
  if (p.gaDias < d0 || p.gaDias > d1) {
    throw new ErroDeDominio(
      `IG de ${p.gaDias} dias fora da janela de 1º trimestre do modelo (${d0}–${d1} dias)`);
  }
  // Idade/peso/altura são TRUNCADOS pelo spec (não rejeitados), mas valores
  // absurdos indicam erro de digitação e não devem passar silenciosamente.
  for (const [k, lim] of [['idade', [8, 70]], ['peso', [20, 300]], ['altura', [100, 230]]]) {
    if (p[k] < lim[0] || p[k] > lim[1]) {
      throw new ErroDeDominio(`${k}=${p[k]} implausível (aceito ${lim[0]}–${lim[1]})`);
    }
  }
  for (const k of Object.keys(FAIXAS_MEDIDA)) {
    if (med[k] == null) continue;
    exigirNumero(k, med[k]);
    const [lo, hi] = FAIXAS_MEDIDA[k];
    if (med[k] < lo || med[k] > hi) {
      throw new ErroDeDominio(`${k}=${med[k]} fora da faixa aceita (${lo}–${hi})`);
    }
  }
  // Sem imputação silenciosa — o modelo de MoM do IP uterino usa estes campos.
  if (p.paridade === 'multipara-com-pe') {
    if (p.igPartoAnterior == null) throw new ErroDeDominio('multípara com PE anterior exige a IG do parto anterior');
    if (p.zEscorePesoAnterior == null) throw new ErroDeDominio('multípara com PE anterior exige o Z-score do peso ao nascer anterior');
  }
  if (p.paridade === 'multipara-sem-pe') {
    if (p.igPartoAnterior == null) throw new ErroDeDominio('multípara exige a IG do parto anterior');
    if (!(p.intervaloAnos > 0)) throw new ErroDeDominio('multípara exige o intervalo entre gestações em anos (> 0)');
  }
  if (p.twins && p.twins !== 'Singleton') {
    throw new ErroDeDominio('modelo de feto único — gemelar exige a Tabela 2 do spec, ainda não implementada');
  }
}

const truncar = (v, [lo, hi]) => Math.min(Math.max(v, lo), hi);

export function riscoPreEclampsia(p, med = {}, cortes = [37, 34, 32]) {
  validar(p, med);

  const priorMean = mediaIgPartoComPE(p);
  const gCurrent = Math.max(24, p.gaDias / 7);

  // vetor x: log10 MoM TRUNCADO (Tabela 4)
  const mk = [];
  if (med.pamMmHg != null) {
    const mom = mapMoM(med.pamMmHg, p), bruto = Math.log10(mom);
    mk.push({ nome: 'map', mom, bruto, x: truncar(bruto, TRUNC_LOG10_MOM_12S.map) });
  }
  if (med.utaPiMedio != null) {
    const mom = utaPiMoM(med.utaPiMedio, p), bruto = Math.log10(mom);
    mk.push({ nome: 'utaPi', mom, bruto, x: truncar(bruto, TRUNC_LOG10_MOM_12S.utaPi) });
  }

  const saida = {
    versaoParametros: 'FMF/AJOG-2020',
    priorMean, priorSd: SIGMA, gCurrent,
    marcadores: mk.map((m) => ({
      nome: m.nome, mom: m.mom, truncado: m.x !== m.bruto,
    })),
    riscos: {},
  };

  // A priori puro: omitir dmvnorm (o spec diz isso explicitamente).
  if (mk.length === 0) {
    const base = pnorm((gCurrent - priorMean) / SIGMA);
    for (const G of cortes) {
      saida.riscos[G] = G <= gCurrent ? 0
        : (pnorm((G - priorMean) / SIGMA) - base) / (1 - base);
    }
    return saida;
  }

  const x = mk.map((m) => m.x);
  const S = mk.map((a) => mk.map((b) => cov(a.nome, b.nome)));

  const G0 = gCurrent, G1 = 100, N = 15200;      // passo ≈ 0,005 semana
  const h = (G1 - G0) / N;

  const logF = new Array(N + 1);
  let logMax = -Infinity;
  for (let i = 0; i <= N; i++) {
    const t = G0 + i * h;
    const media = mk.map((m) => mediaLog10MoM(m.nome, t));
    logF[i] = logDnorm(t, priorMean, SIGMA) + logDmvnorm(x, media, S);
    if (logF[i] > logMax) logMax = logF[i];
  }
  if (!Number.isFinite(logMax)) {
    throw new ErroDeDominio('verossimilhança degenerada — medidas incompatíveis com o modelo');
  }
  const f = logF.map((v) => Math.exp(v - logMax));

  const acum = new Array(N + 1).fill(0);
  for (let i = 2; i <= N; i += 2) {
    acum[i] = acum[i - 2] + (h / 3) * (f[i - 2] + 4 * f[i - 1] + f[i]);
  }
  for (let i = 1; i <= N; i += 2) acum[i] = (acum[i - 1] + acum[i + 1]) / 2;
  const total = acum[N];
  if (!(total > 0) || !Number.isFinite(total)) {
    throw new ErroDeDominio('integral do posterior nula ou não finita');
  }

  const emG = (G) => {
    if (G <= G0) return 0;
    if (G >= G1) return total;
    const u = (G - G0) / h, i = Math.floor(u);
    return acum[i] + (acum[i + 1] - acum[i]) * (u - i);
  };

  for (const G of cortes) {
    const r = emG(G) / total;
    if (!Number.isFinite(r) || r < 0 || r > 1) {
      throw new ErroDeDominio(`risco inválido para o corte de ${G} semanas`);
    }
    saida.riscos[G] = r;
  }
  return saida;
}

export const umEmN = (r) => (r > 0 ? Math.round(1 / r) : Infinity);
