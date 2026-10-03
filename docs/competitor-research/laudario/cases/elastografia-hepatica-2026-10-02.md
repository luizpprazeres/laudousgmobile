# Laudário — Elastografia Hepática

Observado em 02/10/2026, com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial ao final. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-02T11:16:36-03:00
exam: Elastografia Hepática
surface: Laudos > Ultrassonografia > Abdome > Elastografia Hepática
baseline:
  controls: 2D-SWE Samsung; cinco medidas; aquisição adequada; jejum adequado; braço direito estendido; sem valor hepático ou esplênico
  report_structure: técnica; tabela da Regra dos 4; considerações técnicas; referências
scenarios:
  - id: estado_inicial_sem_medidas
    input: nenhuma medida sintética
    cascades: técnica, protocolo, tabela interpretativa e ressalvas já aparecem; nenhuma conclusão de rigidez
    output: documento técnico sem resultado ou opinião positiva
    reset_verified: true
  - id: rigidez_hepatica_normal
    input: mediana 4,0 kPa e IQR/mediana 15%
    cascades: 1,2 m/s derivado; Classe 1 e conclusão normal surgiram antes do preenchimento do IQR/mediana
    output: rigidez normal, qualidade e ausência de evidência de doença hepática crônica avançada compensada
    reset_verified: true
  - id: algoritmo_hepatoesplenico
    input: fígado 15,0 kPa com IQR/mediana 20%; baço 25,0 kPa, cinco medidas e IQR 4,0 kPa
    cascades: 2,2 m/s hepático, 2,9 m/s esplênico e IQR/mediana esplênico 16% derivados; aplicação sequencial do limiar esplênico após fígado abaixo de 16 kPa
    output: fígado compatível com doença hepática crônica avançada compensada e HPCS considerada improvável pelo resultado esplênico combinado
    reset_verified: true
evidence:
  observed: controles, valores derivados, classificação, texto, conclusão, elastografia esplênica e comparação longitudinal vistos na interface normal do navegador
  inferred: a regra esplênica depende da combinação de método, rigidez hepática e rigidez esplênica; validade e generalização clínica não foram testadas
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/components/laudar/LiverQuantificationPanel.tsx
    - apps/web/src/lib/deterministic/liverQuantification.ts
    - apps/web/src/components/laudar/LaudarWebExperience.tsx
    - apps/web/src/lib/webReports.ts
    - apps/api/src/app/api/sala/latest/route.ts
    - apps/mobile/src/ui/tokens.ts
    - LaudoUSG/LaudoUSG/Models/Category.swift
  status: confirmed_gap
  notes: Web possui rigidez hepática descritiva; categoria própria, elastografia esplênica, evolução longitudinal, contrato móvel e transporte Web para a Sala são lacunas confirmadas; limiares e valor clínico ainda dependem de aprovação
next_probe: estudar Doppler Hepático separadamente e cruzar os critérios vasculares com o contrato de Abdome total com Doppler
```

## Estrutura do modelo

O exame independente concentra Técnica e Protocolo, Indicação, Medições e Qualidade, Interpretação pela Regra dos 4, Fatores de Confusão, Seguimento, Elastografia Esplênica, Quantificação de Gordura, Tabela Evolutiva, Exames Comparativos e Recomendações. Ele reutiliza grande parte do módulo visto na avaliação multiparamétrica, mas acrescenta uma superfície longitudinal e torna explícita a dependência entre rigidez hepática e esplênica.

## Cenário 1 — estado inicial sem medidas

**Entrada:** nenhuma medida.

**Observado:** 2D-SWE, Samsung, cinco medições, aquisição adequada, localização no fígado direito, jejum e posicionamento aparecem preselecionados. O documento já afirma a técnica e o protocolo e exibe a tabela da Regra dos 4 e ressalvas, embora não exista resultado. A opinião permanece ausente.

**Implicação:** abrir o modelo não comprova método, equipamento, quantidade de aquisições, jejum ou posicionamento. O LaudoUSG deve publicar esses dados somente após confirmação do procedimento realizado.

**Reset verificado:** verdadeiro; o cenário não alterou o estado inicial.

## Cenário 2 — rigidez hepática normal

**Entrada:** mediana sintética de 4,0 kPa e IQR/mediana de 15%.

**Observado:** ao inserir somente 4,0 kPa, o sistema derivou 1,2 m/s, classificou Classe 1 e já concluiu normalidade. O IQR/mediana ainda estava vazio. Depois de preencher 15%, a qualidade entrou no corpo e na conclusão, sem alterar a interpretação.

**Implicação clínica:** medida isolada não deve gerar automaticamente uma conclusão revisada quando a qualidade exigida pelo método ainda está pendente. O valor pode aparecer na prévia, mas classificação e liberação precisam respeitar gates técnicos e confirmação médica.

**Reset verificado:** verdadeiro; kPa, m/s e IQR/mediana foram apagados, e o documento retornou ao estado inicial.

## Cenário 3 — algoritmo hepatoesplênico

**Entrada:** rigidez hepática sintética de 15,0 kPa com IQR/mediana de 20%. A avaliação esplênica foi marcada como realizada com qualidade adequada e recebeu cinco medidas, mediana de 25,0 kPa e IQR absoluto de 4,0 kPa.

**Observado:** o sistema derivou 2,2 m/s no fígado, 2,9 m/s no baço e IQR/mediana esplênico de 16%. A rigidez hepática foi classificada como compatível com doença hepática crônica avançada compensada. Como a rigidez hepática estava abaixo de 16 kPa e a esplênica abaixo de 26,6 kPa, o laudo considerou improvável a hipertensão portal clinicamente significativa.

Antes das medidas esplênicas, apenas marcar a avaliação como realizada inseriu no corpo do laudo uma instrução para preencher a mediana. Isso é um marcador operacional exposto no documento clínico.

**Implicação clínica:** o algoritmo hepatoesplênico depende de método e sequência específicos. Ele não pode ser aplicado a pSWE, elastografia transitória ou outros fabricantes sem contrato e fonte compatíveis. Campos incompletos devem produzir pendência fora do corpo do laudo, nunca uma instrução dentro do documento.

**Reset verificado:** verdadeiro; a avaliação esplênica voltou a não realizada, todos os campos esplênicos foram apagados, e depois kPa, m/s e IQR/mediana hepáticos também foram removidos.

## Seguimento e evolução

A tela oferece comparação com exame anterior, mediana anterior, data, indicação de mesmo equipamento, delta absoluto e delta relativo. O texto da interface apresenta variação relativa acima de 10% como clinicamente significativa e alerta para variabilidade entre sistemas. Há contextos de hepatopatia crônica, pós-tratamento de hepatites, congestão e pós-intervenção.

A tabela evolutiva permite entradas por data para rigidez e fração de gordura. Esses controles foram apenas inventariados; nenhum cenário longitudinal foi executado. Os limiares e a decisão de comparar equipamentos diferentes precisam de revisão clínica antes de virar regra do LaudoUSG.

## Requisitos extraídos

O contrato precisa separar aquisição hepática, aquisição esplênica e comparação longitudinal. Cada medida deve conservar método, equipamento, unidade, qualidade, fonte e proveniência. Derivações devem depender atomicamente da origem. Interpretações combinadas precisam declarar todas as pré-condições e permanecer como sugestão até confirmação médica.

Pendências devem aparecer na interface do médico e impedir o estado revisado, sem contaminar o texto entregue à auxiliar. O histórico deve comparar apenas exames identificados e compatíveis, sem depender de nome de paciente persistido fora da política do produto.

## Próxima sondagem

A próxima prioridade passa a ser Doppler Hepático. A elastografia ainda merece uma rodada futura específica para pSWE, exame tecnicamente não realizável, qualidade inadequada, seguimento longitudinal e fronteiras dos algoritmos, mas o contrato inicial já pode ser desenhado com esses estados previstos.

O cruzamento técnico está em [crosswalk-elastografia-hepatica-2026-10-02.md](../crosswalk-elastografia-hepatica-2026-10-02.md).
