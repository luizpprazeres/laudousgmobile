import {
  validateDopplerCarotidasWeb,
  type DopplerCarotidasWebInput,
  type DopplerCarotidasWebLado,
} from '@laudousg/shared'

/**
 * Formulário Web de carótidas → contrato `doppler-carotidas/web-v2` (rota Web `/render`).
 *
 * Nada é presumido: campo vazio vira `null`, nunca "normal". As pendências são as
 * mesmas do validador do servidor, para a tela dizer o que falta antes de pedir o
 * laudo; com qualquer pendência bloqueante o texto não é gerado.
 */
type Section = Record<string, unknown>
type Exam = Record<string, unknown>
type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean }

const section = (exam: Exam, key: string): Section => {
  const value = exam[key]
  return value && typeof value === 'object' ? value as Section : {}
}
const text = (s: Section, key: string) => typeof s[key] === 'string' ? (s[key] as string).trim() : ''
const oneOf = <T extends string>(raw: string, values: readonly T[]): T | null => (values as readonly string[]).includes(raw) ? raw as T : null

/** Número estrito: vazio = null; formato inválido vira pendência (nunca é adivinhado). */
function number(s: Section, key: string, nome: string, pendencias: Pendencia[], allowZero = false): number | null {
  const raw = text(s, key).replace(',', '.')
  if (!raw) return null
  const parsed = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : Number.NaN
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    pendencias.push({ onde: nome, valor: text(s, key), motivo: 'valor numérico inválido', bloqueia: true })
    return null
  }
  return parsed
}

const CLASSIFICACOES = ['normal', 'ateromatose_sem_estenose_significativa', 'estenose_menor_50', 'estenose_50_69', 'estenose_70_99', 'oclusao'] as const

function sideData(s: Section, side: 'direita' | 'esquerda', classificacao: string, pendencias: Pendencia[]): DopplerCarotidasWebLado {
  const lado = side === 'direita' ? 'direita' : 'esquerda'
  const ids = Array.isArray(s.placas_ids) ? s.placas_ids.filter((id): id is string => typeof id === 'string') : []
  const medidas = (vessel: string) => ({
    vps_cms: number(s, `${vessel}_vps`, `PSV da carótida ${vessel} ${lado}`, pendencias),
    vdf_cms: number(s, `${vessel}_vdf`, `VDF da carótida ${vessel} ${lado}`, pendencias, true),
  })
  return {
    avaliacao: oneOf(text(s, 'avaliacao'), ['avaliado', 'limitado', 'nao_avaliado'] as const),
    limitacao: text(s, 'limitacao') || null,
    emi_mm: number(s, 'emi', `espessura médio-intimal ${lado}`, pendencias),
    comum: medidas('comum'),
    interna: medidas('interna'),
    externa: medidas('externa'),
    placas_status: oneOf(text(s, 'placas_status'), ['ausentes', 'presentes'] as const),
    placas: ids.map((id, i) => {
      const estenose = number(s, `placas.${id}.estenose`, `estenose da placa ${i + 1} ${lado}`, pendencias, true)
      if (estenose !== null && estenose > 100) pendencias.push({ onde: `placa ${i + 1} ${lado}`, valor: `${estenose}%`, motivo: 'o percentual informado precisa estar entre 0 e 100', bloqueia: true })
      return {
        localizacao: text(s, `placas.${id}.localizacao`) || null,
        composicao: oneOf(text(s, `placas.${id}.composicao`), ['calcificada', 'lipidica', 'mista'] as const),
        superficie: oneOf(text(s, `placas.${id}.superficie`), ['regular', 'irregular', 'ulcerada'] as const),
        espessura_mm: number(s, `placas.${id}.espessura`, `espessura da placa ${i + 1} ${lado}`, pendencias),
        estenose_percentual: estenose !== null && estenose <= 100 ? estenose : null,
        descricao_raw: text(s, `placas.${id}.descricao`) || null,
      }
    }),
    vertebral: {
      vps_cms: number(s, 'vertebral_vps', `PSV da vertebral ${lado}`, pendencias),
      direcao: oneOf(text(s, 'vertebral_direcao'), ['anterogrado', 'retrogrado', 'ausente'] as const),
    },
    classificacao: oneOf(classificacao, CLASSIFICACOES),
  }
}

export function adaptarDopplerCarotidas(exam: Exam) {
  const conclusion = section(exam, 'conclusao')
  const pendencias: Pendencia[] = []
  for (const [key, label] of [['direita', 'Lado direito'], ['esquerda', 'Lado esquerdo'], ['conclusao', 'Conclusão']] as const) {
    const conflicts = section(exam, key).companion_conflitos
    if (Array.isArray(conflicts) && conflicts.some((item) => typeof item === 'string' && item.trim())) {
      pendencias.push({
        onde: label,
        valor: 'conflito_companion',
        motivo: 'há divergências do Companion que precisam ser revisadas nos campos destacados',
        bloqueia: true,
      })
    }
  }
  const dados: DopplerCarotidasWebInput = {
    direita: sideData(section(exam, 'direita'), 'direita', text(conclusion, 'classificacao_direita'), pendencias),
    esquerda: sideData(section(exam, 'esquerda'), 'esquerda', text(conclusion, 'classificacao_esquerda'), pendencias),
    conclusao_livre: text(conclusion, 'conclusao_livre') || null,
    achados_adicionais: text(conclusion, 'achados_adicionais') || null,
  }
  for (const issue of validateDopplerCarotidasWeb(dados).issues) {
    const onde = issue.path.startsWith('direita') ? 'Lado direito' : issue.path.startsWith('esquerda') ? 'Lado esquerdo' : 'Exame'
    pendencias.push({ onde, valor: issue.code, motivo: issue.message.replace(/^Lado (direito|esquerdo): /, ''), bloqueia: true })
  }
  return { dados, alteracoes: [] as string[], pendencias }
}
