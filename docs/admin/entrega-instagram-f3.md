# Instagram F3: entrega de 22/10/2026

Pronto para revisão local na branch `feat/admin-instagram-f3`, no worktree `~/.worktrees/laudousg-admin-instagram-f3`, criado de `origin/main` em `e9395d92`. Escopo: [story admin-instagram-f3](../stories/2026-10-22-admin-instagram-f3.md) e o plano aprovado (`docs/plano-agendador-instagram-2026-10-21.md`, só no checkout principal).

Não houve push, deploy, env na Vercel, migração aplicada, chamada à API da Meta nem publicação no Instagram. A Meta só foi consultada pela documentação pública. Todo `fetch` dos testes é simulado.

**Há migração nova, não aplicada:** `supabase/migrations/20261022225129_admin_social_f3.sql`. Ela precisa ser aplicada **antes** do deploy da F3, porque o calendário, o editor e o cron leem as colunas novas.

## Documentação consultada (22/10/2026)

| Tema | URL | O que confirmei |
|---|---|---|
| Publicação (carrossel, story, status, limite) | https://developers.facebook.com/docs/instagram-platform/content-publishing | **Carrossel:** um container por imagem com `is_carousel_item=true` e `image_url`. Depois, o pai com `media_type=CAROUSEL` e `children` ("comma separated list of up to 20 container IDs", o exemplo usa string separada por vírgula). A legenda vai no pai. Publica-se o pai com `media_publish` / `creation_id`. "Carousels count as a single post." As imagens são cortadas pela proporção da primeira. **Story:** `media_type=STORIES` com `image_url`. `alt_text`: "Reels and stories are not supported". **Status:** `EXPIRED`, `ERROR`, `FINISHED`, `IN_PROGRESS`, `PUBLISHED`. Recomenda consultar 1 vez por minuto, por até 5 min. O container expira em 24 h. **Limite:** a página cita 100 e também 50 posts em 24 h. |
| Parâmetros do container | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media | `is_carousel_item`: "Applies only to images and video. Set to `true`". `caption` e `location_id` não valem para itens do carrossel. `children`: "Required for carousels… up to 20 container IDs". `media_type` é obrigatório para carrossel, story e reels. `alt_text`: "Only supported on a single image or image media in a carousel" e "Reels and stories are not supported". A página não diz se story aceita `caption`; não mandamos. |
| Renovação (guia) | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login | `GET https://graph.instagram.com/refresh_access_token` com `grant_type=ig_refresh_token` e `access_token`. Resposta: `access_token`, `token_type`, `expires_in`. Só funciona se o token longo tiver ao menos 24 h, ainda estiver válido e tiver `instagram_business_basic`. Vale mais 60 dias. "Tokens that have not been refreshed in 60 days will expire and can no longer be refreshed." |
| Renovação (referência) | https://developers.facebook.com/docs/instagram-platform/reference/refresh_access_token | Host `graph.instagram.com`, `GET`, sem versão no caminho, token na query (como no exemplo). "Refresh a long-lived access token that is at least 24 hours old but has not expired." Os tokens renovados valem 60 dias a partir da renovação. |

As URLs da F2 (login, `/me`, `media_publish`, `content_publishing_limit`, container, versão v26.0) continuam valendo. Estão em `docs/admin/entrega-instagram-f2.md`.

Divergências da documentação e o que o código faz:

- **`children`:** a referência fala em "array" e o guia em lista separada por vírgula. O código manda a string `"id1,id2,…"`, igual ao exemplo do guia.
- **Limite:** 100 ou 50. O código lê o limite real (`content_publishing_limit`) antes de cada post.
- **Host:** os exemplos da referência usam `graph.facebook.com`. Para o login do Instagram usamos `graph.instagram.com`, como na F2, e o post s1-01 saiu assim.

## Desenho

```
Vercel Cron */5  ── GET /admin/api/cron/social  (Authorization: Bearer CRON_SECRET; sem → 404, nada é lido)
  executarFila: orçamento 240 s (maxDuration 300), no máximo 3 posts
    fila = approved, manual=false, now-6h <= scheduled_at <= now, por horário
    para cada post (só começa se sobrarem >= 75 s):
      publicarPost(modo cron, filtro da janela)
        conta + token (sem conta, vencido ou ilegível → para a rodada, nada trava)
        trava: UPDATE … SET status='publishing', publish_requested_at=NULL
               WHERE id AND status='approved' AND manual=false AND format IN (image,carousel,story)
                 AND scheduled_at BETWEEN now-6h AND now RETURNING …        (só um vence)
        content_publishing_limit → uso >= total: LimiteAtingido
        foto:      POST /media {image_url, caption, alt_text}
        story:     POST /media {image_url, media_type:STORIES}
        carrossel: POST /media {image_url, is_carousel_item:true, alt_text} × N
                   → espera todos FINISHED → POST /media {media_type:CAROUSEL, children:"a,b,c", caption}
                   → espera o pai FINISHED      (prazo único: até 90 s no cron, 80 s no clique)
        UPDATE … SET publish_requested_at=now WHERE status='publishing' AND publish_requested_at IS NULL
               (não gravou → não publica; conta como falha ANTES do publish)
        POST /media_publish {creation_id} → GET /<media>?fields=permalink → published
      limite → para a rodada

Vercel Cron 0 9 * * * (6h em São Paulo) ── GET /admin/api/cron/social-token  (mesma proteção)
  executarRenovacao: decidirRenovacao(expira, emitido)
    vencido | faltam >= 15 dias ("cedo") | token < 24 h ("novo_demais") → nada
    renovar → GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…
      ok    → UPDATE social_accounts SET token_ciphertext=<novo cifrado>, token_expires_at, token_issued_at,
              token_refreshed_at, token_refresh_failed_at=NULL, token_refresh_error=NULL
              WHERE ig_user_id AND token_ciphertext=<envelope lido>      (se reconectaram no meio: "concorrente")
      falha → só token_refresh_failed_at + token_refresh_error (≤ 300, sem token); o token antigo fica
```

### Política de falha

| Situação | Cron | "Publicar agora" |
|---|---|---|
| Limite de 24 h atingido | `approved`, `attempts` igual, `last_error` "Aguardando: limite…", para a rodada | igual (`pub_limite`) |
| Falha antes do `media_publish` (container, `ERROR`/`EXPIRED`, tempo esgotado, slide fora do bucket, marcador não gravou) | 1ª e 2ª: `approved` com `attempts + 1` e "Tentativa N/3 falhou: …"; 3ª: `failed` | `failed` com `attempts + 1` (como na F2: o admin está olhando) |
| `media_publish` sem resposta, 5xx ou sem id | `failed`, "Resultado incerto, confira no Instagram…" | igual |
| `media_publish` 4xx | `failed` com o motivo | igual |
| Publicou, mas o banco não registrou | fica `publishing` com `publish_requested_at` | igual |

A volta para `approved` exige `publish_requested_at IS NULL` também no `UPDATE`. Mesmo um bug no código não reabre na fila um post cujo publish já foi pedido.

### Painel

- **Calendário:** cada chip mostra um selo, com o motivo no `title`: Rascunho, **Agendado**, **Atrasado** (aprovado e vencido há mais de 6 h), **Manual**, **Publicando**, **Publicado** (com o link "Ver no Instagram ↗"), **Falhou** (motivo curto no chip). Um aprovado que já falhou mostra "Tentativa N/3 falhou".
- **Faixa "Para publicar à mão agora"** (topo do `/instagram`): stories manuais aprovados cujo horário chegou, por até 2 h. Cada um mostra a miniatura (link para baixar), o sticker sugerido (`interaction.tipo` e as opções) e "Marcar como publicado" (`POST /admin/api/social/manual`: `published`, `published_at = now()`, sem `ig_media_id`). O editor do post manual tem o mesmo botão.
- **Destravar:** post em `publishing` sem mudança há mais de 10 min (`updated_at`). O editor mostra:
  - "Voltar para aprovado", só se `publish_requested_at` for nulo. O `last_error` recebe uma nota de que o post foi destravado à mão.
  - "Marcar como publicado", com um campo opcional para o link. Só aceita `https://(www.)instagram.com/…`.
  - Se o publish já foi pedido, o editor diz quando foi e pede para conferir no perfil.
- **"Publicar agora":** aceita foto, carrossel e story. Recusa post manual. A rota passou a `maxDuration = 120`.
- **Conta:** aviso destacado (`role="alert"`) quando faltam menos de 7 dias para o token vencer ou quando a última renovação falhou (data e motivo). Mostra também a data da última renovação.

## Migração nova (não aplicada)

`supabase/migrations/20261022225129_admin_social_f3.sql`:

```sql
BEGIN;
ALTER TABLE public.social_posts ADD COLUMN publish_requested_at timestamptz;
CREATE INDEX social_posts_fila_idx ON public.social_posts (scheduled_at) WHERE status = 'approved' AND manual = false;
ALTER TABLE public.social_accounts
  ADD COLUMN token_issued_at timestamptz,
  ADD COLUMN token_refreshed_at timestamptz,
  ADD COLUMN token_refresh_failed_at timestamptz,
  ADD COLUMN token_refresh_error text CHECK (token_refresh_error IS NULL OR length(token_refresh_error) <= 300);
UPDATE public.social_accounts SET token_issued_at = connected_at WHERE token_issued_at IS NULL;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_posts, public.social_accounts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.social_posts TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.social_accounts TO service_role;
COMMIT;
```

São só colunas novas em tabelas da F1. Não há função nova nem policy. Os grants repetem exatamente os da F1. O `UPDATE` preenche a data de emissão do token da @laudousg com `connected_at` (22/10). Assim a primeira renovação acontece por volta de 06/12, quando faltarem menos de 15 dias para 21/12.

Ordem do GO: aplicar a migração → deploy. Se o deploy for antes, o `select` da allowlist pede `publish_requested_at` e as telas do Instagram mostram "Tabelas indisponíveis". O cron devolve 503 e nada é publicado.

## Evidência de validação

```
pnpm --filter @laudousg/admin typecheck   → tsc --noEmit sem erros
pnpm --filter @laudousg/admin test        → tests 104 · pass 103 · fail 0 · skipped 1
pnpm --filter @laudousg/admin build       → Compiled successfully; /api/cron/social, /api/cron/social-token,
                                            /api/social/destravar e /api/social/manual geradas
```

O teste pulado é o mesmo da F1 (calendário real não versionado). `apps/admin/tests/instagram-f3.test.ts` tem 24 testes:

- **Cron sem segredo → 404:** sem cabeçalho, outro Bearer, segredo sem "Bearer", `bearer` minúsculo, um caractere a mais ou a menos, `CRON_SECRET` vazio ou ausente. Nos dois crons, a config e os repositórios explodem se forem lidos, e não são. Com o segredo e sem config → 503 `social_not_configured`. As duas rotas estão em `rotaSemSessao` (variações não estão). O `vercel.json` mantém o cron da Apple.
- **Seleção:** de 9 posts, publica só `approved`, não manual, dentro da janela de 6 h, em ordem de horário, 3 por rodada; o 4º sai na rodada seguinte. Ficam de fora: o vencido há 6 h 01, o manual, o rascunho, o `failed` e o futuro. O orçamento de tempo adia o resto da fila.
- **Carrossel:** corpos exatos dos filhos (`is_carousel_item`, `alt_text`, sem legenda) e do pai (`CAROUSEL`, `children` na ordem, legenda + hashtags). Cada filho e o pai são consultados até `FINISHED`, e o pai só é criado depois do último filho. `creation_id` é o do pai. O token nunca vai em URL.
- **Story:** só `image_url` + `media_type: STORIES`.
- **Falhas do carrossel:** filho 2 com `ERROR` → "item 2 do carrossel: container ERROR", sem pai nem publish, de volta à fila. Tempo esgotado dentro do limite. Limite 50/50 → `approved` sem contar tentativa, e a rodada para (o próximo nem é tentado). Slide sem imagem do bucket → nenhuma chamada.
- **Tentativas:** com HTTP 400 no container, a 1ª e a 2ª voltam para `approved` (1 e 2) e a 3ª vira `failed` (3), com "Tentativa N/3" e sem token; depois disso a fila ignora o post. Depois do `media_publish` (5xx, rede, sem id, 4xx) → sempre `failed`, nunca `approved`. O repositório também recusa devolver um post com marcador. Se o banco não grava o marcador, o `media_publish` não é chamado.
- **Concorrência:** três execuções simultâneas do cron com foto, carrossel e story → três publicados, três `media_publish`.
- **SQL real (PGlite, as duas migrações):** a trava com janela não pega atrasado nem manual, e dois `UPDATE` simultâneos dão uma linha só. O marcador grava uma vez. A devolução com marcador não muda nada. Destravar: recente (menos de 10 min) e com marcador recusados; preso sem marcador volta. "Marcado como publicado" fica sem `ig_media_id`. O story manual é marcado. `token_refresh_error` aceita 300 caracteres e recusa 301. `anon` e `authenticated` continuam sem acesso.
- **Cron de ponta a ponta:** a resposta tem só id e resultado, sem token. Sem conta → `parada: sem_conta`, e o post continua `approved`.
- **Renovação:**
  - decisão nas bordas: 15 dias, 24 h, vencido, validade desconhecida;
  - "cedo", "novo demais" e "vencido" não chamam a Meta nem tocam no token;
  - renovação feliz: URL e parâmetros exatos; grava o token novo cifrado, a validade por `expires_in`, a emissão e a data da renovação, e limpa a falha;
  - falha (HTTP 400 com o token na mensagem, rede, resposta sem token): o token antigo e a validade ficam, a data e o motivo são gravados sem token, e nada sensível vai para resposta ou `console`;
  - reconexão no meio → "concorrente", sem sobrescrever;
  - banco falhando ao gravar → o antigo fica e a falha é registrada;
  - envelope de outra chave → registra e não chama a Meta;
  - cron `social-token` com segredo → resposta sem token.
- **Destravar (rota):**
  - sem admin ou ação inválida → 404;
  - recente ou com marcador → `erro=destravar`, e o post não volta para a fila;
  - preso sem marcador → `approved` com a nota;
  - links ruins (`http`, outro host, `javascript:`, `instagram.com.evil…`, com usuário) → `erro=link`;
  - link certo, ou vazio → `published`, sem `ig_media_id`.
- **Stories manuais:** o cron não toca neles (nenhuma chamada), e o "Publicar agora" também não. "Marcar como publicado" só vale para manual aprovado, e volta ao calendário quando pedido. A janela de 2 h foi testada nas bordas.
- **"Publicar agora" (rota):** carrossel e story publicam, manual recusa.
- **Painel:** os seis selos e as dicas, incluindo o "parado, destravar". No chip: "Ver no Instagram" com link, motivo da falha e "Tentativa 1/3 falhou". Na faixa manual: link de download, sticker e formulário. No cartão: sem aviso a 20 dias; "vence em 3 dias"; "renovação falhou" com o motivo.
- **Código:** `console.*` nos módulos novos só com texto fixo, `social_accounts` só em `conta.ts`, e o editor sem `"use client"` nem `confirm(`.

Os testes da F2 continuam valendo, com o contrato novo. O limite agora volta para a fila. A trava aceita os três formatos e recusa o manual. A cadeia do PostgREST inclui `manual`, `in(format)`, a janela, `devolver` e o marcador. O PGlite aplica também a migração F3 e confere as colunas da allowlist. Os auxiliares foram para `tests/fixtures/instagram.ts`.

**Mutações feitas à mão:** seis de sete foram pegas:

- ignorar o marcador na política;
- `devolver` sem `publish_requested_at IS NULL`;
- renovar sem a regra das 24 h;
- o limite contando tentativa;
- destravar sem os 10 min;
- a rodada sem parar no limite.

A sétima não foi pega: tirar o `limpar` extra da mensagem de falha da renovação. Ela não vaza nada, porque `chamar` já limpa a mensagem com o token como segredo. É só defesa dupla.

## Decisões tomadas por conta própria

1. **Migração com colunas, não `last_error`.** O "media_publish foi chamado" fica em `publish_requested_at`, gravado por `UPDATE` condicional antes do publish. Se a gravação falhar, não publica. A renovação precisava da data de emissão (regra das 24 h) e do estado da falha, que não tinham onde morar.
2. **"Publicar agora" mantém `failed` em falha antes do publish** (como na F2), em vez de voltar para a fila. O admin está olhando, e voltar para `approved` faria o cron tentar sozinho, uma surpresa. O limite é exceção: volta para `approved` sem contar, nos dois modos.
3. **`updated_at` mede o "parado há 10 min".** O trigger da F1 toca a coluna em todo `UPDATE`; a trava e o marcador atualizam a linha.
4. **Orçamento do cron:** `maxDuration = 300` (Vercel Pro), orçamento de 240 s, até 3 posts por rodada. Um post só começa se sobrarem 75 s. A espera do processamento vai até 90 s, consultando a cada 3 s. A Meta recomenda 1 consulta por minuto, mas imagem processa em segundos. Tempo esgotado conta como tentativa.
5. **A rodada para** em sem conta, token vencido, token ilegível ou limite. Isso vale para a conta inteira: não adianta tentar o próximo post.
6. **A trava do cron repete a janela** (`scheduled_at` entre agora − 6 h e agora), além da seleção, para fechar a corrida entre selecionar e travar.
7. **`alt_text` no carrossel:** é o de cada slide; o alt do post só entra quando há uma imagem só. O story não manda alt nem legenda (a documentação não aceita alt e não fala de legenda).
8. **Renovação com compare-and-swap** no envelope lido. Se alguém reconectou no meio, a renovação não sobrescreve a conta nova.
9. **Validade desconhecida** (`token_expires_at` nulo): renova se o token tiver 24 h ou mais. A resposta traz `expires_in` e corrige a validade.
10. **Token na query do refresh**, como a referência define. A mesma exceção da troca pelo token longo na F2. Erros de rede não carregam a URL.
11. **Horário do cron do token:** 09:00 UTC (6h em São Paulo).
12. **"Marcar como publicado" do destravar aceita post com marcador.** Do story manual, não tem campo de link (story não tem permalink útil) e só vale para `manual = true` aprovado, a qualquer hora (a faixa só aparece na janela).
13. **Link colado:** só `https://instagram.com` ou `www.instagram.com`, sem usuário nem porta, até 300 caracteres.
14. **"Voltar para aprovado" não zera `attempts`** e grava uma nota em `last_error`. Se o horário ainda estiver na janela de 6 h, o cron tenta de novo.
15. **`/api/cron/social` e `/api/cron/social-token`** entraram em `rotaSemSessao`, como o cron da Apple.

## Envs

Nenhuma env nova. Já existem e são usadas pelos crons:

| Variável | Uso |
|---|---|
| `CRON_SECRET` | protege os dois crons; a Vercel manda o Bearer sozinha |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `SOCIAL_TOKEN_KEY`, `ADMIN_PUBLIC_ORIGIN` | se faltar qualquer uma, os crons respondem 503 e nada é publicado nem renovado |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` | config do servidor, como no resto do painel |

O cron `*/5 * * * *` exige o plano Pro da Vercel. O plano diz que o projeto já está nele.

## Pendências e riscos

- **Validação real** (depois do GO, migração e deploy): aprovar **um** post com horário próximo, de preferência um carrossel de teste, e acompanhar a rodada do cron nos logs da Vercel. A resposta JSON traz ids e resultados. Pontos a observar:
  - o carrossel com `children` em string;
  - o story saindo sem legenda;
  - o permalink do story (a Meta pode não devolver; aí o post fica `published` sem link).
- **Cabe em 300 s?** Um post preso no meio por falta de tempo da função (timeout da Vercel) fica em `publishing` e entra no fluxo de destravar depois de 10 min.
- **Posts atrasados não saem sozinhos.** Ficam `approved` com o selo "Atrasado" até alguém decidir: publicar agora ou voltar para rascunho.
- **Token vencido de verdade não renova** (regra da Meta). O painel avisa com 7 dias; abaixo disso, só reconectando.
- Continua sem registro o `config_issue` / `caption_add_on_attachment_status` do `media_publish` (publicado sem legenda), como na F2.
- O rodapé lateral "Só leitura" continua como na F1.
