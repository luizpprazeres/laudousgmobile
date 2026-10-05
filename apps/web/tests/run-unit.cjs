const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')

const cwd = resolve(__dirname, '..')
const files = [
  'tests/biometryAutomation.manual.ts',
  'tests/biometryGrowthSections.manual.ts',
  'tests/liverQuantification.manual.ts',
  'tests/mamariaBirads.manual.ts',
  'tests/mamariaAdapter.manual.ts',
  'tests/dopplerWebMode.manual.ts',
  'tests/dopplerRenalStructured.manual.ts',
  'tests/dopplerHepaticoStructured.manual.ts',
  'tests/dopplerVenosoMmiiStructured.manual.ts',
  'tests/dopplerAortaIliacasStructured.manual.ts',
  'tests/dopplerTransplanteRenalStructured.manual.ts',
  'tests/superficialStructured.manual.ts',
  'tests/urologyNeckStructured.manual.ts',
  'tests/neuroOcularStructured.manual.ts',
  'tests/dopplerArterialFistulaStructured.manual.ts',
  'tests/dopplerMesentericoStructured.manual.ts',
  'tests/dopplerArteriasTemporaisStructured.manual.ts',
  'tests/mamaMasculinaStructured.manual.ts',
  'tests/fetalGrowthContext.manual.ts',
  'tests/fetalGrowthPercentile.manual.ts',
  'tests/fetalGrowthSource.manual.ts',
  'tests/fetalWeight.manual.ts',
  'tests/intergrowth2020.manual.ts',
  'tests/intergrowthBiometry.manual.ts',
  'tests/renalMeasurements.manual.ts',
  'tests/composition.manual.ts',
  'src/lib/deterministic/organs/abdomeTotalGrid.manual.ts',
  'src/lib/visualSchemas/__tests__/breast-geometry.manual.ts',
  'src/lib/visualSchemas/__tests__/myoma-adapter.manual.ts',
  'src/lib/__tests__/clinical-report-flow.manual.ts',
  'src/lib/writerGeneration.test.mts',
  'src/lib/calculators/preEclampsia.test.mts',
  'src/lib/calculators/trisomyFmf.test.mts',
  'src/lib/companionStructured.test.ts',
  'src/components/landing/v2/hero/heroDemo.test.mts',
]
for (const file of files) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', file], {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, TSX_TSCONFIG_PATH: resolve(cwd, '../api/tsconfig.json') },
  })
  if (result.error) console.error(result.error)
  if (result.status !== 0) process.exit(result.status || 1)
}
console.log(`${files.length} web suites passed`)
