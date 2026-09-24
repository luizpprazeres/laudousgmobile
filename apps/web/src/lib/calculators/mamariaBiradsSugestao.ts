/**
 * SUGESTÃO DE BI-RADS POR ACHADO MAMÁRIO — o que o painel de Cálculos mostra.
 *
 * Fonte dos dados: o ADAPTADOR real (`adaptarMamaria`), achado por achado, para
 * que a sugestão leia exatamente o que o laudo leria. Fonte da regra: a única
 * função existente, `sugerirBiradsMamaria` de `@laudousg/shared` — nada é
 * recalculado aqui, só LIMITADO. A função é uma heurística local (a gradação
 * 4A/4B/4C/5 é soma de pontos sem validação), e por isso:
 *
 *   1. Descritor ausente OU fora do léxico conta como ausente: dado incompleto
 *      não produz categoria nenhuma.
 *   2. Categoria sugerida só onde o léxico dá o critério por inteiro — cisto
 *      simples, cistos simples, linfonodo intramamário (2) e nódulo sólido oval,
 *      circunscrito, paralelo, hipo/isoecoico, sem sombra e sem
 *      microcalcificações (3) — e só quando a função compartilhada concorda.
 *   3. "Suspeita" só com descritor suspeito MARCADO (margem não circunscrita,
 *      forma irregular, orientação não paralela, sombra, microcalcificações),
 *      e sem subcategoria.
 *   4. Todo o resto fica sem sugestão automática. Fora da tríade não quer dizer
 *      suspeito: um nódulo redondo, circunscrito e paralelo cai aqui.
 *
 * Referência: ACR BI-RADS® Atlas, 5ª edição, seção de ultrassonografia (léxico
 * e categorias de avaliação). Não há validação contra a edição de 2025.
 *
 * Sugestão nunca é confirmação: só `aplicarBiradsAchado` grava, e só na chave
 * `achados.<id>.birads` daquele achado.
 */
import { sugerirBiradsMamaria } from '@laudousg/shared'
import { adaptarMamaria } from '../catalog/mamariaParaCatalogo'
import type { OrganState } from '../deterministic'

export type BiradsSugestaoStatus =
  /** Categoria sugerida com base citada — pode ser aplicada. */
  | 'sugerida'
  /** Fora dos critérios de provável benignidade — categoria pelo médico. */
  | 'suspeita'
  /** Faltam descritores para qualquer sugestão. */
  | 'incompleta'
  /** A regra existente não tem sustentação para sugestão automática. */
  | 'revisao'
  /** Tipo que não recebe BI-RADS por achado (ginecomastia, próteses). */
  | 'nao_se_aplica'

export type BiradsSugestaoAchado = {
  id: string
  indice: number
  lado: 'direita' | 'esquerda' | null
  /** Tipo como a tela grava (`nodulo`, `cisto_simples`…). */
  tipo: string
  status: BiradsSugestaoStatus
  /** Preenchida só quando `status === 'sugerida'`. */
  categoria: string | null
  /** Descritores ausentes, com o nome que a tela mostra. */
  faltando: string[]
  motivo: string
  /** O que o médico definiu (confirmado), em caixa alta; nunca a sugestão. */
  definida: string | null
}

export const BIRADS_CATEGORIAS = ['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'] as const

export const TIPO_LABEL: Record<string, string> = {
  cisto_simples: 'Cisto simples',
  multiplos_cistos: 'Cistos múltiplos',
  microcistos_agrupados: 'Microcistos agrupados',
  cisto_complicado: 'Cisto complicado',
  nodulo: 'Nódulo sólido',
  linfonodo_intramamario: 'Linfonodo intramamário',
  calcificacoes: 'Calcificações',
  achado_nao_nodular: 'Achado não nodular',
  ginecomastia: 'Ginecomastia',
  proteses: 'Próteses',
}

const MOTIVOS = {
  cistoSimples: 'Cisto simples: achado benigno.',
  cistosSimples: 'Cistos simples: achado benigno.',
  linfonodo: 'Linfonodo intramamário: achado benigno.',
  noduloBenigno: 'Nódulo oval, circunscrito, paralelo à pele, sem sombra acústica e sem microcalcificações: critérios de provável benignidade.',
  noduloComCalcificacoes: 'Nódulo com calcificações associadas: categoria a critério do médico.',
  noduloForaDoEscopo: 'Fora dos critérios de provável benignidade, sem descritor suspeito marcado. Categoria a critério do médico.',
  cistoComplicado: 'Cisto complicado: a categoria depende do contexto (isolado, múltiplo, bilateral). Categoria a critério do médico.',
  microcistos: 'Microcistos agrupados: categoria a critério do médico.',
  calcificacoes: 'Calcificações: categoria a critério do médico.',
  naoNodular: 'Achado não nodular: categoria a critério do médico.',
  naoSeAplica: 'Este tipo não recebe categoria BI-RADS por achado.',
  semTipo: 'Tipo sem regra de sugestão. Categoria a critério do médico.',
} as const

/** Léxico aceito — o que a tela oferece. Qualquer outro valor conta como ausente. */
const LEXICO = {
  forma: ['oval', 'redonda', 'irregular'],
  margem: ['circunscrita', 'indistinta', 'angular', 'microlobulada', 'espiculada'],
  orientacao: ['paralela', 'nao_paralela'],
  posterior: ['nenhuma', 'reforco', 'sombra', 'combinado'],
  eco: ['hipoecoico', 'isoecoico', 'anecoico', 'hiperecoico'],
} as const

const MARGEM_SUSPEITA: Record<string, string> = {
  indistinta: 'margem indistinta',
  angular: 'margem angular',
  microlobulada: 'margem microlobulada',
  espiculada: 'margem espiculada',
}

const texto = (state: OrganState, key: string) => {
  const value = state[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Achados da tela na ordem em que aparecem. Rascunho legado (md/me) não tem ids. */
export function idsDosAchados(state: OrganState): string[] {
  return Array.isArray(state.achados_ids)
    ? state.achados_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
}

/**
 * Rascunho no formato antigo (um achado por mama, `md_tipo`/`me_tipo`), sem
 * `achados_ids`. O adaptador ainda o leva ao laudo; a sugestão por achado não
 * o cobre — e o painel não pode dizer "nenhum achado" quando há um.
 */
export function temAchadoLegado(state: OrganState): boolean {
  if (idsDosAchados(state).length > 0) return false
  return ['md_tipo', 'me_tipo'].some((key) => {
    const tipo = texto(state, key)
    return tipo !== '' && tipo !== 'nenhum'
  })
}

function valorDoLexico<K extends keyof typeof LEXICO>(state: OrganState, id: string, campo: K): string | null {
  const valor = texto(state, `achados.${id}.${campo}`)
  return (LEXICO[campo] as readonly string[]).includes(valor) ? valor : null
}

function faltandoNoNodulo(state: OrganState, id: string): string[] {
  const faltando: string[] = []
  if (!valorDoLexico(state, id, 'eco')) faltando.push('Ecogenicidade')
  if (!valorDoLexico(state, id, 'forma')) faltando.push('Forma')
  if (!valorDoLexico(state, id, 'margem')) {
    faltando.push(texto(state, `achados.${id}.margem_tipo`) === 'nao_circunscrita' ? 'Tipo de margem não circunscrita' : 'Margem')
  }
  if (!valorDoLexico(state, id, 'orientacao')) faltando.push('Orientação')
  if (!valorDoLexico(state, id, 'posterior')) faltando.push('Fenômeno acústico posterior')
  return faltando
}

export function sugestoesBiradsMamaria(state: OrganState): BiradsSugestaoAchado[] {
  return idsDosAchados(state).map((id, indice): BiradsSugestaoAchado => {
    const base = `achados.${id}`
    const tipo = texto(state, `${base}.tipo`)
    const ladoCru = texto(state, `${base}.lado`)
    const lado: BiradsSugestaoAchado['lado'] = ladoCru === 'direita' || ladoCru === 'esquerda' ? ladoCru : null
    const definidaCrua = texto(state, `${base}.birads`).toUpperCase()
    const comum = { id, indice, lado, tipo, definida: definidaCrua || null }

    const faltandoBase: string[] = []
    if (!tipo) faltandoBase.push('Tipo')
    if (!lado) faltandoBase.push('Mama')
    if (faltandoBase.length) {
      return { ...comum, status: 'incompleta', categoria: null, faltando: faltandoBase, motivo: 'Sem tipo e mama o achado nem entra no laudo.' }
    }

    // O mesmo caminho do laudo: o adaptador real, só com este achado.
    const { dados, pendencias } = adaptarMamaria({
      mamas: { ...state, achados_ids: [id] },
      __opts: { escopo_exame: 'mamas' },
    })
    const achado = (dados.achados as Array<Record<string, unknown>> | undefined)?.[0]
    if (!achado) {
      // O adaptador recusou o achado: o laudo trava, e a sugestão também.
      if (tipo === 'calcificacoes' && pendencias.some((p) => p.bloqueia)) {
        return { ...comum, status: 'incompleta', categoria: null, faltando: ['Padrão das calcificações'], motivo: 'Escolha o padrão das calcificações.' }
      }
      return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.semTipo }
    }
    const canonico = String(achado.tipo)
    const str = (key: string) => (typeof achado[key] === 'string' ? (achado[key] as string) : null)

    switch (canonico) {
      case 'cisto_simples':
      case 'multiplos_cistos':
      case 'linfonodo_intramamario': {
        const categoria = sugerirBiradsMamaria({ tipo: canonico })
        if (categoria !== '2') {
          // A função mudou e deixou de concordar com a citação — não sugerir às cegas.
          return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.semTipo }
        }
        return {
          ...comum,
          status: 'sugerida',
          categoria,
          faltando: [],
          motivo: canonico === 'linfonodo_intramamario' ? MOTIVOS.linfonodo : canonico === 'multiplos_cistos' ? MOTIVOS.cistosSimples : MOTIVOS.cistoSimples,
        }
      }
      case 'nodulo_solido': {
        const faltando = faltandoNoNodulo(state, id)
        if (faltando.length) {
          return { ...comum, status: 'incompleta', categoria: null, faltando, motivo: 'Marque os descritores que faltam para haver sugestão.' }
        }
        const forma = valorDoLexico(state, id, 'forma')!
        const margem = valorDoLexico(state, id, 'margem')!
        const orientacao = valorDoLexico(state, id, 'orientacao')!
        const posterior = valorDoLexico(state, id, 'posterior')!
        const eco = valorDoLexico(state, id, 'eco')!
        const calcificacoes = str('calcificacoes')
        const microcalc = calcificacoes === 'microcalcificacoes'

        const suspeitos = [
          MARGEM_SUSPEITA[margem],
          forma === 'irregular' ? 'forma irregular' : null,
          orientacao === 'nao_paralela' ? 'orientação não paralela' : null,
          posterior === 'sombra' ? 'sombra acústica posterior' : null,
          microcalc ? 'microcalcificações' : null,
        ].filter((item): item is string => Boolean(item))
        if (suspeitos.length) {
          return {
            ...comum,
            status: 'suspeita',
            categoria: null,
            faltando: [],
            motivo: `Descritor suspeito: ${suspeitos.join(', ')}. Categoria 4 ou 5 a critério do médico.`,
          }
        }

        if (calcificacoes) {
          // Calcificação associada ao nódulo (ex.: `em_nodulo` vinda da imagem)
          // tira da provável benignidade, mas não é descritor suspeito por si.
          return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.noduloComCalcificacoes }
        }
        const provavelmenteBenigno =
          forma === 'oval' && margem === 'circunscrita' && orientacao === 'paralela' &&
          (eco === 'hipoecoico' || eco === 'isoecoico') &&
          (posterior === 'nenhuma' || posterior === 'reforco')
        const compartilhada = sugerirBiradsMamaria({
          tipo: canonico, forma, margem, orientacao, posterior, calcificacoes: str('calcificacoes'),
        })
        if (provavelmenteBenigno && compartilhada === '3') {
          return { ...comum, status: 'sugerida', categoria: '3', faltando: [], motivo: MOTIVOS.noduloBenigno }
        }
        return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.noduloForaDoEscopo }
      }
      case 'cisto_complicado':
        return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.cistoComplicado }
      case 'microcistos_agrupados':
        return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.microcistos }
      case 'calcificacoes':
        return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.calcificacoes }
      case 'achado_nao_nodular':
        return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.naoNodular }
      case 'ginecomastia':
      case 'proteses':
        return { ...comum, status: 'nao_se_aplica', categoria: null, faltando: [], motivo: MOTIVOS.naoSeAplica }
      default:
        return { ...comum, status: 'revisao', categoria: null, faltando: [], motivo: MOTIVOS.semTipo }
    }
  })
}

/**
 * Grava (ou limpa, com `null`) o BI-RADS definido pelo médico para UM achado.
 * Toca somente `achados.<id>.birads`; um id que não existe não muda nada.
 */
export function aplicarBiradsAchado(state: OrganState, id: string, categoria: string | null): OrganState {
  if (!idsDosAchados(state).includes(id)) return state
  return { ...state, [`achados.${id}.birads`]: categoria ?? '' }
}
