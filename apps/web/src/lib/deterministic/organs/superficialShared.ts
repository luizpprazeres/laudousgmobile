/**
 * Auxiliares compartilhados por PAREDE_ABDOMINAL, REGIAO_INGUINAL e ESCROTAL.
 *
 * Medidas são PRESERVADAS como o médico digitou: só troca ponto por vírgula e
 * normaliza o separador de eixos. Nada de arredondar nem converter unidade —
 * se veio em mm, sai em mm. Medida ausente ou inválida devolve null e quem
 * chama decide: placeholder `____` no corpo e conclusão pendente, nunca um
 * diagnóstico montado em cima de dado faltando.
 */

import type { OrganState } from '../types'

export type Lado = 'direito' | 'esquerdo'

/** Placeholder visível de dado ausente — mesma convenção de cervical/partes moles. */
export const FALTANDO = '____'

function numero(raw: string): string | null {
  const limpo = raw.trim().replace(/\s*(cm|mm)$/i, '').trim()
  if (!/^\d+([.,]\d+)?$/.test(limpo)) return null
  if (Number(limpo.replace(',', '.')) <= 0) return null
  return limpo.replace('.', ',')
}

function unidade(raw: string, padrao: 'cm' | 'mm'): 'cm' | 'mm' {
  if (/mm/i.test(raw)) return 'mm'
  if (/cm/i.test(raw)) return 'cm'
  return padrao
}

/** Valor único ("1,2", "1.2 cm", "3 mm") → "1,2 cm". Null se ausente/inválido. */
export function medida(raw: unknown, padrao: 'cm' | 'mm' = 'cm'): string | null {
  const texto = String(raw ?? '').trim()
  if (!texto) return null
  const n = numero(texto)
  return n ? `${n} ${unidade(texto, padrao)}` : null
}

/** Número de uma medida simples, para comparar com limiares (ex.: varicocele). */
export function valorNumerico(raw: unknown): number | null {
  const n = numero(String(raw ?? ''))
  return n ? Number(n.replace(',', '.')) : null
}

/** Eixos ("2,1 x 1,4 x 1,0") → "2,1 x 1,4 x 1,0 cm". Null se algum eixo for inválido. */
export function medidas(raw: unknown, padrao: 'cm' | 'mm' = 'cm'): string | null {
  const texto = String(raw ?? '').trim()
  if (!texto) return null
  const partes = texto.replace(/\s*(cm|mm)\s*$/i, '').split(/\s*[x×]\s*/i)
  if (partes.length > 3) return null
  const eixos = partes.map(numero)
  if (eixos.some((eixo) => eixo === null)) return null
  return `${eixos.join(' x ')} ${unidade(texto, padrao)}`
}

export function texto(state: OrganState, key: string): string {
  const value = state[key]
  return typeof value === 'string' ? value : ''
}

export function marcado(state: OrganState, key: string, value: string): boolean {
  const list = state[key]
  return Array.isArray(list) && list.includes(value)
}

/** Item de conclusão que segura o diagnóstico até o dado essencial chegar. */
export function conclusaoPendente(achado: string, faltando: string[]): string {
  return `Conclusão pendente (${achado}): informe ${faltando.join(', ')}.`
}

export const CONTEUDO_HERNIA_OPTIONS = [
  { value: 'nao_informado', label: 'Não informado', isDefault: true },
  { value: 'gordura', label: 'Gordura' },
  { value: 'alca', label: 'Alça intestinal' },
  { value: 'liquido', label: 'Líquido' },
]

export const REDUTIBILIDADE_OPTIONS = [
  { value: 'nao_informada', label: 'Não informada', isDefault: true },
  { value: 'redutivel', label: 'Redutível' },
  { value: 'nao_redutivel', label: 'Não redutível' },
]

const CONTEUDO_CORPO: Record<string, string> = {
  gordura: 'conteúdo gorduroso',
  alca: 'alça intestinal',
  liquido: 'conteúdo líquido',
}
const CONTEUDO_CONCLUSAO: Record<string, string> = {
  gordura: 'de conteúdo gorduroso',
  alca: 'de conteúdo entérico',
  liquido: 'de conteúdo líquido',
}

export interface HerniaDados {
  /** Sintagma de localização no corpo (ex.: "na projeção da cicatriz umbilical"). */
  ondeCorpo: string
  conteudo: string
  redutibilidade: string
  colo: string | null
  saco: string | null
}

/**
 * Frase de corpo de um defeito herniário. Segue os modelos do repositório:
 * "hérnia" NÃO aparece no corpo, só "solução de continuidade" + conteúdo +
 * Valsalva + redutibilidade; o nome do achado fica para a conclusão.
 */
export function corpoHernia(d: HerniaDados): string[] {
  const conteudo = CONTEUDO_CORPO[d.conteudo] ?? `conteúdo ${FALTANDO}`
  const reducao = d.redutibilidade === 'redutivel'
    ? 'com redução completa ao repouso e à compressão com o transdutor'
    : d.redutibilidade === 'nao_redutivel'
      ? 'sem redução ao repouso ou à compressão com o transdutor'
      : `redutibilidade ${FALTANDO}`
  const linhas = [
    `Solução de continuidade ${d.ondeCorpo}, com passagem de ${conteudo}, que se acentua à manobra de Valsalva, ${reducao}${d.colo ? `, com colo medindo ${d.colo}` : ''}.`,
  ]
  if (d.saco) linhas.push(`O saco herniário mede ${d.saco}.`)
  return linhas
}

/** Campos essenciais ausentes para concluir hérnia. */
export function faltandoHernia(d: Pick<HerniaDados, 'conteudo' | 'redutibilidade'>): string[] {
  const faltando: string[] = []
  if (!CONTEUDO_CORPO[d.conteudo]) faltando.push('conteúdo')
  if (d.redutibilidade !== 'redutivel' && d.redutibilidade !== 'nao_redutivel') faltando.push('redutibilidade')
  return faltando
}

/** Complemento da conclusão: "de conteúdo gorduroso, redutível, com colo de 1,2 cm". */
export function complementoHernia(d: HerniaDados): string {
  const partes = [CONTEUDO_CONCLUSAO[d.conteudo], d.redutibilidade === 'redutivel' ? 'redutível' : 'não redutível']
  if (d.colo) partes.push(`com colo de ${d.colo}`)
  return partes.join(', ')
}

/** Conduta anexada quando a hérnia não reduz — sem afirmar encarceramento. */
export const CONDUTA_NAO_REDUTIVEL = 'Convém, a critério clínico, avaliação cirúrgica.'
