/**
 * AS CATEGORIAS QUE JÁ SAEM DO RENDERER CANÔNICO.
 *
 * Uma por vez, e só depois de provada por um gate diferencial (§3.2 do plano de
 * 20/08). Uma categoria que ainda não foi provada não deve ser alcançável só
 * porque alguém digitou o nome dela na barra de endereços.
 *
 * Vive num módulo próprio, sem `server-only`, porque a lista é consultada dos
 * dois lados: no servidor, para a rota `/api/catalog/*` recusar o que não
 * migrou; e no cliente, para o compositor local se RECUSAR a rodar no que já
 * migrou — ver `composeReport`.
 *
 * | categoria | quando | gate |
 * |---|---|---|
 * | TIREOIDE | 21/08 | `tireoide-ponta-a-ponta.manual.ts` |
 * | PELVE_FEMININA | 21/08 | `pelve-ponta-a-ponta.manual.ts` |
 * | MAMARIA | 21/08 | `mamaria-ponta-a-ponta.manual.ts` |
 * | OBSTETRICA | 22/08 | `obstetrica-ponta-a-ponta.manual.ts` |
 * | MORFOLOGICO | 22/08 | `morfologico-ponta-a-ponta.manual.ts` |
 * | ABDOMEN_TOTAL | 23/08 | `abdome-ponta-a-ponta.manual.ts` — só o CLÁSSICO |
 * | ABDOMEN_SUPERIOR | 31/08 | `sprint16a-ponta-a-ponta.manual.ts` |
 * | VIAS_URINARIAS | 31/08 | `sprint16a-ponta-a-ponta.manual.ts` |
 * | PROSTATA_SUPRAPUBICA | 31/08 | `sprint16a-ponta-a-ponta.manual.ts` |
 * | CERVICAL | 31/08 | `sprint16b-ponta-a-ponta.manual.ts` |
 * | CERVICOMETRIA | 31/08 | `sprint16b-ponta-a-ponta.manual.ts` |
 * | PARTES_MOLES | 31/08 | `sprint16c-ponta-a-ponta.manual.ts` |
 * | MUSCULOESQUELETICO | 31/08 | `sprint16c-ponta-a-ponta.manual.ts` |
 */
export const CATEGORIAS_MIGRADAS = [
  "TIREOIDE",
  "PELVE_FEMININA",
  "MAMARIA",
  "OBSTETRICA",
  "MORFOLOGICO",
  "DOPPLER_OBSTETRICO",
  "ABDOMEN_TOTAL",
  "DOPPLER_CAROTIDAS",
  "ABDOMEN_SUPERIOR",
  "VIAS_URINARIAS",
  "PROSTATA_SUPRAPUBICA",
  "CERVICAL",
  "CERVICOMETRIA",
  "PARTES_MOLES",
  "MUSCULOESQUELETICO",
  "DOPPLER_RENAL",
  "DOPPLER_HEPATICO",
  "DOPPLER_VENOSO_MMII",
  "DOPPLER_VENOSO_MMII_MEDIDAS",
  "DOPPLER_ARTERIAL_MMII",
  "DOPPLER_FISTULA_AV",
  "DOPPLER_ARTERIAS_TEMPORAIS",
] as const

/**
 * CATEGORIAS DERIVADAS — um card próprio no seletor, o MESMO renderer por baixo.
 *
 * O id do card é dele (histórico, busca, rascunho), mas o laudo sai do
 * renderer da categoria-mãe, que já passou pelo gate. Por isso a derivada conta
 * como migrada: `composeReport` a recusa, e nenhum motor local volta a escrever
 * a pelve por um caminho novo.
 *
 * | derivada | renderer | o que muda |
 * |---|---|---|
 * | PELVICO_TRANSVAGINAL | PELVE_FEMININA | via fixa `tv`, sem bexiga; portão de completude no adaptador |
 * | TIREOIDE_DOPPLER | TIREOIDE | Doppler fixo; parênquima, medidas e linfonodos informados |
 * | CERVICAL_DOPPLER | CERVICAL | Doppler declarado; vascularização do linfonodo obrigatória |
 * | MAMAS_DOPPLER, MAMAS_AXILAS_DOPPLER | MAMARIA | escopo e Doppler fixos; vascularização por achado |
 * | PELVICO_TRANSABDOMINAL | PELVE_FEMININA | via fixa `ta`, repleção confirmada, endométrio não medido = limitado pela técnica |
 */
export const CATEGORIAS_DERIVADAS: Readonly<Record<string, (typeof CATEGORIAS_MIGRADAS)[number]>> = {
  PELVICO_TRANSVAGINAL: "PELVE_FEMININA",
  PELVICO_TRANSABDOMINAL: "PELVE_FEMININA",
  TIREOIDE_DOPPLER: "TIREOIDE",
  CERVICAL_DOPPLER: "CERVICAL",
  MAMAS_DOPPLER: "MAMARIA",
  MAMAS_AXILAS_DOPPLER: "MAMARIA",
  // Atalhos MSK (organs/mskPresets.ts): segmento e lado fixados pelo card.
  MSK_COTOVELO: "MUSCULOESQUELETICO",
  MSK_COTOVELO_BILATERAL: "MUSCULOESQUELETICO",
  MSK_JOELHO: "MUSCULOESQUELETICO",
  MSK_JOELHO_BILATERAL: "MUSCULOESQUELETICO",
  MSK_MAO: "MUSCULOESQUELETICO",
  MSK_MAO_BILATERAL: "MUSCULOESQUELETICO",
  MSK_OMBRO: "MUSCULOESQUELETICO",
  MSK_OMBRO_BILATERAL: "MUSCULOESQUELETICO",
  MSK_PUNHO: "MUSCULOESQUELETICO",
  MSK_PUNHO_BILATERAL: "MUSCULOESQUELETICO",
  MSK_PE: "MUSCULOESQUELETICO",
  MSK_PE_BILATERAL: "MUSCULOESQUELETICO",
  MSK_QUADRIL: "MUSCULOESQUELETICO",
  MSK_QUADRIL_BILATERAL: "MUSCULOESQUELETICO",
  MSK_TORNOZELO: "MUSCULOESQUELETICO",
  MSK_TORNOZELO_BILATERAL: "MUSCULOESQUELETICO",
}

/** A categoria cujo renderer canônico monta o laudo (a própria, ou a mãe da derivada). */
export function categoriaDeRender(categoria: string): string {
  return CATEGORIAS_DERIVADAS[categoria] ?? categoria
}

export function categoriaMigrada(categoria: string): boolean {
  return (CATEGORIAS_MIGRADAS as readonly string[]).includes(categoria) || categoria in CATEGORIAS_DERIVADAS
}
