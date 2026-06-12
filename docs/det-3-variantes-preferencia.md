# DET-3 — Variantes de máscara (1ª classe) + preferência da conta

> Implementado 2026-06-12. Backend completo (iOS = DET-4). Migrations aplicadas
> no DB mobile; código local (pré-deploy).

## O que entrou

### Tabelas (DB mobile)
- **`report_template_variants`** — catálogo de variantes com identidade própria
  (id, category_code, writing_style_id, variant_key, name, version, status,
  template_body nullable, renderer_schema/rules jsonb nullable, created_by,
  approved_at). RLS: select validated p/ authenticated; all p/ admin.
- **`account_report_preferences`** — escolha do médico por categoria
  (user_id, category_code, default_variant_id). PK (user, category). RLS own.
- Migration drizzle `0001_smart_maddog.sql` (editada à mão p/ conter só as 2
  tabelas — o drizzle gerou drift de subscriptions/product_events que já existem
  em prod via SQL vivo). Aplicada via MCP `apply_migration`.
- Seed SQL vivo `0008_det3_template_variants.sql` + `migrate.ts`: espelha o
  catálogo de todas as variantes existentes (variant:<chave> dos knowledge_blocks)
  + piloto demo MAMARIA "enxuta".

### Precedência (coexistência contexto × preferência)
`bundleLoader.ts` — `resolveContextVariant` retorna a variante OU **null**.
Precedência em `applyModeloVariantSelection`:
1. **CONTEXTO** (gatilho positivo no ditado: 1t/2t/3t, ta/tv, com Doppler) —
   imperativo clínico, a preferência NÃO sobrescreve.
2. **PREFERÊNCIA DA CONTA** (`accountVariantKey`) quando o ditado não decide.
3. **DEFAULT** (`selector.defaultVariant ?? "padrao"`).
`loadDeterministicBundle` ganhou `accountVariantKey?`. `route.ts` resolve via
`lookups.resolveAccountVariantKey(user.id, category)` (JOIN prefs × variants
validated → variant_key).

### APIs
- **`/api/me/report-preferences`** (GET/PATCH): GET devolve prefs + catálogo
  (p/ o picker do DET-4); PATCH upsert `{category_code, default_variant_id}`
  (valida categoria + variante validated da categoria).
- **`/api/admin/report-template-variants`** + `[id]`: CRUD (GET/POST/PATCH/
  DELETE), `requireAdmin`. Helpers/zod em `server/admin/reportTemplateVariants.ts`.

## Validação
- **Prova E2E** (`tests/det3/preference-e2e.mjs`): sem preferência → máscara
  padrão ("...E REGIÕES AXILARES"); preferência **enxuta** → "ULTRASSONOGRAFIA
  MAMÁRIA — LAUDO RESUMIDO"; volta a padrão → padrão. ✅
- **Regressão 38/38 golden**: a precedência preservou 100% da seleção por
  contexto (preferência não interfere quando o gatilho casa).
- typecheck 6/6.

## Notas / limitações (honestas)
- A tag `variant:` filtra só o **modelo**. Regras/frases do bundle são
  compartilhadas — uma variante de preferência cujo efeito esteja só no modelo
  pode ser parcialmente dominada pelas regras (no piloto, a enxuta usa um título
  + NOTA AO GERADOR inequívocos p/ vencer). Variante de preferência com mudança
  estrutural profunda precisará de seus próprios blocos (ou do renderer do DET-5).
- `default_variant_id` aponta p/ UMA variante (de um estilo); o que vale é o
  `variant_key` extraído no JOIN — aplicado ao estilo da request. Se o key não
  existir naquele estilo → BUNDLE_VARIANT_EMPTY (erro claro).
- Piloto MAMARIA "enxuta" é **demonstração** — conteúdo clínico real entra depois
  via lab (decisão Luiz).

## Correções pós-review dex1 (docs/det-3-review-dex1.md)
1. **Preferência inexistente no estilo → erro claro.** `bundleLoader` não checa
   mais existência antes de escolher a preferência: `chosen = contexto ??
   accountVariantKey ?? default`; o gate `hasChosenModelo` dispara
   `BUNDLE_VARIANT_EMPTY` se a variante preferida não existir naquele estilo
   (nunca fallback silencioso pro padrão).
2. **Admin não deixa o catálogo "mentir".** POST/PATCH com `status=validated`
   checam `hasMatchingModel` (existe knowledge_blocks kind=modelo validated com
   tag `variant:<key>` p/ a categoria/estilo) → 409 `no_matching_model` senão.
3. **Migration idempotente.** `0001_smart_maddog.sql` com `CREATE TABLE IF NOT
   EXISTS`, FKs em `DO $$ ... duplicate_object`, índices `IF NOT EXISTS`,
   policies `DROP ... IF EXISTS` + CREATE — rodar `migrate()` em prod (após a
   aplicação via MCP) não quebra.

Re-validado: 38/38 golden + E2E de preferência, typecheck 6/6.

## Fora de escopo (registrado)
- UI no lab p/ CRUD de variantes (só a API entrou).
- iOS: seletor de máscara nas Preferências = **DET-4**.
- Migrar conteúdo dos modelos p/ `template_body` como fonte primária = **DET-5**.
