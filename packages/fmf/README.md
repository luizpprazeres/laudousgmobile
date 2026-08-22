# FMF — risco de pré-eclâmpsia (1º trimestre)

Implementação do **modelo de riscos competitivos da Fetal Medicine Foundation**,
como publicado em Wright D, Wright A, Nicolaides KH, *AJOG* 2020;223:12-23.e7,
apêndice “Competing risk approach for prediction of PE”.

```
pe.mean(t) = b0 + b1·t   se t < (−b0/b1);  senão 0
h(t)       = dmvnorm(x, pe.mean(t), sigma.pe) · dnorm(t, prior.mean, prior.sd)
risco(<G)  = ∫h de g.current a G  ÷  ∫h de g.current a ∞
g.current  = max(24, IG atual em semanas)
```

## ⚠️ Estado: NÃO usar para decisão clínica binária

Não por defeito conhecido no código — os seis da auditoria estão corrigidos —
mas por uma **divergência medida contra o software oficial da FMF**, que a
segunda auditoria (`AUDITORIA-2026-08-22-mom.md`) quantificou.

O que ela achou: a transcrição das Tabelas 2 de Wright A 2015 e Tayyar 2015
está **correta**; a divergência não é sinal perdido nem tabela do trimestre
errado. Mas o resíduo remanescente **cruza o corte de 1:100** — o limiar que
decide profilaxia com aspirina:

| perfil | faixa em que os dois discordam |
|---|---|
| com HAS | nosso entre ~1:100 e 1:78 pode dar POSITIVO com o oficial ainda abaixo de 1:100 |
| sem HAS | faixa estreita de FALSO NEGATIVO: nosso entre ~1:103 e 1:100 com o oficial já acima do corte |

Sem HAS os dois erros de marcador atuam em sentidos opostos e quase se
cancelam; com HAS, não.

**O que isso permite e o que não permite.** Permite continuar a validação e
rodar em *shadow mode* — calcular e comparar sem mostrar. Não permite rotular
como paridade FMF, nem usar o resultado para decidir do lado do corte, sem um
guard de incerteza explícito.

`validacao/CASOS-FMF.md` tem 16 casos com a coluna “NOSSO <37s” preenchida por
`validacao/casos.mjs`; a coluna do FMF oficial é para preencher à mão, no app
deles. É o que fecha a adjudicação: qual família de normalização o software usa.

## Por que está aqui, e não no aplicativo

Este código não é chamado por nada em produção. O que o iPhone tem hoje
(`PreEclampsiaCalculator.swift`) é **outro algoritmo**: uma triagem simplificada
por pontos, que devolve categoria (baixo/intermediário/alto) e se anuncia ao
médico como “FMF simplificado — sem PAPP-A/PlGF”. As duas coisas não devem ser
misturadas num mesmo relatório.

Ele vive no repositório por um motivo simples: até 22/08 estava no `/private/tmp`
de uma sessão do Claude, com 35 MB de material de pesquisa. Uma limpeza de
temporários apagaria semanas de trabalho, e as auditorias que o validaram
apontariam para arquivos inexistentes.

## A auditoria e o que ela mudou

O relatório de 21/08 (`/tmp/review-calculos-fmf.md`, feito pelo Codex contra as
imagens das tabelas dos PDFs, não só o `pdftotext`) encontrou os coeficientes e
sinais **corretos** — 17 termos do a priori, 17 da PAM, 11 do UtA-PI, quatro
pares de verossimilhança, DPs e correlações — e mesmo assim deu **NO-GO
clínico**, por seis defeitos de *aplicação* do modelo. Todos foram corrigidos
nas horas seguintes:

| # | defeito | onde está a correção |
|---|---|---|
| 1 | salvaguarda da hipertensão crônica ausente | `prior.mjs`, `mediaIgPartoComPE` |
| 2 | integração partindo de 20 semanas | `risco.mjs`, `gCurrent = max(24, …)` |
| 3 | log10 MoM observado sem truncamento | `risco.mjs`, `truncar(bruto, TRUNC_LOG10_MOM_12S…)` |
| 4 | Z-score anterior imputado em silêncio | `risco.mjs`, `validar()` exige |
| 5 | sem hard stop para underflow / entrada inválida | `risco.mjs`, log-densidades + `ErroDeDominio` |
| 6 | versão dos parâmetros não fixada | `risco.mjs`, `versaoParametros` |

O nº 1 é o mais instrutivo, e está citado no código: sem ele, uma mulher obesa,
diabética e com história familiar de PE sai com risco **menor** por ter
hipertensão crônica. O próprio Wright 2015 chama isso de implausível e manda
tomar o mínimo das médias com e sem HAS. O caso 6/6b da tabela existe para
provar que a salvaguarda dispara.

## Rodar

```bash
cd packages/fmf/validacao
node casos.mjs     # os 16 casos, em Markdown, prontos para colar
node casos2.mjs    # a mesma tabela com mais colunas
```

Sem dependências: ESM puro, `node` e nada mais.
