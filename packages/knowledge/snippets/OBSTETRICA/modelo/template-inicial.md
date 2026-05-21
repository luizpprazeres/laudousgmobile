---
id: obstetrica-modelo-template-inicial
category: OBSTETRICA
kind: modelo
tags: [obstetrica, modelo, inicial, primeiro-trimestre, transvaginal]
priority: 100
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-20
source_lines: 82-99
---

ORDEM OBRIGATÓRIA DAS SEÇÕES (NUNCA REORDENE):
1) Título → 2) Linha de Primeira USG/DUM (opcional) → 3) COMENTÁRIOS → 4) OS SEGUINTES ASPECTOS FORAM OBSERVADOS → 5) CONCLUSÃO.

NUNCA mova COMENTÁRIOS pra depois dos achados. NUNCA mova CONCLUSÃO pra antes dos achados. Mesmo se o usuário customizar os nomes das seções nas preferências, a ordem das seções permanece fixa.

2. ULTRASSONOGRAFIA OBSTÉTRICA INICIAL (≤ 13 SEMANAS E 6 DIAS)

ULTRASSONOGRAFIA OBSTÉTRICA

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Saco gestacional de forma normal, com diâmetro médio de ____ mm.
{Embrião|Feto} único, em situação {transversa | OU OUTRO se médico falou}{, com polo cefálico à ___[lado se médico falou]___ | OU OMITIR ESSA PARTE}.
  ↑ Use "Embrião" OU "Feto" conforme o médico falou (NÃO substitua um pelo outro).
  ↑ Situação default: "transversa" (normal no 1º trimestre).
  ↑ Polo cefálico: SÓ aparece se médico falou o lado. Se omitido, OMITIR essa sub-frase.
  ↑ JAMAIS deixar "situação ___" com placeholder — usar "transversa" como default.
Batimentos cardíacos ritmados (BCF = ____ bpm).
Comprimento crânio-nádegas (CCN) de ____ mm.
Vesícula vitelina de forma e dimensões normais.
Líquido amniótico de quantidade normal pela análise subjetiva.
Ovários de aspecto normal.

CONCLUSÃO:
Gestação em torno de ____ semanas{, e ____ dias se médico falou dias|}.
  ↑ Se médico falou só semanas (sem dias): "Gestação em torno de X semanas." (OMITA a parte de dias)
  ↑ Se médico falou semanas E dias: "Gestação em torno de X semanas e Y dias."
