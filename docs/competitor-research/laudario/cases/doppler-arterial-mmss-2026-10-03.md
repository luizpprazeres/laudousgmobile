# Laudário — Doppler Arterial de Membro Superior

Observado em 03/10/2026, com achados exclusivamente sintéticos. O modelo foi restaurado ao estado normal. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T12:09:24-03:00
exam: Doppler Arterial de Membro Superior
surface: Laudos > Ultrassonografia > Vascular > Doppler Arterial de Membro Superior
baseline:
  controls: unilateral direito; subclávia, axilar, braquial, radial, ulnar e arcos palmares preselecionados como normais; revascularização ausente
  report_structure: técnica; análise por vaso; opinião
scenarios:
  - id: estenose_subclavia_grave
    input: VPS pré-lesão de 80 cm/s; VPS pós-lesão de 240 cm/s; sinais diretos mantidos
    cascades: razão de velocidades calculada automaticamente como 3,0; frase normal da subclávia substituída; conclusão positiva inserida
    output: corpo preservou as duas velocidades e a razão, mas classificou apenas a faixa ampla de estenose igual ou superior a 50%
    reset_verified: true
  - id: oclusao_subclavia_cronica
    input: oclusão aterotrombótica crônica; colaterais mantidas
    cascades: frase normal da subclávia substituída; conclusão de oclusão crônica inserida
    output: corpo descreveu fluxo colateral lento e monofásico, enquanto os vasos distais permaneceram descritos como trifásicos e normais
    reset_verified: true
  - id: tardus_parvus_subclavio
    input: alteração hemodinâmica distal com padrão tardus-parvus
    cascades: frase normal da subclávia substituída; conclusão atribuiu lesão obstrutiva significativa a segmento proximal
    output: padrão foi descrito na própria subclávia e inferido como consequência de lesão ainda mais proximal, sem campo estruturado para localizar a causa
    reset_verified: true
additional_probe:
  thoracic_outlet: existe como indicação, mas não abriu campos de manobras, posições ou resultado; nenhuma aba específica foi encontrada
evidence:
  observed: controles, cálculo derivado, texto, opinião, inventário de abas e restauração foram vistos na interface normal
  inferred: a conclusão usa regras por opção selecionada; não foi demonstrada validação clínica da coerência entre vaso alterado e padrão distal
crosswalk:
  laudousg_paths_checked:
    - packages/shared/src/clinicalModels/contracts.ts
    - packages/shared/src/clinicalModels/renderer.ts
    - packages/shared/src/clinicalModels/__tests__/contracts.manual.ts
    - apps/web/src/components/laudar/ClinicalModelWorkspace.tsx
    - apps/mobile/src/features/generate/ClinicalModelWorkspace.tsx
    - LaudoUSG/Models/PendingClinicalModelContracts.swift
    - LaudoUSG/Models/ClinicalModelReportRenderer.swift
    - LaudoUSG/Features/ClinicalModels/ClinicalModelWorkspace.swift
  status: partial
  notes: o LaudoUSG já protege bilateralidade, padrão distal, percentual confirmado e desfiladeiro; faltam pré e pós-lesão e há diferença de formulário entre iOS, Web e Android
next_probe: estudar Ultrassonografia de Tórax e manter o modelo arterial dormente até fechar paridade de velocidades e coerência distal
```

## Estrutura observada

O formulário separa lateralidade, subclávia, axilar, braquial, radial, ulnar, arcos palmares, comparativos, achados adicionais e recomendações. Cada vaso oferece opções para normalidade, estenose, oclusão, alterações hemodinâmicas, aneurisma, pseudoaneurisma, fístula, trauma e revascularização. A profundidade varia conforme o vaso.

O estado inicial direito descreve os seis territórios como pérvios, sem lesões parietais relevantes e com padrão trifásico. A lateralidade bilateral não foi testada nesta rodada.

## Estenose subclávia

O cenário sintético demonstrou dois campos distintos de velocidade, antes e depois da lesão. Ao preencher 80 e 240 cm/s, a interface calculou a razão 3,0 e levou os três valores ao corpo do laudo. A conclusão permaneceu na categoria ampla de estenose grave, sem transformar automaticamente a razão em percentual mais específico.

Esse comportamento separa medida objetiva de classificação, mas não mostrou um bloqueio quando as velocidades estavam vazias: a seleção isolada já produziu corpo e conclusão com lacunas visíveis. No LaudoUSG, a alteração arterial exige vaso e ao menos uma VPS; ainda falta representar formalmente o par pré/pós-lesão e a razão derivada.

## Oclusão e coerência distal

Ao selecionar oclusão crônica da subclávia com colaterais, o corpo descreveu circulação colateral com fluxo lento e monofásico. Ao mesmo tempo, axilar, braquial, radial, ulnar e arcos palmares permaneceram com o texto normal de fluxo trifásico. A conclusão mencionou apenas a oclusão subclávia.

Isso é uma inconsistência observada no resultado do concorrente. O LaudoUSG já exige descrição de padrão, amortecimento ou reenchimento distal para estenose e oclusão, mas esse campo é livre. Ainda não há validação que impeça uma descrição distal incompatível com a alteração proximal.

## Padrão tardus-parvus

A opção de alteração distal substituiu a frase normal da subclávia por um padrão amortecido, lentificado e monofásico. A conclusão inferiu obstrução hemodinamicamente significativa em segmento proximal. O formulário não apresentou campo estruturado para localizar ou confirmar essa causa proximal.

No LaudoUSG, o padrão distal é obrigatório quando há estenose ou oclusão, mas não é tipado por vaso, morfologia do espectro, reenchimento ou relação anatômica. A decisão clínica já aprovada está protegida no nível mínimo; a próxima revisão deve decidir se essa granularidade precisa virar contrato ou apenas orientação de preenchimento.

## Desfiladeiro torácico

“Síndrome do desfiladeiro torácico” aparece na lista de indicações. Selecioná-la acrescentou a indicação ao texto, sem criar campos para manobras, posição do membro, comparação entre repouso e provocação ou resultado. Também não foi encontrada aba específica no modelo visível.

O LaudoUSG já possui um módulo próprio com manobras, posições, resultado e confirmação médica. Nesse ponto, o nosso contrato está funcionalmente à frente do concorrente estudado.

## Restauração

A indicação voltou para “não citar”, a subclávia retornou ao estado normal e o texto inicial reapareceu. O rascunho não foi finalizado nem enviado.

O cruzamento técnico está em [crosswalk-doppler-arterial-mmss-2026-10-03.md](../crosswalk-doppler-arterial-mmss-2026-10-03.md).
