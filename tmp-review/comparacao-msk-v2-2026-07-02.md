# Comparação MSK v2 — renderer × writer_guarded (few-shots reais + gpt-4.1)

> Julgue o WRITER: **assinaria?** Marque ✅/❌.

---

## bea00bb6 — punho+cotovelo garble — FORA da amostra

**DITADO:** Ultrassonografia do punho esquerdo com dos tendões do 4º compartimento extensor. E outro lado com ultrassonografia do cotovelo direito com, terinopatia dos extensores, como dos extensores, não é?

**RENDERER (hoje):**
```
ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
Compartimentos extensores de aspecto preservado.
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Punho esquerdo ecograficamente normal.

ULTRASSONOGRAFIA DO COTOVELO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Alteração ecográfica na topografia avaliada, detalhada na conclusão.
Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas.
Tendões distais do bíceps e do tríceps de aspecto preservado.
Ausência de derrame articular ou coleções.

CONCLUSÃO:
Tendinopatia dos extensores ao cotovelo direito.
```

**WRITER_GUARDED v2** (gpt-4.1; audit=ok):
```
ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões do 4º compartimento extensor com alteração do padrão ecotextural, sem evidência de rotura.
Tendões flexores e retináculo dos flexores de aspecto preservado.
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Tendinopatia dos tendões do 4º compartimento extensor do punho esquerdo.



ULTRASSONOGRAFIA DO COTOVELO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTOS ASPECTOS FORAM OBSERVADOS:
Tendões extensores comuns (epicôndilo lateral) com alteração do padrão ecotextural, sem evidência de rotura.
Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas.
Tendões distais do bíceps e do tríceps de aspecto preservado.
Ausência de derrame articular ou coleções.

CONCLUSÃO:
Tendinopatia dos tendões extensores comuns do cotovelo direito.
```

**Assinaria? [ ]**

---

## 6afe8f78 — ombro+joelho+Baker+comando — FORA da amostra

**DITADO:** Ultrassonografia do ombro direito com tendinopatia do supraespinhal, ibos, subdeltóidea. Subacromial, subdeltoidea. Tem ultrassonografia do joelho direito. Com tendinopatia dos tenores da pata de ganso, e 1 cisto de Baker, que 1 imagem aquática medindo 2.4 centímetros no seu maior eixo. A localização você coloca, como você, eu quero, o comando é que você raciocine a localização, do do cisto de e coloque lá no local especificado do lado.

**RENDERER (hoje):**
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e heterogeneidade ecotextural, sem solução de continuidade evidente.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
ibos, subdeltóidea. Subacromial, subdeltoidea.
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do supraespinhal à direita.
2) Bursite subacromial à direita.

ULTRASSONOGRAFIA DO JOELHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão quadricipital de espessura, continuidade e ecotextura preservadas.
Tendão patelar de espessura, continuidade e ecotextura preservadas.
tendinopatia dos tenores da pata de ganso
Ausência de derrame articular significativo.
imagem aquática medindo 2.4 centímetros no seu maior eixo
Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
1) Tendinopatia da pata de ganso à direita.
2) Cisto de Baker à direita.
```

**WRITER_GUARDED v2** (gpt-4.1; audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessura preservada, apresentando alteração da ecotextura, sem evidência de rotura.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
Bursa subacromial-subdeltoidea com espessamento e sinais de distensão.
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do tendão supraespinhal direito.
2) Bursite subacromial-subdeltoidea à direita.



ULTRASSONOGRAFIA DO JOELHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão quadricipital de espessura, continuidade e ecotextura preservadas.
Tendão patelar de espessura, continuidade e ecotextura preservadas.
Tendões da pata de ganso com espessura preservada, apresentando redução da ecogenicidade e perda parcial do padrão fibrilar.
Ausência de derrame articular significativo.
Fossa poplítea com imagem anecoica, de contornos regulares, localizada entre os ventres musculares do gastrocnêmio medial e semimembranoso, medindo 2,4 cm no maior eixo, compatível com cisto de Baker.
Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
1) Tendinopatia dos tendões da pata de ganso à direita.
2) Cisto de Baker à direita.
```

**Assinaria? [ ]**

---

## 4be35531 — ombro degenerativo — FORA da amostra

**DITADO:** Sonografia do ombro direito com tendino supraespinhal, bursite subacromial, subdetoidea, e, osteófitos e, Irregularidade cortical na articulação acrômio clavicular.

**RENDERER (hoje):**
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e heterogeneidade ecotextural, sem solução de continuidade evidente.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
bursite subacromial, subdetoidea
irregularidade cortical e osteófitos marginais
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do supraespinhal à direita.
2) Bursite subacromial à direita.
3) Alterações degenerativas da articulação acromioclavicular à direita.
```

**WRITER_GUARDED v2** (gpt-4.1; audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com alteração do padrão ecotextural, sem evidência de rotura.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
Bursa subacromial-subdeltoidea com espessamento e discreta distensão.
Articulação acromioclavicular com osteófitos marginais e irregularidade cortical.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do supraespinhal direito.
2) Bursite subacromial-subdeltoidea à direita.
3) Alterações degenerativas da articulação acromioclavicular direita, com osteófitos marginais e irregularidade cortical.
```

**Assinaria? [ ]**

---

## a89e8109 — mão/punho bilateral + comandos (o que você mais criticou; gêmeo 7c391290 é few-shot)

**DITADO:** Do da mão direita, da mão esquerda, do punho direito e do punho esquerdo, no punho esquerdo, terinopatia tenossinovite do 4º compartimento extensor, Área de secção transversa do nervo mediano esquerdo normal, medindo 4 milímetros quadrados, No 3º quirodácto pode colocar mão esquerda, quer dizer 3º quirodácto da mão esquerda, imagem anecoica, com margem regular medindo 0.3 por 0.1 por 0.4 centímetros. No, Na conclusão com com cisto sinovial, ou comumente relacionado a a, entre parênteses dedo em gatilho, entre aspas, no e dedo em gatilho, Mão direita com rizartrose, punho direito Área de secção transversa do nervo mediano normal, medindo 5.1 milímetros quadrados na entrada do túnel do carpo,

**RENDERER (hoje):**
```
ULTRASSONOGRAFIA DA MÃO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
Polias digitais sem espessamento sinovial.
Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.

CONCLUSÃO:
Mão direito ecograficamente normal.

ULTRASSONOGRAFIA DA MÃO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
imagem anecoica, com margem regular medindo 0.3 por 0.1 por 0.4 centímetros no 3º quirodácto
Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.

CONCLUSÃO:
Cisto sinovial no 3º quirodácto da mão esquerda.

ULTRASSONOGRAFIA DO PUNHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
Compartimentos extensores de aspecto preservado.
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Punho direito ecograficamente normal.

ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
tenossinovite do 4º compartimento extensor
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Tenossinovite do 4º compartimento extensor no punho esquerdo.
```

**WRITER_GUARDED v2** (gpt-4.1; audit=ok):
```
ULTRASSONOGRAFIA DA MÃO DIREITA

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
Polias digitais sem espessamento sinovial.
Alterações degenerativas na articulação trapézio-metacarpal (rizartrose).
Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.

CONCLUSÃO:
Rizartrose à direita.


ULTRASSONOGRAFIA DA MÃO ESQUERDA

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
Polias digitais sem espessamento sinovial.
No 3º quirodáctilo da mão esquerda, imagem anecoica com margem regular, medindo 0,3 x 0,1 x 0,4 cm.
Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas adicionais no segmento avaliado.

CONCLUSÃO:
Cisto sinovial na polia do 3º quirodáctilo da mão esquerda, achado comumente relacionado à tenossinovite estenosante (“dedo em gatilho”).


ULTRASSONOGRAFIA DO PUNHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
Compartimentos extensores de aspecto preservado.
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo, com área de secção transversa medindo 5,1 mm².
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Exame ultrassonográfico do punho direito sem alterações relevantes.


ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
Tendões do 4º compartimento extensor com espessamento e alteração da ecotextura, associados a sinais de tenossinovite.
Compartimentos extensores restantes de aspecto preservado.
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo, com área de secção transversa medindo 4 mm².
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Tendinopatia e tenossinovite dos tendões do 4º compartimento extensor do punho esquerdo.
```

**Assinaria? [ ]**

---

## 081590cd — joelho+pé só-diagnóstico — FORA da amostra

**DITADO:** Joelho direito com Tendinopatia da pata de ganso, pé esquerdo com fasciite plantar

**RENDERER (hoje):**
```
ULTRASSONOGRAFIA DO JOELHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão quadricipital de espessura, continuidade e ecotextura preservadas.
Tendão patelar de espessura, continuidade e ecotextura preservadas.
Tendões da pata de ganso (grácil, sartório e semitendíneo) com espessamento e redução difusa da ecogenicidade, com perda do padrão fibrilar, junto à inserção na face medial da tíbia proximal.
Ausência de derrame articular significativo.
Fossa poplítea sem coleções ou cisto de Baker.
Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
Tendinopatia da pata de ganso à direita.

ULTRASSONOGRAFIA DO PÉ ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fáscia plantar espessada na sua origem calcânea, com redução da ecogenicidade e perda do padrão fibrilar habitual.
Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.

CONCLUSÃO:
Fasciite plantar à esquerda.
```

**WRITER_GUARDED v2** (gpt-4.1; audit=ok):
```
ULTRASSONOGRAFIA DO JOELHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão quadricipital de espessura, continuidade e ecotextura preservadas.
Tendão patelar de espessura, continuidade e ecotextura preservadas.
Tendões da pata de ganso com espessamento e redução da ecotextura, sem evidência de roturas.
Ausência de derrame articular significativo.
Fossa poplítea sem coleções ou cisto de Baker.
Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
Tendinopatia dos tendões da pata de ganso à direita.



ULTRASSONOGRAFIA DO PÉ ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fáscia plantar com espessamento e redução da ecotextura.
Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.

CONCLUSÃO:
Fasciite plantar à esquerda.
```

**Assinaria? [ ]**

---

## 1bb5975f — ombro normal — FORA da amostra

**DITADO:** Ultrassonografia do ombro esquerdo normal

**RENDERER (hoje):**
```
ULTRASSONOGRAFIA DO OMBRO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
Bursa subacromial-subdeltoidea sem distensão.
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
Ombro esquerdo sem alterações ecográficas relevantes.
```

**WRITER_GUARDED v2** (gpt-4.1; audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
Bursa subacromial-subdeltoidea sem distensão.
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
Exame ultrassonográfico do ombro esquerdo sem alterações.
```

**Assinaria? [ ]**
