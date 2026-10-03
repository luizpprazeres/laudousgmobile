# Cruzamento Laudário × LaudoUSG — Doppler de transplante renal

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi verificado no monorepo, no cliente iOS e na documentação versionada.

## Síntese

O Doppler de transplante renal está ausente na Web, no Android/RN, no iOS, na API, no seed do banco e nos contratos compartilhados. `DOPPLER_RENAL` representa rim nativo e não deve receber silenciosamente um exame de enxerto.

| Camada | Estado atual | Evidência |
| --- | --- | --- |
| Web | Categoria de transplante ausente; Doppler renal nativo abre o writer genérico | `apps/web/src/lib/writerCategories.ts:20` |
| Android/RN | Categoria de transplante ausente; só existe Doppler renal de artérias renais nativas | `apps/mobile/src/ui/tokens.ts:145` |
| iOS | Categoria de transplante ausente; só existe Doppler renal nativo | `laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:34` |
| API | Sem normalização, contrato, renderer, writer ou auditoria próprios para enxerto | `apps/api/src/server/pipeline/categoryNormalization.ts:41-77`; vizinho nativo em `apps/api/src/server/pipeline/renderer.ts:437-470` |
| Banco versionado | Sem código de categoria de transplante | seed nativo em `packages/db/src/seeds/data.ts:117` |
| Contrato compartilhado | Ausente | `packages/shared/src/clinicalModels/contracts.ts:3-9` |
| Conhecimento | Um rascunho em quarentena, pendente de fonte específica e curadoria | `packages/knowledge/snippets/DOPPLER_RENAL/excecao/__rev__/rim-transplantado.md:5-16` |

O código canônico proposto é `DOPPLER_TRANSPLANTE_RENAL`. Ele permanece apenas como proposta documental até a aprovação clínica e técnica.

## Lacunas confirmadas

Não há representação tipada de localização do enxerto, anastomose arterial, vaso ilíaco de referência, perfusão, índices intrarrenais, veia do enxerto, sistema coletor, ureter, coleções perienxerto, complicações pós-biópsia ou limitações técnicas.

O único material de transplante está em `packages/knowledge/snippets/DOPPLER_RENAL/excecao/__rev__/rim-transplantado.md`, marcado como rascunho e pendente de curadoria. Ele não deve ser promovido nem usado como regra clínica. O webhook ignora `__rev__`, mas o ingestor manual percorre a pasta; o status `draft` ainda impede o bloco de entrar no bundle validado.

## Riscos inferidos

O writer renal existente usa conceitos de rim nativo. Se um laudo de enxerto for encaminhado a ele, pode haver mistura entre relação aorto-renal e razão anastomose/ilíaca, leitura de fossa ilíaca direita como lateralidade de artéria renal e omissão de estruturas próprias do enxerto. Esse risco é inferido do código; nenhum laudo de transplante foi gerado no LaudoUSG nesta rodada.

Há também um candidato a lacuna na governança do conhecimento. No ingestor manual, qualquer status diferente de `draft` ou `archived` é convertido em `validated` (`apps/api/scripts/ingest-knowledge.ts:154-157`, `apps/api/scripts/ingest-knowledge.ts:256-260`). Remover por engano a linha de status do rascunho poderia levá-lo ao bundle. O ingestor manual deve excluir `__rev__` da mesma forma que o webhook antes de qualquer promoção.

## O que aproveitar do concorrente

A separação entre topografia do enxerto, morfologia, via excretora, coleções e estudo vascular é uma boa base de organização. Medidas de origem devem permanecer visíveis ao lado das razões derivadas. A interpretação de estenose deve continuar sob confirmação médica, e recomendações sugeridas devem exigir uma decisão separada para publicação.

## O que deve ser melhor no LaudoUSG

Cada estrutura precisa de estado explícito: não avaliada, normal, alterada ou limitada. Medidas acima dos limites aprovados devem criar uma pendência que impeça a publicação de uma conclusão normal incompatível. A pendência pode ser resolvida pelo médico como alteração confirmada, explicação técnica ou override documentado.

Texto, cálculos e conclusão devem nascer do mesmo contrato. Aliasings, tardus-parvus, ausência de fluxo, trombose, estenose e hipóteses etiológicas só podem aparecer quando os respectivos dados foram informados ou confirmados. Localização do enxerto não pode ser reutilizada como lateralidade arterial.

## Contrato mínimo proposto

O contrato deve conter contexto e qualidade técnica; localização do enxerto; tempo e indicação quando informados; morfologia e dimensões; parênquima; sistema coletor e ureter; coleções; artéria ilíaca de referência; anastomose e artéria do enxerto; perfusão por regiões; índices intrarrenais com medidas de origem; veia do enxerto; achados pós-biópsia; comparação; recomendações sugeridas, confirmadas e publicadas; e confirmação final do médico.

Razões e médias devem ser determinísticas, preservar unidades e carregar a origem de cada medida. O contrato deve aceitar anatomia vascular múltipla sem forçar uma única anastomose. Diagnóstico positivo e urgência precisam de dados mínimos definidos por fonte específica e revisão médica.

## Fronteiras pendentes

Ainda precisa ser decidido se “Aparelho urinário com Doppler” continuará restrito aos rins nativos ou poderá compor algum bloco do exame de enxerto. A recomendação atual é manter o transplante como contrato próprio e permitir composição explícita, sem herança implícita.

Também falta definir se os rins nativos entram no mesmo exame como módulo opcional ou permanecem em laudo separado. O concorrente não teve esse comportamento verificado nesta rodada; a decisão deve partir da prática clínica do LaudoUSG.

## Ordem de implementação

Primeiro fechar a fonte clínica específica de transplante renal e retirar o rascunho da quarentena somente após curadoria. Em seguida, aprovar o código, criar o contrato compartilhado dormente e adicionar uma proteção para que menções a enxerto não sigam silenciosamente pelo writer de rim nativo.

Depois vêm validação e renderer com casos sintéticos normal, medida anormal não confirmada, estenose confirmada, trombose, alteração venosa, dados incompletos, vasos múltiplos e limitação técnica. O formulário Web será usado para validar a experiência; Android/RN e iOS consumirão o mesmo contrato antes de qualquer ativação pública.

## Provas necessárias antes de ativar

São obrigatórios: normal completo e parcial; localização distinta de lateralidade; uma e múltiplas anastomoses; unidades e limites; razão com denominador ausente ou zero; medida anormal com interpretação normal bloqueada; trombose arterial e venosa; perfusão focal e difusa; índices por região; sistema coletor; coleções; recomendação sugerida sem publicação; remoção de achado limpando derivados; serialização e retomada nos três clientes.

O caso funcional está em [cases/doppler-transplante-renal-2026-10-03.md](cases/doppler-transplante-renal-2026-10-03.md). O preflight técnico detalhado está em [audits/preflight-doppler-transplante-renal-2026-10-03.md](audits/preflight-doppler-transplante-renal-2026-10-03.md).
