---
id: pelve-feminina-regra-modelo-pos-abortamento
category: PELVE_FEMININA
kind: regra
tags: [pelve-feminina, abortamento, produtos-retidos, modelo-d, pos-abortamento]
priority: 70
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 925-928
---

GATILHOS DE APLICAÇÃO:
- abortamento
- produtos retidos
- material intracavitário
- imagens hiperecoicas amorfas

REGRAS DO MODELO D
- Se não houver saco gestacional e não houver material intracavitário, concluir: Ausência de produtos retidos da concepção.
- Se houver material intracavitário descrito como imagens hiperecoicas amorfas, concluir: {quantidade} quantidade de produtos retidos da concepção.
- {pequena/moderada/grande} deve ser informada pelo usuário; se não informada, usar "moderada" como padrão.
