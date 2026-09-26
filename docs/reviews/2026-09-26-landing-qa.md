# QA final da landing scrollytelling — 26/09/2026

Decisão: **GO técnico para integrar/publicar a landing**, condicionado à conferência visual final do root e ao smoke após publicação. No build Web otimizado servido por `next start` em `http://127.0.0.1:3001/`, não encontrei bloqueador funcional ou regressão mensurável de Lighthouse frente ao baseline público. **Não é uma declaração de conformidade WCAG nem de funcionamento já verificado em produção.** O contraste insuficiente em quatro elementos preexistentes permanece registrado abaixo.

Branch `feat/landing-scrollytelling`. Ownership deste QA: `apps/web/tests/landingScrollytelling.browser.manual.ts` e este relatório; nenhuma implementação de aplicação, índice git, commit ou deploy foi alterado por esta frente. O briefing original foi lido em `/Users/luizprazeres/.codex/attachments/6baee37d-3550-4174-8ccd-76f6b85d5fe0/pasted-text.txt`. O root reportou lint, typecheck, 16 suítes e build Web PASS; estes gates não foram reexecutados por mim.

## Browser funcional no build otimizado

Comando base, da raiz do repositório: `LANDING_QA_FINAL=1 LANDING_PREVIEW_URL=http://127.0.0.1:3001 PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright pnpm exec tsx apps/web/tests/landingScrollytelling.browser.manual.ts`. Após o ajuste final de CSS e rebuild do root, 1920×1080, 1440×900 e 1024×768 passaram numa execução. Para concluir os demais tamanhos no **mesmo build**, usei o mesmo comando com `LANDING_QA_VIEWPORT=390` e depois `LANDING_QA_VIEWPORT=320`; ambos passaram em movimento normal e em `prefers-reduced-motion: reduce`. `LANDING_QA_SLOW_ONLY=1` passou separadamente em 390×844 com 400 ms de latência, ~100 KiB/s de download e CPU 4×; DOMContentLoaded local foi 2.271 ms. Não interpreto esse tempo do `next start` local como métrica de produção.

Nos cinco tamanhos, o harness verificou ausência de overflow horizontal nos pontos percorridos, posição fixed do cabeçalho durante scroll, presença e hit-test central dos CTAs visíveis, destinos `/signup`, `/login`, `#precos`, `/precos`, `/privacy` e `/terms`, três planos e seus links, cinco grupos de especialidades visíveis sem tiles vazios, quatro esquemas com ALT e imagens mobile carregadas, seleção ativa/`aria-pressed` dos esquemas desktop, e alvos mobile dos cards descobertos. O Hero desktop alterou o texto do laudo ao clicar um achado; o Hero mobile trocou quatro órgãos por botões do grupo “Escolher órgão de exemplo”, mantendo `data-hero-organ`, título e trecho sincronizados, e uma opção alterou o trecho visível. A fonte final usa `div[data-hero-organ]`, não `#hero-organ-panel`/tabs mencionados no briefing intermediário.

O MobileStory percorreu `abrir → ditar → categoria → gerar → laudo` e voltou na ordem inversa **dentro da própria seção** nos cinco tamanhos; botões responderam a teclado e, no mobile, a toque. Texto explicativo e nome acessível do telefone acompanharam a etapa. Em reduced-motion, as etapas permaneceram acessíveis por botões, sem erro de hidratação. O teste bloqueou e falharia para vídeo do hero, `/api/*` local ou `getUserMedia`; não houve tentativa desses recursos nem `pageerror` nos cenários aprovados. Não executei checkout, geração real, microfone ou banco.

O primeiro run do build final parou em 390 por uma comparação exata de `boundingBox().height >= 44` no próprio harness. Medição isolada de `getBoundingClientRect()` e CSS no build final mostrou **44 px exatos** nos quatro seletores em 390 e 320; a caixa informada ao Playwright sofreu arredondamento fracionário. Ajustei só a tolerância do teste para 43,5 px e repeti Hero normal/reduced e depois o gate 390/320 completo. Isto foi falso positivo do harness, não correção de produto. Uma rodada anterior havia sido interrompida por `ERR_CONNECTION_REFUSED` quando o root reiniciou o servidor para o rebuild; seus passes não foram usados para esta decisão.

## Lighthouse mobile comparativo

Lighthouse 13.5.0, mesmo Chromium HeadlessChrome 147, `formFactor=mobile`, throttling `simulate`, categorias performance/accessibility, três corridas sequenciais e sem `runWarnings` em ambos os conjuntos. Comando por corrida: `CHROME_PATH='<Chromium Playwright local>' node /tmp/laudousg-landing-lighthouse.FCZUoK/node_modules/lighthouse/cli/index.js <URL> --only-categories=performance,accessibility --output=json --output-path=<JSON> --chrome-flags='--headless --no-sandbox' --quiet`.

| Métrica | Baseline público `https://www.laudousg.com.br/` | Build final `http://127.0.0.1:3001/` |
| --- | --- | --- |
| Performance | 68 / 90 / 85; mediana **85** | 85 / 91 / 91; mediana **91** |
| Acessibilidade | 94 / 94 / 94 | 96 / 96 / 96 |
| LCP | 2.970 / 3.428 / 3.858 ms; mediana 3.428 ms | 4.267 / 3.517 / 3.512 ms; mediana 3.517 ms |
| TBT | 690 / 37 / 45 ms; mediana 45 ms | 92,5 / 17,5 / 15,5 ms; mediana 17,5 ms |
| CLS | 0 / 0 / 0 | 0 / 0 / 0 |

A distribuição não sugere regressão material na medição local: performance mediana +6 pontos, acessibilidade +2 e TBT mediano menor; LCP mediano ficou ~89 ms maior, dentro da variação observada. **A comparação não é um A/B controlado:** baseline usa domínio público e CDN; candidato usa servidor local. Repetir Lighthouse e smoke no domínio publicado para confirmar experiência real.

O único audit Lighthouse de acessibilidade reprovado no candidato foi `color-contrast`. Quatro itens aparecem **também no baseline público**: selo “Recomendado” e CTA “Assinar agora” com branco sobre emerald-500 (contraste 2,53:1; `apps/web/src/components/landing/Pricing.tsx:83,104`), e dois textos do logo em fundo claro (3,9:1 e 2,24:1; `apps/web/src/components/LaudoUSGLogo.tsx:27-28`). Não classifico como regressão desta branch, mas é débito real de acessibilidade, inclusive em CTA. A nota 96 não elimina esse defeito.

## Artefatos e limite da decisão

Harness: `apps/web/tests/landingScrollytelling.browser.manual.ts`. Relatórios Lighthouse finais: `/tmp/laudousg-landing-final.lGt4Um/lighthouse-mobile-{1,2,3}.json`. Baseline: `/tmp/laudousg-landing-baseline-mobile.json`, `-2.json`, `-3.json`. Capturas da primeira versão otimizada, **anteriores ao ajuste CSS final**, estão em `/tmp/laudousg-landing-final.lGt4Um/screenshots`; não são evidência visual final. O root está produzindo as capturas finais separadamente. Este QA cobre Chromium e HTML funcional, não valida o desenho visual final, Safari/iOS real, claims clínicos ou checkout. Após publicação, conferir novamente mobile 320/390, links/CTA, ausência de vídeo/API/microfone e Lighthouse no domínio real.
