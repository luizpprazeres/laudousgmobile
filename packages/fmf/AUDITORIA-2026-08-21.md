# Auditoria dos cálculos FMF de pré-eclâmpsia

Data da revisão: 2026-08-21

Arquivos auditados:

| Código | Fonte clínica usada na conferência |
|---|---|
| `prior.mjs` | Wright D et al., AJOG 2015;213:62.e1-10, Tabela 2 e texto da p. 62.e6 |
| `mom.mjs`, PAM | Wright A et al., UOG 2015;45:698-706, Tabelas 2 e 3 |
| `mom.mjs`, UtA-PI | Tayyar et al., UOG 2015;45:689-697, Tabelas 2 e 3 |
| `mom.mjs`, verossimilhança e covariância | O'Gorman et al., AJOG 2016;214:103.e1-12, Tabelas 2 e 3 e Métodos, p. 103.e4 |
| `risco.mjs` | O'Gorman 2016 e especificação técnica da FMF em Wright, Wright & Nicolaides, AJOG 2020;223:12-23.e7, apêndice “Risk calculation” |

Os sinais foram conferidos nas imagens das tabelas dos PDFs, não apenas no `pdftotext`.

## Veredito

Não encontrei nenhum sinal trocado nem número digitado incorretamente nos coeficientes de `prior.mjs` ou `mom.mjs`. Os 17 termos do a priori, os 17 termos da PAM, os 11 termos do UtA-PI, os quatro pares da verossimilhança, os quatro DPs pooled e as seis correlações pooled estão numericamente fiéis às tabelas escolhidas.

Isso não libera o cálculo para uso clínico. Há três P0 de aplicação do modelo em `prior.mjs`/`risco.mjs`: falta a salvaguarda da hipertensão crônica explicitamente exigida por Wright 2015; a integração parte de 20 semanas e o a priori sem marcadores parte de menos infinito, enquanto a especificação FMF usa `g.current = max(24, IG atual)`; e os log10 MoM não são truncados antes da densidade multivariada. Há ainda uma imputação silenciosa do Z-score de peso do filho anterior em `mom.mjs` e ausência de proteção numérica contra densidades que zerem por underflow.

Conclusão operacional: **NO-GO clínico para `risco.mjs` como está**, apesar de os coeficientes e sinais estarem corretos.

## P0 — `prior.mjs`: coeficientes e sinais

Fonte: Wright 2015, Tabela 2, p. 62.e4. O código está nas linhas 14 e 19-38; a aplicação, nas linhas 55-86.

| Termo exato | Paper | Código | Resultado |
|---|---:|---:|---|
| Constante | `+54.3637` | `+54.3637` | OK |
| `(idade − 35)` se idade ≥35; zero abaixo de 35 | `−0.206886` | `−0.206886` | OK |
| `(altura cm − 164)` | `+0.117110` | `+0.117110` | OK |
| Origem afro-caribenha | `−2.6786` | `−2.6786` | OK |
| Origem sul-asiática | `−1.1290` | `−1.1290` | OK |
| Hipertensão crônica | `−7.2897` | `−7.2897` | OK |
| LES ou síndrome antifosfolípide | `−3.0519` | `−3.0519` | OK |
| Concepção por FIV | `−1.6327` | `−1.6327` | OK |
| Multípara com PE anterior: intercepto | `−8.1667` | `−8.1667` | OK |
| Multípara com PE anterior: `(IG anterior semanas − 24)²` | `+0.0271988` | `+0.0271988` | OK |
| Multípara sem PE anterior: intercepto | `−4.3350` | `−4.3350` | OK |
| Multípara sem PE anterior: `intervalo em anos⁻¹` | `−4.15137651` | `−4.15137651` | OK |
| Multípara sem PE anterior: `intervalo em anos⁻⁰·⁵` | `+9.21473572` | `+9.21473572` | OK |
| Multípara sem PE anterior: `(IG anterior semanas − 24)²` | `+0.01549673` | `+0.01549673` | OK |
| Sem HAS: `(peso kg − 69)` | `−0.0694096` | `−0.0694096` | OK |
| Sem HAS: história familiar de PE | `−1.7154` | `−1.7154` | OK |
| Sem HAS: diabetes tipo 1 ou 2 | `−3.3899` | `−3.3899` | OK |
| DP da distribuição da IG ao parto com PE | `6.8833` | `6.8833` | OK |

Os centramentos, a quebra da idade em 35 anos, o quadrado da IG anterior centrado em 24 semanas, os expoentes fracionários do intervalo e a regra de que peso/história familiar/diabetes só entram sem HAS também estão implementados corretamente.

### P0 encontrado: salvaguarda de HAS ausente

Wright 2015 diz textualmente que, em casos extremos, o modelo pode fazer a HAS parecer protetora e manda evitar isso tomando **a menor das duas médias calculadas com e sem hipertensão crônica**. `prior.mjs:67-74` escolhe apenas um dos ramos e nunca calcula o mínimo.

Exemplo reprodutível usando apenas coeficientes da tabela: mulher branca, nulípara, 35 anos, 164 cm, 120 kg, diabetes e história familiar de PE. Com HAS, o código produz `µ = 47.0740` e risco a priori `<37` de `0.0716595`. A média alternativa sem HAS é `µ = 45.7185104`; a salvaguarda publicada escolhe essa menor média, com risco `<37` de `0.1026460`. O código atual subestima o risco nesse exemplo em cerca de 30% relativo.

Correção exigida: calcular os dois ramos quando `hipertensaoCronica=true` e retornar `min(µ_com_HAS, µ_sem_HAS)`, mantendo idênticos os demais fatores. Isso é regra publicada, não coeficiente novo.

## P0 — `mom.mjs`: modelo de MoM da PAM

Fonte: Wright A 2015, Tabela 2, p. 704; DP na Tabela 3, p. 705. Código: `mom.mjs:22-46`.

| Termo exato no log10 da PAM esperada | Paper | Código | Resultado |
|---|---:|---:|---|
| Intercepto | `+1.943223919` | `+1.943223919` | OK |
| 1º tri: `(IG dias − 77)` | `+0.000209037` | `+0.000209037` | OK |
| 1º tri: `(IG dias − 77)²` | `−0.000020452` | `−0.000020452` | OK |
| 1º tri: `(idade anos − 35)` | `+0.000439271` | `+0.000439271` | OK |
| `(peso kg − 69)` | `+0.001193313` | `+0.001193313` | OK |
| `(peso kg − 69)²` | `−0.000008823` | `−0.000008823` | OK |
| `(altura cm − 164)` | `−0.000206306` | `−0.000206306` | OK |
| Fumante | `−0.004523672` | `−0.004523672` | OK |
| Afro-caribenha | `−0.001191227` | `−0.001191227` | OK |
| Afro-caribenha × `(IG dias − 77)` | `−0.000050679` | `−0.000050679` | OK |
| Hipertensão crônica | `+0.051007216` | `+0.051007216` | OK |
| HAS × `(peso kg − 69)` | `−0.000421118` | `−0.000421118` | OK |
| Diabetes mellitus | `+0.004445020` | `+0.004445020` | OK |
| História familiar de PE | `+0.005976240` | `+0.005976240` | OK |
| Multípara sem PE anterior: intercepto | `−0.009402127` | `−0.009402127` | OK |
| Multípara sem PE anterior: intervalo em anos | `+0.000744526` | `+0.000744526` | OK |
| Multípara com PE anterior | `+0.006091903` | `+0.006091903` | OK |

A interação HAS × peso existe no paper, tem sinal negativo e está correta no código. O modelo calcula `log10(PAM esperada)`; `PAM MoM = PAM medida / 10^predição`, também correto.

O DP do primeiro trimestre na coorte de normalização da PAM é `0.03720` na Tabela 3 de Wright A. O posterior combinado, porém, usa a covariância comum pooled de O'Gorman 2016, cujo DP de PAM é `0.03724`. Portanto `mom.mjs:75` não é erro: é a escolha coerente com a verossimilhança multivariada de O'Gorman.

## P0 — `mom.mjs`: modelo de MoM do UtA-PI

Fonte: Tayyar 2015, Tabela 2, p. 693; DP na Tabela 3, p. 695. Código: `mom.mjs:50-66`.

| Termo exato no log10 do UtA-PI esperado | Paper | Código | Resultado |
|---|---:|---:|---|
| Intercepto | `+0.255731426` | `+0.255731426` | OK |
| 1º tri: `(IG dias − 77)` | `−0.004407905` | `−0.004407905` | OK |
| `(peso kg − 69)` | `−0.000888890` | `−0.000888890` | OK |
| `(peso kg − 69)²` | `+0.000006006` | `+0.000006006` | OK |
| `(peso kg − 69) × (IG dias − 77)` | `+0.000008322` | `+0.000008322` | OK |
| `(idade anos − 35)` | `−0.001117349` | `−0.001117349` | OK |
| `(idade anos − 35) × (IG dias − 77)` | `+0.000015061` | `+0.000015061` | OK |
| Afro-caribenha | `+0.018069553` | `+0.018069553` | OK |
| Multípara com PE anterior: intercepto | `+0.004971474` | `+0.004971474` | OK |
| Multípara com PE anterior: Z-score do peso ao nascer anterior | `−0.006836336` | `−0.006836336` | OK |
| Multípara com PE anterior: `(IG anterior ao parto − 40)` | `−0.005119599` | `−0.005119599` | OK |

O DP de normalização do primeiro trimestre em Tayyar é `0.12813`. O posterior de O'Gorman usa o pooled `0.12894`, que é o valor exportado por `mom.mjs:74`; essa troca é intencional e correta para a covariância comum.

### Lacuna de contrato: Z-score silenciosamente imputado como zero

Em `mom.mjs:65`, uma multípara com PE anterior sem `zEscorePesoAnterior` recebe zero, isto é, peso neonatal exatamente na média. Tayyar não autoriza essa imputação; o campo é parte do modelo final. Em `mom.mjs:66`, a ausência de IG anterior equivale silenciosamente a 40 semanas. Isso não troca sinal, mas fabrica dois preditores clínicos.

Conduta segura: para `multipara-com-pe`, tornar ambos os campos obrigatórios ou declarar explicitamente um modo degradado que não possa ser confundido com cálculo FMF completo. Não usar `null → 0` silencioso.

## P0 — verossimilhança: valores, sinais, unidade e truncamento em zero

Fonte: O'Gorman 2016, Tabela 2, p. 103.e3; regra no texto de Métodos, p. 103.e4. Código: `mom.mjs:95-108`.

| Marcador | Intercepto paper/código | Inclinação paper/código | Cruzamento derivado | Resultado |
|---|---:|---:|---:|---|
| UtA-PI | `+0.54453` | `−0.013143` | `0.54453 / 0.013143 = 41.43118009586852 sem` | OK |
| PAM | `+0.095640` | `−0.0018240` | `0.095640 / 0.0018240 = 52.43421052631579 sem` | OK |
| PAPP-A | `−0.62165` | `+0.014692` | `0.62165 / 0.014692 = 42.312142662673565 sem` | OK |
| PlGF | `−0.93687` | `+0.021930` | `0.93687 / 0.021930 = 42.72093023255814 sem` | OK |

A IG desta regressão está em **semanas ao parto com PE**. Isso aparece no título da Tabela 2 e é coerente com o texto clínico e com os cruzamentos. Passar dias aqui seria erro de unidade; `mediaLog10MoM()` recebe semanas, portanto está correto.

A regra de `mom.mjs:108` também está correta para os quatro marcadores. UtA-PI e PAM descem até zero e ficam em zero (`max(0, reta)`); PAPP-A e PlGF sobem até zero e ficam em zero (`min(0, reta)`).

## P0 — DPs e correlações da covariância comum

Fonte: O'Gorman 2016, Tabela 3, p. 103.e3. O texto de Métodos afirma que foi assumida uma matriz de covariância comum. Portanto a coluna pooled é a que deve alimentar tanto a distribuição normal quanto a de PE.

| Parâmetro pooled | Paper | Código | Resultado |
|---|---:|---:|---|
| DP UtA-PI | `0.12894` | `0.12894` | OK |
| DP PAM | `0.03724` | `0.03724` | OK |
| DP PAPP-A | `0.23539` | `0.23539` | OK |
| DP PlGF | `0.17723` | `0.17723` | OK |
| Corr(UtA-PI, PAM) | `−0.05133` | `−0.05133` | OK |
| Corr(UtA-PI, PAPP-A) | `−0.15992` | `−0.15992` | OK |
| Corr(UtA-PI, PlGF) | `−0.15084` | `−0.15084` | OK |
| Corr(PAM, PAPP-A) | `−0.00497` | `−0.00497` | OK |
| Corr(PAM, PlGF) | `−0.02791` | `−0.02791` | OK |
| Corr(PAPP-A, PlGF) | `+0.32085` | `+0.32085` | OK |

Em `risco.mjs`, o vetor é ordenado como `[PAM, UtA-PI]`, mas a chave chama-se `utaPi:map`. Não há inversão matemática: correlação e covariância são simétricas. A fórmula bivariada em `risco.mjs:22-28` está correta.

## P0 — divergências em `risco.mjs`

### Limite inferior errado

`risco.mjs:63` fixa `G0 = 20`. A especificação FMF define:

`g.current = max(24, idade gestacional atual em semanas)`

e calcula:

`risco(<G) = integral(h, g.current, G) / integral(h, g.current, infinito)`.

No primeiro trimestre, portanto, o limite é 24 semanas, não 20. O ramo sem marcadores em `risco.mjs:51-55` também usa a CDF desde menos infinito, sem condicionar à ausência de PE antes de 24 semanas.

Correção exigida: usar `gCurrent = max(24, p.gaDias / 7)` nos dois ramos. Sem marcadores, a forma fechada correta é:

`[Φ((G−µ)/σ) − Φ((gCurrent−µ)/σ)] / [1 − Φ((gCurrent−µ)/σ)]`.

Com marcadores, integrar numerador de `gCurrent` a `G` e denominador de `gCurrent` ao limite superior numérico que represente infinito. O uso de 100 semanas no denominador é uma aproximação praticamente exata para `σ=6.8833`, mas deve ser descrito como aproximação; não justifica começar em 20.

### Truncamento dos valores observados ausente

`risco.mjs:42-49` usa `log10(MoM)` sem limite. A especificação técnica FMF manda truncar o vetor observado antes da densidade. Para 12 semanas, os limites publicados de log10 MoM são:

| Marcador | Limite inferior | Limite superior |
|---|---:|---:|
| PAM | `−0.1224076` | `+0.12240759` |
| UtA-PI | `−0.4216152` | `+0.42161519` |

Sem esse teto/piso, uma medida extrema pode produzir uma razão de verossimilhança muito diferente da FMF e aumentar o risco de underflow. Não confundir este truncamento do **valor observado** com o truncamento em zero da **média de PE em função da IG**; são duas regras diferentes e ambas são necessárias.

### Underflow e entrada inválida sem hard stop

`risco.mjs:18-29` calcula densidades em escala linear. Com MoM extremo, `Math.exp(...)` pode zerar em toda a grade, deixando `total=0` e o resultado `0/0 = NaN`. PAM ou UtA-PI não positivos também entram em `Math.log10()` e contaminam todo o cálculo. O código não interrompe nem retorna erro clínico explícito.

Depois de aplicar os limites publicados, ainda deve existir validação de finitude/positividade e um hard stop para `total <= 0` ou não finito. A forma mais robusta é calcular log-densidades e estabilizar pela maior log-densidade antes da integração.

### Integração de Simpson

Para os cortes padrão 32, 34 e 37, a grade atual cai exatamente em índices pares e a soma de Simpson é coerente. A média artificial dos acumulados nos índices ímpares (`risco.mjs:76`) e a interpolação linear (`:83`) são aproximações para cortes arbitrários, não uma nova troca de sinal. Elas devem ser validadas contra quadratura adaptativa, mas não são o bloqueador principal.

## P1 — ressalva de versão

Contra as tabelas solicitadas de O'Gorman AJOG 2016, `mom.mjs` está byte a byte correto nos números. Wright 2019 é realmente um estudo de validação do algoritmo previamente publicado e não apresenta uma nova Tabela 2 do a priori.

Entretanto, a especificação técnica posterior de Wright, Wright & Nicolaides (aceita em 2019 e publicada no AJOG em 2020) rotula seu apêndice como “current parameter estimates” e traz coeficientes de verossimilhança de 12 semanas diferentes dos de O'Gorman 2016: PAM `+0.088997`, `−0.0016711`; UtA-PI `+0.5861`, `−0.014233`. Ela também traz outra matriz numérica de covariância. Portanto há duas famílias versionadas, e não é seguro misturá-las.

Decisão recomendada: manter nesta implementação a família AJOG 2016 completa e identificá-la explicitamente como versão 2016 até a validação dirigida contra a calculadora oficial. Se a meta mudar para reproduzir a configuração técnica posterior, substituir em conjunto regressões, matriz de covariância e limites; nunca trocar apenas um bloco.

## `eg_data.csv`

O refit foi cancelado. A correção está certa: `eg_data.csv` é dado de exemplo para gráficos de controle de qualidade de MoM, não saída determinística do motor. Não sustenta inferência de coeficientes vigentes. Nenhum coeficiente deste relatório veio desse CSV.

## Ordem de correção antes de qualquer caso clínico

| Ordem | Correção | Motivo |
|---:|---|---|
| 1 | Aplicar `min(µ_com_HAS, µ_sem_HAS)` | Regra explícita de Wright 2015; hoje pode subestimar risco |
| 2 | Usar `g.current=max(24, IG atual)` nos ramos com e sem marcadores | Corrige a própria definição do risco posterior |
| 3 | Truncar log10 MoM observado nos limites publicados | Evita LRs fora da especificação e reduz extremos numéricos |
| 4 | Proibir imputação silenciosa de Z-score/IG anterior | Evita fabricar dado clínico |
| 5 | Adicionar validação de domínio, finitude e hard stop numérico | Impede `NaN` ou risco inválido silencioso |
| 6 | Fixar a versão do conjunto de parâmetros e validar contra grade oficial | Evita mistura 2016/2020 |

CALCULOS-REVISADOS
