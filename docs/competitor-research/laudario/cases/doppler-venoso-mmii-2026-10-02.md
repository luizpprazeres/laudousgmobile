# Laudário — Doppler Venoso de Membro Inferior

Observado em 02/10/2026, com achados exclusivamente sintéticos. O modelo foi restaurado, reaberto e confirmado sem seleções residuais. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-02T09:54:50-03:00
exam: Doppler Venoso de Membro Inferior
surface: Laudos > Ultrassonografia > Vascular > Doppler Venoso de Membro Inferior
baseline:
  controls: unilateral direito; estados normais preselecionados; cartograma em auto-sincronização; inclusão do desenho e das recomendações desligada
  report_structure: técnica; sistemas superficial e profundo; perfurantes; varizes; opinião
scenarios:
  - id: normal_unilateral
    input: nenhuma alteração sintética
    cascades: nenhuma
    output: sistemas superficial e profundo descritos como competentes, sem trombose
    reset_verified: true
  - id: refluxo_jsf_vsm
    input: JSF incompetente; refluxo acima de 0,5 segundo; VSM incompetente em todo o trajeto
    cascades: incompetência da VSM e bloco de refluxo ativados; cartograma atualizado; recomendações sugeridas
    output: insuficiência da JSF e VSM; recomendações não publicadas sem confirmação separada
    reset_verified: true
  - id: tvp_aguda_oclusiva
    input: veia femoral comum direita proximal; material intraluminal; não compressibilidade; ausência de fluxo; sinais agudos
    cascades: conclusão positiva apareceu antes do preenchimento dos critérios; cartograma profundo atualizado
    output: TVP descrita com segmento, extensão e sinais preenchidos; sem recomendação automática
    reset_verified: true
evidence:
  observed: controles, cascatas, texto resultante, conclusão, recomendações e cartograma vistos na interface normal
  inferred: os controles de critérios refinam a redação, mas não condicionam a conclusão positiva
crosswalk:
  laudousg_paths_checked:
    - apps/api/src/server/renderer/categories/DOPPLER_VENOSO_MMII.ts
    - apps/api/src/server/pipeline/dopplerVenosoMmiiWriterAudit.ts
    - packages/schemes/src/vascular/findings.ts
    - packages/schemes/src/vascular/venousMap.ts
    - apps/web/src/components/laudar/WriterCategoryWorkspace.tsx
    - apps/mobile/src/features/generate/VenousSchemeView.tsx
    - LaudoUSG/LaudoUSG/Features/Generate/GenerateViewModel.swift
  status: partial
  notes: categoria e mapa existem, mas faltam entrada estruturada, critérios obrigatórios de TVP e fonte de verdade comum ao texto e ao desenho
next_probe: testar separadamente o modelo TVP-only com entrada incompleta e critérios de fronteira
```

## Estrutura

O modelo estudado foi o Doppler Venoso de Membro Inferior completo, distinto da opção específica “Doppler Venoso de Membro Inferior (TVP)” existente no catálogo. O formulário separa lateralidade, safena magna e junção safenofemoral, safena parva e veia de Giacomini, perfurantes, veias superficiais, varizes, sistema venoso profundo, comparativos, achados adicionais, cartograma e recomendações.

O estado inicial unilateral direito gera um laudo normal com sistemas superficial e profundo. Junções e safenas aparecem competentes; perfurantes, sem refluxo; sistema profundo, pérvio, compressível e sem trombose ou refluxo. Esses estados já vêm selecionados ao abrir o modelo.

## Cenário 1 — estado normal

**Entrada:** nenhuma alteração selecionada.

**Observado:** o texto descreveu técnica, junções safenofemoral e safenopoplítea, safenas magna e parva, perfurantes, varizes e sistema profundo. A conclusão afirmou competência dos sistemas superficial e profundo e ausência de trombose.

**Implicação:** o modelo equivalente precisa distinguir estruturas efetivamente avaliadas de normalidades preselecionadas. O próprio formulário permite retirar o sistema profundo do exame, indicando que escopo e competência não são sinônimos.

**Reset verificado:** verdadeiro; o cenário não alterou o estado-base.

## Cenário 2 — refluxo da junção safenofemoral e safena magna

**Entrada:** junção safenofemoral incompetente com refluxo sustentado acima de 0,5 segundo e safena magna incompetente em todo o trajeto.

**Observado:** selecionar a junção incompetente também ativou o estado incompetente da safena e criou um bloco de refluxo inicialmente abrangendo todo o trajeto. O laudo descreveu o limiar temporal, o segmento acometido e concluiu insuficiência da junção e da safena magna.

A interface sugeriu correlação clínica e avaliação angiológica/flebológica. As duas recomendações ficaram selecionadas no formulário, porém não entraram no texto porque a opção independente de incluir o bloco permaneceu desligada.

O cartograma estava em auto-sincronização e marcou a junção e o trajeto da safena magna direita como incompetentes. A inclusão do flebograma no laudo continuou desligada e independente do estado visual.

**Implicação:** achado, extensão, recomendação, desenho e publicação do desenho são estados diferentes. A automação visual é útil, mas deve derivar do mesmo contrato clínico do texto e permitir correção manual com proveniência.

**Reset verificado:** verdadeiro; JSF e VSM retornaram ao estado competente antes do cenário de TVP.

## Cenário 3 — TVP aguda oclusiva proximal

**Entrada completa:** trombose da veia femoral comum direita no segmento proximal, com material ecogênico intraluminal, não compressibilidade, oclusão com ausência de fluxo e aspecto agudo por distensão venosa e trombo hipoecoico.

**Observado:** o laudo preservou segmento, extensão, material, compressibilidade, fluxo e sinais de agudização. A conclusão informou trombose venosa profunda. Na vista profunda, o cartograma auto-sincronizado marcou o segmento proximal acometido.

Antes de os critérios morfológicos e hemodinâmicos serem marcados, a simples criação de uma linha de trombose com segmento e extensão já fez o sistema concluir TVP. Assim, os demais controles refinam a frase, mas não funcionam como pré-condição para a conclusão. Nenhuma recomendação automática apareceu nesse cenário.

**Implicação clínica:** o LaudoUSG não deve reproduzir essa permissividade. Segmento selecionado isoladamente não comprova trombose. O contrato precisa separar suspeita, achados observados, critérios preenchidos, idade sugerida e diagnóstico confirmado pelo médico; dados insuficientes devem gerar pendência objetiva em vez de conclusão positiva.

**Reset verificado:** verdadeiro; a trombose foi removida, o sistema profundo retornou ao normal e o exame foi reaberto.

## Evidência observada e inferência

**Observado:** estados preselecionados, alterações automáticas de controles, mudanças no corpo e na conclusão, sugestões de recomendação e atualizações do cartograma apareceram diretamente na interface normal do produto.

**Inferido:** os controles morfológicos e hemodinâmicos refinam a descrição, mas não condicionam o diagnóstico positivo, pois a conclusão já apareceu após segmento e extensão. Um caso de fronteira no modelo TVP-only ainda é necessário para saber se ele repete a mesma regra.

## Cartograma venoso

O flebograma possui vistas superficial anterior, profunda e superficial posterior. Pode representar estado fisiológico, incompetência, recanalização, oclusão, perfurantes, hipertensão venosa, varizes, telangiectasias e safenectomia. Safenas são segmentadas; diâmetros podem ser informados junto ao desenho; marcações automáticas e manuais coexistem. A impressão e a inclusão no laudo são escolhas separadas.

## Restauração

A junção e a safena magna voltaram a competentes. A trombose sintética foi removida e o sistema profundo retornou ao estado normal. Após reabrir o exame, todas as abas estavam sem contadores, as recomendações estavam vazias e o laudo normal original reapareceu.

## Próximas sondagens

Estudar refluxo segmentar com tributária e perfurante de reentrada, safena parva e Giacomini, perfurante incompetente, trombose superficial, recanalização crônica, safenectomia e exame bilateral. A opção específica de protocolo TVP deve ser avaliada em lote próprio para não misturar escopos.

O cruzamento técnico inicial está em [crosswalk-doppler-venoso-mmii-2026-10-02.md](../crosswalk-doppler-venoso-mmii-2026-10-02.md).
