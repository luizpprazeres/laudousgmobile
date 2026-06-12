# DET-2 final — Remoção do RAG (caminho vetorial normativo morto)

> Executado em 2026-06-12. Cumpre o critério de aceite final do DET-2:
> "caminho vetorial normativo morto no código (não só desligado)".

## O que foi removido

- **`retriever.ts`** (deletado): embedding query, RPC `match_knowledge_blocks`,
  quotas por kind, warning `RAG_EMPTY`.
- **`pelveRouteSelection.ts`** (deletado): a seleção de via da pelve agora é
  feita pelo seletor de variante do bundle (`MODEL_VARIANT_SELECTORS.PELVE_FEMININA`).
- **Flag `DETERMINISTIC_BUNDLE_CATEGORIES`** (removida de `env.ts` e
  `bundleLoader.ts`): o bundle é o caminho ÚNICO, não mais opt-in por categoria.
- **Overrides `modelo:12`** (PELVE/MORFOLOGICO no retriever): obsoletos.
- `route.ts`: branch do retriever removido; estágio 3 = sempre `loadDeterministicBundle`.

## O que foi MANTIDO (de propósito)

- **Embedding no admin/ingestão** (`knowledgeIngest.ts`): blocos ainda recebem
  embedding ao serem ingeridos no lab — reservado para vocabulário pessoal (DET-6).
  `OPENAI_EMBEDDING_MODEL` permanece no env.
- **`morfologicoRouteSelection.ts`**: roteamento de categoria (morfológico+Doppler),
  NÃO é RAG.
- **11 post-processors** (`generate/route.ts`): guards determinísticos do writer
  LLM, não-RAG. Continuam protegendo o writer. Revisão de redundância fica para
  o DET-5 (renderer), quando o writer LLM deixar de montar a estrutura.
- **`packages/db/src/sql/0002_retriever_rpc.sql`**: a migration histórica fica;
  a função `match_knowledge_blocks` no DB fica ÓRFÃ (não chamada). Drop opcional
  futuro — sem urgência.

## Categorias sem bundle agora dão erro claro

Bundle universal significa: categoria ativa sem modelo validado → `BUNDLE_EMPTY`
(SSE error, report `blocked`), nunca laudo sem estrutura. As ~14 categorias
órfãs (TÓRAX, OCULAR, QUADRIL_INFANTIL, etc.) têm 0 uso — saneadas sob demanda.
Decisão Luiz 2026-06-11.

## Saneamento das 3 categorias com uso (p/ não quebrar)

PROSTATA_SUPRAPUBICA, PARTES_MOLES, MUSCULOESQUELETICO_V2 tinham uso real (4/3/3
laudos) e ZERO modelo no bundle. Semeadas da fonte viva (seeds dos dex em
`docs/det-2-sql-{prostata_suprapubica,partes_moles,musculoesqueletico_v2}.sql`).
MSK_V2: modelo-instrução único (`variant:padrao`) que adapta por estrutura ditada
(ombro/joelho/pé/etc) e gera laudos separados para múltiplas estruturas.

## Validação

- **16 categorias no bundle**: 13 do DET-2 + 3 novas. Invariantes OK (≥1 modelo/
  estilo, variantes distintas).
- **38/38 golden** SEM a flag (bundle universal), caching ~99%.
- Typecheck 6/6, build de produção limpo.

## Deploy

Push via @devops + **remover a env `DETERMINISTIC_BUNDLE_CATEGORIES` da Vercel**
(não é mais lida — o código a ignora; remover evita confusão). Sem rollback por
flag agora — o rollback seria `git revert` (o bundle é o caminho único).
