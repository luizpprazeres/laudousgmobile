import assert from 'node:assert/strict';
import { HEPATIC_COMMON_QUALITY_PROFILES, HEPATIC_CONTRACT_VERSION, confirmHepaticModuleInterpretation, confirmHepaticIntegratedInterpretation, deriveHepaticIqrRatio, type HepaticAssessment, type HepaticModule, type HepaticQualityProfile } from '@laudousg/shared';
import { validateHepaticQualityRegistry } from '../qualityRegistry';
import { prepareHepaticReport } from '../service';
import { HEPATIC_WORKSPACE_CONFIGURATION, HEPATIC_WEB_MODELS_ENABLED } from '../../../../../web/src/lib/hepaticModels';
import { HEPATIC_ANDROID_CONFIGURATION, HEPATIC_ANDROID_MODELS_ENABLED } from '../../../../../mobile/src/features/generate/hepaticModels';
import { buildHepaticQuality } from '../../../../../mobile/src/features/generate/hepaticWorkspace';

const actorId = '8e7dfcf2-a3cc-4f0a-a7a5-b46db3444334';
const confirmedAt = '2026-10-05T12:00:00Z';
const reference = { id: 'synthetic-input', version: '1', citation: 'Dados sintéticos' };
const normal = 'Rigidez hepática dentro dos parâmetros de referência adotados para o método empregado.';
function makeModule(profile: HepaticQualityProfile, median = profile.unit === 'm/s' ? 1.2 : profile.module === 'fat' ? 0.6 : 5, ratio = 10): HepaticModule {
  return {
    status: 'performed', method: profile.method,
    equipment: { manufacturer: profile.method === 'TE' ? 'Echosens' : 'Equipamento sintético', model: profile.method === 'TE' ? 'FibroScan' : 'Teste' },
    acquisition: { count: profile.minimumAcquisitions, lobe: 'right', depthCm: 4, roi: 'parênquima', position: 'supino', protocol: reference },
    fasting: { status: 'fasting', hours: 4 }, confounders: { reviewed: true, items: [], etiologicContext: 'Teste sintético' },
    measurements: [{ id: `${profile.module}-median`, role: 'median', value: median, unit: profile.unit, origin: 'manual', source: reference }, { id: `${profile.module}-iqr`, role: 'iqr', value: median * ratio / 100, unit: profile.unit, origin: 'manual', source: reference }], derived: [],
  };
}
function assessment(profile: HepaticQualityProfile, median?: number, ratio?: number): HepaticAssessment {
  const stiffnessProfile = profile.module === 'stiffness' ? profile : HEPATIC_COMMON_QUALITY_PROFILES[0]!;
  let value: HepaticAssessment = { contractVersion: HEPATIC_CONTRACT_VERSION, examId: 'd91d9e82-a692-4491-bac8-3f3847d7f809', revision: 0, purpose: profile.module === 'fat' ? 'multiparametric' : 'elastography', indication: 'Teste sintético', modules: { stiffness: makeModule(stiffnessProfile, profile.module === 'stiffness' ? median : undefined, profile.module === 'stiffness' ? ratio : undefined), fat: profile.module === 'fat' ? makeModule(profile, median, ratio) : { status: 'not_performed', measurements: [], derived: [] } } };
  for (const key of ['stiffness', 'fat'] as const) {
    if (value.modules[key].status !== 'performed') continue;
    value = deriveHepaticIqrRatio(value, key);
    const currentModule = value.modules[key];
    const configuration = HEPATIC_ANDROID_CONFIGURATION[key].qualityByMethod[currentModule.method!];
    assert.deepEqual(configuration, HEPATIC_WORKSPACE_CONFIGURATION[key].qualityByMethod[currentModule.method!]);
    currentModule.quality = buildHepaticQuality({ module: currentModule, unit: currentModule.measurements[0]!.unit, configuration, metricDrafts: { 'protocol-confirmed': '1' }, physicianId: actorId, assessedAt: confirmedAt })!;
    assert.ok(currentModule.quality, 'Android monta o mesmo contrato aceito pela API sem redigitar IQR/M');
  }
  if (profile.module === 'fat') value.correlation = { modeB: 'Parênquima sem alterações', doppler: 'Sem alterações', concordance: 'concordant' };
  for (const key of ['stiffness', 'fat'] as const) {
    if (value.modules[key].status === 'performed') value = confirmHepaticModuleInterpretation(value, key, { text: key === 'stiffness' ? normal : 'Quantificação conforme referência adotada.', physicianId: actorId, confirmedAt, reference });
  }
  if (profile.module === 'fat') value = confirmHepaticIntegratedInterpretation(value, { text: 'Avaliação integrada confirmada pelo médico.', physicianId: actorId, confirmedAt, reference });
  return value;
}
assert.equal(HEPATIC_WEB_MODELS_ENABLED, true);
assert.equal(HEPATIC_ANDROID_MODELS_ENABLED, true);
for (const profile of HEPATIC_COMMON_QUALITY_PROFILES) {
  const value = assessment(profile);
  assert.deepEqual(validateHepaticQualityRegistry({ assessment: value, actorId }), [], `${profile.method}/${profile.unit}`);
  const result = prepareHepaticReport({ assessment: value, actorId });
  assert.ok(result.generatedOutput.includes('CONCLUSÃO:'));
  if (value.purpose === 'elastography') assert.ok(result.generatedOutput.endsWith(normal));
  const forged = structuredClone(value);
  forged.modules[profile.module].quality!.metrics[0]!.value = 0;
  assert.ok(validateHepaticQualityRegistry({ assessment: forged, actorId }).some((issue) => issue.code === 'QUALITY_METRIC_SOURCE_MISMATCH'));
  const unchecked = structuredClone(value);
  unchecked.modules[profile.module].quality!.metrics.find((metric) => metric.code === 'protocol-confirmed')!.value = 0;
  assert.ok(validateHepaticQualityRegistry({ assessment: unchecked, actorId }).some((issue) => issue.code === 'QUALITY_METRIC_VALUE_UNAPPROVED'));
}
const profile = (method: string, unit: string) => HEPATIC_COMMON_QUALITY_PROFILES.find((item) => item.method === method && item.unit === unit)!;
const problems = (value: HepaticAssessment) => validateHepaticQualityRegistry({ assessment: value, actorId });
assert.equal(problems(assessment(profile('TE', 'kPa'), 7.1, 40)).length, 0, 'TE <=7,1: regra IQR/M não se aplica');
assert.ok(problems(assessment(profile('TE', 'kPa'), 7.2, 40)).some((issue) => issue.code === 'QUALITY_METRIC_VALUE_UNAPPROVED'));
assert.equal(problems(assessment(profile('2D-SWE', 'kPa'), 5, 20)).length, 0);
assert.ok(problems(assessment(profile('2D-SWE', 'm/s'), 1.2, 20)).some((issue) => issue.code === 'QUALITY_METRIC_VALUE_UNAPPROVED'));
assert.equal(problems(assessment(profile('2D-SWE', 'm/s'), 1.2, 15)).length, 0);
const fasting = assessment(profile('pSWE/ARFI', 'kPa')); fasting.modules.stiffness.fasting!.hours = 2;
assert.ok(problems(fasting).some((issue) => issue.code === 'QUALITY_FASTING_REQUIREMENT'));
const tooFew = assessment(profile('2D-SWE', 'kPa')); tooFew.modules.stiffness.acquisition!.count = 2;
assert.ok(problems(tooFew).some((issue) => issue.code === 'QUALITY_ACQUISITION_COUNT'));
const vendor = assessment(profile('TE', 'kPa')); vendor.modules.stiffness.equipment!.manufacturer = 'Outro';
assert.ok(problems(vendor).some((issue) => issue.code === 'QUALITY_CRITERION_UNAPPROVED'));
const ref = assessment(profile('ATI', 'dB/cm/MHz')); ref.modules.fat.quality!.criterion.reference.version = 'futura';
assert.ok(problems(ref).some((issue) => issue.code === 'QUALITY_CRITERION_UNAPPROVED'));
console.log('✓ 7 perfis Web/Android/API: geração completa, unidades, TE condicional, medidas derivadas, confirmação, jejum, fabricante e versão');
