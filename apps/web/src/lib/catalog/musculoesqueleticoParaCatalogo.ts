import { SEGMENTOS } from '../deterministic/organs/musculoesqueletico'

type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

/**
 * MSK é deliberadamente uma ponte literal. A descrição digitada vira
 * `descricao_livre`, o diagnóstico digitado vira `diagnostico_conclusao` e o
 * slug permanece `outro`. Se o médico descreveu uma alteração sem preencher a
 * conclusão, esta ponte cria apenas um fechamento topográfico neutro. Assim ela
 * não bloqueia o laudo nem deduz tendinopatia, rotura, bursite ou qualquer outra
 * morfologia específica a partir do texto do usuário.
 */
export function adaptarMusculoesqueletico(estado: Estado) {
  const opcoes = secao(estado, '__opts')
  const segmentoInformado = texto(opcoes, 'segmento') || 'ombro'
  const segmento = segmentoInformado in SEGMENTOS ? segmentoInformado : 'ombro'
  const lado = texto(opcoes, 'lado') === 'esquerdo' ? 'esquerdo' : 'direito'
  const alteracoes: Array<{
    estrutura: string
    achado_tipo: string
    descricao_livre: string | null
    diagnostico_conclusao: string
  }> = []
  const pendencias: Array<never> = []

  for (const estrutura of SEGMENTOS[segmento]!.estruturas) {
    const id = `${segmento}__${estrutura.id}`
    const s = secao(estado, id)
    if (texto(s, 'estado') !== 'alterado') continue

    const descricao = texto(s, 'estado.alterado.corpo')
    const diagnostico = texto(s, 'estado.alterado.diag')
    const conclusao = diagnostico ||
      `Alteração ecográfica na topografia de ${estrutura.label.toLowerCase()} do ${SEGMENTOS[segmento]!.label.toLowerCase()} ${lado}, a esclarecer.`

    alteracoes.push({
      estrutura: estrutura.id,
      achado_tipo: 'outro',
      descricao_livre: descricao || null,
      diagnostico_conclusao: conclusao,
    })
  }

  return {
    dados: { laudos: [{ segmento, lado, alteracoes }] },
    alteracoes: [],
    pendencias,
  }
}
