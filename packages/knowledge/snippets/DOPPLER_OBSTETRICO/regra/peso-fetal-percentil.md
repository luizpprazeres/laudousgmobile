---
id: doppler-obstetrico-regra-peso-fetal-percentil
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, peso-fetal, percentil, pig, gig, gratacos, rciu]
priority: 70
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 145-151
---

GATILHOS DE APLICAÇÃO:
- percentil do peso
- peso fetal
- P.I.G.
- G.I.G.
- restrição do crescimento
- RCIU
- Gratacós

REGRAS DE PESO FETAL — DOPPLER OBSTÉTRICO

A categoria atual já É exame com Doppler. NÃO recomendar novo Doppler de seguimento (essa recomendação só aparece na OBSTETRICA simples).

═══════════════════════════════════════════════════
CENÁRIO 1 — Percentil ≤ 3 (ou < 3) [RCIU automático]
═══════════════════════════════════════════════════

Acrescentar SEMPRE 2 itens na conclusão (em ordem, após item de líquido amniótico):

1) "X) O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional."
2) "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."

(Sem recomendação de Doppler — já estamos no exame com Doppler.)

═══════════════════════════════════════════════════
CENÁRIO 2 — Percentil ≥ 3 e < 10 [PIG, SEM restrição mencionada]
═══════════════════════════════════════════════════

Acrescentar 1 item:

1) "X) O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.)."

NÃO escrever "restrição do crescimento" automaticamente. PIG ≠ RCIU.

═══════════════════════════════════════════════════
CENÁRIO 3 — Percentil ≥ 3 e < 10 + médico MENCIONOU "restrição" / "RCIU"
═══════════════════════════════════════════════════

Quando médico explicita restrição:

Acrescentar 2 itens (frase 1 levemente diferente do cenário 1):

1) "X) Feto abaixo do percentil 10 para a idade gestacional."
2) "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."

═══════════════════════════════════════════════════
CENÁRIO 4 — Percentil > 95 [GIG]
═══════════════════════════════════════════════════

Acrescentar 1 item:
1) "X) O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.)."

═══════════════════════════════════════════════════
CENÁRIO 5 — Percentil entre 10 e 95 (inclusive)
═══════════════════════════════════════════════════

Não acrescentar nenhum item adicional sobre peso fetal.

═══════════════════════════════════════════════════
ATENÇÃO ÀS NUANCES (mesma lógica da OBSTETRICA simples, MENOS a recomendação Doppler):
- Cenário 1 (p ≤ 3): SEMPRE inclui restrição estágio I
- Cenário 2 (p 3-10 sem comando): SÓ inclui PIG, SEM restrição
- Cenário 3 (p 3-10 + comando "restrição"): muda "abaixo do percentil 10" → "Feto abaixo do percentil 10"
- NUNCA incluir "Convém realizar nova ultrassonografia com Doppler em quatro semanas" — esta categoria É Doppler
