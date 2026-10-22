# Instagram F2: entrega de 22/10/2026

Pronto para revisão local na branch `feat/admin-instagram-f2`, no worktree `~/.worktrees/laudousg-admin-instagram-f2`, criado de `origin/main` em `e5aa23d7`. Escopo: [story admin-instagram-f2](../stories/2026-10-22-admin-instagram-f2.md) e o plano aprovado (`docs/plano-agendador-instagram-2026-10-21.md`, só no checkout principal).

Não houve push, deploy, env na Vercel, migração aplicada, chamada à API da Meta nem publicação no Instagram. A Meta só foi consultada pela documentação pública. Todo `fetch` dos testes é simulado.

**Não há migração nova.** A trava e as transições usam `UPDATE` condicional pelo PostgREST nas tabelas da F1, que já estão em produção. O `service_role` tem `UPDATE` em `social_posts` e `SELECT/INSERT/UPDATE/DELETE` em `social_accounts`.

## Documentação consultada (22/10/2026)

| Tema | URL | O que confirmei |
|---|---|---|
| Login e tokens | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login | `https://www.instagram.com/oauth/authorize` com `client_id`, `redirect_uri` (idêntica à cadastrada), `response_type=code`, `scope` separado por vírgula, `state`. O `code` vale 1 h, é de uso único e o redirect acrescenta `#_`. Recusa do usuário: `error=access_denied`, `error_reason=user_denied`, `error_description`. Token curto: `POST https://api.instagram.com/oauth/access_token` (form `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code`), resposta em `data[]` com `access_token`, `user_id`, `permissions`. Token longo: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret&access_token`, resposta `access_token`, `token_type`, `expires_in` (~60 dias), só no servidor. Renovação: `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`, com token de pelo menos 24 h, ainda válido (fica para a F3). |
| Perfil | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started | `GET https://graph.instagram.com/v26.0/me?fields=user_id,username`. `user_id` é o ID da conta profissional, o `<IG_ID>` da publicação. |
| Publicação | https://developers.facebook.com/docs/instagram-platform/content-publishing | `POST /<IG_ID>/media` (JSON, `Authorization: Bearer`) → `{id}`. Status: `GET /<container>?fields=status_code` (`EXPIRED`, `ERROR`, `FINISHED`, `IN_PROGRESS`, `PUBLISHED`), consulta recomendada de 1/min por até 5 min. Depois `POST /<IG_ID>/media_publish` com `creation_id` → `{id}`. Só JPEG, em URL pública. `alt_text` vale para foto desde 24/03/2025. O container expira em 24 h. |
| Parâmetros do container | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media | `image_url`, `caption` (2.200 caracteres, 30 hashtags, 20 @), `alt_text` (até 1.000; não vale para story nem reels). JPEG até 8 MB, proporção entre 4:5 e 1,91:1. |
| Container | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-container | Campos `status_code` e `status` (este traz o subcódigo quando dá `ERROR`). Host `graph.instagram.com`. |
| media_publish | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish | Parâmetro `creation_id`, resposta `id`. Avisos parciais (`config_issue`) não são erro. Limite de 50 posts em 24 h. |
| Limite | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit | `GET /<IG_ID>/content_publishing_limit` → `data[0].quota_usage` e `config.quota_total` (50) / `quota_duration` (86400). Host `graph.instagram.com` no login do Instagram. |
| Mídia | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media | `GET /<media_id>?fields=permalink` com `instagram_business_basic`. |
| Versão | https://developers.facebook.com/docs/graph-api/changelog | A mais recente é a **v26.0** (29/07/2026). Os exemplos da plataforma do Instagram também usam v26.0. |

A página de Content Publishing é inconsistente quanto ao limite: cita 100 e também 50 posts em 24 h. A referência do endpoint diz 50. O código lê o limite real antes de criar o container.

## Desenho do fluxo

```
Conectar
  /admin/instagram ── "Conectar Instagram" ─▶ GET /admin/api/social/conectar      (sessão de admin)
      state = b64u({v:1, a:<id do admin>, n:<nonce 16 B>, e:<agora+10 min>}) . b64u(HMAC-SHA256)
  ─303─▶ instagram.com/oauth/authorize?client_id&redirect_uri&response_type=code&scope=…&state
  ─────▶ GET /admin/api/social/callback?code&state                                (SEM sessão)
      o cookie SameSite=Strict não chega aqui; a rota não lê cookie nem cabeçalho,
      valida só o formato e devolve HTML sem script:
      <meta http-equiv="refresh" content="0;url=/admin/api/social/concluir?code=…&state=…">
  ─────▶ GET /admin/api/social/concluir?code&state                                (sessão; o cookie vai)
      confere o HMAC (tempo constante), a validade e se o admin da sessão é o do state
      → POST api.instagram.com/oauth/access_token → token curto
      → GET graph.instagram.com/access_token (ig_exchange_token) → token longo + expires_in
      → GET graph.instagram.com/v26.0/me?fields=user_id,username
      → social_accounts: upsert da conta + delete das outras (uma conta só)
         token_ciphertext = v1.<iv>.<tag>.<cifra> (AES-256-GCM, base64url)
  ─303─▶ /admin/instagram?ok=conectado | ?erro=<código>[&etapa=token|token_longo|perfil]

Publicar agora (post approved, formato image)
  editor ── digita o id do post + "Publicar agora" ─▶ POST /admin/api/social/publicar  (sessão + origem)
      confirmação ≠ id → volta com erro, nada muda
      conta + token (não vencido, decifrável) → senão volta sem travar (o post continua approved)
      trava: UPDATE social_posts SET status='publishing'
             WHERE id=$1 AND status='approved' AND format='image' RETURNING …   (só um pedido vence)
      GET  /<IG_ID>/content_publishing_limit   → se uso ≥ total: failed
      POST /<IG_ID>/media {image_url, caption + "\n\n" + hashtags, alt_text}
      GET  /<container>?fields=status_code,status a cada 3 s, por até 40 s
      POST /<IG_ID>/media_publish {creation_id}
      GET  /<media_id>?fields=permalink         (se falhar, segue sem link)
      UPDATE … SET status='published', ig_media_id, permalink, published_at WHERE status='publishing'
      erro → UPDATE … SET status='failed', last_error (≤ 300, sem token), attempts+1 WHERE status='publishing'
```

## O que entrou

- `src/lib/social/cifra.ts`: `lerChaveSocial` aceita base64 padrão de 32 bytes, com ou sem `=` final, e ignora espaços e quebra de linha nas pontas. Recusa base64url, hex, outros tamanhos e base64 não canônico. Também tem `cifrar` e `decifrar` (AES-256-GCM, IV de 12 bytes, AAD fixo) e `ENVELOPE`, o mesmo regex do CHECK da migração.
- `src/lib/social/estado.ts`: `criarState` e `conferirState`. O HMAC usa uma subchave derivada (HKDF) da `SOCIAL_TOKEN_KEY`.
- `src/lib/social/config.ts`: `configInstagram`. Se faltar `INSTAGRAM_APP_ID` (numérico), `INSTAGRAM_APP_SECRET`, `SOCIAL_TOKEN_KEY` válida ou `ADMIN_PUBLIC_ORIGIN`, devolve `null` e a conexão fica indisponível. A `redirect_uri` sai de `ADMIN_PUBLIC_ORIGIN` + `/admin/api/social/callback`.
- `src/lib/social/instagram.ts`: cliente com `fetch` injetável e tempo limite de 15 s por chamada. As chamadas ao Graph mandam o token em `Authorization: Bearer`, nunca na URL. A exceção é a troca pelo token longo, que a documentação define por query string. Respostas são aceitas em `data[]` e no formato plano. Todo erro passa por `limpar`, que tira segredos conhecidos e qualquer sequência de 32 ou mais caracteres com cara de token, e corta em 200 caracteres.
- `src/lib/social/conta.ts`: `ler()` (colunas da allowlist, sem o token), `lerComToken()`, `salvar()` (substitui a conta) e `apagar()`.
- `src/lib/social/publicacao.ts`: `publicarPost` mais o repositório com os `UPDATE` condicionais.
- `src/lib/social/rotas-instagram.ts` e as rotas `conectar`, `callback`, `concluir` (GET), `desconectar` e `publicar` (POST, `maxDuration = 60`).
- `/api/social/callback` entrou em `rotaSemSessao`. As outras quatro rotas continuam atrás do middleware e repetem a checagem de admin no handler.
- Tela `/instagram`: cartão "Conta do Instagram" com quatro estados: "Conexão indisponível"; "Conta indisponível" (o Supabase não respondeu); "Conectar Instagram"; ou a conta conectada, com @usuario, validade do token (ou "Vencido"), Reconectar e Desconectar.
- Tela `/instagram/<id>`: post `approved` + `image` ganha o cartão "Publicar agora". O campo de confirmação recebe o id do post, e o servidor confere de novo. Sem conta, com token vencido ou sem config, o cartão explica o motivo e não mostra o botão. O post `publishing` mostra um aviso para conferir no Instagram.
- `colunas.ts`: `social_accounts` com `ig_user_id`, `username`, `token_expires_at`, `connected_at`. `token_ciphertext` fica fora.
- `.env.example`: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `SOCIAL_TOKEN_KEY` (gerar com `openssl rand -base64 32`).

## Evidência de validação

```
pnpm --filter @laudousg/admin typecheck   → tsc --noEmit sem erros
pnpm --filter @laudousg/admin test        → tests 79 · pass 78 · fail 0 · skipped 1
pnpm --filter @laudousg/admin build       → Compiled successfully; /api/social/{callback,concluir,conectar,desconectar,publicar} geradas
```

O teste pulado é o mesmo da F1 (calendário real não versionado). `apps/admin/tests/instagram.test.ts` (20 testes) cobre:

- **Chave**: 44 caracteres com `=`, 43 sem `=`, espaços, `\t` e `\r\n` nas pontas, tudo aceito. Recusados: 16, 31, 33 e 48 bytes, hex, base64url (`-`/`_`), último caractere não canônico, `==`, espaço no meio. A config fica nula se faltar cada variável ou a origem, e o cartão renderiza "Conexão indisponível" sem o link de conectar.
- **Cifra**: ida e volta (inclusive unicode). O regex do envelope é extraído do SQL da migração e comparado. O IV é aleatório. Chave errada falha, e adulterar IV, tag, cifra ou versão também. Texto curto demais para o CHECK é recusado. Nenhuma mensagem de erro carrega o token.
- **State**: aceito dentro de 10 min. Recusado se vencido, de outro admin, com outra chave, com os dados trocados e a assinatura antiga, com um caractere invertido nos dados ou na assinatura, ou com lixo no formato. O nonce difere a cada emissão.
- **Callback**: está em `rotaSemSessao`; as outras quatro rotas não estão e não são públicas. O handler recebe uma `Request` espiã que falha se ler `cookies` ou `headers`, e não chama `autorizar`. A página tem meta refresh e link para `/admin/api/social/concluir`. O `code` aparece exatamente duas vezes, na meta e no link, e em nenhum cabeçalho. Não há `Location`, `Set-Cookie` nem script. O `#_` é removido e o CSP próprio é `default-src 'none'`. `error=access_denied` vai pela ponte sem o `error_description`. Formato inválido → 400 sem eco; sem config → 404.
- **Conectar**: sem admin ou sem config → 404. Com admin → 303 para o Instagram com `client_id`, `redirect_uri` exata, escopos, `response_type=code` e um state válido para aquele admin.
- **Concluir**: sem sessão ou sem config → 404 e nenhuma chamada à API. Fluxo feliz: os pedidos seguem a documentação (form da troca, `ig_exchange_token`, Bearer no `/me`), grava o token **longo** cifrado, a validade a partir de `expires_in` e o @usuario; reconectar substitui a conta. Erros: state de outro admin, vencido, de outra chave ou ausente; `access_denied`; HTTP 400 na troca (com o code e o secret na mensagem do Instagram); permissão de publicar não concedida; falha de rede no perfil. Em todos, nada é gravado, e nem a URL de retorno nem o `console.warn` levam token, code, secret ou chave.
- **Publicação** (fetch simulado e relógio falso):
  - sucesso com duas esperas → `publishing → published` com id, permalink e data; corpo do container conferido; Bearer em todas as chamadas e o token em nenhuma URL;
  - container `ERROR` e `EXPIRED`, tempo esgotado (respeita o limite), HTTP 400 com o token na mensagem (sai `[oculto]`) e limite 50/50 (nem cria container) → `failed`, `attempts + 1`, `last_error` ≤ 300 sem token;
  - HTTP 500 ou rede no `media_publish` → `failed` com "Resultado incerto, confira no Instagram";
  - se só o permalink falhar, o post fica `published` mesmo assim;
  - sem conta, token vencido ou cifrado com outra chave → o post continua `approved` e nenhuma chamada sai.
- **Trava**: dois pedidos simultâneos dão um `publicado` e um `status`, e o terceiro dá `status`; um só `media_publish`. Rascunho, carrossel, story e `failed` não travam. A cadeia do PostgREST foi conferida: `update(status=publishing)`, `eq id`, `eq status approved`, `eq format image`. Conclusão e falha só saem de `publishing`. Imagem fora do bucket `social` é recusada.
- **SQL real (PGlite, migração da F1)**: dois `UPDATE` simultâneos, só um devolve linha; o carrossel não trava. `published` com permalink e `failed` com `last_error` de 300 caracteres cabem nos CHECKs. O envelope real entra em `social_accounts` e o token cru não. As colunas da allowlist existem e `token_ciphertext` está fora dela.
- **Rotas**: publicar sem admin ou sem config → 404. Confirmação vazia, parcial, maiúscula ou "sim" → erro, sem tocar no post nem na API. O id certo (com espaços) publica; repetir dá `pub_status`. Desconectar sem admin → 404; com admin, apaga a conta.
- **Código**: as rotas estão ligadas às instâncias com o método certo. `from("social_accounts")` aparece só em `conta.ts`. `console.*` em `lib/social` só recebe texto fixo (no máximo a etapa). O trecho do callback não cita cookie nem `autorizar`. As telas não têm `"use client"`, `confirm(` nem `lerComToken`.

Também fiz 5 mutações à mão, e o teste pegou todas: o callback lendo cookie, a trava sem o filtro de status, a chave sem padding sendo recusada, o state sem a checagem de admin e o `last_error` sem `limpar`.

## Decisões tomadas por conta própria

1. **Sem migração.** A trava é um `UPDATE … WHERE status='approved' AND format='image' RETURNING`, atômico no Postgres. A conclusão e a falha só saem de `publishing`. Diverge do padrão "escrita só por funções SQL" da F1, mas evita depender de aplicar migração para a F2 funcionar. `attempts + 1` usa o valor lido na própria trava, enquanto só este pedido tem a linha.
2. **Subchave HKDF para o HMAC do state.** A AES usa a `SOCIAL_TOKEN_KEY` crua, como pede a story. Assim a mesma chave não cifra e assina ao mesmo tempo.
3. **State sem registro no banco.** É um HMAC com admin, nonce e validade de 10 min, como pede a story. O plano original falava em "uso único" gravado no banco. Aqui o uso único vem do `code` do Instagram, que é de uso único e vale 1 h, e o state amarrado ao admin impede trocar a conta de outro.
4. **Espera do container: 3 s entre consultas, até 40 s.** A Meta recomenda 1 consulta por minuto por até 5 min, mas isso não cabe num clique manual. Foto costuma processar em segundos. Esgotou → `failed`; basta voltar para rascunho e aprovar de novo. A rota tem `maxDuration = 60`.
5. **Depois do `media_publish`, nunca `failed`.** Se o banco não registrar a conclusão, o post fica em `publishing` (aviso `pub_registro`), para não abrir caminho a publicar duas vezes. Sem resposta ou 5xx no `media_publish` vira `failed` com "Resultado incerto, confira no Instagram antes de tentar de novo".
6. **Limite consultado antes do container.** Atingido → `failed` com "limite … (50/50)". Se a consulta do limite falhar, a publicação para, como falha fechada.
7. **Conta e token conferidos antes da trava.** Sem conta, com token vencido ou com token que não abre (chave trocada), o post continua `approved` e o aviso pede para reconectar.
8. **Bearer no `/me`.** A página de Get Started mostra o token na query; a de Content Publishing usa `Authorization: Bearer` no mesmo host. Usei o Bearer para o token não ir em URL. A troca pelo token longo segue com a query, que é como a documentação define.
9. **A permissão de publicar é conferida na troca do code.** Se `permissions` vier sem `instagram_business_content_publish`, a conexão é recusada.
10. **`ig_user_id` = `user_id` do `/me`**, o ID da conta profissional usado na publicação, e não o `user_id` app-scoped da troca do code.
11. **Desconectar não exige a config do Instagram**, para dar para limpar a conta mesmo com env faltando. Não há revogação na Meta: a API com login do Instagram não tem endpoint para isso.
12. **Leitura do token fora da allowlist de tela.** `conta.ts` lê `ig_user_id,token_ciphertext,token_expires_at` por uma constante própria (`COLUNAS_TOKEN`), não por `colunas()`. A allowlist continua sendo a das telas.
13. **Só imagem do bucket `social`.** A URL pública precisa começar com o prefixo do bucket derivado de `SUPABASE_URL`.
14. **Textos da F1 atualizados**: "Nada é publicado nesta fase" e "aguardando a F2" deram lugar à explicação do "Publicar agora".
15. **`rotas.ts` da F1 passou a exportar** `voltar`, `naoEncontrado`, `formulario`, `campo`, `idValido` e `editor`, para reaproveitar. O comportamento não mudou.

## Envs necessárias (projeto Vercel `laudousg-admin`, Production)

| Variável | Estado |
|---|---|
| `INSTAGRAM_APP_ID` | já gravada |
| `INSTAGRAM_APP_SECRET` | já gravada |
| `SOCIAL_TOKEN_KEY` | **nova**: 32 bytes aleatórios em base64 (`openssl rand -base64 32`), com ou sem `=` final. O Luiz grava. Trocar a chave invalida o token salvo (é só reconectar). |
| `ADMIN_PUBLIC_ORIGIN` | já existe (`https://app.laudousg.com.br`); sem ela a conexão fica indisponível |
| `SUPABASE_URL` | já existe; define o prefixo do bucket aceito na publicação |

## Pendências e riscos

- **Validação real** (depois do GO, deploy e `SOCIAL_TOKEN_KEY`): conectar a @laudousg e publicar **uma** foto de teste. Pontos a observar:
  - a navegação por meta refresh precisa levar o cookie `SameSite=Strict`; o comportamento esperado dos navegadores é tratá-la como iniciada pelo nosso próprio site;
  - o app da Meta em modo desenvolvimento precisa ter a @laudousg com papel no app;
  - a conta precisa ser profissional (Empresa ou Criador).
- **Post preso em `publishing`.** Se a função cair entre a trava e o registro, o painel não oferece saída. A F3 deve trazer "marcar como falha" com aviso para conferir no Instagram. Até lá, é SQL manual depois de conferir o perfil.
- **Renovação do token** (60 dias) fica para a F3. O painel mostra a validade e marca "Vencido".
- `config_issue` / `caption_add_on_attachment_status` do `media_publish` (publicado sem legenda) não são registrados; não há coluna para isso.
- O `code` fica no histórico do navegador na entrada da ponte. Ele é de uso único e já foi consumido.
- O rodapé lateral "Só leitura" continua como na F1.
