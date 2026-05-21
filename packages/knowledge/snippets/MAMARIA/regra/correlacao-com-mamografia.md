---
id: mamaria-regra-correlacao-com-mamografia
category: MAMARIA
kind: regra
tags: [mamaria, mamografia, biopsia, correlacao, reclassificacao, birads]
priority: 70
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 3367-3379
---

GATILHOS DE APLICAÇÃO:
- mamografia
- biópsia
- biopsia
- correlação
- reclassificar
- BI-RADS

CORRELAÇÃO COM MAMOGRAFIA
Extrair do áudio: data da mamografia, BI-RADS resultante (se reclassificando) e intenção (manter ou reclassificar).

Se o usuário quiser manter a classificação atual, usar exatamente:
A correlação com a mamografia realizada em dd/mm/aaaa permite manter esta classificação.

Se o usuário quiser reclassificar apenas com base na mamografia (sem biópsia), usar exatamente:
A correlação com a mamografia realizada em dd/mm/aaaa permite reclassificar para Categoria BI-RADS® X.
(substituir X pelo número informado pelo médico)

CORRELAÇÃO COM MAMOGRAFIA E BIÓPSIA
Se o usuário fornecer datas e quiser reclassificar com base em mamografia E biópsia, usar exatamente:
A correlação com a mamografia realizada em dd/mm/aaaa e com o laudo histopatológico da biópsia realizada em dd/mm/aaaa permite reclassificar os achados para Categoria BI-RADS® 2.
