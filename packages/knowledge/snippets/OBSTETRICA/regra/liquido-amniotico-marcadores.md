---
id: obstetrica-regra-liquido-amniotico-marcadores
category: OBSTETRICA
kind: regra
tags: [obstetrica, liquido-amniotico, ila, mbv, gemelar]
priority: 96
priority_tier: universal
version: 1.1.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts + user feedback 2026-05-21 (override "sempre incluir conclusão")
source_extracted_at: 2026-05-21
source_lines: 24-28
---

EXPANSÃO DOS MARCADORES DE LÍQUIDO AMNIÓTICO

⚠️ ATUALIZADO 2026-05-21 (user feedback): a frase de líquido amniótico SEMPRE entra na conclusão como item 2 (logo após "Gestação em torno de X semanas"). NÃO omitir nunca, nem em gestação única com líquido normal. Esse comportamento difere do source antigo que omitia em alguns casos.

═══════════════════════════════════════════════════
FRASES VÁLIDAS NO CORPO ({LINHA_LIQUIDO_AMNIOTICO})
═══════════════════════════════════════════════════

Escolher UMA das 4 opções baseado no que médico falou:

1. Médico não falou medida e disse que está normal:
   "Líquido amniótico de quantidade normal pela análise subjetiva."

2. Médico falou ILA com valor:
   "O índice do líquido amniótico mede X,X cm."

3. Médico falou MBV / Maior Bolsão Vertical com valor:
   "O maior bolsão vertical mede X,X cm."

4. Médico falou que não conseguiu medir / quantidade reduzida:
   "Não foi possível aferir adequadamente a medida do líquido amniótico (quantidade reduzida)."

═══════════════════════════════════════════════════
FRASES VÁLIDAS NA CONCLUSÃO ({CONCLUSAO_LIQUIDO_AMNIOTICO})
═══════════════════════════════════════════════════

SEMPRE incluir como item 2 da conclusão (após IG). Escolher variante:

CASO A — Líquido NORMAL sem medida específica:
"X) Líquido amniótico de quantidade normal."

CASO B — Líquido NORMAL com ILA medido:
"X) Líquido amniótico de quantidade normal (ILA mede Y,Y cm)."

CASO C — Líquido NORMAL com MBV medido:
"X) Líquido amniótico de quantidade normal (MBV mede Y,Y cm)."

CASO D — Líquido REDUZIDO:
"X) Líquido amniótico em quantidade reduzida (ILA mede Y,Y cm)." (ou MBV)
OU "X) Líquido amniótico reduzido pela análise subjetiva, não passível de aferição adequada."

CASO E — Líquido AUMENTADO:
"X) Líquido amniótico em quantidade aumentada (ILA mede Y,Y cm)."

═══════════════════════════════════════════════════
PROTOCOLO DE CLASSIFICAÇÃO (quando ILA / MBV medido)
═══════════════════════════════════════════════════

1. DETECTAR sigla (ILA ou MBV) — heurística se médico não informar
2. TRAVAR a sigla pra todo o laudo (corpo + conclusão)
3. CLASSIFICAR:
   - ILA: <8 reduzido / 8-24 normal / >24 aumentado
   - MBV: <2 reduzido / 2-8 normal / >8 aumentado
4. BLOQUEIOS (sinaliza atenção):
   - ILA < 6 → "reduzida"
   - ILA > 26 → "aumentada"
   - MBV < 1,4 → "reduzida"
5. EXPANDIR conforme os 5 casos acima

═══════════════════════════════════════════════════
GESTAÇÃO GEMELAR
═══════════════════════════════════════════════════

Em gestação gemelar (≥2 fetos), expandir individualmente:
- Corpo: "Maior bolsão vertical de Y,Y cm (FETO A) e Z,Z cm (FETO B)."
- Conclusão: "X) Líquido amniótico em quantidade normal — MBV Y,Y cm (FETO A) e Z,Z cm (FETO B)."

═══════════════════════════════════════════════════
PROIBIÇÕES
═══════════════════════════════════════════════════

- NUNCA usar "oligoidrâmnio" ou "polidrâmnio" (termos médicos demais — evitar)
- NUNCA deixar o marcador literal {LINHA_LIQUIDO_AMNIOTICO} ou {CONCLUSAO_LIQUIDO_AMNIOTICO} no laudo final
- NUNCA omitir a frase de líquido da conclusão (era padrão antigo — agora SEMPRE incluir)
