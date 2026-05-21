---
id: tireoide-regra-frases-normais-quando-omitido
category: TIREOIDE
kind: regra
tags: [frases-normais, placeholder, tireoide, default, omitido, normal]
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
   - Exemplos: medidas dos lobos, istmo, volumes e picos sistólicos em
     cm/ml/cm/s
   - Comportamento se médico NÃO falou: MANTER placeholder ____ pra
     médico revisar e preencher manualmente.
   - JAMAIS inventar medida quantitativa.

2. **DESCRITORES QUALITATIVOS / POSICIONAIS** (aspecto, ecotextura,
   vascularização, topografia, normalidade):
   - Exemplos: "tireoide ___", "istmo ___", "linfonodos cervicais ___",
     "vascularização ___"
   - Comportamento se médico NÃO falou: NÃO usar placeholder ____.
     USAR A FRASE NORMAL PADRÃO ou OMITIR a sub-frase descritiva.
   - O laudo normal médico assume valores típicos quando omitido.

FRASES NORMAIS DEFAULT (TIREOIDE):

✓ Tireoide omitida → "Tireoide de dimensões e ecotextura normais."
✓ Lobo direito ou esquerdo individualmente omitido → reportar como simétrico
  normal.
✓ Istmo omitido → "Istmo de espessura normal."
✓ Linfonodos cervicais omitidos → "Linfonodos cervicais sem alterações."
  Usar apenas no CORPO; OMITIR na conclusão se normais.
✓ Vascularização omitida → "Vascularização ao Doppler colorido sem alterações."

LÓGICA GERAL:
- Se médico fala APENAS medidas: usar frases normais default pros
  descritores que ele omitiu.
- Se médico fala UM descritor parcial: manter o que ele falou + preencher os
  outros com normal padrão OU omitir se não fizer sentido.
- NUNCA deixar "___" em descritor qualitativo. Sempre normal ou omitir.
- Medidas quantitativas: manter ____ se ausentes — pra revisar.

ANTI-EXEMPLOS (errado):
✗ "Tireoide de dimensões ___" — usar normal default
✗ "Istmo medindo ___ cm" — manter ____ porque é MEDIDA
✗ "Vascularização ___" — usar default ou omitir

EXEMPLOS CERTOS:
✓ "Tireoide de dimensões e ecotextura normais." (normal default)
✓ "Istmo de espessura normal." (normal default)
✓ "Linfonodos cervicais sem alterações." (normal default no corpo)
✓ "Lobo direito medindo ____ x ____ x ____ cm." (PLACEHOLDER OK em medida)
