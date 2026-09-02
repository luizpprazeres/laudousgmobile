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
import { criarCervicometriaAddonModule } from './cervicometriaAddon'
import { criarDopplerAddonModule } from './dopplerObstetrico'
import { criarFetalGrowthModule } from './fetalGrowth'
import { computeIG, type Referencia } from '../../ig/computeIG'
import { preEclampsiaFmfSpec, trisomyFmfSpec } from '../../calculators/specs'

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
      { key: 'bio_sem', label: 'Biometria atual · semanas', kind: 'text', placeholder: '20' },
      { key: 'bio_dias', label: 'Dias', kind: 'text', placeholder: '3' },
      {
        key: 'referencia',
        label: 'Datação de referência',
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

// ── Feto: situação/apresentação + BCF + anatomia padrão ───────────────────────
const fetoModule: OrganModule = {
  schema: {
    id: 'feto',
    name: 'Feto',
    category: 'OBSTETRICA',
    fields: [
      {
        key: 'situacao',
        label: 'Situação fetal',
        kind: 'segmented',
        options: [
          {
            value: 'longitudinal',
            label: 'Longitudinal',
            isDefault: true,
            subFields: [{
              key: 'apresentacao',
              label: 'Apresentação',
              kind: 'mini-segmented',
              options: [
                { value: 'cefálica', label: 'Cefálica', isDefault: true },
                { value: 'pélvica', label: 'Pélvica' },
              ],
            }],
          },
          {
            value: 'transversa',
            label: 'Transversa/córmica',
            subFields: [{
              key: 'polo_cefalico',
              label: 'Posição do polo cefálico',
              kind: 'mini-segmented',
              options: [
                { value: 'à direita', label: 'À direita', isDefault: true },
                { value: 'à esquerda', label: 'À esquerda' },
              ],
            }],
          },
        ],
      },
      {
        key: 'dorso', label: 'Dorso (opcional)', kind: 'segmented',
        options: [
          { value: '', label: 'Não informar', isDefault: true },
          { value: 'à esquerda', label: 'À esquerda' },
          { value: 'à direita', label: 'À direita' },
          { value: 'anterior', label: 'Anterior' },
          { value: 'posterior', label: 'Posterior' },
        ],
      },
      {
        key: 'vitalidade', label: 'Atividade cardíaca fetal', kind: 'segmented',
        options: [
          { value: 'normal', label: 'Presente', isDefault: true },
          { value: 'ausente', label: 'Ausente' },
          { value: 'bradicardia', label: 'Bradicardia' },
          { value: 'taquicardia', label: 'Taquicardia' },
        ],
      },
      { key: 'bcf', label: 'BCF (bpm)', kind: 'text', placeholder: '145' },
      {
        key: 'movimentos', label: 'Movimentos fetais', kind: 'segmented',
        options: [
          { value: 'normais', label: 'Ativos', isDefault: true },
          { value: 'reduzidos', label: 'Reduzidos' },
          { value: 'ausentes', label: 'Ausentes' },
        ],
      },
      {
        key: 'cordao_vasos', label: 'Vasos do cordão umbilical', kind: 'segmented',
        hint: 'só informe quando avaliado',
        options: [
          { value: 'nao_avaliado', label: 'Não informar', isDefault: true },
          { value: 'tres', label: '2 artérias + 1 veia' },
          { value: 'dois', label: 'Artéria umbilical única' },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({
    situacao: 'longitudinal',
    'situacao.longitudinal.apresentacao': 'cefálica',
    'situacao.transversa.polo_cefalico': 'à direita',
    dorso: '',
    vitalidade: 'normal',
    bcf: '',
    movimentos: 'normais',
    cordao_vasos: 'nao_avaliado',
  }),
  compose: (st): OrganComposition => {
    const situacao = String(st.situacao || 'longitudinal')
    const apres = String(st['situacao.longitudinal.apresentacao'] || 'cefálica')
    const polo = String(st['situacao.transversa.polo_cefalico'] || 'à direita')
    const dorso = String(st.dorso || '').trim()
    const vitalidade = String(st.vitalidade || 'normal')
    const movimentos = String(st.movimentos || 'normais')
    const cordao = String(st.cordao_vasos || 'nao_avaliado')
    const bcf = numOrNull(st.bcf)
    const bcfLinha = vitalidade === 'ausente'
      ? 'Ausência de batimentos cardíacos fetais.'
      : vitalidade === 'bradicardia'
        ? bcf === null
          ? 'Batimentos cardíacos presentes, com frequência reduzida.'
          : `Batimentos cardíacos presentes, com frequência de ${ptBr(bcf)} bpm.`
      : vitalidade === 'taquicardia'
        ? bcf === null
          ? 'Batimentos cardíacos presentes, com frequência aumentada.'
          : `Batimentos cardíacos presentes, com frequência de ${ptBr(bcf)} bpm.`
        : `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${bcf === null ? '____' : ptBr(bcf)} bpm).`
    const movimentosLinha = vitalidade === 'ausente'
      ? null
      : movimentos === 'ausentes'
        ? 'Não foram observados movimentos fetais durante o exame.'
        : movimentos === 'reduzidos' ? 'Movimentos fetais reduzidos.' : 'Os movimentos fetais são ativos.'
    const linhas = [
      situacao === 'transversa'
        ? `Feto único, em situação transversa, com polo cefálico ${polo}${dorso ? `, e dorso ${dorso}` : ''}.`
        : `Feto único, em apresentação ${apres}${dorso ? `, com dorso ${dorso}` : ''}.`,
      bcfLinha,
      movimentosLinha,
      '\nAs considerações sobre a anatomia fetal são as seguintes:',
      'As estruturas cranianas e da coluna vertebral são normais.',
      'O estômago e a bexiga foram bem identificados e com ecotextura homogênea.',
      cordao === 'tres' ? 'O cordão umbilical tem aspecto normal, com duas artérias e uma veia.' : null,
      cordao === 'dois' ? 'O cordão umbilical tem dois vasos, sendo uma artéria e uma veia.' : null,
    ].filter((linha): linha is string => Boolean(linha))
    const conclusion = [
      vitalidade === 'ausente' ? 'Óbito fetal.' : null,
      vitalidade === 'bradicardia' ? 'Bradicardia fetal.' : null,
      vitalidade === 'taquicardia' ? 'Taquicardia fetal.' : null,
      movimentos === 'ausentes' && vitalidade !== 'ausente' ? 'Ausência de movimentos fetais durante o exame.' : null,
      movimentos === 'reduzidos' && vitalidade !== 'ausente' ? 'Movimentos fetais reduzidos.' : null,
      cordao === 'dois' ? 'Artéria umbilical única.' : null,
    ].filter((item): item is string => Boolean(item))
    return { body: linhas.join('\n'), conclusion, isNormal: conclusion.length === 0 }
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
      {
        key: 'relacao_orificio',
        label: 'Relação com o orifício interno do colo',
        kind: 'segmented',
        hint: 'eixo independente da localização',
        options: [
          { value: 'nao_informada', label: 'Não informar', isDefault: true },
          {
            value: 'insercao_baixa',
            label: 'Inserção baixa',
            subFields: [{ key: 'distancia_mm', label: 'Distância da borda ao OI (mm, opcional)', kind: 'text', placeholder: '12' }],
          },
          { value: 'marginal', label: 'Prévia marginal' },
          { value: 'previa', label: 'Prévia' },
        ],
      },
      {
        key: 'achado',
        label: 'Achado placentário',
        kind: 'segmented',
        options: [
          { value: 'nenhum', label: 'Sem achado', isDefault: true },
          {
            value: 'descolamento',
            label: 'Coleção retroplacentária',
            subFields: [{ key: 'medidas', label: 'Medidas (opcional)', kind: 'text', placeholder: '3,2 x 1,8 cm' }],
          },
          { value: 'acretismo', label: 'Sinais de acretismo' },
          { value: 'lagos_venosos', label: 'Lagos venosos' },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ estado: 'normal', relacao_orificio: 'nao_informada', achado: 'nenhum' }),
  compose: (st): OrganComposition => {
    const relacao = String(st.relacao_orificio || 'nao_informada')
    const achado = String(st.achado || 'nenhum')
    const loc = String(st['estado.detalhar.localizacao'] || '').trim()
    const grau = String(st['estado.detalhar.grau'] || '').trim().replace(/^grau\s*/i, '')
    const eco = String(st['estado.detalhar.ecotextura'] || '').trim()
    const corpo: string[] = []
    const conclusion: string[] = []
    if (String(st.estado) === 'detalhar' || relacao !== 'nao_informada') {
      let frase = 'Placenta'
      if (loc) frase += ` de localização ${loc}`
      if (grau) frase += `, grau ${grau}`
      if (eco) frase += `, com ecotextura ${eco}`
      if (relacao === 'insercao_baixa') {
        frase += ', estendendo-se ao segmento uterino inferior'
        const distancia = numOrNull(st['relacao_orificio.insercao_baixa.distancia_mm'])
        if (distancia !== null) frase += `. Sua borda inferior dista cerca de ${ptBr(distancia)} mm do orifício interno do colo uterino, sem recobri-lo`
        conclusion.push('Placenta de inserção baixa.')
      } else if (relacao === 'marginal') {
        frase += ', estendendo-se inferiormente e margeando o orifício interno do colo uterino, sem evidência de recobrimento'
        conclusion.push('Placenta prévia marginal.')
      } else if (relacao === 'previa') {
        frase += ', estendendo-se ao segmento uterino inferior e recobrindo amplamente o orifício interno do colo uterino'
        conclusion.push('Placenta prévia.')
      }
      corpo.push(`${frase}.`)
    } else if (achado === 'nenhum') {
      corpo.push('Placenta de aspecto normal.')
    }

    if (achado === 'descolamento') {
      const medidas = String(st['achado.descolamento.medidas'] || '').trim()
      corpo.push(`Imagem hipoecoica e heterogênea${medidas ? `, medindo ${medidas}` : ''}, situada entre a placenta e o miométrio, sem vascularização.`)
      conclusion.push('Coleção retroplacentária, que tem como diagnóstico mais provável descolamento placentário.')
    } else if (achado === 'acretismo') {
      corpo.push('Placenta apresentando perda focal da zona hipoecoica retroplacentária e acentuado adelgaçamento do miométrio subjacente. Ademais, imagens anecoicas intraplacentárias, irregulares, algumas apresentando fluxo turbulento ao estudo Doppler, associadas a aumento da vascularização na interface uterovesical.')
      conclusion.push('Achados ultrassonográficos que aumentam a suspeição para espectro de acretismo placentário (PAS). Convém, a critério clínico, avaliação dirigida em serviço de alto risco e controle ultrassonográfico.')
    } else if (achado === 'lagos_venosos') {
      corpo.push('Placenta apresentando imagens anecoicas intraparenquimatosas, bem delimitadas, de contornos regulares, algumas demonstrando fluxo de baixa velocidade ao estudo Doppler.')
      conclusion.push('Lagos venosos placentários.')
    }
    return { body: corpo.join('\n'), conclusion, isNormal: conclusion.length === 0 }
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

const cervicometriaModule = criarCervicometriaAddonModule('OBSTETRICA')
const dopplerModule = criarDopplerAddonModule('OBSTETRICA')
const fetalGrowthModule = criarFetalGrowthModule('OBSTETRICA')

export const obstetrica: ExamCategory = {
  id: 'OBSTETRICA',
  name: 'Obstétrica',
  title: 'ULTRASSONOGRAFIA OBSTÉTRICA',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'ig', label: 'Datação', group: 'orgaos', module: igModule },
    { id: 'feto', label: 'Feto', group: 'orgaos', module: fetoModule },
    { id: 'biometria', label: 'Biometria', group: 'orgaos', module: biometriaModule },
    { id: 'placenta', label: 'Placenta', group: 'orgaos', module: placentaModule },
    { id: 'liquido', label: 'Líquido', group: 'orgaos', module: liquidoModule },
    { id: 'cervicometria', label: 'Cervicometria', group: 'orgaos', module: cervicometriaModule },
    { id: 'doppler', label: 'Doppler', group: 'orgaos', module: dopplerModule },
    { id: 'crescimento_fetal', label: 'Crescimento fetal', group: 'orgaos', module: fetalGrowthModule },
    { id: 'achados', label: 'Achados adicionais', group: 'orgaos', module: achadosModule },
  ],
  calculators: [
    preEclampsiaFmfSpec,
    ...(process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION === 'true' ? [trisomyFmfSpec] : []),
  ],
  // A IG sempre gera item de conclusão; este fallback é só defensivo.
  conclusionNormal: 'Gestação em torno de ____ semanas.',
}
