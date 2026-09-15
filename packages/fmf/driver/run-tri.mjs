import { readFileSync, writeFileSync } from 'node:fs'
import { connect, openPatient, setMaternal, setTrisomies, relaunchApp } from './lib.mjs'
const [,, casesFile, outFile] = process.argv
const only = process.env.ONLY
const cases = JSON.parse(readFileSync(casesFile, 'utf8')).filter(c => !only || c.id === only)
let { browser, page } = await connect()
const patient = { name: 'TESTE', surname: 'DRIVER', dob: '01/01/1996' }
const results = []
try {
  await page.reload({ waitUntil: 'load' }).catch(() => {}); await page.waitForTimeout(3000) // estado limpo após travamentos
  await openPatient(page, patient)
  for (const c of cases) {
    const t0 = Date.now()
    try { await setMaternal(page, c.maternal); const r = await setTrisomies(page, c.tri); r.ms = Date.now() - t0; results.push({ id: c.id, ...r }); writeFileSync(outFile, JSON.stringify(results, null, 1)); console.log(`${c.id}: T21 1 in ${r.t21 ?? '-'} | T18/13 1 in ${r.t18t13 ?? '-'} | prior21 ${r.prior21 ?? '-'} | raw ${JSON.stringify(r.raw).slice(0, 160)}${r.calcPending ? ' | AVISO: botão ainda presente' : ''} (${r.ms} ms)`); if (!r.t21) console.log('   bloco:', (r.bloco ?? '').slice(0, 300)) }
    catch (e) { const msg = e.message.split('\n')[0]; results.push({ id: c.id, error: msg }); console.log(`${c.id}: ERRO ${msg}`); if (/Target crashed|Target closed|has been closed|Connection closed|ECONNREFUSED/i.test(msg)) { try { await browser.close() } catch {} ;({ browser, page } = await relaunchApp()); await openPatient(page, patient) } else { try { await openPatient(page, patient) } catch {} } }
  }
} finally { writeFileSync(outFile, JSON.stringify(results, null, 1)); await browser.close() }
