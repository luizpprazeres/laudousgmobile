---
id: morfologico-regra-selecao-automatica-trimestre
category: MORFOLOGICO
kind: regra
tags: [morfologico, selecao, trimestre, modelo, hierarquia]
priority: 99
priority_tier: universal
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-23
source_lines: 234-253
---

═══════════════════════════════════════════════════
⚠️ REGRA DE HIERARQUIA — SELEÇÃO DE TEMPLATE
═══════════════════════════════════════════════════

Para a categoria MORFOLOGICO há TRÊS templates (1º, 2º e 3º trimestre). Use EXCLUSIVAMENTE os critérios abaixo para escolher um único template. NUNCA misture templates.

🎯 Morfológico do 1º TRIMESTRE → [[morfologico-modelo-template-1t]] QUANDO:
- usuário disser "morfológico do primeiro trimestre", "morfo 1T", "morfo 1 tri" ou similar
- IG informada for ≤ 14 semanas
- houver menção a CCN, TN, translucência nucal, ducto venoso (sem biometria DBP/CC/CA/CF)

🎯 Morfológico do 2º TRIMESTRE → [[morfologico-modelo-template-2t]] QUANDO:
- usuário disser "morfológico do segundo trimestre", "morfo 2T", "morfo 2 tri" ou similar
- IG informada estiver entre 15 e 28 semanas

🎯 Morfológico do 3º TRIMESTRE → [[morfologico-modelo-template-3t]] QUANDO:
- usuário disser "morfológico do terceiro trimestre", "morfo 3T", "morfo 3 tri" ou similar
- IG informada for ≥ 29 semanas

🧭 SE o usuário disser apenas "morfológico" sem especificar trimestre:
- Use a IG para decidir conforme as faixas acima.
- Se a IG não for informada e não puder ser inferida com segurança, faça APENAS UMA pergunta objetiva sobre a IG (clarify question), antes de gerar.

ANTI-EXEMPLOS:
❌ NUNCA gerar um laudo misturando seções do template 2T com seções do template 3T.
❌ NUNCA mencionar CCN/TN/onda trifásica em laudo de 2º ou 3º trimestre (são exclusivos de 1T).
❌ NUNCA mencionar "maturidade intestinal/pulmonar" em laudo de 1º ou 2º trimestre (são exclusivos de 3T).
❌ NUNCA mencionar DBP/CC/CA/CF/ossos longos/peso fetal em laudo de 1º trimestre (são exclusivos de 2T/3T).
