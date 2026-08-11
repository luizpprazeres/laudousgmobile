# Status da sessão longa — 23/07/2026

## Executado (autônomo, sem interrupção)

### Frente 0 — Consolidação (fechada na sessão anterior, deploy hoje)
- Merge das 2 branches de porte na `main` + push (deploy prod fresco `jmdjm1vga` ● Ready):
  - `hotfix/sala-schemas-report-filter` — esquemas da sala vinculados por `report_id` (+ defesa por categoria + categorias venosas). Corrige vazamento MIOMAS→MAMA/TIREOIDE.
  - `port/engine-quick-wins` — `measureNormalizer` (cm/mm) + `dumValidation` (linha DUM inválida).
- **Smoke pós-deploy OK:** PARTES_MOLES com "dois vírgula três centímetros" → saiu normalizado (sem "centímetros" por extenso, com "cm"); LIVRE (writer puro) sem regressão. Ambos `done=true` (~2,6s / ~1,4s).

### Frente 3 — Golden cases das categorias bloqueadas
- 9 categorias × 3 laudos-base sintéticos (normal + 2 patológicos), gerados por 9 subagentes Fable em paralelo, coerentes com `estilo-casa` + snippets + `_extraction`:
  DOPPLER_CAROTIDAS, ESCROTAL, PROSTATA_TRANSRETAL, REGIAO_INGUINAL, OCULAR, PARATIREOIDE, PAREDE_ABDOMINAL, TRANSFONTANELA, DOPPLER_FISTULA_AV.
- Entregável de revisão: `tmp-review/golden-bootstrap-2026-07-23/_REVISAO-golden-cases.html` (enviado ao Luiz). Fontes .md por categoria no mesmo diretório.
- **Cleanup transversal aplicado:** 27 snippets — adjetivo `hipo/hiper/iso/anecogênico` → `...ecoico` (troca determinística, substantivo "ecogenicidade" preservado). Commit `ff68749`.

### Frente 2 — Web (reconciliação)
- Diagnóstico + plano: `docs/plano-reconciliacao-web-2026-07-23.md`. `codex/web-workspace-production` é a linha canônica (contém o companion web↔app via `workspaceCompanion.ts`); `8ba0056` já é ancestral da branch de trabalho; o diff-sugestão (`c313662`) precisa ser re-aplicado por cima (conflita no `WorkspaceInputDock`). NÃO mergeado — aguarda gate do Luiz (é web, sem validação visual aqui).

## Decisões pendentes do Luiz (gates)
1. **Golden cases** (5 decisões transversais no topo do HTML + notas por categoria): numeração de conclusão item único; título Doppler no ESCROTAL; frequências fixas nos COMENTÁRIOS; "compatível com" no corpo dos snippets; "imagem" vs "nódulo".
2. **Frente 2:** confirmar `codex/web-workspace-production` como base canônica + qual worktree serve a web de prod (liga com Frente 6).
3. **Frente 5 (Biblioteca web):** é greenfield — a "Biblioteca" do iOS é só placeholder (`GenerateView.swift`: "Frases e protocolos favoritos entram em sprints futuros"). Não há implementação rica para portar; a base serão os laudos-padrão (modelos normais + com placeholders) da Frente 2. Planejar junto com a Frente 2.

## Fila de merges para a main (após aval)
- Snippets ecoico + golden cases corrigidos → few-shots/writer das categorias bloqueadas.
- Reconciliação web (Frente 2) na linha de deploy da web.
