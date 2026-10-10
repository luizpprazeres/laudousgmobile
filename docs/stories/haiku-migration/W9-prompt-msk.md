# W9 — Prompt do writer dedicado do MSK: cobertura, sequência descritiva e numeração

Terminal: W4 (Claude Code Opus 5.5). Branch nova a partir de `feat/haiku-migration` (que já tem o guard de comandos por
laudo do W1 rodada 3): `fix/msk-writer-prompt`. Leia `_comum.md`.

## O que o Luiz viu no HTML do W8 (09/10, noite)

1. **Omissão de frases de estruturas normais** — principalmente no Haiku.
2. **Sequência descritiva invertida/parafraseada.** Ele quer, para uma estrutura com alteração que não compromete a
   própria estrutura: `Tendão patelar de espessura, continuidade e ecotextura preservadas, com irregularidade cortical e
   osteófitos marginais na origem do tendão patelar.` — o Haiku escreveu `Tendão patelar com irregularidade cortical e
   osteófitos marginais na sua origem, sem alteração de espessura ou continuidade identificável.` (inverteu, parafraseou e
   inventou "sem alteração… identificável"; caso 1a704f8c). O Sonnet manteve o padrão.
3. **Numeração invadindo os laudos seguintes** em multi-laudo ("5) ULTRASSONOGRAFIA DO JOELHO ESQUERDO", "6) COMENTÁRIOS:"…)
   — 9 casos no W8 (52e66a0a, 4df4735a, bbd7e07b, 701e7f25, 7e82264c, e8f02f03, 455b50b7, 19599614, + produção em 4). A W8
   rodou em `0d075090`, **antes** do guard por laudo (`ce33d744`): primeiro confirme se o guard novo já resolve; o prompt
   deve reforçar de qualquer modo.
4. Parte das diferenças são edições dele depois da geração (acrescentou o que não estava no ditado) — não trate como erro
   do modelo (o juiz já é instruído assim; confira).

## Diagnóstico no prompt (`renderer/categories/MUSCULOESQUELETICO.ts:551`, `buildMskWriterSystemMessage`)

- "Estrutura ALTERADA: descreva a MORFOLOGIA" — não manda partir da frase de normalidade nem manter a ordem dos atributos.
- "cubra EXATAMENTE estas estruturas" — não manda seguir a ORDEM do roteiro, copiar a frase normal LITERALMENTE, nem
  conferir no fim.
- Numeração: só "(1 item = sem número; vários = "1) 2) 3)")" — não diz que recomeça em cada laudo nem que só vale dentro
  da CONCLUSÃO.

## Tarefas

1. **Medir antes de mudar** (determinístico, sem juiz): para cada laudo-bloco do W8
   (`tmp-review/bench-haiku/w8/2026-10-09T23-36-04-musculoesqueletico_v2`, candidatos gpt/A/AS), conte as frases de
   normalidade do roteiro que estão no laudo FINAL do médico e faltam no candidato; quantas linhas de estrutura alterada
   seguem o padrão "frase normal + ', com …'" quando o final segue; e invasões de numeração. Esse é o placar do W9.
2. **Padrões reais do médico:** extraia dos laudos finais MSK (90 dias, banco só leitura) como ele escreve estrutura alterada
   — (a) alteração adjacente que não compromete a estrutura ("…preservadas, com …"); (b) atributo alterado (ex.:
   espessamento/ecogenicidade) — e use exemplos reais (anonimizados, só a frase) no prompt. Não invente estilo.
3. **Reescreva as regras do prompt** (mantenha o que funciona): ordem fixa do roteiro por laudo; frase de normalidade
   copiada literalmente; estrutura alterada = frase da casa com o atributo trocado OU frase normal + ", com <alteração nas
   palavras do médico>"; proibido parafrasear o ditado e inventar ressalvas ("sem alteração… identificável"); numeração
   recomeça em `1)` na CONCLUSÃO de CADA laudo e só existe ali; conferência final por laudo (estruturas = roteiro, conclusão
   só do próprio segmento/lado). Sem aumentar muito o prompt (é cacheável e vai para Haiku e Sonnet).
4. **Bancada pela assinatura** (MSK 71, mesma janela do W8): A (Haiku, dedicado) e AS (Sonnet, dedicado) com o prompt novo,
   julgados JUNTO com os candidatos do W8 (gpt, A e AS antigos) — use `--rename` para não sobrescrever (ex.: A2, AS2).
   Reporte o placar da tarefa 1 antes × depois, as notas do juiz, e os 9 casos de numeração.
5. Testes: os `.manual.ts` do MSK (writer, formato, auditoria) e typecheck.

## Entregável

Commits em `fix/msk-writer-prompt`, seção nova na revisão (`docs/reviews/2026-10-revisao-renderers-prompts.md`), HTML local
com os candidatos lado a lado para o Luiz, status `status/W9.md`. Nada de push/deploy.
