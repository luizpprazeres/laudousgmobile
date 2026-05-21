---
id: tireoide-regra-doppler-informado
category: TIREOIDE
kind: regra
tags: [tireoide, doppler, titulo, vascularizacao, pico-sistolico]
priority: 70
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 715-717,724-728,737-739
---

GATILHOS DE APLICAÇÃO:
- Doppler
- vascularização
- pico sistólico
- artéria tireoidiana

1) TÍTULO
- Se o usuário disser que é exame com Doppler, use: ULTRASSONOGRAFIA DE TIREOIDE COM DOPPLER
- Se não mencionar Doppler, use: ULTRASSONOGRAFIA DE TIREOIDE

3.1. LOBOS E ISTMO – EXAME NORMAL
"Lobo direito medindo A x B x C cm (volume de Vd ml), de ecogenicidade, ecotextura e vascularização normais."
"Lobo esquerdo medindo D x E x F cm (volume de Ve ml), de ecogenicidade, ecotextura e vascularização normais."
"Istmo medindo G x H x I cm (volume de Vi ml), de ecogenicidade e ecotextura normais."
Se for exame sem Doppler, não cite "vascularização" na descrição dos lobos.

3.4. DOPPLER (APENAS QUANDO O USUÁRIO INFORMAR)
"Pico sistólico da artéria tireoidiana inferior direita de X cm/s."
"Pico sistólico da artéria tireoidiana inferior esquerda de Y cm/s."
