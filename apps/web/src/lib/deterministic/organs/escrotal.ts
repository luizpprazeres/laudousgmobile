/**
 * Categoria ESCROTAL — formulário estruturado Web (composição local).
 * Fontes: packages/knowledge/snippets/ESCROTAL (modelo-base, regras de
 * varicocele, hidrocele, microlitíase, nódulo, cisto de epidídimo) e
 * tmp-review/golden-bootstrap-2026-07-23/ESCROTAL.md.
 *
 * Um módulo por hemiescroto: testículo, epidídimo, plexo pampiniforme e
 * hidrocele saem sempre com o lado da seção. Diagnóstico só com critério
 * documentado: varicocele exige calibre acima do limiar ou refluxo; nódulo e
 * cisto exigem medidas; microlitíase exige a contagem de focos.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { FALTANDO, pendencia, marcado, medida, medidas, texto, valorNumerico, type Lado } from './superficialShared'

const FEM: Record<Lado, string> = { direito: 'direita', esquerdo: 'esquerda' }

const TERCO: Record<string, string> = { superior: 'terço superior', medio: 'terço médio', inferior: 'terço inferior' }
const ECO: Record<string, string> = { hipoecoica: 'hipoecoica', hiperecoica: 'hiperecoica', mista: 'de ecogenicidade mista' }
const PORCAO: Record<string, string> = { cabeca: 'cabeça', corpo: 'corpo', cauda: 'cauda' }
const VOLUME_HIDROCELE: Record<string, string> = { pequeno: 'de pequeno volume', moderado: 'de moderado volume', volumoso: 'volumosa' }

/** Limiares da regra de varicocele do repositório (mm). */
const VARICOCELE_REPOUSO_MM = 3.0
const VARICOCELE_VALSALVA_MM = 3.5

function testiculo(st: OrganState, lado: Lado, linhas: string[], conclusion: string[], pendencias: PendenciaLocal[], doppler: boolean) {
  const dims = medidas(st.medidas)
  const medindo = dims ? ` medindo ${dims},` : ''
  const parenquima = texto(st, 'parenquima')
  const ladoF = FEM[lado]

  if (parenquima === 'nao_identificado') {
    linhas.push(`Testículo ${lado} não identificado na bolsa escrotal durante o presente estudo.`)
    conclusion.push(`Testículo ${lado} não identificado na bolsa escrotal. Convém, a critério clínico, correlacionar com avaliação urológica.`)
    return
  }
  if (parenquima === 'microlitiase') {
    // Na variante com Doppler, a perfusão sai do bloco Doppler — o modo B não a afirma.
    linhas.push(`Testículo ${lado}${medindo} apresentando ecotextura ${doppler ? 'normal' : 'e vascularização normais'}.`)
    const grau = texto(st, 'parenquima.microlitiase.grau')
    const focos = grau === 'classica' ? '5 ou mais focos por campo' : grau === 'limitada' ? 'menos de 5 focos por campo' : `${FALTANDO} focos por campo`
    linhas.push(`Imagens hiperecoicas puntiformes, que não ocasionam sombra acústica, distribuídas pelo parênquima do testículo ${lado}, totalizando ${focos}.`)
    if (grau === 'classica') conclusion.push(`Microlitíase testicular à ${ladoF}. Convém, a critério clínico, seguimento ultrassonográfico periódico.`)
    else if (grau === 'limitada') conclusion.push(`Focos hiperecoicos puntiformes esparsos no testículo ${lado}, em número inferior a 5 por campo.`)
    else pendencias.push(pendencia(`focos hiperecoicos no testículo ${lado}`, ['número de focos por campo']))
    return
  }
  if (parenquima === 'nodulo') {
    const p = 'parenquima.nodulo.'
    const terco = TERCO[texto(st, `${p}terco`)]
    const eco = ECO[texto(st, `${p}eco`)] ?? 'hipoecoica'
    const margens = texto(st, `${p}margens`) === 'irregulares' ? 'margens irregulares' : 'margens regulares'
    const nod = medidas(st[`${p}medidas`])
    const vasc = texto(st, `${p}vasc`)
    const vascTexto = vasc === 'presente' ? ', apresentando vascularização própria ao Doppler colorido'
      : vasc === 'ausente' ? ', sem vascularização própria ao Doppler colorido' : ''
    linhas.push(`Testículo ${lado}${medindo} ${doppler ? 'com parênquima restante de aspecto habitual' : 'apresentando vascularização preservada no parênquima restante'}.`)
    linhas.push(`No ${terco ?? `${FALTANDO} terço`} do testículo ${lado}, observa-se imagem sólida ${eco}, com ${margens}, medindo ${nod ?? FALTANDO}${vascTexto}.`)
    const faltando = [!terco && 'terço', !nod && 'medidas'].filter(Boolean) as string[]
    if (faltando.length) pendencias.push(pendencia(`imagem sólida no testículo ${lado}`, faltando))
    else conclusion.push(`Nódulo sólido no ${terco} do testículo ${lado}, medindo ${nod}. Convém, a critério clínico, correlacionar com exame físico, dosagem de marcadores tumorais (alfa-fetoproteína, beta-HCG, LDH) e avaliação urológica complementar.`)
    return
  }
  linhas.push(`Testículo ${lado}${medindo} apresentando ecogenicidade${doppler ? ' e ecotextura normais' : ', ecotextura e vascularização normais'}.`)
}

function epididimo(st: OrganState, lado: Lado, linhas: string[], conclusion: string[], pendencias: PendenciaLocal[]) {
  const estado = texto(st, 'epididimo')
  if (estado === 'cisto') {
    const p = 'epididimo.cisto.'
    const porcao = PORCAO[texto(st, `${p}porcao`)] ?? 'cabeça'
    const espermatocele = texto(st, `${p}tipo`) === 'espermatocele'
    const tamanho = medida(st[`${p}medida`])
    const conteudo = espermatocele ? 'com ecos puntiformes finos em suspensão' : 'anecoica'
    linhas.push(`Na ${porcao} do epidídimo ${lado}, observa-se imagem cística ${conteudo}, de paredes finas e contornos regulares, medindo ${tamanho ?? FALTANDO} no maior eixo.`)
    if (!tamanho) pendencias.push(pendencia(`imagem cística no epidídimo ${lado}`, ['medida']))
    else conclusion.push(`${espermatocele ? 'Espermatocele' : 'Cisto'} da ${porcao} do epidídimo ${lado}, medindo ${tamanho}.`)
    return
  }
  if (estado === 'aumentado') {
    const hiper = marcado(st, 'epididimo.aumentado.hipervascular', 'sim')
    linhas.push(`Epidídimo ${lado} de dimensões aumentadas e ecotextura heterogênea${hiper ? ', com aumento da vascularização ao Doppler colorido' : ''}.`)
    conclusion.push(`Epidídimo ${lado} aumentado${hiper ? ' e hipervascularizado' : ''}. Correlacionar com dados clínicos.`)
    return
  }
  linhas.push(`Cabeça do epidídimo ${lado} apresentando contornos regulares e ecotextura homogênea.`)
}

function plexo(st: OrganState, lado: Lado, linhas: string[], conclusion: string[], pendencias: PendenciaLocal[]) {
  if (texto(st, 'plexo') !== 'dilatado') {
    linhas.push(`Veias do plexo pampiniforme ${lado} de calibres normais.`)
    return
  }
  const p = 'plexo.dilatado.'
  const repouso = medida(st[`${p}repouso`], 'mm')
  const valsalva = medida(st[`${p}valsalva`], 'mm')
  const refluxo = texto(st, `${p}refluxo`)
  const calibres = [repouso && `${repouso} em repouso`, valsalva && `${valsalva} à manobra de Valsalva`].filter(Boolean).join(' e ')
  const refluxoTexto = refluxo === 'presente' ? ', com refluxo venoso ao Doppler espectral à manobra de Valsalva'
    : refluxo === 'ausente' ? ', sem refluxo venoso ao Doppler espectral' : ''
  linhas.push(`Imagens anecoicas tubulares na topografia do plexo pampiniforme ${lado}, com calibre de até ${calibres || FALTANDO}${refluxoTexto}.`)

  const ladoF = FEM[lado]
  if (!calibres) {
    pendencias.push(pendencia(`plexo pampiniforme ${lado}`, ['calibre em repouso ou à Valsalva']))
    return
  }
  const r = valorNumerico(st[`${p}repouso`])
  const v = valorNumerico(st[`${p}valsalva`])
  // valorNumerico ignora unidade: os campos são rotulados em mm; se vier em cm, não aplica limiar.
  const emCm = /cm/i.test(`${st[`${p}repouso`] ?? ''}${st[`${p}valsalva`] ?? ''}`)
  const criterio = refluxo === 'presente' || (!emCm && ((r !== null && r > VARICOCELE_REPOUSO_MM) || (v !== null && v > VARICOCELE_VALSALVA_MM)))
  if (criterio) conclusion.push(`Varicocele à ${ladoF}.`)
  else pendencias.push(pendencia(`plexo pampiniforme ${lado}`, [`refluxo ou calibre acima de 3,0 mm em repouso / 3,5 mm à Valsalva (critério de varicocele)`]))
}

function hidrocele(st: OrganState, lado: Lado, linhas: string[], conclusion: string[]) {
  if (texto(st, 'hidrocele') !== 'presente') {
    linhas.push(`Ausência de coleção líquida significativa no hemiescroto ${lado}.`)
    return
  }
  const volume = VOLUME_HIDROCELE[texto(st, 'hidrocele.presente.volume')]
  const complexa = marcado(st, 'hidrocele.presente.complexa', 'sim')
  linhas.push(complexa
    ? `Coleção líquida entre os folhetos da túnica vaginal à ${FEM[lado]}, com septações e/ou ecos em suspensão.`
    : `Imagens anecoicas entre os folhetos da túnica vaginal à ${FEM[lado]}, envolvendo o testículo, sem septações.`)
  conclusion.push(complexa
    ? `Hidrocele complexa à ${FEM[lado]}${volume ? `, ${volume}` : ''}. Correlacionar com dados clínicos.`
    : `Hidrocele à ${FEM[lado]}${volume ? `, ${volume}` : ''}.`)
}

/**
 * Hemiescroto em modo B. Reutilizado por BOLSA_TESTICULAR_DOPPLER com `doppler`:
 * perfusão, fluxo epididimário e pesquisa de varicocele passam ao bloco Doppler,
 * então este módulo deixa de afirmar vascularização e de compor o plexo.
 */
export function escrotoSideModule(lado: Lado, category = 'ESCROTAL', doppler = false): OrganModule {
  const fields: Field[] = [
    { key: 'medidas', label: `Testículo ${lado} — medidas (cm)`, kind: 'text', placeholder: '3,7 x 1,9 x 2,7' },
    {
      key: 'parenquima',
      label: 'Parênquima testicular',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'microlitiase', label: 'Microlitíase', subFields: [
          { key: 'grau', label: 'Focos por campo', kind: 'mini-segmented', options: [
            { value: 'nao_informado', label: 'Não informado', isDefault: true },
            { value: 'limitada', label: 'Menos de 5' },
            { value: 'classica', label: '5 ou mais' },
          ] },
        ] },
        { value: 'nodulo', label: 'Nódulo', subFields: [
          { key: 'terco', label: 'Terço', kind: 'mini-segmented', options: [
            { value: 'nao_informado', label: 'Não informado', isDefault: true },
            { value: 'superior', label: 'Superior' },
            { value: 'medio', label: 'Médio' },
            { value: 'inferior', label: 'Inferior' },
          ] },
          { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '1,2 x 0,9 x 1,1' },
          { key: 'eco', label: 'Ecogenicidade', kind: 'mini-segmented', options: [
            { value: 'hipoecoica', label: 'Hipoecoica', isDefault: true },
            { value: 'hiperecoica', label: 'Hiperecoica' },
            { value: 'mista', label: 'Mista' },
          ] },
          { key: 'margens', label: 'Margens', kind: 'mini-segmented', options: [
            { value: 'regulares', label: 'Regulares', isDefault: true },
            { value: 'irregulares', label: 'Irregulares' },
          ] },
          { key: 'vasc', label: 'Vascularização própria', kind: 'mini-segmented', options: [
            { value: 'nao_avaliada', label: 'Não informada', isDefault: true },
            { value: 'presente', label: 'Presente' },
            { value: 'ausente', label: 'Ausente' },
          ] },
        ] },
        { value: 'nao_identificado', label: 'Não identificado na bolsa' },
      ],
    },
    {
      key: 'epididimo',
      label: 'Epidídimo',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'cisto', label: 'Cisto / espermatocele', subFields: [
          { key: 'porcao', label: 'Porção', kind: 'mini-segmented', options: [
            { value: 'cabeca', label: 'Cabeça', isDefault: true },
            { value: 'corpo', label: 'Corpo' },
            { value: 'cauda', label: 'Cauda' },
          ] },
          { key: 'tipo', label: 'Conteúdo', kind: 'mini-segmented', options: [
            { value: 'cisto', label: 'Anecoico (cisto)', isDefault: true },
            { value: 'espermatocele', label: 'Ecos finos (espermatocele)' },
          ] },
          { key: 'medida', label: 'Maior eixo (cm)', kind: 'text', placeholder: '0,8' },
        ] },
        { value: 'aumentado', label: 'Aumentado', subFields: doppler ? [] : [
          { key: 'hipervascular', label: 'Doppler', kind: 'checklist', options: [{ value: 'sim', label: 'Vascularização aumentada' }] },
        ] },
      ],
    },
    ...(doppler ? [] : [{
      key: 'plexo',
      label: 'Plexo pampiniforme',
      kind: 'segmented',
      hint: 'default: calibres normais',
      options: [
        { value: 'normal', label: 'Calibres normais', isDefault: true },
        { value: 'dilatado', label: 'Veias dilatadas', subFields: [
          { key: 'repouso', label: 'Calibre em repouso (mm)', kind: 'text', placeholder: '3,2', halfWidth: true },
          { key: 'valsalva', label: 'Calibre à Valsalva (mm)', kind: 'text', placeholder: '3,8', halfWidth: true },
          { key: 'refluxo', label: 'Refluxo à Valsalva', kind: 'mini-segmented', options: [
            { value: 'nao_avaliado', label: 'Não informado', isDefault: true },
            { value: 'presente', label: 'Presente' },
            { value: 'ausente', label: 'Ausente' },
          ] },
        ] },
      ],
    } satisfies Field]),
    {
      key: 'hidrocele',
      label: 'Hidrocele',
      kind: 'segmented',
      hint: 'default: ausente',
      options: [
        { value: 'ausente', label: 'Ausente', isDefault: true },
        { value: 'presente', label: 'Presente', subFields: [
          { key: 'volume', label: 'Volume', kind: 'mini-segmented', options: [
            { value: 'nao_informado', label: 'Não informado', isDefault: true },
            { value: 'pequeno', label: 'Pequeno' },
            { value: 'moderado', label: 'Moderado' },
            { value: 'volumoso', label: 'Volumoso' },
          ] },
          { key: 'complexa', label: 'Aspecto', kind: 'checklist', options: [{ value: 'sim', label: 'Septações / ecos em suspensão' }] },
        ] },
      ],
    },
  ]
  return {
    schema: { id: `escroto_${lado}`, name: `Hemiescroto ${lado}`, category, fields },
    initialState: (): OrganState => ({
      medidas: '',
      parenquima: 'normal',
      'parenquima.microlitiase.grau': 'nao_informado',
      'parenquima.nodulo.terco': 'nao_informado',
      'parenquima.nodulo.medidas': '',
      'parenquima.nodulo.eco': 'hipoecoica',
      'parenquima.nodulo.margens': 'regulares',
      'parenquima.nodulo.vasc': 'nao_avaliada',
      epididimo: 'normal',
      'epididimo.cisto.porcao': 'cabeca',
      'epididimo.cisto.tipo': 'cisto',
      'epididimo.cisto.medida': '',
      'epididimo.aumentado.hipervascular': [],
      plexo: 'normal',
      'plexo.dilatado.repouso': '',
      'plexo.dilatado.valsalva': '',
      'plexo.dilatado.refluxo': 'nao_avaliado',
      hidrocele: 'ausente',
      'hidrocele.presente.volume': 'nao_informado',
      'hidrocele.presente.complexa': [],
    }),
    compose: (st): OrganComposition => {
      const linhas: string[] = []
      const conclusion: string[] = []
      const pendencias: PendenciaLocal[] = []
      testiculo(st, lado, linhas, conclusion, pendencias, doppler)
      epididimo(st, lado, linhas, conclusion, pendencias)
      if (!doppler) plexo(st, lado, linhas, conclusion, pendencias)
      hidrocele(st, lado, linhas, conclusion)
      return { body: linhas.join('\n'), conclusion, pendencias, isNormal: conclusion.length === 0 && pendencias.length === 0 }
    },
  }
}

export const escrotal: ExamCategory = {
  id: 'ESCROTAL',
  name: 'Escrotal',
  title: 'ULTRASSONOGRAFIA DA BOLSA ESCROTAL COM DOPPLER COLORIDO',
  tecnica:
    'Exame realizado com transdutor de 12 MHz, abrangendo todo o conteúdo escrotal. Foram realizados múltiplos cortes dos epidídimos, dos testículos e dos plexos pampiniformes. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias. Exame realizado com o paciente em ortostase e com manobra de Valsalva.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'escroto_direito', label: 'Hemiescroto direito', group: 'orgaos', module: escrotoSideModule('direito') },
    { id: 'escroto_esquerdo', label: 'Hemiescroto esquerdo', group: 'orgaos', module: escrotoSideModule('esquerdo') },
  ],
  conclusionNormal:
    '1. Testículos ecograficamente normais.\n2. Cabeças dos epidídimos ecograficamente normais.\n3. Não há sinais evidentes de varicocele.',
  conclusionClosing: 'Demais estruturas escrotais examinadas sem evidência de alterações ecográficas.',
}
