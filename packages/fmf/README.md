# FMF — risco de pré-eclâmpsia (1º trimestre)

Modelo de **riscos competitivos da Fetal Medicine Foundation**, como a própria FMF
o publica: Wright D, Wright A, Nicolaides KH, *The competing risk approach for
prediction of preeclampsia*, **AJOG 2020;223:12-23.e7**, apêndice *"Competing risk
approach for prediction of PE: algorithm specification"*.

```
pe.mean(t) = b0 + b1·t   se t < (−b0/b1);  senão 0        (Tabela 3)
h(t)       = dmvnorm(x, pe.mean(t), sigma.pe) · dnorm(t, prior.mean, prior.sd)
risco(<G)  = ∫h de g.current a G  ÷  ∫h de g.current a ∞
g.current  = max(24, IG atual em semanas)
```

`x` é o vetor de log10 MoM **truncado** pela Tabela 4. As características maternas
também são truncadas antes do a priori (Tabela 1). São três truncamentos
diferentes e os três são obrigatórios — não confundir.

Escopo: **feto único, 11+0 a 13+6 semanas**, com História + PAM + IP uterino.
Gemelar é recusado explicitamente (a Tabela 2 do spec existe, não foi implementada).

## Estado

O motor está validado. A calibração dos modelos de mediana está **parcial** —
leia "O que falta" antes de ligar em produção.

| verificação | resultado |
|---|---|
| Coeficientes e sinais | dois revisores independentes, contra as imagens das tabelas: sem divergência |
| Calibração bayesiana | Hosmer-Lemeshow χ²=6,60 / 8 g.l., **p=0,58**; faixa de decisão (1:200–1:50, n=36.557): predito 1 em 102, observado 1 em 102 |
| Dupla implementação cega | outra implementação, feita só a partir do apêndice: **concordam em ~1e-9** em 11.718 comparações |
| Discriminação | AUC simulada 0,867 × 0,876 publicada (O'Gorman 2016, Tabela 4) |
| **Paridade com o software oficial** | **8 pontos medidos à mão: MoM da PAM dentro de ±0,003; risco dentro de 3 unidades de "1 em N"** |

## Duas coisas que parecem bug e NÃO são

### 1. A salvaguarda da hipertensão crônica está desligada

Wright 2015, p. 62.e7, manda em prosa: em casos extremos o modelo faz a HAS
crônica parecer **protetora**, isso é implausível, e deve-se usar
`min(µ com HAS, µ sem HAS)`.

O apêndice de 2020 não repete a regra, e **o software oficial da FMF não a
aplica** — medido em 22/08/2026, mesma mulher (120 kg, diabética, mãe com PE):

```
COM hipertensão crônica → 1 em 50
SEM hipertensão crônica → 1 em 17
```

Escolhemos **paridade com o software**, e por isso `SALVAGUARDA_HAS = false` em
`src/prior.mjs`.

> ⚠️ Registrando de propósito, porque daqui a três meses alguém vai olhar isso e
> "consertar": **neste ponto o software da FMF diverge do próprio paper.** São
> duas metas que não cabem juntas — reproduzir o software e nunca imprimir número
> clinicamente implausível. Se um dia o produto escolher a segunda, ligue a flag
> **e declare a divergência no laudo**; não ligue em silêncio.

### 2. Dois números não estão em paper nenhum

`CAL_MAP_HAS_PESO = −1,8859e-4` (interação `HAS × peso`, contra os −4,211180e-4
publicados) e `CAL_MAP_INTERCEPTO = −0,003568` (intercepto), ambos em `src/mom.mjs`.

O número calibrado foi **medido, não publicado**: 7 leituras manuais no app
oficial variando só peso (69, 95, 120 kg) e hipertensão crônica. O desvio é zero
em 69 kg — onde a interação não atua — e cresce linearmente com o peso, que é a
assinatura de o efeito principal estar certo e só a inclinação diferir. Ajuste de
2 parâmetros nos 7 pontos: resíduo máximo 0,23% no MoM, contra ±0,5% da própria
resolução da tela.

O deslocamento constante que sobrava foi identificado por um **8º ponto** (sem
diabetes e sem história familiar): o resíduo não mudou, logo não vinha das
comorbidades; altura, etnia, paridade e tabagismo contribuem zero nesses pontos;
e o coeficiente de idade teria de ser 2,7× o publicado, fora do IC95%. Restou o
intercepto, e ele é aplicado globalmente.

Resultado: os 8 MoMs batem dentro de **±0,003** — abaixo do próprio arredondamento
de 2 casas da tela.

## O que falta

**O ramo do IP uterino nunca foi medido** — a seção ficou recolhida em todas as
telas capturadas. Com o MoM da PAM calibrado, os riscos ainda desviam até **3
unidades** de "1 em N", concentrados nos casos com hipertensão, e o IP é o
suspeito. Um deslocamento de +0,005 em log10 na mediana do IP reduziria a soma
dos desvios de 10 para 7, mas o ótimo é raso e ajustar sem medida seria inventar
coeficiente.

**Uma medição resolve:** abrir a seção *Uterine artery PI* em qualquer uma das
telas e anotar o **MoM exibido**. A tolerância do gate está em 3 unidades por
causa disso e deve ir para 1 quando o dado chegar.

Também não validado: outras idades, alturas, etnias e paridades, nada fora de
11–14 semanas, e gemelar (recusado explicitamente).

O caminho definitivo não é medir mais: o apêndice de 2020 diz que *"the current
parameter estimates used in the algorithm are given at fetalmedicine.com"*. Não
achamos a página. `softwaresupport@fetalmedicine.org` é o endereço a perguntar.

## ⚠️ A EULA proíbe validar por script

`fmf.refractionx.com`, *Acceptable use restrictions*:

> "not **collect or harvest any information or data from any Service** or our
> systems"

e a ressalva de engenharia reversa exige que o obtido *"is not used to create any
software that is substantially similar in its expression to the App"*.

Os 7 pontos foram lidos **à mão, um a um**, por um médico usuário licenciado.
Nada de Playwright, nada de automação. **Manter assim.**

## Rodar

```bash
node packages/fmf/validacao/paridade-fmf.manual.mjs   # os 7 pontos oficiais
node packages/fmf/validacao/casos2.mjs                # tabela para conferência manual
```

## Rotulagem

"Baseado no modelo de riscos competitivos da FMF (Wright 2020)" — **nunca**
"certificado" ou "endossado pela FMF". A FMF licencia o algoritmo a terceiros;
usar a marca exige falar com eles. Embarcar o `fmf.wasm` foi descartado: é
redistribuir software proprietário.

## Histórico

- `AUDITORIA-2026-08-21.md` — auditoria dos coeficientes e dos 6 P0 do motor
- `AUDITORIA-2026-08-22-mom.md` — a divergência do MoM com **2** pontos, que
  concluía corretamente não ser identificável. Com 7 pontos passou a ser; a
  conclusão de lá está superada pelo dado, não pelo argumento.
