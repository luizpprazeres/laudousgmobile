# W17 — Edição incremental: "acrescente <achado>" deixa o laudo contraditório

**Status:** InReview · **Branch:** `fix/edicao-acrescente` (base `feat/haiku-migration`)

## Problema (Luiz, 10/10)
No `/api/edit`, "acrescente um cisto simples de 2 cm no rim direito" acrescentava o achado, mas a
frase normal do órgão e a conclusão normal ficavam. Caso de produção (abdome, 10/10 22:28):
"Acrescente no corpo: Aorta abdominal com placas calcificadas parietais." virou uma linha NOVA
embaixo de "Aorta abdominal de calibre e contornos normais." e a conclusão seguiu "Órgãos e
estruturas abdominais estudadas sem evidência de alterações ecográficas."

## Causa raiz (`apps/api/src/server/pipeline/editReport.ts`, antes do W17)
1. O prompt (l. 5–13) só tinha a regra de SUBSTITUIÇÃO; nada dizia que o acréscimo desmente a
   frase normal do órgão.
2. O alvo padrão é `"body"` (`packages/shared/src/schemas/edit.ts:11`), e a diretiva (l. 122)
   mandava "NÃO altere a conclusão".
3. Mesmo que o modelo mexesse na conclusão, `validateEditScope` (l. 146–155) recusava a edição.

## Critérios de aceite
- [x] Acréscimo reescreve a frase normal do órgão que o achado desmente (sem mexer nos outros órgãos).
- [x] Conclusão que diz que o exame/órgão é normal é trocada pelo achado, com a numeração refeita.
- [x] Com alvo "body", o acréscimo pode mexer na conclusão só para manter a coerência; a substituição segue barrada.
- [x] Guard pós-geração: achado patológico novo não convive com "exame dentro dos limites da normalidade"
      (tira o item e renumera; se só sobra o item normal, uma nova tentativa ao modelo e, falhando, recusa).
- [x] Casos de substituição do golden antigo seguem passando.

## Tarefas
- [x] Reproduzir pela assinatura (`scripts/bench-haiku/edicao-acrescente.ts`): antes 3/8.
- [x] Prompt (regra do ACRÉSCIMO + conclusão coerente), diretiva do alvo, escopo e guard.
- [x] Teste determinístico (`__tests__/editReport-acrescimo.manual.ts`): 33/33.
- [x] Bancada depois: 8/8 em duas rodadas seguidas; A2 (caso de produção) 5/5 seguidas.

`PROMPT_VERSION` não muda: o prompt da edição não entra no hash de `prompts/version.ts`.

## File List
- `apps/api/src/server/pipeline/editReport.ts`
- `apps/api/src/server/pipeline/__tests__/editReport-acrescimo.manual.ts`
- `apps/api/scripts/bench-haiku/edicao-acrescente.ts`
- `docs/stories/haiku-migration/W17-edicao-acrescente.md`
