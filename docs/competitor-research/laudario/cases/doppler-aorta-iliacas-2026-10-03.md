# Laudário — Doppler de aorta e artérias ilíacas

Data: 03/10/2026. Conta autorizada pelo Luiz. Estudo realizado pela interface normal do navegador, com medidas sintéticas e sem dados de pacientes. Não houve cópia, impressão, finalização ou envio de laudo. O modelo foi restaurado ao estado normal no fim.

```yaml
competitor: Laudário
observed_at: 2026-10-03T15:58:00-03:00
exam: Doppler de Aorta e Artérias Ilíacas
surface: Laudos > Ultrassonografia > Vascular > Doppler de Aorta e Artérias Ilíacas
baseline:
  controls: aorta visível em toda a extensão; parede e calibre normais; ilíacas comuns bilaterais sem dilatação; fluxo trifásico; sem medidas
  report_structure: técnica; indicação; análise morfológica; avaliação hemodinâmica; opinião
scenarios:
  - id: aneurisma_infrarrenal_confirmado
    input: diâmetro AP sintético de 4,5 cm; depois classificação de aneurisma selecionada pelo médico
    cascades: a medida isolada gerou alerta sem mudar a conclusão; a confirmação abriu presets anatômicos e sugeriu seguimento sem publicá-lo
    output: corpo e opinião passaram a registrar aneurisma infrarrenal; colo, morfologia e ausência de trombo preselecionados também foram publicados
    reset_verified: true
  - id: estenose_iliaca_esquerda
    input: estenose superior a 50% selecionada na artéria ilíaca comum esquerda, sem medidas numéricas disponíveis
    cascades: a opção publicou aliasing e VPS equivalente ao dobro do segmento proximal
    output: corpo e opinião localizaram a estenose à esquerda; a ilíaca direita permaneceu descrita como normal
    reset_verified: true
  - id: oclusao_iliaca_esquerda
    input: morfologia de oclusão e depois ausência de fluxo na artéria ilíaca comum esquerda
    cascades: oclusão e estenose coexistiram temporariamente; a redação de estenose persistiu após o controle visual trocar para ausência de fluxo
    output: a recomposição completa exigiu outra interação; após restaurar parede e fluxo, o laudo voltou ao basal
    reset_verified: true
evidence:
  observed: controles, alertas, presets, texto, opinião, recomendação sugerida, lateralidade e restauração foram vistos na interface normal do navegador
  inferred: campos não testados de EVAR, endoleak, dissecção e ilíaca externa podem ter outras dependências e conflitos ainda não observados
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/lib/writerCategories.ts
    - apps/web/src/components/laudar/categoryGroups.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - apps/api/src/server/pipeline/categoryNormalization.ts
    - apps/api/src/server/pipeline/deterministicSanity/extractor.ts
    - apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts
    - packages/shared/src/clinicalModels/contracts.ts
    - packages/db/src/seeds/data.ts
    - packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md
    - laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
  status: confirmed_gap
  notes: não há categoria nem contrato próprios; componentes fragmentados não cobrem o exame vascular e podem gerar falsa normalidade ou roteamento incorreto; nenhum limiar do concorrente foi adotado como regra clínica
next_probe: testar VPS e razão na ilíaca externa, EVAR com endoleak e dissecção, sempre restaurando o baseline
```

## Organização observada

O formulário possui as abas Dados do Paciente, Técnica, Indicação, Aorta Abdominal, Ilíaca Direita, Ilíaca Esquerda, Endoprótese (EVAR), Parâmetros, Achados Adicionais, Exames Comparativos e Recomendações.

A aba da aorta separa visibilidade, parede, diâmetro anteroposterior máximo, classificação dimensional, extensão em relação às artérias renais, morfologia do aneurisma, trombo mural, medidas do saco, comparação longitudinal, distância à bifurcação e hemodinâmica. Também oferece opções para dissecção, pseudoaneurisma, aneurisma infeccioso, envolvimento renal e síndrome da aorta média.

As abas ilíacas são independentes por lado. Cada uma separa parede, diâmetro, classificação dimensional e hemodinâmica da artéria ilíaca comum. Artérias ilíacas interna e externa e circulação colateral aparecem como blocos adicionais opcionais. Não há campos visíveis de velocidades ou razão na aba da ilíaca comum; a graduação é escolhida por opções que descrevem o múltiplo da velocidade proximal.

A técnica inicial afirma medidas `outer-to-outer`, plano transverso perpendicular ao vaso, jejum de pelo menos quatro horas e qualidade satisfatória. Esses itens já vêm publicados no texto basal, sem confirmação individual nesta rodada.

## Cenário 1 — estado normal

Sem medidas, o modelo descreve toda a aorta do hiato diafragmático à bifurcação, ambas as artérias ilíacas comuns e a hemodinâmica como normais. A conclusão declara o estudo dentro da normalidade.

**Observado:** a normalidade completa não exige diâmetro da aorta, diâmetros ilíacos, velocidades ou documentação de cada segmento. Também não foi identificada uma opção de “não avaliado” por segmento nas abas examinadas.

## Cenário 2 — diâmetro aórtico de 4,5 cm e aneurisma confirmado

Foi digitado apenas o diâmetro anteroposterior sintético de 4,5 cm. A interface sinalizou que o valor estava na faixa de aneurisma, mas manteve selecionada a classificação de calibre normal e conservou a conclusão normal. A medida isolada não entrou no texto final.

Depois da seleção manual de aneurisma, o corpo e a conclusão passaram a registrar aneurisma infrarrenal de 4,5 cm. Nesse momento, o formulário publicou também opções que já estavam preselecionadas no bloco recém-aberto: colo infrarrenal igual ou superior a 15 mm, anatomia favorável a EVAR padrão, morfologia fusiforme e ausência de trombo, apesar de nenhum desses dados ter sido preenchido durante o cenário.

A aba Recomendações selecionou automaticamente acompanhamento semestral para a faixa exibida, mas a chave geral de inclusão permaneceu desligada. Portanto, a recomendação sugerida não entrou no laudo.

**Observado:** a classificação depende de confirmação médica, o que evita diagnóstico automático por uma medida isolada. Ao mesmo tempo, uma medida claramente incompatível pode coexistir com classificação e conclusão normais; ao confirmar o aneurisma, detalhes anatômicos preselecionados podem ser publicados como fatos sem medidas próprias.

Ao restaurar calibre normal e apagar o diâmetro, o bloco de aneurisma, o intervalo sugerido e a conclusão alterada foram removidos.

## Cenário 3 — estenose e oclusão da ilíaca comum esquerda

Como não havia campos de VPS na aba examinada, o cenário quantitativo previsto no preflight não pôde ser executado. Foi selecionada a opção de estenose superior a 50% da artéria ilíaca comum esquerda. O corpo e a conclusão preservaram a lateralidade esquerda, enquanto a ilíaca direita continuou descrita como normal sem novas medidas. O corpo descreveu aliasing e velocidade de pico sistólico equivalente ao dobro do segmento proximal. Esses dados entraram na redação sem medidas numéricas registradas.

Em seguida, foi selecionada morfologia de oclusão sem antes trocar o estado hemodinâmico. O corpo e a conclusão passaram a coexistir com oclusão e estenose no mesmo segmento. Ao selecionar “ausência de fluxo” na hemodinâmica, o controle visual trocou de estenose para ausência de fluxo, mas a redação de estenose persistiu até outra interação no formulário. Isso confirma que os dois grupos de controle e a recomposição do texto podem ficar temporariamente incoerentes.

Após restaurar a parede regular e o fluxo trifásico, os controles voltaram ao normal. Foi necessário navegar para outra aba para que o texto fosse integralmente recomposto e a conclusão normal reaparecesse.

**Não observado:** não foram testadas ilíaca externa com medidas, razão de velocidades, endoprótese, endoleak, dissecção, sinais de ruptura ou recomendações de urgência. A interface visível não apresentou campos numéricos para provar a graduação da estenose da ilíaca comum.

## Comportamentos úteis

A separação bilateral das ilíacas, a distinção entre morfologia, dimensão e hemodinâmica, a visibilidade da unidade e do método de medida e a publicação separada de recomendações são referências funcionais úteis. A medida pode gerar um alerta sem concluir automaticamente um diagnóstico, mantendo a decisão final com o médico.

## Comportamentos que não devem ser reproduzidos

O LaudoUSG não deve publicar normalidade sem documentar o escopo avaliado. Uma medida incompatível com o estado selecionado precisa criar pendência bloqueante. Colo, relação com artérias renais, morfologia, trombo e elegibilidade para tratamento não podem nascer de presets ocultos. Estenose não pode ser graduada nem descrever aliasing ou múltiplos de velocidade sem dados registrados ou confirmação explícita. Oclusão e estenose devem ser mutuamente exclusivas, e a remoção de um achado precisa limpar imediatamente texto, conclusão, recomendações e derivados.

Os limiares e recomendações exibidos pelo concorrente não foram adotados como fonte clínica. A implementação requer referências próprias e aprovação médica.
