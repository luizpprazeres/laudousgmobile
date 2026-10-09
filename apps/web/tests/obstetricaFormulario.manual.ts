/**
 * OBSTÉTRICA Web — datação sem seletor, vitalidade automática pela BCF,
 * placenta direta, líquido com valor único e leitura dos estados antigos.
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import {
  FCF_BRADICARDIA_MAX_BPM,
  FCF_INPUT_MAX_BPM,
  FCF_TAQUICARDIA_MIN_BPM,
  PLACENTA_LOCALIZACOES,
  classificarFcf,
  datacaoObstetricaModule,
  igModule,
  lerLiquidoDaTela,
  lerPlacentaDaTela,
  migrarLiquidoLegado,
  migrarPlacentaLegada,
  obstetrica,
  resolverVitalidadeFetal,
  trocarMetodoLiquido,
} from '../src/lib/deterministic/organs/obstetrica'
import { morfologico } from '../src/lib/deterministic/organs/morfologico'
import { dopplerObstetrico } from '../src/lib/deterministic/organs/dopplerObstetrico'
import { adaptarObstetrica } from '../src/lib/catalog/obstetricaParaCatalogo'
import { calcularIgDaReferencia, datacaoBrutaDaTela, hojeBR, lerDatacaoDaTela, migrarDatacaoLegada } from '../src/lib/ig/computeIG'
import { parseIgDatacaoCrescimento } from '../src/lib/calculators/intergrowthBiometry'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

type Dados = Record<string, unknown>
type Feto = Record<string, unknown>

/** 32 semanas, tudo medido, placenta localizada — o caso que deve renderizar. */
function completo(): ExamState {
  const s = initialExamState(obstetrica)
  s.ig = { ...s.ig, bio_sem: '32', bio_dias: '2', exame_data: '20/06/2026' }
  s.feto = { ...s.feto, bcf: '142' }
  s.biometria = { ...s.biometria, dbp: '82', cc: '295', ca: '285', cf: '62', peso: '1900' }
  s.placenta = { ...s.placenta, localizacao: 'posterior' }
  return s
}
function com(s: ExamState, secao: string, patch: Record<string, string>): ExamState {
  return { ...s, [secao]: { ...(s[secao] ?? {}), ...patch } }
}
const adaptar = (s: ExamState) => adaptarObstetrica(s as Record<string, unknown>)
const bloqueios = (s: ExamState) => adaptar(s).pendencias.filter((p) => p.bloqueia).map((p) => p.onde)
const feto = (s: ExamState) => (adaptar(s).dados.fetos as Feto[])[0]!
function render(s: ExamState): string {
  const a = adaptar(s)
  assert.deepEqual(a.pendencias.filter((p) => p.bloqueia), [])
  const r = renderizarSelecao('OBSTETRICA', 'CLASSICO_COMPLETO', [], a.dados as never)
  assert.ok(r.ok, JSON.stringify(r))
  return r.texto
}

// ── FCF ───────────────────────────────────────────────────────────────────────
test('limites da FCF: ≤110 bradicardia, ≥180 taquicardia, entre eles normal', () => {
  assert.equal(FCF_BRADICARDIA_MAX_BPM, 110)
  assert.equal(FCF_TAQUICARDIA_MIN_BPM, 180)
  assert.equal(classificarFcf(109), 'bradicardia')
  assert.equal(classificarFcf(110), 'bradicardia')
  assert.equal(classificarFcf(111), 'normal')
  assert.equal(classificarFcf(179), 'normal')
  assert.equal(classificarFcf(180), 'taquicardia')
  assert.equal(classificarFcf(181), 'taquicardia')
})

test('Automático é o default e classifica pela BCF no laudo', () => {
  const s = completo()
  assert.equal(s.feto?.vitalidade, 'auto')
  assert.equal(feto(s).bcf_alteracao, null)
  assert.equal(feto(com(s, 'feto', { bcf: '110' })).bcf_alteracao, 'bradicardia')
  assert.equal(feto(com(s, 'feto', { bcf: '111' })).bcf_alteracao, null)
  assert.equal(feto(com(s, 'feto', { bcf: '179' })).bcf_alteracao, null)
  assert.equal(feto(com(s, 'feto', { bcf: '180' })).bcf_alteracao, 'taquicardia')
  assert.match(render(com(s, 'feto', { bcf: '100' })), /Bradicardia fetal/)
})

test('campo vazio não é ausência: BCF vazia no Automático fica pendente', () => {
  const s = com(completo(), 'feto', { bcf: '' })
  assert.deepEqual(bloqueios(s), ['BCF'])
  assert.equal(feto(s).bcf_alteracao, null)
  assert.equal(resolverVitalidadeFetal(s.feto!).alteracao, null)
})

test('erro grosseiro de digitação da BCF bloqueia antes de gerar diagnóstico', () => {
  assert.equal(FCF_INPUT_MAX_BPM, 300)
  const s = com(completo(), 'feto', { bcf: '1450' })
  assert.deepEqual(bloqueios(s), ['BCF'])
  assert.equal(resolverVitalidadeFetal(s.feto!).entradaInvalida, true)
  assert.equal(feto(s).bcf_alteracao, null)
})

test('override médico é explícito e vence a BCF', () => {
  const s = com(completo(), 'feto', { bcf: '150', vitalidade: 'bradicardia' })
  assert.equal(feto(s).bcf_alteracao, 'bradicardia')
  const ausente = com(completo(), 'feto', { bcf: '150', vitalidade: 'ausente' })
  assert.equal(feto(ausente).bcf_alteracao, 'ausente')
  assert.equal(feto(ausente).bcf_bpm, null, 'BCF digitada não atravessa com atividade ausente')
  assert.deepEqual(bloqueios(com(completo(), 'feto', { bcf: '', vitalidade: 'taquicardia' })), [])
  assert.equal(adaptar(s).pendencias.find((p) => !p.bloqueia)?.onde, 'BCF', 'divergência explícita é avisada sem anular o override')
})

test('"Presente" (normal) dos estados antigos equivale ao Automático', () => {
  const s = com(completo(), 'feto', { vitalidade: 'normal', bcf: '100' })
  assert.equal(resolverVitalidadeFetal(s.feto!).modo, 'auto')
  assert.equal(feto(s).bcf_alteracao, 'bradicardia')
  assert.deepEqual(bloqueios(com(s, 'feto', { bcf: '' })), ['BCF'])
})

test('BCF é o primeiro campo do feto e não há opção "Presente"', () => {
  const campos = obstetrica.sections.find((x) => x.id === 'feto')!.module!.schema.fields
  assert.equal(campos[0]!.key, 'bcf')
  const vitalidade = campos.find((f) => f.key === 'vitalidade')!
  assert.deepEqual(vitalidade.options!.map((o) => o.value), ['auto', 'ausente', 'bradicardia', 'taquicardia'])
})

test('dorso vazio não afirma nada; escolhido entra no laudo', () => {
  const campo = obstetrica.sections.find((x) => x.id === 'feto')!.module!.schema.fields.find((f) => f.key === 'dorso')!
  assert.equal(campo.presentation, 'select')
  assert.equal(campo.options![0]!.label, 'Selecionar')
  assert.equal(feto(completo()).dorso, null)
  assert.doesNotMatch(render(completo()), /dorso/i)
  assert.match(render(com(completo(), 'feto', { dorso: 'à esquerda' })), /dorso à esquerda/)
})

test('cordão de exame novo começa em 2 artérias + 1 veia; legado não avaliado não afirma', () => {
  assert.equal(feto(completo()).cordao_vasos, 'tres')
  assert.match(render(completo()), /duas artérias e uma veia/)
  assert.equal(feto(com(completo(), 'feto', { cordao_vasos: 'dois' })).cordao_vasos, 'dois')
  const legado = com(completo(), 'feto', { cordao_vasos: 'nao_avaliado' })
  assert.equal(feto(legado).cordao_vasos, null)
  assert.doesNotMatch(render(legado), /três vasos|duas artérias e uma veia/)
})

// ── Datação ───────────────────────────────────────────────────────────────────
test('data do exame é hoje, gravada no estado inicial e fora da tela', () => {
  const inicial = datacaoObstetricaModule.initialState()
  assert.equal(inicial.exame_data, hojeBR())
  assert.match(String(inicial.exame_data), /^\d{2}\/\d{2}\/\d{4}$/)
  assert.equal(hojeBR(new Date(2026, 0, 5)), '05/01/2026')
  const chaves = datacaoObstetricaModule.schema.fields.map((f) => f.key)
  assert.ok(!chaves.includes('exame_data'))
  assert.ok(!chaves.includes('referencia'), 'sem seletor Nenhuma/US precoce/DUM')
  assert.deepEqual(chaves, ['bio_sem', 'bio_dias', 'dum_data', 'us_data', 'us_ig_sem', 'us_ig_dias'])
})

test('sem referência: nada de DUM ou 1ª US no laudo', () => {
  const d = adaptar(completo()).dados
  assert.equal(d.referencia_fonte, null)
  assert.equal(d.dum, null)
  assert.equal(d.primeira_us_data, null)
  assert.equal(d.data_exame, null)
})

test('DUM sozinha completa entra automaticamente', () => {
  const d = adaptar(com(completo(), 'ig', { dum_data: '01/11/2025' })).dados
  assert.equal(d.referencia_fonte, 'dum')
  assert.equal(d.dum, '01/11/2025')
  assert.equal(d.data_exame, '20/06/2026')
  assert.equal(d.corrigir_ig, true)
})

test('1ª US completa vence a DUM quando as duas estão completas', () => {
  const s = com(completo(), 'ig', { dum_data: '01/11/2025', us_data: '12/01/2026', us_ig_sem: '8', us_ig_dias: '2' })
  const d = adaptar(s).dados
  assert.equal(d.referencia_fonte, 'usg_precoce')
  assert.equal(d.primeira_us_data, '12/01/2026')
  assert.equal(d.primeira_us_ig_semanas, 8)
  assert.equal(d.primeira_us_ig_dias, 2)
  assert.equal(d.dum, '01/11/2025', 'a DUM segue impressa como cabeçalho')
  const growth = parseIgDatacaoCrescimento(s.ig!)
  assert.equal(growth?.source, 'early-ultrasound')
  assert.equal(growth?.examDate, '2026-06-20')
})

test('IG exibida na tela é projetada pela DUM ou pela primeira US', () => {
  assert.deepEqual(
    calcularIgDaReferencia({ tipo: 'dum', dataISO: '2026-01-01' }, '2026-05-30'),
    { semanas: 21, dias: 2 },
  )
  assert.deepEqual(
    calcularIgDaReferencia(
      { tipo: 'us', dataISO: '2026-01-12', ig: { semanas: 8, dias: 2 } },
      '2026-05-30',
    ),
    { semanas: 28, dias: 0 },
  )
})

test('frase local: "Primeira ultrassonografia realizada em ..."', () => {
  const s = com(completo(), 'ig', { us_data: '12/01/2026', us_ig_sem: '8', us_ig_dias: '2' })
  const r = datacaoObstetricaModule.compose(s.ig!)
  assert.match(r.body, /^Primeira ultrassonografia realizada em 12\/01\/2026 com 8 semanas e 2 dias\. Hoje com /)
})

test('referência começada e incompleta bloqueia em vez de sumir', () => {
  assert.deepEqual(bloqueios(com(completo(), 'ig', { us_data: '12/01/2026', us_ig_sem: '8' })), ['Primeira ultrassonografia'])
  assert.deepEqual(bloqueios(com(completo(), 'ig', { dum_data: '31/02/2026' })), ['DUM'])
  assert.deepEqual(bloqueios(com(completo(), 'ig', { dum_data: '21/06/2026' })), ['DUM'], 'DUM posterior ao exame')
  assert.deepEqual(bloqueios(com(completo(), 'ig', { us_data: '12/01/2026', us_ig_sem: '8', us_ig_dias: '9' })), ['Primeira ultrassonografia'])
})

test('estados legados referencia.usg.* e referencia.dum.* continuam lidos', () => {
  const usg = com(completo(), 'ig', {
    exame_data: '',
    referencia: 'usg',
    'referencia.usg.us_data': '12/01/2026',
    'referencia.usg.us_ig_sem': '8',
    'referencia.usg.us_ig_dias': '',
    'referencia.usg.exame_data': '20/06/2026',
    'referencia.usg.corrigir': 'nao',
  })
  const du = adaptar(usg).dados
  assert.equal(du.referencia_fonte, 'usg_precoce')
  assert.equal(du.primeira_us_ig_dias, 0, 'dias em branco valiam zero no formato antigo')
  assert.equal(du.data_exame, '20/06/2026')
  assert.equal(du.corrigir_ig, false, 'o "não corrigir" antigo é preservado')

  const dum = com(completo(), 'ig', {
    exame_data: '',
    referencia: 'dum',
    'referencia.dum.dum_data': '01/11/2025',
    'referencia.dum.exame_data': '20/06/2026',
  })
  assert.equal(adaptar(dum).dados.dum, '01/11/2025')
  assert.equal(parseIgDatacaoCrescimento(dum.ig!)?.source, 'dum')

  // Estado inicial novo (exame = hoje) mesclado com referência antiga: vale a data antiga do exame.
  const misto = com(completo(), 'ig', {
    exame_data: '09/10/2026',
    referencia: 'usg',
    'referencia.usg.us_data': '12/01/2026',
    'referencia.usg.us_ig_sem': '8',
    'referencia.usg.us_ig_dias': '2',
    'referencia.usg.exame_data': '20/06/2026',
  })
  assert.equal(adaptar(misto).dados.data_exame, '20/06/2026')
  assert.equal(parseIgDatacaoCrescimento(misto.ig!)?.examDate, '2026-06-20')

  // "nenhuma" com restos antigos não ressuscita referência.
  const nenhuma = com(completo(), 'ig', { referencia: 'nenhuma', 'referencia.dum.dum_data': '01/11/2025' })
  assert.equal(adaptar(nenhuma).dados.dum, null)
})

test('migração legada: a tela mostra o que o laudo usa e a edição passa às chaves novas', () => {
  const legado = {
    bio_sem: '32', bio_dias: '2', referencia: 'usg',
    'referencia.usg.us_data': '12/01/2026', 'referencia.usg.us_ig_sem': '8',
    'referencia.usg.exame_data': '20/06/2026',
  }
  const bruta = datacaoBrutaDaTela(legado)
  assert.equal(bruta.us_data, '12/01/2026')
  assert.equal(bruta.exame_data, '20/06/2026')
  assert.equal(bruta.legado, true)
  const migrado = migrarDatacaoLegada(legado)
  assert.equal(migrado.referencia, 'nenhuma')
  assert.equal(migrado.us_ig_dias, '0')
  assert.deepEqual(
    { ...lerDatacaoDaTela(migrado), pendencias: [] },
    { ...lerDatacaoDaTela(legado), pendencias: [], corrigir: true },
  )
  // Apagar a US depois de migrar não traz o legado de volta.
  const apagado = { ...migrado, us_data: '', us_ig_sem: '', us_ig_dias: '' }
  assert.equal(lerDatacaoDaTela(apagado).referencia, null)

  const semCorrecao = {
    ...legado,
    'referencia.usg.corrigir': 'nao',
  }
  const migradoSemCorrecao = migrarDatacaoLegada(semCorrecao)
  assert.equal(migradoSemCorrecao.corrigir_referencia, 'nao')
  assert.equal(lerDatacaoDaTela(migradoSemCorrecao).corrigir, false, 'editar não liga a correção de um rascunho antigo')
})

test('referência sem data do exame bloqueia em vez de desaparecer', () => {
  const s = com(completo(), 'ig', {
    exame_data: '', us_data: '12/01/2026', us_ig_sem: '8', us_ig_dias: '2',
  })
  assert.deepEqual(bloqueios(s), ['Primeira ultrassonografia'])
})

test('MORFOLÓGICO segue com a datação antiga (fora desta rodada)', () => {
  assert.equal(morfologico.sections.find((x) => x.id === 'ig')?.module, igModule)
  assert.notEqual(igModule, datacaoObstetricaModule)
})

// ── Biometria ─────────────────────────────────────────────────────────────────
test('biometria segue com DBP, CC, CA, CF e peso', () => {
  const chaves = obstetrica.sections.find((x) => x.id === 'biometria')!.module!.schema.fields.map((f) => f.key)
  assert.deepEqual(chaves, ['dbp', 'cc', 'ca', 'cf', 'peso'])
})

// ── Placenta ──────────────────────────────────────────────────────────────────
test('placenta: sem Normal/Detalhar; localização obrigatória e sem default', () => {
  const campos = obstetrica.sections.find((x) => x.id === 'placenta')!.module!.schema.fields
  assert.deepEqual(campos.map((f) => f.key), ['localizacao', 'ecotextura', 'grau', 'relacao_orificio', 'achado'])
  const inicial = initialExamState(obstetrica).placenta!
  assert.equal(inicial.localizacao, '')
  assert.equal(inicial.ecotextura, 'homogênea')
  assert.equal(inicial.grau, '')
  assert.deepEqual(bloqueios(com(completo(), 'placenta', { localizacao: '' })), ['Placenta'])
})

test('localizações: simples ou duplas coerentes, nunca triplas', () => {
  const valores = PLACENTA_LOCALIZACOES.map((o) => o.value)
  for (const v of ['anterior', 'posterior', 'fúndica', 'anterior e fúndica', 'posterior e fúndica',
    'anterior e lateral direita', 'posterior e lateral esquerda', 'fúndica e lateral direita']) {
    assert.ok(valores.includes(v as never), v)
  }
  for (const v of valores) {
    const partes = v.split(' e ')
    assert.ok(partes.length <= 2, `combinação tripla: ${v}`)
    if (v.includes('lateral')) assert.match(partes[0]!, /^(anterior|posterior|fúndica)$/, v)
  }
  assert.ok(!valores.some((v) => /^lateral/.test(v)), 'lateral só associada')
  assert.ok(!valores.includes('anterior e posterior' as never))
})

test('placenta direta no laudo, com Grannum opcional e OI/achados independentes', () => {
  const d = adaptar(completo()).dados
  assert.equal(d.placenta_localizacao, 'posterior')
  assert.equal(d.placenta_ecotextura, 'homogênea')
  assert.equal(d.placenta_grau, null)
  assert.match(render(completo()), /Placenta de localização posterior, com ecotextura homogênea\./)

  const s = com(completo(), 'placenta', {
    localizacao: 'anterior e fúndica', grau: 'II',
    relacao_orificio: 'insercao_baixa', 'relacao_orificio.insercao_baixa.distancia_mm': '12',
    achado: 'lagos_venosos',
  })
  const ds = adaptar(s).dados
  assert.equal(ds.placenta_grau, 'II')
  assert.equal(ds.placenta_relacao_orificio, 'insercao_baixa')
  assert.equal(ds.placenta_distancia_orificio_mm, 12)
  assert.equal(ds.placenta_achado, 'lagos_venosos')
  assert.match(render(s), /localização anterior e fúndica/)
})

test('placenta legada estado.detalhar.* e "Normal" continuam lidas', () => {
  const detalhada = { ...completo(), placenta: {
    estado: 'detalhar', 'estado.detalhar.localizacao': 'anterior',
    'estado.detalhar.grau': 'grau II', 'estado.detalhar.ecotextura': 'homogênea',
    relacao_orificio: 'nao_informada', achado: 'nenhum',
  } }
  const d = adaptar(detalhada).dados
  assert.equal(d.placenta_localizacao, 'anterior')
  assert.equal(d.placenta_grau, 'II')
  assert.deepEqual(bloqueios(detalhada), [])

  const normal = { ...completo(), placenta: { estado: 'normal', relacao_orificio: 'nao_informada', achado: 'nenhum' } }
  assert.deepEqual(bloqueios(normal), [], 'laudo antigo reabre igual')
  assert.equal(adaptar(normal).dados.placenta_localizacao, null)
  assert.match(render(normal), /Placenta de aspecto normal\./)

  const migrada = migrarPlacentaLegada(detalhada.placenta)
  assert.equal(migrada.localizacao, 'anterior')
  assert.equal(migrada.grau, 'II')
  assert.equal(lerPlacentaDaTela(migrada).legado, false)
  assert.ok(!('estado' in migrada), 'o seletor antigo sai junto')
  // Estado inicial novo com chaves antigas por cima (como o gate da API monta) lê o legado.
  const misto = { ...initialExamState(obstetrica).placenta!, estado: 'detalhar', 'estado.detalhar.localizacao': 'anterior' }
  assert.equal(lerPlacentaDaTela(misto).localizacao, 'anterior')
  const normalMigrada = migrarPlacentaLegada(normal.placenta)
  assert.equal(normalMigrada.localizacao, '', 'sem localização inventada')
  assert.equal(lerPlacentaDaTela(normalMigrada).legado, false, 'depois de editar, a localização passa a ser exigida')
  assert.equal(normalMigrada.ecotextura, 'homogênea')
})

// ── Líquido ───────────────────────────────────────────────────────────────────
test('líquido: método e um único valor em cm, usados só com MBV/ILA', () => {
  const campos = obstetrica.sections.find((x) => x.id === 'liquido')!.module!.schema.fields
  assert.deepEqual(campos.map((f) => f.key), ['tipo', 'valor_cm'])
  assert.deepEqual(campos[0]!.options!.map((o) => o.value), ['subjetivo', 'mbv', 'ila'])

  const mbv = adaptar(com(completo(), 'liquido', { tipo: 'mbv', valor_cm: '5,6' })).dados
  assert.equal(mbv.liquido_tipo, 'mbv')
  assert.deepEqual(mbv.liquido_mbv_por_feto_cm, [5.6])
  const ila = adaptar(com(completo(), 'liquido', { tipo: 'ila', valor_cm: '4' })).dados
  assert.equal(ila.liquido_tipo, 'ila')
  assert.equal(ila.liquido_ila_cm, 4)
  assert.match(render(com(completo(), 'liquido', { tipo: 'ila', valor_cm: '4' })), /ligoâmnio/)
})

test('trocar entre ILA e MBV limpa a medida para não mudar seu significado', () => {
  const ilaParaMbv = trocarMetodoLiquido({ tipo: 'ila', valor_cm: '12' }, 'mbv')
  assert.equal(ilaParaMbv.tipo, 'mbv')
  assert.equal(ilaParaMbv.valor_cm, '')
  const mbvParaIla = trocarMetodoLiquido({ tipo: 'mbv', valor_cm: '4' }, 'ila')
  assert.equal(mbvParaIla.valor_cm, '')
  assert.equal(trocarMetodoLiquido({ tipo: 'mbv', valor_cm: '4' }, 'subjetivo').valor_cm, '')
  const subjetivoParaIla = trocarMetodoLiquido({ tipo: 'subjetivo', valor_cm: '12' }, 'ila')
  assert.equal(subjetivoParaIla.valor_cm, '12', 'valor digitado antes da escolha do método é preservado')
})

test('valor sem método quantitativo vira pendência, não inferência', () => {
  const s = com(completo(), 'liquido', { tipo: 'subjetivo', valor_cm: '3' })
  assert.deepEqual(bloqueios(s), ['Líquido amniótico'])
  assert.equal(adaptar(s).dados.liquido_tipo, 'normal')
  assert.deepEqual(bloqueios(com(completo(), 'liquido', { tipo: 'mbv', valor_cm: 'abc' })), ['Líquido amniótico'])
})

test('MBV/ILA sem valor não inventa oligoâmnio (salvaguarda antiga)', () => {
  for (const tipo of ['mbv', 'ila']) {
    const s = com(completo(), 'liquido', { tipo, valor_cm: '' })
    assert.deepEqual(bloqueios(s), [])
    assert.equal(adaptar(s).dados.liquido_tipo, 'normal')
  }
})

test('limiares preservados: MBV 2–8 cm, ILA 5–25 cm', () => {
  const classe = (tipo: string, valor: string) => {
    const r = obstetrica.sections.find((x) => x.id === 'liquido')!.module!.compose({ tipo, valor_cm: valor })
    return r.conclusion[0]!
  }
  assert.match(classe('mbv', '1,9'), /^Oligoâmnio/)
  assert.match(classe('mbv', '2'), /normal/)
  assert.match(classe('mbv', '8'), /normal/)
  assert.match(classe('mbv', '8,1'), /^Polidrâmnio/)
  assert.match(classe('ila', '4,9'), /^Oligoâmnio/)
  assert.match(classe('ila', '25'), /normal/)
  assert.match(classe('ila', '25,1'), /^Polidrâmnio/)
})

test('líquido legado tipo.mbv.cm/tipo.ila.cm continua lido e migra para o campo único', () => {
  const legado = { tipo: 'ila', 'tipo.ila.cm': '30' }
  assert.equal(lerLiquidoDaTela(legado).valor, 30)
  const s = { ...completo(), liquido: legado }
  assert.equal(adaptar(s).dados.liquido_ila_cm, 30)
  // Medida antiga de OUTRO método não vale para o escolhido (comportamento antigo).
  assert.equal(lerLiquidoDaTela({ tipo: 'mbv', 'tipo.ila.cm': '30' }).valor, null)
  const migrado = migrarLiquidoLegado(legado)
  assert.equal(migrado.valor_cm, '30')
  assert.equal(migrado['tipo.ila.cm'], '')
  assert.equal(lerLiquidoDaTela(migrado).valor, 30)
})

// ── Composição local (módulos) e Doppler obstétrico ───────────────────────────
/** A categoria é migrada (`composeReport` a recusa); os módulos seguem compondo a prévia local. */
function comporModulos(s: ExamState) {
  const partes = obstetrica.sections.flatMap((x) => (x.module ? [x.module.compose(s[x.id] ?? x.module.initialState())] : []))
  return {
    text: partes.map((p) => p.body).filter(Boolean).join('\n'),
    pendencias: partes.flatMap((p) => p.pendencias ?? []),
  }
}

test('composição local de um exame novo completo', () => {
  const s = com(completo(), 'ig', { us_data: '12/01/2026', us_ig_sem: '8', us_ig_dias: '2' })
  const r = comporModulos(s)
  assert.deepEqual(r.pendencias, [])
  assert.match(r.text, /Primeira ultrassonografia realizada em 12\/01\/2026/)
  assert.match(r.text, /BCF = 142 bpm/)
  assert.match(r.text, /duas artérias e uma veia/)
  assert.match(r.text, /Placenta de localização posterior, com ecotextura homogênea\./)
  assert.match(r.text, /quantidade normal pela análise subjetiva/)
})

test('composição local bloqueia placenta sem localização e líquido ambíguo', () => {
  const r = comporModulos(com(com(completo(), 'placenta', { localizacao: '' }), 'liquido', { valor_cm: '3' }))
  assert.deepEqual(r.pendencias.map((p) => p.onde).sort(), ['Líquido amniótico', 'Placenta'])
})

test('Doppler obstétrico herda as seções novas', () => {
  const ids = dopplerObstetrico.sections.map((x) => x.module)
  assert.ok(ids.includes(datacaoObstetricaModule))
  const s = initialExamState(dopplerObstetrico)
  assert.equal(s.feto?.vitalidade, 'auto')
  assert.equal(s.placenta?.localizacao, '')
})

console.log(`${cases} obstetric Web form checks passed`)
