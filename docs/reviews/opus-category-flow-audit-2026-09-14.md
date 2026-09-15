# Auditoria: fluxo de escolha de categoria na web (2026-09-14)

Auditoria somente leitura. Nenhum código foi alterado nem integrado, e nenhum
teste foi executado. Todos os achados vêm da leitura estática dos arquivos.

- **ATIVO** = `/Users/luizprazeres/laudousgmobile-def`
- **SPARK** = `/Users/luizprazeres/.codex/worktrees/50b9/laudousgmobile-def`

Requisito: mostrar a tela de categorias após o login e permitir voltar a ela
sem perder os rascunhos.

`docs/ARCHITECTURE.md` não existe em nenhum dos dois checkouts.
`docs/stories/2026-09-14-web-escolha-categoria.md` existe só no ATIVO.

## 1. Diferença de abordagem

| Aspecto | ATIVO | SPARK |
|---|---|---|
| Onde fica a seleção | Dentro do componente: `ExamCategoryPicker` com `choosingCategory` (`LaudarWebExperience.tsx:193`, `:689-692`) | Em outra rota: `app/app/page.tsx` com `CategorySelectionPage.tsx` |
| Como se volta para a seleção | Botão "Voltar às categorias" chama `setChoosingCategory(true)` (`:735`). O formulário continua montado, só fica oculto (`hidden`, `:693`) | `<Link href="/app">` em `CategorySelector` (`LaudarWebExperience.tsx:113-114`, usado em `:681-686` e `:697-702`) |
| Categoria inicial | Sempre abre na seleção (`useState(true)`) | Vem de `?categoria=` (`gerar/page.tsx:29-32`, repassado como `initialCategory`) |
| `/app` | O middleware redireciona para `/app/gerar` (`middleware.ts:61-65`) | Existe uma página; o redirect foi removido do middleware |
| Destino padrão pós-login | `/app/gerar` (`authPresentation.ts:28`, `middleware.ts:78`) | `/app` (`authPresentation.ts:28`, `middleware.ts:61`) |
| Chave do rascunho | `documentKey = chaveDocumentoDoppler(...)` (`:229`, `:433`) | `reportDrafts[categoria]` (`:435`) |
| Busca, imagens, rótulo "Obstétrica com Doppler", reduced-motion | Sim (`ExamCategoryPicker.tsx:9-14`, `:59-62`, `:72`) | Não: lista simples com framer-motion, sem tratamento de reduced-motion (`CategorySelectionPage.tsx:13-25`) |

O SPARK partiu de uma base anterior à story do ATIVO: não tem `ExamCategoryPicker.tsx`
nem o botão de voltar, e o rascunho ainda é indexado por categoria.

## 2. Achados confirmados: SPARK

### S1. Voltar para as categorias apaga todo o preenchimento (bloqueante)
O `Link href="/app"` (`LaudarWebExperience.tsx:113-114`) navega para outra rota
(`app/app/page.tsx`), e isso desmonta `LaudarWebExperience`. Todo o estado do
laudo existe só em `useState`:
- `examStates` (`:214`) e `tireoideState` (`:217`)
- `reportDrafts` (`:432`), com o texto editado à mão
- notas do companion (`setCompanionNotesByCategory`, `:975-978`) e a conexão do `CompanionPanel`
- valores locais das calculadoras (PE e outras)

Não há `localStorage`, `sessionStorage` nem IndexedDB em `components/laudar`. Os
únicos usos no app estão em `lib/digitadoras.ts` e `BibliotecaWorkspace.tsx`.
Ao escolher outra categoria, `/app/gerar?categoria=X` monta tudo de novo com o
estado inicial. Isso contradiz diretamente o requisito.

### S2. `useEffect` força a categoria de volta para `initialCategory`
Em `LaudarWebExperience.tsx:207-212`, sempre que `categoria !== initialCategory`, o
efeito chama `setCategoria(initialCategory)`. Consequências:
- Companion estruturado: `onApplyStructured` chama `setCategoria(TIREOIDE_ID | 'MAMARIA' | 'DOPPLER_CAROTIDAS' | payload.category)` (`:982`, `:988`, `:994`, `:1002`). Com `?categoria=` na URL, a UI volta imediatamente para a categoria da URL. Os dados ficam gravados no `examStates` de outra categoria, que o usuário não vê.
- Não sobra nenhuma forma de trocar de categoria dentro da página. O `onChange` do `CategorySelector` deixou de ser usado, porque os dois usos passam `redirectToSelection`.

### S3. A categoria some no redirect de autenticação
- `gerar/page.tsx:27`: `redirect('/login?redirect=/app')` descarta o `?categoria=`.
- `middleware.ts:54` (igual no ATIVO, `:71`): `?redirect=${pathname}` usa só o pathname, sem `search` e sem `encodeURIComponent`.

### S4. Categoria inválida cai em Abdome Total sem aviso
`LaudarWebExperience.tsx:204`: um id fora de `AVAILABLE_CATEGORY_IDS` vira
`DEFAULT_CATEGORY_ID` sem nenhuma mensagem. Também é o caminho do link "Laudar"
do rail (`LaudarRail.tsx:26`, `/app/gerar` sem query) e dos links de
`HistoryList.tsx:50,74,176`, `BibliotecaWorkspace.tsx:170`, `preferencias/page.tsx:43`,
`seguranca/page.tsx:55` e `update-password/page.tsx:50`. Todos pulam a seleção e
abrem Abdome Total direto.

### S5. Regressões se o SPARK for integrado sobre o ATIVO
- Perde busca, imagens, o rótulo combinado "Obstétrica com Doppler" e reduced-motion. Isso quebra itens de aceite da story (`2026-09-14-web-escolha-categoria.md:8-12`).
- O rascunho volta a ser indexado por `categoria` (`:435`) em vez de `documentKey` (ATIVO `:229`). A separação entre documento Doppler combinado e isolado regride.
- `app/app/page.tsx` do SPARK não funciona sozinho no ATIVO: o middleware do ATIVO (`:61-65`) redireciona `/app` para `/app/gerar` antes do roteamento, então a página nunca seria exibida.
- O comentário em `api/checkout/route.ts:40-41` ("`/app` deixou de existir") fica desatualizado no SPARK. Não há efeito funcional, porque `completionUrl` aponta para `/app/preferencias`.

## 3. Achados confirmados: ATIVO

### A1. Dentro de uma mesma montagem, o requisito é atendido
O formulário fica oculto, não desmontado (`:693`). O render canônico fica suspenso
enquanto a seleção está aberta (`useLaudoCanonico(..., migrada && !choosingCategory, ...)`, `:353`),
e o atalho de teclado é ignorado (`:618`).

### A2. Qualquer navegação de rota ou reload perde tudo
Assim como no S1, o estado do laudo existe só em memória. Os casos são:
- links do `LaudarRail` (`LaudarRail.tsx:27-31`: Histórico, Analytics, Biblioteca, etc.) seguidos de volta a "Laudar";
- reload ou fechamento da aba;
- botão Voltar do navegador. A seleção não fica registrada no histórico (não há `pushState` nem query), então Voltar a partir do formulário sai de `/app/gerar` em vez de reabrir a seleção, e o componente é desmontado.

Não existe aviso de "rascunho não salvo" (não há `beforeunload`).
Toda nova montagem começa com `choosingCategory = true` (`:193`) e o estado inicial.

### A3. Companion aplicado com a seleção aberta
`CompanionPanel` é renderizado dentro do `div hidden` (`:693` até `:1061-1098`).
`onApplyStructured` chama `setCategoria(...)` mas não chama `setChoosingCategory(false)`
(`:1069-1097`). Um payload que chegue com a seleção aberta muda a categoria sem
nada visível; a mudança só aparece quando o usuário escolhe manualmente, e a
escolha dele sobrescreve a categoria. Os dados continuam no `examStates` da
categoria do payload. Risco baixo, mas confuso.

### A4. Redirect com querystring (risco a verificar em runtime)
`middleware.ts:78` (SPARK `:61`) atribui `searchParams.get("redirect")` a
`redirectUrl.pathname` e depois limpa `search`. Se `redirect` tiver query (por
exemplo `/app/gerar?categoria=OBSTETRICA`, caso coberto em `authPresentation.manual.ts:10`),
o `?` provavelmente será codificado como `%3F` no pathname e a rota não será
encontrada. Isso não foi executado; confirmar com teste. O valor também não passa
por `safeAuthRedirect` nesse ponto, embora a atribuição a `pathname` mantenha a
mesma origem.

## 4. Sugestão pontual

1. **Não integrar a seleção por rota do SPARK.** Manter a abordagem do ATIVO (uma montagem, formulário oculto), que é a única das duas que preserva rascunhos ao voltar.
2. Para "tela de categorias após login", o ATIVO já cobre o caso (pós-login vai para `/app/gerar`, que abre a seleção). Se a URL precisar refletir a seleção, sincronizar `?categoria=` com `window.history.replaceState` (e `pushState` ao abrir a seleção, com listener de `popstate` que só alterna `choosingCategory`) na mesma página, sem `Link` ou `router.push` para outra rota e sem o `useEffect` de S2.
3. Para A2, de forma mínima e em arquivo fora de `LaudarWebExperience.tsx`: um aviso `beforeunload` quando houver `activeDraft.dirty` ou preenchimento. Persistir em `sessionStorage` só depois de decisão explícita, porque o conteúdo tem dados clínicos de paciente (LGPD). Precisa de TTL e limpeza no logout.
4. Para A3: em `onApplyStructured`, também chamar `setChoosingCategory(false)`, ou ignorar ou enfileirar o payload enquanto a seleção estiver aberta.
5. Middleware: `redirect=${encodeURIComponent(pathname + request.nextUrl.search)}` no ramo sem sessão. No ramo logado, trocar a atribuição a `pathname` por `new URL(safeAuthRedirect(param), request.url)`.

> Aviso de coordenação: outro agente está editando `LaudarWebExperience.tsx` no
> ATIVO (guard de percentil). Os itens 2 e 4 tocam esse arquivo e devem ser
> feitos depois, sobre a versão já mesclada.

## 5. Plano de testes (não executado)

Base: `apps/web/tests/dopplerWeb.browser.manual.ts` (auth e salvamento simulados).

1. **Pós-login:** login com `redirect` ausente abre `/app/gerar` com a seleção visível e zero requests de render antes da escolha.
2. **Voltar sem perder:** preencher campos de OBSTETRICA, editar o texto à mão (dirty), preencher peso PE, voltar às categorias e reabrir OBSTETRICA. Campos, texto editado e PE devem estar intactos.
3. **Troca entre categorias:** preencher A, voltar, abrir B e preencher, voltar, abrir A. A continua intacto e B também.
4. **Doppler combinado vs isolado:** rascunhos separados por `documentKey` depois de alternar pela seleção.
5. **Navegação de rota (A2):** preencher, ir a Histórico pelo rail e voltar a Laudar. Documentar o comportamento atual (perda) e validar o aviso ou a persistência, se forem adotados.
6. **Botão Voltar do navegador:** preencher e acionar `history.back()`. Esperado conforme a decisão do item 4.2; hoje sai da página.
7. **Reload:** mesmo caso do 5.
8. **Companion com a seleção aberta (A3):** simular `onApplyStructured` MAMARIA com a seleção aberta. A categoria e a visibilidade devem ser coerentes e os dados não podem se perder.
9. **Companion com `?categoria=`:** se a sincronização de URL for adotada, um payload de outra categoria troca a UI e não é revertido (regressão de S2).
10. **Auth redirect:** sem sessão, `/app/gerar?categoria=OBSTETRICA` leva ao login e, depois dele, a `/app/gerar?categoria=OBSTETRICA` sem `%3F`. Com sessão, `/login?redirect=/app/gerar?categoria=X` também. `//evil`, URL absoluta e `\\` caem no fallback.
11. **Legado `/app`:** acessar `/app` com e sem sessão. Não pode dar 404 nem entrar em loop.
12. **Links internos para `/app/gerar`** (rail, histórico, biblioteca, preferências, segurança, update-password): abrem a seleção, sem pular direto para Abdome Total.
13. **Acessibilidade e regressões da story:** busca sem acento, busca vazia, 15 categorias, Tab, reduced-motion, 320/390/1440px.
14. **Gates:** `pnpm -F web build`, `npm run typecheck` e `authPresentation.manual.ts` com fallback coerente com o destino escolhido.
