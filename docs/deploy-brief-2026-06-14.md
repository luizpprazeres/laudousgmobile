# Brief de Deploy — @devops — 2026-06-14

> Sessão Fable: bugs obstétricos de PROD + MAMARIA aprovada + Pelve + toggles lab
> + DET-6 (fundação). Tudo com typecheck limpo e **73 testes manuais verdes**.

## Resumo executivo
| Frente | O que | Risco | Estado |
|--------|-------|-------|--------|
| 🔴 Obstétrico (prod) | A1 saco gestacional/DSM, A2 unidade, A3 alucinação gemelar | alto (LIVE) | corrigido + testado |
| 🟢 MAMARIA | curadoria Luiz (9 ajustes) + golden 28/28 | médio | aprovado p/ ligar flag |
| 🟢 Pelve | remove "A)" do título (migration 0014) | baixo | já aplicado no DB |
| 🟢 Lab | UI de toggles de renderer em /settings | baixo | validado E2E dev |
| 🟡 DET-6 | operações + integração atrás de flag OFF | nenhum (flag OFF) | fundação |

## Passos de deploy (ORDEM IMPORTA)

1. **Merge do código** (PR desta branch) → Vercel deploya prod.
   - Inclui os fixes obstétricos (OBSTETRICA/MORFOLOGICO) + MAMARIA refinada.
2. **Migration 0014** (Pelve "A)") — JÁ aplicada no DB MOBILE via MCP; o arquivo
   `.sql` + `migrate.ts` vão no merge p/ reprodutibilidade. Nenhuma ação extra.
3. **Env Vercel (projeto laudousgmobile):**
   - `RENDERER_CATEGORIES` → **adicionar `MAMARIA`** à lista (já é programática +
     golden travado). Liga a MAMARIA em prod. **Só após o deploy do código (passo 1).**
   - `COMMAND_OPERATIONS` → **NÃO criar / manter ausente (=OFF)**. DET-6 não ligado.
   - Redeploy após mudar a env (env nova só vale no próximo deploy).

## Validação PÓS-deploy (E2E — só dá em prod/com chave)
- **A2 (unidade):** ditar "CCN 2,4" e "maior bolsão 4,1 cm" → confirmar 2,4 e 4,1
  (NÃO 24 / 41). É a única correção que depende do LLM (prompt), não testável local.
- **A3 (gemelar):** ditar obstétrico de feto único com "maior bolsão 4,1 cm" →
  confirmar SEM "(feto A)" e SEM "ambos os fetos".
- **A1:** obstétrico inicial pedindo o DSM → confirmar que a linha do saco
  gestacional aparece (com valor ou placeholder).
- **MAMARIA:** ditar 1-2 casos reais → conferir extração + render (corpo/conclusão/
  BI-RADS). Regenerar showcase se aplicável.

## Evidências (rodar local: `tsx <arquivo>`)
- `operations.manual.ts` 16/16 · `commandOperations.manual.ts` 6/6 ·
  `commandGuard.manual.ts` 15/15 (regressão) · `obstetrica.manual.ts` 8/8 ·
  `mamaria-golden.manual.ts` 28/28. typecheck shared+api+lab limpo.

## Rollback
- MAMARIA: remover `MAMARIA` de `RENDERER_CATEGORIES` (volta ao writer).
- Obstétrico/MAMARIA código: reverter o merge.
- Migration 0014: idempotente; não há rollback necessário (só removeu prefixo).

## Notas
- Detalhe clínico completo: `docs/curadoria-mamaria-obstetrico-2026-06-14.md`.
- MAMARIA boletim aprovado: `docs/mamaria-boletim-avaliacao.html`.
