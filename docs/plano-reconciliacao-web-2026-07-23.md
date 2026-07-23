# Plano de reconciliação da web (Frente 2) — 23/07/2026

## Diagnóstico factual

Não há "duas fontes competindo". Há **uma linha canônica mais avançada** e **uma feature solta** por cima do shell:

- **`8ba0056` ("clinical workspace shell")** JÁ É ANCESTRAL de `feat/model-resolver-hard-mode` (`git merge-base --is-ancestor` confirma). Ou seja, o shell do workspace está incorporado na branch de trabalho.
- **Worktree `codex/web-workspace-production`** (pushado, `origin/codex/web-workspace-production`) está **4 commits à frente** do ponto base e é a **linha canônica da web**:
  - `30b0f2e` feat(web): publish clinical workspace
  - `199c607` chore(web): expose workspace flags to build
  - `0585900` chore(web): include companion API in build
  - `e05995e` fix(web): compact report organ spacing
  - Adiciona `apps/web/src/lib/workspaceCompanion.ts` — **canal web↔mobile**: pareamento por código de sessão (`WorkspaceSession`), device pareado, e `WorkspaceInput` (texto/medidas empurrados do app para a web). Ver também os worktrees `codex/mobile-companion` (108 commits) e `codex/mobile-companion-api` (1) — o backend do canal.
- **`c313662` (feat/web: diff de sugestão de modelo)** — feita nesta branch (Frente 0). Toca `WorkspaceInputDock.tsx`, `LaudarWebExperience.tsx`, `LaudoPreview.tsx` + novo `reportSuggestion.ts`. **Sobrepõe** os mesmos arquivos que o codex alterou (`WorkspaceInputDock` mudou 237 linhas do lado codex) → merge direto CONFLITA.

## Arquivos em sobreposição (diff codex ↔ feat atual, só `apps/web`)
```
apps/web/src/components/laudar/WorkspaceInputDock.tsx   | 237 ++  (companion, lado codex)  ← conflita c/ diff-sugestão
apps/web/src/components/laudar/LaudarWebExperience.tsx  |  20 ++
apps/web/src/app/app/gerar/page.tsx                     |   6
apps/web/src/lib/deterministic/compose.ts               |   7
apps/web/src/lib/workspaceCompanion.ts                  |  80 ++  (novo, só codex)
apps/web/.env.example                                   |   2
```

## Decisão de arquitetura (proposta — precisa do aval do Luiz 🔵)

**`codex/web-workspace-production` é a base canônica da web daqui pra frente.** O diff-sugestão (`reportSuggestion.ts` + wiring) é re-aplicado por cima, resolvendo o conflito no `WorkspaceInputDock` a favor da versão do companion (que é a que roda o pareamento) e enxertando o painel de sugestão como camada adicional.

Racional: a linha codex já está pushada, contém o companion (integração web↔app que é objetivo de produto), e é a que o worktree de produção serve. Reverter para a versão da branch de trabalho perderia o companion.

## Passos (quando aprovado)

1. Branch `reconcile/web-workspace` a partir de `origin/codex/web-workspace-production`.
2. `git cherry-pick -n c313662` → resolver conflito em `WorkspaceInputDock.tsx`/`LaudarWebExperience.tsx`: manter a base do companion, reinserir o painel de diff-sugestão (`suggestionDiff`, `applyCurrentModel`, `rejectCurrentModel`, `undoAcceptedSuggestion`) como bloco adicional. `reportSuggestion.ts` entra sem conflito.
3. `pnpm -F web typecheck && pnpm -F web build`.
4. **Gate visual com o Luiz** (a web não dá pra validar por typecheck só): rodar `pnpm -F web dev`, conferir (a) painel de diff-sugestão funciona, (b) pareamento do companion não quebrou.
5. Definir o fluxo pedido na Frente 2: ao escolher categoria, apresentar **laudo-modelo normal OU modelo com placeholders** para medidas (base compartilhada com a Frente 5 / Biblioteca).
6. Reconciliar/mergear na linha de deploy da web (qual worktree serve prod da web = confirmar com Luiz).

## Pendências que dependem do Luiz (produto)
- Confirmar que `codex/web-workspace-production` é a base canônica (vs. a versão da branch de trabalho).
- Qual domínio/worktree serve a web de produção hoje (liga com a Frente 6 — migração `web.laudousg.com` → `laudousg.com`).
- UX do seletor categoria → modelo normal vs. modelo com placeholders (Frente 2 passo 5, também alimenta a Biblioteca da Frente 5).
