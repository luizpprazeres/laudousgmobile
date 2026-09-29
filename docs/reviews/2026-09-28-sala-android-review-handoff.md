# Android/RN: liberação médica para Sala

Implementação local em 28/09/2026, sem build nativo, deploy ou alterações cloud.

`apps/mobile/src/lib/api.ts` serializa escritas de final_output por reportId. A revisão aguarda a última escrita, busca detalhe atualizado sem perder campos no Zod antigo, exige `report.content_revision` inteiro positivo e igualdade exata do texto efetivo persistido com o texto revisado, e envia `POST /api/reports/:id/review` com `{expectedRevision, expectedText}`. Erro de gravação bloqueia aprovação até nova gravação bem-sucedida. Resposta 409 informa conflito e pede reabrir/conferir; nunca substitui texto automaticamente para conseguir aprovar.

Geração e detalhe receberam ação explícita “Revisado — liberar para a Sala”. Ação indisponível enquanto autosave está pendente e bloqueada contra toques duplicados. Handler faz flush/await antes da conferência e bloqueia edição durante aprovação. Sucesso só após retorno HTTP bem-sucedido. Novas edições exigem nova revisão, explicado na confirmação. Envio legado continua distinto de aprovação.

Sem indicador verde persistente no médico nesta rodada: evita mostrar aprovação stale enquanto outro dispositivo altera o laudo. Sala usa contrato servidor. Revisão do texto sem marcadores usa a mesma limpeza já aplicada pelo autosave existente; se o servidor ainda contém versão divergente, bloqueia e solicita reabertura.

Validação: `pnpm --filter @laudousg/mobile typecheck` passou; `pnpm exec tsx apps/mobile/src/features/sala/__tests__/reviewContract.manual.ts` passou, cobrindo igualdade estrita, fallback null, final_output vazio, versão ausente/legada/inválida e texto vazio. `git diff --check` passou. Backend local confirmado com GET content_revision snake_case e sucesso JSON na rota review. Não houve teste físico Android nem integração autenticada produção; depende da migração/rota backend publicada. Testes focados não comprovam UI/hardware.

Também corrigido `domain.ts` para noUncheckedIndexedAccess nas capturas regex; typecheck strict específico e testes domínio passaram. Nenhum outro arquivo backend alterado nesta rodada.
