---
id: doppler-obstetrico-regra-unidades-biometria-fetal
category: DOPPLER_OBSTETRICO
kind: regra
tags: [biometria, unidades, mm, cm, conversao, dbp, cc, ca, cf, doppler]
priority: 93
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback E2E 2026-05-21 11:57 BRT (regra cross-category obstétrica)
source_extracted_at: 2026-05-21
---

REGRA — UNIDADES DA BIOMETRIA FETAL (mesma da OBSTETRICA):

PADRÃO DO LAUDO (NÃO MUDA):
- DBP, CC, CA, CF, CCN, DSM: SEMPRE em **mm**
- Peso fetal: SEMPRE em **gramas** (NUNCA converter)

EXCEÇÕES (ficam em cm):
- ILA, MBV: **cm**
- Cervicometria: **mm** (algumas convenções cm — preservar como ditado)

ESPECÍFICOS DO DOPPLER (não são lineares, NÃO converter):
- IP (Índice de Pulsatilidade): adimensional (número decimal sem unidade)
- IR (Índice de Resistência): adimensional
- Percentis: % (0-100)
- Velocidade sistólica / VPM ACM: cm/s — preservar
- Vias venosas (ducto venoso, veia umbilical): adimensional

CONVERSÃO AUTOMÁTICA cm → mm (apenas biometria linear):

Se médico ditar DBP/CC/CA/CF/CCN em **cm**, converter pra **mm** no output:
- "DBP 7,1 cm" → "DBP de 71 mm"
- "CC 26,4 cm" → "CC de 264 mm"
- "CA 23,8 cm" → "CA de 238 mm"
- "CF 5,3 cm" → "CF de 53 mm"

Fórmula: valor_em_mm = valor_em_cm × 10

GATILHOS DE CONVERSÃO (qualquer um aciona):
1. Médico explicita "em cm" / "centímetros" próximo à medida
2. Valor numérico é absurdo em mm mas plausível em cm:
   - DBP < 20 mm absurdo (esperado 20-100 mm) → cm
   - CC < 60 mm absurdo → cm
   - CA < 50 mm absurdo → cm
   - CF < 10 mm absurdo → cm
3. Valor é fracionado em ordem típica de cm

REGRA DE OURO:
Se medida fizer sentido em UMA unidade, usar essa após converter pra mm.
JAMAIS inventar valor. Se ambíguo, manter como ditado + flag sanity.

QUANDO NÃO CONVERTER:
- Peso fetal (sempre gramas)
- ILA / MBV (sempre cm)
- IP / IR / percentis / velocidades (adimensionais ou cm/s)
- Quando médico explicita "em mm" e valor coerente
- Quando valor sem unidade é compatível com mm

EXEMPLO PRÁTICO (Doppler 32 sem com biometria ditada em cm):
Médico: "32 semanas. Feto único cefálico. DBP 8,1 cm. CC 29,2 cm. CA 27,5 cm. CF 6,1 cm. ILA 12. IP umbilical 0,95 percentil 50."

Output esperado:
- "DBP de 81 mm." (convertido)
- "CC de 292 mm." (convertido)
- "CA de 275 mm." (convertido)
- "CF de 61 mm." (convertido)
- "ILA 12 cm." (cm preservado — exceção)
- "IP umbilical 0,95, percentil 50." (adimensional — sem unidade de comprimento)
