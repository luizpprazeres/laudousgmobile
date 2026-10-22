# Story admin-instagram F1 — calendário e editor do Instagram no /admin (sem publicar)

**Status:** InProgress · **Criada:** 22/10/2026 · **Plano aprovado pelo Luiz em 22/10:** `docs/plano-agendador-instagram-2026-10-21.md`

## Contexto

O `/admin` já está no ar (`apps/admin`, Next.js 15, `basePath: "/admin"`, projeto Vercel `laudousg-admin`). Esta fase acrescenta uma seção **Instagram** para organizar os posts do calendário editorial (`copy/calendario-instagram.json`, conta @laudousg). **Nada é publicado no Instagram nesta fase** e não há conexão com a Meta.

## Critérios de aceite

1. **Migração (só o arquivo SQL, ninguém aplica nesta story):** `supabase/migrations/<timestamp>_admin_social.sql`, no mesmo padrão de `20261022173915_admin_landing_daily.sql` (RLS ligado, sem policies, `revoke all` de `anon` e `authenticated`).
   - `social_posts`: `id` (texto, ex.: `s1-01`, `st-1026-1`), `scheduled_at timestamptz`, `format` (`image | carousel | story`), `caption`, `hashtags`, `alt_text`, `status` (`draft | approved | publishing | published | failed`), `manual boolean`, `interaction jsonb` (sticker sugerido dos stories manuais), `pillar`, `angle`, `title`, `notes jsonb` (VERIFICAR do calendário), `attempts int`, `last_error text`, `ig_media_id`, `permalink`, `published_at`, `created_at`, `updated_at`.
   - `social_media_items`: `post_id` → `social_posts`, `position`, `storage_path`, `public_url`, `slide_text`, `visual_brief`, `alt_text`. Única por `(post_id, position)`.
   - `social_accounts` já criada vazia para a F2: `ig_user_id`, `username`, `token_ciphertext`, `token_expires_at`, `connected_at`. Token **nunca** em texto puro.
   - Bucket de Storage `social` (público, só imagens de marketing), criado na mesma migração.
2. **Importação:** botão/rota `POST /admin/api/social/importar` que lê o JSON do calendário (upload do arquivo pelo painel) e cria ou atualiza posts em `draft`, idempotente por `id`. Feed `foto` → `image`, `carrossel`/`viral` com mais de um slide → `carousel`, `story` → `story`; `publicacao: "manual"` → `manual = true`. Datas no fuso `America/Sao_Paulo`. Nunca rebaixa um post `approved`/`published` para `draft`.
3. **Telas em `/admin/instagram`** (item novo no menu, mesmo visual do painel):
   - Calendário por semana (padrão) e por mês, com feed e stories separados e o selo do status; stories manuais marcados.
   - Editor do post: legenda, hashtags, alt, data/hora, ordem dos slides, upload de imagem por slide (só JPEG, até 8 MB, 1080×1350 ou 1080×1920) para o bucket `social`, prévia.
   - Botão **Aprovar** (`draft → approved`) e **Voltar para rascunho**. Post sem imagem em todos os slides não pode ser aprovado (stories manuais também exigem imagem).
4. **Segurança:** todas as rotas novas exigem a sessão de admin (o middleware já cobre `/admin/api/*`; checar de novo no handler, como as rotas atuais). CSP: liberar em `img-src` **só** o host do Storage do Supabase (derivado de `SUPABASE_URL`). Service role só no servidor.
5. **Testes** (`apps/admin/tests/social.test.ts`): mapeamento do JSON (formato, manual, fuso), idempotência da importação, regra de aprovação sem imagem, validação de upload (tipo, tamanho), a auditoria `sem-texto-clinico` continua passando.
6. `pnpm --filter @laudousg/admin typecheck`, `test` e `build` verdes.

## Fora do escopo

OAuth com a Meta, publicação, cron, Insights (F2–F4). Sem push, deploy, env na Vercel ou migração aplicada.

## Tarefas

- [x] Migração `admin_social`
- [x] Camada de dados `src/lib/social/*`
- [x] Importação do JSON
- [x] Calendário e editor
- [x] Upload para o Storage + CSP
- [x] Testes, typecheck, build
- [x] Entrega em `docs/admin/entrega-instagram-f1.md`

## File List

- `supabase/migrations/20261022205957_admin_social.sql` (novo)
- `apps/admin/src/lib/social/tipos.ts`, `datas.ts`, `calendario.ts`, `regras.ts`, `csp.ts`, `servidor.ts`, `rotas.ts`, `instancia.ts` (novos)
- `apps/admin/src/app/api/social/{importar,salvar,ordem,status,midia}/route.ts` (novos)
- `apps/admin/src/app/(painel)/instagram/page.tsx`, `apps/admin/src/app/(painel)/instagram/[id]/page.tsx` (novos)
- `apps/admin/src/components/Instagram.tsx` (novo)
- `apps/admin/src/components/Navegacao.tsx` (item Instagram no menu)
- `apps/admin/src/lib/data/colunas.ts` (allowlist de `social_posts` e `social_media_items`)
- `apps/admin/src/app/globals.css` (bloco Instagram)
- `apps/admin/next.config.ts` (CSP `img-src` com o bucket `social`)
- `apps/admin/tests/social.test.ts`, `apps/admin/tests/fixtures/social/calendario.json` (novos)
- `docs/admin/entrega-instagram-f1.md` (novo)

## Change Log

- 22/10/2026 — @dev: Ready → InProgress (branch `feat/admin-instagram`, worktree `~/.worktrees/laudousg-admin-instagram`).
- 22/10/2026 — @dev: implementação concluída; typecheck, test (58 pass, 1 skip) e build verdes. Aguardando @qa. Entrega em `docs/admin/entrega-instagram-f1.md`.
