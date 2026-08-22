/**
 * Categoria OBSTETRICA — geração determinística (feto único, gestação padrão >14s).
 *
 * Fonte: apps/api/src/server/renderer/categories/OBSTETRICA.ts (renderObstetricaClassico)
 * + fundação de IG ([[epico-ig-deterministica]], lib/ig/computeIG) + lógica MBV/ILA
 * do boletim ([[boletim-engine-p0]]): MBV 2–8 cm normal; ILA 5–25 cm normal.
 *
 * Escopo v1: feto único, padrão. PENDENTE (incrementos): gemelar, gestação inicial
 * (saco/CCN), percentil de peso (curvas).
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganState, OrganComposition } from '../types'
import { computeIG, type Referencia } from '../../ig/computeIG'

const TECNICA =
  'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

// ── helpers (compartilhados com morfológico) ─────────────────────────────────
/** Parse ESTRITO (review dex2): rejeita lixo após número ("5abc" → null). */
export function numOrNull(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return parseFloat(s)
}
export function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace('.', ',')
}
export function mm(v: number | null): string {
  return v === null ? '____' : ptBr(v)
}
/** "DD/MM/AAAA" → "AAAA-MM-DD" (ISO). Parse ESTRITO: rejeita data inexistente
 *  (31/02) — review dex2; espelha o parse estrito da engine (renderer/ig.ts). */
function brToISO(v: unknown): string | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
}

// ── IG e datas (âncora = biometria atual; referência só corrige se >5 dias) ───
export const igModule: OrganModule = {
  schema: {
    id: 'ig',
    name: 'Idade gestacional',
    category: 'OBSTETRICA',
    fields: [
      { key: 'bio_sem', label: 'IG biometria — semanas', kind: 'text', placeholder: '20' },
      { key: 'bio_dias', label: 'IG biometria — dias', kind: 'text', placeholder: '3' },
      {
        key: 'referencia',
        label: 'Referência precoce',
        kind: 'segmented',
        hint: 'corrige a IG só se divergir > 5 dias',
        options: [
          { value: 'nenhuma', label: 'Nenhuma', isDefault: true },
          {
            value: 'usg',
            label: 'US precoce',
            subFields: [
              { key: 'us_data', label: 'Data da 1ª US (DD/MM/AAAA)', kind: 'text', placeholder: '12/01/2026' },
              { key: 'us_ig_sem', label: 'IG na 1ª US — semanas', kind: 'text', placeholder: '8' },
              { key: 'us_ig_dias', label: 'IG na 1ª US — dias', kind: 'text', placeholder: '2' },
              { key: 'exame_data', label: 'Data do exame (DD/MM/AAAA)', kind: 'text', placeholder: '20/06/2026' },
              { key: 'corrigir', label: 'Sinalizar correção (se divergir > 5 dias)', kind: 'segmented', options: [{ value: 'sim', label: 'Sim', isDefault: true }, { value: 'nao', label: 'Não' }] },
            ],
          },
          {
            value: 'dum',
            label: 'DUM',
            subFields: [
              { key: 'dum_data', label: 'DUM (DD/MM/AAAA)', kind: 'text', placeholder: '01/01/2026' },
              { key: 'exame_data', label: 'Data do exame (DD/MM/AAAA)', kind: 'text', placeholder: '20/06/2026' },
              { key: 'corrigir', label: 'Sinalizar correção (se divergir > 5 dias)', kind: 'segmented', options: [{ value: 'sim', label: 'Sim', isDefault: true }, { value: 'nao', label: 'Não' }] },
            ],
          },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ bio_sem: '', bio_dias: '', referencia: 'nenhuma' }),
  compose: (st): OrganComposition => {
    const sem = numOrNull(st.bio_sem)
    if (sem === null) {
      return { body: '', conclusion: ['Gestação em torno de ____ semanas.'], isNormal: true }
    }
    const dias = numOrNull(st.bio_dias) ?? 0
    const tipo = String(st.referencia ?? 'nenhuma')

    let referencia: Referencia | undefined
    let hojeISO = ''
    let corrigir = false
    if (tipo === 'usg') {
      const usData = brToISO(st['referencia.usg.us_data'])
      const exame = brToISO(st['referencia.usg.exame_data'])
      const usSem = numOrNull(st['referencia.usg.us_ig_sem'])
      const usDias = numOrNull(st['referencia.usg.us_ig_dias']) ?? 0
      // Default ON (espelha prod: default true; médico pode optar por "Não").
      corrigir = String(st['referencia.usg.corrigir'] ?? 'sim') !== 'nao'
      if (usData && exame && usSem !== null) {
        referencia = { tipo: 'us', dataISO: usData, ig: { semanas: usSem, dias: usDias } }
        hojeISO = exame
      }
    } else if (tipo === 'dum') {
      const dumData = brToISO(st['referencia.dum.dum_data'])
      const exame = brToISO(st['referencia.dum.exame_data'])
      corrigir = String(st['referencia.dum.corrigir'] ?? 'sim') !== 'nao'
      if (dumData && exame) {
        referencia = { tipo: 'dum', dataISO: dumData }
        hojeISO = exame
      }
    }

    const r = computeIG({ biometria: { semanas: sem, dias }, hojeISO, referencia, corrigir })
    return { body: r.frase1aUS ?? '', conclusion: [r.igConclusao], isNormal: true }
  },
}

// ── Feto: apresentação + BCF + anatomia padrão ────────────────────────────────
const fetoModule: OrganModule = {
  schema: {
    id: 'feto',
    name: 'Feto',
    category: 'OBSTETRICA',
    fields: [
      {
        key: 'apresentacao',
        label: 'Apresentação',
        kind: 'segmented',
        options: [
          { value: 'cefálica', label: 'Cefálica', isDefault: true },
          { value: 'pélvica', label: 'Pélvica' },
          { value: 'córmica', label: 'Córmica/transversa' },
        ],
      },
      { key: 'dorso', label: 'Dorso (opcional)', kind: 'text', placeholder: 'à esquerda' },
      { key: 'bcf', label: 'BCF (bpm)', kind: 'text', placeholder: '145' },
    ],
  },
  initialState: (): OrganState => ({ apresentacao: 'cefálica', dorso: '', bcf: '' }),
  compose: (st): OrganComposition => {
    const apres = String(st.apresentacao || 'cefálica')
    const dorso = String(st.dorso || '').trim()
    const bcf = numOrNull(st.bcf)
    const linhas = [
      `Feto único, em apresentação ${apres}${dorso ? `, com dorso ${dorso}` : ''}.`,
      `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${bcf === null ? '____' : ptBr(bcf)} bpm).`,
      'Os movimentos fetais são ativos.',
      '\nAs considerações sobre a anatomia fetal são as seguintes:',
      'As estruturas cranianas e da coluna vertebral são normais.',
      'O estômago e a bexiga foram bem identificados e com ecotextura homogênea.',
    ]
    return { body: linhas.join('\n'), conclusion: [], isNormal: true }
  },
}

// ── Biometria fetal ───────────────────────────────────────────────────────────
const biometriaModule: OrganModule = {
  schema: {
    id: 'biometria',
    name: 'Biometria',
    category: 'OBSTETRICA',
    fields: [
      { key: 'dbp', label: 'DBP (mm)', kind: 'text', placeholder: '48' },
      { key: 'cc', label: 'CC (mm)', kind: 'text', placeholder: '175' },
      { key: 'ca', label: 'CA (mm)', kind: 'text', placeholder: '152' },
      { key: 'cf', label: 'CF (mm)', kind: 'text', placeholder: '33' },
      { key: 'peso', label: 'Peso estimado (g)', kind: 'text', placeholder: '320' },
    ],
  },
  initialState: (): OrganState => ({ dbp: '', cc: '', ca: '', cf: '', peso: '' }),
  compose: (st): OrganComposition => {
    const linhas = [
      'A biometria fetal é a seguinte:',
      `Diâmetro biparietal (DBP) de ${mm(numOrNull(st.dbp))} mm.`,
      `Circunferência da cabeça (CC) de ${mm(numOrNull(st.cc))} mm.`,
      `Circunferência abdominal (CA) de ${mm(numOrNull(st.ca))} mm.`,
      `Comprimento do fêmur (CF) de ${mm(numOrNull(st.cf))} mm.`,
      `Peso aproximado de ${mm(numOrNull(st.peso))} gramas.`,
    ]
    return { body: linhas.join('\n'), conclusion: [], isNormal: true }
  },
}

// ── Placenta ──────────────────────────────────────────────────────────────────
const placentaModule: OrganModule = {
  schema: {
    id: 'placenta',
    name: 'Placenta',
    category: 'OBSTETRICA',
    fields: [
      {
        key: 'estado',
        label: 'Placenta',
        kind: 'segmented',
        options: [
          { value: 'normal', label: 'Normal', isDefault: true },
          {
            value: 'detalhar',
            label: 'Detalhar',
            subFields: [
              { key: 'localizacao', label: 'Localização', kind: 'text', placeholder: 'posterior' },
              { key: 'grau', label: 'Grau (0/I/II/III)', kind: 'text', placeholder: 'I' },
              { key: 'ecotextura', label: 'Ecotextura (opcional)', kind: 'text', placeholder: 'homogênea' },
            ],
          },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ estado: 'normal' }),
  compose: (st): OrganComposition => {
    if (String(st.estado) !== 'detalhar') {
      return { body: 'Placenta de aspecto normal.', conclusion: [], isNormal: true }
    }
    const loc = String(st['estado.detalhar.localizacao'] || '').trim()
    const grau = String(st['estado.detalhar.grau'] || '').trim().replace(/^grau\s*/i, '')
    const eco = String(st['estado.detalhar.ecotextura'] || '').trim()
    let frase = 'Placenta'
    if (loc) frase += ` de localização ${loc}`
    if (grau) frase += `, grau ${grau}`
    if (eco) frase += `, com ecotextura ${eco}`
    return { body: `${frase}.`, conclusion: [], isNormal: true }
  },
}

// ── Líquido amniótico (MBV/ILA com classificação segura — boletim) ────────────
function classeMBV(v: number): { classe: string; conclusao: string } {
  if (v < 2) return { classe: 'reduzida', conclusao: 'Oligoâmnio' }
  if (v > 8) return { classe: 'aumentada', conclusao: 'Polidrâmnio' }
  return { classe: 'normal', conclusao: 'Líquido amniótico em quantidade normal' }
}
export function classeILA(v: number): { classe: string; conclusao: string } {
  if (v < 5) return { classe: 'reduzida', conclusao: 'Oligoâmnio' }
  if (v > 25) return { classe: 'aumentada', conclusao: 'Polidrâmnio' }
  return { classe: 'normal', conclusao: 'Líquido amniótico em quantidade normal' }
}
const liquidoModule: OrganModule = {
  schema: {
    id: 'liquido',
    name: 'Líquido amniótico',
    category: 'OBSTETRICA',
    fields: [
      {
        key: 'tipo',
        label: 'Líquido amniótico',
        kind: 'segmented',
        options: [
          { value: 'subjetivo', label: 'Normal (subjetivo)', isDefault: true },
          { value: 'mbv', label: 'MBV', subFields: [{ key: 'cm', label: 'Maior bolsão vertical (cm)', kind: 'text', placeholder: '5,6' }] },
          { value: 'ila', label: 'ILA', subFields: [{ key: 'cm', label: 'ILA (cm)', kind: 'text', placeholder: '12' }] },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ tipo: 'subjetivo' }),
  compose: (st): OrganComposition => {
    const tipo = String(st.tipo || 'subjetivo')
    // Subjetivo normal (também é o fallback quando a medida está em branco — NUNCA
    // afirmar normalidade atrelada a um "____" cm; review dex2).
    const subjetivo: OrganComposition = {
      body: 'Líquido amniótico de quantidade normal pela análise subjetiva.',
      conclusion: ['Líquido amniótico em quantidade normal.'],
      isNormal: true,
    }
    if (tipo === 'mbv') {
      const v = numOrNull(st['tipo.mbv.cm'])
      if (v === null) return subjetivo
      const c = classeMBV(v)
      return { body: `Maior bolsão vertical de ${ptBr(v)} cm.`, conclusion: [`${c.conclusao} (maior bolsão vertical de ${ptBr(v)} cm).`], isNormal: c.classe === 'normal' }
    }
    if (tipo === 'ila') {
      const v = numOrNull(st['tipo.ila.cm'])
      if (v === null) return subjetivo
      const c = classeILA(v)
      return { body: `Índice de líquido amniótico (ILA) de ${ptBr(v)} cm.`, conclusion: [`${c.conclusao} (ILA de ${ptBr(v)} cm).`], isNormal: c.classe === 'normal' }
    }
    return subjetivo
  },
}

// ── Achados adicionais (texto livre do médico, vai ao corpo) ──────────────────
const achadosModule: OrganModule = {
  schema: {
    id: 'achados',
    name: 'Achados adicionais',
    category: 'OBSTETRICA',
    fields: [{ key: 'texto', label: 'Achados adicionais (opcional)', kind: 'text', placeholder: 'observação livre — vai ao corpo do laudo' }],
  },
  initialState: (): OrganState => ({ texto: '' }),
  compose: (st): OrganComposition => {
    const t = String(st.texto || '').trim()
    return { body: t || '', conclusion: [], isNormal: true }
  },
}

export const obstetrica: ExamCategory = {
  id: 'OBSTETRICA',
  name: 'Obstétrica',
  title: 'ULTRASSONOGRAFIA OBSTÉTRICA',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'ig', label: 'IG e datas', group: 'orgaos', module: igModule },
    { id: 'feto', label: 'Feto', group: 'orgaos', module: fetoModule },
    { id: 'biometria', label: 'Biometria', group: 'orgaos', module: biometriaModule },
    { id: 'placenta', label: 'Placenta', group: 'orgaos', module: placentaModule },
    { id: 'liquido', label: 'Líquido', group: 'orgaos', module: liquidoModule },
    { id: 'achados', label: 'Achados adicionais', group: 'orgaos', module: achadosModule },
  ],
  // A IG sempre gera item de conclusão; este fallback é só defensivo.
  conclusionNormal: 'Gestação em torno de ____ semanas.',
}
