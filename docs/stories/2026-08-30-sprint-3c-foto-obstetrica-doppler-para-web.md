# Sprint 3C — Foto obstétrica/Doppler para a web

## Status

Concluída.

## Objetivo

Usar no celular a análise de imagem já existente para extrair biometria e índices Doppler e enviá-los como campos estruturados ao laudo aberto na web. A imagem é temporária; apenas as medidas revisadas seguem pela sessão Companion.

## Regras

- Obstétrica e Morfológico podem receber biometria e o módulo Doppler complementar na mesma extração.
- Doppler obstétrico isolado recebe somente os índices Doppler; biometria eventualmente vista na imagem não entra nessa categoria.
- A web mostra categoria e resumo das medidas antes de preencher os campos.
- A aplicação é explícita e abre a categoria/seção correspondente para revisão final.
- O payload não contém a imagem, apenas categoria, medidas e resumo.
- Nenhuma classificação clínica é inferida no transporte. Cálculos e redação continuam nos motores existentes.

## Critérios de aceite

- [x] Android seleciona até três imagens, extrai e envia dados estruturados.
- [x] iOS faz o mesmo com galeria ou câmera.
- [x] A web diferencia medidas extraídas de texto/ditado.
- [x] Obstétrica e Morfológico ativam o Doppler complementar quando há índices.
- [x] Doppler obstétrico isolado não recebe biometria.
- [x] IP médio das uterinas é calculado somente quando os dois lados foram extraídos.
- [x] Aplicar preserva campos já preenchidos que não vieram na imagem.
- [x] Typecheck, testes e builds passam.

## File list

- `apps/mobile/src/features/companion/CompanionSheet.tsx`
- `apps/mobile/src/features/companion/companion.ts`
- `apps/mobile/src/features/imaging/imageAnalysis.ts`
- `apps/mobile/app/generate.tsx`
- `apps/web/src/lib/companion.ts`
- `apps/web/src/lib/companionStructured.ts`
- `apps/web/src/lib/companionStructured.test.ts`
- `apps/web/src/components/laudar/CompanionPanel.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `LaudoUSG/Components/Sheets/CompanionSheet.swift` no repositório iOS nativo
- `LaudoUSG/Components/Sheets/ImageAnalysisSheet.swift` no repositório iOS nativo
- `LaudoUSG/Features/Generate/GenerateView.swift` no repositório iOS nativo
- `LaudoUSG/Services/CompanionService.swift` no repositório iOS nativo
- `LaudoUSG/Services/ImageAnalysisService.swift` no repositório iOS nativo

## Validação

- Mapper estruturado: aprovado para Obstétrica, Morfológico e Doppler isolado.
- Typecheck web e Android: aprovado.
- Build iOS: aprovado.
- Testes iOS: 39 executados, 36 aprovados e 3 ignorados por pendência anterior da tabela WHO; nenhuma falha.
