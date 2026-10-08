# Caso funcional — Aparelho Urinário com Doppler

```yaml
competitor: Laudário
observed_at: 2026-10-07
exam: Aparelho Urinário com Doppler
surface: Laudos > Ultrassonografia > Urologia > Aparelho Urinário com Doppler
baseline:
  controls: painéis renais anatômicos com os mesmos controles detalhados já vistos em Aparelho Urinário (06/10) e Doppler Aortorrenal (03/10 e 06/10); nenhuma medida preenchida
  report_structure: o modelo inicial publica normalidade anatômica dos dois rins, bexiga normal, aorta normal e artérias renais e intrarrenais normais
scenarios:
  - id: coluna_bertin_direita
    input: somente coluna de Bertin marcada no rim direito
    cascades: nenhuma outra estrutura mudou
    output: o corpo descreveu proeminência de tecido cortical entre as pirâmides; a conclusão registrou variante anatômica sem significado patológico; as demais estruturas permaneceram normais
    reset_verified: true
  - id: arteria_renal_direita_nao_avaliada
    input: somente artéria renal direita marcada como não avaliada por limitação técnica
    cascades: as afirmações vasculares normais do lado direito foram retiradas
    output: a conclusão registrou a não avaliação; o corpo acrescentou causas específicas da limitação (interposição gasosa, obesidade e calcificações) sem que nenhuma causa tivesse sido selecionada
    reset_verified: true
restore:
  steps: modelo reaberto; coluna de Bertin apareceu desmarcada; janela direita boa, artéria direita pérvia e padrão normal apareceram restaurados como padrões
  result: laudo de baseline restaurado
evidence:
  observed: baseline, equivalência visual dos painéis renais, os dois cenários e a restauração foram vistos na interface normal do navegador em 07/10/2026, com conta autorizada e dados sintéticos
  source: /tmp/laudario-live-facts-A.md
  inferred: o painel renal é provavelmente compartilhado internamente com Aparelho Urinário e Doppler Aortorrenal; a implementação não foi inspecionada
  not_observed: IR, TA, IA e ΔIR intrarrenais; jatos ureterais ao Doppler; artefato de cintilação; vascularização de lesão renal; recomendações; cenários de obstrução ou de alteração bilateral
crosswalk:
  file: ../crosswalk-aparelho-urinario-com-doppler-2026-10-07.md
  preflight_source: /tmp/laudario-aparelho-urinario-doppler-preflight-2026-10-07.md
next_probe: obstrução ureteral unilateral com cintilação, jato ureteral ausente e IR assimétrico, um passo por vez
```

A sessão usou a conta autorizada e a interface normal. Foram usados três estados: o baseline e dois cenários sintéticos, cada um com uma única variável. Nenhum dado de paciente foi usado. O laudo não foi copiado, impresso, assinado, finalizado nem enviado. Os trechos do concorrente aparecem apenas parafraseados. Fonte dos fatos ao vivo: `/tmp/laudario-live-facts-A.md`.

## Baseline

`observado`: o modelo abre com um laudo normal completo. Afirma normalidade anatômica dos dois rins, da bexiga, da aorta e das artérias renais e intrarrenais, embora nenhuma medida tenha sido preenchida.

`observado`: os painéis renais anatômicos repetem os controles detalhados já documentados em Aparelho Urinário e Doppler Aortorrenal. A variante com Doppler não cria um vocabulário renal próprio.

`inferido`: a normalidade vascular inicial é presumida pelo modelo, e não confirmada pelo médico, porque nenhum controle foi acionado antes da publicação.

## Cenário 1 — Coluna de Bertin à direita

`observado`: marcar somente a coluna de Bertin no rim direito acrescentou ao corpo uma descrição de proeminência cortical entre as pirâmides. A conclusão passou a registrar variante anatômica sem significado patológico. As demais estruturas continuaram normais.

O comportamento é coerente com o mesmo achado estudado no Doppler Aortorrenal em 06/10 (`variantes-renais-doppler-aortorrenal-2026-10-06.md`). A lateralidade foi preservada e nenhuma estrutura vascular mudou.

## Cenário 2 — Artéria renal direita não avaliada

`observado`: marcar somente a artéria renal direita como não avaliada por limitação técnica retirou as afirmações vasculares normais daquele lado. A conclusão passou a registrar que a artéria não foi avaliada.

`observado`: o corpo acrescentou causas específicas para a limitação, como interposição gasosa, obesidade e calcificações, sem que nenhuma delas tivesse sido selecionada.

**Defeito confirmado no concorrente:** causas presumidas. A limitação é um fato técnico selecionado pelo médico, mas a causa publicada não foi informada. Esse comportamento não deve ser reproduzido.

## Restauração

`observado`: o modelo foi reaberto. A coluna de Bertin apareceu desmarcada, enquanto a janela direita boa, a artéria direita pérvia e o padrão normal apareceram restaurados como padrões. O laudo voltou ao baseline.

## O que fica para a próxima rodada

Esta sessão não testou índices intrarrenais, jatos ureterais, artefato de cintilação, vascularização de lesão renal nem recomendações. Esses pontos continuam pendentes e estão descritos no preflight e no crosswalk.
