# Revisão da divergência dos MoMs contra o software da FMF

## Veredito

O código atual transcreve corretamente as Tabelas 2 publicadas de Wright A 2015 e Tayyar 2015. A divergência não veio de sinal perdido no PDF nem de escolher por engano os efeitos de outro trimestre.

Os dois pontos oficiais, porém, não podem ser reconciliados apenas trocando o coeficiente da interação `HAS × peso`. O caso sem HAS também exige uma correção de base. Usando o centro dos valores exibidos pelo FMF, a família mínima de correções tem duas restrições:

```text
correção do modelo sem HAS = −0,0033227454 no log10 da mediana
correção adicional quando HAS=1 e peso=120 kg = +0,0123058710
```

Essas duas restrições não identificam coeficientes individuais. Uma alteração de intercepto mais uma alteração da interação, uma alteração de intercepto mais uma alteração do efeito principal de HAS, uma nova centralização e um truncamento exclusivo da interação podem produzir os mesmos dois resultados. Portanto, não há base para corrigir `mom.mjs` com um coeficiente deduzido destes dois pontos.

A troca dos nossos MoMs pelos MoMs centrais exibidos pelo FMF, sem mexer no a priori nem na verossimilhança, produz risco de 1:50,9 com HAS e 1:17,6 sem HAS. Isso reproduz os 1:50 e 1:17 oficiais dentro do arredondamento e confirma que o núcleo está certo e que o desvio está antes dele.

O resíduo não é aceitável apenas com ressalva se a saída for usada para decidir pelo corte de 1:100. No perfil com HAS, ele cria uma faixa local em que nosso resultado pode estar entre aproximadamente 1,00% e 1,28% e o oficial ainda estar abaixo de 1,00%. Isso pode classificar a paciente no lado errado do corte. A calculadora pode continuar em validação ou shadow mode, mas ainda não deve ser rotulada como paridade FMF para decisão clínica binária.

## 1. PAM: reprodução e álgebra

Em `mom.mjs:22-46`, o modelo implementado é:

```text
L = log10(mediana esperada da PAM)
MoM = PAM / 10^L

efeito_HAS(w) = 0,051007216 − 0,000421118 × (w − 69)
```

Os dois coeficientes e a centralização em 69 kg estão literalmente na Tabela 2 de Wright A 2015, linhas 483-495. Não há erro de sinal: o efeito principal da HAS é positivo e a interação com peso é negativa.

Para a paciente testada, o código produz:

| Estado | `L` nosso | Mediana nossa | MoM nosso |
|---|---:|---:|---:|
| sem HAS | 1,989820275 | 97,683289 mmHg | 0,972530724 |
| com HAS | 2,019350473 | 104,556364 mmHg | 0,908600836 |

Tomando os valores exibidos pelo FMF como centros, as medianas implícitas são:

```text
L_FMF_semHAS = log10(95 / 0,98) = 1,9864975296
L_FMF_comHAS = log10(95 / 0,89) = 2,0283335986
```

Logo:

```text
δ_base = L_FMF_semHAS − L_nosso_semHAS
       = −0,0033227454

efeito_HAS_nosso(120)
       = 2,019350473 − 1,989820275
       = 0,0295301980

efeito_HAS_FMF(120)
       = log10(0,98 / 0,89)
       = 0,0418360690

δ_HAS_em_120kg
       = 0,0418360690 − 0,0295301980
       = +0,0123058710
```

Como o software mostra apenas duas casas, sob arredondamento convencional o efeito implícito da HAS está entre `0,0371815804` e `0,0464929598`. Mesmo essa faixa inteira fica acima do nosso `0,0295301980`.

### Hipóteses concretas

| Hipótese | Resultado matemático | Julgamento |
|---|---|---|
| Trocar apenas `HAS × peso` | O caso sem HAS permanece em 0,97253, não 0,98 | Não reconcilia os dois pontos simultaneamente |
| Manter o efeito principal e ajustar a interação, além de corrigir a base | Coeficiente central passaria de `−0,000421118` para `−0,0001798264`; faixa compatível com o arredondamento: `−0,0002710909` a `−0,0000885148` | Reconcilia, mas é só uma das infinitas soluções; não é coeficiente identificado |
| Remover a interação sem alterar o efeito principal | Efeito HAS seria `0,051007216`, acima até do limite arredondado `0,046493` | Incompatível com estes pontos |
| Remover a interação e também trocar o efeito principal | Novo efeito poderia ser `0,041836069` no centro | Reconcilia, mas os dados não provam ausência de interação |
| Manter a interação e alterar só o efeito principal da HAS | Efeito principal central passaria a `0,063313087` | Reconcilia, mas também não é identificável com um único peso |
| Aplicar a interação a peso centrado em outro valor | Com o mesmo coeficiente, o centro central seria aproximadamente `98,22 kg`, em vez de 69 kg | É algebricamente equivalente a mudar o efeito principal; não distingue implementação |
| Truncar o peso apenas dentro da interação | Um peso efetivo central de `90,78 kg`, com faixa de `79,72` a `101,83 kg`, reproduz o efeito observado | Possível matematicamente, mas sem suporte no paper |
| Truncar o peso em todo o modelo | Um teto de 90,78 kg faria o MoM sem HAS previsto subir para aproximadamente `1,0093`, não 0,98 | Derrubada para um truncamento global nesse teto |

O próprio Wright 2015 usa 120 kg num exemplo clínico e afirma que PAM de 100 mmHg nessa mulher corresponde aproximadamente a 1,00 MoM. Isso é evidência contra a ideia de que o paper pretendia simplesmente cortar todo peso alto antes da fórmula. Não encontrei truncamento de peso descrito para o modelo de MoM.

A forma geral identificável pelos dados atuais é somente:

```text
L_novo = L_2015 + δ0 + HAS × (δH + δHW × (peso − 69))

δ0 = −0,0033227454
δH + 51 × δHW = +0,0123058710
```

Há infinitos pares `(δH, δHW)`. Qualquer patch que escolha um deles agora estaria inventando coeficiente.

## 2. IP uterino

A Tabela 2 final de Tayyar 2015 está em `tayyar2015.txt:335-368`. Ela não contém termo de HAS, diabetes, história familiar, FIV ou tabagismo. O modelo final inclui IG, peso, idade, origem afro-caribenha e, nas multíparas com PE prévia, a história obstétrica. Portanto, o fato de o FMF devolver 1,07 nos dois estados de HAS é o comportamento esperado.

O código em `mom.mjs:50-66` copiou corretamente os efeitos de primeiro trimestre. O primeiro trimestre é a categoria de referência: entra o termo `−0,004407905 × (IG−77)`, sem as constantes adicionais do segundo ou terceiro trimestre. A técnica também coincide com o paper: no primeiro trimestre, o Doppler foi transabdominal e foi usada a média das artérias direita e esquerda.

Com 84 dias, 120 kg, 30 anos, branca, nulípara e IP médio 1,73, Tayyar 2015 fornece:

```text
log10(mediana) = 0,2031948710
mediana = 1,5965953902
MoM = 1,0835556777
```

O valor exibido `1,07` implica, pelo centro, `log10(mediana)=0,2086623254`. Sob arredondamento convencional para duas casas, o verdadeiro MoM oficial estaria entre 1,065 e 1,075; o nosso 1,08356 está fora, com diferença mínima de aproximadamente 0,80% e central de 1,27%.

Há duas hipóteses concretas ainda abertas.

A primeira é a conversão de CCN para IG. O paper estima a IG pelo CCN, enquanto o nosso teste usou 84 dias inteiros. Pela equação clássica de Robinson-Fleming, CCN de 55 mm corresponde a aproximadamente 83,445 dias. Aplicar 83,445 ao modelo de Tayyar reduz o nosso MoM para aproximadamente `1,07790`. Isso não chega a 1,07 por arredondamento convencional, mas exibiria 1,07 se a interface truncar em vez de arredondar. Não confirmei como a interface formata as duas casas.

A segunda é uma família de parâmetros diferente no software. O modelo anterior publicado em Wright 2012, aplicado a 83,445 dias, produz aproximadamente `1,06965`, que arredonda exatamente para 1,07. Isso é uma pista, não prova de que o FMF ainda use o modelo antigo. Tayyar 2015 é a tabela posterior e correta para a implementação baseada no paper. O apêndice de 2020 ainda avisa que os parâmetros correntes do algoritmo ficam no site da FMF (`fmf-spec-wright2020-apendice.txt:191-193`), portanto é plausível que a versão executável não seja idêntica a uma das tabelas históricas publicadas.

Conclusão do IP uterino: a leitura e a transcrição da Tabela 2 de Tayyar estão certas; a divergência provavelmente vem de precisão/conversão da IG, formatação da tela ou versão diferente do modelo de mediana. Um único valor arredondado não separa essas causas.

## 3. Idade

O apêndice define a idade materna na data provável do parto (`fmf-spec-wright2020-apendice.txt:7-10`). A paciente nasceu em 21/08/1996. Em 22/08/2026 ela tinha 30 anos e um dia. Na DPP de 06/03/2027 ela ainda terá 30 anos; completará 31 apenas em 21/08/2027.

Portanto, `30` está correto tanto pela idade no exame quanto pela idade na DPP. Este caso não permite descobrir qual dos dois critérios a interface realmente usa. Para o motor, deve prevalecer o critério publicado: idade na DPP.

## 4. Impacto clínico do resíduo

Mantive o mesmo a priori, a mesma verossimilhança e a mesma integração. Para isolar o efeito, forneci ao núcleo medidas sintéticas que geram exatamente cada par de MoMs. Não houve nova consulta ao software oficial.

### Paciente medida

| Estado | MoMs usados | Risco pelo nosso núcleo | Equivalente |
|---|---|---:|---:|
| HAS, nossos MoMs | 0,9086008 / 1,0835557 | 2,36296% | 1:42,32 |
| HAS, FMF central | 0,89 / 1,07 | 1,96582% | 1:50,87 |
| sem HAS, nossos MoMs | 0,9725307 / 1,0835557 | 5,58501% | 1:17,91 |
| sem HAS, FMF central | 0,98 / 1,07 | 5,69824% | 1:17,55 |

Com HAS, os limites decorrentes do arredondamento dos dois MoMs oficiais produzem entre 1,863% e 2,073%, ou aproximadamente 1:53,7 a 1:48,2. Isso contém o 1:50 oficial. Sem HAS, produzem entre 5,450% e 5,955%, ou aproximadamente 1:18,35 a 1:16,79, contendo o 1:17 oficial.

### Fronteira de 1:100

No perfil com HAS e usando os centros exibidos, o FMF cruza 1,00% quando a média a priori é `49,1443` semanas; nossos MoMs cruzam quando ela é `49,7126`. No ponto em que o oficial está exatamente em 1,00%, o nosso cálculo está em 1,2148%. No ponto em que o nosso está em 1,00%, o oficial está em 0,8211%.

Considerando toda a incerteza das duas casas exibidas, quando o oficial está em 1,00% o nosso pode estar entre 1,1494% e 1,2838%. Quando o nosso está em 1,00%, o oficial pode estar entre 0,7757% e 0,8688%. Assim, para este padrão de resíduo com HAS, uma saída nossa entre aproximadamente 1:100 e 1:78 pode estar no lado positivo enquanto o software oficial ainda está abaixo de 1:100.

Sem HAS, os dois erros de marcador atuam em sentidos opostos e quase se cancelam. No centro, o nosso cálculo está em 0,9687% quando o oficial chega a 1,00%, e o oficial está em 1,0321% quando o nosso chega a 1,00%. Isso cria uma faixa central estreita de falso negativo: nosso resultado entre aproximadamente 1:103 e 1:100 enquanto o oficial já está acima do corte.

Com a incerteza do arredondamento, a direção sem HAS deixa de ser determinável: na fronteira oficial, nosso risco pode variar de 0,9188% a 1,0214%; na nossa fronteira, o oficial pode variar de 0,9791% a 1,0877%. Localmente, qualquer saída nossa em torno de 0,92% a 1,02% deve ser considerada incapaz de demonstrar paridade com o corte oficial.

Essas faixas são uma análise local do resíduo desta paciente, não limites populacionais. Outros pesos, etnias, idades gestacionais e histórias obstétricas podem mudar tanto o tamanho quanto a direção do erro.

## 5. Pontos manuais mínimos que agregam informação

Para distinguir alteração de inclinação, novo efeito principal, ausência de interação e teto da interação, são necessários quatro novos registros manuais. Devem ser mantidos todos os dados da paciente original, inclusive PAM 95, diabetes, história familiar, idade, altura, paridade, raça, CCN e concepção. Muda-se apenas peso e HAS:

| Teste | Peso | HAS |
|---|---:|---|
| A | 69 kg | não |
| B | 69 kg | sim |
| C | 95 kg | não |
| D | 95 kg | sim |

Em cada tela, registrar os MoMs exibidos de PAM e IP uterino e, se houver, a IG calculada pelo software com mais precisão do que semanas inteiras. Os pares A/B, C/D e o par já existente em 120 kg fornecem o efeito da HAS em três pesos. Um efeito linear, um platô perto de 91 kg, uma interação ausente e uma simples mudança do efeito principal passam a fazer previsões diferentes. Os casos sem HAS em 69, 95 e 120 kg também mostram se o resíduo de base é constante ou acompanha a função do peso.

Se o IP uterino continuar sem explicação, um quinto registro de alto rendimento é repetir o perfil sem HAS, peso 120 kg e IP 1,73 no extremo de CCN 84 mm, mantendo datas coerentes com 13+6 semanas. A distância em relação ao ponto de CCN 55 mm permite estimar a inclinação gestacional apesar da exibição em duas casas e separar melhor Tayyar 2015, Wright 2012 e erro de conversão do CCN.

Para descobrir se a interface usa idade no exame ou na DPP, seria necessário um perfil cuja data de aniversário fique entre as duas datas. Isso não é necessário para fechar o caso atual, porque ambos os critérios dão 30 anos.

## Decisão

Não alterar coeficientes agora. O patch central `intercepto −0,0033227` mais interação `−0,0001798264` reproduziria estes dois pontos, mas seria overfitting explícito e poderia piorar o restante do domínio. Coletar manualmente os quatro pontos controlados acima, adjudicar qual família de normalização o software usa e só então versionar uma correção.

Até essa adjudicação, a implementação deve ser tratada como reprodução dos papers de 2015, não como reprodução validada do software FMF atual. Como o erro observado cruza 1:100, a divergência bloqueia uso clínico binário sem um guard de incerteza; não bloqueia continuar a validação do núcleo em shadow mode.

MOM-REVISADO
