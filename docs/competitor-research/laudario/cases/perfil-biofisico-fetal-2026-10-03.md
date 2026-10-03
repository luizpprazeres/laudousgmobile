# Laudário — Perfil biofísico fetal

Observado em 03/10/2026 com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T14:20:00-03:00
exam: Perfil biofísico fetal
surface: Laudos > Ultrassonografia > Obstetrícia > Perfil Biofísico Fetal
baseline:
  controls: cardiotocografia não avaliada; movimentos respiratórios presentes; tônus presente; movimentos presentes; líquido adequado; sem ILA
  report_structure: técnica; cinco componentes com nota; opinião com total e denominador ajustado
scenarios:
  - id: perfil_completo_normal
    input: cardiotocografia sintética reativa; demais quatro componentes normais
    cascades: cardiotocografia recebeu nota 2 e o denominador passou de 8 para 10
    output: conclusão de 10/10 dentro da normalidade
    reset_verified: true
  - id: movimentos_respiratorios_ausentes
    input: cardiotocografia reativa e movimentos respiratórios ausentes; demais componentes normais
    cascades: movimentos respiratórios receberam nota 0; os demais mantiveram nota 2
    output: conclusão de 8/10 ainda classificada dentro da normalidade
    reset_verified: true
  - id: liquido_reduzido_sem_ctg
    input: cardiotocografia não avaliada; ausência de bolsão adequado; ILA sintético de 3,5 cm
    cascades: líquido recebeu nota 0; total calculado em 6/8; foram sugeridos cardiotocografia complementar e acompanhamento seriado
    output: conclusão de 6/8 com redução do líquido; recomendações permaneceram fora do laudo porque a inclusão global não foi ativada
    reset_verified: true
evidence:
  observed: componentes, notas, denominador, conclusão, sugestões e restauração foram vistos na interface normal do navegador
  inferred: o concorrente armazena estado não avaliado como nota zero na seção, mas o exclui do denominador; isso exige tipagem explícita para não confundir ausência de avaliação com achado alterado
crosswalk:
  laudousg_paths_checked:
    - packages/db/src/seeds/data.ts
    - packages/shared/src/categoryPresentation.ts
    - apps/api/src/server/renderer/categories
    - apps/api/src/server/pipeline/categoryNormalization.ts
    - apps/api/src/server/prompts/contracts/OBSTETRICA.ts
    - apps/web/src/lib/writerCategories.ts
    - apps/web/src/components/laudar/categoryGroups.ts
    - apps/mobile/src/ui/tokens.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
  status: confirmed_gap
  notes: não existe categoria, contrato, renderer, catálogo ou apresentação própria; os componentes existem de forma parcial e desconectada nos exames obstétricos, sem escore PBF
next_probe: validar com Luiz a redação normal, o comportamento do escore sem cardiotocografia e as recomendações antes de criar um contrato dormente compartilhado
```

## Estrutura observada

O exame possui quatro componentes ultrassonográficos e cardiotocografia opcional. Cada item recebe 0 ou 2 pontos. Quando a cardiotocografia não é avaliada, o texto ainda mostra nota zero, mas a conclusão usa denominador 8. Quando ela é reativa, o denominador passa a 10.

Essa diferença não pode ser representada apenas por um número. O LaudoUSG precisa guardar, para cada componente, `não avaliado`, `normal` ou `alterado`, além da pontuação derivada. O denominador deve vir dos componentes realmente avaliados.

## Componente alterado

Ausência de movimentos respiratórios reduziu o total para 8/10. O concorrente manteve classificação normal. O comportamento confirma que o escore e a descrição dos componentes precisam coexistir: o número isolado não informa qual parâmetro foi alterado.

O LaudoUSG deve renderizar cada componente confirmado e manter a interpretação como camada separada, dependente da regra clínica versionada. A interface não deve concluir normalidade se houver dados incompletos ou combinações fora do conjunto validado.

## Líquido reduzido e recomendações

Com cardiotocografia não avaliada, ausência de bolsão adequado e ILA de 3,5 cm, o sistema calculou 6/8 e destacou a redução do líquido. Também sugeriu cardiotocografia complementar e acompanhamento ultrassonográfico seriado. As sugestões só entrariam no texto após ativação do bloco de recomendações.

A separação entre sugestão e publicação é útil. No LaudoUSG, medida, critério de adequação, pontuação, interpretação e recomendação devem permanecer campos distintos. ILA e maior bolsão não podem ser confundidos nem convertidos silenciosamente.

## Restauração

A cardiotocografia voltou a não avaliada, os movimentos respiratórios retornaram a presentes, o líquido voltou a adequado, o ILA foi apagado e as recomendações automáticas foram retiradas. O editor retornou ao perfil 8/8 basal.

O cruzamento técnico está em [crosswalk-perfil-biofisico-fetal-2026-10-03.md](../crosswalk-perfil-biofisico-fetal-2026-10-03.md).
