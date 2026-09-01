# Sprint 16A — paridade do renderer: abdome superior, vias urinárias e próstata

## Objetivo

Retirar o compositor clínico local dessas três categorias da web e fazer Clássico e Objetivo saírem do mesmo renderer canônico usado pela Biblioteca e pelos demais clientes.

## Escopo clínico

- Abdome superior preserva fígado, veia porta, vesícula, vias biliares, pâncreas, baço, aorta e veia cava, sem acrescentar rins ou bexiga.
- Vias urinárias preserva medidas renais, espessura do parênquima, situação/rotação, doença renal crônica, hidronefrose, achados focais, ureteres, bexiga e resíduo pós-miccional.
- Próstata suprapúbica preserva medidas, cálculo determinístico do peso, volume aumentado, calcificações, IPP, bexiga e resíduo pós-miccional.
- A troca de estilo altera estrutura e redação, nunca os achados ou cálculos.

## Critérios de aceite

- [x] A mesma seleção clínica aparece nos estilos Clássico e Objetivo das três categorias.
- [x] O Clássico mantém `COMENTÁRIOS`, `OS SEGUINTES ASPECTOS...` e `CONCLUSÃO`.
- [x] O Objetivo usa `TÉCNICA`, `ACHADOS` e `IMPRESSÃO`.
- [x] Medidas digitadas em milímetros são convertidas para centímetros quando o contrato exige cm.
- [x] Nenhuma categoria migrada volta ao compositor local se a API falhar.
- [x] A Biblioteca continua projetando modelo editável para todas as categorias migradas.
- [x] Typecheck, build, testes e `git diff --check` passam.

## Resultado

As três categorias agora usam o renderer canônico na web. Durante o gate, foi encontrada uma contradição no Abdome superior: uma veia porta alterada podia manter também a frase normal. O renderer passou a substituir a normalidade pelo achado livre tanto no Clássico quanto no Objetivo.

O teste ponta a ponta cobre esteatose, litíase biliar, veia porta aumentada, litíase renal com conversão de mm para cm, parede vesical, resíduo pós-miccional, peso prostático, calcificações e IPP. Os goldens preexistentes continuaram verdes: Abdome superior 40 + 40, Vias urinárias 44 + 36 e Próstata 27 verificações.

A checagem da Biblioteca no banco atual encontrou e corrigiu uma regressão independente da Sprint 15: o novo `escopo_exame` de Mamas e axilas era opcional, mas o gerador do modelo normal o preenchia como `null`, fazendo a categoria desaparecer da Biblioteca. O seed normal agora explicita `mamas`; as onze categorias migradas têm modelo e os 39 cenários Clássico/Objetivo geram exemplo preenchido.

## Validação

- `pnpm exec tsx src/server/renderer/catalog/__tests__/sprint16a-ponta-a-ponta.manual.ts`
- Goldens Clássico e Objetivo das três categorias.
- `pnpm --filter @laudousg/web typecheck`
- `pnpm --filter @laudousg/api typecheck`
- `pnpm --filter @laudousg/web build`
- `pnpm --filter @laudousg/api build`
- `npm test` — o Turbo não possui tarefas `test` declaradas nos pacotes; os gates manuais acima são os testes efetivamente executados.
- `CI=1 npm run lint` continua bloqueado pela configuração preexistente: `next lint` abre o assistente interativo em API, web e Lab. Nenhuma configuração global foi criada silenciosamente.
- `git diff --check`

## Fora do escopo

Cervical e Cervicometria ficam na Sprint 16B. Partes moles e Musculoesquelético ficam na Sprint 16C. Esquemas visuais continuam reservados para a Sprint 18.

## Arquivos

- `apps/web/src/lib/catalog/abdomeSuperiorParaCatalogo.ts`
- `apps/web/src/lib/catalog/viasUrinariasParaCatalogo.ts`
- `apps/web/src/lib/catalog/prostataParaCatalogo.ts`
- `apps/api/src/server/renderer/catalog/__tests__/sprint16a-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts`
- `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts`
- `apps/api/src/server/renderer/catalog/__tests__/estilos-da-biblioteca.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/biblioteca-cobre-as-migradas.manual.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/lib/catalog/migradas.ts`
- `apps/api/src/server/renderer/catalog/__tests__/biblioteca-cobre-as-migradas.manual.ts`
