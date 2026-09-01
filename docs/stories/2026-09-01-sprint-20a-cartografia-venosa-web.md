# Sprint 20A — fundação da cartografia venosa na web

## Objetivo

Portar para a web a base bilateral de quatro vistas já revisada no aplicativo e projetar nela os segmentos do mesmo `MapaVenoso` estruturado usado pelo mobile e pela API. O desenho continua sendo uma saída determinística; ele não redige nem classifica o laudo.

## Decisão de escopo

`DOPPLER_VENOSO_MMII` já possui schema estruturado, extração, writer protegido, mapa e renderização no mobile. A estação web ainda não possui a categoria nem o formulário correspondente. Por isso a 20A prepara o componente, a base e o fluxo de exportação, mas não mostra um botão solto em outra categoria nem publica um formulário clínico parcial.

A exposição na barra da estação ficará ligada junto da categoria web oficial, prevista na cobertura vascular. Até lá, o componente aceita somente `MapaVenoso`; não há amostra inventada nem transposição para Doppler de carótidas.

## Critérios de aceite

- [x] A web usa exatamente as mesmas dimensões e coordenadas de quatro vistas do pacote compartilhado.
- [x] Refluxo, varicosidade, trombose oclusiva, trombose parcial e recanalização preservam as cores canônicas.
- [x] O recolor parte do `MapaVenoso`, sem interpretação de texto no navegador.
- [x] O painel visual reconhece cartografia venosa e reutiliza PNG, PDF e envio à Sala.
- [x] O tipo enviado à Sala permanece `VENOSO_MMII`.
- [x] O PNG preserva a resolução nativa e o PDF usa orientação retrato, sem canvas desnecessariamente ampliado.
- [x] O asset é versionado e protegido por checksum.
- [x] A categoria incompleta não aparece na estação web.
- [ ] Distâncias de perfurantes, planta do pé/ponto J, Cockett e calibres finos entram na 20B.
- [ ] A sincronização bidirecional com formulário web entra quando a categoria oficial estiver disponível.

## Arquivos

- `apps/web/public/schemas/vascular/venous-4view-v1.png`
- `apps/web/public/schemas/vascular/manifest.json`
- `apps/web/public/schemas/vascular/README.md`
- `apps/web/src/components/visualSchemas/VenousSchema.tsx`
- `apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx`
- `apps/web/src/lib/visualSchemas/__tests__/venous-schema.manual.ts`
- `package.json`

## Validação executada

- `pnpm validate:sprint20` — checksum, dimensões, mapa estruturado, recolor e contrato da Sala aprovados.
- `pnpm validate:sprint18` e `pnpm validate:sprint19` — esquemas anteriores sem regressão.
- `pnpm typecheck` — oito pacotes aprovados.
- `pnpm --filter @laudousg/web build` — build de produção aprovado.
- Prévia real com refluxo, trombose e recanalização renderizada sobre o PNG e inspecionada.
- `git diff --check` — aprovado.
