---
id: obstetrica-regra-calculo-dsm
category: OBSTETRICA
kind: regra
tags: [obstetrica, dsm, saco-gestacional, calculo, inicial]
priority: 70
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-20
source_lines: 30-48
---

CÁLCULO DO DSM (Diâmetro Médio do Saco Gestacional) — modelo inicial:
- Fórmula: DSM = (D1 + D2 + D3) / 3, onde D1, D2 e D3 são as três dimensões ortogonais do saco gestacional (longitudinal, ântero-posterior, transversal) em milímetros.
- GATILHOS DO COMANDO (qualquer um aciona o cálculo): "calcule o DSM", "calcular DSM", "diâmetro médio do saco", "calcule o diâmetro médio", "DSM pelas medidas", "DSM com as medidas".
- IDENTIFICAÇÃO DAS 3 MEDIDAS:
  • Procure 3 valores numéricos contíguos na frase do comando (ou imediatamente antes/depois dele), separados por "x", "por", "vezes" ou simples espaço.
  • CRITICAMENTE: vírgulas DENTRO de um número decimal (ex.: "2,5") NÃO são separadores de medida — fazem parte do número. Em "2,5 por 3,1 por 4,2" há TRÊS medidas: 2.5, 3.1, 4.2.
  • Em "0,8 x 29,9" há apenas DUAS medidas (0,8 e 29,9), não quatro.
- EXECUÇÃO:
  • Some D1 + D2 + D3 e divida por 3.
  • Arredonde para 1 casa decimal. Use vírgula como separador decimal e " mm" como unidade.
  • Insira o resultado no template: "Saco gestacional de forma normal, com diâmetro médio de X,Y mm."
- VALIDAÇÃO ANTES DE CALCULAR:
  • Se forem identificadas MENOS DE 3 medidas: NÃO calcule. Reproduza as medidas como ditadas e adicione "[REVISAR — DSM requer 3 medidas; foram identificadas N]". Ex.: "Saco gestacional com medidas de 0,8 x 29,9 mm [REVISAR — DSM requer 3 medidas; foram identificadas 2]."
  • Se uma das medidas estiver fora da faixa anatômica (DSM tipicamente 5–80 mm; medida individual < 2 mm é quase certamente truncação de voz): reproduza os valores e adicione "[REVISAR — medida ambígua]" ao lado, NÃO calcule.
  • Se forem fornecidas MAIS de 3 medidas: use as 3 mais próximas do comando.
- EXEMPLOS:
  • Input: "saco gestacional com 2,5 por 3,1 por 4,2, calcule o DSM" → Output: "Saco gestacional de forma normal, com diâmetro médio de 3,3 mm."
  • Input: "calcule o DSM pelas medidas 18,2 x 22,4 x 20,1" → Output: "Saco gestacional de forma normal, com diâmetro médio de 20,2 mm."
  • Input: "0,8 x 29,9 calcule o diâmetro médio do saco gestacional" → Output: "Saco gestacional com medidas de 0,8 x 29,9 mm [REVISAR — DSM requer 3 medidas; foram identificadas 2]." (NÃO calcular).
