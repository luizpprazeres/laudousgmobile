# Caso complementar — variantes renais no Doppler Aortorrenal

```yaml
competitor: Laudário
observed_at: 2026-10-06T16:45:55-03:00
exam: Doppler Aortorrenal
surface: Laudos > Ultrassonografia > Doppler Aortorrenal > Rim Direito
baseline:
  controls: rim direito em situação habitual, contornos e parênquima preservados, sem variante anatômica selecionada
  report_structure: parágrafo renal direito, demais territórios vasculares e opinião do relatório
scenarios:
  - id: coluna_bertin_direita
    input: coluna de Bertin selecionada no rim direito
    cascades: o parágrafo renal ganhou uma descrição morfológica focal; a normalidade global foi substituída por uma conclusão de variante anatômica
    output: lado direito preservado; sem medida, recomendação ou diagnóstico patológico automático
    reset_verified: true
  - id: duplicacao_sistema_coletor_direita
    input: duplicação piélica selecionada como situação do rim direito
    cascades: o parágrafo renal ganhou a divisão do seio renal; a opinião passou a registrar anomalia congênita lateralizada
    output: duplicidade do sistema coletor preservada no rim direito; nenhuma medida foi criada
    reset_verified: true
  - id: pelve_extrarrenal_direita
    input: pelve extrarrenal selecionada no rim direito
    cascades: o parágrafo renal ganhou a configuração extrarrenal; a opinião voltou a tratar o achado como variante anatômica
    output: lado direito preservado e ausência de medida inventada
    reset_verified: true
evidence:
  observed: controles, mudança do corpo, mudança da opinião e restauração foram vistos na interface normal do navegador
  inferred: o mesmo painel renal usado no concorrente em outros exames provavelmente compartilha as variantes, mas a implementação interna não foi inspecionada
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/lib/deterministic/organs/urinaryShared.ts
    - apps/web/src/lib/catalog/abdomeParaCatalogo.ts
    - apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts
    - apps/web/src/lib/catalog/dopplerRenalParaCatalogo.ts
    - apps/api/src/server/renderer/categories/sharedUrinary.ts
    - apps/api/src/server/renderer/catalog/__tests__/shared-urinary-organs-ponta-a-ponta.manual.ts
  status: partial
  notes: coluna de Bertin, pelve extrarrenal e duplicidade do sistema coletor foram acrescentadas ao contrato Web/API compartilhado. Cálculos e cistos simples passaram a aceitar coleções individualizadas no Web, com compatibilidade de rascunhos antigos. Lobulações fetais e defeito juncional foram observados na rodada complementar seguinte.
next_probe: ver cases/lobulacoes-defeito-juncional-doppler-aortorrenal-2026-10-06.md
```

O requisito aproveitado é estrutural: a variante deve ser escolhida no mesmo bloco renal e produzir o mesmo resultado em Abdome Total, Vias Urinárias e Doppler renal. A redação do LaudoUSG foi escrita do zero e evita afirmar ausência de dilatação como parte da pelve extrarrenal, pois esse estado pode coexistir com outro achado selecionado.

O estado foi restaurado ao modelo inicial após os três cenários. Nenhum laudo foi finalizado, copiado, impresso ou enviado.
