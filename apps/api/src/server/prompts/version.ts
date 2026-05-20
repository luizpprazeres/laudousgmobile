import { createHash } from "node:crypto";
import {
  ABDOMEN_TOTAL_CONTRACT,
  ABDOMEN_TOTAL_MODELO_BASE,
} from "./contracts/ABDOMEN_TOTAL";
import {
  DOPPLER_OBSTETRICO_CONTRACT,
  DOPPLER_OBSTETRICO_MODELO_BASE,
} from "./contracts/DOPPLER_OBSTETRICO";
import {
  MAMARIA_CONTRACT,
  MAMARIA_MODELO_BASE,
} from "./contracts/MAMARIA";
import { OBSTETRICA_CONTRACT } from "./contracts/OBSTETRICA";
import {
  PELVE_FEMININA_CONTRACT,
  PELVE_FEMININA_MODELO_BASE,
} from "./contracts/PELVE_FEMININA";
import {
  TIREOIDE_CONTRACT,
  TIREOIDE_MODELO_BASE,
} from "./contracts/TIREOIDE";

// Bump obrigatório quando qualquer contract, modelo base ou regra global mudar.
export const PROMPT_VERSION = "v1.3";

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
  PELVE_FEMININA: PELVE_FEMININA_MODELO_BASE,
  TIREOIDE: TIREOIDE_MODELO_BASE,
};

export function getVersionedContract(category: string): string {
  return CONTRACTS[category] ?? "";
}

export function getVersionedModeloBase(category: string): string {
  return MODELOS_BASE[category] ?? "";
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
    getVersionedModeloBase(category),
  ].join("::");
  return createHash("sha256").update(composed).digest("hex");
}
