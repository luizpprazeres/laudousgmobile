import type { AnalyticsReport } from '@/components/analytics/types'

const MSK_PATTERNS: Array<[RegExp, string]> = [
  [/rotura/i, 'Rotura tendínea'],
  [/tendinit|tendinop/i, 'Tendinopatia'],
  [/calcifica[cç][aã]o\s+(?:tend[aã]o|ten)/i, 'Tendinite calcificante'],
  [/efus[aã]o\s+articular/i, 'Efusão articular'],
  [/bursite/i, 'Bursite'],
]

export const PATHOLOGY_PATTERNS: Record<string, Array<[RegExp, string]>> = {
  OBSTETRICA: [
    [/oligodr[aâ]mnio|oligo[aâ]mnio/i, 'Oligoâmnio'],
    [/poliidr[aâ]mnio|polihidr[aâ]mnio/i, 'Polidrâmnio'],
    [/placenta\s+pr[eé]via/i, 'Placenta prévia'],
    [/colo\s+(?:uterino\s+)?curto/i, 'Colo uterino curto'],
    [/restri[cç][aã]o\s+(?:de\s+)?crescimento|ciur|rciu/i, 'CIUR/RCIU'],
    [/gemelar|trigemelar/i, 'Gestação múltipla'],
    [/descolamento\s+(?:de\s+)?placenta/i, 'Descolamento de placenta'],
  ],
  MORFOLOGICO: [
    [/malforma[cç][aã]o/i, 'Malformação fetal'],
    [/hidrocefalia/i, 'Hidrocefalia'],
    [/fenda\s+(?:labial|palatina)/i, 'Fenda labial/palatina'],
    [/gastrosquise|onfalocele/i, 'Defeito de parede abdominal'],
    [/restri[cç][aã]o\s+(?:de\s+)?crescimento|ciur|rciu/i, 'CIUR/RCIU'],
    [/cardiopatia|card[ií]aco.*anormal|cora[cç][aã]o.*anormal/i, 'Cardiopatia fetal'],
  ],
  TIREOIDE: [
    [/n[oó]dulo/i, 'Nódulo tireoidiano'],
    [/b[oó]cio/i, 'Bócio'],
    [/ti-?rads\s*[45]/i, 'TI-RADS 4 ou 5'],
    [/tireoidite/i, 'Tireoidite'],
    [/calcifica[cç][aã]o/i, 'Calcificação'],
  ],
  MAMARIA: [
    [/n[oó]dulo/i, 'Nódulo mamário'],
    [/cisto/i, 'Cisto mamário'],
    [/bi-?rads\s*[456]/i, 'BI-RADS >= 4'],
    [/microc[aá]lcif/i, 'Microcalcificações'],
    [/linfonodo/i, 'Linfonodomegalia axilar'],
    [/espiculad/i, 'Lesão espiculada'],
  ],
  PELVE_FEMININA: [
    [/mioma|leiomioma/i, 'Mioma uterino'],
    [/adenomiose/i, 'Adenomiose'],
    [/cisto\s+(?:ovariano|de\s+ov[aá]rio)/i, 'Cisto ovariano'],
    [/endometrioma/i, 'Endometrioma'],
    [/policist/i, 'Ovários policísticos'],
    [/hidrossalpinge/i, 'Hidrossalpinge'],
  ],
  ABDOMEN_TOTAL: [
    [/esteatose/i, 'Esteatose hepática'],
    [/lit[ií]ase\s+(?:biliar|vesicular)|c[aá]lculo.*ves[ií]cula/i, 'Litíase biliar'],
    [/cisto\s+(?:hep[aá]tico|renal)/i, 'Cisto hepático/renal'],
    [/hepatomegalia/i, 'Hepatomegalia'],
    [/dilata[cç][aã]o.*biliar|via\s+biliar.*dilat/i, 'Dilatação de vias biliares'],
    [/esplenomegalia/i, 'Esplenomegalia'],
  ],
  VIAS_URINARIAS: [
    [/lit[ií]ase\s+renal|c[aá]lculo.*renal/i, 'Litíase renal'],
    [/hidronefrose|pelvicaliectasia/i, 'Hidronefrose'],
    [/hiperplasia\s+(?:benigna\s+)?(?:de\s+)?pr[oó]stata|hbp/i, 'HBP'],
    [/cisto\s+renal/i, 'Cisto renal'],
    [/ureterolit[ií]ase/i, 'Ureterolitíase'],
  ],
  DOPPLER_OBSTETRICO: [
    [/ip\s+(?:elevado|aumentado)/i, 'IP elevado'],
    [/di[aá]stole\s+(?:zero|ausente)/i, 'Diástole zero/ausente'],
    [/di[aá]stole\s+reversa/i, 'Diástole reversa'],
    [/centraliza[cç][aã]o/i, 'Centralização fetal'],
  ],
  MUSCULOESQUELETICO: MSK_PATTERNS,
  MUSCULOESQUELETICO_V2: MSK_PATTERNS,
}

export function extractPathologies(reports: AnalyticsReport[]) {
  const counts: Record<string, Record<string, number>> = {}

  for (const report of reports) {
    const patterns = PATHOLOGY_PATTERNS[report.category_code]
    if (!patterns) continue
    counts[report.category_code] ??= {}

    for (const [regex, name] of patterns) {
      if (regex.test(report.output_text)) {
        counts[report.category_code][name] = (counts[report.category_code][name] ?? 0) + 1
      }
    }
  }

  return Object.fromEntries(
    Object.entries(counts).map(([category, nameCounts]) => [
      category,
      Object.entries(nameCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    ]),
  ) as Record<string, Array<{ name: string; count: number }>>
}
