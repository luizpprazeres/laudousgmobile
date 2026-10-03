# Cruzamento Laudário × LaudoUSG — Ecocardiografia fetal

Data: 03/10/2026. O concorrente foi observado com casos sintéticos e restaurado ao final. O LaudoUSG foi buscado no monorepo e no cliente iOS.

## Resultado

Ecocardiografia fetal é um gap confirmado nas três plataformas. O LaudoUSG menciona o exame em recomendações produzidas por categorias obstétricas, mas não possui categoria selecionável, contrato clínico, renderer, normalizador, apresentação compartilhada, seed do banco, asset ou fluxo próprio.

| Camada | Estado atual |
| --- | --- |
| Web | categoria ausente |
| Android/RN | categoria ausente |
| iOS | categoria ausente |
| API | contrato, renderer e auditor específico ausentes |
| Banco | código de categoria ausente no seed atual |
| Sala | consegue exibir texto genérico, sem identidade clínica própria |
| Produção | nenhuma ativação proposta neste lote |

## O que o estudo funcional acrescentou

O formulário observado cobre anatomia sequencial e função, e não apenas uma lista de cardiopatias. A CIV muscular mostrou uma dependência correta entre alteração e retirada da normalidade incompatível. As extrassístoles revelaram um risco de defaults clínicos: origem, condução e frequência do evento foram publicadas a partir de opções preselecionadas. A limitação significativa foi reconhecida, mas não reduziu o escopo de normalidade estrutura por estrutura.

Esses comportamentos definem três regras para o LaudoUSG: fatos alterados invalidam normalidades incompatíveis; defaults de interface nunca viram fatos sem confirmação; limitações precisam indicar o escopo anatômico afetado.

## Categoria e contrato propostos

O código candidato é `ECOCARDIOGRAFIA_FETAL`, sujeito à aprovação antes de entrar nos clientes ou no banco. A variante gemelar deve reutilizar o mesmo contrato com identificação por feto, sem duplicar o núcleo clínico.

O contrato mínimo deve conter técnica e limitações por bloco; idade gestacional e identificação fetal; situs e posição; ritmo e condução; conexões venosas e atrioventriculares; septos; câmaras; valvas; conexões ventriculoarteriais; grandes vasos e arcos; função; derrame; medidas com unidade e origem; conclusão médica; recomendações opt-in. Cada bloco precisa distinguir `não avaliado`, `avaliação parcial`, `avaliado normal` e `alterado`.

Medidas e escores não devem classificar automaticamente sem idade gestacional, técnica, referência versionada e campos de origem completos. Cardiopatias complexas devem ser composições de fatos estruturados confirmados pelo médico, não macros que inventam o restante do fenótipo.

## Primeira versão segura

A primeira entrega deve começar dormente, com modelo normal original no estilo Domingos e três famílias alteradas de alto valor: defeitos septais, arritmias e limitações. O writer pode ajudar na prosa, mas o transporte precisa ser tipado e a auditoria deve bloquear contradições entre normalidade, alteração, lateralidade, medida e escopo avaliado.

Antes da ativação, faltam revisão clínica do modelo normal, definição das alterações prioritárias, fontes oficiais para medidas e escores, goldens sintéticos e prova de paridade Web/iOS/Android/Sala. Este lote documenta a lacuna; não cria categoria clínica silenciosamente.

O caso funcional está em [cases/ecocardiografia-fetal-2026-10-03.md](cases/ecocardiografia-fetal-2026-10-03.md).
