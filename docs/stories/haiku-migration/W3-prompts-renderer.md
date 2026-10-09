# W3 — Prompt base "corpo descritivo" + defeitos do renderer do abdome

Terminal: Codex gpt-6.1-sol (low) · Worktree `~/laudousg-wt/prompts` · Branch `fix/corpo-descritivo`
Leia antes: `_comum.md`, a story e `docs/estilo-casa-regras-gerais.md` (regra 2: corpo descritivo).

## 1. Prompt base (aprovado pelo Luiz)

A regra global `apps/api/src/server/prompts/global.ts:45` manda *"Use sempre 'compatível com X'"* sem dizer onde — os
modelos põem o diagnóstico no corpo. Substitua por (texto testado na bancada como B2, em
`scripts/bench-haiku/bench-abdomen.ts`, constantes `REGRA_NOVA_GLOBAL` / `REGRA_NOVA_CONTRATO`), **acrescentando** a ressalva:

> No corpo, descreva SOMENTE o que o médico ditou: não afirme presença nem ausência de fenômeno acústico,
> vascularização ou característica que não foi ditada (ex.: não escreva "sem sombra acústica" se ninguém falou de sombra).

- `prompts/contracts/ABDOMEN_TOTAL.ts:54`: "preferencialmente na CONCLUSÃO" ⇒ "SOMENTE na CONCLUSÃO; o corpo é descritivo".
- Procure em `prompts/` outras instruções que mandem pôr diagnóstico/"compatível com" no corpo ou que conflitem com a
  regra; corrija as óbvias e liste as duvidosas no relatório.
- Depois disto, o cenário `B2` da bancada passa a falhar de propósito (o texto antigo não existe mais): use `B`.

## 2. Defeitos do renderer do abdome (conferidos em 09/10)

`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts` (e o que mais for necessário no renderer do abdome):

1. `:524` — `/distendid/` casa dentro de "hipodistendida" ⇒ "Vesícula biliar distendida" (o oposto). Caso d0bbbb49.
2. `:424` e `:469` — "…, compatível com cisto simples." no **corpo**; idem "compatível com cálculo" (procure todas as
   frases do corpo com "compatível com"). O diagnóstico já está na conclusão — tire do corpo.
3. Achado `tipo: "outro"` (ex. "rim não visualizado", "nefropatia crônica") imprime a frase **normal** do órgão e o achado
   logo abaixo ⇒ "Rim esquerdo tópico, de dimensões dentro dos limites normais…" + "Rim esquerdo não visualizado".
   Casos e4aa867e (agenesia) e 07ade2da. Órgão alterado não pode ter a frase de normalidade que contradiz o achado.
4. `status: "ausente_cirurgico"` no rim imprime rim normal (caso e4aa867e com extração do Luna).

Atualize de propósito os goldens/testes do abdome que mudarem (ex. `renderer/__tests__/abdomen-*`), explicando cada
mudança no commit. Rode `catalog-equivalence.manual.ts` e diga o que mudou na Biblioteca (o modelo do abdome é derivado
do renderer — a web/Biblioteca também usa).

## 3. Verificação na bancada (assinatura)

De `apps/api`: `--category ABDOMEN_TOTAL --scenarios R,A,B` (90 dias) e compare com
`tmp-review/bench-haiku/2026-10-09T15-43-12` (repositório principal): "compatível com" no corpo deve sumir em A e B,
sem novas invenções de fenômeno acústico no B.

## Fora do escopo

`pipeline/*`, `ai/*`, `env.ts`, `renderer/extraction.ts` (W1); prompts de extração obstétrica (W2).

## Entregável

Commits em `fix/corpo-descritivo` + `docs/stories/haiku-migration/W3-relatorio.md` (diff do prompt, cada defeito com
antes/depois, goldens alterados, resultado da bancada).
