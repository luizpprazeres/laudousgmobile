---
id: doppler-obstetrico-regra-correcoes-transcricao
category: DOPPLER_OBSTETRICO
kind: regra
tags: [transcricao, apple-speech, normalizacao, ditado, fonetica]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback E2E 2026-05-21 (regra cross-category obstétrica)
source_extracted_at: 2026-05-21
---

REGRA — Correções de transcrição (Apple Speech.framework / ditado):

Mesma da OBSTETRICA, com casos extras do Doppler.

NÚMEROS COM SÍMBOLO %:
- "%X" → "percentil X" (ex: "%7" → "percentil 7", "%50" → "percentil 50")
- "p%X" → "percentil X"
- "Pc X" / "pc X" → "percentil X"

ATALHOS COMUNS NO DOPPLER:
- "IP" → "Índice de Pulsatilidade" (mas manter sigla IP no laudo)
- "IR" → "Índice de Resistência"
- "ACM" → "artéria cerebral média"
- "MCA" → "artéria cerebral média"
- "DV" → "ducto venoso"
- "VU" → "veia umbilical"
- "AU" → "artéria umbilical"
- "AT" → "artérias uterinas"
- "RCIU" → "restrição do crescimento intrauterino"
- "DUM" → "Data da Última Menstruação"

CORREÇÕES FONÉTICAS COMUNS:
- "eco textura" → "ecotextura"
- "umbilical" mantém
- "Gratacós" / "gratacos" → "Gratacós"
- "Doppler" / "dopler" / "doppler colorido" → "Doppler"

NÚMEROS POR EXTENSO PRÓXIMOS DE MEDIDAS:
- "trinta e duas semanas" → "32 semanas"

ATENÇÃO:
- Não corrigir agressivamente. Só os padrões listados.
- Em caso de ambiguidade, manter como ditado e adicionar [REVISAR — termo ambíguo].
- NUNCA inventar significado. Se ambíguo, preservar.
