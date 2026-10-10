# W14 — Correções da revisão independente (W13, Codex)

Fonte: `docs/reviews/2026-10-10-revisao-prompts-codex.md` (achados com `arquivo:linha`, trecho e diff proposto). Leia o
achado inteiro antes de corrigir. Método: corrigir de forma enxuta, sem acrescentar regra onde basta trocar uma; teste
determinístico do cenário sintético do achado; replay/placar da categoria; juiz só se a mudança for grande (concorrência 2).

## Decisão do orquestrador sobre o A01

As regras da casa aprovadas pelo Luiz ("corpo descritivo", "que tem como diagnóstico mais provável…") valem para todas as
categorias, inclusive a família obstétrica — não congelar o global obstétrico no texto de `origin/main`. Corrigir só o
vazamento da regra **da mama** (axilas/BI-RADS) para o global comum: ela vai para o contrato da mama.

## Distribuição

| Frente (terminal) | Achados |
|---|---|
| **W4** (Opus) — pelve e MSK | A02, A03 (FIGO só se ditado; curar o few-shot), auditoria da pelve que não detecta invenção (`pelveWriterAudit.ts`, sonda do W13), A09, M01 (few-shots do MSK). **Não mexer em A04 e A08** (decisão pendente do Luiz). Depois: W12 (FIGO, web + mobile). |
| **W10c** (Opus) — mama e tireoide | A05, A06 (com a W10b, que é dona do global), A07, A12. |
| **W10b** (Opus) — global, abdome, partes moles | A01 (mover a regra da mama para o contrato), A06 (parte global), parte global do A10 ("ou o contrato da categoria mandar"), M01 (few-shots de partes moles), M02, M03 (léxico hipoecoico/hiperecoico/anecoico uma vez por prompt efetivo, inclusive dedicados — coordene com W4 para o MSK/pelve), B01. **Não mexer em A10 (catálogo de partes moles) nem A11** (decisão pendente). |
| **W1** (Opus) — motor | A13 (`ai/llm.ts`, regra comum de extração); consertar os gates `writerHardening.manual.ts` (baseline SHA desatualizado) e `obstetricaPlainWriter.manual.ts` (`earlyWriterV2Allowed`) — confirmar se a falha já existia em `origin/main`. |

## Pendentes do Luiz (não implementar ainda)

A04 (endométrio "normal para a fase do ciclo" com espessura ditada), A08 (ditado só-diagnóstico → morfologia típica no corpo,
MSK/partes moles), A10 ("Correlacionar com dados clínicos" automático no catálogo de partes moles), A11 (esteatose
moderada/acentuada com atenuação e visualização parcial automáticas).

Status em `status/<W>.md` com a linha `W14: pronto` quando terminar. Branch: a sua, a partir de `feat/haiku-migration`
atualizado. Nada de push/deploy/banco.
