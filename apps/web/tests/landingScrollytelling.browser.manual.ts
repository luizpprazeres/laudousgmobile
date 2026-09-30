/**
 * Landing scrollytelling: contrato browser independente do app.
 *
 * Rodar da raiz, após Atlas liberar o preview:
 *   LANDING_PREVIEW_URL=http://127.0.0.1:PORT \
 *   PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
 *   pnpm exec tsx apps/web/tests/landingScrollytelling.browser.manual.ts
 *
 * O preview deve ser LOCAL. Este script nunca chama checkout, geração de laudo
 * ou microfone reais: intercepta as tentativas e falha se a landing as fizer.
 * Contratos lidos dos componentes v2 integrados: seção
 * [data-landing-section="mobile"][data-stage] com sete etapas controladas pela rolagem e vídeo pausado; [data-hero-demo] com grupo de órgãos e painel no mobile,
 * fieldsets e article[aria-label="Laudo de exemplo"] no desktop.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

type Viewport = { width: number; height: number }
const viewports: Viewport[] = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]
const target = process.env.LANDING_PREVIEW_URL
assert.ok(target, 'defina LANDING_PREVIEW_URL para o preview local liberado por Atlas')
const base = new URL(target)
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'harness só aceita preview local')
const origin = base.origin
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const shots = process.env.LANDING_QA_SHOTS
const mobileStageSelector = '[data-landing-section="mobile"]'
const mobileControlsSelector = `${mobileStageSelector} nav[aria-label="Etapas da demonstração"] button[data-stage]`
const expectedStages = ['inicio', 'categoria', 'gravacao', 'achados', 'geracao', 'laudo', 'sala']
const expectedGroups = ['Medicina interna', 'Obstetrícia', 'Saúde da mulher', 'Pequenas partes', 'Musculoesquelético']
const activeExams = [
  'ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS', 'PROSTATA_SUPRAPUBICA', 'DOPPLER_CAROTIDAS',
  'OBSTETRICA', 'DOPPLER_OBSTETRICO', 'MORFOLOGICO', 'CERVICOMETRIA', 'PELVE_FEMININA', 'MAMARIA',
  'TIREOIDE', 'CERVICAL', 'PARTES_MOLES', 'MUSCULOESQUELETICO',
]
const upcomingExams = [
  'Próstata transretal', 'Doppler renal', 'Região inguinal', 'Parede abdominal', 'Doppler de fístula arteriovenosa',
  'Transfontanelar', 'Escrotal', 'Ocular', 'Paratireoide',
]
const mskRegions = ['Ombro', 'Cotovelo', 'Punho', 'Mão', 'Quadril', 'Joelho', 'Tornozelo', 'Pé']

function isForbiddenRequest(raw: string): 'hero-video' | 'api' | null {
  const url = new URL(raw)
  if (url.origin === origin && url.pathname === '/landing/mobile-real/demonstracao-real.mp4') return null
  if (/hero-loop|\.(?:mp4|webm)(?:$|\?)/i.test(url.pathname)) return 'hero-video'
  if (url.origin === origin && /^\/api\//.test(url.pathname)) return 'api'
  return null
}

async function afterPaint(page: any) {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}

async function geometry(page: any, label: string) {
  const data = await page.evaluate(() => {
    const doc = document.documentElement
    const header = document.querySelector('header')?.getBoundingClientRect() ?? null
    return {
      width: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      header: header ? { top: header.top, bottom: header.bottom, height: header.height } : null,
      scrollY: window.scrollY,
    }
  })
  assert.ok(data.scrollWidth <= data.width + 1, `${label}: overflow horizontal ${data.scrollWidth}>${data.width}`)
  if (data.header && data.scrollY > 80) {
    assert.ok(data.header.top >= -2 && data.header.top < 3, `${label}: header perdeu sticky/fixed (${data.header.top})`)
  }
  return data
}

async function checkCtas(page: any, viewport: Viewport) {
  const required = ['/signup', '/login', '/precos', '#precos', '/privacy', '/terms']
  const hrefs = await page.locator('a[href]').evaluateAll((nodes: HTMLAnchorElement[]) => nodes.map((node) => node.getAttribute('href')))
  for (const href of required) assert.ok(hrefs.includes(href), `${viewport.width}: link ${href} desapareceu`)
  assert.equal(await page.locator('#precos').count(), 1, `${viewport.width}: âncora de preços ausente/duplicada`)

  const primary = page.locator('header a[href="/signup"], main a[href="/signup"], main a[href="/precos"]')
  assert.ok(await primary.count() > 0, `${viewport.width}: CTAs primários ausentes`)
  for (let i = 0; i < await primary.count(); i += 1) {
    const link = primary.nth(i)
    if (!await link.isVisible()) continue
    await link.scrollIntoViewIfNeeded()
    await afterPaint(page)
    const box = await link.boundingBox()
    assert.ok(box, `${viewport.width}: CTA sem geometria`)
    if (viewport.width <= 390) assert.ok(box.height >= 44, `${viewport.width}: CTA menor que 44px (${box.height})`)
    const hit = await page.evaluate(([x, y]: number[]) => {
      const element = document.elementFromPoint(x, y)
      return element?.closest('a')?.getAttribute('href') ?? null
    }, [box.x + box.width / 2, box.y + box.height / 2])
    assert.equal(hit, await link.getAttribute('href'), `${viewport.width}: CTA coberto no centro`)
  }
}

async function checkKeyboard(page: any, label: string) {
  const cta = page.locator('header a[href="/signup"]').first()
  await cta.focus()
  assert.equal(await cta.evaluate((node: HTMLElement) => document.activeElement === node), true, `${label}: CTA não recebe foco`)
  const focus = await cta.evaluate((node: HTMLElement) => {
    const style = getComputedStyle(node)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow }
  })
  assert.ok(focus.outlineStyle !== 'none' || focus.boxShadow !== 'none', `${label}: foco do CTA não é perceptível`)
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement?.tagName === 'BODY'), false, `${label}: Tab perdeu sequência de foco`)
}

async function checkPricing(page: any, viewport: Viewport) {
  const section = page.locator('#precos')
  assert.equal(await section.count(), 1, `${viewport.width}: seção de preços ausente/duplicada`)
  await section.scrollIntoViewIfNeeded()
  await geometry(page, `${viewport.width} preços`)
  for (const plan of ['Gratuito', 'Essencial', 'Profissional']) {
    assert.equal(await section.getByText(plan, { exact: true }).count(), 1, `${viewport.width}: plano ${plan} ausente/duplicado`)
  }
  assert.equal(await section.locator('a[href="/signup"]').count(), 1, `${viewport.width}: CTA gratuito incorreto`)
  assert.equal(await section.locator('a[href="/precos"]').count(), 2, `${viewport.width}: CTAs de assinatura incorretos`)
}

async function checkSpecialties(page: any, viewport: Viewport) {
  const section = page.locator('[data-landing-section="especialidades"]')
  assert.equal(await section.count(), 1, `${viewport.width}: seção de especialidades ausente/duplicada`)
  const groups = section.locator('[data-specialty-group]:visible')
  assert.equal(await groups.count(), 5, `${viewport.width}: grupos de especialidades visíveis != 5`)
  for (let i = 0; i < expectedGroups.length; i += 1) {
    const group = groups.nth(i)
    assert.equal(await group.getAttribute('data-specialty-group'), expectedGroups[i], `${viewport.width}: grupo fora de ordem`)
    const tiles = group.locator('[data-category-tile]')
    assert.ok(await tiles.count() > 0, `${viewport.width}: grupo ${expectedGroups[i]} vazio`)
    for (let j = 0; j < await tiles.count(); j += 1) {
      assert.ok((await tiles.nth(j).getAttribute('data-category-tile'))?.trim(), `${viewport.width}: tile sem categoria`)
      assert.ok((await tiles.nth(j).innerText()).trim(), `${viewport.width}: tile sem nome`)
      assert.equal(await tiles.nth(j).getAttribute('data-exam-status'), 'available', `${viewport.width}: exame ativo sem estado explícito`)
      assert.equal(await tiles.nth(j).locator('button, a').count(), 0, `${viewport.width}: exame apresentado como botão/cartão independente`)
    }
  }

  const available = section.locator('[data-category-tile]')
  const ids: string[] = []
  for (let i = 0; i < await available.count(); i += 1) ids.push((await available.nth(i).getAttribute('data-category-tile')) ?? '')
  assert.deepEqual(ids, activeExams, `${viewport.width}: catálogo ativo deixou de preservar os 15 exames ou mudou sua ordem`)
  const text = await section.innerText()
  assert.match(text, /Próstata transabdominal \(suprapúbica\)/, `${viewport.width}: modalidade suprapúbica sem técnica explícita`)

  const regions = section.locator('[data-msk-region]')
  assert.deepEqual(await regions.evaluateAll((nodes: HTMLElement[]) => nodes.map((node) => node.getAttribute('data-msk-region'))), mskRegions, `${viewport.width}: regiões musculoesqueléticas incompletas`)

  const upcoming = section.locator('[data-coming-soon]')
  assert.deepEqual(await upcoming.evaluateAll((nodes: HTMLElement[]) => nodes.map((node) => node.getAttribute('data-coming-soon'))), upcomingExams, `${viewport.width}: lista de planejados alterada/incompleta`)
  for (let i = 0; i < await upcoming.count(); i += 1) {
    const exam = upcoming.nth(i)
    assert.equal(await exam.getAttribute('data-exam-status'), 'upcoming', `${viewport.width}: exame futuro sem estado`)
    assert.equal(await exam.getByLabel('Em breve').count(), 1, `${viewport.width}: selo Em breve ausente/duplicado`)
    assert.equal(await exam.locator('button, a').count(), 0, `${viewport.width}: exame futuro aparenta estar selecionável`)
  }
  assert.doesNotMatch(text, /abdome total\s*\+\s*pr[oó]stata|procedimentos guiados/i, `${viewport.width}: mistura composição de exames ou procedimento guiado`)
}

async function checkSchemes(page: any, viewport: Viewport) {
  const section = page.locator('[data-landing-section="esquemas"]')
  assert.equal(await section.count(), 1, `${viewport.width}: seção de esquemas ausente/duplicada`)
  await section.scrollIntoViewIfNeeded()
  await geometry(page, `${viewport.width} esquemas`)
  const ids = ['mama', 'tireoide', 'venoso']
  if (viewport.width >= 1024) {
    const deck = section.locator('[data-scheme-deck]')
    assert.ok(await deck.isVisible(), `${viewport.width}: baralho desktop invisível`)
    const controls = deck.getByRole('group', { name: 'Trazer esquema para a frente' }).getByRole('button')
    assert.equal(await controls.count(), ids.length, `${viewport.width}: controles de esquema incompletos`)
    for (let i = 0; i < ids.length; i += 1) {
      const control = controls.nth(i)
      await control.scrollIntoViewIfNeeded()
      const box = await control.boundingBox()
      assert.ok(box && box.width >= 32 && box.height >= 32, `${viewport.width}: controle de esquema pequeno/invisível`)
      const hit = await control.evaluate((node: HTMLElement) => {
        const box = node.getBoundingClientRect()
        return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === node
      })
      assert.ok(hit, `${viewport.width}: controle de esquema coberto`)
      await control.click()
      await page.waitForFunction((id: string) => document.querySelector('[data-scheme-deck]')?.getAttribute('data-active-card') === id, ids[i], { timeout: 1500 })
      assert.equal(await deck.getAttribute('data-active-card'), ids[i], `${viewport.width}: esquema ativo não acompanhou clique`)
      assert.equal(await control.getAttribute('aria-pressed'), 'true', `${viewport.width}: aria-pressed não acompanhou esquema`)
    }
  } else {
    const cards = section.locator('li[data-scheme-card]:visible')
    assert.equal(await cards.count(), ids.length, `${viewport.width}: faixa de esquemas incompleta`)
    for (let i = 0; i < ids.length; i += 1) {
      const card = cards.nth(i)
      assert.equal(await card.getAttribute('data-scheme-card'), ids[i], `${viewport.width}: esquema mobile fora de ordem`)
      await card.scrollIntoViewIfNeeded()
      assert.ok(await card.isVisible(), `${viewport.width}: esquema mobile invisível`)
      // O snap horizontal pode terminar depois do scrollIntoView; medir o alvo estabilizado.
      await page.waitForFunction((node: HTMLElement) => {
        const r = node.getBoundingClientRect()
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('li[data-scheme-card]') === node
      }, await card.elementHandle(), { timeout: 2000 })
      const hit = await card.evaluate((node: HTMLElement) => {
        const box = node.getBoundingClientRect()
        return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('li[data-scheme-card]') === node
      })
      assert.ok(hit, `${viewport.width}: esquema mobile ${ids[i]} coberto no centro`)
      await page.waitForFunction((id: string) => {
        const image = document.querySelector(`li[data-scheme-card="${id}"] img`) as HTMLImageElement | null
        return Boolean(image?.complete && image.naturalWidth > 0)
      }, ids[i], { timeout: 5000 })
    }
  }
  assert.equal(await section.locator('[data-scheme-card="fetal"]').count(), 0, 'posição fetal removida reapareceu')
  const visibleCards = section.locator('[data-scheme-card]:visible')
  for (const card of await visibleCards.all()) {
    assert.match(await card.innerText(), /Caso fictício/i, 'esquema sem identificação demonstrativa')
    const id = await card.getAttribute('data-scheme-card')
    assert.match(await card.innerText(), id === 'venoso' ? /TVP · Veia femoral direita/ : /N1[\s\S]*C1/)
    assert.equal(await card.locator('img').getAttribute('src'), `/landing/esquemas/demo-${id}.svg`)
    if (id === 'venoso') assert.match(await card.innerText(), /Em breve/)
  }
  const images = section.locator('img[alt]')
  assert.ok(await images.count() >= ids.length, `${viewport.width}: imagens de esquema faltando`)
  for (let i = 0; i < await images.count(); i += 1) {
    assert.ok((await images.nth(i).getAttribute('alt'))?.trim(), `${viewport.width}: esquema sem ALT descritivo`)
  }
}

async function stageAt(page: any) {
  return page.locator(mobileStageSelector).getAttribute('data-stage')
}

async function awaitStage(page: any, expected: string, timeout = 75) {
  try {
    await page.waitForFunction(
      ([selector, step]: string[]) => document.querySelector(selector)?.getAttribute('data-stage') === step,
      [mobileStageSelector, expected],
      { timeout, polling: 25 },
    )
    return true
  } catch {
    return false
  }
}

async function mobileScrollRange(page: any, viewport: Viewport) {
  assert.equal(await page.locator(mobileStageSelector).count(), 1, `${viewport.width}: seção mobile ausente/duplicada`)
  const bounds = await page.locator(mobileStageSelector).evaluate((node: HTMLElement) => {
    const rect = node.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const maxPage = document.documentElement.scrollHeight - window.innerHeight
    return { start: Math.max(0, top - 2), end: Math.min(maxPage, top + rect.height - window.innerHeight + 2) }
  })
  assert.ok(bounds.end > bounds.start + viewport.height, `${viewport.width}: seção mobile curta para cinco etapas sticky`)
  return bounds
}

async function seekStage(page: any, viewport: Viewport, expected: string, start: number, end: number, direction: 1 | -1) {
  const stride = Math.max(12, Math.floor(Math.abs(end - start) / 100))
  const attempts = Math.ceil(Math.abs(end - start) / stride) + 1
  for (let index = 0; index <= attempts; index += 1) {
    const y = direction === 1 ? Math.min(end, start + index * stride) : Math.max(end, start - index * stride)
    await page.evaluate((nextY: number) => window.scrollTo(0, nextY), y)
    await afterPaint(page)
    await geometry(page, `${viewport.width} etapa ${expected} @${y}`)
    if (await awaitStage(page, expected)) return y
  }
  throw new Error(`${viewport.width}: etapa ${expected} não apareceu ao rolar ${direction === 1 ? 'para frente' : 'para trás'} dentro da seção mobile`)
}

async function checkScroll(page: any, viewport: Viewport) {
  const range = await mobileScrollRange(page, viewport)
  let cursor = range.start
  const seen: string[] = []
  const forwardTimes: number[] = []
  const video = page.locator(`${mobileStageSelector} video`)
  for (const expected of expectedStages) {
    cursor = await seekStage(page, viewport, expected, cursor, range.end, 1)
    seen.push((await stageAt(page)) ?? '')
    await page.waitForFunction(() => { const v = document.querySelector('#mobile video') as HTMLVideoElement | null; return !!v && v.readyState >= 2 && !v.seeking }, undefined, { timeout: 12000 })
    forwardTimes.push(await video.evaluate((v: HTMLVideoElement) => v.currentTime))
    assert.equal(await video.evaluate((v: HTMLVideoElement) => v.paused), true, 'vídeo tocando sem rolagem')
  }
  assert.ok(forwardTimes.at(-1)! > forwardTimes[0] + 70, 'rolagem não avançou a captura real')
  const stopped = await video.evaluate((v: HTMLVideoElement) => v.currentTime)
  await page.waitForTimeout(700)
  assert.ok(Math.abs(await video.evaluate((v: HTMLVideoElement) => v.currentTime) - stopped) < 0.05, 'vídeo avançou com rolagem parada')
  cursor = range.end
  const reverse: string[] = []
  for (const expected of [...expectedStages].reverse()) {
    cursor = await seekStage(page, viewport, expected, cursor, range.start, -1)
    reverse.push((await stageAt(page)) ?? '')
  }
  assert.deepEqual(seen, expectedStages, `${viewport.width}: sequência progressiva`)
  assert.deepEqual(reverse, [...expectedStages].reverse(), `${viewport.width}: sequência reversa`)
  await page.waitForFunction(() => { const v = document.querySelector('#mobile video') as HTMLVideoElement | null; return !!v && !v.seeking && v.currentTime < 4 }, undefined, { timeout: 12000 })
  assert.equal(await video.evaluate((v: HTMLVideoElement) => v.paused), true, 'vídeo em playback após retroceder')
  return { seen, reverse, forwardTimes }
}

async function checkWebDemo(page: any, viewport: Viewport) {
  const demo = page.locator('[data-hero-demo]')
  assert.equal(await demo.count(), 1, `${viewport.width}: demo Web ausente/duplicada`)
  const tabs = demo.getByRole('group', { name: 'Exames de exemplo' }).getByRole('button')
  const cases = [
    ['Abdome total', 'abdome-total'], ['Abdome superior', 'abdome-superior'],
    ['Pelve TV', 'pelve'], ['Tireoide', 'tireoide'],
  ]
  assert.equal(await tabs.count(), cases.length, `${viewport.width}: casos demonstrativos incompletos`)
  for (const [label, id] of cases) {
    const tab = demo.getByRole('button', { name: label, exact: true })
    await tab.focus()
    await page.keyboard.press('Enter')
    assert.equal(await demo.getAttribute('data-hero-mode'), 'manual', `${viewport.width}: foco/tecla não interrompeu autoplay`)
    assert.equal(await demo.getAttribute('data-hero-case'), id, `${viewport.width}: aba não mudou o caso`)
    assert.equal(await tab.getAttribute('aria-pressed'), 'true', `${viewport.width}: aba não selecionada`)
  }
  await demo.getByRole('button', { name: 'Abdome total', exact: true }).click()
  const report = demo.locator('article[aria-label="Laudo de exemplo"]')
  let field: any
  let shownReport: any
  if (viewport.width < 768) {
    const organs = demo.getByRole('group', { name: 'Escolher órgão de exemplo' }).getByRole('button')
    const organIds = ['figado', 'vesicula', 'rim']
    const panel = demo.locator('[data-hero-organ]')
    assert.equal(await organs.count(), 3, `${viewport.width}: seletores de órgãos incompletos`)
    assert.ok(await panel.isVisible(), `${viewport.width}: trecho mobile invisível`)
    assert.equal(await report.isVisible(), false, `${viewport.width}: laudo desktop indevidamente visível`)
    const reportLines: string[] = []
    for (let i = 0; i < organIds.length; i += 1) {
      const organ = organs.nth(i)
      const box = await organ.boundingBox()
      assert.ok(box && box.height >= 43.5, `${viewport.width}: seletor menor que 44px`)
      await organ.focus()
      await page.keyboard.press('Enter')
      assert.equal(await organ.getAttribute('aria-pressed'), 'true', `${viewport.width}: órgão não selecionado`)
      assert.equal(await panel.getAttribute('data-hero-organ'), organIds[i], `${viewport.width}: painel não acompanhou órgão`)
      assert.ok((await panel.locator('p').first().innerText()).includes((await organ.innerText()).trim()), `${viewport.width}: título não acompanhou órgão`)
      await panel.getByRole('button', { name: 'Normal', exact: true }).click()
      await page.waitForFunction(() => document.querySelector('[data-hero-demo]')?.getAttribute('data-stage') !== 'redigindo')
      const line = (await panel.getByText('No laudo', { exact: true }).locator('xpath=following-sibling::div[1]').innerText()).trim()
      assert.ok(line, `${viewport.width}: trecho do laudo vazio na aba ${i}`)
      reportLines.push(line)
    }
    assert.equal(new Set(reportLines).size, 3, `${viewport.width}: trocar órgão não mudou texto do laudo`)
    await organs.nth(1).click()
    field = panel
    shownReport = panel.getByText('No laudo', { exact: true }).locator('xpath=following-sibling::div[1]')
  } else {
    assert.equal(await report.count(), 1, `${viewport.width}: laudo ausente/duplicado`)
    assert.ok(await report.isVisible(), `${viewport.width}: laudo desktop invisível`)
    field = demo.getByRole('group', { name: 'Vesícula', exact: true })
    shownReport = report
  }
  await field.getByRole('button', { name: 'Normal', exact: true }).click()
  const finding = field.getByRole('button', { name: 'Litíase', exact: true })
  if (viewport.width < 768) {
    const box = await finding.boundingBox()
    assert.ok(box && box.height >= 43.5, `${viewport.width}: opção menor que 44px`)
  }
  await finding.click()
  assert.equal(await finding.getAttribute('aria-pressed'), 'true', `${viewport.width}: achado não selecionado`)
  const input = field.getByRole('textbox', { name: 'Maior eixo', exact: true })
  assert.equal(await input.inputValue(), '', `${viewport.width}: Litíase inventou medida antes da digitação`)
  assert.match(await shownReport.innerText(), /aguardando/i, `${viewport.width}: medida pendente não informada`)
  await input.fill('2,7')
  await page.waitForFunction(() => document.querySelector('[data-hero-demo]')?.getAttribute('data-stage') !== 'redigindo')
  assert.match(await shownReport.innerText(), /medindo 2,7 cm/, `${viewport.width}: medida manual não chegou ao laudo`)
  assert.equal(await demo.getAttribute('data-stage'), 'laudo', `${viewport.width}: etapa não acompanhou achado`)
  await page.waitForTimeout(5100)
  assert.equal(await input.inputValue(), '2,7', `${viewport.width}: autoplay sobrescreveu medida manual`)
  assert.equal(await demo.getAttribute('data-hero-case'), 'abdome-total', `${viewport.width}: autoplay retomou após interação`)
  assert.equal(await page.evaluate(() => (window as any).__landingQaCopies.length), 0, `${viewport.width}: clipboard escrito sem clique`)
  await demo.locator('button:visible').filter({ hasText: /^Copiar exemplo$/ }).click()
  const copies = await page.evaluate(() => (window as any).__landingQaCopies as string[])
  assert.equal(copies.length, 1, `${viewport.width}: clique não fez exatamente uma cópia`)
  assert.match(copies[0], /DADOS SINTÉTICOS/)
  assert.match(copies[0], /medindo 2,7 cm/)
  await geometry(page, `${viewport.width} hero manual`)
}

async function checkMobilePresentation(page: any, viewport: Viewport) {
  const section = page.locator(mobileStageSelector)
  assert.equal(await page.locator(mobileControlsSelector).count(), 0, `${viewport.width}: navegação de capítulos removida reapareceu`)
  await page.waitForFunction((selector: string) => {
    const section = document.querySelector(selector)
    const title = section?.querySelector('[aria-live="polite"] h3')?.textContent?.trim()
    return Boolean(title && section?.querySelector('[role="group"]')?.getAttribute('aria-label')?.includes(title))
  }, mobileStageSelector, { timeout: 1800 })
  assert.ok((await section.locator('[aria-live="polite"] h3').innerText()).trim(), `${viewport.width}: título da etapa vazio`)
  assert.equal(await section.getByRole('button', { name: /Pausar|Rever|Reproduzir/ }).count(), 0, `${viewport.width}: playback manual incompatível com scroll reapareceu`)
}

async function checkReducedMotion(page: any, viewport: Viewport) {
  const section = page.locator(mobileStageSelector)
  await section.scrollIntoViewIfNeeded()
  assert.equal(await section.getAttribute('data-stage'), 'sala', `${viewport.width}: reduced-motion não mostra a composição final`)
  assert.equal(await section.locator('video').count(), 0, `${viewport.width}: reduced-motion carregou vídeo`)
  assert.match(await section.innerText(), /Capturas reais · movimento reduzido/)
  const images = section.getByRole('group', { name: /^Demonstração do aplicativo LaudoUSG:/ }).locator('img')
  assert.equal(await images.count(), 2, `${viewport.width}: faltam captura do laudo e da Sala`)
  for (const image of await images.all()) {
    await image.evaluate((node: HTMLImageElement) => node.decode())
    assert.ok(await image.isVisible(), `${viewport.width}: captura reduzida invisível`)
  }
  const before = await section.innerText()
  await page.waitForTimeout(700)
  assert.equal(await section.innerText(), before, `${viewport.width}: captura reduzida continuou animando etapas`)
  await checkMobilePresentation(page, viewport)
  await geometry(page, `${viewport.width} reduced-motion`)
  return { mode: 'static-final' }
}

async function runViewport(browser: any, viewport: Viewport, reducedMotion: 'reduce' | 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion, hasTouch: viewport.width <= 390, isMobile: viewport.width <= 390 })
  const page = await context.newPage()
  const forbidden: string[] = []
  const pageErrors: string[] = []
  page.on('pageerror', (error: Error) => pageErrors.push(error.stack ?? error.message))
  await page.addInitScript(`
    Object.defineProperty(window, '__landingQaCopies', { value: [], configurable: true });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__landingQaCopies.push(text); } } });
    Object.defineProperty(window, '__landingQaMicCalls', { value: [], configurable: true });
    if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: (...args) => { window.__landingQaMicCalls.push(args); return Promise.reject(new Error('microfone bloqueado pelo QA')); },
    });
  `)
  await page.route('**/*', (route: any) => {
    const kind = isForbiddenRequest(route.request().url())
    if (kind) { forbidden.push(`${kind}: ${route.request().url()}`); return route.abort() }
    return route.continue()
  })
  try {
    const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 })
    assert.equal(response?.status(), 200, `${viewport.width}: landing não respondeu 200`)
    await page.locator('h1').first().waitFor({ state: 'visible' })
    await page.waitForTimeout(350)
    assert.deepEqual(pageErrors, [], `${viewport.width}: erro de hidratação/carregamento`)
    await afterPaint(page)
    if (process.env.LANDING_QA_HERO_ONLY === '1') {
      await checkWebDemo(page, viewport)
      assert.deepEqual(pageErrors, [], `${viewport.width}: erro de JavaScript no hero`)
      console.log(`PASS ${viewport.width}x${viewport.height} ${reducedMotion}: hero`)
      return
    }
    await geometry(page, `${viewport.width} início`)
    await checkCtas(page, viewport)
    await checkKeyboard(page, `${viewport.width}/${reducedMotion}`)
    await checkPricing(page, viewport)
    const fullLanding = process.env.LANDING_QA_FINAL === '1'
    if (fullLanding || await page.locator('[data-landing-section="especialidades"]').count()) await checkSpecialties(page, viewport)
    if (fullLanding || await page.locator('[data-landing-section="esquemas"]').count()) await checkSchemes(page, viewport)
    await checkWebDemo(page, viewport)
    const stages = reducedMotion === 'reduce'
      ? await checkReducedMotion(page, viewport)
      : await checkScroll(page, viewport)
    if (reducedMotion !== 'reduce') await checkMobilePresentation(page, viewport)
    const micCalls = await page.evaluate(() => (window as any).__landingQaMicCalls.length)
    assert.equal(micCalls, 0, `${viewport.width}: demo tentou usar microfone real`)
    assert.deepEqual(forbidden, [], `${viewport.width}: recurso proibido requisitado`)
    assert.deepEqual(pageErrors, [], `${viewport.width}: erro de JavaScript`)
    if (shots) {
      mkdirSync(shots, { recursive: true })
      await page.screenshot({ path: resolve(shots, `landing-${viewport.width}x${viewport.height}-${reducedMotion}.png`), fullPage: true })
    }
    console.log(`PASS ${viewport.width}x${viewport.height} ${reducedMotion}: ${JSON.stringify(stages)}`)
  } finally {
    await context.close()
  }
}

async function checkSlowNetwork(browser: any) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  const forbidden: string[] = []
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 400, downloadThroughput: 100 * 1024, uploadThroughput: 40 * 1024,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.route('**/*', (route: any) => {
    const kind = isForbiddenRequest(route.request().url())
    if (kind) { forbidden.push(`${kind}: ${route.request().url()}`); return route.abort() }
    return route.continue()
  })
  try {
    const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 })
    assert.equal(response?.status(), 200, 'rede lenta: landing não respondeu 200')
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15000 })
    assert.equal(await page.locator('#precos').count(), 1, 'rede lenta: oferta não chegou ao DOM')
    assert.deepEqual(forbidden, [], 'rede lenta: hero tentou vídeo ou demo tentou API')
    await geometry(page, '390 rede lenta')
    const domReady = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.toJSON().domContentLoadedEventEnd ?? null)
    console.log(`PASS 390x844 rede lenta: DOMContentLoaded=${domReady}ms (preview local; não é Lighthouse)`)
  } finally {
    await context.close()
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  try {
    if (process.env.LANDING_QA_SLOW_ONLY === '1') {
      await checkSlowNetwork(browser)
      return
    }
    const focused = process.env.LANDING_QA_VIEWPORT
    if (process.env.LANDING_QA_REDUCED_ONLY !== '1') {
      for (const viewport of viewports.filter((item) => !focused || String(item.width) === focused)) await runViewport(browser, viewport, 'no-preference')
    }
    if (!focused || focused === '390') await runViewport(browser, { width: 390, height: 844 }, 'reduce')
    if (!focused || focused === '320') await runViewport(browser, { width: 320, height: 568 }, 'reduce')
    if (!focused) await checkSlowNetwork(browser)
  } finally {
    await browser.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
