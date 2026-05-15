# LaudoUSG Mobile

Plataforma mobile-first para geração de laudos de ultrassonografia por IA.
Mais simples que a versão atual para o usuário, mais inteligente nos bastidores.

## Stack

- **Mobile**: Expo + React Native + TypeScript + Expo Router
- **Backend**: Next.js 15 (App Router, Vercel) — runtime `nodejs`, streaming SSE
- **DB / Auth / Storage**: Supabase (Postgres + RLS + pgvector + Auth)
- **ORM**: Drizzle ORM (schema TS, migrations geradas, `pgPolicy()` para RLS)
- **IA**: OpenAI (gpt-4o writer, gpt-4o-mini structurer/sanity, text-embedding-3-small)
- **Transcrição live**: Deepgram Nova-3 via proxy WS no backend
- **Monorepo**: pnpm workspaces + Turborepo

## Estrutura

```
.
├── apps/
│   ├── mobile/    Expo app
│   └── api/       Next.js API (Vercel)
├── packages/
│   ├── shared/    Zod schemas + tipos compartilhados
│   └── db/        Drizzle schema + migrations + seeds
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Pipeline de geração (5 etapas, SSE)

1. **Structurer** — gpt-4o-mini com Structured Outputs strict → `StructuredFindings`
2. **Deterministic validator** — TS puro: medidas, unidades, lateralidade, datas, comandos
3. **Retriever (RAG)** — pgvector HNSW + filtros (categoria, estilo, status, prioridade)
4. **Writer** — gpt-4o streaming, temp 0.2 → laudo final
5. **Sanity check** — gpt-4o-mini → `ok | warning | critical` + trechos conflitantes

**Precedência (codificada no prompt)**: comandos explícitos > achados estruturados > validações > prompt global > contrato categoria > estilo > RAG > exemplos.

## Setup local

```bash
# 1. Dependências
pnpm install

# 2. Env
cp .env.example .env
# preencher SUPABASE_*, OPENAI_API_KEY, DEEPGRAM_API_KEY, DATABASE_URL

# 3. DB (Drizzle → Supabase)
pnpm db:generate    # gera SQL a partir do schema TS
pnpm db:migrate     # aplica no Supabase
pnpm db:seed        # writing_styles + categories + sample knowledge_blocks

# 4. Dev
pnpm api:dev        # http://localhost:3000
pnpm mobile:dev     # Expo dev server
```

## Segurança

- Todas as chaves de IA (OpenAI, Deepgram) ficam **apenas no backend**
- App mobile só usa `SUPABASE_ANON_KEY` + `EXPO_PUBLIC_API_URL`
- RLS em todas as tabelas de usuário
- `knowledge_blocks` legível por authenticated, gravável só por admin
- Backend valida JWT Supabase em todo handler

## Status

🏗️ **Bootstrap em andamento.** Veja `docs/ROADMAP.md` (em breve) para o estado atual.
