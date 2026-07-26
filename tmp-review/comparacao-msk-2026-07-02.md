# Comparação MSK — renderer atual × writer_guarded (10 casos reais)

> Julgue cada um: **assinaria** o writer_guarded? Marque ✅/❌ e comente.

---

## bea00bb6

**DITADO:**
> Ultrassonografia do punho esquerdo com dos tendões do 4º compartimento extensor. E outro lado com ultrassonografia do cotovelo direito com, terinopatia dos extensores, como dos extensores, não é?

**RENDERER ATUAL:**
```
ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
Alteração ecográfica na topografia avaliada, detalhada na conclusão.
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Tendinopatia dos tendões do 4º compartimento extensor à esquerda.

ULTRASSONOGRAFIA DO COTOVELO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão extensor comum (epicôndilo lateral) com espessamento e redução da ecogenicidade, com perda do padrão fibrilar.
Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas.
Tendões distais do bíceps e do tríceps de aspecto preservado.
Ausência de derrame articular ou coleções.

CONCLUSÃO:
Tendinopatia dos extensores à direita.
```

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Compartimentos extensores de aspecto preservado.

CONCLUSÃO:
- Aspecto preservado dos tendões do 4º compartimento extensor do punho esquerdo.

ULTRASSONOGRAFIA DO COTOVELO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendões extensores comuns (epicôndilo lateral) com espessamento e redução da ecogenicidade, perda do padrão fibrilar.

CONCLUSÃO:
Tendinopatia dos tendões extensores comuns do cotovelo direito.
```

**Assinaria o writer? [ ]**

---

## 6afe8f78

**DITADO:**
> Ultrassonografia do ombro direito com tendinopatia do supraespinhal, ibos, subdeltóidea. Subacromial, subdeltoidea. Tem ultrassonografia do joelho direito. Com tendinopatia dos tenores da pata de ganso, e 1 cisto de Baker, que 1 imagem aquática medindo 2.4 centímetros no seu maior eixo. A localização você coloca, como você, eu quero, o comando é que você raciocine a localização, do do cisto de e coloque lá no local especificado do lado.

**RENDERER ATUAL:**
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e heterogeneidade ecotextural, sem solução de continuidade evidente.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
Subacromial, subdeltoidea.
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
Tendões da pata de ganso (grácil, sartório e semitendíneo) com espessamento e redução difusa da ecogenicidade, com perda do padrão fibrilar, junto à inserção na face medial da tíbia proximal.
Ausência de derrame articular significativo.
Imagem aquática medindo 2.4 centímetros no seu maior eixo.
Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
1) Tendinopatia da pata de ganso à direita.
2) Cisto de Baker à direita.
```

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e redução da ecogenicidade, perda do padrão fibrilar.
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
Tendão subescapular de espessura, continuidade e ecotextura preservadas.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
Bursa subacromial-subdeltoidea com discreta distensão por conteúdo anecoico.
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
Tendinopatia do tendão supraespinhal direito.
Bursite subacromial-subdeltoidea direita.

ULTRASSONOGRAFIA DO JOELHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão quadricipital de espessura, continuidade e ecotextura preservadas.
Tendão patelar de espessura, continuidade e ecotextura preservadas.
Tendões da pata de ganso com espessamento e redução da ecogenicidade, perda do padrão fibrilar.
Ausência de derrame articular significativo.
Fossa poplítea com cisto anecoico medindo 2,4 cm no maior eixo, localizado na região posteromedial da fossa poplítea.
Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
Tendinopatia dos tendões da pata de ganso direita.
Cisto de Baker direito medindo 2,4 cm.
```

**Assinaria o writer? [ ]**

---

## 4be35531

**DITADO:**
> Sonografia do ombro direito com tendino supraespinhal, bursite subacromial, subdetoidea, e, osteófitos e, Irregularidade cortical na articulação acrômio clavicular.

**RENDERER ATUAL:**
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

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e redução da ecogenicidade, perda do padrão fibrilar.  
Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.  
Tendão subescapular de espessura, continuidade e ecotextura preservadas.  
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.  
Bursa subacromial-subdeltoidea com distensão e conteúdo anecoico compatível com líquido.  
Articulação acromioclavicular com irregularidade cortical e presença de osteófitos.  
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do tendão supraespinhal.  
2) Bursite subacromial-subdeltoidea.  
3) Alterações degenerativas da articulação acromioclavicular com irregularidade cortical e osteófitos.
```

**Assinaria o writer? [ ]**

---

## a89e8109

**DITADO:**
> Do da mão direita, da mão esquerda, do punho direito e do punho esquerdo, no punho esquerdo, terinopatia tenossinovite do 4º compartimento extensor, Área de secção transversa do nervo mediano esquerdo normal, medindo 4 milímetros quadrados, No 3º quirodácto pode colocar mão esquerda, quer dizer 3º quirodácto da mão esquerda, imagem anecoica, com margem regular medindo 0.3 por 0.1 por 0.4 centímetros. No, Na conclusão com com cisto sinovial, ou comumente relacionado a a, entre parênteses dedo em gatilho, entre aspas, no e dedo em gatilho, Mão direita com rizartrose, punho direito Área de secção transversa do nervo mediano normal, medindo 5.1 milímetros quadrados na entrada do túnel do carpo,

**RENDERER ATUAL:**
```
ULTRASSONOGRAFIA DA MÃO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
Polias digitais sem espessamento sinovial.
Alteração ecográfica na topografia avaliada, detalhada na conclusão.

CONCLUSÃO:
Rizartrose à direita.

ULTRASSONOGRAFIA DA MÃO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
imagem anecoica, com margem regular medindo 0.3 por 0.1 por 0.4 centímetros
Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.

CONCLUSÃO:
Cisto sinovial no 3º quirodácto da mão esquerda.

ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
teninopatia tenossinovite do 4º compartimento extensor
Nervo mediano de calibre e ecotextura preservados ao nível do túnel do carpo.
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Tenossinovite do 4º compartimento extensor do punho esquerdo.

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
Compartimentos extensores de aspecto preservado.
Área de secção transversa do nervo mediano esquerdo normal, medindo 4 milímetros quadrados
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Nervo mediano com área de secção transversa normal no punho esquerdo.

ULTRASSONOGRAFIA DO PUNHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.
Compartimentos extensores de aspecto preservado.
Área de secção transversa do nervo mediano normal, medindo 5.1 milímetros quadrados na entrada do túnel do carpo
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Nervo mediano com área de secção transversa normal no punho direito.
```

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DA MÃO ESQUERDA

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas, exceto no 4º compartimento extensor, que apresenta espessamento e aumento da vascularização compatíveis com tenossinovite.
- Polias digitais sem espessamento sinovial.
- Imagem anecoica, com margem regular, medindo 0,3 x 0,1 x 0,4 cm, localizada no 3º quirodáctilo, compatível com cisto sinovial.
- Não foram evidenciadas outras coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.

CONCLUSÃO:
1) Tenossinovite do 4º compartimento extensor da mão esquerda.
2) Cisto sinovial no 3º quirodáctilo da mão esquerda, associado a dedo em gatilho.

ULTRASSONOGRAFIA DA MÃO DIREITA

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendões flexores e extensores dos quirodáctilos com espessura, continuidade e ecotextura preservadas.
- Polias digitais sem espessamento sinovial.
- Alterações degenerativas compatíveis com rizartrose.
- Não foram evidenciadas coleções, lesões expansivas ou roturas tendíneas no segmento avaliado.

CONCLUSÃO:
Rizartrose da mão direita.

ULTRASSONOGRAFIA DO PUNHO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendões flexores e retináculo dos flexores com espessura e ecotextura preservadas, exceto no 4º compartimento extensor, que apresenta espessamento e sinais de tenossinovite.
- Compartimentos extensores de aspecto preservado nos demais compartimentos.
- Nervo mediano de calibre e ecotextura preservados, com área de seção transversa medindo 4 mm² na entrada do túnel do carpo.
- Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Tenossinovite do 4º compartimento extensor no punho esquerdo.

ULTRASSONOGRAFIA DO PUNHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendões flexores e retináculo dos flexores de aspecto preservado.
- Compartimentos extensores de aspecto preservado.
- Nervo mediano de calibre e ecotextura preservados, com área de seção transversa medindo 5,1 mm² na entrada do túnel do carpo.
- Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Nervo mediano com área de seção transversa normal no punho direito.
```

**Assinaria o writer? [ ]**

---

## 081590cd

**DITADO:**
> Joelho direito com Tendinopatia da pata de ganso, pé esquerdo com fasciite plantar

**RENDERER ATUAL:**
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

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO JOELHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendão quadricipital de espessura, continuidade e ecotextura preservadas.
- Tendão patelar de espessura, continuidade e ecotextura preservadas.
- Tendões da pata de ganso com espessamento e redução da ecogenicidade, além de perda do padrão fibrilar.
- Ausência de derrame articular significativo.
- Fossa poplítea sem coleções ou cisto de Baker.
- Planos musculares e subcutâneos avaliados sem alterações relevantes.

CONCLUSÃO:
Tendinopatia dos tendões da pata de ganso direita.

ULTRASSONOGRAFIA DO PÉ ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Fáscia plantar com espessamento e redução da ecogenicidade.
- Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
- Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.

CONCLUSÃO:
Fasciite plantar esquerda.
```

**Assinaria o writer? [ ]**

---

## 0d36e3f4

**DITADO:**
> Grafia do ombro esquerdo com alterações degenerativas da esquerda, com osteóficos marginais e regularidade cortical, E0E0 restante normal.

**RENDERER ATUAL:**
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
irregularidade cortical e osteófitos marginais
Não há sinais de derrame articular significativo.

CONCLUSÃO:
Alterações degenerativas da articulação acromioclavicular à esquerda.
```

**WRITER_GUARDED** (audit=ok):
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
Articulação acromioclavicular com irregularidade cortical e presença de osteófitos marginais, compatível com alterações degenerativas.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
Alterações degenerativas da articulação acromioclavicular esquerda.
```

**Assinaria o writer? [ ]**

---

## edcfee95

**DITADO:**
> Tornozelo direito  Tornozelo direito com irregularidade cortical, na inserção do, tendão do calcâneo, osteófitos não é, marginais, na conclusão do tendao de aquiles

**RENDERER ATUAL:**
```
ULTRASSONOGRAFIA DO TORNOZELO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
irregularidade cortical, na inserção do, tendão do calcâneo, osteófitos não é, marginais, na conclusão do tendao de aquiles
Tendão tibial posterior de espessura e ecotextura preservadas.
Tendões fibulares de espessura e ecotextura preservadas.
Tendão tibial anterior de espessura e ecotextura preservadas.
Recesso articular tibiotalar sem coleções ou derrame.
Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.

CONCLUSÃO:
Alterações degenerativas na inserção do tendão de Aquiles à direita.
```

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO TORNOZELO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do tornozelo direito. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendão calcâneo (de Aquiles) com irregularidade cortical na sua inserção.
- Tendão tibial posterior de espessura e ecotextura preservadas.
- Tendões fibulares de espessura e ecotextura preservadas.
- Tendão tibial anterior de espessura e ecotextura preservadas.
- Recesso articular tibiotalar sem coleções ou derrame.
- Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.

CONCLUSÃO:
Irregularidade cortical na inserção do tendão de Aquiles no tornozelo direito, sem presença de osteófitos marginais.
```

**Assinaria o writer? [ ]**

---

## aecad190

**DITADO:**
> Ultrassonografia do ombro direito com tendinopatia do supra infra e  subescapular, com espessamento da bursa subafromial e subdeltoidea, no ombro esquerdo a mesma coisa.

**RENDERER ATUAL:**
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e heterogeneidade ecotextural, sem solução de continuidade evidente.
Alteração ecográfica na topografia avaliada, detalhada na conclusão.
Alteração ecográfica na topografia avaliada, detalhada na conclusão.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
espessamento da bursa subafromial e subdeltoidea
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do supraespinhal à direita.
2) Tendinopatia do infraespinhal à direita.
3) Tendinopatia do subescapular à direita.
4) Bursite subacromial à direita.

ULTRASSONOGRAFIA DO OMBRO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento e heterogeneidade ecotextural, sem solução de continuidade evidente.
Alteração ecográfica na topografia avaliada, detalhada na conclusão.
Alteração ecográfica na topografia avaliada, detalhada na conclusão.
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
espessamento da bursa subafromial e subdeltoidea
Articulação acromioclavicular de aspecto preservado.
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia do supraespinhal à esquerda.
2) Tendinopatia do infraespinhal à esquerda.
3) Tendinopatia do subescapular à esquerda.
4) Bursite subacromial à esquerda.
```

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento, redução da ecogenicidade e perda do padrão fibrilar.  
Tendão infraespinhal com espessamento, redução da ecogenicidade e perda do padrão fibrilar.  
Tendão subescapular com espessamento, redução da ecogenicidade e perda do padrão fibrilar.  
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.  
Bursa subacromial-subdeltoidea com espessamento e aumento do conteúdo líquido.  
Articulação acromioclavicular de aspecto preservado.  
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia dos tendões supraespinhal, infraespinhal e subescapular direitos.  
2) Bursite subacromial-subdeltoidea direita.

ULTRASSONOGRAFIA DO OMBRO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendão supraespinhal com espessamento, redução da ecogenicidade e perda do padrão fibrilar.  
Tendão infraespinhal com espessamento, redução da ecogenicidade e perda do padrão fibrilar.  
Tendão subescapular com espessamento, redução da ecogenicidade e perda do padrão fibrilar.  
Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.  
Bursa subacromial-subdeltoidea com espessamento e aumento do conteúdo líquido.  
Articulação acromioclavicular de aspecto preservado.  
Não há sinais de derrame articular significativo.

CONCLUSÃO:
1) Tendinopatia dos tendões supraespinhal, infraespinhal e subescapular esquerdos.  
2) Bursite subacromial-subdeltoidea esquerda.
```

**Assinaria o writer? [ ]**

---

## 1bb5975f

**DITADO:**
> Ultrassonografia do ombro esquerdo normal

**RENDERER ATUAL:**
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

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO OMBRO ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
- Tendão supraespinhal de espessura, continuidade e ecotextura preservadas.
- Tendão infraespinhal de espessura, continuidade e ecotextura preservadas.
- Tendão subescapular de espessura, continuidade e ecotextura preservadas.
- Cabo longo do bíceps tópico, de espessura e ecotextura preservadas.
- Bursa subacromial-subdeltoidea sem distensão.
- Articulação acromioclavicular de aspecto preservado.
- Não há sinais de derrame articular significativo.

CONCLUSÃO:
Exame ultrassonográfico do ombro esquerdo sem alterações.
```

**Assinaria o writer? [ ]**

---

## b98d2b06

**DITADO:**
> Microcenografia do do pé esquerdo com do tendão tibial posterior, E ultrassonografia do punho direito normal, com área transversa do nervo mediano na entrada do túnel do carpo de 7 milímetros quadrados. também normal.

**RENDERER ATUAL:**
```
ULTRASSONOGRAFIA DO PÉ ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fáscia plantar com espessura e ecotextura preservadas.
Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
do tendão tibial posterior

CONCLUSÃO:
Alteração do tendão tibial posterior à esquerda.

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
```

**WRITER_GUARDED** (audit=ok):
```
ULTRASSONOGRAFIA DO PÉ ESQUERDO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fáscia plantar com espessura e ecotextura preservadas.  
Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.  
Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.

ULTRASSONOGRAFIA DO PUNHO DIREITO

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Tendões flexores e retináculo dos flexores de aspecto preservado.  
Compartimentos extensores de aspecto preservado.  
Nervo mediano com área transversa de 7 mm² na entrada do túnel do carpo, de calibre e ecotextura preservados.  
Não há sinais de coleções, cistos sinoviais ou efusão articular no segmento avaliado.

CONCLUSÃO:
Exames ultrassonográficos do pé esquerdo e do punho direito sem alterações significativas.
```

**Assinaria o writer? [ ]**
