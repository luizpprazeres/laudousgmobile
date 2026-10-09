# W2 — Variante mínima para a migração Haiku

Branch `fix/obst-extracao-minima`, criada de `feat/haiku-migration` em `dd8ffb35`. A branch histórica `fix/obst-extracao-ig` permanece intacta em `400c1155`, incluindo a variante de IG biométrica/referência explícitas e sua auditoria. Esta entrega substitui essa variante para avaliação da migração, sem apagar o histórico.

## Escopo mínimo

Os prompts originais da base foram conferidos contra o pai de `636288b4`: eram idênticos. Foram acrescentadas somente as regras de semanas sem dias = zero nos três pares de IG, data de exame apenas quando uma data for ditada, vitalidade ausente diferente de embrião não visualizado e percentil auxiliar condicionado à correspondência do IP. CCN/embrião descrito significa visualizado; `gestacao_inviavel` fica restrito a saco sem embrião explicitamente ditado.

O texto original que define `ig_semanas/ig_dias` e `ig_referencia_hoje_*` foi preservado. Não foram acrescentadas instruções de prioridade de “hoje”, separação nova, reconhecimento especial do CCN, fonte DUM estruturada ou fallback de IG. Nenhum schema, consumidor ou pipeline recebeu alterações nesta frente. `dopplerObstetricoModule.ts` recebeu somente uma regra de texto; cálculos existentes permanecem iguais.

## Validação

Os sete gates passaram: contrato de extração 293/293, equivalência de catálogo 21.600/21.600, golden Doppler 32, percentis Barcelona 10, obstétrica 10, golden objetivo 31 e matriz clínica 23B1. `pnpm -F api typecheck` e `git diff --check` passaram. A conferência textual confirmou código fora dos três prompts e regras originais de IG idênticos à base (`invariantes-minima.json`). Evidência local: `tmp-review/haiku-migration/gates-minima.json` e logs `*-minima.log`.

## Bancadas R/A

Rodadas `2026-10-09T23-23-03-obstetrica+doppler_obstetrico` e `2026-10-09T23-23-03-morfologico`, 45 dias, concorrência 4, Haiku/Opus pela assinatura. Comparadores: 16-07-36 do repositório principal (obstétrica), 16-54-54 e 22-29-28 deste worktree (ambas as famílias). Dados de pacientes, chamadas, diffs e HTMLs ficam somente em `tmp-review/`.

As 69 gerações e os 69 julgamentos concluíram, sem falha de autenticação e sem necessidade de `--reuse`. Ambos os HTMLs foram gerados localmente.

| A: família / rodada | Média | Falhas técnicas | Impressão aceita pelo juiz |
| --- | ---: | ---: | ---: |
| Obstétrica/Doppler 16-07-36 | 6,10 | 2 | 24/46 |
| Obstétrica/Doppler 16-54-54 | 5,74 | 2 | 25/46 |
| Obstétrica/Doppler 22-29-28 | 5,43 | 1 | 21/46 |
| Obstétrica/Doppler mínima 23-23-03 | 5,70 | 0 | 23/46 |
| Morfológico 16-54-54 | 5,61 | 0 | 8/23 |
| Morfológico 22-29-28 | 5,17 | 0 | 5/23 |
| Morfológico mínima 23-23-03 | 5,52 | 0 | 8/23 |

A mínima recupera parte da nota frente à separação explícita de IG, mas não elimina os problemas clínicos. Contra 16-07-36, obstétrica: 17 notas maiores, 12 iguais, 17 menores; contra 16-54-54: 18 maiores, 12 iguais, 16 menores; contra 22-29-28: 21 maiores, 13 iguais, 12 menores. Morfológico contra 16-54-54: 9 maiores, 6 iguais, 8 menores; contra 22-29-28: 10 maiores, 10 iguais, 3 menores. Esses números são quedas brutas de nota, não contagem de regressões confirmadas.

Comparabilidade: a base atual contém o motor Haiku W1, ausente nas bancadas anteriores. Seu `ai/llm.ts:263`/`:317` completa anuláveis omitidos antes da validação. O replay `93d48961`, antes rejeitado por campo Doppler ausente, agora passa com a mesma resposta armazenada; essa melhora não é efeito do prompt. Todos os outros R obstétricos são idênticos aos de 16-54/22-29 e todos os R morfológicos permanecem idênticos. Contra 16-07 há mais sete diferenças de R da base Barcelona `7809c3bf`. O replay atual coincide com produção em 16/46 e 4/15; oito morfológicos sem replay não representam falhas de extração. O juiz também varia notas em textos idênticos.

Na 16-07-36, o juiz substituiu duas falhas A pelo texto B2; a nota histórica desses casos não mede sucesso do renderer. Na mínima os dois casos não falham tecnicamente, mas o objeto fetal inadequado produz presença/BCF/CCN indevidos. Não considerar isso melhora clínica nem nova regressão: o conflito de contrato já era conhecido.

| Prioritário | 16-07 | 16-54 | 22-29 | Mínima | Conferência da extração |
| --- | ---: | ---: | ---: | ---: | --- |
| 9bbb44a0 | 6 | 10 | 10 | 10 | Dias da primeira US zero; cabeçalho preservado. |
| 8af4d1cb | 6 | 9,5 | 10 | 6 | Dias zero corretos, mas referência hoje null: cabeçalho omitido. |
| a14ccf00 | 3 | 5,5 | 5 | 4 | data_exame null correto; referência hoje null, cabeçalho omitido. |
| b4a09bfb | 4 | 10 | 5 | 4 | Biometria e referência distintas; divergência leve mantém biometria na conclusão. |
| bec362d5 | 2 | 8 | 7 | 7 | CCN preservado, ausência de vitalidade, sem falso embrião não visualizado. |

## Auditoria das quedas e achados graves

As tabelas cobrem toda a união das quedas contra os três comparadores. Não atribuir ao modelo os percentis/DV calculados pelo renderer nem contar os dois casos conhecidos sem embrião como novas regressões. A regra auxiliar condicionada ao IP foi conferida nas chamadas apontadas pelo juiz; os percentis que surgiram com null no JSON vieram do código.

Rastreabilidade nesta branch: IG primária alimenta `OBSTETRICA.ts:1099`/`MORFOLOGICO.ts:454`; ausência de biometria e divergência leve em `ig.ts:307`/`:338`. Referência hoje direta vence em `ig.ts:227`; sem ela são necessárias datas explícitas para cálculo. Doppler completa percentis em `categories/dopplerObstetricoModule.ts:113`/`:255`, calcula perfil em `:286` e monta índices em `:173`. Esses cálculos existentes não foram alterados.

Apresentação/polo passam por `OBSTETRICA.ts:837`; líquido por `:957`; filtro de conclusão livre por `:1060`; reaplicação de comandos na bancada em `bench-abdomen.ts:394`. Anatomia e marcadores morfológicos passam pelo renderer `MORFOLOGICO.ts:946`. São origens dos problemas de montagem citados abaixo, sem alteração nesta frente.

### Obstétrica/Doppler

| Caso | 16-07 / 16-54 / 22-29 | Mínima | Origem / interpretação |
| --- | --- | ---: | --- |
| 540c7e60 | 5.5 / 6 / 6.5 | 6 | Mesmo conteúdo clínico; queda do juiz apesar de remover duplicação de situação. Modelo de normalidade e DSM médio preexistentes; final não corresponde ao ditado. |
| 713cb21a | 6 / 3 / 3.5 | 4 | Texto A idêntico a 22-29; percentis calculados pelo renderer, excluídos como regressão. IR preservado no JSON e omitido na montagem que privilegia IP. |
| 93d48961 | 6 / 6.5 / 5 | 5.5 | Biometria/referência ditadas preservadas; correção longa e conclusões Doppler automáticas diferem do final. Percentil auxiliar com IP correspondente foi preservado, não inventado. |
| a9570dfe | 6 / 6 / 6.5 | 6 | Perda real da referência estruturada pela DUM: campos de referência null. Limitação da extração com o texto original, sem reinserir regra de fonte/IG estruturada nesta mínima. |
| 89d87fca | 4 / 8 / 5 | 4.5 | Pares biométrico e de referência distintos; política de divergência leve mantém biometria. Em 7787bc68, apresentação cefálica agora correta, sem o erro da rodada 22-29. |
| e4250978 | 7 / 8.5 / 6.5 | 7 | Pares biométrico e de referência distintos; política de divergência leve mantém biometria. Em 7787bc68, apresentação cefálica agora correta, sem o erro da rodada 22-29. |
| e1f15cab | 5 / 2.5 / 3 | 2.5 | Fala contradiz referência estruturada; extrator preservou fala literal. Necessita revisão da fonte do dado. DV calculado e demais percentis excluídos como regressão de extração. |
| 7787bc68 | 6 / 10 / 2 | 5 | Pares biométrico e de referência distintos; política de divergência leve mantém biometria. Em 7787bc68, apresentação cefálica agora correta, sem o erro da rodada 22-29. |
| 87bfacbe | 6 / 0 / 0 | 0.5 | Caso conhecido sem embrião: objeto fetal presente satisfaz schema, mas renderer afirma embrião/BCF/CCN indevidamente. Excluído como nova regressão; zero falhas técnicas não significa acerto clínico. |
| f49dab7a | 9.5 / 9 / 6 | 9 | Mesmo texto clínico dos comparadores anteriores à separação explícita; mínima omite referência que foi ditada, mas médico também retirou do final. Melhora da nota não prova melhor extração. |
| d8ca86ad | 9 / 3 / 8 | 8 | IG e medidas preservadas. Duplicação de situação e linha DUM redundante, classe de erro já existente. |
| e8f3c669 | 6 / 7.5 / 5 | 7 | Fonte da primeira US agora correta, ao contrário de 22-29. Estática/placenta divergem do final, mas fala ambígua sustenta leitura; redação da correção exige edição. |
| 71a86d78 | 8.5 / 5 / 9.5 | 9 | Dorso interpretado de transcrição defeituosa, plausível e fiel ao contexto; queda de estilo, sem nova divergência clínica comprovada. |
| 6b4e7b65 | 6 / 5.5 / 4 | 4.5 | Autocorreção fragmentada e comparação repetida entre extração e reaplicação de comandos, defeito já conhecido. Percentis calculados/auxiliares excluídos como regressão. |
| a14ccf00 | 3 / 5.5 / 5 | 4 | Campos da primeira US presentes, mas referência atualizada omitida; sem data de exame ditada, renderer não calcula hoje e perde cabeçalho. Perda real de extração, não só política do renderer. Dias zero e data_exame null corretos; cálculos Doppler excluídos. |
| 722892f9 | 8.5 / 6 / 5 | 4.5 | DV/percentis e média uterina calculados, excluídos como regressão. Resta correção da IG mais longa que o final, baseada em dados ditados, e estilo. |
| 372c1abc | 6 / 4 / 3 | 5 | Autocorreção fragmentada e comparação repetida entre extração e reaplicação de comandos, defeito já conhecido. Percentis calculados/auxiliares excluídos como regressão. |
| e664be29 | 5 / 6 / 4 | 4 | ILA e MBV estão no JSON; consumidor escolhe ILA e omite MBV. Omissão anterior do renderer, não nova perda de extração. Percentil calculado excluído. |
| 461296ff | 9.5 / 5 / 4.5 | 4 | Campos da primeira US presentes, mas referência atualizada omitida; sem data de exame ditada, renderer não calcula hoje e perde cabeçalho. Perda real de extração, não só política do renderer. Dias zero e data_exame null corretos; cálculos Doppler excluídos. |
| a328ecec | 7 / 0 / 0.5 | 1.5 | Caso conhecido sem embrião: objeto fetal presente satisfaz schema, mas renderer afirma embrião/BCF/CCN indevidamente. Excluído como nova regressão; zero falhas técnicas não significa acerto clínico. |
| 8af4d1cb | 6 / 9.5 / 10 | 6 | Campos da primeira US presentes, mas referência atualizada omitida; sem data de exame ditada, renderer não calcula hoje e perde cabeçalho. Perda real de extração, não só política do renderer. Dias zero e data_exame null corretos; cálculos Doppler excluídos. |
| e5dfd891 | 4 / 2 / 3 | 3 | Referência falada conflitante; sanity check exige revisão. PIG no corpo/conclusão é afetado por itens livres e filtro; mínima perdeu a frase no corpo versus 22-29. Apresentação por default e problema de conclusão preexistentes. |
| bec362d5 | 2 / 8 / 7 | 7 | CCN preservado, bcf_alteracao ausente e gestacao_inviavel null. Queda de estilo: situação duplicada e conclusão dividida; não voltou a ausência falsa de embrião. |
| c15610f5 | 8 / 9 / 8 | 8 | Dois dados de IG ditados preservados; texto de correção do consumidor é mais longo que o final assinado. Nenhuma nova perda de medidas. |
| 0644bbf0 | 10 / 10 / 10 | 6 | Campos da primeira US presentes, mas referência atualizada omitida; sem data de exame ditada, renderer não calcula hoje e perde cabeçalho. Perda real de extração, não só política do renderer. Dias zero e data_exame null corretos; cálculos Doppler excluídos. |
| 9d6e1379 | 8.5 / 5 / 5.5 | 4 | DV/percentis e média uterina calculados, excluídos como regressão. Resta correção da IG mais longa que o final, baseada em dados ditados, e estilo. |
| b4a09bfb | 4 / 10 / 5 | 4 | Pares biométrico e de referência distintos; política de divergência leve mantém biometria. Em 7787bc68, apresentação cefálica agora correta, sem o erro da rodada 22-29. |
| e34b444b | 9 / 8 / 8 | 8.5 | Mesmo conteúdo; técnica fixa do modelo difere de correção manual não ditada. Sem nova regressão clínica comprovada. |

### Morfológico

| Caso | 16-07 / 16-54 / 22-29 | Mínima | Origem / interpretação |
| --- | --- | ---: | --- |
| 2ad2b03f | — / 8.5 / 5 | 5 | IG biométrica e referência corretas; divergência leve mantém biometria na conclusão. Mesma política de 22-29, sem nova perda de medidas. |
| c901adcd | — / 7 / 6 | 6 | Texto idêntico a 22-29. Normalidade do líquido por default do renderer sem avaliação ditada, problema anterior. |
| 28b46196 | — / 5 / 3.5 | 4.5 | Conclusão ganhou IG frente a 22-29; persistem polo prefixado duas vezes e qualificadores anatômicos perdidos. Problemas existentes de extração/montagem. |
| a840a89f | — / 6 / 4 | 4 | Texto idêntico a 22-29: IG biométrica null e referência disponível, consumidor deixa conclusão em branco. Proposta sem_biometria permanece necessária. |
| 5cba24bf | — / 3 / 4 | 3 | Polo extraído com frase inteira e prefixado pelo consumidor; duplicação nesta chamada. Normalidades de marcadores e conclusões extras já existentes. |
| 576a3e3e | — / 4 / 7 | 4 | TN null versus valor interpretado em 22-29, mas fala está truncada e não define medida inequívoca. Não confirmar valor pelo final corrigido; exige revisão humana. Polo também duplicado. |
| 85b435c8 | — / 6.5 / 4 | 6 | IG agora presente na conclusão; perda da fonte na redação e qualificadores anatômicos, problemas anteriores. Sem nova perda de biometrias. |
| 4ee711fe | — / 4 / 4 | 3 | Percentis/DV são calculados pelo renderer a partir de IPs e IG agora presentes; excluídos como regressão. IR no JSON, suprimido pela montagem. Normalidade do líquido é política anterior. |
| aa44bd41 | — / 9 / 5 | 5 | IG biométrica e referência corretas; divergência leve mantém biometria na conclusão. Mesma política de 22-29, sem nova perda de medidas. |
| e86ad155 | — / 7.5 / 6.5 | 7 | Conversão literal cm→mm preservada; médico corrigiu unidade no final. Referência ditada mantida; não corrigir medida por plausibilidade sem confirmação. |

Achados graves sem queda nova: `6fa53251` mantém o mesmo conflito de embrião não visualizado; `3a270df9` mantém vesícula/BCF afirmados por modelo e conclusão livre fragmentada; `25f515be` mantém perda de conteúdo obstétrico em categoria Doppler; `b80a63e5` mantém comparação do peso suprimida pelo filtro de conclusão. Em morfológico, `c675f495` mantém contradição entre texto vascular livre e conclusão automática; `cc2cf63a` mantém normalidades de marcadores não ditadas; `18997ac7`/`b315f01e` têm médias/percentis do código, não inventados pelo extrator. `c18f149a` recuperou a IG pelo CCN e deixou anatomia_precoce null, eliminando o bloco extra de 22-29; o cabeçalho sem dados da primeira US ainda deriva do placeholder na entrada. `4ec6cc3b` recuperou IG, mas resumiu a hipótese do mioma de forma mais categórica. Esses limites permanecem documentados para revisão, sem ampliar os prompts nesta mínima.

Conclusão da auditoria: a variante mínima está implementada e validada no escopo pedido. A queda não pode ser atribuída integralmente à política do renderer: a amostra também mostra omissões reais de referência e variações de texto livre. Não há evidência para GO clínico irrestrito a partir dos gates ou da média. Dados completos e diffs estão em `tmp-review/haiku-migration/review-minima.json`; sem transcrições no relatório. Não houve push, PR, deploy, env remoto ou alteração de banco.


## Propostas de política do renderer — não implementadas

**Sem biometria:** `ig.ts:307` retorna `sem_biometria` com a conclusão baseada na âncora biométrica ausente, mesmo quando existe referência atualizada válida. Proposta para Luiz: quando não há IG biométrica ditada, mostrar na conclusão a IG de referência com a fonte explicitamente identificada, sem preenchê-la artificialmente no campo biométrico e sem calcular IG a partir das medidas. Se a referência também estiver indeterminável, manter pendência explícita para revisão. Exige decisão clínica sobre texto e consumidores antes de implementação.

**Divergência leve:** `ig.ts:338` mantém a IG biométrica na conclusão quando a diferença é menor ou igual ao limiar atual de 5 dias (`ig.ts:31`), mesmo havendo referência atualizada distinta. Proposta para Luiz: definir se a conclusão deve manter esse comportamento ou mostrar a IG de referência que o médico usa para assinar, preservando a biométrica no corpo e a discrepância quando cabível. A decisão deve também esclarecer precedência de `corrigir_ig` e comando explícito do médico, sem alterar o cálculo de percentis por efeito colateral. Não foi mudado o limiar nem forçada a cópia de referência pelo prompt.

Essas propostas são decisões de produto clínico, não correções implementadas nesta migração mínima. A bancada não constitui aprovação clínica global.

## Proposta: gestação inicial sem embrião — não implementada

**Recomendação:** manter o caminho determinístico e introduzir estado explícito de visualização embrionária, separado de vitalidade e de diagnóstico de inviabilidade. Um slot “embrião não visualizado” é necessário, mas isoladamente não resolve o contrato nem impede as frases automáticas de presença e BCF.

Hoje `ObstetricaFindingsSchema` exige `numero_fetos >= 1` e ao menos um objeto em `fetos[]` (`OBSTETRICA.ts:118–121`), enquanto o JSON Schema enviado ao extrator permite zero e array vazio (`OBSTETRICA.ts`, bloco `properties`). A extração fiel de ausência de embrião passa pela primeira etapa e falha na validação Zod. Forçar um objeto vazio para satisfazer o contrato é inadequado: os renderers usam `EMPTY_FETO` como fallback e ainda emitem presença, BCF e CCN no ramo inicial. O catálogo também inclui esses slots.

Uma futura alteração conjunta de schema, prompt e consumidores deve permitir `fetos=[]` apenas quando `gestacao_inicial=true` e a ausência de embrião estiver explícita. Nesse estado, a montagem precisa omitir presença, apresentação, BCF, CCN, peso, anatomia e movimento fetal; preservar saco/DSM, vesícula e anexos apenas conforme o dado disponível; incluir a ausência de embrião e a conclusão aprovada para o caso. Sem informação de visualização, não deduzir ausência a partir de CCN ou BCF null. Em gemelares, o estado deve ser representado por saco/instância, sem reduzir o número de sacos ao número de embriões visualizados.

`gestacao_inviavel` não pode substituir esse estado: ausência de embrião num exame precoce não basta para declarar inviabilidade. O prompt atual aceita “saco gestacional sem embrião” nesse flag e o slot do catálogo conclui critérios de inviabilidade (`catalog/OBSTETRICA.classico.ts:1128–1139`). Esse conflito preexistente exige revisão clínica específica; a W2 só restringiu o flag para que óbito de embrião visualizado não acione ausência de embrião.

Não recomendo rota writer genérica para contornar a falha nem apenas relaxar `.min(1)`: ambas deixam o defeito clínico dos consumidores sem resolver. Até a mudança completa, manter rejeição explícita e revisão manual é mais seguro que inventar embrião/BCF. O adapter Web `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts:280` declara atender somente gestação única de 2º/3º trimestre e fixa um feto, portanto não fornece hoje uma representação de gestação inicial sem embrião. Aprovação clínica e inventário completo de consumidores Web/mobile/Sala devem anteceder a ativação. Nenhuma dessas mudanças foi implementada.
