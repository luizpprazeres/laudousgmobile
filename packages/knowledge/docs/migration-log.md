# Migration Log — `packages/knowledge/`

Log cronologico das extracoes de conteudo do `/laudousg/` (read-only) para o `packages/knowledge/`. Cada entrada referencia ADR-0002 §3 (mapping arquivo-a-arquivo) e registra `source_commit` quando aplicavel.

---

## 2026-05-20: Estrutura skeleton criada

- Criadas pastas conforme ADR-0002 §4
- Criados placeholders representativos em todas as pastas (templates, snippets, ranges, prompts, normalizer, validators, schemas, docs)
- `package.json` e `tsconfig.json` minimos adicionados, estendendo `tsconfig.base.json` do monorepo
- Nenhum conteudo real extraido de `/laudousg/` ainda — proximo passo: piloto OBSTETRICA (Fase 1, Semana 1 do ADR-0002 §6)
- Sem migrations Supabase, sem `pnpm install`, sem alteracoes em `/laudousg/`
