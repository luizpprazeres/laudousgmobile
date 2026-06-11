# Casos golden estruturais — bundle determinístico (DET-1)

18 casos de ABDOMEN_TOTAL (categoria-piloto), derivados dos padrões dos laudos reais
anonimizados (`_extraction/from-laudousg-original/07-laudos-reais-anonimizados/abdome_total_30d.md`,
266 laudos) e dos 17 ajustes validados da fonte viva (`~/laudousg/lib/categoryDefaults.ts`).

Validam o pipeline NOVO — **nunca** comparação com o RAG (ADR-0004):

| Dimensão | Casos |
|---|---|
| Estrutura (headers na ordem exata) | todos |
| Numeração canônica da conclusão + fechamento numerado | 04, 13 |
| Anti-invenção (negativos) | 01, 16 (e `forbiddenPatterns` em todos) |
| Fidelidade de medidas/lateralidade/termos | 04–07, 09, 11, 13 |
| Placeholder `____` em medida ausente | 14 |
| Algarismo romano em segmento hepático | 09 |
| Exceção "não chamar de cisto simples" | 11 |
| Variante de modelo (Doppler esplâncnico, seleção condicional) | 15 |
| Negação do gatilho da variante ("sem Doppler" → modelo padrão) | 17 |
| Negação pós-posta ("Doppler não foi realizado" → modelo padrão) | 18 |

Rodar: `GOLDEN_AUTH_TOKEN=... pnpm validate:golden:deterministico`
(opcional: `GOLDEN_API_URL` p/ apontar pra local/preview; `GOLDEN_CASE_FILTER` p/ um caso).
Critério de aceite DET-1: 16/16 com `DETERMINISTIC_BUNDLE_CATEGORIES=ABDOMEN_TOTAL` no alvo.

Token: existe um usuário dedicado `golden-runner@laudousg.dev` no Supabase mobile
(criado em 2026-06-11 p/ a suíte; `user_metadata.purpose=golden-suite`). Gerar token:
`POST $SUPABASE_URL/auth/v1/token?grant_type=password` com a senha do usuário
(resetável via admin API com a service role).

Execução de referência (2026-06-11, local + flag ligada, pós-reviews dex1 e dex2):
**18/18 PASS** com o gate `source=deterministic_bundle` ativo; prompt caching
confirmado (`cached_tokens` ≈ 99% do input após a 1ª request).
