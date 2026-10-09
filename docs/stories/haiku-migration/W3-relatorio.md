# W3 — Corpo descritivo e renderer do abdome

Estado: **pronto-para-revisao**. Branch `fix/corpo-descritivo`. Implementação: `05bec938` e `937a30d7`. Sem push, PR ou deploy.

## Prompt

`prompts/global.ts:45` recebeu o texto de B2: a linguagem de hipótese passa a ser restrita à conclusão, e o corpo descreve os achados. Foi acrescentada literalmente a ressalva aprovada contra presença/ausência de fenômenos acústicos, vascularização e características não ditadas.

O exemplo de B2 foi ajustado para que seu ditado contenha os atributos que aparecem no corpo. O exemplo antigo partia apenas do diagnóstico de cisto simples e acrescentava paredes finas e reforço posterior, contradizendo a ressalva nova. Não foi alterado o significado clínico da regra.

`prompts/contracts/ABDOMEN_TOTAL.ts:54` passou de “preferencialmente” para “SOMENTE na CONCLUSÃO; o corpo é descritivo”. `prompts/styles.ts:70` perdeu a interpretação de esteatose no exemplo de ACHADOS; o diagnóstico permanece na IMPRESSÃO. B2 agora falha intencionalmente pela ausência da regra antiga; a rodada usou B.

## Defeitos corrigidos

| Defeito | Antes | Depois |
|---|---|---|
| Hipodistensão | A busca por `/distendid/` transformava “hipodistendida” em distendida. | A busca exige a palavra inteira “distendido/distendida”, com plural opcional. Hipodistensão segue como achado livre, preservado. |
| Diagnóstico no corpo | Cistos, cálculos e outros achados terminavam em “compatível com”, “compatíveis com” ou “sugestiva de”. | As frases catalogadas descrevem a imagem; os mesmos diagnósticos e ressalvas permanecem na conclusão. |
| Achados livres | Um rim não visualizado ou com nefropatia recebia a abertura normal antes da frase livre. Outros órgãos também recebiam defaults normais. | Defaults de normalidade são suprimidos quando há achados livres; medidas e achados canônicos continuam presentes. String vazia suprime o fallback, enquanto `null` continua representando órgão normal. |
| Ausência cirúrgica renal | `ausente_cirurgico` retornava `null` e imprimia rim normal. | Corpo e conclusão registram ausência cirúrgica, com lateralidade, sem inferir agenesia. |

As mudanças estão em `renderer/phrases/ABDOMEN_TOTAL.ts`. A entrada síncrona objetiva também conserva o texto livre do médico, tal como a clássica, e a clássica respeita a supressão do fallback mesmo quando o texto livre está vazio. Não foram editados pipeline, roteamento, extração, banco ou ambiente remoto.

## Testes e goldens

`pnpm -F api typecheck` passou no início e depois das mudanças. Os 11 arquivos `renderer/__tests__/abdomen-*.manual.ts` passaram, incluindo o novo `abdomen-corpo-descritivo.manual.ts`. O teste novo cobre os dois rins, os estilos clássico/objetivo, os 11 órgãos com achados livres, ausência cirúrgica, hipodistensão e preservação de medidas/conclusões de lesões canônicas combinadas com achados livres.

As matrizes 23A1/23A2 atualizaram de propósito as expectativas de lama biliar, calcificações, colesterolose e trombo, removendo o diagnóstico do corpo e mantendo a conclusão. Elas já falhavam antes da mudança: isso foi reproduzido com a versão original do renderer. Agora isolam as frases do catálogo, sem desviar rins/bexiga para os contratos urinários compartilhados. A fixture de cisto passou a informar localização; entradas de aneurisma sem medida e bexiga com repleção insuficiente e dados conflitantes passaram a verificar o bloqueio vigente do adapter, em vez de esperar um laudo dessas entradas inválidas.

Os goldens existentes passaram sem alteração de snapshots. Os testes de boletim regeneraram HTMLs com diferenças antigas, sem relação com esta entrega; essas saídas foram descartadas.

## Biblioteca

`catalog-equivalence.manual.ts` passou em 21.600 combinações. Esse teste cobre OBSTETRICA, não prova isoladamente a equivalência do abdome.

A comparação direta do renderer original com o atual confirmou modelo normal byte a byte idêntico em clássico e objetivo. A Biblioteca deriva esse modelo normal do renderer; seus slots normais permanecem iguais. A Web e as prévias com alterações passam a receber as frases descritivas corrigidas e a supressão da normalidade contraditória.

`modelo-projetado.manual.ts`, executado de `apps/api` com o `.env` local, passou em 926 verificações. O harness adicional `biblioteca-todas-categorias.manual.ts` passou 167 de 168 verificações e falhou no abdome por chamar `resolveCatalogo` sem o contexto `templateBody`; o catálogo do abdome clássico precisa dessa máscara. Isso não é regressão das frases: o modelo normal é idêntico e o harness de modelo projetado fornece a máscara e passa. A tentativa inicial desses dois harnesses na raiz falhou pela resolução do alias `@/server/env`; foram executados novamente no diretório correto.

## Bancada

Rodada local: `tmp-review/bench-haiku/2026-10-09T16-48-52`. Comando: `PGOPTIONS='-c default_transaction_read_only=on' pnpm exec tsx scripts/bench-haiku/bench-abdomen.ts --category ABDOMEN_TOTAL --scenarios R,A,B --days 90 --concurrency 2`, de `apps/api`. Geração e julgamento pela assinatura, sem chamadas reais à API OpenAI. Referência: `tmp-review/bench-haiku/2026-10-09T15-43-12`, no repositório principal.

A rodada gerou A e B para 38 casos; 14 são comuns à referência. B não teve “compatível com” no corpo. A teve uma ocorrência, numa frase de achado livre produzida pelo prompt isolado do pipeline, que não recebe o prompt global e está fora de W3. As frases determinísticas corrigidas não contêm mais essa interpretação positiva no corpo.

A busca por sombra, reforço e vascularização não literalmente ditados encontrou um acréscimo em B: sombra acústica em litíase da vesícula. O ditado e `calls.jsonl` confirmam que a sombra não foi dita. O mesmo acréscimo já existia em B e B2 da referência. Portanto não houve nova invenção acústica nesta rodada, mas a ressalva do prompt não eliminou todos os acréscimos antigos. Na referência, B tinha dois casos com sombra não ditada; nesta rodada, um. Isso é evidência limitada à amostra, não garantia clínica geral.

Replay: 16 válidos, dos quais 12 iguais à produção e quatro diferentes; 16 falharam por shape antigo de `structured_output` e seis não tinham caminho renderer em produção. Não contar falha de replay como regressão do renderer. Há registros históricos categorizados como abdome cujo ditado/final tratam de outros exames, e há dados acrescentados pelo médico apenas no final; críticas do juiz precisam ser confrontadas com o ditado.

O juiz concluiu os 38 casos, sem falhas de geração de A/B. Suas contagens automáticas foram:

| Candidato | Nota média | Omissões apontadas | Invenções apontadas | Erros de medida/lateralidade apontados |
|---|---:|---:|---:|---:|
| Produção armazenada | 6,64 | 34 | 35 | 4 |
| A | 6,62 | 35 | 60 | 8 |
| B | 7,22 | 22 | 27 | 6 |

Essas contagens incluem críticas discutíveis, divergência de exame e diferenças introduzidas apenas no final médico. Não são totais de defeitos confirmados nem justificam GO clínico. R teve 16 falhas de replay e não é comparável pela média global.

Nos 14 casos comuns, a nota média automática de A passou de 6,79 para 7,89 e B de 7,18 para 7,75; B2 da referência tinha 7,18. Juiz e geração são estocásticos, portanto essas médias são sinal de melhoria nesta amostra, sem teste estatístico ou promessa de equivalência clínica.

Foram revisados manualmente os 25 casos com nota abaixo de 7, erro de medida/lateralidade ou alegação de invenção em A/B. A revisão confrontou ditado, conteúdo de `calls.jsonl`, achados estruturados e montagem final. Registro local: `revisao-manual-W3.json`, dentro da rodada. As evidências clínicas completas permanecem exclusivamente em `tmp-review/`.

A revisão encontrou ainda `/m[óo]ve/` casando dentro de “imóvel”, no gatilho vesicular. O commit `937a30d7` exige a palavra inteira “móvel/móveis”. Foi repetida a bancada A nos dois casos afetados, com R de controle: `tmp-review/bench-haiku/2026-10-09T17-02-40`, opções `--scenarios R,A --days 90 --only 9f3a6716,46bf85a2 --concurrency 1`. Em ambos, A passou a conservar o achado imóvel sem sombra acústica nem litíase indevidas. Continuam limitações da conclusão livre e dos comandos. As notas focais de A foram 5 e 6; não constituem aprovação do laudo inteiro. A rodada principal precede essa correção adicional; a rodada focal e os testes manuais cobrem a mudança final.

A primeira rodada também usou uma montagem intermediária da abertura hepática combinada com achado livre; a redação “Fígado de aumento…” foi corrigida antes do primeiro commit para “Fígado com aumento…”. A regressão determinística final confirma a frase e a preservação do achado livre. A e B da bancada não dependem da entrada síncrona da Biblioteca, validada separadamente.

Os dois HTMLs de bancada foram gerados com `relatorio.py`, exclusivamente em `tmp-review/`.

## Origens confirmadas das críticas relevantes

| Origem | Evidência e encaminhamento |
|---|---|
| Busca dentro de palavras | Hipodistensão e imóvel conferidos nos achados estruturados. Corrigidos em `renderer/phrases/ABDOMEN_TOTAL.ts:540` e `:606`, com regressões e repetição focal. |
| Frases livres | Diagnóstico no corpo, inferência de gênero e interpretação ausente aparecem nas saídas `FreeSlots`. Prompt isolado em `pipeline/renderer.ts:180`; manter sob W1/W4. |
| Múltiplas litíases vesiculares | A extração contém dois achados, mas cada iteração escreve novamente `out.body`; `phrases/ABDOMEN_TOTAL.ts:259`. Mobilidade não informada vira móvel em `:214`, mesmo quando o ditado diz impactado. Defeito confirmado, adicional ao escopo inicial; proposta para W4, sem alteração nesta entrega. |
| Litíases renais múltiplas | A extração preserva plural e duas medidas, mas o renderer monta uma única imagem com medidas tratadas como eixos; `phrases/ABDOMEN_TOTAL.ts:488`. Revisar contrato de medidas por lesão junto ao consumidor, sem inferir a distribuição dos valores. |
| Terceiro eixo esplênico | Extração preserva três medidas; o builder usa apenas as duas primeiras em `phrases/ABDOMEN_TOTAL.ts:422`. Revisão W4 para índice esplênico e medidas. |
| Writer e máscara | Contradições entre esteatose e vasos normais, perda de grau/ressalva e nome de cisto no corpo já existem na resposta bruta B. Preservação do modelo em `prompts/global.ts:32` e frases específicas em `prompts/contracts/ABDOMEN_TOTAL.ts:172`/`:192` precisam de revisão de precedência com o ditado. Prompt melhorou a amostra, mas não garante cumprimento em todos os achados. |
| Comandos após geração | Comando literal e conclusão duplicada não estão na resposta bruta B e aparecem após `applyCommandOperations`, chamado pela bancada em `scripts/bench-haiku/bench-abdomen.ts:440`. Conferir `pipeline/commandOperations.ts:105` antes de atribuir tudo ao prompt. |
| Categoria histórica e final editado | `scripts/bench-haiku/bench-abdomen.ts:345` executa A na categoria resolvida do registro. Ditados de parede, região inguinal e carótidas em registros de abdome geram críticas de exame errado; dados acrescentados só no final não podem ser exigidos de uma geração baseada no ditado. |

## Pontos para W1/W4

O prompt dos free-slots em `pipeline/renderer.ts:180` pede frase descritiva, mas não proíbe explicitamente interpretação no corpo nem recebe a nova regra global. Isso explica a ocorrência restante em A. W3 não pode editar `pipeline/*`.

Há regras clínicas específicas que exigem revisão antes de mudá-las: `prompts/contracts/ABDOMEN_TOTAL.ts:86` transforma o comando de pólipo numa descrição canônica com ausência de fenômeno acústico; `prompts/styles.ts:30` pede nota explícita de estado em todas as estruturas; `prompts/universalCoreV2.ts:29` preserva normalidade do modelo não mencionada. A primeira conflita com a ressalva global em ditado contendo apenas o diagnóstico; as outras podem conflitar com a proibição de presumir características. Não foram reescritas sem evidência clínica específica. Os contratos mamário e pélvico têm regras próprias de conclusão e de exceção por comando explícito; não foram uniformizados.

O assembler síncrono pode manter conclusão geral normal quando há apenas achados livres sem conclusão própria. O corpo contraditório por órgão foi corrigido; decidir o fechamento global de achados livres sem diagnóstico é uma revisão adicional, compartilhada com o pipeline.

Não há decisão do Luiz necessária para concluir o escopo W3. A entrega não representa aprovação de push, deploy, roteamento ou liberação clínica geral da migração.
