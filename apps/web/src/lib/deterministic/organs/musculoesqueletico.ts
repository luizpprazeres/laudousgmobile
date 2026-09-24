/**
 * Categoria MUSCULOESQUELÉTICO — geração determinística (8 segmentos).
 *
 * Fonte: apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts (roteiro V2)
 * + doutrina MSK ([[doutrina-msk]]): descrever TODAS as estruturas do roteiro no
 * corpo (normais com frase canônica); CORPO = morfologia, CONCLUSÃO = diagnóstico
 * (nunca diagnóstico no corpo nem cópia do corpo na conclusão); nomenclatura
 * normalizada (polia A2, artrose→alterações degenerativas).
 *
 * Um único exame = um segmento (seletor) + lado (direito, esquerdo ou ambos). As
 * seções (estruturas) trocam conforme o segmento e o lado via resolveSections; cada
 * lado tem estado próprio (ver `idSecaoMsk`).
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, FieldOption, OrganModule, OrganState, OrganComposition } from '../types'

const TECNICA =
  'Exame realizado com transdutor linear de alta frequência (12 MHz), mediante múltiplos cortes longitudinais e transversais do segmento avaliado, com avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

function normalizeNomenclatura(s: string): string {
  return s
    .replace(/\bpolias?\s+a\s*(\d)/gi, (_m, n) => `polia A${n}`)
    .replace(/\bartrose\b/gi, 'alterações degenerativas')
}
function limpa(s: string): string {
  return s.trim().replace(/\.+$/, '')
}
function frase(s: string): string {
  const t = limpa(s)
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}.` : ''
}

type Estrutura = { id: string; label: string; normal: string }
type SegmentoDef = { titulo: string; label: string; estruturas: Estrutura[] }

export const SEGMENTOS: Record<string, SegmentoDef> = {
  ombro: {
    titulo: 'DO OMBRO',
    label: 'Ombro',
    estruturas: [
      { id: 'supraespinhal', label: 'Supraespinhal', normal: 'Tendão supraespinhal de espessura, continuidade e ecotextura preservadas.' },
      { id: 'infraespinhal', label: 'Infraespinhal', normal: 'Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.' },
      { id: 'subescapular', label: 'Subescapular', normal: 'Tendão subescapular de espessura, continuidade e ecotextura preservadas.' },
      { id: 'biceps', label: 'Cabo longo do bíceps', normal: 'Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.' },
      { id: 'bursa', label: 'Bursa SASD', normal: 'Bursa subacromial-subdeltoidea sem distensão.' },
      { id: 'acromioclavicular', label: 'Acromioclavicular', normal: 'Articulação acromioclavicular de aspecto preservado.' },
      { id: 'derrame', label: 'Derrame', normal: 'Não há sinais de derrame articular significativo.' },
    ],
  },
  joelho: {
    titulo: 'DO JOELHO',
    label: 'Joelho',
    estruturas: [
      { id: 'quadricipital', label: 'Quadricipital', normal: 'Tendão quadricipital de espessura, continuidade e ecotextura preservadas.' },
      { id: 'patelar', label: 'Patelar', normal: 'Tendão patelar de espessura, continuidade e ecotextura preservadas.' },
      { id: 'pata_de_ganso', label: 'Pata de ganso', normal: 'Tendões da pata de ganso de espessura e ecotextura preservadas.' },
      { id: 'derrame', label: 'Derrame', normal: 'Ausência de derrame articular significativo.' },
      { id: 'baker', label: 'Cisto de Baker', normal: 'Fossa poplítea sem coleções ou cisto de Baker.' },
      { id: 'partes_moles', label: 'Partes moles', normal: 'Planos musculares e subcutâneos avaliados sem alterações relevantes.' },
    ],
  },
  pe: {
    titulo: 'DO PÉ',
    label: 'Pé',
    estruturas: [
      { id: 'fascia_plantar', label: 'Fáscia plantar', normal: 'Fáscia plantar com espessura e ecotextura preservadas.' },
      { id: 'tendoes', label: 'Tendões', normal: 'Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.' },
      { id: 'geral', label: 'Geral', normal: 'Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.' },
    ],
  },
  mao: {
    titulo: 'DA MÃO',
    label: 'Mão',
    estruturas: [
      { id: 'flexores_extensores', label: 'Flexores/extensores', normal: 'Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.' },
      { id: 'polias', label: 'Polias', normal: 'Polias digitais sem espessamento sinovial.' },
      { id: 'geral', label: 'Geral', normal: 'Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.' },
    ],
  },
  punho: {
    titulo: 'DO PUNHO',
    label: 'Punho',
    estruturas: [
      { id: 'flexores', label: 'Flexores', normal: 'Tendões flexores e retináculo dos flexores de aspecto preservado.' },
      { id: 'extensores', label: 'Extensores', normal: 'Compartimentos extensores de aspecto preservado.' },
      { id: 'nervo_mediano', label: 'Nervo mediano', normal: 'Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.' },
      { id: 'geral', label: 'Geral', normal: 'Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.' },
    ],
  },
  cotovelo: {
    titulo: 'DO COTOVELO',
    label: 'Cotovelo',
    estruturas: [
      { id: 'extensores', label: 'Extensores (epicôndilo lat.)', normal: 'Tendões extensores comuns (epicôndilo lateral) de espessura e ecotextura preservadas.' },
      { id: 'flexores', label: 'Flexores (epicôndilo med.)', normal: 'Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas.' },
      { id: 'biceps_triceps', label: 'Bíceps/tríceps distais', normal: 'Tendões distais do bíceps e do tríceps de aspecto preservado.' },
      { id: 'derrame', label: 'Derrame', normal: 'Ausência de derrame articular ou coleções.' },
    ],
  },
  tornozelo: {
    titulo: 'DO TORNOZELO',
    label: 'Tornozelo',
    estruturas: [
      { id: 'aquiles', label: 'Aquiles', normal: 'Tendão calcâneo (de Aquiles) de espessura, continuidade e ecotextura preservadas.' },
      { id: 'tibial_posterior', label: 'Tibial posterior', normal: 'Tendão tibial posterior de espessura e ecotextura preservadas.' },
      { id: 'fibulares', label: 'Fibulares', normal: 'Tendões fibulares de espessura e ecotextura preservadas.' },
      { id: 'tibial_anterior', label: 'Tibial anterior', normal: 'Tendão tibial anterior de espessura e ecotextura preservadas.' },
      { id: 'recesso', label: 'Recesso tibiotalar', normal: 'Recesso articular tibiotalar sem coleções ou derrame.' },
      { id: 'geral', label: 'Geral', normal: 'Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.' },
    ],
  },
  quadril: {
    titulo: 'DO QUADRIL',
    label: 'Quadril',
    estruturas: [
      { id: 'coxofemoral', label: 'Coxofemoral', normal: 'Articulação coxofemoral sem derrame ou coleções.' },
      { id: 'gluteos', label: 'Glúteos', normal: 'Tendões glúteo médio e mínimo de espessura e ecotextura preservadas.' },
      { id: 'bursa_trocanterica', label: 'Bursa trocantérica', normal: 'Bursa trocantérica sem distensão.' },
      { id: 'iliopsoas', label: 'Iliopsoas', normal: 'Tendão iliopsoas de aspecto preservado.' },
      { id: 'labrum', label: 'Labrum anterossuperior', normal: 'Labrum anterossuperior sem alterações ecográficas evidentes.' },
    ],
  },
}

// ───────────────────────── Lateralidade e ids de seção ─────────────────────────

export type LadoMsk = 'direito' | 'esquerdo'

/**
 * ESTADO INDEPENDENTE POR LADO.
 *
 * Antes, o estado de cada estrutura vivia em `${segmento}__${estrutura}` e o lado
 * vinha só de `__opts.lado`. Trocar o lado mantinha a patologia digitada e o
 * adaptador a afirmava no lado oposto, como se ele tivesse sido examinado.
 *
 * Agora cada lado tem as próprias chaves (`ombro__d__supraespinhal`,
 * `ombro__e__supraespinhal`). Trocar o lado troca de estado, nunca o move. A chave
 * antiga só é lida pelo adaptador como estado LEGADO unilateral (ver
 * `musculoesqueleticoParaCatalogo.ts`).
 */
export function idSecaoMsk(segmento: string, lado: LadoMsk, estruturaId: string): string {
  return `${segmento}__${lado === 'direito' ? 'd' : 'e'}__${estruturaId}`
}

// ───────────────────────── Descritores tendíneos compartilhados ─────────────────────────

/**
 * ESCOPO INICIAL: só estruturas TENDÍNEAS, com o mesmo conjunto de descritores.
 * O que muda de um tendão para outro é o sujeito da frase (tabela `PERFIS`), não
 * a lista de opções.
 *
 * Fontes (nenhuma frase copiada):
 *  - Lins, Ultrassonografia Musculoesquelética (2020), cap. cotovelo: epicondilite
 *    como espessamento e hipoecogenicidade da origem tendínea, com focos anecoicos
 *    intrasubstanciais e, em estágio avançado, focos ecogênicos/calcificações;
 *  - mesmo livro, cap. ombro: rotura parcial descrita pela sua extensão medida nos
 *    cortes longitudinal e transversal;
 *  - inventário das referências de interface (docs/reviews/2026-09-24-screenshot-inventory.md, §6):
 *    padrão único (normal/tendinopatia/rotura parcial/rotura completa) + subopções.
 *
 * FORA DESTE ESCOPO, de propósito: graduação percentual da rotura, tipo
 * bursal/articular/intratendíneo e retração do coto (específicos do manguito
 * rotador — não se generalizam a todos os tendões), bursas, derrame, nervos.
 *
 * ⚠️ As redações abaixo são PROPOSTA e precisam de revisão clínica antes de valer
 * em produção. Quando existe achado canônico na biblioteca do renderer
 * (`ACHADOS_CANONICOS`) e o médico escolhe só o padrão, o texto sai DELE (fonte
 * única) — estas redações só entram quando há descritor a acrescentar.
 */
type ChaveDescritor = 'localizacao' | 'focos_anecoicos' | 'calcificacao' | 'medidas'

type OpcaoDescritor = { value: string; label: string; corpo?: string }
type DescritorDef =
  | { key: ChaveDescritor; label: string; tipo: 'select'; opcoes: OpcaoDescritor[] }
  | { key: ChaveDescritor; label: string; tipo: 'medida'; placeholder: string; dimensoes: number }

const NC: OpcaoDescritor = { value: 'nc', label: '—' }

const DESCRITORES: Record<ChaveDescritor, DescritorDef> = {
  localizacao: {
    key: 'localizacao', label: 'Localização', tipo: 'select',
    opcoes: [NC, { value: 'insercional', label: 'Insercional', corpo: 'com acometimento da porção insercional' }],
  },
  focos_anecoicos: {
    key: 'focos_anecoicos', label: 'Focos anecoicos', tipo: 'select',
    opcoes: [NC, { value: 'sim', label: 'Presentes', corpo: 'com focos anecoicos intrasubstanciais' }],
  },
  calcificacao: {
    key: 'calcificacao', label: 'Calcificações', tipo: 'select',
    opcoes: [NC, { value: 'sim', label: 'Presentes', corpo: 'com focos ecogênicos de calcificação' }],
  },
  medidas: { key: 'medidas', label: 'Medidas (cm)', tipo: 'medida', placeholder: '1,2 x 0,8', dimensoes: 3 },
}

/** Ordem em que os descritores entram na frase — fixa, para o texto ser estável. */
const ORDEM_DESCRITORES: ChaveDescritor[] = ['localizacao', 'focos_anecoicos', 'calcificacao', 'medidas']

type PadraoDef = {
  value: string
  label: string
  /** Predicado morfológico (o CORPO nunca traz o diagnóstico). */
  corpo: string
  /** Base do diagnóstico da CONCLUSÃO. */
  diag: string
  descritores: ChaveDescritor[]
}

const PADROES_TENDAO: PadraoDef[] = [
  {
    value: 'tendinopatia', label: 'Tendinopatia',
    corpo: 'com espessamento e alteração da ecotextura', diag: 'Tendinopatia',
    descritores: ['localizacao', 'focos_anecoicos', 'calcificacao', 'medidas'],
  },
  {
    value: 'rotura_parcial', label: 'Rotura parcial',
    corpo: 'com solução de continuidade parcial das fibras', diag: 'Rotura parcial',
    descritores: ['localizacao', 'medidas'],
  },
  {
    value: 'rotura_completa', label: 'Rotura completa',
    corpo: 'com solução de continuidade completa das fibras', diag: 'Rotura completa',
    descritores: ['localizacao', 'medidas'],
  },
]

type PerfilEstrutura = {
  sujeito: string
  /** Complemento do diagnóstico composto: "Tendinopatia do supraespinhal à direita." */
  de: string
  /** padrão → slug de `ACHADOS_CANONICOS` (API). Só vale sem descritor a acrescentar. */
  slugs: Record<string, string>
}

const tendao = (sujeito: string, de: string, slugs: Record<string, string> = {}): PerfilEstrutura =>
  ({ sujeito, de, slugs })

/**
 * Perfis por `segmento.estrutura`. Estrutura fora desta tabela (bursas, derrame,
 * partes moles, "geral"…) continua só com Normal/Alterado + texto livre, exatamente
 * como antes. Os slugs precisam existir em `ACHADOS_CANONICOS` — o teste com o
 * renderer real quebra se um deles sumir ou deixar de ser compatível.
 */
const PERFIS: Record<string, PerfilEstrutura> = {
  'ombro.supraespinhal': tendao('Tendão supraespinhal', 'do supraespinhal', { tendinopatia: 'tendinopatia_supraespinhal', rotura_parcial: 'ruptura_parcial_supraespinhal' }),
  'ombro.infraespinhal': tendao('Tendão infraespinhal', 'do infraespinhal', { tendinopatia: 'tendinopatia_infraespinhal' }),
  'ombro.subescapular': tendao('Tendão subescapular', 'do subescapular', { tendinopatia: 'tendinopatia_subescapular' }),
  'ombro.biceps': tendao('Cabo longo do bíceps', 'do cabo longo do bíceps', { tendinopatia: 'tendinopatia_cabo_longo_biceps' }),
  'joelho.quadricipital': tendao('Tendão quadricipital', 'do tendão quadricipital', { tendinopatia: 'tendinopatia_quadricipital' }),
  'joelho.patelar': tendao('Tendão patelar', 'do tendão patelar', { tendinopatia: 'tendinopatia_patelar' }),
  'joelho.pata_de_ganso': tendao('Tendões da pata de ganso', 'da pata de ganso', { tendinopatia: 'tendinopatia_pata_de_ganso' }),
  'pe.tendoes': tendao('Estruturas tendíneas', 'das estruturas tendíneas'),
  'mao.flexores_extensores': tendao('Tendões flexores e extensores dos quirodáctilos', 'dos tendões flexores e extensores dos quirodáctilos'),
  'punho.flexores': tendao('Tendões flexores', 'dos tendões flexores'),
  'punho.extensores': tendao('Tendões extensores', 'dos tendões extensores'),
  'cotovelo.extensores': tendao('Tendão extensor comum (epicôndilo lateral)', 'dos tendões extensores comuns (epicôndilo lateral)', { tendinopatia: 'epicondilite_lateral' }),
  'cotovelo.flexores': tendao('Tendão flexor comum (epicôndilo medial)', 'dos tendões flexores comuns (epicôndilo medial)', { tendinopatia: 'epicondilite_medial' }),
  'cotovelo.biceps_triceps': tendao('Tendões distais do bíceps e do tríceps', 'dos tendões distais do bíceps e do tríceps'),
  'tornozelo.aquiles': tendao('Tendão calcâneo (de Aquiles)', 'do tendão calcâneo (Aquiles)', { tendinopatia: 'tendinopatia_aquileu' }),
  'tornozelo.tibial_posterior': tendao('Tendão tibial posterior', 'do tendão tibial posterior'),
  'tornozelo.fibulares': tendao('Tendões fibulares', 'dos tendões fibulares'),
  'tornozelo.tibial_anterior': tendao('Tendão tibial anterior', 'do tendão tibial anterior'),
  'quadril.gluteos': tendao('Tendões glúteo médio e mínimo', 'dos tendões glúteo médio e mínimo', { tendinopatia: 'tendinopatia_glutea' }),
  'quadril.iliopsoas': tendao('Tendão iliopsoas', 'do iliopsoas', { tendinopatia: 'tendinopatia_iliopsoas' }),
}

/** Perfis e padrões expostos só para os testes de contrato (slug × renderer). */
export const PERFIS_MSK: Readonly<Record<string, PerfilEstrutura>> = PERFIS
export const PADROES_TENDAO_MSK: readonly PadraoDef[] = PADROES_TENDAO

// ───────────────────────── Leitura do estado → alteração ─────────────────────────

export type AlteracaoMsk = {
  estrutura: string
  achado_tipo: string
  descricao_livre: string | null
  diagnostico_conclusao: string
}

export type ResultadoEstrutura =
  | { tipo: 'normal' }
  | { tipo: 'alteracao'; alteracao: AlteracaoMsk }
  | { tipo: 'pendencia'; onde: string; valor: string; motivo: string }

type EstadoBruto = Record<string, unknown>

const texto = (s: EstadoBruto | undefined, chave: string): string =>
  typeof s?.[chave] === 'string' ? (s[chave] as string).trim() : ''

const NUM = String.raw`\d+(?:[.,]\d+)?`

/**
 * Medida digitada → texto normalizado ("1,2 x 0,8 cm"). A unidade digitada é
 * respeitada (cm ou mm); sem unidade vale cm, a do rótulo do campo. Não converte,
 * não arredonda e não completa dimensão faltante. Valor ilegível devolve `null`
 * — quem chama transforma em pendência, nunca em laudo sem a medida.
 */
export function lerMedidaMsk(bruto: string, dimensoes: number): string | null {
  const m = bruto.trim().replace(/\s+/g, ' ').match(/^(.*?)(?:\s*(cm|mm))?$/i)
  const corpo = (m?.[1] ?? '').trim()
  const unidade = (m?.[2] ?? 'cm').toLowerCase()
  const partes = corpo.split(/\s*[x×]\s*/i)
  if (partes.length > dimensoes) return null
  if (!partes.every((p) => new RegExp(`^${NUM}$`).test(p))) return null
  if (partes.every((p) => Number.parseFloat(p.replace(',', '.')) <= 0)) return null
  return `${partes.map((p) => p.replace('.', ',')).join(' x ')} ${unidade}`
}

function achadoDaEstrutura(segmento: string, estruturaId: string) {
  return SEGMENTOS[segmento]?.estruturas.find((e) => e.id === estruturaId)
}

/**
 * ÚNICO ponto que transforma o estado de UMA estrutura em alteração do contrato
 * canônico. Regras:
 *  1. Normal (ou ausente) → nada. Nunca vira alteração por dedução.
 *  2. `alterado` = texto livre, como sempre foi: descrição → `descricao_livre`,
 *     diagnóstico → `diagnostico_conclusao`, slug `outro`.
 *  3. Padrão escolhido SEM descritor e COM achado canônico → slug + descrição nula:
 *     corpo e conclusão saem da biblioteca do renderer (fonte única).
 *  4. Padrão com descritor (ou sem canônico) → descrição composta só do que foi
 *     selecionado; o texto livre, quando digitado, é preservado e os descritores
 *     entram numa segunda frase. Nenhum descritor selecionado é descartado.
 *  5. Valor desconhecido ou medida ilegível → pendência que BLOQUEIA (falha fechada).
 */
export function interpretarEstrutura(
  segmento: string,
  lado: LadoMsk,
  estruturaId: string,
  estado: EstadoBruto | undefined,
): ResultadoEstrutura {
  const escolha = texto(estado, 'estado')
  if (!escolha || escolha === 'normal') return { tipo: 'normal' }
  const est = achadoDaEstrutura(segmento, estruturaId)
  if (!est) return { tipo: 'normal' }
  const seg = SEGMENTOS[segmento]!
  const onde = `${est.label} (${lado})`

  if (escolha === 'alterado') {
    const descricao = texto(estado, 'estado.alterado.corpo')
    const diagnostico = texto(estado, 'estado.alterado.diag')
    return {
      tipo: 'alteracao',
      alteracao: {
        estrutura: est.id,
        achado_tipo: 'outro',
        descricao_livre: descricao || null,
        diagnostico_conclusao: diagnostico ||
          `Alteração ecográfica na topografia de ${est.label.toLowerCase()} do ${seg.label.toLowerCase()} ${lado}, a esclarecer.`,
      },
    }
  }

  const perfil = PERFIS[`${segmento}.${estruturaId}`]
  const padrao = perfil ? PADROES_TENDAO.find((p) => p.value === escolha) : undefined
  if (!perfil || !padrao) {
    return { tipo: 'pendencia', onde, valor: escolha, motivo: 'padrão desconhecido para esta estrutura' }
  }

  const fragmentos: string[] = []
  for (const chave of ORDEM_DESCRITORES.filter((c) => padrao.descritores.includes(c))) {
    const def = DESCRITORES[chave]
    const bruto = texto(estado, `estado.${padrao.value}.${chave}`)
    if (def.tipo === 'select') {
      if (!bruto || bruto === 'nc') continue
      const opcao = def.opcoes.find((o) => o.value === bruto)
      if (!opcao?.corpo) return { tipo: 'pendencia', onde: `${onde} · ${def.label}`, valor: bruto, motivo: 'opção desconhecida' }
      fragmentos.push(opcao.corpo)
    } else {
      if (!bruto) continue
      const medida = lerMedidaMsk(bruto, def.dimensoes)
      if (!medida) return { tipo: 'pendencia', onde: `${onde} · ${def.label}`, valor: bruto, motivo: 'medida ilegível — use números (ex.: 1,2 x 0,8)' }
      fragmentos.push(`medindo ${medida}`)
    }
  }

  const livre = texto(estado, `estado.${padrao.value}.corpo`)
  const diagLivre = texto(estado, `estado.${padrao.value}.diag`)
  const slug = perfil.slugs[padrao.value]
  const canonicoPuro = Boolean(slug) && fragmentos.length === 0

  let descricao: string | null
  if (canonicoPuro) descricao = livre || null
  else if (livre) descricao = fragmentos.length ? `${frase(livre)} ${perfil.sujeito} ${fragmentos.join(', ')}.` : livre
  // Sem canônico puro e sem texto livre a morfologia do PADRÃO sai sempre — com ou sem descritor.
  // `null` aqui derrubaria o corpo na frase neutra enquanto a conclusão já diagnostica.
  else descricao = `${perfil.sujeito} ${[padrao.corpo, ...fragmentos].filter(Boolean).join(', ')}.`

  const composto = `${padrao.diag} ${perfil.de} à ${lado === 'direito' ? 'direita' : 'esquerda'}.`

  return {
    tipo: 'alteracao',
    alteracao: {
      estrutura: est.id,
      achado_tipo: canonicoPuro ? slug! : 'outro',
      descricao_livre: descricao,
      diagnostico_conclusao: diagLivre || (canonicoPuro ? '' : composto),
    },
  }
}

// ───────────────────────── Módulos por (segmento, lado, estrutura) ─────────────────────────

function camposDoPadrao(padrao: PadraoDef): Field[] {
  const campos: Field[] = padrao.descritores.map((chave): Field => {
    const def = DESCRITORES[chave]
    return def.tipo === 'select'
      ? {
          key: chave, label: def.label, kind: 'mini-segmented', halfWidth: true,
          options: def.opcoes.map((o, i) => ({ value: o.value, label: o.label, ...(i === 0 ? { isDefault: true } : {}) })),
        }
      : { key: chave, label: def.label, kind: 'text', halfWidth: true, placeholder: def.placeholder }
  })
  campos.push(
    { key: 'corpo', label: 'Descrição (opcional)', kind: 'text', placeholder: 'texto livre no corpo do laudo' },
    { key: 'diag', label: 'Diagnóstico (opcional)', kind: 'text', placeholder: 'texto livre na conclusão' },
  )
  return campos
}

function makeEstruturaModule(segmento: string, lado: LadoMsk, est: Estrutura): OrganModule {
  const sectionId = idSecaoMsk(segmento, lado, est.id)
  const perfil = PERFIS[`${segmento}.${est.id}`]
  const rotulo = `${est.label} · ${lado}`
  const opcoesPadrao: FieldOption[] = (perfil ? PADROES_TENDAO : []).map((p) => ({
    value: p.value, label: p.label, subFields: camposDoPadrao(p),
  }))
  return {
    schema: {
      id: sectionId,
      name: rotulo,
      category: 'MUSCULOESQUELETICO',
      fields: [
        {
          key: 'estado',
          label: rotulo,
          kind: 'segmented',
          ...(perfil ? { presentation: 'select' as const } : {}),
          hint: 'default: normal',
          options: [
            { value: 'normal', label: 'Normal', isDefault: true },
            ...opcoesPadrao,
            {
              value: 'alterado',
              label: perfil ? 'Outra alteração (texto livre)' : 'Alterado',
              subFields: [
                { key: 'corpo', label: 'Descrição (achado)', kind: 'text', placeholder: 'espessamento com perda do padrão fibrilar, sem rotura' },
                { key: 'diag', label: 'Diagnóstico (conclusão)', kind: 'text', placeholder: 'Tendinopatia' },
              ],
            },
          ],
        },
      ],
    },
    initialState: (): OrganState => {
      const inicial: OrganState = { estado: 'normal', 'estado.alterado.corpo': '', 'estado.alterado.diag': '' }
      for (const p of perfil ? PADROES_TENDAO : []) {
        for (const chave of p.descritores) {
          const def = DESCRITORES[chave]
          inicial[`estado.${p.value}.${chave}`] = def.tipo === 'select' ? 'nc' : ''
        }
        inicial[`estado.${p.value}.corpo`] = ''
        inicial[`estado.${p.value}.diag`] = ''
      }
      return inicial
    },
    compose: (st): OrganComposition => {
      const r = interpretarEstrutura(segmento, lado, est.id, st)
      if (r.tipo !== 'alteracao') return { body: est.normal, conclusion: [], isNormal: true }
      const a = r.alteracao
      return {
        body: a.descricao_livre ? frase(normalizeNomenclatura(a.descricao_livre)) : est.normal,
        conclusion: a.diagnostico_conclusao ? [frase(normalizeNomenclatura(a.diagnostico_conclusao))] : [],
        isNormal: false,
      }
    },
  }
}

const SEG_KEYS = Object.keys(SEGMENTOS)
const LADOS: LadoMsk[] = ['direito', 'esquerdo']

function segDe(opts?: OrganState): string {
  const s = String(opts?.segmento ?? 'ombro')
  return SEGMENTOS[s] ? s : 'ombro'
}

/** Lados do exame conforme o controle: 'ambos' inclui o contralateral (direito primeiro). */
export function ladosDoExame(opts?: OrganState | Record<string, unknown>): LadoMsk[] {
  const lado = String(opts?.lado ?? 'direito')
  if (lado === 'ambos') return ['direito', 'esquerdo']
  return [lado === 'esquerdo' ? 'esquerdo' : 'direito']
}

// Seções que a TELA mostra: uma por segmento × lado × estrutura (via resolveSections).
const SECOES: Record<string, ExamSection[]> = {}
for (const seg of SEG_KEYS) {
  for (const lado of LADOS) {
    SECOES[`${seg}|${lado}`] = SEGMENTOS[seg]!.estruturas.map((e) => ({
      id: idSecaoMsk(seg, lado, e.id),
      label: e.label,
      group: 'orgaos' as const,
      module: makeEstruturaModule(seg, lado, e),
    }))
  }
}

/**
 * `sections` (a UNIÃO usada por `initialExamState`) mantém os ids LEGADOS
 * (`${segmento}__${estrutura}`), de propósito: o estado inicial não cria chave
 * nova de lado. Assim "chave do lado AUSENTE" significa "nunca tocada nesta tela"
 * — e só aí o adaptador lê o legado. Chave presente, mesmo normal (ex.: depois de
 * Reset), é a palavra final daquele lado e o legado não a ressuscita.
 */
const ALL_SECTIONS: ExamSection[] = SEG_KEYS.flatMap((seg) =>
  SECOES[`${seg}|direito`]!.map((s, i) => ({
    id: `${seg}__${SEGMENTOS[seg]!.estruturas[i]!.id}`,
    label: s.label,
    group: s.group,
    module: s.module,
  })),
)

/**
 * MIGRA O ESTADO LEGADO PARA O LADO EM QUE ELE FOI DIGITADO.
 *
 * Chamar ANTES de alterar `lado` ou `segmento` em `__opts` (o `__opts` do estado
 * recebido ainda é o ANTERIOR): a patologia que estava nas chaves antigas passa
 * para a chave do lado anterior e a chave antiga é removida. Sem isso, trocar o
 * lado faria o adaptador atribuir ao novo lado uma patologia examinada no outro.
 *
 * - só migra estrutura ALTERADA do segmento anterior; normal não precisa;
 * - chave nova já presente vence e a legada é descartada (o médico já editou);
 * - `lado = 'ambos'` no estado anterior não tem lado a que atribuir: devolve o
 *   mesmo objeto (o adaptador então acusa o legado como pendência bloqueante);
 * - puro e idempotente; devolve o MESMO objeto quando não há nada a migrar.
 */
export function migrateLegacyMskState<T extends Record<string, unknown>>(state: T): T {
  const opts = (state.__opts ?? {}) as Record<string, unknown>
  const ladoAnterior = String(opts.lado ?? 'direito')
  if (ladoAnterior === 'ambos') return state
  const lado: LadoMsk = ladoAnterior === 'esquerdo' ? 'esquerdo' : 'direito'
  const segmento = segDe(opts as OrganState)
  let novo: Record<string, unknown> | null = null
  for (const est of SEGMENTOS[segmento]!.estruturas) {
    const chave = `${segmento}__${est.id}`
    const legado = state[chave]
    if (!legado || typeof legado !== 'object') continue
    if (interpretarEstrutura(segmento, lado, est.id, legado as EstadoBruto).tipo === 'normal') continue
    novo ??= { ...state }
    const destino = idSecaoMsk(segmento, lado, est.id)
    if (novo[destino] === undefined) novo[destino] = { ...(legado as object) }
    delete novo[chave]
  }
  return (novo ?? state) as T
}

export const musculoesqueletico: ExamCategory = {
  id: 'MUSCULOESQUELETICO',
  name: 'Musculoesquelético',
  title: 'ULTRASSONOGRAFIA DO OMBRO DIREITO',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    {
      key: 'segmento',
      label: 'Segmento',
      kind: 'segmented',
      options: SEG_KEYS.map((s, i) => ({ value: s, label: SEGMENTOS[s]!.label, ...(i === 0 ? { isDefault: true } : {}) })),
    },
    {
      key: 'lado',
      label: 'Lado',
      kind: 'segmented',
      options: [
        { value: 'direito', label: 'Direito', isDefault: true },
        { value: 'esquerdo', label: 'Esquerdo' },
        { value: 'ambos', label: 'Ambos' },
      ],
    },
  ],
  resolveTitle: (opts) => {
    const lados = ladosDoExame(opts)
    const lado = lados.length === 2 ? 'DIREITO E ESQUERDO' : lados[0]!.toUpperCase()
    return `ULTRASSONOGRAFIA ${SEGMENTOS[segDe(opts)]!.titulo} ${lado}`
  },
  resolveSections: (opts) => {
    const seg = segDe(opts)
    return ladosDoExame(opts).flatMap((lado) => SECOES[`${seg}|${lado}`]!.map((s) => ({
      ...s,
      label: ladosDoExame(opts).length === 2 ? `${s.label} · ${lado === 'direito' ? 'D' : 'E'}` : s.label,
    })))
  },
  sections: ALL_SECTIONS,
  conclusionNormal: 'Exame ultrassonográfico do segmento avaliado sem alterações ecográficas relevantes.',
}
