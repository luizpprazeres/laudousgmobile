# Abdome Total — Laudário × LaudoUSG

Data da revisão: 02/10/2026. O cruzamento cobre somente os três cenários sintéticos observados nesta rodada. A redação do concorrente não foi copiada; foram comparados controles, dependências e resultado clínico.

## Síntese

Esteatose leve e cálculo vesicular único móvel já estão cobertos pelo renderer canônico do LaudoUSG. A Web possui controles estruturados para ambos. Nos apps, o fluxo comum de Abdome Total ainda depende de texto livre, extração e renderer da API.

A diferença confirmada é a hepatopatia aguda com espessamento reativo da vesícula: o contrato atual não representa esse cenário nem a dependência entre os dois órgãos. Um texto livre pode atravessar por caminho generativo, mas isso não constitui regra determinística nem garante conclusão coerente.

## Esteatose leve

**Web: presente.** O controle “Esteatose leve” está em `apps/web/src/lib/deterministic/organs/figado.ts:45`, o adaptador produz `tipo: esteatose` e `grau: leve` em `apps/web/src/lib/catalog/abdomeParaCatalogo.ts:113`, e o renderer descreve aumento discreto da ecogenicidade e conclui esteatose leve em `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:153`.

**Android/RN: parcial.** Há atalho em `apps/mobile/app/generate.tsx:1206`, mas seu texto inclui atenuação sonora posterior. A extração canônica usa aumento discreto para grau leve e associa atenuação a grau moderado em `apps/api/src/server/renderer/extraction.ts:195`. O golden leve proíbe atenuação sonora em `tests/golden-deterministico/cases/abdomen-det-02-esteatose-leve.json:4`. O atalho precisa ser alinhado à fonte de verdade.

**iOS: presente na entrada, dependente da API.** O atalho existe em `LaudoUSG/Features/Generate/GenerateViewModel.swift:47`, é inserido nos achados por `GenerateViewModel.swift:304` e enviado ao `/api/generate`. Não há renderer local nem teste específico do atalho.

## Hepatopatia aguda e vesícula reativa

**Web e contrato canônico: ausente.** As opções hepáticas não incluem hepatite aguda em `apps/web/src/lib/deterministic/organs/figado.ts:45`, e o schema de Abdome Total não possui tipo correspondente em `apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts:33`. Fígado e vesícula são adaptados e renderizados independentemente, sem regra de cascata.

**Android/RN e iOS: parcial apenas pelo texto livre.** Os apps conseguem enviar o ditado integral ao backend, mas não oferecem atalho, controles estruturados ou validação dessa dependência. No backend, achados fora do catálogo seguem para `tipo: outro` e um caminho generativo isolado em `apps/api/src/server/pipeline/renderer.ts:146`. A regra atual de parede vesicular espessada pode sugerir colecistite aguda, mas não reconhece contexto reativo por hepatite em `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:224`.

**Gap confirmado:** falta um cenário canônico revisável para hepatopatia aguda, com achados hepáticos explícitos, espessamento vesicular reativo opcional/derivado, exclusão de sinais de colecistite e conclusão coerente. A cascata deve continuar editável pelo médico.

## Cálculo vesicular único móvel de 1,2 cm

**Web e renderer: presente.** Quantidade, dimensão e mobilidade estão em `apps/web/src/lib/deterministic/organs/vesicula.ts:11`; o adaptador cria litíase única e móvel e converte 12 mm para 1,2 cm em `apps/web/src/lib/catalog/abdomeParaCatalogo.ts:76` e `:179`. O renderer descreve mobilidade, medida e sombra e conclui litíase em `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:249`.

Há um risco de confirmação implícita: “móvel” começa selecionado na Web e o renderer também assume mobilidade quando o campo não é informado, em `apps/web/src/lib/deterministic/organs/vesicula.ts:88` e `apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts:203`. O comportamento deve exigir que mobilidade tenha sido realmente avaliada.

**Android/RN e iOS: parcial na experiência.** Não há card estruturado nem atalho; o achado entra por ditado ou texto livre. O núcleo da API possui schema e renderer, e há casos sintéticos para 1,2 cm em `apps/api/src/server/renderer/__tests__/abdomen-objetivo-golden.manual.ts:107` e para conversão de 12 mm em `apps/api/src/server/renderer/__tests__/abdomen-23a1-clinical-matrix.manual.ts:126`.

## Gates e próximos requisitos

O gate `pnpm validate:clinical-review:23a1` está vermelho em uma asserção do laudo normal antes de chegar a esses cenários, em `apps/api/src/server/renderer/__tests__/abdomen-23a1-clinical-matrix.manual.ts:105`. Portanto, a cobertura existente do cálculo não equivale a gate amplo verde.

Os próximos requisitos originais são: corrigir o atalho móvel de esteatose leve; modelar hepatopatia aguda e vesícula reativa de forma determinística; exigir confirmação de mobilidade do cálculo; e adicionar testes dos três fluxos desde a entrada dos clientes até o laudo e a Sala. A redação final seguirá o estilo Domingos e revisão médica antes de ativação.
