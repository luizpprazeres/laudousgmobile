/**
 * Specs declarativos de calculadora — envelopam as funções de cálculo (puras,
 * reusadas do app: tiRads/biRads/oRads) num formato que o CalcPanel renderiza.
 * Cada categoria expõe suas calculadoras pertinentes (seção "Cálculos").
 */
import { calcularTiRads, formatarBlocoTiRads, type TiRadsInput } from './tiRads'
import { calcularBiRads, formatarBlocosBiRads, type BiRadsInput } from './biRads'

export type CalcField = {
  key: string
  label: string
  type?: 'chips' | 'text'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export type CalcResult = { headline: string; block: string } | null

export type CalcSpec = {
  id: string
  name: string
  fields: CalcField[]
  compute: (v: Record<string, string>) => CalcResult
}

// ── ACR TI-RADS ──────────────────────────────────────────────────────────────
export const tiRadsSpec: CalcSpec = {
  id: 'ti-rads',
  name: 'TI-RADS (ACR)',
  fields: [
    { key: 'composicao', label: 'Composição', options: [
      { value: 'cistico_esponjoso', label: 'Cístico/espongiforme' }, { value: 'misto', label: 'Misto' }, { value: 'solido', label: 'Sólido' },
    ] },
    { key: 'ecogenicidade', label: 'Ecogenicidade', options: [
      { value: 'anecoico_hiperecoico', label: 'Anec./hiper.' }, { value: 'isoecoico', label: 'Iso' }, { value: 'hipoecóico', label: 'Hipo' }, { value: 'muito_hipoecóico', label: 'Muito hipo' },
    ] },
    { key: 'forma', label: 'Forma', options: [
      { value: 'mais_largo_que_alto', label: 'Mais largo que alto' }, { value: 'mais_alto_que_largo', label: 'Mais alto que largo' },
    ] },
    { key: 'margens', label: 'Margens', options: [
      { value: 'lisas_mal_definidas', label: 'Lisas/mal definidas' }, { value: 'lobuladas_irregulares', label: 'Lobuladas/irregulares' }, { value: 'extensao_extratireoidiana', label: 'Ext. extratireoidiana' },
    ] },
    { key: 'focosEcogenicos', label: 'Focos ecogênicos', options: [
      { value: 'nenhum_cauda_cometa', label: 'Nenhum/cauda cometa' }, { value: 'macrocalcificacoes', label: 'Macrocalcif.' }, { value: 'calcificacoes_perifericas', label: 'Periféricas' }, { value: 'focos_ecogenicos_puntiformes', label: 'Puntiformes' },
    ] },
    { key: 'tamanhoMm', label: 'Tamanho (mm)', type: 'text', placeholder: '12' },
  ],
  compute: (v) => {
    const input: TiRadsInput = {
      composicao: v.composicao as TiRadsInput['composicao'],
      ecogenicidade: v.ecogenicidade as TiRadsInput['ecogenicidade'],
      forma: v.forma as TiRadsInput['forma'],
      margens: v.margens as TiRadsInput['margens'],
      focosEcogenicos: v.focosEcogenicos as TiRadsInput['focosEcogenicos'],
      tamanhoMm: v.tamanhoMm ? Number(String(v.tamanhoMm).replace(',', '.')) : undefined,
    }
    const r = calcularTiRads(input)
    return { headline: `ACR ${r.category} — ${r.riskDescription} (${r.score} pts)`, block: formatarBlocoTiRads(input, r) }
  },
}

// ── BI-RADS (ecográfico) ─────────────────────────────────────────────────────
export const biRadsSpec: CalcSpec = {
  id: 'bi-rads',
  name: 'BI-RADS (US)',
  fields: [
    { key: 'forma', label: 'Forma', options: [
      { value: 'oval', label: 'Oval' }, { value: 'redonda', label: 'Redonda' }, { value: 'irregular', label: 'Irregular' },
    ] },
    { key: 'orientacao', label: 'Orientação', options: [
      { value: 'paralela', label: 'Paralela' }, { value: 'nao_paralela', label: 'Não paralela' },
    ] },
    { key: 'margem', label: 'Margem', options: [
      { value: 'circunscrita', label: 'Circunscrita' }, { value: 'nao_circunscrita_microlobulada', label: 'Microlobulada' }, { value: 'nao_circunscrita_indistinta', label: 'Indistinta' }, { value: 'nao_circunscrita_angular', label: 'Angular' }, { value: 'espiculada', label: 'Espiculada' },
    ] },
    { key: 'ecogenicidade', label: 'Ecogenicidade', options: [
      { value: 'anecoica', label: 'Anecoica' }, { value: 'hiperecoica', label: 'Hiper' }, { value: 'isoecoica', label: 'Iso' }, { value: 'hipoecóica', label: 'Hipo' }, { value: 'heterogênea', label: 'Heterogênea' },
    ] },
    { key: 'reforcoPosterior', label: 'Acústico posterior', options: [
      { value: 'nenhum', label: 'Nenhum' }, { value: 'reforço', label: 'Reforço' }, { value: 'sombra', label: 'Sombra' }, { value: 'combinado', label: 'Combinado' },
    ] },
    { key: 'calcificacao', label: 'Calcificações', options: [
      { value: 'ausente', label: 'Ausentes' }, { value: 'macrocalcificações', label: 'Macro' }, { value: 'microcalcificações_suspeitas', label: 'Micro suspeitas' },
    ] },
  ],
  compute: (v) => {
    const input = {
      forma: v.forma || undefined,
      orientacao: v.orientacao || undefined,
      margem: v.margem || undefined,
      ecogenicidade: v.ecogenicidade || undefined,
      reforcoPosterior: v.reforcoPosterior || undefined,
      calcificacao: v.calcificacao || undefined,
    } as unknown as BiRadsInput
    const r = calcularBiRads(input)
    if (!r) return null
    return { headline: `BI-RADS ${r.category} — ${r.risk}`, block: formatarBlocosBiRads(input, r) }
  },
}
