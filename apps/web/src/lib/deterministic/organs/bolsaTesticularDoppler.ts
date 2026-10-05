/**
 * Categoria BOLSA_TESTICULAR_DOPPLER — formulário estruturado Web (composição local).
 *
 * Reutiliza o hemiescroto em modo B de ESCROTAL (testículo, epidídimo, hidrocele)
 * e acrescenta só o bloco Doppler por lado: perfusão testicular, fluxo
 * epididimário e pesquisa de varicocele com calibre, manobra e posição.
 *
 * Achado de fluxo é sempre descritivo. Torção, orquite, epididimite e varicocele
 * só entram na conclusão com dados suficientes e confirmação médica explícita.
 * Limiares de varicocele: os mesmos da regra do repositório usada em ESCROTAL
 * (calibre > 3,0 mm em repouso ou > 3,5 mm à manobra, ou refluxo presente).
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { escrotoSideModule } from './escrotal'
import { medida, texto, valorNumerico, type Lado } from './superficialShared'

const CATEGORIA = 'BOLSA_TESTICULAR_DOPPLER'
const FEM: Record<Lado, string> = { direito: 'direita', esquerdo: 'esquerda' }
const OUTRO: Record<Lado, Lado> = { direito: 'esquerdo', esquerdo: 'direito' }
const VARICOCELE_REPOUSO_MM = 3.0
const VARICOCELE_MANOBRA_MM = 3.5

type Exame = Record<string, OrganState>
type Perfusao = 'nao_avaliada' | 'preservada' | 'aumentada' | 'reduzida' | 'ausente'
type FluxoEpididimo = 'nao_avaliado' | 'preservado' | 'aumentado'
type Plexo = 'nao_avaliado' | 'calibre_normal' | 'pesquisa'

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const CONFIRMA = [['nao', 'Pendente de confirmação'], ['sim', 'Confirmado pelo médico']] as const

/** 'modelo' segue o modelo de partida escolhido no topo do formulário. */
function resolver(st: OrganState, opts: OrganState) {
  const normal = texto(opts, 'modelo') === 'normal'
  const pick = <T extends string>(key: string, normalValue: T, blank: T): T => {
    const raw = texto(st, key) || 'modelo'
    return (raw === 'modelo' ? (normal ? normalValue : blank) : raw) as T
  }
  return {
    perfusao: pick<Perfusao>('perfusao', 'preservada', 'nao_avaliada'),
    epididimo: pick<FluxoEpididimo>('fluxo_epididimo', 'preservado', 'nao_avaliado'),
    plexo: pick<Plexo>('plexo', 'calibre_normal', 'nao_avaliado'),
  }
}

function ladosDoExame(opts: OrganState): Lado[] {
  const lat = texto(opts, 'lateralidade')
  return lat === 'direito' ? ['direito'] : lat === 'esquerdo' ? ['esquerdo'] : ['direito', 'esquerdo']
}

type Pesquisa = { repouso: number | null; manobra: number | null; criterio: boolean; issues: string[] }
function pesquisaVaricocele(st: OrganState): Pesquisa {
  const p = 'plexo.pesquisa.'
  const issues: string[] = []
  const bruto = (k: string) => String(st[`${p}${k}`] ?? '').trim()
  const emCm = /cm/i.test(`${bruto('repouso_mm')}${bruto('manobra_mm')}`)
  if (emCm) issues.push('informe os calibres do plexo em mm')
  const repouso = bruto('repouso_mm') && !emCm ? valorNumerico(bruto('repouso_mm')) : null
  const manobra = bruto('manobra_mm') && !emCm ? valorNumerico(bruto('manobra_mm')) : null
  if ((bruto('repouso_mm') && repouso === null && !emCm) || (bruto('manobra_mm') && manobra === null && !emCm)) issues.push('calibre do plexo inválido')
  if (repouso === null && manobra === null && !emCm) issues.push('informe o calibre do plexo em repouso ou à manobra')
  if (texto(st, `${p}manobra`) !== 'valsalva' && texto(st, `${p}manobra`) !== 'repouso') issues.push('informe a manobra da pesquisa')
  if (manobra !== null && texto(st, `${p}manobra`) !== 'valsalva') issues.push('calibre à manobra exige a manobra de Valsalva')
  if (!['ortostase', 'decubito'].includes(texto(st, `${p}posicao`))) issues.push('informe a posição do paciente')
  const refluxo = texto(st, `${p}refluxo`)
  if (refluxo !== 'presente' && refluxo !== 'ausente') issues.push('informe o resultado da pesquisa de refluxo')
  const criterio = refluxo === 'presente' || (repouso !== null && repouso > VARICOCELE_REPOUSO_MM) || (manobra !== null && manobra > VARICOCELE_MANOBRA_MM)
  if (texto(st, `${p}confirmado`) === 'sim' && !criterio) issues.push('a confirmação de varicocele exige refluxo ou calibre acima de 3,0 mm em repouso / 3,5 mm à manobra')
  return { repouso, manobra, criterio, issues }
}

/** Dados mínimos e confirmação da hipótese de um lado; vazio = pode concluir. */
export function hipoteseIssues(state: Exame, lado: Lado): string[] {
  const opts = state.__opts ?? {}
  const st = state[`doppler_${lado}`] ?? {}
  const hipotese = texto(st, 'hipotese') || 'nenhuma'
  const confirmada = texto(st, 'hipotese_confirmada') === 'sim'
  if (hipotese === 'nenhuma') return confirmada ? [`Doppler ${lado}: a confirmação exige uma hipótese selecionada`] : []
  const issues: string[] = []
  const r = resolver(st, opts)
  const modoB = state[`escroto_${lado}`] ?? {}
  if (hipotese === 'torcao') {
    const contralateral = ladosDoExame(opts).includes(OUTRO[lado]) ? resolver(state[`doppler_${OUTRO[lado]}`] ?? {}, opts).perfusao : null
    if (r.perfusao !== 'ausente' && r.perfusao !== 'reduzida') issues.push('torção exige perfusão testicular ausente ou reduzida documentada')
    if (contralateral !== 'preservada') issues.push('torção exige comparação com o testículo contralateral de perfusão preservada')
  }
  if ((hipotese === 'orquite' || hipotese === 'orquiepididimite') && r.perfusao !== 'aumentada') issues.push('orquite exige aumento da perfusão testicular documentado')
  if ((hipotese === 'epididimite' || hipotese === 'orquiepididimite') && (r.epididimo !== 'aumentado' || texto(modoB, 'epididimo') !== 'aumentado')) {
    issues.push('epididimite exige epidídimo aumentado no modo B e aumento do fluxo epididimário')
  }
  if (!confirmada) issues.push('confirme a hipótese diagnóstica')
  return issues.map(issue => `Doppler ${lado}: ${issue}`)
}

function dopplerModule(lado: Lado): OrganModule {
  const fields: Field[] = [
    select('perfusao', 'Perfusão testicular', [['modelo', 'Conforme modelo'], ['nao_avaliada', 'Não avaliada'], ['preservada', 'Preservada'], ['aumentada', 'Aumentada'], ['reduzida', 'Reduzida'], ['ausente', 'Fluxo não detectado']]),
    select('fluxo_epididimo', 'Fluxo no epidídimo', [['modelo', 'Conforme modelo'], ['nao_avaliado', 'Não avaliado'], ['preservado', 'Habitual'], ['aumentado', 'Aumentado']]),
    {
      key: 'plexo', label: 'Plexo pampiniforme', kind: 'segmented', presentation: 'select', options: [
        { value: 'modelo', label: 'Conforme modelo', isDefault: true },
        { value: 'nao_avaliado', label: 'Não avaliado' },
        { value: 'calibre_normal', label: 'Calibre normal (sem pesquisa de refluxo)' },
        { value: 'pesquisa', label: 'Pesquisa de varicocele', subFields: [
          { key: 'repouso_mm', label: 'Calibre em repouso (mm)', kind: 'text', placeholder: '2,8', halfWidth: true },
          { key: 'manobra_mm', label: 'Calibre à Valsalva (mm)', kind: 'text', placeholder: '3,8', halfWidth: true },
          select('manobra', 'Manobra', [['nao_informada', 'Não informada'], ['repouso', 'Somente repouso'], ['valsalva', 'Valsalva']]),
          select('posicao', 'Posição', [['nao_informada', 'Não informada'], ['ortostase', 'Ortostase'], ['decubito', 'Decúbito dorsal']]),
          select('refluxo', 'Refluxo ao Doppler espectral', [['nao_avaliado', 'Não informado'], ['ausente', 'Ausente'], ['presente', 'Presente']]),
          select('confirmado', 'Confirmação médica de varicocele', CONFIRMA),
        ] },
      ],
    },
    select('hipotese', 'Hipótese diagnóstica', [['nenhuma', 'Nenhuma'], ['torcao', 'Torção testicular'], ['orquite', 'Orquite'], ['epididimite', 'Epididimite'], ['orquiepididimite', 'Orquiepididimite']]),
    select('hipotese_confirmada', 'Confirmação médica da hipótese', CONFIRMA),
  ]
  return {
    schema: { id: `doppler_${lado}`, name: `Doppler · ${lado}`, category: CATEGORIA, fields },
    initialState: (): OrganState => Object.fromEntries([
      ...fields.map(f => [f.key, f.options?.find(o => o.isDefault)?.value ?? '']),
      ['plexo.pesquisa.repouso_mm', ''], ['plexo.pesquisa.manobra_mm', ''], ['plexo.pesquisa.manobra', 'nao_informada'],
      ['plexo.pesquisa.posicao', 'nao_informada'], ['plexo.pesquisa.refluxo', 'nao_avaliado'], ['plexo.pesquisa.confirmado', 'nao'],
    ]),
    compose: (st, opts = {}): OrganComposition => {
      const r = resolver(st, opts)
      const linhas: string[] = []
      const conclusion: string[] = []
      const pendencias: PendenciaLocal[] = []
      const ladoF = FEM[lado]
      if (r.perfusao === 'nao_avaliada') pendencias.push({ onde: `Doppler ${lado}`, motivo: 'informe a perfusão testicular ao Doppler' })
      if (r.perfusao === 'preservada') linhas.push(`Testículo ${lado} com perfusão preservada ao Doppler colorido.`)
      if (r.perfusao === 'aumentada') {
        linhas.push(`Testículo ${lado} com aumento da vascularização ao Doppler colorido.`)
        conclusion.push(`Aumento da vascularização do testículo ${lado} ao Doppler colorido.`)
      }
      if (r.perfusao === 'reduzida') {
        linhas.push(`Testículo ${lado} com redução da vascularização ao Doppler colorido.`)
        conclusion.push(`Redução da vascularização do testículo ${lado} ao Doppler colorido. Correlacionar com dados clínicos.`)
      }
      if (r.perfusao === 'ausente') {
        linhas.push(`Fluxo não detectado ao Doppler colorido no parênquima do testículo ${lado}.`)
        conclusion.push(`Fluxo não detectado ao Doppler colorido no testículo ${lado}. Correlacionar com dados clínicos.`)
      }
      if (r.epididimo === 'preservado') linhas.push(`Epidídimo ${lado} com vascularização habitual ao Doppler colorido.`)
      if (r.epididimo === 'aumentado') {
        linhas.push(`Epidídimo ${lado} com aumento da vascularização ao Doppler colorido.`)
        conclusion.push(`Aumento da vascularização do epidídimo ${lado} ao Doppler colorido.`)
      }
      if (r.plexo === 'calibre_normal') linhas.push(`Veias do plexo pampiniforme ${lado} de calibre normal.`)
      if (r.plexo === 'pesquisa') {
        const pq = pesquisaVaricocele(st)
        for (const motivo of pq.issues) pendencias.push({ onde: `plexo pampiniforme ${lado}`, motivo })
        if (!pq.issues.length) {
          const p = 'plexo.pesquisa.'
          const calibres = [
            pq.repouso !== null && `${medida(st[`${p}repouso_mm`], 'mm')} em repouso`,
            pq.manobra !== null && `${medida(st[`${p}manobra_mm`], 'mm')} à manobra de Valsalva`,
          ].filter(Boolean).join(' e ')
          const posicao = texto(st, `${p}posicao`) === 'ortostase' ? 'em ortostase' : 'em decúbito dorsal'
          const refluxo = texto(st, `${p}refluxo`) === 'presente' ? 'com refluxo venoso ao Doppler espectral' : 'sem refluxo venoso ao Doppler espectral'
          const descricao = `veias do plexo pampiniforme ${lado} com calibre de até ${calibres}, ${refluxo}`
          linhas.push(`Pesquisa de varicocele à ${ladoF}, ${posicao}${texto(st, `${p}manobra`) === 'valsalva' ? ', com manobra de Valsalva' : ', em repouso'}: ${descricao}.`)
          if (pq.criterio) {
            conclusion.push(texto(st, `${p}confirmado`) === 'sim'
              ? `Varicocele à ${ladoF}.`
              : `${descricao.charAt(0).toUpperCase()}${descricao.slice(1)}.`)
          }
        }
      }
      return { body: linhas.join('\n'), conclusion, pendencias, isNormal: conclusion.length === 0 && pendencias.length === 0 }
    },
  }
}

const HIPOTESE_TEXTO: Record<string, (lado: Lado) => string> = {
  torcao: lado => `Achados compatíveis com torção testicular à ${FEM[lado]}, conforme avaliação médica. Correlacionar com dados clínicos e avaliação urológica.`,
  orquite: lado => `Achados compatíveis com orquite à ${FEM[lado]}, conforme avaliação médica. Correlacionar com dados clínicos.`,
  epididimite: lado => `Achados compatíveis com epididimite à ${FEM[lado]}, conforme avaliação médica. Correlacionar com dados clínicos.`,
  orquiepididimite: lado => `Achados compatíveis com orquiepididimite à ${FEM[lado]}, conforme avaliação médica. Correlacionar com dados clínicos.`,
}

/** Pendências que dependem de mais de uma seção (lista e bloqueio de salvamento). */
export function bolsaTesticularDopplerIssuesDoExame(state: Exame): string[] {
  return ladosDoExame(state.__opts ?? {}).flatMap(lado => hipoteseIssues(state, lado))
}

const sections: ExamSection[] = (['direito', 'esquerdo'] as const).flatMap(lado => [
  { id: `escroto_${lado}`, label: `Hemiescroto ${lado}`, group: 'orgaos' as const, module: escrotoSideModule(lado, CATEGORIA, true) },
  { id: `doppler_${lado}`, label: `Doppler · ${lado}`, group: 'orgaos' as const, module: dopplerModule(lado) },
])

export const bolsaTesticularDoppler: ExamCategory = {
  id: CATEGORIA,
  name: 'Bolsa testicular com Doppler',
  title: 'ULTRASSONOGRAFIA DA BOLSA TESTICULAR COM DOPPLER COLORIDO E ESPECTRAL',
  tecnica: '',
  resolveTecnica: opts => {
    const lados = ladosDoExame(opts)
    const alcance = lados.length === 2 ? 'todo o conteúdo escrotal' : `o hemiescroto ${lados[0]}`
    return `Exame realizado com transdutor linear de alta frequência, abrangendo ${alcance}, com avaliação em modo B e ao Doppler colorido e espectral dos testículos e epidídimos. Posição e manobra da pesquisa de varicocele, quando realizada, estão descritas nos achados.`
  },
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections,
  controls: [
    select('modelo', 'Modelo de partida', [['em_branco', 'Em branco'], ['normal', 'Normal — perfusão e fluxo epididimário habituais, plexo de calibre normal']]),
    select('lateralidade', 'Lateralidade', [['bilateral', 'Bilateral'], ['direito', 'Direito'], ['esquerdo', 'Esquerdo']]),
  ],
  resolveSections: opts => {
    const lados = ladosDoExame(opts)
    return sections.filter(section => lados.some(lado => section.id.endsWith(`_${lado}`)))
  },
  /**
   * Com o estado inteiro: acrescenta hipóteses confirmadas e, sem achados, monta a
   * normalidade só do que foi documentado (varicocele negada exige pesquisa).
   */
  resolveConclusionItems: (items, state) => {
    const opts = state.__opts ?? {}
    const lados = ladosDoExame(opts)
    const hipoteses = lados.flatMap(lado => {
      const hipotese = texto(state[`doppler_${lado}`] ?? {}, 'hipotese') || 'nenhuma'
      return hipotese !== 'nenhuma' && hipoteseIssues(state, lado).length === 0 ? [HIPOTESE_TEXTO[hipotese]!(lado)] : []
    })
    if (items.length || hipoteses.length) return [...items, ...hipoteses]
    const plural = lados.length === 2
    const alvo = plural ? 'Testículos' : `Testículo ${lados[0]}`
    const normais: string[] = [`${alvo} ecograficamente ${plural ? 'normais' : 'normal'}, com perfusão preservada ao Doppler colorido.`]
    if (lados.every(lado => resolver(state[`doppler_${lado}`] ?? {}, opts).epididimo === 'preservado')) {
      normais.push(plural ? 'Epidídimos ecograficamente normais, com vascularização habitual.' : `Epidídimo ${lados[0]} ecograficamente normal, com vascularização habitual.`)
    }
    const plexos = lados.map(lado => resolver(state[`doppler_${lado}`] ?? {}, opts).plexo)
    if (plexos.every(p => p === 'pesquisa')) normais.push('Sem sinais de varicocele à pesquisa com Doppler.')
    else if (plexos.every(p => p !== 'nao_avaliado')) normais.push(`Veias ${plural ? 'dos plexos pampiniformes' : `do plexo pampiniforme ${lados[0]}`} de calibre normal.`)
    return normais
  },
  conclusionNormal: '',
  conclusionClosing: 'Demais estruturas escrotais examinadas sem evidência de alterações ecográficas.',
}
