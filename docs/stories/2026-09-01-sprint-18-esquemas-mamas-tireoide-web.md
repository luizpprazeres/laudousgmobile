# Sprint 18 — esquemas de mamas e tireoide na web

## Objetivo

Trazer para a web os esquemas vetoriais já maduros no iOS para mamas/axilas e tireoide. O desenho não cria uma segunda ficha clínica: ele projeta os achados do formulário e, quando um marcador é movido, atualiza lateralidade, posição e distância no próprio formulário.

## Regras de segurança

- O esquema não calcula nem altera BI-RADS, nota de Domingos ou TI-RADS.
- A classificação continua vindo dos dados estruturados e do renderer canônico.
- Mamas e tireoide usam desenho vetorial legível em preto e branco.
- PNG e PDF são derivados do SVG; o estado estruturado continua sendo a fonte.
- O envio para a Sala reutiliza `sala_schemas` e a rota autenticada existente.

## Escopo

- Botão condicional `Esquema visual` no topo de Mamas e axilas e Tireoide.
- Painel próprio no lugar da prévia, sem cobrir o formulário.
- Marcadores derivados dos achados já preenchidos.
- Arraste mamário atualizando mama, horário, quadrante e distância do mamilo.
- Arraste tireoidiano atualizando lobo/istmo e terço.
- Exportação em PNG e PDF e envio manual para a Sala.

## Critérios de aceite

- [x] O botão só aparece nas duas categorias pertinentes.
- [x] Não existe lista paralela de achados do esquema.
- [x] Alterar o formulário move o marcador; mover o marcador altera o formulário.
- [x] O desenho permanece legível em impressão monocromática.
- [x] PNG e PDF são gerados a partir do mesmo SVG mostrado na tela.
- [x] O esquema chega à Sala pelo fluxo atual, sem nova tabela.
- [x] Typecheck, build, testes focados e `git diff --check` passam.

## Fora do escopo

Posição fetal e mapas vasculares ficam para os Sprints 19 e 20. Este sprint não usa geração de imagem e não introduz cálculo clínico novo.

## Resultado

A web agora mostra `Esquema visual` ao lado da conexão do celular somente em Mamas e axilas e Tireoide. O painel ocupa a área da prévia enquanto aberto, preservando o formulário. Os marcadores vêm do mesmo estado estruturado usado pelo renderer; o arraste mamário atualiza lado, relógio, quadrante e distância do mamilo, e o tireoidiano atualiza lobo/istmo e terço.

Os SVGs usam linhas, rótulos e glifos monocromáticos. PNG e PDF são derivados do SVG mostrado e podem ser baixados ou enviados manualmente à Sala. O envio passa por um proxy autenticado da web e reaproveita `sala_schemas`, com os tipos `MAMA` e `TIREOIDE` que a Sala já reconhece.

## Validação

- `pnpm validate:sprint18`: aprovado.
- `pnpm typecheck`: 8/8 pacotes aprovados.
- Build de produção da web: aprovado, incluindo `/api/sala/schema`.
- `git diff --check`: aprovado.
- Schema remoto: `sala_schemas` com RLS ativo, sem acesso direto do cliente e com `report_id` opcional; nenhuma migração foi necessária.
- `pnpm test`: o monorepo continua sem tarefas `test` registradas no Turbo; o gate efetivo deste sprint é `validate:sprint18`.
- `pnpm lint`: continua bloqueado pela configuração antiga `next lint`, que abre o assistente interativo nos três apps Next. Nenhuma configuração foi criada automaticamente.

## Arquivos

- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/visualSchemas/BreastSchema.tsx`
- `apps/web/src/components/visualSchemas/ThyroidSchema.tsx`
- `apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx`
- `apps/web/src/components/visualSchemas/exportSchema.ts`
- `apps/web/src/lib/visualSchemas/adapters.ts`
- `apps/web/src/lib/visualSchemas/__tests__/adapters.manual.ts`
- `apps/web/src/app/api/sala/schema/route.ts`
- `apps/web/package.json`
- `package.json`
- `pnpm-lock.yaml`
