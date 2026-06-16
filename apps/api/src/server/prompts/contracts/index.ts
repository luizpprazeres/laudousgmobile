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
import type { WritingStyleCode } from "@laudousg/shared";
import {
  ABDOMEN_TOTAL_CONTRACT,
  ABDOMEN_TOTAL_MODELO_OBJETIVO,
} from "./ABDOMEN_TOTAL";
import { MAMARIA_CONTRACT, MAMARIA_MODELO_OBJETIVO } from "./MAMARIA";
import {
  OBSTETRICA_CONTRACT,
  OBSTETRICA_MODELO_OBJETIVO,
} from "./OBSTETRICA";
import {
  PELVE_FEMININA_CONTRACT,
  PELVE_FEMININA_MODELO_OBJETIVO,
} from "./PELVE_FEMININA";
import { TIREOIDE_CONTRACT, TIREOIDE_MODELO_OBJETIVO } from "./TIREOIDE";
import { toObjectiveContract, toObjectiveHeaders } from "./objective";

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

// DOPPLER_OBSTETRICO saiu daqui (2026-06-16): seu estilo objetivo agora vem do
// bundle (clássico convertido — migration 0015), igual ao DOPPLER_RENAL/VENOSO,
// em vez de um modelo objetivo "abstrato" próprio que conflitava com o bundle.
const OBJECTIVE_ONLY_CONTRACTS: Record<string, string> = {};

const OBJECTIVE_MODELS: Record<string, string> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_MODELO_OBJETIVO,
  MAMARIA: MAMARIA_MODELO_OBJETIVO,
  OBSTETRICA: OBSTETRICA_MODELO_OBJETIVO,
  PELVE_FEMININA: PELVE_FEMININA_MODELO_OBJETIVO,
  TIREOIDE: TIREOIDE_MODELO_OBJETIVO,
};

export function getCategoryContract(
  code: string,
  writingStyleCode: WritingStyleCode,
): string | null {
  const contract =
    CATEGORY_CONTRACTS[code] ??
    (writingStyleCode === "OBJETIVO" ? OBJECTIVE_ONLY_CONTRACTS[code] : null);
  if (!contract) return null;
  if (writingStyleCode !== "OBJETIVO") return contract;

  const objectiveModel = OBJECTIVE_MODELS[code];
  const objectiveContract = toObjectiveContract(contract);
  if (!objectiveModel) return objectiveContract;
  return `${objectiveContract}

MODELO BASE OBJETIVO — USE ESTES CABEÇALHOS:
${objectiveModel}

REGRAS DO MODELO OBJETIVO:
- O modelo acima substitui integralmente o modelo-base clássico.
- Preencha ACHADOS e IMPRESSÃO somente com dados ditados pelo médico.
- NÃO emita placeholders "____".
- NÃO copie frases normais do modelo clássico quando o médico não as informou.
- Use exatamente a TÉCNICA curta do modelo objetivo. Não acrescente documentação fotográfica.
- Não inclua rodapés explicativos ou créditos bibliográficos no modo objetivo.
- Preserve todas as medidas, lateralidades, classificações e negações relevantes informadas.
- Quando o input trouxer Feto 1/Feto 2, nódulo 1/nódulo 2, dois miomas, dois cistos ou outro padrão múltiplo, use linhas iniciadas literalmente por 1- e 2-.
- Cada linha enumerada deve começar em nova linha. Não escreva "1- ... 2- ..." na mesma linha.
- Nunca mantenha dois achados do mesmo tipo na mesma frase separados por "e".`;
}
