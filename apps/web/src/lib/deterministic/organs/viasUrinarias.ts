/**
 * Categoria VIAS URINÁRIAS (rins e vias urinárias) — geração determinística.
 *
 * Fonte de verdade: apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts
 * (estilo CLÁSSICO) + golden __tests__/vias-urinarias-golden.manual.ts.
 *
 * Estruturas: rim direito · rim esquerdo · ureteres · bexiga.
 * REGRA PRINCIPAL: o achado focal é INCORPORADO na frase principal do rim (após
 * "apresentando"), nunca em frase separada. Sequência: imagem → ecogenicidade →
 * tamanho → localização → fenômeno acústico. Múltiplos achados → ponto e vírgula.
 * Litíase → cálices; cisto → terço. Silêncio → normalidade.
 *
 * Divergência consciente vs renderer: a conclusão é POR RIM (cada seção compõe a
 * sua), em vez do combinado "Rins ecograficamente normais." — conteúdo fiel.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganModule, OrganSchema, OrganState, OrganComposition } from '../types'

// ── helpers (espelham o renderer) ────────────────────────────────────────────
function ptBr1(n: number): string {
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
function limpa(s: string): string {
  return s.trim().replace(/\.+$/, '')
}
/** parse de medida em cm, convertendo de mm quando o usuário digita a unidade. */
function parseCmAware(v: unknown): number | null {
  const s = String(v ?? '').trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const isMm = s.includes('mm')
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  let n = Number(m[0])
  if (!Number.isFinite(n)) return null
  if (isMm) n = n / 10
  return n
}
/** "10,2 x 4,8 x 5,1" → "10,2 x 4,8 x 5,1 cm" (placeholder ____ por eixo ausente; mm→cm). */
function medidas3(raw: unknown): string {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  const parts = rawStr.split(/[x×]/i).map((p) => parseNum(p))
  const vals = [0, 1, 2].map((i) => {
    let n = parts[i]
    if (n == null) return '____'
    if (isMm) n = n / 10
    return ptBr1(n)
  })
  return `${vals.join(' x ')} cm`
}
function medidaUnica(raw: unknown): string {
  const n = parseCmAware(raw)
  return n != null ? `${ptBr1(n)} cm` : '____ cm'
}
function espessura(raw: unknown): string {
  const n = parseCmAware(raw)
  return n != null ? ptBr1(n) : '____'
}
/** "situada {prep} {loc}" com preposição correta (concordância feminino: imagem). */
function situadoLoc(loc: string, tipo: string): string {
  let l = limpa(loc)
  if (!l) {
    if (tipo === 'litiase') l = 'em cálices'
    else if (tipo === 'cisto_simples' || tipo === 'cisto_complexo') l = 'em um dos terços renais'
    else l = 'no parênquima renal'
  }
  if (/^(no|na|nos|nas|em|à|ao)\b/i.test(l)) return `situada ${l}`
  let prep = 'em'
  if (/^cálices?\b/i.test(l)) prep = 'em'
  else if (/^(terço|polo|seio|sistema|córtex|hilo)\b/i.test(l)) prep = 'no'
  else if (/^(pelve|cortical|medular|junção)\b/i.test(l)) prep = 'na'
  return `situada ${prep} ${l}`
}
function locConcl(loc: string): string {
  const l = limpa(loc)
  if (!l) return ''
  if (/^(no|na|nos|nas|em|à|ao)\b/i.test(l)) return `, ${l}`
  let prep = 'em'
  if (/^cálices?\b/i.test(l)) prep = 'em'
  else if (/^(terço|polo|seio|sistema|córtex|hilo)\b/i.test(l)) prep = 'no'
  else if (/^(pelve|cortical|medular|junção)\b/i.test(l)) prep = 'na'
  return `, ${prep} ${l}`
}

const DIMENSAO: Record<string, string> = {
  normal: 'dentro dos limites normais',
  reduzida_discreta: 'discretamente abaixo dos valores usuais',
  reduzida: 'reduzidos',
}
const HIDRONEFROSE: Record<string, { txt: string; grau: string }> = {
  leve: { txt: 'leve', grau: 'grau 1' },
  moderada: { txt: 'moderada', grau: 'grau 2' },
  acentuada: { txt: 'acentuada', grau: 'grau 3' },
}
const RIM_FINAL_NORMAL = 'topografia, ecotextura do seio renal e ecotextura corticomedular normais'

// ── achados focais: subFields por tipo ───────────────────────────────────────
const localSub = (ph: string): Field => ({ key: 'local', label: 'Localização', kind: 'text', placeholder: ph })
const med3Sub: Field = { key: 'medidas', label: 'Medidas (L x AP x T cm)', kind: 'text', placeholder: '2,0 x 1,8 x 1,6' }

const achadoOptions: Field['options'] = [
  { value: 'litiase', label: 'Litíase', subFields: [{ key: 'medida', label: 'Maior eixo (cm)', kind: 'text', placeholder: '0,6' }, localSub('cálices inferiores')] },
  { value: 'cisto_simples', label: 'Cisto simples', subFields: [med3Sub, localSub('terço médio')] },
  { value: 'cisto_complexo', label: 'Cisto complexo', subFields: [med3Sub, localSub('terço médio'), { key: 'carac', label: 'Característica', kind: 'text', placeholder: 'septado / com calcificação periférica' }] },
  { value: 'nodulo', label: 'Nódulo sólido', subFields: [med3Sub, localSub('polo inferior')] },
  { value: 'ectasia', label: 'Ectasia pielocalicial', subFields: [localSub('pelve renal')] },
]

// ── Rim (fábrica por lado) ───────────────────────────────────────────────────
function rimSchema(lado: 'direito' | 'esquerdo'): OrganSchema {
  return {
    id: `rim_${lado}`,
    name: `Rim ${lado}`,
    category: 'VIAS_URINARIAS',
    fields: [
      {
        key: 'dimensao',
        label: 'Dimensões',
        kind: 'segmented',
        hint: 'default: normais',
        options: [
          { value: 'normal', label: 'Normais', isDefault: true },
          { value: 'reduzida_discreta', label: 'Discr. reduzidas' },
          { value: 'reduzida', label: 'Reduzidas' },
        ],
      },
      {
        key: 'estrutura',
        label: 'Estrutura',
        kind: 'checklist',
        hint: 'marque se houver',
        options: [
          { value: 'situacao_baixa', label: 'Situação baixa' },
          { value: 'rotacao', label: 'Rotação' },
          { value: 'drc', label: 'Doença renal crônica' },
        ],
      },
      {
        key: 'hidronefrose',
        label: 'Hidronefrose',
        kind: 'segmented',
        hint: 'default: ausente',
        options: [
          { value: 'ausente', label: 'Ausente', isDefault: true },
          { value: 'leve', label: 'Leve (1)' },
          { value: 'moderada', label: 'Moderada (2)' },
          { value: 'acentuada', label: 'Acentuada (3)' },
        ],
      },
      { key: 'achados', label: 'Achados focais', kind: 'checklist', hint: 'marque se houver', options: achadoOptions },
      { key: 'alteracao_difusa', label: 'Alteração difusa (texto livre)', kind: 'text', placeholder: 'ex.: aumento difuso da ecogenicidade cortical' },
      { key: 'medidas', label: 'Medidas do rim (L x AP x T cm)', kind: 'text', placeholder: '10,2 x 4,8 x 5,1' },
      { key: 'espessura', label: 'Espessura do parênquima (cm)', kind: 'text', placeholder: '1,6' },
    ],
  }
}

function rimInitial(): OrganState {
  return { dimensao: 'normal', estrutura: [], hidronefrose: 'ausente', achados: [], alteracao_difusa: '', medidas: '', espessura: '' }
}

function descreveAchado(tipo: string, st: OrganState): string {
  const med = st[`achados.${tipo}.medidas`]
  const local = String(st[`achados.${tipo}.local`] ?? '')
  switch (tipo) {
    case 'litiase':
      return `imagem hiperecoica, medindo ${medidaUnica(st['achados.litiase.medida'])} no seu maior eixo, ${situadoLoc(local, tipo)}, ocasionando sombra acústica`
    case 'cisto_simples':
      return `imagem anecóica, com margens regulares, medindo ${medidas3(med)}, ${situadoLoc(local, tipo)}, ocasionando reforço acústico`
    case 'cisto_complexo': {
      const carac = st['achados.cisto_complexo.carac'] ? `, ${limpa(String(st['achados.cisto_complexo.carac']))}` : ''
      return `imagem cística${carac}, medindo ${medidas3(med)}, ${situadoLoc(local, tipo)}`
    }
    case 'nodulo':
      return `imagem nodular sólida, medindo ${medidas3(med)}, ${situadoLoc(local, tipo)}`
    case 'ectasia':
      return `ectasia pielocalicial ${limpa(local) || 'pielocalicial'}`
    default:
      return ''
  }
}

function concluiAchado(tipo: string, st: OrganState, lado: string): string {
  const loc = locConcl(String(st[`achados.${tipo}.local`] ?? ''))
  switch (tipo) {
    case 'litiase':
      return `Litíase no rim ${lado}${loc}.`
    case 'cisto_simples':
      return `Cisto simples no rim ${lado}${loc}.`
    case 'cisto_complexo': {
      const c = st['achados.cisto_complexo.carac']
      const carac = c ? `apresentando ${limpa(String(c)).replace(/^com\s+/i, '')}, ` : ''
      return `Cisto no rim ${lado} ${carac}de aspecto inespecífico.`
    }
    case 'nodulo':
      return `Imagem nodular sólida no rim ${lado}${loc}, a esclarecer. Correlacionar com dados clínicos.`
    case 'ectasia':
      return `Ectasia pielocalicial no rim ${lado}${loc}.`
    default:
      return ''
  }
}

function rimCompose(lado: 'direito' | 'esquerdo', st: OrganState): OrganComposition {
  const ladoFem = lado === 'direito' ? 'direita' : 'esquerda'
  const estrutura = (st.estrutura as string[]) || []
  const drc = estrutura.includes('drc')
  const situacao = estrutura.includes('situacao_baixa')
  const rotacao = estrutura.includes('rotacao')
  const achados = (st.achados as string[]) || []
  const hidro = (st.hidronefrose as string) || 'ausente'
  const altDifusa = limpa(String(st.alteracao_difusa ?? ''))

  const dimKey = drc ? 'reduzida' : (st.dimensao as string) || 'normal'
  const dim = DIMENSAO[dimKey] ?? DIMENSAO.normal

  const sitParts: string[] = []
  if (situacao) sitParts.push('de situação baixa')
  if (rotacao) sitParts.push('com rotação')
  const meio = sitParts.length > 0 ? sitParts.join(' e ') : 'medidos pelo flanco'
  const abertura = `Rim ${lado} com diâmetros longitudinal e anteroposterior ${dim}, ${meio}, apresentando`

  // final (prioridade: hidronefrose > achados > drc > situação/rotação > normal)
  let final: string
  if (hidro !== 'ausente') {
    final = 'imagens anecóicas no sistema pielocalicial'
  } else if (achados.length > 0) {
    final = achados.map((t) => descreveAchado(t, st)).filter(Boolean).join('; ')
  } else if (drc) {
    final = 'ecotextura do seio renal e diferenciação corticomedular reduzidas'
  } else if (situacao || rotacao) {
    final = 'ecotextura do seio renal e ecotextura corticomedular normais'
  } else if (altDifusa) {
    final = altDifusa
  } else {
    final = RIM_FINAL_NORMAL
  }

  const body = [
    `${abertura} ${final}.`,
    `Medida do rim ${lado}: ${medidas3(st.medidas)}.`,
    `Medida da espessura do parênquima do rim ${lado}: ${espessura(st.espessura)} cm.`,
  ].join('\n')

  // conclusão por rim
  const conclusion: string[] = []
  const alterado = achados.length > 0 || drc || situacao || rotacao || hidro !== 'ausente' || !!altDifusa
  if (!alterado) {
    conclusion.push(`Rim ${lado} ecograficamente normal.`)
  } else {
    if (!drc && altDifusa) {
      conclusion.push(`Alteração difusa do rim ${lado} (${altDifusa}).`)
    }
    if (drc) {
      conclusion.push(
        `Rim ${lado} de dimensões reduzidas, com redução da diferenciação corticomedular, podendo corresponder a doença renal crônica.`
      )
    }
    if (situacao || rotacao) {
      const sit: string[] = []
      if (situacao) sit.push('de situação baixa')
      if (rotacao) sit.push('com rotação')
      conclusion.push(`Rim ${lado} ${sit.join(' e ')}.`)
    }
    if (hidro !== 'ausente') {
      const h = HIDRONEFROSE[hidro]
      if (h) conclusion.push(`Hidronefrose ${h.txt} ${h.grau} à ${ladoFem}.`)
    }
    for (const t of achados) {
      const item = concluiAchado(t, st, lado)
      if (item) conclusion.push(item)
    }
  }

  return { body, conclusion, isNormal: !alterado }
}

function makeRimModule(lado: 'direito' | 'esquerdo'): OrganModule {
  return {
    schema: rimSchema(lado),
    initialState: rimInitial,
    compose: (st) => rimCompose(lado, st),
  }
}

// ── Ureteres ─────────────────────────────────────────────────────────────────
const ureteresModule: OrganModule = {
  schema: {
    id: 'ureteres',
    name: 'Ureteres',
    category: 'VIAS_URINARIAS',
    fields: [
      {
        key: 'dilatacao',
        label: 'Dilatação ureteral',
        kind: 'segmented',
        hint: 'default: ausente',
        options: [
          { value: 'nao', label: 'Ausente', isDefault: true },
          { value: 'sim', label: 'Presente', subFields: [{ key: 'desc', label: 'Lado / grau', kind: 'text', placeholder: 'ureter direito dilatado…' }] },
        ],
      },
    ],
  },
  initialState: () => ({ dilatacao: 'nao', 'dilatacao.sim.desc': '' }),
  compose: (st): OrganComposition => {
    if ((st.dilatacao as string) === 'sim') {
      const desc = limpa(String(st['dilatacao.sim.desc'] ?? ''))
      return {
        body: desc ? `${desc}.` : 'Dilatação ureteral.',
        conclusion: [desc ? `Dilatação ureteral (${desc}).` : 'Dilatação ureteral.'],
        isNormal: false,
      }
    }
    return { body: '', conclusion: ['Não há sinais de dilatação ureteral.'], isNormal: true }
  },
}

// ── Bexiga ───────────────────────────────────────────────────────────────────
const BEXIGA_PAREDE: Record<string, string> = {
  espessada: 'de paredes espessadas',
  trabeculada: 'de paredes trabeculadas',
}
const BEXIGA_CONTEUDO: Record<string, string> = {
  debris: 'com debris de permeio',
  calculo: 'com imagem hiperecogênica com sombra acústica (cálculo)',
  sonda: 'com balão de sonda vesical em seu interior',
}
const bexigaModule: OrganModule = {
  schema: {
    id: 'bexiga',
    name: 'Bexiga',
    category: 'VIAS_URINARIAS',
    fields: [
      {
        key: 'avaliada',
        label: 'Avaliação',
        kind: 'segmented',
        hint: 'default: avaliada',
        options: [
          { value: 'sim', label: 'Avaliada', isDefault: true },
          { value: 'nao', label: 'Repleção insuficiente' },
        ],
      },
      { key: 'parede', label: 'Parede', kind: 'checklist', hint: 'marque se alterada', options: [
        { value: 'espessada', label: 'Espessada' },
        { value: 'trabeculada', label: 'Trabeculada' },
      ] },
      { key: 'conteudo', label: 'Conteúdo', kind: 'checklist', hint: 'marque se alterado', options: [
        { value: 'debris', label: 'Ecos (Debris)' },
        { value: 'calculo', label: 'Cálculo' },
        { value: 'sonda', label: 'Sonda' },
      ] },
      { key: 'volume_pre', label: 'Volume pré-miccional', kind: 'volume', unit: 'mL', placeholder: '250' },
      { key: 'espessura_parede', label: 'Espessura da parede (mm)', kind: 'text', placeholder: '3' },
      { key: 'residuo', label: 'Resíduo pós-miccional (mL)', kind: 'text', placeholder: '20' },
    ],
  },
  initialState: () => ({ avaliada: 'sim', parede: [], conteudo: [], volume_pre: '', espessura_parede: '', residuo: '' }),
  compose: (st): OrganComposition => {
    const avaliada = (st.avaliada as string) !== 'nao'
    const parede = (st.parede as string[]) || []
    const conteudo = (st.conteudo as string[]) || []
    const volume = parseNum(st.volume_pre)
    const espParede = parseNum(st.espessura_parede)
    const residuo = parseNum(st.residuo)

    const body: string[] = []
    const conclusion: string[] = []

    if (!avaliada) {
      body.push('Bexiga com repleção insuficiente no momento do exame, prejudicando a sua adequada avaliação.')
      conclusion.push('Bexiga com repleção insuficiente para adequada avaliação.')
    } else if (parede.length > 0 || conteudo.length > 0) {
      const sub = ['Bexiga', ...parede.map((p) => BEXIGA_PAREDE[p] ?? p), ...conteudo.map((c) => BEXIGA_CONTEUDO[c] ?? c)]
      body.push(`${sub.join(', ')}.`)
      const subC = [...parede.map((p) => BEXIGA_PAREDE[p] ?? p), ...conteudo.map((c) => BEXIGA_CONTEUDO[c] ?? c)]
      conclusion.push(`Bexiga ${subC.join(', ')}.`)
    } else {
      body.push('Bexiga de forma, contorno e ecotextura normais.')
      conclusion.push('Bexiga ecograficamente normal.')
    }

    // Volume/espessura/resíduo só fazem sentido com a bexiga avaliada.
    if (avaliada && volume != null) body.push(`Volume pré-miccional de ${ptBr1(volume)} mL.`)
    if (avaliada && espParede != null) body.push(`Espessura da parede vesical de aproximadamente ${ptBr1(espParede)} mm.`)
    if (avaliada && residuo != null) conclusion.push(`Resíduo pós-miccional de ${ptBr1(residuo)} cm³.`)

    return { body: body.join('\n'), conclusion, isNormal: avaliada && parede.length === 0 && conteudo.length === 0 }
  },
}

// ── Categoria ────────────────────────────────────────────────────────────────
export const viasUrinarias: ExamCategory = {
  id: 'VIAS_URINARIAS',
  name: 'Vias Urinárias',
  title: 'ULTRASSONOGRAFIA DAS VIAS URINÁRIAS',
  tecnica:
    'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes dos rins, em decúbito dorsal e ventral. Após repleção vesical foram realizados cortes da pelve com o paciente em decúbito dorsal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'rim_direito', label: 'Rim direito', group: 'orgaos', module: makeRimModule('direito') },
    { id: 'rim_esquerdo', label: 'Rim esquerdo', group: 'orgaos', module: makeRimModule('esquerdo') },
    { id: 'ureteres', label: 'Ureteres', group: 'orgaos', module: ureteresModule },
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: bexigaModule },
  ],
  conclusionNormal: 'Exame ultrassonográfico das vias urinárias dentro dos limites da normalidade.',
}
