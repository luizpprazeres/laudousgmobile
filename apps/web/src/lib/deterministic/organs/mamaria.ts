/**
 * Categoria MAMÁRIA (ultrassonografia das mamas) — geração determinística.
 *
 * Fonte de verdade: apps/api/src/server/renderer/categories/MAMARIA.ts (clássico)
 * + golden. Léxico BI-RADS US. Regras-chave: BI-RADS calculável (ditado vence;
 * MAIOR vence — só o achado de maior categoria leva o rótulo); margem NUNCA
 * "regular"; rodapé BI-RADS®.
 *
 * Modelo: uma ÚNICA seção "Mamas" (ambas as mamas + axilas num módulo), porque o
 * BI-RADS é cruzado entre achados (maior vence) — o engine genérico compõe por
 * seção, então tudo precisa estar junto. Grosso coberto: normal, cisto simples,
 * cistos múltiplos, nódulo sólido (BI-RADS calc), calcificações, axilas.
 * Casos raros (microcistos, cisto complicado, ginecomastia, próteses, correlação)
 * → curadoria futura / achados_adicionais.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganModule, OrganSchema, OrganState, OrganComposition } from '../types'
import { biRadsSpec } from '../../calculators/specs'

// ── helpers ──────────────────────────────────────────────────────────────────
function med(n: number): string {
  return n.toFixed(1).replace('.', ',')
}
function parseNum(v: unknown): number | null {
  const s = String(v ?? '').trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}
/** "1,2 x 1,0 x 0,8" → "1,2 x 1,0 x 0,8 cm" (mm→cm). */
function medidas3(raw: unknown): string {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  const parts = rawStr.split(/[x×]/i).map((p) => parseNum(p))
  const vals = [0, 1, 2].map((i) => {
    let n = parts[i]
    if (n == null) return '____'
    if (isMm) n = n / 10
    return med(n)
  })
  return `${vals.join(' x ')} cm`
}
function maiorEixo(raw: unknown): number | null {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  const nums = rawStr.split(/[x×]/i).map((p) => parseNum(p)).filter((n): n is number => n != null)
  if (!nums.length) return null
  const mx = Math.max(...nums)
  return isMm ? mx / 10 : mx
}

const ecoTxt: Record<string, string> = {
  anecoico: 'anecoica',
  hipoecoico: 'hipoecoica',
  isoecoico: 'isoecoica',
  hiperecoico: 'hiperecoica',
}
const margemTxt: Record<string, string> = {
  circunscrita: 'circunscrita',
  indistinta: 'indistinta',
  angular: 'angular',
  microlobulada: 'microlobulada',
  espiculada: 'espiculada',
}
const FUNDO: Record<string, string> = {
  heterogeneo: 'Mamas com ecotextura de fundo com aspecto heterogêneo.',
  denso: 'Mamas com predominância de tecido fibroglandular denso.',
  adiposo: 'Mamas com predominância de tecido adiposo.',
}
const AUSENCIA_LESAO = 'Não há sinais evidentes de imagem nodular sólida, cística ou complexa.'
const RODAPE = 'Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).'

function mamaTxt(lado: string): string {
  return lado === 'direita' ? 'mama direita' : 'mama esquerda'
}

// ── BI-RADS ──────────────────────────────────────────────────────────────────
function biradsRank(b: string | null): number {
  if (!b) return -1
  const t = b.trim().toUpperCase()
  if (t.startsWith('6')) return 9
  if (t.startsWith('5')) return 8
  if (t === '4C') return 7
  if (t === '4B') return 6
  if (t === '4A' || t.startsWith('4')) return 5
  if (t.startsWith('3')) return 4
  if (t.startsWith('0')) return 3
  if (t.startsWith('2')) return 2
  if (t.startsWith('1')) return 1
  return 0
}

type Achado = {
  lado: 'direita' | 'esquerda'
  tipo: string
  st: OrganState
  prefix: string
}

function biradsCalc(a: Achado): string | null {
  const g = (k: string) => a.st[`${a.prefix}_${k}`]
  const ditado = String(g('birads') ?? '').trim()
  if (ditado) return ditado.toUpperCase() // canônico: "4a" → "4A"
  switch (a.tipo) {
    case 'cisto_simples':
    case 'multiplos_cistos':
      return '2'
    case 'calcificacoes':
      return g('calc_sub') === 'em_nodulo' || g('calc_sub') === 'microcalcificacoes' || g('calc_sub') === 'intraductais' ? '4' : '2'
    case 'nodulo': {
      // Defaults materializados (o subcampo só entra no state ao ser tocado):
      // forma oval, orientação paralela, sem fenômeno posterior. Margem NÃO tem
      // default (é o discriminador) — sem margem circunscrita explícita não é benigno.
      const forma = g('forma') || 'oval'
      const margem = g('margem')
      const orient = g('orientacao') || 'paralela'
      const posterior = g('posterior') || 'nenhuma'
      const micro = ((g('calc') as string[]) || []).includes('microcalc')
      const benigno = forma === 'oval' && margem === 'circunscrita' && orient === 'paralela' && posterior !== 'sombra' && !micro
      if (benigno) return '3'
      const fortes =
        (margem === 'espiculada' ? 1 : 0) +
        (forma === 'irregular' ? 1 : 0) +
        (micro ? 1 : 0) +
        (posterior === 'sombra' && orient === 'nao_paralela' ? 1 : 0)
      const moderadas =
        (margem === 'microlobulada' || margem === 'angular' || margem === 'indistinta' ? 1 : 0) +
        (orient === 'nao_paralela' ? 1 : 0) +
        (posterior === 'sombra' ? 1 : 0)
      if (fortes >= 2) return '5'
      if (fortes === 1) return '4C'
      if (moderadas >= 2) return '4B'
      return '4A'
    }
    default:
      return null
  }
}

function achadoCorpo(a: Achado): string {
  const g = (k: string) => a.st[`${a.prefix}_${k}`]
  const mama = mamaTxt(a.lado)
  const loc = g('local') ? `, situada no ${String(g('local')).replace(/^no\s+/i, '')}` : ''
  switch (a.tipo) {
    case 'cisto_simples':
      return `Imagem anecoica de ${mama}, com margem circunscrita, medindo ${medidas3(g('medidas'))}${loc}.`
    case 'multiplos_cistos':
      return `Imagens anecoicas de ${mama}, com margens circunscritas, a maior medindo ${medidas3(g('medidas'))}${loc}.`
    case 'calcificacoes': {
      const sub = g('calc_sub')
      if (sub === 'microcalcificacoes')
        return `Imagens hiperecoicas puntiformes, que não ocasionam sombras acústicas, agrupadas na ${mama}${loc}.`
      if (sub === 'em_nodulo')
        return `Calcificações no interior de imagem nodular de ${mama}${loc}.`
      if (sub === 'intraductais')
        return `Calcificações de distribuição intraductal de ${mama}${loc}.`
      if (sub === 'fora_nodulo')
        return `Calcificações fora de imagem nodular de ${mama}${loc}.`
      return `Imagens hiperecoicas, ocasionando sombra acústica, mais evidentes na ${mama}${loc}.`
    }
    case 'nodulo': {
      const eco = g('eco') ? ecoTxt[String(g('eco'))] : 'hipoecoica'
      const partes = [`Imagem ${eco} de ${mama}`]
      if (g('margem')) partes.push(`com margem ${margemTxt[String(g('margem'))]}`)
      if (g('orientacao') === 'paralela') partes.push('maior eixo paralelo à pele')
      partes.push(`medindo ${medidas3(g('medidas'))}`)
      if (((g('calc') as string[]) || []).includes('microcalc')) partes.push('com calcificações de permeio')
      if (g('posterior') === 'sombra') partes.push('com sombra acústica posterior')
      else if (g('posterior') === 'reforco') partes.push('com reforço acústico posterior')
      return `${partes.join(', ')}${loc}.`
    }
    default:
      return ''
  }
}

function achadoConclusao(a: Achado): string {
  const g = (k: string) => a.st[`${a.prefix}_${k}`]
  const mama = mamaTxt(a.lado)
  const loc = g('local') ? ` no ${String(g('local')).replace(/^no\s+/i, '')}` : ''
  switch (a.tipo) {
    case 'cisto_simples':
      return `Cisto simples em ${mama}${loc}`
    case 'multiplos_cistos':
      return `Cistos mamários simples em ${mama}${loc}`
    case 'nodulo':
      return `Imagem sólida em ${mama}${loc}`
    case 'calcificacoes': {
      const sub = g('calc_sub')
      if (sub === 'microcalcificacoes') return `Microcalcificações agrupadas em ${mama}${loc}`
      if (sub === 'em_nodulo') return `Calcificações no interior de imagem nodular em ${mama}${loc}`
      if (sub === 'intraductais') return `Calcificações de distribuição intraductal em ${mama}${loc}`
      if (sub === 'fora_nodulo') return `Calcificações extranodulares em ${mama}${loc}`
      return `Calcificações grosseiras de aspecto benigno em ${mama}${loc}`
    }
    default:
      return `Achado em ${mama}${loc}`
  }
}

// ── schema (campos por mama via subFields do tipo) ───────────────────────────
const noduloSubs: Field[] = [
  { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '1,2 x 1,0 x 0,8' },
  { key: 'eco', label: 'Ecogenicidade', kind: 'mini-segmented', options: [
    { value: 'hipoecoico', label: 'Hipo', isDefault: true }, { value: 'isoecoico', label: 'Iso' },
    { value: 'anecoico', label: 'Ane' }, { value: 'hiperecoico', label: 'Hiper' },
  ] },
  { key: 'forma', label: 'Forma', kind: 'mini-segmented', options: [
    { value: 'oval', label: 'Oval', isDefault: true }, { value: 'redonda', label: 'Redonda' }, { value: 'irregular', label: 'Irregular' },
  ] },
  { key: 'margem', label: 'Margem', kind: 'mini-segmented', options: [
    { value: 'circunscrita', label: 'Circ' }, { value: 'indistinta', label: 'Indist' },
    { value: 'angular', label: 'Angular' }, { value: 'microlobulada', label: 'Microlob' }, { value: 'espiculada', label: 'Espic' },
  ] },
  { key: 'orientacao', label: 'Orientação', kind: 'mini-segmented', options: [
    { value: 'paralela', label: 'Paralela', isDefault: true }, { value: 'nao_paralela', label: 'Não paralela' },
  ] },
  { key: 'posterior', label: 'Acústico post.', kind: 'mini-segmented', options: [
    { value: 'nenhuma', label: 'Nenhum', isDefault: true }, { value: 'reforco', label: 'Reforço' }, { value: 'sombra', label: 'Sombra' },
  ] },
  { key: 'calc', label: 'Calcificações', kind: 'checklist', options: [{ value: 'microcalc', label: 'Microcalc. de permeio' }] },
  { key: 'local', label: 'Localização', kind: 'text', placeholder: 'quadrante superolateral' },
  { key: 'birads', label: 'BI-RADS (forçar)', kind: 'text', placeholder: 'ex.: 4A' },
]
const cistoSubs: Field[] = [
  { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '0,8 x 0,6 x 0,5' },
  { key: 'local', label: 'Localização', kind: 'text', placeholder: 'quadrante superolateral' },
]
const calcSubs: Field[] = [
  { key: 'calc_sub', label: 'Tipo', kind: 'mini-segmented', options: [
    { value: 'grosseiras', label: 'Grosseiras', isDefault: true }, { value: 'microcalcificacoes', label: 'Micro' },
    { value: 'em_nodulo', label: 'Em nódulo' }, { value: 'intraductais', label: 'Intraductais' }, { value: 'fora_nodulo', label: 'Extranodular' },
  ] },
  { key: 'local', label: 'Localização', kind: 'text', placeholder: 'quadrante superolateral' },
  { key: 'birads', label: 'BI-RADS (forçar)', kind: 'text', placeholder: 'ex.: 4A' },
]

function mamaTipoField(prefix: string): Field {
  return {
    key: `${prefix}_tipo`,
    label: prefix === 'md' ? 'Mama direita' : 'Mama esquerda',
    kind: 'segmented',
    hint: 'default: sem achados',
    options: [
      { value: 'nenhum', label: 'Sem achados', isDefault: true },
      { value: 'cisto_simples', label: 'Cisto simples', subFields: cistoSubs },
      { value: 'multiplos_cistos', label: 'Cistos múltiplos', subFields: cistoSubs },
      { value: 'nodulo', label: 'Nódulo sólido', subFields: noduloSubs },
      { value: 'calcificacoes', label: 'Calcificações', subFields: calcSubs },
    ],
  }
}

const schema: OrganSchema = {
  id: 'mamas',
  name: 'Mamas',
  category: 'MAMARIA',
  fields: [
    {
      key: 'fundo',
      label: 'Ecotextura de fundo',
      kind: 'segmented',
      hint: 'default: heterogêneo',
      options: [
        { value: 'heterogeneo', label: 'Heterogêneo', isDefault: true },
        { value: 'denso', label: 'Fibroglandular denso' },
        { value: 'adiposo', label: 'Adiposo' },
      ],
    },
    mamaTipoField('md'),
    mamaTipoField('me'),
  ],
}

function initialState(): OrganState {
  return {
    fundo: 'heterogeneo',
    achados_ids: [],
  }
}

const AXILAR_NORMAL_CORPO = 'Imagens ovais, com a periferia hipoecoica e o centro hiperecoico, nas axilas.'

// ── Axilas (seção própria) ───────────────────────────────────────────────────
const axilasModule: OrganModule = {
  schema: {
    id: 'axilas',
    name: 'Axilas',
    category: 'MAMARIA',
    fields: [
      {
        key: 'axilas',
        label: 'Axilas',
        kind: 'segmented',
        hint: 'default: não avaliadas',
        options: [
          { value: 'nao', label: 'Não avaliadas', isDefault: true },
          { value: 'normais', label: 'Normais' },
          { value: 'alteradas', label: 'Alteradas', subFields: [{ key: 'desc', label: 'Descrição', kind: 'text', placeholder: 'linfonodo axilar de cortical espessada…' }] },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ axilas: 'nao', 'axilas.alteradas.desc': '' }),
  compose: (state): OrganComposition => {
    const axilas = String(state.axilas ?? 'nao')
    if (axilas === 'normais') {
      return { body: AXILAR_NORMAL_CORPO, conclusion: ['Linfonodos axilares normais.'], isNormal: false }
    }
    if (axilas === 'alteradas') {
      const d = String(state['axilas.alteradas.desc'] ?? '').trim()
      const dc = d.replace(/\.+$/, '')
      return {
        body: d || 'Linfonodos axilares de aspecto alterado.',
        conclusion: [dc ? `Linfonodos axilares de aspecto alterado (${dc}).` : 'Linfonodos axilares de aspecto alterado.'],
        isNormal: false,
      }
    }
    return { body: '', conclusion: [], isNormal: true } // não avaliadas → não entra no laudo
  },
}

function compose(state: OrganState): OrganComposition {
  const achados: Achado[] = []
  for (const [prefix, lado] of [['md', 'direita'], ['me', 'esquerda']] as const) {
    const tipo = String(state[`${prefix}_tipo`] ?? 'nenhum')
    if (tipo !== 'nenhum') achados.push({ lado, tipo, st: state, prefix })
  }

  // ── corpo ──
  const aspectos: string[] = [FUNDO[String(state.fundo)] ?? FUNDO.heterogeneo!]
  const TIPOS_LESAO = new Set(['cisto_simples', 'multiplos_cistos', 'nodulo'])
  if (!achados.some((a) => TIPOS_LESAO.has(a.tipo))) aspectos.push(AUSENCIA_LESAO)
  for (const a of achados) {
    const c = achadoCorpo(a)
    if (c) aspectos.push(c)
  }
  // ── conclusão (BI-RADS: maior vence; só o maior leva o rótulo) ──
  const conclusion: string[] = []
  if (achados.length === 0) {
    conclusion.push('Mamas ecograficamente normais (Categoria BI-RADS® 1).')
  } else {
    const ranks = achados.map((a) => biradsRank(biradsCalc(a)))
    const maiorRank = Math.max(...ranks)
    // TODOS os achados empatados no maior rank levam o rótulo (igual ao renderer).
    for (const a of achados) {
      const b = biradsCalc(a)
      const base = achadoConclusao(a)
      if (b && biradsRank(b) === maiorRank) {
        conclusion.push(`${base} (Categoria BI-RADS® ${b}).`)
      } else {
        conclusion.push(`${base}.`)
      }
    }
  }
  return { body: aspectos.join('\n'), conclusion, isNormal: achados.length === 0 }
}

const mamasModule: OrganModule = { schema, initialState, compose }

export const mamaria: ExamCategory = {
  id: 'MAMARIA',
  name: 'Mamária',
  title: 'ULTRASSONOGRAFIA DAS MAMAS',
  tecnica:
    'Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'mamas', label: 'Mamas', group: 'orgaos', module: mamasModule },
    { id: 'axilas', label: 'Axilas', group: 'orgaos', module: axilasModule },
  ],
  conclusionNormal: 'Mamas ecograficamente normais (Categoria BI-RADS® 1).',
  footer: RODAPE,
  calculators: [biRadsSpec],
}
