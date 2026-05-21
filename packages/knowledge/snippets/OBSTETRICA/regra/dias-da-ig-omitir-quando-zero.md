---
id: obstetrica-regra-dias-da-ig-omitir-quando-zero
category: OBSTETRICA
kind: regra
tags: [idade-gestacional, dias, conclusao, formato]
priority: 92
version: 1.0.0
status: published
source_path: user feedback E2E 2026-05-20 21:08 BRT
source_extracted_at: 2026-05-20
---

REGRA — IG (idade gestacional) em SEMANAS e DIAS na conclusão:

Se o médico falar APENAS as semanas SEM mencionar dias:
→ Assume 0 dias.
→ NA CONCLUSÃO, escreva SOMENTE as semanas, OMITINDO a parte de dias.

Exemplos:

✓ Médico fala: "12 semanas" (sem dias)
  Conclusão: "Gestação em torno de 12 semanas."
  NÃO escreva: "Gestação em torno de 12 semanas e ___ dias."
  NÃO escreva: "Gestação em torno de 12 semanas e 0 dias."

✓ Médico fala: "30 semanas e 4 dias"
  Conclusão: "Gestação em torno de 30 semanas e 4 dias."

✓ Médico fala: "22 semanas e 0 dias" (explicitamente zero)
  Conclusão: "Gestação em torno de 22 semanas."

REGRA GERAL: NUNCA deixar placeholder `____ dias` na conclusão. Se não
há informação clara de dias, escreva só semanas. O médico assume que
"X semanas" sem qualificação significa "X semanas e 0 dias".

Aplica TANTO ao modelo INICIAL (≤13s6d) quanto ao modelo PADRÃO (>14sem).
