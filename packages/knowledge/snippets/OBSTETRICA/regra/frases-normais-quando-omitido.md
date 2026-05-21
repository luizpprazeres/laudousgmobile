---
id: obstetrica-regra-frases-normais-quando-omitido
category: OBSTETRICA
kind: regra
tags: [frases-normais, placeholder, default, omitido, normal]
priority: 93
version: 1.0.0
status: published
source_path: user feedback E2E 2026-05-21 23:51 BRT
source_extracted_at: 2026-05-21
priority_tier: universal
---

REGRA CRÍTICA — Frases NORMAIS quando médico omite informação descritiva:

EXISTEM 2 TIPOS DE PLACEHOLDERS NO TEMPLATE:

1. **MEDIDAS BIOMÉTRICAS** (números quantitativos):
   - Exemplos: DBP, CC, CA, CF, peso fetal, BCF, CCN, DSM, IG em mm/cm/bpm
   - Comportamento se médico NÃO falou: MANTER placeholder ____ pra
     médico revisar e preencher manualmente.
   - JAMAIS inventar medida quantitativa.

2. **DESCRITORES QUALITATIVOS / POSICIONAIS** (situação, apresentação,
   posição, lateralidade, ecotextura, dorso, polo, localização):
   - Exemplos: "situação ___", "apresentação ___", "dorso ___",
     "polo cefálico à ___", "placenta de localização ___", "ecotextura ___"
   - Comportamento se médico NÃO falou: NÃO usar placeholder ____.
     USAR A FRASE NORMAL PADRÃO ou OMITIR a sub-frase descritiva.
   - O laudo normal médico assume valores típicos quando omitido.

FRASES NORMAIS DEFAULT (modelo INICIAL ≤13s6d):

✓ Embrião/Feto + situação omitida → "Embrião único, em situação transversa."
  (sem "polo cefálico à ___" — omitir essa parte se não falada)
✓ Situação omitida + polo cefálico omitido + dorso omitido → frase curta:
  "Embrião único." OU "Embrião único, em situação transversa."

FRASES NORMAIS DEFAULT (modelo PADRÃO >14sem):

✓ Apresentação omitida + dorso omitido → "Feto único, em apresentação cefálica."
  (mais comum a termo; omitir parte de dorso se não falado)
✓ Apresentação omitida (mas dorso falado pelo médico) → "Feto único, em apresentação cefálica, com dorso à ___[lado falado]___."
✓ Placenta omitida (localização e ecotextura) → "Placenta de aspecto normal."
  (sem placeholders de localização/ecotextura)
✓ Líquido amniótico omitido → seguir protocolo {LINHA_LIQUIDO_AMNIOTICO}
  (regra liquido-amniotico-marcadores cuida)

LÓGICA GERAL:
- Se médico fala APENAS sobre biometria: usar TODAS as frases normais
  default pra descritores que ele omitiu.
- Se médico fala UM descritor parcial (ex: só "dorso à esquerda"):
  manter o que ele falou + preencher os outros com normal padrão OU
  omitir se não fizer sentido.
- NUNCA deixar "___" em descritor qualitativo. Sempre normal ou omitir.
- Medidas biométricas (números): manter ____ se ausente — pra revisar.

ANTI-EXEMPLOS (errado):
✗ "Embrião único, de situação ___, com polo cefálico à ___." (placeholder em descritor)
✗ "Feto único, em apresentação ___, com dorso ___." (placeholder em descritor)
✗ "Placenta de localização ___, com ecotextura ___." (placeholder em descritor)

EXEMPLOS CERTOS:
✓ "Embrião único, em situação transversa." (normal default)
✓ "Feto único, em apresentação cefálica." (normal default)
✓ "Placenta de aspecto normal." (normal genérico)
✓ "Diâmetro biparietal (DBP) de ____ mm." (PLACEHOLDER OK em medida)
