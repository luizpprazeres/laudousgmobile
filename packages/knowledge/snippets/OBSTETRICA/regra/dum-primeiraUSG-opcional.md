---
id: obstetrica-regra-dum-primeiraUSG-opcional
category: OBSTETRICA
kind: regra
tags: [obstetrica, dum, primeira-usg, ig-clinica, opcional, hierarquia]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback 2026-05-22 (frase DUM/1ª USG aparecendo sem médico mencionar)
source_extracted_at: 2026-05-22
---

═══════════════════════════════════════════════════
⚠️ REGRA DE HIERARQUIA
═══════════════════════════════════════════════════

Esta regra SOBRESCREVE o template-padrao no que tange à "Linha de Primeira USG/DUM (opcional)" mencionada na ordem das seções. O template apenas RESERVA a posição (entre título e COMENTÁRIOS). É ESTA regra que decide se a linha aparece, com qual conteúdo, e quando omitir.

═══════════════════════════════════════════════════
🚨 MATRIZ DE 4 CASOS — quando incluir/omitir a frase
═══════════════════════════════════════════════════

Localização: linha SEPARADA logo após o título "ULTRASSONOGRAFIA OBSTÉTRICA", antes da seção COMENTÁRIOS.

**CASO 1 — Médico NÃO mencionou nem DUM nem 1ª USG:**
→ OMITIR a frase inteira. Não inserir linha alguma após o título.

**CASO 2 — Médico mencionou SÓ DUM:**
→ Incluir a frase apenas com DUM.

Variantes:
- Médico forneceu DUM + IG calculada por ele:
  *"Idade gestacional pela DUM (DD/MM/AAAA): X semanas e Y dias."*
- Médico forneceu SÓ a DUM (sem IG calculada):
  *"Idade gestacional pela DUM (DD/MM/AAAA): ____ semanas e ____ dias."*
  ⚠️ Placeholder explícito pra médico preencher depois OU pra o atalho "Calcular IG pela DUM" preencher automaticamente.

**CASO 3 — Médico mencionou SÓ 1ª USG (primeira ultrassonografia / USG inicial):**
→ Incluir a frase apenas com 1ª USG.

Variante:
- *"Idade gestacional pela primeira ultrassonografia realizada em DD/MM/AAAA (X semanas e Y dias): Z semanas e W dias atual."*
- Se o médico não calculou a IG atual, usar placeholder: *"... : ____ semanas e ____ dias atual."*

**CASO 4 — Médico mencionou AMBAS (DUM E 1ª USG):**
→ Incluir AMBAS as frases, uma por linha:

Linha 1: *"Idade gestacional pela DUM (DD/MM/AAAA): X semanas e Y dias."*
Linha 2: *"Idade gestacional pela primeira ultrassonografia realizada em DD/MM/AAAA (A semanas e B dias): C semanas e D dias atual."*

═══════════════════════════════════════════════════
🚫 ANTI-EXEMPLOS (NÃO FAZER)
═══════════════════════════════════════════════════

✗ ERRADO — médico não falou DUM nem 1ª USG, mas o laudo tem:
   *"Idade gestacional pela DUM: ____ semanas e ____ dias."*
   (placeholder sem médico ter dado dado nenhum — INVENTANDO)

✓ CERTO neste caso — OMITIR a linha inteira. Sem frase.

---

✗ ERRADO — médico falou só 1ª USG, mas o laudo tem AMBAS:
   *"Idade gestacional pela DUM: ____ ____.*
   *"Idade gestacional pela primeira ultrassonografia: 28 semanas..."*

✓ CERTO neste caso — incluir SÓ a frase de 1ª USG. Sem linha de DUM.

---

✗ ERRADO — frase pela DUM no MEIO dos achados ou na CONCLUSÃO:
   "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
    Idade gestacional pela DUM: 32 semanas..."

✓ CERTO — frase pela DUM/1ª USG é SEMPRE linha SEPARADA, logo após o título, antes de COMENTÁRIOS.

═══════════════════════════════════════════════════
📐 DETECÇÃO NO INPUT DO MÉDICO
═══════════════════════════════════════════════════

Gatilhos pra detectar **DUM** no input:
- "DUM ..."
- "data da última menstruação ..."
- "DUM em DD/MM/YYYY"
- "última menstruação ..."

Gatilhos pra detectar **1ª USG**:
- "1ª USG ..."
- "primeira USG ..."
- "primeira ultrassonografia ..."
- "USG inicial ..."
- "ultrassonografia anterior em ..."

Se nenhum gatilho presente → CASO 1 (omitir).
Se um deles → CASO 2 ou 3.
Se ambos → CASO 4.

═══════════════════════════════════════════════════
🔗 INTEGRAÇÃO COM CALCULADORA IG
═══════════════════════════════════════════════════

Quando o médico fornecer DUM mas NÃO calcular IG atual:
1. O atalho "Calcular IG pela DUM" no app iOS (S14.4) faz o cálculo automaticamente
2. Insere no textarea de achados a frase já completa: *"IG pela DUM (DD/MM/AAAA): X semanas e Y dias"*
3. Próxima geração de laudo usa CASO 2 com IG já preenchida

Enquanto isso (sem médico ter usado o atalho), respeitar o placeholder do CASO 2.
