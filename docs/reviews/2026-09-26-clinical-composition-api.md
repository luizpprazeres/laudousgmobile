# Composição clínica v1 — contrato e gates API

**Data:** 26/09/2026
**Escopo:** contrato compartilhado e renderer/endpoint de composição clínica. Sem commit, push, deploy ou alteração de banco.

## Contrato

- Schema versionado em `packages/shared/src/schemas/clinicalComposition.ts`, exportado por `packages/shared/src/schemas/index.ts`.
- Associações suportadas: abdome total + próstata suprapúbica; mamária + pelve feminina.
- Pedido contém dois componentes com IDs/contextos estáveis e dados canônicos `{ alteracoes, dados }`. Bexiga só é compartilhada no par abdome + próstata, com origem no componente de abdome.
- Resposta completa contém documento composto e blocos rastreáveis. O schema valida IDs de componente únicos, par categoria/associação e IDs/categorias de origem dos blocos contra os componentes listados na própria resposta; não depende do pedido original.
- Falha em componente/contexto ou conflito vesical retorna erro versionado sem documento parcial. Endpoint API: `POST /api/compositions/render`, protegido pelo service token.
- O renderer reutiliza os renderers canônicos. `document.fullText` é montado pelo assembler canônico; não concatena laudos completos cegamente.

## Integração mamária

`adaptarMamaria` não envia mais `birads_final` nem `exames_anteriores` no topo, campos não aceitos pelo schema canônico. BI-RADS confirmado permanece no achado e é preservado no texto composto. Os testes importam o adaptador Web real nos estados inicial e com achado confirmado 4A; ambos atravessam o renderer real.

## Evidências desta rodada

- Import/runtime do schema: PASS.
- `@laudousg/shared` e `@laudousg/api` typecheck: PASS.
- Matriz do renderer: 14 grupos PASS, incluindo adaptação mamária real, BI-RADS confirmado e rejeições de integridade da resposta.
- Teste manual do endpoint de composição: 5 grupos PASS, incluindo autenticação, eco de identidade em erro e ausência de documento parcial.
- `apps/web/tests/composition.manual.ts`: 15 checks PASS, fluxo até renderer real, envelope e validação de resposta.
- Build API: PASS. Duas warnings preexistentes em `apps/api/src/app/sala/[token]/page.tsx` (dependências do `useEffect` e uso de `<img>`).

## Limites

O browser está sob validação do Atlas; handlers Web reais estão sob validação do Prumo. Persistência real, Supabase/RLS, Sala, exportação, iOS/Android e produção não foram validados por estes gates. O teste Web de composição usa renderer real, mas não substitui validação de browser ou banco.

Ownership de contrato/API liberado para integração. Nenhuma alteração adicional no schema prevista nesta frente.

## Re-gate API após ajustes clínicos B4/B5

**Data:** 26/09/2026. Reexecutado sem editar código clínico ou Web.

- Extração urinária por ditado: 19 verificações PASS, incluindo B4 (texto livre legado em linha única) e B5 (campos novos/medidas opcionais sem fallback do renderer).
- Próstata estrita: 39 verificações PASS.
- Lesão focal vesical: 11 verificações PASS.
- Regressões urinárias compartilhadas/adapters reais: 25 grupos PASS.
- Composição API: 14 grupos do renderer PASS e 5 grupos do endpoint PASS.
- `@laudousg/api` typecheck: PASS.
- `@laudousg/api` build: PASS; compilou e gerou as rotas, incluindo `/api/compositions/render`. O build declara que pula validação de tipos, coberta pelo typecheck separado.

Persistem somente duas warnings já conhecidas em `apps/api/src/app/sala/[token]/page.tsx`: dependências incompletas do `useEffect` e uso de `<img>`. Não bloqueiam o build e não foram alteradas nesta frente. Sem bloqueio API reproduzido. Gates de browser/handlers Web e validação clínica final permanecem com seus owners; estes resultados não afirmam validação de banco, produção ou consumidores móveis.

## Revisão independente para publicação

**CodeRabbit: NÃO EXECUTADO** — CLI/WSL indisponíveis neste Mac; isso não é aprovação CodeRabbit. Por autorização explícita de Luiz para esta rodada, QA independente do Prumo e gates registrados em `docs/reviews/2026-09-26-final-release-qa.md` foram aceitos como alternativa. As exceções globais de LAB e os limites de persistência real descritos naquele relatório permanecem válidos.
