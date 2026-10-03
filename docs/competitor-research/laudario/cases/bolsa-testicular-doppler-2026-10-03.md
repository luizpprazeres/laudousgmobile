# Laudário — Bolsa testicular com Doppler

Observado em 03/10/2026 com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T14:20:00-03:00
exam: Bolsa testicular com Doppler
surface: Laudos > Ultrassonografia > Urologia > Bolsa Testicular com Doppler
baseline:
  controls: testículos tópicos e homogêneos; epidídimos habituais; vascularização preservada; líquido fisiológico; Doppler espectral não citado; plexos fora do laudo
  report_structure: técnica; análise por lado; líquido escrotal; opinião
scenarios:
  - id: ausencia_fluxo_direita_isolada
    input: ausência de fluxo na artéria testicular direita, sem sinal morfológico de torção e sem contexto clínico preenchido
    cascades: retirou a vascularização preservada do lado direito; sugeriu avaliação urológica urgente fora do laudo
    output: publicou comprometimento vascular grave e conclusão compatível com torção testicular
    reset_verified: true
  - id: ausencia_fluxo_com_redemoinho
    input: ausência de fluxo à direita associada ao sinal do redemoinho do cordão espermático
    cascades: acrescentou o sinal direto no corpo; manteve a mesma sugestão de urgência
    output: a conclusão permaneceu idêntica à do cenário com ausência de fluxo isolada
    reset_verified: true
  - id: varicocele_direita_sintetica
    input: veias do plexo direito com calibre máximo de 3,2 mm e refluxo à Valsalva até o polo superior
    cascades: incluiu os plexos no corpo; classificou automaticamente como grau 2 de Sarteschi; sugeriu investigação de causa secundária fora do laudo
    output: conclusão de varicocele à direita
    reset_verified: true
evidence:
  observed: controles, mudanças do texto, sugestões automáticas e restauração foram conferidos na interface normal do navegador
  inferred: a ausência isolada de fluxo é tratada pelo concorrente como suficiente para conclusão positiva; a classificação da varicocele depende da combinação de calibre, topografia do refluxo e lateralidade
crosswalk:
  laudousg_paths_checked:
    - packages/db/src/seeds/data.ts
    - packages/shared/src/categoryPresentation.ts
    - packages/knowledge/snippets/ESCROTAL
    - apps/api/src/server/asr/medicalGlossary.ts
    - apps/api/src/server/pipeline/deterministicSanity/types.ts
    - apps/api/src/server/pipeline/deterministicSanity/extractor.ts
    - apps/api/src/server/pipeline/deterministicSanity.ts
    - apps/api/src/server/pipeline/bundleLoader.ts
    - apps/api/src/server/prompts/global.ts
    - apps/api/src/server/prompts/contracts
    - apps/api/src/server/renderer/categories
    - packages/shared/src/clinicalModels/contracts.ts
    - apps/web/src/lib/writerCategories.ts
    - apps/web/src/components/laudar/categoryGroups.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - apps/mobile/src/ui/tokens.ts
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
  status: partial_coverage_confirmed
  notes: ESCROTAL está exposta nas três plataformas e possui 21 blocos clínicos no checkout, mas não tem contrato estruturado nem renderer próprio; ingestão e ativação desses blocos no banco atual não foram comprovadas
next_probe: criar contrato dormente compartilhado e testar o writer real com ausência de fluxo isolada, critérios combinados de torção e varicocele lateralizada antes de qualquer ativação
```

## Ausência de fluxo e torção

A seleção isolada de ausência de fluxo arterial à direita foi suficiente para o concorrente publicar torção testicular na conclusão, apesar de nenhum sinal morfológico complementar e nenhum contexto de dor terem sido preenchidos. A sugestão de encaminhamento urgente foi marcada automaticamente, mas permaneceu fora do laudo porque o bloco global de recomendações não foi ativado.

Ao acrescentar o sinal do redemoinho, o corpo ficou mais completo, porém a conclusão não ganhou qualquer distinção de força de evidência. Esse comportamento é útil para mapear os controles, mas não deve ser reproduzido. O LaudoUSG precisa distinguir dado Doppler isolado, suspeita clínica e conjunto de sinais confirmados pelo médico.

## Varicocele direita

Veias de 3,2 mm com refluxo à Valsalva até o polo superior produziram descrição lateralizada, classificação automática em grau 2 de Sarteschi e conclusão de varicocele direita. O sistema também sugeriu investigação de causa secundária por se tratar de achado isolado à direita, sem publicar a recomendação automaticamente.

No LaudoUSG, calibre, condição de aquisição, duração e extensão do refluxo devem permanecer fatos separados. A classificação não pode nascer apenas do texto livre nem de uma medida sem manobra documentada. A lateralidade direita deve acionar um aviso clínico opt-in, sem acrescentar causa ou recomendação ao laudo de forma automática.

## Restauração

O Doppler espectral direito voltou a “não citar”, o sinal do redemoinho foi retirado, os plexos retornaram ao estado habitual e foram excluídos do laudo, o calibre sintético foi apagado e as duas recomendações automáticas foram desmarcadas. O editor retornou ao texto basal sem torção, varicocele ou plexos publicados.

O cruzamento técnico está em [crosswalk-bolsa-testicular-doppler-2026-10-03.md](../crosswalk-bolsa-testicular-doppler-2026-10-03.md).
