# Handoff @devops — DET-5 TIREOIDE (renderer + escore Domingos + toggles)

> Preparado 2026-06-13 pelo terminal de implementação. Código pronto, `tsc`
> limpo (api + db), 3 rodadas de review dex1+dex2 aplicadas. Operações abaixo são
> EXCLUSIVAS do @devops/@data-engineer (push, PR, migration em prod, flag Vercel).

## O que entra
- Renderer programático de **TIREOIDE** com **escore Domingos calculável**
  (extração classifica enums por eixo → código soma NOTA → TI-RADS → conduta) +
  2 toggles de preferência (Domingos on/off, conduta on/off).
- Spec: `docs/det-5-tireoide-domingos.md`. Catálogo: `docs/catalogo-clinico-exames.md` §TIREOIDE.

## ⚠️ ORDEM DE DEPLOY (crítica)

**A migration `0012` DEVE ser aplicada ANTES de deployar o código.** Motivo: a
consolidação de query (review dex1) fez `resolveAccountReportPreference` rodar em
**TODA geração** (substituiu `resolveAccountVariantKey`), e ela faz
`SELECT renderer_preferences`. Se o código subir antes da coluna existir,
**TODA geração** (não só tireoide) retorna 500.

### Sequência
1. **@data-engineer — migration (prod mobile `yldtkqrsbgcnwlydrrot`):**
   `pnpm --filter @laudousg/db db:migrate` (já inclui `0012_det5_tireoide_renderer_prefs.sql`),
   OU aplicar o SQL direto (additivo, idempotente):
   `ALTER TABLE account_report_preferences ADD COLUMN IF NOT EXISTS renderer_preferences jsonb;`
   ⚠️ NÃO rodar no banco do ORIGINAL (`gimxiyjfuaqptahssqgb`).
2. **@devops — deploy do código:** push da branch → PR → merge → Vercel.
   Seguro assim que a migration rodou; com a flag ainda SEM TIREOIDE, o caminho
   é o writer atual (sem mudança de comportamento) — só a coluna passa a ser lida.
3. **@devops — ligar a flag (Vercel env):**
   `RENDERER_CATEGORIES=ABDOMEN_TOTAL,OBSTETRICA,MORFOLOGICO,TIREOIDE`
   (append de `,TIREOIDE` ao valor atual). Isso ATIVA o renderer da tireoide.
4. **Verificação:**
   - Golden E2E: `GOLDEN_API_URL=https://laudousgmobile.vercel.app GOLDEN_AUTH_TOKEN=… GOLDEN_CASE_FILTER=tireoide pnpm validate:golden:deterministico`
     (token de teste: `golden-runner@laudousg.dev`, ver senha em `/tmp/golden-runner-pw.txt`).
   - 1 laudo real de tireoide em prod (validação do Luiz) — checar título
     "ULTRASSONOGRAFIA DA TIREOIDE [COM DOPPLER COLORIDO]", NOTA/TI-RADS calculados,
     rodapé Domingos+ACR.

### Rollback
Tirar `TIREOIDE` da flag `RENDERER_CATEGORIES` (instantâneo → writer fallback).
A coluna `renderer_preferences` é additiva/inócua; pode ficar.

## Estado dos toggles (sem UI ainda)
A coluna nasce `null` para todos → defaults **Domingos ON / conduta OFF** (= o
comportamento clínico esperado). A UI dos toggles (lab/iOS) é uma onda à parte;
até lá a conduta não aparece (a menos que se faça PATCH manual em
`/api/me/report-preferences` com `renderer_preferences`).

## Arquivos no commit
Renderer/extração: `apps/api/src/server/renderer/categories/TIREOIDE.ts`,
`renderer/extraction.ts`, `pipeline/renderer.ts`. Wiring: `pipeline/bundleLoader.ts`
(comentário), `server/db/lookups.ts`, `app/api/generate/route.ts`,
`app/api/me/report-preferences/route.ts`. DB: `packages/db/src/schema/accountReportPreferences.ts`,
`packages/db/src/migrate.ts`, `packages/db/src/sql/0012_det5_tireoide_renderer_prefs.sql`.
Golden: `tests/golden-deterministico/cases/tireoide-*.json`. Docs: `det-5-tireoide-domingos.md`,
`det-5-tireoide-handoff-devops.md`, `catalogo-clinico-exames.md`, `plano-laudos-deterministicos.md`.

## Notas de qualidade
- `tsc` limpo (api + db). `next lint` 0/0 (quando roda não-interativo).
- Render verificado local em ~25 cenários (escore Domingos vs tabela, override,
  ACR TI-RADS 5, halo só em sólida, múltiplos nódulos, toggles, byte-estável).
- Golden E2E (extração) **não** rodado localmente (precisa OPENAI key + token) —
  rodar no passo 4.
- Pendência aberta (decisão Luiz): dimensão usa a MAIOR das 3 medidas como proxy
  do diâmetro transverso (pode superpontuar nódulo alongado) — aceito por ora.
