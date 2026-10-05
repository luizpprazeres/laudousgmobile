/**
 * Nomes clínicos exibidos ao usuário.
 *
 * Os códigos em SCREAMING_SNAKE_CASE continuam sendo o contrato estável entre
 * banco, API e clientes. Esta camada impede que esses identificadores vazem
 * para a interface quando uma tela recebe apenas o código da categoria.
 */
export const CATEGORY_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  OBSTETRICA: "Obstétrica",
  DOPPLER_OBSTETRICO: "Doppler obstétrico",
  MORFOLOGICO: "Morfológico",
  CERVICOMETRIA: "Cervicometria",
  ABDOMEN_TOTAL: "Abdome total",
  ABDOMEN_TOTAL_DOPPLER: "Abdome total com Doppler",
  ABDOMEN_SUPERIOR: "Abdome superior",
  ABDOME_SUPERIOR: "Abdome superior",
  PAREDE_ABDOMINAL: "Parede abdominal",
  VIAS_URINARIAS: "Vias urinárias",
  PELVE_FEMININA: "Pelve feminina",
  ESCROTAL: "Escrotal",
  REGIAO_INGUINAL: "Região inguinal",
  PROSTATA_TRANSRETAL: "Próstata transretal",
  PROSTATA_SUPRAPUBICA: "Próstata suprapúbica",
  TIREOIDE: "Tireoide",
  PARATIREOIDE: "Paratireoide",
  GLANDULAS_SALIVARES: "Glândulas salivares",
  CERVICAL: "Cervical",
  MAMARIA: "Mamas e axilas",
  PARTES_MOLES: "Partes moles",
  MUSCULOESQUELETICO: "Musculoesquelético",
  MUSCULOESQUELETICO_V2: "Musculoesquelético",
  MUSCULOESQUELETICO_RARAS: "Musculoesquelético — raras",
  DOPPLER: "Doppler",
  DOPPLER_CAROTIDAS: "Doppler de carótidas e vertebrais",
  DOPPLER_VENOSO_MMII: "Doppler venoso de membros inferiores",
  DOPPLER_VENOSO_MMII_MEDIDAS: "Doppler venoso de membros inferiores — completo",
  DOPPLER_ARTERIAL_MMII: "Doppler arterial de membros inferiores",
  DOPPLER_VENOSO_MMSS: "Doppler venoso de membros superiores",
  DOPPLER_ARTERIAL_MMSS: "Doppler arterial de membros superiores",
  DOPPLER_FISTULA_AV: "Doppler de fístula arteriovenosa",
  DOPPLER_MESENTERICO: "Doppler de artérias mesentéricas",
  DOPPLER_RENAL: "Doppler renal",
  DOPPLER_HEPATICO: "Doppler hepático",
  TRANSFONTANELA: "Transfontanela",
  OCULAR: "Ocular",
  TORAX: "Ultrassonografia de tórax",
  QUADRIL_INFANTIL: "Quadril infantil",
  LIVRE: "Laudo livre",
  TESTE: "Teste",
  ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA: "Abdome total + Próstata suprapúbica",
  MAMARIA__PELVE_FEMININA: "Mamas e axilas + Pelve feminina",
};

const UPPERCASE_TOKENS = new Set(["AV", "MMII", "MMSS", "USG", "BI", "RADS"]);

function humanizeSingleCode(code: string): string {
  const words = code.split("_").filter(Boolean);
  if (words.length === 0) return code;
  return words.map((word, index) => {
    const upper = word.toUpperCase();
    if (UPPERCASE_TOKENS.has(upper)) return upper;
    const lower = word.toLocaleLowerCase("pt-BR");
    return index === 0 ? lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1) : lower;
  }).join(" ");
}

/** Retorna sempre um nome legível, inclusive para códigos ainda não mapeados. */
export function categoryDisplayLabel(code: string | null | undefined): string {
  const normalized = code?.trim();
  if (!normalized) return "Categoria não informada";
  const known = CATEGORY_DISPLAY_LABELS[normalized];
  if (known) return known;
  if (normalized.includes("__")) {
    return normalized.split("__").map((part) => categoryDisplayLabel(part)).join(" + ");
  }
  return humanizeSingleCode(normalized);
}
