# Cruzamento Laudário × LaudoUSG — Doppler de Carótidas e Vertebrais

Data: 06/10/2026. O Laudário foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi comparado com o preflight técnico e a prova sintética de 05/10. Nenhum dado clínico real foi usado.

## Síntese

O Laudário possui um modelo vascular amplo, por vaso e lado, com dois modos de classificação, placas múltiplas, razões calculadas, limitação técnica e graduação do roubo da subclávia. O LaudoUSG tem um formulário Web estruturado mais simples e clientes móveis ainda dependentes do writer genérico. A rodada confirmou que os principais riscos do LaudoUSG não são exigências inevitáveis do exame: é possível representar lado, vaso, limitação e derivados de forma estruturada.

| Cenário | Laudário observado | LaudoUSG atual | Classificação |
| --- | --- | --- | --- |
| Baseline sem medidas | publica todos os vasos bilaterais como habituais e conclui normalidade | também publica normalidade, placas ausentes e vertebrais anterógradas por padrão | risco confirmado nos dois produtos |
| ACI direita 280/95 nos campos basais | tabela de velocidades, mas placa permanece <50% sem alerta | velocidade e classificação são independentes; conclusão pode continuar normal | coerência insuficiente nos dois produtos |
| ACI direita 280/95 nos campos da placa | deriva 70–79%, lateraliza a conclusão e sugere seguimento | não calcula razão ACI/ACC nem deriva classe; uma classificação atende o exame inteiro | cobertura parcial e gap estrutural |
| ACC ipsilateral 80/20 | calcula três razões no formulário | não possui razão ACI/ACC | gap confirmado |
| Roubo total à esquerda | corpo e conclusão coerentes e laterais | vertebral retrógrada pode coexistir com conclusão normal | defeito P0 confirmado no LaudoUSG |
| Limitação por vaso | opção presente em cada vaso relevante | contrato não representa vaso limitado | gap confirmado |

## Escopo e defaults

O concorrente oferece mais estados por vaso, mas ainda abre publicando normalidade completa. No LaudoUSG, o estado inicial também materializa classificação normal e direção vertebral anterógrada, além de afirmar espessura médio-intimal habitual e ausência de placas.

**Requisito proposto:** cada vaso deve registrar `não avaliado`, `avaliado normal`, `alterado` ou `limitado`. Um preset normal pode manter a produtividade, desde que seja uma ação explícita do médico e registre o escopo aplicado. A técnica, o corpo e a conclusão devem usar o mesmo escopo.

## Medidas, placas e classificação

O cenário mostrou que a localização semântica do valor importa. No concorrente, 280/95 nos campos basais não reclassificou a placa; os mesmos números nos campos da maior estenose ativaram a classificação multiparamétrica. A interface não alertou sobre a divergência temporária.

**Requisito proposto:** o LaudoUSG deve distinguir velocidade basal, velocidade no ponto de maior estenose e velocidade de referência, com origem única e rótulo inequívoco. A classe selecionada ou calculada precisa ser validada contra as medidas disponíveis. Critérios e limiares só podem ser implementados a partir de fonte clínica própria, versionada e aprovada; os valores observados no concorrente não serão copiados.

## Razões e lateralidade

O Laudário calcula razões quando recebe velocidades da ACI e da ACC ipsilateral. O LaudoUSG não calcula ACI/ACC e tem uma só classe com um só lado para o exame inteiro.

**Gap confirmado:** o contrato atual não representa graus diferentes em vasos ou lados distintos e não possui o derivado ACI/ACC.

**Requisito proposto:** representar cada lesão com lado, vaso, segmento, medidas-fonte, método de classificação e classe confirmada. A razão deve ser determinística, somente leitura e calculada apenas entre medidas compatíveis do mesmo lado. Fórmula, arredondamento e uso clínico dependem de validação médica.

## Vertebrais e roubo da subclávia

O concorrente diferencia limitação técnica de ausência/oclusão/aplasia e gradua o padrão de roubo. O LaudoUSG reduz a direção a anterógrada, retrógrada ou ausente e não leva o achado obrigatoriamente à conclusão.

**Requisito proposto:** ampliar o estado vertebral para incluir limitação, ausência de fluxo, fluxo alternante/bidirecional e retrógrado, preservando o termo ditado. Um padrão alterado deve impedir conclusão normal. A hipótese de roubo da subclávia deve exigir confirmação médica e não nascer apenas de um texto livre ou de vaso não visualizado.

## Recomendações

A ateromatose no concorrente sugeriu correlação e seguimento, mantendo sugestão e publicação separadas. O roubo total não selecionou recomendações. O LaudoUSG não possui um contrato compartilhado para recomendação vascular.

**Requisito proposto:** guardar três estados: sugerida, confirmada e publicada. A ausência de sugestão automática não pode remover a possibilidade de conduta manual. As regras clínicas serão próprias e revisadas antes de ativação.

## Ordem sugerida

Primeiro bloquear conclusão normal incompatível com placa, estenose, vertebral alterada ou texto adicional. Depois introduzir estado por vaso e classe por lesão/lado. Em seguida unificar o contrato entre Web, iOS, Android/RN e API, acrescentando razões determinísticas e proveniência das medidas. Critérios multiparamétricos, percentis de espessura médio-intimal e recomendações entram somente após revisão clínica e testes sintéticos de fronteira.

## Testes de aceite propostos

O conjunto mínimo deve provar baseline sem normalidade silenciosa; placa sem classe gerando pendência; medidas basais não reclassificando uma lesão; medidas na estenose alimentando apenas o cálculo aprovado; lados diferentes com classes independentes; vertebral retrógrada bloqueando conclusão normal; não visualizada gerando limitação em vez de oclusão; remoção da placa invalidando seus derivados e sua classe; e recomendações fora do laudo até confirmação.

## Evidências relacionadas

O caso funcional está em [cases/doppler-carotidas-vertebrais-2026-10-06.md](cases/doppler-carotidas-vertebrais-2026-10-06.md). O estado do código e as provas sintéticas estão em [audits/preflight-doppler-carotidas-vertebrais-2026-10-05.md](audits/preflight-doppler-carotidas-vertebrais-2026-10-05.md) e [audits/lote2/doppler-carotidas-vertebrais-2026-10-05.md](audits/lote2/doppler-carotidas-vertebrais-2026-10-05.md).
