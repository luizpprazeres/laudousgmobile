/**
 * Mapa categoria → contrato. O contrato é o primeiro bloco do system message,
 * antes do GLOBAL_RULES_BLOCK. Ver ordem completa em prompts/global.ts.
 *
 * Categorias sem contrato disponível ainda caem no DEFAULT_SYSTEM_MESSAGE
 * (apenas DOPPLER no original — sem prompt nativo).
 *
 * À medida que processarmos mais arquivos do _extraction/03-models-by-category/,
 * adicionar novos imports aqui.
 */
import { ABDOMEN_TOTAL_CONTRACT } from "./ABDOMEN_TOTAL";
import { TIREOIDE_CONTRACT } from "./TIREOIDE";
import { MAMARIA_CONTRACT } from "./MAMARIA";
import { PELVE_FEMININA_CONTRACT } from "./PELVE_FEMININA";
import { OBSTETRICA_CONTRACT } from "./OBSTETRICA";

export const CATEGORY_CONTRACTS: Record<string, string> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_CONTRACT,
  TIREOIDE: TIREOIDE_CONTRACT,
  MAMARIA: MAMARIA_CONTRACT,
  PELVE_FEMININA: PELVE_FEMININA_CONTRACT,
  OBSTETRICA: OBSTETRICA_CONTRACT,
  // Alpha 5×1 FECHADO (P3=A). Próximas fases:
  // - β: DIRETO_OBJETIVO + DETALHADO_PROTOCOLAR pra estas 5 categorias
  // - γ: expandir cobertura pra 28 categorias restantes
};

export function getCategoryContract(code: string): string | null {
  return CATEGORY_CONTRACTS[code] ?? null;
}
