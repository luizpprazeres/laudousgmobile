// Driver do app FMF (Electron, https://fmf.refractionx.com) via CDP. Sem LLM no loop.
import { chromium } from 'playwright-core'

export async function connect(port = 9222) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  const page = browser.contexts()[0].pages().find(p => p.url().includes('refractionx')) ?? browser.contexts()[0].pages()[0]
  page.setDefaultTimeout(8000)
  return { browser, page }
}
const T = (page, id) => page.locator(`[data-testid="${id}"]`).first()
const has = async (page, id) => (await page.locator(`[data-testid="${id}"]`).count()) > 0
const text = async page => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ')

export async function typeInto(page, id, value) {
  const el = T(page, id)
  const want = String(value)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(want)) return typeDate(page, el, want)
  const cur = await el.inputValue().catch(() => null)
  if (cur !== null && cur === want) return
  await el.scrollIntoViewIfNeeded().catch(() => {})
  for (let attempt = 0; attempt < 3; attempt++) {
    try { await el.click({ timeout: 3000 }) } catch { await el.evaluate(input => input.focus()) }
    await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace')
    // campos com máscara (datas) só aceitam apagar caractere a caractere
    for (let k = 0; k < 14 && (await el.inputValue().catch(() => '')) !== ''; k++) { await page.keyboard.press('End'); await page.keyboard.press('Backspace') }
    await page.keyboard.type(want, { delay: 40 })
    await page.keyboard.press('Tab'); await page.waitForTimeout(300)
    for (let k = 0; k < 6; k++) {
      await page.waitForTimeout(250)
      const got = await el.inputValue().catch(() => null)
      if (got === want || (Number.isFinite(Number(want)) && Number(got) === Number(want))) return
    }
  }
  throw new Error(`campo ${id}: esperado "${want}", ficou "${await el.inputValue().catch(() => '?')}"`)
}
/** Campos de data com máscara: só aceitam digitação a partir do vazio; a máscara demora a refletir. */
async function typeDate(page, el, want) {
  const cur = await el.inputValue().catch(() => '')
  if (cur === want) return
  await el.scrollIntoViewIfNeeded().catch(() => {})
  for (let attempt = 0; attempt < 4; attempt++) {
    try { await el.click({ timeout: 3000 }) } catch { await el.evaluate(i => i.focus()) }
    await page.keyboard.press('End')
    for (let k = 0; k < 12; k++) await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    if ((await el.inputValue().catch(() => '')) !== '') { await el.evaluate(i => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })) }); await page.waitForTimeout(200) }
    await page.keyboard.type(want, { delay: 30 })
    await page.keyboard.press('Tab')
    for (let k = 0; k < 8; k++) { await page.waitForTimeout(250); if ((await el.inputValue().catch(() => '')) === want) return }
  }
  throw new Error(`data: esperado "${want}", ficou "${await el.inputValue().catch(() => '?')}"`)
}
export async function press(page, id) {
  const el = T(page, id)
  await el.scrollIntoViewIfNeeded().catch(() => {})
  try { await el.click({ timeout: 3000 }) } catch {
    const b = await el.boundingBox().catch(() => null)
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    else await el.dispatchEvent('click')
  }
  await page.waitForTimeout(250)
}
/** Rádios do app são Pressables que ALTERNAM: clicar um já selecionado o desmarca. Só clica se preciso. */
export async function isRadioSelected(page, id) {
  return page.evaluate((id) => { const e = document.querySelector(`[data-testid="${id}"]`); return !!(e && e.querySelector(':scope > div > div')) }, id)
}
export async function pressRadio(page, id) {
  if (await isRadioSelected(page, id)) return
  await press(page, id)
  if (!(await isRadioSelected(page, id))) { await press(page, id) }
}
export async function select(page, id, label) {
  // os selects nativos têm testid "<id>-native"; o "<id>" é o wrapper
  const el = (await has(page, `${id}-native`)) ? T(page, `${id}-native`) : T(page, id)
  const cur = await el.evaluate(e => e.options[e.selectedIndex]?.text).catch(() => null)
  if (cur === label) return
  await el.selectOption({ label }); await page.waitForTimeout(300)
}
export const fmtDate = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`

/** Diálogos "Are you sure…" com botão Confirm. */
export async function confirmDialog(page) {
  await page.waitForTimeout(500)
  const btn = page.getByText('Confirm', { exact: true }).first()
  if (await btn.count()) { await btn.click({ timeout: 3000 }).catch(() => btn.dispatchEvent('click')); await page.waitForTimeout(1200); return true }
  return false
}
/** Garante gestação + exame na ficha aberta e devolve quando o acordeão de calculadoras existir (ou não). */
export async function ensureExamination(page) {
  const t = await text(page)
  if (!/Pregnancies\s+1/.test(t) && (await has(page, 'new-pregnancy'))) { await press(page, 'new-pregnancy'); await page.waitForTimeout(1000) }
  if (!/Examinations\s+1/.test(await text(page)) && (await has(page, 'new-examination'))) { await press(page, 'new-examination'); await page.waitForTimeout(1200) }
}
export async function goHome(page) { await T(page, 'home').click(); await page.waitForTimeout(800) }
export async function goPatients(page) { await goHome(page); await page.getByText('Patients', { exact: true }).first().click(); await page.waitForTimeout(1000) }

/** Abre (ou cria) a paciente de teste pelo sobrenome. */
export async function openPatient(page, { name, surname, dob }) {
  await goPatients(page)
  // a lista mostra "<id> NOME SOBRENOME" num único texto; NUNCA criar outra paciente se já existir uma
  let row = page.getByText(new RegExp(`\\b${name}\\s+${surname}\\b`)).first()
  if (!(await row.count())) row = page.locator(`xpath=//*[normalize-space(text())="${surname}"]/ancestor::*[contains(., "${name}")][1]`).first()
  if (await row.count()) { await row.click(); await page.waitForTimeout(1200) }
  else {
    await typeInto(page, 'search-name', name); await typeInto(page, 'search-surname', surname); await typeInto(page, 'date-of-birth', dob)
    await T(page, 'add-patient').click(); await page.waitForTimeout(1500)
  }
  if (!(await has(page, 'patient-surname'))) throw new Error('não abriu a ficha da paciente')
  await ensureExamination(page)
}
/** Abre as calculadoras (aparecem só com exame datado + operador). */
export async function openCalculators(page) {
  for (let i = 0; i < 10 && !(await has(page, 'calculators-accordion')); i++) await page.waitForTimeout(500)
  if (!(await has(page, 'calculators-accordion'))) throw new Error('acordeão de calculadoras não apareceu (exame datado? operador?)')
  if (!(await has(page, 'preeclampsia-tab'))) { await press(page, 'calculators-accordion'); await page.waitForTimeout(600) }
}

/** Preenche dados maternos + gestação atual (datação manual para IG exata). */
export async function setMaternal(page, m) {
  if (m.dob) await typeInto(page, 'date-of-birth', m.dob)
  if (m.height != null) await typeInto(page, 'height', m.height)
  if (m.weight != null) await typeInto(page, 'weight', m.weight)
  if (m.ethnicity) await select(page, 'ethnicity', m.ethnicity)
  await pressRadio(page, m.smoking ? 'smoking-yes' : 'smoking-no')
  if (m.gaWeeks != null) {
    await select(page, 'pregnancy-method', 'Manual')
    // com datação manual os dois inputs de IG ficam editáveis (sem testid): são os dois inputs após o rótulo "Gestational age"
    const [w, d] = await page.evaluate(() => { const lab = [...document.querySelectorAll('div,span')].find(el => el.children.length === 0 && el.innerText?.trim() === 'Gestational age'); const all = [...document.querySelectorAll('input')]; const after = all.filter(i => lab.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING); after[0].setAttribute('data-testid', 'ga-weeks-manual'); after[1].setAttribute('data-testid', 'ga-days-manual'); return [after[0].value, after[1].value] })
    await typeInto(page, 'ga-weeks-manual', m.gaWeeks); await typeInto(page, 'ga-days-manual', m.gaDays ?? 0)
    // datar a gestação (botão "Click this button to date the pregnancy")
    // datar e CONFIRMAR até o exame aparecer datado com a IG pedida ("… 11w 6d" em vez de "Not dated")
    const examGA = async () => { const m = (await text(page)).match(/Examinations\s+1\s+[\d/]+\s+(\d+)w\s+(\d+)d/); return m ? `${m[1]}+${m[2]}` : null }
    const want = `${m.gaWeeks}+${m.gaDays ?? 0}`
    for (let k = 0; k < 3 && (await examGA()) !== want; k++) {
      if (await has(page, 'redate-button-pregnancy')) { await press(page, 'redate-button-pregnancy'); await confirmDialog(page) }
      await page.waitForTimeout(800)
    }
    if ((await examGA()) !== want) throw new Error(`exame não datado com ${want} (está "${await examGA()}")`)
    // confirmar a opção de datação se o app oferecer (ex.: dating-option-manual-...)
    const opt = page.locator('[data-testid^="dating-option-"]').first(); if (await opt.count()) { const cb = opt.locator('input[type=checkbox]'); if (await cb.count() && !(await cb.isChecked())) await opt.click(); }
  }
  if (m.conception) await select(page, 'conception', m.conception)
  // operador do exame (select sem testid): escolhe a primeira opção não vazia se estiver vazio
  await page.evaluate(() => { const lab = [...document.querySelectorAll('div,span')].find(el => el.children.length === 0 && el.innerText?.trim() === 'Operator'); if (!lab) return; const sel = [...document.querySelectorAll('select')].find(s => lab.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); if (sel && !sel.value) { const opt = [...sel.options].find(o => o.value && o.text.trim()); if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })) } } })
  await page.waitForTimeout(300)
}

/** Preenche a calculadora de pré-eclâmpsia e recalcula. */
const dbg = async (page, tag) => { if (!process.env.DEBUG_PE) return; const t = await text(page); console.log(`   [${tag}] map-sr1 instâncias: ${await page.evaluate(() => [...document.querySelectorAll('[data-testid="map-sr1"]')].map(e => { const r = e.getBoundingClientRect(); return `y=${Math.round(r.y)} v=${r.width > 0 ? 1 : 0} val=${e.value}` }).join(' ; '))} | utpi-right: ${await page.locator('[data-testid="utpi-right"]').count()} | pe-tab y: ${await page.evaluate(() => Math.round(document.querySelector('[data-testid="preeclampsia-tab"]')?.getBoundingClientRect().y ?? -1))} | US-findings aberto: ${/Mean arterial pressure.*Mean arterial pressure/.test(t)}`); console.log(`   [${tag}] MAP: ${t.match(/MAP\s+[\d.]+ MoM/)?.[0] ?? '-'} | operador MAP: ${await page.evaluate(() => { const lab = [...document.querySelectorAll('div,span')].filter(el => el.children.length === 0 && el.innerText?.trim() === 'Operator').pop(); const sel = [...document.querySelectorAll('select')].find(s => lab && (lab.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)); return sel ? sel.options[sel.selectedIndex]?.text || '(vazio)' : '(sem select)' })} | recalc: ${await page.locator('[data-testid="pe-calculate"]').count()}`) }
export async function setPreeclampsia(page, pe) {
  await openCalculators(page)
  await press(page, 'preeclampsia-tab'); await page.waitForTimeout(800)
  const yn = (id, v) => pressRadio(page, `${id}-${v ? 'yes' : 'no'}`)
  await yn('ch', pe.chronicHypertension); await yn('db1', pe.diabetes1); await yn('db2', pe.diabetes2); await yn('fHist', pe.familyHistoryPE); await yn('sle', pe.sle); await yn('aps', pe.aps)
  if (pe.parity === 'nulliparous') await pressRadio(page, 'nullip')
  else {
    await pressRadio(page, 'multip'); await page.waitForTimeout(300)
    await yn('prev-pe', pe.previousPE); await yn('prev-gdm', pe.previousGDM ?? false)
    if (pe.deliveryDate) await typeInto(page, 'multip-date-of-delivery', pe.deliveryDate)
    await typeInto(page, 'multip-ga-weeks', pe.deliveryGAWeeks); await typeInto(page, 'multip-ga-days', pe.deliveryGADays ?? 0)
    if (pe.birthWeight != null) await typeInto(page, 'bw', pe.birthWeight)
  }
  await dbg(page, 'após história/paridade')
  await pressRadio(page, 'fha-present')
  const bp = pe.bp // [[sr,dr],[sl,dl],[sr2,dr2],[sl2,dl2]]
  const ids = ['map-sr1', 'map-dr1', 'map-sl1', 'map-dl1', 'map-sr2', 'map-dr2', 'map-sl2', 'map-dl2']
  const flat = bp.flat(); for (let i = 0; i < 8; i++) await typeInto(page, ids[i], flat[i])
  await dbg(page, 'após BP')
  if (!(await has(page, 'utpi-right'))) { await press(page, 'utpi-accordion'); await page.waitForTimeout(500) }
  if (pe.utpi) { await typeInto(page, 'utpi-right', pe.utpi[0]); await typeInto(page, 'utpi-left', pe.utpi[1]) }
  else { for (const id of ['utpi-right', 'utpi-left', 'utpi-mean']) { const el = T(page, id); if ((await el.inputValue().catch(() => '')) !== '') { await el.click({ timeout: 3000 }).catch(() => el.evaluate(i => i.focus())); await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); await page.keyboard.press('Tab'); await page.waitForTimeout(200) } } }
  await dbg(page, 'antes do calc')
  for (let i = 0; i < 3; i++) {
    if (await has(page, 'pe-calculate')) {
      await press(page, 'pe-calculate')
      for (let k = 0; k < 12 && (await has(page, 'pe-calculate')); k++) await page.waitForTimeout(500)
      await page.waitForTimeout(800)
    }
    const r = await readPreeclampsia(page)
    if (process.env.DEBUG_PE) console.log(`   [calc ${i}] ${(await text(page)).match(/Risk of preeclampsia.{0,120}/)?.[0] ?? 'SEM BLOCO DE RISCO'} | recalc: ${await page.locator('[data-testid="pe-calculate"]').count()}`)
    if (r.riskN != null && !r.recalcPending) return r
    await page.waitForTimeout(1500)
  }
  return readPreeclampsia(page)
}

export async function readPreeclampsia(page) {
  const t = await text(page)
  const risk = t.match(/(History[A-Za-z, -]*): 1 in (\d+)/)
  const val = async id => (await T(page, id).inputValue().catch(() => null))
  return {
    riskLabel: risk?.[1] ?? null, riskN: risk ? Number(risk[2]) : null,
    mapMom: Number(t.match(/MAP\s+([\d.]+) MoM/)?.[1] ?? NaN), utpiMom: Number(await val('utpi-mom')),
    map: Number(await val('map-mom')), utpiMean: Number(await val('utpi-mean')),
    age: Number(await page.evaluate(() => { const lab = [...document.querySelectorAll('div,span')].find(el => el.children.length === 0 && el.innerText?.trim() === 'Age'); const all = [...document.querySelectorAll('input')]; return all.find(i => lab && (lab.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING))?.value })),
    gaWeeks: Number(await val('ga-weeks-manual')), gaDays: Number(await val('ga-days-manual')),
    messages: (t.match(/Please[^.]{0,140}\./g) || []).join(' | '),
    interval: Number(await page.evaluate(() => { const lab = [...document.querySelectorAll('div,span')].find(el => el.children.length === 0 && el.innerText?.trim() === 'Inter-pregnancy interval'); const all = [...document.querySelectorAll('input')]; return all.find(i => lab && (lab.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING))?.value }) || NaN),
    highRisk: /increased risk/.test(t), recalcPending: (await page.locator('[data-testid="pe-calculate"]').count()) > 0,
  }
}

/** Trissomias (1º trimestre). Campos mapeados por sondagem em 15/09/2026. */
export async function setTrisomies(page, t) {
  await openCalculators(page)
  await press(page, 'trisomies-tab'); await page.waitForTimeout(800)
  const yn = (id, v) => pressRadio(page, `${id}-${v ? 'yes' : 'no'}`)
  await yn('ch', !!t.chronicHypertension); await yn('db1', !!t.diabetes1); await yn('db2', !!t.diabetes2); await yn('fHist', !!t.familyHistoryPE); await yn('sle', !!t.sle); await yn('aps', !!t.aps)
  await pressRadio(page, t.parous ? 'multip' : 'nullip')
  await yn('prev-t21', !!t.previousT21); await yn('prev-t18', !!t.previousT18); await yn('prev-t13', !!t.previousT13)
  await pressRadio(page, 'fha-present')
  const clearIf = async (id, present) => { if (present) return; if (!(await has(page, id))) return; const el = T(page, id); if ((await el.inputValue().catch(() => '')) !== '') { await el.click({ timeout: 3000 }).catch(() => el.evaluate(i => i.focus())); await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); await page.keyboard.press('Tab'); await page.waitForTimeout(200) } }
  if (t.crl != null) await typeInto(page, 'fetus-0-crl', t.crl)
  if (t.nt != null) await typeInto(page, 'nt-input', t.nt)
  await clearIf('fhr-input', t.fhr != null); if (t.fhr != null) await typeInto(page, 'fhr-input', t.fhr)
  await clearIf('dvpi-input', t.dvpi != null)
  await select(page, 'nasal-bone', t.nasalBone ?? 'Not examined')
  await select(page, 'tricuspid', t.tricuspid ?? 'Not examined')
  await select(page, 'dvawave', t.dvAWave ?? 'Not examined')
  if (t.dvpi != null) await typeInto(page, 'dvpi-input', t.dvpi)
  if (process.env.DEBUG_TRI) console.log('   selects:', await page.evaluate(() => ['nasal-bone-native','tricuspid-native','dvawave-native'].map(id => { const e = document.querySelector(`[data-testid="${id}"]`); return id + '=' + (e ? e.options[e.selectedIndex]?.text : '?') }).join(' ')))
  for (const id of ['holoprosencephaly', 'diaphragmatic-hernia', 'av-septum-defect', 'megacystis']) await yn(id, false)
  await select(page, 'exomphalos', 'No')
  if (t.pappaMom != null || t.freeBhcgMom != null) {
    if (!(await has(page, 'pappa-mom'))) { await press(page, 'biochemical-accordion'); await page.waitForTimeout(800) }
    if (t.pappaMom != null) await typeInto(page, 'pappa-mom', t.pappaMom)
    if (t.freeBhcgMom != null) await typeInto(page, 'freebhcg-mom', t.freeBhcgMom)
  } else {
    // bioquímica oculta continua valendo no cálculo: abrir o acordeão e limpar sempre que o caso não tiver MoMs
    if (!(await has(page, 'pappa-mom'))) { await press(page, 'biochemical-accordion'); await page.waitForTimeout(800) }
    for (const id of ['pappa-mom', 'freebhcg-mom']) { const el = T(page, id); if ((await el.inputValue().catch(() => '')) !== '') { await el.click({ timeout: 3000 }).catch(() => el.evaluate(i => i.focus())); await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); await page.keyboard.press('Tab'); await page.waitForTimeout(200) } }
  }
  const sig = JSON.stringify(t); const changed = lastTri.sig !== null && lastTri.sig !== sig
  // "cutucar": re-digita o primeiro campo numérico presente (o RN Web às vezes não registra a mudança → sem botão de recálculo → leitura do caso anterior)
  const nudge = async () => { for (const [id, v] of [['fhr-input', t.fhr], ['nt-input', t.nt], ['fetus-0-crl', t.crl]]) { if (v == null) continue; const el = T(page, id); await el.click({ timeout: 3000 }).catch(() => el.evaluate(i => i.focus())); await page.keyboard.press('Meta+A'); await page.keyboard.press('Backspace'); await page.waitForTimeout(200); await page.keyboard.type(String(v), { delay: 60 }); await page.keyboard.press('Tab'); await page.waitForTimeout(500); return } }
  let r = null
  for (let i = 0; i < 4; i++) {
    if (!(await has(page, 'trisomies-calculate')) && (changed || lastTri.sig === null)) { if (i > 0 || changed) await nudge(); await page.waitForTimeout(400) }
    if (await has(page, 'trisomies-calculate')) { await press(page, 'trisomies-calculate'); for (let k = 0; k < 12 && (await has(page, 'trisomies-calculate')); k++) await page.waitForTimeout(500); await page.waitForTimeout(800) }
    r = await readTrisomies(page)
    // leitura estável: relê após 1,5 s e exige igualdade (evita ler resultado do caso anterior)
    for (let k = 0; k < 3; k++) { await page.waitForTimeout(1500); const r2 = await readTrisomies(page); if (r2.t21 === r.t21 && r2.t18t13 === r.t18t13) break; r = r2 }
    const same = lastTri.r && r.t21 === lastTri.r.t21 && r.t18t13 === lastTri.r.t18t13 && r.prior21 === lastTri.r.prior21
    if (r.t21 != null && !(changed && same)) { r.retries = i; break }
    r.suspect = true; await page.waitForTimeout(800)
  }
  lastTri.sig = sig; lastTri.r = r
  return r
}
const lastTri = { sig: null, r: null }
export async function readTrisomies(page) {
  const t = await text(page)
  const grab = async id => (await page.locator(`[data-testid="${id}"]`).first().innerText({ timeout: 2500 }).catch(() => '')).replace(/\s+/g, ' ').trim()
  const n = s => { const m = String(s).match(/1 in (\d+)/); return m ? Number(m[1]) : null }
  const raw = { t21: await grab('trisomy-risk-t21'), t18t13: await grab('trisomy-risk-t18t13'), p21: await grab('trisomy-prior-t21'), p18t13: await grab('trisomy-prior-t18t13') }
  const i = t.indexOf('Trisomy 21'); const bloco = i >= 0 ? t.slice(i, i + 600) : null
  const val = async id => (await T(page, id).inputValue().catch(() => null))
  return { t21: n(raw.t21), t18t13: n(raw.t18t13), prior21: n(raw.p21), prior18t13: n(raw.p18t13), raw, bloco, crl: await val('fetus-0-crl'), nt: await val('nt-input'), calcPending: await has(page, 'trisomies-calculate') }
}

/** Relança o FMF com a porta de depuração (após "Target crashed") e reconecta. */
export async function relaunchApp(port = 9222) {
  const { execSync } = await import('node:child_process')
  try { execSync(`osascript -e 'tell application "FMF" to quit'`, { stdio: 'ignore' }) } catch {}
  for (let i = 0; i < 10; i++) { try { execSync('pgrep -x FMF', { stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000)) } catch { break } }
  try { execSync('pkill -x FMF', { stdio: 'ignore' }) } catch {}
  execSync(`open -a FMF --args --remote-debugging-port=${port}`)
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 1000)); try { const res = await fetch(`http://127.0.0.1:${port}/json`); const pages = await res.json(); if (pages.some(p => p.url.includes('refractionx'))) break } catch {} }
  await new Promise(r => setTimeout(r, 4000))
  return connect(port)
}
