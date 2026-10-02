# Contrato hepático compartilhado — fase 1, 02/10/2026

Status: candidato implementado para revisão, sem aprovação clínica e sem ativação. Branch `codex/hepatic-contracts-20261002`, worktree `laudousg-hepatic-contracts`. Nenhum checkout externo, categoria, seletor, renderer existente, fluxo de persistência ou Sala foi alterado. Não houve push, deploy, acesso a pacientes ou teste em equipamento físico.

## Escopo entregue

`packages/shared/src/hepatic/contracts.ts` define `hepatic-assessment/v1`, tipos TypeScript, schema Zod estrito, avaliação determinística de pendências e operações imutáveis. A exportação no pacote compartilhado permite consumo futuro pela Web, API e Android. O iOS precisará de modelos Swift e vetores de compatibilidade JSON; exportar TypeScript não entrega paridade nativa.

`purpose` identifica avaliação multiparamétrica, elastografia, complemento de Abdome total ou complemento de Abdome superior. Esses identificadores são contextos do contrato, não códigos de categorias registradas. Gordura e rigidez usam a mesma estrutura e regras em todos os contextos. Nenhum consumidor atual passou a enviar ou aceitar este contrato.

As fontes desta fase são o [caso observado](../competitor-research/laudario/cases/avaliacao-multiparametrica-hepatica-2026-10-02.md), o [crosswalk](../competitor-research/laudario/crosswalk-avaliacao-multiparametrica-hepatica-2026-10-02.md) e a leitura do checkout. Cortes vistos no concorrente não foram promovidos a critérios clínicos. Elastografia Hepática independente ainda requer a sondagem de protocolo indicada no caso. Não há classificador de esteatose, fibrose, doença avançada ou hipertensão portal.

## Modelo de dados e gates

Cada módulo distingue `not_performed`, `performed`, `partially_limited` e `not_feasible`. Não há método, normalidade ou número de aquisições gerado por padrão. Limitação e inviabilidade exigem motivo. Módulos inativos não podem carregar medidas, derivações ou interpretação. O gate é de conclusão quantitativa: um exame inviável pode futuramente receber descrição de inviabilidade, mas não ganha resultado quantitativo válido.

As medidas preservam unidade, valor, papel (aquisição individual, mediana ou IQR), identificador e fonte/versionamento, além da origem manual, importada do equipamento ou ditada e confirmada. CAP usa dB/m; ATI e UGAP usam dB/cm/MHz; UDFF e USFF usam a porcentagem nativa da respectiva tecnologia. Cada método permanece identificável. Não existe porcentagem universal de gordura nem conversão entre tecnologias. Rigidez por 2D-SWE ou pSWE/ARFI admite kPa ou m/s como unidade de origem; TE fica restrita a kPa neste candidato. Uma aquisição não mistura unidades. Métodos/unidades adicionais exigem revisão e extensão explícita do contrato.

Um módulo realizado exige método compatível, fabricante e modelo, protocolo de aquisição versionado, número de aquisições, lobo, profundidade, ROI, posição, contexto de jejum e fatores de confusão revisados com contexto etiológico. Versão de software, transdutor e distância da cápsula são campos opcionais. Fatores são itens explícitos com revisão atestada: lista vazia com `reviewed: true` significa nenhum fator informado após revisão, não ausência inferida. O contexto etiológico pode declarar desconhecimento; o contrato não inventa etiologia. Jejum desconhecido bloqueia, jejum informado exige duração; não jejum fica explicitamente documentado e depende da avaliação de qualidade/contexto pelo médico, sem limiar universal de horas.

É exigida uma mediana nativa. Valores individuais são preservados quando disponíveis; se enviados, sua quantidade deve coincidir com o número de aquisições declarado. Esta fase também admite mediana/IQR resumidos pelo equipamento, sem fabricar aquisições individuais. IDs duplicados e múltiplas medianas ou IQRs são recusados pelo gate.

Qualidade exige avaliação adequada atribuída a médico/data, fonte/versionamento do critério e aplicabilidade exata por método, fabricante, modelo e unidade. O critério declara mínimo de aquisições e códigos das métricas exigidas; faltas ou duplicidades bloqueiam. **O contrato não verifica limiares clínicos das métricas:** adequação é uma avaliação médica explícita. Os critérios ainda são dados fornecidos pelo consumidor, sem registro aprovado no servidor. Antes de ativar, revisar protocolos de cada equipamento e criar registro confiável de critérios ou definir formalmente o fluxo de avaliação manual. Os mínimos dos testes são sintéticos e não são recomendação clínica.

Interpretação sugerida nunca libera conclusão. A interpretação confirmada exige médico, data e referência versionada e se vincula a uma representação canônica dos dados atuais do módulo. Alterar a medida, equipamento, método, qualidade ou contexto do módulo torna a revisão antiga inválida. O snapshot é uma representação determinística, não assinatura digital nem prova de identidade. Na futura API, identidade/data e confirmação devem ser atribuídas pelo servidor autenticado; não confiar nesses campos enviados pelo cliente.

`evaluateHepaticConclusion(unknown)` valida estrutura e retorna `canConclude`, dados normalizados, pendências com `path`/`code` e prontidão individual de gordura/rigidez. Pendência clínica em gordura mantém a prontidão de rigidez visível, mas bloqueia a conclusão conjunta. Payload estruturalmente inválido bloqueia todo o envelope. Um módulo não realizado pode ficar omitido; precisa haver pelo menos um resultado quantitativo ativo e completo. Elastografia independente exige rigidez. Avaliação multiparamétrica exige também correlação explícita com modo B e Doppler e interpretação integrada confirmada sobre o envelope atual. Discordância exige resolução médica registrada; não sobrescreve qualquer modalidade. O candidato admite modalidade não realizada na avaliação multiparamétrica; a revisão clínica deve decidir se esta composição parcial é aceitável ou se ambas passam a ser obrigatórias.

Modo B e Doppler são resumos documentados para correlação, não novos contratos de anatomia/vasos ou prova de avaliação completa. Os módulos qualitativos existentes devem continuar sendo a fonte desses achados na próxima fase. Para complementos abdominais, o gate deste pacote cobre os módulos quantitativos; revisão do texto abdominal completo e do laudo persistido continua sendo uma obrigação separada.

## Proveniência e limpeza atômica

A única derivação implementada é IQR/mediana × 100, opcional, identificada por `iqr/median*100/v1`, preservando cópias exatas das duas medidas fonte. É aritmética de variabilidade, não conversão de rigidez nem classificação clínica. O gate revalida fontes, papéis, unidades e resultado numérico; derivações residuais, fontes apagadas e valores adulterados bloqueiam mesmo após reconfirmação médica.

`removeHepaticMeasurement` e `replaceHepaticModule` retornam um novo envelope com revisão incrementada, fontes atualizadas e remoção de **todas** as derivações e interpretações do módulo editado e da interpretação integrada. O módulo independente permanece intacto. Não há estado intermediário publicado, recalculado silenciosamente ou mutação do objeto original. A derivação explícita também invalida as revisões anteriores. A política é conservadora: mesmo uma edição de contexto exige nova derivação e confirmação.

Essa atomicidade é do estado compartilhado em memória. Não prova atomicidade de banco ou concorrência entre aparelhos. A persistência futura deve salvar o envelope inteiro e invalidar a revisão do laudo na mesma transação com controle da revisão esperada. Editar o envelope diretamente não limpa campos automaticamente; o gate detecta derivação/revisão incompatível. Consumidores deverão usar as operações de atualização e sempre repetir a validação no servidor.

## Inventário de integração no checkout

| Superfície | Ponto atual | Integração futura e limite desta fase |
| --- | --- | --- |
| Contrato comum | `packages/shared/src/index.ts`, `schemas/clinicalComposition.ts`, `clinicalModels/contracts.ts` | Contrato hepático exportado separadamente. Não estender enum vivo ou reutilizar `physicianReviewed` como autorização de transporte. |
| Web, aquisição | `apps/web/src/components/laudar/LiverQuantificationPanel.tsx`; `apps/web/src/lib/deterministic/liverQuantification.ts` | Adaptar estado livre e bloco descritivo. Migração deve identificar tecnologia/equipamento reais; `attenuation`/`fraction` históricos não permitem inferir ATI, UGAP, UDFF ou USFF. |
| Web, composição | `apps/web/src/components/laudar/LaudarWebExperience.tsx` (`__liver_quantification`); `apps/web/src/lib/deterministic/organs/figado.ts`, `abdomeTotal.ts`, `abdomeSuperior.ts` | Reutilizar o mesmo módulo; não duplicar frases e não presumir concordância entre modo B e medidas. |
| Web, persistência antiga | `apps/web/src/lib/webReports.ts`; `apps/web/src/app/api/web-reports/[id]/route.ts` | Estado é `unknown` na fronteira. Bloco hepático legado continua em `web_reports`. Planejar validação de entrada, migração e reabertura sem preencher dados ausentes. |
| Web, fluxo clínico mais novo | `apps/web/src/components/laudar/ClinicalModelWorkspace.tsx`; `apps/web/src/lib/clinicalReportFlow.ts`; `apps/web/src/app/api/v1/clinical-reports/route.ts` | Já há fluxo rascunho → persistência → revisão da revisão/texto. Usar como candidato ao transporte hepático após aprovação, sem ativar agora. |
| API, geração | `apps/api/src/app/api/generate/route.ts`; `apps/api/src/server/renderer/extraction.ts`; `packages/shared/src/schemas/generate.ts` | Ditado não equivale a confirmação dos campos. Não inserir contrato no structurer sem consumidores e validação correspondentes. |
| API, contrato/persistência/revisão | `apps/api/src/server/clinicalReports/service.ts`, `review.ts`; `apps/api/src/app/api/v1/clinical-reports/route.ts`, `[id]/review/route.ts` | Serviço atual aceita somente `ClinicalModelInputSchema`. Futuro adapter deve validar versão/gates e persistir fontes/revisão antes da confirmação do texto exato. Hoje o endpoint não aceita o novo contrato. |
| Categorias | `packages/shared/src/schemas/categories.ts`; `packages/db/src/seeds/data.ts`; `apps/mobile/src/ui/tokens.ts`; seletores Web | Categorias hepáticas próprias continuam ausentes. Registrar só na fase autorizada, em paridade e com gates de ativação. Sem alteração de banco nesta fase. |
| Android | `apps/mobile/app/generate.tsx`; `apps/mobile/src/features/generate/CalculatorsSheet.tsx`; `apps/mobile/src/shared/schemas` | Ainda não há formulário hepático estruturado. O app já possui caminhos de revisão explícita, mas também chama `publishCleanReportToSala` na geração; auditar o comportamento por versão antes da integração. |
| iOS | Paths do crosswalk no repo Swift: `Models/Category.swift`, `Components/Sheets/CategorySheet.swift`, `Features/Generate/GenerateViewModel.swift`, `Components/Sheets/PlusSheet.swift` | Inventário documental, sem inspeção fora deste worktree. Confirmar paths e estado na fase iOS autorizada; criar DTOs e vetores JSON sem conflito de `CodingKeys`/decodificação. |
| Sala | `apps/api/src/app/api/sala/latest/route.ts`, `push/route.ts`; `apps/api/src/server/sala/reportContract.ts` | `latest` lê `reports` e já cruza revisão com `content_revision`, retornando pending/reviewed. `push` apenas reordena por timestamp; não constitui revisão. Nenhuma mudança feita. |

O crosswalk permanece evidência histórica. A afirmação ampla de ausência de travessia Web → Sala deve ser restringida ao bloco hepático legado: o checkout já possui fluxo clínico Web via `clinical-reports/v1` e revisão por versão para outros modelos. Isso não prova transporte hepático nem funcionamento em produção. Nenhuma configuração de produção foi consultada.

## Próximas fases e critérios de saída

Fase 2: revisão clínica deste candidato, identificação dos equipamentos/protocolos e fontes aprovadas, sondagem da elastografia independente e definição de mínimos por método. Decidir composição parcial multiparamétrica, quais métricas são obrigatórias e como registrar qualidade manual. Se forem aprovadas sugestões clínicas, implementar regras por método/equipamento/etiologia com fonte/versionamento e testes de fronteira; não transportar tabelas do concorrente como diretriz.

Fase 3: adapter do painel Web para o contrato aprovado, estados de pendência por módulo e renderer compartilhado. Acrescentar validação do contrato no servidor e persistência/reabertura versionadas. Migração do legado deve manter medidas/unidades e marcar campos não conhecidos como pendentes, sem reinterpretar medidas. Validar edição, exclusão, alteração de método e qualidade, discordância e mudança durante revisão. Sem ativação de categorias próprias nessa fase até autorização explícita.

Fase 4: modelos iOS/Android com os mesmos vetores de contrato, controles compactos e preenchimento por ditado como sugestão. Confirmar método, unidade, aquisição, qualidade e interpretação. Provar equivalência JSON e limpeza em cada consumidor, inclusive reabertura e edição simultânea. Categorias próprias somente após revisão do protocolo e paridade acordada.

Fase 5: transporte hepático por `reportId` para a Sala, vinculando contrato e texto persistido à mesma revisão. Usar o mecanismo de revisão já existente, validar autenticação/ownership e rejeitar revisão antiga após qualquer edição. Exigir teste ponta a ponta Web/iOS/Android → persistência → confirmação médica → Sala antes de ativação. A Sala só pode mostrar pronto para copiar quando a revisão médica corresponder ao conteúdo atual. Nada dessa fase foi implementado ou testado aqui.

Elastografia esplênica, comparação longitudinal, aquisição direta de equipamentos e conversões permanecem fora do escopo. Aprovação deste candidato não substitui validação de aquisição em hardware ou aprovação de limiares clínicos.

## Validação reproduzível

`pnpm validate:hepatic-contract` executa testes sintéticos do contrato: drafts e versões inválidas, mínimos ausentes, aplicabilidade de qualidade, unidades nativas, métodos de gordura separados, interpretação sugerida/confirmada, fontes duplicadas, proveniência inválida, limpeza atômica obrigatória, preservação do módulo independente, discordância e reuso abdominal. `pnpm --filter @laudousg/shared typecheck` verifica o pacote compartilhado. O teste existente `tsx apps/web/tests/liverQuantification.manual.ts` verifica a regressão do bloco Web legado.

Não é validação de produção, persistência real, aplicativos compilados ou equipamento. Nenhum dado sintético autoriza thresholds de uso clínico. CodeRabbit NÃO EXECUTADO.

Resultado local desta fase: 23/23 testes do contrato hepático, 21/21 testes do bloco Web legado e typecheck do pacote compartilhado aprovados. O cenário adicional injeta m/s convertido residual após apagar kPa e verifica que o envelope é recusado. `git diff --check` sem problemas. Nenhuma suíte ampla ou build de aplicativo foi executado.
