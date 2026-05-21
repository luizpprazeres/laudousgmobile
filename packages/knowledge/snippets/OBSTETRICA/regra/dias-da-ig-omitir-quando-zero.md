---
id: obstetrica-regra-dias-da-ig-omitir-quando-zero
category: OBSTETRICA
kind: regra
tags: [idade-gestacional, dias, conclusao, formato]
priority: 96
priority_tier: universal
version: 1.1.0
status: published
source_path: user feedback E2E 2026-05-20 21:08 BRT + reforço 2026-05-21
source_extracted_at: 2026-05-21
---

REGRA — IG (idade gestacional) em SEMANAS e DIAS na conclusão:

⚠️ INVIOLÁVEL: JAMAIS deixar placeholder "____ dias" na conclusão. Sempre.

LÓGICA SIMPLES:
- Se médico falou "X semanas" SEM mencionar dias → escrever SÓ "X semanas" (dias OMITIDOS completamente)
- Se médico falou "X semanas e Y dias" (Y ≥ 1) → escrever "X semanas e Y dias"
- Se médico falou "X semanas e 0 dias" → escrever SÓ "X semanas" (zero implícito)

═══════════════════════════════════════════════════
EXEMPLOS CERTOS
═══════════════════════════════════════════════════

Input: "32 semanas"
✓ Conclusão: "Gestação em torno de 32 semanas."

Input: "30 semanas e 4 dias"
✓ Conclusão: "Gestação em torno de 30 semanas e 4 dias."

Input: "12 semanas"
✓ Conclusão: "Gestação em torno de 12 semanas."

Input: "22 semanas e 0 dias" (zero explícito)
✓ Conclusão: "Gestação em torno de 22 semanas."

Input: "primeira USG 8 semanas e 6 dias"
✓ Conclusão (após cálculo): "Gestação em torno de X semanas e Y dias." (com Y ≥ 1)

═══════════════════════════════════════════════════
ANTI-EXEMPLOS (ERRADOS, NUNCA FAZER ISSO)
═══════════════════════════════════════════════════

Input: "32 semanas"
✗ ERRADO: "Gestação em torno de 32 semanas e ____ dias."
✗ ERRADO: "Gestação em torno de 32 semanas e 0 dias."
✗ ERRADO: "Gestação em torno de 32 semanas e [dias]."
✗ ERRADO: "Gestação em torno de 32 semanas e dias."

Input: "12 semanas"
✗ ERRADO: "Gestação em torno de 12 semanas e ___ dias."

═══════════════════════════════════════════════════
LEMBRETE FINAL
═══════════════════════════════════════════════════

QUANDO O MÉDICO NÃO FALAR DIAS:
1. NÃO assuma que precisa preencher.
2. NÃO deixe placeholder ____.
3. OMITA completamente a parte "e Y dias".
4. Escreva apenas "Gestação em torno de X semanas."

Médico assume que "X semanas" sem qualificação = X semanas exatas (0 dias adicionais). É convenção clínica. NÃO precisa explicitar nem perguntar.

Aplica TANTO ao modelo INICIAL (≤13s6d) quanto ao modelo PADRÃO (>14sem).
Aplica TAMBÉM em DOPPLER_OBSTETRICO (mesma lógica).
