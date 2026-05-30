---
id: pelve-feminina-regra-miomas
category: PELVE_FEMININA
kind: regra
tags: [pelve-feminina, mioma, miomas, miometrio, figo, utero-miomatoso]
priority: 75
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 957-992
---

Esta regra trata especificamente de MIOMAS uterinos (mioma, miomas, nódulo miomatoso, útero miomatoso, mioma intramural, mioma subseroso, mioma submucoso, miomatoso, classificação FIGO de mioma). MIOMA é o achado central. Aplica quando o input do médico mencionar qualquer um destes termos.

GATILHOS DE APLICAÇÃO (palavras-chave detectáveis no input): mioma, miomas, nódulo miomatoso, útero miomatoso, mioma intramural, mioma subseroso, mioma submucoso, miomatoso, FIGO 0, FIGO 1, FIGO 2, FIGO 3, FIGO 4, FIGO 5, FIGO 6, FIGO 7, FIGO 8.

MODIFICAÇÕES PADRONIZADAS (APLICAR QUANDO SOLICITADO)

- Mioma uterino único
Corpo (substitui a frase do miométrio):
Miométrio apresentando imagem hipoecoica e heterogênea, com margens regulares, medindo {a} x {b} x {c} cm, situada na {parede}, {relação serosa/mucosa}.
Conclusão:
Miométrio apresentando imagem sólida, que tem como diagnóstico mais provável nódulo miomatoso {intramural/subseroso/submucoso}{, com mais/menos de 50% intramural, se aplicável}{ (categoria FIGO {n}), SOMENTE quando o médico fornecer número FIGO explícito OU descrição totalmente unívoca conforme regra figo-nao-inferir.md}.

- Dois miomas
Corpo (substitui a frase do miométrio):
Miométrio apresentando duas imagens hipoecoicas e heterogêneas, com margens regulares. A primeira medindo {a} x {b} x {c} cm, situada na {parede1}, {relação1}. A segunda medindo {a} x {b} x {c} cm, situada na {parede2}, {relação2}.
Conclusão:
Miométrio apresentando duas imagens sólidas, que têm como diagnóstico mais provável nódulos miomatosos: o primeiro {classif1}{ (categoria FIGO {n1}), SOMENTE se fornecido explicitamente}, e o segundo {classif2}{ (categoria FIGO {n2}), SOMENTE se fornecido explicitamente}.

- Três ou mais miomas mensuráveis individualmente
Corpo (substitui a frase do miométrio):
Miométrio apresentando múltiplas imagens hipoecoicas e heterogêneas. As maiores assim descritas: a primeira medindo {a} x {b} x {c} cm, situada na {parede1}; a segunda medindo {a} x {b} x {c} cm, situada na {parede2}; [a terceira medindo {a} x {b} x {c} cm, situada na {parede3}; ...]
Conclusão:
Miométrio apresentando múltiplas imagens sólidas, que têm como diagnóstico mais provável nódulos miomatosos. Os maiores: {classif1}{ (categoria FIGO {n1}), SOMENTE se fornecido}, {classif2}{ (categoria FIGO {n2}), SOMENTE se fornecido}[, e {classif3}{ (categoria FIGO {n3}), SOMENTE se fornecido}].

REGRA CRÍTICA — FIGO CONDICIONAL: o item "(categoria FIGO {n})" é INCLUÍDO no laudo APENAS quando o médico fornecer o número FIGO explicitamente OU descrever a localização anatômica de forma TOTALMENTE UNÍVOCA (ver regra/figo-nao-inferir.md priority 97 universal). Quando o input do médico for genérico ("mioma intramural" sem detalhamento de % intramural ou contato endometrial), OMITIR a notação FIGO numérica e manter apenas a descrição anatômica. NUNCA inferir número FIGO automaticamente.

- Útero miomatoso (múltiplos nódulos, não mensuráveis individualmente)
  Usar quando o volume uterino for acentuadamente aumentado e os nódulos forem tão numerosos ou volumosos que não permitem individualização ecográfica.
Corpo (substitui a frase do miométrio):
Miométrio apresentando múltiplas imagens hipoecoicas e heterogêneas, coalescentes, ocasionando atenuação sonora, que impede a avaliação individualizada.
Conclusão (substitui o item de volume + miométrio):
Útero globoso (miomatoso), de volume acentuadamente aumentado ({vol} cm³).
  • Se o endométrio for visível com medida: acrescentar item "O endométrio mede {endo} cm, de difícil avaliação em razão do útero miomatoso."
  • Se o endométrio não for avaliável: acrescentar item "Não foi possível medir adequadamente a espessura endometrial devido aos artefatos projetos pelos nódulos miomatosos."

REGRA TRANSVERSAL DE MIOMAS
- Nota explicativa do FIGO: incluir uma única vez ao FINAL do laudo (após a CONCLUSÃO completa, separada por uma linha em branco) APENAS quando uma classificação FIGO numérica (FIGO 0-8 ou híbrido X-Y) foi efetivamente emitida no laudo. Texto verbatim: "FIGO: Federação Internacional de Ginecologia e Obstetrícia."
- Quando nenhuma classificação FIGO numérica aparecer no corpo ou conclusão (laudo usa apenas descrição anatômica), OMITIR completamente a nota FIGO — não fazer sentido definir sigla não utilizada.
- NUNCA colocar a nota FIGO dentro de um item da conclusão. NUNCA repetir a nota FIGO no mesmo laudo.
- Localização fúndica: usar SEMPRE "situada em região fúndica" — NUNCA "situada no fundo".
- Para dois miomas: usar dois-pontos após "nódulos miomatosos" e letra minúscula em "o primeiro / o segundo".
- Para três ou mais: usar ponto após a frase principal, iniciar nova frase com "Os maiores:".
- Para útero miomatoso: omitir classificação FIGO individual; não há items específicos por nódulo.
