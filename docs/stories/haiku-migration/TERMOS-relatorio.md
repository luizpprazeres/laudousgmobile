# TERMOS — decisões do Luiz de 10/10 (itens 1, 2, 4 e 5) — relatório

Branch `feat/termos-luiz` (base `f7b4b382`). Fonte: `DECISOES-LUIZ-2026-10-10.md`, seção Termos. Sem LLM, banco só leitura,
sem push/deploy/env. Item 3 (compartimentos em romano) já estava assim e não mudou. Item 6 (keyterms) entra no pacote de deploy
do W1. Golf ball fora até o Luiz confirmar.

## O que mudou

| Item | Onde | Como |
|---|---|---|
| 1. "ecogênico(a)" sozinho → "hiperecoico(a)" | léxico da casa (app), frases fixas da web, snippets e proposta de SQL da Biblioteca, frases do catálogo da API | entrada `ecogenico-sozinho` (ditado e saída). "ecogenicidade" não casa. **Fora**: toda a obstetrícia (OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO, CERVICOMETRIA), qualquer "… intracardíaco" e o comparativo "mais/menos/pouco/tão ecogênico". A obstetrícia sai por categoria porque o golf ball aparece nos finais também sem "intracardíaco" ("Foco ecogênico no ventrículo esquerdo"). |
| 2. "bolsa" → "bursa" (MSK) | léxico (MSK) | entrada `bolsa-para-bursa`, só MUSCULOESQUELETICO/_V2/_RARAS. Fora do MSK "bolsa" é escrotal, vertical (líquido amniótico) ou de Blake e fica. |
| 4. "modificação do padrão ecotextural" (MSK) | léxico (MSK), few-shot do writer MSK, web | entrada `modificacao-padrao-ecotextural`: "alteração ecotextural", "alteração da/na ecotextura", "alteração do/no padrão ecotextural", com adjetivo no meio ("alteração difusa do padrão…") e no plural. Tireoide e abdome ficam como estão. |
| 5. "-ecogênico" nas frases fixas | web `apps/web/src/lib/deterministic/organs/*` (15 arquivos), `apps/web/src/lib/catalog/*ParaCatalogo.ts` (3), `packages/shared/src/clinicalModels` (temporais, fístula AV), `packages/knowledge/snippets` (22 arquivos), `renderer/catalog/alteracoes` da API (mama, pelve, tireoide: saem pela rota do catálogo, que não passa pelo léxico) | só formas acentuadas no código (as chaves sem acento como `'hiperecogenica'` não mudam); snippets e Biblioteca pela MESMA função do app (`aplicarLexico`, camada saída, categoria do bloco). |

Caixa: o léxico passou a manter a caixa alta inteira ("HIPOECOGÊNICO" → "HIPOECOICO"; antes saía "Hipoecoico").
Rollback de cada entrada sem deploy: `LEXICO_DESLIGADAS=ecogenico-sozinho,bolsa-para-bursa,modificacao-padrao-ecotextural`.

## Medição nos laudos históricos (sem LLM; 869 com final, 180 dias)

`lexico-validacao.ts` (camada saída no gerado × final assinado) e `termos-contexto.ts` (contextos por coluna):

| Entrada | Trocas no gerado | Médico fez igual | Médico assinou o original | Reescrito | Trocas num final | No ditado |
|---|---|---|---|---|---|---|
| ecogenico-sozinho | 1 | 0 | 1 | 0 | 1 | 3 |
| bolsa-para-bursa | 16 | 0 | 15 | 1 | 16 | 10 |
| modificacao-padrao-ecotextural | 108 | **38** | 60 | 10 | 64 | 4 |

Toda troca listada é exatamente a forma da decisão: "material ecogênico" (MSK), "Bolsa(s)/bolsas sinoviais" (MSK), "alteração
(do padrão) ecotextural / da ecotextura" (MSK). Em 38 laudos o médico já tinha trocado à mão "alteração" por "modificação" (e chega
a ditar "da ecotextura escreva modificação do padrão ecotextural"). Nenhuma troca em obstetrícia: os 4 "foco ecogênico" do período
são golf ball e ficaram.

## Biblioteca no banco — proposta, NÃO aplicada

`TERMOS-biblioteca-proposta.sql` (+ `.json` com as trocas por bloco), gerada por `scripts/bench-haiku/termos-biblioteca.ts --sql`:
**75 de 1106 blocos validados**, só trocas do léxico (ecogenico-para-ecoico 72, ecogenico-sozinho 52, bolsa-para-bursa 12,
ecoico-sem-acento 6, compartimento-romano 4 — "1º compartimento" → "I" no modelo MSK). Nenhum bloco obstétrico.
Guardas: um `DO` numa transação; cada UPDATE exige `id` + `status = 'validated'` + `md5(content)` igual ao lido hoje e
confere `row_count = 1`, senão aborta tudo. `version + 1`, `updated_at = now()`. O embedding não é recalculado (troca de uma
palavra; reingestão opcional). Aplicar só com GO.

## Fora de propósito (para o Luiz/orquestrador)

- **Golf ball**: "foco ecogênico intracardíaco" e toda a obstetrícia intactos no léxico, nos snippets e no SQL. Se o Luiz confirmar,
  basta tirar `categoriasFora` da entrada (e o `(?!\s+intracard)`), mais o snippet obstétrico em produção.
- Calculadora TI-RADS da web (`lib/calculators/tiRads.ts`, "Focos ecogênicos: …") e o rótulo do painel da tireoide: é o nome do
  descritor ACR, não frase de laudo — não mexi.
- Renderers e prompts da API fora do catálogo: a saída do `/api/generate` já passa pelo léxico; não mexi para não mudar goldens.

## Gates

typecheck api/web/shared ✓ · `lexicoDaCasa` 99 ✓ (positivos e negativos de cada entrada, golf ball, obstetrícia, escrotal,
comparativo, rollback, idempotência) · web `pnpm test` 73 suítes ✓ (5 testes com a frase nova) · shared clinicalModels 3/3 ✓ ·
`msk-writer-prompt` 31 ✓ · `msk-descritores-lados` 25 ✓ (expectativa atualizada para a frase nova da web) · demais suítes do
catálogo e do renderer: mesmas falhas da base `f7b4b382` (dependem de banco/servidor local ou já falhavam), nenhuma nova.
