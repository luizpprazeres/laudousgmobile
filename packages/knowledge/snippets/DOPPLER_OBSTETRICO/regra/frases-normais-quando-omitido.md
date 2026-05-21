---
id: doppler-obstetrico-regra-frases-normais-quando-omitido
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, frases-normais, placeholder, doppler, cervicometria, omitido]
priority: 93
priority_tier: universal
version: 1.0.0
status: published
source_path: padrão cross-category — adaptado de OBSTETRICA/frases-normais-quando-omitido
source_extracted_at: 2026-05-21
---

REGRA CRÍTICA — Frases NORMAIS quando médico omite informação descritiva:

EXISTEM 2 TIPOS DE PLACEHOLDERS NO TEMPLATE:

1. **MEDIDAS BIOMÉTRICAS** (números quantitativos):
   - Exemplos: IP, IR, percentis, BCF, DBP, CC, CA, CF, peso fetal e
     comprimento cervical
   - Comportamento se médico NÃO falou: MANTER placeholder ____ pra
     médico revisar e preencher manualmente.
   - JAMAIS inventar medida quantitativa.

2. **DESCRITORES QUALITATIVOS / POSICIONAIS** (normalidade da onda,
   ecotextura, incisuras, forma do colo, lateralidade):
   - Exemplos: "onda de aspecto ___", "placenta ___", "colo uterino ___"
   - Comportamento se médico NÃO falou: NÃO usar placeholder ____.
     USAR A FRASE NORMAL PADRÃO ou OMITIR a sub-frase descritiva.
   - O laudo normal médico assume valores típicos quando omitido.

FRASES NORMAIS DEFAULT (DOPPLER OBSTÉTRICO):

✓ Doppler umbilical omitido → "Doppler da artéria umbilical com onda de aspecto normal."
✓ Doppler cerebral média omitido → "Doppler da artéria cerebral média com onda de aspecto normal."
✓ Artérias uterinas omitidas → "Dopplervelocimetria das artérias uterinas com índices dentro da normalidade."
✓ Cervicometria omitida → "Colo uterino com comprimento e forma habituais."

LÓGICA GERAL:
- Se médico fala APENAS medidas: usar frases normais default pros
  descritores que ele omitiu.
- Se médico fala UM descritor parcial: manter o que ele falou + preencher os
  outros com normal padrão OU omitir se não fizer sentido.
- NUNCA deixar "___" em descritor qualitativo. Sempre normal ou omitir.
- Medidas quantitativas: manter ____ se ausentes — pra revisar.

ANTI-EXEMPLOS (errado):
✗ "Doppler da artéria umbilical com onda ___" — usar normal default
✗ "IP médio das artérias uterinas mede ____" — manter ____ porque é MEDIDA
✗ "Colo uterino ___" — usar normal default ou omitir

EXEMPLOS CERTOS:
✓ "Doppler da artéria umbilical com onda de aspecto normal." (normal default)
✓ "Dopplervelocimetria das artérias uterinas com índices dentro da normalidade." (normal default)
✓ "Colo uterino com comprimento e forma habituais." (normal default)
✓ "Artéria cerebral média: IP ____ (percentil ____)." (PLACEHOLDER OK em medida)
