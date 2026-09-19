# Modelos obstétricos — decisões do médico aplicadas (18/09/2026)

Validação feita pelo médico na página `Modelos obstétricos`. As treze decisões e as observações
dele estão registradas no banco do próprio artifact (coleção `respostas`). Os laudos abaixo foram
gerados pela API de PRODUÇÃO depois das mudanças, a partir de ditado corrido.

## Decisões

| # | Ponto | Escolha |
|---|---|---|
| 1 | Formato da seção Doppler nos combinados | como estava: frase por extenso |
| 2 | Perfil hemodinâmico no corpo | manter no corpo e na conclusão |
| 3 | Linha de referência dos percentis | só quando houver percentil (já era) |
| 4 | Incisuras e centralização na conclusão | sempre, como no modelo |
| 5 | Técnica do Doppler nos comentários | integrar no parágrafo |
| 6 | Título do isolado | manter DOPPLERVELOCIMETRIA |
| 7 | Linhas do Doppler isolado | mudar para o modelo do médico |
| 8 | Separador decimal | vírgula |
| 9 | Cerebral média com percentil baixo | seguir o modelo (sem alerta isolado) |
| 10 | Título do morfológico composto | compor com Doppler e cervicometria |
| 11 | Ordem das seções | Doppler antes da cervicometria |
| 12 | Linha do peso | unificar "Peso aproximado de X g" |
| 13 | Detalhes de redação | ver observações |

Observações do médico (decisão 13): mantém "realizada 08/04/2026 com 12 semanas" (sem "em") e
"que possuem várias metodologias"; quer "O maior bolsão vertical (MBV) mede 5,2 cm." e a placenta
heterogênea "de acordo com a fase da gestação".

## Como ficou a regra clínica da cerebral média

O percentil CALCULADO da cerebral média não gera mais item de conclusão sozinho: a centralização
passa a ser julgada pelo perfil hemodinâmico (1/RCP) e pelo que o médico ditar — "centralização",
"ACM alterada" ou "ACM abaixo do percentil 5" continuam alertando, e o detector passou a aceptar
também a forma "abaixo DO percentil 5". Sem RCP calculável, o laudo continua não afirmando perfil
normal com a ACM em percentil baixo. Critério de Barcelona para CIUR tardio usa ACM IP < p5 OU
RCP < p5; com esta decisão o primeiro deixa de aparecer sozinho no laudo.

## Defeitos corrigidos junto

- "apresentação pelvica" sem acento.
- IP das uterinas do 1º trimestre arredondado para uma casa (2,38 virava 2,4).
- Zero à direita suprimido nos índices (0,60 virava 0,6).

## A — Obstétrico com Doppler (combinado)

```
ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO

Primeira ultrassonografia realizada 08/04/2026 com 12 semanas e 4 dias. Hoje com 34 semanas e 4 dias.

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

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
Peso aproximado de 2379 g (+- 347 g, percentil 34,8).

Placenta de localização posterior, com ecotextura heterogênea, de acordo com a fase da gestação.
O maior bolsão vertical (MBV) mede 5,2 cm.

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
2) Líquido amniótico de quantidade normal (o maior bolsão vertical mede 5,2 cm).
3) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
4) Ausência de sinais de incisuras.
5) Não há sinais de pré-centralização ou de centralização.
6) Perfil hemodinâmico fetal é normal, menor de 1.0.
```

## B — Doppler obstétrico isolado

```
DOPPLERVELOCIMETRIA OBSTÉTRICA

COMENTÁRIOS:
Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Índice de resistividade da artéria uterina direita de 0,59.
Índice de pulsatilidade da artéria uterina direita de 0,59.
Índice de resistividade da artéria uterina esquerda de 0,59.
Índice de pulsatilidade da artéria uterina esquerda de 0,59.
Índice de resistividade da artéria umbilical de 0,58 e índice de pulsatilidade de 1,80. (média de três medidas realizadas próximo à inserção na placenta, próximo ao abdome fetal e em alça livre).
Índice de resistividade da artéria cerebral média de 0,81.
Índice de pulsatilidade da artéria cerebral média de 0,81.
O ducto venoso tem índice de resistividade de 0,40 e índice de pulsatilidade de 1,89.
Perfil hemodinâmico fetal de 2,22.

CONCLUSÃO:
1) Índices de resistividade e de pulsatilidade normais nas artérias uterinas e umbilical.
2) Ausência de sinais de incisuras.
3) Perfil hemodinâmico fetal alterado, maior de 1.0.
```

## C — Morfológico 2T + Doppler + cervicometria

```
ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE COM DOPPLER COLORIDO E CERVICOMETRIA TRANSVAGINAL

Primeira ultrassonografia realizada 30/06/2026 com 9 semanas. Hoje com 20 semanas.

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. Foi realizada avaliação complementar do colo uterino pela via transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação pélvica, com dorso à esquerda.
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
Peso aproximado de 310 g (+- 45 g).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização posterior, com ecotextura homogênea.
O maior bolsão vertical (MBV) mede 4,3 cm.

DOPPLERVELOCIMETRIA:
Artéria uterina direita com índice de pulsatilidade de 1,11.
Artéria uterina esquerda com índice de pulsatilidade de 1,11.
Artéria umbilical com índice de pulsatilidade de 0,88.
Artéria cerebral média com índice de pulsatilidade de 1,33.
Ducto venoso com índice de pulsatilidade de 0,34.
Perfil hemodinâmico fetal de 0,66.

CERVICOMETRIA:
Distância do orifício interno ao orifício externo do colo uterino de 5,2 cm.
Orifício interno do colo uterino fechado.
Extremidade inferior da placenta distando cerca de 5,4 cm do orifício interno do colo.

CONCLUSÃO:
1) Gestação em torno de 20 semanas.
2) Líquido amniótico de quantidade normal (o maior bolsão vertical mede 4,3 cm).
3) Morfologia fetal sem evidência de alteração detectável pelo método.
4) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
5) Ausência de sinais de incisuras.
6) Não há sinais de pré-centralização ou de centralização.
7) Perfil hemodinâmico fetal é normal, menor de 1.0.
8) Colo uterino ecograficamente normal.
```

## D — Morfológico 1T + Doppler das uterinas + cervicometria

```
ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE COM DOPPLER COLORIDO E CERVICOMETRIA TRANSVAGINAL

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. Foi realizada avaliação complementar do colo uterino pela via transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

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
Artéria uterina direita: IP 2,38.
Artéria uterina esquerda: IP 0,72.
Índice de pulsatilidade médio das artérias uterinas: 1,55.

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

Primeira ultrassonografia realizada 22/07/2026 com 13 semanas e 5 dias. Hoje com 20 semanas e 5 dias.

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
Peso aproximado de 405 g (+- 59 g, percentil 71).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização anterior, com ecotextura homogênea.
O maior bolsão vertical (MBV) mede 4,1 cm.
Orifício interno do colo uterino fechado.

CONCLUSÃO:
1) Gestação em torno de 20 semanas e 5 dias.
2) Líquido amniótico de quantidade normal (o maior bolsão vertical mede 4,1 cm).
3) Morfologia fetal sem evidência de alteração detectável pelo método.
```

## F — Morfológico 3T + Doppler

```
ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE COM DOPPLER COLORIDO

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

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
Peso aproximado de 1550 g (+- 230 g).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização anterior, com ecotextura heterogênea, de acordo com a fase da gestação.
O maior bolsão vertical (MBV) mede 4,8 cm.

DOPPLERVELOCIMETRIA:
Artéria uterina direita com índice de pulsatilidade de 0,60.
Artéria uterina esquerda com índice de pulsatilidade de 0,55.
Artéria umbilical com índice de pulsatilidade de 0,90.
Artéria cerebral média com índice de pulsatilidade de 1,60.
Perfil hemodinâmico fetal de 0,56.

CONCLUSÃO:
1) Gestação em torno de 30 semanas e 2 dias.
2) Líquido amniótico de quantidade normal (o maior bolsão vertical mede 4,8 cm).
3) Morfologia fetal sem evidência de alteração detectável pelo método.
4) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
5) Ausência de sinais de incisuras.
6) Não há sinais de pré-centralização ou de centralização.
7) Perfil hemodinâmico fetal é normal, menor de 1.0.
```

---

## Biblioteca e personalização — o exame composto (19/09/2026)

O pedido do médico era curto: *"Na biblioteca a gente deixa da mesma forma um
obstétrico com Doppler e um toggle para a apenas o Doppler, para personalizações."*
Atendê-lo exigiu mexer onde a personalização mora, porque o obstétrico com
Doppler simplesmente não passava por lá.

### O que estava errado

A personalização do médico é aplicada sobre o **catálogo** (`OBSTETRICA.classico.ts`),
e o catálogo só sabia escrever o exame principal. Os **complementos** — a seção
DOPPLERVELOCIMETRIA e a seção CERVICOMETRIA — ficavam de fora:

- o Doppler saiu do caminho do catálogo em `26cb805`;
- a cervicometria nunca entrou.

Com a cervicometria caindo no catálogo, o laudo saía **sem a seção e sem o item de
conclusão do colo**: o médico media o colo e a medida desaparecia. Reproduzido
contra a produção em 18/09/2026. A correção imediata (tirar o exame composto do
catálogo) parou a perda, mas deixava de pé o problema de fundo: o exame que ele
mais pede era o único que a personalização não alcançava.

### O que foi feito

`buildObstetricaDoc` passou a chamar os **mesmos módulos** do renderer clássico
(`complementosDoExame`, em `OBSTETRICA.render.ts`), em vez de reescrever o texto.
São quatro pontos de injeção:

| Ponto | De onde vem |
|---|---|
| Sufixo do título (`COM DOPPLER COLORIDO`) | do renderer, sobre o título do catálogo |
| Frase de técnica dentro de COMENTÁRIOS | `inserirComentariosExtras`, sobre o preâmbulo **do catálogo** (preserva personalização) |
| Seções no corpo | `renderCervicometriaBloco`, `renderDopplerModule({ indices: "ip" })`, `renderFetalGrowthModule` |
| Itens da conclusão | os mesmos módulos |

Chamar o módulo, e não copiar a redação, é a parte que importa: foi a duplicação
do módulo Doppler que trouxe o IR de volta ao exame combinado, o erro relatado em
15/09. Agora uma regra clínica corrigida em um lugar vale nos três exames.

O que a personalização alcança é o **exame principal e o preâmbulo**. Os
complementos seguem escritos pelo sistema — o médico personaliza a normalidade que
ele redige, não a medida que ele mediu.

### Prova

`catalog-equivalence` ganhou a dimensão de complemento (sem, Doppler, cervicometria,
os dois, colo curto): **21.600/21.600 byte-a-byte idênticas ao renderer clássico**.
Eram 4.320 combinações antes.

### Na Biblioteca

- **Obstétrica** ganhou dois cenários: *Com Doppler* e *Com Doppler e cervicometria*.
- **Doppler obstétrico** virou *Doppler obstétrico (isolado)* — é o que usa IR e IP.

A semente de exemplo é indexada pelo **nome do cenário** (`exemplos.ts`); um cenário
novo sem entrada lá rende exemplo com `____` na biometria. Custou uma rodada descobrir.

### Extração

Reforçada uma regra no líquido amniótico: **a medida vence a palavra**. Ditar
"líquido amniótico normal, maior bolsão de 4,6 cm" fazia o extrator escolher
`normal` e descartar o 4,6 — a medida sumia do laudo. Achado ao validar em produção.

---

## Onde a personalização realmente mora (19/09/2026)

Vale registrar, porque é fácil errar: **existem dois caminhos de personalização**,
e eu mesmo confundi os dois ao listar os próximos passos.

| Caminho | Quem usa | Como funciona |
|---|---|---|
| **Catálogo escrito** | só `OBSTETRICA/CLASSICO_COMPLETO` | monta o laudo slot a slot com as frases do médico |
| **Frase derivada** | as outras doze categorias | o renderer monta o laudo, e a redação troca linha por linha, ancorada pelo `idDaFrase` |

O caminho de frase é o que cobre morfológico, Doppler isolado, abdome, tireoide,
mama, pelve e o resto. Ele é deliberadamente menos elegante e tem três
propriedades que compensam: **nada é reconstruído** (o laudo continua sendo o do
renderer de produção), **é fail-safe** (a troca só ocorre onde a frase-base casa,
então no pior caso a personalização não aplica — nunca sai laudo errado) e **o
dado sobrevive** (as medidas da linha real são reinseridas na redação).

Consequência prática: para mostrar o morfológico com Doppler na Biblioteca **não
foi preciso escrever catálogo nenhum**. A redação que o médico faz no modelo
simples já valia no exame composto, porque a âncora é a frase, e a frase é a
mesma. Faltava só ele poder conferir o exame como usa.

Isso virou gate em `redacao-alcanca-exame-composto.manual.ts`: pega uma frase de
normalidade do modelo simples, confirma que ela aparece no exame composto, aplica
a redação e verifica que o complemento fica intacto — seções presentes e medidas
do Doppler byte-a-byte iguais. Se a Biblioteca passar a prometer o que o laudo não
entrega, o teste reprova.

### E a Pelve feminina

Estava ausente da Biblioteca por um defeito de derivação, não de modelo:
`achadoNormalDe` devolvia `null` tanto para `.nullable()` quanto para
`.optional()`. Mas `.optional()` sem `.nullable()` não aceita `null`: o Zod
recusava o laudo derivado, e `laudoPadraoDe` engole a exceção para que uma
categoria quebrada não derrube a Biblioteca — então a categoria **sumia em
silêncio**. Dois campos da pelve (`modo`, `doppler_realizado`) caíam nisso.
`ZodOptional` agora desce no tipo interno. Junto saíram 28 cenários de pelve que
não renderizavam em `cenario-sem-numero-fantasma`.
