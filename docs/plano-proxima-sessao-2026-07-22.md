# Plano-mestre da próxima sessão longa — LaudoUSG

**Data de preparação:** 22/07/2026
**Objetivo deste documento:** permitir limpar o contexto e retomar a próxima sessão sem perder nada. Contém (1) auditoria factual do repositório, (2) o que está vivo em prod, (3) o que está pendente, (4) as 9 frentes de trabalho da próxima sessão.

> **Papéis (workflow estabelecido):** Claude = planejamento-mestre, orquestração, subagentes, device, visão geral. **Dex2 (GPT 5.6 sol, high) = preferência em decisões/planos** — validar checkpoints marcados com 🔵. **Dex1 = execução de código longo.** Consultar via `maestri ask "Dex2" "..."` (ou `medmaestri`). No momento desta escrita nenhum agente maestri estava conectado.

---

## 1. Auditoria de repositório (estado factual em 22/07)

### 1.1 Repo principal `laudousgmobile-def` (backend API + RN Android + web + packages)

- **Branch atual:** `feat/model-resolver-hard-mode` (working tree sujo, **64 arquivos** M/??).
- **`main` local:** 0 à frente, **2 atrás** de `origin/main` → precisa `git pull` (fast-forward trivial).
- **29 branches locais sem upstream** (nunca pushadas). A maioria (`deploy/*`, `docs/*`, `content/*`) já teve o conteúdo consumido via port para main — são **candidatas a arquivar/deletar**.
- **`feat/asr-clinical`** = única branch com upstream e 2 commits locais não pushados (verificar relevância).

**O que a `origin/main` (= PROD) JÁ contém — confirmado por `git ls-tree`/`--contains`:**
- ✅ `modelResolver.ts`, `generationPathResolver.ts`, `livreSystemPrompt.ts`, `categoryVisibility.ts` — **feature de modelos/toggle/categorias 100% deployada.**
- ✅ Categorias **Livre** e **Teste** (commits `745644e`, `33b9e8c`) + writer **gpt-5.4-mini** (`21b9f3f`).
- ✅ Delta do venous 4-view backend (flag `VENOUS_SCHEME_4VIEW=true`, port `71ae79e` de sessão anterior).

**O que NÃO está na `origin/main` (só na branch local `feat/model-resolver-hard-mode`):**
- ❌ Toggle "laudo difícil" no **RN Android** (`da4fc63`) — não é bloqueante p/ prod (mobile envia por build, não por Vercel; e o server já tem `HARD_MODE_ENABLED`).
- ❌ **Web clinical workspace shell** (`8ba0056`) — relevante para a frente web.
- ❌ Cadeia completa do **venous 4-view mobile** (`86ec6fe` + C4/C5) — vai por build do app, não por Vercel.

**Working tree sujo — conteúdo valioso NÃO versionado (risco de perda):**
- Snippets novos de **categorias bloqueadas** ainda `??` (untracked): `DOPPLER_CAROTIDAS/`, `DOPPLER_FISTULA_AV/`, `OCULAR/`, `PARATIREOIDE/`, `PAREDE_ABDOMINAL/`, `PARTES_MOLES/`, `MUSCULOESQUELETICO/`, `ABDOMEN_TOTAL_DOPPLER/`, `DOPPLER_VENOSO_MMII/exemplo/`.
- Modificações em snippets vasculares (`DOPPLER_VENOSO_MMII*`), `env.ts`, `renderer.ts`, `OBSTETRICA.ts`, componentes web (`LaudarWebExperience.tsx`, `LaudoPreview.tsx`, `WorkspaceInputDock.tsx`).
- Dezenas de `docs/*.md` de planos untracked + `apps/web/src/components/laudar/reportSuggestion.ts` (novo).

**Worktrees:**
- 4 em `/private/tmp/laudousg-pr-*` marcados **`prunable`** → `git worktree prune` limpa.
- Ativos e **pushados**: `laudousgmobile-web-production` (`codex/web-workspace-production`, 4 à frente), `laudousgmobile-companion` (`codex/mobile-companion`, **108 à frente**), `laudousgmobile-companion-api` (`codex/mobile-companion-api`, 1 à frente).

### 1.2 Repo Swift iOS `laudousg-swift/LaudoUSG`

- **Branch atual:** `feat/hard-mode-toggle` — **SEM upstream (não pushada).** ⚠️ Trabalho iOS mais recente está só local.
  - Contém: `a8c89c2` modo avançado (toggle), `9215e80` **reorganiza a barra do laudo + remove "Ajustar laudo"** (pedido do Luiz), `fecf33f` venous 4-view + anotações manuscritas, `1de2bea` edição incremental.
- 5 branches locais sem push (`feat/hard-mode-toggle`, `feat/venous-4view-recolor`, `feat/venous-scheme-organic`, `fix/apple-resubmission-146`, `codex/ios-mobile-companion`).

### 1.3 Diagnóstico da "bagunça"

A sensação de desorganização vem de **três coisas reais**:
1. **Ports com SHAs diferentes:** a main foi construída por cherry-pick limpo, então os commits ORIGINAIS na branch de trabalho aparecem como "não estão na main" mesmo com o conteúdo já em prod. `git log origin/main..feat/model-resolver-hard-mode` mostra 40 commits, mas boa parte é duplicata de conteúdo.
2. **Working tree gigante e não commitado** (64 arquivos), misturando docs, snippets de categorias bloqueadas e ajustes vasculares.
3. **iOS 100% local** — nada pushado no repo Swift.

---

## 2. O que está VIVO em produção (validado)

| Item | Estado | Evidência |
|------|--------|-----------|
| Writer padrão **gpt-5.4-mini** (reasoning `none`) | ✅ LIVE | env setada + deploy `n91iimkrf` serve o alias; LIVRE gera limpo ~2,7s |
| Toggle **"laudo difícil"** (server `HARD_MODE_ENABLED`) → gpt-5.4 | ✅ LIVE (backend) | smoke 5,5s; falta build do app p/ o toggle visual chegar ao usuário |
| Categoria **Livre** (writer puro + regras da casa) | ✅ LIVE | smoke LIVRE 3,3s, estilo casa, sem markdown |
| Categoria **Teste** (DeepSeek v4-flash, privada Luiz) | ✅ LIVE | smoke 6,2s; fail-closed 403 p/ não-autorizado |
| **Cartografia venosa 4 vistas** (iOS + backend prod) | ✅ LIVE + validado em device | Luiz ditou no iPhone, renderizou 4-view em prod |
| iOS build 147 com toggle instalado no iPhone do Luiz | ✅ | BUILD SUCCEEDED |
| 11 renderers determinísticos + flags obstétricas (Grannum, FLEXIBLE_CONCLUSION) | ✅ LIVE | sessões anteriores |

---

## 3. O que está PRONTO mas pendente (não aplicado / não pushado)

| Item | Onde está | Ação pendente |
|------|-----------|---------------|
| Toggle "difícil" RN Android | `feat/model-resolver-hard-mode` (`da4fc63`, local) | build EAS/dev do Android + instalar |
| Reorganização da barra iOS + remoção "Ajustar laudo" | Swift `feat/hard-mode-toggle` (`9215e80`, **local**) | **push do repo Swift** + build |
| Remoção "Ajustar laudo" no Android RN | `feat/model-resolver-hard-mode` (`2e01abe`, local) | build Android |
| Snippets de categorias bloqueadas (OCULAR, PARATIREOIDE, PARTES_MOLES, DOPPLER_CAROTIDAS, etc.) | working tree **untracked** | commitar (não perder) → base p/ curadoria |
| Web clinical workspace shell | `8ba0056` local + worktree `codex/web-workspace-production` (pushado) | reconciliar as duas fontes + finalizar |
| Esquemas visuais **tireoide/mama** | pranchas gate em `tmp-review/` (gate-mama/gate-tireoide HTML) | gate visual com Luiz → implementar (v1 estilo editor de miomas, per Dex2) |

---

## 4. Plano da próxima sessão — 9 frentes

> Ordem sugerida: **Frente 0 primeiro** (consolidação — reduz risco de perder trabalho), depois paralelizar 1–3 e 5, deixar 6–7 (domínios/lab) para o fim por serem infra sensível.

### 🔵 Frente 0 — Consolidação de branches/worktrees (TAREFA 1, usa Superpowers/worktree)

**Objetivo:** parar de "se perder entre branches". Deixar um estado limpo e rastreável.

Passos:
1. **Salvar o trabalho não commitado primeiro.** Revisar os 64 arquivos; commitar em lotes semânticos na branch atual:
   - lote A: snippets de categorias bloqueadas (`packages/knowledge/snippets/*` untracked) — mensagem `content: snippets base categorias bloqueadas`.
   - lote B: ajustes vasculares (`DOPPLER_VENOSO_MMII*`).
   - lote C: docs/planos (`docs/*.md` untracked) — `docs: planos acumulados [skip ci]`.
   - lote D: componentes web (`apps/web/.../laudar/*` + `reportSuggestion.ts`).
2. **Atualizar `main` local:** `git checkout main && git pull` (2 commits ff).
3. **Push do repo Swift:** a branch `feat/hard-mode-toggle` precisa de push (perigo de perda). Confirmar com Luiz (ou @devops) — push é operação exclusiva de devops no workflow.
4. **Podar worktrees mortos:** `git worktree prune` (limpa os 4 `prunable`).
5. **Triagem de branches locais (29 sem upstream):** classificar cada uma em `[mergeado→deletar]`, `[vivo→manter]`, `[dúvida→arquivar como tag]`. Usar a skill de worktree do Superpowers p/ inspecionar sem checkout. Candidatas óbvias a deletar (conteúdo já em prod): `deploy/venous-backend`, `deploy/grannum-placenta`, `deploy/abdome-conclusao`, `fix/laudo-quick-wins`, `content/cervical-*`, `docs/*`.
6. **Produzir um `docs/inventario-branches-2026-07-22.md`** com o veredito de cada branch (delegar a auditoria fina a um subagente Explore para não gastar contexto).

🔵 **Checkpoint Dex2:** validar a estratégia de consolidação (o que deletar vs arquivar) antes de deletar qualquer branch.

### Frente 1 — Esquemas visuais tireoide/mama (aplicar)

- **Estado:** membros inferiores (venoso 4-view) concluído e em prod. Tireoide/mama já discutidos; pranchas de gate prontas em `tmp-review/` (glifos BI-RADS/TI-RADS: nódulo sólido = círculo preenchido, cisto = contorno, lobulado, linfonodo intramamário = oval com ponto central; quadrantes 12/3/6/9 destacados).
- **Passos:** (a) gate visual com Luiz nas pranchas P&B; (b) implementar motor de esquema (v1 estilo editor de miomas, per Dex2 — traço clínico simples + anotação manuscrita ao lado); (c) wiring SSE `scheme` como no venoso; (d) clientes iOS/RN.
- **Ref:** `docs/plano-esquemas-tireoide-mama-2026-07-22.md`.
- 🔵 **Checkpoint Dex2:** estilo do renderer (reaproveitar motor venoso vs novo).

### Frente 2 — Pendências da versão web (`web.laudousg.com`)

- **Estado:** visual repaginado + comunicação com o app criada. Duas fontes: `8ba0056` (local) e worktree `codex/web-workspace-production` (pushado, 4 à frente). **Reconciliar antes de continuar.**
- **Passos:** (a) unificar as duas fontes web; (b) mapear o que falta corrigir/finalizar na integração web↔app; (c) fluxo web específico: ao escolher categoria, apresentar **laudo-modelo normal OU modelo com placeholders** para medidas.
- **Refs:** `docs/plano-evolucao-web-workspace-2026-07-20.md`, `docs/plano-web-v2.md`.

### Frente 3 — Categorias bloqueadas: criar modelos/golden cases

- **Estado:** **Livre já destrava todas hoje** (escape hatch em prod). Bloqueadas de fato (têm snippet, faltam renderer/writer validado): `DOPPLER_CAROTIDAS`(+vertebrais), `REGIAO_INGUINAL`, `OCULAR`, `PARATIREOIDE`, `PAREDE_ABDOMINAL`, `TRANSFONTANELA`, `PROSTATA_TRANSRETAL/TRANSABDOMINAL`, `ESCROTAL`, `DOPPLER_FISTULA_AV`. (Partes moles **não** está bloqueada.)
- **Passos:** para cada categoria sem golden case, **gerar laudos-base com o Fable aqui no Claude Code** analisando o repertório do repo → Luiz revisa → viram few-shots/writer. Já validado como processo (corpus bootstrap anterior).
- **Regras da casa** (aplicar a todos): descrever em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", concluir em "CONCLUSÃO", hipoecoica/isoecoico/hiperecoico (nunca "ecogênico"), transdutor em COMENTÁRIOS, não repetir corpo na conclusão, "Nãos" (não inventar dado/medida).
- **Ref:** `docs/prompt-categoria-livre-2026-07-22.md`, `docs/estilo-casa-regras-gerais.md`.

### Frente 4 — Integração iOS ↔ Android ↔ Web (alinhamento)

- **Objetivo:** as 3 plataformas no mesmo nível. Android já quase paritário ao iOS.
- **Passos:** (a) build Android com toggle + remoção "Ajustar laudo" + cartografia; (b) confirmar paridade de categorias (Livre/Teste visíveis conforme autorização); (c) alinhar comportamento web (modelos/placeholders).

### Frente 5 — Biblioteca na web

- **Estado:** apps já têm a aba Biblioteca; web não.
- **Passos:** implementar aba **Biblioteca** no menu principal da web, usando os **laudos-padrão** (modelos normais + modelos com placeholders) como base — os mesmos que alimentam o fluxo de seleção de categoria da Frente 2.

### 🔵 Frente 6 — Migração de domínio `web.laudousg.com` → `laudousg.com`

- **Objetivo:** `laudousg.com` passa a servir o conteúdo atual de `web.laudousg.com` (versão oficial); domínio antigo em standby.
- **Sensível (infra/DNS/Vercel domains).** Passos: (a) mapear onde `laudousg.com` aponta hoje; (b) plano de cutover (aliases Vercel + DNS) reversível; (c) executar fora de horário de pico.
- 🔵 **Checkpoint Dex2 + confirmação explícita do Luiz** antes de qualquer mudança de DNS/alias (ação externa irreversível).

### 🔵 Frente 7 — Reformulação `lab.laudousg.com`

- **Estado:** lab ainda na arquitetura antiga (RAG). Precisa migrar para o modelo atual (modelos + prompts + regras de writer por categoria).
- **Escopo:** praticamente reconstruir a ferramenta preservando os objetivos (visualizar geração, entender regras, testar). **Merece sessão própria** — só **planejar em conjunto** nesta sessão, não executar.
- 🔵 **Checkpoint Dex2:** desenhar a arquitetura nova do lab antes de qualquer código.

---

## 5. Riscos / gotchas a lembrar

- **iOS não pushado** = maior risco imediato de perda de trabalho. Push é operação de @devops.
- **Env Vercel:** `printf 'valor\n' | vercel env add` (remove trailing newline) + **deploy fresco** (redeploy pode reusar env antigo).
- **DeepSeek/PHI:** categoria Teste só com ditados sintéticos/do Luiz (nuvem China, sem LGPD). Fail-closed já garante server-side.
- **Structurer ainda em gpt-4.1-mini** — validar structured outputs antes de flipar `OPENAI_MODEL_STRUCTURER`.
- **Domínio/DNS e lab** = ações externas sensíveis → sempre confirmar com Luiz + Dex2.
- **Model IDs corretos** (Dex2 corrigiu): família 5.4 usa effort `low` (não "minimal"); DeepSeek = `deepseek-v4-pro`/`deepseek-v4-flash` (não "deepseek-v4"); `deepseek-chat` sai 24/07.

---

## 6. Checklist de arranque da próxima sessão

1. [ ] Ler este doc + memória `sessao-modelos-toggle-categorias` + `plano-cartografia-4vistas-proximos-passos`.
2. [ ] Frente 0: commitar os 64 arquivos em lotes; `main` pull; **push do repo Swift**; `git worktree prune`; inventário de branches (subagente).
3. [ ] Conectar Dex2 (`maestri list`) e validar a consolidação.
4. [ ] Frentes 1–3 e 5 em paralelo; 6–7 por último com confirmação do Luiz.
