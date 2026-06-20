/**
 * Categoria PELVE FEMININA (US pélvica ginecológica) — geração determinística.
 *
 * Fonte: apps/api/src/server/renderer/categories/PELVE_FEMININA.ts (clássico).
 * Volume pelo elipsoide (L×AP×T×0,523). Grosso: VIA ta_tv (TA+TV, a mais comum) —
 * útero (posição/medidas/volume/miomas/adenomiose), endométrio (espessura/frase/DIU),
 * ovário D/E (medidas→volume, achados). Outras vias (tv/ta/pós-aborto) e o cálculo
 * de referência etária → curadoria futura (exigem título dinâmico).
 *
 * Divergência consciente: conclusão de ovários POR LADO (não o item único combinado).
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganModule, OrganSchema, OrganState, OrganComposition } from '../types'

function ptBr(n: number): string {
  const r = Math.round(n * 100) / 100
  return String(r).replace('.', ',')
}
function parseNum(v: unknown): number | null {
  const s = String(v ?? '').trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}
/** parse de 3 medidas "L x AP x T" → [n,n,n] (mm→cm se a string tiver mm). */
function parse3(raw: unknown): (number | null)[] {
  const rawStr = String(raw ?? '').toLowerCase()
  const isMm = rawStr.includes('mm')
  return rawStr.split(/[x×]/i).map((p) => {
    const n = parseNum(p)
    return n == null ? null : isMm ? n / 10 : n
  })
}
function medidasFmt(raw: unknown): string {
  const p = parse3(raw)
  const vals = [0, 1, 2].map((i) => (p[i] != null ? ptBr(p[i] as number) : '____'))
  return `${vals.join(' x ')} cm`
}
function volume(raw: unknown): number | null {
  const p = parse3(raw)
  if (p[0] == null || p[1] == null || p[2] == null) return null
  return Math.round((p[0] as number) * (p[1] as number) * (p[2] as number) * 0.523 * 10) / 10
}
function volFmt(v: number | null): string {
  return v === null ? '____' : ptBr(v)
}
function limpa(s: string): string {
  return s.trim().replace(/\.+$/, '')
}

// ── Bexiga (sempre normal nesta via) ─────────────────────────────────────────
const bexigaModule: OrganModule = {
  schema: { id: 'bexiga', name: 'Bexiga', category: 'PELVE_FEMININA', fields: [
    { key: 'estado', label: 'Estado', kind: 'segmented', hint: 'default: normal', options: [{ value: 'normal', label: 'Normal', isDefault: true }] },
  ] },
  initialState: () => ({ estado: 'normal' }),
  compose: (): OrganComposition => ({
    body: 'Bexiga de forma, contorno e ecotextura normais.',
    conclusion: ['Bexiga ecograficamente normal.'],
    isNormal: true,
  }),
}

// ── Útero ────────────────────────────────────────────────────────────────────
const miomaSubs: Field[] = [
  { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '3,0 x 2,5 x 2,0' },
  { key: 'classificacao', label: 'Classificação', kind: 'mini-segmented', options: [
    { value: 'intramural', label: 'Intramural', isDefault: true }, { value: 'subseroso', label: 'Subseroso' }, { value: 'submucoso', label: 'Submucoso' },
  ] },
  { key: 'parede', label: 'Parede', kind: 'text', placeholder: 'parede anterior' },
  { key: 'figo', label: 'FIGO', kind: 'text', placeholder: 'ex.: 4' },
]
const uteroModule: OrganModule = {
  schema: { id: 'utero', name: 'Útero', category: 'PELVE_FEMININA', fields: [
    { key: 'posicao', label: 'Posição', kind: 'segmented', hint: 'default: anteversão', options: [
      { value: 'anteversão', label: 'Anteversão', isDefault: true }, { value: 'retroversão', label: 'Retroversão' }, { value: 'médioversão', label: 'Médioversão' },
    ] },
    { key: 'medidas', label: 'Medidas (L x AP x T cm)', kind: 'text', placeholder: '7,0 x 4,0 x 5,0' },
    { key: 'volume_classe', label: 'Volume', kind: 'segmented', hint: 'default: normal', options: [
      { value: 'normal', label: 'Normal', isDefault: true }, { value: 'aumentado', label: 'Aumentado' }, { value: 'reduzido', label: 'Reduzido' },
    ] },
    { key: 'miomatoso', label: 'Útero miomatoso (difuso)', kind: 'checklist', options: [{ value: 'sim', label: 'Miomatoso (nódulos não individualizáveis)' }] },
    { key: 'mioma', label: 'Mioma (individualizado)', kind: 'checklist', hint: 'marque se houver', options: [{ value: 'sim', label: 'Nódulo miomatoso', subFields: miomaSubs }] },
    { key: 'adenomiose', label: 'Adenomiose', kind: 'checklist', options: [{ value: 'sim', label: 'Achados de adenomiose' }] },
  ] },
  initialState: () => ({ posicao: 'anteversão', medidas: '', volume_classe: 'normal', miomatoso: [], mioma: [], adenomiose: [],
    'mioma.sim.medidas': '', 'mioma.sim.classificacao': 'intramural', 'mioma.sim.parede': '', 'mioma.sim.figo': '' }),
  compose: (st): OrganComposition => {
    const miomatoso = ((st.miomatoso as string[]) || []).includes('sim')
    const temMioma = ((st.mioma as string[]) || []).includes('sim')
    const adenomiose = ((st.adenomiose as string[]) || []).includes('sim')
    const vol = volume(st.medidas)
    const classe = String(st.volume_classe || 'normal')

    const body: string[] = [`Útero em ${st.posicao || 'anteversão'}, medindo ${medidasFmt(st.medidas)}.`]
    // miométrio
    if (miomatoso) {
      body.push('Miométrio apresentando múltiplas imagens hipoecoicas e heterogêneas, coalescentes, ocasionando atenuação sonora, que impede a avaliação individualizada.')
    } else if (temMioma) {
      const partes = ['Miométrio apresentando imagem hipoecoica e heterogênea, com margens regulares', `medindo ${medidasFmt(st['mioma.sim.medidas'])}`]
      if (st['mioma.sim.parede']) partes.push(`situada na ${limpa(String(st['mioma.sim.parede']))}`)
      body.push(`${partes.join(', ')}.`)
    } else if (adenomiose) {
      body.push('Miométrio de ecotextura heterogênea, com estrias e/ou pequenos cistos miometriais, sugestivos de adenomiose.')
    } else {
      body.push('Miométrio com ecogenicidade e ecotextura normais.')
    }

    const conclusion: string[] = []
    if (miomatoso) {
      conclusion.push(`Útero globoso (miomatoso), de volume ${classe === 'normal' ? 'acentuadamente aumentado' : classe} (${volFmt(vol)} cm³).`)
    } else {
      conclusion.push(`Útero de volume ${classe} (${volFmt(vol)} cm³).`)
    }
    // Útero miomatoso difuso já tem item próprio; não lista mioma individualizado junto.
    if (temMioma && !miomatoso) {
      const cls = st['mioma.sim.classificacao'] ? `nódulo miomatoso ${st['mioma.sim.classificacao']}` : 'nódulo miomatoso'
      const figo = st['mioma.sim.figo'] ? ` (categoria FIGO ${limpa(String(st['mioma.sim.figo']))})` : ''
      conclusion.push(`Miométrio apresentando imagem sólida, que tem como diagnóstico mais provável ${cls}${figo}.`)
    }
    if (adenomiose) conclusion.push('Achados compatíveis com adenomiose.')

    return { body: body.join('\n'), conclusion, isNormal: !miomatoso && !temMioma && !adenomiose && classe === 'normal' }
  },
}

// ── Endométrio ───────────────────────────────────────────────────────────────
const endometrioModule: OrganModule = {
  schema: { id: 'endometrio', name: 'Endométrio', category: 'PELVE_FEMININA', fields: [
    { key: 'espessura', label: 'Espessura (cm)', kind: 'text', placeholder: '0,8' },
    { key: 'eco', label: 'Ecotextura', kind: 'segmented', hint: 'default: homogêneo', options: [
      { value: 'homogeneo', label: 'Homogêneo', isDefault: true }, { value: 'heterogeneo', label: 'Heterogêneo' },
    ] },
    { key: 'frase', label: 'Correlação (conclusão)', kind: 'segmented', hint: 'fase do ciclo', options: [
      { value: 'padrao', label: 'Fase do ciclo', isDefault: true }, { value: 'menopausa', label: 'Menopausa' }, { value: 'reposicao_hormonal', label: 'Reposição hormonal' },
    ] },
    { key: 'achado', label: 'Achado patológico (texto livre)', kind: 'text', placeholder: 'pólipo endometrial medindo…' },
    { key: 'diu', label: 'DIU', kind: 'checklist', options: [{ value: 'sim', label: 'DIU tópico' }] },
  ] },
  initialState: () => ({ espessura: '', eco: 'homogeneo', frase: 'padrao', achado: '', diu: [] }),
  compose: (st): OrganComposition => {
    const esp = parseNum(st.espessura)
    const ecoTxt: Record<string, string> = { homogeneo: 'homogêneo', heterogeneo: 'heterogêneo' }
    const achado = limpa(String(st.achado ?? ''))
    const diu = ((st.diu as string[]) || []).includes('sim')

    const body: string[] = []
    if (achado) body.push(`${achado.charAt(0).toUpperCase()}${achado.slice(1)}.`)
    else body.push(`Endométrio ${ecoTxt[String(st.eco)] ?? 'homogêneo'}, medindo ${esp != null ? ptBr(esp) : '____'} cm de espessura.`)
    if (diu) body.push('Imagem hiperecoica linear na cavidade endometrial, compatível com DIU.')

    const conclusion: string[] = []
    if (achado) {
      conclusion.push(`${achado.charAt(0).toUpperCase()}${achado.slice(1)}.`)
    } else {
      const frase = String(st.frase || 'padrao')
      if (frase === 'menopausa') conclusion.push('O endométrio tem espessura normal para a faixa etária da menopausa.')
      else if (frase === 'reposicao_hormonal') conclusion.push('O endométrio tem espessura normal para a paciente submetida a terapêutica de reposição hormonal.')
      else conclusion.push('O endométrio tem espessura normal para a fase do ciclo menstrual.')
    }
    if (diu) conclusion.push('DIU tópico, bem posicionado.')

    return { body: body.join('\n'), conclusion, isNormal: !achado && !diu }
  },
}

// ── Ovário (fábrica por lado) ────────────────────────────────────────────────
const achadoOvSubs: Field[] = [{ key: 'medidas', label: 'Medidas da imagem (cm)', kind: 'text', placeholder: '3,0 x 2,5 x 2,0' }]
function ovarioSchema(lado: 'direito' | 'esquerdo'): OrganSchema {
  return { id: `ovario_${lado}`, name: `Ovário ${lado}`, category: 'PELVE_FEMININA', fields: [
    { key: 'visualizado', label: 'Visualização', kind: 'segmented', hint: 'default: visualizado', options: [
      { value: 'sim', label: 'Visualizado', isDefault: true }, { value: 'nao', label: 'Não visualizado' },
    ] },
    { key: 'medidas', label: 'Medidas do ovário (L x AP x T cm)', kind: 'text', placeholder: '3,0 x 2,0 x 1,8' },
    { key: 'achado', label: 'Achado', kind: 'segmented', hint: 'default: nenhum', options: [
      { value: 'nenhum', label: 'Nenhum', isDefault: true },
      { value: 'cisto_simples', label: 'Cisto simples', subFields: achadoOvSubs },
      { value: 'cisto_complexo', label: 'Cisto complexo', subFields: achadoOvSubs },
      { value: 'endometrioma', label: 'Endometrioma', subFields: achadoOvSubs },
      { value: 'funcional', label: 'Funcional', subFields: achadoOvSubs },
      { value: 'sop', label: 'Aspecto policístico' },
    ] },
    { key: 'atrofico', label: 'Atrófico (menopausa)', kind: 'checklist', options: [{ value: 'sim', label: 'Poucos folículos' }] },
  ] }
}
function descreveAchadoOv(tipo: string, medidasRaw: unknown): string {
  const med = parse3(medidasRaw).some((n) => n != null) ? `, medindo ${medidasFmt(medidasRaw)}` : ''
  switch (tipo) {
    case 'cisto_simples': return `imagem anecoica de paredes finas e regulares${med}`
    case 'cisto_complexo': return `imagem cística de conteúdo heterogêneo${med}`
    case 'endometrioma': return `imagem de baixa ecogenicidade com aspecto em vidro fosco${med}, sem componente sólido ou septações`
    case 'funcional': return `coleção líquida de aspecto funcional${med}`
    case 'sop': return 'mais de 20 folículos antrais distribuídos na periferia'
    default: return `imagem${med}`
  }
}
function ovarioConclTipo(tipo: string, lado: string): string {
  const ladoFem = lado === 'direito' ? 'direito' : 'esquerdo'
  switch (tipo) {
    case 'cisto_simples': return `Cisto simples no ovário ${ladoFem}.`
    case 'cisto_complexo': return `Cisto complexo no ovário ${ladoFem}, a esclarecer.`
    case 'endometrioma': return `Imagem sugestiva de endometrioma no ovário ${ladoFem}.`
    case 'funcional': return `Imagem de aspecto funcional no ovário ${ladoFem}.`
    case 'sop': return `Ovário ${ladoFem} com morfologia de aspecto policístico.`
    default: return ''
  }
}
function makeOvarioModule(lado: 'direito' | 'esquerdo'): OrganModule {
  const rotulo = `Ovário ${lado}`
  return {
    schema: ovarioSchema(lado),
    initialState: () => ({ visualizado: 'sim', medidas: '', achado: 'nenhum', atrofico: [], [`achado.cisto_simples.medidas`]: '', [`achado.cisto_complexo.medidas`]: '', [`achado.endometrioma.medidas`]: '', [`achado.funcional.medidas`]: '' }),
    compose: (st): OrganComposition => {
      const vol = volume(st.medidas)
      if ((st.visualizado as string) === 'nao') {
        return { body: `${rotulo} não visualizado.`, conclusion: [`Ovário ${lado} não visualizado pela técnica empregada.`], isNormal: false }
      }
      const tipo = String(st.achado || 'nenhum')
      const atrofico = ((st.atrofico as string[]) || []).includes('sim')
      let body: string
      const conclusion: string[] = []
      if (tipo !== 'nenhum') {
        const desc = descreveAchadoOv(tipo, st[`achado.${tipo}.medidas`])
        body = `${rotulo} medindo ${medidasFmt(st.medidas)}, apresentando ${desc}.`
        const c = ovarioConclTipo(tipo, lado)
        if (c) conclusion.push(c)
      } else if (atrofico) {
        body = `${rotulo} medindo ${medidasFmt(st.medidas)}, apresentando poucas imagens anecoicas.`
        conclusion.push(`Ovário ${lado} ecograficamente normal (${volFmt(vol)} cm³), praticamente sem folículos.`)
      } else {
        body = `${rotulo} medindo ${medidasFmt(st.medidas)}, apresentando imagens anecoicas.`
        conclusion.push(`Ovário ${lado} ecograficamente normal (${volFmt(vol)} cm³), contendo folículos.`)
      }
      return { body, conclusion, isNormal: tipo === 'nenhum' && !atrofico }
    },
  }
}

// ── Categoria ────────────────────────────────────────────────────────────────
export const pelveFeminina: ExamCategory = {
  id: 'PELVE_FEMININA',
  name: 'Pelve (feminina)',
  title: 'ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL',
  tecnica:
    'Exame realizado inicialmente com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal. Após a micção, foi introduzido transdutor de 6.5 MHz com a finalidade de realizar a técnica transvaginal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais, abrangendo toda a pelve. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: bexigaModule },
    { id: 'utero', label: 'Útero', group: 'orgaos', module: uteroModule },
    { id: 'endometrio', label: 'Endométrio', group: 'orgaos', module: endometrioModule },
    { id: 'ovario_direito', label: 'Ovário direito', group: 'orgaos', module: makeOvarioModule('direito') },
    { id: 'ovario_esquerdo', label: 'Ovário esquerdo', group: 'orgaos', module: makeOvarioModule('esquerdo') },
  ],
  conclusionNormal: 'Exame ultrassonográfico da pelve dentro dos limites da normalidade.',
}
