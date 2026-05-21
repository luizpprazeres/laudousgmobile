---
id: abdomen-total-regra-frases-normais-quando-omitido
category: ABDOMEN_TOTAL
kind: regra
tags: [abdomen-total, frases-normais, placeholder, orgaos, default, omitido]
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
   - Exemplos: medidas de lesões, diâmetros, volumes, espessuras e calibres
   - Comportamento se médico NÃO falou: MANTER placeholder ____ pra
     médico revisar e preencher manualmente.
   - JAMAIS inventar medida quantitativa.

2. **DESCRITORES QUALITATIVOS / POSICIONAIS** (ecotextura, contornos,
   presença de cálculos, visualização, aspecto vascular, normalidade):
   - Exemplos: "fígado ___", "vesícula ___", "pâncreas ___", "aorta ___"
   - Comportamento se médico NÃO falou: NÃO usar placeholder ____.
     USAR A FRASE NORMAL PADRÃO ou OMITIR a sub-frase descritiva.
   - O laudo normal médico assume valores típicos quando omitido.

FRASES NORMAIS DEFAULT (ABDOME TOTAL):

✓ Fígado omitido → "Fígado de dimensões e ecotextura normais."
✓ Vesícula biliar omitida → "Vesícula biliar com paredes finas, sem cálculos."
✓ Vias biliares omitidas → "Vias biliares sem dilatação."
✓ Pâncreas omitido → "Pâncreas parcialmente visualizado, sem alterações detectáveis."
✓ Baço omitido → "Baço de dimensões e ecotextura normais."
✓ Rins omitidos → "Rins de dimensões e ecotextura normais."
✓ Aorta omitida → "Aorta de calibre normal."
✓ Bexiga omitida, se aplicável → "Bexiga adequadamente repleta, com paredes lisas."

LÓGICA GERAL:
- Se médico fala APENAS medidas: usar frases normais default pros
  descritores que ele omitiu.
- Se médico fala UM descritor parcial: manter o que ele falou + preencher os
  outros com normal padrão OU omitir se não fizer sentido.
- NUNCA deixar "___" em descritor qualitativo. Sempre normal ou omitir.
- Medidas quantitativas: manter ____ se ausentes — pra revisar.

ANTI-EXEMPLOS (errado):
✗ "Fígado de dimensões ___" — usar normal default
✗ "Imagem hepática medindo ____ x ____ cm" — manter ____ porque é MEDIDA
✗ "Pâncreas ___ visualizado" — usar default ou omitir

EXEMPLOS CERTOS:
✓ "Fígado de dimensões e ecotextura normais." (normal default)
✓ "Vesícula biliar com paredes finas, sem cálculos." (normal default)
✓ "Pâncreas parcialmente visualizado, sem alterações detectáveis." (normal default)
✓ "Imagem anecoica homogênea, medindo ____ x ____ x ____ cm." (PLACEHOLDER OK em medida)
