import type { Field, OrganComposition, OrganModule, OrganSchema, OrganState } from '../types'

export type UrinaryCategory =
  | 'ABDOMEN_TOTAL'
  | 'VIAS_URINARIAS'
  | 'PELVE_FEMININA'
  | 'PROSTATA_SUPRAPUBICA'

type Lado = 'direito' | 'esquerdo'
type Estado = Record<string, unknown>

const temChave = (state: Estado, key: string): boolean => Object.prototype.hasOwnProperty.call(state, key)

const texto = (state: Estado, key: string): string =>
  typeof state[key] === 'string' ? (state[key] as string).trim() : ''

const lista = (state: Estado, key: string): string[] =>
  Array.isArray(state[key])
    ? (state[key] as unknown[]).filter((value): value is string => typeof value === 'string')
    : []

const primeiroValorPreenchido = (state: Estado, keys: string[]): unknown => {
  for (const key of keys) {
    const value = state[key]
    if (typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined) return value
  }
  return null
}

function numero(raw: unknown, unidade: 'mm' | 'ml' | 'sem_unidade' = 'sem_unidade'): number | null {
  const normalized = String(raw ?? '').trim().toLowerCase().replace(',', '.')
  if (!normalized) return null
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(mm|cm|ml|cm3|cm³)?$/)
  if (!match) return null
  const value = Number(match[1])
  const informedUnit = match[2] ?? null
  if (!Number.isFinite(value) || value < 0) return null
  if (unidade === 'mm') {
    if (informedUnit === 'cm') return value * 10
    return informedUnit === null || informedUnit === 'mm' ? value : null
  }
  if (unidade === 'ml') return informedUnit === null || informedUnit === 'ml' || informedUnit === 'cm3' || informedUnit === 'cm³' ? value : null
  return informedUnit === null ? value : null
}

function medidas(raw: unknown, unidadePadrao: 'cm' | 'mm' = 'cm'): number[] | null {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value) return null
  if (!/^\d+(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d+(?:[.,]\d+)?){0,2}\s*(?:mm|cm)?$/.test(value)) return null
  const values = (value.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((part) => Number(part.replace(',', '.')))
  if (values.length === 0 || values.some((part) => !Number.isFinite(part) || part <= 0)) return null
  const inMm = value.includes('mm') || (!value.includes('cm') && unidadePadrao === 'mm')
  return inMm ? values.map((part) => part / 10) : values
}

function medidaEscalar(raw: unknown, unidadePadrao: 'cm' | 'mm' = 'cm'): number | null {
  const parsed = medidas(raw, unidadePadrao)
  return parsed?.length === 1 ? parsed[0] ?? null : null
}

const lateralidade: Field = {
  key: 'lado',
  label: 'Lado',
  kind: 'mini-segmented',
  options: [
    { value: 'direita', label: 'Direita' },
    { value: 'esquerda', label: 'Esquerda' },
  ],
}

const doppler: Field = {
  key: 'doppler',
  label: 'Doppler',
  kind: 'mini-segmented',
  options: [
    { value: 'nao_avaliado', label: 'Não avaliado', isDefault: true },
    { value: 'sem_fluxo', label: 'Sem fluxo' },
    { value: 'com_fluxo', label: 'Com fluxo' },
  ],
}

const bladderFields: Field[] = [
  {
    key: 'replecao',
    label: 'Repleção',
    kind: 'segmented',
    presentation: 'select',
    options: [
      { value: 'adequada', label: 'Adequada', isDefault: true },
      { value: 'moderada', label: 'Moderada' },
      { value: 'pequena', label: 'Pequena' },
      { value: 'insuficiente', label: 'Insuficiente para avaliação' },
      { value: 'vazia', label: 'Vazia' },
    ],
  },
  {
    key: 'parede',
    label: 'Parede',
    kind: 'segmented',
    presentation: 'select',
    options: [
      { value: 'normal', label: 'Regular e fina', isDefault: true },
      { value: 'espessada', label: 'Espessada' },
      { value: 'trabeculada', label: 'Trabeculada' },
    ],
  },
  { key: 'espessura_parede', label: 'Espessura da parede (mm)', kind: 'text', placeholder: '3', halfWidth: true },
  {
    key: 'conteudo',
    label: 'Conteúdo e alterações',
    kind: 'checklist',
    hint: 'marque somente o observado',
    options: [
      {
        value: 'debris',
        label: 'Debris/sedimento',
        subFields: [{
          key: 'nivel_liquido',
          label: 'Nível líquido-líquido',
          kind: 'mini-segmented',
          options: [{ value: 'nao', label: 'Não', isDefault: true }, { value: 'sim', label: 'Sim' }],
        }],
      },
      {
        value: 'calculo',
        label: 'Cálculo vesical',
        subFields: [
          { key: 'dimensao', label: 'Dimensão (cm)', kind: 'text', placeholder: '0,8', halfWidth: true },
          {
            key: 'mobilidade',
            label: 'Mobilidade/local',
            kind: 'mini-segmented',
            options: [
              { value: 'nao_informada', label: 'Não informada', isDefault: true },
              { value: 'movel', label: 'Móvel' },
              { value: 'imovel', label: 'Imóvel' },
              { value: 'juv', label: 'Impactado na JUV' },
            ],
          },
          lateralidade,
          {
            key: 'multiplicidade',
            label: 'Quantidade',
            kind: 'mini-segmented',
            options: [{ value: 'unico', label: 'Único', isDefault: true }, { value: 'multiplos', label: 'Múltiplos' }],
          },
        ],
      },
      {
        value: 'coagulo',
        label: 'Coágulo/hematoma',
        subFields: [
          { key: 'dimensoes', label: 'Dimensões (cm)', kind: 'text', placeholder: '2,0 x 1,0', halfWidth: true },
          { key: 'descricao', label: 'Descrição observada', kind: 'text', placeholder: 'material ecogênico móvel' },
          doppler,
        ],
      },
      { value: 'sonda', label: 'Sonda vesical' },
      {
        value: 'diverticulo',
        label: 'Divertículo',
        subFields: [{ key: 'dimensoes', label: 'Dimensões (cm)', kind: 'text', placeholder: '2,0 x 1,5', halfWidth: true }],
      },
      {
        value: 'ureterocele',
        label: 'Ureterocele',
        subFields: [
          lateralidade,
          { key: 'dimensoes', label: 'Dimensões (cm)', kind: 'text', placeholder: '1,5 x 1,0', halfWidth: true },
          { key: 'calculo_mm', label: 'Cálculo associado (mm)', kind: 'text', placeholder: '5', halfWidth: true },
        ],
      },
      {
        value: 'lesao_focal',
        label: 'Lesão focal vesical',
        subFields: [
          { key: 'topografia', label: 'Topografia', kind: 'text', placeholder: 'parede lateral direita' },
          { key: 'dimensoes', label: 'Dimensões (cm)', kind: 'text', placeholder: '2,0 x 1,5 x 1,0', halfWidth: true },
          { key: 'descricao', label: 'Descrição morfológica', kind: 'text', placeholder: 'imagem polipoide' },
          doppler,
        ],
      },
    ],
  },
  {
    key: 'jatos',
    label: 'Jatos ureterais',
    kind: 'segmented',
    presentation: 'select',
    options: [
      { value: 'nao_avaliados', label: 'Não avaliados', isDefault: true },
      { value: 'presentes_simetrico', label: 'Presentes e simétricos' },
      {
        value: 'reduzido_unilateral',
        label: 'Reduzido unilateralmente',
        subFields: [lateralidade],
      },
      { value: 'nao_caracterizados', label: 'Não caracterizados durante observação' },
      {
        value: 'ausencia_unilateral',
        label: 'Ausência unilateral',
        subFields: [
          lateralidade,
          { key: 'calculo_mm', label: 'Cálculo ureteral associado (mm)', kind: 'text', placeholder: '5', halfWidth: true },
        ],
      },
    ],
  },
  { key: 'volume_pre', label: 'Volume pré-miccional', kind: 'volume', unit: 'mL', placeholder: '250' },
  {
    key: 'residuo_estado',
    label: 'Esvaziamento vesical',
    kind: 'segmented',
    presentation: 'select',
    options: [
      { value: 'nao_informado', label: 'Não avaliado', isDefault: true },
      { value: 'desprezivel', label: 'Volume desprezível' },
      { value: 'valor', label: 'Resíduo pós-miccional', subFields: [{ key: 'ml', label: 'Volume (mL)', kind: 'volume', unit: 'mL', placeholder: '20' }] },
      {
        value: 'dupla_miccao',
        label: 'Dupla micção',
        subFields: [
          { key: 'primeira_ml', label: 'Após 1ª micção (mL)', kind: 'volume', unit: 'mL', placeholder: '80' },
          { key: 'segunda_ml', label: 'Após 2ª micção (mL)', kind: 'volume', unit: 'mL', placeholder: '20' },
        ],
      },
      { value: 'sondado', label: 'Paciente sondado; resíduo não avaliado' },
    ],
  },
]

export type BladderFindingType =
  | 'debris'
  | 'calculo'
  | 'coagulo'
  | 'sonda'
  | 'diverticulo'
  | 'ureterocele'
  | 'lesao_focal'

export type BladderFinding = {
  tipo: BladderFindingType
  medidas_cm: number[] | null
  descricao: string | null
  mobilidade: 'movel' | 'imovel' | 'juv' | null
  lateralidade: 'direita' | 'esquerda' | null
  multiplos: boolean
  nivel_liquido: boolean
  doppler: 'nao_avaliado' | 'sem_fluxo' | 'com_fluxo'
  topografia: string | null
  calculo_associado_mm: number | null
}

export type BladderState = {
  replecao: 'adequada' | 'moderada' | 'pequena' | 'insuficiente' | 'vazia'
  parede: 'normal' | 'espessada' | 'trabeculada'
  espessura_parede_mm: number | null
  volume_pre_miccional_ml: number | null
  residuo_estado: 'nao_informado' | 'desprezivel' | 'valor' | 'dupla_miccao' | 'sondado'
  residuo_pos_miccional_ml: number | null
  residuo_primeira_miccao_ml: number | null
  residuo_segunda_miccao_ml: number | null
  jatos: {
    estado: 'nao_avaliados' | 'presentes_simetrico' | 'reduzido_unilateral' | 'nao_caracterizados' | 'ausencia_unilateral'
    lateralidade: 'direita' | 'esquerda' | null
    calculo_associado_mm: number | null
  }
  achados: BladderFinding[]
}

function bladderInitialState(): OrganState {
  return {
    replecao: 'adequada',
    parede: 'normal',
    espessura_parede: '',
    conteudo: [],
    jatos: 'nao_avaliados',
    volume_pre: '',
    residuo_estado: 'nao_informado',
    'residuo_estado.valor.ml': '',
    'residuo_estado.dupla_miccao.primeira_ml': '',
    'residuo_estado.dupla_miccao.segunda_ml': '',
  }
}

const finding = (tipo: BladderFindingType, state: Estado): BladderFinding => {
  const prefix = `conteudo.${tipo}`
  const side = texto(state, `${prefix}.lado`)
  const dopplerValue = texto(state, `${prefix}.doppler`)
  return {
    tipo,
    medidas_cm: medidas(state[`${prefix}.dimensoes`] ?? state[`${prefix}.dimensao`], 'cm'),
    descricao: texto(state, `${prefix}.descricao`) || null,
    mobilidade: tipo === 'calculo' && ['movel', 'imovel', 'juv'].includes(texto(state, `${prefix}.mobilidade`))
      ? texto(state, `${prefix}.mobilidade`) as BladderFinding['mobilidade']
      : null,
    lateralidade: side === 'esquerda' ? 'esquerda' : side === 'direita' ? 'direita' : null,
    multiplos: texto(state, `${prefix}.multiplicidade`) === 'multiplos',
    nivel_liquido: texto(state, `${prefix}.nivel_liquido`) === 'sim',
    doppler: dopplerValue === 'sem_fluxo' || dopplerValue === 'com_fluxo' ? dopplerValue : 'nao_avaliado',
    topografia: texto(state, `${prefix}.topografia`) || null,
    calculo_associado_mm: numero(state[`${prefix}.calculo_mm`], 'mm'),
  }
}

/** Aceita o estado compartilhado novo e as três formas legadas já salvas. */
export function normalizeBladderState(state: Estado): BladderState {
  const usaConteudoCompartilhado = temChave(state, 'conteudo')
  const usaParedeCompartilhada = temChave(state, 'parede') && typeof state.parede === 'string'
  const usaResiduoCompartilhado = temChave(state, 'residuo_estado')
  const legacyFindings = lista(state, 'achados').map((value) => ({
    espessamento: 'parede_espessada',
    trabeculacao: 'parede_trabeculada',
    calculo: 'calculo',
    diverticulo: 'diverticulo',
  })[value] ?? value)
  const content = new Set(usaConteudoCompartilhado
    ? lista(state, 'conteudo')
    : legacyFindings.filter((value) => !value.startsWith('parede_')))
  const paredeLegacy = legacyFindings.includes('parede_espessada')
    ? 'espessada'
    : legacyFindings.includes('parede_trabeculada')
      ? 'trabeculada'
      : ''
  const avaliadaLegada = texto(state, 'avaliada')
  const replecaoNova = texto(state, 'replecao')
  const replecaoRaw = temChave(state, 'replecao')
    ? replecaoNova
    : avaliadaLegada === 'nao' ? 'insuficiente' : 'adequada'
  const replecao = ['moderada', 'pequena', 'insuficiente', 'vazia'].includes(replecaoRaw)
    ? replecaoRaw as BladderState['replecao']
    : 'adequada'
  const paredesLegadas = lista(state, 'parede')
  const paredeRaw = texto(state, 'parede') || (paredesLegadas.includes('espessada') ? 'espessada' : paredesLegadas.includes('trabeculada') ? 'trabeculada' : '')
  const parede = usaParedeCompartilhada
    ? paredeRaw === 'espessada' || paredeRaw === 'trabeculada' ? paredeRaw : 'normal'
    : paredeLegacy || (paredeRaw === 'espessada' || paredeRaw === 'trabeculada' ? paredeRaw : 'normal')
  const oldResiduo = texto(state, 'residuo')
  const residuoLegadoEstado = oldResiduo === 'valor' || oldResiduo === 'desprezivel' ? oldResiduo : oldResiduo ? 'valor' : ''
  const residuoNovoEstado = texto(state, 'residuo_estado')
  const residuoEstadoRaw = usaResiduoCompartilhado ? residuoNovoEstado : residuoLegadoEstado || 'nao_informado'
  const residuoEstado = ['desprezivel', 'valor', 'dupla_miccao', 'sondado'].includes(residuoEstadoRaw)
    ? residuoEstadoRaw as BladderState['residuo_estado']
    : 'nao_informado'
  const jatosRaw = texto(state, 'jatos')
  const jatosEstado = ['presentes_simetrico', 'reduzido_unilateral', 'nao_caracterizados', 'ausencia_unilateral'].includes(jatosRaw)
    ? jatosRaw as BladderState['jatos']['estado']
    : 'nao_avaliados'
  const jatosSide = texto(state, `jatos.${jatosEstado}.lado`)
  const residuoValor = usaResiduoCompartilhado
    ? state['residuo_estado.valor.ml']
    : primeiroValorPreenchido(state, [
        'residuo.valor.ml',
        ...(oldResiduo !== 'valor' && oldResiduo !== 'desprezivel' ? ['residuo'] : []),
      ])

  return {
    replecao,
    parede,
    espessura_parede_mm: numero(state.espessura_parede, 'mm'),
    volume_pre_miccional_ml: numero(state.volume_pre, 'ml'),
    residuo_estado: residuoEstado,
    residuo_pos_miccional_ml: residuoEstado === 'valor'
      ? numero(residuoValor, 'ml')
      : null,
    residuo_primeira_miccao_ml: residuoEstado === 'dupla_miccao' ? numero(state['residuo_estado.dupla_miccao.primeira_ml'], 'ml') : null,
    residuo_segunda_miccao_ml: residuoEstado === 'dupla_miccao' ? numero(state['residuo_estado.dupla_miccao.segunda_ml'], 'ml') : null,
    jatos: {
      estado: jatosEstado,
      lateralidade: jatosSide === 'esquerda' ? 'esquerda' : jatosSide === 'direita' ? 'direita' : null,
      calculo_associado_mm: jatosEstado === 'ausencia_unilateral' ? numero(state[`jatos.${jatosEstado}.calculo_mm`], 'mm') : null,
    },
    achados: [...content]
      .filter((value): value is BladderFindingType => ['debris', 'calculo', 'coagulo', 'sonda', 'diverticulo', 'ureterocele', 'lesao_focal'].includes(value))
      .map((tipo) => finding(tipo, state)),
  }
}

export function bladderStateConflicts(state: BladderState): string[] {
  const conflicts: string[] = []
  if (state.replecao === 'insuficiente' || state.replecao === 'vazia') {
    const hasMeasurements = state.espessura_parede_mm !== null || state.volume_pre_miccional_ml !== null ||
      state.residuo_pos_miccional_ml !== null || state.residuo_primeira_miccao_ml !== null || state.residuo_segunda_miccao_ml !== null
    const hasObservedDetails = state.parede !== 'normal' || state.achados.length > 0 || state.jatos.estado !== 'nao_avaliados'
    if (hasMeasurements || hasObservedDetails) conflicts.push('repleção insuficiente/vazia não pode coexistir com medidas ou achados vesicais específicos')
  }
  if (state.residuo_estado === 'valor' && state.residuo_pos_miccional_ml === null) {
    conflicts.push('resíduo pós-miccional exige volume válido')
  }
  if (state.residuo_estado === 'dupla_miccao' && (state.residuo_primeira_miccao_ml === null || state.residuo_segunda_miccao_ml === null)) {
    conflicts.push('dupla micção exige os dois volumes válidos')
  }
  if ((state.jatos.estado === 'reduzido_unilateral' || state.jatos.estado === 'ausencia_unilateral') && !state.jatos.lateralidade) {
    conflicts.push('jato ureteral unilateral exige lateralidade explícita')
  }
  for (const finding of state.achados) {
    if (finding.tipo === 'calculo' && finding.mobilidade === 'juv' && !finding.lateralidade) {
      conflicts.push('cálculo impactado na JUV exige lateralidade explícita')
    }
    if (finding.tipo === 'ureterocele' && !finding.lateralidade) {
      conflicts.push('ureterocele exige lateralidade explícita')
    }
    if (finding.tipo === 'lesao_focal' && (!finding.topografia || !finding.medidas_cm)) {
      conflicts.push('lesão focal vesical exige topografia e dimensões válidas')
    }
    if (finding.tipo === 'coagulo' && !finding.descricao) {
      conflicts.push('coágulo/hematoma exige descrição morfológica')
    }
  }
  return conflicts
}

function rawInvalid(state: Estado, key: string, parser: (raw: unknown) => unknown): boolean {
  const raw = String(state[key] ?? '').trim()
  return raw !== '' && parser(raw) === null
}

/** Campos visíveis inválidos bloqueiam o render; subcampos de opção removida são ignorados. */
export function bladderInputIssues(state: Estado): string[] {
  const issues: string[] = []
  const normalized = normalizeBladderState(state)
  const usaConteudoCompartilhado = temChave(state, 'conteudo')
  const usaParedeCompartilhada = temChave(state, 'parede') && typeof state.parede === 'string'
  const usaResiduoCompartilhado = temChave(state, 'residuo_estado')
  const replecao = texto(state, 'replecao')
  if (temChave(state, 'replecao') && (typeof state.replecao !== 'string' || !['adequada', 'moderada', 'pequena', 'insuficiente', 'vazia'].includes(replecao))) issues.push('repleção tem opção inválida')
  const avaliada = texto(state, 'avaliada')
  if (!temChave(state, 'replecao') && temChave(state, 'avaliada') && (typeof state.avaliada !== 'string' || !['sim', 'nao'].includes(avaliada))) issues.push('avaliação vesical legada tem opção inválida')
  const parede = texto(state, 'parede')
  if (usaParedeCompartilhada && !['normal', 'espessada', 'trabeculada'].includes(parede)) issues.push('parede vesical tem opção inválida')
  const paredesLegadasInvalidas = lista(state, 'parede').filter((value) => !['espessada', 'trabeculada'].includes(value))
  if (!usaParedeCompartilhada && temChave(state, 'parede') && !Array.isArray(state.parede)) issues.push('parede vesical legada tem formato inválido')
  if (!usaParedeCompartilhada && paredesLegadasInvalidas.length > 0) issues.push(`parede vesical legada tem opção inválida: ${paredesLegadasInvalidas.join(', ')}`)
  const tiposVesicais = ['debris', 'calculo', 'coagulo', 'sonda', 'diverticulo', 'ureterocele', 'lesao_focal']
  const conteudosInvalidos = lista(state, 'conteudo').filter((value) => !tiposVesicais.includes(value))
  if (usaConteudoCompartilhado && !Array.isArray(state.conteudo)) issues.push('conteúdo vesical tem formato inválido')
  if (usaConteudoCompartilhado && conteudosInvalidos.length > 0) issues.push(`conteúdo vesical tem opção inválida: ${conteudosInvalidos.join(', ')}`)
  const achadosLegadosValidos = [...tiposVesicais, 'espessamento', 'trabeculacao']
  const achadosLegadosInvalidos = lista(state, 'achados').filter((value) => !achadosLegadosValidos.includes(value))
  if (!usaConteudoCompartilhado && !usaParedeCompartilhada && temChave(state, 'achados') && !Array.isArray(state.achados)) issues.push('achado vesical legado tem formato inválido')
  if (!usaConteudoCompartilhado && !usaParedeCompartilhada && achadosLegadosInvalidos.length > 0) issues.push(`achado vesical legado tem opção inválida: ${achadosLegadosInvalidos.join(', ')}`)
  const jatos = texto(state, 'jatos')
  if (jatos && !['nao_avaliados', 'presentes_simetrico', 'reduzido_unilateral', 'nao_caracterizados', 'ausencia_unilateral'].includes(jatos)) {
    issues.push('jatos ureterais têm opção inválida')
  }
  if (rawInvalid(state, 'espessura_parede', (raw) => numero(raw, 'mm'))) issues.push('espessura da parede tem formato inválido')
  if (rawInvalid(state, 'volume_pre', (raw) => numero(raw, 'ml'))) issues.push('volume pré-miccional tem formato inválido')
  if (normalized.residuo_estado === 'valor') {
    const oldResiduo = texto(state, 'residuo')
    const activeRaw = usaResiduoCompartilhado
      ? state['residuo_estado.valor.ml']
      : primeiroValorPreenchido(state, [
          'residuo.valor.ml',
          ...(oldResiduo !== 'valor' && oldResiduo !== 'desprezivel' ? ['residuo'] : []),
        ])
    if (activeRaw !== null && numero(activeRaw, 'ml') === null) issues.push('resíduo pós-miccional tem formato inválido')
  }
  if (normalized.residuo_estado === 'dupla_miccao') {
    if (rawInvalid(state, 'residuo_estado.dupla_miccao.primeira_ml', (raw) => numero(raw, 'ml'))) issues.push('volume após primeira micção tem formato inválido')
    if (rawInvalid(state, 'residuo_estado.dupla_miccao.segunda_ml', (raw) => numero(raw, 'ml'))) issues.push('volume após segunda micção tem formato inválido')
  }
  for (const finding of normalized.achados) {
    const prefix = `conteudo.${finding.tipo}`
    if (rawInvalid(state, `${prefix}.dimensao`, (raw) => medidas(raw, 'cm')) || rawInvalid(state, `${prefix}.dimensoes`, (raw) => medidas(raw, 'cm'))) {
      issues.push(`${finding.tipo}: dimensões têm formato inválido`)
    }
    if (rawInvalid(state, `${prefix}.calculo_mm`, (raw) => numero(raw, 'mm'))) issues.push(`${finding.tipo}: medida do cálculo tem formato inválido`)
  }
  if (normalized.jatos.estado === 'ausencia_unilateral' && rawInvalid(state, 'jatos.ausencia_unilateral.calculo_mm', (raw) => numero(raw, 'mm'))) {
    issues.push('jatos: medida do cálculo associado tem formato inválido')
  }
  return [...new Set(issues)]
}

function bladderCompose(state: OrganState): OrganComposition {
  const bladder = normalizeBladderState(state)
  if (bladder.replecao === 'insuficiente' || bladder.replecao === 'vazia') {
    const vazia = bladder.replecao === 'vazia'
    return {
      body: vazia ? 'Bexiga vazia no momento do exame, não permitindo adequada avaliação.' : 'Bexiga com repleção insuficiente no momento do exame, prejudicando a sua adequada avaliação.',
      conclusion: [vazia ? 'Bexiga vazia, não adequadamente avaliável.' : 'Bexiga com repleção insuficiente para adequada avaliação.'],
      isNormal: false,
    }
  }
  const altered = bladder.parede !== 'normal' || bladder.achados.length > 0
  return {
    body: altered ? 'Bexiga com alterações selecionadas, detalhadas no renderer canônico.' : 'Bexiga de forma, contornos e paredes regulares, com conteúdo anecoico.',
    conclusion: altered ? [] : ['Bexiga ecograficamente normal.'],
    isNormal: !altered,
  }
}

export function createSharedBladderModule(category: UrinaryCategory): OrganModule {
  return {
    schema: { id: 'bexiga', name: 'Bexiga', category, fields: bladderFields.map((field) => ({ ...field })) },
    initialState: bladderInitialState,
    compose: bladderCompose,
  }
}

const calculoSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensão', kind: 'text', placeholder: '5 mm', halfWidth: true },
  { key: 'polo', label: 'Localização', kind: 'mini-segmented', options: [
    { value: 'sup', label: 'Polo superior', isDefault: true },
    { value: 'medio', label: 'Terço médio' },
    { value: 'inf', label: 'Polo inferior' },
  ] },
]

const lesaoSubFields: Field[] = [
  { key: 'dimensao', label: 'Dimensões', kind: 'text', placeholder: '12 x 10 x 9 mm', halfWidth: true },
  { key: 'polo', label: 'Localização', kind: 'mini-segmented', options: [
    { value: 'sup', label: 'Polo superior', isDefault: true },
    { value: 'medio', label: 'Terço médio' },
    { value: 'inf', label: 'Polo inferior' },
  ] },
]

function kidneySchema(category: UrinaryCategory, lado: Lado): OrganSchema {
  return {
    id: `rim_${lado}`,
    name: `Rim ${lado}`,
    category,
    fields: [
      { key: 'dimensoes', label: 'Dimensões', kind: 'segmented', presentation: 'select', options: [
        { value: 'normal', label: 'Normais', isDefault: true },
        { value: 'reduzida_discreta', label: 'Discretamente reduzidas' },
        { value: 'reduzido', label: 'Reduzidas' },
      ] },
      { key: 'diferenciacao', label: 'Diferenciação corticomedular', kind: 'segmented', presentation: 'select', options: [
        { value: 'preservada', label: 'Preservada', isDefault: true },
        { value: 'reduzida', label: 'Reduzida' },
      ] },
      { key: 'estrutura', label: 'Posição e estrutura', kind: 'checklist', hint: 'marque se houver', options: [
        { value: 'situacao_baixa', label: 'Situação baixa' },
        { value: 'rotacao', label: 'Rotação' },
        { value: 'drc', label: 'Doença renal crônica' },
      ] },
      { key: 'dilatacao', label: 'Dilatação pielocalicial', kind: 'segmented', presentation: 'select', options: [
        { value: 'ausente', label: 'Ausente', isDefault: true },
        { value: 'leve', label: 'Leve' },
        { value: 'moderada', label: 'Moderada' },
        { value: 'acentuada', label: 'Acentuada' },
      ] },
      { key: 'litiase', label: 'Litíase', kind: 'checklist', hint: 'marque se houver', options: [
        { value: 'calculo', label: 'Cálculo', subFields: calculoSubFields },
      ] },
      { key: 'cistos', label: 'Cistos', kind: 'checklist', hint: 'marque se houver', options: [
        { value: 'simples', label: 'Cisto simples', subFields: [{ key: 'dimensao', label: 'Dimensões', kind: 'text', placeholder: '20 x 18 x 16 mm' }] },
        { value: 'multiplos', label: 'Cistos múltiplos' },
      ] },
      { key: 'lesoes', label: 'Outras alterações', kind: 'checklist', hint: 'marque se houver', options: [
        { value: 'cisto_complexo', label: 'Cisto complexo', subFields: [
          ...lesaoSubFields,
          { key: 'carac', label: 'Característica', kind: 'text', placeholder: 'septado / com calcificação periférica' },
        ] },
        { value: 'nodulo', label: 'Nódulo sólido', subFields: lesaoSubFields },
        { value: 'angiomiolipoma', label: 'Angiomiolipoma', subFields: lesaoSubFields },
        { value: 'ectasia', label: 'Ectasia pielocalicial', subFields: [{ key: 'local', label: 'Localização', kind: 'text', placeholder: 'pelve renal' }] },
      ] },
      { key: 'alteracao_difusa', label: 'Alteração difusa (descrição)', kind: 'text', placeholder: 'descrever somente o observado' },
      { key: 'medidas', label: 'Medidas do rim (L x AP x T cm)', kind: 'text', placeholder: '10,2 x 4,8 x 5,1', halfWidth: true },
      { key: 'espessura', label: 'Espessura do parênquima (cm)', kind: 'text', placeholder: '1,6', halfWidth: true },
    ],
    rareFindings: [{ value: 'nefrocalcinose', label: 'Nefrocalcinose' }],
  }
}

function kidneyInitialState(): OrganState {
  return {
    dimensoes: 'normal', diferenciacao: 'preservada', estrutura: [], dilatacao: 'ausente',
    litiase: [], cistos: [], lesoes: [], raros: [], alteracao_difusa: '', medidas: '', espessura: '',
    'litiase.calculo.dimensao': '', 'litiase.calculo.polo': 'sup',
    'cistos.simples.dimensao': '',
    'lesoes.cisto_complexo.dimensao': '', 'lesoes.cisto_complexo.polo': 'sup', 'lesoes.cisto_complexo.carac': '',
    'lesoes.nodulo.dimensao': '', 'lesoes.nodulo.polo': 'sup',
    'lesoes.angiomiolipoma.dimensao': '', 'lesoes.angiomiolipoma.polo': 'sup',
    'lesoes.ectasia.local': '',
  }
}

export type KidneyFinding = {
  tipo: 'litiase' | 'cisto_simples' | 'cistos_multiplos' | 'cisto_complexo' | 'nodulo' | 'angiomiolipoma' | 'ectasia' | 'nefrocalcinose'
  medidas_cm: number[] | null
  localizacao: string | null
  caracteristica: string | null
  descricao_raw: string | null
}

export type KidneyState = {
  medidas_cm: number[] | null
  espessura_parenquima_cm: number | null
  dimensao: 'normal' | 'reduzida_discreta' | 'reduzida'
  diferenciacao: 'preservada' | 'reduzida'
  situacao_baixa: boolean
  rotacao: boolean
  drc: boolean
  alteracao_difusa: string | null
  hidronefrose: 'ausente' | 'leve' | 'moderada' | 'acentuada'
  achados: KidneyFinding[]
}

const polo = (value: string): string | null =>
  value === 'sup' ? 'polo superior' : value === 'medio' ? 'terço médio' : value === 'inf' ? 'polo inferior' : value || null

/** Aceita a forma compartilhada nova e a forma legada de Vias Urinárias. */
export function normalizeKidneyState(state: Estado): KidneyState {
  const usaLitiaseCompartilhada = temChave(state, 'litiase')
  const usaCistosCompartilhados = temChave(state, 'cistos')
  const usaLesoesCompartilhadas = temChave(state, 'lesoes')
  const usaRarosCompartilhados = temChave(state, 'raros')
  const dimensaoRaw = temChave(state, 'dimensoes') ? texto(state, 'dimensoes') : texto(state, 'dimensao') || 'normal'
  const dimensao = dimensaoRaw === 'reduzida_discreta'
    ? 'reduzida_discreta'
    : dimensaoRaw === 'reduzido' || dimensaoRaw === 'reduzida'
      ? 'reduzida'
      : 'normal'
  const estrutura = lista(state, 'estrutura')
  const hydraRaw = temChave(state, 'dilatacao') ? texto(state, 'dilatacao') : texto(state, 'hidronefrose') || 'ausente'
  const hidronefrose = ['leve', 'moderada', 'acentuada'].includes(hydraRaw)
    ? hydraRaw as KidneyState['hidronefrose']
    : 'ausente'
  const out: KidneyFinding[] = []
  const add = (item: KidneyFinding) => out.push(item)

  if (usaLitiaseCompartilhada && lista(state, 'litiase').includes('calculo')) add({
    tipo: 'litiase',
    medidas_cm: medidas(state['litiase.calculo.dimensao'], 'mm'),
    localizacao: polo(texto(state, 'litiase.calculo.polo')),
    caracteristica: null,
    descricao_raw: null,
  })
  if (usaCistosCompartilhados && lista(state, 'cistos').includes('simples')) add({ tipo: 'cisto_simples', medidas_cm: medidas(state['cistos.simples.dimensao'], 'mm'), localizacao: null, caracteristica: null, descricao_raw: null })
  if (usaCistosCompartilhados && lista(state, 'cistos').includes('multiplos')) add({ tipo: 'cistos_multiplos', medidas_cm: null, localizacao: null, caracteristica: null, descricao_raw: null })
  for (const tipo of usaLesoesCompartilhadas ? lista(state, 'lesoes') : []) {
    if (!['cisto_complexo', 'nodulo', 'angiomiolipoma', 'ectasia'].includes(tipo)) continue
    add({
      tipo: tipo as KidneyFinding['tipo'],
      medidas_cm: medidas(state[`lesoes.${tipo}.dimensao`], 'mm'),
      localizacao: tipo === 'ectasia' ? texto(state, 'lesoes.ectasia.local') || null : polo(texto(state, `lesoes.${tipo}.polo`)),
      caracteristica: tipo === 'cisto_complexo' ? texto(state, 'lesoes.cisto_complexo.carac') || null : null,
      descricao_raw: null,
    })
  }
  if (usaRarosCompartilhados && lista(state, 'raros').includes('nefrocalcinose')) add({ tipo: 'nefrocalcinose', medidas_cm: null, localizacao: null, caracteristica: null, descricao_raw: null })

  const achadosLegadosAtivos = lista(state, 'achados').filter((tipo) => {
    if (tipo === 'litiase') return !usaLitiaseCompartilhada
    if (tipo === 'cisto_simples') return !usaCistosCompartilhados
    if (tipo === 'cisto_complexo' || tipo === 'nodulo' || tipo === 'ectasia') return !usaLesoesCompartilhadas
    return !(usaLitiaseCompartilhada && usaCistosCompartilhados && usaLesoesCompartilhadas)
  })
  for (const tipo of achadosLegadosAtivos) {
    const prefix = `achados.${tipo}`
    const mapped = tipo === 'cisto_simples' || tipo === 'cisto_complexo' || tipo === 'nodulo' || tipo === 'ectasia' || tipo === 'litiase'
      ? tipo as KidneyFinding['tipo']
      : null
    if (!mapped || out.some((item) => item.tipo === mapped)) continue
    add({
      tipo: mapped,
      medidas_cm: mapped === 'litiase' ? medidas(state[`${prefix}.medida`], 'cm') : medidas(state[`${prefix}.medidas`], 'cm'),
      localizacao: texto(state, `${prefix}.local`) || null,
      caracteristica: mapped === 'cisto_complexo' ? texto(state, `${prefix}.carac`) || null : null,
      descricao_raw: [mapped.replaceAll('_', ' '), texto(state, `${prefix}.local`)].filter(Boolean).join(' — ') || null,
    })
  }

  return {
    medidas_cm: medidas(state.medidas, 'cm'),
    espessura_parenquima_cm: medidaEscalar(state.espessura, 'cm'),
    dimensao,
    diferenciacao: texto(state, 'diferenciacao') === 'reduzida' || estrutura.includes('drc') ? 'reduzida' : 'preservada',
    situacao_baixa: estrutura.includes('situacao_baixa'),
    rotacao: estrutura.includes('rotacao'),
    drc: estrutura.includes('drc'),
    alteracao_difusa: texto(state, 'alteracao_difusa') || null,
    hidronefrose,
    achados: out,
  }
}

export function kidneyInputIssues(state: Estado): string[] {
  const issues: string[] = []
  const usaLitiaseCompartilhada = temChave(state, 'litiase')
  const usaCistosCompartilhados = temChave(state, 'cistos')
  const usaLesoesCompartilhadas = temChave(state, 'lesoes')
  const usaRarosCompartilhados = temChave(state, 'raros')
  const dimensaoKey = temChave(state, 'dimensoes') ? 'dimensoes' : 'dimensao'
  const dimensoesValidas = dimensaoKey === 'dimensoes'
    ? ['normal', 'reduzida_discreta', 'reduzido']
    : ['normal', 'reduzida_discreta', 'reduzida', 'reduzido']
  if (temChave(state, dimensaoKey) && (typeof state[dimensaoKey] !== 'string' || !dimensoesValidas.includes(texto(state, dimensaoKey)))) {
    issues.push('dimensão renal tem opção inválida')
  }
  if (temChave(state, 'diferenciacao') && (typeof state.diferenciacao !== 'string' || !['preservada', 'reduzida'].includes(texto(state, 'diferenciacao')))) {
    issues.push('diferenciação corticomedular tem opção inválida')
  }
  if (temChave(state, 'estrutura') && !Array.isArray(state.estrutura)) issues.push('estrutura renal tem formato inválido')
  if (Array.isArray(state.estrutura) && lista(state, 'estrutura').length !== state.estrutura.length) issues.push('estrutura renal tem formato inválido')
  const estruturasInvalidas = lista(state, 'estrutura').filter((value) => !['situacao_baixa', 'rotacao', 'drc'].includes(value))
  if (estruturasInvalidas.length > 0) issues.push(`estrutura renal tem opção inválida: ${estruturasInvalidas.join(', ')}`)
  const dilatacaoKey = temChave(state, 'dilatacao') ? 'dilatacao' : 'hidronefrose'
  if (temChave(state, dilatacaoKey) && (typeof state[dilatacaoKey] !== 'string' || !['ausente', 'leve', 'moderada', 'acentuada'].includes(texto(state, dilatacaoKey)))) {
    issues.push('dilatação pielocalicial tem opção inválida')
  }
  const validarLista = (key: string, allowed: string[], label: string) => {
    if (!temChave(state, key)) return
    if (!Array.isArray(state[key])) {
      issues.push(`${label} tem formato inválido`)
      return
    }
    const values = lista(state, key)
    if (values.length !== state[key].length) issues.push(`${label} tem formato inválido`)
    const invalid = values.filter((value) => !allowed.includes(value))
    if (invalid.length > 0) issues.push(`${label} tem opção inválida: ${invalid.join(', ')}`)
  }
  if (usaLitiaseCompartilhada) validarLista('litiase', ['calculo'], 'litíase renal')
  if (usaCistosCompartilhados) validarLista('cistos', ['simples', 'multiplos'], 'cistos renais')
  if (usaLesoesCompartilhadas) validarLista('lesoes', ['cisto_complexo', 'nodulo', 'angiomiolipoma', 'ectasia'], 'lesões renais')
  if (usaRarosCompartilhados) validarLista('raros', ['nefrocalcinose'], 'achados renais raros')
  const todosGruposLegadosSubstituidos = usaLitiaseCompartilhada && usaCistosCompartilhados && usaLesoesCompartilhadas
  const achadosLegadosAtivos = lista(state, 'achados').filter((type) => {
    if (type === 'litiase') return !usaLitiaseCompartilhada
    if (type === 'cisto_simples') return !usaCistosCompartilhados
    if (type === 'cisto_complexo' || type === 'nodulo' || type === 'ectasia') return !usaLesoesCompartilhadas
    return !todosGruposLegadosSubstituidos
  })
  if (!todosGruposLegadosSubstituidos && temChave(state, 'achados')) {
    if (!Array.isArray(state.achados) || (Array.isArray(state.achados) && lista(state, 'achados').length !== state.achados.length)) {
      issues.push('achado renal legado tem formato inválido')
    }
    const invalid = achadosLegadosAtivos.filter((value) => !['litiase', 'cisto_simples', 'cisto_complexo', 'nodulo', 'ectasia'].includes(value))
    if (invalid.length > 0) issues.push(`achado renal legado tem opção inválida: ${invalid.join(', ')}`)
  }
  if (rawInvalid(state, 'medidas', (raw) => medidas(raw, 'cm'))) issues.push('medidas renais têm formato inválido')
  if (rawInvalid(state, 'espessura', (raw) => medidaEscalar(raw, 'cm'))) issues.push('espessura do parênquima tem formato inválido')
  if (usaLitiaseCompartilhada && lista(state, 'litiase').includes('calculo')) {
    if (rawInvalid(state, 'litiase.calculo.dimensao', (raw) => medidas(raw, 'mm'))) issues.push('dimensão do cálculo renal tem formato inválido')
    if (!['sup', 'medio', 'inf'].includes(texto(state, 'litiase.calculo.polo'))) issues.push('localização do cálculo renal tem opção inválida')
  }
  if (usaCistosCompartilhados && lista(state, 'cistos').includes('simples') && rawInvalid(state, 'cistos.simples.dimensao', (raw) => medidas(raw, 'mm'))) issues.push('dimensões do cisto simples têm formato inválido')
  for (const type of usaLesoesCompartilhadas ? lista(state, 'lesoes') : []) {
    if (['cisto_complexo', 'nodulo', 'angiomiolipoma'].includes(type)) {
      if (rawInvalid(state, `lesoes.${type}.dimensao`, (raw) => medidas(raw, 'mm'))) issues.push(`${type}: dimensões têm formato inválido`)
      if (!['sup', 'medio', 'inf'].includes(texto(state, `lesoes.${type}.polo`))) issues.push(`${type}: localização tem opção inválida`)
    }
  }
  for (const type of achadosLegadosAtivos) {
    const key = type === 'litiase' ? `achados.${type}.medida` : `achados.${type}.medidas`
    if (rawInvalid(state, key, (raw) => medidas(raw, 'cm'))) issues.push(`${type}: dimensões têm formato inválido`)
  }
  return [...new Set(issues)]
}

function kidneyCompose(lado: Lado, state: OrganState): OrganComposition {
  const kidney = normalizeKidneyState(state)
  const altered = kidney.dimensao !== 'normal' || kidney.diferenciacao !== 'preservada' || kidney.situacao_baixa ||
    kidney.rotacao || kidney.drc || kidney.hidronefrose !== 'ausente' || kidney.achados.length > 0 || kidney.alteracao_difusa !== null
  return {
    body: altered
      ? `Rim ${lado} com alterações selecionadas, detalhadas no renderer canônico.`
      : `Rim ${lado} tópico, de dimensões normais, contornos regulares e boa diferenciação corticomedular, sem litíase ou dilatação pielocalicial.`,
    conclusion: [],
    isNormal: !altered,
  }
}

export function createSharedKidneyModule(category: UrinaryCategory, lado: Lado): OrganModule {
  return {
    schema: kidneySchema(category, lado),
    initialState: kidneyInitialState,
    compose: (state) => kidneyCompose(lado, state),
  }
}
