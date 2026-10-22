# Story admin-instagram F2 — conectar a conta e publicar uma foto sob comando manual

**Status:** InProgress · **Criada:** 22/10/2026 · **Plano aprovado pelo Luiz em 22/10:** `docs/plano-agendador-instagram-2026-10-21.md` · **Fase anterior:** [F1](2026-10-22-admin-instagram-f1.md) (na `main` em `e5aa23d7`)

## Contexto

A F1 deixou no ar a seção `/admin/instagram` (calendário, editor, aprovação) e as tabelas `social_posts`, `social_media_items` e `social_accounts` (esta vazia). A F2 conecta a conta **@laudousg** pela "Instagram API com login do Instagram" (sem Página do Facebook) e publica **uma foto** de um post aprovado, só quando o admin pede e confirma. As env `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` já estão na Vercel (projeto `laudousg-admin`, Production); a URI de retorno cadastrada na Meta é exatamente `https://app.laudousg.com.br/admin/api/social/callback`.

## Critérios de aceite

1. **Documentação conferida:** cada endpoint, versão da Graph API, parâmetro e resposta confirmados na documentação oficial atual da Meta antes do código, com as URLs citadas na entrega.
2. **Conectar conta** (botão "Conectar Instagram", só admin logado):
   - `GET /admin/api/social/conectar` (com sessão): `state` assinado com HMAC-SHA256 (chave `SOCIAL_TOKEN_KEY`) com o id do admin, um nonce e validade de 10 min; redireciona para o Instagram.
   - `GET /admin/api/social/callback`: fora da sessão (`rotaSemSessao`), não lê cookie, valida só o formato e devolve uma página HTML mínima, sem dados, que reabre `/admin/api/social/concluir?code=…&state=…` no mesmo site por meta refresh (sem script, dentro da CSP). Erro do Instagram (`error`, `error_reason`) vai pela mesma ponte.
   - `GET /admin/api/social/concluir` (com sessão): confere HMAC, validade e que o admin da sessão é o do `state`; troca o `code`, obtém o token de longa duração, lê `user_id`/`username` e grava em `social_accounts` com o token cifrado (AES-256-GCM, envelope `v1.<iv>.<tag>.<cifra>` em base64url). Uma conta só: conectar de novo substitui. Volta para `/admin/instagram` com aviso. Token, `code` e secret nunca vão para log, erro ou resposta.
   - Botão "Desconectar" (apaga a linha). O painel mostra o @usuario conectado e a validade do token.
3. **Publicar agora** (post `approved`, formato `image`): confirmação digitando o id do post (sem `confirm()`); `POST /admin/api/social/publicar` com sessão e checagem de origem; trava atômica `approved → publishing`; container com a URL pública da imagem e a legenda (`caption` + "\n\n" + `hashtags`); espera o processamento com limite de tempo; publica; grava `ig_media_id`, `permalink`, `published_at` e `published`. Erro → `failed` com `last_error` curto (sem token) e `attempts + 1`.
4. **Env nova** `SOCIAL_TOKEN_KEY` (32 bytes em base64, com ou sem `=` final; espaços e quebra de linha nas pontas são ignorados). Faltou `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` ou `SOCIAL_TOKEN_KEY` válida → a seção mostra "Conexão indisponível" e as rotas falham fechadas. `apps/admin/.env.example` atualizado.
5. **Testes** (`tsx --test`, `apps/admin/tests/`): cifra ida e volta, envelope casa com o regex do CHECK, chave errada falha, chave com e sem padding; `state` adulterado, vencido ou de outro admin recusado; callback não lê cookie e não vaza o `code` fora da ponte; `concluir` sem sessão → 404; publicação com `fetch` simulado (sucesso, container `ERROR`, tempo esgotado, erro HTTP) e as transições de status; a trava impede publicar duas vezes; nenhum token em mensagem de erro.
6. `pnpm --filter @laudousg/admin typecheck`, `test` e `build` verdes.

## Fora do escopo (F3)

Cron automático, carrossel, stories, renovação automática do token. Sem push, deploy, env na Vercel, migração aplicada nem chamada real à API da Meta.

## Tarefas

- [ ] Conferir a documentação da Meta (OAuth, token longo, perfil, publicação, status do container, limite)
- [ ] Cifra AES-256-GCM e leitura da chave (`src/lib/social/cifra.ts`)
- [ ] `state` assinado (`src/lib/social/estado.ts`)
- [ ] Cliente da API do Instagram com `fetch` injetável (`src/lib/social/instagram.ts`)
- [ ] Conta: leitura sem token, gravação que substitui, desconexão (`src/lib/social/conta.ts`)
- [ ] Publicação: trava, container, espera, publish, permalink, transições (`src/lib/social/publicacao.ts`)
- [ ] Rotas `conectar`, `callback`, `concluir`, `desconectar`, `publicar` + `rotaSemSessao`
- [ ] Telas: cartão da conta em `/instagram` e "Publicar agora" no editor
- [ ] `.env.example`
- [ ] Testes, typecheck, build
- [ ] Entrega em `docs/admin/entrega-instagram-f2.md`

## File List

(preenchida ao longo da implementação)

## Change Log

- 22/10/2026 — @dev: story criada a partir do escopo F2; Draft → InProgress (branch `feat/admin-instagram-f2`, worktree `~/.worktrees/laudousg-admin-instagram-f2`, base `e5aa23d7`).
