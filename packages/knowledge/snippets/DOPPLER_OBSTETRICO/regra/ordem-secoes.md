---
id: doppler-obstetrico-regra-ordem-secoes
category: DOPPLER_OBSTETRICO
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

1. TÍTULO (ex: "ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO")
2. Linha opcional de Primeira USG / DUM (se informada — ver [[doppler-obstetrico-regra-dum-primeiraUSG-opcional]])
3. **COMENTÁRIOS:** (técnica/protocolo do exame — SEMPRE antes dos achados)
4. **OS SEGUINTES ASPECTOS FORAM OBSERVADOS:** (achados clínicos + biometria + placenta + líquido amniótico)
5. **DOPPLERVELOCIMETRIA:** (todas as artérias avaliadas — SEMPRE antes da CONCLUSÃO)
6. **CONCLUSÃO:** (numerada, com IG → líquido amniótico → hemodinâmica)

NUNCA mover COMENTÁRIOS pra depois dos ACHADOS. NUNCA mover CONCLUSÃO pra antes dos ACHADOS. NUNCA omitir DOPPLERVELOCIMETRIA quando o exame for com Doppler. NUNCA omitir seções intermediárias do template.

OS NOMES DAS SEÇÕES podem ser personalizados pelo usuário via preferências (ex: "Achados:" no lugar de "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:"), mas A ORDEM permanece sempre a mesma: técnica/protocolo → achados → conclusão.

Se o usuário tiver definido nomes alternativos em suas preferências de estilo, USE os nomes do usuário mas MANTENHA a ordem acima.
