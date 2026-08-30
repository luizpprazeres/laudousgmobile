# Sprint 3B — Ditado do celular para a web

## Status

Concluído em 30/08/2026.

## Objetivo

Permitir que o médico dite uma observação no celular conectado ao turno da web. O próprio app grava e transcreve; somente o texto transcrito é enviado para a sessão Companion e a auxiliar continua responsável por acrescentar ou descartar a entrada.

## Limites deste incremento

- O arquivo de áudio não é armazenado no Supabase nem enviado diretamente à web.
- O áudio temporário é descartado pelo app após a tentativa de transcrição.
- A transcrição fica editável no celular antes do envio.
- O evento usa o tipo `transcript`, já previsto no contrato do Sprint 3.
- A web identifica visualmente que a entrada veio de ditado.
- Nenhuma transcrição altera o laudo sem confirmação na web.
- Extração estruturada de medidas e comandos por categoria permanece para os próximos incrementos.

## Critérios de aceite

- [x] Android grava, transcreve e permite revisar o texto antes de enviar.
- [x] iOS grava, transcreve e permite revisar o texto antes de enviar.
- [x] A web diferencia texto digitado de ditado.
- [x] A auxiliar consegue acrescentar ou descartar a transcrição.
- [x] O arquivo de áudio é descartado e não é persistido na sessão Companion.
- [x] Sessão encerrada ou expirada rejeita o envio.
- [x] Typecheck, builds e testes passam nas plataformas alteradas.

## Validação executada

- Contrato de banco em produção confirmado com suporte ao tipo `transcript`; nenhuma migração nova foi necessária.
- Typecheck web e Android aprovado.
- Build de produção web e export do app Android aprovados.
- Build iOS aprovado no simulador iOS 26.4.
- Suíte iOS: 39 testes executados, 3 WHO já marcados como pendentes, zero falhas; 342/342 casos FMF mantidos.

## File list

- `apps/mobile/src/features/companion/CompanionSheet.tsx`
- `apps/mobile/src/features/companion/companion.ts`
- `apps/web/src/components/laudar/CompanionPanel.tsx`
- `LaudoUSG/Components/Sheets/CompanionSheet.swift` no repositório iOS nativo
- `LaudoUSG/Services/CompanionService.swift` no repositório iOS nativo
