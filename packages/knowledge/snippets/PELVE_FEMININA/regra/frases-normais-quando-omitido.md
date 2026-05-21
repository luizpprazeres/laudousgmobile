---
id: pelve-feminina-regra-frases-normais-quando-omitido
category: PELVE_FEMININA
kind: regra
tags: [frases-normais, placeholder, pelve-feminina, default, omitido, normal]
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
   - Exemplos: medidas do útero, espessura do endométrio, medidas dos
     ovários e volumes em mm/cm/cm³
   - Comportamento se médico NÃO falou: MANTER placeholder ____ pra
     médico revisar e preencher manualmente.
   - JAMAIS inventar medida quantitativa.

2. **DESCRITORES QUALITATIVOS / POSICIONAIS** (posição, aspecto,
   ecotextura, contornos, folículos, normalidade, técnica):
   - Exemplos: "útero em ___", "endométrio de aspecto ___",
     "miométrio ___", "ovários ___", "bexiga ___"
   - Comportamento se médico NÃO falou: NÃO usar placeholder ____.
     USAR A FRASE NORMAL PADRÃO ou OMITIR a sub-frase descritiva.
   - O laudo normal médico assume valores típicos quando omitido.

FRASES NORMAIS DEFAULT (PELVE FEMININA):

✓ Útero omitido → "Útero de dimensões e contornos normais."
✓ Endométrio omitido na técnica TV → usar frase normal de endométrio TV
  adequada.
✓ Endométrio omitido na técnica TA → usar a frase própria da técnica:
  "Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal."
✓ Miométrio omitido → "Miométrio de aspecto homogêneo."
✓ Ovários omitidos → "Ovários de dimensões e ecotextura normais."
✓ Bexiga omitida, se aplicável a TA → "Bexiga adequadamente repleta, com paredes lisas."

LÓGICA GERAL:
- Se médico fala APENAS medidas: usar frases normais default pros
  descritores que ele omitiu.
- Se médico fala UM descritor parcial: manter o que ele falou + preencher os
  outros com normal padrão OU omitir se não fizer sentido.
- NUNCA deixar "___" em descritor qualitativo. Sempre normal ou omitir.
- Medidas quantitativas: manter ____ se ausentes — pra revisar.

ANTI-EXEMPLOS (errado):
✗ "Útero de dimensões ___" — usar normal default
✗ "Endométrio ___ mm" — manter ____ porque é MEDIDA
✗ "Endométrio de aspecto ___" — usar default ou omitir

EXEMPLOS CERTOS:
✓ "Útero de dimensões e contornos normais." (normal default)
✓ "Miométrio de aspecto homogêneo." (normal default)
✓ "Ovários de dimensões e ecotextura normais." (normal default)
✓ "Endométrio medindo ____ cm de espessura." (PLACEHOLDER OK em medida)
