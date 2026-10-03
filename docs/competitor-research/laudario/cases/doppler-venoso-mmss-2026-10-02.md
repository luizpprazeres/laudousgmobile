# Laudário — Doppler Venoso de Membro Superior

Observado em 02/10/2026, com achados exclusivamente sintéticos. O modelo foi restaurado ao estado normal. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-02T21:44:36-03:00
exam: Doppler Venoso de Membro Superior
surface: Laudos > Ultrassonografia > Vascular > Doppler Venoso de Membro Superior
baseline:
  controls: unilateral direito; veias profundas e superficiais preselecionadas como pérvias; jugular interna, interósseas e mediana cubital fora do texto inicial; dispositivo desligado
  report_structure: técnica; sistemas profundo e superficial por veia; achados complementares; opinião
scenarios:
  - id: dispositivo_trombose_hospedeira
    input: PICC em veia basílica; trombose da veia hospedeira
    cascades: bloco de achado complementar inserido; nenhuma mudança automática no estado da veia basílica nem na opinião
    output: corpo descreveu a trombose relacionada ao dispositivo, mas a opinião permaneceu normal
    reset_verified: true
  - id: trombose_superficial_basilica
    input: veia basílica com trombose superficial curta; conteúdo hipoecogênico; incompressível; sem fluxo
    cascades: frase normal da basílica foi substituída; opinião positiva apareceu
    output: corpo preservou extensão, ecogenicidade, compressibilidade e fluxo; a opinião apresentou erro de concordância de número
    reset_verified: true
  - id: tvp_axilar_oclusiva
    input: veia axilar totalmente trombosada; conteúdo hipoecogênico; ausência de compressibilidade e fluxo
    cascades: frase normal da axilar foi substituída; opinião positiva apareceu
    output: corpo descreveu oclusão e critérios selecionados; a opinião apresentou erro de concordância de número
    reset_verified: true
evidence:
  observed: controles, texto derivado, opinião e restauração foram vistos na interface normal
  inferred: o modelo não mantém uma fonte de verdade única entre dispositivo, estado da veia hospedeira e opinião; outros segmentos ainda exigem casos próprios
crosswalk:
  laudousg_paths_checked:
    - packages/shared/src/clinicalModels/contracts.ts
    - packages/shared/src/clinicalModels/renderer.ts
    - apps/api/src/server/renderer/__tests__/clinical-models-v1.manual.ts
    - apps/web/src/components/laudar/ClinicalModelWorkspace.tsx
    - apps/mobile/src/features/generate/ClinicalModelWorkspace.tsx
    - LaudoUSG/Models/PendingClinicalModelContracts.swift
    - LaudoUSG/Models/ClinicalModelReportRenderer.swift
    - LaudoUSG/Features/ClinicalModels/ClinicalModelWorkspace.swift
  status: partial
  notes: o LaudoUSG já possui contrato compartilhado, bilateralidade, cateter e fase confirmada; ainda resume sistemas por território e não exige critérios estruturados de trombose por segmento
next_probe: estudar Doppler Arterial de Membro Superior e depois voltar aos limites entre trombo pericanular, trombose da veia hospedeira e trombose sem critérios completos
```

## Estrutura observada

O formulário separa lateralidade, veias profundas, veias superficiais, coleções, linfonodos, dispositivo, comparativos e recomendações. O estado inicial direito descreve subclávia, axilar, braquiais, radiais, ulnares, cefálica e basílica. A jugular interna é opcional, coerente com a decisão clínica já tomada para o LaudoUSG.

## Dispositivo e trombose relacionada

O módulo de dispositivo permite escolher tipo, veia hospedeira e achado. Um PICC adequado entrou somente em “achados complementares”. Ao trocar o achado para trombose da veia hospedeira, o corpo passou a descrevê-la, mas a veia basílica continuou normal no sistema superficial e a opinião final continuou afirmando normalidade.

Isso comprova uma inconsistência interna do concorrente: dispositivo, veia e conclusão não derivam necessariamente do mesmo estado clínico. O LaudoUSG deve conservar a relação explícita entre dispositivo, segmento, achado trombótico e conclusão, bloqueando combinações contraditórias.

## Trombose superficial da basílica

A alteração sintética substituiu a frase normal e levou para o corpo extensão curta, ecogenicidade, compressibilidade e ausência de fluxo. A opinião concluiu trombose superficial, porém terminou com o trecho curto “veia basílica direitas”, com erro de concordância.

O modelo oferece campos úteis para extensão medida, sinais inflamatórios e tromboflebite, mas esses limites não foram explorados nesta rodada. A seleção padrão já concluiu trombose sem exigir preenchimento manual de segmento ou extensão medida.

## Trombose profunda axilar

A seleção sintética da axilar trocou o estado normal por oclusão total, incompressibilidade, ausência de fluxo e conteúdo hipoecogênico. A opinião concluiu TVP, novamente com erro de concordância em “veia axilar direitas”. Não foi necessário preencher extensão nem outro critério além dos valores preselecionados pelo formulário.

## Restauração

O dispositivo foi desligado, basílica e axilar retornaram a “pérvia — sem alterações”, e o texto inicial normal reapareceu. O rascunho não foi finalizado nem enviado.

O cruzamento técnico está em [crosswalk-doppler-venoso-mmss-2026-10-02.md](../crosswalk-doppler-venoso-mmss-2026-10-02.md).
