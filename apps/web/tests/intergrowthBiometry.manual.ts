import assert from 'node:assert/strict'
import { morfologico, obstetrica } from '../src/lib/deterministic'
import { chaveFemurDoSchema } from '../src/lib/calculators/fetalWeight'
import {
  INTERGROWTH2020_EFW_MAX_GA_DAYS,
  INTERGROWTH2020_EFW_MIN_GA_DAYS,
  INTERGROWTH2020_EFW_VERSION,
  intergrowth2020EfwQuantile,
  intergrowth2020EfwZScore,
  standardNormalCdf,
} from '../src/lib/calculators/intergrowth2020'
import {
  HADLOCK3_FORMULA_LABEL,
  INTERGROWTH_PREVIEW_CENTILES,
  calcularPesoHadlock3,
  formatarIgBiometria,
  formatarPercentilIntergrowth,
  intergrowthBiometryPreview,
  intergrowthPreviewCurves,
  parseIgBiometria,
} from '../src/lib/calculators/intergrowthBiometry'

let cases = 0

const near = (actual: number | null | undefined, expected: number, tol: number, msg: string) => {
  assert.ok(actual !== null && actual !== undefined, `${msg}: null`)
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: ${actual} vs ${expected} (tol ${tol})`)
}

/** Célula AI6 da planilha oficial, escrita à parte e em cm. */
const planilhaCm = (cc: number, ca: number, cf: number) =>
  10 ** (1.326 + 0.0107 * cc + 0.0438 * ca + 0.158 * cf - 0.00326 * ca * cf)

// Referência externa armazenada na planilha oficial (sheet1 linha 6).
const REF = {
  biometria: { cc: '230', ca: '210', cf: '50' },
  ig: { bio_sem: '24', bio_dias: '3' },
  gaDays: 171,
  weightG: 870.16177215199957,
  z: 2.5499428963771749,
  percentile: 99.461297176800756,
}

{
  const gramas = calcularPesoHadlock3({ ccMm: 230, caMm: 210, cfMm: 50 })
  near(gramas, REF.weightG, 1e-9, 'Hadlock 3 planilha')
  near(gramas, planilhaCm(23, 21, 5), 1e-9, 'Hadlock 3 forma cm')
  const r = intergrowthBiometryPreview(REF.biometria, 'cf', REF.ig)
  assert.ok(r)
  assert.equal(r.version, INTERGROWTH2020_EFW_VERSION)
  assert.equal(r.formula, HADLOCK3_FORMULA_LABEL)
  assert.deepEqual(r.ig, { semanas: 24, dias: 3, gaDays: REF.gaDays })
  assert.deepEqual(r.medidasMm, { ccMm: 230, caMm: 210, cfMm: 50 })
  near(r.weightG, REF.weightG, 1e-9, 'peso cru')
  assert.notEqual(r.weightG, Math.round(r.weightG))
  assert.equal(r.weightRounded, '870')
  near(r.zScore, REF.z, 1e-9, 'z planilha')
  near(r.percentile, REF.percentile, 1e-8, 'percentil planilha')
  assert.equal(formatarPercentilIntergrowth(r.percentile), '99,5')
  assert.equal(formatarIgBiometria(r.ig), '24+3 semanas (171 dias)')
  cases++
}

// Unidade: mm sempre ÷10; valores "em cm" digitados no campo mm não são reinterpretados.
{
  const pequeno = calcularPesoHadlock3({ ccMm: 23, caMm: 21, cfMm: 5 })!
  near(pequeno, planilhaCm(2.3, 2.1, 0.5), 1e-9, 'sem heurística cm')
  assert.ok(Math.abs(pequeno - REF.weightG) > 500)
  cases++
}
for (const medidas of [
  { ccMm: 0, caMm: 210, cfMm: 50 },
  { ccMm: 230, caMm: -210, cfMm: 50 },
  { ccMm: 230, caMm: Number.NaN, cfMm: 50 },
  { ccMm: 230, caMm: 210, cfMm: Number.POSITIVE_INFINITY },
  { ccMm: 1e6, caMm: 210, cfMm: 50 },
]) {
  assert.equal(calcularPesoHadlock3(medidas), null)
  cases++
}

// Parser de medidas: reusa parseMedidaMm (vírgula/ponto/espaços aceitos; resto rejeitado).
{
  const variante = intergrowthBiometryPreview({ cc: '230,0', ca: ' 210 ', cf: '50.0' }, 'cf', REF.ig)
  near(variante?.weightG, REF.weightG, 1e-9, 'variante decimal')
  for (const bad of [undefined, null, 230, '', '  ', '0', '-230', '+230', '230mm', '23 cm', '1e2', 'NaN', 'Infinity', '230,', ['230']]) {
    for (const campo of ['cc', 'ca', 'cf'] as const) {
      assert.equal(intergrowthBiometryPreview({ ...REF.biometria, [campo]: bad }, 'cf', REF.ig), null, `${campo}=${String(bad)}`)
    }
    cases++
  }
}

// Chave do fêmur: morfológico usa `femur`; obstétrica usa `cf`; null/inexistente → sem resultado.
{
  const biometriaDe = (sections: ReadonlyArray<{ id: string; module?: { schema: { fields: ReadonlyArray<{ key: string }> } } }>) =>
    sections.find((s) => s.id === 'biometria')!.module!.schema
  for (const trimestre of ['2t', '3t']) {
    const schema = biometriaDe(morfologico.resolveSections?.({ trimestre }) ?? morfologico.sections)
    assert.equal(chaveFemurDoSchema(schema.fields), 'femur')
    cases++
  }
  assert.equal(chaveFemurDoSchema(biometriaDe(obstetrica.sections).fields), 'cf')
  const morfo = { cc: '230', ca: '210', femur: '50' }
  near(intergrowthBiometryPreview(morfo, 'femur', REF.ig)?.weightG, REF.weightG, 1e-9, 'morfológico femur')
  assert.equal(intergrowthBiometryPreview(morfo, 'cf', REF.ig), null)
  assert.equal(intergrowthBiometryPreview(REF.biometria, 'femur', REF.ig), null)
  assert.equal(intergrowthBiometryPreview(REF.biometria, null, REF.ig), null)
  assert.equal(intergrowthBiometryPreview(REF.biometria, 'dbp' as never, REF.ig), null)
  cases++
}

// Parser de IG: inteiros estritos, dias 0..6, vazio não vira zero, total 126..280.
{
  assert.deepEqual(parseIgBiometria({ bio_sem: '18', bio_dias: '0' }), { semanas: 18, dias: 0, gaDays: INTERGROWTH2020_EFW_MIN_GA_DAYS })
  assert.deepEqual(parseIgBiometria({ bio_sem: '40', bio_dias: '0' }), { semanas: 40, dias: 0, gaDays: INTERGROWTH2020_EFW_MAX_GA_DAYS })
  assert.deepEqual(parseIgBiometria({ bio_sem: ' 24 ', bio_dias: '6' }), { semanas: 24, dias: 6, gaDays: 174 })
  cases++
  const invalidos: Array<Record<string, unknown>> = [
    {},
    { bio_sem: '24' },
    { bio_sem: '24', bio_dias: '' },
    { bio_sem: '24', bio_dias: '   ' },
    { bio_sem: '', bio_dias: '3' },
    { bio_sem: '24', bio_dias: '7' },
    { bio_sem: '24', bio_dias: '-1' },
    { bio_sem: '24', bio_dias: '+3' },
    { bio_sem: '24', bio_dias: '3.0' },
    { bio_sem: '24', bio_dias: '3,5' },
    { bio_sem: '24,5', bio_dias: '0' },
    { bio_sem: '1e1', bio_dias: '0' },
    { bio_sem: 'NaN', bio_dias: '0' },
    { bio_sem: '24', bio_dias: 3 },
    { bio_sem: 24, bio_dias: '3' },
    { bio_sem: '17', bio_dias: '6' },
    { bio_sem: '40', bio_dias: '1' },
    { bio_sem: '41', bio_dias: '0' },
    { bio_sem: '0', bio_dias: '171' },
    { bio_sem: '٢٤', bio_dias: '3' },
  ]
  for (const ig of invalidos) {
    assert.equal(parseIgBiometria(ig), null, JSON.stringify(ig))
    assert.equal(intergrowthBiometryPreview(REF.biometria, 'cf', ig), null)
    cases++
  }
}

// Mudança de IG: mesmo peso, novo Z/percentil; IG inválida depois de válida → null.
{
  const biometria = { ...REF.biometria }
  const ig = { ...REF.ig }
  const snapshot = JSON.stringify([biometria, ig])
  const antes = intergrowthBiometryPreview(biometria, 'cf', ig)!
  const depois = intergrowthBiometryPreview(biometria, 'cf', { bio_sem: '26', bio_dias: '0' })!
  assert.equal(JSON.stringify([biometria, ig]), snapshot)
  assert.equal(depois.weightG, antes.weightG)
  assert.equal(depois.ig.gaDays, 182)
  near(depois.zScore, intergrowth2020EfwZScore(depois.weightG, 182)!, 1e-12, 'z em 26+0')
  assert.ok(depois.percentile < antes.percentile)
  assert.equal(intergrowthBiometryPreview(biometria, 'cf', { bio_sem: '26', bio_dias: '' }), null)
  cases++
}

// Extremos: nunca exibidos como 0 ou 100.
{
  const baixo = intergrowthBiometryPreview(REF.biometria, 'cf', { bio_sem: '40', bio_dias: '0' })!
  assert.ok(baixo.percentile < 0.1)
  assert.equal(formatarPercentilIntergrowth(baixo.percentile), '< 0,1')
  const alto = intergrowthBiometryPreview({ cc: '350', ca: '380', cf: '75' }, 'cf', { bio_sem: '18', bio_dias: '0' })!
  assert.ok(alto.percentile > 99.9)
  assert.equal(formatarPercentilIntergrowth(alto.percentile), '> 99,9')
  for (const [p, texto] of [
    [0, '< 0,1'], [0.0999, '< 0,1'], [0.1, '0,1'], [50, '50,0'], [99.9, '99,9'], [99.94, '> 99,9'], [99.95, '> 99,9'], [100, '> 99,9'],
  ] as const) {
    assert.equal(formatarPercentilIntergrowth(p), texto, String(p))
  }
  for (const p of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 100.1]) assert.equal(formatarPercentilIntergrowth(p), null)
  cases++
}

// Curvas: z verificáveis pela CDF, pontos pelo quantil do motor, ordem entre centis.
{
  assert.deepEqual(INTERGROWTH_PREVIEW_CENTILES.map((c) => c.label), ['P3', 'P10', 'P50', 'P90', 'P97'])
  for (const { centile, z } of INTERGROWTH_PREVIEW_CENTILES) {
    near(100 * standardNormalCdf(z)!, centile, 1e-9, `z P${centile}`)
  }
  const curvas = intergrowthPreviewCurves()
  assert.equal(curvas.length, 5)
  for (const curva of curvas) {
    assert.equal(curva.points.length, INTERGROWTH2020_EFW_MAX_GA_DAYS - INTERGROWTH2020_EFW_MIN_GA_DAYS + 1)
    assert.equal(curva.points[0].gaDays, 126)
    assert.equal(curva.points[curva.points.length - 1].gaDays, 280)
    for (const p of curva.points) assert.equal(p.weightG, intergrowth2020EfwQuantile(curva.z, p.gaDays))
    for (let i = 1; i < curva.points.length; i++) assert.ok(curva.points[i].weightG > curva.points[i - 1].weightG)
  }
  for (let i = 0; i < curvas[0].points.length; i++) {
    for (let c = 1; c < curvas.length; c++) assert.ok(curvas[c].points[i].weightG > curvas[c - 1].points[i].weightG)
  }
  const p50 = curvas[2].points.find((p) => p.gaDays === REF.gaDays)!
  near(100 * standardNormalCdf(intergrowth2020EfwZScore(p50.weightG, REF.gaDays)!)!, 50, 1e-9, 'P50 inverso')
  const semanais = intergrowthPreviewCurves(7)
  assert.deepEqual(semanais[0].points.map((p) => p.gaDays / 7), Array.from({ length: 23 }, (_, i) => 18 + i))
  assert.deepEqual(intergrowthPreviewCurves(0), [])
  assert.deepEqual(intergrowthPreviewCurves(1.5), [])
  cases++
}

console.log(`INTERGROWTH-21st 2020 preview: ${cases} cases passed (planilha, parser, femur, invalid, IG change, curves)`)
