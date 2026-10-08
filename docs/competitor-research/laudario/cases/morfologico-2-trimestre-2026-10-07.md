# Laudário — Morfológico 2º Trimestre — cenários clínicos

```yaml
competitor: Laudário
observed_at: 2026-10-07
exam: Morfológico 2º Trimestre
surface: Formulário clínico e laudo (gráficos fora do escopo; ver complemento)
baseline:
  controls: modelo aberto sem nenhum dado; inclusão de gráficos não tocada
  report_structure: laudo normal detalhado já publicado na abertura, sem biometria; conclusão global normal com idade gestacional em branco
scenarios:
  - id: C1-baseline
    input: abrir o modelo sem preencher
    cascades: nenhuma ação do usuário
    output: corpo com anatomia normal por região, placenta, líquido e cordão; conclusão global normal; IG em branco
    reset_verified: true
  - id: C2-pelve-renal-esquerda
    input: abdome → pelve renal esquerda 7 mm; direita vazia; sem IG e sem biometria
    cascades: interface marcou classe A2-3 e trocou o estado do trato urinário para dilatação
    output: corpo com 7,00 mm à esquerda e marcador de valor não preenchido à direita; conclusão com dilatação A2/A3; cinco recomendações
    reset_verified: true
  - id: C3-pe-torto-direito
    input: membros → pé torto → direito
    cascades: conclusão normal global retirada; recomendações acrescentadas
    output: corpo e conclusão lateralizados e específicos; recomendações de eco fetal, medicina fetal e investigação genética
    reset_verified: true
evidence:
  observed: baseline normal sem dado; anatomia organizada por região; classificação automática da dilatação urinária sem IG; placeholder no lado não medido; recomendações geradas a partir do achado; remoção limpa ao desfazer
  inferred: limiar fixo de 7 mm para A2-3 independente da IG; recomendações vinculadas ao achado e não ao médico
crosswalk:
  file: ../crosswalk-morfologico-2-trimestre-2026-10-07.md
  status: partial
next_probe: estado de avaliação limitada por estrutura; marcador isolado (foco ecogênico); estado de publicação das recomendações; classificação urinária com IG ≥ 28 semanas
```

Rodada em conta autorizada, pela interface normal, com dados exclusivamente sintéticos. Três cenários, um por variável. Nenhum laudo foi copiado, impresso, finalizado ou enviado. O baseline foi restaurado ao final. Nenhuma frase do concorrente é reproduzida aqui; os registros descrevem estrutura e comportamento.

Os gráficos do mesmo exame foram sondados antes, no mesmo dia, e estão em [morfologico-2-trimestre-graficos-2026-10-07.md](morfologico-2-trimestre-graficos-2026-10-07.md), com o cruzamento em [../crosswalk-morfologico-2-trimestre-graficos-2026-10-07.md](../crosswalk-morfologico-2-trimestre-graficos-2026-10-07.md) e a nota técnica em [../audits/morfologico-2t-graficos-2026-10-07.md](../audits/morfologico-2t-graficos-2026-10-07.md). Esta rodada não tocou nos gráficos.

Rótulos usados: `observado` (apareceu na interface ou no laudo), `inferido` (regra provável sem teste de fronteira), `candidato a lacuna` e `gap confirmado` (ver o crosswalk).

## C1 — Baseline sem dados

- `observado`: o modelo abre com um laudo normal detalhado já publicado, sem nenhuma biometria preenchida.
- `observado`: a anatomia está estruturada por região: cabeça/SNC, face, região cervical, coluna, tórax, coração, abdome, pelve e membros. Placenta, líquido e cordão aparecem no corpo.
- `observado`: a conclusão traz a síntese de morfologia normal e a idade gestacional em branco.
- `inferido`: no morfológico, a normalidade anatômica é o estado inicial. Isso difere do Obstétrico 2º/3º de 06/10, em que a anatomia normal extensa **não** aparecia na abertura e os achados morfológicos eram uma lista só de alterações positivas ([obstetrico-2-3-trimestre-2026-10-06.md](obstetrico-2-3-trimestre-2026-10-06.md)).
- Não registrado nesta rodada: existência de estado “não avaliado/limitado” por estrutura, botão de normal global, campos de ossos longos por lado e estado inicial do controle mestre de recomendações.

**Implicação:** o concorrente publica morfologia normal sem dado mínimo. O LaudoUSG tem o mesmo defeito na Web (ver o crosswalk). Nenhum dos dois deve tratar a abertura do modelo como exame realizado.

## C2 — Pelve renal esquerda de 7 mm, lado direito vazio

**Entrada:** no grupo do abdome, pelve renal esquerda = 7 mm. Pelve direita sem valor. Sem IG e sem biometria.

- `observado`: a interface marcou sozinha a classe A2-3 e mudou o estado do trato urinário para dilatação.
- `observado`: o corpo mostrou a medida esquerda com duas casas decimais (7,00 mm) e, para o lado direito, um marcador de valor não preenchido seguido da unidade.
- `observado`: a conclusão classificou a dilatação como A2/A3 mesmo sem IG e sem biometria.
- `observado`: foram geradas recomendações de ecocardiografia fetal, seguimento ultrassonográfico em 4–6 semanas, ultrassonografia pós-natal, avaliação com nefrologia/urologia pediátrica e com medicina fetal.
- `observado`: ao limpar o campo, a classificação e as recomendações desapareceram.
- `inferido`: a classe parece usar um limiar fixo (≥ 7 mm → A2-3) sem consultar a IG. No consenso de dilatação do trato urinário, o mesmo valor muda de faixa a partir de 28 semanas (`candidato`, corte a aprovar pelo médico). Classificar sem IG pode errar a faixa.
- `inferido`: a frase do rim direito assume que as duas pelves são sempre descritas, e por isso imprime lacuna quando só um lado é informado.
- Não determinado: se as recomendações foram publicadas no laudo ou só sugeridas. No Obstétrico de 06/10, um controle mestre desligado mantinha as sugestões fora do laudo.

**Implicação:** a medida lateral chega ao corpo e à conclusão, mas a classificação sem IG, o placeholder no lado não medido e o pacote de recomendações amplo (incluindo eco fetal para um achado renal) são comportamentos a **não** reproduzir.

## C3 — Pé torto à direita

**Entrada:** no grupo dos membros, pé torto, lado direito.

- `observado`: corpo e conclusão ficaram lateralizados e específicos para o pé direito.
- `observado`: a síntese de morfologia normal saiu da conclusão.
- `observado`: apareceram recomendações de ecocardiografia fetal, medicina fetal e investigação genética.
- `observado`: ao desmarcar, o laudo normal foi restaurado sem sobra.
- `inferido`: a lateralidade vem do controle, não de texto livre; não houve presunção de bilateralidade.
- Não determinado: se o lado é obrigatório (não testado sem lado) e o estado de publicação das recomendações.

**Implicação:** este é o comportamento mais útil da rodada: a malformação de membro tem controle próprio, lateralidade estruturada, item de conclusão e retirada da síntese global. As recomendações automáticas de investigação genética e eco fetal precisam de confirmação médica antes de qualquer equivalente no LaudoUSG.

## Desvios em relação ao preflight

O preflight (`/tmp/laudario-morfologico2-clinico-preflight-2026-10-07.md`, fora do repo) propunha dados biométricos comuns de 22+1 semanas, foco ecogênico em C2 e vias de saída limitadas em C3. A rodada usou baseline, pelve renal sem IG e pé torto (o C3 alternativo). Portanto, o marcador isolado, a avaliação limitada por subplano e a classificação urinária com IG informada continuam sem observação.

## Restauração

Os três cenários foram desfeitos e o baseline restaurado, conforme o registro da rodada. Os gráficos não foram alterados.
