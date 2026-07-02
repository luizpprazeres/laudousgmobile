# LaudoUSG — Backend Mobile (monorepo)

Monorepo que hoje serve **exclusivamente como backend Next.js + packages compartilhados** para o app iOS LaudoUSG.

> **Origem:** este repo nasceu como app RN/Expo + backend. O app RN foi **descontinuado** em favor do app iOS nativo SwiftUI (em [`~/laudousg-swift/`](../laudousg-swift)). O backend continuou aqui porque já estava em prod e tem dependências de monorepo (Drizzle + Zod compartilhados).

---

## O que VIVE aqui hoje

| Pasta | Status | Descrição |
|---|---|---|
| `apps/api/` | 🟢 **VIVO em prod** | Backend Next.js 15. Deploy: `https://laudousgmobile.vercel.app`. Endpoints consumidos pelo app iOS Swift. |
| `packages/db/` | 🟢 Vivo | Drizzle ORM schema + migrations. Usado **só** pelo `apps/api`. |
| `packages/shared/` | 🟢 Vivo | Zod schemas + tipos. Usado por `apps/api` (e por `apps/mobile` que está congelado). |
| `_extraction/from-laudousg-original/` | 📚 Referência | Prompts canônicos, modelos por categoria, regras clínicas, few-shots — extraídos do `laudousg.com`. Não mexer sem revisão. |
| `apps/mobile/` | ❄️ **CONGELADO** | App RN/Expo descontinuado. Mantido como referência clínica das calculadoras IG/Doppler pra port futuro pra SwiftUI. **Não desenvolver mais aqui.** |

---

## Relação com outros repos

```
~/laudousg/              → Web em PROD (laudousg.com). NÃO MEXER. Independente.
~/laudousg-swift/        → App iOS nativo (SwiftUI). Consome este backend.
~/laudousgmobile-def/    ← VOCÊ ESTÁ AQUI (backend Next.js + packages)
```

### Quem consome o backend daqui (`apps/api/`)?
- **App iOS Swift** (`~/laudousg-swift/`) — endpoints `/api/generate`, `/api/transcribe`, `/api/reports/[id]`, `/api/me/*`, `/api/sala/*`

### Quem NÃO consome?
- A web `laudousg.com` (em `~/laudousg/`) tem backend próprio, independente

---

## Stack do que está vivo

- **Backend:** Next.js 15 App Router, runtime `nodejs`, streaming SSE
- **DB / Auth:** Supabase (Postgres + RLS + pgvector + Auth)
- **ORM:** Drizzle (schema TS, migrations geradas)
- **IA:** OpenAI (gpt-4.1-mini writer/structurer, Groq llama-3.3-70b fallback, Whisper-1 transcrição)
- **Monorepo:** pnpm workspaces + Turborepo
- **Hosting:** Vercel (config em `vercel.json` — `buildCommand: pnpm --filter @laudousg/api build`)

---

## Estrutura

```
.
├── apps/
│   ├── api/        🟢 Next.js — VIVO em prod
│   └── mobile/     ❄️ Expo — CONGELADO (não desenvolver)
├── packages/
│   ├── shared/     🟢 Zod schemas + tipos
│   └── db/         🟢 Drizzle schema + migrations
├── _extraction/    📚 Referência clínica canônica
├── scripts/        Utilitários (golden-validation, etc)
├── vercel.json     Config Vercel
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Setup local (só pra desenvolver `apps/api`)

```bash
# 1. Dependências
pnpm install

# 2. Env (copie de .env.example e preencha)
cp .env.example .env
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
# OPENAI_API_KEY, LLM_API_KEY (Groq), DATABASE_URL

# 3. DB (Drizzle → Supabase) — só se precisar gerar migration nova
pnpm db:generate
pnpm db:migrate

# 4. Dev
pnpm api:dev    # http://localhost:3000

# 5. Typecheck + build (validação antes de PR)
pnpm -F api typecheck
pnpm -F api build
```

> `pnpm mobile:dev` ainda funciona (Expo) mas **não desenvolver mais lá** — o app é o Swift.

---

## Pipeline de geração (resumo, vive em `apps/api`)

1. **Structurer** — gpt-4.1-mini com Structured Outputs strict → `StructuredFindings`
2. **Deterministic validator** — TS puro: medidas, unidades, lateralidade, datas, comandos
3. **Retriever (RAG)** — pgvector HNSW + filtros (categoria, estilo, status, prioridade)
4. **Writer** — gpt-4.1-mini streaming → laudo final
5. **Sanity check** — síncrono, **zero IA** (rodado no client iOS via `SanityChecker.swift`)

> **Decisão trancada:** sanity check NUNCA usa LLM. Determinístico ou nada.

**Precedência (no prompt):** comandos explícitos > achados estruturados > validações > prompt global > contrato categoria > estilo > RAG > exemplos.

### Como adicionar uma categoria de renderer determinístico

Referência viva: a categoria **CERVICOMETRIA** (US pélvica transvaginal p/ medida do
colo). Uma categoria programática nova toca 6 pontos:
1. `renderer/categories/<CAT>.ts` — schema Zod + JSON schema strict + prompt de
   extração + `render<Cat>()`.
2. `renderer/extraction.ts` — import + entrada em `EXTRACTORS` + `RENDERER_PROGRAMMATIC_CATEGORIES`.
3. `pipeline/renderer.ts` — `case` no switch programático.
4. `pipeline/categoryNormalization.ts` — `FAMILY_RULES` (e, se o structurer tende a
   confundir com outra categoria, um override por texto bruto como
   `resolveCervicometriaCategory`, chamado no `resolveEffectiveCategory` do route).
5. `packages/db/src/seeds/data.ts` — `CATEGORIES_SEED`.
6. **Deploy (gate):** row em `categories` no DB de prod + código na env
   `RENDERER_CATEGORIES` do Vercel + redeploy. Sem os dois, a categoria é dormente.

Checklist de ativação da CERVICOMETRIA (com thresholds a confirmar pelo Luiz):
`docs/deploy-cervicometria-2026-07-02.md`.

---

## Segurança / LGPD

- Chaves de IA (OpenAI, Groq) **apenas server-side**
- App iOS usa só `SUPABASE_ANON_KEY` + `BACKEND_URL` público
- RLS em todas as tabelas de usuário
- `knowledge_blocks` legível por authenticated, gravável só por admin
- Backend valida JWT Supabase em todo handler (`verifyJwt`)
- Service role só em endpoints específicos (ex: `DELETE /api/me/delete-account` chama `auth.admin.deleteUser`)
- **Não armazenar** dados sensíveis de paciente (nome, CPF, RG) — proibido por design
- **Não armazenar** imagens (JPEG/PNG de ultrassom)

---

## Backlog de limpeza (futuro, não urgente)

- [ ] Extrair calculadoras RN (`apps/mobile/src/features/generate/IGCalculatorSheet.tsx`, `DopplerCalculatorSheet.tsx`) pra `_extraction/from-laudousg-mobile/calculators/` antes de deletar `apps/mobile/`
- [ ] Após extração: deletar `apps/mobile/` + entrada em `pnpm-workspace.yaml` + deps órfãs
- [ ] Renomear pasta local pra `laudousg-backend` (manter repo GitHub como `laudousgmobile` por causa do Vercel git-link)
- [ ] Atualizar referências em `~/laudousg-swift/CLAUDE.md` + `ARCHITECTURE.md` pro novo path

Plano completo em `~/laudousg-swift/CLAUDE.md` (seção "Relação entre repos").
