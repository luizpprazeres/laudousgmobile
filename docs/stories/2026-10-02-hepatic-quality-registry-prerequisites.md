# Pré-requisitos do registro de qualidade hepático (P1–P9), 02/10/2026

Status: **Draft**. Story documental; nenhum código foi alterado ao criá-la. Implementação não iniciada.

Origem: [evidência documental do registro de qualidade](../clinical-approval/2026-10-02-hepatic-quality-registry-proposal.md), seção 5.1. Contexto do contrato em [`2026-10-02-hepatic-contract.md`](2026-10-02-hepatic-contract.md); consumidores Android em [`2026-10-02-android-hepatic-parity.md`](2026-10-02-android-hepatic-parity.md).

## Objetivo

Tornar o registro de critérios de qualidade (`apps/api/src/server/hepaticReports/qualityRegistry.ts`) capaz de receber entradas aprovadas sem aprovar dado inconsistente. Para isso, resolver os nove bloqueios P1–P9.

**Invariante durante toda a story:** `APPROVED_HEPATIC_QUALITY_CRITERIA` continua vazio no servidor, na Web e no Android. Nenhum limiar clínico ou técnico real entra no código: entradas e números usados nos testes são sintéticos e marcados como tal.

## Fora do escopo

- Preencher o registro com qualquer entrada real (depende das decisões D1–D10 do responsável clínico e de story própria).
- Cortes clínicos (camada C da evidência), conversões entre aparelhos, unidades ou métodos.
- Ativação de categorias, flags, deploy, push ou Sala.
- Métodos fora do enum atual (UGFF, LFQ, TAI/TSI).

## Pré-requisitos e critérios de aceite

### P1 — Métricas vinculadas às medidas e derivações

Hoje `quality.metrics` é uma lista livre `{code, value, unit}` informada pelo cliente.

- [ ] AC1.1 Métricas de dispersão do conjunto (IQR/M) deixam de ser digitadas: o valor usado pelo registro é o calculado a partir das medidas `median` e `iqr` do próprio módulo (ou da derivação `iqr-median-percent` revalidada).
- [ ] AC1.2 Se o cliente enviar valor de métrica de dispersão divergente do calculado, o gate recusa com código próprio (ex.: `QUALITY_METRIC_SOURCE_MISMATCH`). Teste com valor adulterado.
- [ ] AC1.3 Métricas por aquisição (R², RMI, Stability Index, VsN, CV) passam a ser vinculadas ao `id` de cada medida `individual`; o registro avalia cada aquisição separadamente. Teste com uma aquisição fora da regra entre várias válidas.
- [ ] AC1.4 A convenção de unidade da métrica é única e documentada (razão × porcentagem); valor em convenção errada é recusado, sem conversão automática.
- [ ] AC1.5 Desigualdade estrita (`<`, `>`) é expressável sem inventar borda; testes de fronteira para `≤` e `<` no mesmo valor.

### P2 — Chave com versão de software e sonda

- [ ] AC2.1 A entrada do registro declara, quando a fonte exige, versão mínima de software e lista de sondas/transdutores.
- [ ] AC2.2 Quando a entrada declara esses campos, `equipment.softwareVersion` e `equipment.probe` tornam-se obrigatórios no exame; ausência gera pendência, não casamento.
- [ ] AC2.3 Comparação de versão é definida por fabricante (regra documentada); versão abaixo da mínima ou sonda fora da lista não casa. Testes com versão igual, abaixo e acima, e com sonda fora da lista.
- [ ] AC2.4 Modelos são casados por lista explícita da entrada, sem correspondência aproximada nem por família.

### P3 — Ciclo de vida ativo × histórico

- [ ] AC3.1 Cada entrada tem estado (`active`, `retired`) e vigência (`validFrom`, `validTo` opcional).
- [ ] AC3.2 Exame novo só casa com entrada `active` e vigente na data da avaliação de qualidade.
- [ ] AC3.3 Laudo já gerado continua reprodutível: reabrir ou revalidar um exame antigo usa a entrada histórica referenciada, sem reaprovar com a regra atual. Teste com entrada retirada depois da geração.
- [ ] AC3.4 Retirar uma entrada não apaga histórico; tentativa de nova aprovação com entrada retirada é recusada.

### P4 — Validação de faixa física

- [ ] AC4.1 Existe tabela de faixa física por método/unidade, cada linha com referência versionada (ex.: TE 2,0–75 kPa e CAP 100–400 dB/m pelo 510(k) K223902, conforme a evidência).
- [ ] AC4.2 Valor fora da faixa física é erro de dado com código próprio, distinto de critério de qualidade não atendido.
- [ ] AC4.3 Métodos sem faixa oficial documentada não ganham faixa inventada; ficam sem validação de faixa e isso é visível no resultado. Teste cobrindo os dois casos.

### P5 — CAP condicionado à TE válida

- [ ] AC5.1 O contrato representa que o CAP do FibroScan depende de medida de rigidez por TE válida no mesmo exame e no mesmo equipamento.
- [ ] AC5.2 CAP com TE ausente, inviável, de outro equipamento ou não aprovada pelo registro bloqueia a gordura com código próprio. Testes para cada caso.
- [ ] AC5.3 A regra não se estende a ATI, UGAP ou UDFF.

### P6 — Protocolo, jejum e ROI estruturados

- [ ] AC6.1 Jejum (estado e horas), repouso, posição, abordagem, profundidade da ROI em relação à cápsula e distância ao transdutor passam a ser campos estruturados, sem inferência a partir de texto livre.
- [ ] AC6.2 A entrada do registro pode declarar exigências sobre esses campos (ex.: horas mínimas de jejum, profundidade mínima), avaliadas pelo gate. Valores nos testes são sintéticos.
- [ ] AC6.3 Exame sem o campo exigido pela entrada gera pendência; não há valor padrão.
- [ ] AC6.4 Migração de rascunhos existentes não preenche esses campos: ficam pendentes.

### P7 — Semântica de violação: bloqueio × sinalização

Hoje qualquer issue do registro vira 422 (`apps/api/src/server/hepaticReports/service.ts:133`).

- [ ] AC7.1 Cada regra da entrada declara seu efeito: `block` ou `flag`.
- [ ] AC7.2 `block` mantém a recusa da geração; `flag` permite gerar somente se a avaliação de qualidade do médico registrar ciência explícita da sinalização, vinculada à revisão do exame.
- [ ] AC7.3 Erros de dado (P4), de casamento (P2, P3, P9) e de vínculo (P1, P5) são sempre `block`.
- [ ] AC7.4 A resposta da API distingue os dois efeitos; testes de serviço para `block` (422) e para `flag` com e sem ciência.

### P8 — UGAP em dB/m

- [ ] AC8.1 O contrato aceita a unidade nativa dB/m para UGAP além de dB/cm/MHz (hoje `contracts.ts:180` só aceita dB/cm/MHz).
- [ ] AC8.2 Cada medida mantém a unidade de origem; não há conversão entre dB/m e dB/cm/MHz, e uma aquisição não mistura unidades.
- [ ] AC8.3 Entradas do registro são por unidade; critério em dB/cm/MHz não casa medida em dB/m. Teste nos dois sentidos.
- [ ] AC8.4 O renderer exibe a unidade de origem sem reescrever.

### P9 — Unicidade e ID estável

- [ ] AC9.1 Cada entrada tem `id` estável e imutável; a mesma regra em nova versão ganha nova entrada, não edição.
- [ ] AC9.2 A carga do registro recusa IDs duplicados e entradas sobrepostas (mesmo método, fabricante, modelo, unidade, faixa de software/sonda e vigência).
- [ ] AC9.3 O exame aprovado registra o `id` e a versão da entrada usada; o gate recusa referência a `id` inexistente.
- [ ] AC9.4 A busca deixa de depender da ordem do array; teste com registro em ordens diferentes produzindo o mesmo resultado.

## Dependências

| Item | Depende de | Motivo |
|---|---|---|
| Versão do contrato | decisão de @architect antes de P1, P2, P5, P6 e P8 | Essas mudanças alteram a forma de `hepatic-assessment`; decidir se o candidato ainda não aprovado continua `v1` ou vira `v2`, sem migração que aprove dado antigo |
| P1 | versão do contrato | Métricas por aquisição exigem vínculo a `measurements[].id` |
| P2 | P9 | Sobreposição só é detectável com software/sonda na chave |
| P3 | P9 | Histórico referencia `id` estável |
| P5 | P2, P4 | O CAP depende da TE aprovada no mesmo equipamento e dentro da faixa física |
| P6 | versão do contrato | Novos campos estruturados |
| P7 | P1, P4, P5 | Define o efeito das regras e dos erros desses itens |
| P8 | versão do contrato | Altera a tabela método → unidade |
| P9 | — | Base para P2 e P3 |
| Consumidores | P1–P9 no `packages/shared` | Web (`apps/web/src/lib/hepatic*`), Android (`apps/mobile/src/features/generate/hepatic*`) e iOS (DTOs Swift) precisam dos mesmos vetores JSON; nenhum consumidor é ativado nesta story |
| Preenchimento do registro | esta story concluída + decisões D1–D10 | Fora desta story |

Ordem sugerida: versão do contrato → P9 → P2 → P3 → P4 → P1 → P6 → P8 → P5 → P7 → paridade dos consumidores.

## Critérios de saída

- [ ] Todos os AC acima com teste automatizado sintético e nome do teste listado nesta story.
- [ ] `APPROVED_HEPATIC_QUALITY_CRITERIA` continua `[]` no servidor, Web e Android; teste confirma que nenhum exame conclui sem registro.
- [ ] `pnpm validate:hepatic-contract`, `tsx apps/api/src/server/hepaticReports/__tests__/hepatic-reports-v1.manual.ts`, typecheck de `@laudousg/shared`, API, Web e mobile aprovados.
- [ ] Vetores JSON de compatibilidade atualizados para Web, Android e iOS.
- [ ] `git diff --check` sem problemas; nenhum push ou deploy sem @devops.

## Tarefas

- [ ] Decisão de versão do contrato (@architect)
- [ ] P9 · [ ] P2 · [ ] P3 · [ ] P4 · [ ] P1 · [ ] P6 · [ ] P8 · [ ] P5 · [ ] P7
- [ ] Paridade de consumidores (Web, Android, vetores iOS)
- [ ] QA gate (@qa)

## File List

- `docs/stories/2026-10-02-hepatic-quality-registry-prerequisites.md` (esta story)
