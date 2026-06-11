# DET-1 — Saneamento ABDOMEN_TOTAL (knowledge_blocks × fonte viva)

> Executado em 2026-06-11 contra o DB mobile (`yldtkqrsbgcnwlydrrot`).
> Fonte de verdade: `~/laudousg/lib/categoryDefaults.ts:403-592` + `~/laudousg/lib/globalRules.ts` (leitura apenas).
> Reversível: todo arquivamento é `status='archived'` → voltar a `'validated'` desfaz.

## Critério

O bundle determinístico carrega **TODOS os blocos `validated`** da (categoria, estilo) — sem
embedding, sem quota. Logo, blocos que duplicam o contrato hardcoded
(`apps/api/src/server/prompts/contracts/ABDOMEN_TOTAL.ts`) ou duplicam outros blocos viram
**repetição literal no prompt**. A fragmentação que existia (pedaços do modelo como `frase`,
conclusões re-extraídas das regras) era band-aid para o retriever vetorial recuperar
"o pedaço certo" — desnecessária e nociva no bundle completo.

## Mantidos (11 blocos × 4 estilos) — o bundle

| Kind | Título | Prio | Cobre (fonte viva) |
|---|---|---|---|
| modelo | abdomen-total-modelo-template-padrao | 100 | MODELO-BASE PADRÃO |
| modelo | abdomen-total-modelo-template-doppler-esplancnico | 70 | MODELO ALTERNATIVO (Doppler esplâncnico) — **condicional, nunca junto com o padrão** |
| regra | abdomen-total-regra-preservar-terminologia-do-medico | 94 | curadoria mobile (sem equivalente no contrato) |
| regra | abdomen-total-regra-frases-normais-quando-omitido | 93 | curadoria mobile (sem equivalente no contrato) |
| regra | abdomen-total-regra-figado-variantes | 75 | ajustes 1–5 |
| regra | abdomen-total-regra-rins-variantes | 75 | ajustes 9–11 |
| regra | abdomen-total-regra-vesicula-e-vias-biliares-variantes | 75 | ajustes 6, 7, 16 |
| regra | abdomen-total-regra-aorta-ateromatose | 70 | ajuste 8 |
| regra | abdomen-total-regra-derrames-bexiga-e-doppler | 70 | ajustes 12–14 |
| regra | abdomen-total-regra-opcoes-baco-pancreas | 70 | regra geral 11 (gases) + ajuste 15 |
| conclusao | abdomen-total-conclusao-fechamento-com-achados | 92 | ajuste 17 + regra de numeração do fechamento (curadoria estendida) |

Cobertura da fonte viva: FUNÇÃO/OBJETIVO/REGRAS GERAIS 1–11/REGRAS DE ESTILO/CHECKLIST/SAÍDA
→ contrato hardcoded; MODELO-BASE + MODELO ALTERNATIVO → blocos `modelo`; AJUSTES 1–17 →
blocos `regra`/`conclusao`. **100% coberto, zero duplicação.**

## Arquivados (16 títulos, 61 linhas)

| Título | Motivo |
|---|---|
| regra-funcao-e-regras-gerais (p99) | Duplica o contrato hardcoded verbatim (contrato é injetado primeiro no system message) |
| regra-estilo-checklist-e-saida (p98) | Duplica REGRAS DE ESTILO/CHECKLIST/SAÍDA do contrato |
| regra-baco-pancreas-uma-opcao (p92) | Subconjunto literal de regra-opcoes-baco-pancreas |
| frase-figado-e-porta-normal (p90) | Fragmento literal do modelo-base |
| frase-vesicula-vias-biliares-normal (p89) | Fragmento literal do modelo-base |
| frase-baco-pancreas-normal (p88) | Fragmento literal do modelo-base |
| frase-rins-vasos-bexiga-normal (p87) | Fragmento literal do modelo-base |
| frase-derrame-pleural (p72) | Duplica ajuste 12 (regra-derrames-bexiga-e-doppler) |
| frase-volume-pre-miccional (p70) | Duplica ajuste 13 (idem) |
| conclusao-conclusao-normal (p90) | Duplica a CONCLUSÃO do modelo-base |
| conclusao-figado-variantes (p70) | Extrato "Na conclusão:" da regra-figado-variantes |
| conclusao-rins-e-derrames (p70) | Extrato da regra-rins-variantes + ajuste 12 |
| conclusao-vesicula-vias-biliares-e-aorta (p70) | Extrato das regras de vesícula/aorta |
| excecao-achado-cistico-renal-complexo (p96) | Duplica ajuste 10, contido integralmente na regra-rins-variantes |
| excecao-opcoes-do-modelo-alternativo (p95) | **Mistura de variantes**: injeta linhas do modelo ALTERNATIVO (opções com travessão) no contexto do modelo padrão — exatamente o conflito que o DET-1 elimina. Conteúdo já existe no modelo doppler + ajuste 15 |
| "Colecistectomia" (draft, estilo CLASSICO) | Resto de seed antigo (`seed:abdomen_total_v1`), nunca validado; coberto pelo ajuste 16 |

## Variantes conflitantes — seleção condicional

`modelo-template-padrao` × `modelo-template-doppler-esplancnico` **nunca entram juntos**.
Seleção explícita por chave no `bundleLoader.ts`: ditado contém gatilho Doppler
(`doppler` / `esplâncnico`) → entra SÓ o modelo Doppler; senão → SÓ o padrão.
No DET-3 isso vira `report_template_variants` (entidade de 1ª classe).

## Divergências registradas (não tocadas)

1. **Colédoco alargado** — bloco diz "acima dos limites habituais"; fonte viva diz "acima dos
   limites usuais em sua porção intrapática" (termo truncado/ambíguo no original — "intrapática"
   não existe; seria intra-hepática ou intrapancreática). Curadoria do bloco evitou o termo
   ambíguo deliberadamente. Mantido o bloco; o diff-script do DET-2 deve dar allowlist a esta
   divergência ou o Luiz corrige o original.
2. **Contrato TS × fonte** — o contrato hardcoded omite "em 12 fotos"/"em 16 fotos" dos
   COMENTÁRIOS. Os blocos `modelo` (que são o que aparece no laudo) mantêm o texto da fonte.
   Sem ação.
