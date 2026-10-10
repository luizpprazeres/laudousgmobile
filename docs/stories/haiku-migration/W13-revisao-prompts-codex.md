# W13 — Revisão independente das mudanças de prompt (Codex gpt-6.1-sol, esforço medium)

Worktree: `~/laudousg-wt/revisao-prompts` · Branch: `chore/revisao-prompts-codex` a partir de `feat/haiku-migration`.
Leia `_comum.md` e a story. **Você revisa; não altera código de produção.** Entregável é um documento.

## O que revisar

Todas as mudanças de prompt entre `origin/main` e `feat/haiku-migration` (rodadas W1, W2/W5, W3, W7, W9, W10a/b/c):

```bash
git diff origin/main...feat/haiku-migration --stat -- apps/api/src/server/prompts apps/api/src/server/renderer/categories apps/api/src/server/pipeline/*Writer*.ts apps/api/src/server/pipeline/writer.ts apps/api/src/server/ai/llm.ts
```

Foco: `prompts/global.ts`, `buildSystemMessage.ts`, `styles.ts`, `universalCoreV2.ts`, `prompts/contracts/*`, prompts dedicados
(`MUSCULOESQUELETICO.ts` — `buildMskWriterSystemMessage`; `PELVE_FEMININA.ts` — `buildPelveWriterSystemMessage`;
`PARTES_MOLES.ts`), few-shots (`*Fewshots.ts`), prompts de extração (`OBSTETRICA.ts`, `MORFOLOGICO.ts`, `TIREOIDE.ts`), as
regras comuns do motor (`ai/llm.ts`: `EXTRACTION_TEXT_RULE`, `WRITER_OUTPUT_RULE`) e o bloco "EXAME ESCOLHIDO" (`writer.ts`).

## Critérios

1. **Contradições** entre camadas (global × contrato × estilo × biblioteca × few-shots) e entre categorias.
2. **Regras da casa aprovadas pelo Luiz** respeitadas em todas as camadas: corpo descritivo; hipótese "que tem como
   diagnóstico mais provável…"; mama normal = BI-RADS 1 e axilas só se citadas; "sem evidência de rotura" em tendão alterado
   (MSK); documentação fotográfica "obtida segundo protocolo" (sem "em 06 fotos"); numeração da conclusão por laudo;
   vocabulário (hipoecoico/hiperecoico/anecoico, nunca -ecogênico); sem conduta não ditada.
3. **Ambiguidade e prolixidade**: instruções que o modelo pode ler de dois jeitos; repetições; regras de uma categoria
   vazando para outra. O objetivo do Luiz é o prompt **mais enxuto possível** sem perder informação.
4. **Risco de invenção**: qualquer regra que empurre o modelo a afirmar normalidade, medida, fenômeno ou classificação
   não ditados. Exemplo real de 10/10 (smoke da pelve com Sonnet, ditado sintético): "ovários normais, o direito com
   5,2 cm³ e o esquerdo 4,8 cm³" saiu com `[REVISAR]` nas medidas e "apresentando imagens anecoicas" **não ditado**;
   mioma "FIGO 4" sem a classificação no corpo; "Útero de [REVISAR: volume…]" na conclusão. Ache a causa no prompt.
5. **Regressão para a obstetrícia** (o prompt global deve ser byte a byte o de antes para a família obstétrica).

## Entregável

`docs/reviews/2026-10-10-revisao-prompts-codex.md` (commitado na sua branch): achados por severidade (crítico / alto /
médio / baixo), cada um com `arquivo:linha`, o trecho, por que é problema e a correção proposta (diff curto). Status em
`tmp-review/haiku-migration/status/W13.md`. Nada de push/deploy/banco.
