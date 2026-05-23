---
id: morfologico-regra-unidades-biometria-fetal
category: MORFOLOGICO
kind: regra
tags: [biometria, unidades, mm, cm, conversao, dbp, cc, ca, cf, ccn]
priority: 93
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback E2E 2026-05-21 11:57 BRT
source_extracted_at: 2026-05-21
---

REGRA — UNIDADES DA BIOMETRIA FETAL:

PADRÃO DO LAUDO OBSTÉTRICO (NÃO MUDA, INDEPENDENTE DO QUE O MÉDICO FALAR):
- DBP (diâmetro biparietal): SEMPRE em **mm**
- CC (circunferência da cabeça): SEMPRE em **mm**
- CA (circunferência abdominal): SEMPRE em **mm**
- CF (comprimento do fêmur): SEMPRE em **mm**
- CCN (comprimento crânio-nádegas): SEMPRE em **mm**
- DSM (diâmetro médio do saco gestacional): SEMPRE em **mm**
- Peso fetal: SEMPRE em **gramas** (NUNCA converter)

EXCEÇÕES (ficam em cm — NÃO converter):
- ILA (índice de líquido amniótico): **cm**
- MBV (maior bolsão vertical): **cm**
- Colo do útero (cervicometria): **mm** quando medida, mas algumas convenções usam cm — preservar como ditado

CONVERSÃO AUTOMÁTICA cm → mm:

Se o médico ditar DBP/CC/CA/CF/CCN/DSM em **cm** (ex: "DBP 7,1 cm"), o laudo final DEVE apresentar a medida em **mm** após conversão:
- "DBP 7,1 cm" → "DBP de 71 mm"
- "CC 26,4 cm" → "CC de 264 mm"
- "CA 23,8 cm" → "CA de 238 mm"
- "CF 5,3 cm" → "CF de 53 mm"

Fórmula: valor_em_mm = valor_em_cm × 10

GATILHOS DE CONVERSÃO (aplique quando QUALQUER um for verdade):
1. Médico explicita "em cm", "centímetros" próximo à medida
2. Valor numérico é absurdo em mm mas plausível em cm:
   - DBP < 20 mm é absurdo (esperado 20-100 mm a depender da IG) → médico provavelmente disse cm
   - CC < 60 mm é absurdo (esperado 60-360 mm) → cm
   - CA < 50 mm é absurdo (esperado 50-380 mm) → cm
   - CF < 10 mm é absurdo (esperado 10-80 mm) → cm
   - CCN < 5 mm é absurdo no 1º trimestre tardio (esperado 5-85 mm) → talvez cm
3. Valor é fracionado com vírgula decimal em ordem de unidade típica de cm
   (ex: "DBP 7,1" sozinho — implícito que é cm porque DBP em mm seria "71")

REGRA DE OURO:
Se a medida fizer sentido fisiológico em UMA unidade (mm ou cm), usar essa unidade
após conversão pra mm no output. JAMAIS inventar valor. Se ambíguo, manter como
ditado + sanity check flag pra revisar.

QUANDO NÃO CONVERTER:
- Peso fetal (sempre gramas)
- ILA / MBV (sempre cm)
- Quando o médico explicita "em mm" e valor está coerente
- Quando médico dita "DBP 71" sem unidade e valor é compatível com IG (deixa em mm)
- Quando valor é compatível com ambas unidades (ambíguo) → preservar como ditado

EXEMPLO PRÁTICO:
Médico dita: "IG 28 semanas e 3 dias. DBP 7,1 cm. CC 26,4 cm. CA 23,8 cm. CF 5,3 cm. ILA 14."

Output esperado no laudo:
- "Diâmetro biparietal (DBP) de 71 mm." (convertido de 7,1 cm)
- "Circunferência da cabeça (CC) de 264 mm." (convertido)
- "Circunferência abdominal (CA) de 238 mm." (convertido)
- "Comprimento do fêmur (CF) de 53 mm." (convertido)
- "Líquido amniótico de quantidade normal (ILA mede 14 cm)." (cm preservado — exceção)
