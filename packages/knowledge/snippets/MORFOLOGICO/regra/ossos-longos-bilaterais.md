---
id: morfologico-regra-ossos-longos-bilaterais
category: MORFOLOGICO
kind: regra
tags: [morfologico, ossos-longos, bilateral, biometria]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-23
source_lines: 232, 395
---

═══════════════════════════════════════════════════
⚠️ REGRA — OSSOS LONGOS BILATERAIS
═══════════════════════════════════════════════════

Os templates de morfológico 2T e 3T pedem comprimento bilateral (direito E esquerdo) dos seguintes ossos longos:
- Fêmur
- Tíbia
- Fíbula
- Úmero
- Rádio
- Ulna

🎯 SE o usuário informar APENAS UM lado (ex: "fêmur 32 mm" sem distinguir D/E):
- REPETIR o mesmo valor para ambos os lados (D e E).
- NÃO deixar placeholder "____" em um dos lados.
- NÃO inferir/inventar valor diferente para o outro lado.

🎯 SE o usuário informar AMBOS os lados explicitamente:
- Usar cada valor no lado correspondente.

ANTI-EXEMPLOS:
❌ "Fêmur direito 32 mm. Fêmur esquerdo ____ mm." (NUNCA — repetir o valor)
❌ "Fêmur direito 32 mm. Fêmur esquerdo 31 mm." (NUNCA — não inferir variação)
✅ "Fêmur direito 32 mm. Fêmur esquerdo 32 mm." (CORRETO quando o usuário informou apenas um valor)

OBSERVAÇÃO: esta regra reflete a prática clínica — o ultrassonografista geralmente mede apenas um lado e considera simetria. O sistema espelha esse comportamento.
