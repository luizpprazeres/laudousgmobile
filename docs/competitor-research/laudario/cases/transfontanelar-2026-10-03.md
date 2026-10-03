# Laudário — Transfontanelar

Data: 03/10/2026. Conta autorizada pelo Luiz. Estudo realizado pela interface normal do navegador, com dados sintéticos, sem copiar, imprimir, finalizar ou enviar laudos. O modelo foi restaurado ao estado normal ao final.

```yaml
competitor: Laudário
observed_at: 2026-10-03T15:10:00-03:00
exam: Transfontanelar
surface: Laudos > Ultrassonografia > Pediatria > Transfontanelar
baseline:
  controls: anatomia e sistema ventricular normais; sem medidas, idade ou Doppler
  report_structure: técnica; parênquima; linha média; sistema ventricular; conclusão
scenarios:
  - id: dilatacao_ventricular_qualitativa
    input: ventrículos laterais dilatados, sem medidas ou graduação
    cascades: duas recomendações foram sugeridas e permaneceram fora do texto até a chave geral ser ligada
    output: corpo e conclusão declararam dilatação ventricular sem medida
    reset_verified: true
  - id: hemorragia_grau_2
    input: grau 2 selecionado; depois lado esquerdo e medidas sintéticas de 1,0 por 0,6 cm
    cascades: o diagnóstico surgiu antes de lado e medidas; depois a lateralidade chegou ao corpo e à conclusão
    output: normalidade do sulco caudotalâmico coexistiu com a lesão; valores ficaram guardados após desativar o achado
    reset_verified: true
evidence:
  observed: organização, controles, recomendações, texto, conclusão, lateralidade, persistência de valores e restauração foram vistos no navegador
  inferred: critérios clínicos mínimos de dilatação e hemorragia não foram validados nesta rodada
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/lib/writerCategories.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - apps/api/src/server/pipeline/categoryNormalization.ts
    - packages/shared/src/clinicalModels/contracts.ts
    - packages/db/src/seeds/data.ts
    - laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
  status: partial
  notes: a categoria existe nos três clientes, mas permanece genérica e sem contrato neonatal, renderer ou auditoria específicos
next_probe: testar medidas ventriculares com idade, limitação técnica por estrutura, Doppler e lateralidade incompleta antes de definir o contrato
```

## Organização observada

O exame fica no grupo Pediatria. O formulário possui as abas Dados do Paciente, Técnica, Indicação, Parênquima, Linha Média, Ventrículos e Medidas, Doppler, Achados Patológicos, Exames Comparativos, Achados Adicionais e Recomendações. O texto é atualizado à direita durante as seleções.

Dados do Paciente permite registrar dias de vida e idade gestacional ao nascer. A interface informa que a idade gestacional caracteriza prematuridade. Parênquima separa parênquima cerebral, giros e sulcos, sulco caudotalâmico, tálamos, plexos coroides, cerebelo, fossa posterior e parênquima periventricular. Linha Média separa corpo caloso, vermis e desvio. Ventrículos e Medidas contém estado dos ventrículos laterais, terceiro e quarto ventrículos, medidas bilaterais dos cornos frontais, medida tálamo-occipital, hemisférios e relações derivadas. Doppler é opcional e usa artéria pericalosa/cerebral anterior, índice de resistência e marcadores qualitativos de IR elevado ou reduzido.

Achados Patológicos reúne hemorragias peri/intraventriculares nos graus 1 a 4 de Papile, malformações, ventriculomegalia, leucomalácia pela escala de de Vries, cistos, calcificações, trombose de seio, sinais de injúria hipóxico-isquêmica e espaços extra-axiais. As recomendações possuem uma chave geral de publicação, sugestões automáticas e seleções individuais.

## Cenário 1 — estado normal

O estado inicial produz técnica curta, descrição normal de parênquima, sulco caudotalâmico, tálamos, plexos, cerebelo, região periventricular, fossa posterior, corpo caloso, vermis, linha média e sistema ventricular. A conclusão declara ausência de anormalidades. Nenhuma medida, idade, qualidade técnica específica ou Doppler é exigido para publicar essa normalidade.

**Observado:** o modelo afirma normalidade ventricular sem medidas numéricas e sem idade informada.

## Cenário 2 — dilatação ventricular qualitativa

Ao trocar “tamanho e conteúdo habituais” por “dilatados”, sem preencher medidas e sem graduar, o corpo passou a descrever ventrículos laterais dilatados e a conclusão passou a declarar dilatação dos ventrículos laterais. Terceiro e quarto ventrículos continuaram normais.

Duas recomendações foram selecionadas automaticamente: avaliação neurológica/neurocirúrgica com seguimento ecográfico e acompanhamento ultrassonográfico seriado. Elas não entraram no laudo enquanto a chave geral “incluir bloco de RECOMENDAÇÕES” permaneceu desligada. Ao ligar essa chave, as duas foram publicadas no texto final.

**Observado:** há boa separação entre sugestão e publicação, mas existe conclusão positiva de dilatação sem medida ou classificação. As duas sugestões também são parcialmente redundantes.

Depois de restaurar o estado ventricular normal, a conclusão e as recomendações saíram do laudo.

## Cenário 3 — hemorragia grau 2 sintética

Ao marcar hemorragia peri/intraventricular grau 2, ainda sem lateralidade e sem medidas, o corpo descreveu uma imagem hiperecogênica no sulco caudotalâmico com extensão ventricular e sem dilatação. A conclusão declarou hemorragia grau 2 de Papile.

Depois foram informados, sinteticamente, lado esquerdo e 1,0 × 0,6 cm. O lado e as medidas chegaram ao corpo; a lateralidade também chegou à conclusão. Ao remover o achado, o texto voltou ao estado normal, mas os valores permaneceram guardados e desabilitados no formulário até serem apagados após reativar temporariamente o controle.

**Observado:** a seleção do grau produz diagnóstico antes de lateralidade e medidas. O texto normal “sulco caudotalâmico com aspecto habitual” permaneceu no corpo antes da descrição da lesão, criando uma contradição interna. Não foi sugerida recomendação automática nesse cenário.

## Comportamentos úteis

A organização anatômica e a amplitude dos achados dão uma boa referência de cobertura. A separação entre recomendação sugerida, seleção individual e publicação explícita é adequada. A manutenção de lateralidade e medidas no corpo e do lado na conclusão também é útil.

## Comportamentos que não devem ser reproduzidos

O LaudoUSG não deve concluir dilatação ventricular apenas por um botão qualitativo quando a regra aprovada exigir medida ou contexto etário. A graduação de hemorragia não deve ser aceita como um rótulo desconectado dos critérios que a sustentam. Normalidade do sulco caudotalâmico precisa ser suprimida quando existe lesão nessa topografia. Valores ocultos não podem reaparecer silenciosamente ao reativar um achado.

Este estudo descreve o comportamento da interface, não valida a correção clínica das regras do concorrente.
