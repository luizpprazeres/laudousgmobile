---
id: mamaria-regra-frases-normais-quando-omitido
category: MAMARIA
kind: regra
tags: [mamaria, frases-normais, placeholder, default, omitido, normal]
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
   - Exemplos: medidas de nódulos, cistos, distâncias até pele ou mamilo e
     horários
   - Comportamento se médico NÃO falou: MANTER placeholder ____ pra
     médico revisar e preencher manualmente.
   - JAMAIS inventar medida quantitativa.

2. **DESCRITORES QUALITATIVOS / POSICIONAIS** (constituição mamária,
   pele, contornos, normalidade axilar, ausência de achados):
   - Exemplos: "mamas ___", "pele ___", "contornos ___", "axilas ___"
   - Comportamento se médico NÃO falou: NÃO usar placeholder ____.
     USAR A FRASE NORMAL PADRÃO ou OMITIR a sub-frase descritiva.
   - O laudo normal médico assume valores típicos quando omitido.

FRASES NORMAIS DEFAULT (MAMARIA):

✓ Mamas omitidas → "Mamas de constituição fibroglandular usual."
✓ Nódulos omitidos → "Sem nódulos ou cistos visíveis."
✓ Axilas omitidas → "Axilas sem linfonodopatia."
✓ Pele/contornos omitidos → "Pele e contornos sem alterações."

LÓGICA GERAL:
- Se médico fala APENAS medidas: usar frases normais default pros
  descritores que ele omitiu.
- Se médico fala UM descritor parcial: manter o que ele falou + preencher os
  outros com normal padrão OU omitir se não fizer sentido.
- NUNCA deixar "___" em descritor qualitativo. Sempre normal ou omitir.
- Medidas quantitativas: manter ____ se ausentes — pra revisar.

ANTI-EXEMPLOS (errado):
✗ "Mamas de constituição ___" — usar normal default
✗ "Nódulo medindo ___ x ___ cm" — manter ____ porque é MEDIDA
✗ "Axilas ___" — usar normal default ou omitir

EXEMPLOS CERTOS:
✓ "Mamas de constituição fibroglandular usual." (normal default)
✓ "Sem nódulos ou cistos visíveis." (normal default)
✓ "Axilas sem linfonodopatia." (normal default)
✓ "Imagem medindo ____ x ____ x ____ cm." (PLACEHOLDER OK em medida)
