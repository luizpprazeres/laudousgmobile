# Laudário — Doppler de transplante renal

Data: 03/10/2026. Conta autorizada pelo Luiz. Estudo realizado pela interface normal do navegador, com medidas sintéticas e sem dados de pacientes. Não houve cópia, impressão, finalização ou envio de laudo. O modelo foi restaurado ao estado normal no fim.

## Organização observada

O formulário possui as abas Dados do Paciente, Técnica, Indicação, Enxerto Renal, Estudo Doppler, Exames Comparativos, Achados Adicionais e Recomendações.

Enxerto Renal separa topografia, situação do parênquima, medidas e morfologia, cálculos, cistos, nódulos, dilatação do sistema coletor e ureter e coleções perienxerto. A topografia do enxerto é registrada separadamente, com opções de fossa ilíaca direita ou esquerda.

Estudo Doppler separa critérios diretos da anastomose arterial, perfusão parenquimatosa, índices de resistência interlobares, critérios indiretos opcionais, veia do enxerto e achados pós-biópsia. A interface oferece VPS da artéria ilíaca, VPS da anastomose e razão anastomose/ilíaca automática, além de IR superior, médio e inferior com média automática.

A interface exibe limiares ao lado de VPS da anastomose, razão anastomose/ilíaca e IR médio. Os critérios indiretos anunciam índice de pulsatilidade e tempo de aceleração, mas seus campos não foram abertos nesta rodada. Não foram verificados o tratamento dos rins nativos, artérias múltiplas, veia ilíaca, bexiga, tempo desde o transplante, tipo de anastomose, qualidade técnica por estrutura ou uma opção de “não avaliado”.

## Cenário 1 — estado normal

Sem medidas, o modelo descreve enxerto em fossa ilíaca direita, morfologia e parênquima preservados, anastomose arterial sem sinais de estenose, perfusão homogênea, índices de resistência preservados e veia pérvia. A conclusão declara ausência de anormalidades.

**Observado:** o estado normal não exige dimensões, velocidades, índices de resistência ou documentação da artéria ilíaca. O texto afirma normalidade vascular completa mesmo sem medidas.

## Cenário 2 — velocidades elevadas e interpretação de estenose

Foram introduzidas VPS sintéticas de 100 cm/s na artéria ilíaca e 300 cm/s na anastomose. A interface calculou razão 3,0, sinalizou que os dois critérios diretos estavam acima dos limiares exibidos e pediu que o médico alterasse a interpretação quando aplicável.

As medidas e a razão entraram no corpo do laudo, mas a frase de anastomose sem estenose e a conclusão normal permaneceram enquanto a interpretação continuou no estado normal.

Ao selecionar manualmente a interpretação de estenose, os marcadores de velocidade e razão foram ativados automaticamente. O corpo passou a descrever estenose hemodinamicamente significativa e a conclusão passou a declarar estenose da artéria do enxerto. Uma recomendação de confirmação por exame vascular complementar foi selecionada, mas só seria publicada se o médico ligasse a chave geral de recomendações.

**Observado:** há confirmação médica antes do diagnóstico, o que é útil. Ao mesmo tempo, medidas anormais e alertas podem coexistir temporariamente com texto e conclusão normais. A redação alterada inclui aliasing mesmo sem esse sinal ter sido selecionado separadamente.

Depois de restaurar a interpretação normal e apagar as duas medidas, a razão, os alertas, os marcadores de estenose e a recomendação foram removidos.

**Não observado:** a VPS da anastomose isolada, sem medida da artéria ilíaca, não foi testada. Portanto, esta rodada não responde se uma única velocidade produz diagnóstico, alerta sem razão ou alguma outra pendência.

## Cenário 3 — ausência de fluxo arterial sintética

Ao selecionar ausência de fluxo arterial, o modelo produziu descrição e conclusão compatíveis com trombose arterial do enxerto. O campo de causa permaneceu em “não determinada”. As frases normais de perfusão, índices de resistência e veia deixaram de ser publicadas nesse estado.

Foram sugeridas correlação com a função renal e avaliação imediata pela equipe de transplante. As sugestões ficaram selecionadas, porém continuaram fora do laudo porque a chave geral de recomendações permaneceu desligada.

**Observado:** o modelo destaca o caráter urgente e não escolhe uma causa automaticamente. A conclusão ainda acrescenta normalidade genérica das demais estruturas, embora vários componentes vasculares deixem de ser descritos no corpo.

Após restaurar o fluxo arterial normal, as recomendações saíram, as frases vasculares normais voltaram e o laudo retornou integralmente ao estado inicial.

Este cenário substituiu o IR intrarrenal elevado isolado previsto no preflight. Assim, permanecem **não observados** o comportamento diante de IR elevado isolado, a eventual sugestão de rejeição, a exigência de medidas em múltiplas regiões e a resposta a veia do enxerto não avaliada.

## Comportamentos úteis

A topografia do enxerto é um campo próprio. Medidas de origem e razão calculada ficam visíveis. Alertas não mudam sozinhos a interpretação médica. Recomendações sugeridas permanecem separadas da decisão de publicá-las. A trombose arterial suprime frases vasculares que poderiam contradizer a ausência de fluxo.

## Comportamentos que não devem ser reproduzidos

O LaudoUSG não deve afirmar normalidade vascular sem registrar o escopo realmente avaliado. Uma medida acima do limite não pode coexistir silenciosamente com conclusão normal; o sistema deve exigir resolução explícita da pendência. A seleção de estenose não deve publicar aliasing se esse sinal não foi informado. A frase genérica sobre “demais estruturas” precisa respeitar componentes não avaliados ou suprimidos.

Os limiares exibidos pelo concorrente não foram adotados como fonte clínica. A implementação exige diretriz específica de transplante renal e aprovação médica.
