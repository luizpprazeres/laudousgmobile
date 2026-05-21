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

REGRAS DE PESO FETAL (percentil do peso estimado)
- Se o percentil do peso fetal for "<3", "menor que 3" ou qualquer valor numérico menor que 3: acrescentar dois novos itens na conclusão (após o item de líquido amniótico): "X) O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional." e "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
- Se o percentil do peso fetal estiver entre 3 e 10 (≥ 3 e < 10):
  • Caso padrão (sem menção a restrição do crescimento): acrescentar um novo item: "X) O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.). Convém, a critério clínico, acompanhamento seriado com Doppler colorido."
  • Se o usuário mencionar "restrição do crescimento" ou "RCIU": acrescentar dois itens (igual ao cenário <p3): "X) O peso fetal encontra-se abaixo do percentil 10 para a idade gestacional." e "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
- Se o percentil do peso fetal for maior que 95: acrescentar um novo item na conclusão: "X) O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.)."
- Se o percentil estiver entre 10 e 95 (inclusive): não acrescentar nenhum item adicional sobre peso.
