# Laudário — Doppler de Carótidas e Vertebrais

Observado em 06/10/2026, em conta autorizada e com dados exclusivamente sintéticos. A rodada usou a interface normal, sem copiar, imprimir, assinar ou finalizar laudos. O modelo foi restaurado, reaberto e confirmado no estado inicial após os três cenários.

## Baseline

O modelo abre no modo por índice sistólico. Sem nenhuma medida, já descreve bilateralmente carótidas comuns, bifurcações, carótidas internas, carótidas externas e vertebrais como habituais. A técnica declara avaliação morfológica e hemodinâmica das carótidas e vertebrais, e a conclusão afirma ausência de alterações significativas.

As vertebrais não começam com uma direção escolhida no formulário: o fluxo basal está em “não citar”. Mesmo assim, o texto inicial descreve as duas vertebrais como pérvias e sem lesões. As carótidas também começam em “sem lesões parietais”, sem medidas ou confirmação adicional.

**Implicação:** a interface reduz cliques para um exame normal, mas transforma o estado inicial em achados examinados. O LaudoUSG tem o mesmo risco no renderer atual e precisa de escopo ou preset normal explícito antes de publicar normalidade.

## Inventário dos controles

O formulário separa cada vaso por lado: carótida comum, bifurcação, carótida interna, carótida externa e vertebral. Também possui técnica, indicação, patologias, pós-intervenção, cartograma, comparativos, achados adicionais e recomendações.

Há dois modos de avaliação. O modo inicial usa índice sistólico e medida anatômica. O segundo anuncia critérios multiparamétricos para a carótida interna e mantém o índice sistólico nos demais vasos. A tela ainda oferece Placa-RADS opcional, percentis de espessura médio-intimal por três coortes e um comando para preencher os fluxos basais como sem alteração.

Na carótida interna, o estado pode ser habitual, ateromatoso, suboclusivo, ocluído ou não visualizado por limitação. Existem campos basais de VPS e VDF e, dentro de cada placa, campos próprios de VPS e VDF na maior estenose, velocidades da carótida comum ipsilateral, razões derivadas, classe NASCET e redução ao modo B. O adicionador simples permite múltiplas placas e registra composição, localização, parede e padrão de fluxo.

Na vertebral, além de estado habitual, ateromatose, hipoplasia, limitação e ausência/oclusão/aplasia, há um caminho específico para síndrome do roubo da subclávia. Esse caminho distingue roubo latente, latente avançado, parcial e total e permite registrar manobra de hiperemia. Não foi observado um seletor genérico de fluxo retrógrado fora desse diagnóstico.

## Cenário 1 — estado inicial

**Entrada:** nenhuma alteração.

**Observado:** todas as estruturas bilaterais foram publicadas como habituais e a conclusão foi normal. Não havia medidas, placa, confirmação de fluxo ou seleção explícita de que todos os vasos tinham sido avaliados.

## Cenário 2 — estenose unilateral da ACI direita

**Entrada:** modo multiparamétrico; ACI direita ateromatosa; placa sintética; VPS 280 cm/s e VDF 95 cm/s. Depois foram adicionadas VPS 80 cm/s e VDF 20 cm/s da carótida comum ipsilateral para observar os derivados.

**Observado:** quando 280/95 foram lançados nos campos basais da ACI, o laudo apenas criou a tabela de velocidades e manteve a placa como inferior a 50%. Não surgiu alerta de incoerência. Quando os mesmos valores foram lançados nos campos da maior estenose dentro da placa, a classe mudou automaticamente para 70–79%, o fluxo pós-placa ficou hipercinético e a conclusão identificou corretamente a ACI direita.

Com as velocidades da carótida comum, a interface calculou três razões: VPS ACI/VPS ACC de 3,5, VPS ACI/VDF ACC de 14,0 e VDF ACI/VDF ACC de 4,8. Esses derivados não foram publicados no texto final observado. A interface sugeriu correlação clínica e acompanhamento ultrassonográfico, mas o bloco permaneceu fora do laudo porque o controle mestre de recomendações estava desligado.

**Implicação:** o cálculo é funcional e lateralizado quando os valores entram no subformulário correto. A duplicação entre velocidades basais e velocidades da placa permite, porém, o mesmo par 280/95 coexistir com uma classificação inferior a 50% sem aviso. O LaudoUSG deve ter uma única fonte semântica para cada medida ou explicar claramente o contexto e validar a coerência.

## Cenário 3 — fluxo retrógrado total na vertebral esquerda

**Entrada:** vertebral esquerda no caminho de síndrome do roubo, com grau total.

**Observado:** o corpo descreveu inversão completa e permanente do fluxo na vertebral esquerda e a conclusão identificou roubo total pela subclávia esquerda. O lado direito continuou descrito como normal por padrão. Nenhuma medida da subclávia foi solicitada nesse caminho e nenhuma recomendação automática foi marcada.

O estado inicial do caminho de roubo era latente, sem inversão; por isso foi necessário escolher explicitamente o grau total. A interface também oferece estados distintos para não visualização técnica e ausência/oclusão/aplasia, mas eles não foram executados nesta rodada.

**Implicação:** a lateralidade e a graduação chegam corretamente ao texto. A hipótese de roubo nasce do padrão vertebral, sem um dado estruturado da subclávia no mesmo painel. Para o LaudoUSG, essa inferência deve permanecer dependente de confirmação médica e de critérios próprios aprovados.

## Restauração

As velocidades basais e da placa, as velocidades da carótida comum e o estado ateromatoso foram apagados. A ACI direita voltou ao estado habitual e o modo por índice sistólico foi restaurado. Na vertebral esquerda, o grau voltou a latente antes de restaurar o estado habitual. O exame foi reaberto pelo catálogo e confirmou modo inicial, abas sem contadores e controles opcionais desligados.

## Evidência e próxima sondagem

São fatos observados os controles, os cálculos, os efeitos no corpo e na conclusão e a restauração descritos acima. Placa-RADS, percentis de espessura médio-intimal, estados de limitação e pós-intervenção não foram testados e não devem ser inferidos a partir de seus rótulos.

O cruzamento técnico está em [crosswalk-doppler-carotidas-vertebrais-2026-10-06.md](../crosswalk-doppler-carotidas-vertebrais-2026-10-06.md).
