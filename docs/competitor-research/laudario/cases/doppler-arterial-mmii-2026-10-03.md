# Laudário — Doppler Arterial de Membro Inferior

Observado em 03/10/2026, com achados exclusivamente sintéticos. O modelo foi restaurado ao estado normal. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T14:46:00-03:00
exam: Doppler Arterial de Membro Inferior
surface: Laudos > Ultrassonografia > Vascular > Doppler Arterial de Membro Inferior
baseline:
  controls: unilateral direito; artérias femoral comum, femoral superficial, femoral profunda, poplítea, tronco tibiofibular, tibiais e fibular preselecionadas sem alterações significativas; revascularização ausente
  report_structure: técnica; análise sequencial por vaso; opinião
scenarios:
  - id: estenose_femoral_superficial
    input: estenose grave; VPS de referência de 90 cm/s; VPS na lesão de 360 cm/s
    cascades: razão de velocidades calculada automaticamente como 4,0; frase normal da femoral superficial substituída; conclusão positiva inserida
    output: corpo preservou as duas velocidades e a razão, mas classificou a estenose na faixa de 50 a 75 por cento
    reset_verified: true
  - id: aneurisma_popliteo
    input: aneurisma verdadeiro; diâmetros anteroposterior de 2,5 cm e transversal de 2,8 cm; luz efetiva de 1,6 cm; trombo mural
    cascades: frase normal da poplítea substituída; dimensões e trombo levados ao corpo; conclusão positiva inserida
    output: corpo preservou as três medidas e o trombo mural; a conclusão identificou aneurisma da artéria poplítea sem repetir toda a mensuração
    reset_verified: true
  - id: oclusao_tibial_anterior
    input: oclusão aterotrombótica crônica; circulação colateral com fluxo lento e monofásico
    cascades: frase normal da tibial anterior substituída; conclusão de oclusão crônica inserida
    output: corpo preservou redução de calibre, ausência de fluxo no segmento e padrão colateral; conclusão identificou a artéria e a natureza crônica selecionada
    reset_verified: true
additional_inventory:
  revascularization: campos visíveis para stent e bypass, incluindo território, material, perviedade e complicações
  accessibility: mais de uma aba vascular expôs aria-selected=true ao mesmo tempo, apesar de apenas uma seção estar visualmente ativa
evidence:
  observed: controles, cálculos derivados, alterações no corpo e na conclusão, inventário de abas e restauração foram vistos na interface normal
  inferred: as faixas de estenose são dirigidas pela opção selecionada e não foram demonstrados bloqueios que reconciliem a razão calculada com a classificação escolhida
crosswalk:
  laudousg_paths_checked:
    - packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md
    - packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/regra/itb-calculo.md
    - packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/conclusao/exame-normal.md
    - packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/conclusao/daop-claudicacao.md
    - packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/conclusao/oclusao-sem-clti.md
    - apps/web/src/lib/writerCategories.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - packages/shared/src/categoryPresentation.ts
    - LaudoUSG/Models/Category.swift
  status: confirmed_gap
  notes: o LaudoUSG oferece a categoria e conhecimento clínico para geração por writer, mas não possui contrato e formulário determinísticos por vaso para este exame nos três clientes
next_probe: submeter à revisão clínica um contrato próprio com segmentos, medidas pré e na lesão, razão derivada, aneurisma, ITB e revascularização antes de implementar
```

## Estrutura observada

O formulário organiza lateralidade, artéria femoral comum, femoral superficial, femoral profunda, poplítea, tronco tibiofibular, tibial posterior, tibial anterior e fibular. Há ainda áreas para comparação, achados adicionais e recomendações. As opções cobrem normalidade, estenose, oclusão, alterações hemodinâmicas, aneurisma e intervenções prévias, com profundidade diferente conforme o território.

O estado inicial direito descreve os segmentos como pérvios e sem alterações hemodinamicamente relevantes. O modelo também oferece um inventário amplo para stent e bypass. A lateralidade bilateral e as intervenções não foram manipuladas nesta rodada para respeitar o limite de três cenários.

## Estenose femoral superficial

No cenário sintético, o preenchimento de 90 cm/s como velocidade de referência e 360 cm/s na lesão gerou automaticamente razão 4,0. O corpo manteve medidas e razão. A classificação exibida permaneceu na faixa selecionada de 50 a 75%, apesar de a própria razão alcançar 4,0.

Isso demonstra boa preservação dos dados objetivos, mas também uma possível divergência entre cálculo derivado e rótulo escolhido. Um contrato do LaudoUSG deve tratar a razão como cálculo automático, validar a coerência da classificação e ainda exigir confirmação médica antes de publicar percentual ou faixa.

## Aneurisma poplíteo

O cenário preservou os diâmetros anteroposterior e transversal, a medida da luz efetiva e a presença de trombo mural. A conclusão resumiu o diagnóstico sem duplicar todas as medidas.

O LaudoUSG não tem atualmente campos estruturados para aneurisma nessa categoria. A geração livre pode redigir o achado a partir do ditado, mas não garante que todas as dimensões, a luz efetiva e o trombo sejam preservados como fatos tipados e auditáveis.

## Oclusão tibial anterior

A seleção de oclusão aterotrombótica crônica substituiu apenas o bloco da tibial anterior e manteve os demais territórios no estado inicial. O corpo registrou redução de calibre, ausência de fluxo e circulação colateral com padrão lento e monofásico; a conclusão identificou território e cronicidade.

No LaudoUSG, a base de conhecimento já diferencia achado hemodinâmico de diagnóstico clínico e proíbe inferir isquemia crônica ameaçadora do membro sem sintomas documentados. Essa proteção conceitual é superior ao simples encadeamento de uma opção para uma conclusão, mas hoje depende da obediência do writer, sem contrato que preserve território, mecanismo, cronicidade confirmada e padrão distal.

## Revascularização

O inventário visível inclui stent e bypass, com campos para território, tipo ou material, perviedade e complicações. Como esses controles não foram alterados, a rodada confirma a presença da superfície, mas não o comportamento completo do texto.

No LaudoUSG, revascularização não está estruturada para Doppler arterial de membros inferiores. Ela deve ser decidida junto com o contrato clínico, pois um enxerto ou stent exige segmentos de origem e destino, material, perviedade, velocidades e complicações próprias.

## Problema de acessibilidade

Durante a navegação, várias abas vasculares expuseram `aria-selected=true` simultaneamente, embora apenas uma seção estivesse ativa na tela. O defeito não impediu o preenchimento por clique, mas prejudica leitores de tela e automação semântica.

## Restauração

A tibial anterior retornou ao estado sem alterações significativas e a opinião normal reapareceu. O rascunho não foi finalizado nem enviado.

O cruzamento técnico está em [crosswalk-doppler-arterial-mmii-2026-10-03.md](../crosswalk-doppler-arterial-mmii-2026-10-03.md).
