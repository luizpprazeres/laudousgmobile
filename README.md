# LaudoUSG — Backend Mobile (monorepo)

Monorepo que serve **(1) o backend Next.js + packages compartilhados** (consumidos pelo app iOS Swift **e** pelo app Android RN) **e (2) o app Android React Native/Expo** (`apps/mobile`), que está **ATIVO** e em preparação para a Play Store.

> **Origem / correção (2026-07-04):** este repo nasceu como app RN/Expo + backend. Houve uma fase em que o app RN foi congelado em favor do app iOS nativo SwiftUI (em [`~/laudousg-swift/`](../laudousg-swift)). **Mas o app Android RN foi RETOMADO** — hoje é o app Android oficial (Expo 52, RN 0.76.9), em desenvolvimento ativo (paridade com o iOS) e prestes a lançar na Play Store. O README anterior dizia que `apps/mobile` estava congelado — isso está **desatualizado**.
>
> **Android Studio / emular:** o projeto nativo Android fica em **`apps/mobile/android/`** (Gradle — abrir esta pasta no Android Studio). O fluxo recomendado com Expo é `cd apps/mobile && npx expo run:android` (compila o `android/` e instala no device/emulador). Planos: `docs/plano-paridade-android-swift.md` (paridade RN↔Swift) + `docs/plano-android-playstore.md` (publicação) + `docs/parity/` (briefing/auditoria).

---

## O que VIVE aqui hoje

| Pasta | Status | Descrição |
|---|---|---|
| `apps/api/` | 🟢 **VIVO em prod** | Backend Next.js 15. Deploy: `https://laudousgmobile.vercel.app`. Endpoints consumidos pelo app iOS Swift. |
| `packages/db/` | 🟢 Vivo | Drizzle ORM schema + migrations. Usado **só** pelo `apps/api`. |
| `packages/shared/` | 🟢 Vivo | Zod schemas + tipos. Usado por `apps/api` (e por `apps/mobile` que está congelado). |
| `_extraction/from-laudousg-original/` | 📚 Referência | Prompts canônicos, modelos por categoria, regras clínicas, few-shots — extraídos do `laudousg.com`. Não mexer sem revisão. |
| `apps/mobile/` | 🟢 **ATIVO** (Android) | App **Android** React Native/Expo (Expo 52, RN 0.76.9). Retomado; app Android oficial em paridade com o iOS, prestes a lançar na Play Store. Nativo Android em `apps/mobile/android/` (Android Studio). Consome o mesmo backend `apps/api`. |

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

> **App Android (RN/Expo):** `cd apps/mobile && npx expo run:android` (dev build no device/emulador) ou abrir `apps/mobile/android/` no Android Studio. `pnpm mobile:dev` inicia o Metro. É desenvolvimento **ativo** — ver `docs/plano-paridade-android-swift.md`.

---

## Pipeline de geração (resumo, vive em `apps/api`)

1. **Structurer** — gpt-4.1-mini com Structured Outputs strict → `StructuredFindings`
2. **Deterministic validator** — TS puro: medidas, unidades, lateralidade, datas, comandos
3. **Retriever (RAG)** — pgvector HNSW + filtros (categoria, estilo, status, prioridade)
4. **Writer** — gpt-4.1-mini streaming → laudo final
5. **Sanity check** — síncrono, **zero IA** (rodado no client iOS via `SanityChecker.swift`)

> **Decisão trancada:** sanity check NUNCA usa LLM. Determinístico ou nada.

**Precedência (no prompt):** comandos explícitos > achados estruturados > validações > prompt global > contrato categoria > estilo > RAG > exemplos.

---

## Qualidade & aprendizado contínuo

- **`docs/aprendizado-correcoes-luiz.md`** — corpus vivo ("memória infinita") do que a IA
  erra e o Dr. Luiz corrige à mão, extraído do diff `generated_output` (saída da IA) →
  `final_output` (versão salva após correção). Ranking dos defeitos + biblioteca de frases
  canônicas. Atualizar re-rodando a mineração; consultado pela automação do boletim.
- **`docs/plano-acao-boletins-2026-06-29.md`** — plano de ação consolidado dos boletins.
- **`docs/boletim-diario-prompt.md`** — prompt da automação diária de qualidade. Analisa
  `generated_output` (= saída real da IA, pós-guards). **Não** trocar para `final_output`
  (essa é a versão já corrigida pelo médico).

> Semântica das colunas: `generated_output` = saída da IA; `final_output` = correção manual
> do médico (só gravada quando ele edita). Hoje só 1 usuário salva `final_output`.

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
