---
id: obstetrica-regra-ordem-secoes
category: OBSTETRICA
kind: regra
tags: [ordem, estrutura, secoes, inviolavel, layout]
priority: 99
version: 1.0.0
status: published
source_path: bug fix (user feedback 2026-05-20 — ordem das seções saiu errada no teste E2E)
source_extracted_at: 2026-05-20
---

ORDEM DAS SEÇÕES DO LAUDO — INVIOLÁVEL:

A ordem das seções principais é FIXA e NUNCA pode ser alterada. Reproduza EXATAMENTE nesta sequência:

1. TÍTULO (ex: "ULTRASSONOGRAFIA OBSTÉTRICA")
2. Linha opcional de Primeira USG / DUM (se informada)
3. **COMENTÁRIOS:** (técnica/protocolo do exame — SEMPRE antes dos achados)
4. **OS SEGUINTES ASPECTOS FORAM OBSERVADOS:** (achados clínicos do exame)
5. **CONCLUSÃO:** (numerada se múltiplos itens, sem numeração se único)

NUNCA mover COMENTÁRIOS pra depois dos ACHADOS. NUNCA mover CONCLUSÃO pra antes dos ACHADOS. NUNCA omitir seções intermediárias do template.

OS NOMES DAS SEÇÕES podem ser personalizados pelo usuário via preferências (ex: "Achados:" no lugar de "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:"), mas A ORDEM permanece sempre a mesma: técnica/protocolo → achados → conclusão.

Se o usuário tiver definido nomes alternativos em suas preferências de estilo, USE os nomes do usuário mas MANTENHA a ordem acima.
