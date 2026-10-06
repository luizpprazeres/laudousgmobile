# Caso complementar — lobulações fetais e defeito juncional no Doppler Aortorrenal

```yaml
competitor: Laudário
observed_at: 2026-10-06T17:31:14-03:00
exam: Doppler Aortorrenal
surface: Laudos > Ultrassonografia > Doppler Aortorrenal > Rim Direito
baseline:
  controls: rim direito tópico, contornos e parênquima preservados, sem variante selecionada
  report: descrição renal normal e opinião global dentro da normalidade
scenarios:
  - id: lobulacoes_fetais_direita
    input: lobulações fetais selecionadas no rim direito
    observed: o corpo passou a descrever indentações lobulares relacionadas às colunas de Bertin; a opinião trocou a normalidade por variante anatômica benigna
    not_observed: medida, recomendação, alteração parenquimatosa ou classificação patológica automática
    reset_verified: true
  - id: defeito_juncional_direito
    input: defeito juncional parenquimatoso selecionado no rim direito
    observed: o corpo passou a descrever uma linha hiperecogênica triangular do córtex anterossuperior em direção ao seio; a opinião registrou variante anatômica benigna
    not_observed: medida, recomendação ou diagnóstico tumoral automático
    reset_verified: true
  - id: coexistencia_das_variantes
    input: lobulações fetais e defeito juncional selecionados simultaneamente no rim direito
    observed: as duas descrições permaneceram no corpo; a opinião consolidou ambas em uma única variante anatômica benigna
    reset_verified: true
evidence:
  observed: controles, corpo, opinião, coexistência e restauração foram vistos na interface normal do navegador
  inferred: o painel parece compartilhado com outros exames, mas a implementação interna do concorrente não foi inspecionada
crosswalk:
  status: implemented_in_laudousg
  laudousg_scope: opções compartilhadas entre Abdome Total, Vias Urinárias e Doppler renal
  wording: redação original do LaudoUSG; nenhum texto do concorrente foi copiado
next_probe: ectopia renal com topografia explícita e rim em ferradura
```

As duas opções são independentes e não exigem medida. No LaudoUSG, cada uma recebe uma conclusão nominal para que o médico identifique o achado sem depender de uma conclusão genérica de variante anatômica. Ambas retiram apenas a normalidade do rim correspondente e podem coexistir com outras alterações selecionadas.

O estado foi restaurado ao modelo inicial após cada cenário e ao final da rodada. Nenhum laudo foi finalizado, copiado, impresso ou enviado.
