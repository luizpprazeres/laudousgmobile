# Sprint 1 — estabilização da Biblioteca e do cadastro web

**Data:** 2026-08-29
**Status:** concluída; envio à `main` autorizado
**Escopo:** `apps/api` + `apps/web` do monorepo atual. O projeto `~/laudousg` é legado e não entra nesta story.

## Resultado esperado

A Biblioteca só oferece combinações de categoria e estilo que realmente produzem um modelo. O cadastro web explica os erros conhecidos e gera uma referência rastreável para os erros inesperados, sem enviar e-mail, senha ou texto clínico para os logs.

## Baseline confirmado

| Categoria | Clássico | Objetivo | Observação |
|---|---:|---:|---|
| Abdome total | sim | não | objetivo ainda usa outro motor e não está na Biblioteca |
| Obstétrica | sim | sim | clássico tem catálogo estruturado; objetivo é derivado |
| Obstétrica com Doppler | sim | sim | ambos renderizam modelos distintos |
| Morfológico | sim | sim | três cenários em ambos os estilos |
| Tireoide | sim | sim | ambos renderizam modelos distintos |
| Mamária | sim | sim | o clássico era rotulado incorretamente como `TÉCNICA` |
| Pelve feminina | sim | sim | ambos renderizam modelos distintos |
| Abdome superior | sim | sim | ambos renderizam modelos distintos |
| Vias urinárias | sim | sim | ambos renderizam modelos distintos |
| Próstata suprapúbica | sim | não | renderer não possui variante objetiva |
| Cervical | sim | sim | ambos renderizam modelos distintos |
| Cervicometria | sim | não | renderer não possui variante objetiva |
| Partes moles | sim | sim | ambos renderizam modelos distintos |
| Musculoesquelético | sim | não | renderer não possui variante objetiva |

## Critérios de aceite

- [x] A API da Biblioteca informa os estilos disponíveis por categoria a partir da mesma fonte que resolve os modelos.
- [x] A API recusa de forma fail-closed um estilo não implementado, mesmo que o renderer hoje devolva por acaso o texto clássico.
- [x] A web não permite selecionar `Objetivo` em Abdome total, Próstata suprapúbica, Cervicometria e Musculoesquelético.
- [x] Ao trocar para uma categoria sem o estilo atual, a tela volta para `Clássico` antes de buscar o modelo.
- [x] A seção inicial do modelo clássico aparece como `Comentários`; no objetivo, como `Técnica`.
- [x] O cadastro web exige no mínimo oito caracteres, conforme a recomendação atual do Supabase.
- [x] Erros conhecidos de cadastro são traduzidos pelo `code` do Supabase, sem depender apenas do texto em inglês.
- [x] Erros inesperados mostram uma referência curta ao usuário e chegam ao log do servidor sem e-mail, senha ou metadados pessoais.
- [x] Typecheck da API e da web passam.
- [x] Gates manuais da Biblioteca passam, incluindo uma asserção específica para estilos indisponíveis.
- [x] Build da web passa.

## Fora desta story

Implementar novos modelos objetivos, ativar personalização por usuário/categoria, alterar o banco, publicar deploy, portar trissomias ou integrar celular e web.

## Checklist de execução

- [x] Mapear estado atual e confirmar o Supabase canônico.
- [x] Registrar baseline de categoria × estilo.
- [x] Implementar capacidades por estilo na fonte canônica.
- [x] Corrigir seletor e rótulos da Biblioteca.
- [x] Melhorar erros e diagnóstico do cadastro.
- [x] Executar os gates e revisar o diff.

## Validação executada

| Gate | Resultado |
|---|---|
| Typecheck `apps/api` | passou |
| Typecheck `apps/web` | passou |
| Build `apps/api` | passou |
| Build `apps/web` | passou |
| Matriz categoria × estilo | 37 verificações passaram |
| Cobertura das categorias migradas | passou nas 6 categorias atuais |
| Exemplos preenchidos da Biblioteca | todos os cenários suportados passaram |
| Tradução de erros de cadastro | 6 verificações passaram |
| Privacidade do diagnóstico de cadastro | 8 verificações passaram |
| `pnpm test` | não há tarefas de teste declaradas no monorepo; executou 0 |
| `pnpm lint` | bloqueado pela configuração preexistente: `next lint` abre o assistente porque não existe configuração ESLint |

## Arquivos alterados

- `docs/stories/2026-08-29-sprint-1-estabilizacao-biblioteca-cadastro.md`
- `apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts`
- `apps/api/src/server/renderer/catalog/registry.ts`
- `apps/api/src/server/renderer/catalog/__tests__/estilos-da-biblioteca.manual.ts`
- `apps/api/src/server/renderer/catalog/__tests__/exemplo-da-biblioteca.manual.ts`
- `apps/web/src/lib/biblioteca/tipos.ts`
- `apps/web/src/components/biblioteca/BibliotecaWorkspace.tsx`
- `apps/web/src/components/biblioteca/Modelo.tsx`
- `apps/web/src/app/(auth)/signup/page.tsx`
- `apps/web/src/app/api/auth/signup-diagnostic/route.ts`
- `apps/web/src/lib/auth/signupErrors.ts`
- `apps/web/src/lib/auth/__tests__/signupErrors.manual.ts`
- `apps/web/src/lib/auth/__tests__/signupDiagnostic.manual.ts`
