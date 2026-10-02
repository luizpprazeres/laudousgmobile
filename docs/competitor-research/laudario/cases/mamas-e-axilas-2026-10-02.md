# Laudário — Mamas e Axilas

Observado em 02/10/2026, com dados exclusivamente sintéticos. O modelo foi restaurado ao estado normal e o catálogo de exames foi reaberto ao final. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-02T10:38:35-03:00
exam: Mamas e Axilas
surface: Laudos > Ultrassonografia > Mama > Mamas e Axilas
baseline:
  controls: composição fibroglandular moderada; avaliação linfonodal habitual; sem cistos, nódulos ou outras lesões ativas
  report_structure: técnica; análise das mamas e cadeias linfonodais; opinião; BI-RADS; recomendações; referências
scenarios:
  - id: normal_bilateral
    input: nenhuma alteração sintética
    cascades: BI-RADS 1 e rastreamento de rotina já aparecem no estado inicial
    output: exame bilateral normal, incluindo axilas e cadeias regionais
    reset_verified: true
  - id: cisto_simples_direito
    input: cisto anecoico de paredes finas, 0,8 x 0,5 x 0,6 cm, mama direita, 10 horas
    cascades: BI-RADS 2; recomendação de rotina; marcador C1 no cartograma
    output: corpo preservou tipo, lado, relógio e medidas; classificação e recomendação foram atualizadas
    reset_verified: true
  - id: nodulo_solido_suspeito_direito
    input: nódulo 1,4 x 1,0 x 1,2 cm, mama direita, 10 horas, a 3,0 cm da papila e 0,8 cm da pele, irregular, espiculado, não paralelo, com sombra, microcalcificações, fluxo interno e distorção arquitetural
    cascades: BI-RADS avançou de 3 para 4 e depois 5 conforme os descritores; recomendações de diagnóstico tecidual e avaliação especializada; marcador N1 no cartograma
    output: corpo preservou topografia, medidas, distâncias e descritores; conclusão e recomendações acompanharam a categoria automática
    reset_verified: true
evidence:
  observed: abas, controles, laudo, BI-RADS, recomendações e cartograma vistos na interface normal do navegador
  inferred: a categoria é recalculada a cada descritor; não foi estabelecido se o motor automático produz 4A, 4B ou 4C, vistos apenas como opções manuais
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/lib/deterministic/organs/mamaria.ts
    - apps/web/src/lib/catalog/mamariaParaCatalogo.ts
    - apps/web/src/lib/calculators/mamariaBiradsSugestao.ts
    - apps/web/src/components/laudar/MamariaFormPanel.tsx
    - apps/web/src/components/laudar/MamariaBiradsPanel.tsx
    - apps/web/src/components/visualSchemas/BreastSchema.tsx
    - apps/api/src/server/renderer/categories/MAMARIA.ts
    - apps/api/src/server/sala/reportContract.ts
    - apps/mobile/src/shared/calculators/birads.ts
  status: partial
  notes: núcleo clínico amplo; faltam gates obrigatórios para lesão incompleta e vínculo inequívoco entre cartograma, laudo e Sala
next_probe: testar múltiplos nódulos e linfonodos axilares individualizados e verificar se alguma combinação produz automaticamente BI-RADS 4A, 4B ou 4C
```

## Estrutura do modelo

O formulário separa dados do paciente, técnica, indicação, cirurgias, composição, implantes, cistos, nódulos, ectasias, outras lesões, pele e subcutâneo, planos musculares, linfonodos, comparativos, mama acessória, BI-RADS, achados adicionais, cartograma e recomendações.

O estado inicial já descreve mamas e cadeias linfonodais como normais, atribui BI-RADS 1 e inclui rastreamento de rotina. A tela cita o manual ACR BI-RADS de 2025. A normalidade, portanto, deriva de controles preselecionados ao abrir o modelo.

## Cenário 1 — estado normal bilateral

**Entrada:** nenhuma alteração selecionada.

**Observado:** o laudo organizou técnica, análise, opinião, classificação e recomendação. A avaliação linfonodal habitual incluía axilares, infraclaviculares, mamárias internas e supraclaviculares, além do padrão Doppler hilar. O exame também negava parênquima mamário extranumerário nas axilas.

**Implicação:** um fluxo equivalente precisa declarar com clareza quais estruturas foram realmente avaliadas. Abrir o modelo não deve bastar para afirmar normalidade de cadeias adicionais que o médico não confirmou.

**Reset verificado:** verdadeiro; o cenário não alterou o estado-base.

## Cenário 2 — cisto simples direito

**Entrada:** cisto sintético anecoico, de paredes finas, sem septos, medindo 0,8 × 0,5 × 0,6 cm, na mama direita às 10 horas.

**Observado:** o corpo preservou tipo, lado, posição e três medidas. A classificação automática mudou para BI-RADS 2 e a recomendação permaneceu conservadora. Ao marcar o cartograma, o sistema posicionou C1 na mama direita às 10 horas; a inclusão do desenho no documento continuou como decisão separada.

**Implicação:** achado, classificação, recomendação, marcação visual e publicação do desenho são estados distintos. No LaudoUSG, a sugestão pode auxiliar, mas a categoria final deve continuar explicitamente confirmada pelo médico.

**Reset verificado:** verdadeiro; o cisto foi desativado e o laudo retornou a BI-RADS 1. Os valores permaneceram armazenados no formulário, porém inativos e sem efeito no texto.

## Cenário 3 — nódulo sólido suspeito direito

**Entrada:** nódulo sintético medindo 1,4 × 1,0 × 1,2 cm, a 3,0 cm da papila e 0,8 cm da pele, na mama direita às 10 horas. Após observar o estado inicial, foram selecionados forma irregular, margem espiculada, orientação não paralela, sombra posterior, microcalcificações no interior, fluxo interno significativo e distorção arquitetural.

**Observado:** com a morfologia inicialmente oval, circunscrita e paralela, a interface atribuiu BI-RADS 3 e seguimento de curto prazo. A forma irregular elevou a categoria para 4; a combinação final elevou para 5 e substituiu o seguimento por diagnóstico tecidual e avaliação especializada. O cartograma recebeu N1 automaticamente na topografia informada.

Também foi observada uma fragilidade: ativar o nódulo antes de preencher medidas já produziu descrição com marcador de medida incompleta, BI-RADS 3 e seguimento. O diagnóstico e a recomendação surgiram sem que o achado estivesse suficientemente documentado.

**Implicação:** o LaudoUSG deve bloquear classificação, conclusão e recomendação quando faltarem os dados mínimos do achado. A pendência precisa ser objetiva e visível ao médico; não deve ser removida silenciosamente ao chegar à Sala.

**Reset verificado:** verdadeiro; o nódulo foi desativado e o estado normal com BI-RADS 1 e rastreamento de rotina voltou. Os campos preenchidos permaneceram em cache, mas sem efeito enquanto o achado estava inativo.

## BI-RADS e recomendações

A aba BI-RADS exibe a categoria automática e permite substituição manual de 0 a 6, incluindo 4A, 4B e 4C. Nos cenários estudados, a classificação automática dirigiu a recomendação. A aba de recomendações separa o bloco publicado de itens opcionais como correlação clínica, ressonância, seguimento, mamografia, biópsia, avaliação especializada e texto livre.

O estudo observou BI-RADS automático genérico 4 e as subcategorias 4A, 4B e 4C apenas como opções de substituição manual. Não foi estabelecido se o motor automático produz essas subcategorias. O comportamento é referência de produto, não validação clínica da regra utilizada pelo concorrente.

## Cartograma

O mapa usa relógio mamário e diferencia cisto de nódulo por identificadores. No cisto, a marcação dependeu da opção de enviar ao cartograma; no nódulo, o marcador foi sincronizado automaticamente. Em ambos os casos, publicar o desenho no laudo permaneceu independente.

Uma implementação segura precisa derivar texto e esquema da mesma lesão estruturada, conservar um identificador estável e vincular o esquema ao laudo específico. Um fallback apenas por categoria pode associar um desenho antigo a outro exame de mama.

## Próximas sondagens

O próximo lote de Mamas e Axilas deve testar múltiplas lesões, calcificações fora de nódulo, implantes, comparativos, linfonodos individualizados e se alguma combinação produz automaticamente 4A, 4B ou 4C. A prioridade geral do estudo passa agora para Avaliação Multiparamétrica Hepática e Elastografia Hepática.

O cruzamento técnico inicial está em [crosswalk-mamas-e-axilas-2026-10-02.md](../crosswalk-mamas-e-axilas-2026-10-02.md).
