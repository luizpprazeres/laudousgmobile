/**
 * Fundação de IDADE GESTACIONAL determinística (escola Dr. Domingos).
 * Fonte: docs/plano-ig-deterministica.md ([[epico-ig-deterministica]]).
 *
 * Princípio: a ÂNCORA é sempre a biometria atual. A referência precoce (US precoce
 * ou DUM) só entra na frase quando há divergência > 5 dias E o médico sinaliza a
 * correção. Função PURA, sem IA e sem Date.now (hoje é passado pelo chamador) —
 * compartilhada por OBSTETRICA e MORFOLOGICO no web.
 */

export type SemanasDias = { semanas: number; dias: number }

export type Referencia =
  | { tipo: 'us'; dataISO: string; ig: SemanasDias } // US precoce: IG naquela data
  | { tipo: 'dum'; dataISO: string } // data da última menstruação

export interface IGInput {
  /** Biometria atual (medida hoje) — a âncora. */
  biometria: SemanasDias
  /** Data do exame (ISO yyyy-mm-dd). */
  hojeISO: string
  /** Referência precoce, se houver. */
  referencia?: Referencia
  /** Sinaliza a correção na conclusão quando diverge > 5 dias (toggle/voz). */
  corrigir?: boolean
}

export interface IGResult {
  /** Item de conclusão da IG (frase canônica). */
  igConclusao: string
  /** Prosa da 1ª US / DUM, quando há referência. */
  frase1aUS?: string
  divergenciaDias: number
  biometriaSD: SemanasDias
  referenciaHojeSD?: SemanasDias
}

const DIA_MS = 86_400_000
/** Limiar de divergência clínica (CONFIRMAR com Dr. Domingos se fixo). */
export const DIVERGENCIA_LIMIAR_DIAS = 5

export function sdToDays(sd: SemanasDias): number {
  return sd.semanas * 7 + sd.dias
}
export function daysToSD(days: number): SemanasDias {
  const d = Math.max(0, Math.round(days))
  return { semanas: Math.floor(d / 7), dias: d % 7 }
}
export function fmtSD(sd: SemanasDias): string {
  const s = `${sd.semanas} ${sd.semanas === 1 ? 'semana' : 'semanas'}`
  const d = `${sd.dias} ${sd.dias === 1 ? 'dia' : 'dias'}`
  return `${s} e ${d}`
}
function daysBetween(aISO: string, bISO: string): number {
  return Math.round((Date.parse(bISO) - Date.parse(aISO)) / DIA_MS)
}
/** yyyy-mm-dd → dd/mm/aaaa. */
export function formatBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export function computeIG(input: IGInput): IGResult {
  const { biometria, hojeISO, referencia, corrigir } = input
  const bioDays = sdToDays(biometria)
  const bioSD = daysToSD(bioDays)

  let refTodayDays: number | undefined
  if (referencia) {
    const elapsed = daysBetween(referencia.dataISO, hojeISO)
    refTodayDays =
      referencia.tipo === 'us' ? sdToDays(referencia.ig) + elapsed : elapsed
  }
  const refSD = refTodayDays !== undefined ? daysToSD(refTodayDays) : undefined
  const divergencia =
    refTodayDays !== undefined ? Math.abs(bioDays - refTodayDays) : 0
  const fonte =
    referencia?.tipo === 'dum'
      ? 'data da última menstruação'
      : 'ultrassonografia precoce'

  // Regra da conclusão:
  //  - sem referência, OU divergência ≤ limiar, OU correção desligada → só biometria;
  //  - divergência > limiar E corrigir → frase com correção pela referência.
  let igConclusao: string
  if (
    referencia &&
    divergencia > DIVERGENCIA_LIMIAR_DIAS &&
    corrigir &&
    refSD
  ) {
    igConclusao = `Gestação em torno de ${fmtSD(bioSD)} pela biometria atual, devendo ser corrigida pela ${fonte}, compatível com ${fmtSD(refSD)}.`
  } else {
    igConclusao = `Gestação em torno de ${fmtSD(bioSD)}.`
  }

  let frase1aUS: string | undefined
  if (referencia && refSD) {
    const dataFmt = formatBR(referencia.dataISO)
    frase1aUS =
      referencia.tipo === 'us'
        ? `Primeira ultrassonografia realizada em ${dataFmt} com ${fmtSD(referencia.ig)}. Hoje com ${fmtSD(refSD)}.`
        : `Data da última menstruação em ${dataFmt}, compatível com ${fmtSD(refSD)} na presente data.`
  }

  return {
    igConclusao,
    frase1aUS,
    divergenciaDias: divergencia,
    biometriaSD: bioSD,
    referenciaHojeSD: refSD,
  }
}
