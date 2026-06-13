# DET-5 — MAMARIA: pesquisa BI-RADS US 5ª ed.

Fonte primária consultada: `ACR BI-RADS 5ª Ed.pdf`, Seção II — Ultrassonografia. A numeração abaixo usa a página impressa do Atlas, não o índice do PDF. Range identificado no sumário da seção: prefácio p. 167, léxico p. 195, sistema de laudos p. 275, orientação p. 287 e apêndice p. 303.

## 1. Léxico US do Atlas, pronto para enums

### Composição do tecido

Enum sugerido:
- `ecotextura_fundo_homogenea_adiposa`
- `ecotextura_fundo_homogenea_fibroglandular`
- `ecotextura_fundo_heterogenea`

Atlas: a tabela-resumo lista a composição da mama em rastreamento como ecotextura de fundo homogênea adiposa, homogênea fibroglandular e heterogênea (Atlas US p. 195). O apêndice reforça que a ecotextura heterogênea pode reduzir sensibilidade para detectar lesões (Atlas US p. 303).

### Nódulos/massas

Definição operacional: um nódulo é tridimensional, ocupa espaço e deve ser visto em dois planos na US 2D; em aquisição volumétrica, em três planos (Atlas US p. 201). Isso é importante para separar nódulo verdadeiro de alteração de fundo, ducto, sombra ou achado só em um corte.

Forma:
- `oval`
- `redonda`
- `irregular`

Apêndice: oval inclui elíptico/ovoide, podendo ter poucas ondulações ou lobulações leves; redonda é esférica/circular/globular; irregular é nem redonda nem oval (Atlas US p. 303).

Orientação:
- `paralela`
- `nao_paralela`

Apêndice: paralela = eixo longo paralelo à linha da pele, mais larga que alta/horizontal; não paralela = eixo longo não orientado ao longo da pele, mais alta que larga/vertical, incluindo lesões redondas (Atlas US p. 303).

Margem:
- `circunscrita`
- `indistinta`
- `angular`
- `microlobulada`
- `espiculada`

Atlas: margem é `circunscrita` ou `não circunscrita`; as não circunscritas se subdividem em indistinta, angular, microlobulada e espiculada (Atlas US p. 195). Para o renderer, não usar `regular`; a prática do Luiz já força `circunscrita`, que está alinhada ao Atlas.

Padrão ecogênico:
- `anecoico`
- `hiperecoico`
- `complexo_solido_cistico`
- `hipoecoico`
- `isoecoico`
- `heterogeneo`

Atlas: esses seis termos estão na tabela-resumo do léxico (Atlas US p. 195). Para preservar o workflow do Luiz, `imagem anecoica` continua cobrindo cisto simples/múltiplos cistos quando outros critérios forem benignos.

Características acústicas posteriores:
- `nenhuma`
- `reforco`
- `sombra`
- `padrao_combinado`

Atlas: os termos oficiais são nenhuma característica, reforço, sombra e padrão combinado (Atlas US p. 195).

Calcificações:
- `calcificacoes_em_nodulo`
- `calcificacoes_fora_nodulo`
- `calcificacoes_intraductais`

Atlas: a tabela-resumo separa calcificações em um nódulo, fora de um nódulo e intraductais (Atlas US p. 195). Isso é mais amplo do que a frase atual do spec, que cobre principalmente calcificações grosseiras benignas.

Características associadas:
- `distorcao_arquitetural`
- `alteracoes_ductais`
- `espessamento_pele`
- `retracao_pele`
- `edema`
- `vascularizacao_ausente`
- `vascularizacao_interna`
- `vascularizacao_periferica`
- `elasticidade_macia`
- `elasticidade_intermediaria`
- `elasticidade_dura`

Atlas: a tabela-resumo lista distorção arquitetural, alterações ductais, alterações cutâneas, edema, vascularização e avaliação da elasticidade (Atlas US p. 196). O texto explica que achados associados incluem efeitos do nódulo nos tecidos vizinhos, alterações ductais, edema/espessamento cutâneo, vascularidade ao Doppler e endurecimento tecidual (Atlas US p. 235).

Casos especiais:
- `cisto_simples`
- `microcistos_agrupados`
- `cisto_complicado`
- `nodulo_na_ou_sobre_pele`
- `corpo_estranho_incluindo_implante`
- `linfonodo_intramamario`
- `linfonodo_axilar`
- `malformacao_arteriovenosa`
- `pseudoaneurisma`
- `doenca_mondor`
- `colecao_liquida_pos_cirurgica`
- `necrose_gordurosa`

Atlas: casos especiais oficiais incluem cisto simples, microcistos agrupados, cisto complicado, nódulo na/sobre a pele, corpo estranho incluindo implantes, linfonodos intramamários, linfonodos axilares, anormalidades vasculares, coleção líquida pós-cirúrgica e necrose gordurosa (Atlas US p. 196). As anormalidades vasculares se subdividem em MAV/pseudoaneurisma e doença de Mondor (Atlas US p. 196).

## 2. NML / lesões não-nodulares

No BI-RADS 5ª ed. de US, a seção não traz um bloco formal chamado `non-mass lesion` / NML no léxico principal. A estrutura oficial de achados é: nódulos, calcificações, achados associados e casos especiais (Atlas US p. 195-196). O texto de nódulos define massa como estrutura tridimensional ocupando espaço e visível em planos diferentes (Atlas US p. 201).

Como descrever no renderer: quando o achado não for massa/nódulo, não for cisto e não couber em calcificação/caso especial, usar achados associados ou descrição livre controlada. Exemplos de enums úteis: `distorcao_arquitetural`, `alteracoes_ductais`, `edema`, `espessamento_pele`, `retracao_pele`, `vascularizacao_interna/periferica`, `calcificacoes_fora_nodulo`, `calcificacoes_intraductais`.

Conflito com a prática do Luiz: o workflow do §10 descreve uma imagem nodular por linha. Isso cobre bem cistos, sólidos, linfonodos e calcificações grosseiras, mas não cobre de forma natural distorção arquitetural, alterações ductais, edema/pele e achado não nodular. Pergunta para Luiz: quando o médico ditar “área hipoecoica não nodular”, “distorção”, “alteração ductal” ou “espessamento cutâneo”, o renderer deve abrir um tipo `achado_nao_nodular` ou jogar em `achados_adicionais` com frase livre?

## 3. Elastografia

Descritores oficiais: `macia`, `intermediaria`, `dura` (Atlas US p. 196 e p. 250). O Atlas descreve a avaliação de elasticidade como achado associado, obtido por compressão/strain ou shear wave, e alerta que forma, margem e ecogenicidade são mais preditivas que consistência; elastografia não deve sobrepujar achados morfológicos mais fortes (Atlas US p. 250).

Enums:
- `elasticidade_macia`
- `elasticidade_intermediaria`
- `elasticidade_dura`

Frases curtas sugeridas:
- “À elastografia, a imagem apresenta elasticidade macia/intermediária/dura.”
- “Avaliação elastográfica: padrão de elasticidade macia/intermediária/dura, interpretado em conjunto com os achados morfológicos.”

Recomendação: não usar elastografia isoladamente para subir/baixar BI-RADS no v1. Guardar como achado associado e deixar o mapa BI-RADS depender primeiro de forma, orientação, margem, padrão ecogênico, posterior e calcificações.

## 4. Mapa feature -> BI-RADS, rascunho para validação do Luiz

Ponto firme do Atlas:
- BI-RADS 1: negativo, exame normal (Atlas US p. 282).
- BI-RADS 2: achado benigno; exemplos incluem cistos simples, linfonodos intramamários, coleções pós-cirúrgicas, implantes mamários e cistos complicados/prováveis fibroadenomas estáveis por 2-3 anos (Atlas US p. 282).
- BI-RADS 3: provavelmente benigno, não é categoria “indeterminada”; para US há evidência consistente de que nódulo sólido com margem circunscrita, forma oval e orientação paralela, além de cisto complicado isolado, fica na faixa <=2% de malignidade. Microcistos agrupados têm dados similares, mas menos consistentes (Atlas US p. 283).
- BI-RADS 4: achado suspeito que justifica biópsia; cobre de >2% a <95% de probabilidade, com subcategorias 4A/4B/4C (Atlas US p. 281 e p. 284).
- BI-RADS 5: altamente sugestivo de malignidade, >=95%, com recomendação de diagnóstico tecidual (Atlas US p. 281 e p. 284).
- BI-RADS 6: malignidade comprovada por biópsia (Atlas US p. 281).

Rascunho operacional para nódulo sólido:
- BI-RADS 2: achado claramente benigno por tipo/caso especial: cisto simples, linfonodo intramamário típico, calcificação grosseira benigna, implante sem alteração, coleção pós-cirúrgica típica, necrose gordurosa típica. Para sólido, só usar 2 se houver estabilidade longa ou correlação conclusiva com benignidade, conforme prática local.
- BI-RADS 3: sólido oval, circunscrito e paralelo, sem feição suspeita forte; cisto complicado isolado; considerar microcistos agrupados se Luiz aceitar esse caso como 3 em vez de 2.
- BI-RADS 4A: qualquer sólido que perde o tripé benigno por uma alteração leve/moderada, mas sem aparência clássica de malignidade. Exemplos para validar: margem lobulada/microlobulada, orientação não paralela isolada, sombra posterior sem espiculação, padrão complexo sólido-cístico sem outros sinais fortes.
- BI-RADS 4B: múltiplas feições suspeitas ou suspeita intermediária. Exemplos para validar: margem irregular/angular, não paralela + margem não circunscrita, vascularização interna associada, calcificações em nódulo suspeito.
- BI-RADS 4C: alta suspeita, mas ainda não “clássico 5”. Exemplos para validar: espiculada ou irregular com sombra, não paralela, hipoecoica/heterogênea e distorção arquitetural, sem conjunto suficiente para >=95%.
- BI-RADS 5: combinação altamente clássica: irregular/espiculada, não paralela, hipoecoica/heterogênea, sombra posterior, distorção arquitetural, retração/espessamento cutâneo ou alterações associadas fortes. O Atlas não fornece fórmula automática; isso deve ser validado como regra local do Luiz.

Regra de renderer simples:
- Defaults por tipo: cisto simples/linfonodo intramamário/calcificação grosseira benigna = 2; sólido = 3 se `oval + circunscrita + paralela` e sem suspeitas; override ditado vence.
- Escalada: qualquer feature suspeita tira do 3 e entra em 4; acúmulo de features fortes ou aparência clássica sobe para 4C/5.
- Nunca gerar 4A/4B/4C como se fosse oficial por soma de pontos; tratar como heurística local a validar.

## 5. Correlação com exames prévios

O Atlas recomenda comparação com exames anteriores quando isso pode afetar a avaliação final; categoria 0 por espera de exames prévios só deve ser usada quando a comparação é necessária para concluir, e com sistema confiável de controle para fechar em até 30 dias. Se os exames prévios chegarem depois, deve haver adendo com avaliação final revisada (Atlas US p. 282).

Problema da frase atual do spec: “permite manter/reclassificar” é correta, mas pesada e pouco operacional. Proposta mais objetiva:

1. Quando mantém categoria:
“Comparado com [mamografia/RM/US] de dd/mm/aaaa, o achado permanece estável. Mantida Categoria BI-RADS® X.”

2. Quando reclassifica:
“Correlação com [mamografia/RM/US] de dd/mm/aaaa: achado correspondente, sem sinais suspeitos adicionais. Reclassificado para Categoria BI-RADS® X.”

3. Quando falta exame prévio e ele é necessário:
“Exames anteriores não disponíveis para comparação. Categoria BI-RADS® 0 até correlação com [mamografia/RM/US] prévia ou complementar.”

4. Quando há biópsia:
“Correlação com biópsia de dd/mm/aaaa: achado compatível com resultado histopatológico benigno. Categoria BI-RADS® 2.”

5. Quando há discordância:
“Correlação com [mamografia/RM/US] de dd/mm/aaaa demonstra discordância entre os métodos. Recomenda-se correlação diagnóstica dirigida.”

Recomendação para o renderer: criar campos estruturados opcionais `correlacao.tipo_exame`, `data`, `efeito` (`mantem`, `reclassifica`, `biopsia_benigna`, `discordante`, `necessaria_indisponivel`) e `birads_final`. Isso evita texto solto e mantém rapidez.

## 6. Conflitos / perguntas para Luiz

1. BI-RADS calculável vs Atlas: o Atlas dá léxico e categorias, mas não dá uma fórmula fechada feature→4A/4B/4C/5. Posso implementar heurística local “tripé benigno = 3; suspeita = 4; conjunto clássico = 5”, mas Luiz precisa validar a gradação 4A/4B/4C.

2. NML: o Atlas 5ª ed. US não traz `non-mass lesion` como categoria central do léxico. Luiz quer “uma imagem por linha” no corpo. Pergunta: achado não nodular entra como `achado_nao_nodular` com frase própria ou vai para `achados_adicionais`?

3. Preposição “de mama direita” vs “em mama direita”: o spec marcou dúvida. O Atlas/formulário não resolve essa preferência estilística. A fonte viva usa “em mama”; Luiz usou “de mama”. Decidir uma forma única para renderer clássico.

4. Axilas: o Atlas trata linfonodos axilares como caso especial (Atlas US p. 196), enquanto o workflow do Luiz também usa axilas como bloco fixo quando o título inclui regiões axilares. Pergunta: axila normal deve sempre aparecer quando título inclui axilas, mesmo se o médico não ditar explicitamente linfonodos?

5. Calcificações: a prática atual tem frase para calcificações grosseiras benignas. O Atlas separa calcificações em nódulo, fora de nódulo e intraductais (Atlas US p. 195). Pergunta: calcificações intraductais/fora de nódulo devem ter tipo próprio e podem escalar BI-RADS?

6. Elastografia: o Atlas permite `macia/intermediária/dura`, mas avisa para não sobrepor achados morfológicos (Atlas US p. 250). Pergunta: no v1, elastografia só aparece como frase adicional, sem cálculo, correto?

7. Microcistos agrupados: Atlas cita dados de provável benignidade, mas menos consistentes que sólido oval/circunscrito/paralelo e cisto complicado isolado (Atlas US p. 283). Pergunta: Luiz quer `microcistos_agrupados` como BI-RADS 2 ou 3?

8. Categoria 0: Atlas aceita categoria 0 para avaliação adicional ou comparação necessária com prévios, mas não como fuga genérica para achado suspeito. Pergunta: renderer deve permitir 0 apenas por ditado/necessidade explícita de comparação, nunca por cálculo automático?

9. Recomendações: iOS já tem condutas e probabilidades por categoria. Pergunta: laudo clássico deve incluir recomendação no texto final ou só guardar para UI/apoio? A prática atual do §5 parece concluir com categoria, sem recomendação extensa.

10. BI-RADS 6: Atlas inclui malignidade comprovada por biópsia (Atlas US p. 281), mas a fonte viva §6 só menciona reclassificar para 2 quando biópsia benigna. Pergunta: quando o médico dita câncer conhecido/biopsiado, renderer deve aceitar BI-RADS 6 verbatim e gerar frase específica?
