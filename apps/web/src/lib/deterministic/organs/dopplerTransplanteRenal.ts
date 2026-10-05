/**
 * Categoria DOPPLER DE TRANSPLANTE RENAL — geração determinística local (MVP Web).
 *
 * Código próprio, nunca variante de DOPPLER_RENAL: critérios de rim nativo
 * (relação aorto-renal, "artérias renais direita/esquerda") não entram aqui.
 *
 * Base: estrutura de laudo do rascunho em curadoria
 * `packages/knowledge/snippets/DOPPLER_RENAL/excecao/__rev__/rim-transplantado.md`
 * (localização, enxerto, anastomose, veia, vasos intrarrenais em três pontos,
 * coleções) e as salvaguardas dos estudos de 03/10 (`preflight-doppler-
 * transplante-renal` e `cases/doppler-transplante-renal`). Os LIMIARES do
 * rascunho são preliminares e NÃO são usados: nenhum número decide sozinho.
 *
 * Regras que este módulo garante:
 *  - localização do enxerto é campo próprio (não é lateralidade);
 *  - medidas de origem preservadas; razão anastomose/ilíaca e IR médio são
 *    derivados só com as medidas que os compõem;
 *  - a interpretação da anastomose e dos índices de resistência não tem
 *    padrão: o médico escolhe, e sem escolha há pendência — uma medida nunca
 *    convive em silêncio com uma conclusão normal pré-marcada;
 *  - estenose exige VPS na anastomose, VPS ilíaca e confirmação médica;
 *    ausência de fluxo (trombose) exige confirmação médica;
 *  - IR elevado nunca vira rejeição nem outro diagnóstico;
 *  - natureza de coleção só quando o médico escolhe;
 *  - estrutura não avaliada sai como não avaliada, nunca como normal.
 *
 * Ainda não migrada para o renderer canônico: compõe localmente.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'
import { formatarEixos, lerEixos, ptBr1, textoLivre } from './medidasLocais'

const CATEGORIA = 'DOPPLER_TRANSPLANTE_RENAL'
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** Número positivo dentro de um intervalo; vazio = null; resto = 'invalida'. */
export function lerNumero(raw: unknown, max: number): number | null | 'invalida' {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string' && typeof raw !== 'number') return 'invalida'
  const s = String(raw).trim().replace(',', '.')
  if (!s) return null
  if (!/^\d+(?:\.\d+)?$/.test(s)) return 'invalida'
  const n = Number(s)
  return Number.isFinite(n) && n > 0 && n < max ? n : 'invalida'
}

const vel = (n: number) => (Number.isInteger(n) ? String(n) : ptBr1(n))
const ir2 = (n: number) => n.toFixed(2).replace('.', ',')

const LOCALIZACAO: Record<string, string> = {
  fid: 'em fossa ilíaca direita',
  fie: 'em fossa ilíaca esquerda',
  pelve: 'em topografia pélvica',
}

const CONFIRMACAO = (key: string, label: string): Field => ({
  key, label, kind: 'mini-segmented', options: [
    { value: 'nao', label: 'Pendente de confirmação', isDefault: true },
    { value: 'sim', label: 'Confirmado pelo médico' },
  ],
})

const AVALIACAO = (rotulo: string): Field => ({
  key: 'avaliacao', label: rotulo, kind: 'segmented', hint: 'escopo realmente avaliado',
  options: [
    { value: 'avaliada', label: 'Avaliada', isDefault: true },
    { value: 'limitada', label: 'Avaliação limitada', subFields: [
      { key: 'motivo', label: 'Motivo da limitação', kind: 'text', placeholder: 'ex.: interposição gasosa' },
    ] },
    { value: 'nao_avaliada', label: 'Não avaliada' },
  ],
})

function avaliacao(state: OrganState): 'avaliada' | 'limitada' | 'nao_avaliada' {
  const v = str(state.avaliacao)
  return v === 'limitada' || v === 'nao_avaliada' ? v : 'avaliada'
}
const motivoLimitacao = (state: OrganState) => textoLivre(state['avaliacao.limitada.motivo'])

// ── Enxerto ──────────────────────────────────────────────────────────────────
const NATUREZA: Record<string, string> = {
  linfocele: 'linfocele', hematoma: 'hematoma', urinoma: 'urinoma', abscesso: 'abscesso',
}
const GRAU_DILATACAO: Record<string, string> = { leve: 'leve', moderada: 'moderada', acentuada: 'acentuada' }

export function enxertoIssues(state: OrganState): string[] {
  const issues: string[] = []
  if (!LOCALIZACAO[str(state.localizacao)]) issues.push('Enxerto: selecione a localização do enxerto.')
  const medidas = lerEixos(state.medidas, 3, 'cm')
  if (medidas === null) issues.push('Enxerto: informe as três medidas do enxerto.')
  if (medidas === 'invalida') issues.push('Enxerto: medidas com formato inválido (ex.: 11,2 x 5,4 x 5,0).')
  if (str(state.parenquima) === 'alterado' && !textoLivre(state['parenquima.alterado.descricao'])) {
    issues.push('Enxerto: descreva a alteração do parênquima.')
  }
  if (str(state.colecao) === 'presente') {
    const m = lerEixos(state['colecao.presente.medidas'], 3, 'cm')
    if (m === null) issues.push('Enxerto: informe as três medidas da coleção perienxerto.')
    if (m === 'invalida') issues.push('Enxerto: medidas da coleção com formato inválido (ex.: 4,0 x 3,1 x 2,5).')
  }
  return issues
}

const enxertoModule: OrganModule = {
  schema: {
    id: 'enxerto',
    name: 'Enxerto renal',
    category: CATEGORIA,
    fields: [
      { key: 'localizacao', label: 'Localização do enxerto', kind: 'segmented', hint: 'obrigatória; não é lateralidade', options: [
        { value: 'fid', label: 'Fossa ilíaca direita' },
        { value: 'fie', label: 'Fossa ilíaca esquerda' },
        { value: 'pelve', label: 'Pélvica' },
      ] },
      { key: 'medidas', label: 'Medidas do enxerto (cm)', kind: 'text', placeholder: '11,2 x 5,4 x 5,0' },
      { key: 'parenquima', label: 'Parênquima', kind: 'segmented', hint: 'default: preservado', options: [
        { value: 'normal', label: 'Preservado', isDefault: true },
        { value: 'alterado', label: 'Alteração observada', subFields: [
          { key: 'descricao', label: 'Descrição observada', kind: 'text', placeholder: 'descrever somente o observado' },
        ] },
      ] },
      { key: 'coletor', label: 'Sistema coletor', kind: 'segmented', hint: 'default: sem dilatação', options: [
        { value: 'normal', label: 'Sem dilatação', isDefault: true },
        { value: 'dilatado', label: 'Dilatado', subFields: [
          { key: 'grau', label: 'Grau', kind: 'mini-segmented', options: [
            { value: 'nao_graduar', label: 'Não graduar', isDefault: true },
            { value: 'leve', label: 'Leve' },
            { value: 'moderada', label: 'Moderada' },
            { value: 'acentuada', label: 'Acentuada' },
          ] },
        ] },
      ] },
      { key: 'colecao', label: 'Coleção perienxerto', kind: 'segmented', hint: 'default: ausente', options: [
        { value: 'ausente', label: 'Ausente', isDefault: true },
        { value: 'presente', label: 'Presente', subFields: [
          { key: 'local', label: 'Localização da coleção', kind: 'text', placeholder: 'ex.: junto ao polo inferior' },
          { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '4,0 x 3,1 x 2,5' },
          { key: 'natureza', label: 'Natureza (escolha do médico)', kind: 'mini-segmented', options: [
            { value: 'indeterminada', label: 'Não determinar', isDefault: true },
            { value: 'linfocele', label: 'Linfocele' },
            { value: 'hematoma', label: 'Hematoma' },
            { value: 'urinoma', label: 'Urinoma' },
            { value: 'abscesso', label: 'Abscesso' },
          ] },
        ] },
      ] },
    ],
  },
  initialState: () => ({
    localizacao: '', medidas: '', parenquima: 'normal', 'parenquima.alterado.descricao': '',
    coletor: 'normal', 'coletor.dilatado.grau': 'nao_graduar',
    colecao: 'ausente', 'colecao.presente.local': '', 'colecao.presente.medidas': '', 'colecao.presente.natureza': 'indeterminada',
  }),
  compose: (state): OrganComposition => {
    const local = LOCALIZACAO[str(state.localizacao)]
    const medidas = lerEixos(state.medidas, 3, 'cm')
    const parenquimaAlterado = str(state.parenquima) === 'alterado'
    const descricao = textoLivre(state['parenquima.alterado.descricao'])
    const dilatado = str(state.coletor) === 'dilatado'
    const grau = GRAU_DILATACAO[str(state['coletor.dilatado.grau'])]
    const colecao = str(state.colecao) === 'presente'

    const sujeito = `Enxerto renal ${local ?? '(localização pendente)'}`
    const dimensoes = Array.isArray(medidas) ? `, medindo ${formatarEixos(medidas, 'cm')}` : ', medidas pendentes'
    const body: string[] = []
    const conclusion: string[] = []
    if (parenquimaAlterado) {
      body.push(`${sujeito}${dimensoes}. Parênquima: ${descricao || 'descrição pendente'}.`)
    } else {
      body.push(`${sujeito}${dimensoes}, de contornos regulares, com espessura e ecogenicidade do parênquima preservadas e diferenciação corticomedular mantida.`)
    }
    body.push(dilatado
      ? `Sistema coletor do enxerto dilatado${grau ? `, em grau ${grau}` : ''}.`
      : 'Sistema coletor do enxerto sem dilatação.')

    if (colecao) {
      const m = lerEixos(state['colecao.presente.medidas'], 3, 'cm')
      const onde = textoLivre(state['colecao.presente.local'])
      const natureza = NATUREZA[str(state['colecao.presente.natureza'])]
      const textoM = Array.isArray(m) ? `, medindo ${formatarEixos(m, 'cm')}` : ', medidas pendentes'
      body.push(`Coleção perienxerto${onde ? ` ${onde}` : ''}${textoM}.`)
      conclusion.push(Array.isArray(m)
        ? `Coleção perienxerto${onde ? ` ${onde}` : ''}${textoM}${natureza ? `, com aspecto sugestivo de ${natureza}` : ', de natureza não determinada ao método'}.`
        : 'Coleção perienxerto, medidas pendentes.')
    } else {
      body.push('Ausência de coleções perienxerto.')
    }

    // Item do enxerto vem primeiro na conclusão.
    const itensEnxerto: string[] = []
    if (parenquimaAlterado) itensEnxerto.push(`${sujeito}, com parênquima: ${descricao || 'descrição pendente'}.`)
    else itensEnxerto.push(`${sujeito} com parênquima de aspecto preservado${dilatado ? '' : ', sem dilatação do sistema coletor'}.`)
    if (dilatado) itensEnxerto.push(`Dilatação do sistema coletor do enxerto${grau ? `, em grau ${grau}` : ''}.`)
    return {
      body: body.join('\n'),
      conclusion: [...itensEnxerto, ...conclusion],
      isNormal: !parenquimaAlterado && !dilatado && !colecao,
    }
  },
}

// ── Anastomose arterial e artéria do enxerto ─────────────────────────────────
type Arteria = {
  vpsAnastomose: number | null | 'invalida'
  vpsIliaca: number | null | 'invalida'
  vpsArteria: number | null | 'invalida'
  interpretacao: string
}

function lerArteria(state: OrganState): Arteria {
  return {
    vpsAnastomose: lerNumero(state.vps_anastomose, 1000),
    vpsIliaca: lerNumero(state.vps_iliaca, 1000),
    vpsArteria: lerNumero(state.vps_arteria, 1000),
    interpretacao: str(state.interpretacao),
  }
}

/** Razão anastomose/ilíaca, uma casa; só com as duas medidas de origem. */
export function razaoAnastomoseIliaca(vpsAnastomose: unknown, vpsIliaca: unknown): number | null {
  const a = lerNumero(vpsAnastomose, 1000)
  const i = lerNumero(vpsIliaca, 1000)
  if (typeof a !== 'number' || typeof i !== 'number') return null
  return Math.round((a / i) * 10) / 10
}

export function arteriaIssues(state: OrganState): string[] {
  const aval = avaliacao(state)
  if (aval === 'nao_avaliada') return []
  const issues: string[] = []
  const a = lerArteria(state)
  if (aval === 'limitada' && !motivoLimitacao(state)) issues.push('Anastomose arterial: informe o motivo da limitação.')
  for (const [v, nome] of [[a.vpsAnastomose, 'VPS na anastomose'], [a.vpsIliaca, 'VPS da artéria ilíaca'], [a.vpsArteria, 'VPS da artéria do enxerto']] as const) {
    if (v === 'invalida') issues.push(`Anastomose arterial: ${nome} com formato inválido (cm/s).`)
  }
  if (!['sem_estenose', 'estenose', 'sem_fluxo'].includes(a.interpretacao)) {
    issues.push('Anastomose arterial: escolha a interpretação (sem estenose, estenose ou ausência de fluxo).')
  }
  if (a.interpretacao !== 'sem_fluxo' && a.vpsAnastomose === null && aval === 'avaliada') {
    issues.push('Anastomose arterial: informe a VPS na anastomose.')
  }
  if (a.interpretacao === 'estenose') {
    if (a.vpsAnastomose === null) issues.push('Anastomose arterial: estenose exige a VPS na anastomose.')
    if (a.vpsIliaca === null) issues.push('Anastomose arterial: estenose exige a VPS da artéria ilíaca para a razão.')
    if (str(state['interpretacao.estenose.confirmada']) !== 'sim') issues.push('Anastomose arterial: confirme a estenose antes de gerar o laudo.')
  }
  if (a.interpretacao === 'sem_fluxo' && str(state['interpretacao.sem_fluxo.confirmada']) !== 'sim') {
    issues.push('Anastomose arterial: confirme a ausência de fluxo arterial antes de gerar o laudo.')
  }
  return issues
}

const arteriaModule: OrganModule = {
  schema: {
    id: 'arteria',
    name: 'Anastomose arterial e artéria do enxerto',
    category: CATEGORIA,
    fields: [
      AVALIACAO('Avaliação'),
      { key: 'vps_anastomose', label: 'VPS na anastomose (cm/s)', kind: 'text', placeholder: '180', halfWidth: true },
      { key: 'vps_iliaca', label: 'VPS da artéria ilíaca (cm/s)', kind: 'text', placeholder: '90', halfWidth: true },
      { key: 'vps_arteria', label: 'VPS da artéria do enxerto (cm/s)', kind: 'text', placeholder: '120', hint: 'opcional', halfWidth: true },
      { key: 'interpretacao', label: 'Interpretação do médico', kind: 'segmented', hint: 'obrigatória; nenhuma medida decide sozinha', options: [
        { value: 'sem_estenose', label: 'Sem estenose' },
        { value: 'estenose', label: 'Estenose', subFields: [
          { key: 'aliasing', label: 'Sinais associados', kind: 'checklist', options: [{ value: 'sim', label: 'Turbulência/aliasing ao Doppler colorido' }] },
          CONFIRMACAO('confirmada', 'Estenose'),
        ] },
        { value: 'sem_fluxo', label: 'Ausência de fluxo arterial', subFields: [CONFIRMACAO('confirmada', 'Ausência de fluxo')] },
      ] },
    ],
  },
  initialState: () => ({
    avaliacao: 'avaliada', 'avaliacao.limitada.motivo': '',
    vps_anastomose: '', vps_iliaca: '', vps_arteria: '', interpretacao: '',
    'interpretacao.estenose.aliasing': [], 'interpretacao.estenose.confirmada': 'nao',
    'interpretacao.sem_fluxo.confirmada': 'nao',
  }),
  compose: (state): OrganComposition => {
    const aval = avaliacao(state)
    if (aval === 'nao_avaliada') {
      return { body: 'Anastomose arterial e artéria do enxerto não avaliadas neste exame.', conclusion: ['Anastomose arterial e artéria do enxerto não avaliadas.'], isNormal: false }
    }
    const a = lerArteria(state)
    const limitacao = aval === 'limitada' ? ` Avaliação limitada${motivoLimitacao(state) ? ` (${motivoLimitacao(state)})` : ''}.` : ''
    const medidas: string[] = []
    if (typeof a.vpsAnastomose === 'number') medidas.push(`VPS na anastomose de ${vel(a.vpsAnastomose)} cm/s`)
    if (typeof a.vpsIliaca === 'number') medidas.push(`VPS na artéria ilíaca de ${vel(a.vpsIliaca)} cm/s`)
    const razao = razaoAnastomoseIliaca(state.vps_anastomose, state.vps_iliaca)
    if (razao !== null) medidas.push(`razão anastomose/ilíaca de ${ptBr1(razao)}`)
    if (typeof a.vpsArteria === 'number') medidas.push(`VPS na artéria do enxerto de ${vel(a.vpsArteria)} cm/s`)
    const textoMedidas = medidas.length ? ` Medidas: ${medidas.join('; ')}.` : ''

    if (a.interpretacao === 'sem_fluxo') {
      const confirmada = str(state['interpretacao.sem_fluxo.confirmada']) === 'sim'
      return {
        body: `Ausência de fluxo detectável na artéria do enxerto ao Doppler colorido e espectral.${limitacao}`,
        conclusion: [confirmada
          ? 'Ausência de fluxo na artéria do enxerto ao Doppler, compatível com trombose arterial do enxerto. Convém, a critério clínico, comunicação imediata à equipe de transplante.'
          : 'Ausência de fluxo arterial pendente de confirmação.'],
        isNormal: false,
      }
    }
    if (a.interpretacao === 'estenose') {
      const confirmada = str(state['interpretacao.estenose.confirmada']) === 'sim'
      const aliasing = (Array.isArray(state['interpretacao.estenose.aliasing']) ? state['interpretacao.estenose.aliasing'] : []).includes('sim')
      const resumo = medidas.slice(0, razao !== null ? 3 : 2).join('; ')
      return {
        body: `Aceleração focal do fluxo na anastomose arterial${aliasing ? ', com turbulência/aliasing ao Doppler colorido' : ''}.${textoMedidas}${limitacao}`,
        conclusion: [confirmada && razao !== null
          ? `Aceleração focal do fluxo na anastomose arterial (${resumo}), compatível com estenose da anastomose arterial do enxerto.`
          : 'Estenose da anastomose arterial pendente de medidas ou confirmação.'],
        isNormal: false,
      }
    }
    if (a.interpretacao === 'sem_estenose') {
      return {
        body: `Anastomose arterial e artéria do enxerto pérvias, com fluxo de padrão habitual, sem aceleração focal.${textoMedidas}${limitacao}`,
        conclusion: [`Anastomose arterial e artéria do enxerto pérvias, sem sinais de estenose ao Doppler${aval === 'limitada' ? ' (avaliação limitada)' : ''}.`],
        isNormal: aval === 'avaliada',
      }
    }
    return {
      body: `Anastomose arterial: interpretação pendente.${textoMedidas}${limitacao}`,
      conclusion: ['Anastomose arterial: interpretação pendente.'],
      isNormal: false,
    }
  },
}

// ── Vasos intrarrenais ───────────────────────────────────────────────────────
const PONTOS = [['ir_superior', 'superior'], ['ir_medio', 'médio'], ['ir_inferior', 'inferior']] as const

/** IR médio, duas casas, só dos pontos medidos. */
export function irMedio(state: OrganState): number | null {
  const valores = PONTOS.map(([k]) => lerNumero(state[k], 1)).filter((v): v is number => typeof v === 'number')
  if (!valores.length) return null
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 100) / 100
}

export function intrarrenalIssues(state: OrganState): string[] {
  const aval = avaliacao(state)
  if (aval === 'nao_avaliada') return []
  const issues: string[] = []
  if (aval === 'limitada' && !motivoLimitacao(state)) issues.push('Vasos intrarrenais: informe o motivo da limitação.')
  const lidos = PONTOS.map(([k, nome]) => [lerNumero(state[k], 1), nome] as const)
  for (const [v, nome] of lidos) if (v === 'invalida') issues.push(`Vasos intrarrenais: IR ${nome} com formato inválido (entre 0 e 1, ex.: 0,68).`)
  if (!lidos.some(([v]) => typeof v === 'number')) issues.push('Vasos intrarrenais: informe ao menos um índice de resistência.')
  if (!['esperado', 'elevados', 'reduzidos'].includes(str(state.interpretacao))) {
    issues.push('Vasos intrarrenais: escolha a interpretação dos índices de resistência.')
  }
  if (str(state.perfusao) === 'reduzida' && !textoLivre(state['perfusao.reduzida.regiao'])) {
    issues.push('Vasos intrarrenais: informe a região com perfusão reduzida.')
  }
  return issues
}

const intrarrenalModule: OrganModule = {
  schema: {
    id: 'intrarrenal',
    name: 'Vasos intrarrenais',
    category: CATEGORIA,
    fields: [
      AVALIACAO('Avaliação'),
      { key: 'perfusao', label: 'Perfusão parenquimatosa', kind: 'segmented', hint: 'default: homogênea', options: [
        { value: 'homogenea', label: 'Homogênea', isDefault: true },
        { value: 'reduzida', label: 'Reduzida em região', subFields: [
          { key: 'regiao', label: 'Região', kind: 'text', placeholder: 'ex.: polo superior' },
        ] },
      ] },
      { key: 'ir_superior', label: 'IR — polo superior', kind: 'text', placeholder: '0,68', halfWidth: true },
      { key: 'ir_medio', label: 'IR — terço médio', kind: 'text', placeholder: '0,70', halfWidth: true },
      { key: 'ir_inferior', label: 'IR — polo inferior', kind: 'text', placeholder: '0,66', halfWidth: true },
      { key: 'interpretacao', label: 'Interpretação do médico', kind: 'segmented', hint: 'obrigatória; o IR nunca vira diagnóstico', options: [
        { value: 'esperado', label: 'Dentro do esperado' },
        { value: 'elevados', label: 'Elevados' },
        { value: 'reduzidos', label: 'Reduzidos' },
      ] },
    ],
  },
  initialState: () => ({
    avaliacao: 'avaliada', 'avaliacao.limitada.motivo': '',
    perfusao: 'homogenea', 'perfusao.reduzida.regiao': '',
    ir_superior: '', ir_medio: '', ir_inferior: '', interpretacao: '',
  }),
  compose: (state): OrganComposition => {
    const aval = avaliacao(state)
    if (aval === 'nao_avaliada') {
      return { body: 'Vasos intrarrenais não avaliados neste exame.', conclusion: ['Vasos intrarrenais não avaliados.'], isNormal: false }
    }
    const limitacao = aval === 'limitada' ? ` Avaliação limitada${motivoLimitacao(state) ? ` (${motivoLimitacao(state)})` : ''}.` : ''
    const reduzida = str(state.perfusao) === 'reduzida'
    const regiao = textoLivre(state['perfusao.reduzida.regiao'])
    const pontos = PONTOS.flatMap(([k, nome]) => {
      const v = lerNumero(state[k], 1)
      return typeof v === 'number' ? [`${nome} ${ir2(v)}`] : []
    })
    const media = irMedio(state)
    const perfusao = reduzida
      ? `Perfusão parenquimatosa reduzida${regiao ? ` em ${regiao}` : ''} ao Doppler colorido.`
      : 'Perfusão parenquimatosa homogênea ao Doppler colorido.'
    const indices = pontos.length
      ? ` Índices de resistência nas artérias intrarrenais: ${pontos.join('; ')}${pontos.length > 1 && media !== null ? ` (média de ${ir2(media)})` : ''}.`
      : ' Índices de resistência pendentes.'
    const body = `${perfusao}${indices}${limitacao}`

    const conclusion: string[] = []
    if (reduzida) conclusion.push(`Perfusão parenquimatosa reduzida${regiao ? ` em ${regiao}` : ''} no enxerto.`)
    const valorIr = media !== null ? ` (IR médio de ${ir2(media)})` : ''
    const interpretacao = str(state.interpretacao)
    if (media === null) conclusion.push('Índices de resistência intrarrenais pendentes.')
    else if (interpretacao === 'elevados') conclusion.push(`Índices de resistência intrarrenais elevados${valorIr}, achado inespecífico, a correlacionar com dados clínicos e laboratoriais do enxerto.`)
    else if (interpretacao === 'reduzidos') conclusion.push(`Índices de resistência intrarrenais reduzidos${valorIr}, a correlacionar com dados clínicos.`)
    else if (interpretacao === 'esperado') conclusion.push(`${reduzida ? 'Índices de resistência' : 'Vasos intrarrenais com perfusão homogênea e índices de resistência'} dentro do esperado${valorIr}${aval === 'limitada' ? ' (avaliação limitada)' : ''}.`)
    else conclusion.push('Índices de resistência intrarrenais: interpretação pendente.')
    return { body, conclusion, isNormal: aval === 'avaliada' && !reduzida && interpretacao === 'esperado' && media !== null }
  },
}

// ── Veia do enxerto ──────────────────────────────────────────────────────────
export function veiaIssues(state: OrganState): string[] {
  const aval = avaliacao(state)
  if (aval === 'nao_avaliada') return []
  const issues: string[] = []
  if (aval === 'limitada' && !motivoLimitacao(state)) issues.push('Veia do enxerto: informe o motivo da limitação.')
  if (lerNumero(state.vps, 1000) === 'invalida') issues.push('Veia do enxerto: velocidade com formato inválido (cm/s).')
  if (str(state.estado) === 'sem_fluxo' && str(state['estado.sem_fluxo.confirmada']) !== 'sim') {
    issues.push('Veia do enxerto: confirme a ausência de fluxo venoso antes de gerar o laudo.')
  }
  return issues
}

const veiaModule: OrganModule = {
  schema: {
    id: 'veia',
    name: 'Veia do enxerto',
    category: CATEGORIA,
    fields: [
      AVALIACAO('Avaliação'),
      { key: 'estado', label: 'Fluxo venoso', kind: 'segmented', hint: 'default: pérvia', options: [
        { value: 'pervia', label: 'Pérvia', isDefault: true },
        { value: 'sem_fluxo', label: 'Ausência de fluxo venoso', subFields: [CONFIRMACAO('confirmada', 'Ausência de fluxo')] },
      ] },
      { key: 'vps', label: 'Velocidade venosa (cm/s)', kind: 'text', placeholder: '25', hint: 'opcional', halfWidth: true },
    ],
  },
  initialState: () => ({ avaliacao: 'avaliada', 'avaliacao.limitada.motivo': '', estado: 'pervia', 'estado.sem_fluxo.confirmada': 'nao', vps: '' }),
  compose: (state): OrganComposition => {
    const aval = avaliacao(state)
    if (aval === 'nao_avaliada') {
      return { body: 'Veia do enxerto não avaliada neste exame.', conclusion: ['Veia do enxerto não avaliada.'], isNormal: false }
    }
    const limitacao = aval === 'limitada' ? ` Avaliação limitada${motivoLimitacao(state) ? ` (${motivoLimitacao(state)})` : ''}.` : ''
    const v = lerNumero(state.vps, 1000)
    if (str(state.estado) === 'sem_fluxo') {
      const confirmada = str(state['estado.sem_fluxo.confirmada']) === 'sim'
      return {
        body: `Ausência de fluxo detectável na veia do enxerto ao Doppler colorido e espectral.${limitacao}`,
        conclusion: [confirmada
          ? 'Ausência de fluxo na veia do enxerto ao Doppler, compatível com trombose venosa do enxerto. Convém, a critério clínico, comunicação imediata à equipe de transplante.'
          : 'Ausência de fluxo venoso pendente de confirmação.'],
        isNormal: false,
      }
    }
    return {
      body: `Veia do enxerto pérvia, com fluxo ao Doppler${typeof v === 'number' ? ` (velocidade de ${vel(v)} cm/s)` : ''}.${limitacao}`,
      conclusion: [`Veia do enxerto pérvia${aval === 'limitada' ? ' (avaliação limitada)' : ''}.`],
      isNormal: aval === 'avaliada',
    }
  },
}

// ── Categoria ────────────────────────────────────────────────────────────────
/** Conflitos entre seções: ausência de fluxo arterial não convive com perfusão/veia normais. */
function conflitosIssues(state: Record<string, OrganState>): string[] {
  const arteria = state.arteria ?? {}
  if (avaliacao(arteria) === 'nao_avaliada' || str(arteria.interpretacao) !== 'sem_fluxo') return []
  const issues: string[] = []
  const intra = state.intrarrenal ?? {}
  if (avaliacao(intra) !== 'nao_avaliada' && str(intra.perfusao) !== 'reduzida') {
    issues.push('Vasos intrarrenais: perfusão homogênea conflita com ausência de fluxo arterial; revise ou marque como não avaliados.')
  }
  const veia = state.veia ?? {}
  if (avaliacao(veia) !== 'nao_avaliada' && str(veia.estado) !== 'sem_fluxo') {
    issues.push('Veia do enxerto: veia pérvia conflita com ausência de fluxo arterial; revise ou marque como não avaliada.')
  }
  return issues
}

export function dopplerTransplanteRenalIssuesDoExame(state: Record<string, OrganState>): string[] {
  return [
    ...enxertoIssues(state.enxerto ?? {}),
    ...arteriaIssues(state.arteria ?? {}),
    ...intrarrenalIssues(state.intrarrenal ?? {}),
    ...veiaIssues(state.veia ?? {}),
    ...conflitosIssues(state),
  ]
}

export const dopplerTransplanteRenal: ExamCategory = {
  id: CATEGORIA,
  name: 'Doppler de transplante renal',
  title: 'ULTRASSONOGRAFIA COM DOPPLER DE TRANSPLANTE RENAL',
  tecnica:
    'Exame realizado com transdutor convexo multifrequencial, em modo B, Doppler colorido e espectral, com avaliação do enxerto renal, da anastomose arterial, da artéria e da veia do enxerto e dos vasos intrarrenais.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'enxerto', label: 'Enxerto renal', group: 'orgaos', module: enxertoModule },
    { id: 'arteria', label: 'Anastomose arterial', group: 'orgaos', module: arteriaModule },
    { id: 'intrarrenal', label: 'Vasos intrarrenais', group: 'orgaos', module: intrarrenalModule },
    { id: 'veia', label: 'Veia do enxerto', group: 'orgaos', module: veiaModule },
  ],
  // A conclusão lista cada estrutura avaliada; não há fechamento genérico de "demais".
  conclusionNormal: 'Enxerto renal sem alterações ecográficas significativas.',
}
