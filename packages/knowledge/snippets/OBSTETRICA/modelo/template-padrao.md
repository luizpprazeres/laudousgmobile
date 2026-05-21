---
id: obstetrica-modelo-template-padrao
category: OBSTETRICA
kind: modelo
tags: [obstetrica, modelo, padrao, segundo-trimestre, terceiro-trimestre]
priority: 100
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-20
source_lines: 50-80
---

TEMPLATES: Os templates abaixo devem ser reproduzidos exatamente, sem qualquer alteração estrutural ou textual, exceto nos campos variáveis.

ORDEM OBRIGATÓRIA DAS SEÇÕES (NUNCA REORDENE):
1) Título → 2) Linha de Primeira USG/DUM (opcional) → 3) COMENTÁRIOS → 4) OS SEGUINTES ASPECTOS FORAM OBSERVADOS → 5) CONCLUSÃO.

NUNCA mova COMENTÁRIOS pra depois dos achados. NUNCA mova CONCLUSÃO pra antes dos achados. Mesmo se o usuário customizar os nomes das seções nas preferências (ex: "Achados:" no lugar de "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:"), a ordem das seções permanece fixa.

1. ULTRASSONOGRAFIA OBSTÉTRICA (SEM DOPPLER) — PADRÃO (> 14 SEMANAS)

ULTRASSONOGRAFIA OBSTÉTRICA

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação {cefálica | OU OUTRO se médico falou}{, com dorso à ___[lado se médico falou]___ | OU OMITIR ESSA PARTE}.
  ↑ Apresentação default (quando médico omite): "cefálica" (mais comum a termo).
  ↑ Dorso: SÓ aparece se médico falou o lado. Se omitido, OMITIR essa sub-frase inteira.
  ↑ JAMAIS deixar "apresentação ___" ou "dorso ___" com placeholder — usar default ou omitir.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ____ bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
O estômago e a bexiga foram bem identificados e com ecotextura homogênea.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de ____ mm.
Circunferência da cabeça (CC) de ____ mm.
Circunferência abdominal (CA) de ____ mm.
Comprimento do fêmur (CF) de ____ mm.
Peso aproximado de ____ gramas{ (+- ____ gramas SE médico falou variação)(, percentil ___ SE médico falou percentil)}.
  ↑ Variação (+- X gramas) e percentil são OPCIONAIS. NÃO deixar placeholder se médico não falou.
  ↑ Se médico falou só o peso: "Peso aproximado de X gramas." (sem parênteses)
  ↑ Se médico falou peso + percentil (sem variação): "Peso aproximado de X gramas (percentil Y)."
  ↑ Se médico falou peso + variação (sem percentil): "Peso aproximado de X gramas (+- Y gramas)."
  ↑ Se médico falou os 3: "Peso aproximado de X gramas (+- Y gramas, percentil Z)."
  ↑ Use VÍRGULA pra separar variação e percentil dentro do parêntese (NÃO use "e").
  ↑ JAMAIS deixar "+-  ___" ou "percentil ___" como placeholder.

Placenta {de localização ___[loc se médico falou]___, com ecotextura ___[ecotex se médico falou]___ | de aspecto normal SE TUDO omitido}.
  ↑ Se médico não falou localização nem ecotextura: "Placenta de aspecto normal."
  ↑ Se médico falou só localização (sem ecotextura): manter localização + omitir parte de ecotextura.
  ↑ JAMAIS deixar "localização ___" ou "ecotextura ___" com placeholder.
{LINHA_LIQUIDO_AMNIOTICO}

CONCLUSÃO:
1) Gestação em torno de ____ semanas{, e ____ dias se médico falou dias|}.
   ↑ Se médico falou só semanas (sem dias): "Gestação em torno de X semanas." (OMITA dias)
   ↑ Se médico falou semanas E dias: "Gestação em torno de X semanas e Y dias."
{CONCLUSAO_LIQUIDO_AMNIOTICO}
