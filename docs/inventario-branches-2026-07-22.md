# Inventário de branches — consolidação 22/07/2026 (Frente 0)

**Método:** `git cherry origin/main <branch>` (patch-equivalência) + diff de conteúdo de duas pontas + grep de features na `origin/main`. A main foi reconstruída por cherry-picks (~19/06), então SHAs diferem mesmo com conteúdo idêntico — os vereditos abaixo são por **conteúdo**, não por SHA.

**Status da execução (22/07, pós-checkpoint Dex2 ✅ "GO condicionado"):** CONSOLIDAÇÃO EXECUTADA.
- `feat/model-resolver-hard-mode` **pushada** (condição do Dex2 — a consolidação deixou de ser só local).
- 3 tags **anotadas** `archive/*` criadas e **publicadas na origin** (sala-schemas-category-filter, laudo-quick-wins, android-parity).
- **44 branches locais deletadas** (as 41 mergeadas + as 3 arquivadas). Restam 5: `main`, `feat/model-resolver-hard-mode` e as 3 `codex/*` dos worktrees.
- Resíduos portados em branches novas a partir da main, **typecheck+build OK, pushadas, aguardando OK do Luiz p/ merge→main (deploy)**:
  - `hotfix/sala-schemas-report-filter` (`0583a86`) — port ADAPTADO de dd0c319 per Dex2: vínculo primário por `report_id` (o endpoint já selecionava a coluna e descartava), defesa por categoria só p/ linhas legadas, + categorias venosas (`DOPPLER_VENOSO_MMII[_MEDIDAS]` → `VENOSO_MMII`).
  - `port/engine-quick-wins` (`9a16970`) — cherry-pick limpo de bafeb2a+23fbb3f; o wiring caiu dentro do bloco `guardsMode === "full"` da main (LIVRE/TESTE continuam pulando guards, correto).

## Resumo

- **39 branches** `[mergeado→deletar]` — conteúdo 100% na main (24 delas com `ahead=0`, trivialmente seguras).
- **3 branches** `[dúvida→arquivar como tag]` — têm resíduo único a preservar (ver ações pendentes).
- **6 branches** `[vivo→manter]` — branch atual + 3 worktrees codex ativos (as 2 ancestrais venosas contam como deletar).

## ⚠️ Ações pendentes ANTES de deletar

1. **`fix/sala-schemas-category-filter` — BUGFIX REAL NÃO PORTADO.** Commit `dd0c319` adiciona `SCHEMA_EXAM_TYPES_BY_CATEGORY` + `visibleSchemas` em `apps/api/src/app/sala/[token]/page.tsx`. A main NÃO filtra esquemas por categoria (grep vazio) → esquemas vazam entre exames (ex.: MIOMAS em laudo de MAMA/TIREOIDE). **Cherry-pick `dd0c319` → main antes de arquivar/deletar.**
2. **`feat/android-parity`** — únicos não portados: `apps/api/scripts/create-beta-tester.mjs` (script de onboarding de beta tester, usado no teste interno da Play) + `docs/RESUME-2026-07-07.md`. Portar o script ou arquivar como tag.
3. **`fix/laudo-quick-wins` — QUICK-WINS DE ENGINE NÃO PORTADOS (confirmado 22/07).** Os 2 commits únicos são `bafeb2a` (cria `measureNormalizer.ts` — normalização cm/mm, join "x" — + `dumValidation.ts` — remove linha DUM inválida — + wiring no `generate/route.ts`) e `23fbb3f` (fix do guard: só remove linha "DUM: <token-único>", preserva DUM válida). **Nenhum dos dois arquivos existe na `origin/main`** (`git cat-file -e` falha para ambos). Ruling do Luiz (memória 08/07) dava esses itens como "JÁ implementados" — implementados na branch, mas nunca chegaram em prod. **Cherry-pick `bafeb2a` + `23fbb3f` → main** (verificar conflito no route.ts) antes de arquivar/deletar.

## Vivas ([vivo→manter])

| Branch | Estado | O que é único |
|---|---|---|
| `feat/model-resolver-hard-mode` | **atual**, 133 ahead, working tree consolidado em 6 commits (22/07) | Superset de toda a linha venosa (4-view RN + anotações C5 + venousAnnotations/venousRaster4 — **não estão na main**); snippets LIVRE/TESTE; edição incremental A1; diff por blocos web; toggle "difícil" Android |
| `codex/mobile-companion` | worktree ativo, 108 ahead, upstream sincronizado | Companion mobile |
| `codex/web-workspace-production` | worktree ativo, 4 ahead, upstream sincronizado | Web workspace (reconciliar c/ `8ba0056` na Frente 2) |
| `codex/mobile-companion-api` | worktree ativo, 1 ahead, upstream sincronizado | Canal companion na API |

## Dúvidas ([dúvida→arquivar como tag] — após executar as ações acima)

| Branch | Último commit | Resíduo único |
|---|---|---|
| `fix/sala-schemas-category-filter` | 07-08 filtro esquemas por categoria | `dd0c319` (bugfix a portar) |
| `feat/android-parity` | 07-07 retomada multi-plataforma | `create-beta-tester.mjs` + RESUME-07-07 |
| `fix/laudo-quick-wins` | 07-08 guard DUM token único | `isValidDum` (verificar cobertura na main) |

## Mergeadas ([mergeado→deletar] — 39)

**Ancestrais estritas da branch atual** (0 commits exclusivos vs `feat/model-resolver-hard-mode`; `venous-scheme-mobile` ainda por cima pushada na origin):
`feat/venous-4view-recolor`, `feat/venous-scheme-mobile`, `feat/venoso-estruturado`

**`ahead=0` vs origin/main (contidas por SHA, deleção trivial):**
`content/cervical-blocks`, `content/cervical-rest`, `deploy/a1b-backend`, `deploy/abdome-conclusao`, `deploy/edit-replace`, `deploy/edit-target`, `deploy/grannum-placenta`, `deploy/venous-backend`, `docs/android-briefing`, `docs/android-build`, `docs/android-decisions`, `docs/estilo-casa`, `engine-boletim`, `engine-boletim-2`, `engine-boletim-3`, `feat/cervical-spatial-levels`, `feat/ig-deterministica`, `feat/renderer-progress`, `feat/rn-revisar-marker`, `feat/sala-count-exams`, `feat/sala-daily-reset`, `feat/sala-schemas-backend`, `feat/sala-schemas-tab`, `fix/conclusao-itens-vazios`

**Patch-equivalentes ou conteúdo verificado já na main:**
`docs/arquitetura-2-modos-prova`, `docs/arquitetura-3-modos`, `docs/motor-doppler-vascular`, `docs/planos-2026-07-01`, `feat/pelve-menopausa`, `feat/doppler-renderer-det`, `web-v2`, `fix/doppler-gemelar-safety`, `feat/command-interpreter-v1`, `feat/msk-writer-pilot`, `feat/msk-passthrough`, `feat/asr-clinical`¹, `feat/msk-morfologia`, `fix/boletim-0630-safe`

¹ `feat/asr-clinical`: o upstream configurado é `origin/main` (config incomum). Vs `origin/feat/asr-clinical` está 0 à frente — **não há commits não pushados**, ao contrário do que a auditoria inicial sugeria. Feature portada e superada pela main (a branch nem tem o `MEDICAL_STYLE_PROMPT`). Segura deletar.

## Comando de deleção (executar SÓ após checkpoint Dex2 + ações pendentes)

```bash
# arquivar as 3 dúvidas como tags primeiro
git tag archive/sala-schemas-category-filter fix/sala-schemas-category-filter
git tag archive/android-parity feat/android-parity
git tag archive/laudo-quick-wins fix/laudo-quick-wins
# depois deletar (usar -D pois não são ancestrais de HEAD por SHA)
git branch -D <lista acima>
```

## Repo Swift iOS (`laudousg-swift/LaudoUSG`)

- `feat/hard-mode-toggle` **PUSHADA em 22/07** (`git push -u origin feat/hard-mode-toggle` ✅) — risco de perda eliminado. Working tree limpo.
- Restam 4 branches locais sem push (`feat/venous-4view-recolor` já pushada em sessão anterior; `feat/venous-scheme-organic`, `fix/apple-resubmission-146`, `codex/ios-mobile-companion` a triar em sessão futura).
