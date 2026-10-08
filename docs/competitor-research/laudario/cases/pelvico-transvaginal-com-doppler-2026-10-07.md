# Caso funcional — Pélvico Transvaginal com Doppler

```yaml
competitor: Laudário
observed_at: 2026-10-07
exam: Pélvico Transvaginal com Doppler
surface: Laudos > Ultrassonografia > Ginecologia > Pélvico Transvaginal com Doppler (editor `pelvicoTransvaginalDoppler`)
baseline:
  controls: dezenove abas, da Técnica às Recomendações; a aba Doppler contém um único bloco, de artérias uterinas; o controle que registra esse Doppler vem marcado e abre IP, IR e VPS (cm/s) por lado, todos vazios
  report_structure: título com Doppler; técnica transvaginal simples; útero, miométrio, colo, endométrio e ovários normais; frase genérica de Doppler normal para o período; sem líquido livre; conclusão globalmente normal; nenhuma medida informada
scenarios:
  - id: modulo_doppler_desmarcado
    input: somente o controle de Doppler das artérias uterinas desmarcado
    cascades: a frase genérica de Doppler saiu do corpo; nada mais mudou
    output: o título continuou com Doppler; a técnica não registrou que o Doppler não foi feito; a conclusão continuou globalmente normal; nenhuma pendência, limitação ou alerta apareceu
    reset_verified: true
  - id: ip_uterina_direita_isolado
    input: partindo do baseline, somente IP da artéria uterina direita = 0,70 (sintético); IR e VPS à direita e os três campos à esquerda vazios
    cascades: a frase genérica de Doppler foi trocada por um bloco de dopplervelocimetria
    output: o bloco publicou só a artéria uterina direita com o IP informado; o lado esquerdo não foi citado como não avaliado nem como não medido; a conclusão continuou globalmente normal; não houve pendência, interpretação por fase ou idade, média dos IPs, percentil, incisura ou alerta
    reset_verified: true
restore:
  steps: modelo abandonado pelo link do catálogo e reaberto
  result: controle de Doppler marcado de novo, seis campos vazios, frase genérica de Doppler normal de volta ao corpo; o IP de 0,70 não permaneceu
evidence:
  observed: abas, conteúdo da aba Doppler, estado inicial do controle, baseline publicado, efeitos dos dois cenários e restauração, vistos na interface normal em 07/10/2026 com conta autorizada e dados sintéticos
  inferred: a frase genérica de Doppler normal parece estar ligada ao controle marcado, e não à existência de medidas; o título parece fixo pelo card; nenhuma fronteira foi testada além dos dois cenários
  not_observed: Doppler ovariano, de lesão, de mioma ou de endométrio dentro desta variante; incisura; recomendações; valores bilaterais; valores fora de qualquer faixa
crosswalk:
  file: ../crosswalk-pelvico-transvaginal-com-doppler-2026-10-07.md
  preflight_source: /tmp/laudario-pelvico-transvaginal-doppler-preflight-2026-10-07.md
  facts_source: /tmp/laudario-live-facts-pelvico-doppler-2026-10-07.md
next_probe: IP, IR e VPS nos dois lados; depois uma lesão ovariana com vascularização dentro desta variante
```

A sessão usou conta autorizada, interface normal e somente dados sintéticos. Nenhum laudo foi copiado, impresso, assinado, finalizado ou enviado, e nenhum endpoint privado foi consultado. A rodada se limitou ao baseline e a dois cenários. O texto do concorrente aparece apenas resumido.

## Baseline

`observado`: a aba Doppler da variante tem um único bloco, dedicado às artérias uterinas. Um controle de registro abre IP, IR e VPS em cm/s para cada lado. No estado inicial, esse controle já vem marcado, embora os seis campos estejam vazios.

`observado`: o laudo inicial traz título com Doppler e técnica transvaginal sem menção ao Doppler. O corpo declara normais útero, miométrio, colo, endométrio e ovários, inclui uma frase genérica de Doppler normal para o período e nega líquido livre. A conclusão é globalmente normal. Nenhuma medida foi informada.

## Cenário 1 — Módulo Doppler desmarcado

`observado`: desmarcar o controle das artérias uterinas retirou a frase genérica de Doppler do corpo e não alterou mais nada.

- O título continuou indicando Doppler.
- A técnica não registrou que o Doppler não foi feito.
- A conclusão continuou globalmente normal.
- Nenhuma pendência, limitação ou alerta apareceu.

O laudo ficou com título de exame com Doppler e sem nenhum resultado ou limitação de Doppler.

## Cenário 2 — IP isolado na artéria uterina direita

`observado`: com o controle marcado, informar apenas o IP direito de 0,70 substituiu a frase genérica por um bloco de dopplervelocimetria. Esse bloco listou apenas a artéria uterina direita e o IP informado. O lado esquerdo não apareceu como não avaliado nem como não medido. A conclusão continuou globalmente normal.

`observado`: não houve pendência, interpretação por fase do ciclo ou idade, média dos IPs, percentil, incisura nem alerta.

## Restauração

`observado`: o modelo foi abandonado pelo link do catálogo e reaberto. O controle de Doppler voltou marcado, os seis campos voltaram vazios e a frase genérica de Doppler normal voltou ao corpo. O IP de 0,70 não permaneceu.

## Comportamentos a registrar

- A normalidade Doppler do baseline é publicada sem nenhuma medida, apenas porque o controle nasce marcado.
- Com o módulo desligado, o título continua dizendo Doppler, sem que técnica ou conclusão registrem a ausência.
- Com um único valor, o lado sem medida desaparece em silêncio.
- A restauração funcionou sem resíduo.

As consequências para o LaudoUSG estão no [cruzamento](../crosswalk-pelvico-transvaginal-com-doppler-2026-10-07.md).
