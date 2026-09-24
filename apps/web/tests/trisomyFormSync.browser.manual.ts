import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { build } from 'esbuild'

// Regressão do card montado simultaneamente aos achados. Não testa o motor FMF.
async function main() {
  const bundle = await build({
    stdin: {
      contents: `
        import { useState } from 'react';
        import { createRoot } from 'react-dom/client';
        import { TrisomyFmfPanel } from './src/components/laudar/TrisomyFmfPanel';
        function Harness() {
          const [source, setSource] = useState({crl: '', nt: '', fhr: '', nasalBone: ''});
          return <>
            <button onClick={() => setSource({crl:'60', nt:'1.5', fhr:'150', nasalBone:'present'})}>Primeiros achados</button>
            <button onClick={() => setSource({crl:'70', nt:'1.8', fhr:'160', nasalBone:'absent'})}>Novos achados</button>
            <button onClick={() => setSource({crl:'', nt:'', fhr:'', nasalBone:''})}>Limpar origem</button>
            <TrisomyFmfPanel initialValues={source} onInsert={() => {}} onRemove={() => {}} />
          </>;
        }
        createRoot(document.getElementById('root')).render(<Harness />);
      `,
      resolveDir: resolve('apps/web'),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    jsx: 'automatic',
    tsconfig: resolve('apps/web/tsconfig.json'),
    define: { 'process.env.NODE_ENV': '"test"' },
  })
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'text/javascript' : 'text/html')
    res.end(req.url === '/bundle.js' ? bundle.outputFiles[0].text : '<div id="root"></div><script src="/bundle.js"></script>')
  })
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  let browser: any
  try {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', (error: Error) => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${(server.address() as { port: number }).port}`)
    const crl = page.getByLabel('CCN (mm)', { exact: true })
    const nt = page.getByLabel('TN (mm)', { exact: true })
    const fhr = page.getByLabel('FCF (bpm)', { exact: true })
    await crl.waitFor()
    assert.equal(await crl.inputValue(), '')
    await page.getByRole('button', { name: 'Primeiros achados', exact: true }).click()
    assert.equal(await crl.inputValue(), '60')
    assert.equal(await nt.inputValue(), '1.5')
    assert.equal(await page.locator('label').filter({ hasText: 'Osso nasal' }).locator('select').inputValue(), 'present')
    await nt.fill('2.1')
    await fhr.fill('')
    await page.getByRole('button', { name: 'Novos achados', exact: true }).click()
    assert.equal(await crl.inputValue(), '70', 'Campo não editado acompanha os achados')
    assert.equal(await nt.inputValue(), '2.1', 'Edição manual não é substituída')
    assert.equal(await fhr.inputValue(), '', 'Limpeza manual não é substituída')
    assert.equal(await page.locator('label').filter({ hasText: 'Osso nasal' }).locator('select').inputValue(), 'absent')
    await page.getByRole('button', { name: 'Limpar origem', exact: true }).click()
    assert.equal(await crl.inputValue(), '', 'Reset da origem limpa medidas herdadas')
    assert.equal(await nt.inputValue(), '2.1')
    assert.deepEqual(errors, [])
    console.log('PASS: achados sincronizados, edição e limpeza manuais preservadas, reset da origem.')
  } finally {
    await browser?.close()
    await new Promise<void>(done => server.close(() => done()))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
