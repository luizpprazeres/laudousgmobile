# Laudário — Ecocardiografia fetal

Observado em 03/10/2026 com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T14:05:19-03:00
exam: Ecocardiografia fetal
surface: Laudos > Ultrassonografia > Obstetrícia > Ecocardiografia Fetal
baseline:
  controls: gestação única; técnica adequada; indicação de rotina; anatomia, ritmo, valvas, grandes vasos e derrame em estados normais; sem medidas
  report_structure: técnica; indicação; estática fetal; situs; quatro câmaras; vias de saída; três vasos/3VT; arcos; opinião; limitações gerais do método
scenarios:
  - id: civ_muscular_medida
    input: comunicação interventricular muscular sintética de 2,5 mm
    cascades: a frase de septo íntegro foi substituída por descrição localizada e medida; a conclusão passou a citar a comunicação
    output: corpo e opinião mantiveram a medida e restringiram a normalidade às demais estruturas
    reset_verified: true
  - id: extrassistoles_atriais
    input: ritmo com extrassístoles e frequência ventricular sintética de 145 bpm
    cascades: os subcampos já estavam predefinidos como origem atrial, condução ventricular e eventos isolados
    output: o corpo publicou os três qualificadores e a opinião concluiu extrassístoles atriais
    reset_verified: true
  - id: limitacao_significativa_posicao
    input: limitação técnica significativa por posição fetal desfavorável
    cascades: a técnica e a opinião foram atenuadas, mas o corpo continuou descrevendo todas as estruturas como avaliadas e normais
    output: a conclusão reconheceu menor sensibilidade sem identificar quais estruturas ficaram incompletas
    reset_verified: true
evidence:
  observed: controles, texto, conclusão e restauração foram vistos na interface normal do navegador
  inferred: defaults de subtipo de arritmia podem ser publicados sem confirmação individual; a limitação é global e não controla o escopo anatômico por estrutura
crosswalk:
  laudousg_paths_checked:
    - packages/db/src/seeds/data.ts
    - packages/shared/src/categoryPresentation.ts
    - apps/api/src/server/renderer/categories
    - apps/api/src/server/pipeline/categoryNormalization.ts
    - apps/api/src/server/asr/medicalGlossary.ts
    - apps/web/src/lib/writerCategories.ts
    - apps/web/src/components/laudar/categoryGroups.ts
    - apps/mobile/src/ui/tokens.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
  status: confirmed_gap
  notes: não existe categoria, contrato, renderer, catálogo ou apresentação específica de ecocardiografia fetal na Web, Android/RN, iOS, API ou seed do banco; menções existentes são apenas recomendações dentro de exames obstétricos
next_probe: antes de implementar, validar com Luiz o escopo mínimo, o modelo normal original, alterações prioritárias e se a primeira versão será estrutural completa ou writer guardado com contrato de fatos
```

## Estrutura observada

O exame é muito mais amplo que uma variação do obstétrico. O formulário separa técnica e qualidade, indicação, idade gestacional, feto, situs e posição, ritmo, conexões e septos, câmaras, valvas, grandes vasos, função, derrame, velocidades, escores, medidas, recomendações e modelos de cardiopatias. Há variante gemelar própria no catálogo.

Essa arquitetura confirma que o LaudoUSG não deve esconder ecocardiografia fetal dentro de `OBSTETRICA`. O exame precisa de categoria e contrato próprios, ainda que compartilhe dados maternos, idade gestacional e transporte com o módulo obstétrico.

## Comunicação interventricular

Ao selecionar uma comunicação muscular e informar 2,5 mm, o concorrente retirou a frase de septo íntegro, preservou localização e medida no corpo e acrescentou o achado à opinião. A dependência entre estado normal e alteração funcionou de forma coerente.

No LaudoUSG, o contrato deve manter tipo, localização, medida, direção do fluxo quando avaliada, repercussão e confirmação médica como campos distintos. A seleção de uma lesão deve invalidar automaticamente a normalidade incompatível, sem preencher características que não foram observadas.

## Extrassístoles

Ao trocar apenas o ritmo para extrassístoles e informar 145 bpm, a redação incluiu origem atrial, condução aos ventrículos e caráter isolado porque esses subcampos já estavam preselecionados. Isso acelera o preenchimento, mas pode transformar defaults invisíveis em fatos clínicos.

O LaudoUSG deve exigir confirmação dos qualificadores ou usar redação inespecífica quando eles estiverem ausentes. Frequências atrial e ventricular, relação A:V, condução, padrão temporal e repercussão não podem ser derivados do simples rótulo de arritmia.

## Limitação técnica

A limitação significativa por posição fetal apareceu na técnica e reduziu a força da conclusão. Entretanto, o corpo continuou afirmando normalidade de todas as estruturas. O sistema não identificou qual segmento ficou incompleto.

O contrato próprio deve registrar qualidade por estrutura ou bloco anatômico. Uma limitação global pode servir como contexto, mas não deve autorizar normalidade completa nem esconder pendências específicas.

## Restauração

A comunicação foi removida, sua medida foi apagada, o septo voltou a íntegro, o ritmo retornou a regular sem frequência preenchida, a limitação foi desmarcada e a técnica voltou a adequada. O editor retornou ao texto basal.

O cruzamento técnico está em [crosswalk-ecocardiografia-fetal-2026-10-03.md](../crosswalk-ecocardiografia-fetal-2026-10-03.md).
