# Sprint 8 — celular como entrada do workspace

## Objetivo

Transformar o pareamento em um modo de trabalho contínuo de quatro horas. O celular continua na tela normal de achados e envia texto ou dados extraídos de imagens para preenchimento estruturado na web, sem acionar o motor de geração de laudos.

## Critérios de aceite

- [x] Código de pareamento permanece válido por 10 minutos.
- [x] Turno conectado expira quatro horas após a conexão efetiva.
- [x] Web não bloqueia o workspace com modal depois de conectar.
- [x] Web mantém indicador compacto e área expansível para entradas pendentes.
- [x] iOS e Android restauram a conexão e trocam o botão principal para `Enviar para a web`.
- [x] Extração de imagem envia payload estruturado; texto livre permanece evento separado.
- [x] Topo web não duplica o acesso às calculadoras.
- [x] `IG e datas` passa a `Datação`, com semanas e dias na mesma linha.
- [x] Navegação usa `Etapas do exame` na obstetrícia e `Estruturas` no musculoesquelético.
- [x] Aviso de normalidade e Reset ocupam menos espaço.

## Validação

- [x] Typecheck web.
- [x] Typecheck mobile React Native.
- [x] Build iOS Simulator sem assinatura.
- [x] Migração aplicada ao projeto Supabase `laudousgmobile`.
- [ ] Teste manual autenticado celular → web antes da publicação.

## Arquivos

- `apps/web/src/components/laudar/CompanionPanel.tsx`
- `apps/web/src/components/laudar/ExamSectionNav.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/laudar/OrganFormPanel.tsx`
- `apps/web/src/lib/companion.ts`
- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/mobile/app/generate.tsx`
- `apps/mobile/src/features/companion/CompanionSheet.tsx`
- `apps/mobile/src/features/imaging/ImageAnalysisSheet.tsx`
- `packages/db/src/sql/0026_companion_sessions.sql`
- `packages/db/src/sql/0027_companion_four_hour_sessions.sql`
- iOS: `CompanionSheet.swift`, `PlusSheet.swift`, `GenerateView.swift`, `GenerateViewModel.swift`
