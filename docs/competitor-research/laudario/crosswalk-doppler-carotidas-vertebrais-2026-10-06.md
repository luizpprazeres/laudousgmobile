# Cruzamento Laudário × LaudoUSG — Doppler de Carótidas e Vertebrais

Data: 06/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi comparado com o preflight técnico e a prova sintética de 05/10. Nenhum dado clínico real foi usado.

## Síntese

O Laudário possui um modelo vascular amplo, por vaso e lado, com dois modos de classificação, placas múltiplas, razões calculadas, limitação técnica e graduação do roubo da subclávia. O LaudoUSG já tem um MVP Web compartilhado que começa vazio, separa os lados, calcula a razão ACI/ACC e bloqueia conflitos entre placas e classe. Os clientes móveis ainda dependem do writer genérico, e o renderer legado permanece dormente. A rodada confirmou que lado, vaso, limitação e derivados precisam chegar ao mesmo contrato antes da ativação no mobile.

| Cenário | Laudário observado | LaudoUSG atual | Classificação |
| --- | --- | --- | --- |
| Baseline sem medidas | publica todos os vasos bilaterais como habituais e conclui normalidade | Web v2 começa vazio e bloqueia a geração; o renderer legado ainda presume normalidade se for ativado | Web já corrigida; risco dormente no mobile |
| ACI direita 280/95 nos campos basais | tabela de velocidades, mas placa permanece <50% sem alerta | Web registra as velocidades e exige classe explícita; não possui contexto de velocidade dentro da lesão | cobertura parcial |
| ACI direita 280/95 nos campos da placa | deriva 70–79%, lateraliza a conclusão e sugere seguimento | Web não deriva classe por velocidade; valida a classe contra o percentual de redução informado | comportamento deliberadamente mais conservador |
| ACC ipsilateral 80/20 | calcula três razões no formulário | Web calcula e publica PSV ACI/PSV ACC do mesmo lado; mobile não compartilha esse derivado | paridade incompleta |
| Roubo total à esquerda | corpo e conclusão coerentes e laterais | Web representa retrógrado ou ausente e inclui o achado na conclusão, mas não gradua o roubo; legado pode concluir normalidade | Web segura, contrato incompleto |
| Limitação por vaso | opção presente em cada vaso relevante | Web representa limitação apenas no nível do lado | gap confirmado |

## Escopo e defaults

O concorrente oferece mais estados por vaso, mas ainda abre publicando normalidade completa. O MVP Web atual do LaudoUSG começa com avaliação, placas, vertebral e classificação vazias e não gera o texto enquanto os dados mínimos não forem preenchidos. O risco de normalidade presumida permanece no renderer legado do pipeline móvel, hoje fora do caminho ativo.

**Requisito proposto:** cada vaso deve registrar `não avaliado`, `avaliado normal`, `alterado` ou `limitado`. Um preset normal pode manter a produtividade, desde que seja uma ação explícita do médico e registre o escopo aplicado. A técnica, o corpo e a conclusão devem usar o mesmo escopo.

## Medidas, placas e classificação

O cenário mostrou que a localização semântica do valor importa. No concorrente, 280/95 nos campos basais não reclassificou a placa; os mesmos números nos campos da maior estenose ativaram a classificação multiparamétrica. A interface não alertou sobre a divergência temporária. No LaudoUSG Web, VPS e VDF pertencem ao vaso, sem campo próprio para o ponto de maior estenose; o médico escolhe a classe e o validador cruza essa classe com o percentual de redução informado na placa.

**Requisito proposto:** o LaudoUSG deve distinguir velocidade basal, velocidade no ponto de maior estenose e velocidade de referência, com origem única e rótulo inequívoco. A classe selecionada ou calculada precisa ser validada contra as medidas disponíveis. Critérios e limiares só podem ser implementados a partir de fonte clínica própria, versionada e aprovada; os valores observados no concorrente não serão copiados.

## Razões e lateralidade

O Laudário calcula razões quando recebe velocidades da ACI e da ACC ipsilateral. O LaudoUSG Web v2 já calcula PSV ACI/PSV ACC, com duas casas, e possui uma classe independente por lado. O renderer legado ainda tem uma classe única e não calcula a razão.

**Gap confirmado:** Web, mobile e renderer legado ainda não usam a mesma estrutura. Mesmo no Web v2, a classe é lateral e não identifica qual vaso ou lesão a sustenta.

**Requisito proposto:** representar cada lesão com lado, vaso, segmento, medidas-fonte, método de classificação e classe confirmada. A razão deve ser determinística, somente leitura e calculada apenas entre medidas compatíveis do mesmo lado. Fórmula, arredondamento e uso clínico dependem de validação médica.

## Vertebrais e roubo da subclávia

O concorrente diferencia limitação técnica de ausência/oclusão/aplasia e gradua o padrão de roubo. O LaudoUSG Web reduz a direção a anterógrada, retrógrada ou ausente, mas já leva retrógrado e ausência à conclusão e bloqueia ausência de fluxo acompanhada de VPS. A limitação é lateral, não específica da vertebral.

**Requisito proposto:** ampliar o estado vertebral para incluir limitação, ausência de fluxo, fluxo alternante/bidirecional e retrógrado, preservando o termo ditado. Um padrão alterado deve impedir conclusão normal. A hipótese de roubo da subclávia deve exigir confirmação médica e não nascer apenas de um texto livre ou de vaso não visualizado.

## Recomendações

A ateromatose no concorrente sugeriu correlação e seguimento, mantendo sugestão e publicação separadas. O roubo total não selecionou recomendações. O LaudoUSG não possui um contrato compartilhado para recomendação vascular.

**Requisito proposto:** guardar três estados: sugerida, confirmada e publicada. A ausência de sugestão automática não pode remover a possibilidade de conduta manual. As regras clínicas serão próprias e revisadas antes de ativação.

## Ordem sugerida

Primeiro levar o contrato Web v2, suas guardas e seus testes ao caminho mobile, desativando a possibilidade de retorno ao renderer legado. Depois introduzir estado por vaso, contexto da medida e classe por lesão. Critérios multiparamétricos, percentis de espessura médio-intimal e recomendações entram somente após revisão clínica e testes sintéticos de fronteira.

## Testes de aceite propostos

Os nove casos do MVP Web já provam baseline vazio, normal explícito, razão ACI/ACC, lados independentes, limitação lateral, conflitos de placa, VDF maior que VPS, ausência de fluxo com VPS e coerência entre percentual e classe. O próximo conjunto deve provar paridade desses estados no mobile, contexto basal versus lesão, limitação por vaso, remoção da placa invalidando dependências e recomendações fora do laudo até confirmação.

## Evidências relacionadas

O caso funcional está em [cases/doppler-carotidas-vertebrais-2026-10-06.md](cases/doppler-carotidas-vertebrais-2026-10-06.md). O estado do código e as provas sintéticas estão em [audits/preflight-doppler-carotidas-vertebrais-2026-10-05.md](audits/preflight-doppler-carotidas-vertebrais-2026-10-05.md) e [audits/lote2/doppler-carotidas-vertebrais-2026-10-05.md](audits/lote2/doppler-carotidas-vertebrais-2026-10-05.md).
