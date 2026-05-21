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

REGRAS DE PESO FETAL (percentil do peso estimado)
- Se o percentil do peso fetal for "<3", "menor que 3" ou qualquer valor numérico menor que 3: acrescentar dois novos itens na conclusão (após o item de líquido amniótico): "X) O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional." e "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
- Se o percentil do peso fetal estiver entre 3 e 10 (≥ 3 e < 10):
  • Caso padrão (sem menção a restrição do crescimento): acrescentar um novo item: "X) O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.). Convém, a critério clínico, acompanhamento seriado com Doppler colorido."
  • Se o usuário mencionar "restrição do crescimento" ou "RCIU": acrescentar dois itens (igual ao cenário <p3): "X) O peso fetal encontra-se abaixo do percentil 10 para a idade gestacional." e "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
- Se o percentil do peso fetal for maior que 95: acrescentar um novo item na conclusão: "X) O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.)."
- Se o percentil estiver entre 10 e 95 (inclusive): não acrescentar nenhum item adicional sobre peso.
