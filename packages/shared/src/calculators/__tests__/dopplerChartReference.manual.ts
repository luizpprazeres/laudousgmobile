import assert from 'node:assert/strict'
import { referenciaDopplerBarcelona, calcularDopplerParcial, type DopplerChartVessel } from '../doppler'
const vessels: DopplerChartVessel[] = ['arteriasUterinas', 'arteriaUmbilical', 'arteriaCerebralMedia', 'ratioCerebroplacentario']
let checks = 0
for (const vessel of vessels) {
  const start = vessel === 'arteriasUterinas' ? 11 : 20
  for (let totalDays = start * 7; totalDays <= 44 * 7 + 6; totalDays++) {
    const weeks = Math.floor(totalDays / 7), days = totalDays % 7
    const ref = referenciaDopplerBarcelona(vessel, weeks, days)!
    assert.ok(ref && ref.p5 < ref.p50 && ref.p50 < ref.p95)
    for (const [centile, z] of [['p5', -1.645], ['p50', 0], ['p95', 1.645]] as const) {
      const ip = ref[centile]
      const input = { weeks, days, ...(vessel === 'arteriasUterinas' ? { ipMedioUterinas: ip } : vessel === 'arteriaUmbilical' ? { ipUmbilical: ip } : vessel === 'arteriaCerebralMedia' ? { ipMCA: ip } : { ipMCA: ip, ipUmbilical: 1 }) }
      const result = calcularDopplerParcial(input)[vessel]
      // Algumas referências matemáticas saem da faixa de IP aceito pelo formulário.
      if (ip > 0.1 && ip <= 10) {
        assert.ok(result && Math.abs(result.zscore - z) < 1e-10, `${vessel} ${weeks}s${days}d ${centile}`)
        checks++
      }
    }
  }
  assert.equal(referenciaDopplerBarcelona(vessel, start - 1, 6), null)
  assert.equal(referenciaDopplerBarcelona(vessel, 45, 0), null)
  assert.equal(referenciaDopplerBarcelona(vessel, 30, 0.5), null)
  assert.equal(referenciaDopplerBarcelona(vessel, 30, NaN), null)
}
// Âncoras numéricas independentes das inversões gráficas (coeficientes legados).
assert.ok(Math.abs(referenciaDopplerBarcelona('arteriaUmbilical', 32, 0)!.p50 - 0.99539) < 1e-10)
assert.ok(Math.abs(referenciaDopplerBarcelona('arteriaCerebralMedia', 32, 0)!.p50 - 2.0011) < 1e-10)
assert.ok(Math.abs(referenciaDopplerBarcelona('ratioCerebroplacentario', 32, 0)!.p50 - 2.1508) < 1e-10)
console.log(`Doppler references: ${checks} round trips passed`)
