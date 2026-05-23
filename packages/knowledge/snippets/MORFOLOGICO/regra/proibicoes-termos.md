---
id: morfologico-regra-proibicoes-termos
category: MORFOLOGICO
kind: regra
tags: [morfologico, proibicoes, terminologia, liquido-amniotico]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/negativePrompting.ts + lib/categoryDefaults.ts
source_extracted_at: 2026-05-23
---

═══════════════════════════════════════════════════
🚫 PROIBIÇÕES TERMINOLÓGICAS
═══════════════════════════════════════════════════

Termos PROIBIDOS no laudo morfológico:

❌ "oligoidrâmnio" / "oligoâmnio" / "oligohidrâmnio"
❌ "polidrâmnio" / "polihidrâmnio"

✅ USAR EM VEZ DISSO:
- "Líquido amniótico de quantidade reduzida (ILA mede X cm)" ou "Líquido amniótico de quantidade aumentada (ILA mede X cm)" na CONCLUSÃO
- "O índice do líquido amniótico mede X cm" (medida bruta no CORPO)

Razão clínica: a equipe optou por descrição qualitativa explícita ("reduzida"/"aumentada") em vez dos termos técnicos clássicos, alinhado com a comunicação que o produto entrega aos médicos solicitantes.

🚫 OUTRAS PROIBIÇÕES:
- NÃO inventar estruturas que não estão no template (ver [[morfologico-regra-preservar-terminologia-do-medico]]).
- NÃO remover frases padronizadas do template sem solicitação explícita do médico (mesmo que ele não cite cada uma).
- NÃO emitir diagnóstico/conduta — apenas descrever os achados.
