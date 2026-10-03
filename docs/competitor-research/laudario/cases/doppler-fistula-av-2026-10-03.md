# Laudário — Doppler de Fístula Arteriovenosa

Observado em 03/10/2026, com achados exclusivamente sintéticos. Ao final, um novo rascunho do mesmo modelo foi aberto e o estado normal foi confirmado. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T15:34:00-03:00
exam: Doppler de Fístula Arteriovenosa (FAV)
surface: Laudos > Ultrassonografia > Vascular > Doppler de Fístula Arteriovenosa
baseline:
  controls: membro superior direito; fístula radiocefálica; artéria doadora, anastomose, veia de drenagem e artéria distal em estado normal; volume de fluxo não registrado
  report_structure: técnica; tipo do acesso; artéria doadora; anastomose; veia de drenagem; volume de fluxo; artéria distal; opinião
scenarios:
  - id: baixo_fluxo_com_queda
    input: volume atual de 400 ml/min na artéria braquial; medida anterior de 800 ml/min
    cascades: interpretação mudou automaticamente para fluxo reduzido; queda calculada em 50 por cento; conclusão positiva e alertas de recomendação foram criados
    output: corpo preservou local da medida, valores atual e anterior, limiar de maturação e variação percentual; opinião classificou baixo fluxo e disfunção do acesso
    reset_verified: true
  - id: alto_fluxo_com_comparacao
    input: volume atual de 1800 ml/min na artéria braquial; medida anterior de 800 ml/min
    cascades: interpretação mudou automaticamente para alto fluxo; aumento calculado em 125 por cento; surgiu escolha de repercussão cardíaca já marcada como ausente
    output: corpo e opinião classificaram alto fluxo e incluíram ausência de repercussão cardíaca sem que um dado cardíaco tivesse sido informado
    reset_verified: true
  - id: estenose_juxta_anastomotica
    input: aliasing e elevação focal; estenose juxta-anastomótica; VPS de 450 cm/s; razão 4,0; diâmetro luminal mínimo de 1,5 mm
    cascades: razão classificada como estenose crítica acima de 75 por cento; diâmetro classificado como crítico abaixo de 2,0 mm; conclusão recebeu quatro itens positivos
    output: corpo preservou medidas, topografia e sinais diretos; opinião concluiu estenose hemodinamicamente significativa e repetiu as duas classificações críticas
    reset_verified: true
state_behavior:
  stale_values: ao voltar os controles qualitativos ao normal, medidas e interpretações derivadas permaneceram no texto; a abertura de um novo rascunho restaurou o estado inicial
evidence:
  observed: controles, cálculos derivados, texto, opinião, persistência residual e restauração por novo rascunho foram vistos na interface normal
  inferred: limiares e recomendações são dirigidos por regras internas; sua validade clínica e fonte não foram auditadas nesta rodada
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/lib/writerCategories.ts
    - apps/web/src/components/laudar/categoryGroups.ts
    - apps/mobile/src/ui/tokens.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - packages/shared/src/categoryPresentation.ts
    - packages/db/src/seeds/data.ts
    - apps/api/src/server/pipeline/categoryNormalization.ts
    - LaudoUSG/Models/Category.swift
  status: confirmed_gap
  notes: a categoria está exposta e segue pelo writer, mas não há contrato clínico determinístico, workspace próprio ou corpus versionado no diretório de snippets do repositório
next_probe: comparar o Doppler renal, que já possui writer e auditoria específicos, antes de propor o contrato v1 de acesso vascular
```

## Estrutura observada

O formulário separa dados do paciente, técnica, indicação, planejamento pré-operatório, membro e tipo de acesso, artéria doadora, anastomose, veia de drenagem, volume de fluxo, artéria distal, subcutâneo, comparação, achados adicionais e recomendações.

O estado inicial descreve uma fístula radiocefálica direita pérvia e funcionante. O volume não é presumido: aparece explicitamente como não registrado. Essa separação entre anatomia, hemodinâmica e condições de punção é uma referência funcional importante.

## Baixo fluxo e comparação

Com 400 ml/min e exame anterior de 800 ml/min, a interface selecionou automaticamente fluxo reduzido, calculou queda de 50% e acrescentou a comparação ao corpo e à opinião. O comportamento preserva os valores de origem e a derivação, o que facilita auditoria.

Para o LaudoUSG, o valor atual, o local de medida, o exame anterior e a variação devem ser fatos distintos. A comparação só pode ser calculada quando ambos os valores forem válidos, estiverem na mesma unidade e tiverem contexto técnico compatível.

## Alto fluxo e negativa cardíaca presumida

Com 1800 ml/min e medida anterior de 800 ml/min, o modelo calculou aumento de 125% e classificou alto fluxo. O formulário abriu um bloco sobre repercussão cardíaca já marcado como ausência de repercussão documentada, e essa negativa entrou no texto sem qualquer medida cardíaca ou confirmação adicional.

Isso é um risco observado. O contrato do LaudoUSG deve diferenciar “não avaliada”, “sem repercussão clínica informada” e “avaliada sem repercussão”. O padrão inicial deve ser não avaliada, e qualquer conclusão clínica precisa de confirmação médica explícita.

## Estenose juxta-anastomótica

No cenário isolado, a VPS de 450 cm/s, a razão 4,0 e o diâmetro luminal mínimo de 1,5 mm apareceram no corpo. A interface classificou automaticamente a razão como estenose crítica acima de 75% e o diâmetro como crítico abaixo de 2,0 mm. A topografia juxta-anastomótica também entrou na conclusão.

O comportamento mostra o valor de um contrato que preserve medida, cálculo e interpretação separadamente. A regra clínica, a posição exata da medida e a confirmação do médico precisam ser versionadas; preencher uma razão manual não prova que ela foi calculada a partir de velocidades compatíveis.

## Estado residual

Depois de retornar o fluxo da anastomose e a região juxta-anastomótica às opções normais, as medidas quantitativas continuaram no texto e mantiveram conclusões de estenose crítica. Os valores de volume também resistiram à tentativa de limpeza no mesmo rascunho. Abrir um novo rascunho do modelo removeu todos os dados sintéticos e restaurou a opinião normal.

Esse achado reforça um requisito transversal do LaudoUSG: toda derivação deve depender do estado atual das fontes. Desativar um bloco ou apagar uma medida precisa remover, na mesma atualização, classificações, recomendações e frases derivadas.

## Restauração

O rascunho final aberto novamente mostrou volume não registrado, anastomose normal e ausência dos valores 400, 800, 1800, 450, 4,0 e 1,5. Nenhum fluxo de entrega foi usado.

O cruzamento técnico está em [crosswalk-doppler-fistula-av-2026-10-03.md](../crosswalk-doppler-fistula-av-2026-10-03.md).
