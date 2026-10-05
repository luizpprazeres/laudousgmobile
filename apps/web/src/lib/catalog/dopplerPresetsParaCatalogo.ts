/**
 * Portões dos cards "com Doppler" — a mesma adaptação da categoria-mãe, com o
 * modo fixado e pendências onde o formulário presumiria normalidade.
 *
 * Nada aqui escreve texto clínico: os dados seguem para o renderer da mãe
 * (TIREOIDE, CERVICAL, MAMARIA). Pendência bloqueante = o laudo não é montado.
 */

import type { TireoideState } from '../deterministic/organs/tireoide'
import { ESCOPO_MAMARIA_DOPPLER, type MAMARIA_DOPPLER_PRESETS } from '../deterministic/organs/dopplerPresets'
import { adaptarTireoide } from './tireoideParaCatalogo'
import { adaptarCervical } from './cervicalParaCatalogo'
import { adaptarMamaria } from './mamariaParaCatalogo'
import type { Entrada } from './useLaudoCanonico'

type Pendencia = Entrada['pendencias'][number]
type Estado = Record<string, unknown>
const secao = (estado: Estado, id: string): Record<string, unknown> => {
  const s = estado[id]
  return s && typeof s === 'object' ? (s as Record<string, unknown>) : {}
}
const texto = (s: Record<string, unknown>, chave: string) => typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''
const bloqueio = (onde: string, valor: string, motivo: string): Pendencia => ({ onde, valor, motivo, bloqueia: true })
const modeloEscolhido = (estado: Estado) => texto(secao(estado, '__opts'), 'modelo') === 'normal'
const PEDE_MODELO = bloqueio('Modelo de partida', 'em branco', 'escolha o modelo normal para confirmar que as estruturas não alteradas foram avaliadas')

// ── Tireoide com Doppler ──────────────────────────────────────────────────────
/**
 * - Doppler sempre realizado (título/técnica do renderer).
 * - "Vascularização normal" dos lobos só com o padrão do parênquima confirmado
 *   (auditoria D2); padrão alterado ainda não tem campo no contrato → bloqueia.
 * - Lobos sem medidas não são descritos como normais.
 * - Linfonodos: o padrão "preservados" da tela só vale depois de um clique
 *   (D1); antes disso, não são descritos.
 */
export function adaptarTireoideDoppler(state: TireoideState) {
  const linfonodosInformados = state.linfonodosConfirmados === true
  const base = adaptarTireoide({ ...state, doppler: true, avaliarLinfonodos: linfonodosInformados ? state.avaliarLinfonodos : false })
  const pendencias: Pendencia[] = [...base.pendencias]
  const parenquima = state.vascularizacaoParenquima ?? 'nao_informada'
  if (parenquima === 'nao_informada') pendencias.push(bloqueio('Doppler do parênquima', 'não informado', 'informe a vascularização do parênquima ao Doppler'))
  if (parenquima === 'alterada') pendencias.push(bloqueio('Doppler do parênquima', 'alterada', 'o padrão vascular alterado do parênquima ainda não tem campo no laudo estruturado; descreva-o no editor após gerar o restante ou registre o exame sem este atalho'))
  for (const [id, nome] of [['lobo_direito', 'lobo direito'], ['lobo_esquerdo', 'lobo esquerdo']] as const) {
    const lobo = state[id]
    if (![lobo.a, lobo.b, lobo.c].every(eixo => eixo.trim())) pendencias.push(bloqueio(nome, 'sem medidas', `informe as três medidas do ${nome}`))
  }
  return { dados: base.dados as unknown as Record<string, unknown>, alteracoes: base.alteracoes, pendencias }
}

// ── Cervical com Doppler ──────────────────────────────────────────────────────
/**
 * - Doppler declarado pelo card, não deduzido de um linfonodo alterado (CD1).
 * - Linfonodo alterado exige a vascularização informada (D2b).
 */
export function adaptarCervicalDoppler(estado: Estado) {
  const base = adaptarCervical(estado)
  const pendencias: Pendencia[] = [...base.pendencias]
  if (!modeloEscolhido(estado)) pendencias.push(PEDE_MODELO)
  const c = secao(estado, 'cervical')
  if (texto(c, 'linfonodo') === 'alterado') {
    const vasc = texto(c, 'linfonodo.alterado.vasc')
    if (!vasc || vasc === 'nao_informada') pendencias.push(bloqueio('Linfonodo alterado', 'vascularização', 'informe a vascularização ao Doppler'))
  }
  const linfonodos = base.dados.linfonodos_alterados.map(l => l.vascularizacao === 'nao_informada' ? { ...l, vascularizacao: null } : l)
  return { dados: { ...base.dados, com_doppler: true, linfonodos_alterados: linfonodos }, alteracoes: base.alteracoes, pendencias }
}

// ── Mamas com Doppler / Mamas e axilas com Doppler ────────────────────────────
/** Achados focais em que a tela oferece vascularização ao Doppler. */
const COM_VASCULARIZACAO = new Set(['nodulo_solido', 'cisto_simples', 'multiplos_cistos', 'microcistos_agrupados', 'cisto_complicado', 'linfonodo_intramamario', 'achado_nao_nodular'])
/**
 * - Escopo e Doppler fixos no `__opts` antes da adaptação da mama.
 * - Cada achado focal precisa da vascularização ao Doppler (M2).
 * - Cisto simples com fluxo interno não sai com categoria benigna (M1).
 * - Axilas (só no card com axilas): "não avaliadas" e "alteradas" sem lado ou
 *   medidas bloqueiam, porque o renderer escreveria axilas normais ou um
 *   linfonodo sem topografia (axilas-2026-10-05.md, X1 e X2).
 */
export function adaptarMamasDoppler(estado: Estado, card: (typeof MAMARIA_DOPPLER_PRESETS)[number]) {
  const escopo = ESCOPO_MAMARIA_DOPPLER[card]
  const opts = { ...secao(estado, '__opts'), escopo_exame: escopo, doppler_mamario: 'sim' }
  const base = adaptarMamaria({ ...estado, __opts: opts })
  const pendencias: Pendencia[] = [...base.pendencias]
  if (!modeloEscolhido(estado)) pendencias.push(PEDE_MODELO)
  const achados = (base.dados.achados as Array<Record<string, unknown>> | undefined) ?? []
  achados.forEach((achado, i) => {
    const onde = `Achado ${i + 1} (${String(achado.lado ?? 'sem lado')})`
    const vasc = achado.vascularizacao
    if (COM_VASCULARIZACAO.has(String(achado.tipo)) && !vasc) pendencias.push(bloqueio(onde, 'vascularização', 'informe a vascularização ao Doppler'))
    if (achado.tipo === 'cisto_simples' && (vasc === 'interna' || vasc === 'mista')) {
      pendencias.push(bloqueio(onde, String(vasc), 'fluxo interno é incompatível com cisto simples: revise o tipo do achado ou a vascularização'))
    }
  })
  if (escopo === 'mamas_axilas') {
    const ax = secao(estado, 'axilas')
    const axilas = texto(ax, 'axilas') || 'normais'
    if (axilas === 'nao') pendencias.push(bloqueio('Axilas', 'não avaliadas', 'axilas não avaliadas: use o card "Mamas com Doppler"'))
    if (axilas === 'alteradas' && (!texto(ax, 'axilas.alteradas.lado') || !texto(ax, 'axilas.alteradas.medidas'))) {
      pendencias.push(bloqueio('Axilas', 'alteradas', 'informe o lado e as medidas do linfonodo axilar'))
    }
  }
  return { dados: base.dados, alteracoes: base.alteracoes, pendencias }
}
