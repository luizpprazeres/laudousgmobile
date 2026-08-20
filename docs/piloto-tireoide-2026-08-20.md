# Piloto TIREOIDE — a troca do motor da web

**Documento de sessão, 20/08/2026.** Leia depois de
`docs/plano-web-workspace-2026-08-20.md` §3.2, que é o que esta sessão executa.

Trabalho conjunto Claude + Codex 1 (gpt-5.6-sol), duas leituras independentes do
mesmo par de implementações: uma rodando o código, outra lendo. Convergiram no
diagnóstico central e divergiram no que cada uma achou — o que está abaixo é a
união das duas.

---

## O veredicto

**O piloto está de pé para tudo, menos nódulo.** A troca do motor funciona:
laudo normal, medidas, tireoidite, bócio, linfonodos e Doppler atravessam para o
renderer canônico sem perder achado. O **nódulo não atravessa**, e o motivo é
grave o bastante para ter parado a frente:

> ### As duas "NOTA FINAL" são escalas diferentes com o mesmo nome
>
> A tela da web classifica por **GRAU**, 1 a 6, escolhido pelo médico. O
> renderer canônico classifica por **SOMA DE PONTOS** dos eixos, que chega a 16.
>
> | valor | a tela | o canônico |
> |---|---|---|
> | 4 | intermediárias | TI-RADS 2 → provavelmente benignas |
> | 5 | **provavelmente malignas** | TI-RADS 2 → **provavelmente benignas** |
> | 6 | **malignas** | TI-RADS 3 → intermediárias |
>
> Parecia haver uma ponte segura: o renderer aceita `nota_domingos_ditada` e o
> ditado do médico vence o cálculo, então o laudo de hoje sairia preservado. É
> falso, **e falha para o lado perigoso** — o nódulo que o médico marcou como
> provavelmente maligno sairia impresso "características provavelmente
> benignas".
>
> Mandar só os dois eixos que a tela tem também não serve: os quatro ausentes
> pontuam zero e a nota sai **subestimada**, o mesmo erro pelo mesmo lado.
>
> O nódulo só migra quando a tela oferecer os seis eixos canônicos
> (ecogenicidade, margem, halo, forma, calcificações, vascularização) e o
> `/render` calcular. Até lá o adaptador **bloqueia a travessia** em vez de
> traduzir no chute.

Piloto travado em `CLASSICO_COMPLETO`, **no servidor**. O estilo objetivo tem
três impedimentos próprios: o título não identifica o Doppler, os TI-RADS
`4a/4b/4c` ditados não vencem o cálculo, e ele afirma "Não há evidência de
linfonodomegalias" mesmo quando a cadeia não foi avaliada.

---

## O que foi CORRIGIDO — e o que era defeito de produção

Oito defeitos. **Quatro atingem o médico que dita hoje pelo app**, não só a web.

### 1. O achado clicado virava o seu contrário (catálogo)

O médico clicava "Tireoidite crônica", digitava as medidas dos lobos, e o laudo
saía **"sem evidência de alteração ecotextural"**. Causa: `Object.assign` raso —
`dados.lobo_direito` substituía o `lobo_direito` do cenário e levava junto a
tireoidite que morava nele.

O mesmo defeito existia **uma camada acima**, em `laudoPadraoDe`: o `seed`
substituía o objeto derivado do schema, então um `dados` esparso — o único jeito
de o cliente *não* apagar achado — fazia o Zod recusar o laudo inteiro por campo
faltando. Patch parcial tratado como substituição total, duas vezes.

Correção em `catalog/modeloNormal.ts`: `mesclarFundo` desce nos objetos; array é
substituído por inteiro, de propósito (mesclar listas por índice produziria um
nódulo meio de um e meio de outro).

**Merge fundo sozinho não basta.** Um `dados` que mande `ecotextura_alterada:
null` explicitamente apaga o achado com toda a razão sintática. Por isso a
conferência é no RESULTADO: `achadosApagados` confere que todo caminho-folha que
o cenário afirma continua de pé, e recusa com o caminho nomeado quando não
continua.

### 2. Medida fabricada impressa em laudo real (catálogo, TODAS as categorias)

O pior dos cinco, e o mais bem escondido.

Os cenários carregavam medidas plausíveis para o renderer ter o que escrever —
`1,3 x 1,0 x 1,2 cm`, `no terço superior`. Pareciam inofensivas porque a
**prévia** as esconde: `previaDaAlteracao` renderiza duas vezes e troca por
`____` tudo o que variar.

No laudo **real** não há segundo render nem máscara. Bastava clicar um achado e
não digitar o tamanho para o documento afirmar uma medida que ninguém mediu.

A correção é na origem — **o seed não carrega dado de exame**. Como
`laudoPadraoDe` agora mescla fundo, o cenário declara só o achado e o que falta
sai como `____`.

Não era só a tireoide. O gate novo achou:

| categoria | fabricações |
|---|---|
| TIREOIDE | medidas dos lobos e do nódulo, localização |
| MAMARIA | 6 medidas, **8 topografias** — incluindo `horario: "11 horas"` |
| PELVE_FEMININA | 5 medidas, 2 paredes |

`horario: "11 horas"` é exatamente ONDE a lesão está. O laudo dizia a posição
horária de um nódulo que o médico nunca localizou.

### 3. O laudo que se contradiz (renderer — PRODUÇÃO)

`linfonodos_alterados = true` com descrição vazia caía num `&&` que juntava
"alterado sem descrição" com "normal": o **corpo** escrevia "linfonodos de
morfologia preservada" e a **conclusão**, "de aspecto alterado". Duas afirmações
opostas sobre o mesmo achado, no mesmo documento.

Agora são três estados. A frase nova diz o que se sabe — *"linfonodos cervicais
de aspecto alterado, sem caracterização detalhada ao método"* — sem inventar
hilo nem morfologia. Com ela, o cenário do catálogo **parou de cravar** "perda
do hilo ecogênico", características que o médico não informou e que só estavam
ali para contornar este defeito.

### 4. O laudo afirmava um exame que não houve (renderer — PRODUÇÃO)

A técnica do clássico é fixa e diz que o exame abrangeu "a cadeia ganglionar
cervical de I a V" — inclusive quando as cadeias não foram avaliadas. Um laudo
que declara ter examinado o que não examinou é pior que um laudo omisso, porque
o leitor confia nele. `comentarios(linfonodosAvaliados)` passou a ser
condicional.

### 5. A lateralidade fabricada da MAMÁRIA (catálogo)

O helper `achado()` punha `lado: "direita"` como **default**, então todo cenário
saía na mama direita — inclusive "Cisto simples" e "Nódulo sólido", que não
tratam de lateralidade. O laudo dizia "Imagem anecoica de mama direita" e
concluía "Cisto simples em mama direita" sem o médico ter escolhido a mama.

O detalhe que fecha o argumento: **o renderer já estava certo.** `mamaTxt`
escreve `"mama ____"` para lado nulo, e o comentário dele diz literalmente
*"NUNCA inventa direita — review dex2"*. Era o catálogo violando a doutrina do
próprio renderer.

### 6. Linfonodos alterados sem descrição, no estilo OBJETIVO (renderer — PRODUÇÃO)

O mesmo defeito do item 3, vivo no outro estilo: os ACHADOS diziam "Não há
evidência de linfonodomegalias" e a IMPRESSÃO, logo abaixo, "de aspecto
alterado".

**Ficou de fora de propósito:** quando `linfonodos_descritos` é falso — o médico
não avaliou as cadeias —, o objetivo continua afirmando "Não há evidência de
linfonodomegalias", um achado negativo que ninguém fez. O clássico omite a linha
nesse caso, e os dois estilos divergem. Alinhar muda o texto de **todo** laudo
objetivo sem menção a linfonodos, e por isso é decisão do Luiz.

### 7. Chave de protótipo contaminando o achado (catálogo)

`mesclarFundo` é recursivo e o patch vem de corpo de request. `__proto__`,
`constructor` e `prototype` agora não atravessam.

**O que é e o que não é.** `Object.prototype` **não** era poluído globalmente: o
merge é não-mutante (`{ ...base }`) e nunca escreve dentro do protótipo
compartilhado. O ataque clássico não aterrissa aqui. O que acontecia era
contaminação **por requisição** — o objeto de achados saía com o protótipo
trocado, e um campo que o médico nunca informou virava legível nele por herança.
Qualquer `if (findings.x)` a jusante leria valor de terceiro.

A distinção importa porque a primeira versão do teste afirmava a poluição global
e **passava com o guard desligado**: um teste de segurança que não sabe reprovar
não é teste. O que está no bloco 11 de `alteracoes.manual.ts` foi verificado nos
dois estados — verde com o guard, três reprovações sem ele.

### 8. Uma flag de formatação apagava uma categoria inteira (catálogo)

Introduzido e corrigido na mesma sessão, e o modo de falhar vale registrar. Ao
ligar o D5 eu li a flag pelo `env()` **validado**, que lança quando falta
qualquer variável do ambiente. Como `laudoPadraoDe` engole exceção — para que
uma categoria quebrada não derrube a Biblioteca —, a TIREOIDE **sumia inteira**
de qualquer ambiente sem env completo. Em silêncio. E o gate imprimia
`✓ TIREOIDE — nenhum dado de exame do cenário no laudo`, porque não havia o que
reprovar.

Duas correções: a flag passou a ser lida de `process.env` direto, e o gate
passou a **falhar** quando um cenário não renderiza. Um cenário ausente não é um
cenário aprovado.

---

## O que NÃO foi corrigido, e por quê

### A tireoidite some da conclusão — defeito de PRODUÇÃO em aberto

No clássico, uma alteração difusa muda o corpo e **não aparece na conclusão**:
um Hashimoto sai com "Tireoide de volume normal (13,7 ml)." e nada mais. Quem
dita Hashimoto hoje, no app, recebe uma conclusão que o omite.

A correção é o campo estruturado `tireoidite_tipo` (D1), e ela tem condição do
Codex que aceito: **nullable e aditivo no Zod, no JSON Schema strict E com regra
no prompt, na mesma leva.** Acrescentar só no Zod repetiria a divergência de
contrato que o README proíbe. As quatro redações de conclusão precisam de
curadoria clínica.

Junto vêm dois primos: a concordância quebrada ("Lobo direito … difusamente
heterogênea" — o verbatim foi escrito para concordar com "glândula") e a
generalização do objetivo, que conclui só "Tireoidopatia difusa".

### Oito cenários ainda escrevem redação clínica

`adenomiose`, `polipo_endometrial`, `endometrio_espessado`, `istmocele`,
`axilas_alteradas` e a própria `tireoidite_cronica` escrevem a frase do achado,
porque o renderer só tem campo verbatim para ela. É a "quarta cópia do texto
clínico" que a doutrina do catálogo proíbe. A correção é a mesma família do D1 —
campo estruturado —, não apagar a frase, que deixaria o cenário sem achado.

O gate os **lista e conta** como dívida em vez de falhar: a dívida encolhe, não
some.

### As traduções que o adaptador se recusa a fazer

| o que | por que não traduz |
|---|---|
| ecogenicidade `heterogenea` | o canônico descreve conteúdo, e cada opção pontua diferente |
| margem `circunscritas` / `lobuladas` | o canônico pontua regular 0 / irregular 1 / espiculada 2; "lobulada" fica entre dois degraus e traduzir acrescentaria ponto que o médico não escolheu |
| tireoidite linfocítica / granulomatosa / Riedel | não existem no catálogo canônico (D1) |

Cada uma vira `pendencia` visível, não palpite silencioso.

---

## O desenho que ficou

```
tela → adaptarTireoide(estado) → { alteracoes[], dados, pendencias[] }
                                          ↓
                    apps/web /api/catalog/[cat]/render   (sessão do médico)
                                          ↓  Bearer CATALOG_SERVICE_TOKEN
                    apps/api /api/catalog/[cat]/render   (renderer canônico)
                                          ↓
                                        laudo
```

**Quem manda em quê:**

| | quem decide |
|---|---|
| texto clínico | o renderer canônico, sempre |
| **volume** | a WEB calcula (`a×b×c×0,52`) e manda em `dados` — o médico digita, o dado é confiável, e a regra do canônico é "nunca calcule" |
| **classificação** | o `/render`, nunca o navegador |
| cardinalidade (N nódulos) | `dados.lobo_*.nodulos`, lista aberta validada pelo Zod |
| cenário patológico | `alteracoes[]` — ids, nunca frase |

**`alteracoes` × `dados`, e por que a separação importa.** Provado rodando: dois
nódulos no mesmo lobo, com TI-RADS calculado por nódulo e numeração correta,
funcionam por `dados` — o renderer nunca foi o limite. Cenário fixo, por
definição, não representa "dois". Os presets de nódulo viraram **modelo de
preenchimento**: a tela lê os eixos pelo GET, preenche o formulário e manda a
lista completa. Um dono só da lista, que é o médico.

**As lacunas** (`AlteracaoSpec.lacunas`) são o contrato que faltava: o que a tela
pergunta, com rótulo, tipo e unidade. Elas agora chegam à tela — antes serviam
só ao guard interno, o que é documentação disfarçada de mecanismo.

---

## Os gates

```bash
cd apps/api

# a prova diferencial do piloto: o mesmo caso pelos dois caminhos
pnpm exec tsx src/server/renderer/catalog/__tests__/tireoide-ponta-a-ponta.manual.ts

# nenhum dado de exame fabricado sai em laudo real (as 3 categorias curadas)
pnpm exec tsx src/server/renderer/catalog/__tests__/cenario-sem-numero-fantasma.manual.ts
```

| gate | antes | depois |
|---|---|---|
| `catalog-equivalence` | 4320/4320 | **4320/4320** |
| `alteracoes` | 163/163 | **174/174** |
| `contrato-extracao-obstetrica` | 300/300 | **300/300** |
| `catalog-api/contrato` | 37/37 | **51/51** |
| `biblioteca-todas-categorias` | 155/155 | **155/155** |
| `modelo-normal` / `modelo-projetado` | 86 / 608 | **86/86 · 608/608** |
| `catalogo-patologias-matriz` | 76/76 | **76/76** |
| `personalizacao-ponta-a-ponta` | 77/77 | **77/77** |
| `cenario-sem-numero-fantasma` | — | **61 renders, 0 fabricação, 8 dívidas** |
| `tireoide-ponta-a-ponta` | — | **0 perda silenciosa, 6 pendências** |
| `equivalencia-real` | 25/31+3+3 | **idêntico** (conferido com stash) |

O `✓` da prova diferencial diz "nenhum achado perdido **em silêncio**" — não
"pronto para trocar a tela". As 6 pendências são casos que o canônico ainda não
cobre e que o médico perderia hoje; enquanto houver uma, a categoria não migra
inteira.

A prova diferencial **não falha por divergência de texto** — isso é o objetivo,
o canônico ganha a redação. Ela falha em três coisas: o canônico recusar um caso
que a web aceita, perder um achado, ou **afirmar o contrário** do que o médico
marcou. A terceira é a que ela mais persegue.

---

## A fila

| # | o que | estado |
|---|---|---|
| D1 | `tireoidite_tipo` estruturado (Zod + JSON Schema + prompt) | precisa de curadoria clínica das 4 conclusões |
| D2 | tela do nódulo sobre os seis eixos canônicos | **bloqueia o nódulo no piloto** |
| D4 | linfonodos, clássico e objetivo | ✅ feito |
| — | `axilas_alteradas` da MAMÁRIA: mesmo defeito do D4, precisa de redação | com o D1 |
| — | objetivo afirmando "não há linfonodomegalias" sem avaliação | decisão do Luiz |
| D5 | `omitPicoNull` fixado no servidor | decidido, não implementado |
| — | `TireoideFormPanel` chamando o `/render` | próximo |
| — | as 8 dívidas de redação clínica em cenário | depois do D1 |
| — | estado glandular (bócio) na tela | a web hoje sempre conclui "volume normal" |

**Configuração para ligar:** `CATALOG_API_URL` e `CATALOG_SERVICE_TOKEN` no
projeto `laudousg-web`. As duas são fail-closed — faltando qualquer uma, o
catálogo responde 503 e **não** cai de volta no motor local, porque cair de
volta reintroduziria em silêncio a segunda cópia da redação clínica.
