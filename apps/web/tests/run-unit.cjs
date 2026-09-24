const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')

const cwd = resolve(__dirname, '..')
const files = [
  'tests/biometryGrowthSections.manual.ts',
  'tests/liverQuantification.manual.ts',
  'tests/mamariaBirads.manual.ts',
  'tests/mamariaAdapter.manual.ts',
  'tests/dopplerWebMode.manual.ts',
  'tests/fetalGrowthContext.manual.ts',
  'tests/fetalGrowthPercentile.manual.ts',
  'tests/fetalGrowthSource.manual.ts',
  'tests/fetalWeight.manual.ts',
  'tests/intergrowth2020.manual.ts',
  'tests/intergrowthBiometry.manual.ts',
  'tests/renalMeasurements.manual.ts',
  'src/lib/calculators/preEclampsia.test.mts',
  'src/lib/calculators/trisomyFmf.test.mts',
  'src/lib/companionStructured.test.ts',
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
