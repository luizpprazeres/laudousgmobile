# Entrega — ADMIN FASE 2, painel (E3) — 21/10/2026

Branch `feat/admin-painel` (worktree `~/.worktrees/laudousg-admin-painel`). Nada foi publicado: não houve deploy,
projeto Vercel novo, env var na Vercel, push, migração nem escrita no banco.

Referências: briefing `docs/admin/briefing-fase2-painel-2026-10-21.md` (worktree principal), plano
`~/laudousg-app-site/docs/admin-plano-2026-10-21.md` (§2 e §3), protótipo aprovado `docs/admin/prototipo/`.

## O que foi feito

`apps/admin` é um app Next.js 15 (App Router) com `basePath: "/admin"`, fiel ao protótipo aprovado: mesmo CSS, cores
da marca, modo claro/escuro e layout de celular.

- **Telas:** Visão geral, Funil, TestFlight, Assinaturas, Custos por usuário e Saúde. Seletor Hoje/7 dias/30 dias por
  `?p=`, com dias no fuso de Brasília.
- **Gráficos:** barras em HTML/CSS renderizadas no servidor. Não há biblioteca de gráficos nem CDN no navegador, e a CSP
  é `'self'`.
- **Marcação real × fictício:** igual ao protótipo. Todo número carrega `origem: "real"` com a fonte, ou
  `origem: "exemplo"` com o selo "Aguardando GO: Gx".

### Login e autorização, checados só no servidor

| Camada | Regra |
|---|---|
| `src/lib/auth/acesso.ts` (função pura) | Sem config → nega. Sem sessão → login. E-mail fora de `ADMIN_EMAILS` → nega. Sessão sem MFA (`aal1`) → etapa de MFA, **nunca** libera. `profiles.role` ≠ `admin` → nega |
| `src/middleware.ts` | Aplica a regra em toda rota. Negado vira **404**; `/api/*` negado também vira 404 |
| `(painel)/layout.tsx` + `exigirAdmin()` | Checa de novo, como defesa em profundidade, caso o middleware seja contornado |
| `/api/auth/login` | E-mail fora da allowlist recebe a mesma resposta de senha errada, sem consultar o Supabase. Limite de 5 tentativas por IP em 10 min, só em memória (o IP não é gravado) |
| `/api/auth/mfa` | TOTP via `challengeAndVerify`, e o fator precisa ser da própria conta. O **cadastro** do TOTP só abre com `ADMIN_ALLOW_MFA_ENROLL=true` |
| Todos os POST | Checagem de `Origin` igual ao host, além de `SameSite=Strict` |
| Cookies | `admin-sb*`, com `httpOnly`, `Secure` (em produção), `SameSite=Strict` e `Path=/admin` |
| Cabeçalhos | `X-Robots-Tag: noindex`, `Cache-Control: private, no-store`, `X-Frame-Options: DENY`, CSP `default-src 'self'`, HSTS e `nosniff` |

A service role só existe no servidor e não há nenhuma variável `NEXT_PUBLIC_`. O `getUser()` valida o JWT no Supabase
Auth; o cookie sozinho não basta.

### Dados

| Fonte | Como | Estado |
|---|---|---|
| Supabase, tabelas-base | `src/lib/data/fonte-supabase.ts`: `.select()` só pela allowlist de colunas (`colunas.ts`), agregação no servidor | **Real hoje** |
| Fase 2: `ai_usage_events`, `iap_notifications`, `iap_notification_attempts` | `src/lib/data/fonte-fase2.ts`. Lê se a tabela existir; se não existir (`PGRST205`/`42P01`) o cartão fica como exemplo com o selo | Aguarda G3. Nomes **alinhados** com a migração `20261022010003_admin_fase2_dados.sql` do W13 |
| TestFlight | `src/lib/asc/`: JWT ES256 com `node:crypto`, só GET, nomes viram iniciais, cache de 10 min em memória | Real, quando a chave estiver no env do servidor (G8) |
| Vendas e instalações da Apple | `src/lib/asc/relatorios.ts`: parser do SALES/SUMMARY testado com arquivo de exemplo; ainda **não rodou contra a Apple** | Aguarda G1 |
| Cache | `src/lib/cache.ts`: TTL em memória com deduplicação. Banco: 1 min; TestFlight: 10 min | Pronto. O cache durável (`apple_*_daily` + cron) fica para a E4 (G1 + G3) |

Hoje o painel lê as **tabelas-base** com colunas não clínicas, e não as views `admin_*`. Motivo: as views do W13 agrupam
por **dia em UTC** (`date_trunc('day', created_at AT TIME ZONE 'UTC')`), e o painel mostra dias de Brasília. Com
UTC, um laudo das 21h aparece no dia seguinte. **Sugestão ao W13:** usar `AT TIME ZONE 'America/Sao_Paulo'` nas views.
Depois disso, trocar `buscarLinhas()` pelas views é uma mudança localizada; `montarReais()` continua igual.

## Testes

| Teste | Resultado |
|---|---|
| `pnpm --filter @laudousg/admin typecheck` | ok |
| `pnpm --filter @laudousg/admin build` (`next build`) | ok: 12 rotas dinâmicas e middleware |
| `pnpm --filter @laudousg/admin test` (`tsx --test`) | 26 ok, 3 pulados sem `ADMIN_MIGRATIONS_DIR` |
| Os mesmos testes com `ADMIN_MIGRATIONS_DIR=~/.worktrees/laudousg-admin-dados/supabase/migrations` | 29 ok: as 4 views `admin_*` do W13 passam na auditoria, e as colunas lidas existem na migração |

O que os testes cobrem:
- **Login negado sem MFA ou fora da allowlist** (`tests/acesso.test.ts`): `aal1` nunca libera; e-mail fora da allowlist
  é negado mesmo com MFA e papel admin; allowlist vazia ou env ausente nega tudo; papel `user` é negado; POST de outra
  origem é recusado.
- **Nenhuma view expõe texto clínico** (`tests/sem-texto-clinico.test.ts`):
  - a allowlist não contém `raw_input`, `output_text`, `system_message_full`, `final_output`, `email`, `name`,
    `error_message` etc.;
  - nenhum arquivo do app faz `.select("…")` literal ou `select *`;
  - o auditor de SQL reprova `create view admin_*` com coluna clínica ou `select *`, e roda sobre as migrações.
- **Agregação** (`tests/agregar.test.ts`, `tests/dados.test.ts`): virada de dia em Brasília, períodos, percentil igual
  ao `percentile_cont`, pseudônimos (nenhum `user_id` sai para a tela), todo exemplo tem GO e todo real tem fonte, e as
  tabelas da fase 2 viram dado real quando existem.
- **ASC** (`tests/asc.test.ts`): JWT ES256 válido gerado com chave de teste, sem chave → nada é chamado, iniciais,
  parser do SALES.

Testes manuais com `next start`:

| Situação | Resposta |
|---|---|
| Sem env | Todas as rotas → 404 |
| Com env sem sessão | `/admin/*` → 307 para `/admin/login`; `/admin/api/*` → 404 |
| POST com e-mail fora da allowlist | 303 → `/admin/login?erro=1` |
| POST sem `Origin` ou de outra origem | 404 |
| Cookie forjado | Não entra |

Esse teste achou e corrigiu um bug: o redirect dos Route Handlers perdia o `/admin`.

Smoke com dados reais, local e só leitura (`scripts/smoke-dados.ts`): imprime só agregados e confere com o protótipo.

| Métrica | Valor |
|---|---|
| Laudos (hoje / 7 dias / 30 dias / total) | 17 / 51 / 292 / 4.068 |
| Custo estimado da geração em 30 dias | US$ 0,928 (9 laudos sem preço) |
| Gerações em 30 dias | 286 ok · 2 bloqueadas · 4 erros |
| Assinaturas em produção | 0 |
| TestFlight | 414 sessões e 1 crash em 30 dias, build 262; 17 chamadas, todas 200 |

A conferência visual das 6 telas (desktop, celular a 390 px, claro e escuro) foi feita com uma cópia temporária sem
autenticação e esse snapshot. A cópia foi apagada e não está no commit.

## Como rodar localmente

```bash
cp apps/admin/.env.example apps/admin/.env.local   # preencher; nunca commitar
pnpm --filter @laudousg/admin dev                   # http://localhost:3005/admin
```

## O que depende de GO

| GO | Efeito no painel |
|---|---|
| **G8** | Projeto Vercel `laudousg-admin` + env vars (`SUPABASE_*`, `ADMIN_EMAILS`, `ASC_*`), URL de redirect do Supabase Auth e cadastro do TOTP do Luiz. Para o cadastro: `ADMIN_ALLOW_MFA_ENROLL=true` uma vez e depois `false`. Sem isso, nada vai ao ar |
| **G7** | Vercel Pro (uso comercial; cron de hora em hora) |
| **G3** | Aplicar a migração do W13. Os cartões de custo por rota, Deepgram, erros por rota, eventos de assinatura e notificações da Apple passam a real **sem mudar código** |
| **G1** | Chave "Sales and Reports" e vendor number: instalações e vendas (`relatorios.ts`) |
| **G1 + G2** | Visitas na página da loja, origem e campanha das instalações, crashes da loja |
| **G6 + G3** | Visitas e cliques da landing (`landing_daily`, E5) |
| **G4** | Separar iOS de web nas contas novas |
| **G5** | Fatura real (OpenAI e Anthropic) e segundos do Deepgram enviados pelo app |
| E5 (landing) | `rewrite` de `/admin/**` no `vercel.json` do `laudousg-app-site`, coordenado com o terminal da landing |

### Pendências conhecidas

- **KPIs de assinatura:** ativos pagos, em teste, cancelando, conversão e linha do tempo por assinante continuam como
  exemplo mesmo depois do G3. Falta derivar esses números de `subscriptions.auto_renew_status/offer_type` e do
  histórico. É um passo pequeno depois que houver dados de produção para validar.
- **Custo da geração:** segue vindo de `generation_audit` (preço antigo no código). Com o G3, dá para trocar pela soma
  de `ai_usage_events` (rota `generate`), que usa a tabela de preços versionada do W13.
- **CSP:** usa `'unsafe-inline'` em `script-src` porque o Next injeta scripts inline. Endurecer com nonce numa próxima
  etapa.
