# @laudousg/knowledge

Knowledge base canônica do LaudoUSG: templates de system prompts por categoria, few-shots validados, ranges de medidas, regras de normalizacao, validators (sanity checks) e schemas de contratos.

Este pacote e a **fonte de verdade do conhecimento clinico** consumido pelo pipeline de geracao de laudos da nova arquitetura. Todo conteudo aqui foi (ou sera) extraido de `/Users/luizprazeres/laudousg/` (web em producao, read-only) e versionado em markdown/YAML com frontmatter rastreavel ate o `source_path` + `source_commit` original.

## Estrutura

A estrutura completa de pastas e o frontmatter padrao por tipo de arquivo estao especificados no ADR-0002. Resumo:

- `templates/{CATEGORIA}/` — system prompts (FUNCAO / REGRAS / TEMPLATES)
- `snippets/{CATEGORIA}/` — few-shots + frases padronizadas
- `ranges/{CATEGORIA}.yaml` — medidas normais/patologicas
- `prompts/` — global rules, negative, subspecialty overlays, style, CoT
- `normalizer/` — substituicoes literais + regex de unidades + pontuacao (etapa 0 do pipeline)
- `validators/{CATEGORIA}/` — sanity checks deterministicos em TS (zero IA)
- `schemas/` — JSON Schema dos contratos `/api/generate` (request, response, SSE events)
- `docs/` — referencias historicas e migration log

## Referencias

- **ADR-0001** — `/Users/luizprazeres/laudousg-swift/LaudoUSG/docs/adr/0001-*.md` — decisoes de arquitetura macro e constraint `/laudousg/` read-only
- **ADR-0002** — `/Users/luizprazeres/laudousg-swift/LaudoUSG/docs/adr/0002-mapping-laudousg-to-knowledge.md` — mapping arquivo-a-arquivo + frontmatter padrao + plano de extracao

## Status

Estrutura skeleton criada em 2026-05-20. Conteudo real sera extraido categoria-a-categoria a partir de OBSTETRICA (piloto da Fase 1). Veja `docs/migration-log.md`.
