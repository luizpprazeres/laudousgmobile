// Uso: node run-pe.mjs cases.json results.json
import { readFileSync, writeFileSync } from 'node:fs'
import { connect, openPatient, setMaternal, setPreeclampsia, relaunchApp } from './lib.mjs'
const [,, casesFile, outFile] = process.argv
const only = process.env.ONLY
const cases = JSON.parse(readFileSync(casesFile, 'utf8')).filter(c => !only || c.id === only)
let { browser, page } = await connect()
const patient = { name: 'TESTE', surname: 'DRIVER', dob: '01/01/1996' }
const results = []
try {
  await openPatient(page, patient)
  for (const c of cases) {
    const t0 = Date.now()
    try {
      await setMaternal(page, c.maternal)
      const r = await setPreeclampsia(page, c.pe)
      r.ms = Date.now() - t0; results.push({ id: c.id, ...r })
      if (r.messages) console.log('   mensagens:', r.messages)
      console.log(`${c.id}: ${r.riskLabel ?? '-'} 1 in ${r.riskN ?? '-'} | MoM PAM ${r.mapMom} IP ${r.utpiMom} | idade ${r.age} IG ${r.gaWeeks}+${r.gaDays}${r.recalcPending ? ' | AVISO: botão Recalculate ainda presente' : ''} (${r.ms} ms)`)
    } catch (e) {
      const msg = e.message.split('\n')[0]
      results.push({ id: c.id, error: msg }); console.log(`${c.id}: ERRO ${msg}`)
      if (/Target crashed|Target closed|has been closed|Connection closed|ECONNREFUSED/i.test(msg)) {
        console.log('   app caiu — relançando…'); try { await browser.close() } catch {}
        ;({ browser, page } = await relaunchApp()); await openPatient(page, patient); console.log('   relançado e paciente reaberta')
      } else { try { await openPatient(page, patient) } catch {} }
    }
  }
} finally { writeFileSync(outFile, JSON.stringify(results, null, 1)); await browser.close() }
