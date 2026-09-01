# Sprint 16B — paridade do renderer: Cervical e Cervicometria

## Objetivo

Fazer as categorias Cervical e Cervicometria isolada saírem do renderer canônico na web, com redações Clássica e Objetiva reais. Preservar sem alteração o módulo opcional de cervicometria já integrado a Obstétrica, Doppler obstétrico e Morfológico.

## Escopo clínico

- Cervical preserva nível de Robbins, medidas, forma, hilo, vascularização ao Doppler e suspeição do linfonodo.
- Cervicometria isolada coleta comprimento OI–OE, estado do orifício interno, distância placentária, idade gestacional, cerclagem e observação livre.
- Valores explicitamente digitados em milímetros são convertidos para centímetros antes de chegar ao renderer.
- O orifício interno aberto nunca pode concluir colo normal.
- A ausência da medida principal permanece sinalizada como `[REVISAR]`; não se inventa normalidade.
- A cervicometria complementar continua no fim dos achados e da conclusão das categorias obstétricas, sem exigir troca de categoria.

## Critérios de aceite

- [x] Cervical e Cervicometria isolada aparecem no seletor da web.
- [x] Os mesmos achados aparecem no Clássico e no Objetivo.
- [x] O Clássico mantém `COMENTÁRIOS` e `CONCLUSÃO`; o Objetivo usa `TÉCNICA`, `ACHADOS` e `IMPRESSÃO`.
- [x] Linfonodo suspeito não mantém conclusão de normalidade.
- [x] Colo curto, orifício aberto, cerclagem e avaliação placentária chegam à conclusão correta.
- [x] Os gates de cervicometria complementar de Obstétrica, Doppler obstétrico e Morfológico continuam verdes.
- [x] A Biblioteca oferece modelo para todas as categorias migradas.
- [x] Typecheck, build e `git diff --check` passam.

## Fora do escopo

Partes moles e Musculoesquelético ficam na Sprint 16C. O editor e os esquemas visuais continuam nas Sprints 17 e 18.

## Arquivos

- `apps/web/src/lib/deterministic/organs/cervicometria.ts`
- `apps/web/src/lib/catalog/cervicalParaCatalogo.ts`
- `apps/web/src/lib/catalog/cervicometriaParaCatalogo.ts`
- `apps/web/src/lib/deterministic/index.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/lib/catalog/migradas.ts`
- `apps/api/src/server/renderer/catalog/__tests__/sprint16b-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/biblioteca-cobre-as-migradas.manual.ts`

## Resultado

A categoria Cervicometria voltou ao seletor da web como exame isolado, sem reaproveitar indevidamente o formulário complementar. Cervical e Cervicometria agora entregam estado estruturado ao renderer canônico, portanto a troca entre Clássico e Objetivo altera a redação real do laudo sem perder os achados.

O módulo complementar permaneceu independente e continua compondo Obstétrica, Doppler obstétrico e Morfológico no fim dos achados e da conclusão. Nenhuma tabela ou configuração do banco foi alterada.

## Validação

- Gate ponta a ponta da Sprint 16B: aprovado.
- Cervical Clássico: 28/28 cenários aprovados.
- Cervical Objetivo: 32/32 cenários aprovados.
- Cervicometria isolada: 36/36 cenários aprovados.
- Cervicometria isolada e complementar: 35/35 cenários aprovados.
- Doppler isolado e complementar: 26/26 cenários aprovados.
- Biblioteca conectada ao banco: as 13 categorias migradas têm modelo.
- Biblioteca: 31 verificações de estilo aprovadas e todos os 39 modelos/cenários geram exemplo preenchido.
- Typecheck e build de produção de web e API: aprovados.

O gate morfológico amplo continua apontando duas pendências anteriores e fora deste diff: o campo `tricuspide` ainda não é lido pelo adaptador morfológico e a data do US precoce não chega ao texto. O gate obstétrico amplo também mantém a pendência anterior de apresentação fetal. Esses pontos entram no saneamento obstétrico antes da Sprint 19.
