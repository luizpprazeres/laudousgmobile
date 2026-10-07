# Morfológico do 2º trimestre: gráficos e inclusão no laudo

Data da observação: 07/10/2026. Sessão autorizada, pela interface normal do Laudário, com dados exclusivamente sintéticos. O formulário foi restaurado ao estado inicial ao fim da rodada. Nenhum laudo foi impresso, finalizado ou vinculado a paciente.

## Escopo e classe da evidência

Foram observados o estado inicial e três cenários sintéticos: biometria fetal completa em 20 semanas, um exame anterior de DBP e inclusão isolada do gráfico de DBP no laudo. Os textos abaixo descrevem comportamento funcional; não reproduzem os modelos do concorrente.

## Comportamento observado

O formulário apresenta cinco gráficos: DBP, CC, CA, CF e PFE. DBP, CC, CA e CF identificam Hadlock 1984 como referência; PFE identifica Hadlock 1991. Há um controle global para incluir todos os gráficos no laudo, controle individual em cada gráfico, ajuste de tamanho com valor padrão de 120%, opção de aproximação no ponto atual e opção de barra de percentil na tabela biométrica.

Com IG de 20 semanas e medidas sintéticas de DBP 47 mm, DOF 62 mm, CC 174 mm, CA 150 mm e CF 32 mm, a tela exibiu DBP p59, CC p38, CA p53, CF p41 e PFE de 332 g em p51. Os gráficos mostraram o ponto atual sobre as curvas de referência. A conclusão do laudo foi atualizada com o peso e a circunferência abdominal depois da atualização da tela.

Cada gráfico oferece seu próprio comando “Adicionar exame anterior”. No cenário de DBP, foi possível registrar um ponto anterior de 18 semanas e 41 mm. Esse ponto ficou restrito ao gráfico de DBP; os outros quatro gráficos mantiveram controles próprios e independentes. A remoção também é individual.

Ao marcar apenas o gráfico de DBP, o editor inseriu uma imagem do gráfico no laudo e acrescentou a referência correspondente. O controle individual, portanto, altera de fato o conteúdo do documento. O gráfico incluído continha o ponto atual e o ponto anterior com valores normalizados a duas casas decimais.

Durante o preenchimento houve um estado transitório com peso vazio e percentil inválido imediatamente após a última medida. Ao abrir a aba de gráficos, o conteúdo foi recalculado e ficou correto. Isso sugere dependência de evento de saída do campo ou de uma nova renderização. Como o estado incorreto não persistiu após a navegação, fica classificado como comportamento observado transitório, não como defeito confirmado.

## Inferências limitadas

O cadastro de exames anteriores parece ser armazenado por gráfico, porque cada curva mantém seu próprio conjunto de comandos e o ponto de DBP não apareceu nas demais curvas. A implementação interna não foi inspecionada, então a forma de armazenamento é apenas inferida pela interface.

A imagem inserida no laudo parece ser uma representação estática do estado do gráfico no momento da inclusão. Não foi testado o comportamento após alterar uma medida já incluída, por respeito ao limite de três cenários desta sessão.

## Comparação com o LaudoUSG

O LaudoUSG já possui uma curva interativa de PFE pelo padrão INTERGROWTH-21st 2020, com cálculo de peso por Hadlock CC/CA/CF, percentil, tooltip por mouse ou teclado, descrição acessível, inclusão explícita no laudo, persistência do descritor clínico, folha isolada para impressão e visualização reconstruída no histórico. A figura não altera silenciosamente o peso, o percentil ou a conclusão. Ainda falta validar uma prévia integrada do laudo completo com a figura na paginação final.

A lacuna principal é longitudinal. Hoje a curva representa o exame atual; ainda não há uma tabela comum de exames anteriores que alimente todas as métricas. Também não há curvas individuais de DBP, CC, CA e CF, nem escolha de um conjunto de gráficos para anexar. Esses itens devem ser avaliados por utilidade clínica antes de ampliar a tela.

## Candidatos para o produto

O primeiro incremento recomendado é um histórico longitudinal único, no qual cada exame anterior tenha data, IG, fonte da datação e medidas disponíveis. A mesma linha alimentaria todas as curvas compatíveis. Isso reduz a repetição vista no concorrente e evita que DBP, CC, CA, CF e PFE fiquem com históricos divergentes.

A inclusão no laudo deve continuar opcional e explícita. O médico pode escolher “Crescimento fetal” como conjunto recomendado e, numa área avançada, selecionar curvas individuais. O sistema deve incluir somente gráficos com dados válidos e mostrar antes da impressão quais figuras entrarão no laudo. Tamanho pode ser oferecido como compacto, médio ou página inteira, em vez de um percentual pouco previsível.

Cada gráfico deve manter interação na tela por mouse, toque e teclado, além de um resumo textual acessível com IG, medida e percentil. No laudo impresso, a versão deve ser estática, com fonte, versão da curva, fórmula do peso e datação usadas. Uma mudança de medida deve regenerar a figura; percentis antigos nunca podem permanecer visíveis quando a entrada ficou incompleta.

A curva não deve escrever ou mudar uma conclusão clínica por conta própria. Ela fornece valores estruturados ao módulo de crescimento fetal, que segue as regras clínicas já existentes e preserva qualquer valor manual ou importado até uma ação explícita do médico.

## Correções originadas nesta rodada

A revisão central confirmou que uma figura previamente persistida podia permanecer no estado salvo se a biometria se tornasse inválida antes de um novo salvamento. A persistência passou a remover a figura antiga e desligar sua inclusão quando não existe uma prévia válida. Também passou a retirar descritores antigos quando a inclusão está desligada, mesmo que a biometria atual seja válida.

A legenda da figura dizia “datação pela DUM/US precoce em [data do exame]”, o que podia fazer a data do exame parecer a data da DUM ou do ultrassom inicial. A redação agora identifica explicitamente que aquela é a IG projetada pela fonte escolhida na data do exame, sem inventar nem perder a origem da datação.

## Próxima decisão clínica

Antes de acrescentar DBP, CC, CA e CF, é preciso definir quais curvas e janelas gestacionais serão oficiais no LaudoUSG. A observação do Hadlock no concorrente serve como comparação funcional, não como razão para substituir o padrão INTERGROWTH já implementado. O histórico longitudinal único e a prévia de impressão podem avançar sem trocar a referência clínica atual.
