/** Categorias já liberadas para o caminho de writer/RAG do gerador real. */
export const STRUCTURED_WEB_CATEGORY_CODES = [
  'ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS', 'PROSTATA_SUPRAPUBICA',
  'DOPPLER_CAROTIDAS', 'OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO',
  'CERVICOMETRIA', 'PELVE_FEMININA', 'MAMARIA', 'TIREOIDE', 'CERVICAL',
  'PARTES_MOLES', 'MUSCULOESQUELETICO',
  'DOPPLER_RENAL', 'DOPPLER_HEPATICO', 'DOPPLER_VENOSO_MMII', 'DOPPLER_VENOSO_MMII_MEDIDAS',
  'PAREDE_ABDOMINAL', 'REGIAO_INGUINAL', 'ESCROTAL',
  'PROSTATA_TRANSRETAL', 'PARATIREOIDE', 'GLANDULAS_SALIVARES',
  'TRANSFONTANELA', 'OCULAR',
  'DOPPLER_ARTERIAL_MMII', 'DOPPLER_FISTULA_AV',
] as const

export const WRITER_CATEGORY_OPTIONS = [
  { id: 'PAREDE_ABDOMINAL', name: 'Parede abdominal', family: 'Medicina interna' },
  { id: 'PROSTATA_TRANSRETAL', name: 'Próstata transretal', family: 'Medicina interna' },
  { id: 'ESCROTAL', name: 'Escrotal', family: 'Medicina interna' },
  { id: 'REGIAO_INGUINAL', name: 'Região inguinal', family: 'Medicina interna' },
  { id: 'PARATIREOIDE', name: 'Paratireoide', family: 'Pequenas partes' },
  { id: 'GLANDULAS_SALIVARES', name: 'Glândulas salivares', family: 'Pequenas partes' },
  { id: 'DOPPLER_VENOSO_MMII', name: 'Doppler venoso MMII', family: 'Vascular' },
  { id: 'DOPPLER_VENOSO_MMII_MEDIDAS', name: 'Doppler venoso MMII · medidas', family: 'Vascular' },
  { id: 'DOPPLER_ARTERIAL_MMII', name: 'Doppler arterial MMII', family: 'Vascular' },
  { id: 'DOPPLER_FISTULA_AV', name: 'Doppler de fístula AV', family: 'Vascular' },
  { id: 'TRANSFONTANELA', name: 'Transfontanelar', family: 'Outros exames' },
  { id: 'OCULAR', name: 'Ocular', family: 'Outros exames' },
  { id: 'LIVRE', name: 'Laudo livre', family: 'Outros exames' },
] as const

export type WriterCategory = (typeof WRITER_CATEGORY_OPTIONS)[number]['id']
export const WRITER_CATEGORY_CODES = WRITER_CATEGORY_OPTIONS
  .map(({ id }) => id)
  .filter(id => !(STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(id)) as readonly WriterCategory[]

export function isWriterCategory(value: string): value is WriterCategory {
  return !(STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(value) && (WRITER_CATEGORY_CODES as readonly string[]).includes(value)
}

export function writerCategoryName(value: string): string {
  return WRITER_CATEGORY_OPTIONS.find((option) => option.id === value)?.name ?? value
}
