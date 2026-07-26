# Review dex1 — COMMAND_INTERPRETER Fase 2

Escopo: revisão read-only do interpretador LLM de comandos, flag `COMMAND_INTERPRETER` default OFF.

Não rodei o E2E live da OpenAI nesta revisão; li o teste e rodei simulações locais do executor para confirmar o artefato de numeração.

## Findings

### ALTO — `replace_phrase` pode quebrar a numeração da conclusão quando `from` inclui `N)`

Evidência:

- O prompt manda `from` ser substring literal exata do draft em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:82`.
- O E2E aceita `from` literal do draft, e o draft de próstata contém `1) Resíduo pós-miccional de 80 mL.` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/__tests__/command-interpreter-e2e.manual.ts:22` a `24`.
- `applyReplacePhrase` faz substituição literal global, sem parse/renumeração, em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:49` a `58`.
- Simulação local com `from="1) Resíduo pós-miccional de 80 mL."` gerou:
  `CONCLUSÃO:\nResíduo pós-miccional desprezível.\n2) Próstata normal.`

Impacto:

O conteúdo clínico melhora, mas o laudo fica com conclusão parcialmente sem numeração. Isso bate direto na regra clínica/formal de numeração em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:126`.

Correção concreta:

Fazer as duas coisas:

1. Prompt: reforçar que, em linhas de conclusão, `from` deve copiar a frase sem prefixo de numeração (`1)`, `2.`, `3 -`). Exemplo explícito no prompt.
2. Executor: proteger mesmo se o LLM errar. Em `applyReplacePhrase`, se `from` casa dentro da seção `CONCLUSÃO`, parsear com `parseConclusion` e substituir no array de itens sem numeração, depois reconstruir com `renderWithConclusion`. Alternativa mínima: após qualquer `replace_phrase`, detectar seção `CONCLUSÃO` e chamar uma função de renumeração baseada em `parseConclusion/renderWithConclusion`.

### ALTO — A validação impede replace com `from` inexistente, mas não impede invenção em `text`/`to`

Evidência:

- Structured output fecha o conjunto de ops em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:25` a `66`.
- Zod valida forma mínima em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:68` a `74`.
- A única validação semântica pós-LLM é `replace_phrase` exigir `draft.includes(op.from)` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:109` a `111`.
- Não há validação de que `to`, `text` de `add_body_finding`, `add_comment` ou `add_conclusion_item` sejam sustentados por trecho do ditado.

Impacto:

O LLM não reescreve o laudo inteiro, o que reduz bastante o risco. Mas se ele classificar errado um achado comum como comando, ou inventar/completar conteúdo no `text`/`to`, o executor aplica. Isso pode inserir achado no corpo ou item na conclusão sem lastro literal suficiente no ditado.

Correção concreta:

Adicionar validação por evidência:

- Para `add_body_finding`, `add_comment`, `add_conclusion_item` e `replace_phrase.to`, exigir overlap lexical significativo com o ditado normalizado, removendo stopwords e verbos de comando.
- Guardar `trecho_original` obrigatório nas ops emitidas pelo LLM, e exigir que esse trecho exista no ditado normalizado. Hoje o schema do interpretador nem permite `trecho_original`.
- Se a validação falhar, descartar a op e logar motivo. Isso preserva a filosofia: LLM classifica, código decide se aplica.

### MÉDIO — `add_body_finding` insere no fim do corpo, mas pode ficar fora da subseção anatômica correta

Evidência:

- A op existe no schema compartilhado em `/Users/luizprazeres/laudousgmobile-def/packages/shared/src/schemas/operations.ts:58` a `66`.
- O executor procura a primeira linha `CONCLUSÃO:` ou `IMPRESSÃO:` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:127` a `142`.
- Ele insere a frase imediatamente antes dessa seção, sem âncora anatômica.
- O caso de teste mamária valida que `cisto de óleo` vai para o corpo e não para conclusão em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/__tests__/command-interpreter-e2e.manual.ts:50` a `60`.

Impacto:

Para um achado simples, é seguro o suficiente: não polui conclusão e não apaga nada. Mas em laudos com corpo organizado por órgão/quadrante/mama direita/esquerda, jogar o achado no fim do corpo pode ficar fora da subseção natural. Isso é fidelidade/UX, não risco de apagar conteúdo.

Correção concreta:

Para v1, aceitar como fallback. Para v2, evoluir `add_body_finding` para aceitar `anchor` opcional validado no draft, ou criar ops específicas por seção (`add_finding_before_conclusion`, `add_finding_after_line`). O LLM deve escolher uma âncora literal do draft; o executor só aplica se a âncora existir.

### MÉDIO — Dedup de `add_body_finding` é seguro contra duplicata literal, mas fraco para equivalência clínica

Evidência:

- Dedup usa `normItem(before).includes(normItem(item))` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:137` a `142`.
- `normItem` só normaliza caixa, pontuação final e espaços em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:40` a `47`.

Impacto:

Não duplica uma frase igual, mas pode duplicar variações clínicas equivalentes, como `cisto oleoso` vs `cisto de óleo`, ou achado já descrito com lateralidade/medida em ordem diferente. Melhor duplicar do que apagar, mas isso deve estar no radar antes de ligar amplo.

Correção concreta:

Adicionar golden de duplicata semântica simples. Se quiser manter deterministicamente, usar overlap lexical por tokens significativos + lateralidade, não só substring completa.

### BAIXO — Falha graciosa está correta, mas sem auditoria das ops descartadas/aplicadas

Evidência:

- `applyCommandInterpreter` envolve tudo em `try/catch` e retorna o laudo intocado em erro em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:118` a `130`.
- `applyOperations` retorna auditoria em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:184` a `197`, mas `applyCommandInterpreter` usa só `.laudo` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:124` a `126`.

Impacto:

Concordo com falha graciosa: comando não pode derrubar geração de laudo. Não há risco de aplicação parcial em caso de erro antes/depois do LLM, porque a aplicação só acontece depois de `interpretCommandsLLM` retornar ops. Porém, se uma op individual falha por `frase_nao_encontrada`/dedup, isso fica invisível no route.

Correção concreta:

Manter retorno intocado em erro. Adicionar variante auditável (`applyCommandInterpreterWithAudit`) ou log estruturado das ops geradas, descartadas e aplicadas, especialmente para fase de flag ON controlada.

## Itens avaliados

### 1. Segurança clínica

O desenho está melhor que writer livre: conjunto fechado, structured output strict e executor puro reduzem bastante o blast radius. O LLM não consegue dropar achado diretamente; ele só consegue emitir ops permitidas.

Ainda não considero suficiente para ligar amplo sem validação adicional. O ponto crítico é que `text`/`to` podem ser inventados ou superinterpretados. A validação atual só protege `replace_phrase.from` inexistente; ela não prova que o novo conteúdo veio do comando do médico.

Sobre classificar achado clínico comum como comando: o prompt tenta evitar isso em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:84` a `88`, mas a barreira é prompt-only. Para segurança, a aplicação deve exigir evidência textual no ditado.

### 2. Artefato de numeração no `replace_phrase`

É real e precisa correção no executor, não só no prompt. Prompt sem `N)` ajuda, mas o executor deve renumerar ou operar sobre `parseConclusion` quando o replace atingir uma linha de conclusão.

### 3. `add_body_finding`

A posição antes de `CONCLUSÃO/IMPRESSÃO` é segura para não poluir conclusão e funciona tanto no clássico quanto no objetivo. Não resolve posicionamento anatômico fino, mas é aceitável como fallback v1.

Dedup é ok para literal; fraco para equivalência clínica.

### 4. Falha graciosa

Concordo. Erro de LLM deve retornar laudo intocado. Não vi risco de aplicação parcial em exceção, porque `applyOperations` só roda após retorno completo das ops.

O risco que sobra não é parcialidade; é aplicar ops válidas formalmente, mas ruins clinicamente. Isso se resolve com validação por evidência e auditoria.

### 5. Gating

Confirmado: `COMMAND_INTERPRETER` default OFF não faz chamada LLM nova.

Evidência:

- Env default OFF em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/env.ts:56` a `60`.
- Route só chama `applyCommandInterpreter` dentro de `if (env().COMMAND_INTERPRETER === "true")` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:949` a `958`.
- `applyCommandInterpreter` é quem chama `interpretCommandsLLM`, que chama `structuredCompletion`, em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandInterpreter.ts:95` a `127`.

Conclusão: OFF = sem chamada LLM da Fase 2. A Fase 1 continua rodando via `applyConfiguredCommands`, mas isso é o comportamento já existente.

## Veredito

Eu manteria a flag OFF por enquanto. O interpretador está bem desenhado para fase experimental e o E2E cobre os dois casos-alvo, mas antes de ligar em usuário real eu corrigiria a renumeração do `replace_phrase` e adicionaria validação de evidência no ditado para `text/to`.
