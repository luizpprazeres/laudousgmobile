# Sprint 3D-A — Tireoide por imagem para a web

## Status

Concluída.

## Objetivo

Extrair no celular as medidas da tireoide e de múltiplos nódulos e enviá-las como dados estruturados para o formulário aberto na web.

## Regras

- A imagem permanece temporária no celular; somente os dados revisados seguem pela sessão Companion.
- Medidas em milímetros são convertidas deterministicamente para centímetros.
- Nódulo sem lobo ou istmo identificável não é aplicado.
- A extração não diagnostica, não afirma normalidade e não produz TI-RADS ou nota de Domingos.
- Descritores entram somente quando explícitos; ausência de informação não vira automaticamente `sem` ou `normal`.
- O motor canônico existente continua responsável pelos cálculos depois que o usuário revisa e aplica os campos.
- Dados já preenchidos são preservados e nódulos idênticos não são duplicados.

## Critérios de aceite

- [x] API aceita `TIREOIDE` e valida medidas, lados e descritores.
- [x] Android e iOS permitem câmera/galeria na categoria Tireoide.
- [x] Até três imagens podem complementar lobos, istmo e nódulos.
- [x] A web mostra resumo antes de aplicar.
- [x] A web preenche os eixos e cria todos os nódulos válidos.
- [x] Nódulos existentes e campos não presentes na imagem são preservados.
- [x] Typechecks, testes e builds passam.

## Validação

- Contrato e parser da API: 11/11 cenários manuais aprovados.
- Mapeamento estruturado da web: teste aprovado.
- Typecheck: API, Android e web aprovados.
- Build de produção: API e web aprovadas.
- iOS: 40 testes aprovados, com 3 casos WHO preexistentes explicitamente ignorados.
- Supabase: `companion_events.payload` confirmado como `jsonb`; `structured_findings` e objeto JSON já são aceitos, sem migração.

## File list

- `apps/api/src/server/vision/types.ts`
- `apps/api/src/server/vision/client.ts`
- `apps/api/src/server/vision/extractor.ts`
- `apps/api/src/server/vision/vision-modules.manual.ts`
- `apps/mobile/src/features/imaging/imageAnalysis.ts`
- `apps/mobile/src/features/companion/CompanionSheet.tsx`
- `apps/web/src/lib/companion.ts`
- `apps/web/src/lib/companionStructured.ts`
- `apps/web/src/lib/companionStructured.test.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `LaudoUSG/Models/BiometricData.swift` no repositório iOS nativo
- `LaudoUSG/Services/ImageAnalysisService.swift` no repositório iOS nativo
- `LaudoUSGTests/ImageAnalysisServiceTests.swift` no repositório iOS nativo
