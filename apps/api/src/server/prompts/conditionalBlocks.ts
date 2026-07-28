import { ABDOMEN_POLIPO_BLOCK } from "./contracts/ABDOMEN_TOTAL";
import { PELVE_ANEXIAL_BLOCK } from "./contracts/PELVE_FEMININA";
import { TIREOIDE_HASHIMOTO_BLOCK } from "./contracts/TIREOIDE";
import { PLACENTA_BLOCK } from "./contracts/OBSTETRICA";

type ConditionalPromptBlock = {
  categoryCode: string;
  triggerRegex: RegExp;
  block: string;
};

const CONDITIONAL_PROMPT_BLOCKS: readonly ConditionalPromptBlock[] = [
  {
    categoryCode: "PELVE_FEMININA",
    triggerRegex:
      /regi[aã]o\s+anexial|anexos?|anexial|paraovari|paratub/i,
    block: PELVE_ANEXIAL_BLOCK,
  },
  {
    categoryCode: "TIREOIDE",
    triggerRegex: /hashimoto/i,
    block: TIREOIDE_HASHIMOTO_BLOCK,
  },
  {
    categoryCode: "ABDOMEN_TOTAL",
    triggerRegex: /p[óo]lipo/i,
    block: ABDOMEN_POLIPO_BLOCK,
  },
  {
    categoryCode: "OBSTETRICA",
    triggerRegex: /\bplacent(?:a|as|ária|árias|ário|ários)\b/iu,
    block: PLACENTA_BLOCK,
  },
  {
    categoryCode: "DOPPLER_OBSTETRICO",
    triggerRegex: /\bplacent(?:a|as|ária|árias|ário|ários)\b/iu,
    block: PLACENTA_BLOCK,
  },
];

export function resolveConditionalPromptBlocks(
  categoryCode: string,
  rawInput: string,
): string[] {
  return CONDITIONAL_PROMPT_BLOCKS.filter(
    (entry) =>
      entry.categoryCode === categoryCode &&
      entry.triggerRegex.test(rawInput),
  ).map((entry) => entry.block);
}
