/**
 * DATAÇÃO ESCOLHIDA PELO MÉDICO (W6) no NAVEGADOR — tela real, renderer canônico real.
 *
 * O que é real: a tela inteira (LaudarWebExperience + OrganFormPanel), o adaptador
 * `adaptarObstetrica` e `renderizarSelecao` do `apps/api`.
 * O que é DUBLÊ, e declarado: a frase do item 1 da conclusão para os modos com US precoce.
 * O renderer anterior à W5 ainda não lê `datacao_conclusao`; o servidor de teste troca só
 * esse item pela frase do contrato da W5 (`computeIG` com o modo), para a prévia mostrar
 * o que o médico verá depois da integração.
 *
 *   PLAYWRIGHT_MODULE=<…/node_modules/playwright> WEB_CSS_DIR=<…/apps/web/.next/static/css> \
 *   DATACAO_QA_DIR=tmp-review/web-datacao node --import tsx apps/web/tests/datacao.browser.manual.ts   (na raiz)
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from 'esbuild'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { computeIG, dataBRParaISO, type ModoDatacao } from '../src/lib/ig/computeIG'

/** Dublê da W5: aplica a tabela do contrato ao item 1 da conclusão. */
function dubleW5(texto: string, dados: Record<string, unknown>): string {
  const modo = dados.datacao_conclusao as ModoDatacao | undefined
  const usData = typeof dados.primeira_us_data === 'string' ? dataBRParaISO(dados.primeira_us_data) : null
  const exame = typeof dados.data_exame === 'string' ? dataBRParaISO(dados.data_exame) : null
  if (!modo || !usData || !exame) return texto
  const { igConclusao } = computeIG({
    biometria: { semanas: Number(dados.ig_semanas), dias: Number(dados.ig_dias ?? 0) },
    hojeISO: exame,
    referencia: { tipo: 'us', dataISO: usData, ig: { semanas: Number(dados.primeira_us_ig_semanas), dias: Number(dados.primeira_us_ig_dias) } },
    modo,
  })
  return texto.replace(/^1\) Gestação em torno de .*$/m, `1) ${igConclusao}`)
}

async function main() {
  const web = resolve('apps/web')
  const qa = process.env.DATACAO_QA_DIR ? resolve(process.env.DATACAO_QA_DIR) : null
  if (qa) mkdirSync(qa, { recursive: true })
  const enviados: Record<string, unknown>[] = []
  const bundle = await build({
    entryPoints: [join(web, 'tests/datacao.browser.tsx')],
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: join(web, 'tsconfig.json'),
    define: {
      'process.env.NODE_ENV': '"test"',
      'process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION': '"false"',
      'process.env.NEXT_PUBLIC_HEPATIC_MODELS_V1': '"true"',
      'process.env.NEXT_PUBLIC_COMPANION_FORM_PATCH_CATEGORIES': '""',
    },
    plugins: [{ name: 'local-only-services', setup(plugin) {
      plugin.onResolve({ filter: /^(next\/link|next\/navigation|@\/lib\/supabase\/client)$/ }, args => ({ path: args.path, namespace: 'test' }))
      plugin.onLoad({ filter: /.*/, namespace: 'test' }, args => ({
        loader: 'jsx',
        resolveDir: web,
        contents: args.path === 'next/link'
          ? 'export default function Link({children, ...props}) { return <a {...props}>{children}</a> }'
          : args.path === 'next/navigation'
            ? 'export const usePathname = () => location.pathname'
            : `export function createClient() {
                return { auth: { getUser: async () => ({data: {user: {id: 'synthetic'}}}) }, from() {
                  const query = new Proxy({}, { get(_t, prop) {
                    if (prop === 'maybeSingle') return async () => ({data: null, error: null});
                    return () => query;
                  }}); return query;
                }};
              }`,
      }))
    }}],
  })
  const cssDir = process.env.WEB_CSS_DIR ?? join(web, '.next/static/css')
  const css = readdirSync(cssDir).filter(f => f.endsWith('.css')).map(f => readFileSync(join(cssDir, f), 'utf8')).join('\n')

  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles![0].text); return }
      if (request.url === '/style.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return }
      if (request.method === 'POST') {
        let raw = ''
        for await (const chunk of request) raw += chunk
        const body = JSON.parse(raw)
        const category = request.url?.match(/^\/api\/catalog\/([^/]+)\/render$/)?.[1]
        if (category) {
          enviados.push(body.dados)
          const result = renderizarSelecao(category, 'CLASSICO_COMPLETO', [], body.dados)
          response.setHeader('Content-Type', 'application/json')
          response.statusCode = result.ok ? 200 : 409
          response.end(JSON.stringify(result.ok ? { laudo: dubleW5(result.texto, body.dados) } : result))
          return
        }
      }
      if (request.url !== '/') { response.statusCode = 404; response.end(); return }
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>')
    } catch (error) {
      response.statusCode = 500
      response.end(String(error))
    }
  })
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
  await new Promise<void>((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Servidor local indisponível')
  const origin = `http://127.0.0.1:${address.port}`
  const browser = await chromium.launch({ headless: true })
  try {
    for (const viewport of [{ width: 1440, height: 1000, nome: 'desktop' }, { width: 390, height: 844, nome: 'celular' }]) {
      const page = await browser.newPage({ viewport, hasTouch: true })
      const errors: string[] = []
      page.on('pageerror', (e: Error) => errors.push(e.message))
      await page.route('**/*', (route: any) => route.request().url().startsWith(origin) ? route.continue() : route.abort())
      await page.goto(origin)
      await page.getByRole('heading', { name: 'Qual exame você deseja realizar?' }).waitFor()
      await page.getByRole('button', { name: 'Obstétrica', exact: true }).click()

      const datacao = page.locator('fieldset[data-datacao-conclusao]')
      const biometria = datacao.getByRole('checkbox', { name: 'IG pela biometria atual' })
      const usPrecoce = datacao.getByRole('checkbox', { name: 'Correção pela ultrassonografia precoce' })
      await datacao.waitFor()

      // Sem 1ª US: só a biometria, e nenhuma das duas pode ser mexida.
      assert.equal(await biometria.isChecked(), true)
      assert.equal(await biometria.isDisabled(), true)
      assert.equal(await usPrecoce.isChecked(), false)
      assert.equal(await usPrecoce.isDisabled(), true)
      assert.equal(await datacao.getAttribute('data-datacao-conclusao'), 'biometria')

      // Exame completo + 1ª US (data de hoje é o exame; 1ª US 172 dias antes com 8s0d → 32s4d).
      const hoje = new Date()
      const us = new Date(hoje.getTime() - 172 * 86_400_000)
      const br = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      await page.getByPlaceholder('20', { exact: true }).fill('32')
      await page.getByPlaceholder('3', { exact: true }).fill('2')
      await page.getByLabel('BCF (bpm)', { exact: true }).fill('142')
      for (const [label, value] of [['DBP (mm)', '82'], ['CC (mm)', '295'], ['CA (mm)', '285'], ['CF (mm)', '62']] as const) {
        await page.getByLabel(label, { exact: true }).fill(value)
      }
      // Peso: calculado pela tela a partir da biometria (o campo não aparece).
      await page.getByLabel('Localização', { exact: true }).selectOption('posterior')
      await page.getByLabel(/1ª US · data/).fill(br(us))
      await page.getByPlaceholder('8', { exact: true }).fill('8')
      await page.getByPlaceholder('2', { exact: true }).fill('0')

      // Com a 1ª US: padrão continua só biometria; as duas caixas liberadas (menos a única marcada).
      await usPrecoce.waitFor()
      await page.waitForFunction(() => !(document.querySelectorAll('fieldset[data-datacao-conclusao] input[type=checkbox]')[1] as HTMLInputElement)?.disabled)
      assert.equal(await usPrecoce.isDisabled(), false)
      assert.equal(await biometria.isDisabled(), true, 'a única marcada não desmarca')

      const laudo = async () => {
        await page.waitForFunction(() => !document.querySelector('[data-laudo-tab-indicator="updating"]'))
        await page.waitForTimeout(400)
        return (await page.locator('body').innerText())
      }
      const esperado: Record<ModoDatacao, RegExp> = {
        biometria: /1\) Gestação em torno de 32 semanas e 2 dias\./,
        biometria_e_us_precoce: /1\) Gestação em torno de 32 semanas e 2 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 32 semanas e 4 dias\./,
        us_precoce: /1\) Gestação em torno de 32 semanas e 4 dias, corrigida pela ultrassonografia precoce\./,
      }
      const passos: [ModoDatacao, () => Promise<void>][] = [
        ['biometria', async () => {}],
        ['biometria_e_us_precoce', async () => usPrecoce.check()],
        ['us_precoce', async () => biometria.uncheck()],
      ]
      for (const [modo, agir] of passos) {
        await agir()
        await page.waitForFunction((m: string) => document.querySelector('fieldset[data-datacao-conclusao]')?.getAttribute('data-datacao-conclusao') === m, modo)
        await page.getByRole('tab', { name: /^Laudo/ }).click()
        assert.match(await laudo(), esperado[modo], modo)
        assert.equal(enviados.at(-1)?.datacao_conclusao, modo)
        if (qa) await page.screenshot({ path: join(qa, `datacao-${viewport.nome}-${modo}-laudo.png`) })
        await page.getByRole('tab', { name: /^Achados/ }).click()
        if (qa) await datacao.locator('xpath=ancestor::section[1]').screenshot({ path: join(qa, `datacao-${viewport.nome}-${modo}-caixas.png`) })
      }
      // Só US marcada: ela é a única e não desmarca.
      assert.equal(await usPrecoce.isDisabled(), true)
      assert.deepEqual(errors, [])
      await page.close()
      console.log(`ok - datação escolhida (${viewport.nome}): três modos, caixas e laudo`)
    }
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
