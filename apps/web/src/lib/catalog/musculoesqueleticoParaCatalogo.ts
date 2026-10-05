import {
  SEGMENTOS,
  idSecaoMsk,
  interpretarEstrutura,
  ladosDoExame,
  type AlteracaoMsk,
  type LadoMsk,
} from '../deterministic/organs/musculoesqueletico'
import { CONFIRMACAO_CONTROL_KEY, mskPresetDe, opcoesDoPreset } from '../deterministic/organs/mskPresets'

export { migrateLegacyMskState } from '../deterministic/organs/musculoesqueletico'

type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

/**
 * MSK é deliberadamente uma ponte literal. Nada é deduzido do que o médico
 * digitou: a descrição digitada vira `descricao_livre`, o diagnóstico digitado vira
 * `diagnostico_conclusao` e o slug permanece `outro`. Se ele descreveu uma
 * alteração sem preencher a conclusão, a ponte cria apenas um fechamento
 * topográfico neutro — não bloqueia o laudo nem deduz tendinopatia, rotura,
 * bursite ou qualquer outra morfologia a partir do texto.
 *
 * O que É novo, e continua sem dedução: os descritores tendíneos são ESCOLHAS
 * explícitas do médico. `interpretarEstrutura` (no módulo) é o único ponto que as
 * converte, e nenhuma seleção é descartada — ou vira texto, ou vira pendência.
 *
 * LATERALIDADE. O contrato canônico já aceita `laudos[]`, um bloco completo por
 * segmento+lado. Cada lado tem estado PRÓPRIO (`idSecaoMsk`): trocar o lado
 * troca de estado, nunca move a patologia para o outro. Com `lado = 'ambos'`
 * saem dois blocos (direito, esquerdo), cada um só com o que foi marcado nele.
 * Lado que não está no exame não gera bloco — normal não examinado não entra.
 *
 * ESTADO LEGADO. Estado anterior a esta mudança guarda a estrutura em
 * `${segmento}__${estrutura}` e o lado em `__opts.lado`. Quem altera `lado` ou
 * `segmento` deve chamar `migrateLegacyMskState(estado)` ANTES da troca: ela leva a
 * patologia para a chave do lado em que foi digitada. O adaptador só lê o legado
 * como rede de segurança e só quando a chave nova do lado está AUSENTE (nunca
 * tocada) — uma chave presente, mesmo normal (Reset), não é ressuscitada. Com
 * `lado = 'ambos'` o legado não tem lado a que pertencer: vira pendência que
 * BLOQUEIA, nunca descarte silencioso.
 */
export function adaptarMusculoesqueletico(estado: Estado) {
  const opcoes = secao(estado, '__opts')
  const segmentoInformado = texto(opcoes, 'segmento') || 'ombro'
  const segmento = segmentoInformado in SEGMENTOS ? segmentoInformado : 'ombro'
  const lados = ladosDoExame(opcoes)
  const ladoLegado: LadoMsk | null = lados.length === 1 ? lados[0]! : null

  const pendencias: Array<{ onde: string; valor: string; motivo: string; bloqueia: boolean }> = []
  if (lados.length === 2) {
    for (const estrutura of SEGMENTOS[segmento]!.estruturas) {
      const legado = estado[`${segmento}__${estrutura.id}`]
      if (legado && typeof legado === 'object' &&
        interpretarEstrutura(segmento, 'direito', estrutura.id, legado as Secao).tipo !== 'normal') {
        pendencias.push({
          onde: `${estrutura.label} (estado legado)`,
          valor: texto(legado as Secao, 'estado'),
          motivo: 'achado anterior sem lado definido — volte a Direito ou Esquerdo para migrá-lo antes de usar Ambos',
          bloqueia: true,
        })
      }
    }
  }
  const laudos = lados.map((lado) => {
    const alteracoes: AlteracaoMsk[] = []
    for (const estrutura of SEGMENTOS[segmento]!.estruturas) {
      const idNovo = idSecaoMsk(segmento, lado, estrutura.id)
      // Chave do lado AUSENTE = nunca tocada: só então o legado unilateral vale.
      const origem = estado[idNovo] === undefined && lado === ladoLegado
        ? secao(estado, `${segmento}__${estrutura.id}`)
        : secao(estado, idNovo)
      const resultado = interpretarEstrutura(segmento, lado, estrutura.id, origem)
      if (resultado.tipo === 'alteracao') alteracoes.push(resultado.alteracao)
      if (resultado.tipo === 'pendencia') {
        pendencias.push({ onde: resultado.onde, valor: resultado.valor, motivo: resultado.motivo, bloqueia: true })
      }
    }
    return { segmento, lado, alteracoes }
  })

  return {
    dados: { laudos },
    alteracoes: [],
    pendencias,
  }
}

// ── ATALHOS MSK (16 cards derivados) ────────────────────────────────────────

/**
 * Adaptador dos atalhos: o MESMO `adaptarMusculoesqueletico`, com o segmento
 * (e o lado, no bilateral) fixados pelo card, mais duas pendências próprias:
 * lado não escolhido no unilateral e estruturas normais ainda não revisadas.
 * O motor-base não é alterado; o estado recebido não é mutado.
 */
export function adaptarMskPreset(estado: Estado, categoria: string) {
  const preset = mskPresetDe(categoria)
  if (!preset) throw new Error(`${categoria} não é um atalho musculoesquelético`)
  const opcoes = secao(estado, '__opts')
  const efetivas = opcoesDoPreset(preset, opcoes as never)
  const base = adaptarMusculoesqueletico({ ...estado, __opts: efetivas })
  const pendencias = [...base.pendencias]
  const lado = texto(opcoes, 'lado')
  if (!preset.bilateral && lado !== 'direito' && lado !== 'esquerdo') {
    pendencias.push({ onde: 'Lado', valor: lado, motivo: 'escolha o lado examinado (direito ou esquerdo)', bloqueia: true })
  }
  // Unilateral: achado digitado no OUTRO lado (antes de escolher o lado, ou
  // depois de trocá-lo) sairia do laudo em silêncio. Bloqueia e nomeia.
  if (!preset.bilateral && (lado === 'direito' || lado === 'esquerdo')) {
    const outro: LadoMsk = lado === 'direito' ? 'esquerdo' : 'direito'
    for (const estrutura of SEGMENTOS[preset.segmento]!.estruturas) {
      const st = estado[idSecaoMsk(preset.segmento, outro, estrutura.id)]
      if (st && typeof st === 'object' && interpretarEstrutura(preset.segmento, outro, estrutura.id, st as Secao).tipo !== 'normal') {
        pendencias.push({
          onde: estrutura.label,
          valor: outro,
          motivo: `há achado registrado no lado ${outro}, mas o lado escolhido é ${lado}: revise o lado ou volte a estrutura para normal`,
          bloqueia: true,
        })
      }
    }
  }
  if (texto(opcoes, CONFIRMACAO_CONTROL_KEY) !== 'confirmado') {
    pendencias.push({
      onde: 'Estruturas sem alteração',
      valor: '',
      motivo: 'confirme que as estruturas não alteradas foram revisadas e estão normais',
      bloqueia: true,
    })
  }
  return { ...base, pendencias }
}
