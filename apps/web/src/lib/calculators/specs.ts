/**
 * Specs declarativos de calculadora — envelopam as funções de cálculo (puras,
 * reusadas do app: tiRads/biRads/oRads) num formato que o CalcPanel renderiza.
 * Cada categoria expõe suas calculadoras pertinentes (seção "Cálculos").
 */
import { calcularTiRads, formatarBlocoTiRads, type TiRadsInput } from './tiRads'
import { calcularBiRads, formatarBlocosBiRads, type BiRadsInput } from './biRads'
import { calcularORads, formatarBlocoORads, type ORadsInput } from './oRads'

export type CalcField = {
  key: string
  label: string
  type?: 'chips' | 'text'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export type CalcResult = { headline: string; block: string } | null

/** Estado do exame (por seção) — usado pelo "Extrair dos achados". */
export type ExamStateLike = Record<string, Record<string, string | string[]> | undefined>

export type StandardCalcSpec = {
  id: string
  name: string
  kind?: 'standard'
  fields: CalcField[]
  compute: (v: Record<string, string>) => CalcResult
  /** Preenche a calculadora a partir do estado já marcado nos órgãos. */
  extract?: (examState: ExamStateLike) => Record<string, string> | null
}

export type CustomCalcSpec = {
  id: string
  name: string
  kind: 'pre-eclampsia-fmf' | 'trisomy-fmf'
}

export type CalcSpec = StandardCalcSpec | CustomCalcSpec

export const preEclampsiaFmfSpec: CustomCalcSpec = {
  id: 'pre-eclampsia-fmf',
  name: 'Pré-eclâmpsia FMF',
  kind: 'pre-eclampsia-fmf',
}

export const trisomyFmfSpec: CustomCalcSpec = {
  id: 'trisomy-fmf',
  name: 'Trissomias T21/T18/T13',
  kind: 'trisomy-fmf',
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
  // Extrai do nódulo sólido da mama (md/me) já preenchido nos achados.
  extract: (examState) => {
    const m = examState['mamas']
    if (!m) return null
    const prefix = m.md_tipo === 'nodulo' ? 'md' : m.me_tipo === 'nodulo' ? 'me' : null
    if (!prefix) return null
    const g = (k: string) => String(m[`${prefix}_${k}`] ?? '')
    const margemMap: Record<string, string> = {
      circunscrita: 'circunscrita', indistinta: 'nao_circunscrita_indistinta', angular: 'nao_circunscrita_angular',
      microlobulada: 'nao_circunscrita_microlobulada', espiculada: 'espiculada',
    }
    const ecoMap: Record<string, string> = { anecoico: 'anecoica', hipoecoico: 'hipoecóica', isoecoico: 'isoecoica', hiperecoico: 'hiperecoica' }
    const postMap: Record<string, string> = { nenhuma: 'nenhum', reforco: 'reforço', sombra: 'sombra' }
    const calc = Array.isArray(m[`${prefix}_calc`]) ? (m[`${prefix}_calc`] as string[]) : []
    return {
      forma: g('forma'),
      orientacao: g('orientacao'),
      margem: margemMap[g('margem')] ?? '',
      ecogenicidade: ecoMap[g('eco')] ?? '',
      reforcoPosterior: postMap[g('posterior')] ?? '',
      calcificacao: calc.includes('microcalc') ? 'microcalcificações_suspeitas' : '',
    }
  },
}

// ── O-RADS US (ovariano-anexial) ─────────────────────────────────────────────
export const oRadsSpec: CalcSpec = {
  id: 'o-rads',
  name: 'O-RADS (US)',
  fields: [
    { key: 'ascite', label: 'Ascite/implantes', options: [
      { value: 'nao', label: 'Não' }, { value: 'sim', label: 'Sim' },
    ] },
    { key: 'morfologia', label: 'Morfologia', options: [
      { value: 'puramente_cistico', label: 'Puramente cístico' }, { value: 'componente_solido', label: 'C/ comp. sólido' }, { value: 'predominantemente_solido', label: 'Predom. sólido' },
    ] },
    { key: 'rampaA', label: 'Cístico — tipo', options: [
      { value: 'unilocular_simples', label: 'Unilocular simples' }, { value: 'unilocular_com_debris', label: 'Unilocular c/ debris' }, { value: 'multilocular_simples', label: 'Multilocular' }, { value: 'multilocular_com_debris', label: 'Multiloc. c/ debris' },
    ] },
    { key: 'numPapilas', label: 'Nº de papilas', options: [
      { value: '0', label: '0' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '≥3' },
    ] },
    { key: 'componenteSolidoInterno', label: 'Comp. sólido interno', options: [
      { value: 'ausente', label: 'Ausente' }, { value: 'presente', label: 'Presente' },
    ] },
    { key: 'bordasSolido', label: 'Sólido — bordas', options: [
      { value: 'regulares', label: 'Regulares' }, { value: 'irregulares', label: 'Irregulares' },
    ] },
    { key: 'ecogenicidadeSolido', label: 'Sólido — ecogenicidade', options: [
      { value: 'hiperecóico', label: 'Hiper' }, { value: 'isoecóico', label: 'Iso' }, { value: 'hipoecóico', label: 'Hipo' }, { value: 'sombra_acustica', label: 'Sombra' },
    ] },
    { key: 'colorScore', label: 'Color Score', options: [
      { value: 'CS1', label: 'CS1' }, { value: 'CS2', label: 'CS2' }, { value: 'CS3', label: 'CS3' }, { value: 'CS4', label: 'CS4' },
    ] },
    { key: 'statusMenopausico', label: 'Status', options: [
      { value: 'pre', label: 'Pré-menopausa' }, { value: 'pos', label: 'Pós-menopausa' },
    ] },
  ],
  compute: (v) => {
    const input: ORadsInput = {
      asciteImplantes: v.ascite === 'sim' ? true : v.ascite === 'nao' ? false : undefined,
      morfologia: v.morfologia as ORadsInput['morfologia'],
      rampaA: v.rampaA as ORadsInput['rampaA'],
      numPapilas: v.numPapilas ? (Number(v.numPapilas) as ORadsInput['numPapilas']) : undefined,
      componenteSolidoInterno: v.componenteSolidoInterno as ORadsInput['componenteSolidoInterno'],
      bordasSolido: v.bordasSolido as ORadsInput['bordasSolido'],
      ecogenicidadeSolido: v.ecogenicidadeSolido as ORadsInput['ecogenicidadeSolido'],
      colorScore: v.colorScore as ORadsInput['colorScore'],
      statusMenopausico: v.statusMenopausico as ORadsInput['statusMenopausico'],
    }
    const r = calcularORads(input)
    if (!r) return null
    return { headline: `O-RADS ${r.category} — ${r.risk}`, block: formatarBlocoORads(input, r) }
  },
}

// ── FIGO — classificação de mioma (0–8) ──────────────────────────────────────
const FIGO_DESC: Record<string, string> = {
  '0': 'Submucoso pediculado, 100% intracavitário',
  '1': 'Submucoso, < 50% intramural',
  '2': 'Submucoso, ≥ 50% intramural',
  '3': '100% intramural, em contato com o endométrio',
  '4': 'Intramural',
  '5': 'Subseroso, ≥ 50% intramural',
  '6': 'Subseroso, < 50% intramural',
  '7': 'Subseroso pediculado',
  '8': 'Outro (cervical, parasitário)',
}
export const figoMiomaSpec: CalcSpec = {
  id: 'figo-mioma',
  name: 'FIGO (mioma)',
  fields: [
    { key: 'figo', label: 'Tipo FIGO', options: Object.keys(FIGO_DESC).map((k) => ({ value: k, label: k })) },
  ],
  compute: (v) => {
    if (!v.figo) return null
    const desc = FIGO_DESC[v.figo]
    return {
      headline: `FIGO ${v.figo}`,
      block: `Nódulo miomatoso — categoria FIGO ${v.figo}: ${desc}.\n(FIGO: Federação Internacional de Ginecologia e Obstetrícia)`,
    }
  },
}
