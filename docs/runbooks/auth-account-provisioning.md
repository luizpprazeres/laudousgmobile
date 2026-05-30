# Runbook — Provisionamento de Contas de Usuário (LaudoUSG)

> Última atualização: 2026-05-30 (criação)
> Trigger: incidente Apple Review (Build 77) — conta `apple-review@laudousg.com` com login quebrado por colunas NULL em `auth.users`.

## Quando usar

- Antes de **toda submissão Apple Review** (rodar query de auditoria — seção "Checklist pré-submissão").
- Sempre que precisar **criar uma conta de beta tester** (TestFlight, demo médico, etc).
- Quando algum login retornar erro 500 com mensagem `Database error querying schema`.

---

## 🐛 O bug conhecido (Supabase GoTrue + colunas NULL)

GoTrue (binário Go do Supabase Auth) faz `Scan` das colunas `auth.users` como string ao processar login. Se qualquer uma das colunas abaixo estiver `NULL` em vez de string vazia `''`, o login falha com erro 500 mesmo com a senha correta:

- `confirmation_token`
- `recovery_token`
- `email_change_token_new`
- `email_change`
- `phone_change`
- `phone_change_token`
- `reauthentication_token`

Sintoma exato no log do GoTrue:
```
error finding user: sql: Scan error on column index 3, name confirmation_token:
converting NULL to string is unsupported
```

Resposta HTTP que o app vê:
```json
{
  "code": 500,
  "error_code": "unexpected_failure",
  "msg": "Database error querying schema"
}
```

Documentação oficial Supabase:
- https://supabase.com/docs/guides/troubleshooting/scan-error-on-column-confirmation_token-converting-null-to-string-is-unsupported-during-auth-login-a0c686

---

## ✅ Como criar uma conta corretamente

### Opção 1 — Via signup do app (PREFERIDO)

A forma mais segura. O fluxo iOS (`LaudoUSG/Services/AuthService.swift:220`) chama:

```
POST {SUPABASE_URL}/auth/v1/signup
Headers: apikey: <anon>, Content-Type: application/json
Body: {"email":"...","password":"...","data":{...}}
```

GoTrue normaliza todas as 7 colunas com `''` por padrão. Trigger `public.handle_new_user` cria espelho em `public.profiles` automaticamente. **Zero risco do bug**.

### Opção 2 — Via Admin API oficial (Node/CLI)

Quando precisar criar conta programática (ex: bulk seed pra demo). Use **sempre** a API oficial:

```ts
import { createClient } from '@supabase/supabase-js'
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

await admin.auth.admin.createUser({
  email: 'beta-tester@example.com',
  password: 'SenhaForte123',
  email_confirm: true,    // pula confirmação por email
  user_metadata: { name: 'Beta Tester' }
})
```

API normaliza colunas idêntico ao signup normal.

### ❌ NUNCA fazer

```sql
-- PROIBIDO. Origem do bug em 2026-05-30 (apple-review).
INSERT INTO auth.users (id, email, encrypted_password, ...) VALUES (...);

-- PROIBIDO. Criar via SQL deixa colunas críticas como NULL.
```

**Por quê**: SQL direto bypassa a normalização do GoTrue. As colunas `confirmation_token`, `recovery_token`, etc ficam `NULL` em vez de `''`, quebrando o login.

### ⚠️ Cuidado com Supabase Dashboard

Criar conta via Dashboard (`Authentication → Users → Add user → "Create new user"`) **pode** deixar colunas NULL dependendo de qual método interno o Dashboard usa. **Sempre auditar** com a query da próxima seção após criar via Dashboard.

---

## 🔍 Checklist pré-submissão Apple Review

Antes de cada submit pro Apple Review, rodar esta query no Supabase SQL Editor (ou via MCP):

```sql
SELECT id, email, created_at,
  (confirmation_token IS NULL)     AS conf_null,
  (recovery_token IS NULL)         AS rec_null,
  (email_change_token_new IS NULL) AS etn_null,
  (email_change IS NULL)           AS ec_null,
  (phone_change IS NULL)           AS pc_null,
  (phone_change_token IS NULL)     AS pct_null,
  (reauthentication_token IS NULL) AS reauth_null
FROM auth.users
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;
```

**Esperado**: zero linhas. Se voltar alguma → aplicar fix abaixo antes de submeter.

Verificar especificamente a conta passada à Apple (`apple-review@laudousg.com` ou substituto):

```sql
SELECT email, last_sign_in_at
FROM auth.users
WHERE email = 'apple-review@laudousg.com';
```

- `last_sign_in_at IS NULL` + conta criada há mais de 24h = **forte sinal** que o login está quebrado. Aplicar fix preventivo.

---

## 🛠 Fix one-shot — Conta com colunas NULL

Se a query de auditoria retornar contas afetadas:

```sql
UPDATE auth.users
SET
  confirmation_token      = COALESCE(confirmation_token,      ''),
  recovery_token          = COALESCE(recovery_token,          ''),
  email_change_token_new  = COALESCE(email_change_token_new,  ''),
  email_change            = COALESCE(email_change,            ''),
  phone_change            = COALESCE(phone_change,            ''),
  phone_change_token      = COALESCE(phone_change_token,      ''),
  reauthentication_token  = COALESCE(reauthentication_token,  '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL
RETURNING id, email;
```

Se também precisar resetar senha (caso a senha não esteja batendo com o que foi comunicado à Apple):

```sql
UPDATE auth.users
SET encrypted_password = crypt('NOVA_SENHA_AQUI', gen_salt('bf', 10)),
    updated_at = now()
WHERE email = 'EMAIL_AQUI';
```

**Atenção**: `gen_salt('bf', 10)` é obrigatório (cost 10). `gen_salt('bf')` sem argumento usa cost 6 que é considerado fraco pelo GoTrue.

Validar imediatamente após o fix:

```bash
curl -sS -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' | jq
```

Esperado: campo `access_token` presente na resposta.

---

## 🚫 Trigger BEFORE INSERT — Por que NÃO criar

Tentação: criar trigger `BEFORE INSERT ON auth.users` que força COALESCE das colunas pra `''`. **Não fazer**:

1. Schema `auth.*` é **gerenciado pelo Supabase**. Modificações podem ser sobrescritas em upgrades do GoTrue.
2. Documentação oficial alerta que triggers em `auth.users` podem **bloquear login** se não forem `SECURITY DEFINER` corretos.
3. O trigger existente `on_auth_user_created` (`AFTER INSERT`) já funciona bem porque só lê e cria espelho em `public.profiles` — não modifica `auth.users`.

A **prevenção definitiva** é disciplinar provisionamento: só usar signup app ou Admin API. SQL direto fica registrado como anti-pattern neste runbook.

---

## 🔗 Whitelist BETA_TESTER_EMAILS (separado do bug acima)

Independente do bug de login, todo email de Apple Reviewer / beta tester precisa ser adicionado em `BETA_TESTER_EMAILS` (env Vercel do projeto `laudousgmobile`, ambiente Production) pra entrar com `plan='pro'` automático sem passar pelo paywall.

Após editar a env:
1. Salvar no Vercel
2. **Redeploy obrigatório** (env vars novas só pegam após redeploy — não é instantâneo)
3. Validar via:
```bash
TOKEN=$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' | jq -r '.access_token')

curl -sS "https://laudousgmobile.vercel.app/api/me/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.profile.plan'
```

Esperado: `"pro"`.

Código: `apps/api/src/server/iap/betaWhitelist.ts`.

---

## 📚 Referências

- Doc Supabase do bug: https://supabase.com/docs/guides/troubleshooting/scan-error-on-column-confirmation_token-converting-null-to-string-is-unsupported-during-auth-login-a0c686
- Managing user data: https://supabase.com/docs/guides/auth/managing-user-data
- iOS signup flow: `LaudoUSG/Services/AuthService.swift:220`
- Backend whitelist: `apps/api/src/server/iap/betaWhitelist.ts`
- Trigger `handle_new_user`: definido em migração inicial do Supabase
- Histórico do incidente: Apple Review Build 77 — 2026-05-26 reportou "we were unable to sign in", diagnosticado e corrigido em 2026-05-30
