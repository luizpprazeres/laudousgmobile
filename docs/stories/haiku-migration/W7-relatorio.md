# W7 — Regras da casa

Implementado no worktree `prompts`, branch `fix/regras-da-casa-1010`, a partir de `feat/haiku-migration` com W1 e W3 integradas. Entregável pronto para revisão local. Não houve push, PR, deploy, alteração de ambiente Vercel nem escrita no banco. As rodadas e seus dados reais estão exclusivamente em `tmp-review/`, ignorado pelo Git.

A entrega aplica as decisões do briefing. Não representa GO clínico para liberar todas as categorias: a bancada ainda reproduz erros anteriores de extração, correlação, comandos e entradas com vários exames. Os limites estão discriminados abaixo.

## Hipóteses: inventário das mudanças

`prompts/global.ts:46` distingue hipótese de diagnóstico afirmado: hipótese usa **“que tem como diagnóstico mais provável …”**; diagnóstico explicitamente afirmado pelo médico permanece direto. O corpo continua exclusivamente descritivo. `prompts/styles.ts` preserva o padrão também no objetivo, mesmo quando exceder 15 palavras. A concordância plural usa “que têm”.

Os caminhos desta tabela são relativos a `apps/api/src/server/`. São frases programáticas, não transcrições de pacientes.

| Origem | Antes | Depois / motivo |
|---|---|---|
| `renderer/phrases/ABDOMEN_TOTAL.ts:168` | Sinais ecográficos sugestivos de hepatopatia crônica difusa. | Alterações ecográficas que têm como diagnóstico mais provável hepatopatia crônica difusa. Hipótese de padrão difuso. |
| Mesmo arquivo, `:182` | Imagem hepática sugestiva de hemangioma. | Imagem hepática que tem como diagnóstico mais provável hemangioma. |
| Mesmo arquivo, `:499` | Imagem no rim [lado] sugestiva de angiomiolipoma. | Imagem no rim [lado] que tem como diagnóstico mais provável angiomiolipoma. |
| `renderer/categories/sharedUrinary.ts:512` | Imagem sugestiva de angiomiolipoma no rim [lado]. | Imagem no rim [lado] que tem como diagnóstico mais provável angiomiolipoma. |
| `renderer/categories/VIAS_URINARIAS.ts:614` | Imagem sugestiva de angiomiolipoma no rim [lado/local]. | Imagem no rim [lado/local] que tem como diagnóstico mais provável angiomiolipoma. |
| Mesmo arquivo, `:705` e `:930` | Rim [lado] reduzido com diferenciação reduzida, podendo corresponder a doença renal crônica. | Mesmo achado factual, seguido de “que tem como diagnóstico mais provável doença renal crônica”. Clássico e objetivo. |
| `renderer/categories/PARTES_MOLES.ts:368` | Achados compatíveis com lipoma [local]. | Imagem [local] que tem como diagnóstico mais provável lipoma. |
| Mesmo arquivo, `:370` | Imagem cística [local], podendo corresponder a cisto de inclusão epidérmica. | Imagem cística [local], que tem como diagnóstico mais provável cisto de inclusão epidérmica. Correlação clínica preservada. |
| Mesmo arquivo, `:373` | Coleção [local], podendo corresponder a [natureza ditada]. | Coleção [local], que tem como diagnóstico mais provável [natureza ditada]. Sem natureza ditada, mantém “a esclarecer”. |
| Mesmo arquivo, `:380` | Imagem compatível com corpo estranho [local]. | Imagem [local] que tem como diagnóstico mais provável corpo estranho. |
| Mesmo arquivo, `:556–559`, `:594` | Roteiro do writer ensinava compatível / podendo corresponder / “O diagnóstico mais provável é”. | Roteiro e instrução final padronizados; morfologia do corpo não ganhou diagnóstico. |
| `renderer/categories/PELVE_FEMININA.ts:782` | Imagem sugestiva de pólipo endometrial. | Imagem que tem como diagnóstico mais provável pólipo endometrial. |
| Mesmo arquivo, `:786` | Imagem sugestiva de sinéquia uterina. | Imagem que tem como diagnóstico mais provável sinéquia uterina. |
| Mesmo arquivo, `:1145`, `:1404` | Achados compatíveis com adenomiose. | Alterações miometriais que têm como diagnóstico mais provável adenomiose. Somente fallback programático; conclusão livre ditada preservada. |
| `renderer/categories/dopplerRenalWeb.ts:249` | Achados indiretos sugestivos de alteração hemodinâmica proximal… | Achados indiretos que têm como diagnóstico mais provável alteração hemodinâmica proximal… A ressalva de ausência de critério direto de estenose permanece. É texto do renderer na API; nenhum arquivo de interface Web foi alterado. |
| `renderer/categories/TIREOIDE.ts:631`, `:1506` | Padrão difuso. O diagnóstico mais provável é [tipo de tireoidite]. | Padrão difuso, que tem como diagnóstico mais provável [tipo]. Template aplicado a Hashimoto, linfocítica, granulomatosa e Riedel quando o tipo foi informado. |
| `prompts/contracts/TIREOIDE.ts:95` | Sinais de doença parenquimatosa difusa. O diagnóstico mais provável é tireoidite de Hashimoto. | Padrão de doença parenquimatosa difusa que tem como diagnóstico mais provável tireoidite de Hashimoto. |
| `prompts/contracts/ABDOMEN_TOTAL.ts:193`, `prompts/universalCoreV2.ts:56` | …cujo diagnóstico mais provável é área poupada da esteatose. | …que tem como diagnóstico mais provável área poupada da esteatose. |
| `prompts/contracts/PELVE_FEMININA.ts:39` | Padrão da casa com exceções para O-RADS funcional e adenomiose. | Retirada a exceção que autorizava outro modo de hipótese; classificações próprias e diagnósticos afirmados permanecem. |

### Frases mantidas no inventário

| Origem / frase | Motivo |
|---|---|
| `MAMARIA.ts:743`, correlação “achado compatível com resultado histopatológico benigno” | Concordância com biópsia informada; não é hipótese etiológica baseada apenas na imagem. |
| `ABDOMEN_TOTAL.ts:833`, `:838`, `:840` e `ABDOMEN_SUPERIOR.ts:416`, “não há / ausência de imagens sugestivas de cálculos” | Negativa do modelo normal, não conclusão hipotética positiva. |
| `contracts/PELVE_FEMININA.ts:57`, espessura compatível com a fase do ciclo | Correlação fisiológica do modelo, não hipótese diagnóstica. |
| `PARTES_MOLES.ts:193`, “compatível com lipoma” no léxico de extração | Definição semântica de um enum, não redação de laudo. |
| `global.ts:49–50`, `contracts/MAMARIA.ts:46`, `PARTES_MOLES.ts:590`, `MUSCULOESQUELETICO.ts:577` | Proibições e exemplos de interpretação a retirar do corpo; não ensinam esse padrão como conclusão. |
| `PELVE_FEMININA.ts:384` e conclusão personalizada da adenomiose | Comentário e texto explicitamente fornecido pelo médico. Não fiz substituição cega dentro de texto clínico livre. |
| `PELVE_FEMININA.ts:658–667`, miomas; `:932`, endometrioma | Já seguem a redação da casa; mantidos. |
| Cisto simples renal, cistos mamários simples, litíase e demais conclusões diretas do catálogo | Diagnósticos diretos não foram genericamente convertidos em hipóteses. |
| `CERVICOMETRIA.ts:238`, cerclagem; conclusões de `catalog/OBSTETRICA.classico.ts` | Obstetrícia fora do escopo W7, reservada a W2/W5. |
| `PELVE_FEMININA.ts:687`, `:691`, `:945–946`, `:1061`, `:1314`; `MUSCULOESQUELETICO.ts:125`, `:151`, `:203` | São frases preexistentes do **corpo**, fora do inventário de conclusões solicitado. Há interpretação no corpo em parte delas; esta frente não declara que eliminou todas as ocorrências históricas. Não foi acrescentado diagnóstico ao corpo pelas mudanças W7. |
| `mskFewshots.ts` e `partesMolesFewshots.ts` | Exemplos clínicos históricos já versionados, não regravados nesta frente. Instruções ativas do writer foram corrigidas; MSK também tem frente própria W8. |

A frase dos linfonodos normais da tireoide foi simplificada para morfologia “de aspecto habitual”, tanto no renderer quanto no contrato, retirando a cauda interpretativa do corpo (TI-4).

## Mama

A extração agora manda `escopo_exame=mamas`, `titulo_com_axilas=false`, `axilas_alteradas=false` e descrição axilar nula quando o ditado não menciona/solicita axilas. O renderer já selecionava título, técnica, corpo e conclusão por escopo; os testes confirmam os dois estilos e o escopo explícito. Objetos antigos ainda respeitam `titulo_com_axilas`, pois não há ditado bruto dentro do renderer para reconstruir o que foi solicitado. Reextração é necessária quando o dado antigo já contém escopo errado.

O contrato remove as instruções contraditórias de MA-2. O silêncio passa a significar **somente mamas**, conforme Luiz, substituindo a proposta diferente do W4. Os modelos-base locais ficam sem axilas. O exame normal recebe **“(Categoria BI-RADS® 1)”**; lesões continuam sem categoria inferida quando o médico não informou/confirmou.

MA-1 ganhou `quantidade` e `referencia_medida`, opcionais para persistências antigas e presentes no JSON strict novo. Um grupo pode ser múltiplo e medido pela maior imagem ou em conjunto, sem criar cópias fictícias. Corpo e conclusão preservam o plural. Um enum contraditório de “conjunto” numa imagem única não acrescenta essa expressão ao laudo. O plural também corrige “margens angulares”. Não foi criado contador exato nem um enum específico para “segunda maior”.

A primeira bancada ainda reproduziu a cópia de axilas do bundle antigo no caso de ditado “Normal”. A instrução de prioridade foi reforçada no contrato e na regra global: **modelo/exemplo não é solicitação de axilas**. Repetição final de quatro casos sem menção a axilas: nenhum writer incluiu axilas; os dois exames normais mantiveram BI-RADS® 1.

## Tireoide: conferência da tabela

| Eixo | Conferência / implementação final |
|---|---|
| Anecoicas | Homogênea 0, finos ecos/reverberação 0, septos 1, componentes sólidos 1. Mapeamento da reverberação explicitado no prompt. |
| Sólidas | Hipoecoica 3, isoecoica 2, hiperecoica 1, áreas anecoicas 1, parede em casca de ovo 0. Novos enums `isoecoica_areas_anecoicas`, `hipoecoica_areas_anecoicas` e `hiperecoica_areas_anecoicas`, rótulos fiéis e 1 ponto. A regra confirmada de áreas anecoicas prevalece sobre a pontuação da base sólida pura. |
| Margens | Regular 0, irregular 1, espiculada 2. |
| Halo | Apenas sólido: fino regular 0, espesso irregular 2, sem halo 1. Anecoica não pontua halo. |
| Forma | Mais alto que largo 3; outra forma 0. |
| Transverso | Fronteiras 0,9 / 1,0 / 2,9 / 3,0 cm testadas: 0 / 1 / 1 / 2. Medida transversa nomeada prevalece sobre as demais. |
| Calcificações | Sem 0, casca de ovo 0, grosseiras com sombra 1, micro 3. |
| Chammas | I–V: 0 / 1 / 2 / 3 / 4. |
| Categoria Domingos | ≤3: 1; 4–5: 2; 6–9: 3; ≥10: 4. Fronteiras e nota ditada testadas. |
| Conduta Domingos | No clássico, Domingos visível + toggle de conduta ligado: controle anual / controle ou citopunção / citopunção / citopunção, com identificação por imagem e escala. Default continua sem conduta. |
| ACR | Separado de Domingos. Categoria ACR ditada não altera a faixa da Nota de Domingos. Objetivo e clássico com Domingos oculto preservam as recomendações ACR existentes. |

`docs/det-5-tireoide-domingos.md` corrige a falsa equivalência Domingos→ACR, documenta os eixos, os limites e a conduta. Sem transverso explicitamente nomeado, continua a decisão histórica de usar a maior medida. Eixos omitidos continuam valendo zero, com ecogenicidade ancorando o cálculo: **TI-2 não foi alterado**. A comparação é `<1` / `<3`, sem arredondar silenciosamente valores com mais casas decimais.

**Decisão confirmada pelo Luiz nesta sessão:** a tabela está correta: isoecoica = **2**, hipoecoica = **3** e com áreas anecoicas = **1**. A mensagem anterior com isoecoica = 3 foi esclarecida; não há divergência pendente. TI-2 continua sendo a decisão pendente sobre eixos não ditados.

## Vias urinárias

`presenca` representa `presente`, `ausente_cirurgico`, `agenesia` ou `nao_visualizado`, no schema legado e no compartilhado. O prompt distingue ausência cirúrgica de não visualização e só aceita agenesia quando explicitamente afirmada. Ausência interrompe a descrição normal, as medidas e os achados daquele rim; também impede a conclusão global de rins normais. A causa não é deduzida da simples não visualização. O caminho compartilhado recebe o estado legado quando não tem estado próprio.

Os três VU-1 do W4 foram reextraídos por assinatura: nenhum mantém “Rins ecograficamente normais”. Dois preservam ausência cirúrgica; o terceiro mantém não visualização, pois o ditado não afirmou sua causa. Não inferi agenesia somente porque o laudo final a descrevia. Testes sintéticos cobrem agenesia explícita, ambos os lados, ambos os estilos, medidas residuais contraditórias e o caminho compartilhado.

Persistências antigas sem `presenca` não são retroativamente enriquecidas pelo renderer: o replay pode continuar errado se a informação estava fora do contrato ou já se perdeu. No caso com transplante, permanece a limitação anterior de representar separadamente rim nativo e enxerto; W7 não criou um terceiro rim estruturado.

## Parede: contrato e SQL somente proposto

O novo contrato `prompts/contracts/PAREDE_ABDOMINAL.ts` está registrado em `contracts/index.ts` para os estilos existentes. O limiar é estritamente **>2,0 cm**, sem arredondamento prévio. Igual a 2,0 não caracteriza diástase; ausência de distância não autoriza inferir. Medida de hérnia não é distância inter-retos. Discordância entre diagnóstico ditado e medida não é corrigida silenciosamente.

Quatro chamadas sintéticas do writer, com contrato e regra global, pela assinatura, passaram: 1,9 cm, 2,0 cm, 2,01 cm e distância não informada. Apenas 2,01 concluiu diástase. A redação direta da diástase pelo critério autorizado evita repetir o diagnóstico como sua própria hipótese.

A leitura de `knowledge_blocks` confirmou que o identificador é armazenado em **`title`**, não em uma coluna `slug`. Existem quatro blocos validados com esse título, um por estilo, todos na versão 1. Abaixo está apenas a proposta para o orquestrador solicitar GO. **Não executar automaticamente.** A invalidação do embedding exige recomposição pelo fluxo aprovado de biblioteca antes da liberação; nenhum serviço foi chamado para isso nesta frente.

```sql
BEGIN;
DO $w7$
DECLARE
  encontrados integer;
  alterados integer;
BEGIN
  SELECT count(*) INTO encontrados
  FROM knowledge_blocks
  WHERE category_code = 'PAREDE_ABDOMINAL'
    AND title = 'parede-abdominal-regra-diastase-retos'
    AND kind = 'regra' AND status = 'validated' AND version = 1
    AND id IN (
      'b12fbf46-cdfe-4990-bff2-9b5229999cb8',
      'dd50aaab-de88-4b9e-a687-f3618513a4d3',
      'a45c1abf-f391-48ae-962a-dda6f4f28228',
      '78e1032a-dabb-44bd-a272-07400c573bfd'
    );
  IF encontrados <> 4 THEN
    RAISE EXCEPTION 'W7: blocos/versões mudaram; revisar antes de atualizar';
  END IF;

  UPDATE knowledge_blocks
  SET content = $regra$
GATILHOS DE APLICAÇÃO:
- diástase
- afastamento dos retos

REGRA — DIÁSTASE DOS RETOS ABDOMINAIS
Concluir diástase somente quando a distância entre as bordas mediais dos retos for estritamente maior que 2,0 cm.
Distância igual a 2,0 cm ou menor não caracteriza diástase por este critério. Não arredondar antes da comparação.
Sem distância informada, não inferir diástase. Não confundir distância inter-retos com dimensão de hérnia.
No corpo: descrever a distância e a localização informadas, sem inventar medida ou ausência de defeito aponeurótico.
Na conclusão, somente se > 2,0 cm: "Diástase dos músculos retos abdominais (distância intermuscular de [valor] cm)."
Se diagnóstico explicitamente ditado contrariar a distância informada, preservar os dados e sinalizar a discordância, sem corrigir silenciosamente.
$regra$,
      version = version + 1, embedding = NULL, updated_at = now()
  WHERE category_code = 'PAREDE_ABDOMINAL'
    AND title = 'parede-abdominal-regra-diastase-retos'
    AND kind = 'regra' AND status = 'validated' AND version = 1
    AND id IN (
      'b12fbf46-cdfe-4990-bff2-9b5229999cb8',
      'dd50aaab-de88-4b9e-a687-f3618513a4d3',
      'a45c1abf-f391-48ae-962a-dda6f4f28228',
      '78e1032a-dabb-44bd-a272-07400c573bfd'
    );
  GET DIAGNOSTICS alterados = ROW_COUNT;
  IF alterados <> 4 THEN
    RAISE EXCEPTION 'W7: quantidade alterada inesperada; rollback obrigatório';
  END IF;
END
$w7$;
COMMIT;
```

## Gates e Biblioteca

`pnpm -F api typecheck` passou. As 28 rotinas de abdome/mama/tireoide/vias, contrato urinário e equivalência passaram. O arquivo novo passou **71 verificações**. Os goldens adicionais de partes moles passaram (38 clássico, 35 objetivo); a regressão urinária compartilhada passou 31 grupos; alterações clínicas passaram 300/300; projeção da Biblioteca passou 926/926.

`catalog-equivalence.manual.ts`: **21600/21600 byte a byte iguais**. Esse gate é de obstetrícia, que não foi alterada. Não comprova sozinho as categorias W7. Seus efeitos na Biblioteca vêm dos renderers canônicos: redação de hipóteses mudou intencionalmente; os novos enums de tireoide são expostos por `eixosDoNodulo`; grupos de mama e presença renal são campos adicionais compatíveis com objetos antigos. Nenhum arquivo Web foi editado para criar controles novos. O espelho estático `apps/web/src/lib/catalog/eixosDoNodulo.ts:37` ainda não oferece as três opções novas; essa atualização é encaminhamento para W6, que está fora do escopo W7. O servidor aceita e expõe as opções; não alego que o picker Web já as oferece.

`biblioteca-todas-categorias.manual.ts`: **167/168**, com a falha histórica de ABDOMEN_TOTAL sem `templateBody` (404 no harness autocontido), já registrada no W3. O gate específico de projeção fornece a máscara sintética e passa 926/926. Não alterei o teste para ocultar a limitação. HTMLs de boletins regenerados só pela execução dos testes foram restaurados quando não faziam parte da entrega.

Expectativas de textos antigos foram atualizadas nos testes de abdome, partes moles e tireoide; o teste de conduta ACR agora solicita explicitamente Domingos oculto. Isso mantém a regressão ACR e permite testar a tabela Domingos separadamente.

## Bancada: comparação e limites

Rodadas W4 localizadas no repositório principal, em `tmp-review/bench-haiku/w4/`, não no caminho inicialmente indicado do worktree de revisão. Novas chamadas foram somente por `claude -p`, usando o benchmark real com interceptação dos dois provedores; chaves de API do processo da bancada são sentinelas. Não houve chamadas de modelo por API paga.

Não usei `--reuse` para transplantar A/B antigos: a implementação atual do benchmark reaproveita o caso inteiro, inclusive o replay, e não recompõe A/B ausentes. Isso manteria prompts e schemas antigos após as correções. Reutilizei W4 como referência de comparação. As rodadas principais têm **90 dias, R/A/B, 29 mama e 20 tireoide**; focais posteriores validam os ajustes finais. O juiz é variável e não conhece automaticamente a nova regra da casa.

| Categoria / cenário | W4: média / nota ≤4 | W7 principal: média / nota ≤4 |
|---|---|---|
| Mama GPT | 5,17 / 13 | 5,22 / 14 |
| Mama R válido | 4,66 / 9 (19 casos) | 4,71 / 9 (19 casos) |
| Mama A | 4,33 / 16 | 4,86 / 15 |
| Mama B2 → B | 5,09 / 12 | 5,86 / 6 |
| Tireoide GPT | 6,00 / 8 | 6,50 / 6 |
| Tireoide R válido | 5,44 / 4 (8 casos) | 5,83 / 5 (9 casos) |
| Tireoide A | 5,10 / 10 | 5,70 / 7 |
| Tireoide B2 → B | 6,10 / 1 | 5,58 / 4 |

Não houve falha de execução A/B nas duas rodadas principais. R bruto recebeu erros de schema em sete mamas e dez tireoides, além de casos sem replay: marcadores de erro não são laudos clínicos. Foram excluídos da coluna R válido. Diferenças de replay também incluem mudanças históricas do código/flags; não são automaticamente regressões W7. O GPT é o mesmo texto histórico, mas sua nota variou ao trocar a rodada do juiz, mostrando a variabilidade da avaliação.

A mama melhorou na média do writer; a tireoide não recebeu GO de migração pelo writer. Não atribuo a diferença de média exclusivamente ao W7. O escopo normal sem axilas e o ponto de áreas anecoicas tornam alguns finais históricos referências inadequadas para a nova regra.

### Conferência manual dos erros graves

Conferi o ditado, a saída, a extração em `calls.jsonl` e o código para as notas ≤4 de A/B. A origem de comandos literais fica em `pipeline/commandGuard.ts:108`, fora da autorização W7; descrições livres e extração permanecem responsabilidade do caminho atual. As tabelas abaixo contêm apenas identificadores curtos e classificações da revisão, sem transcrever dados de pacientes.

| Mama: casos / cenários | Origem conferida e limite |
|---|---|
| 2677961d A | Referência “conjunto” inventada em imagem única: limitada pelo renderer W7 e repetida sem essa expressão. Distância truncada e fragmentos de conclusão continuam problemas de extração/comando. |
| b2e91fcd A | Multiplicidade e maior medida corretas. Descritor livre com diagnóstico e duplicação adicionada depois do render permanecem; não são a nova frase programática de hipótese. |
| fd2b58c8 A | Correlação mamográfica pode deixar BI-RADS normal e categoria da correlação em conflito; duplicação vem de comando. Caso anterior do W4, sem alteração do motor/guard. |
| d4a3b676 B | Ditado com medida truncada; writer preservou dúvida, mas exige edição. Não autoriza completar número ausente. |
| da0808c3 A | Extração criou `achado_nao_nodular` a partir de trecho negativo de correlação; o catálogo o conclui como massa. Defeito de extração, não novo achado da multiplicidade. |
| 153ac91d A/B | Extração perdeu margem de grupo sólido; writer também omitiu axilas explicitamente solicitadas. Há fragmentos de comandos e redação de localização. Fora da decisão “silêncio = mamas”. |
| ffdbf664 A | Extração classificou um grupo anecoico como sólido. O ditado contém outro grupo sólido real; o erro deve ser localizado no grupo convertido, não tratado como ausência de qualquer lesão sólida. |
| 9538c030 A/B | Rodapé e achado duplicados pelo processamento de comandos; erro de transcrição no texto livre. |
| 2f3a039d A/B | Margem perdida, categoria ligada ao grupo errado e medida truncada no writer. “Conjunto” indevido foi limitado e repetido; os demais erros não foram mascarados. |
| 74211285 A | Extração criou sólido adicional ao interpretar linfonodo e repetiu conteúdo em texto livre; erro anterior de classificação. |
| 24c40c7e A | Redação tipada não conserva todas as hipóteses livres ditadas; cisto de óleo entra em tipo genérico de conteúdo espesso. Limitação do schema atual. |
| 0c010e0e A | Extração perde margens lobuladas, pluraliza cada instância isolada e liga categoria ao cisto. Texto livre e classificação, não perda do marcador de maior medida. |
| bb7bb5fd A | Mastectomia não tem estado específico no schema mamário; conclusão omite o diagnóstico ditado e dados livres podem acrescentar interpretação ao corpo. Limitação anterior, fora de MA-1/2/3. |
| ee434537 A/B | Classificação do grupo como cistos simples versus microcistos, placeholders e duplicações de comandos. Limitações de extração e guard, preservadas para revisão central. |
| 79759d96 A; eb6e8698 A | Correlação/tecido habitual e ausência de correspondente podem cair no tipo `achado_nao_nodular`, produzindo “massa”. Falso positivo clínico confirmado; precisa da correção de extração/roteamento pertinente antes de GO. |
| 7a3069a4 B | Bundle normal induziu axilas não solicitadas. Regra de prioridade reforçada em W7; repetição final omite axilas e mantém BI-RADS® 1. |

| Tireoide: casos / cenários | Origem conferida e limite |
|---|---|
| a64880d0 A | Hipoecoica com áreas anecoicas estava sendo classificada como base hipoecoica pura (3); acrescentei o enum específico com 1 ponto, conforme a confirmação do Luiz, e uma rodada focal posterior. Multiplicidade e reforço acústico da tireoide continuam limitados pelo contrato atual. |
| be38150d A/B | Texto truncado em ecogenicidade e transição de lado. O ditado contém indicação de lado esquerdo junto ao achado; o final desloca a imagem. A divergência de lateralidade com o final não basta para chamar invenção. Não completei eixo incerto só para igualar a nota final. |
| 84cd3b13 B | Medida truncada no ditado e conclusão sem escore; writer não calcula Domingos por contrato. A diferença de nota de A também depende de vascularização acrescentada apenas no final (TI-2). |
| 32ae8748 A; d9f8a87f A | Laudo completo colado: comando acrescenta fragmento atribuindo volume total ao istmo e referencias de rodapé como conclusão. Guard fora de W7. |
| d7881d71 A/B | Nova composição de áreas anecoicas respeita 1 ponto. O final retirou essas áreas e apresenta outra nota; comparação direta com o final é insuficiente. B continua sem calcular classificação. |
| 42fbb3eb A | Dois achados com áreas anecoicas: 1 de ecogenicidade + 1 de vascularização = 2, conforme tabela aprovada. Penalidade do juiz por não sair 3 é falso positivo para W7. Volume do istmo não foi ditado; não se deve inventá-lo. |
| e9dd694d A | Entrada contém tireoide e exame cervical completo. Renderer de categoria única não preserva todo o segundo exame; Doppler difuso não cabe integralmente no contrato tipado. Roteamento/entrada múltipla fora de W7. |
| 245bcf9e B | Writer preserva descrições, mas não calcula notas; avaliação linfonodal presumida deriva do modelo antigo. Limitação residual do writer de tireoide, sem GO. |

Outras marcações do juiz foram conferidas: recomendação laboratorial de Hashimoto vem de template determinístico preexistente; eixos ausentes pontuam zero pela decisão TI-2 ainda pendente; categoria ACR deriva dos seus grupos e não deve ser comparada como equivalente da Nota de Domingos. TI-3 (rodapé), TI-5 (acoplamento dos descritores ACR/Domingos), entrada colada e correlação seguem pendentes das frentes/decisões pertinentes. Não alterei guards, pipeline, obstetrícia ou interface Web para resolver esses pontos.

### Artefatos locais

| Rodada, relativa a `tmp-review/bench-haiku/` | Finalidade |
|---|---|
| `2026-10-09T23-21-22-mamaria` | 29 casos R/A/B + juiz, comparação principal. |
| `2026-10-09T23-21-22-tireoide` | 20 casos R/A/B + juiz, comparação principal. |
| `2026-10-09T23-24-40-vias_urinarias` | Dois casos de nefrectomia, R/A sem juiz. |
| `2026-10-09T23-25-27-vias_urinarias` | Caso de ausência sem causa ditada, R/A sem juiz. |
| `2026-10-09T23-28-00-mamaria` | Quatro MA-1 reprocessados após ajuste do plural na conclusão, A sem juiz. |
| `2026-10-09T23-30-48-tireoide` | Três casos com tireoidite/entrada completa, A/B após padronização final da hipótese, sem juiz. |
| `2026-10-09T23-33-02-mamaria` | Dois casos de medida individual, A após limitação de “conjunto”, sem juiz. |
| `2026-10-09T23-39-01-tireoide` | Um caso de hipoecoica com áreas anecoicas após adicionar o enum de 1 ponto, A sem juiz. |
| `2026-10-09T23-33-45-mamaria` | Quatro writers sem axilas solicitadas após reforço de prioridade, B sem juiz. |

Os focais são validação posterior, não notas substituídas silenciosamente na média da rodada principal. Logs, teste sintético da parede, consulta do bloco e conferências individuais estão em `tmp-review/haiku-migration/`. Relatórios HTML locais foram gerados para as duas rodadas principais.

## Decisões para o Luiz e revisão central

A tabela de Domingos foi confirmada pelo Luiz nesta sessão: isoecoica 2, hipoecoica 3 e com áreas anecoicas 1. TI-2 continua pendente e não mudou. A execução do SQL da parede e a recomposição de embeddings dependem do GO solicitado pelo orquestrador; este relatório não os executa. As falhas clínicas residuais da bancada impedem tratar W7 isoladamente como aprovação da migração de todas as categorias. **CodeRabbit NÃO EXECUTADO** nesta frente; revisão local e gates não equivalem à revisão central.

## Commits locais

`eedee471` — `fix(clinical): apply W7 house rules to prompts and renderers`. Contém implementação, testes e documentação da tabela confirmada. Este relatório é entregue em commit documental separado, na mesma branch.
