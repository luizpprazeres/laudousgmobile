# Caso funcional — Aparelho Urinário e coerência renal entre exames

```yaml
competitor: Laudário
observed_at: 2026-10-06T14:35:00-03:00
exam: Aparelho Urinário
surface: Laudos > Ultrassonografia > Aparelho Urinário, com comparação em Abdome Total e Doppler Aortorrenal
baseline:
  controls: rins em situação habitual, morfologia preservada, sem cálculo, cisto, massa ou dilatação; bexiga sem alteração
  report_structure: corpo por rim e bexiga, seguido de opinião; o mesmo painel renal aparece nos três exames comparados
scenarios:
  - id: obstrucao_ureteral_direita
    input: hidronefrose moderada à direita, ureter dilatado até o terço distal com calibre sintético de 0,7 cm e cálculo distal de 6 mm com artefato de cintilação selecionado
    cascades: a dilatação e o cálculo foram combinados no parágrafo do rim; a opinião passou a indicar ureterolitíase obstrutiva lateralizada
    output: localização, medida, grau de dilatação, extensão e calibre foram preservados; o artefato selecionado não apareceu no texto observado
    reset_verified: true
  - id: cistos_repetiveis
    input: primeiro cisto complexo suspeito no terço inferior, com medidas sintéticas de 2,4 x 2,1 x 1,8 cm e fluxo em parede/septos; segundo cisto adicionado sem preenchimento
    cascades: cada clique em adicionar criou um item numerado; o segundo item nasceu como cisto simples no terço superior
    output: o primeiro item trouxe medidas e vascularização; o segundo item vazio entrou imediatamente no corpo e na opinião como cisto simples
    reset_verified: true
  - id: paridade_abdome_total
    input: repetição do cenário de obstrução ureteral direita no painel renal do Abdome Total
    cascades: os mesmos controles e o mesmo encadeamento renal/ureteral foram exibidos
    output: corpo e opinião mantiveram os mesmos dados clínicos do Aparelho Urinário dentro do laudo abdominal
    reset_verified: true
evidence:
  observed: controles, subcampos condicionais, listas de cistos, corpo, opinião e restauração foram vistos na interface normal do navegador
  inferred: o painel renal é compartilhado internamente pelo concorrente; a equivalência de controles e resultados foi observada, mas a implementação interna não foi inspecionada
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/lib/deterministic/organs/urinaryShared.ts
    - apps/web/src/lib/deterministic/organs/rim.ts
    - apps/web/src/lib/deterministic/organs/viasUrinarias.ts
    - apps/web/src/lib/deterministic/organs/dopplerRenal.ts
    - apps/web/src/lib/catalog/abdomeParaCatalogo.ts
    - apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts
    - apps/web/src/lib/catalog/dopplerRenalParaCatalogo.ts
    - apps/api/src/server/renderer/categories/sharedUrinary.ts
    - apps/api/src/server/renderer/categories/VIAS_URINARIAS.ts
    - apps/api/src/server/renderer/categories/dopplerRenalWeb.ts
  status: partial
  notes: o LaudoUSG já reutilizava um módulo renal; esta rodada acrescentou ureter estruturado e bloqueio de lesões incompletas nos três exames. Listas repetíveis e variantes anatômicas renais continuam parciais.
next_probe: testar bilateralidade, dois cálculos no mesmo rim e dois cistos com tipos diferentes quando o formulário suportar achados repetíveis
```

O comportamento útil desta rodada é a identidade clínica do rim entre exames. A mesma alteração não deve exigir vocabulário ou caminhos diferentes conforme o card escolhido. O LaudoUSG já tinha essa base compartilhada e passou a incluir o ureter no mesmo contrato.

O comportamento que não deve ser reproduzido é publicar um achado apenas porque o usuário clicou em “adicionar”. No cenário de cistos, um item sem medida foi tratado como cisto simples e entrou no laudo. No LaudoUSG, uma lesão marcada permanece como pendência até receber os dados mínimos exigidos.

O estado foi restaurado depois de cada cenário. A sessão terminou limpa no Doppler Aortorrenal, sem finalizar, imprimir, copiar ou enviar laudo.
