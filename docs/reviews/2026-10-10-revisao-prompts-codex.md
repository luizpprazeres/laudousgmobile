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

## Rodada 2

Revisão independente das correções W14, em 10/10/2026. Integração solicitada executada com `git fetch .` e `git merge feat/haiku-migration`, por fast-forward de `b13ae622` para **`cc8924cd23e39d077fc4bf6c4611c520741e9d54`**. Comparação: relatório/código da rodada inicial contra esse snapshot. Os números de linha desta seção se referem ao snapshot W14, não aos da primeira rodada.

**Parecer: seis achados resolvidos, sete parcialmente resolvidos e quatro não resolvidos, mantidos de propósito para decisão do Luiz.** A revisão completa do conjunto ainda não está fechada. Foram comprovados dois falsos alertas novos na auditoria pélvica e uma incompatibilidade de integração entre o prompt MSK corrigido e sua auditoria antiga. Nenhuma correção de produção foi feita nesta revisão.

“Resolve” significa que a causa apontada foi retirada das camadas examinadas. Não significa aprovação clínica do modelo. Os resultados de bancada descritos pelas frentes foram lidos como evidência declarada por elas; não foram reproduzidos por esta frente. A validação independente abaixo usa código, testes locais e entradas/saídas sintéticas construídas, sem chamar modelos ou consultar pacientes/banco.

### Resultado por achado

| Achado | Veredito | Evidência e limite |
| --- | --- | --- |
| A01 | **Resolve parcialmente; escopo original alterado de propósito.** | `apps/api/src/server/prompts/global.ts:44`, `:328`, `:372`: regras mamárias saíram do global comum e do reforço duplicado; escopo/BI-RADS ficam no contrato. O bloco obstétrico continua diferente de `origin/main`. `docs/stories/haiku-migration/W14-correcoes-revisao.md:9` determina conservar corpo descritivo e hipótese também na obstetrícia, dispensando o congelamento. O vazamento foi resolvido segundo essa decisão; a igualdade byte a byte original não foi implementada e não deve ser anunciada. |
| A02 | **Resolve parcialmente.** | `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:1508`, `:1513`, `:1517`, `:1521`: eixos/volumes passam a opcionais e a falta deixa de exigir `[REVISAR]`. Porém, `apresentando imagens anecoicas` e `ambos contendo folículos` continuam obrigatórios sem ditado. `pelveWriterAudit.ts:146` não audita esses fenômenos. A frente W14 declara que os conservou por frequência nos finais, em `docs/reviews/2026-10-revisao-renderers-prompts.md`, seção W14; isso não equivale a retirar essa parte do achado original. |
| A03 | **Resolve parcialmente.** | `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:1515` e `pelveFewshots.ts:48`: tipo/FIGO ficam opcionais e o exemplo deixa de ensinar FIGO 5/4 não ditados. `pipeline/pelveWriterAudit.ts:126` verifica presença de “FIGO”, não igualdade das categorias; `:131` ainda admite tipo inferido de FIGO, contra a proibição do prompt dedicado. A tabela em `:36` aceita “intramural” para FIGO 5, diferente da redação `subseroso ≥ 50% intramural` do global em `global.ts:362`. FIGO no corpo continua sem exigência em `PELVE_FEMININA.ts:1507`; a frente declara esse aspecto encaminhado à W12. |
| A04 | **Não resolve — não tratado de propósito.** | `apps/api/src/server/renderer/categories/PELVE_FEMININA.ts:1514` conserva normalidade do endométrio a partir de espessura ditada. Não foi uma correção esquecida: está entre os pendentes do Luiz em `docs/stories/haiku-migration/W14-correcoes-revisao.md:24`. |
| A05 | **Resolve.** | `apps/api/src/server/prompts/contracts/MAMARIA.ts:19` a `:21`: exclusão/negação da avaliação vence a menção; alteração axilar substitui a frase normal da axila afetada. Foram retiradas as duas ordens que causavam os cenários originais. Mama normal continua BI-RADS 1 em `:56`. |
| A06 | **Resolve.** | `apps/api/src/server/prompts/global.ts:372` e `apps/api/src/server/prompts/contracts/MAMARIA.ts:49`: saiu “sempre circunscritas” do global; margens suspeitas ditadas são preservadas e apenas “regular” é padronizada. Não há a ordem oposta no system genérico revisado. |
| A07 | **Resolve.** | `apps/api/src/server/prompts/contracts/MAMARIA.ts:60` e `:61`: número truncado/eixos ambíguos e falta de unidade recebem revisão. Unidade só é compartilhada com outras medidas do mesmo achado, em vez de assumir cm. Normalização inequívoca de decimal e de “por” foi preservada. |
| A08 | **Não resolve — não tratado de propósito.** | `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:585` e `PARTES_MOLES.ts:591`: diagnóstico isolado ainda autoriza morfologia típica. A W14 manda não mexer nessa decisão em `docs/stories/haiku-migration/W14-correcoes-revisao.md:24`. |
| A09 | **Resolve parcialmente.** | `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:574`, `:591`, `:595`: prompt e conferência agora preservam achado ditado fora do roteiro. Mas `apps/api/src/server/pipeline/mskWriterAudit.ts:139` ainda acusa qualquer menção às estruturas da lista proibida, mesmo ditada. O writer anexa a nota dessa auditoria ao laudo; a incompatibilidade foi reproduzida abaixo. |
| A10 | **Não resolve no catálogo — não tratado de propósito; parte global corrigida.** | `apps/api/src/server/prompts/global.ts:343` removeu a delegação de conduta a qualquer contrato. `apps/api/src/server/renderer/categories/PARTES_MOLES.ts:556` a `:558` ainda exigem correlação automática, em conflito com `:594`. O catálogo foi expressamente reservado ao Luiz em `docs/stories/haiku-migration/W14-correcoes-revisao.md:25`; não deve ser dado como corrigido junto com o global. |
| A11 | **Não resolve — não tratado de propósito.** | `apps/api/src/server/prompts/contracts/ABDOMEN_TOTAL.ts:20` e `:21` mantêm atenuação/visualização parcial e ausência de fenômenos acústicos nos exemplos obrigatórios. Arquivo sem mudança nesta rodada. Pendência deliberada em `docs/stories/haiku-migration/W14-correcoes-revisao.md:26`. |
| A12 | **Resolve parcialmente.** | `apps/api/src/server/renderer/categories/TIREOIDE.ts:302` a `:304`: “com áreas” incompleto agora vira `ecogenicidade=null`, sem pontuação Domingos inventada. `:793` acrescenta revisão, mas `:790` retorna antes quando há ACR, mesmo sem nota Domingos. A sonda com descrição incompleta e ACR ditado saiu sem aviso. A correção do enum/ponto está resolvida; a promessa de pendência visível não cobre esse caminho. |
| A13 | **Resolve parcialmente.** | `apps/api/src/server/ai/llm.ts:576` separa ruído de incerteza clínica e manda preservar/sinalizar. `renderer/extractionMetatext.ts:36` retira a marca do texto; `extraction.ts:504` entrega avisos ao callback, conectado em `app/api/generate/route.ts:1131`. Contudo, `extractionMetatext.ts:88` interrompe a frase no primeiro segmento de metatexto, descartando também descritores claros posteriores. Eles ficam no aviso, mas saem do campo clínico renderizado. Não é mais perda silenciosa no caminho conferido; ainda há perda de conteúdo compreensível no laudo. |
| M01 | **Resolve.** | `apps/api/src/server/renderer/categories/mskFewshots.ts:15`, `:19`, `:23` e `partesMolesFewshots.ts:30`, `:40`: corpo descritivo, hipótese da casa e rotura no singular foram ajustados nos exemplos apontados. `MUSCULOESQUELETICO.ts:584`, `:591`, `PARTES_MOLES.ts:599` e `PELVE_FEMININA.ts:1526` delimitam exemplos como estilo. O exemplo MSK de laudo colado foi mantido como texto do médico, exceção documentada em `mskFewshots.ts:10`; não considero essa preservação uma regressão. |
| M02 | **Resolve parcialmente.** | `apps/api/src/server/pipeline/writer.ts:320` separa a política não obstétrica e retira dela o exemplo de gestação; `writerOutputGuard.ts:31` remete marcas às regras da categoria. A exigência de somar volumes em `prompts/contracts/TIREOIDE.ts:63` continua oposta ao cálculo só a pedido em `global.ts:331`. O ramo legado sem exame escolhido e o exemplo obstétrico conflitante permanecem em `writer.ts:330`. Não foi resolvida toda a política enumerada no achado. |
| M03 | **Resolve.** | `apps/api/src/server/pipeline/writerOutputGuard.ts:32` centraliza o vocabulário adjetivo e preserva “ecogenicidade” como propriedade. A regra chega ao writer genérico por `ai/writerClient.ts:74` e aos dedicados por `pipeline/mskWriter.ts:67`, `pelveWriter.ts:49`, `partesMolesWriter.ts:56`, `dopplerRenalWriter.ts:51`, `dopplerVenosoMmiiWriter.ts:48`. Não confundir os nomes técnicos dos enums ACR com redação adjetiva. |
| B01 | **Resolve.** | `apps/api/src/server/prompts/styles.ts:30` deixa de exigir fechamento normal redundante; `prompts/universalCoreV2.ts:10` documenta o planner/reparo real e as flags. As duas partes do achado foram tratadas. |

### Sondas independentes dos casos parciais

Sondas locais construídas em `tmp-review/w13-w14-probes.ts`, ignorado pelo Git. Foram chamados os auditores/renderers diretamente. Os textos de saída são artificiais: nenhum resultado abaixo é uma geração observada de Haiku/Sonnet.

| Caso sintético | Resultado observado | Implicação |
| --- | --- | --- |
| Ovários normais, apenas volumes 5,2/4,8 cm³; saída acrescenta imagens anecoicas/folículos | `auditPelveFacts.ok=true` | A02: fenômeno não ditado continua aceito; a melhora da sonda composta da W14 não testa esse componente isolado. |
| “Mioma intramural FIGO 3”; saída “intramural FIGO 4” | `ok=true`, `figoInventado=false` | A03: presença da palavra FIGO no ditado basta para a checagem, mesmo com categoria trocada. |
| “Mioma FIGO 4”; saída acrescenta “intramural” | `ok=true`, `tipoMiomaInventado=[]` | A03: auditor autoriza inferência que o prompt proíbe. Não tratar como implementação da futura W12. |
| “Mioma intramural FIGO 5”; saída mantém a combinação sem revisão | `ok=true`, `figoTipoIncompativel=[]` | A03: tabela do audit não identifica a mesma inconsistência de redação que originou parte da revisão inicial. |
| “Mioma FIGO 4”; saída acrescenta medida de 4 cm | `ok=true`, `medidasNaoDitadas=[]` | A02: número de classificação é aceito como se fosse medida; `pelveWriterAudit.ts:53` recolhe qualquer número, com variações ×10/÷10. Isso é limite da nova proteção, não piora demonstrada contra o auditor antigo, que também aceitava. |
| Nódulo com `ecogenicidade=null`, descrição “isoecoica com áreas”, ACR TI-RADS 3 ditado | Renderer devolve ACR 3 sem `[REVISAR]`, nem Nota Final Domingos | A12: não inventa nota, mas a pendência some pelo retorno antecipado em `TIREOIDE.ts:790`. |
| “Imagem de 2 cm, segunda medida ilegível, com margens irregulares e sem fluxo.” | Campo limpo vira “Imagem de 2 cm.”; aviso conserva a frase inteira | A13: preserva só o prefixo, perde margens/negação compreensíveis no laudo. Aviso não substitui a descrição clínica. Esse problema é residual; antes a limpeza retirava a frase inteira. |

Para fechar A02/A03, distinguir evidência de medida de número de classificação, comparar os FIGOs informados por lesão e alinhar a permissão de derivar tipo entre prompt e audit. Para A12, fazer a emissão da pendência independente da presença de ACR. Para A13, retirar só o segmento incerto/metatexto e preservar segmentos clínicos claros posteriores. São propostas para os respectivos donos; não foram aplicadas nesta frente.

### Regressões novas e incompatibilidade de integração

**R2-01 — médio: medida corretamente normalizada de número por extenso passa a ser acusada como inventada.** Local: `apps/api/src/server/pipeline/pelveWriterAudit.ts:53`, `:57`, `:140`. Entrada sintética: “Mioma intramural medindo dois centímetros.” Saída correta: “Imagem sólida medindo 2 cm. Nódulo miomatoso intramural.” O auditor da rodada inicial retorna `ok=true`; a W14 retorna `ok=false`, `medidasNaoDitadas=["2"]`. A nova coleta só reconhece algarismos; o prompt promete entender linguagem natural em `PELVE_FEMININA.ts:1493`. Isso gera nota de revisão sem erro no fato. Proposta: reconhecer números por extenso no contexto da medida antes de declarar invenção, ou manter dúvida de correspondência separada de acusação de medida não ditada.

**R2-02 — médio: comando de remoção é tratado como tipo de mioma que precisa aparecer.** Local: `apps/api/src/server/pipeline/pelveWriterAudit.ts:49`, `:132`. Entrada sintética: “Útero normal. Remova a expressão mioma intramural.” Saída correta: “Útero ecograficamente normal.” Auditor anterior: `ok=true`. W14: `ok=false`, `tipoMiomaOmitido=["intramural"]`, produzindo nota “tipo de mioma ditado ausente”. O coletor considera qualquer ocorrência da palavra, sem examinar comando de remoção, negação ou autocorreção. Uma sonda adicional com “Útero normal, sem mioma intramural” também dispara a mesma cobrança, sem distinguir lesão afirmada de negada. Proposta: vincular tipo a mioma afirmado e à versão final do ditado, preservando a conferência de negações em um canal próprio; comando de remoção não é fato clínico a incluir.

**R2-03 — médio, integração de A09: auditor antigo contradiz a permissão nova do prompt.** Local: `apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:574` versus `apps/api/src/server/pipeline/mskWriterAudit.ts:139`. “Joelho direito, menisco medial com imagem hipoecoica de 1 cm”, reproduzido sob título/lado corretos, retorna `extraStructures=["menisco"]` e `ok=false`. O código do auditor não foi alterado pela W14: não é uma regressão nova desse algoritmo. A integração da correção passou a mandar produzir conteúdo que ele marca indevido. `pipeline/mskWriter.ts` anexa a nota ao resultado. Proposta: auditar estrutura extra presumida, levando em conta a menção examinada/ditada. Essa incompatibilidade impede fechar A09 de ponta a ponta.

Os dois primeiros regressivos foram comparados executando também o auditor anterior extraído de `git show b13ae622:apps/api/src/server/pipeline/pelveWriterAudit.ts`, em arquivo temporário ignorado. Não são hipótese baseada apenas em leitura de regex. São falsos alertas determinísticos; não foi demonstrado dano clínico em produção.

### Validação da rodada

`pnpm -F api typecheck` passou. As 13 rotinas abaixo passaram localmente, com `pnpm exec tsx --env-file=../../.env <arquivo>` a partir de `apps/api`. Testes de motor usam clientes falsos; nenhuma assinatura/API de modelo foi consumida.

| Rotina | Resultado |
| --- | --- |
| `prompts/__tests__/w14-revisao-global.manual.ts` | 9 verificações |
| `pipeline/__tests__/pelve-writer-audit.manual.ts` | 34 verificações |
| `pipeline/__tests__/pelve-writer-prompt.manual.ts` | 44 verificações |
| `pipeline/__tests__/msk-writer-prompt.manual.ts` | 31 verificações |
| `pipeline/__tests__/partes-moles-writer-prompt.manual.ts` | 24 verificações |
| `renderer/__tests__/extraction-metatext.manual.ts` | 13/13 |
| `renderer/__tests__/w10c-mama-tireoide.manual.ts` | 18 verificações |
| `prompts/__tests__/writerHardening.manual.ts` | 7/7; falha da primeira rodada corrigida |
| `prompts/__tests__/obstetricaPlainWriter.manual.ts` | 16 comparações e verificações de rota/rejeição; falha da primeira rodada corrigida |
| `pipeline/__tests__/writerChosenExam.manual.ts` | 6/6 |
| `pipeline/__tests__/writerOutputGuard.manual.ts` | 8/8 |
| `prompts/__tests__/morfologicoPercentilRules.manual.ts` | 528 comparações |
| `ai/__tests__/llm.manual.ts` | Saída exit 0, casos de motor/extração com clientes falsos |

O global obstétrico agora tem 20.085 bytes e SHA-256 `b64461d62fc35d4211abe835c00ecdfd3c20741291f711c7fd0aad83cb696676`, contra 18.637 bytes / `0c0fca70e3945406680fd5f4e5219b642b9318ca1298aad185b026cd1020d90e` em `origin/main`. Essa diferença é deliberada pela decisão W14 sobre A01; o teste morfológico verde não prova identidade histórica.

A04, A08, A10 no catálogo e A11 permanecem **não tratados de propósito**, conforme a instrução atual do Luiz e o briefing W14. Não são regressões novas nem aprovação tácita dessas regras. A02 também conserva deliberadamente frases ovarianas, mas não está entre os quatro itens expressamente reservados ao Luiz; por isso continua parcial em relação ao achado original. Não encontrei implementação nova da W12 no delta revisado; o encaminhamento não fecha A03 nesta rodada.

Somente esta seção foi acrescentada pela revisão da rodada 2. Código de produção recebido pelo merge não foi editado pela W13. Status externo atualizado para `pronto-para-revisao` após o commit. Sem push, PR, deploy, `vercel env` ou banco. CodeRabbit NÃO EXECUTADO.
