# MSK — frases validadas e exames multiarticulares

Data: 2026-09-15
Status: concluído

## Objetivo

Publicar no banco compartilhado as frases musculoesqueléticas validadas pelo Dr. Luiz e garantir que o gerador preserve cada combinação de articulação e lateralidade quando o mesmo atendimento contém vários exames.

## Critérios de aceite

- [x] Corpo do laudo descreve a morfologia e a conclusão traz o diagnóstico.
- [x] Campos opcionais não informados são omitidos; colchetes e placeholders não chegam ao laudo.
- [x] Doppler e avaliação dinâmica só são mencionados quando informados pelo médico.
- [x] Ombro, quadril e joelho recebem as novas frases clínicas validadas.
- [x] Cada par segmento + lado gera um bloco independente, inclusive quando há duas articulações do mesmo lado.
- [x] A auditoria detecta um bloco multiarticular ausente sem confundir lateralidades repetidas.
- [x] A biblioteca compartilhada é carregada pelo writer MSK usado pela API comum aos clientes.
- [x] Os quatro blocos novos foram publicados para os quatro estilos de escrita.
- [x] A leitura pós-publicação confirmou um modelo + quatro blocos validados por estilo, com embeddings de 1536 dimensões.

## Evidências

- Prompt MSK: 16/16 verificações aprovadas.
- Auditoria factual MSK: 10/10 verificações aprovadas.
- Golden determinístico MSK: 53/53 verificações aprovadas.
- Teste integrado com ombro direito + joelho direito: dois títulos presentes, frase validada do infraespinhal aplicada, cisto de Baker com 2,1 cm preservado e auditoria sem omissões.
- Typecheck geral: 8/8 pacotes aprovados.
- Testes gerais: aprovados.
- Lint geral: não executou porque o pacote `apps/lab` abriu o assistente interativo de configuração do ESLint; não foi um erro do código desta entrega.

## Arquivos

- `apps/api/src/app/api/generate/route.ts`
- `apps/api/src/server/pipeline/mskWriter.ts`
- `apps/api/src/server/pipeline/mskWriterAudit.ts`
- `apps/api/src/server/pipeline/renderer.ts`
- `apps/api/src/server/pipeline/__tests__/msk-writer-audit.manual.ts`
- `apps/api/src/server/pipeline/__tests__/msk-writer-prompt.manual.ts`
- `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts`
- `apps/api/src/server/renderer/__tests__/musculoesqueletico-golden.manual.ts`
- `apps/web/src/lib/deterministic/organs/musculoesqueletico.ts`
- `packages/knowledge/snippets/MUSCULOESQUELETICO_V2/frase/ombro-bursa-impacto-acromioclavicular.md`
- `packages/knowledge/snippets/MUSCULOESQUELETICO_V2/frase/quadril-e-joelho.md`
- `packages/knowledge/snippets/MUSCULOESQUELETICO_V2/frase/tendinopatias-e-roturas.md`
- `packages/knowledge/snippets/MUSCULOESQUELETICO_V2/regra/multiplos-segmentos-e-lateralidade.md`
