# W12 — Miomas: classificação FIGO vinculada à localização, ao corpo e à conclusão (NA FILA)

Pedido do Dr. Luiz (10/10/2026). Duas superfícies: **web** (formulário da pelve) e **mobile** (ditado → prompt do writer
dedicado da pelve, Sonnet 5.5).

## Web — formulário da pelve

- **Vínculo FIGO ↔ localização, nos dois sentidos**: escolher a categoria FIGO preenche a localização correspondente
  (ex.: FIGO 4 → intramural) e escolher a localização sugere/restringe a categoria FIGO. O corpo do laudo e a conclusão saem
  coerentes com a mesma escolha (hoje a descrição pode divergir da conclusão e da categoria).
- **Lista suspensa** onde hoje há a classificação (intramural, subseroso…), com as opções **corretas**, no padrão FIGO
  (PALM-COEIN) — o Luiz deu a direção ("submucoso, intramural, subseroso com mais de 50% intramural e assim por diante");
  confirmar o texto final de cada opção com ele:
  | FIGO | Localização |
  |---|---|
  | 0 | submucoso pediculado intracavitário |
  | 1 | submucoso com menos de 50% intramural |
  | 2 | submucoso com 50% ou mais intramural |
  | 3 | intramural em contato com o endométrio (100% intramural) |
  | 4 | intramural |
  | 5 | subseroso com 50% ou mais intramural |
  | 6 | subseroso com menos de 50% intramural |
  | 7 | subseroso pediculado |
  | 8 | outros (cervical, parasita, ligamento largo…) |
  | 2-5 (híbrido) | submucoso e subseroso, cada parte com menos da metade do diâmetro na cavidade endometrial e na peritoneal |
- **Topografia/lateralidade também em lista**: à esquerda, à direita, em região fúndica, parede anterior, parede posterior,
  corpo, istmo… (levantar dos laudos finais quais o Luiz usa).
- Já existe trabalho relacionado: contrato FIGO v2 dormente (`0a3a01df`), "não reduzir FIGO híbrida a categoria simples"
  (`6ffaf4d4`), coleção de miomas da pelve (`0d77ac2d`), "unificar fluxo seguro da pelve" (`5515c182`). Partir deles.

## Mobile — prompt do writer dedicado da pelve

- Associar localização ↔ FIGO nos dois sentidos, conforme o que o médico ditar (só a categoria, só a localização, ou os dois).
- Corpo e conclusão claros para: **1 mioma**; **múltiplos** (descrever até **3**); **útero miomatoso** (inúmeros, quando não
  dá para medir todos). Padrões reais dos laudos finais de 90 dias, como na W9/W10a.
- Achados do smoke de 10/10 (Sonnet, ditado sintético): mioma "FIGO 4" saiu sem a classificação no corpo; conclusão com
  "Útero de [REVISAR: volume…]" — conferir junto com a revisão W13.

## Método

O da W9/W10 (placar → padrões reais → mudança enxuta → bancada pela assinatura com `BENCH_MODEL` explícito → juiz na rodada
final), mais testes da web (adaptador/formulário/navegador) como na W6. Nada de push/deploy/banco sem GO.
