-- TERMOS (decisões do Luiz 10/10, item 5) — PROPOSTA, NÃO APLICADA. Gerada por
-- apps/api/scripts/bench-haiku/termos-biblioteca.ts a partir de knowledge_blocks (status validated) com o léxico
-- da casa (lexicoDaCasa.ts, camada saida, categoria do bloco) — a mesma troca que o app já faz na saída.
-- 75 blocos de 1106 validados. Golf ball ("foco ecogênico" na obstetrícia) fica fora.
-- GUARDAS: cada UPDATE exige id E md5 do conteúdo lido em 2026-10-10;
-- se qualquer bloco tiver mudado desde então, a transação inteira aborta (nada é aplicado).
-- O embedding não é recalculado (troca de uma palavra por sinônimo da casa; reingestão opcional).
begin;
do $termos$
declare n int;
begin
  -- ABDOMEN_SUPERIOR CLASSICO_COMPLETO excecao abdomen-superior-excecao-abscesso-hepatico: ecogenico-sozinho: ecogênicos → hiperecoicos · ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$EXCEÇÃO — ABSCESSO HEPÁTICO

Coleção líquida heterogênea (com debris hiperecoicos, gás ou paredes espessadas) no parênquima hepático, em paciente com quadro clínico de febre / dor / leucocitose.

Descrição obrigatória no corpo:
"Fígado de dimensões normais e contornos regulares, apresentando coleção líquida heterogênea, com debris hiperecoicos no interior, medindo 4,5 x 3,8 cm, situada no segmento VIII. Ao Doppler colorido, observa-se hiperemia periférica acentuada."

Na conclusão (urgência explícita):
"x)    Achados sugestivos de abscesso hepático no segmento VIII (vide texto). Encaminhamento clínico/cirúrgico em caráter de urgência."

DOCUMENTAÇÃO DO TIMELINE — em caso de detecção de abscesso ou outra emergência:
"Exame solicitado às __:__ e realizado às __:__. Após o exame, o paciente foi orientado sobre a condição clínica e o médico assistente (ou setor assistencial) foi notificado às __:__. [Nome do paciente] ciente da orientação e da necessidade de avaliação clínica imediata."

Linguagem evitar:
- "Acompanhamento ambulatorial." (inadequado em abscesso)
- "Avaliação oportuna." (insuficiente)

Linguagem correta:
- "Encaminhamento clínico/cirúrgico em caráter de urgência."
- "Drenagem percutânea pode ser indicada — avaliação imediata."$c$, version = version + 1, updated_at = now()
   where id = '816bd820-090f-4890-ae15-00616017e73c' and status = 'validated' and md5(content) = '3a6dccc6dd642dd567ca9bb7d7aacca0';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '816bd820-090f-4890-ae15-00616017e73c', n; end if;
  -- ABDOMEN_SUPERIOR DIRETO_OBJETIVO excecao abdomen-superior-excecao-abscesso-hepatico: ecogenico-sozinho: ecogênicos → hiperecoicos · ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$EXCEÇÃO — ABSCESSO HEPÁTICO

Coleção líquida heterogênea (com debris hiperecoicos, gás ou paredes espessadas) no parênquima hepático, em paciente com quadro clínico de febre / dor / leucocitose.

Descrição obrigatória no corpo:
"Fígado de dimensões normais e contornos regulares, apresentando coleção líquida heterogênea, com debris hiperecoicos no interior, medindo 4,5 x 3,8 cm, situada no segmento VIII. Ao Doppler colorido, observa-se hiperemia periférica acentuada."

Na conclusão (urgência explícita):
"x)    Achados sugestivos de abscesso hepático no segmento VIII (vide texto). Encaminhamento clínico/cirúrgico em caráter de urgência."

DOCUMENTAÇÃO DO TIMELINE — em caso de detecção de abscesso ou outra emergência:
"Exame solicitado às __:__ e realizado às __:__. Após o exame, o paciente foi orientado sobre a condição clínica e o médico assistente (ou setor assistencial) foi notificado às __:__. [Nome do paciente] ciente da orientação e da necessidade de avaliação clínica imediata."

Linguagem evitar:
- "Acompanhamento ambulatorial." (inadequado em abscesso)
- "Avaliação oportuna." (insuficiente)

Linguagem correta:
- "Encaminhamento clínico/cirúrgico em caráter de urgência."
- "Drenagem percutânea pode ser indicada — avaliação imediata."$c$, version = version + 1, updated_at = now()
   where id = '43027170-beb7-455d-9b50-52a42fc14b87' and status = 'validated' and md5(content) = '3a6dccc6dd642dd567ca9bb7d7aacca0';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '43027170-beb7-455d-9b50-52a42fc14b87', n; end if;
  -- ABDOMEN_SUPERIOR DETALHADO_PROTOCOLAR excecao abdomen-superior-excecao-abscesso-hepatico: ecogenico-sozinho: ecogênicos → hiperecoicos · ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$EXCEÇÃO — ABSCESSO HEPÁTICO

Coleção líquida heterogênea (com debris hiperecoicos, gás ou paredes espessadas) no parênquima hepático, em paciente com quadro clínico de febre / dor / leucocitose.

Descrição obrigatória no corpo:
"Fígado de dimensões normais e contornos regulares, apresentando coleção líquida heterogênea, com debris hiperecoicos no interior, medindo 4,5 x 3,8 cm, situada no segmento VIII. Ao Doppler colorido, observa-se hiperemia periférica acentuada."

Na conclusão (urgência explícita):
"x)    Achados sugestivos de abscesso hepático no segmento VIII (vide texto). Encaminhamento clínico/cirúrgico em caráter de urgência."

DOCUMENTAÇÃO DO TIMELINE — em caso de detecção de abscesso ou outra emergência:
"Exame solicitado às __:__ e realizado às __:__. Após o exame, o paciente foi orientado sobre a condição clínica e o médico assistente (ou setor assistencial) foi notificado às __:__. [Nome do paciente] ciente da orientação e da necessidade de avaliação clínica imediata."

Linguagem evitar:
- "Acompanhamento ambulatorial." (inadequado em abscesso)
- "Avaliação oportuna." (insuficiente)

Linguagem correta:
- "Encaminhamento clínico/cirúrgico em caráter de urgência."
- "Drenagem percutânea pode ser indicada — avaliação imediata."$c$, version = version + 1, updated_at = now()
   where id = '7a490d2a-d477-4a2a-947a-58385b78fda8' and status = 'validated' and md5(content) = '3a6dccc6dd642dd567ca9bb7d7aacca0';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7a490d2a-d477-4a2a-947a-58385b78fda8', n; end if;
  -- ABDOMEN_SUPERIOR OBJETIVO excecao abdomen-superior-excecao-abscesso-hepatico: ecogenico-sozinho: ecogênicos → hiperecoicos · ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$EXCEÇÃO — ABSCESSO HEPÁTICO

Coleção líquida heterogênea (com debris hiperecoicos, gás ou paredes espessadas) no parênquima hepático, em paciente com quadro clínico de febre / dor / leucocitose.

Descrição obrigatória no corpo:
"Fígado de dimensões normais e contornos regulares, apresentando coleção líquida heterogênea, com debris hiperecoicos no interior, medindo 4,5 x 3,8 cm, situada no segmento VIII. Ao Doppler colorido, observa-se hiperemia periférica acentuada."

Na conclusão (urgência explícita):
"x)    Achados sugestivos de abscesso hepático no segmento VIII (vide texto). Encaminhamento clínico/cirúrgico em caráter de urgência."

DOCUMENTAÇÃO DO TIMELINE — em caso de detecção de abscesso ou outra emergência:
"Exame solicitado às __:__ e realizado às __:__. Após o exame, o paciente foi orientado sobre a condição clínica e o médico assistente (ou setor assistencial) foi notificado às __:__. [Nome do paciente] ciente da orientação e da necessidade de avaliação clínica imediata."

Linguagem evitar:
- "Acompanhamento ambulatorial." (inadequado em abscesso)
- "Avaliação oportuna." (insuficiente)

Linguagem correta:
- "Encaminhamento clínico/cirúrgico em caráter de urgência."
- "Drenagem percutânea pode ser indicada — avaliação imediata."$c$, version = version + 1, updated_at = now()
   where id = '49a29bb5-8ce8-4e18-a2e0-9756e1d3bf7f' and status = 'validated' and md5(content) = '3a6dccc6dd642dd567ca9bb7d7aacca0';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '49a29bb5-8ce8-4e18-a2e0-9756e1d3bf7f', n; end if;
  -- ABDOMEN_SUPERIOR CLASSICO_COMPLETO regra abdomen-superior-regra-esteatose-hepatica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esteatose
- esteatose hepática
- fígado hiperecoico
- fígado gorduroso
- infiltração gordurosa

REGRA — ESTEATOSE HEPÁTICA

Aumento difuso da ecogenicidade do parênquima hepático, com atenuação do feixe acústico nos planos profundos e perda de definição das estruturas vasculares.

Graduação ecográfica:
- **Grau leve**: discreto aumento da ecogenicidade hepática, ainda permitindo boa visualização dos vasos intra-hepáticos e do diafragma.
- **Grau moderado**: aumento da ecogenicidade com discreta atenuação do feixe acústico e perda parcial da definição dos vasos intra-hepáticos.
- **Grau acentuado**: aumento marcado da ecogenicidade com importante atenuação do feixe acústico, sem visualização adequada dos vasos intra-hepáticos profundos nem do diafragma.

Descrição obrigatória no corpo (pattern: descrição genérica → achado):
"Fígado de dimensões normais e contornos regulares, apresentando ecotextura difusamente hiperecoica, com discreta atenuação do feixe acústico nos planos profundos e perda parcial da definição dos vasos intra-hepáticos."

Na conclusão (numerada):
- "x)    Esteatose hepática, grau leve."
- "x)    Esteatose hepática, grau moderado."
- "x)    Esteatose hepática, grau acentuado."$c$, version = version + 1, updated_at = now()
   where id = '0f1ca0b0-e5bd-416b-9f31-4d4e6b99aa1c' and status = 'validated' and md5(content) = '84ede90b9d83973cfc077cde78909054';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '0f1ca0b0-e5bd-416b-9f31-4d4e6b99aa1c', n; end if;
  -- ABDOMEN_SUPERIOR DIRETO_OBJETIVO regra abdomen-superior-regra-esteatose-hepatica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esteatose
- esteatose hepática
- fígado hiperecoico
- fígado gorduroso
- infiltração gordurosa

REGRA — ESTEATOSE HEPÁTICA

Aumento difuso da ecogenicidade do parênquima hepático, com atenuação do feixe acústico nos planos profundos e perda de definição das estruturas vasculares.

Graduação ecográfica:
- **Grau leve**: discreto aumento da ecogenicidade hepática, ainda permitindo boa visualização dos vasos intra-hepáticos e do diafragma.
- **Grau moderado**: aumento da ecogenicidade com discreta atenuação do feixe acústico e perda parcial da definição dos vasos intra-hepáticos.
- **Grau acentuado**: aumento marcado da ecogenicidade com importante atenuação do feixe acústico, sem visualização adequada dos vasos intra-hepáticos profundos nem do diafragma.

Descrição obrigatória no corpo (pattern: descrição genérica → achado):
"Fígado de dimensões normais e contornos regulares, apresentando ecotextura difusamente hiperecoica, com discreta atenuação do feixe acústico nos planos profundos e perda parcial da definição dos vasos intra-hepáticos."

Na conclusão (numerada):
- "x)    Esteatose hepática, grau leve."
- "x)    Esteatose hepática, grau moderado."
- "x)    Esteatose hepática, grau acentuado."$c$, version = version + 1, updated_at = now()
   where id = '369a052d-ece9-4b33-8714-5f122472d71f' and status = 'validated' and md5(content) = '84ede90b9d83973cfc077cde78909054';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '369a052d-ece9-4b33-8714-5f122472d71f', n; end if;
  -- ABDOMEN_SUPERIOR DETALHADO_PROTOCOLAR regra abdomen-superior-regra-esteatose-hepatica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esteatose
- esteatose hepática
- fígado hiperecoico
- fígado gorduroso
- infiltração gordurosa

REGRA — ESTEATOSE HEPÁTICA

Aumento difuso da ecogenicidade do parênquima hepático, com atenuação do feixe acústico nos planos profundos e perda de definição das estruturas vasculares.

Graduação ecográfica:
- **Grau leve**: discreto aumento da ecogenicidade hepática, ainda permitindo boa visualização dos vasos intra-hepáticos e do diafragma.
- **Grau moderado**: aumento da ecogenicidade com discreta atenuação do feixe acústico e perda parcial da definição dos vasos intra-hepáticos.
- **Grau acentuado**: aumento marcado da ecogenicidade com importante atenuação do feixe acústico, sem visualização adequada dos vasos intra-hepáticos profundos nem do diafragma.

Descrição obrigatória no corpo (pattern: descrição genérica → achado):
"Fígado de dimensões normais e contornos regulares, apresentando ecotextura difusamente hiperecoica, com discreta atenuação do feixe acústico nos planos profundos e perda parcial da definição dos vasos intra-hepáticos."

Na conclusão (numerada):
- "x)    Esteatose hepática, grau leve."
- "x)    Esteatose hepática, grau moderado."
- "x)    Esteatose hepática, grau acentuado."$c$, version = version + 1, updated_at = now()
   where id = '7e129d28-0ec6-4326-9c50-684f920c06cb' and status = 'validated' and md5(content) = '84ede90b9d83973cfc077cde78909054';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7e129d28-0ec6-4326-9c50-684f920c06cb', n; end if;
  -- ABDOMEN_SUPERIOR OBJETIVO regra abdomen-superior-regra-esteatose-hepatica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esteatose
- esteatose hepática
- fígado hiperecoico
- fígado gorduroso
- infiltração gordurosa

REGRA — ESTEATOSE HEPÁTICA

Aumento difuso da ecogenicidade do parênquima hepático, com atenuação do feixe acústico nos planos profundos e perda de definição das estruturas vasculares.

Graduação ecográfica:
- **Grau leve**: discreto aumento da ecogenicidade hepática, ainda permitindo boa visualização dos vasos intra-hepáticos e do diafragma.
- **Grau moderado**: aumento da ecogenicidade com discreta atenuação do feixe acústico e perda parcial da definição dos vasos intra-hepáticos.
- **Grau acentuado**: aumento marcado da ecogenicidade com importante atenuação do feixe acústico, sem visualização adequada dos vasos intra-hepáticos profundos nem do diafragma.

Descrição obrigatória no corpo (pattern: descrição genérica → achado):
"Fígado de dimensões normais e contornos regulares, apresentando ecotextura difusamente hiperecoica, com discreta atenuação do feixe acústico nos planos profundos e perda parcial da definição dos vasos intra-hepáticos."

Na conclusão (numerada):
- "x)    Esteatose hepática, grau leve."
- "x)    Esteatose hepática, grau moderado."
- "x)    Esteatose hepática, grau acentuado."$c$, version = version + 1, updated_at = now()
   where id = '38045d2e-7d89-4cb6-8598-073f681c2cc2' and status = 'validated' and md5(content) = '84ede90b9d83973cfc077cde78909054';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '38045d2e-7d89-4cb6-8598-073f681c2cc2', n; end if;
  -- CERVICAL CLASSICO_COMPLETO modelo cervical-modelo-template-padrao: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$FUNÇÃO: Gerar laudos de ultrassonografia cervical, seguindo rigorosamente o modelo e as regras abaixo.

REGRAS GERAIS (OBRIGATÓRIAS):
- Estrutura fixa e imutável, sempre nesta ordem e com estes cabeçalhos:
  ULTRASSONOGRAFIA CERVICAL
  COMENTÁRIOS:
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  CONCLUSÃO:
- Nunca inventar dados não fornecidos pelo médico.
- A seção "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" deve SEMPRE listar todos os níveis cervicais (IA, IB, IIA, IIB, III, IV, VA, VB e VI).
- Quando o médico descrever linfonodos normais em níveis específicos, usar o padrão: "Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
- Encerrar com: "Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."
- Se exame normal, manter o modelo normal exato.

MODELO BASE NORMAL:

ULTRASSONOGRAFIA CERVICAL

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Cadeias ganglionares cervicais sem evidência de alterações ecográficas nos níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI.

CONCLUSÃO:
Ausência de alterações detectáveis pelo método.

COMO DESCREVER LINFONODOS NORMAIS EM NÍVEL ESPECÍFICO:

Quando o médico indicar linfonodos normais em um ou mais níveis:
"Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
"Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."

COMO DESCREVER ALTERAÇÕES:

Linfonodo aumentado / suspeito:
Achados: "Linfonodo de dimensões aumentadas no nível ___, medindo ___ x ___ x ___ cm, de forma arredondada / oval, com periferia hipoecoica e centro hiperecoico / sem hilo hiperecoico identificável, com vascularização ___ ao Doppler colorido."
Conclusão: "Linfonodo de aspecto suspeito no nível ___. Correlacionar com achados clínicos."$c$, version = version + 1, updated_at = now()
   where id = '197b8dc2-0175-4148-beea-8a0ba9289b8c' and status = 'validated' and md5(content) = 'feca1a824ca47ba31e807e7a732e5c58';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '197b8dc2-0175-4148-beea-8a0ba9289b8c', n; end if;
  -- CERVICAL DIRETO_OBJETIVO modelo cervical-modelo-template-padrao: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$FUNÇÃO: Gerar laudos de ultrassonografia cervical, seguindo rigorosamente o modelo e as regras abaixo.

REGRAS GERAIS (OBRIGATÓRIAS):
- Estrutura fixa e imutável, sempre nesta ordem e com estes cabeçalhos:
  ULTRASSONOGRAFIA CERVICAL
  COMENTÁRIOS:
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  CONCLUSÃO:
- Nunca inventar dados não fornecidos pelo médico.
- A seção "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" deve SEMPRE listar todos os níveis cervicais (IA, IB, IIA, IIB, III, IV, VA, VB e VI).
- Quando o médico descrever linfonodos normais em níveis específicos, usar o padrão: "Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
- Encerrar com: "Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."
- Se exame normal, manter o modelo normal exato.

MODELO BASE NORMAL:

ULTRASSONOGRAFIA CERVICAL

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Cadeias ganglionares cervicais sem evidência de alterações ecográficas nos níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI.

CONCLUSÃO:
Ausência de alterações detectáveis pelo método.

COMO DESCREVER LINFONODOS NORMAIS EM NÍVEL ESPECÍFICO:

Quando o médico indicar linfonodos normais em um ou mais níveis:
"Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
"Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."

COMO DESCREVER ALTERAÇÕES:

Linfonodo aumentado / suspeito:
Achados: "Linfonodo de dimensões aumentadas no nível ___, medindo ___ x ___ x ___ cm, de forma arredondada / oval, com periferia hipoecoica e centro hiperecoico / sem hilo hiperecoico identificável, com vascularização ___ ao Doppler colorido."
Conclusão: "Linfonodo de aspecto suspeito no nível ___. Correlacionar com achados clínicos."$c$, version = version + 1, updated_at = now()
   where id = 'b78e7737-4a2e-42b8-bf59-59c54862a9d2' and status = 'validated' and md5(content) = 'feca1a824ca47ba31e807e7a732e5c58';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'b78e7737-4a2e-42b8-bf59-59c54862a9d2', n; end if;
  -- CERVICAL DETALHADO_PROTOCOLAR modelo cervical-modelo-template-padrao: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$FUNÇÃO: Gerar laudos de ultrassonografia cervical, seguindo rigorosamente o modelo e as regras abaixo.

REGRAS GERAIS (OBRIGATÓRIAS):
- Estrutura fixa e imutável, sempre nesta ordem e com estes cabeçalhos:
  ULTRASSONOGRAFIA CERVICAL
  COMENTÁRIOS:
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  CONCLUSÃO:
- Nunca inventar dados não fornecidos pelo médico.
- A seção "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" deve SEMPRE listar todos os níveis cervicais (IA, IB, IIA, IIB, III, IV, VA, VB e VI).
- Quando o médico descrever linfonodos normais em níveis específicos, usar o padrão: "Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
- Encerrar com: "Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."
- Se exame normal, manter o modelo normal exato.

MODELO BASE NORMAL:

ULTRASSONOGRAFIA CERVICAL

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Cadeias ganglionares cervicais sem evidência de alterações ecográficas nos níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI.

CONCLUSÃO:
Ausência de alterações detectáveis pelo método.

COMO DESCREVER LINFONODOS NORMAIS EM NÍVEL ESPECÍFICO:

Quando o médico indicar linfonodos normais em um ou mais níveis:
"Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
"Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."

COMO DESCREVER ALTERAÇÕES:

Linfonodo aumentado / suspeito:
Achados: "Linfonodo de dimensões aumentadas no nível ___, medindo ___ x ___ x ___ cm, de forma arredondada / oval, com periferia hipoecoica e centro hiperecoico / sem hilo hiperecoico identificável, com vascularização ___ ao Doppler colorido."
Conclusão: "Linfonodo de aspecto suspeito no nível ___. Correlacionar com achados clínicos."$c$, version = version + 1, updated_at = now()
   where id = '15b34dfd-21e7-4ab3-bda4-37ba86962eb9' and status = 'validated' and md5(content) = 'feca1a824ca47ba31e807e7a732e5c58';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '15b34dfd-21e7-4ab3-bda4-37ba86962eb9', n; end if;
  -- CERVICAL OBJETIVO modelo cervical-modelo-template-padrao: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$FUNÇÃO: Gerar laudos de ultrassonografia cervical, seguindo rigorosamente o modelo e as regras abaixo.

REGRAS GERAIS (OBRIGATÓRIAS):
- Estrutura fixa e imutável, sempre nesta ordem e com estes cabeçalhos:
  ULTRASSONOGRAFIA CERVICAL
  COMENTÁRIOS:
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  CONCLUSÃO:
- Nunca inventar dados não fornecidos pelo médico.
- A seção "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" deve SEMPRE listar todos os níveis cervicais (IA, IB, IIA, IIB, III, IV, VA, VB e VI).
- Quando o médico descrever linfonodos normais em níveis específicos, usar o padrão: "Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
- Encerrar com: "Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."
- Se exame normal, manter o modelo normal exato.

MODELO BASE NORMAL:

ULTRASSONOGRAFIA CERVICAL

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Cadeias ganglionares cervicais sem evidência de alterações ecográficas nos níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI.

CONCLUSÃO:
Ausência de alterações detectáveis pelo método.

COMO DESCREVER LINFONODOS NORMAIS EM NÍVEL ESPECÍFICO:

Quando o médico indicar linfonodos normais em um ou mais níveis:
"Linfonodos de aspecto ecográfico normal no nível ___, de imagens ovais, com periferia hipoecoica e centro hiperecoico."
"Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada."

COMO DESCREVER ALTERAÇÕES:

Linfonodo aumentado / suspeito:
Achados: "Linfonodo de dimensões aumentadas no nível ___, medindo ___ x ___ x ___ cm, de forma arredondada / oval, com periferia hipoecoica e centro hiperecoico / sem hilo hiperecoico identificável, com vascularização ___ ao Doppler colorido."
Conclusão: "Linfonodo de aspecto suspeito no nível ___. Correlacionar com achados clínicos."$c$, version = version + 1, updated_at = now()
   where id = '94a5d58d-ec4e-4025-bce3-1dc0dba16ee0' and status = 'validated' and md5(content) = 'feca1a824ca47ba31e807e7a732e5c58';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '94a5d58d-ec4e-4025-bce3-1dc0dba16ee0', n; end if;
  -- CERVICAL CLASSICO_COMPLETO regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "linfonodo suspeito", "linfonodomegalia", "linfadenopatia", "hilo preservado", "hilo ausente", "perda do hilo", "linfonodo arredondado", "linfonodo oval", "microcalcificações linfonodais", "necrose central", "vascularização periférica", "razão S/L", "short-axis", "cortical espessada".

REGRA — SINAIS ECOGRÁFICOS SUGESTIVOS DE LINFONODO NORMAL vs SUSPEITO

ATENÇÃO: nenhum critério isolado é diagnóstico. Esta regra fornece SINAIS sugestivos como REFERÊNCIA contextual. A classificação final como "suspeito de atipia" é juízo INTEGRADO do médico, considerando o conjunto de achados ecográficos + contexto clínico, e o diagnóstico definitivo requer histopatologia.

═══════════════════════════════════════════════════
TABELA COMPARATIVA (sinais ecográficos — referência, não gates)
═══════════════════════════════════════════════════

| Característica | Padrão NORMAL / REACIONAL | Padrão SUGESTIVO DE ATIPIA |
|---|---|---|
| Eixo curto (short-axis) | Tipicamente < 10 mm | Tipicamente ≥ 10 mm (referência sujeita a contexto clínico; nível II pode tolerar valores um pouco maiores) |
| Razão S/L (eixo curto / eixo longo) | Tipicamente < 0,5 (forma oval) | Tipicamente ≥ 0,5 (forma arredondada) |
| Hilo hiperecoico | Presente | Ausente ou apagado |
| Cortical | Fina, regular, uniforme | Espessada, assimétrica, ou hipoecoica focal |
| Ecogenicidade | Cortical hipoecoica + hilo hiperecoico | Difusamente hipoecoica, perda do hilo |
| Necrose central | Ausente | Presente (área anecoica/cística central) |
| Microcalcificações | Ausentes | Presentes (sugestivas de origem tireoidiana papilar ou metástase) |
| Padrão vascular Doppler | Hilar central | Periférico, capsular, ou caótico/aberrante |
| Forma | Oval, achatado | Arredondado, esférico |
| Contornos | Regulares, bem definidos | Irregulares; pode haver perda da margem capsular |

═══════════════════════════════════════════════════
USO DOS LIMIARES NUMÉRICOS — IMPORTANTE
═══════════════════════════════════════════════════

Os valores numéricos abaixo são REFERÊNCIA CONTEXTUAL para a interpretação clínica, NÃO gates rígidos de normalidade ou malignidade:

- Eixo curto: a maioria dos autores adota ~10 mm como referência para suspeição em níveis I, III-VI; a literatura permite até ~11 mm em nível II (drenagem de cabeça/pescoço) sem necessariamente indicar atipia. Acima desses valores, ATENÇÃO contextual — não rotulação automática.
- Razão S/L: ≥ 0,5 é um sinal sugestivo de atipia, NÃO um diagnóstico isolado.
- Supraclavicular (V-B): qualquer linfonodo nessa topografia merece atenção contextual independente do tamanho (sinal de Virchow clássico).

═══════════════════════════════════════════════════
COMO INTEGRAR OS SINAIS
═══════════════════════════════════════════════════

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa e correlação clínica):
- Microcalcificações intra-linfonodais.
- Necrose central.
- Vascularização periférica/aberrante ao Doppler.
- Perda da margem capsular sugestiva de extravasamento extracapsular.
- Perda completa do hilo associado a outros achados.

SINAIS COMPLEMENTARES (sozinhos têm baixa especificidade):
- Eixo curto aumentado.
- Forma arredondada (razão S/L elevada).
- Cortical espessada.
- Crescimento documentado em estudo prévio (mencionar apenas se houver comparativo).

REGRA: a integração desses achados é JUÍZO CLÍNICO do médico. Esta regra documenta os sinais; a conclusão final ("características reacionais" vs "características ecográficas suspeitas") segue o que o médico declarou nos achados.

═══════════════════════════════════════════════════
CONTEXTO CLÍNICO IMPORTANTE (referência — não usar como diagnóstico)
═══════════════════════════════════════════════════

- Tuberculose ganglionar pode mimetizar malignidade (necrose central, conglomerado).
- Doença linfoproliferativa (linfoma) pode apresentar linfonodos arredondados sem necrose.
- Pós-radioterapia ou pós-cirurgia: cortical pode estar espessada como sequela.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar como "metástase" ou "linfoma" sem dado histopatológico.
- Não estimar tamanho se médico não mediu.
- Não atribuir microcalcificações ou necrose sem menção explícita do médico.
- Não usar limiares numéricos (10 mm, 11 mm, S/L 0,5) como gates de normalidade ou malignidade — são referências contextuais que apoiam o juízo do médico.
- Não inventar regras de score (ex: "X sinais altamente sugestivos + Y sinais sugestivos = suspeição") — a integração é juízo clínico, não algoritmo fixo.
- Não citar limiares pediátricos, taxas de crescimento percentual ou espessura cortical específica sem fonte explícita citada pelo médico nos achados.
- Seguir as recomendações das conclusões (correlação clínica; exames laboratoriais; TC cervical ou biópsia por agulha fina quando aplicável). NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = 'c3845acc-0ec7-45ea-b5f1-637f047851ff' and status = 'validated' and md5(content) = 'dfd1bf0d407d734e12df6aa2f60aa113';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c3845acc-0ec7-45ea-b5f1-637f047851ff', n; end if;
  -- CERVICAL DIRETO_OBJETIVO regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "linfonodo suspeito", "linfonodomegalia", "linfadenopatia", "hilo preservado", "hilo ausente", "perda do hilo", "linfonodo arredondado", "linfonodo oval", "microcalcificações linfonodais", "necrose central", "vascularização periférica", "razão S/L", "short-axis", "cortical espessada".

REGRA — SINAIS ECOGRÁFICOS SUGESTIVOS DE LINFONODO NORMAL vs SUSPEITO

ATENÇÃO: nenhum critério isolado é diagnóstico. Esta regra fornece SINAIS sugestivos como REFERÊNCIA contextual. A classificação final como "suspeito de atipia" é juízo INTEGRADO do médico, considerando o conjunto de achados ecográficos + contexto clínico, e o diagnóstico definitivo requer histopatologia.

═══════════════════════════════════════════════════
TABELA COMPARATIVA (sinais ecográficos — referência, não gates)
═══════════════════════════════════════════════════

| Característica | Padrão NORMAL / REACIONAL | Padrão SUGESTIVO DE ATIPIA |
|---|---|---|
| Eixo curto (short-axis) | Tipicamente < 10 mm | Tipicamente ≥ 10 mm (referência sujeita a contexto clínico; nível II pode tolerar valores um pouco maiores) |
| Razão S/L (eixo curto / eixo longo) | Tipicamente < 0,5 (forma oval) | Tipicamente ≥ 0,5 (forma arredondada) |
| Hilo hiperecoico | Presente | Ausente ou apagado |
| Cortical | Fina, regular, uniforme | Espessada, assimétrica, ou hipoecoica focal |
| Ecogenicidade | Cortical hipoecoica + hilo hiperecoico | Difusamente hipoecoica, perda do hilo |
| Necrose central | Ausente | Presente (área anecoica/cística central) |
| Microcalcificações | Ausentes | Presentes (sugestivas de origem tireoidiana papilar ou metástase) |
| Padrão vascular Doppler | Hilar central | Periférico, capsular, ou caótico/aberrante |
| Forma | Oval, achatado | Arredondado, esférico |
| Contornos | Regulares, bem definidos | Irregulares; pode haver perda da margem capsular |

═══════════════════════════════════════════════════
USO DOS LIMIARES NUMÉRICOS — IMPORTANTE
═══════════════════════════════════════════════════

Os valores numéricos abaixo são REFERÊNCIA CONTEXTUAL para a interpretação clínica, NÃO gates rígidos de normalidade ou malignidade:

- Eixo curto: a maioria dos autores adota ~10 mm como referência para suspeição em níveis I, III-VI; a literatura permite até ~11 mm em nível II (drenagem de cabeça/pescoço) sem necessariamente indicar atipia. Acima desses valores, ATENÇÃO contextual — não rotulação automática.
- Razão S/L: ≥ 0,5 é um sinal sugestivo de atipia, NÃO um diagnóstico isolado.
- Supraclavicular (V-B): qualquer linfonodo nessa topografia merece atenção contextual independente do tamanho (sinal de Virchow clássico).

═══════════════════════════════════════════════════
COMO INTEGRAR OS SINAIS
═══════════════════════════════════════════════════

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa e correlação clínica):
- Microcalcificações intra-linfonodais.
- Necrose central.
- Vascularização periférica/aberrante ao Doppler.
- Perda da margem capsular sugestiva de extravasamento extracapsular.
- Perda completa do hilo associado a outros achados.

SINAIS COMPLEMENTARES (sozinhos têm baixa especificidade):
- Eixo curto aumentado.
- Forma arredondada (razão S/L elevada).
- Cortical espessada.
- Crescimento documentado em estudo prévio (mencionar apenas se houver comparativo).

REGRA: a integração desses achados é JUÍZO CLÍNICO do médico. Esta regra documenta os sinais; a conclusão final ("características reacionais" vs "características ecográficas suspeitas") segue o que o médico declarou nos achados.

═══════════════════════════════════════════════════
CONTEXTO CLÍNICO IMPORTANTE (referência — não usar como diagnóstico)
═══════════════════════════════════════════════════

- Tuberculose ganglionar pode mimetizar malignidade (necrose central, conglomerado).
- Doença linfoproliferativa (linfoma) pode apresentar linfonodos arredondados sem necrose.
- Pós-radioterapia ou pós-cirurgia: cortical pode estar espessada como sequela.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar como "metástase" ou "linfoma" sem dado histopatológico.
- Não estimar tamanho se médico não mediu.
- Não atribuir microcalcificações ou necrose sem menção explícita do médico.
- Não usar limiares numéricos (10 mm, 11 mm, S/L 0,5) como gates de normalidade ou malignidade — são referências contextuais que apoiam o juízo do médico.
- Não inventar regras de score (ex: "X sinais altamente sugestivos + Y sinais sugestivos = suspeição") — a integração é juízo clínico, não algoritmo fixo.
- Não citar limiares pediátricos, taxas de crescimento percentual ou espessura cortical específica sem fonte explícita citada pelo médico nos achados.
- Seguir as recomendações das conclusões (correlação clínica; exames laboratoriais; TC cervical ou biópsia por agulha fina quando aplicável). NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = '63fff88e-ef5b-4362-908e-5b7ef10dda8e' and status = 'validated' and md5(content) = 'dfd1bf0d407d734e12df6aa2f60aa113';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '63fff88e-ef5b-4362-908e-5b7ef10dda8e', n; end if;
  -- CERVICAL DETALHADO_PROTOCOLAR regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "linfonodo suspeito", "linfonodomegalia", "linfadenopatia", "hilo preservado", "hilo ausente", "perda do hilo", "linfonodo arredondado", "linfonodo oval", "microcalcificações linfonodais", "necrose central", "vascularização periférica", "razão S/L", "short-axis", "cortical espessada".

REGRA — SINAIS ECOGRÁFICOS SUGESTIVOS DE LINFONODO NORMAL vs SUSPEITO

ATENÇÃO: nenhum critério isolado é diagnóstico. Esta regra fornece SINAIS sugestivos como REFERÊNCIA contextual. A classificação final como "suspeito de atipia" é juízo INTEGRADO do médico, considerando o conjunto de achados ecográficos + contexto clínico, e o diagnóstico definitivo requer histopatologia.

═══════════════════════════════════════════════════
TABELA COMPARATIVA (sinais ecográficos — referência, não gates)
═══════════════════════════════════════════════════

| Característica | Padrão NORMAL / REACIONAL | Padrão SUGESTIVO DE ATIPIA |
|---|---|---|
| Eixo curto (short-axis) | Tipicamente < 10 mm | Tipicamente ≥ 10 mm (referência sujeita a contexto clínico; nível II pode tolerar valores um pouco maiores) |
| Razão S/L (eixo curto / eixo longo) | Tipicamente < 0,5 (forma oval) | Tipicamente ≥ 0,5 (forma arredondada) |
| Hilo hiperecoico | Presente | Ausente ou apagado |
| Cortical | Fina, regular, uniforme | Espessada, assimétrica, ou hipoecoica focal |
| Ecogenicidade | Cortical hipoecoica + hilo hiperecoico | Difusamente hipoecoica, perda do hilo |
| Necrose central | Ausente | Presente (área anecoica/cística central) |
| Microcalcificações | Ausentes | Presentes (sugestivas de origem tireoidiana papilar ou metástase) |
| Padrão vascular Doppler | Hilar central | Periférico, capsular, ou caótico/aberrante |
| Forma | Oval, achatado | Arredondado, esférico |
| Contornos | Regulares, bem definidos | Irregulares; pode haver perda da margem capsular |

═══════════════════════════════════════════════════
USO DOS LIMIARES NUMÉRICOS — IMPORTANTE
═══════════════════════════════════════════════════

Os valores numéricos abaixo são REFERÊNCIA CONTEXTUAL para a interpretação clínica, NÃO gates rígidos de normalidade ou malignidade:

- Eixo curto: a maioria dos autores adota ~10 mm como referência para suspeição em níveis I, III-VI; a literatura permite até ~11 mm em nível II (drenagem de cabeça/pescoço) sem necessariamente indicar atipia. Acima desses valores, ATENÇÃO contextual — não rotulação automática.
- Razão S/L: ≥ 0,5 é um sinal sugestivo de atipia, NÃO um diagnóstico isolado.
- Supraclavicular (V-B): qualquer linfonodo nessa topografia merece atenção contextual independente do tamanho (sinal de Virchow clássico).

═══════════════════════════════════════════════════
COMO INTEGRAR OS SINAIS
═══════════════════════════════════════════════════

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa e correlação clínica):
- Microcalcificações intra-linfonodais.
- Necrose central.
- Vascularização periférica/aberrante ao Doppler.
- Perda da margem capsular sugestiva de extravasamento extracapsular.
- Perda completa do hilo associado a outros achados.

SINAIS COMPLEMENTARES (sozinhos têm baixa especificidade):
- Eixo curto aumentado.
- Forma arredondada (razão S/L elevada).
- Cortical espessada.
- Crescimento documentado em estudo prévio (mencionar apenas se houver comparativo).

REGRA: a integração desses achados é JUÍZO CLÍNICO do médico. Esta regra documenta os sinais; a conclusão final ("características reacionais" vs "características ecográficas suspeitas") segue o que o médico declarou nos achados.

═══════════════════════════════════════════════════
CONTEXTO CLÍNICO IMPORTANTE (referência — não usar como diagnóstico)
═══════════════════════════════════════════════════

- Tuberculose ganglionar pode mimetizar malignidade (necrose central, conglomerado).
- Doença linfoproliferativa (linfoma) pode apresentar linfonodos arredondados sem necrose.
- Pós-radioterapia ou pós-cirurgia: cortical pode estar espessada como sequela.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar como "metástase" ou "linfoma" sem dado histopatológico.
- Não estimar tamanho se médico não mediu.
- Não atribuir microcalcificações ou necrose sem menção explícita do médico.
- Não usar limiares numéricos (10 mm, 11 mm, S/L 0,5) como gates de normalidade ou malignidade — são referências contextuais que apoiam o juízo do médico.
- Não inventar regras de score (ex: "X sinais altamente sugestivos + Y sinais sugestivos = suspeição") — a integração é juízo clínico, não algoritmo fixo.
- Não citar limiares pediátricos, taxas de crescimento percentual ou espessura cortical específica sem fonte explícita citada pelo médico nos achados.
- Seguir as recomendações das conclusões (correlação clínica; exames laboratoriais; TC cervical ou biópsia por agulha fina quando aplicável). NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = '7cd9440a-74e8-497f-b30d-83618e998a90' and status = 'validated' and md5(content) = 'dfd1bf0d407d734e12df6aa2f60aa113';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7cd9440a-74e8-497f-b30d-83618e998a90', n; end if;
  -- CERVICAL OBJETIVO regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "linfonodo suspeito", "linfonodomegalia", "linfadenopatia", "hilo preservado", "hilo ausente", "perda do hilo", "linfonodo arredondado", "linfonodo oval", "microcalcificações linfonodais", "necrose central", "vascularização periférica", "razão S/L", "short-axis", "cortical espessada".

REGRA — SINAIS ECOGRÁFICOS SUGESTIVOS DE LINFONODO NORMAL vs SUSPEITO

ATENÇÃO: nenhum critério isolado é diagnóstico. Esta regra fornece SINAIS sugestivos como REFERÊNCIA contextual. A classificação final como "suspeito de atipia" é juízo INTEGRADO do médico, considerando o conjunto de achados ecográficos + contexto clínico, e o diagnóstico definitivo requer histopatologia.

═══════════════════════════════════════════════════
TABELA COMPARATIVA (sinais ecográficos — referência, não gates)
═══════════════════════════════════════════════════

| Característica | Padrão NORMAL / REACIONAL | Padrão SUGESTIVO DE ATIPIA |
|---|---|---|
| Eixo curto (short-axis) | Tipicamente < 10 mm | Tipicamente ≥ 10 mm (referência sujeita a contexto clínico; nível II pode tolerar valores um pouco maiores) |
| Razão S/L (eixo curto / eixo longo) | Tipicamente < 0,5 (forma oval) | Tipicamente ≥ 0,5 (forma arredondada) |
| Hilo hiperecoico | Presente | Ausente ou apagado |
| Cortical | Fina, regular, uniforme | Espessada, assimétrica, ou hipoecoica focal |
| Ecogenicidade | Cortical hipoecoica + hilo hiperecoico | Difusamente hipoecoica, perda do hilo |
| Necrose central | Ausente | Presente (área anecoica/cística central) |
| Microcalcificações | Ausentes | Presentes (sugestivas de origem tireoidiana papilar ou metástase) |
| Padrão vascular Doppler | Hilar central | Periférico, capsular, ou caótico/aberrante |
| Forma | Oval, achatado | Arredondado, esférico |
| Contornos | Regulares, bem definidos | Irregulares; pode haver perda da margem capsular |

═══════════════════════════════════════════════════
USO DOS LIMIARES NUMÉRICOS — IMPORTANTE
═══════════════════════════════════════════════════

Os valores numéricos abaixo são REFERÊNCIA CONTEXTUAL para a interpretação clínica, NÃO gates rígidos de normalidade ou malignidade:

- Eixo curto: a maioria dos autores adota ~10 mm como referência para suspeição em níveis I, III-VI; a literatura permite até ~11 mm em nível II (drenagem de cabeça/pescoço) sem necessariamente indicar atipia. Acima desses valores, ATENÇÃO contextual — não rotulação automática.
- Razão S/L: ≥ 0,5 é um sinal sugestivo de atipia, NÃO um diagnóstico isolado.
- Supraclavicular (V-B): qualquer linfonodo nessa topografia merece atenção contextual independente do tamanho (sinal de Virchow clássico).

═══════════════════════════════════════════════════
COMO INTEGRAR OS SINAIS
═══════════════════════════════════════════════════

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa e correlação clínica):
- Microcalcificações intra-linfonodais.
- Necrose central.
- Vascularização periférica/aberrante ao Doppler.
- Perda da margem capsular sugestiva de extravasamento extracapsular.
- Perda completa do hilo associado a outros achados.

SINAIS COMPLEMENTARES (sozinhos têm baixa especificidade):
- Eixo curto aumentado.
- Forma arredondada (razão S/L elevada).
- Cortical espessada.
- Crescimento documentado em estudo prévio (mencionar apenas se houver comparativo).

REGRA: a integração desses achados é JUÍZO CLÍNICO do médico. Esta regra documenta os sinais; a conclusão final ("características reacionais" vs "características ecográficas suspeitas") segue o que o médico declarou nos achados.

═══════════════════════════════════════════════════
CONTEXTO CLÍNICO IMPORTANTE (referência — não usar como diagnóstico)
═══════════════════════════════════════════════════

- Tuberculose ganglionar pode mimetizar malignidade (necrose central, conglomerado).
- Doença linfoproliferativa (linfoma) pode apresentar linfonodos arredondados sem necrose.
- Pós-radioterapia ou pós-cirurgia: cortical pode estar espessada como sequela.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar como "metástase" ou "linfoma" sem dado histopatológico.
- Não estimar tamanho se médico não mediu.
- Não atribuir microcalcificações ou necrose sem menção explícita do médico.
- Não usar limiares numéricos (10 mm, 11 mm, S/L 0,5) como gates de normalidade ou malignidade — são referências contextuais que apoiam o juízo do médico.
- Não inventar regras de score (ex: "X sinais altamente sugestivos + Y sinais sugestivos = suspeição") — a integração é juízo clínico, não algoritmo fixo.
- Não citar limiares pediátricos, taxas de crescimento percentual ou espessura cortical específica sem fonte explícita citada pelo médico nos achados.
- Seguir as recomendações das conclusões (correlação clínica; exames laboratoriais; TC cervical ou biópsia por agulha fina quando aplicável). NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = 'c90e6293-22d3-49a9-9405-1a6d8be66c16' and status = 'validated' and md5(content) = 'dfd1bf0d407d734e12df6aa2f60aa113';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c90e6293-22d3-49a9-9405-1a6d8be66c16', n; end if;
  -- DOPPLER_ARTERIAL_MMII CLASSICO_COMPLETO modelo doppler-arterial-mmii-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$TEMPLATE-BASE DOPPLER ARTERIAL DE MEMBRO INFERIOR — UNIVERSAL (individualizar SEMPRE por membro)

REGRA CRÍTICA — LAUDOS SEPARADOS POR MEMBRO:
SEMPRE gerar laudo UNILATERAL. Se o médico informar dados de AMBOS os membros, gerar DOIS laudos COMPLETOS e SEPARADOS, na ordem informada. NUNCA agrupar num único laudo.

TÍTULO (individualizado): "ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO" (ou ESQUERDO).

EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA):

ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO

COMENTÁRIOS:
Estudo arterial realizado com transdutor linear de alta frequência, nas modalidades bidimensional, Doppler espectral, color e power Doppler. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artérias femoral comum, femoral, femoral profunda (porção proximal), poplítea, tibial anterior, tibial posterior e fibular pérvias, de trajeto e calibre preservados.
A análise espectral evidencia fluxo multifásico de alta resistência, com velocidades de pico sistólico normais e sem alargamento espectral em todos os vasos avaliados.
Ausência de placas ateromatosas ou espessamento parietal significativo nos segmentos avaliados.

CONCLUSÃO:
Estudo arterial do membro inferior direito sem alterações hemodinâmicas significativas ao método.

═══════════════════════════════════════════════════
CORPO (OS SEGUINTES ASPECTOS) — descrição por vaso
═══════════════════════════════════════════════════
Ordem anatômica: femoral comum → femoral (superficial; usar só "femoral") → femoral profunda (porção proximal) → poplítea → tronco tibiofibular → tibial anterior → tibial posterior → fibular → pediosa.
- Artéria normal: "pérvia, de trajeto e calibre preservados."
- Ateromatose difusa: "Notam-se espessamento parietal e imagens hiperecoicas/hipoecoicas aderidas às paredes arteriais (calcificações ateromatosas) nos segmentos avaliados."
- Placa sem estenose: "Artéria {nome} com placa ateromatosa {hiperecoica/heterogênea}, de superfície {regular/irregular}, sem repercussão hemodinâmica significativa."
- Estenose significativa: "Artéria {nome} com aceleração focal de fluxo, VPS de ___ cm/s, compatível com estenose de aproximadamente ___%."
- Oclusão: "Artéria {nome} sem fluxo detectável ao Doppler; segmentos distais perfundidos por circulação colateral."
- Velocidades/padrão espectral por vaso quando ditados — SEMPRE no CORPO; nunca repetir na conclusão.

═══════════════════════════════════════════════════
CONCLUSÃO — APENAS O RESUMO DIAGNÓSTICO (nunca repetir a descrição do corpo)
═══════════════════════════════════════════════════
- Normal: "Estudo arterial do membro inferior {lado} sem alterações hemodinâmicas significativas ao método."
- Ateromatose sem estenose: "Doença aterosclerótica difusa no membro inferior {lado}, sem estenoses hemodinamicamente significativas."
- Estenose: "Estenose de aproximadamente ___% da artéria {nome} do membro inferior {lado}."
- Oclusão: "Oclusão da artéria {nome} do membro inferior {lado}, com perfusão distal por circulação colateral."
- Item único → SEM numeração. Múltiplos → 1), 2)...
- NÃO incluir índice tornozelo-braquial (ITB) — não faz parte deste exame ultrassonográfico.

NÃO INVENTAR: não citar VPS/velocidades não informadas; não inferir estenose sem critério numérico; descrição (corpo) ≠ recomendação (só se solicitada).$c$, version = version + 1, updated_at = now()
   where id = '99790b80-7be6-4513-86e4-cf7fcf4cc83e' and status = 'validated' and md5(content) = '479251d58676e0dc49b935e5f1774e21';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '99790b80-7be6-4513-86e4-cf7fcf4cc83e', n; end if;
  -- DOPPLER_ARTERIAL_MMII DIRETO_OBJETIVO modelo doppler-arterial-mmii-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$TEMPLATE-BASE DOPPLER ARTERIAL DE MEMBRO INFERIOR — UNIVERSAL (individualizar SEMPRE por membro)

REGRA CRÍTICA — LAUDOS SEPARADOS POR MEMBRO:
SEMPRE gerar laudo UNILATERAL. Se o médico informar dados de AMBOS os membros, gerar DOIS laudos COMPLETOS e SEPARADOS, na ordem informada. NUNCA agrupar num único laudo.

TÍTULO (individualizado): "ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO" (ou ESQUERDO).

EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA):

ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO

COMENTÁRIOS:
Estudo arterial realizado com transdutor linear de alta frequência, nas modalidades bidimensional, Doppler espectral, color e power Doppler. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artérias femoral comum, femoral, femoral profunda (porção proximal), poplítea, tibial anterior, tibial posterior e fibular pérvias, de trajeto e calibre preservados.
A análise espectral evidencia fluxo multifásico de alta resistência, com velocidades de pico sistólico normais e sem alargamento espectral em todos os vasos avaliados.
Ausência de placas ateromatosas ou espessamento parietal significativo nos segmentos avaliados.

CONCLUSÃO:
Estudo arterial do membro inferior direito sem alterações hemodinâmicas significativas ao método.

═══════════════════════════════════════════════════
CORPO (OS SEGUINTES ASPECTOS) — descrição por vaso
═══════════════════════════════════════════════════
Ordem anatômica: femoral comum → femoral (superficial; usar só "femoral") → femoral profunda (porção proximal) → poplítea → tronco tibiofibular → tibial anterior → tibial posterior → fibular → pediosa.
- Artéria normal: "pérvia, de trajeto e calibre preservados."
- Ateromatose difusa: "Notam-se espessamento parietal e imagens hiperecoicas/hipoecoicas aderidas às paredes arteriais (calcificações ateromatosas) nos segmentos avaliados."
- Placa sem estenose: "Artéria {nome} com placa ateromatosa {hiperecoica/heterogênea}, de superfície {regular/irregular}, sem repercussão hemodinâmica significativa."
- Estenose significativa: "Artéria {nome} com aceleração focal de fluxo, VPS de ___ cm/s, compatível com estenose de aproximadamente ___%."
- Oclusão: "Artéria {nome} sem fluxo detectável ao Doppler; segmentos distais perfundidos por circulação colateral."
- Velocidades/padrão espectral por vaso quando ditados — SEMPRE no CORPO; nunca repetir na conclusão.

═══════════════════════════════════════════════════
CONCLUSÃO — APENAS O RESUMO DIAGNÓSTICO (nunca repetir a descrição do corpo)
═══════════════════════════════════════════════════
- Normal: "Estudo arterial do membro inferior {lado} sem alterações hemodinâmicas significativas ao método."
- Ateromatose sem estenose: "Doença aterosclerótica difusa no membro inferior {lado}, sem estenoses hemodinamicamente significativas."
- Estenose: "Estenose de aproximadamente ___% da artéria {nome} do membro inferior {lado}."
- Oclusão: "Oclusão da artéria {nome} do membro inferior {lado}, com perfusão distal por circulação colateral."
- Item único → SEM numeração. Múltiplos → 1), 2)...
- NÃO incluir índice tornozelo-braquial (ITB) — não faz parte deste exame ultrassonográfico.

NÃO INVENTAR: não citar VPS/velocidades não informadas; não inferir estenose sem critério numérico; descrição (corpo) ≠ recomendação (só se solicitada).$c$, version = version + 1, updated_at = now()
   where id = 'de38d57f-4542-4ce1-bb63-d1d952ac9687' and status = 'validated' and md5(content) = '479251d58676e0dc49b935e5f1774e21';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'de38d57f-4542-4ce1-bb63-d1d952ac9687', n; end if;
  -- DOPPLER_ARTERIAL_MMII DETALHADO_PROTOCOLAR modelo doppler-arterial-mmii-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$TEMPLATE-BASE DOPPLER ARTERIAL DE MEMBRO INFERIOR — UNIVERSAL (individualizar SEMPRE por membro)

REGRA CRÍTICA — LAUDOS SEPARADOS POR MEMBRO:
SEMPRE gerar laudo UNILATERAL. Se o médico informar dados de AMBOS os membros, gerar DOIS laudos COMPLETOS e SEPARADOS, na ordem informada. NUNCA agrupar num único laudo.

TÍTULO (individualizado): "ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO" (ou ESQUERDO).

EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA):

ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO

COMENTÁRIOS:
Estudo arterial realizado com transdutor linear de alta frequência, nas modalidades bidimensional, Doppler espectral, color e power Doppler. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artérias femoral comum, femoral, femoral profunda (porção proximal), poplítea, tibial anterior, tibial posterior e fibular pérvias, de trajeto e calibre preservados.
A análise espectral evidencia fluxo multifásico de alta resistência, com velocidades de pico sistólico normais e sem alargamento espectral em todos os vasos avaliados.
Ausência de placas ateromatosas ou espessamento parietal significativo nos segmentos avaliados.

CONCLUSÃO:
Estudo arterial do membro inferior direito sem alterações hemodinâmicas significativas ao método.

═══════════════════════════════════════════════════
CORPO (OS SEGUINTES ASPECTOS) — descrição por vaso
═══════════════════════════════════════════════════
Ordem anatômica: femoral comum → femoral (superficial; usar só "femoral") → femoral profunda (porção proximal) → poplítea → tronco tibiofibular → tibial anterior → tibial posterior → fibular → pediosa.
- Artéria normal: "pérvia, de trajeto e calibre preservados."
- Ateromatose difusa: "Notam-se espessamento parietal e imagens hiperecoicas/hipoecoicas aderidas às paredes arteriais (calcificações ateromatosas) nos segmentos avaliados."
- Placa sem estenose: "Artéria {nome} com placa ateromatosa {hiperecoica/heterogênea}, de superfície {regular/irregular}, sem repercussão hemodinâmica significativa."
- Estenose significativa: "Artéria {nome} com aceleração focal de fluxo, VPS de ___ cm/s, compatível com estenose de aproximadamente ___%."
- Oclusão: "Artéria {nome} sem fluxo detectável ao Doppler; segmentos distais perfundidos por circulação colateral."
- Velocidades/padrão espectral por vaso quando ditados — SEMPRE no CORPO; nunca repetir na conclusão.

═══════════════════════════════════════════════════
CONCLUSÃO — APENAS O RESUMO DIAGNÓSTICO (nunca repetir a descrição do corpo)
═══════════════════════════════════════════════════
- Normal: "Estudo arterial do membro inferior {lado} sem alterações hemodinâmicas significativas ao método."
- Ateromatose sem estenose: "Doença aterosclerótica difusa no membro inferior {lado}, sem estenoses hemodinamicamente significativas."
- Estenose: "Estenose de aproximadamente ___% da artéria {nome} do membro inferior {lado}."
- Oclusão: "Oclusão da artéria {nome} do membro inferior {lado}, com perfusão distal por circulação colateral."
- Item único → SEM numeração. Múltiplos → 1), 2)...
- NÃO incluir índice tornozelo-braquial (ITB) — não faz parte deste exame ultrassonográfico.

NÃO INVENTAR: não citar VPS/velocidades não informadas; não inferir estenose sem critério numérico; descrição (corpo) ≠ recomendação (só se solicitada).$c$, version = version + 1, updated_at = now()
   where id = '0c99b5bc-2348-4709-ad2f-cc2b2f333a39' and status = 'validated' and md5(content) = '479251d58676e0dc49b935e5f1774e21';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '0c99b5bc-2348-4709-ad2f-cc2b2f333a39', n; end if;
  -- DOPPLER_ARTERIAL_MMII OBJETIVO modelo doppler-arterial-mmii-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$TEMPLATE-BASE DOPPLER ARTERIAL DE MEMBRO INFERIOR — UNIVERSAL (individualizar SEMPRE por membro)

REGRA CRÍTICA — LAUDOS SEPARADOS POR MEMBRO:
SEMPRE gerar laudo UNILATERAL. Se o médico informar dados de AMBOS os membros, gerar DOIS laudos COMPLETOS e SEPARADOS, na ordem informada. NUNCA agrupar num único laudo.

TÍTULO (individualizado): "ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO" (ou ESQUERDO).

EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA):

ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR DIREITO

COMENTÁRIOS:
Estudo arterial realizado com transdutor linear de alta frequência, nas modalidades bidimensional, Doppler espectral, color e power Doppler. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Artérias femoral comum, femoral, femoral profunda (porção proximal), poplítea, tibial anterior, tibial posterior e fibular pérvias, de trajeto e calibre preservados.
A análise espectral evidencia fluxo multifásico de alta resistência, com velocidades de pico sistólico normais e sem alargamento espectral em todos os vasos avaliados.
Ausência de placas ateromatosas ou espessamento parietal significativo nos segmentos avaliados.

CONCLUSÃO:
Estudo arterial do membro inferior direito sem alterações hemodinâmicas significativas ao método.

═══════════════════════════════════════════════════
CORPO (OS SEGUINTES ASPECTOS) — descrição por vaso
═══════════════════════════════════════════════════
Ordem anatômica: femoral comum → femoral (superficial; usar só "femoral") → femoral profunda (porção proximal) → poplítea → tronco tibiofibular → tibial anterior → tibial posterior → fibular → pediosa.
- Artéria normal: "pérvia, de trajeto e calibre preservados."
- Ateromatose difusa: "Notam-se espessamento parietal e imagens hiperecoicas/hipoecoicas aderidas às paredes arteriais (calcificações ateromatosas) nos segmentos avaliados."
- Placa sem estenose: "Artéria {nome} com placa ateromatosa {hiperecoica/heterogênea}, de superfície {regular/irregular}, sem repercussão hemodinâmica significativa."
- Estenose significativa: "Artéria {nome} com aceleração focal de fluxo, VPS de ___ cm/s, compatível com estenose de aproximadamente ___%."
- Oclusão: "Artéria {nome} sem fluxo detectável ao Doppler; segmentos distais perfundidos por circulação colateral."
- Velocidades/padrão espectral por vaso quando ditados — SEMPRE no CORPO; nunca repetir na conclusão.

═══════════════════════════════════════════════════
CONCLUSÃO — APENAS O RESUMO DIAGNÓSTICO (nunca repetir a descrição do corpo)
═══════════════════════════════════════════════════
- Normal: "Estudo arterial do membro inferior {lado} sem alterações hemodinâmicas significativas ao método."
- Ateromatose sem estenose: "Doença aterosclerótica difusa no membro inferior {lado}, sem estenoses hemodinamicamente significativas."
- Estenose: "Estenose de aproximadamente ___% da artéria {nome} do membro inferior {lado}."
- Oclusão: "Oclusão da artéria {nome} do membro inferior {lado}, com perfusão distal por circulação colateral."
- Item único → SEM numeração. Múltiplos → 1), 2)...
- NÃO incluir índice tornozelo-braquial (ITB) — não faz parte deste exame ultrassonográfico.

NÃO INVENTAR: não citar VPS/velocidades não informadas; não inferir estenose sem critério numérico; descrição (corpo) ≠ recomendação (só se solicitada).$c$, version = version + 1, updated_at = now()
   where id = '2e986417-2285-4087-9e52-1fb2cdff9f36' and status = 'validated' and md5(content) = '479251d58676e0dc49b935e5f1774e21';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2e986417-2285-4087-9e52-1fb2cdff9f36', n; end if;
  -- DOPPLER_FISTULA_AV CLASSICO_COMPLETO regra doppler-fistula-av-regra-trombose-fistula: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- trombose
- ausência de fluxo
- fístula ocluída

REGRA — TROMBOSE DA FÍSTULA

No corpo:
"Ausência de fluxo ao Doppler no segmento ___, com material hiperecoico endoluminal."

Na conclusão:
"Trombose da fístula arteriovenosa."$c$, version = version + 1, updated_at = now()
   where id = '71ff48a9-ac17-46d8-8445-a4be3fd253aa' and status = 'validated' and md5(content) = '37ab01299140d854d1459dfa4d2a409a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '71ff48a9-ac17-46d8-8445-a4be3fd253aa', n; end if;
  -- DOPPLER_FISTULA_AV DIRETO_OBJETIVO regra doppler-fistula-av-regra-trombose-fistula: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- trombose
- ausência de fluxo
- fístula ocluída

REGRA — TROMBOSE DA FÍSTULA

No corpo:
"Ausência de fluxo ao Doppler no segmento ___, com material hiperecoico endoluminal."

Na conclusão:
"Trombose da fístula arteriovenosa."$c$, version = version + 1, updated_at = now()
   where id = '92c35549-8fcb-4120-88db-349d054f86ec' and status = 'validated' and md5(content) = '37ab01299140d854d1459dfa4d2a409a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '92c35549-8fcb-4120-88db-349d054f86ec', n; end if;
  -- DOPPLER_FISTULA_AV DETALHADO_PROTOCOLAR regra doppler-fistula-av-regra-trombose-fistula: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- trombose
- ausência de fluxo
- fístula ocluída

REGRA — TROMBOSE DA FÍSTULA

No corpo:
"Ausência de fluxo ao Doppler no segmento ___, com material hiperecoico endoluminal."

Na conclusão:
"Trombose da fístula arteriovenosa."$c$, version = version + 1, updated_at = now()
   where id = 'd88cd6bd-6d43-4d3f-96bb-4eebfdc108b3' and status = 'validated' and md5(content) = '37ab01299140d854d1459dfa4d2a409a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'd88cd6bd-6d43-4d3f-96bb-4eebfdc108b3', n; end if;
  -- DOPPLER_FISTULA_AV OBJETIVO regra doppler-fistula-av-regra-trombose-fistula: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- trombose
- ausência de fluxo
- fístula ocluída

REGRA — TROMBOSE DA FÍSTULA

No corpo:
"Ausência de fluxo ao Doppler no segmento ___, com material hiperecoico endoluminal."

Na conclusão:
"Trombose da fístula arteriovenosa."$c$, version = version + 1, updated_at = now()
   where id = '14050ae2-a435-443c-acdc-dfb604d54a04' and status = 'validated' and md5(content) = '37ab01299140d854d1459dfa4d2a409a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '14050ae2-a435-443c-acdc-dfb604d54a04', n; end if;
  -- DOPPLER_VENOSO_MMII CLASSICO_COMPLETO conclusao doppler-venoso-mmii-conclusao-tvp-aguda: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: HIPOECOGÊNICO → HIPOECOICO · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP aguda", "trombose aguda", "trombose recente", "trombo hipoecoico", "trombo agudo", "veia distendida com trombo", "primeiro episódio de TVP", "TVP proximal aguda".

CONCLUSÃO — TROMBOSE VENOSA PROFUNDA AGUDA / RECENTE

REQUISITO OBRIGATÓRIO — só rotular como AGUDA quando houver critérios POSITIVOS de cronologia recente:
- Material trombótico HIPOECOICO (não organizado).
- Distensão venosa marcada (calibre AUMENTADO vs contralateral / vs segmento adjacente).
- Parede venosa FINA (não espessada).
- Ausência de colaterais varicosas crônicas no segmento.
- Quadro clínico de início recente mencionado pelo médico (dor, edema agudo, sinais sistêmicos).

Se a idade do trombo NÃO estiver clara nos achados (sem cronologia clínica E sem critérios positivos de agudização), usar o bloco "tvp-idade-indeterminada" em vez deste — descrever trombose sem datar.

Estrutura quando critérios de TVP aguda são atendidos:

"X) Sinais ecográficos de trombose venosa profunda aguda em membro inferior [DIREITO/ESQUERDO/BILATERAL], envolvendo [listar segmentos: ex: veia femoral comum, femoral e poplítea]. Veia não compressível ao toque do transdutor, com material trombótico hipoecoico intraluminal, distensão venosa, parede venosa fina e ausência de fluxo espontâneo — achados compatíveis com evento agudo/recente. [Topografia: trombose proximal, envolvendo veias femoral, ilíaca ou poplítea / trombose distal isolada, envolvendo apenas tibiais ou fibulares.] O diagnóstico mais provável é trombose venosa profunda aguda."

RECOMENDAÇÃO:
"X) Convém, com caráter de urgência, avaliação médica para definição de conduta terapêutica, conforme protocolo clínico do médico assistente."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular trombo como agudo apenas por incompressibilidade ou pela palavra "TVP" no ditado — exigir critérios positivos de agudização listados acima.
- Não estimar dia/semana específico de evolução da TVP — apenas categorizar (agudo / idade indeterminada / crônico recanalizado).
- Não prescrever conduta terapêutica específica (anticoagulação plena, heparina, DOACs, filtro de veia cava etc) — usar apenas "avaliação médica urgente para definição de conduta".
- Não inferir risco de embolia pulmonar — clínica + Wells score + outros exames.

═══════════════════════════════════════════════════
DIFERENCIAR DE TVP CRÔNICA / SEQUELA
═══════════════════════════════════════════════════

Características de cronicidade (NÃO é aguda):
- Parede venosa espessada/hiperecoica.
- Recanalização parcial (fluxo internalizado).
- Material trombótico hiperecoico organizado.
- Circulação colateral evidente.

Se quadro misto: usar regra "tvp-cronica-recanalizada" (excecao).$c$, version = version + 1, updated_at = now()
   where id = '7792a490-dc1f-49a3-9e18-8aeab05db2e1' and status = 'validated' and md5(content) = '0aed2b0f9324ed82e9415e4f2e9f7bee';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7792a490-dc1f-49a3-9e18-8aeab05db2e1', n; end if;
  -- DOPPLER_VENOSO_MMII DIRETO_OBJETIVO conclusao doppler-venoso-mmii-conclusao-tvp-aguda: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: HIPOECOGÊNICO → HIPOECOICO · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP aguda", "trombose aguda", "trombose recente", "trombo hipoecoico", "trombo agudo", "veia distendida com trombo", "primeiro episódio de TVP", "TVP proximal aguda".

CONCLUSÃO — TROMBOSE VENOSA PROFUNDA AGUDA / RECENTE

REQUISITO OBRIGATÓRIO — só rotular como AGUDA quando houver critérios POSITIVOS de cronologia recente:
- Material trombótico HIPOECOICO (não organizado).
- Distensão venosa marcada (calibre AUMENTADO vs contralateral / vs segmento adjacente).
- Parede venosa FINA (não espessada).
- Ausência de colaterais varicosas crônicas no segmento.
- Quadro clínico de início recente mencionado pelo médico (dor, edema agudo, sinais sistêmicos).

Se a idade do trombo NÃO estiver clara nos achados (sem cronologia clínica E sem critérios positivos de agudização), usar o bloco "tvp-idade-indeterminada" em vez deste — descrever trombose sem datar.

Estrutura quando critérios de TVP aguda são atendidos:

"X) Sinais ecográficos de trombose venosa profunda aguda em membro inferior [DIREITO/ESQUERDO/BILATERAL], envolvendo [listar segmentos: ex: veia femoral comum, femoral e poplítea]. Veia não compressível ao toque do transdutor, com material trombótico hipoecoico intraluminal, distensão venosa, parede venosa fina e ausência de fluxo espontâneo — achados compatíveis com evento agudo/recente. [Topografia: trombose proximal, envolvendo veias femoral, ilíaca ou poplítea / trombose distal isolada, envolvendo apenas tibiais ou fibulares.] O diagnóstico mais provável é trombose venosa profunda aguda."

RECOMENDAÇÃO:
"X) Convém, com caráter de urgência, avaliação médica para definição de conduta terapêutica, conforme protocolo clínico do médico assistente."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular trombo como agudo apenas por incompressibilidade ou pela palavra "TVP" no ditado — exigir critérios positivos de agudização listados acima.
- Não estimar dia/semana específico de evolução da TVP — apenas categorizar (agudo / idade indeterminada / crônico recanalizado).
- Não prescrever conduta terapêutica específica (anticoagulação plena, heparina, DOACs, filtro de veia cava etc) — usar apenas "avaliação médica urgente para definição de conduta".
- Não inferir risco de embolia pulmonar — clínica + Wells score + outros exames.

═══════════════════════════════════════════════════
DIFERENCIAR DE TVP CRÔNICA / SEQUELA
═══════════════════════════════════════════════════

Características de cronicidade (NÃO é aguda):
- Parede venosa espessada/hiperecoica.
- Recanalização parcial (fluxo internalizado).
- Material trombótico hiperecoico organizado.
- Circulação colateral evidente.

Se quadro misto: usar regra "tvp-cronica-recanalizada" (excecao).$c$, version = version + 1, updated_at = now()
   where id = '21a9b705-04e2-4afa-ac7e-ace787d609cd' and status = 'validated' and md5(content) = '0aed2b0f9324ed82e9415e4f2e9f7bee';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '21a9b705-04e2-4afa-ac7e-ace787d609cd', n; end if;
  -- DOPPLER_VENOSO_MMII DETALHADO_PROTOCOLAR conclusao doppler-venoso-mmii-conclusao-tvp-aguda: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: HIPOECOGÊNICO → HIPOECOICO · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP aguda", "trombose aguda", "trombose recente", "trombo hipoecoico", "trombo agudo", "veia distendida com trombo", "primeiro episódio de TVP", "TVP proximal aguda".

CONCLUSÃO — TROMBOSE VENOSA PROFUNDA AGUDA / RECENTE

REQUISITO OBRIGATÓRIO — só rotular como AGUDA quando houver critérios POSITIVOS de cronologia recente:
- Material trombótico HIPOECOICO (não organizado).
- Distensão venosa marcada (calibre AUMENTADO vs contralateral / vs segmento adjacente).
- Parede venosa FINA (não espessada).
- Ausência de colaterais varicosas crônicas no segmento.
- Quadro clínico de início recente mencionado pelo médico (dor, edema agudo, sinais sistêmicos).

Se a idade do trombo NÃO estiver clara nos achados (sem cronologia clínica E sem critérios positivos de agudização), usar o bloco "tvp-idade-indeterminada" em vez deste — descrever trombose sem datar.

Estrutura quando critérios de TVP aguda são atendidos:

"X) Sinais ecográficos de trombose venosa profunda aguda em membro inferior [DIREITO/ESQUERDO/BILATERAL], envolvendo [listar segmentos: ex: veia femoral comum, femoral e poplítea]. Veia não compressível ao toque do transdutor, com material trombótico hipoecoico intraluminal, distensão venosa, parede venosa fina e ausência de fluxo espontâneo — achados compatíveis com evento agudo/recente. [Topografia: trombose proximal, envolvendo veias femoral, ilíaca ou poplítea / trombose distal isolada, envolvendo apenas tibiais ou fibulares.] O diagnóstico mais provável é trombose venosa profunda aguda."

RECOMENDAÇÃO:
"X) Convém, com caráter de urgência, avaliação médica para definição de conduta terapêutica, conforme protocolo clínico do médico assistente."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular trombo como agudo apenas por incompressibilidade ou pela palavra "TVP" no ditado — exigir critérios positivos de agudização listados acima.
- Não estimar dia/semana específico de evolução da TVP — apenas categorizar (agudo / idade indeterminada / crônico recanalizado).
- Não prescrever conduta terapêutica específica (anticoagulação plena, heparina, DOACs, filtro de veia cava etc) — usar apenas "avaliação médica urgente para definição de conduta".
- Não inferir risco de embolia pulmonar — clínica + Wells score + outros exames.

═══════════════════════════════════════════════════
DIFERENCIAR DE TVP CRÔNICA / SEQUELA
═══════════════════════════════════════════════════

Características de cronicidade (NÃO é aguda):
- Parede venosa espessada/hiperecoica.
- Recanalização parcial (fluxo internalizado).
- Material trombótico hiperecoico organizado.
- Circulação colateral evidente.

Se quadro misto: usar regra "tvp-cronica-recanalizada" (excecao).$c$, version = version + 1, updated_at = now()
   where id = 'ac86936b-e34b-41d0-ad09-206cb04600f2' and status = 'validated' and md5(content) = '0aed2b0f9324ed82e9415e4f2e9f7bee';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'ac86936b-e34b-41d0-ad09-206cb04600f2', n; end if;
  -- DOPPLER_VENOSO_MMII OBJETIVO conclusao doppler-venoso-mmii-conclusao-tvp-aguda: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: HIPOECOGÊNICO → HIPOECOICO · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP aguda", "trombose aguda", "trombose recente", "trombo hipoecoico", "trombo agudo", "veia distendida com trombo", "primeiro episódio de TVP", "TVP proximal aguda".

CONCLUSÃO — TROMBOSE VENOSA PROFUNDA AGUDA / RECENTE

REQUISITO OBRIGATÓRIO — só rotular como AGUDA quando houver critérios POSITIVOS de cronologia recente:
- Material trombótico HIPOECOICO (não organizado).
- Distensão venosa marcada (calibre AUMENTADO vs contralateral / vs segmento adjacente).
- Parede venosa FINA (não espessada).
- Ausência de colaterais varicosas crônicas no segmento.
- Quadro clínico de início recente mencionado pelo médico (dor, edema agudo, sinais sistêmicos).

Se a idade do trombo NÃO estiver clara nos achados (sem cronologia clínica E sem critérios positivos de agudização), usar o bloco "tvp-idade-indeterminada" em vez deste — descrever trombose sem datar.

Estrutura quando critérios de TVP aguda são atendidos:

"X) Sinais ecográficos de trombose venosa profunda aguda em membro inferior [DIREITO/ESQUERDO/BILATERAL], envolvendo [listar segmentos: ex: veia femoral comum, femoral e poplítea]. Veia não compressível ao toque do transdutor, com material trombótico hipoecoico intraluminal, distensão venosa, parede venosa fina e ausência de fluxo espontâneo — achados compatíveis com evento agudo/recente. [Topografia: trombose proximal, envolvendo veias femoral, ilíaca ou poplítea / trombose distal isolada, envolvendo apenas tibiais ou fibulares.] O diagnóstico mais provável é trombose venosa profunda aguda."

RECOMENDAÇÃO:
"X) Convém, com caráter de urgência, avaliação médica para definição de conduta terapêutica, conforme protocolo clínico do médico assistente."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular trombo como agudo apenas por incompressibilidade ou pela palavra "TVP" no ditado — exigir critérios positivos de agudização listados acima.
- Não estimar dia/semana específico de evolução da TVP — apenas categorizar (agudo / idade indeterminada / crônico recanalizado).
- Não prescrever conduta terapêutica específica (anticoagulação plena, heparina, DOACs, filtro de veia cava etc) — usar apenas "avaliação médica urgente para definição de conduta".
- Não inferir risco de embolia pulmonar — clínica + Wells score + outros exames.

═══════════════════════════════════════════════════
DIFERENCIAR DE TVP CRÔNICA / SEQUELA
═══════════════════════════════════════════════════

Características de cronicidade (NÃO é aguda):
- Parede venosa espessada/hiperecoica.
- Recanalização parcial (fluxo internalizado).
- Material trombótico hiperecoico organizado.
- Circulação colateral evidente.

Se quadro misto: usar regra "tvp-cronica-recanalizada" (excecao).$c$, version = version + 1, updated_at = now()
   where id = '3ad683a5-3282-49ff-85b7-a8a6693a12a0' and status = 'validated' and md5(content) = '0aed2b0f9324ed82e9415e4f2e9f7bee';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '3ad683a5-3282-49ff-85b7-a8a6693a12a0', n; end if;
  -- DOPPLER_VENOSO_MMII CLASSICO_COMPLETO excecao doppler-venoso-mmii-excecao-tvp-cronica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP crônica", "TVP antiga", "trombose antiga", "sequela de TVP", "recanalização", "trombose recanalizada", "veia recanalizada", "síndrome pós-trombótica", "SPT", "parede espessada", "circulação colateral".

EXCEÇÃO — SEQUELA DE TVP / TVP CRÔNICA RECANALIZADA

Diferenciar de TVP aguda (regra: tvp-aguda):

CARACTERÍSTICAS ECOGRÁFICAS DE CRONICIDADE:
- Parede venosa espessada/hiperecoica (em vez de fina).
- Recanalização parcial: fluxo internalizado entre material trombótico residual.
- Material trombótico hiperecoico (organizado) — diferentemente do hipoecoico agudo.
- Circulação colateral evidente.
- Calibre venoso reduzido (vs aumento agudo) OU normal.
- Compressibilidade parcial (pode ser comprimida com pressão maior).
- Refluxo associado (síndrome pós-trombótica).

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de TVP crônica/recanalizada em [segmento — ex: veia femoral direita], caracterizada por parede venosa espessada, recanalização parcial e circulação colateral evidente.

X) Refluxo associado em [SEGMENTO] (___ segundos), compatível com síndrome pós-trombótica.

X) Achados compatíveis com sequela de evento trombótico prévio. NÃO há sinais de novo episódio agudo nesta avaliação."

═══════════════════════════════════════════════════
ATENÇÃO — quadro misto agudo + crônico
═══════════════════════════════════════════════════

Pode coexistir TVP aguda SOBRE achados crônicos (re-trombose). Critérios:
- Material trombótico hipoecoico (novo) somado a parede já espessada.
- Distensão venosa parcial.
- Sintomatologia compatível.

NESTE CENÁRIO: descrever ambos os componentes (recente sobre crônico) na conclusão e sugerir "avaliação médica urgente para definição de conduta terapêutica" — NÃO prescrever anticoagulação ou qualquer terapêutica específica no laudo (conduta cabe ao médico assistente).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar tempo de evolução da TVP por Doppler.
- Não recomendar suspensão de anticoagulação — clínica decide.
- Não classificar SPT por Doppler isolado (Villalta score é clínico).$c$, version = version + 1, updated_at = now()
   where id = '330cc77c-8a47-4b31-a241-f496f8310978' and status = 'validated' and md5(content) = '6e0be6b2f77df5ffd4e313a3c50cee5a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '330cc77c-8a47-4b31-a241-f496f8310978', n; end if;
  -- DOPPLER_VENOSO_MMII DIRETO_OBJETIVO excecao doppler-venoso-mmii-excecao-tvp-cronica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP crônica", "TVP antiga", "trombose antiga", "sequela de TVP", "recanalização", "trombose recanalizada", "veia recanalizada", "síndrome pós-trombótica", "SPT", "parede espessada", "circulação colateral".

EXCEÇÃO — SEQUELA DE TVP / TVP CRÔNICA RECANALIZADA

Diferenciar de TVP aguda (regra: tvp-aguda):

CARACTERÍSTICAS ECOGRÁFICAS DE CRONICIDADE:
- Parede venosa espessada/hiperecoica (em vez de fina).
- Recanalização parcial: fluxo internalizado entre material trombótico residual.
- Material trombótico hiperecoico (organizado) — diferentemente do hipoecoico agudo.
- Circulação colateral evidente.
- Calibre venoso reduzido (vs aumento agudo) OU normal.
- Compressibilidade parcial (pode ser comprimida com pressão maior).
- Refluxo associado (síndrome pós-trombótica).

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de TVP crônica/recanalizada em [segmento — ex: veia femoral direita], caracterizada por parede venosa espessada, recanalização parcial e circulação colateral evidente.

X) Refluxo associado em [SEGMENTO] (___ segundos), compatível com síndrome pós-trombótica.

X) Achados compatíveis com sequela de evento trombótico prévio. NÃO há sinais de novo episódio agudo nesta avaliação."

═══════════════════════════════════════════════════
ATENÇÃO — quadro misto agudo + crônico
═══════════════════════════════════════════════════

Pode coexistir TVP aguda SOBRE achados crônicos (re-trombose). Critérios:
- Material trombótico hipoecoico (novo) somado a parede já espessada.
- Distensão venosa parcial.
- Sintomatologia compatível.

NESTE CENÁRIO: descrever ambos os componentes (recente sobre crônico) na conclusão e sugerir "avaliação médica urgente para definição de conduta terapêutica" — NÃO prescrever anticoagulação ou qualquer terapêutica específica no laudo (conduta cabe ao médico assistente).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar tempo de evolução da TVP por Doppler.
- Não recomendar suspensão de anticoagulação — clínica decide.
- Não classificar SPT por Doppler isolado (Villalta score é clínico).$c$, version = version + 1, updated_at = now()
   where id = 'b5cca0d1-327b-4fdc-93ba-4968b3a65280' and status = 'validated' and md5(content) = '6e0be6b2f77df5ffd4e313a3c50cee5a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'b5cca0d1-327b-4fdc-93ba-4968b3a65280', n; end if;
  -- DOPPLER_VENOSO_MMII DETALHADO_PROTOCOLAR excecao doppler-venoso-mmii-excecao-tvp-cronica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP crônica", "TVP antiga", "trombose antiga", "sequela de TVP", "recanalização", "trombose recanalizada", "veia recanalizada", "síndrome pós-trombótica", "SPT", "parede espessada", "circulação colateral".

EXCEÇÃO — SEQUELA DE TVP / TVP CRÔNICA RECANALIZADA

Diferenciar de TVP aguda (regra: tvp-aguda):

CARACTERÍSTICAS ECOGRÁFICAS DE CRONICIDADE:
- Parede venosa espessada/hiperecoica (em vez de fina).
- Recanalização parcial: fluxo internalizado entre material trombótico residual.
- Material trombótico hiperecoico (organizado) — diferentemente do hipoecoico agudo.
- Circulação colateral evidente.
- Calibre venoso reduzido (vs aumento agudo) OU normal.
- Compressibilidade parcial (pode ser comprimida com pressão maior).
- Refluxo associado (síndrome pós-trombótica).

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de TVP crônica/recanalizada em [segmento — ex: veia femoral direita], caracterizada por parede venosa espessada, recanalização parcial e circulação colateral evidente.

X) Refluxo associado em [SEGMENTO] (___ segundos), compatível com síndrome pós-trombótica.

X) Achados compatíveis com sequela de evento trombótico prévio. NÃO há sinais de novo episódio agudo nesta avaliação."

═══════════════════════════════════════════════════
ATENÇÃO — quadro misto agudo + crônico
═══════════════════════════════════════════════════

Pode coexistir TVP aguda SOBRE achados crônicos (re-trombose). Critérios:
- Material trombótico hipoecoico (novo) somado a parede já espessada.
- Distensão venosa parcial.
- Sintomatologia compatível.

NESTE CENÁRIO: descrever ambos os componentes (recente sobre crônico) na conclusão e sugerir "avaliação médica urgente para definição de conduta terapêutica" — NÃO prescrever anticoagulação ou qualquer terapêutica específica no laudo (conduta cabe ao médico assistente).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar tempo de evolução da TVP por Doppler.
- Não recomendar suspensão de anticoagulação — clínica decide.
- Não classificar SPT por Doppler isolado (Villalta score é clínico).$c$, version = version + 1, updated_at = now()
   where id = 'e5a7a65b-d4ae-447d-a530-b47d22ba40f3' and status = 'validated' and md5(content) = '6e0be6b2f77df5ffd4e313a3c50cee5a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'e5a7a65b-d4ae-447d-a530-b47d22ba40f3', n; end if;
  -- DOPPLER_VENOSO_MMII OBJETIVO excecao doppler-venoso-mmii-excecao-tvp-cronica: ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP crônica", "TVP antiga", "trombose antiga", "sequela de TVP", "recanalização", "trombose recanalizada", "veia recanalizada", "síndrome pós-trombótica", "SPT", "parede espessada", "circulação colateral".

EXCEÇÃO — SEQUELA DE TVP / TVP CRÔNICA RECANALIZADA

Diferenciar de TVP aguda (regra: tvp-aguda):

CARACTERÍSTICAS ECOGRÁFICAS DE CRONICIDADE:
- Parede venosa espessada/hiperecoica (em vez de fina).
- Recanalização parcial: fluxo internalizado entre material trombótico residual.
- Material trombótico hiperecoico (organizado) — diferentemente do hipoecoico agudo.
- Circulação colateral evidente.
- Calibre venoso reduzido (vs aumento agudo) OU normal.
- Compressibilidade parcial (pode ser comprimida com pressão maior).
- Refluxo associado (síndrome pós-trombótica).

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de TVP crônica/recanalizada em [segmento — ex: veia femoral direita], caracterizada por parede venosa espessada, recanalização parcial e circulação colateral evidente.

X) Refluxo associado em [SEGMENTO] (___ segundos), compatível com síndrome pós-trombótica.

X) Achados compatíveis com sequela de evento trombótico prévio. NÃO há sinais de novo episódio agudo nesta avaliação."

═══════════════════════════════════════════════════
ATENÇÃO — quadro misto agudo + crônico
═══════════════════════════════════════════════════

Pode coexistir TVP aguda SOBRE achados crônicos (re-trombose). Critérios:
- Material trombótico hipoecoico (novo) somado a parede já espessada.
- Distensão venosa parcial.
- Sintomatologia compatível.

NESTE CENÁRIO: descrever ambos os componentes (recente sobre crônico) na conclusão e sugerir "avaliação médica urgente para definição de conduta terapêutica" — NÃO prescrever anticoagulação ou qualquer terapêutica específica no laudo (conduta cabe ao médico assistente).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar tempo de evolução da TVP por Doppler.
- Não recomendar suspensão de anticoagulação — clínica decide.
- Não classificar SPT por Doppler isolado (Villalta score é clínico).$c$, version = version + 1, updated_at = now()
   where id = '3dcf29ef-47a2-4674-8cca-6875d3fff49a' and status = 'validated' and md5(content) = '6e0be6b2f77df5ffd4e313a3c50cee5a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '3dcf29ef-47a2-4674-8cca-6875d3fff49a', n; end if;
  -- DOPPLER_VENOSO_MMII CLASSICO_COMPLETO excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP sem datar", "trombose sem idade definida", "ecogenicidade mista", "ecogenicidade indeterminada", "TVP achado isolado", "sem clínica de início recente", "incompressível sem cronologia", "exame de triagem", "achado incidental venoso", "exame de rastreio".

EXCEÇÃO — TROMBOSE VENOSA PROFUNDA DE IDADE INDETERMINADA

USE ESTE BLOCO QUANDO há sinais ecográficos de trombose (incompressibilidade + material trombótico intraluminal) MAS NÃO é possível classificar como aguda ou crônica recanalizada porque faltam critérios positivos de qualquer um dos extremos:

NÃO USA AGUDA quando faltam:
- Material hipoecoico claro.
- Distensão venosa marcada.
- Parede venosa fina.
- Quadro clínico de início recente documentado.

NÃO USA CRÔNICA RECANALIZADA quando faltam:
- Parede espessada/hiperecoica claramente.
- Recanalização parcial visível.
- Material hiperecoico organizado.
- Circulação colateral evidente.

Cenário típico: ecogenicidade do material trombótico é mista/intermediária, sem datação clínica disponível, exame de triagem em paciente assintomático, achado incidental.

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de trombose venosa profunda em [SEGMENTO — ex: veia femoral direita], caracterizada por incompressibilidade ao toque do transdutor e presença de material trombótico intraluminal, sem critérios ecográficos específicos para datação do evento (idade indeterminada nesta avaliação isolada).

X) Convém, a critério clínico, complementar com correlação de sintomatologia e exames prévios para estabelecer a cronologia do evento e orientar a definição de conduta pelo médico assistente."

═══════════════════════════════════════════════════
QUANDO USAR vs OUTROS BLOCOS DE TVP
═══════════════════════════════════════════════════

| Cenário | Bloco apropriado |
|---|---|
| Trombo hipoecoico + distensão + clínica aguda | tvp-aguda |
| Parede espessada + recanalização + colaterais | tvp-cronica-recanalizada |
| Trombo de cronologia incerta (ecogenicidade mista, sem clínica datada) | ESTE BLOCO |
| Trombo agudo SOBRE achados crônicos | tvp-cronica-recanalizada com observação de re-trombose |

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular como aguda nem como crônica sem critérios positivos.
- Não estimar dias/semanas de evolução.
- Não prescrever conduta — apenas correlação clínica.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = 'dcae3abd-59e7-4b29-bbde-f8379a4cf55d' and status = 'validated' and md5(content) = 'e659b21f24cdcf474edf8c89c09d0480';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'dcae3abd-59e7-4b29-bbde-f8379a4cf55d', n; end if;
  -- DOPPLER_VENOSO_MMII DIRETO_OBJETIVO excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP sem datar", "trombose sem idade definida", "ecogenicidade mista", "ecogenicidade indeterminada", "TVP achado isolado", "sem clínica de início recente", "incompressível sem cronologia", "exame de triagem", "achado incidental venoso", "exame de rastreio".

EXCEÇÃO — TROMBOSE VENOSA PROFUNDA DE IDADE INDETERMINADA

USE ESTE BLOCO QUANDO há sinais ecográficos de trombose (incompressibilidade + material trombótico intraluminal) MAS NÃO é possível classificar como aguda ou crônica recanalizada porque faltam critérios positivos de qualquer um dos extremos:

NÃO USA AGUDA quando faltam:
- Material hipoecoico claro.
- Distensão venosa marcada.
- Parede venosa fina.
- Quadro clínico de início recente documentado.

NÃO USA CRÔNICA RECANALIZADA quando faltam:
- Parede espessada/hiperecoica claramente.
- Recanalização parcial visível.
- Material hiperecoico organizado.
- Circulação colateral evidente.

Cenário típico: ecogenicidade do material trombótico é mista/intermediária, sem datação clínica disponível, exame de triagem em paciente assintomático, achado incidental.

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de trombose venosa profunda em [SEGMENTO — ex: veia femoral direita], caracterizada por incompressibilidade ao toque do transdutor e presença de material trombótico intraluminal, sem critérios ecográficos específicos para datação do evento (idade indeterminada nesta avaliação isolada).

X) Convém, a critério clínico, complementar com correlação de sintomatologia e exames prévios para estabelecer a cronologia do evento e orientar a definição de conduta pelo médico assistente."

═══════════════════════════════════════════════════
QUANDO USAR vs OUTROS BLOCOS DE TVP
═══════════════════════════════════════════════════

| Cenário | Bloco apropriado |
|---|---|
| Trombo hipoecoico + distensão + clínica aguda | tvp-aguda |
| Parede espessada + recanalização + colaterais | tvp-cronica-recanalizada |
| Trombo de cronologia incerta (ecogenicidade mista, sem clínica datada) | ESTE BLOCO |
| Trombo agudo SOBRE achados crônicos | tvp-cronica-recanalizada com observação de re-trombose |

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular como aguda nem como crônica sem critérios positivos.
- Não estimar dias/semanas de evolução.
- Não prescrever conduta — apenas correlação clínica.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = '2fe28a1c-4ffa-435f-9516-5f8055caba0d' and status = 'validated' and md5(content) = 'e659b21f24cdcf474edf8c89c09d0480';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2fe28a1c-4ffa-435f-9516-5f8055caba0d', n; end if;
  -- DOPPLER_VENOSO_MMII DETALHADO_PROTOCOLAR excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP sem datar", "trombose sem idade definida", "ecogenicidade mista", "ecogenicidade indeterminada", "TVP achado isolado", "sem clínica de início recente", "incompressível sem cronologia", "exame de triagem", "achado incidental venoso", "exame de rastreio".

EXCEÇÃO — TROMBOSE VENOSA PROFUNDA DE IDADE INDETERMINADA

USE ESTE BLOCO QUANDO há sinais ecográficos de trombose (incompressibilidade + material trombótico intraluminal) MAS NÃO é possível classificar como aguda ou crônica recanalizada porque faltam critérios positivos de qualquer um dos extremos:

NÃO USA AGUDA quando faltam:
- Material hipoecoico claro.
- Distensão venosa marcada.
- Parede venosa fina.
- Quadro clínico de início recente documentado.

NÃO USA CRÔNICA RECANALIZADA quando faltam:
- Parede espessada/hiperecoica claramente.
- Recanalização parcial visível.
- Material hiperecoico organizado.
- Circulação colateral evidente.

Cenário típico: ecogenicidade do material trombótico é mista/intermediária, sem datação clínica disponível, exame de triagem em paciente assintomático, achado incidental.

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de trombose venosa profunda em [SEGMENTO — ex: veia femoral direita], caracterizada por incompressibilidade ao toque do transdutor e presença de material trombótico intraluminal, sem critérios ecográficos específicos para datação do evento (idade indeterminada nesta avaliação isolada).

X) Convém, a critério clínico, complementar com correlação de sintomatologia e exames prévios para estabelecer a cronologia do evento e orientar a definição de conduta pelo médico assistente."

═══════════════════════════════════════════════════
QUANDO USAR vs OUTROS BLOCOS DE TVP
═══════════════════════════════════════════════════

| Cenário | Bloco apropriado |
|---|---|
| Trombo hipoecoico + distensão + clínica aguda | tvp-aguda |
| Parede espessada + recanalização + colaterais | tvp-cronica-recanalizada |
| Trombo de cronologia incerta (ecogenicidade mista, sem clínica datada) | ESTE BLOCO |
| Trombo agudo SOBRE achados crônicos | tvp-cronica-recanalizada com observação de re-trombose |

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular como aguda nem como crônica sem critérios positivos.
- Não estimar dias/semanas de evolução.
- Não prescrever conduta — apenas correlação clínica.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = 'd50b5afd-f8ab-4aa5-a7f8-7f44218e5b3d' and status = 'validated' and md5(content) = 'e659b21f24cdcf474edf8c89c09d0480';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'd50b5afd-f8ab-4aa5-a7f8-7f44218e5b3d', n; end if;
  -- DOPPLER_VENOSO_MMII OBJETIVO excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-para-ecoico: hiperecogênico → hiperecoico · ecogenico-para-ecoico: hipoecogênico → hipoecoico · ecogenico-sozinho: ecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "TVP sem datar", "trombose sem idade definida", "ecogenicidade mista", "ecogenicidade indeterminada", "TVP achado isolado", "sem clínica de início recente", "incompressível sem cronologia", "exame de triagem", "achado incidental venoso", "exame de rastreio".

EXCEÇÃO — TROMBOSE VENOSA PROFUNDA DE IDADE INDETERMINADA

USE ESTE BLOCO QUANDO há sinais ecográficos de trombose (incompressibilidade + material trombótico intraluminal) MAS NÃO é possível classificar como aguda ou crônica recanalizada porque faltam critérios positivos de qualquer um dos extremos:

NÃO USA AGUDA quando faltam:
- Material hipoecoico claro.
- Distensão venosa marcada.
- Parede venosa fina.
- Quadro clínico de início recente documentado.

NÃO USA CRÔNICA RECANALIZADA quando faltam:
- Parede espessada/hiperecoica claramente.
- Recanalização parcial visível.
- Material hiperecoico organizado.
- Circulação colateral evidente.

Cenário típico: ecogenicidade do material trombótico é mista/intermediária, sem datação clínica disponível, exame de triagem em paciente assintomático, achado incidental.

═══════════════════════════════════════════════════
CONCLUSÃO — frase verbatim
═══════════════════════════════════════════════════

"X) Sinais ecográficos de trombose venosa profunda em [SEGMENTO — ex: veia femoral direita], caracterizada por incompressibilidade ao toque do transdutor e presença de material trombótico intraluminal, sem critérios ecográficos específicos para datação do evento (idade indeterminada nesta avaliação isolada).

X) Convém, a critério clínico, complementar com correlação de sintomatologia e exames prévios para estabelecer a cronologia do evento e orientar a definição de conduta pelo médico assistente."

═══════════════════════════════════════════════════
QUANDO USAR vs OUTROS BLOCOS DE TVP
═══════════════════════════════════════════════════

| Cenário | Bloco apropriado |
|---|---|
| Trombo hipoecoico + distensão + clínica aguda | tvp-aguda |
| Parede espessada + recanalização + colaterais | tvp-cronica-recanalizada |
| Trombo de cronologia incerta (ecogenicidade mista, sem clínica datada) | ESTE BLOCO |
| Trombo agudo SOBRE achados crônicos | tvp-cronica-recanalizada com observação de re-trombose |

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não rotular como aguda nem como crônica sem critérios positivos.
- Não estimar dias/semanas de evolução.
- Não prescrever conduta — apenas correlação clínica.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = '8ff638e3-a1e4-4c17-9d5f-963a5f221c2d' and status = 'validated' and md5(content) = 'e659b21f24cdcf474edf8c89c09d0480';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '8ff638e3-a1e4-4c17-9d5f-963a5f221c2d', n; end if;
  -- DOPPLER_VENOSO_MMII CLASSICO_COMPLETO frase doppler-venoso-mmii-frase-achados-descritivos: ecogenico-sozinho: ecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$ACHADOS DESCRITIVOS NO CORPO (semiótica pura — sem diagnóstico):

Safena insuficiente:
- Safena magna incompetente: "Veia safena magna com refluxo patológico à manobra de Valsalva."
- Safena parva incompetente: "Veia safena parva com refluxo patológico."
- Refluxo segmentar: "Refluxo segmentar na veia safena magna [na coxa / na perna]."
- Refluxo segmentar parva: "Presença de refluxo segmentar nas veias safenas magna e parva bilateralmente."

Perfurantes:
- Normal: "Não identificadas veias perfurantes insuficientes, apenas de drenagem."
- Insuficiente: "Identificada veia perfurante insuficiente [localização informada]."

Tributárias:
- Insuficiente: "Identificada veia tributária da safena magna insuficiente à cerca de ___ cm plantar."

Varicosidades:
- "Presença de varicosidades."

Trombose (sistema profundo):
- Incompressível: "Veia [nome] apresentando-se incompressível, com material hiperecoico intraluminal e ausência de fluxo ao Doppler colorido."
- Parcialmente compressível: "Veia [nome] com compressibilidade parcial, com material hiperecoico intraluminal e fluxo reduzido ao Doppler colorido."
- Recanalização: "Veia [nome] com espessamento parietal e recanalização parcial, com fluxo presente ao Doppler colorido."

CLASSIFICAÇÕES CLÍNICAS (incluir na conclusão quando informadas pelo usuário):
- CEAP: C0 a C6 (ex: "Varizes do tipo C2" ou "Alterações compatíveis com classificação C4a").
- Síndrome pós-trombótica: escala de Villalta quando informada.
NUNCA calcular classificações — apenas reproduzir conforme informado pelo usuário.$c$, version = version + 1, updated_at = now()
   where id = 'f1108c96-b03d-432a-a1f1-164c44836a82' and status = 'validated' and md5(content) = 'd9f432909b3e1a226c5fb532cf17e2b9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'f1108c96-b03d-432a-a1f1-164c44836a82', n; end if;
  -- DOPPLER_VENOSO_MMII DIRETO_OBJETIVO frase doppler-venoso-mmii-frase-achados-descritivos: ecogenico-sozinho: ecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$ACHADOS DESCRITIVOS NO CORPO (semiótica pura — sem diagnóstico):

Safena insuficiente:
- Safena magna incompetente: "Veia safena magna com refluxo patológico à manobra de Valsalva."
- Safena parva incompetente: "Veia safena parva com refluxo patológico."
- Refluxo segmentar: "Refluxo segmentar na veia safena magna [na coxa / na perna]."
- Refluxo segmentar parva: "Presença de refluxo segmentar nas veias safenas magna e parva bilateralmente."

Perfurantes:
- Normal: "Não identificadas veias perfurantes insuficientes, apenas de drenagem."
- Insuficiente: "Identificada veia perfurante insuficiente [localização informada]."

Tributárias:
- Insuficiente: "Identificada veia tributária da safena magna insuficiente à cerca de ___ cm plantar."

Varicosidades:
- "Presença de varicosidades."

Trombose (sistema profundo):
- Incompressível: "Veia [nome] apresentando-se incompressível, com material hiperecoico intraluminal e ausência de fluxo ao Doppler colorido."
- Parcialmente compressível: "Veia [nome] com compressibilidade parcial, com material hiperecoico intraluminal e fluxo reduzido ao Doppler colorido."
- Recanalização: "Veia [nome] com espessamento parietal e recanalização parcial, com fluxo presente ao Doppler colorido."

CLASSIFICAÇÕES CLÍNICAS (incluir na conclusão quando informadas pelo usuário):
- CEAP: C0 a C6 (ex: "Varizes do tipo C2" ou "Alterações compatíveis com classificação C4a").
- Síndrome pós-trombótica: escala de Villalta quando informada.
NUNCA calcular classificações — apenas reproduzir conforme informado pelo usuário.$c$, version = version + 1, updated_at = now()
   where id = 'b8a1713c-de6e-4cb3-846f-bd787402faa5' and status = 'validated' and md5(content) = 'd9f432909b3e1a226c5fb532cf17e2b9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'b8a1713c-de6e-4cb3-846f-bd787402faa5', n; end if;
  -- DOPPLER_VENOSO_MMII DETALHADO_PROTOCOLAR frase doppler-venoso-mmii-frase-achados-descritivos: ecogenico-sozinho: ecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$ACHADOS DESCRITIVOS NO CORPO (semiótica pura — sem diagnóstico):

Safena insuficiente:
- Safena magna incompetente: "Veia safena magna com refluxo patológico à manobra de Valsalva."
- Safena parva incompetente: "Veia safena parva com refluxo patológico."
- Refluxo segmentar: "Refluxo segmentar na veia safena magna [na coxa / na perna]."
- Refluxo segmentar parva: "Presença de refluxo segmentar nas veias safenas magna e parva bilateralmente."

Perfurantes:
- Normal: "Não identificadas veias perfurantes insuficientes, apenas de drenagem."
- Insuficiente: "Identificada veia perfurante insuficiente [localização informada]."

Tributárias:
- Insuficiente: "Identificada veia tributária da safena magna insuficiente à cerca de ___ cm plantar."

Varicosidades:
- "Presença de varicosidades."

Trombose (sistema profundo):
- Incompressível: "Veia [nome] apresentando-se incompressível, com material hiperecoico intraluminal e ausência de fluxo ao Doppler colorido."
- Parcialmente compressível: "Veia [nome] com compressibilidade parcial, com material hiperecoico intraluminal e fluxo reduzido ao Doppler colorido."
- Recanalização: "Veia [nome] com espessamento parietal e recanalização parcial, com fluxo presente ao Doppler colorido."

CLASSIFICAÇÕES CLÍNICAS (incluir na conclusão quando informadas pelo usuário):
- CEAP: C0 a C6 (ex: "Varizes do tipo C2" ou "Alterações compatíveis com classificação C4a").
- Síndrome pós-trombótica: escala de Villalta quando informada.
NUNCA calcular classificações — apenas reproduzir conforme informado pelo usuário.$c$, version = version + 1, updated_at = now()
   where id = 'f175163b-52d3-462c-a410-a7e177a8cff2' and status = 'validated' and md5(content) = 'd9f432909b3e1a226c5fb532cf17e2b9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'f175163b-52d3-462c-a410-a7e177a8cff2', n; end if;
  -- DOPPLER_VENOSO_MMII OBJETIVO frase doppler-venoso-mmii-frase-achados-descritivos: ecogenico-sozinho: ecogênico → hiperecoico · ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$ACHADOS DESCRITIVOS NO CORPO (semiótica pura — sem diagnóstico):

Safena insuficiente:
- Safena magna incompetente: "Veia safena magna com refluxo patológico à manobra de Valsalva."
- Safena parva incompetente: "Veia safena parva com refluxo patológico."
- Refluxo segmentar: "Refluxo segmentar na veia safena magna [na coxa / na perna]."
- Refluxo segmentar parva: "Presença de refluxo segmentar nas veias safenas magna e parva bilateralmente."

Perfurantes:
- Normal: "Não identificadas veias perfurantes insuficientes, apenas de drenagem."
- Insuficiente: "Identificada veia perfurante insuficiente [localização informada]."

Tributárias:
- Insuficiente: "Identificada veia tributária da safena magna insuficiente à cerca de ___ cm plantar."

Varicosidades:
- "Presença de varicosidades."

Trombose (sistema profundo):
- Incompressível: "Veia [nome] apresentando-se incompressível, com material hiperecoico intraluminal e ausência de fluxo ao Doppler colorido."
- Parcialmente compressível: "Veia [nome] com compressibilidade parcial, com material hiperecoico intraluminal e fluxo reduzido ao Doppler colorido."
- Recanalização: "Veia [nome] com espessamento parietal e recanalização parcial, com fluxo presente ao Doppler colorido."

CLASSIFICAÇÕES CLÍNICAS (incluir na conclusão quando informadas pelo usuário):
- CEAP: C0 a C6 (ex: "Varizes do tipo C2" ou "Alterações compatíveis com classificação C4a").
- Síndrome pós-trombótica: escala de Villalta quando informada.
NUNCA calcular classificações — apenas reproduzir conforme informado pelo usuário.$c$, version = version + 1, updated_at = now()
   where id = 'f3722049-7a03-4f55-b23a-395ed7201158' and status = 'validated' and md5(content) = 'd9f432909b3e1a226c5fb532cf17e2b9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'f3722049-7a03-4f55-b23a-395ed7201158', n; end if;
  -- ESCROTAL CLASSICO_COMPLETO regra escrotal-regra-hidrocele: ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hidrocele
- coleção líquida na bolsa
- líquido perirenal
- líquido pericístico
- líquido entre as túnicas

REGRA — HIDROCELE

Coleção líquida anecoica entre os folhetos da túnica vaginal, envolvendo parcial ou totalmente o testículo.

Classificação por volume estimado:
- Pequena: lâmina líquida discreta.
- Moderada: envolve >50% da circunferência testicular.
- Volumosa: envolve toda a circunferência, com distensão da bolsa.

No corpo (hidrocele à direita, moderada):
"Imagens anecoicas entre os folhetes da túnica vaginal, envolvendo o testículo em sua maior parte, sem septações."

Na conclusão:
"Hidrocele à direita."

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita, sugerindo correlação clínica."$c$, version = version + 1, updated_at = now()
   where id = 'a6bf0cf8-ced5-4265-b769-e0afd3699371' and status = 'validated' and md5(content) = '219c6c9998dd4f10a9b6ce5ffb1b5eca';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'a6bf0cf8-ced5-4265-b769-e0afd3699371', n; end if;
  -- ESCROTAL DIRETO_OBJETIVO regra escrotal-regra-hidrocele: ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hidrocele
- coleção líquida na bolsa
- líquido perirenal
- líquido pericístico
- líquido entre as túnicas

REGRA — HIDROCELE

Coleção líquida anecoica entre os folhetos da túnica vaginal, envolvendo parcial ou totalmente o testículo.

Classificação por volume estimado:
- Pequena: lâmina líquida discreta.
- Moderada: envolve >50% da circunferência testicular.
- Volumosa: envolve toda a circunferência, com distensão da bolsa.

No corpo (hidrocele à direita, moderada):
"Imagens anecoicas entre os folhetes da túnica vaginal, envolvendo o testículo em sua maior parte, sem septações."

Na conclusão:
"Hidrocele à direita."

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita, sugerindo correlação clínica."$c$, version = version + 1, updated_at = now()
   where id = '6546bd02-25ad-4913-aaf9-11da4d90cf19' and status = 'validated' and md5(content) = '219c6c9998dd4f10a9b6ce5ffb1b5eca';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '6546bd02-25ad-4913-aaf9-11da4d90cf19', n; end if;
  -- ESCROTAL DETALHADO_PROTOCOLAR regra escrotal-regra-hidrocele: ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hidrocele
- coleção líquida na bolsa
- líquido perirenal
- líquido pericístico
- líquido entre as túnicas

REGRA — HIDROCELE

Coleção líquida anecoica entre os folhetos da túnica vaginal, envolvendo parcial ou totalmente o testículo.

Classificação por volume estimado:
- Pequena: lâmina líquida discreta.
- Moderada: envolve >50% da circunferência testicular.
- Volumosa: envolve toda a circunferência, com distensão da bolsa.

No corpo (hidrocele à direita, moderada):
"Imagens anecoicas entre os folhetes da túnica vaginal, envolvendo o testículo em sua maior parte, sem septações."

Na conclusão:
"Hidrocele à direita."

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita, sugerindo correlação clínica."$c$, version = version + 1, updated_at = now()
   where id = '9b4544d0-4881-4524-904a-622cb7d287ad' and status = 'validated' and md5(content) = '219c6c9998dd4f10a9b6ce5ffb1b5eca';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '9b4544d0-4881-4524-904a-622cb7d287ad', n; end if;
  -- ESCROTAL OBJETIVO regra escrotal-regra-hidrocele: ecogenico-sozinho: ecogênicos → hiperecoicos
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hidrocele
- coleção líquida na bolsa
- líquido perirenal
- líquido pericístico
- líquido entre as túnicas

REGRA — HIDROCELE

Coleção líquida anecoica entre os folhetos da túnica vaginal, envolvendo parcial ou totalmente o testículo.

Classificação por volume estimado:
- Pequena: lâmina líquida discreta.
- Moderada: envolve >50% da circunferência testicular.
- Volumosa: envolve toda a circunferência, com distensão da bolsa.

No corpo (hidrocele à direita, moderada):
"Imagens anecoicas entre os folhetes da túnica vaginal, envolvendo o testículo em sua maior parte, sem septações."

Na conclusão:
"Hidrocele à direita."

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita, sugerindo correlação clínica."$c$, version = version + 1, updated_at = now()
   where id = '8867d54c-a5b1-478c-b0e1-316151e30211' and status = 'validated' and md5(content) = '219c6c9998dd4f10a9b6ce5ffb1b5eca';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '8867d54c-a5b1-478c-b0e1-316151e30211', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO conclusao glandulas-salivares-conclusao-calculo-glandular: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialolitíase", "cálculo salivar", "cálculo parótida", "cálculo submandibular", "cálculo ductal", "cálculo de Stensen", "cálculo de Wharton", "litíase glandular", "dilatação ductal".

CONCLUSÃO — SIALOLITÍASE (CÁLCULO EM GLÂNDULA SALIVAR OU DUCTO)

═══════════════════════════════════════════════════
FATO EPIDEMIOLÓGICO (referência — não escrever no laudo)
═══════════════════════════════════════════════════

- 80-90% dos cálculos salivares localizam-se na SUBMANDIBULAR e seu ducto de Wharton.
- 5-15% na PARÓTIDA e ducto de Stensen.
- Composição predominante: oxalato + fosfato de cálcio (cálculos radiopacos).

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Cálculo intraductal isolado (sem inflamação ativa):
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [direita / esquerda], medindo ___ mm, com sombra acústica posterior, [sem / com] dilatação ductal a montante (calibre máximo de ___ mm). [Sem / Com] sinais ecográficos de processo inflamatório associado."

CENÁRIO 2 — Cálculo + sialoadenite obstrutiva:
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [lado], medindo ___ mm, associado a sinais de sialoadenite obstrutiva (glândula aumentada, ecotextura hipoecoica, hipervascularização, dilatação ductal de ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo e o processo obstrutivo associado."

CENÁRIO 3 — Múltiplos cálculos:
"X) Múltiplos cálculos em [ducto / corpo glandular de] glândula [salivar], o maior medindo ___ mm. Dilatação ductal segmentar com calibre máximo de ___ mm."

CENÁRIO 4 — Cálculo pequeno SEM sombra acústica clara:
"X) Imagem hiperecoica em [ducto / corpo glandular] medindo ___ mm, sem sombra acústica posterior definida, sugestiva de cálculo de pequenas dimensões. Convém, a critério clínico, complementar com sialotomografia ou sialorressonância para confirmação e melhor caracterização do cálculo."

═══════════════════════════════════════════════════
ATENÇÃO TÉCNICA
═══════════════════════════════════════════════════

- Cálculos < 2 mm podem NÃO gerar sombra acústica. Mencionar limitação se aplicável.
- Em casos de cálculo intraparenquimatoso (não ductal), declarar a localização especificamente.
- Sialorresonância ou TC sem contraste são complementares úteis quando US não identifica cálculo apesar de forte suspeita clínica.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar composição do cálculo (radiopaco/radiotransparente) — propriedade não acessível pelo US.
- Não recomendar tipo específico de procedimento (sialoendoscopia, litotripsia, exérese cirúrgica) — decisão clínica.
- Não declarar "ducto pérvio a jusante" sem confirmação ecográfica.
- Não estender achados a cálculos não-mencionados pelo médico.$c$, version = version + 1, updated_at = now()
   where id = '499876fd-8c83-44bb-b71c-31b596ab6482' and status = 'validated' and md5(content) = '0934df9f93719e8124da8b4bd3f8f9d1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '499876fd-8c83-44bb-b71c-31b596ab6482', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO conclusao glandulas-salivares-conclusao-calculo-glandular: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialolitíase", "cálculo salivar", "cálculo parótida", "cálculo submandibular", "cálculo ductal", "cálculo de Stensen", "cálculo de Wharton", "litíase glandular", "dilatação ductal".

CONCLUSÃO — SIALOLITÍASE (CÁLCULO EM GLÂNDULA SALIVAR OU DUCTO)

═══════════════════════════════════════════════════
FATO EPIDEMIOLÓGICO (referência — não escrever no laudo)
═══════════════════════════════════════════════════

- 80-90% dos cálculos salivares localizam-se na SUBMANDIBULAR e seu ducto de Wharton.
- 5-15% na PARÓTIDA e ducto de Stensen.
- Composição predominante: oxalato + fosfato de cálcio (cálculos radiopacos).

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Cálculo intraductal isolado (sem inflamação ativa):
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [direita / esquerda], medindo ___ mm, com sombra acústica posterior, [sem / com] dilatação ductal a montante (calibre máximo de ___ mm). [Sem / Com] sinais ecográficos de processo inflamatório associado."

CENÁRIO 2 — Cálculo + sialoadenite obstrutiva:
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [lado], medindo ___ mm, associado a sinais de sialoadenite obstrutiva (glândula aumentada, ecotextura hipoecoica, hipervascularização, dilatação ductal de ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo e o processo obstrutivo associado."

CENÁRIO 3 — Múltiplos cálculos:
"X) Múltiplos cálculos em [ducto / corpo glandular de] glândula [salivar], o maior medindo ___ mm. Dilatação ductal segmentar com calibre máximo de ___ mm."

CENÁRIO 4 — Cálculo pequeno SEM sombra acústica clara:
"X) Imagem hiperecoica em [ducto / corpo glandular] medindo ___ mm, sem sombra acústica posterior definida, sugestiva de cálculo de pequenas dimensões. Convém, a critério clínico, complementar com sialotomografia ou sialorressonância para confirmação e melhor caracterização do cálculo."

═══════════════════════════════════════════════════
ATENÇÃO TÉCNICA
═══════════════════════════════════════════════════

- Cálculos < 2 mm podem NÃO gerar sombra acústica. Mencionar limitação se aplicável.
- Em casos de cálculo intraparenquimatoso (não ductal), declarar a localização especificamente.
- Sialorresonância ou TC sem contraste são complementares úteis quando US não identifica cálculo apesar de forte suspeita clínica.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar composição do cálculo (radiopaco/radiotransparente) — propriedade não acessível pelo US.
- Não recomendar tipo específico de procedimento (sialoendoscopia, litotripsia, exérese cirúrgica) — decisão clínica.
- Não declarar "ducto pérvio a jusante" sem confirmação ecográfica.
- Não estender achados a cálculos não-mencionados pelo médico.$c$, version = version + 1, updated_at = now()
   where id = '7da620d3-8f57-4e11-b6d2-361d80e7585b' and status = 'validated' and md5(content) = '0934df9f93719e8124da8b4bd3f8f9d1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7da620d3-8f57-4e11-b6d2-361d80e7585b', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR conclusao glandulas-salivares-conclusao-calculo-glandular: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialolitíase", "cálculo salivar", "cálculo parótida", "cálculo submandibular", "cálculo ductal", "cálculo de Stensen", "cálculo de Wharton", "litíase glandular", "dilatação ductal".

CONCLUSÃO — SIALOLITÍASE (CÁLCULO EM GLÂNDULA SALIVAR OU DUCTO)

═══════════════════════════════════════════════════
FATO EPIDEMIOLÓGICO (referência — não escrever no laudo)
═══════════════════════════════════════════════════

- 80-90% dos cálculos salivares localizam-se na SUBMANDIBULAR e seu ducto de Wharton.
- 5-15% na PARÓTIDA e ducto de Stensen.
- Composição predominante: oxalato + fosfato de cálcio (cálculos radiopacos).

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Cálculo intraductal isolado (sem inflamação ativa):
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [direita / esquerda], medindo ___ mm, com sombra acústica posterior, [sem / com] dilatação ductal a montante (calibre máximo de ___ mm). [Sem / Com] sinais ecográficos de processo inflamatório associado."

CENÁRIO 2 — Cálculo + sialoadenite obstrutiva:
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [lado], medindo ___ mm, associado a sinais de sialoadenite obstrutiva (glândula aumentada, ecotextura hipoecoica, hipervascularização, dilatação ductal de ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo e o processo obstrutivo associado."

CENÁRIO 3 — Múltiplos cálculos:
"X) Múltiplos cálculos em [ducto / corpo glandular de] glândula [salivar], o maior medindo ___ mm. Dilatação ductal segmentar com calibre máximo de ___ mm."

CENÁRIO 4 — Cálculo pequeno SEM sombra acústica clara:
"X) Imagem hiperecoica em [ducto / corpo glandular] medindo ___ mm, sem sombra acústica posterior definida, sugestiva de cálculo de pequenas dimensões. Convém, a critério clínico, complementar com sialotomografia ou sialorressonância para confirmação e melhor caracterização do cálculo."

═══════════════════════════════════════════════════
ATENÇÃO TÉCNICA
═══════════════════════════════════════════════════

- Cálculos < 2 mm podem NÃO gerar sombra acústica. Mencionar limitação se aplicável.
- Em casos de cálculo intraparenquimatoso (não ductal), declarar a localização especificamente.
- Sialorresonância ou TC sem contraste são complementares úteis quando US não identifica cálculo apesar de forte suspeita clínica.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar composição do cálculo (radiopaco/radiotransparente) — propriedade não acessível pelo US.
- Não recomendar tipo específico de procedimento (sialoendoscopia, litotripsia, exérese cirúrgica) — decisão clínica.
- Não declarar "ducto pérvio a jusante" sem confirmação ecográfica.
- Não estender achados a cálculos não-mencionados pelo médico.$c$, version = version + 1, updated_at = now()
   where id = '4dc70408-3563-4d08-a208-fb60ecce14aa' and status = 'validated' and md5(content) = '0934df9f93719e8124da8b4bd3f8f9d1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '4dc70408-3563-4d08-a208-fb60ecce14aa', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO conclusao glandulas-salivares-conclusao-calculo-glandular: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialolitíase", "cálculo salivar", "cálculo parótida", "cálculo submandibular", "cálculo ductal", "cálculo de Stensen", "cálculo de Wharton", "litíase glandular", "dilatação ductal".

CONCLUSÃO — SIALOLITÍASE (CÁLCULO EM GLÂNDULA SALIVAR OU DUCTO)

═══════════════════════════════════════════════════
FATO EPIDEMIOLÓGICO (referência — não escrever no laudo)
═══════════════════════════════════════════════════

- 80-90% dos cálculos salivares localizam-se na SUBMANDIBULAR e seu ducto de Wharton.
- 5-15% na PARÓTIDA e ducto de Stensen.
- Composição predominante: oxalato + fosfato de cálcio (cálculos radiopacos).

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Cálculo intraductal isolado (sem inflamação ativa):
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [direita / esquerda], medindo ___ mm, com sombra acústica posterior, [sem / com] dilatação ductal a montante (calibre máximo de ___ mm). [Sem / Com] sinais ecográficos de processo inflamatório associado."

CENÁRIO 2 — Cálculo + sialoadenite obstrutiva:
"X) Cálculo no ducto de [Stensen / Wharton] de glândula [parótida / submandibular] [lado], medindo ___ mm, associado a sinais de sialoadenite obstrutiva (glândula aumentada, ecotextura hipoecoica, hipervascularização, dilatação ductal de ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo e o processo obstrutivo associado."

CENÁRIO 3 — Múltiplos cálculos:
"X) Múltiplos cálculos em [ducto / corpo glandular de] glândula [salivar], o maior medindo ___ mm. Dilatação ductal segmentar com calibre máximo de ___ mm."

CENÁRIO 4 — Cálculo pequeno SEM sombra acústica clara:
"X) Imagem hiperecoica em [ducto / corpo glandular] medindo ___ mm, sem sombra acústica posterior definida, sugestiva de cálculo de pequenas dimensões. Convém, a critério clínico, complementar com sialotomografia ou sialorressonância para confirmação e melhor caracterização do cálculo."

═══════════════════════════════════════════════════
ATENÇÃO TÉCNICA
═══════════════════════════════════════════════════

- Cálculos < 2 mm podem NÃO gerar sombra acústica. Mencionar limitação se aplicável.
- Em casos de cálculo intraparenquimatoso (não ductal), declarar a localização especificamente.
- Sialorresonância ou TC sem contraste são complementares úteis quando US não identifica cálculo apesar de forte suspeita clínica.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não estimar composição do cálculo (radiopaco/radiotransparente) — propriedade não acessível pelo US.
- Não recomendar tipo específico de procedimento (sialoendoscopia, litotripsia, exérese cirúrgica) — decisão clínica.
- Não declarar "ducto pérvio a jusante" sem confirmação ecográfica.
- Não estender achados a cálculos não-mencionados pelo médico.$c$, version = version + 1, updated_at = now()
   where id = 'c2970571-39ad-4034-b6a8-971715701a0d' and status = 'validated' and md5(content) = '0934df9f93719e8124da8b4bd3f8f9d1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c2970571-39ad-4034-b6a8-971715701a0d', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO conclusao glandulas-salivares-conclusao-exame-normal: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "glândulas salivares normais", "parótida normal", "submandibular normal", "salivares sem alteração", "exame salivares normal", "glândulas salivares preservadas".

CONCLUSÃO — ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES SEM ALTERAÇÕES

Use a frase verbatim quando todos os parâmetros estão dentro da normalidade:

"X) Glândulas parótidas e submandibulares com dimensões e ecotextura preservadas bilateralmente, sem evidência de nódulos, cálculos ou dilatação ductal."

═══════════════════════════════════════════════════
CRITÉRIOS PARA CONSIDERAR NORMAL
═══════════════════════════════════════════════════

PARÓTIDAS:
- AP entre 25-40 mm e longitudinal 50-70 mm bilateralmente (variável conforme biotipo).
- Ecotextura homogênea, isoecoica ou ligeiramente hiperecoica em relação ao músculo adjacente.
- Ducto de Stensen NÃO-visível ou < 1,5 mm.
- Ausência de nódulos, cistos ou áreas hipoecoicas focais.
- Ausência de cálculos.
- Vascularização parenquimatosa preservada e simétrica ao Doppler.

SUBMANDIBULARES:
- AP 15-25 mm e longitudinal 30-45 mm bilateralmente.
- Ecotextura homogênea.
- Ducto de Wharton NÃO-visível ou < 2 mm.
- Ausência de nódulos, cistos, cálculos.

═══════════════════════════════════════════════════
VARIAÇÕES ANATÔMICAS NORMAIS (não-patológicas)
═══════════════════════════════════════════════════

Quando médico identificar variações benignas, mencionar SEM rotular como achado patológico:

- Linfonodos INTRA-parotídeos (normais até ~5 mm): "Identificados pequenos linfonodos intra-parotídeos (até X mm), com características reacionais habituais nessa topografia."
- Hipertrofia gordurosa parotídea (envelhecimento normal): "Discreta hiperecogenicidade difusa do parênquima parotídeo bilateral, em padrão de envelhecimento fisiológico."

═══════════════════════════════════════════════════
NÃO INCLUIR ESTA CONCLUSÃO QUANDO HOUVER
═══════════════════════════════════════════════════

- Aumento volumétrico de qualquer glândula.
- Nódulo focal de qualquer dimensão.
- Cisto.
- Cálculo (sialolitíase).
- Dilatação ductal significativa.
- Heterogeneidade parenquimatosa difusa.
- Hipervascularização ao Doppler (suspeita de processo inflamatório).
- Edema periglandular.

═══════════════════════════════════════════════════
EXAME TECNICAMENTE LIMITADO
═══════════════════════════════════════════════════

Quando médico mencionou limitação técnica:
"X) Glândulas salivares avaliadas sem evidência de alteração ecográfica nas regiões adequadamente caracterizadas. Atenção: o lobo profundo da parótida é parcialmente inacessível ao US convencional [se aplicável: e, no presente exame, achados nessa topografia não puderam ser caracterizados]. Convém, a critério clínico, complementar com tomografia computadorizada ou ressonância magnética para avaliação do lobo profundo caso a suspeita clínica persista."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar "ausência de doença" — apenas "sem alterações ecográficas significativas".
- Não estender afirmação de normalidade ao lobo profundo da parótida sem qualificação.
- Não declarar normalidade plena se houve limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '43f0bce1-49b2-4c8b-9655-b8792105b934' and status = 'validated' and md5(content) = '1fea8a96fa5e81f296dd265e52f45f4b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '43f0bce1-49b2-4c8b-9655-b8792105b934', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO conclusao glandulas-salivares-conclusao-exame-normal: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "glândulas salivares normais", "parótida normal", "submandibular normal", "salivares sem alteração", "exame salivares normal", "glândulas salivares preservadas".

CONCLUSÃO — ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES SEM ALTERAÇÕES

Use a frase verbatim quando todos os parâmetros estão dentro da normalidade:

"X) Glândulas parótidas e submandibulares com dimensões e ecotextura preservadas bilateralmente, sem evidência de nódulos, cálculos ou dilatação ductal."

═══════════════════════════════════════════════════
CRITÉRIOS PARA CONSIDERAR NORMAL
═══════════════════════════════════════════════════

PARÓTIDAS:
- AP entre 25-40 mm e longitudinal 50-70 mm bilateralmente (variável conforme biotipo).
- Ecotextura homogênea, isoecoica ou ligeiramente hiperecoica em relação ao músculo adjacente.
- Ducto de Stensen NÃO-visível ou < 1,5 mm.
- Ausência de nódulos, cistos ou áreas hipoecoicas focais.
- Ausência de cálculos.
- Vascularização parenquimatosa preservada e simétrica ao Doppler.

SUBMANDIBULARES:
- AP 15-25 mm e longitudinal 30-45 mm bilateralmente.
- Ecotextura homogênea.
- Ducto de Wharton NÃO-visível ou < 2 mm.
- Ausência de nódulos, cistos, cálculos.

═══════════════════════════════════════════════════
VARIAÇÕES ANATÔMICAS NORMAIS (não-patológicas)
═══════════════════════════════════════════════════

Quando médico identificar variações benignas, mencionar SEM rotular como achado patológico:

- Linfonodos INTRA-parotídeos (normais até ~5 mm): "Identificados pequenos linfonodos intra-parotídeos (até X mm), com características reacionais habituais nessa topografia."
- Hipertrofia gordurosa parotídea (envelhecimento normal): "Discreta hiperecogenicidade difusa do parênquima parotídeo bilateral, em padrão de envelhecimento fisiológico."

═══════════════════════════════════════════════════
NÃO INCLUIR ESTA CONCLUSÃO QUANDO HOUVER
═══════════════════════════════════════════════════

- Aumento volumétrico de qualquer glândula.
- Nódulo focal de qualquer dimensão.
- Cisto.
- Cálculo (sialolitíase).
- Dilatação ductal significativa.
- Heterogeneidade parenquimatosa difusa.
- Hipervascularização ao Doppler (suspeita de processo inflamatório).
- Edema periglandular.

═══════════════════════════════════════════════════
EXAME TECNICAMENTE LIMITADO
═══════════════════════════════════════════════════

Quando médico mencionou limitação técnica:
"X) Glândulas salivares avaliadas sem evidência de alteração ecográfica nas regiões adequadamente caracterizadas. Atenção: o lobo profundo da parótida é parcialmente inacessível ao US convencional [se aplicável: e, no presente exame, achados nessa topografia não puderam ser caracterizados]. Convém, a critério clínico, complementar com tomografia computadorizada ou ressonância magnética para avaliação do lobo profundo caso a suspeita clínica persista."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar "ausência de doença" — apenas "sem alterações ecográficas significativas".
- Não estender afirmação de normalidade ao lobo profundo da parótida sem qualificação.
- Não declarar normalidade plena se houve limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '9988f5d4-9bf1-4d15-bb58-5bf9a78212f9' and status = 'validated' and md5(content) = '1fea8a96fa5e81f296dd265e52f45f4b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '9988f5d4-9bf1-4d15-bb58-5bf9a78212f9', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR conclusao glandulas-salivares-conclusao-exame-normal: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "glândulas salivares normais", "parótida normal", "submandibular normal", "salivares sem alteração", "exame salivares normal", "glândulas salivares preservadas".

CONCLUSÃO — ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES SEM ALTERAÇÕES

Use a frase verbatim quando todos os parâmetros estão dentro da normalidade:

"X) Glândulas parótidas e submandibulares com dimensões e ecotextura preservadas bilateralmente, sem evidência de nódulos, cálculos ou dilatação ductal."

═══════════════════════════════════════════════════
CRITÉRIOS PARA CONSIDERAR NORMAL
═══════════════════════════════════════════════════

PARÓTIDAS:
- AP entre 25-40 mm e longitudinal 50-70 mm bilateralmente (variável conforme biotipo).
- Ecotextura homogênea, isoecoica ou ligeiramente hiperecoica em relação ao músculo adjacente.
- Ducto de Stensen NÃO-visível ou < 1,5 mm.
- Ausência de nódulos, cistos ou áreas hipoecoicas focais.
- Ausência de cálculos.
- Vascularização parenquimatosa preservada e simétrica ao Doppler.

SUBMANDIBULARES:
- AP 15-25 mm e longitudinal 30-45 mm bilateralmente.
- Ecotextura homogênea.
- Ducto de Wharton NÃO-visível ou < 2 mm.
- Ausência de nódulos, cistos, cálculos.

═══════════════════════════════════════════════════
VARIAÇÕES ANATÔMICAS NORMAIS (não-patológicas)
═══════════════════════════════════════════════════

Quando médico identificar variações benignas, mencionar SEM rotular como achado patológico:

- Linfonodos INTRA-parotídeos (normais até ~5 mm): "Identificados pequenos linfonodos intra-parotídeos (até X mm), com características reacionais habituais nessa topografia."
- Hipertrofia gordurosa parotídea (envelhecimento normal): "Discreta hiperecogenicidade difusa do parênquima parotídeo bilateral, em padrão de envelhecimento fisiológico."

═══════════════════════════════════════════════════
NÃO INCLUIR ESTA CONCLUSÃO QUANDO HOUVER
═══════════════════════════════════════════════════

- Aumento volumétrico de qualquer glândula.
- Nódulo focal de qualquer dimensão.
- Cisto.
- Cálculo (sialolitíase).
- Dilatação ductal significativa.
- Heterogeneidade parenquimatosa difusa.
- Hipervascularização ao Doppler (suspeita de processo inflamatório).
- Edema periglandular.

═══════════════════════════════════════════════════
EXAME TECNICAMENTE LIMITADO
═══════════════════════════════════════════════════

Quando médico mencionou limitação técnica:
"X) Glândulas salivares avaliadas sem evidência de alteração ecográfica nas regiões adequadamente caracterizadas. Atenção: o lobo profundo da parótida é parcialmente inacessível ao US convencional [se aplicável: e, no presente exame, achados nessa topografia não puderam ser caracterizados]. Convém, a critério clínico, complementar com tomografia computadorizada ou ressonância magnética para avaliação do lobo profundo caso a suspeita clínica persista."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar "ausência de doença" — apenas "sem alterações ecográficas significativas".
- Não estender afirmação de normalidade ao lobo profundo da parótida sem qualificação.
- Não declarar normalidade plena se houve limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '0b3ff64c-68bb-4972-a110-97b9d6e419f0' and status = 'validated' and md5(content) = '1fea8a96fa5e81f296dd265e52f45f4b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '0b3ff64c-68bb-4972-a110-97b9d6e419f0', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO conclusao glandulas-salivares-conclusao-exame-normal: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "glândulas salivares normais", "parótida normal", "submandibular normal", "salivares sem alteração", "exame salivares normal", "glândulas salivares preservadas".

CONCLUSÃO — ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES SEM ALTERAÇÕES

Use a frase verbatim quando todos os parâmetros estão dentro da normalidade:

"X) Glândulas parótidas e submandibulares com dimensões e ecotextura preservadas bilateralmente, sem evidência de nódulos, cálculos ou dilatação ductal."

═══════════════════════════════════════════════════
CRITÉRIOS PARA CONSIDERAR NORMAL
═══════════════════════════════════════════════════

PARÓTIDAS:
- AP entre 25-40 mm e longitudinal 50-70 mm bilateralmente (variável conforme biotipo).
- Ecotextura homogênea, isoecoica ou ligeiramente hiperecoica em relação ao músculo adjacente.
- Ducto de Stensen NÃO-visível ou < 1,5 mm.
- Ausência de nódulos, cistos ou áreas hipoecoicas focais.
- Ausência de cálculos.
- Vascularização parenquimatosa preservada e simétrica ao Doppler.

SUBMANDIBULARES:
- AP 15-25 mm e longitudinal 30-45 mm bilateralmente.
- Ecotextura homogênea.
- Ducto de Wharton NÃO-visível ou < 2 mm.
- Ausência de nódulos, cistos, cálculos.

═══════════════════════════════════════════════════
VARIAÇÕES ANATÔMICAS NORMAIS (não-patológicas)
═══════════════════════════════════════════════════

Quando médico identificar variações benignas, mencionar SEM rotular como achado patológico:

- Linfonodos INTRA-parotídeos (normais até ~5 mm): "Identificados pequenos linfonodos intra-parotídeos (até X mm), com características reacionais habituais nessa topografia."
- Hipertrofia gordurosa parotídea (envelhecimento normal): "Discreta hiperecogenicidade difusa do parênquima parotídeo bilateral, em padrão de envelhecimento fisiológico."

═══════════════════════════════════════════════════
NÃO INCLUIR ESTA CONCLUSÃO QUANDO HOUVER
═══════════════════════════════════════════════════

- Aumento volumétrico de qualquer glândula.
- Nódulo focal de qualquer dimensão.
- Cisto.
- Cálculo (sialolitíase).
- Dilatação ductal significativa.
- Heterogeneidade parenquimatosa difusa.
- Hipervascularização ao Doppler (suspeita de processo inflamatório).
- Edema periglandular.

═══════════════════════════════════════════════════
EXAME TECNICAMENTE LIMITADO
═══════════════════════════════════════════════════

Quando médico mencionou limitação técnica:
"X) Glândulas salivares avaliadas sem evidência de alteração ecográfica nas regiões adequadamente caracterizadas. Atenção: o lobo profundo da parótida é parcialmente inacessível ao US convencional [se aplicável: e, no presente exame, achados nessa topografia não puderam ser caracterizados]. Convém, a critério clínico, complementar com tomografia computadorizada ou ressonância magnética para avaliação do lobo profundo caso a suspeita clínica persista."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar "ausência de doença" — apenas "sem alterações ecográficas significativas".
- Não estender afirmação de normalidade ao lobo profundo da parótida sem qualificação.
- Não declarar normalidade plena se houve limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = 'bfe49392-27da-439d-b773-1d73439777a3' and status = 'validated' and md5(content) = '1fea8a96fa5e81f296dd265e52f45f4b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'bfe49392-27da-439d-b773-1d73439777a3', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO conclusao glandulas-salivares-conclusao-sialoadenite: ecogenico-para-ecoico: hiperecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialoadenite", "parotidite", "submandibulite", "inflamação glandular", "glândula aumentada hipoecoica", "hipervascularização glandular", "dor parótida", "edema periglandular".

CONCLUSÃO — SIALOADENITE (PROCESSO INFLAMATÓRIO DE GLÂNDULA SALIVAR)

Use esta conclusão quando o médico mencionou achados ecográficos compatíveis com inflamação glandular AGUDA ou CRÔNICA.

═══════════════════════════════════════════════════
CRITÉRIOS ECOGRÁFICOS DE SIALOADENITE
═══════════════════════════════════════════════════

SIALOADENITE AGUDA:
- Aumento volumétrico da glândula afetada (uni ou bilateral).
- Ecotextura HIPOECOICA difusa (edema parenquimatoso).
- HIPERVASCULARIZAÇÃO ao Doppler.
- Possível edema/heterogeneidade do tecido subcutâneo periglandular.
- Linfonodos reacionais peri-glandulares.
- Pode ou não haver dilatação ductal.

SIALOADENITE CRÔNICA (recorrente):
- Heterogeneidade parenquimatosa difusa.
- Múltiplas áreas hipoecoicas (pseudocísticas) — característica de Sjögren em estágios avançados.
- Dilatação ductal segmentar.
- Pode haver fibrose (áreas hiperecoicas).
- Calcificações intraductais ou parenquimatosas em casos crônicos.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Sialoadenite aguda unilateral:
"X) Sinais ecográficos de sialoadenite aguda em [parótida/submandibular] [direita/esquerda], caracterizada por aumento volumétrico (___ x ___ mm), ecotextura difusamente hipoecoica e hipervascularização ao Doppler. [Se aplicável: edema periglandular associado.]"

"X) Convém, a critério clínico, complementar com avaliação clínica dirigida para definição da etiologia (bacteriana, viral ou obstrutiva)."

CENÁRIO 2 — Sialoadenite obstrutiva por cálculo:
"X) Sinais de sialoadenite [aguda/crônica] em [glândula], associada a cálculo ductal [no ducto de Stensen / Wharton] medindo ___ mm, com dilatação ductal a montante (calibre ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo obstrutivo."

CENÁRIO 3 — Sialoadenite crônica (padrão heterogêneo difuso):
"X) Glândulas [parotídeas / submandibulares] com ecotextura heterogênea, apresentando múltiplas áreas hipoecoicas pseudocísticas difusamente distribuídas, com dimensões preservadas/reduzidas. Achados ecográficos compatíveis com sialoadenite crônica."

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica."

ATENÇÃO — quando incluir hipótese de Sjögren ou solicitar laboratoriais:
SOMENTE quando o médico mencionar EXPLICITAMENTE no contexto clínico (ex: queixa de xerostomia/xeroftalmia documentada, suspeita clínica prévia, paciente já em investigação reumatológica). Nestes casos, complementar a conclusão com:

"Considerando o contexto clínico de [SINTOMATOLOGIA REFERIDA / SUSPEITA CLÍNICA REFERIDA], os achados ecográficos podem estar relacionados a etiologia auto-imune. Convém, a critério clínico, complementar com avaliação reumatológica e exames laboratoriais para definição etiológica."

NÃO inferir Sjögren ou sugerir laboratoriais específicos (anti-Ro/SSA, anti-La/SSB) apenas com base no padrão ecográfico — outras etiologias (sialoadenite crônica não-autoimune, sequela de sialoadenite aguda recorrente, IgG4-related disease) podem ter padrão similar.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar etiologia ESPECÍFICA (parotidite por caxumba, bacteriana, Sjögren confirmado) sem dado clínico/laboratorial.
- Não prescrever antibiótico ou tratamento específico (decisão clínica).
- Não diferenciar inequivocamente Sjögren de outras sialoadenites crônicas pelo US isoladamente.
- Não atribuir grau "leve/moderada/grave" sem critério ecográfico claro.

═══════════════════════════════════════════════════
DIFERENCIAR DE
═══════════════════════════════════════════════════

- Tumor glandular: massa focal vs aumento difuso. Tumor não tem hipervascularização periglandular nem edema do subcutâneo.
- Linfadenopatia intra-parotídea: linfonodo identificado individualmente, não aumento difuso da glândula.
- Cisto glandular simples: lesão anecoica única, sem hipervascularização ou edema circundante.$c$, version = version + 1, updated_at = now()
   where id = '154b5289-57a5-4a5a-9bd8-43eca0ce233e' and status = 'validated' and md5(content) = '4e82e83cc8fc0732d61943a353951d36';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '154b5289-57a5-4a5a-9bd8-43eca0ce233e', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO conclusao glandulas-salivares-conclusao-sialoadenite: ecogenico-para-ecoico: hiperecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialoadenite", "parotidite", "submandibulite", "inflamação glandular", "glândula aumentada hipoecoica", "hipervascularização glandular", "dor parótida", "edema periglandular".

CONCLUSÃO — SIALOADENITE (PROCESSO INFLAMATÓRIO DE GLÂNDULA SALIVAR)

Use esta conclusão quando o médico mencionou achados ecográficos compatíveis com inflamação glandular AGUDA ou CRÔNICA.

═══════════════════════════════════════════════════
CRITÉRIOS ECOGRÁFICOS DE SIALOADENITE
═══════════════════════════════════════════════════

SIALOADENITE AGUDA:
- Aumento volumétrico da glândula afetada (uni ou bilateral).
- Ecotextura HIPOECOICA difusa (edema parenquimatoso).
- HIPERVASCULARIZAÇÃO ao Doppler.
- Possível edema/heterogeneidade do tecido subcutâneo periglandular.
- Linfonodos reacionais peri-glandulares.
- Pode ou não haver dilatação ductal.

SIALOADENITE CRÔNICA (recorrente):
- Heterogeneidade parenquimatosa difusa.
- Múltiplas áreas hipoecoicas (pseudocísticas) — característica de Sjögren em estágios avançados.
- Dilatação ductal segmentar.
- Pode haver fibrose (áreas hiperecoicas).
- Calcificações intraductais ou parenquimatosas em casos crônicos.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Sialoadenite aguda unilateral:
"X) Sinais ecográficos de sialoadenite aguda em [parótida/submandibular] [direita/esquerda], caracterizada por aumento volumétrico (___ x ___ mm), ecotextura difusamente hipoecoica e hipervascularização ao Doppler. [Se aplicável: edema periglandular associado.]"

"X) Convém, a critério clínico, complementar com avaliação clínica dirigida para definição da etiologia (bacteriana, viral ou obstrutiva)."

CENÁRIO 2 — Sialoadenite obstrutiva por cálculo:
"X) Sinais de sialoadenite [aguda/crônica] em [glândula], associada a cálculo ductal [no ducto de Stensen / Wharton] medindo ___ mm, com dilatação ductal a montante (calibre ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo obstrutivo."

CENÁRIO 3 — Sialoadenite crônica (padrão heterogêneo difuso):
"X) Glândulas [parotídeas / submandibulares] com ecotextura heterogênea, apresentando múltiplas áreas hipoecoicas pseudocísticas difusamente distribuídas, com dimensões preservadas/reduzidas. Achados ecográficos compatíveis com sialoadenite crônica."

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica."

ATENÇÃO — quando incluir hipótese de Sjögren ou solicitar laboratoriais:
SOMENTE quando o médico mencionar EXPLICITAMENTE no contexto clínico (ex: queixa de xerostomia/xeroftalmia documentada, suspeita clínica prévia, paciente já em investigação reumatológica). Nestes casos, complementar a conclusão com:

"Considerando o contexto clínico de [SINTOMATOLOGIA REFERIDA / SUSPEITA CLÍNICA REFERIDA], os achados ecográficos podem estar relacionados a etiologia auto-imune. Convém, a critério clínico, complementar com avaliação reumatológica e exames laboratoriais para definição etiológica."

NÃO inferir Sjögren ou sugerir laboratoriais específicos (anti-Ro/SSA, anti-La/SSB) apenas com base no padrão ecográfico — outras etiologias (sialoadenite crônica não-autoimune, sequela de sialoadenite aguda recorrente, IgG4-related disease) podem ter padrão similar.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar etiologia ESPECÍFICA (parotidite por caxumba, bacteriana, Sjögren confirmado) sem dado clínico/laboratorial.
- Não prescrever antibiótico ou tratamento específico (decisão clínica).
- Não diferenciar inequivocamente Sjögren de outras sialoadenites crônicas pelo US isoladamente.
- Não atribuir grau "leve/moderada/grave" sem critério ecográfico claro.

═══════════════════════════════════════════════════
DIFERENCIAR DE
═══════════════════════════════════════════════════

- Tumor glandular: massa focal vs aumento difuso. Tumor não tem hipervascularização periglandular nem edema do subcutâneo.
- Linfadenopatia intra-parotídea: linfonodo identificado individualmente, não aumento difuso da glândula.
- Cisto glandular simples: lesão anecoica única, sem hipervascularização ou edema circundante.$c$, version = version + 1, updated_at = now()
   where id = 'ca410a09-3942-4771-8229-ed8c7c9e45d3' and status = 'validated' and md5(content) = '4e82e83cc8fc0732d61943a353951d36';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'ca410a09-3942-4771-8229-ed8c7c9e45d3', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR conclusao glandulas-salivares-conclusao-sialoadenite: ecogenico-para-ecoico: hiperecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialoadenite", "parotidite", "submandibulite", "inflamação glandular", "glândula aumentada hipoecoica", "hipervascularização glandular", "dor parótida", "edema periglandular".

CONCLUSÃO — SIALOADENITE (PROCESSO INFLAMATÓRIO DE GLÂNDULA SALIVAR)

Use esta conclusão quando o médico mencionou achados ecográficos compatíveis com inflamação glandular AGUDA ou CRÔNICA.

═══════════════════════════════════════════════════
CRITÉRIOS ECOGRÁFICOS DE SIALOADENITE
═══════════════════════════════════════════════════

SIALOADENITE AGUDA:
- Aumento volumétrico da glândula afetada (uni ou bilateral).
- Ecotextura HIPOECOICA difusa (edema parenquimatoso).
- HIPERVASCULARIZAÇÃO ao Doppler.
- Possível edema/heterogeneidade do tecido subcutâneo periglandular.
- Linfonodos reacionais peri-glandulares.
- Pode ou não haver dilatação ductal.

SIALOADENITE CRÔNICA (recorrente):
- Heterogeneidade parenquimatosa difusa.
- Múltiplas áreas hipoecoicas (pseudocísticas) — característica de Sjögren em estágios avançados.
- Dilatação ductal segmentar.
- Pode haver fibrose (áreas hiperecoicas).
- Calcificações intraductais ou parenquimatosas em casos crônicos.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Sialoadenite aguda unilateral:
"X) Sinais ecográficos de sialoadenite aguda em [parótida/submandibular] [direita/esquerda], caracterizada por aumento volumétrico (___ x ___ mm), ecotextura difusamente hipoecoica e hipervascularização ao Doppler. [Se aplicável: edema periglandular associado.]"

"X) Convém, a critério clínico, complementar com avaliação clínica dirigida para definição da etiologia (bacteriana, viral ou obstrutiva)."

CENÁRIO 2 — Sialoadenite obstrutiva por cálculo:
"X) Sinais de sialoadenite [aguda/crônica] em [glândula], associada a cálculo ductal [no ducto de Stensen / Wharton] medindo ___ mm, com dilatação ductal a montante (calibre ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo obstrutivo."

CENÁRIO 3 — Sialoadenite crônica (padrão heterogêneo difuso):
"X) Glândulas [parotídeas / submandibulares] com ecotextura heterogênea, apresentando múltiplas áreas hipoecoicas pseudocísticas difusamente distribuídas, com dimensões preservadas/reduzidas. Achados ecográficos compatíveis com sialoadenite crônica."

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica."

ATENÇÃO — quando incluir hipótese de Sjögren ou solicitar laboratoriais:
SOMENTE quando o médico mencionar EXPLICITAMENTE no contexto clínico (ex: queixa de xerostomia/xeroftalmia documentada, suspeita clínica prévia, paciente já em investigação reumatológica). Nestes casos, complementar a conclusão com:

"Considerando o contexto clínico de [SINTOMATOLOGIA REFERIDA / SUSPEITA CLÍNICA REFERIDA], os achados ecográficos podem estar relacionados a etiologia auto-imune. Convém, a critério clínico, complementar com avaliação reumatológica e exames laboratoriais para definição etiológica."

NÃO inferir Sjögren ou sugerir laboratoriais específicos (anti-Ro/SSA, anti-La/SSB) apenas com base no padrão ecográfico — outras etiologias (sialoadenite crônica não-autoimune, sequela de sialoadenite aguda recorrente, IgG4-related disease) podem ter padrão similar.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar etiologia ESPECÍFICA (parotidite por caxumba, bacteriana, Sjögren confirmado) sem dado clínico/laboratorial.
- Não prescrever antibiótico ou tratamento específico (decisão clínica).
- Não diferenciar inequivocamente Sjögren de outras sialoadenites crônicas pelo US isoladamente.
- Não atribuir grau "leve/moderada/grave" sem critério ecográfico claro.

═══════════════════════════════════════════════════
DIFERENCIAR DE
═══════════════════════════════════════════════════

- Tumor glandular: massa focal vs aumento difuso. Tumor não tem hipervascularização periglandular nem edema do subcutâneo.
- Linfadenopatia intra-parotídea: linfonodo identificado individualmente, não aumento difuso da glândula.
- Cisto glandular simples: lesão anecoica única, sem hipervascularização ou edema circundante.$c$, version = version + 1, updated_at = now()
   where id = '1576f72a-c6e7-4497-84e0-899d0e3598a4' and status = 'validated' and md5(content) = '4e82e83cc8fc0732d61943a353951d36';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '1576f72a-c6e7-4497-84e0-899d0e3598a4', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO conclusao glandulas-salivares-conclusao-sialoadenite: ecogenico-para-ecoico: hiperecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "sialoadenite", "parotidite", "submandibulite", "inflamação glandular", "glândula aumentada hipoecoica", "hipervascularização glandular", "dor parótida", "edema periglandular".

CONCLUSÃO — SIALOADENITE (PROCESSO INFLAMATÓRIO DE GLÂNDULA SALIVAR)

Use esta conclusão quando o médico mencionou achados ecográficos compatíveis com inflamação glandular AGUDA ou CRÔNICA.

═══════════════════════════════════════════════════
CRITÉRIOS ECOGRÁFICOS DE SIALOADENITE
═══════════════════════════════════════════════════

SIALOADENITE AGUDA:
- Aumento volumétrico da glândula afetada (uni ou bilateral).
- Ecotextura HIPOECOICA difusa (edema parenquimatoso).
- HIPERVASCULARIZAÇÃO ao Doppler.
- Possível edema/heterogeneidade do tecido subcutâneo periglandular.
- Linfonodos reacionais peri-glandulares.
- Pode ou não haver dilatação ductal.

SIALOADENITE CRÔNICA (recorrente):
- Heterogeneidade parenquimatosa difusa.
- Múltiplas áreas hipoecoicas (pseudocísticas) — característica de Sjögren em estágios avançados.
- Dilatação ductal segmentar.
- Pode haver fibrose (áreas hiperecoicas).
- Calcificações intraductais ou parenquimatosas em casos crônicos.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Sialoadenite aguda unilateral:
"X) Sinais ecográficos de sialoadenite aguda em [parótida/submandibular] [direita/esquerda], caracterizada por aumento volumétrico (___ x ___ mm), ecotextura difusamente hipoecoica e hipervascularização ao Doppler. [Se aplicável: edema periglandular associado.]"

"X) Convém, a critério clínico, complementar com avaliação clínica dirigida para definição da etiologia (bacteriana, viral ou obstrutiva)."

CENÁRIO 2 — Sialoadenite obstrutiva por cálculo:
"X) Sinais de sialoadenite [aguda/crônica] em [glândula], associada a cálculo ductal [no ducto de Stensen / Wharton] medindo ___ mm, com dilatação ductal a montante (calibre ___ mm)."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo obstrutivo."

CENÁRIO 3 — Sialoadenite crônica (padrão heterogêneo difuso):
"X) Glândulas [parotídeas / submandibulares] com ecotextura heterogênea, apresentando múltiplas áreas hipoecoicas pseudocísticas difusamente distribuídas, com dimensões preservadas/reduzidas. Achados ecográficos compatíveis com sialoadenite crônica."

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica."

ATENÇÃO — quando incluir hipótese de Sjögren ou solicitar laboratoriais:
SOMENTE quando o médico mencionar EXPLICITAMENTE no contexto clínico (ex: queixa de xerostomia/xeroftalmia documentada, suspeita clínica prévia, paciente já em investigação reumatológica). Nestes casos, complementar a conclusão com:

"Considerando o contexto clínico de [SINTOMATOLOGIA REFERIDA / SUSPEITA CLÍNICA REFERIDA], os achados ecográficos podem estar relacionados a etiologia auto-imune. Convém, a critério clínico, complementar com avaliação reumatológica e exames laboratoriais para definição etiológica."

NÃO inferir Sjögren ou sugerir laboratoriais específicos (anti-Ro/SSA, anti-La/SSB) apenas com base no padrão ecográfico — outras etiologias (sialoadenite crônica não-autoimune, sequela de sialoadenite aguda recorrente, IgG4-related disease) podem ter padrão similar.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não afirmar etiologia ESPECÍFICA (parotidite por caxumba, bacteriana, Sjögren confirmado) sem dado clínico/laboratorial.
- Não prescrever antibiótico ou tratamento específico (decisão clínica).
- Não diferenciar inequivocamente Sjögren de outras sialoadenites crônicas pelo US isoladamente.
- Não atribuir grau "leve/moderada/grave" sem critério ecográfico claro.

═══════════════════════════════════════════════════
DIFERENCIAR DE
═══════════════════════════════════════════════════

- Tumor glandular: massa focal vs aumento difuso. Tumor não tem hipervascularização periglandular nem edema do subcutâneo.
- Linfadenopatia intra-parotídea: linfonodo identificado individualmente, não aumento difuso da glândula.
- Cisto glandular simples: lesão anecoica única, sem hipervascularização ou edema circundante.$c$, version = version + 1, updated_at = now()
   where id = 'c893fc4b-1c20-48e6-a82d-ee7fb26a8774' and status = 'validated' and md5(content) = '4e82e83cc8fc0732d61943a353951d36';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c893fc4b-1c20-48e6-a82d-ee7fb26a8774', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO modelo glandulas-salivares-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA do laudo; ajuste conforme o ditado):

ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz), em modos B e Doppler colorido, avaliando as glândulas parótidas e submandibulares bilateralmente. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Glândulas parótidas de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos, cálculos ou dilatação ductal.
Glândulas submandibulares de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos ou cálculos.
Ausência de linfonodomegalias intra ou peri-glandulares.

CONCLUSÃO:
Glândulas salivares maiores ecograficamente normais.

(Conclusão de item ÚNICO NÃO recebe numeração "1)". Com mais de um achado, numerar 1), 2)...)

TEMPLATE-BASE ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES — UNIVERSAL (sempre aplica nesta categoria)

TÍTULO: "ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES"

═══════════════════════════════════════════════════
ESCOPO DESTA CATEGORIA
═══════════════════════════════════════════════════

Esta categoria cobre estudo ultrassonográfico dirigido às glândulas salivares MAIORES:
- Glândula PARÓTIDA (lobo superficial + lobo profundo parcialmente visível).
- Glândula SUBMANDIBULAR (submaxilar).
- Glândula SUBLINGUAL (visualização parcial).

Categorias relacionadas (NÃO usar este modelo):
- Estudos dirigidos a linfonodos cervicais: usar CERVICAL.
- Estudos dirigidos a tireoide: usar TIREOIDE.
- Paratireoides: usar PARATIREOIDE.

═══════════════════════════════════════════════════
LIMITAÇÕES TÉCNICAS — DECLARAR HONESTAMENTE
═══════════════════════════════════════════════════

LIMITAÇÕES INERENTES DO US PARA SALIVARES:
- Lobo PROFUNDO da parótida (medial ao ramo da mandíbula) é PARCIALMENTE inacessível ao US convencional — sombras acústicas do ramo mandibular.
- Glândulas sublinguais têm visualização limitada por superposição com o assoalho da boca.
- Cálculos pequenos (<2 mm) podem não gerar sombra acústica e passar despercebidos.

Quando essas limitações forem relevantes ao caso, mencionar explicitamente na conclusão ou recomendar TC/RNM.

═══════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DO LAUDO
═══════════════════════════════════════════════════

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz) em modos B e Doppler colorido. Avaliadas as glândulas parótidas e submandibulares bilateralmente, com análise de tamanho, ecotextura parenquimatosa, ductos principais (Stensen para parótida; Wharton para submandibular), presença de cálculos, nódulos ou áreas de alteração focal, e padrão vascular. Avaliação parcial das glândulas sublinguais quando indicada.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
1. PARÓTIDA DIREITA: dimensões, ecotextura, ducto de Stensen, presença/ausência de nódulos, cálculos, vascularização.
2. PARÓTIDA ESQUERDA: idem.
3. SUBMANDIBULAR DIREITA: dimensões, ecotextura, ducto de Wharton, cálculos, nódulos.
4. SUBMANDIBULAR ESQUERDA: idem.
5. SUBLINGUAIS (quando avaliadas): observação.
6. LINFONODOS INTRA OU PERI-GLANDULARES: caracterização quando relevantes (referência cruzada com CERVICAL).

CONCLUSÃO:
Estruturada com numeração de itens (1, 2, 3...) refletindo apenas achados positivos relevantes.

═══════════════════════════════════════════════════
DIMENSÕES — REFERÊNCIAS APROXIMADAS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: as faixas abaixo são REFERÊNCIAS APROXIMADAS para apoiar a interpretação contextual, NÃO limites rígidos. O AIUM recomenda mensurar QUANDO APROPRIADO (especialmente em assimetria, suspeita de doença autoimune ou massas) — não é obrigatório medir todas as glândulas em todo exame.

PARÓTIDA NORMAL (adulto) — faixas típicas:
- AP (ântero-posterior): ~25-40 mm.
- Longitudinal: ~50-70 mm.
- Ecotextura: homogênea, hiperecoica em relação ao músculo esternocleidomastóideo adjacente (infiltração gordurosa aumenta a ecogenicidade com a idade).

SUBMANDIBULAR NORMAL (adulto) — faixas típicas:
- AP: ~15-25 mm.
- Longitudinal: ~30-45 mm.
- Ecotextura: homogênea, ligeiramente menos ecogênica que a parótida.

VARIABILIDADE: biotipo, idade, infiltração gordurosa fisiológica e técnica de medida influenciam significativamente os valores. Assimetria entre os lados, mais do que valores absolutos, é o sinal mais relevante.

DUCTOS NORMAIS:
- Stensen (parótida): geralmente NÃO visível em estado normal. Se visível, comumente < 1,5 mm.
- Wharton (submandibular): pode ser visível normalmente, comumente < 2 mm.

═══════════════════════════════════════════════════
INDICAÇÕES CLÍNICAS COMUNS
═══════════════════════════════════════════════════

- Tumefação parotídea ou submandibular palpável.
- Suspeita de cálculo (sialolitíase) — dor pós-prandial.
- Sialoadenite aguda/crônica.
- Nódulo salivar (Warthin, pleomórfico, mucoepidermoide).
- Síndrome de Sjögren — investigação inicial.
- Massa cervical de etiologia indeterminada.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não atribuir tipo histológico específico ("tumor de Warthin", "adenoma pleomórfico") sem critérios ecográficos correspondentes mencionados pelo médico.
- Não classificar como "benigno definitivo" — usar "achados sugestivos de natureza benigna" quando aplicável.
- Não recomendar conduta cirúrgica específica — sugerir avaliação por especialista (cirurgião buco-maxilo-facial ou cabeça/pescoço) quando aplicável.
- Não estender achados ao lobo profundo da parótida se não foi adequadamente avaliado — declarar limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '3e3cb366-3319-4d8b-8bb9-4850c4990d81' and status = 'validated' and md5(content) = '23a314eb4bce275166bc142980df3506';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '3e3cb366-3319-4d8b-8bb9-4850c4990d81', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO modelo glandulas-salivares-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA do laudo; ajuste conforme o ditado):

ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz), em modos B e Doppler colorido, avaliando as glândulas parótidas e submandibulares bilateralmente. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Glândulas parótidas de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos, cálculos ou dilatação ductal.
Glândulas submandibulares de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos ou cálculos.
Ausência de linfonodomegalias intra ou peri-glandulares.

CONCLUSÃO:
Glândulas salivares maiores ecograficamente normais.

(Conclusão de item ÚNICO NÃO recebe numeração "1)". Com mais de um achado, numerar 1), 2)...)

TEMPLATE-BASE ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES — UNIVERSAL (sempre aplica nesta categoria)

TÍTULO: "ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES"

═══════════════════════════════════════════════════
ESCOPO DESTA CATEGORIA
═══════════════════════════════════════════════════

Esta categoria cobre estudo ultrassonográfico dirigido às glândulas salivares MAIORES:
- Glândula PARÓTIDA (lobo superficial + lobo profundo parcialmente visível).
- Glândula SUBMANDIBULAR (submaxilar).
- Glândula SUBLINGUAL (visualização parcial).

Categorias relacionadas (NÃO usar este modelo):
- Estudos dirigidos a linfonodos cervicais: usar CERVICAL.
- Estudos dirigidos a tireoide: usar TIREOIDE.
- Paratireoides: usar PARATIREOIDE.

═══════════════════════════════════════════════════
LIMITAÇÕES TÉCNICAS — DECLARAR HONESTAMENTE
═══════════════════════════════════════════════════

LIMITAÇÕES INERENTES DO US PARA SALIVARES:
- Lobo PROFUNDO da parótida (medial ao ramo da mandíbula) é PARCIALMENTE inacessível ao US convencional — sombras acústicas do ramo mandibular.
- Glândulas sublinguais têm visualização limitada por superposição com o assoalho da boca.
- Cálculos pequenos (<2 mm) podem não gerar sombra acústica e passar despercebidos.

Quando essas limitações forem relevantes ao caso, mencionar explicitamente na conclusão ou recomendar TC/RNM.

═══════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DO LAUDO
═══════════════════════════════════════════════════

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz) em modos B e Doppler colorido. Avaliadas as glândulas parótidas e submandibulares bilateralmente, com análise de tamanho, ecotextura parenquimatosa, ductos principais (Stensen para parótida; Wharton para submandibular), presença de cálculos, nódulos ou áreas de alteração focal, e padrão vascular. Avaliação parcial das glândulas sublinguais quando indicada.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
1. PARÓTIDA DIREITA: dimensões, ecotextura, ducto de Stensen, presença/ausência de nódulos, cálculos, vascularização.
2. PARÓTIDA ESQUERDA: idem.
3. SUBMANDIBULAR DIREITA: dimensões, ecotextura, ducto de Wharton, cálculos, nódulos.
4. SUBMANDIBULAR ESQUERDA: idem.
5. SUBLINGUAIS (quando avaliadas): observação.
6. LINFONODOS INTRA OU PERI-GLANDULARES: caracterização quando relevantes (referência cruzada com CERVICAL).

CONCLUSÃO:
Estruturada com numeração de itens (1, 2, 3...) refletindo apenas achados positivos relevantes.

═══════════════════════════════════════════════════
DIMENSÕES — REFERÊNCIAS APROXIMADAS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: as faixas abaixo são REFERÊNCIAS APROXIMADAS para apoiar a interpretação contextual, NÃO limites rígidos. O AIUM recomenda mensurar QUANDO APROPRIADO (especialmente em assimetria, suspeita de doença autoimune ou massas) — não é obrigatório medir todas as glândulas em todo exame.

PARÓTIDA NORMAL (adulto) — faixas típicas:
- AP (ântero-posterior): ~25-40 mm.
- Longitudinal: ~50-70 mm.
- Ecotextura: homogênea, hiperecoica em relação ao músculo esternocleidomastóideo adjacente (infiltração gordurosa aumenta a ecogenicidade com a idade).

SUBMANDIBULAR NORMAL (adulto) — faixas típicas:
- AP: ~15-25 mm.
- Longitudinal: ~30-45 mm.
- Ecotextura: homogênea, ligeiramente menos ecogênica que a parótida.

VARIABILIDADE: biotipo, idade, infiltração gordurosa fisiológica e técnica de medida influenciam significativamente os valores. Assimetria entre os lados, mais do que valores absolutos, é o sinal mais relevante.

DUCTOS NORMAIS:
- Stensen (parótida): geralmente NÃO visível em estado normal. Se visível, comumente < 1,5 mm.
- Wharton (submandibular): pode ser visível normalmente, comumente < 2 mm.

═══════════════════════════════════════════════════
INDICAÇÕES CLÍNICAS COMUNS
═══════════════════════════════════════════════════

- Tumefação parotídea ou submandibular palpável.
- Suspeita de cálculo (sialolitíase) — dor pós-prandial.
- Sialoadenite aguda/crônica.
- Nódulo salivar (Warthin, pleomórfico, mucoepidermoide).
- Síndrome de Sjögren — investigação inicial.
- Massa cervical de etiologia indeterminada.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não atribuir tipo histológico específico ("tumor de Warthin", "adenoma pleomórfico") sem critérios ecográficos correspondentes mencionados pelo médico.
- Não classificar como "benigno definitivo" — usar "achados sugestivos de natureza benigna" quando aplicável.
- Não recomendar conduta cirúrgica específica — sugerir avaliação por especialista (cirurgião buco-maxilo-facial ou cabeça/pescoço) quando aplicável.
- Não estender achados ao lobo profundo da parótida se não foi adequadamente avaliado — declarar limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '3b169ce7-e9ae-4661-8eec-7036d9eff530' and status = 'validated' and md5(content) = '23a314eb4bce275166bc142980df3506';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '3b169ce7-e9ae-4661-8eec-7036d9eff530', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR modelo glandulas-salivares-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA do laudo; ajuste conforme o ditado):

ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz), em modos B e Doppler colorido, avaliando as glândulas parótidas e submandibulares bilateralmente. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Glândulas parótidas de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos, cálculos ou dilatação ductal.
Glândulas submandibulares de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos ou cálculos.
Ausência de linfonodomegalias intra ou peri-glandulares.

CONCLUSÃO:
Glândulas salivares maiores ecograficamente normais.

(Conclusão de item ÚNICO NÃO recebe numeração "1)". Com mais de um achado, numerar 1), 2)...)

TEMPLATE-BASE ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES — UNIVERSAL (sempre aplica nesta categoria)

TÍTULO: "ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES"

═══════════════════════════════════════════════════
ESCOPO DESTA CATEGORIA
═══════════════════════════════════════════════════

Esta categoria cobre estudo ultrassonográfico dirigido às glândulas salivares MAIORES:
- Glândula PARÓTIDA (lobo superficial + lobo profundo parcialmente visível).
- Glândula SUBMANDIBULAR (submaxilar).
- Glândula SUBLINGUAL (visualização parcial).

Categorias relacionadas (NÃO usar este modelo):
- Estudos dirigidos a linfonodos cervicais: usar CERVICAL.
- Estudos dirigidos a tireoide: usar TIREOIDE.
- Paratireoides: usar PARATIREOIDE.

═══════════════════════════════════════════════════
LIMITAÇÕES TÉCNICAS — DECLARAR HONESTAMENTE
═══════════════════════════════════════════════════

LIMITAÇÕES INERENTES DO US PARA SALIVARES:
- Lobo PROFUNDO da parótida (medial ao ramo da mandíbula) é PARCIALMENTE inacessível ao US convencional — sombras acústicas do ramo mandibular.
- Glândulas sublinguais têm visualização limitada por superposição com o assoalho da boca.
- Cálculos pequenos (<2 mm) podem não gerar sombra acústica e passar despercebidos.

Quando essas limitações forem relevantes ao caso, mencionar explicitamente na conclusão ou recomendar TC/RNM.

═══════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DO LAUDO
═══════════════════════════════════════════════════

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz) em modos B e Doppler colorido. Avaliadas as glândulas parótidas e submandibulares bilateralmente, com análise de tamanho, ecotextura parenquimatosa, ductos principais (Stensen para parótida; Wharton para submandibular), presença de cálculos, nódulos ou áreas de alteração focal, e padrão vascular. Avaliação parcial das glândulas sublinguais quando indicada.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
1. PARÓTIDA DIREITA: dimensões, ecotextura, ducto de Stensen, presença/ausência de nódulos, cálculos, vascularização.
2. PARÓTIDA ESQUERDA: idem.
3. SUBMANDIBULAR DIREITA: dimensões, ecotextura, ducto de Wharton, cálculos, nódulos.
4. SUBMANDIBULAR ESQUERDA: idem.
5. SUBLINGUAIS (quando avaliadas): observação.
6. LINFONODOS INTRA OU PERI-GLANDULARES: caracterização quando relevantes (referência cruzada com CERVICAL).

CONCLUSÃO:
Estruturada com numeração de itens (1, 2, 3...) refletindo apenas achados positivos relevantes.

═══════════════════════════════════════════════════
DIMENSÕES — REFERÊNCIAS APROXIMADAS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: as faixas abaixo são REFERÊNCIAS APROXIMADAS para apoiar a interpretação contextual, NÃO limites rígidos. O AIUM recomenda mensurar QUANDO APROPRIADO (especialmente em assimetria, suspeita de doença autoimune ou massas) — não é obrigatório medir todas as glândulas em todo exame.

PARÓTIDA NORMAL (adulto) — faixas típicas:
- AP (ântero-posterior): ~25-40 mm.
- Longitudinal: ~50-70 mm.
- Ecotextura: homogênea, hiperecoica em relação ao músculo esternocleidomastóideo adjacente (infiltração gordurosa aumenta a ecogenicidade com a idade).

SUBMANDIBULAR NORMAL (adulto) — faixas típicas:
- AP: ~15-25 mm.
- Longitudinal: ~30-45 mm.
- Ecotextura: homogênea, ligeiramente menos ecogênica que a parótida.

VARIABILIDADE: biotipo, idade, infiltração gordurosa fisiológica e técnica de medida influenciam significativamente os valores. Assimetria entre os lados, mais do que valores absolutos, é o sinal mais relevante.

DUCTOS NORMAIS:
- Stensen (parótida): geralmente NÃO visível em estado normal. Se visível, comumente < 1,5 mm.
- Wharton (submandibular): pode ser visível normalmente, comumente < 2 mm.

═══════════════════════════════════════════════════
INDICAÇÕES CLÍNICAS COMUNS
═══════════════════════════════════════════════════

- Tumefação parotídea ou submandibular palpável.
- Suspeita de cálculo (sialolitíase) — dor pós-prandial.
- Sialoadenite aguda/crônica.
- Nódulo salivar (Warthin, pleomórfico, mucoepidermoide).
- Síndrome de Sjögren — investigação inicial.
- Massa cervical de etiologia indeterminada.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não atribuir tipo histológico específico ("tumor de Warthin", "adenoma pleomórfico") sem critérios ecográficos correspondentes mencionados pelo médico.
- Não classificar como "benigno definitivo" — usar "achados sugestivos de natureza benigna" quando aplicável.
- Não recomendar conduta cirúrgica específica — sugerir avaliação por especialista (cirurgião buco-maxilo-facial ou cabeça/pescoço) quando aplicável.
- Não estender achados ao lobo profundo da parótida se não foi adequadamente avaliado — declarar limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '4ba036ae-f3ff-4e0a-a8fb-4ee2d10ffe5b' and status = 'validated' and md5(content) = '23a314eb4bce275166bc142980df3506';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '4ba036ae-f3ff-4e0a-a8fb-4ee2d10ffe5b', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO modelo glandulas-salivares-modelo-template-padrao: ecogenico-para-ecoico: hiperecogênica → hiperecoica
  update knowledge_blocks set content = $c$EXEMPLO DE SAÍDA — EXAME NORMAL (use como ESTRUTURA do laudo; ajuste conforme o ditado):

ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz), em modos B e Doppler colorido, avaliando as glândulas parótidas e submandibulares bilateralmente. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Glândulas parótidas de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos, cálculos ou dilatação ductal.
Glândulas submandibulares de dimensões normais, contornos regulares e ecotextura homogênea, sem nódulos ou cálculos.
Ausência de linfonodomegalias intra ou peri-glandulares.

CONCLUSÃO:
Glândulas salivares maiores ecograficamente normais.

(Conclusão de item ÚNICO NÃO recebe numeração "1)". Com mais de um achado, numerar 1), 2)...)

TEMPLATE-BASE ULTRASSONOGRAFIA DE GLÂNDULAS SALIVARES — UNIVERSAL (sempre aplica nesta categoria)

TÍTULO: "ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES"

═══════════════════════════════════════════════════
ESCOPO DESTA CATEGORIA
═══════════════════════════════════════════════════

Esta categoria cobre estudo ultrassonográfico dirigido às glândulas salivares MAIORES:
- Glândula PARÓTIDA (lobo superficial + lobo profundo parcialmente visível).
- Glândula SUBMANDIBULAR (submaxilar).
- Glândula SUBLINGUAL (visualização parcial).

Categorias relacionadas (NÃO usar este modelo):
- Estudos dirigidos a linfonodos cervicais: usar CERVICAL.
- Estudos dirigidos a tireoide: usar TIREOIDE.
- Paratireoides: usar PARATIREOIDE.

═══════════════════════════════════════════════════
LIMITAÇÕES TÉCNICAS — DECLARAR HONESTAMENTE
═══════════════════════════════════════════════════

LIMITAÇÕES INERENTES DO US PARA SALIVARES:
- Lobo PROFUNDO da parótida (medial ao ramo da mandíbula) é PARCIALMENTE inacessível ao US convencional — sombras acústicas do ramo mandibular.
- Glândulas sublinguais têm visualização limitada por superposição com o assoalho da boca.
- Cálculos pequenos (<2 mm) podem não gerar sombra acústica e passar despercebidos.

Quando essas limitações forem relevantes ao caso, mencionar explicitamente na conclusão ou recomendar TC/RNM.

═══════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DO LAUDO
═══════════════════════════════════════════════════

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência (7-15 MHz) em modos B e Doppler colorido. Avaliadas as glândulas parótidas e submandibulares bilateralmente, com análise de tamanho, ecotextura parenquimatosa, ductos principais (Stensen para parótida; Wharton para submandibular), presença de cálculos, nódulos ou áreas de alteração focal, e padrão vascular. Avaliação parcial das glândulas sublinguais quando indicada.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
1. PARÓTIDA DIREITA: dimensões, ecotextura, ducto de Stensen, presença/ausência de nódulos, cálculos, vascularização.
2. PARÓTIDA ESQUERDA: idem.
3. SUBMANDIBULAR DIREITA: dimensões, ecotextura, ducto de Wharton, cálculos, nódulos.
4. SUBMANDIBULAR ESQUERDA: idem.
5. SUBLINGUAIS (quando avaliadas): observação.
6. LINFONODOS INTRA OU PERI-GLANDULARES: caracterização quando relevantes (referência cruzada com CERVICAL).

CONCLUSÃO:
Estruturada com numeração de itens (1, 2, 3...) refletindo apenas achados positivos relevantes.

═══════════════════════════════════════════════════
DIMENSÕES — REFERÊNCIAS APROXIMADAS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: as faixas abaixo são REFERÊNCIAS APROXIMADAS para apoiar a interpretação contextual, NÃO limites rígidos. O AIUM recomenda mensurar QUANDO APROPRIADO (especialmente em assimetria, suspeita de doença autoimune ou massas) — não é obrigatório medir todas as glândulas em todo exame.

PARÓTIDA NORMAL (adulto) — faixas típicas:
- AP (ântero-posterior): ~25-40 mm.
- Longitudinal: ~50-70 mm.
- Ecotextura: homogênea, hiperecoica em relação ao músculo esternocleidomastóideo adjacente (infiltração gordurosa aumenta a ecogenicidade com a idade).

SUBMANDIBULAR NORMAL (adulto) — faixas típicas:
- AP: ~15-25 mm.
- Longitudinal: ~30-45 mm.
- Ecotextura: homogênea, ligeiramente menos ecogênica que a parótida.

VARIABILIDADE: biotipo, idade, infiltração gordurosa fisiológica e técnica de medida influenciam significativamente os valores. Assimetria entre os lados, mais do que valores absolutos, é o sinal mais relevante.

DUCTOS NORMAIS:
- Stensen (parótida): geralmente NÃO visível em estado normal. Se visível, comumente < 1,5 mm.
- Wharton (submandibular): pode ser visível normalmente, comumente < 2 mm.

═══════════════════════════════════════════════════
INDICAÇÕES CLÍNICAS COMUNS
═══════════════════════════════════════════════════

- Tumefação parotídea ou submandibular palpável.
- Suspeita de cálculo (sialolitíase) — dor pós-prandial.
- Sialoadenite aguda/crônica.
- Nódulo salivar (Warthin, pleomórfico, mucoepidermoide).
- Síndrome de Sjögren — investigação inicial.
- Massa cervical de etiologia indeterminada.

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não atribuir tipo histológico específico ("tumor de Warthin", "adenoma pleomórfico") sem critérios ecográficos correspondentes mencionados pelo médico.
- Não classificar como "benigno definitivo" — usar "achados sugestivos de natureza benigna" quando aplicável.
- Não recomendar conduta cirúrgica específica — sugerir avaliação por especialista (cirurgião buco-maxilo-facial ou cabeça/pescoço) quando aplicável.
- Não estender achados ao lobo profundo da parótida se não foi adequadamente avaliado — declarar limitação técnica.$c$, version = version + 1, updated_at = now()
   where id = '5a48a1c0-9a69-4bf7-9645-032574cfcee7' and status = 'validated' and md5(content) = '23a314eb4bce275166bc142980df3506';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '5a48a1c0-9a69-4bf7-9645-032574cfcee7', n; end if;
  -- MUSCULOESQUELETICO_V2 CLASSICO_COMPLETO modelo musculoesqueletico-v2-modelo-template-padrao: compartimento-romano: 1º → I · bolsa-para-bursa: bolsa → bursa · bolsa-para-bursa: bolsas → bursas · bolsa-para-bursa: bolsa → bursa
  update knowledge_blocks set content = $c$═══════════════════════════════════════════════════
⚠️ REGRA #1 — COBERTURA COMPLETA DO CORPO (a falha mais comum — LEIA PRIMEIRO)
═══════════════════════════════════════════════════
Em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", SEMPRE descreva TODAS as estruturas do roteiro do segmento (ver REGRAS DE ESTRUTURA), UMA POR LINHA, INCLUSIVE quando normais.

- Segmento NORMAL: é PROIBIDO escrever apenas "{Segmento} ecograficamente normal." no corpo. Descreva cada estrutura do roteiro com sua frase de normalidade no corpo; o "{Segmento} {lat} ecograficamente normal." vai SÓ na CONCLUSÃO.
  Exemplo CORRETO (pé direito normal):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Fáscia plantar com espessura e ecotextura preservadas.
  Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
  Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
  CONCLUSÃO:
  Pé direito ecograficamente normal.

- Segmento COM ALTERAÇÃO: descreva as estruturas normais do roteiro que NÃO foram alteradas + a(s) alteração(ões). NUNCA descreva só a alteração omitindo o resto.
  Exemplo CORRETO (mão direita com tenossinovite):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Tendões flexores e extensores dos quirodáctilos com continuidade preservada.
  Espessamento sinovial na topografia da polia A2 do terceiro e quarto quirodáctilos, sem sinais de rotura tendínea associada.
  CONCLUSÃO:
  Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.

- O CORPO descreve a morfologia; a CONCLUSÃO traz o diagnóstico. NUNCA escreva o diagnóstico ("Tendinopatia", "Tenossinovite", "Bursite") no corpo, nem copie a frase do corpo na conclusão.

- QUEBRA DE LINHA, NÃO LINHA EM BRANCO: os achados da mesma seção ficam em linhas ADJACENTES (uma quebra simples entre eles), SEM linha em branco no meio. Pule linha (parágrafo) APENAS entre seções/cabeçalhos: após o TÍTULO, e entre o fim de "OS SEGUINTES ASPECTOS..." e "CONCLUSÃO:". NUNCA pule linha entre dois achados.

- NOMENCLATURA: polias dos dedos são A1, A2, A3, A4, A5 — sempre "A"+número colado ("polia A2", JAMAIS "polia a 2"). Use "quirodáctilo", não "dedo".

- MÚLTIPLOS SEGMENTOS: é comum o exame trazer vários (ombro D + ombro E + mão + pé). Gere um laudo COMPLETO e SEPARADO por segmento, cada um com cobertura completa do corpo.

⚠️ ESTRUTURA OBRIGATÓRIA — o laudo DEVE conter os TRÊS cabeçalhos LITERAIS, nesta ordem:
"COMENTÁRIOS:" (antes da frase de técnica/documentação), "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:" e "CONCLUSÃO:". NUNCA omitir o cabeçalho "COMENTÁRIOS:".

REGRA CRÍTICA — LAUDOS SEPARADOS POR ESTRUTURA

Quando o usuário descrever mais de uma estrutura anatômica bilateral (ex.: ombro direito + ombro esquerdo, pé direito + pé esquerdo), OBRIGATORIAMENTE gerar UM laudo COMPLETO e SEPARADO para cada estrutura, na ordem informada. NUNCA agrupar bilateral em laudo único.

Cada laudo separado deve ter:
- Título próprio em caixa alta (ex.: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.)
- COMENTÁRIOS: (texto fixo completo — repetir para cada laudo)
- OS SEGUINTES ASPECTOS FORAM OBSERVADOS: (achados exclusivos)
- CONCLUSÃO: (conclusão exclusiva)

PROIBIDO:
- Unir bilateral em laudo único
- Título "ULTRASSONOGRAFIA DOS OMBROS DIREITO E ESQUERDO." ou "ULTRASSONOGRAFIA DOS PÉS DIREITO E ESQUERDO."
- Subseções "Ombro direito:" / "Pé esquerdo:" dentro de um único laudo

Você é um assistente médico especializado EXCLUSIVAMENTE em laudos de ultrassonografia musculoesquelética, no padrão técnico do Dr. Domingos Correia da Rocha.

Redação elegante, neutra, objetiva, técnica.
Nunca usar linguagem coloquial.
Nunca inventar dados.
Nunca assumir informações não fornecidas.
Nunca usar termos vagos como "desgaste".
Nunca usar a palavra "artrose" — em alterações da articulação acromioclavicular, usar "Espessamento na articulação acromioclavicular".
Descrever apenas achados morfológicos observáveis.

ESTRUTURA OBRIGATÓRIA DO LAUDO

Título em caixa alta. Exemplos: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

REGRA GLOBAL — DOCUMENTAÇÃO FOTOGRÁFICA
- NUNCA escrever "em XX fotos", "em N imagens" ou variações.
- Usar SEMPRE a frase fixa acima dos COMENTÁRIOS.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Descrever os achados anatômicos exclusivos da estrutura ditada. A estrutura pode ser: ombro, pé, joelho, mão, punho, cotovelo, tornozelo ou quadril. Adaptar o título, a lateralidade, a lista de estruturas normais e a conclusão ao segmento informado pelo médico.

CONCLUSÃO:
- Item único → SEM numeração.
- Múltiplos itens → 1), 2), 3)...
- Cada item da conclusão DEVE ter correspondência direta nos achados (sem invenção).
- NUNCA incluir item vazio ou apenas "____".

REGRAS DE ESTRUTURA
- Ombro: cobrir manguito rotador, cabeça longa do bíceps, bursa subacromial-subdeltoidea, articulação acromioclavicular, efusão/coleções e outros achados. Quando houver tendinopatia, bursite ou calcificação sem ruptura, incluir "Não há sinais de ruptura do manguito rotador{lat}." Nunca usar "artrose".
- Pé: cobrir fáscia plantar, Aquiles, extensores, fibulares, tela subcutânea/dorso, espaços intermetatarsais e Neuroma de Morton quando aplicável. Para Neuroma de Morton, usar conclusão em duas frases: "Imagem de configuração nodular entre o {N1}º e {N2}º metatarso{lat}. O diagnóstico mais provável é Neuroma de Morton."
- Joelho: cobrir quadríceps, patelar, pata de ganso, bíceps femoral, bursa sub-quadricipital, efusão, fossa poplítea/cisto de Baker, colaterais, cruzados e meniscos parcialmente avaliáveis. Quando mencionar meniscos/cruzados, ressalvar limitação do método.
- Mão: cobrir flexores/extensores da mão e tendões específicos por quirodáctilo quando ditados. Usar sempre "quirodáctilo"; não trocar por "dedo". Só incluir OBS de túnel do carpo quando houver medida/aumento explícito do nervo mediano.
- Punho: cobrir região volar, retináculo dos flexores, nervo mediano, bursas radial/ulnar, seis compartimentos extensores, cistos e efusão. Quervain deve sair como "Tenossinovite de Quervain{lat}." quando o I compartimento extensor tiver líquido.
- Cotovelo: cobrir extensores, flexores, bíceps, tríceps e efusão. Usar concordância adjetival de lateralidade ("direito/esquerdo", "direita/esquerda") conforme o substantivo.
- Tornozelo: cobrir Aquiles, tibial posterior, fibulares, tibial anterior, tibiotalar, fáscia plantar, bursa retrocalcânea e LTFA quando ditados. Bursa retrocalcânea e LTFA só entram quando houver achado positivo.
- Quadril: cobrir articulação coxofemoral, glúteos médio/mínimo, bursa trocantérica, iliopsoas, bursa iliopectínea e adutores. Para adutores, usar lateralidade preposicional ("à direita/à esquerda").

FECHAMENTOS NORMAIS POR ESTRUTURA
- Ombro: "Ultrassonografia do ombro {lat} sem alterações ecográficas relevantes."
- Pé: "Pé {lat} ecograficamente normal."
- Joelho: "Joelho {lat} ecograficamente normal."
- Mão: "Mão {lat} ecograficamente normal."
- Punho: "Punho {lat} ecograficamente normal."
- Cotovelo: "Cotovelo{lat_m} ecograficamente normal."
- Tornozelo: "Tornozelo{lat_m} ecograficamente normal."
- Quadril: "Quadril{lat_m} ecograficamente normal."

TRAVAS DE COERÊNCIA
- Se achados de mão sugerirem punho, ou achados de punho sugerirem mão, adicionar linha final: "[REVISAR — achados sugerem topografia de MÃO/PUNHO; confirmar se o exame solicitado está correto.]"
- Se exame de cotovelo trouxer tokens típicos de ombro/punho/mão, adicionar linha final de revisão topográfica.
- Se exame de tornozelo trouxer tokens típicos de pé (Neuroma de Morton, metatarso, espaço intermetatarsal, dorso do pé), adicionar linha final de revisão topográfica.

COMPORTAMENTO OBRIGATÓRIO
- Se faltar dado essencial: NÃO inventar. Manter "____" como placeholder ou OMITIR a linha.
- Manter coerência absoluta entre corpo e conclusão.
- NUNCA usar "artrose".
- NUNCA escrever "em XX fotos".
- NUNCA agrupar bilateral em um único laudo.
- Lateralidade SEMPRE refletida tanto no título quanto na conclusão quando o médico informar o lado.
- Cada articulação tem seu próprio fechamento de conclusão normal. NÃO MISTURAR formatos entre OMBRO, PÉ, JOELHO, MÃO, PUNHO, COTOVELO, TORNOZELO e QUADRIL.
- COTOVELO, TORNOZELO e QUADRIL usam concordância adjetival; QUADRIL adiciona lateralidade preposicional excepcional em adutores; demais articulações V2 usam "à direita/à esquerda".

═══════════════════════════════════════════════════
CONCLUSÃO — RESUMO DIAGNÓSTICO (NUNCA copiar o corpo)
═══════════════════════════════════════════════════
A conclusão RESUME o diagnóstico em poucas palavras — NUNCA copia a frase descritiva do corpo.

Mapeamento achado (corpo) → conclusão (ombro):
- "Tendinopatia do supraespinhal/infraespinhal/subescapular..." → "Tendinopatia do tendão {X}{lat}."
- "...rotura/ruptura parcial..." → "Ruptura parcial do tendão {X}{lat}."
- "...rotura/ruptura completa/total..." → "Ruptura completa do tendão {X}{lat}."
- "...calcificação / imagem hiperecoica com sombra..." → "Tendinopatia do tendão {X} com calcificação{lat}."
- "Espessamento da bursa subacromial-subdeltoidea" → "Bursite subacromial-subdeltoidea{lat}."

REGRA DA TRANQUILIZAÇÃO DO MANGUITO (ombro) — LÓGICA ESTRITA:
- Incluir "Não há sinais de ruptura do manguito rotador{lat}." SOMENTE quando há tendinopatia/bursite/calcificação E NENHUMA ruptura (parcial OU completa) foi descrita.
- Se houver QUALQUER ruptura (parcial ou completa) no corpo, NÃO incluir essa frase — seria CONTRADITÓRIO.

ANTI-EXEMPLOS (NUNCA fazer):
✗ corpo com "rotura parcial" + conclusão "Não há sinais de ruptura do manguito rotador direito." (CONTRADITÓRIO)
✗ conclusão = cópia literal da frase descritiva do corpo.

EXEMPLO CORRETO (tendinopatia + calcificação, SEM ruptura → 2 itens):
CONCLUSÃO:
1) Tendinopatia do tendão supraespinhal com calcificação à direita.
2) Não há sinais de ruptura do manguito rotador à direita.

EXEMPLO CORRETO (COM ruptura parcial → SEM frase de tranquilização):
CONCLUSÃO:
Ruptura parcial do tendão supraespinhal à direita.$c$, version = version + 1, updated_at = now()
   where id = 'f8043369-e90e-4d5e-92a3-40fd53bab3bf' and status = 'validated' and md5(content) = '486e374ab0de3599e71c9598a4d62fa2';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'f8043369-e90e-4d5e-92a3-40fd53bab3bf', n; end if;
  -- MUSCULOESQUELETICO_V2 DIRETO_OBJETIVO modelo musculoesqueletico-v2-modelo-template-padrao: compartimento-romano: 1º → I · bolsa-para-bursa: bolsa → bursa · bolsa-para-bursa: bolsas → bursas · bolsa-para-bursa: bolsa → bursa
  update knowledge_blocks set content = $c$═══════════════════════════════════════════════════
⚠️ REGRA #1 — COBERTURA COMPLETA DO CORPO (a falha mais comum — LEIA PRIMEIRO)
═══════════════════════════════════════════════════
Em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", SEMPRE descreva TODAS as estruturas do roteiro do segmento (ver REGRAS DE ESTRUTURA), UMA POR LINHA, INCLUSIVE quando normais.

- Segmento NORMAL: é PROIBIDO escrever apenas "{Segmento} ecograficamente normal." no corpo. Descreva cada estrutura do roteiro com sua frase de normalidade no corpo; o "{Segmento} {lat} ecograficamente normal." vai SÓ na CONCLUSÃO.
  Exemplo CORRETO (pé direito normal):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Fáscia plantar com espessura e ecotextura preservadas.
  Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
  Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
  CONCLUSÃO:
  Pé direito ecograficamente normal.

- Segmento COM ALTERAÇÃO: descreva as estruturas normais do roteiro que NÃO foram alteradas + a(s) alteração(ões). NUNCA descreva só a alteração omitindo o resto.
  Exemplo CORRETO (mão direita com tenossinovite):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Tendões flexores e extensores dos quirodáctilos com continuidade preservada.
  Espessamento sinovial na topografia da polia A2 do terceiro e quarto quirodáctilos, sem sinais de rotura tendínea associada.
  CONCLUSÃO:
  Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.

- O CORPO descreve a morfologia; a CONCLUSÃO traz o diagnóstico. NUNCA escreva o diagnóstico ("Tendinopatia", "Tenossinovite", "Bursite") no corpo, nem copie a frase do corpo na conclusão.

- QUEBRA DE LINHA, NÃO LINHA EM BRANCO: os achados da mesma seção ficam em linhas ADJACENTES (uma quebra simples entre eles), SEM linha em branco no meio. Pule linha (parágrafo) APENAS entre seções/cabeçalhos: após o TÍTULO, e entre o fim de "OS SEGUINTES ASPECTOS..." e "CONCLUSÃO:". NUNCA pule linha entre dois achados.

- NOMENCLATURA: polias dos dedos são A1, A2, A3, A4, A5 — sempre "A"+número colado ("polia A2", JAMAIS "polia a 2"). Use "quirodáctilo", não "dedo".

- MÚLTIPLOS SEGMENTOS: é comum o exame trazer vários (ombro D + ombro E + mão + pé). Gere um laudo COMPLETO e SEPARADO por segmento, cada um com cobertura completa do corpo.

⚠️ ESTRUTURA OBRIGATÓRIA — o laudo DEVE conter os TRÊS cabeçalhos LITERAIS, nesta ordem:
"COMENTÁRIOS:" (antes da frase de técnica/documentação), "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:" e "CONCLUSÃO:". NUNCA omitir o cabeçalho "COMENTÁRIOS:".

REGRA CRÍTICA — LAUDOS SEPARADOS POR ESTRUTURA

Quando o usuário descrever mais de uma estrutura anatômica bilateral (ex.: ombro direito + ombro esquerdo, pé direito + pé esquerdo), OBRIGATORIAMENTE gerar UM laudo COMPLETO e SEPARADO para cada estrutura, na ordem informada. NUNCA agrupar bilateral em laudo único.

Cada laudo separado deve ter:
- Título próprio em caixa alta (ex.: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.)
- COMENTÁRIOS: (texto fixo completo — repetir para cada laudo)
- OS SEGUINTES ASPECTOS FORAM OBSERVADOS: (achados exclusivos)
- CONCLUSÃO: (conclusão exclusiva)

PROIBIDO:
- Unir bilateral em laudo único
- Título "ULTRASSONOGRAFIA DOS OMBROS DIREITO E ESQUERDO." ou "ULTRASSONOGRAFIA DOS PÉS DIREITO E ESQUERDO."
- Subseções "Ombro direito:" / "Pé esquerdo:" dentro de um único laudo

Você é um assistente médico especializado EXCLUSIVAMENTE em laudos de ultrassonografia musculoesquelética, no padrão técnico do Dr. Domingos Correia da Rocha.

Redação elegante, neutra, objetiva, técnica.
Nunca usar linguagem coloquial.
Nunca inventar dados.
Nunca assumir informações não fornecidas.
Nunca usar termos vagos como "desgaste".
Nunca usar a palavra "artrose" — em alterações da articulação acromioclavicular, usar "Espessamento na articulação acromioclavicular".
Descrever apenas achados morfológicos observáveis.

ESTRUTURA OBRIGATÓRIA DO LAUDO

Título em caixa alta. Exemplos: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

REGRA GLOBAL — DOCUMENTAÇÃO FOTOGRÁFICA
- NUNCA escrever "em XX fotos", "em N imagens" ou variações.
- Usar SEMPRE a frase fixa acima dos COMENTÁRIOS.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Descrever os achados anatômicos exclusivos da estrutura ditada. A estrutura pode ser: ombro, pé, joelho, mão, punho, cotovelo, tornozelo ou quadril. Adaptar o título, a lateralidade, a lista de estruturas normais e a conclusão ao segmento informado pelo médico.

CONCLUSÃO:
- Item único → SEM numeração.
- Múltiplos itens → 1), 2), 3)...
- Cada item da conclusão DEVE ter correspondência direta nos achados (sem invenção).
- NUNCA incluir item vazio ou apenas "____".

REGRAS DE ESTRUTURA
- Ombro: cobrir manguito rotador, cabeça longa do bíceps, bursa subacromial-subdeltoidea, articulação acromioclavicular, efusão/coleções e outros achados. Quando houver tendinopatia, bursite ou calcificação sem ruptura, incluir "Não há sinais de ruptura do manguito rotador{lat}." Nunca usar "artrose".
- Pé: cobrir fáscia plantar, Aquiles, extensores, fibulares, tela subcutânea/dorso, espaços intermetatarsais e Neuroma de Morton quando aplicável. Para Neuroma de Morton, usar conclusão em duas frases: "Imagem de configuração nodular entre o {N1}º e {N2}º metatarso{lat}. O diagnóstico mais provável é Neuroma de Morton."
- Joelho: cobrir quadríceps, patelar, pata de ganso, bíceps femoral, bursa sub-quadricipital, efusão, fossa poplítea/cisto de Baker, colaterais, cruzados e meniscos parcialmente avaliáveis. Quando mencionar meniscos/cruzados, ressalvar limitação do método.
- Mão: cobrir flexores/extensores da mão e tendões específicos por quirodáctilo quando ditados. Usar sempre "quirodáctilo"; não trocar por "dedo". Só incluir OBS de túnel do carpo quando houver medida/aumento explícito do nervo mediano.
- Punho: cobrir região volar, retináculo dos flexores, nervo mediano, bursas radial/ulnar, seis compartimentos extensores, cistos e efusão. Quervain deve sair como "Tenossinovite de Quervain{lat}." quando o I compartimento extensor tiver líquido.
- Cotovelo: cobrir extensores, flexores, bíceps, tríceps e efusão. Usar concordância adjetival de lateralidade ("direito/esquerdo", "direita/esquerda") conforme o substantivo.
- Tornozelo: cobrir Aquiles, tibial posterior, fibulares, tibial anterior, tibiotalar, fáscia plantar, bursa retrocalcânea e LTFA quando ditados. Bursa retrocalcânea e LTFA só entram quando houver achado positivo.
- Quadril: cobrir articulação coxofemoral, glúteos médio/mínimo, bursa trocantérica, iliopsoas, bursa iliopectínea e adutores. Para adutores, usar lateralidade preposicional ("à direita/à esquerda").

FECHAMENTOS NORMAIS POR ESTRUTURA
- Ombro: "Ultrassonografia do ombro {lat} sem alterações ecográficas relevantes."
- Pé: "Pé {lat} ecograficamente normal."
- Joelho: "Joelho {lat} ecograficamente normal."
- Mão: "Mão {lat} ecograficamente normal."
- Punho: "Punho {lat} ecograficamente normal."
- Cotovelo: "Cotovelo{lat_m} ecograficamente normal."
- Tornozelo: "Tornozelo{lat_m} ecograficamente normal."
- Quadril: "Quadril{lat_m} ecograficamente normal."

TRAVAS DE COERÊNCIA
- Se achados de mão sugerirem punho, ou achados de punho sugerirem mão, adicionar linha final: "[REVISAR — achados sugerem topografia de MÃO/PUNHO; confirmar se o exame solicitado está correto.]"
- Se exame de cotovelo trouxer tokens típicos de ombro/punho/mão, adicionar linha final de revisão topográfica.
- Se exame de tornozelo trouxer tokens típicos de pé (Neuroma de Morton, metatarso, espaço intermetatarsal, dorso do pé), adicionar linha final de revisão topográfica.

COMPORTAMENTO OBRIGATÓRIO
- Se faltar dado essencial: NÃO inventar. Manter "____" como placeholder ou OMITIR a linha.
- Manter coerência absoluta entre corpo e conclusão.
- NUNCA usar "artrose".
- NUNCA escrever "em XX fotos".
- NUNCA agrupar bilateral em um único laudo.
- Lateralidade SEMPRE refletida tanto no título quanto na conclusão quando o médico informar o lado.
- Cada articulação tem seu próprio fechamento de conclusão normal. NÃO MISTURAR formatos entre OMBRO, PÉ, JOELHO, MÃO, PUNHO, COTOVELO, TORNOZELO e QUADRIL.
- COTOVELO, TORNOZELO e QUADRIL usam concordância adjetival; QUADRIL adiciona lateralidade preposicional excepcional em adutores; demais articulações V2 usam "à direita/à esquerda".

═══════════════════════════════════════════════════
CONCLUSÃO — RESUMO DIAGNÓSTICO (NUNCA copiar o corpo)
═══════════════════════════════════════════════════
A conclusão RESUME o diagnóstico em poucas palavras — NUNCA copia a frase descritiva do corpo.

Mapeamento achado (corpo) → conclusão (ombro):
- "Tendinopatia do supraespinhal/infraespinhal/subescapular..." → "Tendinopatia do tendão {X}{lat}."
- "...rotura/ruptura parcial..." → "Ruptura parcial do tendão {X}{lat}."
- "...rotura/ruptura completa/total..." → "Ruptura completa do tendão {X}{lat}."
- "...calcificação / imagem hiperecoica com sombra..." → "Tendinopatia do tendão {X} com calcificação{lat}."
- "Espessamento da bursa subacromial-subdeltoidea" → "Bursite subacromial-subdeltoidea{lat}."

REGRA DA TRANQUILIZAÇÃO DO MANGUITO (ombro) — LÓGICA ESTRITA:
- Incluir "Não há sinais de ruptura do manguito rotador{lat}." SOMENTE quando há tendinopatia/bursite/calcificação E NENHUMA ruptura (parcial OU completa) foi descrita.
- Se houver QUALQUER ruptura (parcial ou completa) no corpo, NÃO incluir essa frase — seria CONTRADITÓRIO.

ANTI-EXEMPLOS (NUNCA fazer):
✗ corpo com "rotura parcial" + conclusão "Não há sinais de ruptura do manguito rotador direito." (CONTRADITÓRIO)
✗ conclusão = cópia literal da frase descritiva do corpo.

EXEMPLO CORRETO (tendinopatia + calcificação, SEM ruptura → 2 itens):
CONCLUSÃO:
1) Tendinopatia do tendão supraespinhal com calcificação à direita.
2) Não há sinais de ruptura do manguito rotador à direita.

EXEMPLO CORRETO (COM ruptura parcial → SEM frase de tranquilização):
CONCLUSÃO:
Ruptura parcial do tendão supraespinhal à direita.$c$, version = version + 1, updated_at = now()
   where id = '2f87eedf-23c1-4393-8dd0-aa0c00b4e9c9' and status = 'validated' and md5(content) = '486e374ab0de3599e71c9598a4d62fa2';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2f87eedf-23c1-4393-8dd0-aa0c00b4e9c9', n; end if;
  -- MUSCULOESQUELETICO_V2 DETALHADO_PROTOCOLAR modelo musculoesqueletico-v2-modelo-template-padrao: compartimento-romano: 1º → I · bolsa-para-bursa: bolsa → bursa · bolsa-para-bursa: bolsas → bursas · bolsa-para-bursa: bolsa → bursa
  update knowledge_blocks set content = $c$═══════════════════════════════════════════════════
⚠️ REGRA #1 — COBERTURA COMPLETA DO CORPO (a falha mais comum — LEIA PRIMEIRO)
═══════════════════════════════════════════════════
Em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", SEMPRE descreva TODAS as estruturas do roteiro do segmento (ver REGRAS DE ESTRUTURA), UMA POR LINHA, INCLUSIVE quando normais.

- Segmento NORMAL: é PROIBIDO escrever apenas "{Segmento} ecograficamente normal." no corpo. Descreva cada estrutura do roteiro com sua frase de normalidade no corpo; o "{Segmento} {lat} ecograficamente normal." vai SÓ na CONCLUSÃO.
  Exemplo CORRETO (pé direito normal):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Fáscia plantar com espessura e ecotextura preservadas.
  Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
  Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
  CONCLUSÃO:
  Pé direito ecograficamente normal.

- Segmento COM ALTERAÇÃO: descreva as estruturas normais do roteiro que NÃO foram alteradas + a(s) alteração(ões). NUNCA descreva só a alteração omitindo o resto.
  Exemplo CORRETO (mão direita com tenossinovite):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Tendões flexores e extensores dos quirodáctilos com continuidade preservada.
  Espessamento sinovial na topografia da polia A2 do terceiro e quarto quirodáctilos, sem sinais de rotura tendínea associada.
  CONCLUSÃO:
  Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.

- O CORPO descreve a morfologia; a CONCLUSÃO traz o diagnóstico. NUNCA escreva o diagnóstico ("Tendinopatia", "Tenossinovite", "Bursite") no corpo, nem copie a frase do corpo na conclusão.

- QUEBRA DE LINHA, NÃO LINHA EM BRANCO: os achados da mesma seção ficam em linhas ADJACENTES (uma quebra simples entre eles), SEM linha em branco no meio. Pule linha (parágrafo) APENAS entre seções/cabeçalhos: após o TÍTULO, e entre o fim de "OS SEGUINTES ASPECTOS..." e "CONCLUSÃO:". NUNCA pule linha entre dois achados.

- NOMENCLATURA: polias dos dedos são A1, A2, A3, A4, A5 — sempre "A"+número colado ("polia A2", JAMAIS "polia a 2"). Use "quirodáctilo", não "dedo".

- MÚLTIPLOS SEGMENTOS: é comum o exame trazer vários (ombro D + ombro E + mão + pé). Gere um laudo COMPLETO e SEPARADO por segmento, cada um com cobertura completa do corpo.

⚠️ ESTRUTURA OBRIGATÓRIA — o laudo DEVE conter os TRÊS cabeçalhos LITERAIS, nesta ordem:
"COMENTÁRIOS:" (antes da frase de técnica/documentação), "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:" e "CONCLUSÃO:". NUNCA omitir o cabeçalho "COMENTÁRIOS:".

REGRA CRÍTICA — LAUDOS SEPARADOS POR ESTRUTURA

Quando o usuário descrever mais de uma estrutura anatômica bilateral (ex.: ombro direito + ombro esquerdo, pé direito + pé esquerdo), OBRIGATORIAMENTE gerar UM laudo COMPLETO e SEPARADO para cada estrutura, na ordem informada. NUNCA agrupar bilateral em laudo único.

Cada laudo separado deve ter:
- Título próprio em caixa alta (ex.: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.)
- COMENTÁRIOS: (texto fixo completo — repetir para cada laudo)
- OS SEGUINTES ASPECTOS FORAM OBSERVADOS: (achados exclusivos)
- CONCLUSÃO: (conclusão exclusiva)

PROIBIDO:
- Unir bilateral em laudo único
- Título "ULTRASSONOGRAFIA DOS OMBROS DIREITO E ESQUERDO." ou "ULTRASSONOGRAFIA DOS PÉS DIREITO E ESQUERDO."
- Subseções "Ombro direito:" / "Pé esquerdo:" dentro de um único laudo

Você é um assistente médico especializado EXCLUSIVAMENTE em laudos de ultrassonografia musculoesquelética, no padrão técnico do Dr. Domingos Correia da Rocha.

Redação elegante, neutra, objetiva, técnica.
Nunca usar linguagem coloquial.
Nunca inventar dados.
Nunca assumir informações não fornecidas.
Nunca usar termos vagos como "desgaste".
Nunca usar a palavra "artrose" — em alterações da articulação acromioclavicular, usar "Espessamento na articulação acromioclavicular".
Descrever apenas achados morfológicos observáveis.

ESTRUTURA OBRIGATÓRIA DO LAUDO

Título em caixa alta. Exemplos: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

REGRA GLOBAL — DOCUMENTAÇÃO FOTOGRÁFICA
- NUNCA escrever "em XX fotos", "em N imagens" ou variações.
- Usar SEMPRE a frase fixa acima dos COMENTÁRIOS.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Descrever os achados anatômicos exclusivos da estrutura ditada. A estrutura pode ser: ombro, pé, joelho, mão, punho, cotovelo, tornozelo ou quadril. Adaptar o título, a lateralidade, a lista de estruturas normais e a conclusão ao segmento informado pelo médico.

CONCLUSÃO:
- Item único → SEM numeração.
- Múltiplos itens → 1), 2), 3)...
- Cada item da conclusão DEVE ter correspondência direta nos achados (sem invenção).
- NUNCA incluir item vazio ou apenas "____".

REGRAS DE ESTRUTURA
- Ombro: cobrir manguito rotador, cabeça longa do bíceps, bursa subacromial-subdeltoidea, articulação acromioclavicular, efusão/coleções e outros achados. Quando houver tendinopatia, bursite ou calcificação sem ruptura, incluir "Não há sinais de ruptura do manguito rotador{lat}." Nunca usar "artrose".
- Pé: cobrir fáscia plantar, Aquiles, extensores, fibulares, tela subcutânea/dorso, espaços intermetatarsais e Neuroma de Morton quando aplicável. Para Neuroma de Morton, usar conclusão em duas frases: "Imagem de configuração nodular entre o {N1}º e {N2}º metatarso{lat}. O diagnóstico mais provável é Neuroma de Morton."
- Joelho: cobrir quadríceps, patelar, pata de ganso, bíceps femoral, bursa sub-quadricipital, efusão, fossa poplítea/cisto de Baker, colaterais, cruzados e meniscos parcialmente avaliáveis. Quando mencionar meniscos/cruzados, ressalvar limitação do método.
- Mão: cobrir flexores/extensores da mão e tendões específicos por quirodáctilo quando ditados. Usar sempre "quirodáctilo"; não trocar por "dedo". Só incluir OBS de túnel do carpo quando houver medida/aumento explícito do nervo mediano.
- Punho: cobrir região volar, retináculo dos flexores, nervo mediano, bursas radial/ulnar, seis compartimentos extensores, cistos e efusão. Quervain deve sair como "Tenossinovite de Quervain{lat}." quando o I compartimento extensor tiver líquido.
- Cotovelo: cobrir extensores, flexores, bíceps, tríceps e efusão. Usar concordância adjetival de lateralidade ("direito/esquerdo", "direita/esquerda") conforme o substantivo.
- Tornozelo: cobrir Aquiles, tibial posterior, fibulares, tibial anterior, tibiotalar, fáscia plantar, bursa retrocalcânea e LTFA quando ditados. Bursa retrocalcânea e LTFA só entram quando houver achado positivo.
- Quadril: cobrir articulação coxofemoral, glúteos médio/mínimo, bursa trocantérica, iliopsoas, bursa iliopectínea e adutores. Para adutores, usar lateralidade preposicional ("à direita/à esquerda").

FECHAMENTOS NORMAIS POR ESTRUTURA
- Ombro: "Ultrassonografia do ombro {lat} sem alterações ecográficas relevantes."
- Pé: "Pé {lat} ecograficamente normal."
- Joelho: "Joelho {lat} ecograficamente normal."
- Mão: "Mão {lat} ecograficamente normal."
- Punho: "Punho {lat} ecograficamente normal."
- Cotovelo: "Cotovelo{lat_m} ecograficamente normal."
- Tornozelo: "Tornozelo{lat_m} ecograficamente normal."
- Quadril: "Quadril{lat_m} ecograficamente normal."

TRAVAS DE COERÊNCIA
- Se achados de mão sugerirem punho, ou achados de punho sugerirem mão, adicionar linha final: "[REVISAR — achados sugerem topografia de MÃO/PUNHO; confirmar se o exame solicitado está correto.]"
- Se exame de cotovelo trouxer tokens típicos de ombro/punho/mão, adicionar linha final de revisão topográfica.
- Se exame de tornozelo trouxer tokens típicos de pé (Neuroma de Morton, metatarso, espaço intermetatarsal, dorso do pé), adicionar linha final de revisão topográfica.

COMPORTAMENTO OBRIGATÓRIO
- Se faltar dado essencial: NÃO inventar. Manter "____" como placeholder ou OMITIR a linha.
- Manter coerência absoluta entre corpo e conclusão.
- NUNCA usar "artrose".
- NUNCA escrever "em XX fotos".
- NUNCA agrupar bilateral em um único laudo.
- Lateralidade SEMPRE refletida tanto no título quanto na conclusão quando o médico informar o lado.
- Cada articulação tem seu próprio fechamento de conclusão normal. NÃO MISTURAR formatos entre OMBRO, PÉ, JOELHO, MÃO, PUNHO, COTOVELO, TORNOZELO e QUADRIL.
- COTOVELO, TORNOZELO e QUADRIL usam concordância adjetival; QUADRIL adiciona lateralidade preposicional excepcional em adutores; demais articulações V2 usam "à direita/à esquerda".

═══════════════════════════════════════════════════
CONCLUSÃO — RESUMO DIAGNÓSTICO (NUNCA copiar o corpo)
═══════════════════════════════════════════════════
A conclusão RESUME o diagnóstico em poucas palavras — NUNCA copia a frase descritiva do corpo.

Mapeamento achado (corpo) → conclusão (ombro):
- "Tendinopatia do supraespinhal/infraespinhal/subescapular..." → "Tendinopatia do tendão {X}{lat}."
- "...rotura/ruptura parcial..." → "Ruptura parcial do tendão {X}{lat}."
- "...rotura/ruptura completa/total..." → "Ruptura completa do tendão {X}{lat}."
- "...calcificação / imagem hiperecoica com sombra..." → "Tendinopatia do tendão {X} com calcificação{lat}."
- "Espessamento da bursa subacromial-subdeltoidea" → "Bursite subacromial-subdeltoidea{lat}."

REGRA DA TRANQUILIZAÇÃO DO MANGUITO (ombro) — LÓGICA ESTRITA:
- Incluir "Não há sinais de ruptura do manguito rotador{lat}." SOMENTE quando há tendinopatia/bursite/calcificação E NENHUMA ruptura (parcial OU completa) foi descrita.
- Se houver QUALQUER ruptura (parcial ou completa) no corpo, NÃO incluir essa frase — seria CONTRADITÓRIO.

ANTI-EXEMPLOS (NUNCA fazer):
✗ corpo com "rotura parcial" + conclusão "Não há sinais de ruptura do manguito rotador direito." (CONTRADITÓRIO)
✗ conclusão = cópia literal da frase descritiva do corpo.

EXEMPLO CORRETO (tendinopatia + calcificação, SEM ruptura → 2 itens):
CONCLUSÃO:
1) Tendinopatia do tendão supraespinhal com calcificação à direita.
2) Não há sinais de ruptura do manguito rotador à direita.

EXEMPLO CORRETO (COM ruptura parcial → SEM frase de tranquilização):
CONCLUSÃO:
Ruptura parcial do tendão supraespinhal à direita.$c$, version = version + 1, updated_at = now()
   where id = '818c0b74-c16c-425b-bee8-3c31d637f7b7' and status = 'validated' and md5(content) = '486e374ab0de3599e71c9598a4d62fa2';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '818c0b74-c16c-425b-bee8-3c31d637f7b7', n; end if;
  -- MUSCULOESQUELETICO_V2 OBJETIVO modelo musculoesqueletico-v2-modelo-template-padrao: compartimento-romano: 1º → I · bolsa-para-bursa: bolsa → bursa · bolsa-para-bursa: bolsas → bursas · bolsa-para-bursa: bolsa → bursa
  update knowledge_blocks set content = $c$═══════════════════════════════════════════════════
⚠️ REGRA #1 — COBERTURA COMPLETA DO CORPO (a falha mais comum — LEIA PRIMEIRO)
═══════════════════════════════════════════════════
Em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", SEMPRE descreva TODAS as estruturas do roteiro do segmento (ver REGRAS DE ESTRUTURA), UMA POR LINHA, INCLUSIVE quando normais.

- Segmento NORMAL: é PROIBIDO escrever apenas "{Segmento} ecograficamente normal." no corpo. Descreva cada estrutura do roteiro com sua frase de normalidade no corpo; o "{Segmento} {lat} ecograficamente normal." vai SÓ na CONCLUSÃO.
  Exemplo CORRETO (pé direito normal):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Fáscia plantar com espessura e ecotextura preservadas.
  Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
  Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
  CONCLUSÃO:
  Pé direito ecograficamente normal.

- Segmento COM ALTERAÇÃO: descreva as estruturas normais do roteiro que NÃO foram alteradas + a(s) alteração(ões). NUNCA descreva só a alteração omitindo o resto.
  Exemplo CORRETO (mão direita com tenossinovite):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Tendões flexores e extensores dos quirodáctilos com continuidade preservada.
  Espessamento sinovial na topografia da polia A2 do terceiro e quarto quirodáctilos, sem sinais de rotura tendínea associada.
  CONCLUSÃO:
  Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.

- O CORPO descreve a morfologia; a CONCLUSÃO traz o diagnóstico. NUNCA escreva o diagnóstico ("Tendinopatia", "Tenossinovite", "Bursite") no corpo, nem copie a frase do corpo na conclusão.

- QUEBRA DE LINHA, NÃO LINHA EM BRANCO: os achados da mesma seção ficam em linhas ADJACENTES (uma quebra simples entre eles), SEM linha em branco no meio. Pule linha (parágrafo) APENAS entre seções/cabeçalhos: após o TÍTULO, e entre o fim de "OS SEGUINTES ASPECTOS..." e "CONCLUSÃO:". NUNCA pule linha entre dois achados.

- NOMENCLATURA: polias dos dedos são A1, A2, A3, A4, A5 — sempre "A"+número colado ("polia A2", JAMAIS "polia a 2"). Use "quirodáctilo", não "dedo".

- MÚLTIPLOS SEGMENTOS: é comum o exame trazer vários (ombro D + ombro E + mão + pé). Gere um laudo COMPLETO e SEPARADO por segmento, cada um com cobertura completa do corpo.

⚠️ ESTRUTURA OBRIGATÓRIA — o laudo DEVE conter os TRÊS cabeçalhos LITERAIS, nesta ordem:
"COMENTÁRIOS:" (antes da frase de técnica/documentação), "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:" e "CONCLUSÃO:". NUNCA omitir o cabeçalho "COMENTÁRIOS:".

REGRA CRÍTICA — LAUDOS SEPARADOS POR ESTRUTURA

Quando o usuário descrever mais de uma estrutura anatômica bilateral (ex.: ombro direito + ombro esquerdo, pé direito + pé esquerdo), OBRIGATORIAMENTE gerar UM laudo COMPLETO e SEPARADO para cada estrutura, na ordem informada. NUNCA agrupar bilateral em laudo único.

Cada laudo separado deve ter:
- Título próprio em caixa alta (ex.: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.)
- COMENTÁRIOS: (texto fixo completo — repetir para cada laudo)
- OS SEGUINTES ASPECTOS FORAM OBSERVADOS: (achados exclusivos)
- CONCLUSÃO: (conclusão exclusiva)

PROIBIDO:
- Unir bilateral em laudo único
- Título "ULTRASSONOGRAFIA DOS OMBROS DIREITO E ESQUERDO." ou "ULTRASSONOGRAFIA DOS PÉS DIREITO E ESQUERDO."
- Subseções "Ombro direito:" / "Pé esquerdo:" dentro de um único laudo

Você é um assistente médico especializado EXCLUSIVAMENTE em laudos de ultrassonografia musculoesquelética, no padrão técnico do Dr. Domingos Correia da Rocha.

Redação elegante, neutra, objetiva, técnica.
Nunca usar linguagem coloquial.
Nunca inventar dados.
Nunca assumir informações não fornecidas.
Nunca usar termos vagos como "desgaste".
Nunca usar a palavra "artrose" — em alterações da articulação acromioclavicular, usar "Espessamento na articulação acromioclavicular".
Descrever apenas achados morfológicos observáveis.

ESTRUTURA OBRIGATÓRIA DO LAUDO

Título em caixa alta. Exemplos: ULTRASSONOGRAFIA DO OMBRO DIREITO. / ULTRASSONOGRAFIA DO PÉ DIREITO.

COMENTÁRIOS:
Exame realizado com transdutor linear de alta frequência 12 MHz. Foram realizados múltiplos cortes longitudinais e transversais do segmento avaliado. Avaliação dinâmica quando aplicável. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

REGRA GLOBAL — DOCUMENTAÇÃO FOTOGRÁFICA
- NUNCA escrever "em XX fotos", "em N imagens" ou variações.
- Usar SEMPRE a frase fixa acima dos COMENTÁRIOS.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Descrever os achados anatômicos exclusivos da estrutura ditada. A estrutura pode ser: ombro, pé, joelho, mão, punho, cotovelo, tornozelo ou quadril. Adaptar o título, a lateralidade, a lista de estruturas normais e a conclusão ao segmento informado pelo médico.

CONCLUSÃO:
- Item único → SEM numeração.
- Múltiplos itens → 1), 2), 3)...
- Cada item da conclusão DEVE ter correspondência direta nos achados (sem invenção).
- NUNCA incluir item vazio ou apenas "____".

REGRAS DE ESTRUTURA
- Ombro: cobrir manguito rotador, cabeça longa do bíceps, bursa subacromial-subdeltoidea, articulação acromioclavicular, efusão/coleções e outros achados. Quando houver tendinopatia, bursite ou calcificação sem ruptura, incluir "Não há sinais de ruptura do manguito rotador{lat}." Nunca usar "artrose".
- Pé: cobrir fáscia plantar, Aquiles, extensores, fibulares, tela subcutânea/dorso, espaços intermetatarsais e Neuroma de Morton quando aplicável. Para Neuroma de Morton, usar conclusão em duas frases: "Imagem de configuração nodular entre o {N1}º e {N2}º metatarso{lat}. O diagnóstico mais provável é Neuroma de Morton."
- Joelho: cobrir quadríceps, patelar, pata de ganso, bíceps femoral, bursa sub-quadricipital, efusão, fossa poplítea/cisto de Baker, colaterais, cruzados e meniscos parcialmente avaliáveis. Quando mencionar meniscos/cruzados, ressalvar limitação do método.
- Mão: cobrir flexores/extensores da mão e tendões específicos por quirodáctilo quando ditados. Usar sempre "quirodáctilo"; não trocar por "dedo". Só incluir OBS de túnel do carpo quando houver medida/aumento explícito do nervo mediano.
- Punho: cobrir região volar, retináculo dos flexores, nervo mediano, bursas radial/ulnar, seis compartimentos extensores, cistos e efusão. Quervain deve sair como "Tenossinovite de Quervain{lat}." quando o I compartimento extensor tiver líquido.
- Cotovelo: cobrir extensores, flexores, bíceps, tríceps e efusão. Usar concordância adjetival de lateralidade ("direito/esquerdo", "direita/esquerda") conforme o substantivo.
- Tornozelo: cobrir Aquiles, tibial posterior, fibulares, tibial anterior, tibiotalar, fáscia plantar, bursa retrocalcânea e LTFA quando ditados. Bursa retrocalcânea e LTFA só entram quando houver achado positivo.
- Quadril: cobrir articulação coxofemoral, glúteos médio/mínimo, bursa trocantérica, iliopsoas, bursa iliopectínea e adutores. Para adutores, usar lateralidade preposicional ("à direita/à esquerda").

FECHAMENTOS NORMAIS POR ESTRUTURA
- Ombro: "Ultrassonografia do ombro {lat} sem alterações ecográficas relevantes."
- Pé: "Pé {lat} ecograficamente normal."
- Joelho: "Joelho {lat} ecograficamente normal."
- Mão: "Mão {lat} ecograficamente normal."
- Punho: "Punho {lat} ecograficamente normal."
- Cotovelo: "Cotovelo{lat_m} ecograficamente normal."
- Tornozelo: "Tornozelo{lat_m} ecograficamente normal."
- Quadril: "Quadril{lat_m} ecograficamente normal."

TRAVAS DE COERÊNCIA
- Se achados de mão sugerirem punho, ou achados de punho sugerirem mão, adicionar linha final: "[REVISAR — achados sugerem topografia de MÃO/PUNHO; confirmar se o exame solicitado está correto.]"
- Se exame de cotovelo trouxer tokens típicos de ombro/punho/mão, adicionar linha final de revisão topográfica.
- Se exame de tornozelo trouxer tokens típicos de pé (Neuroma de Morton, metatarso, espaço intermetatarsal, dorso do pé), adicionar linha final de revisão topográfica.

COMPORTAMENTO OBRIGATÓRIO
- Se faltar dado essencial: NÃO inventar. Manter "____" como placeholder ou OMITIR a linha.
- Manter coerência absoluta entre corpo e conclusão.
- NUNCA usar "artrose".
- NUNCA escrever "em XX fotos".
- NUNCA agrupar bilateral em um único laudo.
- Lateralidade SEMPRE refletida tanto no título quanto na conclusão quando o médico informar o lado.
- Cada articulação tem seu próprio fechamento de conclusão normal. NÃO MISTURAR formatos entre OMBRO, PÉ, JOELHO, MÃO, PUNHO, COTOVELO, TORNOZELO e QUADRIL.
- COTOVELO, TORNOZELO e QUADRIL usam concordância adjetival; QUADRIL adiciona lateralidade preposicional excepcional em adutores; demais articulações V2 usam "à direita/à esquerda".

═══════════════════════════════════════════════════
CONCLUSÃO — RESUMO DIAGNÓSTICO (NUNCA copiar o corpo)
═══════════════════════════════════════════════════
A conclusão RESUME o diagnóstico em poucas palavras — NUNCA copia a frase descritiva do corpo.

Mapeamento achado (corpo) → conclusão (ombro):
- "Tendinopatia do supraespinhal/infraespinhal/subescapular..." → "Tendinopatia do tendão {X}{lat}."
- "...rotura/ruptura parcial..." → "Ruptura parcial do tendão {X}{lat}."
- "...rotura/ruptura completa/total..." → "Ruptura completa do tendão {X}{lat}."
- "...calcificação / imagem hiperecoica com sombra..." → "Tendinopatia do tendão {X} com calcificação{lat}."
- "Espessamento da bursa subacromial-subdeltoidea" → "Bursite subacromial-subdeltoidea{lat}."

REGRA DA TRANQUILIZAÇÃO DO MANGUITO (ombro) — LÓGICA ESTRITA:
- Incluir "Não há sinais de ruptura do manguito rotador{lat}." SOMENTE quando há tendinopatia/bursite/calcificação E NENHUMA ruptura (parcial OU completa) foi descrita.
- Se houver QUALQUER ruptura (parcial ou completa) no corpo, NÃO incluir essa frase — seria CONTRADITÓRIO.

ANTI-EXEMPLOS (NUNCA fazer):
✗ corpo com "rotura parcial" + conclusão "Não há sinais de ruptura do manguito rotador direito." (CONTRADITÓRIO)
✗ conclusão = cópia literal da frase descritiva do corpo.

EXEMPLO CORRETO (tendinopatia + calcificação, SEM ruptura → 2 itens):
CONCLUSÃO:
1) Tendinopatia do tendão supraespinhal com calcificação à direita.
2) Não há sinais de ruptura do manguito rotador à direita.

EXEMPLO CORRETO (COM ruptura parcial → SEM frase de tranquilização):
CONCLUSÃO:
Ruptura parcial do tendão supraespinhal à direita.$c$, version = version + 1, updated_at = now()
   where id = 'd5b2ef5a-c3de-4b6c-aa12-96538a262236' and status = 'validated' and md5(content) = '486e374ab0de3599e71c9598a4d62fa2';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'd5b2ef5a-c3de-4b6c-aa12-96538a262236', n; end if;
  -- OCULAR CLASSICO_COMPLETO regra ocular-regra-hemorragia-vitrea: ecogenico-sozinho: ecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hemorragia vítrea
- ecos vítreos

REGRA — HEMORRAGIA VÍTREA

No corpo:
"Pontos e membranas hiperecoicas móveis dispersos na câmara vítrea, sem aderência retiniana, compatíveis com hemorragia vítrea."

Na conclusão:
"Hemorragia vítrea."$c$, version = version + 1, updated_at = now()
   where id = '72735461-a2e8-449b-8def-2c7fcac799fa' and status = 'validated' and md5(content) = '0b880dc09333e1bb1f3c338370d3e955';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '72735461-a2e8-449b-8def-2c7fcac799fa', n; end if;
  -- OCULAR DIRETO_OBJETIVO regra ocular-regra-hemorragia-vitrea: ecogenico-sozinho: ecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hemorragia vítrea
- ecos vítreos

REGRA — HEMORRAGIA VÍTREA

No corpo:
"Pontos e membranas hiperecoicas móveis dispersos na câmara vítrea, sem aderência retiniana, compatíveis com hemorragia vítrea."

Na conclusão:
"Hemorragia vítrea."$c$, version = version + 1, updated_at = now()
   where id = 'af3ca6a0-080d-45c8-a234-94e921b75bc6' and status = 'validated' and md5(content) = '0b880dc09333e1bb1f3c338370d3e955';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'af3ca6a0-080d-45c8-a234-94e921b75bc6', n; end if;
  -- OCULAR DETALHADO_PROTOCOLAR regra ocular-regra-hemorragia-vitrea: ecogenico-sozinho: ecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hemorragia vítrea
- ecos vítreos

REGRA — HEMORRAGIA VÍTREA

No corpo:
"Pontos e membranas hiperecoicas móveis dispersos na câmara vítrea, sem aderência retiniana, compatíveis com hemorragia vítrea."

Na conclusão:
"Hemorragia vítrea."$c$, version = version + 1, updated_at = now()
   where id = '36fb8b41-537d-42d4-aeba-da457318a6de' and status = 'validated' and md5(content) = '0b880dc09333e1bb1f3c338370d3e955';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '36fb8b41-537d-42d4-aeba-da457318a6de', n; end if;
  -- OCULAR OBJETIVO regra ocular-regra-hemorragia-vitrea: ecogenico-sozinho: ecogênicas → hiperecoicas
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- hemorragia vítrea
- ecos vítreos

REGRA — HEMORRAGIA VÍTREA

No corpo:
"Pontos e membranas hiperecoicas móveis dispersos na câmara vítrea, sem aderência retiniana, compatíveis com hemorragia vítrea."

Na conclusão:
"Hemorragia vítrea."$c$, version = version + 1, updated_at = now()
   where id = '2648ef76-4928-49af-ad34-83a625a60576' and status = 'validated' and md5(content) = '0b880dc09333e1bb1f3c338370d3e955';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2648ef76-4928-49af-ad34-83a625a60576', n; end if;
  -- REGIAO_INGUINAL CLASSICO_COMPLETO regra regiao-inguinal-regra-linfonodos-inguinais: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- linfonodo inguinal
- íngua

REGRA — LINFONODOS INGUINAIS

No corpo:
"Linfonodos inguinais de morfologia preservada, com hilo hiperecoico mantido, o maior medindo ___."

Na conclusão:
"Linfonodos inguinais de aspecto reacional."$c$, version = version + 1, updated_at = now()
   where id = 'eab48eff-be95-49ea-9a18-28d7d11d8856' and status = 'validated' and md5(content) = 'e6749ce9d7d8b8e33af75a62da4c8bb9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'eab48eff-be95-49ea-9a18-28d7d11d8856', n; end if;
  -- REGIAO_INGUINAL DIRETO_OBJETIVO regra regiao-inguinal-regra-linfonodos-inguinais: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- linfonodo inguinal
- íngua

REGRA — LINFONODOS INGUINAIS

No corpo:
"Linfonodos inguinais de morfologia preservada, com hilo hiperecoico mantido, o maior medindo ___."

Na conclusão:
"Linfonodos inguinais de aspecto reacional."$c$, version = version + 1, updated_at = now()
   where id = 'c76f3deb-1770-4822-bcfb-b77a0543c592' and status = 'validated' and md5(content) = 'e6749ce9d7d8b8e33af75a62da4c8bb9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c76f3deb-1770-4822-bcfb-b77a0543c592', n; end if;
  -- REGIAO_INGUINAL DETALHADO_PROTOCOLAR regra regiao-inguinal-regra-linfonodos-inguinais: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- linfonodo inguinal
- íngua

REGRA — LINFONODOS INGUINAIS

No corpo:
"Linfonodos inguinais de morfologia preservada, com hilo hiperecoico mantido, o maior medindo ___."

Na conclusão:
"Linfonodos inguinais de aspecto reacional."$c$, version = version + 1, updated_at = now()
   where id = 'f0f5210b-5350-4e51-a4c8-415bc7d00365' and status = 'validated' and md5(content) = 'e6749ce9d7d8b8e33af75a62da4c8bb9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'f0f5210b-5350-4e51-a4c8-415bc7d00365', n; end if;
  -- REGIAO_INGUINAL OBJETIVO regra regiao-inguinal-regra-linfonodos-inguinais: ecogenico-sozinho: ecogênico → hiperecoico
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- linfonodo inguinal
- íngua

REGRA — LINFONODOS INGUINAIS

No corpo:
"Linfonodos inguinais de morfologia preservada, com hilo hiperecoico mantido, o maior medindo ___."

Na conclusão:
"Linfonodos inguinais de aspecto reacional."$c$, version = version + 1, updated_at = now()
   where id = '0847e4a4-c251-491e-9cee-f1f0905a6bca' and status = 'validated' and md5(content) = 'e6749ce9d7d8b8e33af75a62da4c8bb9';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '0847e4a4-c251-491e-9cee-f1f0905a6bca', n; end if;
  -- VIAS_URINARIAS CLASSICO_COMPLETO regra vias-urinarias-regra-patologias-variantes: ecoico-sem-acento: hiperecóica → hiperecoica · ecoico-sem-acento: hiperecóica → hiperecoica
  update knowledge_blocks set content = $c$PATOLOGIAS — COMO ADAPTAR O TEXTO

CISTO RENAL SIMPLES
Modificar a descrição do rim: apresentando imagem anecoica cortical, de margens regulares, medindo X.X x X.X x X.X cm, situada no polo inferior, ocasionando reforço acústico posterior.
Conclusão: 1) Cisto simples no rim direito.

LITÍASE RENAL
Adicionar após descrição renal: Imagem hiperecoica medindo X.X cm em seu maior eixo, situada em cálices superiores/médios/inferiores, ocasionando sombra acústica posterior.
Se Doppler: ocasionando artefato de cintilação (twinkling).
Conclusão: 1) Litíase renal direita.

LITÍASE EM JUNÇÃO URETEROPIÉLICA
Imagem hiperecoica situada na junção ureteropiélica, medindo X.X cm.
Conclusão: Litíase renal direita com cálculo situado na junção ureteropiélica.

HIDRONEFROSE
após "apresentando", em cada rim, acrescentar "imagens anecoicas no sistema pielocalicial.
Conclusão: Hidronefrose leve. / Hidronefrose moderada. / Hidronefrose acentuada.

DOENÇA RENAL CRÔNICA
Rim direito de dimensões reduzidas, apresentando aumento difuso da ecogenicidade parenquimatosa, ocasionando redução da diferenciação córtico-medular.
Rim esquerdo de dimensões reduzidas, apresentando aumento difuso da ecogenicidade parenquimatosa, ocasionando redução da diferenciação córtico-medular.
Conclusão: Sinais de nefropatia parenquimatosa crônica.

PIELONEFRITE (SUSPEITA)
Rim apresentando áreas hipoecoicas mal delimitadas no parênquima.
Conclusão: Achados que podem estar relacionados a processo inflamatório renal. Como a paciente refere febre e leucocitose, o diagnóstico mais provável é pielonefrite.

BEXIGA ESPESSADA
Bexiga de contornos regulares, apresentando espessamento difuso da parede vesical.
Conclusão: Espessamento da parede vesical.

BEXIGOMA
Bexiga urinária distendida, com volume estimado acima dos limites usuais.
Conclusão: Bexigoma.$c$, version = version + 1, updated_at = now()
   where id = '493c5870-075a-462d-aa7f-24f2089ebb55' and status = 'validated' and md5(content) = '390e6a01e5862d41c7b67b071b05f6f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '493c5870-075a-462d-aa7f-24f2089ebb55', n; end if;
  -- VIAS_URINARIAS DIRETO_OBJETIVO regra vias-urinarias-regra-patologias-variantes: ecoico-sem-acento: hiperecóica → hiperecoica · ecoico-sem-acento: hiperecóica → hiperecoica
  update knowledge_blocks set content = $c$PATOLOGIAS — COMO ADAPTAR O TEXTO

CISTO RENAL SIMPLES
Modificar a descrição do rim: apresentando imagem anecoica cortical, de margens regulares, medindo X.X x X.X x X.X cm, situada no polo inferior, ocasionando reforço acústico posterior.
Conclusão: 1) Cisto simples no rim direito.

LITÍASE RENAL
Adicionar após descrição renal: Imagem hiperecoica medindo X.X cm em seu maior eixo, situada em cálices superiores/médios/inferiores, ocasionando sombra acústica posterior.
Se Doppler: ocasionando artefato de cintilação (twinkling).
Conclusão: 1) Litíase renal direita.

LITÍASE EM JUNÇÃO URETEROPIÉLICA
Imagem hiperecoica situada na junção ureteropiélica, medindo X.X cm.
Conclusão: Litíase renal direita com cálculo situado na junção ureteropiélica.

HIDRONEFROSE
após "apresentando", em cada rim, acrescentar "imagens anecoicas no sistema pielocalicial.
Conclusão: Hidronefrose leve. / Hidronefrose moderada. / Hidronefrose acentuada.

DOENÇA RENAL CRÔNICA
Rim direito de dimensões reduzidas, apresentando aumento difuso da ecogenicidade parenquimatosa, ocasionando redução da diferenciação córtico-medular.
Rim esquerdo de dimensões reduzidas, apresentando aumento difuso da ecogenicidade parenquimatosa, ocasionando redução da diferenciação córtico-medular.
Conclusão: Sinais de nefropatia parenquimatosa crônica.

PIELONEFRITE (SUSPEITA)
Rim apresentando áreas hipoecoicas mal delimitadas no parênquima.
Conclusão: Achados que podem estar relacionados a processo inflamatório renal. Como a paciente refere febre e leucocitose, o diagnóstico mais provável é pielonefrite.

BEXIGA ESPESSADA
Bexiga de contornos regulares, apresentando espessamento difuso da parede vesical.
Conclusão: Espessamento da parede vesical.

BEXIGOMA
Bexiga urinária distendida, com volume estimado acima dos limites usuais.
Conclusão: Bexigoma.$c$, version = version + 1, updated_at = now()
   where id = '1ed3f508-5d6f-4ee6-8c18-5503ee690cf6' and status = 'validated' and md5(content) = '390e6a01e5862d41c7b67b071b05f6f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '1ed3f508-5d6f-4ee6-8c18-5503ee690cf6', n; end if;
  -- VIAS_URINARIAS DETALHADO_PROTOCOLAR regra vias-urinarias-regra-patologias-variantes: ecoico-sem-acento: hiperecóica → hiperecoica · ecoico-sem-acento: hiperecóica → hiperecoica
  update knowledge_blocks set content = $c$PATOLOGIAS — COMO ADAPTAR O TEXTO

CISTO RENAL SIMPLES
Modificar a descrição do rim: apresentando imagem anecoica cortical, de margens regulares, medindo X.X x X.X x X.X cm, situada no polo inferior, ocasionando reforço acústico posterior.
Conclusão: 1) Cisto simples no rim direito.

LITÍASE RENAL
Adicionar após descrição renal: Imagem hiperecoica medindo X.X cm em seu maior eixo, situada em cálices superiores/médios/inferiores, ocasionando sombra acústica posterior.
Se Doppler: ocasionando artefato de cintilação (twinkling).
Conclusão: 1) Litíase renal direita.

LITÍASE EM JUNÇÃO URETEROPIÉLICA
Imagem hiperecoica situada na junção ureteropiélica, medindo X.X cm.
Conclusão: Litíase renal direita com cálculo situado na junção ureteropiélica.

HIDRONEFROSE
após "apresentando", em cada rim, acrescentar "imagens anecoicas no sistema pielocalicial.
Conclusão: Hidronefrose leve. / Hidronefrose moderada. / Hidronefrose acentuada.

DOENÇA RENAL CRÔNICA
Rim direito de dimensões reduzidas, apresentando aumento difuso da ecogenicidade parenquimatosa, ocasionando redução da diferenciação córtico-medular.
Rim esquerdo de dimensões reduzidas, apresentando aumento difuso da ecogenicidade parenquimatosa, ocasionando redução da diferenciação córtico-medular.
Conclusão: Sinais de nefropatia parenquimatosa crônica.

PIELONEFRITE (SUSPEITA)
Rim apresentando áreas hipoecoicas mal delimitadas no parênquima.
Conclusão: Achados que podem estar relacionados a processo inflamatório renal. Como a paciente refere febre e leucocitose, o diagnóstico mais provável é pielonefrite.

BEXIGA ESPESSADA
Bexiga de contornos regulares, apresentando espessamento difuso da parede vesical.
Conclusão: Espessamento da parede vesical.

BEXIGOMA
Bexiga urinária distendida, com volume estimado acima dos limites usuais.
Conclusão: Bexigoma.$c$, version = version + 1, updated_at = now()
   where id = 'dac6fe10-f116-4e43-bc5f-46e1a4db5ef8' and status = 'validated' and md5(content) = '390e6a01e5862d41c7b67b071b05f6f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'dac6fe10-f116-4e43-bc5f-46e1a4db5ef8', n; end if;
end
$termos$;
commit;
