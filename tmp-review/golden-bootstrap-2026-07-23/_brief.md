# Brief comum — golden cases das categorias bloqueadas (Frente 3, 23/07/2026)

## Objetivo
Gerar **3 laudos-base completos** da categoria designada, para revisão do Dr. Luiz. Depois de corrigidos, viram few-shots/golden cases do writer. São laudos SINTÉTICOS (nenhum dado real de paciente).

## Composição dos 3 laudos
1. **Caso normal** — exame sem alterações, o laudo-modelo "limpo" da categoria.
2. **Caso patológico frequente** — a patologia mais comum da categoria no dia a dia.
3. **Caso patológico relevante** — outra patologia importante (idealmente uma que exercite regra/exceção do repertório, p.ex. a que exige conduta ou urgência).

## Fontes OBRIGATÓRIAS (ler antes de escrever)
1. `docs/estilo-casa-regras-gerais.md` — regras transversais da casa (vocabulário, corpo × conclusão, conduta, lateralidade, títulos Doppler §8b, notas por categoria §8).
2. `docs/prompt-categoria-livre-2026-07-22.md` — estrutura e os "NÃOs".
3. `packages/knowledge/snippets/<CATEGORIA>/` — TODOS os .md (modelo, regras, frases, conclusões, exceções). O laudo deve ser COERENTE com esse repertório (frases canônicas quando existirem).
4. `_extraction/from-laudousg-original/03-models-by-category/<CATEGORIA>.md` e `04-rules-by-category/<CATEGORIA>.md` — quando existirem (referência canônica do sistema original; NÃO copiar cegamente se conflitar com o estilo-casa mais novo — estilo-casa vence).

## Regras de ouro (resumo do estilo-casa — o doc completo vence)
- Estrutura: TÍTULO em caixa alta → `COMENTÁRIOS:` (método/transdutor) → `OS SEGUINTES ASPECTOS FORAM OBSERVADOS:` → `CONCLUSÃO:`.
- Corpo DESCREVE a imagem; diagnóstico SÓ na conclusão. Nunca "compatível com X" no corpo.
- `hipoecoico/isoecoico/hiperecoico/anecoico` — NUNCA "ecogênico". "Imagem" em vez de "nódulo" na descrição. "processo expansivo primário/secundário" — NUNCA "neoplasia".
- Sem redundância: líquido já é anecoico; "sólida hipoecoica" → "hipoecoica"; não repetir corpo na conclusão.
- Conclusão: item único sem número; múltiplos `1) 2) 3)`.
- Conduta (quando couber): "Convém, a critério clínico, …, com objetivo de …". Urgência vascular: "Oriento o paciente quanto à necessidade de avaliação especializada do cirurgião vascular de urgência."
- Títulos Doppler: "ULTRASSONOGRAFIA DOPPLER …" (sem "COM"). Carótidas: "ULTRASSONOGRAFIA DOPPLER DE CARÓTIDAS E VERTEBRAIS", sempre bilateral, linha em branco entre lados, PSV/IR da externa também.
- Medidas em cm com vírgula decimal ("2,3 x 1,2 cm"); usar mm quando pequeno e usual na categoria.
- Texto corrido, sem markdown/negrito/asterisco no laudo.

## Formato de saída (arquivo <CATEGORIA>.md neste diretório)
```
# <CATEGORIA> — laudos-base para revisão

## Caso 1 — Normal
<laudo completo>

## Caso 2 — <patologia>
<laudo completo>

## Caso 3 — <patologia>
<laudo completo>

## Notas para o Dr. Luiz
- <decisões tomadas, dúvidas, pontos onde o repertório era ambíguo — máx. 6 bullets>
```
