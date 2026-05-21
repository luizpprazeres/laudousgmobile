---
id: obstetrica-regra-correcoes-transcricao
category: OBSTETRICA
kind: regra
tags: [transcricao, apple-speech, normalizacao, ditado, fonetica]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback E2E 2026-05-21 (ditado Apple Speech transcreve "%7" no lugar de "percentil 7")
source_extracted_at: 2026-05-21
---

REGRA — Correções de transcrição (Apple Speech.framework / ditado):

O ditado por voz do iPhone às vezes transcreve termos médicos de forma abreviada ou simbólica. Quando o input contiver os padrões abaixo, INTERPRETE como o termo expandido antes de processar:

NÚMEROS COM SÍMBOLO %:
- "%X" → "percentil X" (ex: "%7" → "percentil 7", "%3" → "percentil 3", "%95" → "percentil 95")
- "%" sozinho perto de número → "percentil"
- "p%X" → "percentil X"
- "Pc X" / "pc X" → "percentil X"

ATALHOS DE PERCENTIL:
- "p<3" / "p < 3" / "p3" → "percentil 3" / "percentil < 3"
- "p3" / "p10" / "p50" / "p95" → "percentil X" correspondente
- "PIG" / "P.I.G." → "pequeno para a idade gestacional"
- "GIG" / "G.I.G." → "grande para a idade gestacional"
- "RCIU" → "restrição do crescimento intrauterino"
- "DUM" → "Data da Última Menstruação"
- "IG" → "idade gestacional"
- "DBP" / "CC" / "CA" / "CF" / "CCN" → manter siglas (são padrão laudo)

CORREÇÕES FONÉTICAS COMUNS:
- "eco textura" → "ecotextura"
- "anti-versão" / "antiversão" / "ante versão" → "anteversão"
- "retroversão" → mantém
- "abdomê" / "abdomém" → "abdome"
- "vesicula" → "vesícula"
- "Doppler colorido" / "doppler" → manter como está

NÚMEROS POR EXTENSO PRÓXIMOS DE MEDIDAS:
- "vinte e oito semanas" → "28 semanas"
- "dois dias" → "2 dias"

ATENÇÃO:
- Não corrigir agressivamente. Só os padrões listados acima.
- Em caso de ambiguidade, manter como o médico ditou e adicionar [REVISAR — termo ambíguo] como flag pra sanity check pegar.
- NUNCA inventar significado. Se "%7" aparece SEM contexto de peso/idade gestacional, deixa como está.
