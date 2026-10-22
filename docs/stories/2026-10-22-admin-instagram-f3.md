# Story admin-instagram F3 — cron de publicação (foto, carrossel, story), stories manuais, renovação do token e destravar

**Status:** InReview · **Criada:** 22/10/2026 · **Plano aprovado pelo Luiz em 22/10:** `docs/plano-agendador-instagram-2026-10-21.md` · **Fase anterior:** [F2](2026-10-22-admin-instagram-f2.md) (na `main` em `e9395d92`)

## Contexto

F1 e F2 estão no ar. A @laudousg está conectada (token longo cifrado em `social_accounts`, vence em 21/12/2026) e o primeiro post (s1-01, foto) saiu pela API às 19h18 de 22/10 pelo "Publicar agora". A F3 leva a publicação para o horário agendado (cron a cada 5 min), cobre carrossel e story, separa os stories manuais (stickers), renova o token sozinho e dá saída para post preso em "Publicando".

## Critérios de aceite

1. **Documentação conferida** (carrossel, story, renovação do token) na documentação oficial atual da Meta, com as URLs citadas na entrega.
2. **Cron de publicação** `GET /admin/api/cron/social` (só com `Authorization: Bearer ${CRON_SECRET}`; sem → 404), `*/5 * * * *` no `vercel.json` (o cron da Apple continua):
   - seleciona `approved`, `manual = false`, `scheduled_at <= now()` e vencido há no máximo 6 h, em ordem de horário, com orçamento de tempo e no máximo alguns posts por rodada;
   - reaproveita a trava atômica `approved → publishing`, agora para `image | carousel | story`;
   - publica foto, carrossel (cada filho e o pai FINISHED) e story;
   - consulta o limite antes; estourou → volta para `approved` sem contar tentativa;
   - falha antes do `media_publish` → `approved` com `attempts + 1` e `last_error` curto; na 3ª → `failed`. Depois do `media_publish`, nunca volta para `approved`: sem resposta/5xx → `failed` com "Resultado incerto, confira no Instagram";
   - vencido há mais de 6 h → não publica; fica `approved` com "Atrasado" no painel;
   - "Publicar agora" aceita os três formatos.
3. **Stories manuais** (`manual = true`): o cron nunca publica. Faixa "Para publicar à mão agora" (aprovados, horário chegou, janela de 2 h) com a imagem, o sticker sugerido e "Marcar como publicado" (`published`, `published_at = now()`, sem `ig_media_id`).
4. **Renovação do token:** `GET /admin/api/cron/social-token` diário (mesma proteção) renova quando faltam menos de 15 dias e o token tem mais de 24 h; grava o token novo cifrado e a validade. Falha não apaga o antigo. Painel avisa com menos de 7 dias ou se a renovação falhou.
5. **Destravar:** `publishing` há mais de 10 min → "Voltar para aprovado" (só se o `media_publish` não foi chamado, registrado em coluna) e "Marcar como publicado" (link opcional).
6. **Painel:** selo no calendário: Agendado, Publicando, Publicado (com link), Falhou (com motivo), Atrasado, Manual.
7. **Testes** (`tsx --test`): cron sem segredo → 404; seleção; carrossel e story com `fetch` simulado (sucesso, filho ERROR, tempo esgotado, limite); política de tentativas; concorrência; renovação (cedo, novo demais, falha preserva o antigo, sem token em log/erro); destravar; stories manuais. `typecheck`, `test` e `build` verdes.

## Fora do escopo

Reels, Insights, publicação real no Instagram, chamada real à API da Meta, push, deploy, env na Vercel, migração aplicada.

## Tarefas

- [x] Conferir a documentação da Meta (carrossel, story, refresh do token)
- [x] Migração nova (colunas de controle), sem aplicar
- [x] Cliente: carrossel, story, espera de vários containers, renovação do token
- [x] Publicação generalizada + política de tentativas + marcador do `media_publish`
- [x] Cron `social` e `social-token`, `vercel.json`, `rotaSemSessao`
- [x] Stories manuais, destravar e "Marcar como publicado" (rotas + telas)
- [x] Selos do calendário e avisos do token
- [x] Testes, typecheck, build
- [x] Entrega em `docs/admin/entrega-instagram-f3.md`

## File List

- `supabase/migrations/20261022233000_admin_social_f3.sql` (nova, **não aplicada**: `publish_requested_at` e as colunas da renovação)
- `apps/admin/src/lib/social/instagram.ts` (`publicarMidia`: foto, carrossel, story; `renovarToken`; `LimiteAtingido`)
- `apps/admin/src/lib/social/publicacao.ts` (trava dos três formatos, marcador do publish, política de tentativas, `fila`, `devolver`)
- `apps/admin/src/lib/social/politica.ts` (novo: janelas de 6 h e 2 h, preso, selos, link colado)
- `apps/admin/src/lib/social/token.ts` (novo: decisão e execução da renovação, aviso do painel)
- `apps/admin/src/lib/social/cron.ts` (novo: `executarFila`, `criarCronSocial`, `criarCronToken`)
- `apps/admin/src/lib/social/manual.ts` (novo: destravar e marcar como publicado)
- `apps/admin/src/lib/social/conta.ts` (`renovado` com compare-and-swap, `falhaRenovacao`, emissão do token)
- `apps/admin/src/lib/social/rotas-instagram.ts` (rotas `destravar` e `manual`; "Publicar agora" para os três formatos)
- `apps/admin/src/lib/social/servidor.ts` (`listarManuaisAgora`), `tipos.ts` (`publish_requested_at`)
- `apps/admin/src/lib/data/colunas.ts` (allowlist com as colunas novas, sem o token)
- `apps/admin/src/lib/auth/acesso.ts` (`/api/cron/social` e `/api/cron/social-token` em `rotaSemSessao`)
- `apps/admin/src/app/api/cron/social/route.ts`, `apps/admin/src/app/api/cron/social-token/route.ts` (novos)
- `apps/admin/src/app/api/social/destravar/route.ts`, `apps/admin/src/app/api/social/manual/route.ts` (novos), `apps/admin/src/app/api/social/publicar/route.ts` (`maxDuration = 120`)
- `apps/admin/vercel.json` (crons `*/5 * * * *` e `0 9 * * *`, o da Apple mantido)
- `apps/admin/src/components/Instagram.tsx` (`SeloPost`, chip com link/motivo, `FaixaManual`, avisos do token), `apps/admin/src/app/globals.css`
- `apps/admin/src/app/(painel)/instagram/page.tsx` (faixa manual), `apps/admin/src/app/(painel)/instagram/[id]/page.tsx` (destravar, manual, atrasado, tentativas)
- `apps/admin/.env.example` (nota do `CRON_SECRET`)
- `apps/admin/tests/instagram-f3.test.ts` (novo, 24 testes), `apps/admin/tests/fixtures/instagram.ts` (novo, auxiliares compartilhados), `apps/admin/tests/instagram.test.ts` e `apps/admin/tests/social.test.ts` (ajustes ao contrato F3)
- `docs/admin/entrega-instagram-f3.md` (novo)

## Change Log

- 22/10/2026 — @dev: story criada a partir do escopo F3; Draft → InProgress (branch `feat/admin-instagram-f3`, worktree `~/.worktrees/laudousg-admin-instagram-f3`, base `e9395d92`).
- 22/10/2026 — @dev: documentação da Meta conferida (carrossel, story, refresh_access_token); migração `20261022233000_admin_social_f3` criada e **não aplicada** (aplicar antes do deploy).
- 22/10/2026 — @dev: implementação concluída; typecheck, test (103 pass, 1 skip) e build verdes. InProgress → InReview, aguardando @qa. Entrega em `docs/admin/entrega-instagram-f3.md`.
