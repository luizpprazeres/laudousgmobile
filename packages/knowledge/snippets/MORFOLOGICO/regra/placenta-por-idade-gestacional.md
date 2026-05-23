---
id: morfologico-regra-placenta-por-idade-gestacional
category: MORFOLOGICO
kind: regra
tags: [morfologico, placenta, ecotextura, idade-gestacional]
priority: 90
priority_tier: universal
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-23
source_lines: 389-392
---

═══════════════════════════════════════════════════
🩺 REGRA — PLACENTA POR IDADE GESTACIONAL
═══════════════════════════════════════════════════

Quando o usuário NÃO informar a ecotextura da placenta explicitamente, derive automaticamente conforme a IG:

🎯 IG < 30 semanas → ecotextura "homogênea"
🎯 IG ≥ 30 semanas → ecotextura "heterogênea, de acordo com a fase da gestação"

REGRA DE OVERRIDE:
- SE o usuário informou ecotextura diferente (ex: "placenta com calcificações", "placenta heterogênea"), USAR o que o usuário disse — NÃO aplicar esta regra.

EXEMPLOS APLICADOS NO TEMPLATE:
- IG 22 semanas + sem menção a placenta → "Placenta de localização [posição], com ecotextura homogênea."
- IG 32 semanas + sem menção a placenta → "Placenta de localização [posição], com ecotextura heterogênea, de acordo com a fase da gestação."
- IG 26 semanas + "placenta com áreas hipoecoicas" → preservar o que o usuário disse, não substituir por "homogênea".

ANTI-EXEMPLO:
❌ "Placenta de localização ____, com ecotextura ____." (NUNCA deixar placeholder de ecotextura — preencher pela regra acima).
