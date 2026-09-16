# Modelos obstétricos — exemplos para validação (16/09/2026)

Seis laudos gerados pela API de PRODUÇÃO a partir de ditado corrido, com a conta de
desenvolvimento e o estilo clássico, para o médico validar as composições. Página de
validação (decisões marcadas pelo médico): artifact `Modelos obstétricos`.

## Regra dos índices (no ar)

| Exame | Índices |
|---|---|
| Obstétrico com Doppler | somente IP |
| Morfológico com Doppler | somente IP |
| Doppler obstétrico isolado | IR e IP |
| Análise de imagem (iOS e Android) | mesma regra ao ler a tela do aparelho |

O IR sobrevive num exame combinado apenas quando é o único índice daquele vaso.

## Corrigido nesta rodada

- **Maior bolsão vertical virava ILA no morfológico** e gerava "Oligoâmnio" falso (bolsão de
  4,1 cm é normal; o limiar do bolsão é 2–8 cm e o do ILA é 5–25 cm). Novo campo `mbv_cm`.
- "polo cefálico à direita" quando o ditado traz só o lado (morfológico e obstétrico).

## Diferenças pendentes de decisão

1. Formato da seção Doppler nos combinados: `Artéria umbilical: IP 0,94 (percentil 49).` (modelo do médico) × frase por extenso (hoje), incluindo a ordem dos vasos.
2. Linha do perfil hemodinâmico no corpo (hoje aparece no corpo e na conclusão).
3. Linha de referência da calculadora de Barcelona.
4. Frases fixas na conclusão do Doppler (incisuras, pré-centralização): sempre × só quando ditadas.
5. Técnica de Doppler nos comentários: parágrafo próprio × integrada.
6. Título do isolado: DOPPLERVELOCIMETRIA × DOPPLERFLUXOMETRIA.
7. Linhas do isolado: uma por índice, nota das três medidas na umbilical, frase própria do ducto venoso.
8. Separador decimal: vírgula × ponto.
9. Cerebral média no percentil 4: manter o alerta de IP reduzido × chamar de normal.
10. Título do morfológico composto (acrescentar a cervicometria).
11. Ordem: Doppler antes da cervicometria.
12. Linha do peso: unificar "Peso aproximado de X g (+- Y g, percentil Z)".
13. Redação: "realizada em DD/MM/AAAA, com…", "que possui", "bolsa" × "bolsão", placenta heterogênea "de acordo com a fase da gestação".

Defeitos sem decisão, a corrigir: "apresentação pelvica" sem acento; IP das uterinas do 1T
arredondado para uma casa (2,38 → 2,4); zero à direita suprimido (0,60 → 0,6).


## A — Obstétrico com Doppler (combinado)

```
ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO

Primeira ultrassonografia realizada 08/04/2026 com 12 semanas e 4 dias. Hoje com 34 semanas e 4 dias.

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.
Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação cefálica, com dorso à esquerda.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = 130 bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
O estômago e a bexiga foram bem identificados e com ecotextura homogênea.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de 85,2 mm.
Circunferência da cabeça (CC) de 327,7 mm.
Circunferência abdominal (CA) de 295,4 mm.
Comprimento do fêmur (CF) de 66,8 mm.
Peso aproximado de 2379 gramas (+- 347 gramas, percentil 34,8).

Placenta de localização posterior, com ecotextura heterogênea.
Maior bolsão vertical de 5,2 cm.

DOPPLERVELOCIMETRIA:
Artéria uterina direita com índice de pulsatilidade de 0,42.
Artéria uterina esquerda com índice de pulsatilidade de 0,76.
Artéria umbilical com índice de pulsatilidade de 0,94 (percentil 49).
Artéria cerebral média com índice de pulsatilidade de 1,28 (percentil 4).
Índice de pulsatilidade médio das artérias uterinas de 0,59 (percentil 20).
Perfil hemodinâmico fetal de 0,73.
Referência: percentis calculados com as equações da Calculadora v2021 disponibilizada pela Fetal Medicine Barcelona.

CONCLUSÃO:
1) Gestação em torno de 34 semanas e 4 dias.
2) Líquido amniótico em quantidade normal (maior bolsão vertical de 5,2 cm).
3) Índice de pulsatilidade reduzido na artéria cerebral média.
4) Perfil hemodinâmico fetal é normal, menor de 1.0.
```

## B — Doppler obstétrico isolado

```
DOPPLERVELOCIMETRIA OBSTÉTRICA

COMENTÁRIOS:
Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artéria uterina direita com índice de resistividade de 0,59 e índice de pulsatilidade de 0,59.
Artéria uterina esquerda com índice de resistividade de 0,59 e índice de pulsatilidade de 0,59.
Artéria umbilical com índice de resistividade de 0,58 e índice de pulsatilidade de 1,8.
Artéria cerebral média com índice de resistividade de 0,81 e índice de pulsatilidade de 0,81.
Ducto venoso com índice de resistividade de 0,4 e índice de pulsatilidade de 1,89.
Perfil hemodinâmico fetal de 2,22.

CONCLUSÃO:
1) Índices de resistividade e de pulsatilidade normais nas artérias uterinas e umbilical.
2) Perfil hemodinâmico fetal alterado, maior de 1.0.
```

## C — Morfológico 2T + Doppler + cervicometria

```
ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE COM DOPPLER COLORIDO

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.
Foi realizada avaliação complementar do colo uterino pela via transvaginal.
Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação pelvica, com dorso à esquerda.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = 151 bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
Nariz e narinas presentes.
Lábio superior sem solução de continuidade.
Coração com quatro câmaras visíveis.
O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.
A aorta abdominal fetal apresenta calibre normal.
Genitália externa feminina.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de 45,9 mm.
Circunferência da cabeça (CC) de 172,6 mm.
Cerebelo mede 20,1 mm.
Cisterna magna mede 2,2 mm.
Distância binocular de 33,3 mm.
Circunferência abdominal (CA) de 142,2 mm.
Comprimento do fêmur direito de 31,8 mm.
Comprimento do fêmur esquerdo de 31,8 mm.
Comprimento da tíbia direita de 26,1 mm.
Comprimento da tíbia esquerda de 26,1 mm.
Comprimento da fíbula direita de 25,8 mm.
Comprimento da fíbula esquerda de 25,8 mm.
Comprimento do úmero direito de 29,4 mm.
Comprimento do úmero esquerdo de 29,4 mm.
Comprimento do rádio direito de 25,2 mm.
Comprimento do rádio esquerdo de 25,2 mm.
Comprimento da ulna direita de 27,7 mm.
Comprimento da ulna esquerda de 27,7 mm.
Peso fetal estimado em 310 g (+- 45 g).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização posterior, com ecotextura homogênea.
Maior bolsão vertical de 4,3 cm.

CERVICOMETRIA:
Distância do orifício interno ao orifício externo do colo uterino de 5,2 cm.
Orifício interno do colo uterino fechado.
Extremidade inferior da placenta distando cerca de 5,4 cm do orifício interno do colo.

DOPPLERVELOCIMETRIA:
Artéria uterina direita com índice de pulsatilidade de 1,11.
Artéria uterina esquerda com índice de pulsatilidade de 1,11.
Artéria umbilical com índice de pulsatilidade de 0,88.
Artéria cerebral média com índice de pulsatilidade de 1,33.
Ducto venoso com índice de pulsatilidade de 0,34.
Perfil hemodinâmico fetal de 0,66.

CONCLUSÃO:
1) Gestação em torno de 20 semanas.
2) Líquido amniótico de quantidade normal (maior bolsão vertical de 4,3 cm).
3) Morfologia fetal sem evidência de alteração detectável pelo método.
4) Colo uterino ecograficamente normal.
5) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
6) Perfil hemodinâmico fetal é normal, menor de 1.0.
```

## D — Morfológico 1T + Doppler das uterinas + cervicometria

```
ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.
Foi realizada avaliação complementar do colo uterino pela via transvaginal.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único de situação transversa, com polo cefálico à direita.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = 144 bpm).
Os movimentos fetais são ativos.
Comprimento crânio-nádegas (CCN) de 62,1 mm.
Medida da translucência nucal (TN) de 1,6 mm.
Presença de osso nasal.
Ausência de regurgitação tricúspide.
Ducto venoso com aspecto de onda trifásica (sístole ventricular, diástole ventricular e sístole atrial positivas).
Placenta de localização anterior, com ecotextura homogênea.
Líquido amniótico de quantidade normal pela análise subjetiva.
Artéria uterina direita: IP 2,4.
Artéria uterina esquerda: IP 0,7.
Índice de pulsatilidade médio das artérias uterinas: 1,6.

CERVICOMETRIA:
Distância do orifício interno ao orifício externo do colo uterino de 5,3 cm.
Orifício interno do colo uterino fechado.

CONCLUSÃO:
1) Gestação em torno de 12 semanas e 5 dias.
2) Líquido amniótico de quantidade normal.
3) Doppler do ducto venoso normal.
4) Morfologia fetal normal para esta fase da gestação.
5) Dopplervelocimetria normal das artérias uterinas.
6) Colo uterino ecograficamente normal.
```

## E — Morfológico 2T sem complementos

```
ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação cefálica, com dorso à esquerda.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = 142 bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
Nariz e narinas presentes.
Lábio superior sem solução de continuidade.
Coração com quatro câmaras visíveis.
O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.
A aorta abdominal fetal apresenta calibre normal.
Genitália externa masculina.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de 53,8 mm.
Circunferência da cabeça (CC) de 197,7 mm.
Cerebelo mede 21,3 mm.
Cisterna magna mede 3 mm.
Distância binocular de 38,6 mm.
Circunferência abdominal (CA) de 163,2 mm.
Comprimento do fêmur direito de 33,9 mm.
Comprimento do fêmur esquerdo de 33,9 mm.
Comprimento da tíbia direita de 29,4 mm.
Comprimento da tíbia esquerda de 29,4 mm.
Comprimento da fíbula direita de 28,2 mm.
Comprimento da fíbula esquerda de 28,2 mm.
Comprimento do úmero direito de 31,8 mm.
Comprimento do úmero esquerdo de 31,8 mm.
Comprimento do rádio direito de 26,9 mm.
Comprimento do rádio esquerdo de 26,9 mm.
Comprimento da ulna direita de 29,3 mm.
Comprimento da ulna esquerda de 29,3 mm.
Peso fetal estimado em 405 g (+- 59 g, percentil 71).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização anterior, com ecotextura homogênea.
Maior bolsão vertical de 4,1 cm.
Orifício interno do colo uterino fechado.

CONCLUSÃO:
1) Gestação em torno de 20 semanas e 5 dias.
2) Líquido amniótico de quantidade normal (maior bolsão vertical de 4,1 cm).
3) Morfologia fetal sem evidência de alteração detectável pelo método.
```

## F — Morfológico 3T + Doppler

```
ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE COM DOPPLER COLORIDO

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.
Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação cefálica, com dorso à direita.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = 138 bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
Nariz e narinas presentes.
Lábio superior sem solução de continuidade.
Coração com quatro câmaras visíveis.
O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.
A aorta abdominal fetal apresenta calibre normal.
Genitália externa masculina.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de 78 mm.
Circunferência da cabeça (CC) de 285 mm.
Cerebelo mede 38 mm.
Cisterna magna mede 5 mm.
Circunferência abdominal (CA) de 260 mm.
Comprimento do fêmur direito de 57 mm.
Comprimento do fêmur esquerdo de 57 mm.
Comprimento da tíbia direita de 50 mm.
Comprimento da tíbia esquerda de 50 mm.
Comprimento da fíbula direita de 49 mm.
Comprimento da fíbula esquerda de 49 mm.
Comprimento do úmero direito de 52 mm.
Comprimento do úmero esquerdo de 52 mm.
Comprimento do rádio direito de 45 mm.
Comprimento do rádio esquerdo de 45 mm.
Comprimento da ulna direita de 48 mm.
Comprimento da ulna esquerda de 48 mm.
Peso fetal estimado em 1550 g (+- 230 g).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização anterior, com ecotextura heterogênea, de acordo com a fase da gestação.
Maior bolsão vertical de 4,8 cm.

DOPPLERVELOCIMETRIA:
Artéria uterina direita com índice de pulsatilidade de 0,6.
Artéria uterina esquerda com índice de pulsatilidade de 0,55.
Artéria umbilical com índice de pulsatilidade de 0,9.
Artéria cerebral média com índice de pulsatilidade de 1,6.
Perfil hemodinâmico fetal de 0,56.

CONCLUSÃO:
1) Gestação em torno de 30 semanas e 2 dias.
2) Líquido amniótico de quantidade normal (maior bolsão vertical de 4,8 cm).
3) Morfologia fetal sem evidência de alteração detectável pelo método.
4) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
5) Perfil hemodinâmico fetal é normal, menor de 1.0.
```
