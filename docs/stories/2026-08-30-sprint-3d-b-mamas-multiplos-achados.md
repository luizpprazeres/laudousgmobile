# Sprint 3D-B — Mamas com múltiplos achados por imagem

## Status

Concluída.

## Objetivo

Permitir vários achados na mesma mama e preencher essa lista a partir de até três imagens enviadas pelo celular, sem perder lesões nem delegar classificação clínica ao modelo de visão.

## Regras de segurança

- Cada lesão mantém lateralidade, medidas, localização e descritores próprios.
- Achado sem mama direita/esquerda identificável é recusado.
- Medidas são normalizadas para centímetros.
- A visão não atribui BI-RADS, não recomenda conduta e não classifica benignidade ou malignidade.
- O renderer canônico continua sendo o único responsável pela redação e pelas regras BI-RADS.
- Achados existentes são preservados; itens idênticos não são duplicados.
- O formato antigo de um achado por mama continua legível pelo adaptador.

## Critérios de aceite

- [x] A web permite adicionar e remover vários achados, inclusive do mesmo lado.
- [x] O adaptador envia todos os achados ao renderer canônico.
- [x] API aceita `MAMARIA`, valida lateralidade, tipo, medidas e descritores.
- [x] Android e iOS permitem câmera/galeria na categoria Mamária.
- [x] Até três imagens podem complementar a lista sem sobrescrever a anterior.
- [x] A web aplica a lista revisada recebida do celular.
- [x] BI-RADS não faz parte do contrato de visão.
- [x] Typechecks, testes e build iOS passam.

## Validação

- Contrato da API: 14/14 cenários aprovados.
- Adaptador multi-achado e mapeamento Companion: testes aprovados.
- Typecheck: API, Android e web aprovados.
- iOS: build aprovada e 4/4 testes específicos de imagem aprovados.

## File list

- `apps/api/src/server/vision/types.ts`
- `apps/api/src/server/vision/client.ts`
- `apps/api/src/server/vision/extractor.ts`
- `apps/api/src/server/vision/vision-modules.manual.ts`
- `apps/mobile/src/features/imaging/imageAnalysis.ts`
- `apps/mobile/src/features/companion/CompanionSheet.tsx`
- `apps/web/src/components/laudar/MamariaFormPanel.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/lib/deterministic/organs/mamaria.ts`
- `apps/web/src/lib/catalog/mamariaParaCatalogo.ts`
- `apps/web/src/lib/catalog/mamariaParaCatalogo.test.ts`
- `apps/web/src/lib/companion.ts`
- `apps/web/src/lib/companionStructured.ts`
- `apps/web/src/lib/companionStructured.test.ts`
- `LaudoUSG/Models/BiometricData.swift` no repositório iOS nativo
- `LaudoUSG/Services/ImageAnalysisService.swift` no repositório iOS nativo
- `LaudoUSGTests/ImageAnalysisServiceTests.swift` no repositório iOS nativo
