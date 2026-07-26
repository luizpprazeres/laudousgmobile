# Review dex1 — COMMAND_PREGEN Fase 3

Escopo: revisão read-only do parser pré-geração, flag `COMMAND_PREGEN` default OFF.

Validação executada:

`pnpm --filter @laudousg/api exec tsx src/server/pipeline/__tests__/command-stripper.manual.ts`

Resultado: 10 passaram, 0 falharam.

Também rodei simulações adversariais locais para testar over-strip.

## Findings

### ALTO — `NA_CONCLUSAO_RE` remove conteúdo clínico quando "na conclusão" não é comando

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandStripper.ts:23` a `26` define `NA_CONCLUSAO_RE = /\bna\s+conclus[ãa]o[,:\s]+.+?(?:[.;\n]|$)/gi`.
- O trecho `[,:\s]+` aceita só espaço depois de "conclusão", não exige vírgula/ dois-pontos nem verbo de comando.
- Simulação: `stripCommandSpans("Na conclusão do exame físico, paciente refere dor no hipocôndrio direito.")` retornou `clean=""` e removeu a frase inteira.

Impacto:

Se o médico ditar uma frase clínica contendo "na conclusão do exame..." ou algo parecido, o stripper apaga conteúdo real antes da extração/writer. Isso é pior que eco de comando.

Correção concreta:

Tornar o regex mais estrito. Exigir pontuação ou verbo de comando:

- `\bna\s+conclus[ãa]o\s*[,;:]\s+...`
- ou `\bna\s+conclus[ãa]o\s+(?:recomend|acrescent|adicion|inclu|coloqu|pode\s+colocar|escrev)\w*...`

Adicionar golden negativo: `Na conclusão do exame físico...` não deve ser removido.

### ALTO — `RECOMENDAR_RE` remove achado clínico que contém "recomendar" como texto, não como comando

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandStripper.ts:25` a `26` define `RECOMENDAR_RE = /\brecomend(?:ar|e|o)\s+.+?(?:[.;\n]|$)/gi`.
- Simulação: `stripCommandSpans("Imagem nodular recomendar controle evolutivo medindo 0,8 cm na mama direita.")` retornou `clean="Imagem nodular"` e removeu a medida/lateralidade.

Impacto:

Esse é o risco clínico principal: a remoção acontece antes da geração. Se a frase removida era parte de um achado ou de uma conduta ditada como conteúdo, a informação some do draft. Se as flags de aplicação não recompõem esse comando depois, vira perda real.

Correção concreta:

Não stripar `recomendar` solto. Exigir contexto de comando claro:

- começo de frase após pausa forte e alvo de conclusão: `(?:^|[.;\n]\s*)recomend...`
- ou `na conclusão, recomendar...`
- ou verbos imperativos claros: `recomende ...`

Para `recomendar` infinitivo, eu deixaria para Fase 1/2 aplicar pós-geração sem remover pré-geração, a menos que venha com `na conclusão`.

### ALTO — `COMMAND_PREGEN ON` com `COMMAND_OPERATIONS OFF` pode perder comandos stripados

Evidência:

- `stripCommandSpans` remove comentários, replace, `na conclusão` e `recomendar` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandStripper.ts:46` a `49`.
- O route aplica comandos depois via `applyConfiguredCommands` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:901` a `904` e `:953` a `956`.
- `applyConfiguredCommands` usa `applyCommandOperations` só se `COMMAND_OPERATIONS === "true"`; senão cai no `applyCommandGuard` legado em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:1213` a `1216`.
- O `commandGuard` legado só cobre comandos de conclusão; não aplica `add_comment` nem `replace_phrase`.

Impacto:

Com `COMMAND_PREGEN=true` e `COMMAND_OPERATIONS=false`, um comando de comentário ou replace é removido do ditado que gera o draft e depois não é reaplicado pelo legado. Ex.: "Acrescente após comentários..." some do draft e não entra nos comentários. "No lugar de X escreva Y" some do draft e não substitui nada. Isso é lost-command.

Correção concreta:

Não permitir essa combinação silenciosa. Opções seguras:

- Se `COMMAND_PREGEN=true`, forçar internamente `COMMAND_OPERATIONS=true` para aplicar Fase 1 tipada.
- Ou, no `genText`, stripar apenas spans que a configuração atual consegue reaplicar: se `COMMAND_OPERATIONS=false`, remover só `na conclusão/recomendar` que o `commandGuard` legado cobre, e não remover `COMMENT_RE/REPLACE_RE`.
- Melhor: criar helper `commandsEngineEnabled = COMMAND_OPERATIONS || COMMAND_INTERPRETER` e só stripar comentários/replace/body quando houver aplicador correspondente ligado.

### MÉDIO — `COMMENT_RE` pode remover texto clínico que menciona "comentários" sem ser comando

Evidência:

- `COMMENT_RE` exportado em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:52` a `53` aceita verbos como `inclu\w+` + `comentários`, com o alvo opcional.
- Como o alvo é opcional, frases como "O laudo prévio inclui comentários sobre cisto renal" podem casar a partir de `inclui comentários sobre cisto renal`.
- `stripCommandSpans` usa esse regex para remover span pré-geração em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandStripper.ts:46`.

Impacto:

Menos provável no ditado típico, mas ainda é over-strip de conteúdo. O comentário do código diz alta confiança; esse caso não é alta confiança porque falta imperativo e falta alvo explícito "nos/após comentários".

Correção concreta:

Para stripping pré-geração, usar regex mais estrito que o extractor de ops:

- exigir forma imperativa/ação de comando (`acrescente`, `adicione`, `coloque`, `inclua`) e alvo explícito (`nos comentários`, `após comentários`, `ao final dos comentários`);
- não aceitar `inclui comentários` como comando.

Pode manter `COMMENT_RE` amplo para extração pós-geração, mas o stripper deveria importar ou definir uma variante `COMMENT_STRIP_RE` mais conservadora.

### MÉDIO — `REPLACE_RE` pode comer demais quando não há pontuação entre comando e achado seguinte

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:56` a `57` captura `to` até primeiro `.`, `;` ou quebra de linha.
- O stripper remove todo o match em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandStripper.ts:47`.

Exemplo adversarial:

`Próstata normal. No lugar da frase do resíduo escreva resíduo desprezível bexiga com volume de 463 mL.`

Sem pontuação após `resíduo desprezível`, o strip remove também `bexiga com volume de 463 mL`.

Impacto:

Perda de achado/medida quando o ASR não pontua bem, que é cenário real de ditado.

Correção concreta:

Não dá para resolver 100% com regex simples. Reduzir dano com limite de tamanho e stops por próximo gatilho clínico/comando. Para pregen, considerar stripar replace apenas quando houver pontuação clara após o `to`, ou quando o match for curto. O interpretador LLM da Fase 2 é melhor para replace semântico; o stripper deveria ser mais conservador.

### BAIXO — `loadDeterministicBundle` ainda recebe raw original, mas isso não é canal direto de eco

Evidência:

- O bundle loader recebe `rawInput: reqInput.consolidated_transcript ?? reqInput.raw_input` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:638` a `642`.
- Os quatro pontos que viram texto de geração usam `genText`: structurer em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:492` a `497`, renderer em `:769` a `773`, writer fast-path em `:786` a `795`, fallback em `:838` a `845`.

Impacto:

Não vi risco de eco direto porque o raw original aqui seleciona bundle/variante, não entra no user message do writer/renderer. Mas comando no raw poderia influenciar seleção de variante se contiver palavras gatilho de modelo.

Correção concreta:

Opcional: passar `genText` também para `loadDeterministicBundle` para seleção de variante ignorar comandos. Se a intenção é que comandos possam influenciar variante, documentar.

## Itens avaliados

### 1. Segurança / over-strip

Há risco real de remover conteúdo clínico. Os principais pontos:

- `NA_CONCLUSAO_RE` é amplo demais por aceitar whitespace após "conclusão".
- `RECOMENDAR_RE` remove "recomendar..." mesmo sem alvo de conclusão ou forma imperativa.
- `COMMENT_RE` tem alvo opcional e pode pegar texto que só menciona comentários.
- `REPLACE_RE` depende de pontuação; ASR sem ponto pode engolir achado seguinte.

Exemplos adversariais que seriam removidos indevidamente:

- `Na conclusão do exame físico, paciente refere dor no hipocôndrio direito.`
- `Imagem nodular recomendar controle evolutivo medindo 0,8 cm na mama direita.`
- `O laudo prévio inclui comentários sobre cisto renal simples.`
- `No lugar da frase do resíduo escreva resíduo desprezível bexiga com volume de 463 mL.`

### 2. Wiring

Os quatro pontos de geração estão cobertos:

- Structurer: `runStructurer({ rawInput: genText })`.
- Renderer: `runRendererStream({ rawInput: genText })`.
- Writer fast-path: `rawUserMessage: fastPath ? genText : undefined`.
- Fallback do renderer para writer: `rawUserMessage: genText`.

Não vi outro canal de draft recebendo o raw original. O writer sem fast-path usa `findings`, que vieram do structurer com `genText`. O renderer faz extração própria com `genText`.

Resume: ele pula structurer e usa findings persistidos. O request atual de resume não vira draft clínico pela extração; portanto não é o mesmo risco de eco do ditado original. O raw existente aparece em auditoria/RAG query, não como user message direto de geração pelo trecho revisado. Ainda assim, se resume usar fast-path com `rawUserMessage: genText`, o `genText` do request atual está coberto.

### 3. Flag-combo

`COMMAND_PREGEN ON` sem `COMMAND_OPERATIONS ON` é perigoso para comentário e replace. Eu trataria como configuração inválida ou strip condicional por capacidade de reaplicação.

Regra segura:

- `COMMAND_PREGEN=true` deve exigir `COMMAND_OPERATIONS=true`.
- Se quiser permitir legado, stripar apenas comandos que o legado reaplica com segurança.

### 4. Byte-stability

Confirmado por leitura: com `COMMAND_PREGEN OFF`, `genText === effectiveInput` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:180` a `185`.

Então o caminho de geração recebe exatamente o mesmo ditado de antes. A importação do stripper não altera comportamento. Byte-idêntico depende das outras flags permanecerem iguais, mas `COMMAND_PREGEN` OFF isoladamente não muda o input.

### 5. `.+?(?:[.;\n]|$)`

Captura só até a primeira pontuação/quebra quando há pontuação boa. Com ASR sem pontuação, captura até o fim da frase longa ou até o fim do input. Então pode comer demais.

Além disso, no caso de `NA_CONCLUSAO_RE`, o problema maior nem é o `.+?`; é o prefixo aceitar whitespace, fazendo "na conclusão do exame..." parecer comando.

## Veredito

Eu não ligaria `COMMAND_PREGEN` ainda. A ideia é correta e o wiring principal está bom, mas o stripper pré-geração precisa ser mais conservador que o extractor pós-geração. Antes de ligar: estreitar `NA_CONCLUSAO_RE`, remover ou condicionar `RECOMENDAR_RE`, criar regex de comentário específico para strip, e bloquear a combinação `COMMAND_PREGEN=true` com `COMMAND_OPERATIONS=false`.
