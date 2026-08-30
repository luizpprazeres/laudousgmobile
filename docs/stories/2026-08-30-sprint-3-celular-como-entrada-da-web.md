# Sprint 3 — Celular como entrada da web

## Status

Concluído em 30/08/2026.

## Objetivo

Criar o pareamento inverso à Sala do Auxiliar: o laudo fica aberto na web e o celular autenticado na mesma conta envia entradas para essa sessão. O primeiro incremento entrega texto curto com revisão explícita; áudio, imagem e dados estruturados reutilizarão o mesmo contrato.

## Limites deste incremento

- O código de pareamento é descartável e vale por 10 minutos.
- A sessão resgatada vale por até 10 horas, sobrevive a reconexões e pode ser encerrada pela web.
- Apenas um celular autenticado na mesma conta pode resgatar a sessão.
- O celular não recebe histórico, configurações nem permissão para editar diretamente o laudo.
- Texto recebido aparece como entrada pendente. A auxiliar decide copiar para o laudo ou descartar.
- Nenhuma entrada clínica é aplicada silenciosamente.
- A Sala do Auxiliar permanece independente e continua funcionando como hoje.

## Próximos incrementos sobre o mesmo contrato

1. Ditado do médico para a sessão web.
2. Foto obstétrica/Doppler com extração estruturada e revisão dos campos antes de aplicar.
3. Foto/medidas de mama, tireoide, carótidas e outros exames dimensionais.
4. Comandos rápidos específicos por categoria.

## Critérios de aceite

- [x] Web gera código de seis caracteres sem reutilizar o token da Sala.
- [x] Android e iOS resgatam o código somente na mesma conta.
- [x] Sessão continua válida após queda de conexão dentro do turno.
- [x] Texto enviado pelo Android ou iOS aparece na web em até poucos segundos.
- [x] A web permite acrescentar a entrada ao laudo ou descartá-la.
- [x] Encerrar a sessão bloqueia novos eventos.
- [x] RLS impede leitura ou escrita entre contas.
- [x] Typecheck e builds de API, web e mobile passam.
- [x] O mesmo contrato está implementado no app iOS nativo.

## Validação executada

- Migração aplicada no Supabase atual; RLS ativo e acesso anônimo revogado nas duas tabelas.
- Teste transacional confirmou criação, conexão, evento e invisibilidade para outra conta; todos os dados de teste foram revertidos.
- Advisors do Supabase não apontaram alerta de segurança novo para as tabelas Companion.
- Typecheck web e Android aprovado.
- Builds de produção web e API aprovados; export web do app Android aprovado.
- Build iOS aprovado no simulador iOS 26.4.
- Suíte iOS: 39 testes executados, 3 WHO já marcados como pendentes, zero falhas; 342/342 casos FMF mantidos.

## File list

- `packages/db/src/sql/0026_companion_sessions.sql`
- `apps/api/src/app/api/companion/**`
- `apps/mobile/src/features/companion/**`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/src/features/generate/MenuSheet.tsx`
- `apps/mobile/app/generate.tsx`
- `apps/web/src/components/laudar/CompanionPanel.tsx`
- `apps/web/src/lib/companion.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `LaudoUSG/Models/CompanionConnection.swift` no repositório iOS nativo
- `LaudoUSG/Services/CompanionService.swift` no repositório iOS nativo
- `LaudoUSG/Components/Sheets/CompanionSheet.swift` no repositório iOS nativo
- `LaudoUSG/Services/SupabaseRESTClient.swift` no repositório iOS nativo
