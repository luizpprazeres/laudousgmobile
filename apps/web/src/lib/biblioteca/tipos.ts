/**
 * Os tipos da Biblioteca — à parte do cliente porque ele é `server-only`.
 *
 * A tela é componente de cliente e precisa das mesmas formas; importar do
 * módulo de servidor arrastaria o `server-only` para o bundle e quebraria o
 * build. Tipos não têm lado.
 */

export type LinhaDoModelo = {
  secao: 'tecnica' | 'corpo' | 'conclusao'
  slot: string
  variante: string
  frase: string
  /** Falso quando o catálogo proíbe reescrever — `motivo` diz por quê. */
  editavel: boolean
  motivo?: string
  obrigatorio: boolean
  removivel: boolean
  /** Dados do exame que não podem sumir da frase (ex.: `____`). */
  placeholdersObrigatorios: string[]
  dados: { marcador: string; rotulo: string; obrigatorio: boolean }[]
}

export type ModeloProjetado = { nome: string; linhas: LinhaDoModelo[] }

export type CategoriaDaBiblioteca = {
  categoria: string
  rotulo: string
  /** O modelo vem do renderer, não de um catálogo escrito à mão. */
  derivado: boolean
  /** A redação dele está REALMENTE valendo nos laudos — não só publicada. */
  personalizacao_ativa: boolean
  motivo_inativa?: string
  explicacao_inativa?: string
}

export type Operation =
  | { op: 'remove_slot'; slot: string }
  | { op: 'replace_phrase'; slot: string; variant?: string; value: string }
  | { op: 'append_conclusion_item'; value: string }
  | { op: 'insert_phrase_after'; anchor: string; value: string }

export type VersaoPersonalizacao = {
  id: string
  versao: number
  status: string
  operations: Operation[]
  note: string | null
  created_at?: string
  published_at?: string | null
}
