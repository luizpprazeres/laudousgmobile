/**
 * Categoria HISTEROSSONOGRAFIA — formulário estruturado Web (composição local, MVP).
 *
 * Referência de cobertura: docs/competitor-research/laudario/crosswalk-histerossonografia-2026-10-03.md
 * (só o escopo; a redação é própria). Procedimento, canal, cavidade, lesões
 * individualizadas e recomendação são seções separadas. Distensão, resultado da
 * cavidade, número de lesões e modo de aquisição ficam nos controles, para que
 * todas as seções enxerguem a mesma qualidade do exame.
 *
 * Regras de segurança:
 * - normalidade da cavidade só com distensão adequada; distensão parcial
 *   restringe a conclusão aos segmentos avaliados; falha não admite cavidade avaliada;
 * - lesão sem topografia e medidas bloqueia o laudo; diagnóstico nominal
 *   (pólipo, mioma, sinéquia, istmocele, malformação) só com confirmação médica;
 * - FIGO só com componente intramural informado; malformação só é classificada
 *   com aquisição 3D; recomendação só entra confirmada e coerente com o exame;
 * - cateter e volume nunca são preenchidos por padrão.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { medidas, texto, valorNumerico } from './superficialShared'

const CATEGORIA = 'HISTEROSSONOGRAFIA'
const MAX_LESOES = 3

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const campo = (key: string, label: string, placeholder: string, halfWidth = false): Field => ({ key, label, kind: 'text', placeholder, ...(halfWidth ? { halfWidth } : {}) })
const CONFIRMA = [['nao', 'Pendente de confirmação'], ['sim', 'Confirmado pelo médico']] as const
const PAREDES = [['nao_informada', 'Não informada'], ['anterior', 'Anterior'], ['posterior', 'Posterior'], ['fundica', 'Fúndica'], ['lateral_direita', 'Lateral direita'], ['lateral_esquerda', 'Lateral esquerda']] as const
const PAREDE_TEXTO: Record<string, string> = { anterior: 'parede anterior', posterior: 'parede posterior', fundica: 'parede fúndica', lateral_direita: 'parede lateral direita', lateral_esquerda: 'parede lateral esquerda' }

type Distensao = 'nao_informada' | 'adequada' | 'parcial' | 'insuficiente' | 'falha'
type Cavidade = 'nao_informada' | 'sem_alteracoes' | 'com_achados' | 'nao_avaliada'

/** Controles com 'modelo' herdam o modelo de partida; cateter e volume nunca. */
export function resolverControles(opts: OrganState) {
  const normal = texto(opts, 'modelo') === 'normal'
  const pick = <T extends string>(key: string, normalValue: T, blank: T): T => {
    const raw = texto(opts, key) || 'modelo'
    return (raw === 'modelo' ? (normal ? normalValue : blank) : raw) as T
  }
  return {
    normal,
    distensao: pick<Distensao>('distensao', 'adequada', 'nao_informada'),
    cavidade: pick<Cavidade>('cavidade', 'sem_alteracoes', 'nao_informada'),
    modo: pick<'2d' | '3d'>('modo', '2d', '2d'),
    lesoes: Math.min(MAX_LESOES, Math.max(1, Number(texto(opts, 'lesoes')) || 1)),
  }
}
const fromModel = (st: OrganState, opts: OrganState, key: string, normalValue: string, blank: string) => {
  const raw = texto(st, key) || 'modelo'
  return raw === 'modelo' ? (resolverControles(opts).normal ? normalValue : blank) : raw
}
const frase = (s: string) => `${s.trim().replace(/[.;,:\s]+$/u, '')}`
const eixos = (raw: unknown) => String(raw ?? '').split(/\s*[x×]\s*/i).filter(Boolean).length
function moduleWith(id: string, name: string, fields: Field[], compose: OrganModule['compose'], extraInitial: OrganState = {}): OrganModule {
  return {
    schema: { id, name, category: CATEGORIA, fields },
    initialState: () => ({ ...Object.fromEntries(fields.map(f => [f.key, f.options?.find(o => o.isDefault)?.value ?? ''])), ...extraInitial }),
    compose,
  }
}
const resultado = (linhas: string[], conclusion: string[], pendencias: PendenciaLocal[], normal = conclusion.length === 0): OrganComposition =>
  ({ body: linhas.join('\n'), conclusion, pendencias, isNormal: normal && pendencias.length === 0 })

// ── Procedimento ──────────────────────────────────────────────────────────────
const procedimento = moduleWith('procedimento', 'Técnica e qualidade', [
  select('cateterizacao', 'Cateterização do canal', [['modelo', 'Conforme modelo'], ['realizada', 'Realizada'], ['nao_obtida', 'Não obtida']]),
  campo('cateter', 'Cateter (tipo/calibre, se informado)', 'Ex.: cateter de balão 5 Fr', true),
  campo('volume_ml', 'Volume infundido (mL, se informado)', '10', true),
  select('solucao', 'Solução', [['modelo', 'Conforme modelo'], ['salina', 'Soro fisiológico 0,9%'], ['nao_informada', 'Não informada']]),
  { key: 'condicoes', label: 'Condições técnicas', kind: 'segmented', presentation: 'select', options: [
    { value: 'modelo', label: 'Conforme modelo', isDefault: true },
    { value: 'adequadas', label: 'Adequadas' },
    { value: 'limitadas', label: 'Limitadas', subFields: [campo('motivo', 'Motivo', 'Ex.: útero em retroversão acentuada')] },
  ] },
  select('intercorrencia', 'Intercorrência', [['nenhuma', 'Nenhuma registrada'], ['dor', 'Dor relevante'], ['reacao_vagal', 'Reação vagal'], ['sangramento', 'Sangramento'], ['refluxo', 'Refluxo da solução pelo colo']]),
  { key: 'interrupcao', label: 'Procedimento interrompido', kind: 'segmented', presentation: 'select', options: [
    { value: 'nao', label: 'Não', isDefault: true },
    { value: 'sim', label: 'Sim', subFields: [campo('motivo', 'Motivo da interrupção', 'Ex.: intolerância da paciente')] },
  ] },
], (st, opts = {}) => {
  const c = resolverControles(opts)
  const linhas: string[] = []
  const conclusion: string[] = []
  const pendencias: PendenciaLocal[] = []
  const cateterizacao = fromModel(st, opts, 'cateterizacao', 'realizada', 'nao_informada')
  const solucao = fromModel(st, opts, 'solucao', 'salina', 'nao_informada')
  const condicoes = fromModel(st, opts, 'condicoes', 'adequadas', 'nao_informada')
  const cateter = texto(st, 'cateter').trim()
  const volumeRaw = texto(st, 'volume_ml').trim()
  const volume = volumeRaw ? valorNumerico(volumeRaw) : null
  if (volumeRaw && volume === null) pendencias.push({ onde: 'Técnica', motivo: 'volume infundido inválido' })
  if (cateterizacao === 'nao_informada') pendencias.push({ onde: 'Técnica', motivo: 'informe se a cateterização do canal foi realizada' })
  if (cateterizacao === 'nao_obtida' && c.distensao !== 'falha') pendencias.push({ onde: 'Técnica', motivo: 'sem cateterização, a distensão deve ser registrada como não obtida' })
  if (cateterizacao === 'realizada') {
    const sol = solucao === 'salina' ? 'soro fisiológico 0,9%' : 'solução'
    linhas.push(`Procedimento: cateterização do canal cervical${cateter ? ` com ${frase(cateter)}` : ''} e infusão de ${volume !== null ? `${volumeRaw.replace('.', ',')} mL de ` : ''}${sol}, sob controle ultrassonográfico, com aquisição ${c.modo === '3d' ? 'bidimensional e tridimensional' : 'bidimensional'}.`)
  }
  if (cateterizacao === 'nao_obtida') linhas.push('Procedimento: não foi possível a cateterização do canal cervical.')
  if (condicoes === 'nao_informada') pendencias.push({ onde: 'Técnica', motivo: 'informe as condições técnicas' })
  if (condicoes === 'limitadas') {
    const motivo = texto(st, 'condicoes.limitadas.motivo').trim()
    if (!motivo) pendencias.push({ onde: 'Técnica', motivo: 'descreva a limitação das condições técnicas' })
    else linhas.push(`Condições técnicas limitadas: ${frase(motivo).charAt(0).toLowerCase()}${frase(motivo).slice(1)}.`)
  }
  const INTERCORRENCIA: Record<string, string> = { dor: 'dor relevante durante a infusão', reacao_vagal: 'reação vagal', sangramento: 'sangramento', refluxo: 'refluxo da solução pelo orifício cervical' }
  const intercorrencia = INTERCORRENCIA[texto(st, 'intercorrencia')]
  if (intercorrencia) linhas.push(`Intercorrência: ${intercorrencia}.`)
  if (texto(st, 'interrupcao') === 'sim') {
    const motivo = texto(st, 'interrupcao.sim.motivo').trim()
    if (!motivo) pendencias.push({ onde: 'Técnica', motivo: 'descreva o motivo da interrupção' })
    else {
      linhas.push(`Procedimento interrompido: ${frase(motivo).charAt(0).toLowerCase()}${frase(motivo).slice(1)}.`)
      conclusion.push(`Procedimento interrompido (${frase(motivo).charAt(0).toLowerCase()}${frase(motivo).slice(1)}).`)
    }
  }
  return resultado(linhas, conclusion, pendencias)
}, { 'condicoes.limitadas.motivo': '', 'interrupcao.sim.motivo': '' })

// ── Canal cervical ────────────────────────────────────────────────────────────
const canal = moduleWith('canal', 'Canal cervical', [
  { key: 'canal', label: 'Canal endocervical', kind: 'segmented', presentation: 'select', options: [
    { value: 'modelo', label: 'Conforme modelo', isDefault: true },
    { value: 'nao_avaliado', label: 'Não avaliado' },
    { value: 'pervio', label: 'Pérvio' },
    { value: 'dificuldade', label: 'Progressão do cateter com dificuldade' },
    { value: 'estenose', label: 'Calibre reduzido', subFields: [select('confirmado', 'Confirmação médica de estenose', CONFIRMA)] },
    { value: 'lesao', label: 'Imagem focal', subFields: [campo('medidas', 'Medidas (cm)', '0,6 x 0,4')] },
  ] },
], (st, opts = {}) => {
  const linhas: string[] = []
  const conclusion: string[] = []
  const pendencias: PendenciaLocal[] = []
  const estado = fromModel(st, opts, 'canal', 'pervio', 'nao_informado')
  if (estado === 'nao_informado') pendencias.push({ onde: 'Canal cervical', motivo: 'informe a avaliação do canal endocervical' })
  if (estado === 'nao_avaliado') linhas.push('Canal endocervical não avaliado.')
  if (estado === 'pervio') linhas.push('Canal endocervical pérvio, sem imagens focais.')
  if (estado === 'dificuldade') linhas.push('Progressão do cateter pelo canal endocervical com dificuldade técnica.')
  if (estado === 'estenose') {
    linhas.push('Canal endocervical de calibre reduzido, com dificuldade à progressão do cateter.')
    if (texto(st, 'canal.estenose.confirmado') === 'sim') conclusion.push('Estenose do canal endocervical.')
  }
  if (estado === 'lesao') {
    const m = medidas(st['canal.lesao.medidas'])
    if (!m) pendencias.push({ onde: 'Canal cervical', motivo: 'informe as medidas da imagem focal' })
    else {
      linhas.push(`Imagem focal no canal endocervical, medindo ${m}.`)
      conclusion.push(`Imagem focal no canal endocervical, medindo ${m}.`)
    }
  }
  return resultado(linhas, conclusion, pendencias)
}, { 'canal.estenose.confirmado': 'nao', 'canal.lesao.medidas': '' })

// ── Cavidade ──────────────────────────────────────────────────────────────────
const cavidade = moduleWith('cavidade', 'Cavidade endometrial', [
  campo('segmentos', 'Segmentos avaliados (se distensão parcial/insuficiente)', 'Ex.: corpo e fundo'),
  campo('motivo', 'Motivo da limitação da distensão', 'Ex.: refluxo da solução pelo colo'),
], (st, opts = {}) => {
  const c = resolverControles(opts)
  const linhas: string[] = []
  const conclusion: string[] = []
  const pendencias: PendenciaLocal[] = []
  const segmentos = frase(texto(st, 'segmentos'))
  const motivo = frase(texto(st, 'motivo'))
  const motivoTexto = motivo ? ` (${motivo.charAt(0).toLowerCase()}${motivo.slice(1)})` : ''
  if (c.distensao === 'nao_informada') pendencias.push({ onde: 'Cavidade endometrial', motivo: 'informe a qualidade da distensão' })
  if (c.cavidade === 'nao_informada') pendencias.push({ onde: 'Cavidade endometrial', motivo: 'informe o resultado da cavidade' })
  if (pendencias.length) return resultado(linhas, conclusion, pendencias)
  if (c.distensao === 'falha') {
    if (c.cavidade !== 'nao_avaliada') pendencias.push({ onde: 'Cavidade endometrial', motivo: 'sem distensão, a cavidade deve constar como não avaliada' })
    linhas.push(`Não foi obtida distensão da cavidade endometrial${motivoTexto}.`)
    conclusion.push(`Cavidade endometrial não avaliada ao método, por não ter sido obtida a distensão${motivoTexto}.`)
    return resultado(linhas, conclusion, pendencias, false)
  }
  if (c.cavidade === 'nao_avaliada') {
    pendencias.push({ onde: 'Cavidade endometrial', motivo: 'com distensão obtida, registre o resultado da cavidade' })
    return resultado(linhas, conclusion, pendencias)
  }
  if (c.distensao === 'adequada') {
    linhas.push(c.cavidade === 'sem_alteracoes'
      ? 'Cavidade endometrial adequadamente distendida, de contornos regulares, sem imagens focais identificáveis.'
      : 'Cavidade endometrial adequadamente distendida.')
    if (c.cavidade === 'sem_alteracoes') conclusion.push('Cavidade endometrial sem alterações identificáveis ao método.')
    return resultado(linhas, conclusion, pendencias, c.cavidade === 'sem_alteracoes')
  }
  // Parcial ou insuficiente: só os segmentos avaliados podem ser descritos.
  if (!segmentos) pendencias.push({ onde: 'Cavidade endometrial', motivo: 'informe os segmentos avaliados com distensão limitada' })
  if (!motivo) pendencias.push({ onde: 'Cavidade endometrial', motivo: 'informe o motivo da limitação da distensão' })
  if (pendencias.length) return resultado(linhas, conclusion, pendencias)
  const grau = c.distensao === 'parcial' ? 'parcial' : 'insuficiente'
  const escopo = segmentos.toLowerCase()
  linhas.push(`Distensão ${grau} da cavidade endometrial${motivoTexto}, com avaliação restrita aos seguintes segmentos: ${escopo}.`)
  if (c.cavidade === 'sem_alteracoes') linhas.push(`Nos segmentos avaliados, não se identificam imagens focais.`)
  conclusion.push(c.cavidade === 'sem_alteracoes'
    ? `Avaliação parcial da cavidade endometrial, por distensão ${grau}; sem imagens focais nos segmentos avaliados (${escopo}).`
    : `Avaliação parcial da cavidade endometrial, por distensão ${grau} (segmentos avaliados: ${escopo}).`)
  return resultado(linhas, conclusion, pendencias, false)
}, {})

// ── Lesões individualizadas ───────────────────────────────────────────────────
function lesaoModule(n: number): OrganModule {
  const p = (tipo: string, key: string) => `tipo.${tipo}.${key}`
  return moduleWith(`lesao_${n}`, `Achado ${n}`, [
    { key: 'tipo', label: `Achado ${n}`, kind: 'segmented', presentation: 'select', options: [
      { value: 'nao_informado', label: 'Selecione o achado', isDefault: true },
      { value: 'polipo', label: 'Imagem focal / pólipo', subFields: [
        select('parede', 'Topografia', PAREDES), campo('medidas', 'Medidas (cm)', '1,2 x 0,7 x 0,5', true),
        select('base', 'Base', [['nao_informada', 'Não informada'], ['sessil', 'Séssil'], ['pediculada', 'Pediculada']]),
        select('doppler', 'Doppler', [['nao_realizado', 'Não realizado'], ['pediculo', 'Pedículo vascular'], ['sem_fluxo', 'Sem fluxo detectável']]),
        select('confirmado', 'Confirmação médica de pólipo', CONFIRMA),
      ] },
      { value: 'mioma', label: 'Mioma submucoso', subFields: [
        select('parede', 'Topografia', PAREDES), campo('medidas', 'Medidas (cm)', '2,0 x 1,8 x 1,6', true),
        select('componente', 'Relação com o miométrio', [['nao_informado', 'Não informada'], ['pediculado', 'Intracavitário pediculado'], ['menor_50', 'Componente intramural < 50%'], ['maior_50', 'Componente intramural ≥ 50%']]),
        select('confirmado', 'Confirmação médica de mioma submucoso', CONFIRMA),
      ] },
      { value: 'sinequia', label: 'Sinéquia', subFields: [
        select('regiao', 'Região', [['nao_informada', 'Não informada'], ['fundica', 'Fúndica'], ['corporal', 'Corporal'], ['istmica', 'Ístmica'], ['cornual', 'Cornual']]),
        campo('medida', 'Espessura ou extensão (mm)', '3', true),
        select('confirmado', 'Confirmação médica de sinéquia', CONFIRMA),
      ] },
      { value: 'istmocele', label: 'Istmocele', subFields: [
        campo('profundidade_mm', 'Profundidade do nicho (mm)', '5', true), campo('residual_mm', 'Miométrio residual (mm)', '4', true),
        select('confirmado', 'Confirmação médica de istmocele', CONFIRMA),
      ] },
      { value: 'malformacao', label: 'Alteração do contorno fúndico / malformação', subFields: [
        campo('indentacao_mm', 'Profundidade da indentação (mm)', '12', true),
        select('classificacao', 'Classificação', [['nao_classificar', 'Não classificar'], ['arqueado', 'Útero arqueado'], ['septado_parcial', 'Útero septado parcial'], ['septado_completo', 'Útero septado completo']]),
        select('confirmado', 'Confirmação médica da classificação', CONFIRMA),
      ] },
    ] },
  ], (st, opts = {}) => {
    const c = resolverControles(opts)
    const linhas: string[] = []
    const conclusion: string[] = []
    const pendencias: PendenciaLocal[] = []
    const onde = `Achado ${n}`
    const tipo = texto(st, 'tipo')
    const confirmado = (t: string) => texto(st, p(t, 'confirmado')) === 'sim'
    if (tipo === 'nao_informado' || !tipo) return resultado(linhas, conclusion, [{ onde, motivo: 'selecione o tipo do achado ou reduza o número de achados' }])
    if (tipo === 'polipo' || tipo === 'mioma') {
      const parede = PAREDE_TEXTO[texto(st, p(tipo, 'parede'))]
      const m = medidas(st[p(tipo, 'medidas')])
      const faltando = [!parede && 'topografia', (!m || eixos(st[p(tipo, 'medidas')]) < 2) && 'ao menos duas medidas'].filter(Boolean)
      if (faltando.length) return resultado(linhas, conclusion, [{ onde, motivo: `informe ${faltando.join(' e ')}` }])
      if (tipo === 'polipo') {
        const base = texto(st, p(tipo, 'base'))
        const doppler = texto(st, p(tipo, 'doppler'))
        linhas.push(`Imagem focal ecogênica intracavitária${base === 'pediculada' ? ', pediculada' : base === 'sessil' ? ', de base séssil' : ''}, na ${parede}, medindo ${m}${doppler === 'pediculo' ? ', com pedículo vascular ao Doppler colorido' : doppler === 'sem_fluxo' ? ', sem fluxo detectável ao Doppler colorido' : ''}.`)
        conclusion.push(confirmado('polipo') ? `Pólipo endometrial na ${parede}, medindo ${m}.` : `Imagem focal intracavitária na ${parede}, medindo ${m}, de natureza não definida ao método.`)
      } else {
        const componente = texto(st, p(tipo, 'componente'))
        const FIGO: Record<string, string> = { pediculado: '0', menor_50: '1', maior_50: '2' }
        const RELACAO: Record<string, string> = { pediculado: ', intracavitária e pediculada', menor_50: ', com componente intramural inferior a 50%', maior_50: ', com componente intramural igual ou superior a 50%' }
        linhas.push(`Imagem nodular sólida hipoecogênica deformando a cavidade endometrial a partir da ${parede}${RELACAO[componente] ?? ''}, medindo ${m}.`)
        conclusion.push(confirmado('mioma')
          ? `Nódulo miomatoso submucoso na ${parede}, medindo ${m}${FIGO[componente] ? ` (FIGO ${FIGO[componente]})` : ''}.`
          : `Imagem nodular sólida com projeção na cavidade endometrial a partir da ${parede}, medindo ${m}.`)
      }
    }
    if (tipo === 'sinequia') {
      const REGIAO: Record<string, string> = { fundica: 'fúndica', corporal: 'corporal', istmica: 'ístmica', cornual: 'cornual' }
      const regiao = REGIAO[texto(st, p(tipo, 'regiao'))]
      const medida = valorNumerico(st[p(tipo, 'medida')])
      const faltando = [!regiao && 'região', medida === null && 'espessura ou extensão'].filter(Boolean)
      if (faltando.length) return resultado(linhas, conclusion, [{ onde, motivo: `informe ${faltando.join(' e ')}` }])
      const mm = String(st[p(tipo, 'medida')]).trim().replace('.', ',').replace(/\s*mm$/i, '')
      linhas.push(`Trave ecogênica atravessando a cavidade endometrial na região ${regiao}, medindo ${mm} mm.`)
      conclusion.push(confirmado('sinequia') ? `Sinéquia uterina na região ${regiao}.` : `Trave ecogênica intracavitária na região ${regiao}.`)
    }
    if (tipo === 'istmocele') {
      const prof = valorNumerico(st[p(tipo, 'profundidade_mm')])
      const residual = valorNumerico(st[p(tipo, 'residual_mm')])
      const faltando = [prof === null && 'profundidade do nicho', residual === null && 'miométrio residual'].filter(Boolean)
      if (faltando.length) return resultado(linhas, conclusion, [{ onde, motivo: `informe ${faltando.join(' e ')}` }])
      const fmt = (k: string) => String(st[p(tipo, k)]).trim().replace('.', ',').replace(/\s*mm$/i, '')
      linhas.push(`Falha de continuidade na parede anterior do istmo uterino, preenchida pela solução, com profundidade de ${fmt('profundidade_mm')} mm e miométrio residual de ${fmt('residual_mm')} mm.`)
      conclusion.push(confirmado('istmocele') ? `Istmocele, com miométrio residual de ${fmt('residual_mm')} mm.` : `Falha de continuidade na parede anterior do istmo uterino, com miométrio residual de ${fmt('residual_mm')} mm.`)
    }
    if (tipo === 'malformacao') {
      const ind = valorNumerico(st[p(tipo, 'indentacao_mm')])
      if (ind === null) return resultado(linhas, conclusion, [{ onde, motivo: 'informe a profundidade da indentação' }])
      const classificacao = texto(st, p(tipo, 'classificacao'))
      const mm = String(st[p(tipo, 'indentacao_mm')]).trim().replace('.', ',').replace(/\s*mm$/i, '')
      const CLASSE: Record<string, string> = { arqueado: 'útero arqueado', septado_parcial: 'útero septado parcial', septado_completo: 'útero septado completo' }
      if (CLASSE[classificacao] && c.modo !== '3d') pendencias.push({ onde, motivo: 'a classificação da malformação exige aquisição tridimensional' })
      if (CLASSE[classificacao] && !confirmado('malformacao')) pendencias.push({ onde, motivo: 'confirme a classificação da malformação' })
      if (pendencias.length) return resultado(linhas, conclusion, pendencias)
      linhas.push(`Indentação do contorno fúndico da cavidade endometrial, com profundidade de ${mm} mm.`)
      conclusion.push(CLASSE[classificacao] ? `Achados compatíveis com ${CLASSE[classificacao]}.` : `Indentação do contorno fúndico da cavidade endometrial, com ${mm} mm.`)
    }
    return resultado(linhas, conclusion, pendencias, false)
  })
}

// ── Recomendação (opt-in) ─────────────────────────────────────────────────────
const recomendacao = moduleWith('recomendacao', 'Recomendação', [
  select('opcao', 'Recomendação', [['nenhuma', 'Nenhuma'], ['histeroscopia', 'Histeroscopia'], ['histologia', 'Histeroscopia com estudo histológico'], ['repetir', 'Repetir o exame'], ['correlacao', 'Correlação clínica']]),
  select('confirmada', 'Confirmação médica da recomendação', CONFIRMA),
], (st, opts = {}) => {
  const c = resolverControles(opts)
  const opcao = texto(st, 'opcao')
  const pendencias: PendenciaLocal[] = []
  if (opcao === 'nenhuma' || !opcao) return resultado([], [], texto(st, 'confirmada') === 'sim' ? [{ onde: 'Recomendação', motivo: 'a confirmação exige uma recomendação selecionada' }] : [])
  if ((opcao === 'histeroscopia' || opcao === 'histologia') && c.cavidade !== 'com_achados') pendencias.push({ onde: 'Recomendação', motivo: 'histeroscopia exige achado intracavitário registrado' })
  if (opcao === 'repetir' && c.distensao === 'adequada') pendencias.push({ onde: 'Recomendação', motivo: 'repetir o exame só se aplica a distensão limitada ou não obtida' })
  if (texto(st, 'confirmada') !== 'sim') pendencias.push({ onde: 'Recomendação', motivo: 'confirme a recomendação ou selecione "Nenhuma"' })
  const TEXTO: Record<string, string> = {
    histeroscopia: 'Convém, a critério clínico, complementação com histeroscopia.',
    histologia: 'Convém, a critério clínico, complementação com histeroscopia e estudo histológico.',
    repetir: 'Convém, a critério clínico, repetir o exame em melhores condições técnicas.',
    correlacao: 'Correlacionar com dados clínicos.',
  }
  return resultado([], pendencias.length ? [] : [TEXTO[opcao]!], pendencias)
})

const lesaoSections: ExamSection[] = Array.from({ length: MAX_LESOES }, (_, i) => ({ id: `lesao_${i + 1}`, label: `Achado ${i + 1}`, group: 'orgaos' as const, module: lesaoModule(i + 1) }))
const sections: ExamSection[] = [
  { id: 'procedimento', label: 'Técnica e qualidade', group: 'orgaos', module: procedimento },
  { id: 'canal', label: 'Canal cervical', group: 'orgaos', module: canal },
  { id: 'cavidade', label: 'Cavidade endometrial', group: 'orgaos', module: cavidade },
  ...lesaoSections,
  { id: 'recomendacao', label: 'Recomendação', group: 'orgaos', module: recomendacao },
]

export const histerossonografia: ExamCategory = {
  id: CATEGORIA,
  name: 'Histerossonografia',
  title: 'HISTEROSSONOGRAFIA',
  tecnica: 'Exame realizado por via transvaginal, com transdutor endocavitário multifrequencial, seguido de distensão da cavidade uterina com infusão de solução sob controle ultrassonográfico, conforme descrito nos achados.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections,
  controls: [
    select('modelo', 'Modelo de partida', [['em_branco', 'Em branco'], ['normal', 'Normal — cateterização, distensão adequada, canal pérvio e cavidade sem alterações']]),
    select('distensao', 'Distensão da cavidade', [['modelo', 'Conforme modelo'], ['adequada', 'Adequada'], ['parcial', 'Parcial'], ['insuficiente', 'Insuficiente'], ['falha', 'Não obtida']]),
    select('cavidade', 'Resultado da cavidade', [['modelo', 'Conforme modelo'], ['sem_alteracoes', 'Sem alterações'], ['com_achados', 'Com achados'], ['nao_avaliada', 'Não avaliada']]),
    select('lesoes', 'Número de achados', [['1', '1'], ['2', '2'], ['3', '3']]),
    select('modo', 'Aquisição', [['modelo', 'Conforme modelo'], ['2d', 'Bidimensional'], ['3d', 'Bidimensional e tridimensional']]),
  ],
  resolveSections: opts => {
    const c = resolverControles(opts)
    return sections.filter(s => {
      if (!s.id.startsWith('lesao_')) return true
      return c.cavidade === 'com_achados' && Number(s.id.slice(6)) <= c.lesoes
    })
  },
  conclusionNormal: 'Cavidade endometrial sem alterações identificáveis ao método.',
}
