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
] as const

export function categoriaMigrada(categoria: string): boolean {
  return (CATEGORIAS_MIGRADAS as readonly string[]).includes(categoria)
}
