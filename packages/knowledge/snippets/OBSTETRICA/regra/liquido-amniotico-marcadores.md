---
id: obstetrica-regra-liquido-amniotico-marcadores
category: OBSTETRICA
kind: regra
tags: [obstetrica, liquido-amniotico, ila, mbv, gemelar, hierarquia]
priority: 96
priority_tier: universal
version: 1.2.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts + user feedback 2026-05-21 + 2026-05-22 (separação rígida CORPO vs CONCLUSÃO)
source_extracted_at: 2026-05-22
source_lines: 24-28
---

═══════════════════════════════════════════════════
⚠️ REGRA DE HIERARQUIA
═══════════════════════════════════════════════════

Esta regra SOBRESCREVE o template-padrao e qualquer outra regra/frase no que tange a líquido amniótico. Em caso de conflito entre o que o template diz e o que esta regra diz, ESTA regra prevalece.

Em especial: o template-padrao não dita o conteúdo das frases de líquido amniótico — ele apenas reserva placeholders `{LINHA_LIQUIDO_AMNIOTICO}` (no corpo) e `{CONCLUSAO_LIQUIDO_AMNIOTICO}` (na conclusão). É AQUI que se decide o que vai em cada um.

═══════════════════════════════════════════════════
🚨 SEPARAÇÃO RÍGIDA: CORPO ≠ CONCLUSÃO
═══════════════════════════════════════════════════

⚠️ REGRA CRÍTICA — frequente fonte de bug:

**No CORPO**, mostrar APENAS a MEDIDA BRUTA ou afirmação de normalidade subjetiva.
**NA CONCLUSÃO**, mostrar a CLASSIFICAÇÃO QUALITATIVA (normal/aumentada/reduzida) + medida em parênteses.

NUNCA repetir a classificação qualitativa no corpo. NUNCA omitir a frase do corpo.

ANTI-EXEMPLOS (NÃO FAZER):

✗ ERRADO no corpo: "Líquido amniótico de quantidade aumentada (ILA mede 23,4 cm)"
✓ CERTO no corpo:  "O índice do líquido amniótico mede 23,4 cm."

✗ ERRADO no corpo: "Líquido amniótico de quantidade reduzida"
✓ CERTO no corpo:  "O índice do líquido amniótico mede 5,2 cm."

✗ ERRADO no corpo: "Líquido amniótico normal (ILA 12 cm)"
✓ CERTO no corpo:  "O índice do líquido amniótico mede 12,0 cm."

✗ ERRADO repetir conclusão no corpo. O corpo é sempre técnico-bruto. A conclusão é interpretativa.

═══════════════════════════════════════════════════
FRASES VÁLIDAS NO CORPO ({LINHA_LIQUIDO_AMNIOTICO})
═══════════════════════════════════════════════════

Escolher UMA das 4 opções baseado no que médico falou. Nenhuma outra variação é aceita.

1. Médico não falou medida e disse que está normal (análise subjetiva):
   "Líquido amniótico de quantidade normal pela análise subjetiva."

2. Médico falou ILA com valor:
   "O índice do líquido amniótico mede X,X cm."

3. Médico falou MBV / Maior Bolsão Vertical com valor:
   "O maior bolsão vertical mede X,X cm."

4. Médico falou que não conseguiu medir / quantidade reduzida sem medida:
   "Não foi possível aferir adequadamente a medida do líquido amniótico (quantidade reduzida)."

⚠️ Mesmo se o médico falar "líquido aumentado/reduzido com ILA X cm", o CORPO recebe apenas a opção 2 ou 3 (a medida). A classificação aumentado/reduzido aparece SOMENTE na conclusão.

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
5. EXPANDIR conforme os 5 casos da conclusão acima

═══════════════════════════════════════════════════
EXEMPLOS COMPLETOS (corpo + conclusão lado a lado)
═══════════════════════════════════════════════════

Exemplo 1 — médico falou "líquido amniótico aumentado, ILA 23,4 cm":
  CORPO:     "O índice do líquido amniótico mede 23,4 cm."
  CONCLUSÃO: "2) Líquido amniótico em quantidade aumentada (ILA mede 23,4 cm)."

Exemplo 2 — médico falou "líquido normal" (sem medida):
  CORPO:     "Líquido amniótico de quantidade normal pela análise subjetiva."
  CONCLUSÃO: "2) Líquido amniótico de quantidade normal."

Exemplo 3 — médico falou "MBV 1,1 cm":
  CORPO:     "O maior bolsão vertical mede 1,1 cm."
  CONCLUSÃO: "2) Líquido amniótico em quantidade reduzida (MBV mede 1,1 cm)."

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
- NUNCA escrever "de quantidade aumentada/reduzida/normal" no CORPO — isso é EXCLUSIVO da CONCLUSÃO
- NUNCA repetir a frase da conclusão no corpo
