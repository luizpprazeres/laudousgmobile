# Writer V2 — critérios de aceitação e testes de regressão (avaliação médica do Luiz)

**Origem:** análise do Dr. Luiz sobre o experimento de 3 braços (24/07). Correção de rumo importante: **o julgamento automatizado (Fable + Codex) elegeu o V2 por flexibilidade genérica, mas a avaliação MÉDICA mostrou que só o renderer (braço A) acertou o padrão.** Conclusão correta: *o V2 tem mais potencial de flexibilidade; o renderer tem mais fidelidade ao padrão médico/editorial.* O **renderer é a referência de produção e a especificação prática do estilo.**

> Princípio de governança: **nenhuma migração antes de o V2 igualar/superar o renderer nos casos que o renderer já domina.** Os erros do writer viram regras + testes de regressão. O renderer (braço A) é o GABARITO.

## Regras destiladas (do renderer + correções do Luiz) — já codificadas em `universalCoreV2.ts`

| # | Regra | Erro do writer no experimento | Onde |
|---|---|---|---|
| R1 | **Corpo = morfologia, não diagnóstico.** No corpo não usar os substantivos "cálculo/cisto/esteatose/litíase/nódulo" — descrever a imagem. | Writer escreveu "contendo cálculo móvel" no corpo. | núcleo |
| R2 | **Ordem da descrição:** ecogenicidade → margens/contornos → medidas → localização → outras (mobilidade/sombra/vascularização). | — (princípio geral, faltava explícito) | núcleo |
| R3 | **Medidas:** 1 dimensão = "medindo 1,2 cm"; 2+ = "medindo 1,5 x 2,3 x 2,7 cm". Preferir "medindo" a "de X". | Writer usou "de 8 mm". | núcleo |
| R4 | **Conclusão sintetiza; NUNCA repete** medida/localização/ecogenicidade/margens/morfologia do corpo. | Writer repetiu na conclusão "medindo 2,3 cm, com halo… aspecto em alvo". | núcleo |
| R5 | **Numeração:** item único SEM número; 2+ numerados. | Writers numeraram item único / inconsistente. | núcleo + contrato |
| R6 | **Fechamento abdominal verbatim:** último item = "**Demais** órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas." | Writer omitiu "Demais" / alterou a frase. | contrato abdome |
| R7 | **Normal total verbatim:** "Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas." (item único, sem número). | — | contrato abdome |
| R8 | **Terminologia diagnóstica verbatim** (o writer não escolhe sinônimo): "Litíase da vesícula biliar" (não "colelitíase"); "Litíase renal {lado}" (não "nefrolitíase"); "Esteatose hepática". | Writer usou "colelitíase". | contrato abdome |
| R9 | **Diagnóstico provável:** "…cujo diagnóstico mais provável é X." (formulação cadastrada; o renderer acertou "área poupada da esteatose"). | Writers repetiram a descrição em vez de sintetizar. | núcleo |
| R10 | **Não inventar grau/severidade** não ditados ("grau leve"). | A e B inventaram "grau leve" na esteatose. | núcleo (fidelidade atômica) |
| R11 | **Omitir em vez de deixar "____".** | Renderer (A) deixou "____"; V2 já resolve. | núcleo |
| R12 | **Cumprir pedido de ajuste** (posição/numeração/omitir seção). | Renderer (A) ignorou; V2 já resolve. | núcleo |

> Nota: R11 e R12 são pontos em que o **V2 já é melhor que o renderer** — a meta é somar R11/R12 (força do writer) SEM perder R1–R9 (força do renderer).

## Comportamento correto do renderer a preservar (gabarito)
- Pâncreas não visualizado por gases: "Pâncreas visualizado parcialmente devido à interposição de gases intestinais." (o writer já acertou).
- Auto-correção de lateralidade ("aliás é o direito"): vale a última versão (todos acertaram).

## Corpus de regressão (gabarito = saída do renderer, braço A)
Casos que o renderer domina e o V2 precisa igualar (do experimento): 1-Normal, 2-Alteração frequente (esteatose+cálculo vesícula), 3-Achado incomum (imagem em alvo seg VII), 7-Contradição (cálculo 8 mm), 8-Ambiguidade. + os casos onde o V2 já ganha: 4-Pedido de ajuste, 8/11-placeholder/unidade.
**Método objetivo:** gerar o V2 e comparar contra a saída do renderer (gold) para os MESMOS ditados; um caso "passa" quando o V2 satisfaz R1–R12 (checklist), não quando "parece bem escrito".

## Sobre latência (seção 10 do Luiz)
A comparação de tempo do experimento **NÃO foi apples-to-apples**: o braço A (renderer) rodou pelo endpoint de PROD (pipeline completo: structurer + guards + DB + rede + possível cold start), enquanto B/C foram chamadas ÚNICAS diretas ao modelo. Logo, "A mais lento" não indica arquitetura mais lenta. Benchmark correto (pendente): mesmas condições, N execuções, mediana + p95, nº de tokens, nº de chamadas, validações e retries.

## Próximos passos
1. Endurecer o núcleo com R1–R10 (FEITO — `universalCoreV2.ts`).
2. Re-rodar o V2 nos casos-gabarito e verificar convergência com o renderer (em curso).
3. Iterar núcleo/contrato até o V2 satisfazer R1–R12 nos casos dominados.
4. Só então: checador de fidelidade ditado→laudo + wire `writerProfile=v2` (flag OFF) + benchmark de latência justo.
