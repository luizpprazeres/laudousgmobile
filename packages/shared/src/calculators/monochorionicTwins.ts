/**
 * Gestação gemelar monocoriônica — núcleo numérico da calculadora Barcelona.
 *
 * Port das funções `getEFWPercentile`, `percentileACNew`, `MoMs` e
 * `getEFWdiscordace` do calc.js oficial consultado em 05/10/2026. A página
 * oficial informa que a calculadora está em atualização; por isso este módulo
 * calcula medidas e percentis, mas não fecha STFF, TAPS ou RCF seletiva sem os
 * estados clínicos explicitamente confirmados pelo médico.
 */

export const GEMELAR_BARCELONA_ENGINE_VERSION = "FMB-CALCULATOR-V2021";
export const GEMELAR_BARCELONA_SOURCE =
  "https://fetalmedicinebarcelona.org/calc/js/calc.js";

export type SexoFetalGemelar = "feminino" | "masculino";

export type PercentilGemelar = {
  valor: number;
  esperado: number;
  desvioPadrao: number;
  zScore: number;
  percentil: number;
};

export type PsvAcmGemelar = {
  valorCmS: number;
  esperadoCmS: number;
  mom: number;
};

function validarIdadeGestacional(semanas: number, dias: number): number {
  if (!Number.isInteger(semanas) || !Number.isInteger(dias) || dias < 0 || dias > 6) {
    throw new RangeError("Idade gestacional deve ser informada em semanas inteiras e dias de 0 a 6.");
  }
  return semanas + dias / 7;
}

function validarPositivo(valor: number, campo: string): void {
  if (!Number.isFinite(valor) || valor <= 0) throw new RangeError(`${campo} deve ser positivo.`);
}

/**
 * Mesma série do `GetZPercent` oficial. A sentinela superior retorna 100%,
 * coerente com a unidade percentual usada pelo restante da função.
 */
export function percentilNormalBarcelona(z: number): number {
  if (!Number.isFinite(z)) throw new RangeError("Z-score inválido.");
  if (z < -6.5) return 0;
  if (z > 6.5) return 100;
  let fatorial = 1;
  let soma = 0;
  let termo = 1;
  let k = 0;
  const limite = Math.exp(-23);
  while (Math.abs(termo) > limite) {
    termo = 0.3989422804 * ((-1) ** k) * (z ** k) / (2 * k + 1) / (2 ** k) * (z ** (k + 1)) / fatorial;
    soma += termo;
    k += 1;
    fatorial *= k;
  }
  return (soma + 0.5) * 100;
}

/** PFE gemelar monocoriônico: curva específica por sexo, válida de 24 a 40 semanas. */
export function percentilPesoGemelarMonocorionico(input: {
  semanas: number;
  dias: number;
  sexo: SexoFetalGemelar;
  pesoG: number;
}): PercentilGemelar {
  const ga = validarIdadeGestacional(input.semanas, input.dias);
  if (ga < 24 || ga > 40 + 6 / 7) {
    throw new RangeError("A curva de peso gemelar monocoriônico é aceita entre 24 e 40 semanas e 6 dias.");
  }
  validarPositivo(input.pesoG, "Peso fetal estimado");
  const feminino = input.sexo === "feminino";
  const esperado = feminino
    ? -802.062 - 3.150 * ga + 2.660 * ga ** 2 - 43.429
    : -862.626 - 2.861 * ga + 2.650 * ga ** 2 + 56.695;
  const variancia = feminino
    ? 225994.844 + 2 * -9904.393 * ga + 435.527 * ga ** 2 + 8250.502
    : 233312.938 + 2 * -10190.313 * ga + 447.121 * ga ** 2 + 8752.502;
  if (variancia <= 0) throw new RangeError("Variância inválida para a idade gestacional informada.");
  const desvioPadrao = Math.sqrt(variancia);
  const zScore = (input.pesoG - esperado) / desvioPadrao;
  return {
    valor: input.pesoG,
    esperado,
    desvioPadrao,
    zScore,
    percentil: Math.round(percentilNormalBarcelona(zScore)),
  };
}

/** CA para o período anterior a 24 semanas, conforme `percentileACNew`. */
export function percentilCaGemelar(input: {
  semanas: number;
  dias: number;
  caMm: number;
}): PercentilGemelar {
  const ga = validarIdadeGestacional(input.semanas, input.dias);
  if (ga < 14 || ga >= 24) {
    throw new RangeError("A curva precoce de CA gemelar é aceita entre 14 e 23 semanas e 6 dias.");
  }
  validarPositivo(input.caMm, "Circunferência abdominal");
  const esperado = 10 * (-13.3 + 1.61 * ga - 0.00998 * ga ** 2);
  const desvioPadrao = 13.4;
  const zScore = (input.caMm - esperado) / desvioPadrao;
  return {
    valor: input.caMm,
    esperado,
    desvioPadrao,
    zScore,
    percentil: Math.round(percentilNormalBarcelona(zScore)),
  };
}

/** Discordância relativa ao maior valor, com uma casa decimal para o laudo. */
export function discordanciaGemelar(valorA: number, valorB: number): number {
  validarPositivo(valorA, "Valor do feto A");
  validarPositivo(valorB, "Valor do feto B");
  const maior = Math.max(valorA, valorB);
  return Math.round((Math.abs(valorA - valorB) * 100 / maior) * 10) / 10;
}

/** PSV-ACM em MoM, sem classificar TAPS isoladamente. */
export function psvAcmMomGemelar(input: {
  semanas: number;
  dias: number;
  psvCmS: number;
}): PsvAcmGemelar {
  const ga = validarIdadeGestacional(input.semanas, input.dias);
  if (ga < 14 || ga > 40 + 6 / 7) {
    throw new RangeError("PSV-ACM gemelar é aceita entre 14 e 40 semanas e 6 dias.");
  }
  validarPositivo(input.psvCmS, "PSV-ACM");
  const esperadoCmS = Math.exp(2.31 + 0.046 * ga);
  return {
    valorCmS: input.psvCmS,
    esperadoCmS,
    mom: input.psvCmS / esperadoCmS,
  };
}
