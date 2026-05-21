---
id: tireoide-regra-nodulos-com-classificacao
category: TIREOIDE
kind: regra
tags: [tireoide, nodulo, dominios, tirads, descritores, classificacao]
priority: 78
priority_tier: contextual
version: 1.2.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts (reescrita 2026-05-21 com formato exato da frase de conclusão)
source_extracted_at: 2026-05-21
source_lines: 730-733,748-749
---

GATILHOS DE APLICAÇÃO:
- nódulo
- nodular
- Domingos
- Nota Domingos
- TIRADS
- TI-RADS

═══════════════════════════════════════════════════
3.2. CORPO — descrição dos nódulos por lobo
═══════════════════════════════════════════════════

Começar com medidas e volume do lobo, em seguida descrever nódulos conforme dados do usuário.

Descritores possíveis:
- Ecogenicidade: anecoica, hipoecoica, isoecoica, hiperecoica, heterogênea, anecoica com finos ecos
- Margens: regulares, circunscritas, lobuladas, irregulares
- Formato, calcificações, vascularização, localização

═══════════════════════════════════════════════════
4.2. CONCLUSÃO — FORMATO EXATO POR LOBO
═══════════════════════════════════════════════════

Quando houver nódulo descrito no corpo, gerar item na conclusão SEPARADO POR LOBO, seguindo EXATAMENTE este formato:

"X) Lobo [direito|esquerdo|istmo] apresentando imagem [ecogenicidade] com NOTA FINAL [N] ([características clínicas]), equivalente ao TI-RADS [Z] ACR."

Onde:
- [ecogenicidade] = descritor verbatim como médico falou (hipoecoica / hiperecoica / isoecoica / anecoica / anecoica com finos ecos / heterogênea)
- [N] = NOTA Domingos exata como médico falou (1, 2, 3, 4, 5...)
- [características clínicas] = descrição correspondente à nota:
  · Nota 1-2: "características benignas"
  · Nota 3: "características provavelmente benignas"
  · Nota 4: "características intermediárias"
  · Nota 5: "características provavelmente malignas"
  · Nota 6+: "características malignas"
- [Z] = TI-RADS ACR exato como médico falou (1, 2, 3, 4a, 4b, 4c, 5)

⚠️ NUNCA calcular Nota Domingos ou TI-RADS — apenas reproduzir EXATAMENTE como médico informar.

EXEMPLOS CORRETOS:

✓ Médico fala: "nódulo no lobo direito, isoecoico, sólido, Nota Domingos 3, TI-RADS 3"
  Conclusão: "X) Lobo direito apresentando imagem isoecoica com NOTA FINAL 3 (características provavelmente benignas), equivalente ao TI-RADS 3 ACR."

✓ Médico fala: "nódulo no lobo esquerdo, hipoecoico, com margens irregulares, Nota Domingos 5, TI-RADS 4b"
  Conclusão: "X) Lobo esquerdo apresentando imagem hipoecoica com NOTA FINAL 5 (características provavelmente malignas), equivalente ao TI-RADS 4b ACR."

✓ Médico fala: "imagem anecoica com finos ecos no lobo direito, Nota 1, TI-RADS 2"
  Conclusão: "X) Lobo direito apresentando imagem anecoica com finos ecos com NOTA FINAL 1 (características benignas), equivalente ao TI-RADS 2 ACR."

MÚLTIPLOS NÓDULOS NO MESMO LOBO:
Separar com ";" dentro do mesmo item:
"X) Lobo direito apresentando imagem hipoecoica com NOTA FINAL 3 (características provavelmente benignas), equivalente ao TI-RADS 3 ACR; e imagem isoecoica com NOTA FINAL 1 (características benignas), equivalente ao TI-RADS 2 ACR."

ANTI-EXEMPLOS (NUNCA FAZER):

✗ "Lobo direito apresentando nódulo isoecoico, sólido, com Nota Domingos 3, TI-RADS 3."
  (formato curto, NÃO inclui "imagem [ecogenicidade]" + "NOTA FINAL X (característica)" + "equivalente ao TI-RADS Y ACR")

✗ "Nódulo isoecoico no lobo direito (Nota Domingos 3, TI-RADS 3)."
  (formato com parênteses errado)

✗ Calcular Nota Domingos ou TI-RADS quando médico não fornecer (NUNCA inventar)
