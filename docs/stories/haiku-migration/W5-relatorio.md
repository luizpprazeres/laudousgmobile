# W5 — Datação escolhida e gestação inicial

Implementação em `feat/obst-datacao-escolhida`, criada da base integrada `feat/haiku-migration` (`1a231310`). As branches da W2 permanecem intactas. Nenhum push, PR, deploy, alteração de ambiente remoto ou escrita no banco.

## Contrato entregue

O backend aceita os três modos nas categorias obstétrica, obstétrica com Doppler e morfológica, nos estilos clássico e objetivo. O campo da W6 foi conferido com `git show feat/web-datacao-escolhida:apps/web/src/lib/catalog/obstetricaParaCatalogo.ts`: é **`dados.datacao_conclusao`**, com `biometria`, `us_precoce` ou `biometria_e_us_precoce`. A opção de contexto `datacaoConclusao` também existe; se ambas forem fornecidas, o contexto explícito prevalece.

No catálogo Web, inclusive na rota `/api/catalog/[category]/render` e no estado do exame, modo ausente significa **biometria**. No renderer usado pela geração por voz, referência válida da primeira US sem pedido explícito significa **us_precoce**. O pedido extraído `datacao_pedido` separa corrigir, relacionar e manter a biometria. A leitura de `corrigir_ig` antigo continua: true corresponde ao comando antigo ambíguo corrigir/correlacionar e usa a frase combinada; false mantém biometria. O enum novo prevalece sobre esse booleano. O extrator envia `datacao_conclusao = null`; a escolha explícita desse campo vem do cliente Web.

As três frases são as do briefing, com a mesma redação no clássico e no objetivo. O limiar de cinco dias não escolhe mais a conclusão. A classificação histórica e o sanity check permanecem: divergência implausível no ditado automático conserva biometria e aviso de revisão; escolha explícita Web mantém o modo escolhido e o aviso. A fonte de IG usada pelo cálculo de percentis não foi alterada nesta frente.

**Decisão final do Luiz: DUM sozinha, sem primeira US, não corrige a conclusão.** O backend mantém a IG pela biometria, tanto na voz como na Web, inclusive com `corrigir_ig` antigo ou modo de referência enviado por cliente antigo. A DUM continua disponível como informação no corpo. Foram acrescentados testes em obstétrico e morfológico, clássico e objetivo. A decisão substitui a pendência do complemento anterior; não há decisão de DUM em aberto.

Só referência válida pela primeira US, sem biometria, produz conclusão pela referência, inclusive quando o modo Web antigo/ausente é biometria. Pedido explícito de referência sem nenhuma referência válida falha; não produz frase que atribua a IG a uma US inexistente.

## Data de geração

Quando a primeira US tem data e IG inicial, mas não há data de exame ditada nem IG atualizada diretamente, o renderer fornece ao cálculo a data de geração em **America/Sao_Paulo**. O cálculo puro recebe essa data como contexto `dataGeracao`. `data_exame` nos achados extraídos continua null quando não foi ditada uma data. A referência atualizada ditada diretamente tem prioridade sobre a aritmética. O teste cobre a virada do dia UTC/São Paulo.

Isso afeta replay histórico: sem data de exame salva e sem referência atualizada salva, a primeira US é atualizada para a data da geração atual. Não se pode tratar essa mudança como erro de extração nem comparar sua datação com a do laudo histórico sem considerar o contexto temporal.

## Gestação inicial sem embrião

O schema permite `fetos = []` e `numero_fetos = 0` somente em gestação inicial com ausência explícita de embrião. Há estado separado de visualização de embrião e vesícula. CCN/embrião descrito significa embrião visualizado; vitalidade ausente não significa ausência de embrião. A ausência inicial isolada não aciona `gestacao_inviavel`.

O bloco compartilhado do renderer direto e catálogo omite presença fetal, BCF, CCN, peso, anatomia e movimentos para o saco sem embrião. Preserva os campos ditados de útero, saco, DSM, vesícula e anexos. DSM pode ser informado diretamente ou calculado pela média dos três eixos. Via transvaginal/abdominal só aparece quando informada.

Com vesícula presente: `Embrião ainda não visualizado.` Sem vesícula: `Embrião e vesícula vitelínica ainda não visualizados.` A conclusão é exatamente `Gestação inicial.` e `Convém realizar nova ultrassonografia no prazo de duas semanas, com o objetivo de acompanhar a evolução.` Diagnóstico explícito de inviabilidade conserva a conclusão específica de inviabilidade, em vez de receber automaticamente a recomendação evolutiva.

Em gemelar, `sacos_gestacionais` mantém um objeto por saco, com estado próprio e índice do embrião visualizado. A validação rejeita índice inexistente, duplicado ou que descarte embrião; o teste de saco A sem embrião e saco B com embrião prova duas descrições e somente um BCF. A bancada real não contém um caso misto equivalente: essa cobertura é sintética, não evidência clínica real de gemelar.

O JSON Schema obstétrico mudou por autorização específica da W5, junto com Zod, prompt, consumidor e testes. Os campos novos são opcionais na leitura de achados antigos e obrigatórios/nullable no contrato de extração estrita. A validação condicional é feita no Zod. `modeloNormal.ts` agora desembrulha ZodEffects para gerar o achado normal; o arquivo já contém um byte NUL na base e o Git mostra diff binário (`git diff --text` permite revisar a única alteração). A alteração em `golf-ball.manual.ts` é somente adaptação de fixture à forma do schema; o motor/pipeline de produção não foi editado.

## Validação

Os sete gates da W2 passaram: contrato-extracao-obstetrica, catalog-equivalence, doppler-obstetrico-golden, doppler-percentis-barcelona, obstetrica, obstetrica-objetivo-golden e obstetrica-23b1-clinical-matrix. `catalog-equivalence` passou nos 21.600 cenários comparando os dois consumidores atualizados; isso prova paridade entre consumidores, não identidade com a política da base. As diferenças em relação à base são só-referência preenchida, frase escolhida sem limiar, data de geração e DUM sem correção; são cobertas por testes dedicados.

A suíte nova W5 passou em **116 verificações**, incluindo os três modos, dois caminhos de default, gestação inicial e chamada real da rota POST do catálogo com dados sintéticos. Os testes de IG existentes foram atualizados para as decisões aprovadas: 42 verificações de `ig.manual.ts` e 10 de `ig-sanity.manual.ts` passaram. `pnpm -F api typecheck` e `git diff --check` passaram. A rota `/api/generate` não foi chamada com persistência; a bancada executa seu renderer/pipeline real por assinatura, sem escrita no banco.

Logs privados em `tmp-review/haiku-migration/*-W5.log`, `gates-W5.json`; dados e diffs reais permanecem somente em `tmp-review/`.

## Bancada e auditoria

Rodadas por assinatura `2026-10-09T23-43-51-obstetrica+doppler_obstetrico` (46 casos) e `2026-10-09T23-43-51-morfologico` (23 casos), R,A, 45 dias, concorrência 4. Comparação com a variante mínima `2026-10-09T23-23-03-*`, mesmos IDs. Todos os 69 casos foram gerados e julgados; A teve zero falhas técnicas. HTML, resultados, chamadas e auditoria privada em `tmp-review/bench-haiku/` e `tmp-review/haiku-migration/review-W5.json`.

| Grupo | A mínima → W5 | Impressão A mínima → W5 | R mínima → W5 | Impressão R mínima → W5 |
|---|---:|---:|---:|---:|
| Obstétrica/Doppler | 5,70 → 6,12 | 23/46 → 28/46 | 6,03 → 5,77 | 28/46 → 27/46 |
| Morfológica | 5,52 → 5,70 | 8/23 → 10/23 | 3,04 → 2,96 | 4/23 → 3/23 |

R mudou em 28/46 replays obstétricos e 11/15 morfológicos existentes, pela política e contexto atuais. A amostra morfológica tem somente 15 replays de produção; os oito casos restantes não têm renderer salvo e entram sem texto R no julgamento agregado. A diferença da nota do candidato GPT, cujo texto é o mesmo, entre as rodadas também mostra variação do juiz. Não atribuir toda oscilação de nota ao código.

Os casos iniciais `87bfacbe` e `a328ecec` produziram texto válido, sem linhas fetais indevidas e com as duas conclusões aprovadas. Notas A: 0,5 → 7,5 e 1,5 → 8,0 nesta comparação concreta. A evidência é a saída A/Haiku com renderer, não fallback B2. As diferenças restantes são técnica de exame alterada pelo médico no laudo final, arredondamento/estilo e preposição de localização; não são ausência de embrião mal classificada.

### Todas as quedas de nota A contra a mínima

Obstétrica/Doppler tem 15 quedas. `f49dab7a` (9 → 5), `fad3b90f` (9,5 → 6,5), `71a86d78` (9 → 6), `a2089a36` (10 → 5), `936b6740` (10 → 5), `9bbb44a0` (10 → 8) e `68757f57` (5 → 4) mudam a conclusão para a primeira US pela decisão da W5 (`ig.ts:382–413`). As referências estão nas entradas reais; não foram inventadas. Em `936b6740`, a extração nova colocou a referência estruturada no campo atualizado, enquanto a mínima a colocara em primeira_us_ig; em ambos a origem é a entrada. `71a86d78` perde uma descrição de dorso que não foi dita, então não é omissão nova. `fad3b90f` também tem uma variação menor de redação do dorso. O PIG que o juiz cobra em `68757f57` já faltava na mínima; retirar a IG biométrica da frase é o modo escolhido, não falha de extração. A proposta de usar frase combinada nesses exames, se o médico a desejar, já é atendida pelo modo explícito.

`1304da57` (4 → 3) tem corpo Doppler idêntico à mínima; só a datação mudou. Percentis e média das uterinas vêm do cálculo existente quando a linha estruturada não bate com os IPs ditados (`categories/dopplerObstetricoModule.ts:92,125–134`). O juiz os chama de troca, mas isso não é regressão de extração da W5. A omissão de IR é anterior.

`25f515be` (3 → 2,5), `41df8796` (5 → 4,5), `bbabcee3` (6,5 → 6) e `28a596b1` (4,5 → 4) têm saída A byte a byte igual à mínima. São variação do juiz sobre omissões/duplicação já presentes, não novas regressões.

`3a270df9` (3 → 2,5) tem perda real de observação livre sobre vesícula e encurtamento da justificativa de ausência de evolução na extração nova. Também extrai a primeira US histórica, antes ausente, e recebe o aviso de divergência implausível por atualização à data de geração; o sanity conserva biometria. O pedido `relacionar` veio da interpretação de uma comparação evolutiva, não de comando literal de datação. São limitações de extração/comandos livres documentadas; o embrião continua visualizado, e o caso não usa o ramo novo sem embrião (`OBSTETRICA.ts:565–580,610`; `ig.ts:400`). BCF/vesícula normais cobrados pelo juiz já apareciam no modelo mínimo. Não foram tratados como aprovação clínica.

`372c1abc` (5 → 3) deixa média/percentil de uterinas null na extração nova e o renderer calcula o percentil; a mudança numérica calculada não é regressão de extração de percentil. Há, porém, omissão real de uma frase da conclusão sobre evolução do percentil de peso, presente na mínima, e persistência da comparação duplicada. `e34b444b` (8,5 → 8) extrai a expressão inteira de situação em um campo que o renderer já prefixa, produzindo repetição. São diferenças reais de conteúdo livre/redação, fora da escolha de IG (`OBSTETRICA.ts:941–949`).

Morfológica tem sete quedas. `cc2cf63a` (6 → 5), `0b43fad5` (8 → 7) e `18997ac7` (5 → 4) só mudam a frase de IG para a primeira US. As demais críticas do juiz já estavam na mínima. O IP médio/percentil recalculado em `18997ac7` é idêntico entre rodadas; não é extração nova nem regressão W5. `576a3e3e` (4 → 3) mantém TN ausente e a mesma referência DUM atualizada entre rodadas; o juiz interpreta como troca de IG pela DUM, mas o trecho “hoje com” existe na entrada. A conclusão permanece pela biometria como decidido. A TN omitida é problema real anterior, não corrigido pela W5.

`bac0c17b` (9 → 5) tem diferença real: a extração nova coloca “situação variável” em polo_cefalico e o renderer existente assume transversa sempre que esse campo existe. `a0b4c915` (8,5 → 7) e `99b92152` (6 → 5) repetem situação/polo porque a extração colocou a frase completa em vez de somente o lado. O segundo também recebe a frase de correção aprovada. Origem confirmada nas chamadas; consumidores em `MORFOLOGICO.ts:681–682,833–834`. Não escondemos essas diferenças de redação sob a política de IG.

### Erros graves e alegações de invenção

Foram confrontadas as chamadas Haiku e os diffs dos casos com erros de medida/lateralidade ou invenções, além de todas as quedas acima. As principais famílias restantes são modelos normais que acrescentam modo M/tricúspide/líquido, omissão de IR, arredondamento de peso/percentil, conversão literal de unidade do ditado, anatomia resumida, fragmentos livres e Doppler calculado. Esses problemas são anteriores ou variação da extração; estão separados das mudanças autorizadas de datação.

`713cb21a`, `1304da57`, `e1f15cab`, `372c1abc`, `18997ac7`, `4ee711fe`, `a14ccf00` e `9d6e1379` ilustram percentis, médias, perfil hemodinâmico ou DV produzidos pelo módulo determinístico. Conferimos os campos brutos: não imputamos ao extrator valores que apareceram somente depois do cálculo (`dopplerObstetricoModule.ts:125–162`). O DV apontado em `e1f15cab` já estava no resultado mínimo; a W5 não alterou seu cálculo. A incompatibilidade entre linha auxiliar de percentis e IP continua sendo filtrada no prompt.

`c675f495` continua com unidade de colo divergente do final, sem mudança de extração dessa medida; a expressão patológica espúria anterior desapareceu. `e86ad155` mantém a conversão literal da unidade ditada, corrigida pelo médico no final. `82a7940d` mantém biometria porque a extração omitiu a referência estruturada da primeira US, tanto na mínima como na W5. É omissão real preexistente de referência; não houve pedido do médico para manter biometria. Arredondamentos nos casos `b80a63e5`, `4ec6cc3b`, `0b43fad5` e `28b46196` não foram mudanças de medidas extraídas nesta frente.

Diferenças novas fora da IG também foram registradas mesmo quando a nota subiu: `89d87fca` extrai objeto Doppler com todos os campos null em vez de null e o renderer passa a gerar bloco de Doppler insuficiente; `a840a89f` duplica conclusão de morfologia; `61a22347` varia o uso dos campos de anatomia e conclusões livres; `6b4e7b65` perde a mesma frase de evolução do percentil observada em `372c1abc`. Isso impede interpretar a melhora média como ausência de regressões individuais. São achados para revisão, não novos bloqueios de política do Luiz.

## Limitações e revisão

As decisões `sem_biometria` e divergência leve levantadas na W2 estão implementadas conforme a W5; não restam propostas de política pendentes. As notas do juiz medem semelhança com laudos históricos, cuja política de datação é anterior às decisões atuais. Não equivalem a aprovação clínica automática.

As limitações preexistentes de anatomia, IR, normalidades do modelo, fragmentos livres e frase de situação fetal estão registradas na auditoria. Não foram ampliadas em escopo para um refactor de renderer. CodeRabbit NÃO EXECUTADO. Pronto para revisão do orquestrador; sem publicação.
