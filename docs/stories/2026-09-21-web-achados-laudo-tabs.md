# Web Achados | Laudo

Status: implementado localmente em 2026-09-21.

## Escopo

Substituir a visualização simultânea do gerador web por um seletor superior
`Achados | Laudo`, mantendo o estado dos dois painéis montado ao alternar.

## Aceite

- [x] Tablist acessível com `aria-selected`, setas, Home e End.
- [x] `Tab` global não troca seção fora do contexto de Achados e não prende foco em Laudo/abas.
- [x] Seletor `Achados | Laudo` fica sticky abaixo do header em todas as larguras.
- [x] Achados ocupa a área útil com navegação de seções e painel de construção.
- [x] Laudo ocupa a área útil com preview/editor, toolbar, alertas e esquema visual.
- [x] Esquema visual abre integrado ao Laudo sem desmontar o preview/editor.
- [x] Mudança real de categoria via picker, seletor ou companion volta para Achados.
- [x] Estado de categoria, seção, rascunho editado, indicador da aba e scrollY por aba preservados.
- [x] Responsivo: nav lateral até 768px, chips abaixo disso, rail oculto no celular e companion como bottom sheet.
- [x] Celular mantém navegação principal equivalente com Histórico, Biblioteca, Analytics, Preferências, tema e Sair.
- [x] Em `<1280px`, header fica no fluxo e só a barra `Achados | Laudo` permanece sticky no topo.
- [x] Rodapé não anuncia `Tab` como atalho de seção.
- [x] Sem alteração em renderer, contratos clínicos, API ou banco.

## Arquivos

- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/tests/workspaceTabs.browser.tsx`
- `apps/web/tests/workspaceTabs.browser.manual.ts`

## Gates

- `pnpm -F web typecheck`
- `pnpm -F web lint`
- `PLAYWRIGHT_MODULE=/Users/luizprazeres/.npm/_npx/705bc6b22212b352/node_modules/playwright pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/workspaceTabs.browser.manual.ts`

O teste geral `pnpm -F web test` ainda expõe uma falha preexistente em
`dopplerWebMode.manual.ts` por regex ampla envolvendo `placenta`.
