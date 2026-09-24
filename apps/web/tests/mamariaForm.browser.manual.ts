/** Painel de mamas compacto — harness local, sem serviços externos.
 *
 * O que ele prova: a interação real no navegador (cliques, listas, campos)
 * grava as MESMAS chaves de sempre, o adaptador real as leva ao dado canônico e
 * o renderer real as coloca no texto; e o layout cabe em 1440 e em 390 px sem
 * rolagem horizontal, com alvos de 44 px no celular.
 *
 * O que ele NÃO prova: correção clínica do texto. O renderer é o de produção,
 * mas os casos são sintéticos e a leitura clínica é do médico.
 *
 * Rodar da raiz do repositório:
 *   PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
 *     pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaForm.browser.manual.ts
 * MAMA_SHOTS=/pasta salva screenshots de cada viewport.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'

type Achado = Record<string, unknown>

async function main() {
  const web = resolve('apps/web')
  const output = mkdtempSync(join(tmpdir(), 'mamaria-form-'))

  const bundle = await build({
    entryPoints: [join(web, 'tests/mamariaForm.browser.tsx')], bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', tsconfig: join(web, 'tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"' },
  })

  // CSS compilado agora, das fontes atuais — o .next pode estar defasado.
  const cssFile = join(output, 'style.css')
  execFileSync(resolve('node_modules/.bin/tailwindcss'), [
    '-c', join(web, 'tailwind.config.ts'),
    '-i', join(web, 'src/app/globals.css'),
    '--content', `${join(web, 'src/components/**/*.tsx')},${join(web, 'tests/mamariaForm.browser.tsx')}`,
    '-o', cssFile,
  ], { stdio: 'pipe' })
  const css = readFileSync(cssFile, 'utf8')

  let renders = 0
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); return }
      if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); res.end(css); return }
      if (req.method === 'POST' && req.url === '/render') {
        let raw = ''; for await (const chunk of req) raw += chunk
        const body = JSON.parse(raw)
        renders++
        const r = renderizarSelecao('MAMARIA', 'CLASSICO_COMPLETO', [], body.dados)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(r.ok ? r.texto : `ERRO: ${JSON.stringify(r)}`); return
      }
      if (req.url !== '/') { res.statusCode = 404; res.end(); return }
      res.setHeader('Content-Type', 'text/html')
      res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) { res.statusCode = 500; res.end(String(error)) }
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`

  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  const browser = await chromium.launch({ headless: true })
  const shots = process.env.MAMA_SHOTS
  if (shots) mkdirSync(shots, { recursive: true })

  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
      const mobile = viewport.name === 'mobile'
      // Movimento reduzido: as transições de cor não entram nas medições nem nas capturas.
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
      const errors: string[] = []
      page.on('pageerror', (error: Error) => errors.push(error.message))
      page.on('console', (msg: any) => { if (msg.type() === 'error') errors.push(msg.text()) })
      await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(origin)

      const panel = page.getByRole('region', { name: 'Mamas', exact: true })
      const adaptacao = async () => JSON.parse(await page.getByTestId('adaptacao').textContent()) as { dados: { achados: Achado[] }; pendencias: unknown[] }
      const estado = async () => JSON.parse(await page.getByTestId('estado').textContent()) as Record<string, unknown>
      const reportHas = async (fragment: string) => {
        await page.waitForFunction((f: string) => document.querySelector('[role="status"]')?.textContent?.includes(f), fragment)
      }

      // --- fundo -------------------------------------------------------------
      const fundo = panel.getByRole('group', { name: 'Ecotextura de fundo' })
      assert.equal(await fundo.getByRole('button', { name: 'Heterogênea' }).getAttribute('aria-pressed'), 'true')
      await fundo.getByRole('button', { name: 'Adiposa' }).click()
      assert.equal((await estado()).fundo, 'adiposo')
      await reportHas('adiposa')

      // --- achado nodular, todas as características ------------------------------
      await panel.getByRole('button', { name: 'Adicionar achado' }).click()
      const achado = panel.locator('[data-mama-achado]').first()
      assert.equal(await achado.getByRole('button', { name: 'Mama direita' }).getAttribute('aria-pressed'), 'true')
      assert.equal(await achado.getByRole('combobox', { name: 'Tipo do achado 1' }).inputValue(), 'nodulo')

      await achado.getByRole('button', { name: 'Mama esquerda' }).click()
      assert.equal(await achado.getByRole('button', { name: 'Mama esquerda' }).getAttribute('aria-pressed'), 'true')
      assert.equal(await achado.getByRole('button', { name: 'Mama direita' }).getAttribute('aria-pressed'), 'false')

      await achado.getByLabel('Medidas').fill('1,2 x 1,0 x 0,8')
      await achado.getByLabel('Localização').fill('quadrante superolateral')
      await achado.getByLabel('Horário').fill('2 horas')
      await achado.getByLabel('Dist. pele').fill('0,5')
      await achado.getByLabel('Dist. mamilo').fill('3,0')

      const pick = async (group: string, option: string) => {
        const button = achado.getByRole('group', { name: group, exact: true }).getByRole('button', { name: option, exact: true })
        await button.click()
        assert.equal(await button.getAttribute('aria-pressed'), 'true', `${group} → ${option}`)
      }
      await pick('Ecogenicidade', 'Isoecoica')
      await pick('Forma', 'Irregular')
      // Sem margem não há sugestão de BI-RADS: dado incompleto não vira categoria.
      assert.equal(await achado.locator('[data-mama-birads-status]').getAttribute('data-mama-birads-status'), 'incompleta')
      assert.equal(await achado.getByRole('button', { name: 'Aplicar sugestão' }).count(), 0)
      await pick('Margem', 'Não circunscrita')
      await pick('Margem não circunscrita', 'Espiculada')
      await pick('Orientação', 'Não paralela')
      await pick('Fenômeno acústico posterior', 'Sombra')
      await pick('Elasticidade (se realizada)', 'Dura')
      await achado.getByLabel('Microcalcificações de permeio').check()

      const [nodulo] = (await adaptacao()).dados.achados
      assert.deepEqual(
        {
          tipo: nodulo.tipo, lado: nodulo.lado, ecogenicidade: nodulo.ecogenicidade, forma: nodulo.forma,
          margem: nodulo.margem, orientacao: nodulo.orientacao, posterior: nodulo.posterior,
          elasticidade: nodulo.elasticidade, calcificacoes: nodulo.calcificacoes, medidas_cm: nodulo.medidas_cm,
          localizacao: nodulo.localizacao, horario: nodulo.horario, dist_pele_cm: nodulo.dist_pele_cm, dist_mamilo_cm: nodulo.dist_mamilo_cm,
        },
        {
          tipo: 'nodulo_solido', lado: 'esquerda', ecogenicidade: 'isoecoico', forma: 'irregular',
          margem: 'espiculada', orientacao: 'nao_paralela', posterior: 'sombra',
          elasticidade: 'dura', calcificacoes: 'microcalcificacoes', medidas_cm: [1.2, 1, 0.8],
          localizacao: 'quadrante superolateral', horario: '2 horas', dist_pele_cm: 0.5, dist_mamilo_cm: 3,
        },
      )
      // As chaves cruas que rascunhos e companion conhecem continuam as mesmas.
      const cru = await estado()
      const id = (cru.achados_ids as string[])[0]
      assert.equal(cru[`achados.${id}.margem_tipo`], 'nao_circunscrita')
      assert.deepEqual(cru[`achados.${id}.calc`], ['microcalc'])
      assert.equal(cru[`achados.${id}.dist_pele`], '0,5')

      await reportHas('mama esquerda')
      await reportHas('margem espiculada')
      await reportHas('distando 0,5 cm')
      await reportHas('elasticidade dura')
      // Forma e orientação suspeitas chegam ao texto (antes sumiam).
      await reportHas('de forma irregular')
      await reportHas('maior eixo não paralelo à pele')

      // BI-RADS: suspeito não ganha subcategoria automática nem botão de aplicar;
      // a categoria é escolha do médico e só então entra no laudo.
      assert.equal(await achado.locator('[data-mama-birads-status]').getAttribute('data-mama-birads-status'), 'suspeita')
      assert.equal(await achado.getByRole('button', { name: 'Aplicar sugestão' }).count(), 0)
      assert.equal((await adaptacao()).dados.achados[0].birads_ditado, null)
      await achado.getByRole('group', { name: 'BI-RADS definido pelo médico' }).getByRole('button', { name: '4C', exact: true }).click()
      assert.equal((await adaptacao()).dados.achados[0].birads_ditado, '4C')
      await reportHas('BI-RADS® 4C')

      // --- layout do achado completo -------------------------------------------
      const pagina = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
      assert.ok(pagina.scroll <= pagina.client, `${viewport.name}: rolagem horizontal ${pagina.scroll} > ${pagina.client}`)
      const estourados = await panel.evaluate((root: HTMLElement) =>
        Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0)
          .map((el) => `${el.tagName}.${el.className.toString().slice(0, 40)}`))
      assert.deepEqual(estourados, [], `${viewport.name}: conteúdo estourando`)

      const pele = await achado.getByLabel('Dist. pele').boundingBox()
      const cardBox = await panel.boundingBox()
      assert.ok(pele && cardBox)
      if (mobile) assert.ok(pele.width <= cardBox.width * 0.55, `mobile: distância da pele ocupa ${pele.width}px de ${cardBox.width}`)
      else assert.ok(pele.width <= 120, `desktop: distância da pele com ${pele.width}px`)

      const alturas = await panel.evaluate((root: HTMLElement) =>
        Array.from(root.querySelectorAll<HTMLElement>('button, select, input[type="text"], input:not([type]), label:has(input[type="checkbox"])'))
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ el: `${el.tagName} ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}`, h: el.getBoundingClientRect().height })))
      if (mobile) {
        const pequenos = alturas.filter((a) => a.h < 44)
        assert.deepEqual(pequenos, [], 'mobile: alvos menores que 44 px')
      } else {
        const grandes = alturas.filter((a) => a.el.startsWith('BUTTON') && a.h > 40)
        assert.deepEqual(grandes, [], 'desktop: botões maiores que o necessário')
      }
      if (!mobile) {
        const descritores = await achado.locator('[data-mama-descritores]').boundingBox()
        assert.ok(descritores && descritores.height <= 320, `desktop: descritores com ${descritores?.height}px de altura`)
      }
      if (shots) await page.screenshot({ path: join(shots, `mamas-${viewport.name}-nodulo.png`), fullPage: true })

      // --- troca de tipo por lista: calcificações ------------------------------
      await achado.getByRole('combobox', { name: 'Tipo do achado 1' }).selectOption('calcificacoes')
      assert.equal(await achado.locator('[data-mama-descritores]').count(), 0)
      assert.equal(await achado.getByLabel('Medidas').count(), 0)
      // As microcalcificações marcadas no nódulo aparecem como padrão — visível, não inventado.
      assert.equal(await achado.getByLabel('Padrão das calcificações').inputValue(), 'microcalcificacoes')
      await achado.getByLabel('Padrão das calcificações').selectOption('intraductais')
      assert.equal((await estado())[`achados.${id}.calc_sub`], 'intraductais')
      assert.equal((await adaptacao()).dados.achados[0].tipo, 'calcificacoes')

      // --- Doppler: vascularização ---------------------------------------------
      await page.getByLabel('Doppler mamário (harness)').check()
      await achado.getByRole('group', { name: 'Vascularização ao Doppler' }).getByRole('button', { name: 'Periférica e interna' }).click()
      assert.equal((await adaptacao()).dados.achados[0].vascularizacao, 'mista')

      // --- segundo achado, remover o primeiro ------------------------------------
      await panel.getByRole('button', { name: 'Adicionar achado' }).click()
      assert.equal(await panel.locator('[data-mama-achado]').count(), 2)
      const segundo = panel.locator('[data-mama-achado]').nth(1)
      // Calcificações sem nada marcado: a lista não finge "Grosseiras" e o laudo trava com o motivo.
      await segundo.getByRole('combobox', { name: 'Tipo do achado 2' }).selectOption('calcificacoes')
      assert.equal(await segundo.getByLabel('Padrão das calcificações').inputValue(), '')
      assert.ok((await adaptacao()).pendencias.some((p: any) => p.bloqueia && /padrão das calcificações/.test(p.motivo)))
      await segundo.getByRole('combobox', { name: 'Tipo do achado 2' }).selectOption('cisto_simples')
      await panel.getByRole('button', { name: 'Remover achado 1' }).click()
      assert.equal(await panel.locator('[data-mama-achado]').count(), 1)
      const depois = await estado()
      assert.equal(Object.keys(depois).some((k) => k.startsWith(`achados.${id}.`)), false, 'remover apaga as chaves do achado')
      const restante = (await adaptacao()).dados.achados
      assert.equal(restante.length, 1)
      assert.equal(restante[0].tipo, 'cisto_simples')
      assert.equal(restante[0].lado, 'direita')
      // O cisto não herda os descritores sólidos que o achado novo grava.
      assert.equal(restante[0].ecogenicidade, null)
      await reportHas('Imagem anecoica de mama direita')
      assert.doesNotMatch(String(await page.getByRole('status', { name: 'Laudo gerado' }).textContent()), /hipoecoica/)

      const final = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
      assert.ok(final.scroll <= final.client, `${viewport.name}: rolagem horizontal no fim`)
      if (shots) await page.screenshot({ path: join(shots, `mamas-${viewport.name}-final.png`), fullPage: true })

      assert.deepEqual(errors, [], `${viewport.name}: erros no console`)
      console.log(`ok ${viewport.name} ${viewport.width}px — ${alturas.length} controles medidos`)
      await page.close()
    }
    assert.ok(renders > 0, 'o renderer foi chamado')
    console.log(`mamariaForm: OK (${renders} renders reais)`)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
