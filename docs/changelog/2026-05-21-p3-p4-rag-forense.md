---
slug: p3-p4-rag-forense
title: "RAG forense — priority logic + audit de blocos"
date: 2026-05-21
status: shipped
size: epic
tags: [backend, rag, priority, audit, observability]
sprint: P3+P4
related_adrs: [0001]
files_touched: 47
---

## Resumo (leigo)

O coração de qualquer laudo gerado por IA é o que chamamos de RAG: uma biblioteca de "pedaços de texto" que o sistema consulta antes de escrever o laudo. Esses pedaços são regras (como escrever), modelos (estruturas prontas), frases comuns e exceções.

Nesta dupla de sprints, duas coisas grandes aconteceram:

**Primeiro**, ensinamos o sistema a escolher MELHOR quais pedaços usar. Antes ele às vezes deixava de fora regras importantes porque outras pareciam mais relevantes na superfície. Descobrimos um padrão (que chamamos internamente de "priority 75 trick") que resolveu isso de forma elegante — sem perder velocidade.

**Segundo**, ganhamos visibilidade total sobre o que aconteceu em cada laudo gerado. Pra cada laudo, agora salvamos: quais pedaços entraram, com qual nível de relevância (similarity score), e quais ficaram de fora (e por quê). É como uma caixa-preta de avião — se algo deu errado, dá pra fazer autópsia exata.

Esta segunda parte (audit forense) é o que vai permitir o Painel Admin (P7) acontecer.

## Detalhes (técnico)

**P3 — Expansão de RAG pra 5 categorias** (~150 blocks novos em markdown versionado).

Categorias com contracts: OBSTETRICA, PELVE_FEMININA, TIREOIDE, MAMARIA, DOPPLER_OBSTETRICO, ABDOMEN_TOTAL. Total ~487 rows em produção. ADR-0001 §6.10 documenta priority logic em 3 níveis:
- 90-100 universal (sempre entra na quota)
- 75 contextual com vocabulário difícil (entra na quota + LLM filtra no output via header GATILHOS)
- 70 contextual com vocabulário forte (depende de similarity ranking)
- ≤65 opcional/raro

**P4 — Audit forense:** `generation_audit` ganhou colunas `rag_blocks_retrieved` (jsonb) + `rag_blocks_skipped` (jsonb default `'[]'`). RPC `match_knowledge_blocks` retorna similarity propagado pelo retriever. Migration aplicada via Supabase MCP no projeto prod (`yldtkqrsbgcnwlydrrot`) — 68/68 rows existentes preservadas com default.

Quotas vigentes: modelo=2, regra=10, frase=8, conclusao=3, excecao=3, comentario_tecnico=3, exemplo=2 (max 31 blocks por geração).

## Impacto & Próximos passos

Qualidade de laudo subiu mensuravelmente (E2E tests E2E mostrou 100% OK em OBSTETRICA, TIREOIDE, DOPPLER; 86-92% nas outras com bugs sendo caçados sistematicamente). Próximo passo direto: Painel Admin (P7) consumindo o audit pra dar observabilidade visual.
