/**
 * Categoria HYCOSY (histerossonossalpingografia com contraste) — formulário
 * estruturado Web (composição local, MVP).
 *
 * Referência de cobertura (só o escopo; a redação é própria):
 * docs/competitor-research/laudario/crosswalk-hycosy-2026-10-03.md e
 * cases/hycosy-2026-10-03.md.
 *
 * Estrutura: técnica e contraste, canal e cavidade, uma seção por tuba (dois
 * objetos independentes) e recomendação opt-in.
 *
 * Regras de segurança:
 * - agente de contraste, volume, cateter e balão nunca são presumidos: o
 *   agente é obrigatório e os volumes só entram quando digitados;
 * - cada tuba tem estado próprio (pérvia, perviedade parcial, obstrução
 *   proximal/distal, espasmo, indeterminada, não avaliada); dispersão
 *   peritoneal e Sinal de Cotte são DERIVADOS do estado e da mesma lateralidade;
 * - espasmo não é obstrução e indeterminado não é normal: a tuba fica com
 *   perviedade indeterminada, e a hipótese de espasmo exige confirmação;
 * - obstrução exige localização (proximal/distal e segmento) e confirmação;
 *   perviedade parcial exige confirmação;
 * - o lado contralateral segue conclusivo quando adequadamente avaliado;
 * - limitação técnica global entra na conclusão; reestudo e outras
 *   recomendações só por escolha explícita e confirmada.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { texto, valorNumerico } from './superficialShared'

const CATEGORIA = 'HYCOSY'

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const campo = (key: string, label: string, placeholder: string, halfWidth = false): Field => ({ key, label, kind: 'text', placeholder, ...(halfWidth ? { halfWidth } : {}) })
const CONFIRMA = [['nao', 'Pendente de confirmação'], ['sim', 'Confirmado pelo médico']] as const
const frase = (s: string) => s.trim().replace(/[.;,:\s]+$/u, '')
const minuscula = (s: string) => (s ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s)
const entreParenteses = (s: string) => (s ? ` (${minuscula(frase(s))})` : '')

export function modeloNormal(opts: OrganState): boolean {
  return texto(opts, 'modelo') === 'normal'
}
const fromModel = (st: OrganState, opts: OrganState, key: string, normalValue: string, blank: string) => {
  const raw = texto(st, key) || 'modelo'
  return raw === 'modelo' ? (modeloNormal(opts) ? normalValue : blank) : raw
}
function moduleWith(id: string, name: string, fields: Field[], compose: OrganModule['compose'], extraInitial: OrganState = {}): OrganModule {
  return {
    schema: { id, name, category: CATEGORIA, fields },
    initialState: () => ({ ...Object.fromEntries(fields.map(f => [f.key, f.options?.find(o => o.isDefault)?.value ?? (f.kind === 'checklist' ? [] : '')])), ...extraInitial }),
    compose,
  }
}
const resultado = (linhas: string[], conclusion: string[], pendencias: PendenciaLocal[], normal: boolean): OrganComposition =>
  ({ body: linhas.join('\n'), conclusion, pendencias, isNormal: normal && pendencias.length === 0 })
/** Volume opcional em mL: vazio = não informado; inválido vira pendência. */
function volume(st: OrganState, key: string, onde: string, nome: string, pendencias: PendenciaLocal[]): string | null {
  const raw = texto(st, key).trim()
  if (!raw) return null
  if (valorNumerico(raw) === null) { pendencias.push({ onde, motivo: `${nome} inválido` }); return null }
  return raw.replace('.', ',').replace(/\s*ml$/i, '')
}

// ── Técnica e contraste ───────────────────────────────────────────────────────
const AGENTE: Record<string, string> = {
  microbolhas: 'agente de contraste ultrassonográfico de microbolhas',
  espuma: 'espuma (gel) para contraste tubário',
  salina_ar: 'solução salina agitada com ar',
}
const MODALIDADE: Record<string, string> = { '2d': 'bidimensional', '3d': 'tridimensional/4D', doppler: 'Doppler colorido/de amplitude' }

const tecnica = moduleWith('tecnica', 'Técnica e contraste', [
  select('cateterizacao', 'Cateterização do canal', [['modelo', 'Conforme modelo'], ['realizada', 'Realizada'], ['nao_obtida', 'Não obtida']]),
  campo('cateter', 'Cateter (tipo/calibre, se informado)', 'Ex.: cateter de balão 8 Fr', true),
  campo('balao_ml', 'Volume no balão (mL, se informado)', '2', true),
  { key: 'agente', label: 'Agente de contraste', kind: 'segmented', presentation: 'select', hint: 'obrigatório; nunca presumido', options: [
    { value: 'nao_informado', label: 'Selecione o agente', isDefault: true },
    { value: 'microbolhas', label: 'Contraste de microbolhas' },
    { value: 'espuma', label: 'Espuma (gel)' },
    { value: 'salina_ar', label: 'Solução salina agitada com ar' },
    { value: 'outro', label: 'Outro', subFields: [campo('descricao', 'Agente utilizado', 'descrever o agente')] },
  ] },
  campo('volume_ml', 'Volume de contraste (mL, se informado)', '10', true),
  { key: 'modalidades', label: 'Modalidades', kind: 'checklist', hint: 'marque as utilizadas', options: [
    { value: '2d', label: 'Bidimensional' },
    { value: '3d', label: 'Tridimensional/4D' },
    { value: 'doppler', label: 'Doppler colorido/de amplitude' },
  ] },
  { key: 'condicoes', label: 'Condições técnicas', kind: 'segmented', presentation: 'select', options: [
    { value: 'modelo', label: 'Conforme modelo', isDefault: true },
    { value: 'adequadas', label: 'Adequadas' },
    { value: 'limitadas', label: 'Limitadas', subFields: [campo('motivo', 'Motivo', 'Ex.: refluxo do contraste pelo colo')] },
  ] },
  select('intercorrencia', 'Intercorrência', [['nenhuma', 'Nenhuma registrada'], ['dor', 'Dor relevante'], ['reacao_vagal', 'Reação vagal'], ['sangramento', 'Sangramento'], ['refluxo', 'Refluxo do contraste pelo colo']]),
  { key: 'interrupcao', label: 'Procedimento interrompido', kind: 'segmented', presentation: 'select', options: [
    { value: 'nao', label: 'Não', isDefault: true },
    { value: 'sim', label: 'Sim', subFields: [campo('motivo', 'Motivo da interrupção', 'Ex.: intolerância da paciente')] },
  ] },
], (st, opts = {}) => {
  const linhas: string[] = []
  const conclusion: string[] = []
  const pendencias: PendenciaLocal[] = []
  const onde = 'Técnica'
  const cateterizacao = fromModel(st, opts, 'cateterizacao', 'realizada', 'nao_informada')
  const condicoes = fromModel(st, opts, 'condicoes', 'adequadas', 'nao_informada')
  const agenteKey = texto(st, 'agente')
  const agente = agenteKey === 'outro' ? frase(texto(st, 'agente.outro.descricao')) : AGENTE[agenteKey]
  const cateter = frase(texto(st, 'cateter'))
  const balao = volume(st, 'balao_ml', onde, 'volume do balão', pendencias)
  const vol = volume(st, 'volume_ml', onde, 'volume de contraste', pendencias)
  const modalidades = (Array.isArray(st.modalidades) ? st.modalidades : []).map(m => MODALIDADE[m]).filter(Boolean)

  if (cateterizacao === 'nao_informada') pendencias.push({ onde, motivo: 'informe se a cateterização do canal foi realizada' })
  if (cateterizacao === 'realizada' && !agente) {
    pendencias.push({ onde, motivo: agenteKey === 'outro' ? 'descreva o agente de contraste' : 'selecione o agente de contraste' })
  }
  if (condicoes === 'nao_informada') pendencias.push({ onde, motivo: 'informe as condições técnicas' })

  if (cateterizacao === 'realizada' && agente) {
    linhas.push(`Procedimento: cateterização do canal cervical${cateter ? ` com ${minuscula(cateter)}` : ''}${balao ? `, com ${balao} mL no balão,` : ''} e infusão de ${vol ? `${vol} mL de ` : ''}${minuscula(agente)}, sob controle ultrassonográfico${modalidades.length ? `, com avaliação ${modalidades.join(', ')}` : ''}.`)
  }
  if (cateterizacao === 'nao_obtida') {
    linhas.push('Procedimento: não foi possível a cateterização do canal cervical.')
    conclusion.push('Não foi possível a cateterização do canal cervical; cavidade uterina e tubas não avaliadas ao método.')
  }
  if (condicoes === 'limitadas') {
    const motivo = frase(texto(st, 'condicoes.limitadas.motivo'))
    if (!motivo) pendencias.push({ onde, motivo: 'descreva a limitação das condições técnicas' })
    else {
      linhas.push(`Condições técnicas limitadas: ${minuscula(motivo)}.`)
      conclusion.push(`Exame com limitação técnica (${minuscula(motivo)}).`)
    }
  }
  const INTERCORRENCIA: Record<string, string> = { dor: 'dor relevante durante a infusão', reacao_vagal: 'reação vagal', sangramento: 'sangramento', refluxo: 'refluxo do contraste pelo orifício cervical' }
  const intercorrencia = INTERCORRENCIA[texto(st, 'intercorrencia')]
  if (intercorrencia) linhas.push(`Intercorrência: ${intercorrencia}.`)
  if (texto(st, 'interrupcao') === 'sim') {
    const motivo = frase(texto(st, 'interrupcao.sim.motivo'))
    if (!motivo) pendencias.push({ onde, motivo: 'descreva o motivo da interrupção' })
    else {
      linhas.push(`Procedimento interrompido: ${minuscula(motivo)}.`)
      conclusion.push(`Procedimento interrompido (${minuscula(motivo)}).`)
    }
  }
  return resultado(linhas, conclusion, pendencias, conclusion.length === 0)
}, { 'agente.outro.descricao': '', 'condicoes.limitadas.motivo': '', 'interrupcao.sim.motivo': '' })

// ── Canal e cavidade ──────────────────────────────────────────────────────────
const cavidade = moduleWith('cavidade', 'Canal e cavidade uterina', [
  select('canal', 'Canal endocervical', [['modelo', 'Conforme modelo'], ['pervio', 'Pérvio'], ['dificuldade', 'Progressão do cateter com dificuldade'], ['nao_avaliado', 'Não avaliado']]),
  { key: 'cavidade', label: 'Cavidade uterina', kind: 'segmented', presentation: 'select', options: [
    { value: 'modelo', label: 'Conforme modelo', isDefault: true },
    { value: 'sem_alteracoes', label: 'Sem alterações' },
    { value: 'achado', label: 'Achado observado', subFields: [campo('descricao', 'Descrição observada (com topografia e medidas)', 'descrever somente o observado')] },
    { value: 'nao_avaliada', label: 'Não avaliada', subFields: [campo('motivo', 'Motivo (opcional)', 'Ex.: distensão não obtida')] },
  ] },
], (st, opts = {}) => {
  const linhas: string[] = []
  const conclusion: string[] = []
  const pendencias: PendenciaLocal[] = []
  const canal = fromModel(st, opts, 'canal', 'pervio', 'nao_informado')
  const cav = fromModel(st, opts, 'cavidade', 'sem_alteracoes', 'nao_informada')
  if (canal === 'nao_informado') pendencias.push({ onde: 'Canal e cavidade', motivo: 'informe a avaliação do canal endocervical' })
  if (cav === 'nao_informada') pendencias.push({ onde: 'Canal e cavidade', motivo: 'informe o resultado da cavidade uterina' })
  if (canal === 'pervio') linhas.push('Canal endocervical pérvio.')
  if (canal === 'dificuldade') linhas.push('Progressão do cateter pelo canal endocervical com dificuldade técnica.')
  if (canal === 'nao_avaliado') linhas.push('Canal endocervical não avaliado.')
  if (cav === 'sem_alteracoes') {
    linhas.push('Cavidade uterina preenchida pelo contraste, de contornos regulares, sem falhas de enchimento.')
    conclusion.push('Cavidade uterina sem alterações identificáveis ao método.')
  }
  if (cav === 'achado') {
    const descricao = frase(texto(st, 'cavidade.achado.descricao'))
    if (!descricao) pendencias.push({ onde: 'Canal e cavidade', motivo: 'descreva o achado da cavidade uterina' })
    else {
      linhas.push(`Cavidade uterina: ${minuscula(descricao)}.`)
      conclusion.push(`Cavidade uterina: ${minuscula(descricao)}.`)
    }
  }
  if (cav === 'nao_avaliada') {
    const motivo = texto(st, 'cavidade.nao_avaliada.motivo')
    linhas.push(`Cavidade uterina não avaliada${entreParenteses(motivo)}.`)
    conclusion.push(`Cavidade uterina não avaliada${entreParenteses(motivo)}.`)
  }
  return resultado(linhas, conclusion, pendencias, cav === 'sem_alteracoes')
}, { 'cavidade.achado.descricao': '', 'cavidade.nao_avaliada.motivo': '' })

// ── Tubas (uma seção por lado) ────────────────────────────────────────────────
export type Lado = 'direita' | 'esquerda'
export type EstadoTuba = 'pervia' | 'parcial' | 'obstrucao_proximal' | 'obstrucao_distal' | 'espasmo' | 'indeterminada' | 'nao_avaliada' | 'nao_informada'
export type Cotte = 'positivo' | 'negativo' | 'indeterminado' | null

/** Sinal de Cotte derivado do estado (nunca digitado). */
export function cotteDerivado(estado: EstadoTuba): Cotte {
  if (estado === 'pervia' || estado === 'parcial') return 'positivo'
  if (estado === 'obstrucao_proximal' || estado === 'obstrucao_distal') return 'negativo'
  if (estado === 'espasmo' || estado === 'indeterminada') return 'indeterminado'
  return null
}

const SEGMENTO_DISTAL: Record<string, string> = { ampular: 'ampular', fimbrial: 'fimbrial' }

function tubaFields(): Field[] {
  return [
    { key: 'estado', label: 'Perviedade', kind: 'segmented', presentation: 'select', options: [
      { value: 'modelo', label: 'Conforme modelo', isDefault: true },
      { value: 'pervia', label: 'Pérvia', subFields: [
        select('progressao', 'Progressão do contraste', [['livre', 'Livre, sem resistência'], ['resistencia', 'Com resistência à injeção']]),
        select('dispersao', 'Dispersão peritoneal', [['periovariana', 'Periovariana'], ['peritoneal', 'Peritoneal, sem envolvimento periovariano caracterizado']]),
      ] },
      { value: 'parcial', label: 'Perviedade parcial', subFields: [
        select('progressao', 'Progressão do contraste', [['lenta', 'Lenta/filiforme'], ['resistencia', 'Com resistência à injeção']]),
        select('confirmado', 'Confirmação médica', CONFIRMA),
      ] },
      { value: 'obstrucao_proximal', label: 'Obstrução proximal', subFields: [select('confirmado', 'Confirmação médica da obstrução', CONFIRMA)] },
      { value: 'obstrucao_distal', label: 'Obstrução distal', subFields: [
        select('segmento', 'Segmento', [['nao_informado', 'Selecione o segmento'], ['ampular', 'Ampular'], ['fimbrial', 'Fimbrial']]),
        { key: 'dilatacao', label: 'Morfologia', kind: 'checklist', options: [{ value: 'sim', label: 'Tuba dilatada' }] },
        select('confirmado', 'Confirmação médica da obstrução', CONFIRMA),
      ] },
      { value: 'espasmo', label: 'Sem progressão — hipótese de espasmo', subFields: [select('confirmado', 'Confirmação médica da hipótese de espasmo', CONFIRMA)] },
      { value: 'indeterminada', label: 'Indeterminada', subFields: [campo('motivo', 'Motivo', 'Ex.: sobreposição de alças')] },
      { value: 'nao_avaliada', label: 'Não avaliada', subFields: [campo('motivo', 'Motivo (opcional)', 'Ex.: procedimento interrompido')] },
    ] },
  ]
}

const TUBA_INITIAL: OrganState = {
  'estado.pervia.progressao': 'livre', 'estado.pervia.dispersao': 'periovariana',
  'estado.parcial.progressao': 'lenta', 'estado.parcial.confirmado': 'nao',
  'estado.obstrucao_proximal.confirmado': 'nao',
  'estado.obstrucao_distal.segmento': 'nao_informado', 'estado.obstrucao_distal.dilatacao': [], 'estado.obstrucao_distal.confirmado': 'nao',
  'estado.espasmo.confirmado': 'nao', 'estado.indeterminada.motivo': '', 'estado.nao_avaliada.motivo': '',
}

export function estadoTuba(st: OrganState, opts: OrganState): EstadoTuba {
  return fromModel(st, opts, 'estado', 'pervia', 'nao_informada') as EstadoTuba
}

function tubaModule(lado: Lado): OrganModule {
  const onde = `Tuba ${lado}`
  return moduleWith(`tuba_${lado}`, `Tuba uterina ${lado}`, tubaFields(), (st, opts = {}) => {
    const estado = estadoTuba(st, opts)
    const linhas: string[] = []
    const conclusion: string[] = []
    const pendencias: PendenciaLocal[] = []
    const confirmado = (e: string) => texto(st, `estado.${e}.confirmado`) === 'sim'
    const cotte = cotteDerivado(estado)
    const linhaCotte = cotte ? `Sinal de Cotte ${cotte} à ${lado}.` : ''

    switch (estado) {
      case 'nao_informada':
        pendencias.push({ onde, motivo: 'informe a perviedade tubária' })
        break
      case 'pervia': {
        const resistencia = texto(st, 'estado.pervia.progressao') === 'resistencia'
        const periovariana = texto(st, 'estado.pervia.dispersao') !== 'peritoneal'
        linhas.push(`Tuba uterina ${lado}: progressão do contraste ao longo de todo o trajeto tubário${resistencia ? ', com resistência à injeção' : ', sem resistência à injeção'}, com dispersão peritoneal${periovariana ? ' periovariana' : ''} do contraste. ${linhaCotte}`)
        conclusion.push(`Tuba uterina ${lado} pérvia, com dispersão peritoneal do contraste.`)
        break
      }
      case 'parcial':
        if (!confirmado('parcial')) pendencias.push({ onde, motivo: 'confirme a perviedade parcial' })
        linhas.push(`Tuba uterina ${lado}: progressão ${texto(st, 'estado.parcial.progressao') === 'resistencia' ? 'com resistência à injeção' : 'lenta e filiforme'} do contraste, com dispersão peritoneal reduzida. ${linhaCotte}`)
        conclusion.push(`Perviedade parcial da tuba uterina ${lado}.`)
        break
      case 'obstrucao_proximal':
        if (!confirmado('obstrucao_proximal')) pendencias.push({ onde, motivo: 'confirme a obstrução proximal' })
        linhas.push(`Tuba uterina ${lado}: ausência de progressão do contraste a partir do óstio tubário, sem dispersão peritoneal ipsilateral. ${linhaCotte}`)
        conclusion.push(`Obstrução tubária proximal à ${lado}.`)
        break
      case 'obstrucao_distal': {
        const segmento = SEGMENTO_DISTAL[texto(st, 'estado.obstrucao_distal.segmento')]
        const dilatada = Array.isArray(st['estado.obstrucao_distal.dilatacao']) && st['estado.obstrucao_distal.dilatacao'].includes('sim')
        if (!segmento) pendencias.push({ onde, motivo: 'informe o segmento da obstrução distal' })
        if (!confirmado('obstrucao_distal')) pendencias.push({ onde, motivo: 'confirme a obstrução distal' })
        linhas.push(`Tuba uterina ${lado}: progressão do contraste até o segmento ${segmento ?? 'distal'}, sem dispersão peritoneal ipsilateral${dilatada ? ', com dilatação tubária' : ''}. ${linhaCotte}`)
        conclusion.push(`Obstrução tubária distal à ${lado}${segmento ? `, no segmento ${segmento}` : ''}${dilatada ? ', com dilatação tubária' : ''}.`)
        break
      }
      case 'espasmo':
        if (!confirmado('espasmo')) pendencias.push({ onde, motivo: 'confirme a hipótese de espasmo ou marque a tuba como indeterminada' })
        linhas.push(`Tuba uterina ${lado}: ausência de progressão do contraste neste exame, com aspecto sugestivo de espasmo tubário; dispersão peritoneal indeterminada. ${linhaCotte}`)
        conclusion.push(`Ausência de progressão do contraste na tuba uterina ${lado}, com aspecto sugestivo de espasmo tubário, sem distinção segura de obstrução orgânica; perviedade tubária ${lado} indeterminada neste exame.`)
        break
      case 'indeterminada': {
        const motivo = frase(texto(st, 'estado.indeterminada.motivo'))
        if (!motivo) pendencias.push({ onde, motivo: 'informe o motivo da indeterminação' })
        linhas.push(`Tuba uterina ${lado}: perviedade não caracterizada${entreParenteses(motivo)}; dispersão peritoneal indeterminada. ${linhaCotte}`)
        conclusion.push(`Perviedade tubária ${lado} indeterminada ao método${entreParenteses(motivo)}.`)
        break
      }
      case 'nao_avaliada': {
        const motivo = texto(st, 'estado.nao_avaliada.motivo')
        linhas.push(`Tuba uterina ${lado} não avaliada${entreParenteses(motivo)}.`)
        conclusion.push(`Tuba uterina ${lado} não avaliada${entreParenteses(motivo)}.`)
        break
      }
    }
    return resultado(linhas.map(l => l.trim()), conclusion, pendencias, estado === 'pervia')
  }, TUBA_INITIAL)
}

// ── Recomendação (opt-in) ─────────────────────────────────────────────────────
const recomendacao = moduleWith('recomendacao', 'Recomendação', [
  select('opcao', 'Recomendação', [['nenhuma', 'Nenhuma'], ['reestudo', 'Reestudo'], ['correlacao', 'Correlação clínica']]),
  select('confirmada', 'Confirmação médica da recomendação', CONFIRMA),
], (st) => {
  const opcao = texto(st, 'opcao')
  if (opcao === 'nenhuma' || !opcao) {
    return resultado([], [], texto(st, 'confirmada') === 'sim' ? [{ onde: 'Recomendação', motivo: 'a confirmação exige uma recomendação selecionada' }] : [], true)
  }
  const pendencias: PendenciaLocal[] = []
  if (texto(st, 'confirmada') !== 'sim') pendencias.push({ onde: 'Recomendação', motivo: 'confirme a recomendação ou selecione "Nenhuma"' })
  const TEXTO: Record<string, string> = {
    reestudo: 'Convém, a critério clínico, reestudo em momento oportuno.',
    correlacao: 'Correlacionar com dados clínicos.',
  }
  return resultado([], pendencias.length ? [] : [TEXTO[opcao]!], pendencias, true)
})

// ── Conflitos entre seções e consolidação ─────────────────────────────────────
/** Coerência entre técnica, cavidade e tubas (bloqueante). */
export function conflitosHycosy(state: Record<string, OrganState>): PendenciaLocal[] {
  const opts = state.__opts ?? {}
  const pendencias: PendenciaLocal[] = []
  const semCateter = fromModel(state.tecnica ?? {}, opts, 'cateterizacao', 'realizada', 'nao_informada') === 'nao_obtida'
  const interrompido = texto(state.tecnica ?? {}, 'interrupcao') === 'sim'
  const tubasAvaliadas = (['direita', 'esquerda'] as const).filter(l => !['nao_avaliada', 'nao_informada'].includes(estadoTuba(state[`tuba_${l}`] ?? {}, opts)))
  if (semCateter && tubasAvaliadas.length) pendencias.push({ onde: 'Tubas', motivo: 'sem cateterização, as tubas devem constar como não avaliadas' })
  if (semCateter && fromModel(state.cavidade ?? {}, opts, 'cavidade', 'sem_alteracoes', 'nao_informada') !== 'nao_avaliada') {
    pendencias.push({ onde: 'Canal e cavidade', motivo: 'sem cateterização, a cavidade deve constar como não avaliada' })
  }
  const reestudo = texto(state.recomendacao ?? {}, 'opcao') === 'reestudo'
  const algoInconclusivo = interrompido || semCateter
    || texto(state.tecnica ?? {}, 'condicoes') === 'limitadas'
    || (['direita', 'esquerda'] as const).some(l => ['espasmo', 'indeterminada', 'nao_avaliada'].includes(estadoTuba(state[`tuba_${l}`] ?? {}, opts)))
  if (reestudo && !algoInconclusivo) pendencias.push({ onde: 'Recomendação', motivo: 'reestudo só se aplica a exame limitado ou tuba inconclusiva' })
  return pendencias
}

const PERVIA = (lado: Lado) => `Tuba uterina ${lado} pérvia, com dispersão peritoneal do contraste.`
/** Ambas pérvias viram um item só: "Tubas uterinas pérvias bilateralmente…". */
function consolidarTubas(items: string[]): string[] {
  if (!items.includes(PERVIA('direita')) || !items.includes(PERVIA('esquerda'))) return items
  return items.flatMap(item => item === PERVIA('direita')
    ? ['Tubas uterinas pérvias bilateralmente, com dispersão peritoneal bilateral do contraste.']
    : item === PERVIA('esquerda') ? [] : [item])
}

const sections: ExamSection[] = [
  { id: 'tecnica', label: 'Técnica e contraste', group: 'orgaos', module: tecnica },
  { id: 'cavidade', label: 'Canal e cavidade uterina', group: 'orgaos', module: cavidade },
  { id: 'tuba_direita', label: 'Tuba uterina direita', group: 'orgaos', module: tubaModule('direita') },
  { id: 'tuba_esquerda', label: 'Tuba uterina esquerda', group: 'orgaos', module: tubaModule('esquerda') },
  { id: 'recomendacao', label: 'Recomendação', group: 'orgaos', module: recomendacao },
]

export const hycosy: ExamCategory = {
  id: CATEGORIA,
  name: 'Histerossonossalpingografia (HyCoSy)',
  title: 'HISTEROSSONOSSALPINGOGRAFIA COM CONTRASTE (HYCOSY)',
  tecnica: 'Exame realizado por via transvaginal, com transdutor endocavitário multifrequencial, com cateterização do canal cervical e infusão de contraste sob controle ultrassonográfico para avaliação da cavidade uterina e da perviedade tubária, conforme descrito nos achados.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections,
  controls: [
    select('modelo', 'Modelo de partida', [['em_branco', 'Em branco'], ['normal', 'Normal — cateterização, condições adequadas, canal pérvio, cavidade sem alterações e tubas pérvias']]),
  ],
  resolveConclusionItems: (items) => consolidarTubas(items),
  conclusionNormal: 'Tubas uterinas pérvias bilateralmente.',
}

/** Pendências entre seções, lidas pelo registro local (a tela soma às da composição). */
export function hycosyIssuesDoExame(state: Record<string, OrganState>): string[] {
  return conflitosHycosy(state).map(p => `${p.onde}: ${p.motivo}`)
}
