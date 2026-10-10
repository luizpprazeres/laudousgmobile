# W13 — revisão independente das mudanças de prompt

Data: 10/10/2026. Frente: Codex. Branch: `chore/revisao-prompts-codex`.

**Parecer: não aprovar os prompts como conjunto ainda.** Há 13 achados altos, três médios e um baixo. Nenhum achado foi classificado como crítico: esta revisão comprova instruções conflitantes e caminhos de exposição, mas não mediu ocorrência clínica em produção. As correções abaixo são propostas, não implementadas.

## Referências e limites

Base comparada: `origin/main` = `312c9df8a6c5c25f303a2c6f49c91b63abd62c7b`. Snapshot da migração consultado: `feat/haiku-migration` = `514da954a3839f74906928b6e12eddeb010fe62a`. Checkout revisado: `f1eb832211f4478ff8d310e4412fcffd4122a8e2`. Entre o checkout e esse snapshot há apenas duas mudanças de documentação; os arquivos de produção revisados são iguais. A revisão permanece vinculada a esses SHAs, mesmo que a branch de integração avance.

Foram lidos `_comum.md`, a story geral, o briefing W13, o README e os diffs do escopo. Foram seguidos os consumidores para confirmar a montagem efetiva. As referências `arquivo:linha` abaixo são relativas ao checkout revisado. Os diffs são recortes de proposta; não devem ser aplicados automaticamente sem ajuste dos testes e revisão da frente responsável.

Não houve chamada a LLM, consulta a dados de pacientes, acesso ao banco nem verificação da biblioteca atualmente hospedada. Portanto, não afirmo que as alterações de biblioteca relatadas na story foram aplicadas corretamente. Os exemplos novos deste documento são sintéticos. Não reproduzo ditados reais dos few-shots.

| Camada | Resultado da leitura |
| --- | --- |
| `global.ts`, `buildSystemMessage.ts` | Global enxuto separado por família; bloco obstétrico diferente de `origin/main`; conflitos ainda ativos. |
| `styles.ts`, `contracts/*`, `contracts/index.ts` | Contratos e overlays podem exigir descrições, classificações ou normalidades incompatíveis com a fidelidade. |
| MSK, pelve, partes moles e respectivos few-shots | Writers dedicados recebem seu prompt próprio e pares user/assistant; não passam pelo global enxuto. |
| Extração obstétrica e morfológica | Mudanças de datação/visualização explícitas; regra comum de texto livre introduz risco de omissão. Não proponho mexer no schema. |
| Extração tireoidiana | Simplificação trouxe interpretação de descrição incompleta como áreas anecoicas. Tabela aprovada pelo Luiz preservada como premissa. |
| `llm.ts`, `writer.ts`, writers Doppler | Regra comum de extração e regra de saída seguidas até seus consumidores. As trocas dos writers Doppler acrescentam a regra comum, sem reescrever seus prompts-base neste diff. |
| `universalCoreV2.ts` | Mudança do dicionário para hipótese da casa conferida. O comentário de código inerte está desatualizado: há consumidor no planner V2. |

`WRITER_OUTPUT_RULE` não está definido em `ai/llm.ts`, como sugere o briefing: está em `pipeline/writerOutputGuard.ts:23`, anexado pelo cliente genérico e pelos writers dedicados. Essa implementação também foi revisada.

## Altos

### A01 — preservação byte a byte do global obstétrico não foi cumprida contra a base pedida

Local: `apps/api/src/server/prompts/global.ts:45` e `:48`; consumidor: `apps/api/src/server/prompts/buildSystemMessage.ts:167`.

Trecho: foram acrescentadas a regra mamária e a seção `CORPO DESCRITIVO, CONCLUSÃO DIAGNÓSTICA`, e substituída a regra antiga de hipóteses dentro de `GLOBAL_RULES_BLOCK`. O ramo obstétrico continua injetando essa constante alterada.

Comprovação independente, extraindo o conteúdo literal entre os backticks e calculando SHA-256 UTF-8:

| Constante | `origin/main` | Checkout |
| --- | --- | --- |
| `GLOBAL_RULES_BLOCK` | 18.637 bytes; `0c0fca70e3945406680fd5f4e5219b642b9318ca1298aad185b026cd1020d90e` | 20.675 bytes; `f1a5887f32fe64197731b4f4ac29f1369bc7dd9726f708b076a0a11b33289c10` |
| `GLOBAL_PROHIBITIONS` | 1.005 bytes; `be2d9e6048c210de7fa4a3115ef477e45d4c5dd3e1024df7ecd7f6b782f2e95b` | Idêntico |

A W10b preservou o bloco que já vinha da W3/W7, mas isso não prova preservação contra `origin/main`. Há também uma instrução de mama vazando para a família obstétrica. Cenário: um writer/free-slot obstétrico que receba esse global passa a ter proibições e exemplos diferentes da base anterior. Isso comprova descumprimento textual; não comprova erro de saída clínica.

Proposta: congelar, em constante separada, o bloco literal de `origin/main` para a família obstétrica, mantendo as regras novas no ramo não obstétrico. O conteúdo completo deve ser obtido de `git show origin/main:apps/api/src/server/prompts/global.ts`, sem reformatar. Recorte da alteração no consumidor:

```diff
- sections.push(formatSection(globalSectionForCategory(GLOBAL_RULES_BLOCK, args.categoryCode)));
+ sections.push(formatSection(globalSectionForCategory(OBSTETRIC_GLOBAL_RULES_FROZEN, args.categoryCode)));
```

Adicionar comparação com a base congelada para as quatro categorias e estilos. A matriz morfológica atual compara regras do checkout, não essa base histórica. Se a intenção for aprovar as mudanças W3/W7 também para obstetrícia, registrar explicitamente a exceção ao critério W13 antes de declarar preservação.

### A02 — pelve transforma normalidade/volume ditado em fenômeno e medidas obrigatórias não ditados

Local: `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:1508`, `:1513`, `:1517` e `:1521`.

Trechos: `Ovário ... medindo {L} x {AP} x {T} cm, apresentando imagens anecoicas`, `Útero de volume normal ({V} cm³)` e `Medida não ditada ... use [REVISAR: {o que falta}] no ponto`.

Cenário sintético do briefing: “ovários normais, o direito com 5,2 cm³ e o esquerdo 4,8 cm³”. O roteiro manda produzir três eixos ausentes e afirmar imagens anecoicas; a regra 2 manda preencher as lacunas com revisão. A conclusão uterina também é obrigatória sem volume informado. Essa combinação explica as três partes do smoke: medidas com `[REVISAR]`, imagens anecoicas acrescentadas e conclusão uterina com volume pendente. A frase ovariana já existia; a W10a reforçou a solução de lacunas com revisão, sem remover a exigência que as cria.

Proposta: dados opcionais ausentes não geram lacuna; normalidade ditada não autoriza folículos/imagens anecoicas. Não mudar para um número calculado silenciosamente.

```diff
- 7. "Ovário {direito|esquerdo} medindo {L} x {AP} x {T} cm, apresentando imagens anecoicas."
+ 7. Ovário: preserve normalidade e dados ditados; medidas e imagens anecoicas/folículos só se informados. Sem eixos, omita a oração "medindo".
- 2. Medida não ditada: ... use [REVISAR: {o que falta}] no ponto.
+ 2. Dado opcional não ditado: omita só a oração correspondente. Medida solicitada mas ilegível: sinalize no ponto, sem adivinhar.
```

Aplicar a mesma condição às orações de volume uterino e ovariano e retirar `ambos contendo folículos` quando não houver informação. Curar os few-shots que ensinam o acréscimo. Não retirar a normalidade de protocolo explicitamente autorizada; retirar os detalhes adicionais sem evidência.

### A03 — pelve ensina FIGO inventado e FIGO/tipo incompatíveis

Local: `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:1515`; exemplo: `apps/api/src/server/renderer/categories/pelveFewshots.ts:46` e `:48`.

Trecho: a conclusão obrigatória termina em `(categoria FIGO {N})`. No quinto few-shot, a entrada não informa FIGO, mas a saída acrescenta FIGO 5 e 4. A primeira descrição conclusiva chama o FIGO 5 de intramural. O bloco genérico `FIGO_RULES` em `global.ts:358` não protege essa rota: `pelveWriter.ts:49` monta apenas o prompt dedicado e a regra de saída.

Cenário sintético: “mioma intramural de 2 cm na parede anterior” pode virar FIGO 4 por preenchimento do modelo/exemplo. Mesmo quando FIGO é ditado, o roteiro do corpo não exige registrá-lo, explicando classificação apenas na conclusão no smoke. Não é uma conclusão do juiz; é conteúdo observável no par de exemplo.

Proposta: classificação só quando ditada, sem inferi-la pelo tipo; preservar a classificação informada no corpo e na conclusão. Remover as classificações do exemplo cuja entrada não as contém, em vez de fabricar um ditado retrospectivo.

```diff
- - Um item por mioma: "... nódulo miomatoso {tipo} (categoria FIGO {N})."
+ - Um item por mioma: "... nódulo miomatoso {tipo}." Tipo e FIGO só se ditados; FIGO ditado entra no corpo e na conclusão, sem inferência nem correção silenciosa.
```

Se o médico fornecer tipo e FIGO incompatíveis, preservar ambos e sinalizar a divergência, usando a tabela já existente como conferência, sem duplicá-la integralmente no prompt.

### A04 — espessura endometrial isolada vira normalidade para ciclo/menopausa

Local: `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:1514`.

Trecho novo da W10a: `Com espessura ditada: "O endométrio tem espessura normal para a fase do ciclo menstrual."`.

Cenário sintético: “endométrio 1,2 cm” informa uma espessura, mas não normalidade nem fase do ciclo. O prompt autoriza normalidade contextual a partir dessa medida; mencionar menopausa troca a população de referência, sem resolver a ausência de avaliação ditada. A condicional evita normalidade sem medida, mas ainda confunde medida com interpretação.

```diff
- - Com espessura ditada: "O endométrio tem espessura normal para a fase do ciclo menstrual."
+ - Espessura ditada entra no corpo. Normalidade e correlação com ciclo/menopausa só entram na conclusão se ditadas; não inferir pela espessura.
```

### A05 — menção a axilas ativa escopo e normalidade mesmo sob exclusão ou alteração

Local: `apps/api/src/server/prompts/contracts/MAMARIA.ts:18` e `:20`.

Trecho: `a palavra "axila" ... aparece no DITADO?` → `Sim: ... "Linfonodos axilares normais." como último item`.

Cenários sintéticos: “só mamas, sem axilas” contém a palavra-gatilho; “linfonodo axilar esquerdo com córtex espessado” também ativa a ordem de normalidade. A precedência geral dos comandos ajuda no primeiro caso, mas o contrato contém uma ordem contrária; no segundo, não há ressalva para alteração. A nova versão suprimiu as condições de exclusão explícita e de axilas normais que existiam antes.

```diff
- ESCOPO — ... a palavra "axila" ... aparece no DITADO?
+ ESCOPO — inclua axilas somente quando solicitadas/avaliadas; exclusão ou negação da avaliação prevalece sobre mera menção.
- - Sim: ... "Linfonodos axilares normais." ... (axilas citadas sem achado = normais).
+ - Incluídas: use a frase normal só se não houver alteração ditada; com alteração, substitua-a pela descrição e conclusão correspondentes.
```

Preservar mama normal = BI-RADS 1. O rótulo novo de `writer.ts:293` reduz a indução pelo nome do exame, mas não resolve esses dois casos.

### A06 — global manda trocar margem suspeita por circunscrita

Local: `apps/api/src/server/prompts/global.ts:383`; conflito com `apps/api/src/server/prompts/contracts/MAMARIA.ts:48`.

Trechos simultâneos: global `Margens de nódulos: sempre "circunscritas"`; contrato aceita `lobulada, microlobulada, irregular ou espiculada`.

Cenário sintético: “imagem hipoecoica de margem espiculada”. A regra global posterior pode trocar o descritor clínico. Esta regra é herdada do global anterior e foi transportada para o global enxuto; a W10c tornou o conflito mais explícito ao listar margens que devem ser preservadas. Isso não depende de calcular BI-RADS.

```diff
- - Margens de nódulos: sempre "circunscritas" (nunca "regulares")
+ - Preserve a margem ditada; apenas "regular" é padronizada para "circunscrita". Nunca troque lobulada, microlobulada, irregular ou espiculada.
```

### A07 — mama manda resolver número ambíguo e unidade ausente sem revisão

Local: `apps/api/src/server/prompts/contracts/MAMARIA.ts:59`; conflito com `global.ts:337`.

Trecho: `algarismos separados ("2 9 cm") → 2,9 cm, sem marca; medida sem unidade → cm`.

Cenário sintético: “imagem medindo 2 9” pode ser decimal truncado ou dois eixos. A regra escolhe a magnitude e acrescenta unidade sem evidência. Não equivale à normalização segura de `2.7` para `2,7` nem à troca de `por` por `x`. A ordem global de preservar/sinalizar números truncados está em conflito.

```diff
- algarismos separados ("2 9 cm") → 2,9 cm, sem marca; medida sem unidade → cm;
+ Número truncado ou eixos ambíguos: preserve e marque [REVISAR — medida ambígua]. Unidade ausente: sinalize, sem assumir cm.
```

### A08 — MSK e partes moles ordenam fabricar morfologia a partir do diagnóstico

Local: `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:585` e `apps/api/src/server/renderer/categories/PARTES_MOLES.ts:591`.

Trecho: `Se o médico ditar SÓ o diagnóstico ... escreva no corpo a morfologia ecográfica típica desse diagnóstico`.

Cenários sintéticos: “tendinopatia da pata de ganso” ou “lipoma no dorso”, sem descritores. A ordem permite criar espessamento, ecogenicidade, compressibilidade e outros achados positivos não ditados. O limite `SEM inventar medida` não protege os descritores. A regra é herdada, mas permanece nos prompts dedicados reavaliados/migrados; o global descritivo não chega a eles.

```diff
- 2. Se o médico ditar SÓ o diagnóstico ... escreva no corpo a morfologia ecográfica típica desse diagnóstico ...
+ 2. Diagnóstico isolado entra na conclusão; não derive morfologia. No corpo, preserve apenas informação ditada e sinalize a descrição ausente quando indispensável, sem usar normalidade na estrutura alterada.
```

Uma frase canônica pode ser usada quando houver comando explícito do médico para inseri-la. Preservar a exceção aprovada `sem evidência de rotura` no tendão alterado, exceto quando houver rotura ditada; não tratá-la como autorização geral para outros descritores.

### A09 — roteiro MSK proíbe reproduzir achado ditado fora da lista

Local: `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:574`, `:591` e `:595`.

Trecho: `NUNCA inclua estrutura fora desta lista (ex.: NÃO cite meniscos, cartilagem ou ligamentos no joelho)` versus `NÃO drope NADA que o médico ditou`.

Cenário sintético: “joelho direito, ligamento colateral medial espessado”. Não há como obedecer simultaneamente à cobertura exclusiva e à fidelidade. A W9 reforçou a conferência de “todas ... e só elas” sem abrir exceção ao conteúdo examinado/ditado.

```diff
- NUNCA inclua estrutura fora desta lista ...
+ Não acrescente normalidade de estruturas fora do roteiro. Achado explicitamente examinado/ditado fora dele entra em linha própria, no segmento correspondente.
- ... o corpo tem TODAS as estruturas do roteiro do segmento, na ordem, e só elas;
+ ... o corpo tem o roteiro na ordem e todos os achados explicitamente ditados, sem estruturas adicionais presumidas;
```

### A10 — partes moles mantém conduta automática; global ainda delega autorização a qualquer contrato

Local: `apps/api/src/server/renderer/categories/PARTES_MOLES.ts:556`, `:557`, `:558` e `:594`; `apps/api/src/server/prompts/global.ts:350`.

Trechos: três conclusões do catálogo terminam em `Correlacionar com dados clínicos.`; a regra 5 diz `conduta apenas se ditada`. O global admite `ou o contrato da categoria mandar`, enquanto a conferência final diz `sem conduta não ditada`.

Cenário sintético: “imagem sólida de 2 cm no braço”, sem pedido de correlação. O catálogo ordena recomendação automática. O global genérico também pode legitimar recomendação de um contrato legado, contrariando o critério W13. A observação clínica conservada pelo sanitizador não é eliminada só por parecer conduta.

```diff
- ... a esclarecer. Correlacionar com dados clínicos.
+ ... a esclarecer.
- ... Linfonodo {região}. Correlacionar com dados clínicos.
+ ... Linfonodo {região}.
- Conduta, acompanhamento ou recomendação só quando o médico ditar ou o contrato da categoria mandar ...
+ Conduta, acompanhamento ou recomendação só quando o médico ditar, respeitando sua redação.
```

Remover também a correlação automática da linha de coleção. Exceções clínicas anteriormente aprovadas, como gestação inicial, devem permanecer isoladas em seu contrato/família; não abrir uma autorização genérica para qualquer biblioteca.

### A11 — contrato enxuto abdominal volta a induzir fenômenos/limitação não ditados

Local: `apps/api/src/server/prompts/contracts/ABDOMEN_TOTAL.ts:18`, `:20` e `:21`.

Trecho: esteatose moderada/acentuada vem com `atenuação sonora` e substituição por `vasos intra-hepáticos e o diafragma ... visualizados parcialmente`; o exemplo da vesícula traz `sem ocasionar fenômenos acústicos`.

Cenário sintético: “esteatose moderada”, sem comentário sobre visualização ou atenuação. O contrato associa o grau a detalhes específicos, embora `global.ts:334` e `:341` proíbam limitação/fenômenos não ditados. Os exemplos estão dentro das regras obrigatórias de corpo, sem a proteção que envolve os few-shots RAG.

```diff
- - Estrutura alterada: a mesma abertura da frase do modelo + a alteração ... Exemplos reais:
+ - Estrutura alterada: substitua só o trecho afetado. Nos exemplos abaixo, fenômeno acústico, mobilidade, grau e limitação entram apenas quando ditados; não derive esses detalhes do diagnóstico.
```

Preferir exemplos condicionais curtos a frases com medida concreta. Não aplicar “dimensões normais” como abertura obrigatória se o órgão foi ditado aumentado/reduzido.

### A12 — tireoide converte “com áreas” incompleto em áreas anecoicas pontuáveis

Local: `apps/api/src/server/renderer/categories/TIREOIDE.ts:302` e `:303`.

Trecho novo da extração: `"… com áreas anecoicas", ou só "… com áreas": nunca a base pura`.

Cenário sintético: “imagem isoecoica com áreas”, sem dizer a natureza das áreas. A regra resolve a omissão como anecoicas e seleciona um enum com 1 ponto. A tabela aprovada pelo Luiz não é o problema: `isoecoica` e `isoecoica_areas_anecoicas` são categorias diferentes, e a segunda exige uma informação que está ausente. Tireoide está fora da lista padrão de writers completos no resolver revisado; a extração e o renderer são um caminho relevante aqui.

```diff
- ... ("… com áreas anecoicas", ou só "… com áreas": nunca a base pura)
+ ... somente quando "áreas anecoicas" estiver explícito. "Com áreas" sem qualificador: não escolha composição por inferência; preserve o trecho em descricao_raw e sinalize a pendência de classificação.
```

A frente responsável deve impedir cálculo de nota dessa composição incompleta. Não propor alterar a tabela ou converter Domingos em ACR; falta de evidência não é nota zero.

### A13 — regra comum de extração manda apagar conteúdo incompreensível sem sinalizar

Local: `apps/api/src/server/ai/llm.ts:572` e `:612`.

Trecho novo, anexado por padrão: `Trecho incompreensível: deixe de fora, sem comentar.`

Cenário sintético: medida ou descritor de uma lesão parcialmente truncado. A regra trata conteúdo clínico incerto como ruído descartável, retirando a indicação de que houve perda. Ela não distingue uma legenda automática irrelevante de uma negação, lateralidade ou medida incompleta. Omitir metacomentários do modelo é correto; omitir evidência clínica silenciosamente contraria a fidelidade.

```diff
- Trecho incompreensível: deixe de fora, sem comentar.
+ Ruído sem conteúdo clínico: omita. Dado clínico parcialmente ilegível: preserve a parte compreensível, não adivinhe e sinalize revisão no campo apropriado; não transforme a incerteza em normalidade.
```

Usar o canal de revisão já compatível com cada consumidor; não colocar prosa operacional dentro de uma descrição assinável nem inventar campo de schema nesta frente.

## Médios

### M01 — few-shots dedicados contradizem corpo descritivo, hipótese e rotura

Local: `apps/api/src/server/renderer/categories/mskFewshots.ts:11` e `:15`; `apps/api/src/server/renderer/categories/partesMolesFewshots.ts:25` e `:35`. Consumidores: `pipeline/mskWriter.ts:48` e `pipeline/partesMolesWriter.ts`.

Trechos: exemplo MSK contém `compatível com alterações degenerativas` no corpo e `O diagnóstico mais provável é` na conclusão; exemplos de partes moles também usam `O diagnóstico mais provável é`. O exemplo de ombro usa `sem evidência de roturas`, em vez da redação literal aprovada `sem evidência de rotura`; a negação está presente, mas a frase diverge. São exemplos herdados ainda enviados como respostas assistant; mudar a regra no system não os tornou coerentes. A alteração dos few-shots de partes moles nesta rodada foi essencialmente a documentação fotográfica.

Cenário sintético: o modelo imita o exemplo próximo e repete interpretação no corpo ou hipótese na redação antiga. Proposta: curar os pares sem adicionar fatos aos ditados originais, ou substituí-los por pares explicitamente sintéticos. Recorte da normalização de estilo:

```diff
- ... osteófitos, compatível com alterações degenerativas.
+ ... osteófitos.
- Imagem ... . O diagnóstico mais provável é cisto sinovial ...
+ Imagem ... , que tem como diagnóstico mais provável cisto sinovial ...
```

Padronizar a negação de rotura aprovada somente nos tendões alterados sem rotura ditada. Os dedicados precisam declarar a fórmula da hipótese e a função exclusivamente estilística dos exemplos, pois não recebem `GLOBAL_RULES_LEAN`.

### M02 — política de dado ausente, cálculo e revisão varia entre camadas simultâneas

Local: `apps/api/src/server/prompts/global.ts:336` e `:337`; `apps/api/src/server/pipeline/writer.ts:319` a `:325`; `apps/api/src/server/pipeline/writerOutputGuard.ts:26`; `apps/api/src/server/prompts/contracts/TIREOIDE.ts:63`.

Trechos: global manda omitir linha de medida não informada; user manda usar modelo na íntegra e manter placeholder; regra final de saída autoriza `[REVISAR: …]`, enquanto o global só permite uma lista de quatro marcadores com travessão. Tireoide manda somar volumes, enquanto o global só permite cálculo a pedido. O exemplo obstétrico no user ainda manda conservar conclusão com idade ausente logo após ordenar omissão de item dependente de dado ausente.

Cenário sintético: uma estrutura normal sem medidas ou dois volumes lobares sem pedido de soma. A resposta depende de qual camada foi obedecida. A mudança do global tornou mais visível a divergência com instruções compartilhadas antigas. Tireoide no writer é condicional à configuração, não o caminho padrão aqui.

```diff
- Para campos sem valor ditado ... mantenha o placeholder "____" quando o modelo exigir.
+ Campos ausentes: siga a política explícita da categoria; fora da família obstétrica, não crie linhas opcionais de medida.
- ... dúvida real vai como [REVISAR: …] no ponto ...
+ ... dúvida clínica real é sinalizada no ponto, no marcador definido pelo contrato da categoria.
- Somar volumes dos dois lobos e istmo ...
+ Use o volume total fornecido; cálculo apenas quando autorizado explicitamente para esta rota, sem substituir volume ditado.
```

Não eliminar os placeholders obrigatórios obstétricos. Resolver a política por rota/categoria, retirando o exemplo obstétrico das categorias não obstétricas. Se a soma automática for uma exceção clínica aprovada, registrá-la como tal em vez de manter regras opostas.

### M03 — regra lexical da casa ficou fora dos prompts ativos principais

Local: `apps/api/src/server/prompts/global.ts:322`, `apps/api/src/server/prompts/styles.ts:49` e `:70`; contraste: `apps/api/src/server/prompts/universalCoreV2.ts:30`.

Trechos: global enxuto não determina `hipoecoico/hiperecoico/anecoico`; overlay OBJETIVO cita `hipoecogenicidade`, e o exemplo canônico usa `Hiperecogenicidade difusa`. A proibição explícita de `ecogênico` está no núcleo V2, que não substitui os writers dedicados nem o writer completo clássico. Não há garantia transversal do vocabulário aprovado. Trata-se de lacuna herdada/persistente, não prova de que todo substantivo terminado em “ecogenicidade” seja proibido.

Cenário sintético: ditado com “hipoecogênico” pode permanecer literal por ordem de fidelidade, enquanto outra rota o padroniza. Proposta: padronizar apenas as variantes adjetivas que o requisito menciona, sem modificar enums técnicos de ACR ou a descrição de ecogenicidade como propriedade.

```diff
+ - Vocabulário: padronize hipoecogênico→hipoecoico, hiperecogênico→hiperecoico e anecogênico→anecoico, com concordância de gênero; preserve o sentido clínico.
```

Inserir uma vez por prompt efetivamente usado, inclusive nos dedicados, e curar exemplos com adjetivos divergentes. Não propor substituição cega no Deepgram.

## Baixo

### B01 — overlay detalhado acrescenta normalidade redundante e comentário V2 encobre consumidor real

Local: `apps/api/src/server/prompts/styles.ts:30`; `apps/api/src/server/prompts/universalCoreV2.ts:10`; consumidor: `apps/api/src/server/pipeline/writerV2/generatePlan.ts:106` e `:122`.

Trechos: `Termina cada estrutura com nota explícita do estado ("dentro dos limites normais", etc.)`; núcleo V2 documentado como `Consumido só pelo harness ... Não wired`.

Cenário sintético: estrutura já tem frase normal literal, e o overlay pede mais uma nota; estrutura alterada pode receber fechamento normal por força do exemplo. Além disso, o comentário pode fazer um revisor descartar uma regra que realmente entra na geração/reparo de planos sob o caminho V2. Não afirmo que V2 esteja habilitado em produção.

```diff
- - Termina cada estrutura com nota explícita do estado ("dentro dos limites normais", etc.).
+ - Preserve a frase do modelo e o estado ditado, sem repetir normalidade nem acrescentá-la à estrutura alterada.
- * Consumido só pelo harness de comparação. Não wired.
+ * Consumido pelo harness e pelo planner/reparo writerV2, sujeito às flags e ao roteamento dessa rota.
```

## Validação executada e limitações dos gates

O setup solicitado foi executado: `.env` copiado sem impressão de conteúdo e mantido ignorado, `pnpm install --prefer-offline` concluído, `pnpm -F api typecheck` aprovado. O instalador informou scripts de build ignorados; isso não impediu os testes abaixo. Nenhum arquivo de dependências ficou alterado.

| Rotina local, sem LLM | Resultado |
| --- | --- |
| `pipeline/__tests__/pelve-writer-prompt.manual.ts` | 37 passaram |
| `pipeline/__tests__/msk-writer-prompt.manual.ts` | 24 passaram |
| `pipeline/__tests__/partes-moles-writer-prompt.manual.ts` | 24 passaram |
| `pipeline/__tests__/writerOutputGuard.manual.ts` | 8/8 |
| `pipeline/__tests__/writerChosenExam.manual.ts` | 6/6, com `tsx --env-file=../../.env`; cliente Anthropic falso |
| `prompts/__tests__/morfologicoPercentilRules.manual.ts` | 528 comparações passaram |
| `renderer/__tests__/w7-regras-da-casa.manual.ts` | 71 verificações passaram |
| `prompts/__tests__/writerHardening.manual.ts` | Falhou: SHA esperado `055798dd…`, obtido `086afdc1…`; baseline abdominal antigo não atualizado para os novos prompts |
| `prompts/__tests__/obstetricaPlainWriter.manual.ts` | Falhou: `ReferenceError: earlyWriterV2Allowed is not defined`; harness avalia trecho do route sem fornecer essa função |

A primeira execução de `writerChosenExam` sem `--env-file` falhou por variáveis ausentes; repetida com o comando documentado, passou. As duas outras falhas permanecem. Não foram corrigidas porque a W13 revisa e documenta; não alego gates totalmente verdes nem regressão clínica causada pelo erro do harness.

Sonda determinística adicional: `auditPelveFacts` recebeu entrada sintética “Ovários normais, o direito com 5,2 cm³ e o esquerdo 4,8 cm³. Mioma intramural.” e saída construída com esses volumes, imagens anecoicas, FIGO 4 e revisão de volume uterino. Retornou:

```json
{"ok":true,"missingMeasures":[],"menopausaSemMarca":false,"liquidoLivreInventado":false,"placeholder":false}
```

Isso prova que o audit atual não detecta essas invenções/pendências; não é uma geração de Sonnet/Haiku nem reprodução do smoke real. `pelveWriterAudit.ts` verifica números presentes, marca de menopausa, líquido livre e `____`; não valida composição, FIGO, correspondência anatômica dos números ou marcadores `[REVISAR: …]`. O teste do prompt pélvico ainda exige a presença de `imagens anecoicas` e da regra de lacunas: passar nesse teste não elimina A02–A04.

O ramo obstétrico continua separado do global enxuto. A documentação fotográfica dos prompts/few-shots dedicados e dos contratos mamário/tireoidiano revisados usa `obtida segundo protocolo`, sem obrigar “06 fotos”. O MSK tem reinício explícito de numeração por laudo e a exceção de rotura corretamente condicionada a não haver rotura ditada. Esses pontos foram preservados; os conflitos encontrados vêm de outras regras/exemplos simultâneos.

## Encaminhamento

Resolver primeiro A02–A07, A12 e o congelamento/decisão de baseline A01. W12 pode absorver A03, mas não considero sua implementação concluída: no snapshot revisado só existe briefing. Depois alinhar os dedicados e exemplos (A08–A10, M01), eliminar induções abdominal e de omissão (A11/A13), e unificar regras de dado ausente/vocabulário sem crescer o prompt (M02/M03).

Após correção pela frente responsável, repetir os gates locais e usar a bancada autorizada via assinatura para os cenários sintéticos de cada achado e comparação clínica. A revisão textual não aprova modelos, hardware, produção nem a biblioteca hospedada. CodeRabbit NÃO EXECUTADO.

Somente documentação foi criada pela W13. Sem push, PR, deploy, `vercel env`, alteração de banco ou de código de produção.
