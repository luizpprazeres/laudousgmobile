# DET-3 — Verificacao adversarial das correcoes

Repo verificado em `4e9da03`. Nao modifiquei codigo nem DB; esta analise e por leitura estatica dos arquivos corrigidos.

## Veredito curto

| Item | Veredito | Motivo |
| --- | --- | --- |
| 1. `bundleLoader.ts` fallback silencioso | OK | A ordem `contextVariant ?? accountVariantKey ?? default` esta correta, e variante escolhida sem modelo agora bloqueia com `BUNDLE_VARIANT_EMPTY`. |
| 2. `reportTemplateVariants.ts` + POST/PATCH | PROBLEMA menor, nao bloqueia se DET-2 estiver bem tagueado | POST e PATCH cobrem promocao para `validated`, inclusive draft -> validated. Mas `hasMatchingModel` trata modelo sem `variant:` como `padrao`, enquanto o `bundleLoader` so faz isso implicitamente quando todos os modelos da categoria nao tem `variant:`. Em cenario misto, o catalogo pode validar uma variante `padrao` que o bundle depois nao consegue selecionar. |
| 3. `0001_smart_maddog.sql` idempotencia | OK por leitura | `CREATE TABLE IF NOT EXISTS`, FKs em `DO ... duplicate_object`, indices `IF NOT EXISTS` e `DROP POLICY IF EXISTS` antes de `CREATE POLICY`. Rodar 2x seguidas nao deveria quebrar. |

## 1. `bundleLoader.ts`

OK.

(a) Categoria de 1 modelo sem `variant:` ainda passa antes da resolucao. `modeloVariants.size === 0` retorna `{ rows, error: null }` antes de calcular `chosen` ou checar `hasChosenModelo` (`apps/api/src/server/pipeline/bundleLoader.ts:298-307`). Depois disso, o gate geral de template exige exatamente 1 modelo. Portanto:

- 1 modelo sem `variant:` passa.
- 0 modelos cai em `BUNDLE_NO_TEMPLATE`.
- mais de 1 modelo sem `variant:` cai em `BUNDLE_MODEL_AMBIGUOUS`.

(b) Contexto com gatilho positivo tem precedencia absoluta sobre preferencia. O `chosen` e montado como `contextVariant ?? accountVariantKey ?? selector?.defaultVariant ?? "padrao"` (`bundleLoader.ts:318-325`). Como `resolveContextVariant` retorna string quando o gatilho casa, a preferencia nunca sobrescreve um gatilho clinico positivo.

Exemplo: conta prefere `padrao`, mas ditado diz `tireoide com Doppler`. `contextVariant = "doppler"`; o bundle escolhe `doppler`.

(c) `accountVariantKey` valido + contexto `null` + variante existente escolhe certo. Sem gatilho, `chosen = accountVariantKey`; em seguida o filtro mantem apenas modelo cujo `variantOf(tags) === chosen` (`bundleLoader.ts:327-339`). Se a variante existe no estilo carregado, seleciona corretamente.

Regressao nao encontrada nesse item. O comportamento ruim antigo, fallback silencioso para default quando preferencia apontava variante sem modelo, foi fechado: `hasChosenModelo` agora gera `BUNDLE_VARIANT_EMPTY` (`bundleLoader.ts:327-332`).

## 2. Admin `report_template_variants`

Parcialmente OK, com um furo residual.

O lado bom:

- `POST /api/admin/report-template-variants` valida `hasMatchingModel` quando cria direto com `status=validated` (`apps/api/src/app/api/admin/report-template-variants/route.ts:80-91`).
- `PATCH /api/admin/report-template-variants/[id]` tambem valida quando `input.status === "validated"` (`apps/api/src/app/api/admin/report-template-variants/[id]/route.ts:37-60`).
- O bypass draft -> PATCH validated nao escapa: no PATCH ele carrega a row atual, aplica a `variant_key` nova se vier no mesmo PATCH, e so depois permite o update.
- `category_code` e `writing_style_id` nao sao mutaveis no schema de update, entao a checagem usa a categoria/estilo reais da row atual.

Furo real:

`hasMatchingModel` trata modelo sem tag `variant:` como `padrao` (`apps/api/src/server/admin/reportTemplateVariants.ts:58-65`). Isso e bom para categoria de modelo unico legado. Mas o `bundleLoader` nao faz exatamente a mesma coisa em categoria mista. No loader, `variantOf(tags)` retorna `null` se nao existe tag `variant:`; se houver pelo menos um modelo com tag, `modeloVariants.size > 0`, ele entra na selecao por variante e compara `variantOf(r.tags) === chosen`.

Bypass concreto:

1. Categoria/estilo tem dois modelos validated:
   - `modelo A` sem tag `variant:`
   - `modelo B` com `variant:enxuta`
2. Admin cria/promove catalogo `variant_key = "padrao"`.
3. `hasMatchingModel` aprova, porque interpreta `modelo A` como `padrao`.
4. Na geracao, o bundle ve `modeloVariants.size > 0`, escolhe `padrao`, mas `variantOf(modelo A.tags) === null`, nao `"padrao"`.
5. Resultado: `BUNDLE_VARIANT_EMPTY` para uma variante que o admin permitiu validar.

Isso nao quebra os SQLs DET-2 corrigidos se todos os modelos conflitantes tiverem `variant:padrao` explicito, como foi exigido. Mas ainda e uma inconsistencia real entre admin e loader. Para ficar completo, ou o loader precisa tratar untagged como `padrao` tambem no cenario misto, ou o admin nao deve aceitar untagged como `padrao` quando existe qualquer modelo tagged no mesmo par categoria/estilo.

Nao achei outro bypass via API. Busca por inserts/updates de `schema.reportTemplateVariants` mostrou apenas esses handlers admin; seed SQL direto e acesso DB sempre podem burlar, mas isso e fora do contrato da API.

## 3. Migration `0001_smart_maddog.sql`

OK por leitura estatica. Nao rodei contra o DB mobile para nao alterar estado.

Idempotencia dos statements:

- `CREATE TABLE IF NOT EXISTS` para as duas tabelas (`packages/db/drizzle/0001_smart_maddog.sql:8`, `26`).
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e idempotente em Postgres.
- FKs em blocos `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$` (`0001_smart_maddog.sql:36-52`).
- Indices com `CREATE ... INDEX IF NOT EXISTS` (`0001_smart_maddog.sql:54-55`).
- Policies com `DROP POLICY IF EXISTS` antes de `CREATE POLICY` (`0001_smart_maddog.sql:56-67`).

Rodar 2x seguidas o mesmo arquivo nao deveria quebrar. A ressalva e apenas de estado parcial/externo: se ja existir uma tabela antiga com mesmo nome e schema divergente, `CREATE TABLE IF NOT EXISTS` nao corrige colunas/constraints ausentes. Mas para o caso pedido, migration aplicada duas vezes em sequencia a partir dela mesma, esta idempotente.

## Conclusao

As tres correcoes principais foram feitas. O unico furo que sobrou e a divergencia `untagged == padrao` no admin versus `untagged == null` no loader quando existe mistura de modelos com e sem `variant:`. Eu corrigiria isso antes de confiar no catalogo DET-3 como fonte de verdade, porque ele pode prometer uma variante que o bundle bloqueia.

VERIFICACAO DET-3 DEX2 PRONTA
