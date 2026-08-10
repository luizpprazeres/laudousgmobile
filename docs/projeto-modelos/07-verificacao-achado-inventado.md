# O alerta "achado_inventado" procede? — verificação

- **Data:** 2026-08-10
- **Motivo:** a tela de auditoria revelou **371 gerações** (24 % de 1520) com alerta
  `achado_inventado`. Se procedesse, seria taxa de alucinação inaceitável em laudo médico.
- **Método:** 544 alertas cruzados contra o ditado original (`raw_input`), por SQL.

## Veredito: é falso positivo, quase inteiro

| Classificação | Alertas | O que é |
|---|---|---|
| Frase de **normalidade ou template** | **215** (40 %) | O modelo escreve; o médico não dita |
| **Valor calculado** pelo sistema | **97** (18 %) | Peso fetal, volume uterino, DSM, percentil, IG |
| Medida **está no ditado** | **75** (14 %) | O sanity não a encontrou por diferença de formato |
| Sem número, a verificar caso a caso | **156** (29 %) | Ver §3 |
| **Medida do laudo que NÃO existe no ditado** | **0** | — |

**Nenhuma medida inventada** entre as 261 verificáveis.

## 1. A causa principal: o sanity compara laudo × ditado

O médico dita só o que é **alterado**. O modelo preenche a **normalidade**. O sanity
compara o laudo com o ditado e conclui, corretamente pela sua própria lógica, que
"isto não foi dito" — e chama de invenção.

Os trechos mais apontados são, literalmente, frases fixas do modelo:

```
"Feto único, em apresentação cefálica, com dorso à esquerda."      13×
"Líquido amniótico de quantidade normal pela análise subjetiva."    4×
"Exame realizado com transdutor de 4.0 MHz…"  (bloco COMENTÁRIOS)   3×
"Útero em anteversão, medindo ____ x ____ x ____ cm."               3×
"Ausência de coleções."                                             3×
"Mamas com ecotextura de fundo com aspecto heterogêneo."            7×
```

## 2. A segunda causa: conversão de unidade

O médico dita em **centímetros**; o laudo publica em **milímetros**.

```
ditado:  DBP: 7.42 cm     CC: 27.89 cm
laudo:   DBP de 74,2 mm   CC de 278,9 mm
```

O sanity procura "74,2" no ditado, não acha, e acusa invenção. Foram **78 alertas**
só por isso — todos em obstetrícia e Doppler obstétrico.

*(Ressalva de método: minha primeira tentativa de detectar essa conversão falhou por
um erro meu de formatação numérica em SQL, e a segunda confirmou os 78.)*

## 3. O que sobrou — e revelou outra coisa

Dos 156 sem número, a maioria segue o padrão: frases de template
("Embrião único, em situação transversa", "Os movimentos fetais são ativos",
"Cordão umbilical com duas artérias e uma veia").

Mas **25 casos em MUSCULOESQUELETICO_V2 são de outra natureza**:

```
"batida entreespinhal"
"pneumonia do subescapular"
"sinais de faceite plantar"
```

Isto não é invenção do modelo — é **erro de transcrição do ASR** que o LLM
reproduziu no laudo. Provável: *"bursite interespinhal"*, *"tendinopatia do
subescapular"*, *"fasceíte plantar"*. E um caso de conteúdo de MSK vazando em
ABDOMEN_TOTAL (*"Do tendão de aquiles."*).

Faz sentido que apareça justamente no MSK: é a categoria onde o LLM escreve mais
texto livre (`descricao_corpo` e `diagnostico_conclusao`, 30–60 % do laudo em exame
alterado). Onde o LLM copia o ditado, o garble do ASR viaja junto.

**Isto é um achado separado e real**, e mais acionável que o alerta original.

### Poucos casos merecem olhada clínica

Não consegui classificar com segurança, e podem ser derivação legítima do corpo:

- `"Ovário direito não visualizado. Ovário esquerdo não visualizado."` (PELVE)
- `"Hidronefrose leve grau 1 à direita."` (VIAS_URINARIAS)
- `"Índice de pulsatilidade reduzido na artéria cerebral média."` (DOPPLER_OBSTETRICO)

Afirmações desse tipo, se não ditadas, importam. São unidades, não dezenas.

## 4. Consequências

1. **`achado_inventado` não serve como sinal hoje.** Junto com `medida_divergente`
   (1132 de ~2000 alertas), satura o painel e treina o olho a ignorar.

2. **O sanity precisaria saber o que é do modelo.** Ele compara laudo × ditado sem
   distinguir o que o modelo preenche por construção. Com o catálogo, essa
   informação existe: cada segmento carrega `origin` (`base` = frase do modelo,
   `custom` = personalização, `computed` = calculado pelo motor). Um sanity que
   consulte a origem deixaria de acusar a normalidade do próprio template.
   É o mesmo princípio da crítica C1 do Codex, aplicado a outro consumidor.

3. **A conversão cm→mm deveria ser conhecida do sanity** — é regra do sistema, não
   divergência.

4. **O garble de ASR no MSK merece frente própria.** Ver `docs/plano-msk-2026-07-01.md`
   e o harness em `scripts/asr-bench/`.

## 5. Recomendação

**Curto prazo (feito):** o filtro por tipo de alerta na auditoria já permite ignorar
`medida_divergente` e `achado_inventado` e olhar o que resta.

**Curto prazo (a decidir):** rebaixar `achado_inventado` de `critical` para
informativo enquanto o comparador não souber distinguir texto de template. Hoje ele
infla `sanity.verdict = critical` em 833 de 1520 gerações — e `POST_VALIDATOR_MODE`
existe com um modo `block_critical` que, se algum dia for ligado com esse sinal
nesse estado, **bloquearia metade das gerações legítimas**.

**Médio prazo:** ligar o sanity à origem dos segmentos, quando o catálogo cobrir
mais categorias.
