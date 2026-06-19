/**
 * Categoria PRÓSTATA (via transabdominal / suprapúbica) — geração determinística.
 *
 * Fonte de verdade: apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts
 * (curadoria A10 do Luiz + revisão dex1) e docs/catalogo-clinico-exames.md.
 *
 * Estruturas (ordem do corpo): bexiga · próstata · vesículas seminais.
 * Conclusão SEMPRE lista todas as estruturas (inclusive normais).
 * Peso prostático = D1×D2×D3×0,5233×1,05 (só com 3 medidas ≥ 1 cm).
 * IPP só aparece quando a próstata está aumentada; graduado em cm (1/2/3).
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganSchema, OrganState, OrganComposition } from '../types'

// ── helpers (espelham o renderer) ────────────────────────────────────────────
function parseCm(v: unknown): number | null {
  const s = String(v ?? '').trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const isMm = s.includes('mm')
  const m = s.match(/-?\d+(\.\d+)?/)
  if (!m) return null
  let n = Number(m[0])
  if (!Number.isFinite(n)) return null
  if (isMm) n = n / 10 // usuário digitou em mm → converte p/ cm
  return n
}
function ptBr1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}
function intStr(v: unknown): string | null {
  const s = String(v ?? '').trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? String(Math.round(n)) : null
}

/** Peso prostático (elipsoide). Exige 3 medidas em cm, cada uma ≥ 1 cm. */
export function calcPesoProstatico(
  d1: number | null,
  d2: number | null,
  d3: number | null
): number | null {
  if (d1 === null || d2 === null || d3 === null) return null
  if (d1 < 1 || d2 < 1 || d3 < 1) return null
  const peso = d1 * d2 * d3 * 0.5233 * 1.05
  return Math.round(peso * 10) / 10
}

/** Grau do IPP (cm): Grau 1 ≤0,5; Grau 2 >0,5–1,0; Grau 3 >1,0–1,5; acima = acentuada. */
export function ippGrau(cm: number): string {
  if (cm <= 0.5) return 'Grau 1'
  if (cm <= 1.0) return 'Grau 2'
  if (cm <= 1.5) return 'Grau 3'
  return 'protrusão acentuada'
}

// ── Bexiga ───────────────────────────────────────────────────────────────────
const bexigaSchema: OrganSchema = {
  id: 'bexiga',
  name: 'Bexiga',
  category: 'PROSTATA_SUPRAPUBICA',
  fields: [
    {
      key: 'achados',
      label: 'Alterações',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [
        { value: 'espessamento', label: 'Espessamento parietal' },
        { value: 'trabeculacao', label: 'Trabeculação' },
        { value: 'calculo', label: 'Cálculo vesical' },
        { value: 'diverticulo', label: 'Divertículo' },
      ],
    },
    { key: 'volume_pre', label: 'Volume pré-miccional (mL)', kind: 'text', placeholder: '250' },
    {
      key: 'residuo',
      label: 'Resíduo pós-miccional',
      kind: 'segmented',
      options: [
        { value: 'nao_informado', label: 'Não informado', isDefault: true },
        { value: 'desprezivel', label: 'Desprezível' },
        {
          value: 'valor',
          label: 'Valor',
          subFields: [{ key: 'ml', label: 'mL', kind: 'text', placeholder: '80' }],
        },
      ],
    },
  ],
}

const BEXIGA_ACHADO_BODY: Record<string, string> = {
  espessamento: 'espessamento parietal',
  trabeculacao: 'trabeculação parietal',
  calculo: 'imagem hiperecogênica com sombra acústica de permeio (cálculo)',
  diverticulo: 'imagem sacular comunicante (divertículo)',
}

function bexigaInitial(): OrganState {
  return { achados: [], volume_pre: '', residuo: 'nao_informado', 'residuo.valor.ml': '' }
}

function bexigaCompose(state: OrganState): OrganComposition {
  const achados = (state.achados as string[]) || []
  const volume = intStr(state.volume_pre)
  const residuo = (state.residuo as string) || 'nao_informado'
  const residuoMl = intStr(state['residuo.valor.ml'])

  const volTxt = volume ? ` Volume pré-miccional de ${volume} mL.` : ''
  const conclusion: string[] = []

  let body: string
  if (achados.length > 0) {
    const lista = achados.map((a) => BEXIGA_ACHADO_BODY[a] ?? a).join(', ')
    body = `Bexiga com ${lista}.${volTxt}`
    conclusion.push(`Alterações vesicais (${lista}), a correlacionar com obstrução infravesical.`)
  } else {
    body = `Bexiga de forma, ecotextura e contornos regulares.${volTxt}`
    conclusion.push('Bexiga ecograficamente normal.')
  }

  if (residuo === 'valor' && residuoMl) {
    conclusion.push(
      Number(residuoMl) > 100
        ? `Resíduo pós-miccional elevado (${residuoMl} mL).`
        : `Resíduo pós-miccional de ${residuoMl} mL.`
    )
  } else if (residuo === 'desprezivel') {
    conclusion.push('Resíduo pós-miccional desprezível.')
  }

  return { body, conclusion, isNormal: achados.length === 0 }
}

const bexigaModule: OrganModule = {
  schema: bexigaSchema,
  initialState: bexigaInitial,
  compose: bexigaCompose,
}

// ── Próstata ─────────────────────────────────────────────────────────────────
const prostataSchema: OrganSchema = {
  id: 'prostata',
  name: 'Próstata',
  category: 'PROSTATA_SUPRAPUBICA',
  fields: [
    { key: 'd1', label: 'Medida 1 (cm)', kind: 'text', placeholder: '5,1' },
    { key: 'd2', label: 'Medida 2 (cm)', kind: 'text', placeholder: '4,4' },
    { key: 'd3', label: 'Medida 3 (cm)', kind: 'text', placeholder: '3,9' },
    {
      key: 'volume',
      label: 'Volume',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        {
          value: 'aumentada',
          label: 'Aumentada',
          subFields: [{ key: 'ipp', label: 'IPP (cm)', kind: 'text', placeholder: '0,8' }],
        },
      ],
    },
    {
      key: 'extra',
      label: 'Achados',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [{ value: 'calcificacoes', label: 'Calcificações' }],
    },
  ],
}

function prostataInitial(): OrganState {
  return { d1: '', d2: '', d3: '', volume: 'normal', extra: [], 'volume.aumentada.ipp': '' }
}

function prostataCompose(state: OrganState): OrganComposition {
  const d1 = parseCm(state.d1)
  const d2 = parseCm(state.d2)
  const d3 = parseCm(state.d3)
  const aumentada = (state.volume as string) === 'aumentada'
  const calcificacoes = ((state.extra as string[]) || []).includes('calcificacoes')
  const ipp = parseCm(state['volume.aumentada.ipp'])

  const medidas =
    d1 !== null && d2 !== null && d3 !== null
      ? `${ptBr1(d1)} x ${ptBr1(d2)} x ${ptBr1(d3)} cm`
      : '____ cm'

  const body: string[] = []
  body.push(
    aumentada
      ? `Próstata aumentada de volume, medindo ${medidas}.`
      : `Próstata medindo ${medidas}.`
  )
  if (calcificacoes) body.push('Calcificações prostáticas.')
  if (aumentada && ipp !== null) {
    body.push(`Índice de protrusão prostática (IPP) mede ${ptBr1(ipp)} cm.`)
  }

  const conclusion: string[] = []
  const peso = calcPesoProstatico(d1, d2, d3)
  const pesoSuffix = peso ? ` (peso aproximado de ${ptBr1(peso)} gramas)` : ''
  conclusion.push(
    aumentada
      ? `Próstata de volume aumentado${pesoSuffix}.`
      : `Próstata de dimensões normais${pesoSuffix}.`
  )
  if (aumentada && ipp !== null) {
    conclusion.push(`Protrusão prostática intravesical de ${ptBr1(ipp)} cm (${ippGrau(ipp)}).`)
  }
  if (calcificacoes) conclusion.push('Calcificações prostáticas.')

  return { body: body.join('\n'), conclusion, isNormal: !aumentada && !calcificacoes }
}

const prostataModule: OrganModule = {
  schema: prostataSchema,
  initialState: prostataInitial,
  compose: prostataCompose,
}

// ── Vesículas seminais ───────────────────────────────────────────────────────
// Na via transabdominal o renderer sempre descreve as vesículas seminais como
// normais (não há extração de alteração). Mantemos fixo normal (fidelidade).
const vesiculasSchema: OrganSchema = {
  id: 'vesiculas_seminais',
  name: 'Vesículas seminais',
  category: 'PROSTATA_SUPRAPUBICA',
  fields: [
    {
      key: 'estado',
      label: 'Estado',
      kind: 'segmented',
      hint: 'descritas como normais nesta via',
      options: [{ value: 'normal', label: 'Normais', isDefault: true }],
    },
  ],
}

function vesiculasInitial(): OrganState {
  return { estado: 'normal' }
}

function vesiculasCompose(_state: OrganState): OrganComposition {
  return {
    body: 'Vesículas seminais de dimensões, ecogenicidade e contornos normais.',
    conclusion: ['Vesículas seminais ecograficamente normais.'],
    isNormal: true,
  }
}

const vesiculasSeminaisModule: OrganModule = {
  schema: vesiculasSchema,
  initialState: vesiculasInitial,
  compose: vesiculasCompose,
}

// ── Categoria ────────────────────────────────────────────────────────────────
export const prostataSuprapubica: ExamCategory = {
  id: 'PROSTATA_SUPRAPUBICA',
  name: 'Próstata',
  title: 'ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)',
  tecnica:
    'Exame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais abrangendo toda a pelve.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: bexigaModule },
    { id: 'prostata', label: 'Próstata', group: 'orgaos', module: prostataModule },
    { id: 'vesiculas_seminais', label: 'Vesículas seminais', group: 'orgaos', module: vesiculasSeminaisModule },
  ],
  // A próstata lista todas as estruturas na conclusão; sem frase de fechamento genérica.
  conclusionNormal: 'Exame ultrassonográfico da próstata dentro dos limites da normalidade.',
  footer:
    'Observação: a avaliação por via transabdominal não detalha adequadamente lesões focais do parênquima prostático; havendo suspeita clínica, recomenda-se correlação com PSA e avaliação urológica (complementação por via transretal ou ressonância multiparamétrica).',
}
