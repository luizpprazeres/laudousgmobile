---
id: pelve-feminina-regra-sindrome-ovarios-policisticos
category: PELVE_FEMININA
kind: regra
tags: [pelve-feminina, sop, ovarios-policisticos, foliculos, fsh, lh]
priority: 75
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 1017-1025
---

Esta regra trata especificamente de SOP (Síndrome dos Ovários Policísticos), também chamada de SOP, ovários policísticos, ovários micropolicísticos, padrão policístico, micropolicistose ovariana. Aplica quando o input do médico mencionar qualquer um destes termos OU descrever múltiplos folículos antrais sugestivos de SOP. SOP é o achado central.

GATILHOS DE APLICAÇÃO (palavras-chave detectáveis no input): síndrome dos ovários policísticos, SOP, ovários policísticos, ovários micropolicísticos, padrão policístico, micropolicistose, micropolicistose ovariana, mais de 20 folículos, folículos antrais, múltiplos folículos antrais, FSH, LH.

- Síndrome dos ovários policísticos (SOP) — suspeita morfológica
Corpo (substitui a frase de cada ovário):
Ovário {direito/esquerdo} medindo {a} x {b} x {c} cm, apresentando mais de 20 folículos antrais distribuídos na periferia.
Conclusão (substitui o item de ovários):
Ovários de volumes aumentados (o direito com {vol_OD} cm³ e o esquerdo com {vol_OE} cm³), ambos contendo mais de 20 folículos. Convém, a critério clínico, correlacionar com as dosagens laboratoriais de FSH e LH com objetivo de investigar síndrome dos ovários policísticos.
Regras:
- Sempre usar "distribuídos na periferia" — NUNCA "distribuídos perifericamente".
- NUNCA mencionar "estroma central hiperecoico" ou similares.
- A conclusão deve ser conservadora: descrever a morfologia + recomendar dosagens FSH/LH; NÃO afirmar diretamente "diagnóstico de SOP" ou "achados compatíveis com SOP".
