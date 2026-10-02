# Laudário — Doppler Hepático

Observado em 02/10/2026, com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial ao final. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-02T11:32:40-03:00
exam: Doppler Hepático
surface: Laudos > Ultrassonografia > Vascular > Doppler Hepático
baseline:
  controls: veia porta e tributárias, veias hepáticas e cava preselecionadas como normais; artéria hepática, transplante e TIPS fora do laudo
  report_structure: técnica; análise vascular; opinião
scenarios:
  - id: estado_inicial
    input: nenhuma medida ou confirmação sintética
    cascades: laudo normal completo surge a partir dos padrões preselecionados
    output: perviedade e hemodinâmica normais nos vasos incluídos
    reset_verified: true
  - id: trombose_portal_parcial
    input: trombose parcial selecionada, caráter benigno e extensão padrão no ramo direito
    cascades: descrição, conclusão e quatro recomendações aparecem imediatamente
    output: trombose venosa portal parcial e estruturas restantes normais
    reset_verified: true
  - id: tips_velocidade_reduzida
    input: TIPS ativado; velocidades sintéticas de 70, 80 e 75 cm/s
    cascades: máximo de 80 cm/s derivado; classificação baixa, conclusão de disfunção e recomendações geradas automaticamente
    output: suspeita de estenose ou trombose parcial do TIPS
    reset_verified: true
evidence:
  ids: [baseline, portal-partial, tips-empty, tips-low, tips-cleared]
  observed: controles, medidas derivadas, frases, conclusões e recomendações vistos na interface normal do navegador
  inferred: a aplicabilidade dos limiares e recomendações depende de técnica, contexto e fonte; não foi validada clinicamente
crosswalk:
  monorepo_sha: e7e8d8dcba86a18ed2c1d70e8afa15af1817e21e
  ios_repo_sha: dee579c18e04c4c3442d4f29f283183330327070
  laudousg_paths_checked:
    - packages/shared/src/clinicalModels/contracts.ts
    - packages/shared/src/clinicalModels/renderer.ts
    - packages/shared/src/clinicalModels/defaults.ts
    - apps/web/src/components/laudar/ClinicalModelWorkspace.tsx
    - apps/mobile/src/features/generate/ClinicalModelWorkspace.tsx
    - apps/api/src/server/renderer/categories/CLINICAL_MODELS_V1.ts
    - apps/api/src/server/clinicalReports/fallbackPolicy.ts
    - apps/api/src/server/clinicalReports/service.ts
    - apps/api/src/app/sala/[token]/page.tsx
    - packages/db/src/seeds/data.ts
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/PendingClinicalModelContracts.swift
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/ClinicalModelReportRenderer.swift
  status: complete_with_limits
  notes: LaudoUSG possui Abdome total com Doppler e contrato portal básico ainda oculto; exame hepático independente, transplante e TIPS são lacunas confirmadas
next_probe: revisar os gaps no checkout e definir o contrato vascular hepático compartilhado sem importar limiares automaticamente
```

## Estrutura do modelo

O exame separa Técnica, Indicação, Artéria Hepática, Veia Porta, Tributárias da Porta, Veias Hepáticas, Veia Cava Inferior, Transplante Hepático, TIPS, Comparativos e Recomendações. A veia porta é sempre incluída; a artéria hepática é opcional. Transplante e TIPS são módulos adicionais ativados por chave própria.

O estado inicial já afirma sonda convexa, jejum adequado, boa janela, perviedade e padrões hemodinâmicos normais. Como esses fatos aparecem sem confirmação explícita do procedimento realizado, o LaudoUSG não deve transportar os padrões como evidência clínica.

## Rastro desidentificado da observação

- `baseline`: sem medidas, o editor exibiu análise vascular e opinião normais para os vasos incluídos.
- `portal-partial`: a seleção de trombose parcial acrescentou descrição, conclusão e quatro recomendações; o retorno para perviedade normal retirou essas dependências.
- `tips-empty`: a simples ativação do módulo acrescentou perviedade, velocidade normal e descompressão adequada sem medidas.
- `tips-low`: 70, 80 e 75 cm/s produziram máximo derivado de 80 cm/s, classificação baixa, conclusão e recomendações.
- `tips-cleared`: após apagar as medidas, a classificação permaneceu; após correção manual, desativação e troca de aba, o texto retornou ao estado inicial.

Esse rastro é uma transcrição curta dos estados visíveis, sem URL autenticada, cookies, dados de conta ou paciente. Não houve captura persistida nesta rodada.

## Cenário 1 — estado inicial

Sem medidas, o documento descreveu veia porta, veia esplênica, artéria esplênica, veia mesentérica superior, veias hepáticas e cava como normais. A artéria hepática não apareceu porque estava marcada como não citar. O documento concluiu normalidade global.

O ponto útil é a composição por vasos avaliados. O ponto de risco é presumir que todos os vasos padrão foram realmente examinados e que jejum, janela e técnica estavam adequados.

## Cenário 2 — trombose portal parcial

Ao selecionar trombose parcial, o formulário abriu caráter do trombo e extensão. Os valores padrão foram caráter sem vascularização interna e extensão limitada ao ramo direito. Sem outra confirmação, o laudo passou a descrever trombose benigna parcial, concluiu trombose portal e acrescentou recomendações de métodos complementares, especialista e investigação de fatores pró-coagulantes.

O contrato precisa separar achado morfológico, vascularização interna, extensão, direção/velocidade do fluxo e confirmação médica. Recomendações podem ser sugeridas fora do texto, mas não devem entrar automaticamente no laudo revisado.

Após retornar a perviedade da veia porta para normal, a conclusão e as recomendações desapareceram e o documento inicial foi restaurado.

## Cenário 3 — TIPS com velocidade reduzida

Ativar TIPS sem preencher qualquer velocidade já inseriu no laudo que o shunt estava pérvio, com velocidade normal e descompressão portal adequada. Depois foram informadas velocidades sintéticas de 70, 80 e 75 cm/s. O sistema calculou máximo de 80 cm/s, mudou a classificação para baixa e passou a concluir suspeita de estenose ou trombose parcial, com recomendações de seguimento e avaliação intervencionista.

Ao apagar as três medidas, os campos ficaram vazios, mas a classificação baixa e sua conclusão permaneceram até a opção normal ser selecionada manualmente. Desativar o módulo não atualizou imediatamente o texto; a retirada ocorreu após trocar de aba. O reset final foi conferido com TIPS desativado, medidas vazias e laudo inicial sem o módulo.

Esses comportamentos reforçam dois gates: ativar um módulo não pode criar normalidade sem dados, e apagar a fonte precisa remover derivações, classificação e recomendações no mesmo estado atômico.

## Outros módulos inventariados

A artéria hepática oferece perviedade, velocidades, índice de resistência, estenose, alta resistência, tardus-parvus e variantes. O transplante inclui tempo pós-operatório, enxerto ao modo B, coleções, anastomoses arterial/portal/venosa, perfusão e medidas. Esses módulos foram apenas inventariados; nenhum cenário funcional foi executado neles.

## Requisitos extraídos

O contrato vascular hepático deve modelar cada vaso como avaliado, limitado, não avaliado ou não realizável. Medidas, direção, padrão e perviedade precisam manter origem e unidade. Portal, arterial, veias hepáticas, transplante e TIPS devem ser módulos separados que possam compor Abdome com Doppler ou o exame independente.

Derivações e classificações precisam declarar fonte e versão. Qualquer conclusão de hipertensão portal, trombose, estenose, disfunção de TIPS ou complicação de transplante exige critérios completos e confirmação médica. Recomendações permanecem sugestões até confirmação explícita.

## Próxima etapa

Cruzar esse inventário com o contrato existente de Abdome total com Doppler, identificar o que já é compartilhável e separar expansão de variedade de regras clínicas ainda não aprovadas.
