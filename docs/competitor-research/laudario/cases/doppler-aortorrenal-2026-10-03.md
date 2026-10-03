# Laudário — Doppler Aortorrenal

Observado em 03/10/2026 com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T13:38:00-03:00
exam: Doppler Aortorrenal
surface: Laudos > Ultrassonografia > Vascular > Doppler Aortorrenal
baseline:
  controls: avaliação bilateral completa; artérias renais pérvias; padrão hemodinâmico e intrarrenal normais; aorta normal; sem medidas
  report_structure: técnica; análise renal, arterial e intrarrenal por lado; aorta; opinião
scenarios:
  - id: estenose_direita_por_criterio_direto
    input: VPS aórtica sintética de 80 cm/s; VPS máxima da artéria renal direita de 240 cm/s; padrão aterosclerótico significativo selecionado pelo médico
    cascades: RAR direita calculada como 3,0; a interface avisou que o critério direto havia sido atingido, mas só alterou a conclusão após a seleção médica do padrão anormal
    output: corpo e opinião passaram a descrever estenose significativa à direita; duas recomendações foram sugeridas, mas não publicadas porque o bloco de inclusão permaneceu desligado
    reset_verified: true
  - id: tardus_parvus_direito
    input: padrão intrarrenal tardus-parvus à direita; depois tempo de aceleração sintético de 85 ms
    cascades: a seleção qualitativa isolada já produziu conclusão de estenose proximal significativa; a medida apenas acrescentou tabela e alerta de tempo elevado
    output: corpo descreveu padrão tardus-parvus e a opinião afirmou estenose significativa mesmo antes de qualquer medida indireta
    reset_verified: true
  - id: arteria_direita_nao_avaliada
    input: artéria renal direita não avaliada por limitação técnica
    cascades: controles de perviedade, hemodinâmica e medidas direitas foram retirados; a frase normal direita foi substituída por limitação
    output: a opinião informou que a artéria direita não foi adequadamente avaliada e restringiu a normalidade às demais estruturas
    reset_verified: true
evidence:
  observed: controles, cálculo de RAR, alertas, texto, opinião, recomendações e restauração foram vistos na interface normal do navegador
  inferred: a seleção de um padrão qualitativo funciona como confirmação clínica suficiente no concorrente; não foi demonstrado um gate que exija medida indireta ou conjunto de critérios
crosswalk:
  laudousg_paths_checked:
    - apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts
    - apps/api/src/server/renderer/categories/dopplerRenalFewshots.ts
    - apps/api/src/server/pipeline/dopplerRenalWriter.ts
    - apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts
    - apps/api/src/server/pipeline/deterministicSanity.ts
    - apps/api/src/server/pipeline/deterministicSanity/extractor.ts
    - apps/web/src/lib/writerCategories.ts
    - apps/web/src/components/laudar/categoryGroups.ts
    - apps/mobile/src/ui/tokens.ts
    - apps/mobile/app/generate.tsx
    - packages/db/src/seeds/data.ts
    - packages/db/src/schema/reports.ts
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Features/Generate/GenerateViewModel.swift
  status: confirmed_gap
  notes: a categoria existe nos três clientes e tem writer dedicado, mas permanece textual e sem contrato compartilhado; a rodada revelou falsa normalidade e auditoria sem contexto, corrigidas no mesmo lote com bloqueio antes da entrega
next_probe: após endurecer o writer, testar IR elevado unilateral e bilateral, assimetria renal, VPS limítrofe, troca de lateralidade e limitação segmentar no fluxo real da API
```

## Estrutura observada

O formulário separa rins, aorta, artérias renais direita e esquerda, veias renais, achados especiais, comparativos, adicionais e recomendações. Cada artéria renal distingue qualidade técnica, perviedade, padrão hemodinâmico, critérios diretos, critérios indiretos e achados complementares. Os critérios indiretos incluem padrão intrarrenal, índices de resistência, tempo e índice de aceleração e relação renal/segmentar.

O estado inicial produz um laudo normal completo sem medidas. Isso mostra boa organização do protocolo, mas também pressupõe que várias estruturas foram avaliadas. No LaudoUSG, normalidade só deve ser emitida para o escopo confirmado pelo médico.

## Critério direto e confirmação médica

Com VPS aórtica de 80 cm/s e VPS renal direita de 240 cm/s, a interface calculou RAR de 3,0. O sistema exibiu um alerta de critério direto e pediu alteração do padrão hemodinâmico. Enquanto o padrão permaneceu normal, o laudo continuou normal. A conclusão positiva só apareceu após o médico selecionar explicitamente o padrão de estenose aterosclerótica significativa.

Esse comportamento separa medida de decisão clínica, o que é útil. Os números e limiares do concorrente não serão importados: o LaudoUSG continuará usando apenas seus critérios curados e versionados. A regra de produto extraída é que uma medida pode disparar pendência, mas não deve, isoladamente, transformar o diagnóstico sem confirmação.

As recomendações de métodos complementares foram sugeridas e ficaram fora do texto porque a inclusão global não foi ativada. Essa separação entre sugestão e publicação é adequada.

## Tardus-parvus sem medida

Selecionar o padrão tardus-parvus à direita, sem preencher tempo de aceleração, índice de aceleração ou outro dado indireto, já substituiu a normalidade intrarrenal e gerou conclusão de estenose proximal significativa. Depois, o valor sintético de 85 ms apenas acrescentou o dado à tabela e marcou o limite como alterado; a conclusão não dependia dele.

O LaudoUSG não deve tratar um rótulo solto como conjunto completo de evidências. O contrato futuro precisa guardar morfologia espectral, lado, território, medidas disponíveis, qualidade técnica e confirmação médica. Quando os dados forem insuficientes, o resultado deve permanecer como achado ou suspeita e mostrar uma pendência objetiva.

## Limitação técnica

Ao marcar que a artéria renal direita não foi avaliada, o concorrente retirou os controles de diagnóstico daquele lado, substituiu a frase normal por uma limitação e evitou concluir normalidade bilateral. A opinião informou a limitação e manteve apenas as demais estruturas como sem alterações.

Esse é o comportamento mínimo esperado no LaudoUSG: `não avaliado`, `avaliação parcial`, `avaliado normal` e `alterado` precisam ser estados distintos. A ausência de um valor não pode virar normalidade.

## Restauração

O padrão intrarrenal voltou ao normal, o tempo de aceleração foi apagado, o bloco indireto foi desligado, a avaliação direita retornou a completa e a VPS da aorta foi removida. O editor retornou ao laudo inicial normal, sem tabela de medidas ou recomendações.

O cruzamento técnico está em [crosswalk-doppler-aortorrenal-2026-10-03.md](../crosswalk-doppler-aortorrenal-2026-10-03.md).
