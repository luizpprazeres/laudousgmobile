# Sprint 2 — Doppler obstétrico isolado e módulo Doppler opcional

## Status

Concluído em 30/08/2026. Implementação pronta para publicação na `main`.

## Objetivo

Separar o exame Doppler obstétrico puro do exame obstétrico completo com Doppler. A categoria `DOPPLER_OBSTETRICO` passa a produzir apenas a avaliação Doppler. Obstétrica e todos os Morfológicos passam a aceitar um módulo Doppler opcional, sem o usuário trocar de categoria.

## Comportamento esperado

- Doppler obstétrico isolado continua disponível como categoria própria na web e nos apps.
- Obstétrica + Doppler usa o modelo obstétrico da categoria atual e acrescenta técnica, achados Doppler e conclusões Doppler nos lugares correspondentes.
- Morfológico + Doppler faz a mesma composição sobre o trimestre selecionado, sem criar outra categoria.
- Sem ativar Doppler, Obstétrica e Morfológico permanecem byte-idênticos.
- Cervicometria e Doppler são complementos independentes e podem coexistir no mesmo exame.
- Web: a auxiliar ativa o complemento e preenche índices/medidas em uma seção própria.
- Mobile: o médico pode ditar o complemento; extração estruturada identifica os índices e o renderer compõe o texto.

## Modelo Clássico recebido para o Doppler isolado

### Comentários

Foram realizados vários cortes ultrassonográficos com equipamento com dispositivo de Doppler pulsado colorido e imagem bidimensional, de artérias maternas e fetais.

### Aspectos observados

- Índices de resistividade e pulsatilidade das artérias uterinas direita e esquerda.
- Índices de resistividade e pulsatilidade da artéria umbilical, com a observação da média de três medidas próxima à inserção placentária, ao abdome fetal e em alça livre.
- Índices de resistividade e pulsatilidade da artéria cerebral média.
- Índices de resistividade e pulsatilidade do ducto venoso.

### Conclusão normal

1) Índices de resistividade e pulsatilidade normais nas artérias uterinas, umbilical e cerebral média.
2) Ausência de sinais de incisuras.
3) Ausência de sinais de pré-centralização ou centralização.
4) Perfil hemodinâmico fetal normal, menor que 1,0.

## Decisões fechadas

- O título do exame isolado é `DOPPLERVELOCIMETRIA OBSTÉTRICA`.
- IR e IP são independentes em todos os vasos. Índice ausente é omitido, nunca vira lacuna nem é copiado do outro índice.
- O perfil hemodinâmico preserva a regra clínica já validada no produto: `1/RCP`, com normalidade abaixo de 1,0. Sem RCP, IPs calculáveis ou valor explícito, nenhuma conclusão de perfil é criada.
- O estilo Objetivo usa `TÉCNICA / ACHADOS / IMPRESSÃO`, preservando as mesmas evidências e conclusões do Clássico.
- Laudos históricos continuam sendo lidos pelo texto já persistido. Não houve migração destrutiva nem reinterpretação retroativa; o novo contrato vale para novas gerações.
- `DOPPLER_STANDALONE_V2` nasce ativo para novas gerações e permite rollback explícito para o writer antigo. A barreira contra falso-normal umbilical faz parte do módulo v2.

## Critérios de aceite

- [x] Novo schema do Doppler isolado cobre IR/IP por vaso, incisuras, centralização e perfil hemodinâmico sem placeholders inventados.
- [x] Modelos Clássico e Objetivo do Doppler isolado aparecem na Biblioteca.
- [x] Obstétrica e os três Morfológicos aceitam Doppler opcional nos dois estilos.
- [x] A ordem é estável: detalhe na técnica, bloco Doppler no fim dos achados e itens Doppler no fim da conclusão/impressão.
- [x] Doppler e Cervicometria podem ser ativados juntos, com ordem clínica definida e sem duplicação.
- [x] Web e mobile usam o mesmo contrato e o mesmo renderer.
- [x] Migração preserva leitura e sincronização do histórico já existente.
- [x] Goldens cobrem ausência parcial de índices, alterações hemodinâmicas, incisura, pré-centralização, centralização e dados insuficientes.

## Validação executada

- Golden clínico Doppler/composição: 26/26.
- Contrato de extração obstétrica/Doppler: 290/290.
- Extração por imagem com módulo opcional: 7/7.
- Modelos pendentes e Cervicometria: 35/35.
- Biblioteca projetada: 613/613; todas as categorias migradas cobertas.
- Seleção do caminho de geração e rollback: 17/17.
- `pnpm run typecheck`: 8/8 pacotes.
- Build de produção web e API: aprovado.
- `pnpm run test`: não há tasks automatizadas cadastradas no Turborepo; os gates manuais acima são a cobertura efetiva deste sprint.
- `pnpm run lint`: o repositório ainda abre o assistente interativo de configuração do ESLint nos três apps Next; não é um erro introduzido por esta story.
- Build global: web e API aprovados; o Lab continua bloqueado pela ausência preexistente de `NEXT_PUBLIC_SUPABASE_URL` no ambiente local.

## File list

- `apps/api/src/server/renderer/categories/dopplerObstetricoModule.ts`
- `apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts`
- `apps/api/src/server/renderer/categories/OBSTETRICA.ts`
- `apps/api/src/server/renderer/categories/MORFOLOGICO.ts`
- `apps/api/src/server/pipeline/dopplerOverlay.ts`
- `apps/api/src/server/pipeline/renderer.ts`
- `apps/api/src/server/pipeline/generationPathResolver.ts`
- `apps/api/src/server/env.ts`
- `apps/api/src/server/prompts/contracts/DOPPLER_OBSTETRICO.ts`
- `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts`
- `apps/api/src/server/vision/client.ts`
- `apps/api/src/server/vision/extractor.ts`
- `apps/api/src/server/vision/types.ts`
- `apps/api/src/app/api/analyze-image/route.ts`
- `apps/mobile/src/features/imaging/ImageAnalysisSheet.tsx`
- `apps/mobile/src/features/imaging/imageAnalysis.ts`
- `apps/web/src/lib/deterministic/organs/dopplerObstetrico.ts`
- `apps/web/src/lib/catalog/dopplerParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/src/lib/deterministic/organs/morfologico.ts`
- `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`
- `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/laudar/categoryPresentation.ts`
- `apps/web/src/lib/catalog/migradas.ts`
- `apps/web/src/lib/deterministic/index.ts`
- Gates e goldens relacionados em `apps/api/src/server/renderer/**/__tests__` e `apps/api/src/server/vision/vision-modules.manual.ts`.
