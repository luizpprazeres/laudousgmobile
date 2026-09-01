# Sprint 17 — editor funcional e formatação preservada

## Objetivo

Transformar a prévia da web em um editor de laudo realmente utilizável: negrito, itálico, sublinhado, destaque, desfazer e refazer precisam atuar no texto; a cópia formatada deve ser diferente do texto puro; e uma atualização automática dos campos não pode apagar a formatação manual dos trechos que permaneceram iguais.

## Regra de segurança

O editor altera somente a apresentação e a redação que o médico vê. Ele não muda dados estruturados, cálculos, classificações nem o renderer clínico. Conteúdo colado entra como texto puro, e o HTML aceito é reduzido a uma lista pequena de elementos de formatação.

## Escopo

- Editor rico ativo na tela principal de geração web.
- Ações funcionais de negrito, itálico, sublinhado, destaque, desfazer e refazer.
- Cópia rica para Word/Google Docs e cópia separada em texto puro.
- Preservação de formatação em blocos não alterados ao aceitar uma nova montagem do laudo.
- Persistência do HTML seguro dentro de `exam_state`, sem nova tabela ou mudança de schema.
- Reapresentação da formatação no histórico dos laudos web.
- Fallback MSK: descrição alterada sem diagnóstico recebe conclusão topográfica neutra em vez de bloquear a geração.

## Critérios de aceite

- [x] Todos os controles visíveis do editor executam uma ação real.
- [x] O médico consegue editar o texto diretamente na folha do laudo.
- [x] “Copiar” leva HTML e texto; “Texto puro” leva somente texto.
- [x] Alterar um campo e aceitar a sugestão preserva a formatação dos blocos que não mudaram.
- [x] O laudo salvo reaparece formatado no histórico.
- [x] HTML colado ou manipulado não injeta tags, atributos ou scripts fora da lista permitida.
- [x] Typecheck, build, testes focados e `git diff --check` passam.

## Fora do escopo

Este sprint não cria colaboração simultânea no mesmo texto, não altera os modelos clínicos e não implementa “Refazer com IA”. O botão inativo dessa função deixa de ocupar espaço até existir um fluxo real.

## Arquivos previstos

- `apps/web/src/components/laudar/LaudoPreview.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/components/laudar/reportRichText.ts`
- `apps/web/src/components/laudar/__tests__/report-rich-text.manual.ts`
- `apps/web/src/app/app/gerar/page.tsx`
- `apps/web/src/app/app/historico/page.tsx`
- `apps/web/src/components/historico/HistoryItem.ts`
- `apps/web/src/components/historico/ReportDetail.tsx`
- `apps/web/src/lib/catalog/musculoesqueleticoParaCatalogo.ts`
- `apps/api/src/server/renderer/catalog/__tests__/sprint16c-ponta-a-ponta.manual.ts`
- `docs/stories/2026-08-31-sprint-16c-paridade-renderer-partes-moles-msk.md`
- `package.json`

## Resultado

A prévia da tela principal passou a ser um editor `contentEditable` com controles reais de negrito, itálico, sublinhado, destaque, desfazer e refazer. O controle inativo “Refazer com IA” foi removido. A ação verde copia HTML e texto para aplicativos compatíveis; “Texto puro” usa somente a redação sem marcas.

O rascunho guarda texto e HTML separadamente. Quando os campos do exame produzem uma nova versão, o merge compara o documento por blocos e reaproveita o HTML dos blocos cujo texto permaneceu igual. A formatação passa pelo `exam_state.__presentation` do mesmo registro `web_reports`; não houve alteração de schema. O histórico reconhece essa camada e reapresenta o laudo formatado, mantendo compatibilidade com os registros antigos que têm apenas texto.

O fallback MSK foi alinhado à nova orientação de produto: uma descrição alterada sem diagnóstico não é mais bloqueante. A conclusão informa somente a topografia da alteração e “a esclarecer”, sem criar uma doença específica.

## Validação

- `pnpm validate:sprint17`: aprovado.
- HTML seguro, merge de blocos, iniciais e round-trip no JSON: aprovados.
- Ponta a ponta Partes moles/MSK Clássico e Objetivo: aprovado.
- Golden MSK: 43/43 verificações aprovadas.
- Typecheck do monorepo: 8/8 pacotes aprovados.
- Build de produção da web: aprovado, 17 páginas geradas.
- Schema remoto conferido: `public.web_reports` está com RLS ativo e `exam_state` é `jsonb`.
- `pnpm test`: executa sem falha, mas o monorepo continua sem tarefas `test` registradas no Turbo; os testes efetivos são os gates focados acima.
- `pnpm lint`: ainda não executa porque web, API e lab continuam chamando o `next lint` depreciado e abrem o assistente interativo de configuração; nenhum arquivo de lint foi criado automaticamente.
- As suítes remotas gerais não foram usadas como gate: o golden determinístico exige `GOLDEN_AUTH_TOKEN`, e o gate de cobertura da Biblioteca exige `DATABASE_URL` no processo local.
