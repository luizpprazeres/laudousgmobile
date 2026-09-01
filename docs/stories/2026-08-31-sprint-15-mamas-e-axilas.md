# Sprint 15 — Mamas e axilas

## Objetivo

Corrigir a redação clínica da categoria Mamária, permitir exames de mamas e/ou axilas e reorganizar a descrição de achados conforme o raciocínio ultrassonográfico do BI-RADS, sem apresentar uma heurística local como classificação médica definitiva.

## Escopo

### Nome e compatibilidade

- Exibir `Mamas e axilas` na web, iOS, Android, histórico, Sala e analytics.
- Manter o código interno `MAMARIA` e os identificadores existentes para preservar histórico, modelos e integração.

### Escopo do exame

- Substituir o booleano `com axilas` por um estado explícito: `mamas`, `axilas` ou `mamas_axilas`.
- Preservar compatibilidade com rascunhos antigos: sem o novo estado, assumir mamas e acrescentar axilas quando o campo anterior estiver ativo.
- Não emitir título, comentários, achados ou conclusão de uma região fora do escopo escolhido.

### Ecotextura de fundo

- Exibir as opções de forma coerente com a terminologia do ACR: heterogênea; homogênea predominantemente fibroglandular; homogênea predominantemente adiposa.
- Enviar ao renderer uma frase completa, e não apenas o adjetivo.
- Cobrir Clássico e Objetivo com testes que impeçam o retorno do texto isolado `heterogênea`.

### Descrição de achados

- Separar visualmente: tipo de achado, mama/lado, medidas, localização, ecogenicidade, forma, orientação, margem, fenômeno acústico posterior e achados associados.
- Em margem, mostrar primeiro `Circunscrita` ou `Não circunscrita`; ao escolher a segunda, revelar indistinta, angular, microlobulada e espiculada.
- Incluir `Combinado` em fenômeno acústico posterior.
- Usar títulos curtos e o mesmo componente compacto para não aumentar desnecessariamente a altura do formulário.

### BI-RADS

- Renomear `BI-RADS (forçar)` para `BI-RADS definido pelo médico (opcional)` ou texto equivalente validado na interface.
- Separar visualmente qualquer sugestão calculada da classificação final.
- Nunca salvar sugestão como decisão médica sem confirmação explícita.
- Revisar a heurística local 4A/4B/4C com casos clínicos golden antes de mantê-la em produção.
- Registrar como dependência externa a avaliação de licença do ACR para uso comercial da marca, terminologia e lógica BI-RADS no software.

## Fora do escopo

O editor do esquema visual de mamas será entregue na Sprint 18. Esta sprint prepara o contrato estruturado que o desenho usará. Não serão geradas novas imagens nem alterado o armazenamento dos esquemas.

## Entregue

- [x] Nome público alterado para `Mamas e axilas` na web, API, Android, iOS e banco atual.
- [x] Código interno `MAMARIA` preservado em todas as plataformas.
- [x] Escopo explícito `Mamas e axilas`, `Somente mamas` ou `Somente axilas`, com títulos, técnica, achados e conclusão próprios.
- [x] Compatibilidade com rascunhos anteriores ao novo seletor de escopo.
- [x] Ecotextura de fundo corrigida para sempre produzir uma frase completa.
- [x] Descritores reorganizados por ecogenicidade, forma, margem, orientação, fenômeno posterior e calcificações.
- [x] Hierarquia `Circunscrita` / `Não circunscrita`, revelando as subclasses somente quando necessárias.
- [x] Fenômeno acústico posterior combinado disponível na tela e no renderer.
- [x] Sugestão BI-RADS movida para um núcleo compartilhado, sem regras duplicadas entre interface e API.
- [x] Categorias 0, 1, 2, 3, 4, 4A, 4B, 4C, 5 e 6 disponíveis para decisão médica.
- [x] Nenhuma sugestão da web manual entra no laudo sem escolha ou confirmação explícita do médico.
- [x] Estado normal continua produzindo BI-RADS 1, coerente com o fluxo em que tudo começa marcado como normal.

## Critérios de aceite

1. Selecionar cada tipo de fundo produz uma frase completa no laudo.
2. `Mamas` não inclui avaliação axilar; `Axilas` não inclui avaliação mamária; `Mamas e axilas` inclui ambas.
3. Um rascunho anterior abre sem perda de escopo ou achados.
4. As subclasses de margem só aparecem quando `Não circunscrita` é escolhida.
5. O fenômeno posterior combinado aparece na interface e no laudo.
6. A classificação final exige escolha ou confirmação médica; sugestão e decisão não se confundem.
7. Clássico e Objetivo são verificados para exame normal, nódulo sólido, cisto, axilas isoladas e exame combinado.
8. Web, iOS e Android exibem `Mamas e axilas`, mas continuam enviando o código `MAMARIA`.
9. O fluxo de celular conectado continua preenchendo achados sem sobrescrever itens já revisados.

## Validação final

- [x] 8 casos do núcleo compartilhado de sugestão BI-RADS.
- [x] 35 verificações golden no estilo Clássico.
- [x] 25 verificações golden no estilo Objetivo.
- [x] Travessia ponta a ponta de 14 campos da tela, sem campo perdido ou invertido.
- [x] Adaptador mamário e preenchimento estruturado pelo celular conectado.
- [x] Typecheck de shared, web, API e Android.
- [x] Build de produção da web.
- [x] Build de produção da API.
- [x] Bundle Android gerado pelo Expo.
- [x] Build iOS Simulator com assinatura desativada.
- [x] Migração aplicada e rótulo relido no Supabase atual.
- [x] `git diff --check`.
- [ ] Conferência visual assistida em tema claro e escuro: o navegador embutido bloqueou o endereço local; fica para o teste da build publicada.

O comando global `npm test` terminou sem falhas, mas o monorepo não possui tarefas registradas nesse script. A cobertura efetiva desta sprint está nas 60 verificações golden, nos casos ponta a ponta e nos 8 casos do núcleo compartilhado. O `npm run lint` continua bloqueado pela configuração preexistente do Next.js, que abre o assistente interativo de criação do ESLint em API, web e lab.

## Dependência externa

A avaliação de licença e uso comercial da marca e terminologia BI-RADS do ACR permanece uma decisão jurídica/comercial separada. Nenhum texto desta sprint declara licença concedida.

## Arquivos alterados

- `apps/web/src/components/laudar/MamariaFormPanel.tsx`
- `apps/web/src/lib/catalog/mamariaParaCatalogo.ts`
- `apps/web/src/lib/deterministic/compose.ts`
- `apps/web/src/lib/deterministic/organs/mamaria.ts`
- rótulos da web em analytics, histórico, preferências e navegação do laudo
- `apps/api/src/server/renderer/categories/MAMARIA.ts`
- fixtures e testes Clássico, Objetivo e ponta a ponta do renderer mamário
- rótulos da API em Sala, prompt global e catálogo de modelos normais
- `packages/shared/src/calculators/mamariaBirads.ts` e seu teste
- `packages/db/src/seeds/data.ts`
- `apps/mobile/src/ui/tokens.ts`
- `supabase/migrations/20260831233319_renomear_mamaria_mamas_axilas.sql`
- `LaudoUSG/Models/Category.swift` no repositório iOS
