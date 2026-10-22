# Story admin-instagram F3 — cron de publicação (foto, carrossel, story), stories manuais, renovação do token e destravar

**Status:** InProgress · **Criada:** 22/10/2026 · **Plano aprovado pelo Luiz em 22/10:** `docs/plano-agendador-instagram-2026-10-21.md` · **Fase anterior:** [F2](2026-10-22-admin-instagram-f2.md) (na `main` em `e9395d92`)

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

- [ ] Conferir a documentação da Meta (carrossel, story, refresh do token)
- [ ] Migração nova (colunas de controle), sem aplicar
- [ ] Cliente: carrossel, story, espera de vários containers, renovação do token
- [ ] Publicação generalizada + política de tentativas + marcador do `media_publish`
- [ ] Cron `social` e `social-token`, `vercel.json`, `rotaSemSessao`
- [ ] Stories manuais, destravar e "Marcar como publicado" (rotas + telas)
- [ ] Selos do calendário e avisos do token
- [ ] Testes, typecheck, build
- [ ] Entrega em `docs/admin/entrega-instagram-f3.md`

## File List

(atualizada ao fim)

## Change Log

- 22/10/2026 — @dev: story criada a partir do escopo F3; Draft → InProgress (branch `feat/admin-instagram-f3`, worktree `~/.worktrees/laudousg-admin-instagram-f3`, base `e9395d92`).
