# Sala do Auxiliar — handoff da UI (28/09/2026)

Implementação do `SALA-DESIGN.md` com as decisões do root. Nada foi commitado, buildado em produção, deployado ou mexido na 3001. Ownership respeitado: só `apps/api/src/app/sala/[token]/**`. Endpoints, middleware e shared não foram tocados.

## Arquivos

| Arquivo | O que é |
|---|---|
| `apps/api/src/app/sala/[token]/page.tsx` | Integração: seleção explícita, cache por id, leitura vertical, faixa de revisão, nome local, lista nova, avisos e CSS de impressão (+824 / −516 linhas) |
| `…/_lib/selection.ts` | Reducer puro da seleção: `feed` / `select` / `step` / `clear` / `dismissArrival`, com ordenação estável por criação e selos Novo e Alterado |
| `…/_lib/freshness.ts` | Decide quando recarregar o laudo aberto que não é o `latest` (revisão **ou** status/horário de revisão); `acceptResponse` descarta resposta iniciada antes da última aplicada; `isCurrentPoll` descarta poll antigo ou de outro código |
| `…/_lib/compose.ts` | Texto do médico + acréscimos da Sala (frases e anotações), marcando linha a linha o que é acréscimo; o texto final é idêntico ao do antigo `renderWithAnnotations` |
| `…/_lib/copyPlan.ts` | Faixa e botões: verde só para copiar o **texto do médico** revisado e online; acréscimos e falta de conexão são sempre rascunho |
| `…/_lib/review.ts` | `reviewOf()`: só `reviewStatus === "reviewed"` exato vira revisado; o resto é pending |
| `…/_lib/localNames.ts` | Nome do paciente em `sessionStorage` por código, dia (BRT) e laudo, num envelope `{ expiresAt, names }`, com limpeza |
| `…/_lib/__tests__/sala-ui.manual.ts` | Testes unitários (padrão `*.manual.ts` com `tsx`) |

## Contrato consumido

`latest.report`, `report.report` e cada item de `reportsToday` podem trazer `contentRevision: number`, `reviewStatus: "pending" | "reviewed"` e `reviewedAt: string | null`.

- Campo ausente ou malformado = **pending**.
- O estado `invalidatedAt` não existe. Um laudo editado depois da revisão aparece como "Aguardando revisão do médico", com o aviso "O médico alterou este laudo agora" quando é o laudo aberto.
- A faixa usa o `reviewStatus` do **laudo exibido**, não o da lista. Por isso nunca mostra verde para um texto mais velho que a revisão.

## Comportamento entregue

- **Seleção só por ação da auxiliar.** A primeira carga, o dia vazio e a ocultação do laudo aberto escolhem o mais recente. Laudo novo entra na lista com o selo "Novo" e o aviso "Chegou um laudo novo · categoria · hora [Abrir] [×]", sem trocar a tela. O botão "Voltar ao vivo" foi removido.
- **Ordem da lista:** por `createdAt` decrescente no cliente, com desempate por id. Uma edição não reordena, mesmo com o endpoint ordenando por `updated_at`.
- **Laudo antigo aberto continua atualizado.** Todo laudo passa por um cache por id (`upsertReport`).
  - Se o laudo aberto é o `latest`, o próprio polling já o atualiza.
  - Se não é, a Sala o recarrega por `/api/sala/report` quando o `contentRevision` da lista muda.
  - Com backend antigo, sem revisão, o recarregamento acontece a cada 5 ciclos (cerca de 15 s).
  - A comparação por revisão impede que uma resposta atrasada sobrescreva uma versão mais nova.
  - O texto atualiza no lugar, sem remontar nem perder a rolagem.
- **Leitura vertical.** Saíram as colunas A4 lado a lado, a medição e o `--paper-scale`. Ficou uma folha de até 210 mm rolando para baixo.
  - Botões ‹ Anterior e Próximo ›, com contador "2 de 5".
  - Atalhos `j`/`→` e `k`/`←`. As setas ↑ e ↓ ficaram livres para rolar o laudo.
  - Em 390 px: barra inferior fixa com navegação e botão de copiar, e lista recolhível "Laudos de hoje (N)".
- **Cópia.**
  - Laudo revisado: "Copiar laudo", botão primário verde.
  - Não revisado: "Copiar rascunho · não revisado", botão com contorno tracejado âmbar e sem segundo clique.
  - O texto copiado não leva nome nem status. Copiar não altera a revisão.
  - Se a cópia falha, aparece "Não foi possível copiar. Selecione o texto do laudo e use Ctrl+C."
- **Nome local.**
  - Fica na chave `sala:names:v1:<CÓDIGO>:<AAAA-MM-DD BRT>`, no formato `{ [reportId]: nome }`, com até 60 caracteres.
  - É apagado ao clicar em Sair (que volta para `/sala`), ao fechar a aba, na virada do dia (verificada a cada minuto e a cada carga), ao abrir outro código e quando o código volta revogado, expirado ou inexistente.
  - Nunca entra em requisição, anotação, cópia, impressão, URL ou título.
  - A impressão agora sai só com o texto do laudo. Antes, imprimia a interface inteira.
- **Estados.**
  - Topo: "Conectado", "Sem conexão" (a partir de 3 falhas seguidas, com faixa e com o laudo aberto ainda copiável), "Abrindo…" e "Sala encerrada".
  - Erro ao abrir um laudo mostra "Tentar de novo".
  - Dia vazio mostra "Nenhum laudo hoje ainda…".
  - O rodapé de polling e o texto "Sincronizando a cada 5 segundos" foram removidos.
- **Correções de passagem.**
  - Erro de hidratação que já existia: o relógio renderizado no servidor divergia do cliente. Agora a hora só é calculada no cliente.
  - O selo "link pessoal · efêmero" virou "Nomes digitados ficam só neste computador". A auditoria de domínio proíbe alegar eliminação diária.
  - Removido código morto: `seenIds` e o estado de atividade, que não era exibido.

## Verificação executada

- `pnpm exec tsx "apps/api/src/app/sala/[token]/_lib/__tests__/sala-ui.manual.ts"` → ok (rodada 2 inclui os cenários da tabela acima). Cobre revisão, ordenação, seleção, laudo novo, alterado, ocultar, navegação, recarga do laudo antigo, backend antigo e nome (dia BRT, outro código, Sair, lixo e storage que lança exceção).
- `cd apps/api && npx tsc --noEmit -p .` → ok.
- `npx next lint --dir src/app/sala` → só o aviso `<img>` da galeria de esquemas, que já existia.
- QA ponta a ponta com Playwright no `next dev -p 3012` (local, já encerrado).
  - Todas as respostas `/api/sala/*` foram **interceptadas com dados sintéticos**; não houve token nem paciente real.
  - Resultado: ok, sem `pageerror`. Na rodada 2, uma execução estourou o tempo na etapa de troca de código logo depois de uma edição de CSS (recompilação do dev server, causa não comprovada); as duas execuções seguintes passaram inteiras.
  - Roteiro: `/private/tmp/claude-501/-Users-luizprazeres-laudousgmobile-def/8f9b6a67-ded9-4fcc-9012-fe0e586cccea/scratchpad/qa/sala-qa.cjs`.
  - Capturas: `1440-inicial`, `1440-revisado-nome`, `1440-acrescimo`, `1440-laudo-novo`, `1440-print`, `390-leitura`, `390-lista`, `390-longo` e `390-offline` (`.png`, na mesma pasta).
  - O roteiro verificou:
    - ausência de overflow horizontal em 1440 e 390;
    - fim do laudo longo abaixo da dobra, não ao lado;
    - laudo novo sem roubar a seleção;
    - edição do laudo revisado aberto voltando para "aguardando";
    - laudo antigo aberto (não-latest) atualizado depois da edição;
    - navegação por teclado;
    - cópia sem nome e sem status;
    - impressão sem nome, sem faixa e sem lista;
    - nome ausente de todas as requisições;
    - "sem conexão" mantendo o laudo aberto;
    - código revogado apagando os nomes.

## Rodada 2 — correções da revisão independente (29/09)

| Achado | Correção | Regressão |
|---|---|---|
| **P1:** o laudo antigo aberto só recarregava por `contentRevision`, mas uma aprovação não muda a revisão | `shouldRefetchSelected` compara também `reviewStatus` e `reviewedAt` da lista com o laudo carregado | Unitária (aprovar, reaprovar, desfazer) + E2E: laudo não-latest aprovado sem revisão nova fica verde |
| **P1:** polls sobrepostos sem ordem; uma resposta velha podia desfazer reviewed → pending ou revalidar um código inválido | Um poll por vez, com timeout de 10 s e `AbortController`. Cada resposta leva geração (código) e sequência e só é aplicada se for da geração atual e mais nova. O cache rejeita resposta de laudo iniciada antes da última aplicada, inclusive com a mesma revisão | Unitária (`acceptResponse`, `isCurrentPoll`) + E2E: latest lento de 7 s → no máximo 1 poll em voo |
| **P1:** troca de código só limpava o intervalo | Troca de código ou desmontagem: aborta todas as requisições em voo, invalida a geração e zera cache, ordem aplicada, seleção (evento `reset`), lista, validade e estados | Unitária (`reset`) + E2E: navegação cliente para outro código com a resposta do código antigo atrasada; tela e lista só do código novo, nomes do antigo apagados |
| **P1:** sem conexão, a faixa verde "Pode copiar e imprimir" parecia atual | Estado `stale`: faixa neutra tracejada "⚠ Sem conexão · última versão recebida", com "Recebida às HH:MM. Pode ter mudado. Se copiar, é rascunho.", e botão "Copiar rascunho · sem conexão". Nunca verde offline | Unitária (matriz offline × revisão × acréscimos) + E2E com laudo revisado aberto |
| **P1:** o selo médico cobria texto + anotações da auxiliar | Cópia primária = **só o texto do médico**: "Copiar laudo revisado", ou "… · sem acréscimos" quando há acréscimos. A função antiga continua como secundária "Copiar com acréscimos · não revisados", sempre rascunho e com confirmação neutra. Na tela, cada acréscimo fica marcado ("acréscimo da Sala, não revisado", faixa âmbar). A faixa diz quantos acréscimos há e não mostra "Pode copiar e imprimir" | Unitária (texto de `compose` idêntico ao legado em 8 combinações; marcação por linha; contagem) + E2E: cópia revisada sem a nota, cópia com acréscimos com a nota e sem o nome, botão nunca verde |
| **P2:** nomes sem TTL real, sem foco/visibilidade e sem validade do código | Envelope `{ expiresAt, names }` com `expiresAt` = mínimo entre a próxima meia-noite BRT e a validade do código (`tokenExpiresAt`, quando vier). Validação em toda leitura e escrita, no foco, no `visibilitychange` e a cada minuto. Vencido, lixo ou formato sem envelope → apagado. Código vencido não grava. `restampNames` regrava quando a validade chega | Unitária (meia-noite, código vence antes/depois, ISO inválido, vencido na leitura, não grava vencido, restamp, lixo/legado) |

Achados de passagem, também corrigidos:
- A confirmação "Copiado" passava para o próximo laudo; agora é zerada na troca de seleção.
- A quebra de linha foi movida para fora do span da linha, para a etiqueta do acréscimo ficar na mesma linha.
- A impressão mantém os acréscimos, como antes, mas sem a marcação visual.

**Contrato proposto ao backend (`sala_contract`), não implementado:** `latest` pode devolver `tokenExpiresAt: string | null` com a validade do código. A UI já consome o campo se ele vier; sem ele, vale a meia-noite BRT. O endpoint não foi alterado (fora do ownership).

**Mudança de comportamento a registrar:** "Copiar com acréscimos" inclui as frases inseridas na sessão, além das anotações, para bater com o que a tela mostra. Antes, a cópia única levava só as anotações.

## Rodada 3 — laudo aberto desatualizado (29/09)

**Achado (P1):** se `/api/sala/report` falha com o laudo em cache, `selectedError` continua falso e o `latest` bem-sucedido zera `failures`. Resultado: com a lista já mostrando revisão, status ou horário novos, o laudo antigo aberto seguia verde e "online".

**Correção:**
- Houve edição concorrente nesta rodada (às 13:16), que já trazia `selectedReportIsStale` em `_lib/freshness.ts` e `reportStale` em `_lib/copyPlan.ts`. **Convergi nela.** Removi a minha versão equivalente (`isOutdated` / ramo `outdated`) para não haver duas regras.
- **Regra:** um laudo fica desatualizado quando a lista do dia discorda da versão na tela em revisão, `reviewStatus` ou `reviewedAt`, ou quando o laudo não está mais na lista. O cálculo é **por laudo, independente da conexão global**, e o estado só some com uma recarga bem-sucedida. Cache com revisão maior que a lista (lista alguns segundos atrás) não conta.
- **Faixa:** neutra e tracejada, com "⚠ Laudo desatualizado · aguardando atualização" e o botão "Copiar rascunho · versão anterior". A cópia continua possível e nunca fica verde. Se também estiver sem conexão, prevalece a mensagem de "Sem conexão".
- **Tentativas:** a recarga continua a cada poll enquanto houver discordância, com cache presente e o `inFlight` impedindo duplicatas.
- **Aviso contraditório:** "O médico alterou este laudo agora. O texto abaixo já é o novo." deixa de aparecer enquanto o laudo estiver desatualizado. Achado pela captura.
- `page.tsx` calcula `reportStale` uma vez e usa o mesmo valor na faixa e no aviso.

**`tokenExpiresAt`:** o backend já devolve o campo no `latest` com esse nome, e a UI consome sem mudança (validade dos nomes = mínimo entre a meia-noite BRT e a validade do código).

**Regressões:**
- Unitárias: aprovação nova não carregada, fora da lista, lista atrás do cache, desatualizado nunca verde com ou sem acréscimos, e precedência do offline. O `console.log("ok")` foi movido para o fim do arquivo; antes aparecia antes dos últimos asserts.
- E2E "`/report` falha + `latest` OK" num laudo aprovado aberto que não é o latest: o médico edita (rev 3, pending), a faixa fica desatualizada e não verde, não aparece "sem conexão", o texto novo ainda não está na tela, a cópia de rascunho funciona e não há o aviso contraditório. Com a recarga de volta, entra o texto novo, a faixa passa a "Aguardando revisão" e o aviso de desatualizado some. Captura: `1440-report-falhou.png`.

**Verificação:** unitários ok, `tsc` ok, lint só com o aviso `<img>` que já existia, e E2E ok em 2 execuções seguidas com servidor limpo. Uma execução intermediária falhou porque uma instância antiga do `next dev` continuava na porta 3012 servindo código anterior. Encerrada essa instância, o E2E passou.

## Pendências e riscos para o root

1. **Validade do código:** sem `tokenExpiresAt` no `latest`, os nomes valem até a meia-noite BRT ou até o servidor responder revogado/expirado, o que vier antes.
2. **Dependência de backend:** sem o `reportContract` em produção, tudo aparece como "Aguardando revisão" e a recarga do laudo antigo cai no modo de 15 s. Esse comportamento é seguro e foi testado.
3. **Não verificado:** tema escuro com os novos tokens (`--ok-*`, `--wait-*`, `--alert-ink`), só conferidos no código; leitor de tela real; Safari/iOS (`env(safe-area-inset-bottom)`); impressão física.
4. **Limitação aceita:** abrir a Sala em outra aba começa sem nomes (é assim que o `sessionStorage` funciona), e a legenda do campo explica isso.
5. **Aviso de laudo novo em 390:** ele cobre parte do texto até ser fechado ou aberto. Se incomodar, a alternativa é fazê-lo sumir sozinho, mantendo o selo "Novo" na lista.
6. **Antes de mergear:** revisar o diff junto com as mudanças de backend em andamento (`latest`, `report`, `reportContract`), que são de outro dono. Foram lidas, não alteradas.
