/**
 * Temperaturas por categoria — herdadas do LaudoUSG original
 * (`lib/llm/client.ts:36-47` no repo legado, validadas em produção).
 *
 * Princípio: quanto mais determinístico o template, menor a temperatura.
 *  - Obstétrica/Doppler/Morfológico: 0.10 (template super-rígido)
 *  - Abdome/Tireoide/Mamária/Pelve: 0.15
 *  - MSK e default: 0.20 (mais variações)
 *
 * Estes valores valem para a etapa Writer.
 * Structurer e Sanity check usam 0.0 (output JSON estrito).
 */
const MAP: Record<string, number> = {
  // Obstétricos
  OBSTETRICA: 0.1,
  OBSTETRICIA_PRIMEIRO_TRIMESTRE: 0.1,
  OBSTETRICIA_SEGUNDO_TRIMESTRE: 0.1,
  OBSTETRICIA_TERCEIRO_TRIMESTRE: 0.1,
  MORFOLOGICO: 0.1,
  MORFOLOGICA_FETAL: 0.1,
  DOPPLER_OBSTETRICO: 0.1,
  DOPPLER: 0.1,

  // Estruturais "padrão"
  ABDOMEN_TOTAL: 0.15,
  ABDOME_TOTAL: 0.15, // alias
  TIREOIDE: 0.15,
  MAMARIA: 0.15,
  MAMA: 0.15, // alias
  PELVE_FEMININA: 0.15,
  VIAS_URINARIAS: 0.15,
  RINS_VIAS_URINARIAS: 0.15, // alias

  // MSK
  MUSCULOESQUELETICO: 0.2,
};

const DEFAULT_TEMP = 0.2;

export function temperatureForCategory(code: string): number {
  return MAP[code] ?? DEFAULT_TEMP;
}
