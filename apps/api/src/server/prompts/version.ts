import { createHash } from "node:crypto";
import {
  ABDOMEN_TOTAL_CONTRACT,
  ABDOMEN_TOTAL_MODELO_BASE,
  ABDOMEN_TOTAL_MODELO_OBJETIVO,
} from "./contracts/ABDOMEN_TOTAL";
import {
  DOPPLER_OBSTETRICO_CONTRACT,
  DOPPLER_OBSTETRICO_MODELO_BASE,
  DOPPLER_OBSTETRICO_MODELO_OBJETIVO,
} from "./contracts/DOPPLER_OBSTETRICO";
import {
  MAMARIA_CONTRACT,
  MAMARIA_MODELO_BASE,
  MAMARIA_MODELO_OBJETIVO,
} from "./contracts/MAMARIA";
import {
  OBSTETRICA_CONTRACT,
  OBSTETRICA_MODELO_OBJETIVO,
  OBSTETRICA_MODELO_PADRAO,
} from "./contracts/OBSTETRICA";
import {
  PELVE_FEMININA_CONTRACT,
  PELVE_FEMININA_MODELO_BASE,
  PELVE_FEMININA_MODELO_OBJETIVO,
} from "./contracts/PELVE_FEMININA";
import {
  TIREOIDE_CONTRACT,
  TIREOIDE_MODELO_BASE,
  TIREOIDE_MODELO_OBJETIVO,
} from "./contracts/TIREOIDE";

// Bump obrigatório quando qualquer contract, modelo base ou regra global mudar.
export const PROMPT_VERSION = "v1.4";

const OBJECTIVE_STYLE_ID = "44444444-4444-4444-8444-444444444444";

const CONTRACTS: Record<string, string> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_CONTRACT,
  DOPPLER_OBSTETRICO: DOPPLER_OBSTETRICO_CONTRACT,
  MAMARIA: MAMARIA_CONTRACT,
  OBSTETRICA: OBSTETRICA_CONTRACT,
  PELVE_FEMININA: PELVE_FEMININA_CONTRACT,
  TIREOIDE: TIREOIDE_CONTRACT,
};

const MODELOS_BASE: Record<string, string> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_MODELO_BASE,
  DOPPLER_OBSTETRICO: DOPPLER_OBSTETRICO_MODELO_BASE,
  MAMARIA: MAMARIA_MODELO_BASE,
  OBSTETRICA: OBSTETRICA_MODELO_PADRAO,
  PELVE_FEMININA: PELVE_FEMININA_MODELO_BASE,
  TIREOIDE: TIREOIDE_MODELO_BASE,
};

const MODELOS_OBJETIVO: Record<string, string> = {
  ABDOMEN_TOTAL: ABDOMEN_TOTAL_MODELO_OBJETIVO,
  DOPPLER_OBSTETRICO: DOPPLER_OBSTETRICO_MODELO_OBJETIVO,
  MAMARIA: MAMARIA_MODELO_OBJETIVO,
  OBSTETRICA: OBSTETRICA_MODELO_OBJETIVO,
  PELVE_FEMININA: PELVE_FEMININA_MODELO_OBJETIVO,
  TIREOIDE: TIREOIDE_MODELO_OBJETIVO,
};

export function getVersionedContract(category: string): string {
  return CONTRACTS[category] ?? "";
}

export function getVersionedModeloBase(
  category: string,
  writingStyleId?: string,
): string {
  const models =
    writingStyleId === OBJECTIVE_STYLE_ID ? MODELOS_OBJETIVO : MODELOS_BASE;
  return models[category] ?? "";
}

export function contractHashFor(
  category: string,
  writingStyleId: string,
): string {
  const composed = [
    PROMPT_VERSION,
    category,
    writingStyleId,
    getVersionedContract(category),
    getVersionedModeloBase(category, writingStyleId),
  ].join("::");
  return createHash("sha256").update(composed).digest("hex");
}
