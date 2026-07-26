# Review dex1 — COMMAND_OPERATIONS v1

Escopo: revisão read-only de fidelidade/segurança do interpretador determinístico de comandos.

Validações executadas:

`pnpm --filter @laudousg/api exec tsx src/server/pipeline/__tests__/command-operations-v2.manual.ts`

Resultado: 13 passaram, 0 falharam.

Também rodei simulações pontuais com `tsx -e` para os limites abaixo.

## Findings

### ALTO — `META_DROP` dropa comando clínico legítimo com "correlacionar com"

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:45` a `46` dropa qualquer item cujo texto case `correlacion\w*\s+com`.
- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:83` a `85` aplica esse drop depois de `extractConclusionCommands(cleaned)`.
- Simulação: `extractCommandOperations("Na conclusão, correlacionar com achados clínicos e laboratoriais.")` retorna `[]`.
- A fonte clínica diz que o parser deve executar comandos como "correlacione" no alvo certo, não simplesmente apagar, em `/Users/luizprazeres/laudousgmobile-def/docs/aprendizado-correcoes-luiz.md:124`.

Impacto:

O drop resolve o lixo de IG tipo "com a ultrassonografia precoce", mas apaga um comando clínico legítimo quando o médico pede correlação clínica/laboratorial na conclusão. O exemplo "recomendar correlação clínica com dados laboratoriais" passa porque usa "correlação", não "correlacionar"; mas "correlacionar com achados clínicos" é perdido.

Correção concreta:

Separar meta-comando de IG de correlação clínica. Em vez de `correlacion\w*\s+com` genérico, exigir contexto de IG/referência: `correlacion\w*\s+com\s+(?:a\s+)?(?:ultrassonografia\s+precoce|us\s+precoce|dum|data\s+da\s+última\s+menstruação|idade\s+gestacional|ig)\b`. Adicionar golden negativo: `Na conclusão, correlacionar com achados clínicos e laboratoriais.` deve gerar `add_conclusion_item`.

### ALTO — Captura dupla ainda acontece quando um comando fica dentro de `add_comment`

Evidência:

- O código remove trechos capturados de comentário em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:68` a `73`.
- Mas o loop de replace roda sobre `text.matchAll(REPLACE_RE)`, não sobre `cleaned.matchAll(REPLACE_RE)`, em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:75`.
- Simulação: `extractCommandOperations("Inclua nos comentários que no lugar de X escreva Y.")` retorna duas ops: `add_comment` com o texto literal e `replace_phrase` de `X` para `Y`.

Impacto:

Um texto que deveria ser apenas conteúdo dos COMENTÁRIOS pode virar também operação de substituição no laudo inteiro. Isso viola o contrato "executa no alvo certo" e torna `cleaned.replace(m[0], " ")` insuficiente para evitar captura dupla.

Correção concreta:

Processar cada extrator sobre o texto já limpo: depois do loop de comentário, rodar `for (const m of cleaned.matchAll(REPLACE_RE))`. Melhor ainda: usar spans/ranges dos matches e remover por índice em ordem decrescente, porque `replace(m[0])` é frágil quando há trechos repetidos. Adicionar golden com frase de comentário contendo "no lugar de".

### MÉDIO — `add_comment` não funciona em estilo objetivo sem seção `COMENTÁRIOS`

Evidência:

- `applyAddComment` só procura cabeçalho `COMENTÁRIOS:` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:101` a `105`.
- Se não acha, retorna `sem_comentarios`.
- Simulação com laudo objetivo `TÉCNICA / ACHADOS / IMPRESSÃO`: `applyOperations(..., [{ op: "add_comment", ... }])` não altera o laudo e retorna `reason: "sem_comentarios"`.
- O route aplica comandos tanto no writer quanto no renderer; no renderer objetivo vários laudos não usam `COMENTÁRIOS`, e sim `TÉCNICA/ACHADOS/IMPRESSÃO`.

Impacto:

O caso 43657c4b fica resolvido para templates clássicos com `COMENTÁRIOS`, mas o mesmo comando é silenciosamente ignorado no estilo objetivo. Para o médico, "acrescente nos comentários" continua não executado.

Correção concreta:

Definir fallback explícito para estilo sem `COMENTÁRIOS`: inserir a linha ao fim de `TÉCNICA:` quando o conteúdo descreve técnica/contexto do exame, ou criar uma seção `COMENTÁRIOS:` antes de `ACHADOS:`. Eu preferiria criar `COMENTÁRIOS:` antes de `ACHADOS:` só quando a op `add_comment` existir e não houver seção, porque preserva o alvo sem misturar com achados clínicos.

### MÉDIO — `COMMENT_RE` captura pouco para textos com ponto dentro do comentário

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:49` a `50` captura o comentário até o primeiro `.`, `;` ou quebra de linha.
- Isso é aceitável para "recém-nascido de 3 dias", mas corta comentários compostos: "acrescente nos comentários que exame limitado. Paciente não colaborativo." vira só "exame limitado".

Impacto:

Perda parcial de conteúdo ditado. Não é tão perigoso quanto inventar, mas ainda é comando não executado por completo.

Correção concreta:

Para v1, manter conservador se quiser, mas explicitar no golden. Se quiser cobrir melhor, capturar até próximo comando conhecido ou fim do ditado: `(?=(?:\bna conclusão\b|\bno lugar\b|\bacrescente\b|\badicione\b|\binclua\b|$))`, com testes para não engolir comandos seguintes.

### BAIXO — `normalizeAsrCommands` é razoavelmente conservador, mas ainda pode trocar "acionar" em frase não-imperativa com DUM/US no mesmo trecho

Evidência:

- `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/asrNormalize.ts:20` a `22` troca `acione/acionar/aciona` por `correlacione` se à frente houver `ultrassonograf`, `us precoce`, `dum` ou `conclus`.
- Isso roda apenas em `extractCommandOperations`, não no texto clínico final, porque é chamado em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/commandOperations.ts:61` a `63`.

Impacto:

Baixo, porque a normalização não altera o laudo diretamente. O risco é indireto: uma frase clínica não-comando contendo "aciona" e "DUM/conclusão" pode gerar comando espúrio ou mudar o match de `META_DROP`.

Correção concreta:

Exigir prefixo de comando perto do verbo: início de frase ou `(?:na conclusão|conclusão|favor|pode|deve|vamos|por favor)\s+acion...`, ou limitar a forma `acione` isolada, que é o erro ASR mais provável de "correlacione". Adicionar golden negativo com uso clínico de "aciona/acionar" que não deve virar operação.

## Itens avaliados

### 1. Segurança

`META_DROP` precisa estreitar. Ele deve dropar apenas meta-comandos de IG, não todo "correlacionar com". O caso legítimo "Na conclusão, recomendar correlação clínica com dados laboratoriais" passa hoje, mas "Na conclusão, correlacionar com achados clínicos e laboratoriais" é perdido.

`normalizeAsrCommands` não corrompe o laudo final diretamente, porque só roda no caminho de extração de operações. Mesmo assim, recomendo endurecer o contexto para comando imperativo.

### 2. Correção do `applyAddComment` e regexes

`applyAddComment` por primeira linha em branco é robusto para template clássico, onde `COMENTÁRIOS:` é um bloco separado por linha vazia. Ele não é robusto para objetivo sem `COMENTÁRIOS`.

`COMMENT_RE` acerta o caso-alvo 43657c4b, mas corta comentário com ponto interno. `REPLACE_RE` acerta o literal "no lugar de X escreva Y", mas captura dentro de comentário porque o segundo loop usa `text` em vez de `cleaned`.

### 3. Captura dupla

Não está confiável. `cleaned = cleaned.replace(m[0], " ")` ajuda para passar o texto limpo ao `extractConclusionCommands`, mas não evita dupla captura pelo `REPLACE_RE`, porque ele é aplicado sobre o texto original. Se houver comando de replace dentro de comentário, vira duas operações.

### 4. Gating

Confirmado: `COMMAND_OPERATIONS` default OFF mantém o caminho legado.

Evidência:

- Env default: `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/env.ts:51` a `55`.
- O route chama `applyConfiguredCommands(...)` em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:891` a `894` no writer e em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:943` a `946` no renderer.
- O helper escolhe `applyCommandOperations` só quando `env().COMMAND_OPERATIONS === "true"`; senão usa `applyCommandGuard`, em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/app/api/generate/route.ts:1193` a `1196`.

Conclusão: flag OFF não roda `extractCommandOperations`, `normalizeAsrCommands` nem `applyOperations`; usa o guard legado.

### 5. Cobertura que falta no v1

Além dos casos semânticos de fase 2 (`89de6e68` semântico e `88543eea`), eu cobriria estes v1 antes de ligar a flag:

- `correlacionar com achados clínicos/laboratoriais` como comando legítimo de conclusão.
- `add_comment` em estilo objetivo sem seção `COMENTÁRIOS`.
- comentário contendo texto que parece comando (`no lugar de`, `na conclusão`) sem disparar operação secundária.
- comentário com mais de uma frase.
- replace case-insensitive ou normalizado para acento/capitalização. Hoje `applyReplacePhrase` exige `laudo.includes(from)` literal em `/Users/luizprazeres/laudousgmobile-def/apps/api/src/server/pipeline/operations.ts:49` a `58`; isso é seguro, mas falha fácil se o laudo capitaliza ou acentua diferente do ditado.

## Veredito

O v1 resolve bem o caso clássico "acrescente nos comentários..." e mantém o rollback limpo pela flag. Eu não ligaria `COMMAND_OPERATIONS` ainda sem corrigir dois pontos: estreitar `META_DROP` para IG e fazer replace operar sobre `cleaned`/spans para evitar captura dupla. Depois disso, eu adicionaria fallback para objetivo sem `COMENTÁRIOS`.
