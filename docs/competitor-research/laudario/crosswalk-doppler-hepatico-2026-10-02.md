# Cruzamento Laudário × LaudoUSG — Doppler Hepático

Data: 02/10/2026. O concorrente foi observado com dados sintéticos e restaurado ao final. O LaudoUSG foi avaliado por leitura de código; arquivos de teste focados foram localizados e apenas as execuções descritas na seção 8 contam como prova desta rodada. Nenhum dado clínico real foi usado.

## Síntese

O LaudoUSG já possui um contrato compartilhado de Abdome total com Doppler, com veia porta obrigatória, vasos opcionais e gate explícito para hipertensão ou trombose portal no fluxo clínico v1. A estrutura existe em Web, Android e iOS, mas continua oculta nas três plataformas por mecanismos diferentes. O fluxo legado `/api/generate` ainda permite fallback ao writer nessa categoria e precisa ser fechado antes da ativação.

Ainda não existe um exame independente de Doppler Hepático. O contrato atual descreve calibre, velocidade e direção do fluxo, mas não modela padrões espectrais, índices, colaterais, tributárias detalhadas, Budd-Chiari, transplante ou TIPS.

| Capacidade | Web | Android/RN | iOS |
| --- | --- | --- | --- |
| Abdome total com Doppler | Implementado sob flag desligada por padrão | Implementado, com flag interna desligada | Contrato e UI implementados, categoria oculta |
| Doppler Hepático independente | Ausente | Ausente | Ausente |
| Portal básico | Presente | Presente | Presente |
| Transplante hepático | Ausente | Ausente | Ausente |
| TIPS | Ausente | Ausente | Ausente |

## 1. Contrato atual reutilizável

`AbdomenTotalDopplerSchema` exige calibre, velocidade e direção da veia porta. Veias hepáticas, veia esplênica, veia mesentérica superior e artéria hepática comum aparecem somente quando marcadas como avaliadas. Alteração portal aceita hipertensão, trombose ou outra, mas exige critérios descritos e confirmação médica.

Esse núcleo está alinhado às decisões já aprovadas: veia porta obrigatória, demais vasos conforme avaliados, artéria hepática opcional e conclusão portal somente com critérios completos.

Há uma lacuna no estado sem alteração: o renderer conclui normalidade quando `portalPathology.status` permanece como ausente, sem comparar calibre ou velocidade com referências. Assim, números que mereceriam revisão clínica podem coexistir com a frase de parâmetros sem alterações. Enquanto não houver referências aprovadas, o renderer não deve inferir normalidade a partir dos números; a conclusão normal exige confirmação médica explícita de coerência. Faixas versionadas poderão produzir bloqueios objetivos depois de aprovadas.

**Reuso recomendado:** transformar o conjunto vascular em módulo compartilhado, sem duplicar o texto abdominal. Abdome total com Doppler usa o módulo dentro do exame abdominal; Doppler Hepático usa o mesmo módulo como exame principal e habilita extensões específicas.

## 2. Lacunas do portal e tributárias

O contrato atual não distingue tronco e ramos portais, perviedade, trombo parcial/completo, transformação cavernomatosa, extensão, vascularização interna do trombo, fasicidade, índice de congestão ou colaterais específicas. Veia esplênica e mesentérica possuem apenas o mesmo trio calibre/velocidade/fluxo.

**Requisito:** cada vaso precisa declarar se foi avaliado, qualidade, perviedade, direção, padrão, medidas e limitações. O módulo de trombose deve conservar caráter e extensão como achados, deixando a natureza tumoral ou benigna dependente de critérios e confirmação.

## 3. Artéria hepática e veias hepáticas

Hoje a artéria hepática comum aceita somente calibre, velocidade e fluxo. Não há VPS/velocidade diastólica separadas, índice de resistência, tempo de aceleração, tardus-parvus, estenose focal ou variante anatômica. As veias hepáticas não distinguem fasicidade, reversão, estenose ou ausência de fluxo.

**Requisito:** ampliar os módulos sem inserir limiares universais. Medidas e padrões entram como dados; qualquer classificação de estenose, alta resistência ou obstrução precisa apontar regra versionada e receber confirmação médica.

## 4. Transplante e TIPS

Não há contrato para enxerto, anastomoses, perfusão, coleções, TIPS ou comparação com estudo anterior. No concorrente, ativar TIPS sem medidas já produziu normalidade. Com velocidades reduzidas, o sistema classificou e recomendou automaticamente; ao apagar as medidas, a classificação antiga permaneceu até correção manual.

**Requisito de segurança:** transplante e TIPS são módulos independentes, desligados por padrão. Ativação sem dados gera pendência, nunca normalidade. Apagar qualquer velocidade deve retirar no mesmo estado todas as derivações, classificações e recomendações dependentes. Comparação exige exame anterior identificado, mesma topografia e compatibilidade técnica.

## 5. Recomendações e confirmação médica

O concorrente acrescentou recomendações extensas assim que trombose portal ou TIPS alterado foram selecionados. No LaudoUSG, a confirmação da conclusão portal está garantida no fluxo clínico v1; o contrato ainda não separa sugestão de recomendação confirmada, e o fallback legado não é fail-closed para esta categoria.

**Requisito:** recomendações podem ser propostas na interface e editadas pelo médico. Somente texto confirmado e vinculado à revisão atual entra no laudo. Mudança de achado, medida ou classificação invalida a confirmação.

## 6. Paridade e ativação

A Web expõe os novos modelos apenas quando `NEXT_PUBLIC_CLINICAL_MODELS_V1=true`. No Android, `APPROVED_CLINICAL_MODELS_ENABLED` está desligado. O iOS contém DTO, validação, renderer e interface, mas `isPendingClinicalActivation` remove a categoria da seleção de novos exames. O seed do backend marca `ABDOMEN_TOTAL_DOPPLER` como ativo, sem migration específica localizada; isso não comprova o estado do banco de produção. A API também exige ativação conjunta do grupo de cinco modelos.

O Android ainda contém metadados antigos que citam ramos portais direito e esquerdo, enquanto o contrato ativo usa veias hepáticas. O formulário segue o contrato correto, mas essa descrição interna precisa ser alinhada. O iOS duplica contrato e renderer em Swift, aumentando o risco de deriva.

**Lacuna confirmada:** implementação não equivale a disponibilidade simultânea. A futura ativação deve usar manifest versionado e prova de compatibilidade Web/API/Android/iOS antes de liberar o seletor. `ABDOMEN_TOTAL_DOPPLER` também precisa entrar no conjunto fail-closed de `fallbackPolicy.ts`, impedindo que contrato incompleto caia no writer legado.

## 7. Persistência e Sala

O código do fluxo clínico versionado implementa persistência e revisão dos modelos compartilhados; o funcionamento com banco real e em produção não foi validado nesta rodada. Isso também não prova o exame independente nem os módulos novos. A Sala reconhece o código de Abdome com Doppler para exibição, sem compreender dados vasculares estruturados.

**Requisito:** transportar o mesmo `reportId`, versão do contrato, texto e revisão médica. A auxiliar recebe o texto revisado; dados estruturados ficam disponíveis para reabertura e auditoria do médico. O estado pronto para copiar depende da revisão corresponder ao conteúdo atual.

## 8. Testes e limites

Foram localizados arquivos de teste do contrato de Abdome total com Doppler, renderer, seleção e fluxos focados Web/Android. Nesta rodada, o teste focado compartilhado e os fluxos Web/Android já registrados passaram; o harness clínico amplo da API não chegou às asserções por problema de resolução de alias, e o build/teste iOS não foi executado. Não houve teste integrado com banco e Sala. Ainda faltam cenários de valor numérico incompatível com conclusão normal, trombose parcial/completa, extensão, padrões arteriais/venosos, TIPS, transplante, invalidação de recomendações, paridade de JSON e ponta a ponta até banco, revisão e Sala.

Os valores e cortes observados no concorrente são evidência funcional, não regra clínica aprovada para o LaudoUSG. Equipamentos físicos e configuração de produção não foram verificados.

## Ordem de implementação

Primeiro, extrair o módulo vascular portal já aprovado para um contrato compartilhado e preservar compatibilidade do Abdome total com Doppler. Depois, acrescentar perviedade, padrões e medidas sem classificação automática. Em seguida, criar extensões de artéria/veias hepáticas, transplante e TIPS com gates atômicos. A categoria independente e a ativação simultânea entram após testes de paridade e aprovação clínica das regras.

## Evidências principais no LaudoUSG

- Contrato e renderer: `packages/shared/src/clinicalModels/contracts.ts`, `defaults.ts` e `renderer.ts`.
- Web: `apps/web/src/components/laudar/ClinicalModelWorkspace.tsx`, `apps/web/src/lib/clinicalModels.ts` e `apps/web/src/components/laudar/categoryGroups.ts`.
- API e banco: `apps/api/src/server/renderer/categories/CLINICAL_MODELS_V1.ts`, `apps/api/src/server/clinicalReports/service.ts` e `packages/db/src/seeds/data.ts`.
- Android/RN: `apps/mobile/src/features/generate/ClinicalModelWorkspace.tsx` e `apps/mobile/src/ui/tokens.ts`.
- iOS, repositório irmão `laudousg-swift/LaudoUSG` no SHA `dee579c18e04c4c3442d4f29f283183330327070`: `LaudoUSG/Models/PendingClinicalModelContracts.swift`, `ClinicalModelReportRenderer.swift`, `Features/ClinicalModels/ClinicalModelWorkspace.swift` e `Models/Category.swift`.
