---
id: obstetrica-regra-peso-fetal-percentil
category: OBSTETRICA
kind: regra
tags: [obstetrica, peso-fetal, percentil, pig, gig, rciu]
priority: 70
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-20
source_lines: 124-130
---

GATILHOS DE APLICAÇÃO desta regra (use quando o input mencionar qualquer um dos seguintes): "percentil < 3", "percentil menor que 3", "abaixo do percentil 3", "p<3", "p < 3", "peso fetal abaixo do percentil 10", "percentil 10", "P.I.G.", "PIG", "pequeno para a idade gestacional", "pequeno para idade gestacional", "G.I.G.", "GIG", "grande para a idade gestacional", "percentil > 95", "percentil maior que 95", "restrição do crescimento", "restrição de crescimento", "RCIU", "restrição do crescimento fetal", "Gratacós", "estágio I de Gratacós", "feto pequeno", "feto restrito".

REGRAS DE PESO FETAL — OBSTETRICA SIMPLES (sem Doppler)

A categoria atual é ULTRASSONOGRAFIA OBSTÉTRICA simples. SEMPRE que houver percentil baixo (< 10), DEVE ser incluída a recomendação de seguimento com Doppler em 4 semanas, EXATAMENTE com esta frase:
"Convém, a critério clínico, realizar nova ultrassonografia obstétrica com Doppler colorido em quatro semanas, com objetivo de acompanhar a evolução."

═══════════════════════════════════════════════════
CENÁRIO 1 — Percentil ≤ 3 (ou < 3) [RCIU automático]
═══════════════════════════════════════════════════

Acrescentar SEMPRE 3 itens na conclusão (em ordem, após item de líquido amniótico):

1) "X) O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional."
2) "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
3) "X) Convém, a critério clínico, realizar nova ultrassonografia obstétrica com Doppler colorido em quatro semanas, com objetivo de acompanhar a evolução."

═══════════════════════════════════════════════════
CENÁRIO 2 — Percentil ≥ 3 e < 10 [PIG, SEM restrição mencionada]
═══════════════════════════════════════════════════

Caso padrão (médico NÃO mencionou "restrição" / "RCIU"):

Acrescentar 2 itens:

1) "X) O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.)."
2) "X) Convém, a critério clínico, realizar nova ultrassonografia obstétrica com Doppler colorido em quatro semanas, com objetivo de acompanhar a evolução."

NÃO escrever "restrição do crescimento" automaticamente nesse cenário. PIG ≠ RCIU.

═══════════════════════════════════════════════════
CENÁRIO 3 — Percentil ≥ 3 e < 10 + médico MENCIONOU "restrição" / "RCIU"
═══════════════════════════════════════════════════

Quando médico explicita restrição (por exemplo no comando "acrescenta restrição estágio I Gratacós"):

Acrescentar 3 itens (frase 1 levemente diferente do cenário 1):

1) "X) Feto abaixo do percentil 10 para a idade gestacional."
2) "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
3) "X) Convém, a critério clínico, realizar nova ultrassonografia obstétrica com Doppler colorido em quatro semanas, com objetivo de acompanhar a evolução."

═══════════════════════════════════════════════════
CENÁRIO 4 — Percentil > 95 [GIG]
═══════════════════════════════════════════════════

Acrescentar 1 item:
1) "X) O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.)."

NÃO recomendar Doppler de seguimento (sem indicação clínica padrão para GIG).

═══════════════════════════════════════════════════
CENÁRIO 5 — Percentil entre 10 e 95 (inclusive)
═══════════════════════════════════════════════════

Não acrescentar nenhum item adicional sobre peso fetal na conclusão.

═══════════════════════════════════════════════════
ATENÇÃO ÀS NUANCES (não confundir):
- Cenário 1 (p ≤ 3): SEMPRE inclui restrição estágio I
- Cenário 2 (p 3-10 sem comando): SÓ inclui PIG, SEM restrição
- Cenário 3 (p 3-10 + comando "restrição"): muda "abaixo do percentil 10" → "Feto abaixo do percentil 10"
- A frase de recomendação Doppler é IDÊNTICA em cenários 1, 2 e 3 (mas só em obstétrico simples — esta categoria)
