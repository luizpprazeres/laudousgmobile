# Laudário — Obstétrico 2º/3º Trimestre - Gemelar

Observado em 07/10/2026, em conta autorizada e com dados exclusivamente sintéticos. A rodada usou a interface normal, sem copiar, imprimir, assinar ou finalizar laudos. Foram executados o baseline e três cenários. Ao final o modelo foi restaurado e reaberto, e a restauração foi confirmada (`RESET_GEMELAR_OK`).

Rótulos deste registro:
- **observado**: visto na interface do Laudário nesta rodada;
- **inferido**: interpretação nossa, ainda sem teste dedicado;
- **pendente**: não registrado nesta rodada.

Nenhuma frase do laudo do concorrente foi reproduzida. Os trechos abaixo são paráfrases estruturais.

## Baseline

**Observado.** O modelo abre como gestação dicoriônica e diamniótica, com duas placentas e duas bolsas. O feto A é o proximal, cefálico, com dorso à esquerda. O feto B é o distal, pélvico, com dorso à direita. Sem nenhum preenchimento, o corpo já afirma batimentos presentes, cordão com três vasos, líquido normal e placentas posteriores. A conclusão começa vazia e a discordância aparece como indisponível.

**Observado.** A corionicidade oferece dicoriônica/diamniótica, monocoriônica e indeterminada. A amnionicidade só aparece quando a monocoriônica é escolhida. Há um sinal opcional de membrana (lambda/T), um controle de número de massas placentárias, um modo para 3 a 5 fetos e um campo de antecedentes de transfusão feto-fetal, restrição seletiva e sequência anemia–policitemia. O modo de 3 a 5 fetos e os antecedentes só foram inventariados, sem acionar.

**Pendente.** Não foi registrado se os rótulos A/B podem ser editados ou trocados, nem se há Doppler por feto neste modelo.

**Implicação.** O cabeçalho da gestação é estruturado: a amnionicidade é condicionada à corionicidade e a quantidade de placentas é um dado separado. Mesmo assim, como no feto único de 06/10, os defaults de apresentação, vitalidade, cordão, placenta e líquido entram no laudo como fatos dos dois fetos.

## Cenário 1 — DC/DA concordante, 32+0

**Entrada.** IG informada 32+0. Feto A: DBP 81, CC 295, CA 280 e CF 61 mm, MBV 4,5 cm. Feto B: DBP 80, CC 292, CA 276 e CF 60 mm, MBV 5,1 cm.

**Observado.**
- Feto A: PFE 1888 g, percentil 40. Feto B: PFE 1804 g, percentil 28.
- O peso é Hadlock IV e o percentil vem da referência Hadlock de feto único.
- A discordância foi de 4,4%. A interface identificou o B como o menor e o classificou na faixa abaixo de 20%.
- O corpo e a conclusão registraram crescimento adequado nos dois fetos.
- Os dois MBV foram classificados como normais.

**Inferido.** Os valores de PFE e de discordância coincidem com o cálculo prévio do card (Hadlock IV com quatro medidas; discordância = diferença dividida pelo maior peso). Isso sugere a mesma fórmula de `discordanciaGemelar` e de `calcPonderal` do LaudoUSG.

## Cenário 2 — feto B pequeno, DC/DA

**Entrada.** A partir do C1, só a biometria do B mudou: CA 245 e CF 56 mm.

**Observado.**
- Feto B: PFE 1411 g, percentil 2. Discordância de 25,3%.
- A interface mostra duas faixas: atenção a partir de 20% e significativa a partir de 25%. Também exibiu um alerta de critério de restrição seletiva.
- O laudo concluiu restrição de crescimento tardia do feto B, com base no PFE e na CA abaixo do percentil 3 e na discordância. **Não concluiu restrição seletiva.**
- Foram sugeridos Doppler e encaminhamento à medicina fetal. As sugestões não entraram no laudo, porque o controle mestre de recomendações ficou desligado.

**Inferido.**
- Diferente do feto único de 06/10 (p7, sem fechar diagnóstico), aqui um percentil abaixo de 3 fechou restrição sem Doppler. Isso é coerente com critérios em que PFE < p3 basta isoladamente. O módulo `packages/shared/src/calculators/fetalGrowth.ts:177-178` do LaudoUSG trata PFE < p3 como critério da mesma forma.
- A classificação "tardia" parece vir da IG ≥ 32 semanas.
- O alerta de restrição seletiva ficou restrito à interface, sem efeito no laudo. Isso sugere um alerta informativo que depende de decisão médica, e não uma conclusão automática.

**Pendente.** Os sub-passos de fronteira (CA 255 e 258) não foram relatados. O corte foi lido nas faixas da interface, não por mudança do texto.

## Cenário 3 — MC/DA com líquido discordante

**Entrada.** A biometria do B do C1 foi restaurada. Depois, a corionicidade mudou para monocoriônica/diamniótica. Em seguida, só o MBV mudou: A 1,5 cm e B 9,0 cm. Por fim, a corionicidade voltou para DC/DA.

**Observado: troca para MC/DA.**
- A placenta passou a ser única, com sulco.
- O líquido continuou registrado por saco.
- Os percentis continuaram na referência Hadlock de feto único. Nenhuma curva monocoriônica foi aplicada.

**Observado: MBV discordante.**
- O MBV de 1,5 cm foi classificado sozinho como oligodrâmnio no A, e o de 9,0 cm como polidrâmnio no B.
- O bloco de complicações manteve a transfusão feto-fetal no estado ausente, sem critérios.
- A conclusão trouxe apenas o oligo e o poli por feto, sem hipótese de síndrome.

**Observado: volta para DC/DA.**
- O indicador passou a mostrar duas placentas, mas a seleção e o texto mantiveram a placenta única com sulco. É uma **contradição confirmada** entre controle e laudo.
- As classes de oligo e poli permaneceram porque os dois MBV continuavam preenchidos; esta persistência é coerente com os dados ainda presentes e não foi tratada como defeito.

**Inferido.**
- O estado "sem critérios" pode ser só o default do campo, sem avaliação automática. Também pode refletir critério dependente da IG: em critérios europeus, após 20 semanas o polidrâmnio da receptora exige MBV acima de 10 cm, e 9,0 cm não o atinge. A rodada não distingue as duas hipóteses.
- A rodada não testou se apagar os MBV remove imediatamente as classes de líquido; isso permanece como próxima sondagem.

## Restauração

O modelo foi reaberto após a volta da corionicidade ao default. A reabertura limpou IG, biometrias e MBV, e o texto inicial voltou ao baseline: `RESET_GEMELAR_OK`.

## Próxima sondagem

- MC/DA com MBV do B acima de 10 cm, para separar default de critério de transfusão feto-fetal.
- Apagar os MBV ainda no cenário MC/DA, para verificar a retirada imediata das classes.
- Edição ou troca dos rótulos A/B.
- Óbito de um feto, 3 a 5 fetos e MC/MA.
- Doppler por feto no modelo "com Doppler - Gemelar".

O cruzamento técnico está em [crosswalk-obstetrico-gemelar-2026-10-07.md](../crosswalk-obstetrico-gemelar-2026-10-07.md).
