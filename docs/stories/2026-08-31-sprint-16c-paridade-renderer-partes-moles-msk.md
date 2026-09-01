# Sprint 16C — paridade do renderer: Partes moles e Musculoesquelético

## Objetivo

Fazer Partes moles e Musculoesquelético saírem do renderer canônico na web nos estilos Clássico e Objetivo, sem inferir diagnóstico a partir de texto livre e sem manter frases de normalidade onde o usuário marcou alteração.

## Escopo clínico

- Partes moles traduz tipo de lesão, ecogenicidade, contornos, plano, Doppler, dimensões, localização e campos próprios de cisto, coleção, corpo estranho e hérnia.
- Medidas explicitamente digitadas em milímetros são convertidas para centímetros.
- Musculoesquelético mantém o segmento e a lateralidade escolhidos na web.
- A descrição livre vai somente para o corpo e o diagnóstico livre vai somente para a conclusão.
- O adaptador MSK usa sempre `achado_tipo: outro`; ele não deduz tendinopatia, rotura, bursite ou morfologia canônica a partir do texto.
- Diagnóstico sem descrição é aceito com frase corporal neutra. Descrição alterada sem diagnóstico bloqueia o laudo para evitar conclusão vazia ou normalidade contraditória.

## Critérios de aceite

- [x] Partes moles e Musculoesquelético usam o renderer canônico na web.
- [x] Clássico e Objetivo preservam os mesmos achados e diferem somente na estrutura de redação.
- [x] Partes moles preserva medidas, localização, Doppler e campos específicos de hérnia.
- [x] MSK preserva segmento, lado, descrição e diagnóstico informados.
- [x] Texto livre de MSK não é classificado automaticamente em um achado canônico.
- [x] Estrutura marcada como alterada sem diagnóstico bloqueia a geração.
- [x] Os goldens existentes de Partes moles, MSK e passthrough permanecem verdes.
- [x] A Biblioteca oferece modelo para todas as categorias migradas.
- [x] Typecheck, build e `git diff --check` passam.

## Fora do escopo

Este sprint não altera o writer com IA, o passthrough de laudo MSK pronto, o editor de texto nem os esquemas visuais. O saneamento das pendências obstétricas continua separado.

## Arquivos

- `apps/web/src/lib/catalog/partesMolesParaCatalogo.ts`
- `apps/web/src/lib/catalog/musculoesqueleticoParaCatalogo.ts`
- `apps/web/src/lib/deterministic/organs/musculoesqueletico.ts`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/lib/catalog/migradas.ts`
- `apps/api/src/server/renderer/catalog/__tests__/sprint16c-ponta-a-ponta.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/biblioteca-cobre-as-migradas.manual.ts`

## Resultado

As duas últimas categorias que ainda dependiam do compositor local agora passam pelo renderer canônico. Em Partes moles, a ponte só traduz campos e unidades. Em Musculoesquelético, cada texto digitado permanece no papel escolhido pelo usuário: descrição no corpo e diagnóstico na conclusão.

O MSK não tenta classificar o texto em uma doença. Quando há somente diagnóstico, o corpo recebe a frase neutra já protegida pelo renderer. Quando há descrição alterada sem diagnóstico, a web interrompe a montagem e informa o campo ausente, evitando conclusão vazia ou normalidade contraditória.

## Validação

- Gate ponta a ponta da Sprint 16C: aprovado.
- Partes moles Clássico: 38/38 cenários aprovados.
- Partes moles Objetivo: 35/35 cenários aprovados.
- Musculoesquelético: 43/43 cenários aprovados.
- Passthrough MSK: 13/13 cenários aprovados.
- Modelos objetivos e cervicometria complementar: 35/35 verificações aprovadas.
- Biblioteca conectada ao banco: as 15 categorias migradas têm modelo.
- Biblioteca: 31 verificações de estilo aprovadas e todos os 39 modelos/cenários geram exemplo preenchido.
- Typecheck e build de produção de web e API: aprovados.
- `npm test`: conclui sem falha, mas o monorepo ainda não possui tarefas `test` registradas no Turbo; a cobertura efetiva deste sprint vem dos gates manuais acima.
- `npm run lint`: continua bloqueado pela configuração inicial interativa do `next lint` em web, API e lab; nenhum arquivo de ESLint foi criado automaticamente.
