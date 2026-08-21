/**
 * O item do histórico e as duas traduções que toda tela dele precisa.
 *
 * Vive à parte porque a lista, o painel e a folha do celular usam os três — e
 * uma segunda tabela de rótulos divergiria no primeiro nome de categoria que
 * mudasse.
 */

export type HistoryItem = {
  id: string
  /** `web` = montado por cliques, sem IA. `ia` = gerado pelo aplicativo. */
  origin: 'web' | 'ia'
  category: string
  title: string | null
  text: string
  date: string
}

/** Código de categoria → o nome que o médico lê. */
export function categoriaLabel(code: string): string {
  const map: Record<string, string> = {
    ABDOMEN_TOTAL: 'Abdome total',
    ABDOME_SUPERIOR: 'Abdome superior',
    ABDOMEN_SUPERIOR: 'Abdome superior',
    PROSTATA_SUPRAPUBICA: 'Próstata',
    VIAS_URINARIAS: 'Vias urinárias',
    MAMARIA: 'Mamária',
    PELVE_FEMININA: 'Pelve feminina',
    CERVICAL: 'Cervical',
    CERVICOMETRIA: 'Cervicometria',
    PARTES_MOLES: 'Partes moles',
    TIREOIDE: 'Tireoide',
    MUSCULOESQUELETICO: 'Musculoesquelético',
    OBSTETRICA: 'Obstétrica',
    MORFOLOGICO: 'Morfológica',
    DOPPLER_OBSTETRICO: 'Doppler obstétrico',
    DOPPLER_RENAL: 'Doppler renal',
    DOPPLER_VENOSO_MMII: 'Doppler venoso (MMII)',
  }
  return map[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ')
}

/** `2026-08-21T10:14:00Z` → `21/08/2026 10:14`. */
export function dataFmt(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : iso
}

/**
 * O agrupamento da lista: hoje, ontem, e depois a data.
 *
 * "há 3 dias" seria mais bonito e menos útil — o médico procura o laudo de uma
 * data, não de um intervalo.
 */
export function grupoDaData(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 'Sem data'
  const dia = `${m[1]}-${m[2]}-${m[3]}`
  const agora = new Date()
  const iso0 = (d: Date) => d.toISOString().slice(0, 10)
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  if (dia === iso0(agora)) return 'Hoje'
  if (dia === iso0(ontem)) return 'Ontem'
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** A primeira linha com conteúdo — serve de prévia na lista. */
export function resumo(texto: string): string {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !/^(ULTRASSONOGRAFIA|COMENT[ÁA]RIOS:|T[ÉE]CNICA:|ACHADOS:|OS SEGUINTES)/i.test(l))
  return linhas[0]?.slice(0, 110) ?? ''
}
