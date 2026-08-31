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

## Validação prevista

- Testes unitários do adaptador web e renderer canônico.
- Casos golden de saída Clássico e Objetivo.
- Typecheck e build de web, API e Android.
- Build iOS Simulator com assinatura desativada.
- Teste manual em tema claro e escuro, notebook e celular.
- `git diff --check`.

## Arquivos esperados

- Adaptador e formulário Mamária da web.
- Renderer canônico Mamária e testes.
- Catálogo compartilhado e rótulos por plataforma.
- Migração ou seed apenas se o rótulo persistido do banco realmente for fonte de exibição.
- Esta story atualizada com checklist final e relação real dos arquivos alterados.
