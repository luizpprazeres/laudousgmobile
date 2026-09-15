import assert from 'node:assert/strict'
import { calcularPreEclampsiaFmf, type PeGestante, type PeMedidas } from '../../../packages/shared/src/calculators/preEclampsiaFmf'

const base: PeGestante = {idade:30,peso:65,altura:165,gaDias:89,etnia:'branca',paridade:'nulipara',histFamiliarPE:false,fiv:false,hipertensaoCronica:false,diabetes:false,lesSaf:false,fumante:false}
const medidas: PeMedidas = {pamMmHg:90,utaPiMedio:1.5}
const cases: {id:string; g?:Partial<PeGestante>; m?:PeMedidas}[] = [
  {id:'base'}, {id:'base-repeat'}, {id:'history',m:{}},
  {id:'map-only',m:{pamMmHg:90}}, {id:'utpi-only',m:{utaPiMedio:1.5}},
]
for (const value of [80,100]) cases.push({id:`map-${value}`,m:{...medidas,pamMmHg:value}})
for (const value of [1,2]) cases.push({id:`utpi-${value}`,m:{...medidas,utaPiMedio:value}})
for (const key of ['peso','altura','idade','gaDias'] as const) {
  const values = {peso:[50,90],altura:[155,175],idade:[25,40],gaDias:[77,97]}[key]
  for(const value of values) cases.push({id:`${key}-${value}`,g:{[key]:value}})
}
for (const key of ['histFamiliarPE','fiv','hipertensaoCronica','diabetes','lesSaf','fumante'] as const) cases.push({id:key,g:{[key]:true}})
for (const etnia of ['afro','sul-asiatica','leste-asiatica'] as const) cases.push({id:etnia,g:{etnia}})
cases.push({id:'multipara-sem-pe',g:{paridade:'multipara-sem-pe',intervaloAnos:3,igPartoAnterior:39}})
cases.push({id:'multipara-com-pe',g:{paridade:'multipara-com-pe',intervaloAnos:3,igPartoAnterior:34,zEscorePesoAnterior:0}})
const rows = cases.map(c => {
  const g = {...base,...c.g}, m = c.m ?? medidas
  const r = calcularPreEclampsiaFmf(g,m)
  assert.ok(Number.isFinite(r.riscos[37]) && r.riscos[37] > 0 && r.riscos[37] <= 1)
  assert.doesNotMatch(r.insertBloco,/4 aferições/)
  return {id:c.id,inputs:{g,m},version:r.versaoParametros,risk:r.riscos[37],oneIn:r.umEmN,moms:r.marcadores,external:c.id==='base'?{oneIn:290,source:'user screenshot 2026-09-14 12:17:20; age convention not established'}:null}
})
assert.equal(rows[0].oneIn,285)
assert.equal(rows[0].risk,rows[1].risk)
console.log(JSON.stringify({kind:'local regression, not external validation',count:rows.length,cases:rows},null,2))
