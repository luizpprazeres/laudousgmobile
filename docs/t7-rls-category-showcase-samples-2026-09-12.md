# T7 — `category_showcase_samples`: 0 políticas RLS e o lab faz upsert

Análise somente leitura (Sentinela, COFRE). Nada editado, nenhum SQL aplicado, nenhuma rota
de escrita exercitada. Revisão 2 após ajustes pedidos pelo Zelador.

## Pergunta da tarefa
O lab usa anon (upsert falhando em silêncio) ou service role?

**Resposta: pelo código, service role.** O caminho de escrita não passa pela RLS nem pelos grants
de `anon`/`authenticated`. Isto é leitura de código; a rota não foi executada nesta análise
(ver "Lacunas").

## Confirmado (código)

| # | Fato | Onde |
|---|---|---|
| 1 | O upsert do lab usa `createServerSupabaseClient()`, que instancia `@supabase/supabase-js` com `SUPABASE_SERVICE_ROLE_KEY` | `apps/lab/src/app/api/showcase/regenerate/route.ts:98-124` → `apps/lab/src/lib/supabase/server.ts:13-20` |
| 2 | Se o upsert falhar, a rota devolve 500 com `error.message` — não é silencioso do lado do servidor | `regenerate/route.ts:125-127` |
| 3 | A leitura do showcase também é service role | `apps/lab/src/app/showcase/page.tsx:13-20` |
| 4 | O script bulk grava por REST com a service role do `.env` | `tests/showcase/generate-samples.ts:16-19, 86-93` |
| 5 | A migração criou a tabela com RLS ligada e sem políticas, de propósito: "acesso só via service role" | `packages/db/src/sql/0011_showcase_samples.sql:15-16` |
| 6 | O 0024 concede `insert, update` a `authenticated` nessa tabela. Com RLS ligada e 0 políticas, esse grant não habilita escrita nem leitura de linha alguma; nenhum cliente listado em 1–4 depende dele | `packages/db/src/sql/0024_menor_privilegio_escrita.sql:139` |
| 7 | O comentário do 0024 lista o lab entre os "clientes que usam a chave anon" e diz "o lab faz upsert" — para esta tabela a premissa não bate com o código: o lab escreve com service role | `0024_menor_privilegio_escrita.sql:47-55` |
| 8 | O token de admin (`getAdminAccessToken`) serve só para chamar `/api/generate` no backend, não para o upsert | `regenerate/route.ts:31, 42` · `apps/lab/src/lib/supabase/admin-auth.ts` |
| 9 | Toda rota do lab (inclusive `/api/*`) passa pelo middleware de Basic auth quando `LAB_BASIC_AUTH_USER/PASS` existem; sem eles, passa direto | `apps/lab/src/middleware.ts:30-32, 44-46` |
| 10 | Catálogo de ditados é declarado fictício | `apps/lab/src/lib/showcase/samples.ts:1-10` |

## Confirmado (banco, só leitura)

Coleta: `DATABASE_URL` do `.env` da raiz, lib `postgres` do monorepo, `current_user = postgres`.
Relógio do servidor `now()`: **2026-09-13 02:53:18 UTC**; relógio local no mesmo instante:
2026-09-12 23:53:20 UTC (os dois registrados como vieram). Só metadados agregados; nenhum
conteúdo de `raw_input`/`laudo` foi lido ou copiado.

Queries executadas:
```sql
select relrowsecurity, relforcerowsecurity from pg_class where relname='category_showcase_samples';
select count(*) from pg_policies where tablename='category_showcase_samples';
select grantee, string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.role_table_grants
 where table_schema='public' and table_name='category_showcase_samples' group by grantee;
select count(*), min(generated_at), max(generated_at), count(distinct category_code)
  from category_showcase_samples;
```

| Item | Estado |
|---|---|
| RLS | ligada (`relrowsecurity=true`, `relforcerowsecurity=false`) |
| Políticas | **0** |
| Grants `service_role` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| Grants `authenticated` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| Grants `anon` | REFERENCES, SELECT, TRIGGER, TRUNCATE |
| Linhas | 27, em 19 `category_code`; `generated_at` entre 2026-06-12 15:45 e 22:13 UTC |

Divergências código × banco (nesta tabela):
- `authenticated` tem **DELETE**, embora o 0024 tenha pretendido só `insert, update`: a tabela ficou
  fora da lista de revoke do passo 3 e o grant padrão do Supabase permaneceu.
- `authenticated` ainda tem **TRUNCATE e TRIGGER**: o 0028 não está refletido nesta tabela
  (coerente com a T5 em revisão). `anon` também tem TRUNCATE e TRIGGER **nesta tabela** — não
  verifiquei as demais; a T5 pode conferir com a mesma query trocando `table_name`.

## TRUNCATE fica fora da RLS
Pela documentação do PostgreSQL (DDL › Row Security Policies): políticas de RLS se aplicam a
SELECT, INSERT, UPDATE e DELETE; **TRUNCATE não é coberto** e depende só do privilégio de tabela.
Logo, para esta tabela a única defesa contra TRUNCATE por `anon`/`authenticated` é o grant, que
hoje existe. Não estou afirmando que isso seja alcançável pela API REST do Supabase — o PostgREST
não expõe TRUNCATE — só que o privilégio está concedido e a RLS não o cobre.

## Inferência
- `lab.laudousg.com` respondeu **401** em `GET /showcase` e em `POST /api/showcase/regenerate`
  (sem credencial, sem body; a rota valida o JSON antes de qualquer efeito). Indica Basic auth
  configurado em prod. Não vi o env do projeto Vercel `lab` (COFRE/Cabo).
- Se `SUPABASE_SERVICE_ROLE_KEY` faltasse no env do lab, `createServerSupabaseClient()` lança
  "SUPABASE_SERVICE_ROLE_KEY ausente" (`server.ts:7`) e a página `/showcase` quebraria. Não testei.
- Última escrita registrada: 2026-06-12. Não sei se houve tentativa de regeneração via UI depois
  disso; a tabela não guarda origem nem falhas.

## Lacunas
- Rota `/api/showcase/regenerate` e página `/showcase` não foram executadas com credencial —
  o comportamento em runtime (env presente, upsert efetivado, erro exibido) não foi observado.
- Env do Vercel `lab` não verificado.
- Ausência de PII **não está provada**. Rodei uma sonda por regex (`cpf`, padrão `000.000.000-00`,
  `paciente:`) em `raw_input` que retornou 0 linhas, mas isso não cobre nome, data de nascimento,
  número de prontuário nem texto livre em `laudo`. O que existe é a declaração "fictício" em
  `samples.ts:1-10` e o fato de os `raw_input` gravados virem desse catálogo (`route.ts:116`,
  `generate-samples.ts`). Uma revisão de PII exigiria ler o conteúdo, que não fiz.

## Risco fora do escopo da T7 (mesma área)
- O lab inteiro roda com service role: 8 arquivos usam `createServerSupabaseClient` (showcase,
  prompts, reviewer, audit, correções). A barreira é Basic auth estático no middleware.
  Comprometer o lab ou seu env = privilégio total no banco único de iOS/Android/web/API.
  Severidade **média** (superfície interna; impacto alto). Fica para tarefa própria, se o Zelador
  quiser abrir.
- `POST /api/showcase/regenerate` gera um laudo real via `/api/generate` sob `LAB_ADMIN_EMAIL`
  (persiste em `reports`) a cada chamada. Custo de IA; só Basic auth protege. Baixa.

## Política mínima proposta (Chave implementa quando o Zelador liberar)
A tabela é interna, escrita e lida só por service role. Não precisa de política RLS; precisa é de
não ter grant para os papéis de cliente:

```sql
-- 0029_showcase_samples_so_service_role.sql (idempotente)
revoke all on public.category_showcase_samples from anon, authenticated;
-- RLS continua ligada e sem políticas; service_role ignora RLS e é o único caminho.
```

No 0024: remover a linha 139 e corrigir o comentário das linhas 47-55, para o arquivo voltar a
descrever o estado desejado. Se um dia a UI quiser ler o showcase com sessão de usuário admin
(chave anon + JWT), aí sim `grant select` + política `for select using (<admin>)` — hoje não há
consumidor.

Conferência após aplicar (o `success` da migração não prova nada):
```sql
select grantee, string_agg(privilege_type, ',')
  from information_schema.role_table_grants
 where table_name='category_showcase_samples' group by grantee;
-- esperado: só postgres e service_role
```
