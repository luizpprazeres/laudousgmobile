# Review dex1 — DOPPLER_OBSTETRICO determinístico

Escopo: revisão de fidelidade clínica e formato do renderer novo, sem alterar código.

Validação executada:

`pnpm --filter @laudousg/api exec tsx src/server/renderer/__tests__/doppler-obstetrico-golden.manual.ts`

Resultado: 24 passaram, 0 falharam.

## Findings

### ALTO — O route ainda sobrescreve a conclusão determinística com o parser regex antigo

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/renderer.ts:271` monta `DOPPLER_OBSTETRICO` pelo novo `renderDopplerObstetrico(...)`.
- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:922` a `925` roda `correctDopplerConclusion(finalText, extractDopplerData(dopplerInput))` para todo `DOPPLER_OBSTETRICO`, inclusive quando o renderer determinístico foi usado.
- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:63` a `70` tem flags tipadas extraídas pelo novo schema (`umbilical_alterado`, `acm_alterado`, `incisura`, `pre_centralizacao`, `centralizacao`, `uterinas_acima_p95`).
- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/dopplerOverlay.ts:387` a `390` remove os itens Doppler existentes e reconstrói a conclusão a partir do `DopplerData` vindo do regex.

Impacto:

O renderer pode acertar a conclusão via achados tipados, mas o route pode jogar esse acerto fora e reconstruir pela extração regex antiga do raw input. Isso enfraquece exatamente o ganho clínico do renderer determinístico. O golden passa porque testa `renderDopplerObstetrico` isolado, não o caminho real `/api/generate` com pós-processadores.

Correção concreta:

No `route.ts`, pule `correctDopplerConclusion` quando `useRenderer === true && effectiveCategory === "DOPPLER_OBSTETRICO"`. Alternativa melhor: se quiser manter uma camada final, passe o `DopplerData` derivado dos findings tipados do renderer, não de `extractDopplerData(raw)`.

### CRÍTICO — Gestação inicial / óbito / vitalidade podem sair como feto vivo normal

Evidência:

- A fonte clínica marca como caso crítico `cf262e82`: Doppler normal gerado para embrião sem vitalidade em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:136`.
- A mesma fonte diz que a variante de gestação inicial deve trocar as linhas Doppler por `Dopplervelocimetria normal das artérias uterinas.` e remover pré-centralização/perfil em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:63` a `64`.
- O schema herdado tem `gestacao_inicial` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:41`, e o prompt Doppler só diz que ela "quase sempre" é false em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:112`.
- O renderer Doppler ignora `gestacao_inicial` e sempre emite: BCF presente, movimentos fetais ativos, estruturas cranianas/coluna normais, estômago/bexiga normais em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:239` a `256`.

Impacto:

Se o dictado cair como gestação inicial, embrião sem vitalidade, BCF ausente, óbito ou caso fora do padrão feto único >14s, o renderer pode afirmar normalidade que não foi medida e vitalidade que não existe. Isso é clínico, não cosmético.

Correção concreta:

Adicionar campo explícito de vitalidade/óbito no schema Doppler, ou bloquear o renderer determinístico para `gestacao_inicial === true` até implementar variante própria. No mínimo: se `gestacao_inicial` ou ausência/negativa de BCF vier no input, não emitir BCF presente, movimentos ativos, anatomia fetal normal, pré-centralização/perfil fetal ou boilerplate de Doppler fetal.

### MÉDIO — A seção DOPPLERVELOCIMETRIA ainda emite a linha extra de perfil hemodinâmico fetal

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/dopplerOverlay.ts:229` a `231` emite `Perfil hemodinâmico fetal: X.` quando consegue calcular o perfil.
- O caso golden d213131b passa com AU 1,27 e ACM 2,31, o que calcula perfil 0,55, mas o teste não verifica ausência dessa linha.
- O pedido desta revisão informa que o laudo real d213131b não tinha `Perfil hemodinâmico fetal: 0,55.` na seção de corpo.

Impacto:

O renderer fica determinístico, mas não fiel ao final aceito pelo Luiz nesse caso. A frase de perfil deve ficar na conclusão (`Perfil hemodinâmico fetal é normal, menor de 1.0.`), não como linha numérica extra no corpo.

Correção concreta:

Remover a emissão de `Perfil hemodinâmico fetal: ${numFmt(perfil)}.` de `buildDopplervelocimetriaSection`, ou gatear por flag específica se algum modelo futuro pedir essa linha. Para o caso d213131b, remover.

### MÉDIO — Líquido MBV está semanticamente correto, mas não bate a frase canônica do Luiz

Evidência:

- Fonte canônica: corpo deve ser `O maior bolsão vertical mede {N} cm.` em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:51`.
- Fonte canônica: conclusão deve ser `Líquido amniótico de quantidade normal (maior bolsão vertical mede {N} cm).` em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:52` e `:57`.
- O helper reusado emite corpo `Maior bolsão vertical de {N} cm.` e conclusão `Líquido amniótico em quantidade normal (maior bolsão vertical de {N} cm).` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:392` a `395`.
- O golden atualmente fixa a forma não-canônica em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/__tests__/doppler-obstetrico-golden.manual.ts:108` a `109`.

Impacto:

Não troca MBV por ILA, então a segurança principal está ok. Mas o texto não é o final aceito/canônico do Luiz.

Correção concreta:

Para `DOPPLER_OBSTETRICO`, usar helper próprio de líquido ou parametrizar `liquido(...)` para emitir:

`O maior bolsão vertical mede 2,9 cm.`

`Líquido amniótico de quantidade normal (maior bolsão vertical mede 2,9 cm).`

### MÉDIO — Placenta perde o sufixo canônico "de acordo com a fase da gestação"

Evidência:

- O modelo Doppler base contém `Placenta de localização ..., com ecotextura ..., de acordo com a fase da gestação.` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/prompts/contracts/DOPPLER_OBSTETRICO.ts:119`.
- A fonte clínica também marca a correção de placenta truncada para incluir `de acordo com a fase da gestação` em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:116`.
- O helper reusado monta `Placenta de localização ..., grau ..., com ecotextura ...` sem esse sufixo em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:376` a `380`.

Impacto:

Desvio de estilo/fidelidade frente ao modelo Doppler aceito. Não é risco clínico direto, mas incomoda por diferença textual recorrente.

Correção concreta:

No renderer Doppler, usar frase própria para placenta clássica: quando houver localização/ecotextura/grau, terminar com `, de acordo com a fase da gestação.`. Não mexer globalmente em `OBSTETRICA` sem revisar impacto em obstétrico comum.

### BAIXO — Peso clássico usa "gramas"; o modelo Doppler base usa "g"

Evidência:

- Modelo Doppler base: `Peso aproximado de ____ g (+- ____ g, percentil ____).` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/prompts/contracts/DOPPLER_OBSTETRICO.ts:117`.
- Helper reusado: `Peso aproximado de ... gramas (+- ... gramas, percentil ...)` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/OBSTETRICA.ts:355` a `360`.
- O renderer Doppler chama esse helper em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:250`.

Impacto:

Cosmético, mas é um dos desvios que o Luiz tende a perceber comparando com o modelo histórico.

Correção concreta:

No Doppler clássico, usar linha própria com `g`: `Peso aproximado de 775 g (+- 113 g, percentil 2).` O estilo objetivo já usa `g`.

### BAIXO — A frase de IG tem uma vírgula que não está no snippet canônico

Evidência:

- Fonte canônica: `devendo ser corrigida pela ultrassonografia precoce compatível com {IG_âncora}.` em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:43`.
- `computeIg` emite `devendo ser corrigida pela ${fonteLabel}, compatível com ${fmtR}.` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/ig.ts:319`.
- O golden atual espera a vírgula em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/__tests__/doppler-obstetrico-golden.manual.ts:85`.

Impacto:

A doutrina está correta: âncora = biometria atual; referência = US precoce/DUM; divergência >5d aciona correção. O problema é só fidelidade textual fina.

Correção concreta:

Se o objetivo for texto exatamente igual ao snippet do Luiz, remover a vírgula antes de `compatível`. Como isso é helper compartilhado com OBSTETRICA/MORFOLOGICO, ajustar golden/expectativas das três categorias junto.

## Itens avaliados

### 1. Fidelidade da conclusão

A ordem principal está correta no renderer isolado:

IG Domingos -> líquido -> peso <P3/Gratacós -> IP normal -> incisuras -> centralização -> perfil.

Evidência no renderer: `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:258` a `263`.

O item de peso <P3 + Gratacós vem de `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/pesoFetalGuard.ts:95` a `101`, e a posição após líquido está correta.

Ressalva importante: no caminho real, `route.ts` pode reconstruir a conclusão depois do renderer via `correctDopplerConclusion`, então a fidelidade precisa ser testada E2E no `/api/generate`, não só no renderer isolado.

### 2. Formato

Manter:

- Percentis na seção Doppler: correto e alinhado com `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:65`.
- Decimais de biometria: manter por segurança de medida ditada. O prompt manda preservar casa decimal em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:114` a `116`, e a regra clínica geral diz nunca dropar medida ditada em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:123`. Se o Luiz decidir arredondar no corpo, isso deve ser decisão explícita, não side effect.
- Ducto venoso IP numérico no corpo: manter quando ditado; o prompt está correto em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:139` a `140`.

Remover/ajustar:

- Remover `Perfil hemodinâmico fetal: 0,55.` da seção DOPPLERVELOCIMETRIA.
- Trocar `Maior bolsão vertical de X cm.` por `O maior bolsão vertical mede X cm.`.
- Trocar `Líquido amniótico em quantidade normal...` por `Líquido amniótico de quantidade normal...`.
- Usar `g`, não `gramas`, no peso clássico Doppler.
- Incluir `de acordo com a fase da gestação` na placenta Doppler quando houver descrição placentária.

### 3. Segurança

Sem problema:

- Não afirma normalidade de vaso não medido dentro de `buildDopplerConclusionItems`: `fraseNormalIP` lista só vasos medidos em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/dopplerOverlay.ts:250` a `289`.
- Percentil do peso é reproduzido, não inventado, e só dispara PIG/GIG/Gratacós conforme faixa em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:218` a `227`.

Problemas:

- Gestação inicial/óbito/vitalidade é o maior risco. O renderer emite vitalidade e anatomia normal por default.
- Achados adicionais patológicos entram no corpo em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:265` a `267`, mas não entram na conclusão. Isso pode ser aceitável para observações leves, mas é insuficiente para gatilhos canônicos como golf ball, malformação, óbito, bradicardia ou achado que o Luiz espera como item próprio.

### 4. Extraction prompt

Fiel nos pontos principais:

- Percentis da linha `-> Percentis ...`: prompt cobre explicitamente em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:136` a `138`.
- MBV vs ILA: prompt manda nunca trocar bolsão por ILA em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:119` a `121`.
- Campos do épico IG: prompt cobre data do exame, primeira US, IG da referência hoje, fonte e comando corrigir em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:122` a `128`.
- Ducto venoso IP vs qualitativo: prompt separa IP numérico de descrição qualitativa em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/renderer/categories/DOPPLER_OBSTETRICO.ts:139` a `140`.

Ressalvas:

- O prompt diz que `gestacao_inicial` "quase sempre false"; isso não é segurança suficiente para o caso crítico de óbito/gestação inicial. Precisa instrução dura e/ou gate de código.
- As flags de alteração dependem de verbalização; isso é coerente com a doutrina de AU/ACM manual e uterinas auto, mas o route atual pode descartar essas flags tipadas ao reconstruir pelo regex antigo.

### 5. Gating / flag OFF

Confirmado por leitura de código: com `DOPPLER_OBSTETRICO` fora de `RENDERER_CATEGORIES`, o caminho cai no writer atual.

Evidência:

- `RENDERER_CATEGORIES` é lido em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:732` a `738`.
- `programmatic` só fica true se a categoria estiver na flag e em `RENDERER_PROGRAMMATIC_CATEGORIES`, em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:741` a `742`.
- `useRenderer` vem de `programmatic || rendererTemplateBody !== null` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:753`.
- Sem renderer, o gerador escolhido é `runWriterStream(...)` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:774` a `789`.

Conclusão: flag OFF deve manter o comportamento atual. Como `OBSTETRICA.ts` só exportou helpers e o novo arquivo Doppler não tem side effects, a expectativa é byte-idêntico no output. Eu não rodei um teste E2E comparativo OFF vs baseline antigo; a confirmação aqui é por leitura do gate real.

## Veredito

O renderer isolado está na direção certa e acerta a espinha clínica do caso comum: IG Domingos, MBV/ILA, percentis, peso <P3 + Gratacós, boilerplate Doppler e normalidade só de vaso medido.

Eu não liberaria ainda sem duas correções antes: pular a reconstrução regex da conclusão quando o renderer Doppler estiver ligado, e bloquear/implementar o caminho de gestação inicial/óbito/vitalidade. Depois disso, ajustar os desvios textuais de MBV, perfil no corpo, placenta e `g` vs `gramas`.
