# DET-2 — Categorias grandes (saneamento + variantes) — CONCLUÍDO

> Aplicado em 2026-06-11 no DB mobile (`yldtkqrsbgcnwlydrrot`). Reversível (status).
> Decisão de fonte canônica: **MESCLAR** (curadoria mobile validada prevalece;
> semear da fonte só o complementar). Análises/SQLs gerados por dex1+dex2,
> verificação cruzada adversarial, correções e aplicação por mim.

## Categorias migradas (7) + as 5 pequenas + ABDOMEN = 13 no bundle

| Categoria | Modelos/estilo | Variantes | Validação |
|---|---|---|---|
| TIREOIDE | 2 | padrao / doppler | golden 2/2 |
| MAMARIA | 1 | padrao (OBJETIVO recebeu seed próprio) | golden 1/1 |
| CERVICAL | 1 | — (Robbins preservado, decisão Luiz) | golden 1/1 |
| OBSTETRICA | 2 | inicial / padrao (default padrao) | golden 2/2 |
| DOPPLER_OBSTETRICO | 1 | — | golden 1/1 |
| MORFOLOGICO | 3 | 1t / 2t / 3t (default 2t, decisão Luiz) | golden 2/2 |
| PELVE_FEMININA | 4 | ta / tv / ta-tv / pos-abortamento (default ta-tv) | golden 3/3 |

**Suíte completa: 35/35 golden** com as 13 categorias na flag. Prompt caching
~99%. DET-1 (ABDOMEN) preservado.

## Engenharia central: seletor de variante generalizado

`bundleLoader.ts` ganhou seleção multi-way por tag `variant:<chave>` (commit
`70bb9ab`), substituindo o tag-binário do DET-1. Cada modelo conflitante leva
`variant:<chave>`; o seletor escolhe 1 por ditado (rules ordenadas trigger +
negation; senão defaultVariant). Gates: exatamente 1 modelo/estilo após
seleção (BUNDLE_MODEL_AMBIGUOUS se >1; BUNDLE_VARIANT_EMPTY se a escolhida não
existe). 20/20 casos unitários de seleção (incl. negações "não é primeiro
trimestre" → 2t, "sem doppler" → padrao, "nega aborto" → tv).

## Verificação cruzada (registro)

- `det-2-verificacao-dex1-audita-dex2.md`: achou MAMARIA OBJETIVO sem modelo
  (FATAL), PELVE/TIREOIDE sem seletor no bundle.
- `det-2-verificacao-dex2-audita-dex1.md`: achou MORFOLOGICO 3 modelos juntos
  (FATAL), OBSTETRICA 2 modelos juntos.
- Todos corrigidos antes da aplicação (seletor generalizado + seeds OBJETIVO +
  tags variant:).

## Pendências (fora deste lote)

- **Caminho vetorial normativo** (quotas por kind, overrides `modelo:12`, RPC
  `match_knowledge_blocks`): mantido INTACTO de propósito enquanto a flag
  controla o rollout — é o fallback de rollback. Remoção física após o bundle
  estável em produção (sub-item do DET-2, registrado).
- Categorias ativas SEM volume real (ABDOMEN_SUPERIOR, GLANDULAS_SALIVARES,
  DOPPLER_ARTERIAL_MMII, etc.): não saneadas, seguem no RAG. Drift alto no
  `diff:bundle` é esperado (não migradas). Entram em ondas futuras se ganharem uso.
- Drift residual nas 7 grandes vs fonte viva: legítimo (curadoria mobile rica
  diverge da fonte enxuta — decisão mesclar). Allowlists dos dex mescladas
  (`diff-allowlist.json`, 123 entradas).

## Aplicação

`scripts/apply-det2-sql.mjs` — aplicador transacional com snapshot e verificação
de invariantes (≥1 modelo/estilo, variantes distintas, sem ambiguidade).
Os 7 `docs/det-2-sql-*.sql` ficam como registro do que foi aplicado.
