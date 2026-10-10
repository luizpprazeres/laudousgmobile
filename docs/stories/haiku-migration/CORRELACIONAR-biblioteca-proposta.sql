-- CORRELACIONAR (decisão do Luiz 10/10: "Correlacionar com dados clínicos" só quando ditado) — PROPOSTA, NÃO APLICADA.
-- Gerada por apps/api/scripts/bench-haiku/correlacionar-biblioteca.ts a partir de knowledge_blocks (status validated)
-- com a tabela curada de trocas exatas (a mesma aplicada aos snippets do repositório).
-- 74 blocos de 1106 validados. Condutas específicas (PSA, marcadores, TSH…) ficam.
-- GUARDAS: cada UPDATE exige id, status validated E md5 do conteúdo lido em 2026-10-10;
-- se qualquer bloco tiver mudado desde então, a transação inteira aborta (nada é aplicado).
-- 20 destes blocos também estão na proposta dos TERMOS: aplicada uma, regenere a outra (o script relê o banco).
-- O embedding não é recalculado (frase de conduta retirada; reingestão opcional).
begin;
do $correlacionar$
declare n int;
begin
  -- ABDOMEN_SUPERIOR CLASSICO_COMPLETO conclusao abdomen-superior-conclusao-com-recomendacao-clinica: trocas 21
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Massa hepática indeterminada / múltipla**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética de abdome com contraste, com objetivo de continuar a investigação."

2. **Lesão hepática sugestiva de hemangioma**:
   "Convém, a critério clínico, complementar com ressonância magnética de abdome para confirmação."

3. **Cisto hepático com septações / parede espessada**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética para melhor caracterização."

4. **Dilatação biliar com suspeita de obstrução**:
   "Convém, a critério clínico, complementação com colangio-ressonância e avaliação clínica."

5. **Pâncreas parcialmente avaliado em paciente com queixa pancreática**:
   "Convém, a critério clínico, complementação com tomografia computadorizada ou ressonância magnética, com objetivo de melhor avaliar o parênquima pancreático."

6. **Esplenomegalia significativa**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

7. **Esteatose hepática acentuada em paciente com fatores de risco**:
   "Convém, a critério clínico, correlacionar com perfil metabólico (lipídico, glicemia) e função hepática."

Boa prática: anexar a recomendação ao MESMO item numerado do achado.$c$, version = version + 1, updated_at = now()
   where id = 'fde32c7d-a097-4103-aa41-83d970ba2543' and status = 'validated' and md5(content) = '6e204dc64ef72c6230cdb107036205ba';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'fde32c7d-a097-4103-aa41-83d970ba2543', n; end if;
  -- ABDOMEN_SUPERIOR DIRETO_OBJETIVO conclusao abdomen-superior-conclusao-com-recomendacao-clinica: trocas 21
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Massa hepática indeterminada / múltipla**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética de abdome com contraste, com objetivo de continuar a investigação."

2. **Lesão hepática sugestiva de hemangioma**:
   "Convém, a critério clínico, complementar com ressonância magnética de abdome para confirmação."

3. **Cisto hepático com septações / parede espessada**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética para melhor caracterização."

4. **Dilatação biliar com suspeita de obstrução**:
   "Convém, a critério clínico, complementação com colangio-ressonância e avaliação clínica."

5. **Pâncreas parcialmente avaliado em paciente com queixa pancreática**:
   "Convém, a critério clínico, complementação com tomografia computadorizada ou ressonância magnética, com objetivo de melhor avaliar o parênquima pancreático."

6. **Esplenomegalia significativa**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

7. **Esteatose hepática acentuada em paciente com fatores de risco**:
   "Convém, a critério clínico, correlacionar com perfil metabólico (lipídico, glicemia) e função hepática."

Boa prática: anexar a recomendação ao MESMO item numerado do achado.$c$, version = version + 1, updated_at = now()
   where id = 'ccbd7a45-f03b-4cc6-b27d-640061f8f8f9' and status = 'validated' and md5(content) = '6e204dc64ef72c6230cdb107036205ba';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'ccbd7a45-f03b-4cc6-b27d-640061f8f8f9', n; end if;
  -- ABDOMEN_SUPERIOR DETALHADO_PROTOCOLAR conclusao abdomen-superior-conclusao-com-recomendacao-clinica: trocas 21
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Massa hepática indeterminada / múltipla**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética de abdome com contraste, com objetivo de continuar a investigação."

2. **Lesão hepática sugestiva de hemangioma**:
   "Convém, a critério clínico, complementar com ressonância magnética de abdome para confirmação."

3. **Cisto hepático com septações / parede espessada**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética para melhor caracterização."

4. **Dilatação biliar com suspeita de obstrução**:
   "Convém, a critério clínico, complementação com colangio-ressonância e avaliação clínica."

5. **Pâncreas parcialmente avaliado em paciente com queixa pancreática**:
   "Convém, a critério clínico, complementação com tomografia computadorizada ou ressonância magnética, com objetivo de melhor avaliar o parênquima pancreático."

6. **Esplenomegalia significativa**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

7. **Esteatose hepática acentuada em paciente com fatores de risco**:
   "Convém, a critério clínico, correlacionar com perfil metabólico (lipídico, glicemia) e função hepática."

Boa prática: anexar a recomendação ao MESMO item numerado do achado.$c$, version = version + 1, updated_at = now()
   where id = '0cb63f76-7a60-4dfb-9f52-e21a380a1e6b' and status = 'validated' and md5(content) = '6e204dc64ef72c6230cdb107036205ba';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '0cb63f76-7a60-4dfb-9f52-e21a380a1e6b', n; end if;
  -- ABDOMEN_SUPERIOR OBJETIVO conclusao abdomen-superior-conclusao-com-recomendacao-clinica: trocas 21
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Massa hepática indeterminada / múltipla**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética de abdome com contraste, com objetivo de continuar a investigação."

2. **Lesão hepática sugestiva de hemangioma**:
   "Convém, a critério clínico, complementar com ressonância magnética de abdome para confirmação."

3. **Cisto hepático com septações / parede espessada**:
   "Convém, a critério clínico, complementar com tomografia ou ressonância magnética para melhor caracterização."

4. **Dilatação biliar com suspeita de obstrução**:
   "Convém, a critério clínico, complementação com colangio-ressonância e avaliação clínica."

5. **Pâncreas parcialmente avaliado em paciente com queixa pancreática**:
   "Convém, a critério clínico, complementação com tomografia computadorizada ou ressonância magnética, com objetivo de melhor avaliar o parênquima pancreático."

6. **Esplenomegalia significativa**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

7. **Esteatose hepática acentuada em paciente com fatores de risco**:
   "Convém, a critério clínico, correlacionar com perfil metabólico (lipídico, glicemia) e função hepática."

Boa prática: anexar a recomendação ao MESMO item numerado do achado.$c$, version = version + 1, updated_at = now()
   where id = 'c2270dc8-8582-4812-af22-364d0f407e49' and status = 'validated' and md5(content) = '6e204dc64ef72c6230cdb107036205ba';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c2270dc8-8582-4812-af22-364d0f407e49', n; end if;
  -- ABDOMEN_SUPERIOR CLASSICO_COMPLETO regra abdomen-superior-regra-esplenomegalia: trocas 4,30
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esplenomegalia
- baço aumentado
- volume esplênico aumentado

REGRA — ESPLENOMEGALIA

Referência: maior eixo do baço habitualmente até 12 cm em adultos.

Descrição obrigatória no corpo:
"Baço de dimensões aumentadas, com ecotextura sólida e homogênea, medindo 14,5 x 6,8 cm em seus maiores eixos. Sem lesões focais identificadas no presente estudo."

Na conclusão (numerada):
- "x)    Esplenomegalia (vide medidas)."

Possíveis causas (contexto para o redator, não vão para o laudo sem ditado):
- Hipertensão portal (cirrose hepática).
- Doenças hematológicas (linfoma, leucemia, talassemia).
- Doenças infecciosas (mononucleose, malária).
- Doenças de depósito.

Quando houver sinais ecográficos associados a hipertensão portal (dilatação da veia porta > 13 mm, circulação colateral, ascite), descrever separadamente e mencionar a suspeita na conclusão.$c$, version = version + 1, updated_at = now()
   where id = '4a3f5e09-a9ac-42d4-999b-21a959ee6d22' and status = 'validated' and md5(content) = '00bd11e7613ca52e8ce226e16a527b89';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '4a3f5e09-a9ac-42d4-999b-21a959ee6d22', n; end if;
  -- ABDOMEN_SUPERIOR DIRETO_OBJETIVO regra abdomen-superior-regra-esplenomegalia: trocas 4,30
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esplenomegalia
- baço aumentado
- volume esplênico aumentado

REGRA — ESPLENOMEGALIA

Referência: maior eixo do baço habitualmente até 12 cm em adultos.

Descrição obrigatória no corpo:
"Baço de dimensões aumentadas, com ecotextura sólida e homogênea, medindo 14,5 x 6,8 cm em seus maiores eixos. Sem lesões focais identificadas no presente estudo."

Na conclusão (numerada):
- "x)    Esplenomegalia (vide medidas)."

Possíveis causas (contexto para o redator, não vão para o laudo sem ditado):
- Hipertensão portal (cirrose hepática).
- Doenças hematológicas (linfoma, leucemia, talassemia).
- Doenças infecciosas (mononucleose, malária).
- Doenças de depósito.

Quando houver sinais ecográficos associados a hipertensão portal (dilatação da veia porta > 13 mm, circulação colateral, ascite), descrever separadamente e mencionar a suspeita na conclusão.$c$, version = version + 1, updated_at = now()
   where id = 'd2880e3d-cf8f-4a54-8667-8a2babb675a2' and status = 'validated' and md5(content) = '00bd11e7613ca52e8ce226e16a527b89';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'd2880e3d-cf8f-4a54-8667-8a2babb675a2', n; end if;
  -- ABDOMEN_SUPERIOR DETALHADO_PROTOCOLAR regra abdomen-superior-regra-esplenomegalia: trocas 4,30
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esplenomegalia
- baço aumentado
- volume esplênico aumentado

REGRA — ESPLENOMEGALIA

Referência: maior eixo do baço habitualmente até 12 cm em adultos.

Descrição obrigatória no corpo:
"Baço de dimensões aumentadas, com ecotextura sólida e homogênea, medindo 14,5 x 6,8 cm em seus maiores eixos. Sem lesões focais identificadas no presente estudo."

Na conclusão (numerada):
- "x)    Esplenomegalia (vide medidas)."

Possíveis causas (contexto para o redator, não vão para o laudo sem ditado):
- Hipertensão portal (cirrose hepática).
- Doenças hematológicas (linfoma, leucemia, talassemia).
- Doenças infecciosas (mononucleose, malária).
- Doenças de depósito.

Quando houver sinais ecográficos associados a hipertensão portal (dilatação da veia porta > 13 mm, circulação colateral, ascite), descrever separadamente e mencionar a suspeita na conclusão.$c$, version = version + 1, updated_at = now()
   where id = '505da952-7685-430b-b2aa-b3aafc25a390' and status = 'validated' and md5(content) = '00bd11e7613ca52e8ce226e16a527b89';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '505da952-7685-430b-b2aa-b3aafc25a390', n; end if;
  -- ABDOMEN_SUPERIOR OBJETIVO regra abdomen-superior-regra-esplenomegalia: trocas 4,30
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- esplenomegalia
- baço aumentado
- volume esplênico aumentado

REGRA — ESPLENOMEGALIA

Referência: maior eixo do baço habitualmente até 12 cm em adultos.

Descrição obrigatória no corpo:
"Baço de dimensões aumentadas, com ecotextura sólida e homogênea, medindo 14,5 x 6,8 cm em seus maiores eixos. Sem lesões focais identificadas no presente estudo."

Na conclusão (numerada):
- "x)    Esplenomegalia (vide medidas)."

Possíveis causas (contexto para o redator, não vão para o laudo sem ditado):
- Hipertensão portal (cirrose hepática).
- Doenças hematológicas (linfoma, leucemia, talassemia).
- Doenças infecciosas (mononucleose, malária).
- Doenças de depósito.

Quando houver sinais ecográficos associados a hipertensão portal (dilatação da veia porta > 13 mm, circulação colateral, ascite), descrever separadamente e mencionar a suspeita na conclusão.$c$, version = version + 1, updated_at = now()
   where id = '827ddfb0-45bc-46f0-9a26-ca38b1973b55' and status = 'validated' and md5(content) = '00bd11e7613ca52e8ce226e16a527b89';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '827ddfb0-45bc-46f0-9a26-ca38b1973b55', n; end if;
  -- CERVICAL CLASSICO_COMPLETO modelo cervical-modelo-template-padrao: trocas 12
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
Conclusão: "Linfonodo de aspecto suspeito no nível ___."$c$, version = version + 1, updated_at = now()
   where id = '197b8dc2-0175-4148-beea-8a0ba9289b8c' and status = 'validated' and md5(content) = '18aa93067210645f3412798c7a979260';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '197b8dc2-0175-4148-beea-8a0ba9289b8c', n; end if;
  -- CERVICAL DIRETO_OBJETIVO modelo cervical-modelo-template-padrao: trocas 12
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
Conclusão: "Linfonodo de aspecto suspeito no nível ___."$c$, version = version + 1, updated_at = now()
   where id = 'b78e7737-4a2e-42b8-bf59-59c54862a9d2' and status = 'validated' and md5(content) = '18aa93067210645f3412798c7a979260';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'b78e7737-4a2e-42b8-bf59-59c54862a9d2', n; end if;
  -- CERVICAL DETALHADO_PROTOCOLAR modelo cervical-modelo-template-padrao: trocas 12
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
Conclusão: "Linfonodo de aspecto suspeito no nível ___."$c$, version = version + 1, updated_at = now()
   where id = '15b34dfd-21e7-4ab3-bda4-37ba86962eb9' and status = 'validated' and md5(content) = '18aa93067210645f3412798c7a979260';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '15b34dfd-21e7-4ab3-bda4-37ba86962eb9', n; end if;
  -- CERVICAL OBJETIVO modelo cervical-modelo-template-padrao: trocas 12
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
Conclusão: "Linfonodo de aspecto suspeito no nível ___."$c$, version = version + 1, updated_at = now()
   where id = '94a5d58d-ec4e-4025-bce3-1dc0dba16ee0' and status = 'validated' and md5(content) = '18aa93067210645f3412798c7a979260';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '94a5d58d-ec4e-4025-bce3-1dc0dba16ee0', n; end if;
  -- CERVICAL CLASSICO_COMPLETO regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: trocas 27,28
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

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa):
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
- Recomendação (exames laboratoriais; TC cervical ou biópsia por agulha fina; correlação clínica) só quando o médico ditar, na redação dele. NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = 'c3845acc-0ec7-45ea-b5f1-637f047851ff' and status = 'validated' and md5(content) = '323a4843e7579c8e15bb7d7a300a02c7';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c3845acc-0ec7-45ea-b5f1-637f047851ff', n; end if;
  -- CERVICAL DIRETO_OBJETIVO regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: trocas 27,28
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

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa):
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
- Recomendação (exames laboratoriais; TC cervical ou biópsia por agulha fina; correlação clínica) só quando o médico ditar, na redação dele. NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = '63fff88e-ef5b-4362-908e-5b7ef10dda8e' and status = 'validated' and md5(content) = '323a4843e7579c8e15bb7d7a300a02c7';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '63fff88e-ef5b-4362-908e-5b7ef10dda8e', n; end if;
  -- CERVICAL DETALHADO_PROTOCOLAR regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: trocas 27,28
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

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa):
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
- Recomendação (exames laboratoriais; TC cervical ou biópsia por agulha fina; correlação clínica) só quando o médico ditar, na redação dele. NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = '7cd9440a-74e8-497f-b30d-83618e998a90' and status = 'validated' and md5(content) = '323a4843e7579c8e15bb7d7a300a02c7';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7cd9440a-74e8-497f-b30d-83618e998a90', n; end if;
  -- CERVICAL OBJETIVO regra cervical-regra-criterios-linfonodo-normal-vs-suspeito: trocas 27,28
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

SINAIS DE ALTA RELEVÂNCIA (presença merece descrição cuidadosa):
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
- Recomendação (exames laboratoriais; TC cervical ou biópsia por agulha fina; correlação clínica) só quando o médico ditar, na redação dele. NÃO inventar outras condutas (ex.: exérese, esvaziamento cervical).$c$, version = version + 1, updated_at = now()
   where id = 'c90e6293-22d3-49a9-9405-1a6d8be66c16' and status = 'validated' and md5(content) = '323a4843e7579c8e15bb7d7a300a02c7';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c90e6293-22d3-49a9-9405-1a6d8be66c16', n; end if;
  -- DOPPLER_ARTERIAL_MMII CLASSICO_COMPLETO conclusao doppler-arterial-mmii-conclusao-oclusao-sem-clti: trocas 10,11
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "oclusão arterial", "oclusão femoral", "oclusão poplítea", "oclusão tibial", "DAOP grave", "ITB muito reduzido", "estenose subocclusiva", "achado grave assintomático", "DAOP avançada sem clínica", "ITB < 0,4 sem clínica".

CONCLUSÃO — OCLUSÃO/DAOP GRAVE HEMODINÂMICA SEM QUADRO DE CLTI

USE ESTE BLOCO quando há achado hemodinâmico grave (oclusão, ITB < 0,40 ou múltiplas estenoses significativas) MAS o médico NÃO mencionou clínica de CLTI (dor isquêmica em repouso ≥ 2 semanas, úlcera arterial ou gangrena).

DAOP grave + clínica de CLTI documentada → bloco "isquemia-critica".
DAOP grave sem clínica de CLTI documentada → este bloco.

FRASE VERBATIM — conclusão em PROSA CORRIDA (sem bullets/itens no laudo):

"X) Oclusão/estenose hemodinamicamente significativa em ___, com padrão espectral monofásico nos segmentos distais à obstrução e índice tornozelo-braquial reduzido (___ à direita, ___ à esquerda). O diagnóstico mais provável é doença arterial obstrutiva periférica grave."

"X) Convém, a critério clínico, prosseguir a avaliação com cirurgião vascular para definição de conduta."

═══════════════════════════════════════════════════
JUSTIFICATIVA PARA SEPARAÇÃO
═══════════════════════════════════════════════════

CLTI é diagnóstico CLÍNICO-HEMODINÂMICO (Global Vascular Guidelines 2019). Achado hemodinâmico isolado NÃO autoriza rotular como CLTI:
- Paciente com oclusão crônica de longa data pode ter colaterais bem desenvolvidas e estar assintomático ou claudicante.
- Rotular como CLTI sem clínica gera viés interpretativo e comunicação imprecisa com o médico assistente.

═══════════════════════════════════════════════════
QUANDO ESCALAR PARA CIRURGIÃO VASCULAR (SEM USAR "URGENTE")
═══════════════════════════════════════════════════

- Achado hemodinâmico grave + ausência de queixa clínica documentada: sugerir avaliação por cirurgião vascular (sem rotular como urgência).
- Se médico mencionar piora recente, claudicação severa ou outro sinal de alarme: ajustar tom (definição de urgência).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar Rutherford/Fontaine sem clínica explícita.
- Não recomendar tipo específico de intervenção (revascularização endovascular, by-pass).
- Não inferir prognóstico do membro.
- Não rotular como CLTI/isquemia crítica sem clínica documentada.$c$, version = version + 1, updated_at = now()
   where id = 'ad5be79b-03d1-49cd-bb3f-7fad086112e2' and status = 'validated' and md5(content) = '3b3ed2d4bb89c63bde8c9e21899f6daf';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'ad5be79b-03d1-49cd-bb3f-7fad086112e2', n; end if;
  -- DOPPLER_ARTERIAL_MMII DIRETO_OBJETIVO conclusao doppler-arterial-mmii-conclusao-oclusao-sem-clti: trocas 10,11
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "oclusão arterial", "oclusão femoral", "oclusão poplítea", "oclusão tibial", "DAOP grave", "ITB muito reduzido", "estenose subocclusiva", "achado grave assintomático", "DAOP avançada sem clínica", "ITB < 0,4 sem clínica".

CONCLUSÃO — OCLUSÃO/DAOP GRAVE HEMODINÂMICA SEM QUADRO DE CLTI

USE ESTE BLOCO quando há achado hemodinâmico grave (oclusão, ITB < 0,40 ou múltiplas estenoses significativas) MAS o médico NÃO mencionou clínica de CLTI (dor isquêmica em repouso ≥ 2 semanas, úlcera arterial ou gangrena).

DAOP grave + clínica de CLTI documentada → bloco "isquemia-critica".
DAOP grave sem clínica de CLTI documentada → este bloco.

FRASE VERBATIM — conclusão em PROSA CORRIDA (sem bullets/itens no laudo):

"X) Oclusão/estenose hemodinamicamente significativa em ___, com padrão espectral monofásico nos segmentos distais à obstrução e índice tornozelo-braquial reduzido (___ à direita, ___ à esquerda). O diagnóstico mais provável é doença arterial obstrutiva periférica grave."

"X) Convém, a critério clínico, prosseguir a avaliação com cirurgião vascular para definição de conduta."

═══════════════════════════════════════════════════
JUSTIFICATIVA PARA SEPARAÇÃO
═══════════════════════════════════════════════════

CLTI é diagnóstico CLÍNICO-HEMODINÂMICO (Global Vascular Guidelines 2019). Achado hemodinâmico isolado NÃO autoriza rotular como CLTI:
- Paciente com oclusão crônica de longa data pode ter colaterais bem desenvolvidas e estar assintomático ou claudicante.
- Rotular como CLTI sem clínica gera viés interpretativo e comunicação imprecisa com o médico assistente.

═══════════════════════════════════════════════════
QUANDO ESCALAR PARA CIRURGIÃO VASCULAR (SEM USAR "URGENTE")
═══════════════════════════════════════════════════

- Achado hemodinâmico grave + ausência de queixa clínica documentada: sugerir avaliação por cirurgião vascular (sem rotular como urgência).
- Se médico mencionar piora recente, claudicação severa ou outro sinal de alarme: ajustar tom (definição de urgência).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar Rutherford/Fontaine sem clínica explícita.
- Não recomendar tipo específico de intervenção (revascularização endovascular, by-pass).
- Não inferir prognóstico do membro.
- Não rotular como CLTI/isquemia crítica sem clínica documentada.$c$, version = version + 1, updated_at = now()
   where id = '4ca9fa0d-d83b-4251-bf20-20019ccf432a' and status = 'validated' and md5(content) = '3b3ed2d4bb89c63bde8c9e21899f6daf';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '4ca9fa0d-d83b-4251-bf20-20019ccf432a', n; end if;
  -- DOPPLER_ARTERIAL_MMII DETALHADO_PROTOCOLAR conclusao doppler-arterial-mmii-conclusao-oclusao-sem-clti: trocas 10,11
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "oclusão arterial", "oclusão femoral", "oclusão poplítea", "oclusão tibial", "DAOP grave", "ITB muito reduzido", "estenose subocclusiva", "achado grave assintomático", "DAOP avançada sem clínica", "ITB < 0,4 sem clínica".

CONCLUSÃO — OCLUSÃO/DAOP GRAVE HEMODINÂMICA SEM QUADRO DE CLTI

USE ESTE BLOCO quando há achado hemodinâmico grave (oclusão, ITB < 0,40 ou múltiplas estenoses significativas) MAS o médico NÃO mencionou clínica de CLTI (dor isquêmica em repouso ≥ 2 semanas, úlcera arterial ou gangrena).

DAOP grave + clínica de CLTI documentada → bloco "isquemia-critica".
DAOP grave sem clínica de CLTI documentada → este bloco.

FRASE VERBATIM — conclusão em PROSA CORRIDA (sem bullets/itens no laudo):

"X) Oclusão/estenose hemodinamicamente significativa em ___, com padrão espectral monofásico nos segmentos distais à obstrução e índice tornozelo-braquial reduzido (___ à direita, ___ à esquerda). O diagnóstico mais provável é doença arterial obstrutiva periférica grave."

"X) Convém, a critério clínico, prosseguir a avaliação com cirurgião vascular para definição de conduta."

═══════════════════════════════════════════════════
JUSTIFICATIVA PARA SEPARAÇÃO
═══════════════════════════════════════════════════

CLTI é diagnóstico CLÍNICO-HEMODINÂMICO (Global Vascular Guidelines 2019). Achado hemodinâmico isolado NÃO autoriza rotular como CLTI:
- Paciente com oclusão crônica de longa data pode ter colaterais bem desenvolvidas e estar assintomático ou claudicante.
- Rotular como CLTI sem clínica gera viés interpretativo e comunicação imprecisa com o médico assistente.

═══════════════════════════════════════════════════
QUANDO ESCALAR PARA CIRURGIÃO VASCULAR (SEM USAR "URGENTE")
═══════════════════════════════════════════════════

- Achado hemodinâmico grave + ausência de queixa clínica documentada: sugerir avaliação por cirurgião vascular (sem rotular como urgência).
- Se médico mencionar piora recente, claudicação severa ou outro sinal de alarme: ajustar tom (definição de urgência).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar Rutherford/Fontaine sem clínica explícita.
- Não recomendar tipo específico de intervenção (revascularização endovascular, by-pass).
- Não inferir prognóstico do membro.
- Não rotular como CLTI/isquemia crítica sem clínica documentada.$c$, version = version + 1, updated_at = now()
   where id = '32159a6c-c96a-4c82-a236-0699397ad03e' and status = 'validated' and md5(content) = '3b3ed2d4bb89c63bde8c9e21899f6daf';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '32159a6c-c96a-4c82-a236-0699397ad03e', n; end if;
  -- DOPPLER_ARTERIAL_MMII OBJETIVO conclusao doppler-arterial-mmii-conclusao-oclusao-sem-clti: trocas 10,11
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "oclusão arterial", "oclusão femoral", "oclusão poplítea", "oclusão tibial", "DAOP grave", "ITB muito reduzido", "estenose subocclusiva", "achado grave assintomático", "DAOP avançada sem clínica", "ITB < 0,4 sem clínica".

CONCLUSÃO — OCLUSÃO/DAOP GRAVE HEMODINÂMICA SEM QUADRO DE CLTI

USE ESTE BLOCO quando há achado hemodinâmico grave (oclusão, ITB < 0,40 ou múltiplas estenoses significativas) MAS o médico NÃO mencionou clínica de CLTI (dor isquêmica em repouso ≥ 2 semanas, úlcera arterial ou gangrena).

DAOP grave + clínica de CLTI documentada → bloco "isquemia-critica".
DAOP grave sem clínica de CLTI documentada → este bloco.

FRASE VERBATIM — conclusão em PROSA CORRIDA (sem bullets/itens no laudo):

"X) Oclusão/estenose hemodinamicamente significativa em ___, com padrão espectral monofásico nos segmentos distais à obstrução e índice tornozelo-braquial reduzido (___ à direita, ___ à esquerda). O diagnóstico mais provável é doença arterial obstrutiva periférica grave."

"X) Convém, a critério clínico, prosseguir a avaliação com cirurgião vascular para definição de conduta."

═══════════════════════════════════════════════════
JUSTIFICATIVA PARA SEPARAÇÃO
═══════════════════════════════════════════════════

CLTI é diagnóstico CLÍNICO-HEMODINÂMICO (Global Vascular Guidelines 2019). Achado hemodinâmico isolado NÃO autoriza rotular como CLTI:
- Paciente com oclusão crônica de longa data pode ter colaterais bem desenvolvidas e estar assintomático ou claudicante.
- Rotular como CLTI sem clínica gera viés interpretativo e comunicação imprecisa com o médico assistente.

═══════════════════════════════════════════════════
QUANDO ESCALAR PARA CIRURGIÃO VASCULAR (SEM USAR "URGENTE")
═══════════════════════════════════════════════════

- Achado hemodinâmico grave + ausência de queixa clínica documentada: sugerir avaliação por cirurgião vascular (sem rotular como urgência).
- Se médico mencionar piora recente, claudicação severa ou outro sinal de alarme: ajustar tom (definição de urgência).

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não classificar Rutherford/Fontaine sem clínica explícita.
- Não recomendar tipo específico de intervenção (revascularização endovascular, by-pass).
- Não inferir prognóstico do membro.
- Não rotular como CLTI/isquemia crítica sem clínica documentada.$c$, version = version + 1, updated_at = now()
   where id = '2a3ac1b1-355b-4d75-a3a8-9a4adac6a6f7' and status = 'validated' and md5(content) = '3b3ed2d4bb89c63bde8c9e21899f6daf';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2a3ac1b1-355b-4d75-a3a8-9a4adac6a6f7', n; end if;
  -- DOPPLER_FISTULA_AV CLASSICO_COMPLETO regra doppler-fistula-av-regra-fluxo-inadequado: trocas 7
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- baixo fluxo
- hiperfluxo
- fluxo volumétrico
- maturação

REGRA — FLUXO VOLUMÉTRICO INADEQUADO

No corpo:
"Fluxo volumétrico estimado em ___ ml/min na veia eferente, ___ (reduzido / elevado)."

Na conclusão:
"Fluxo volumétrico ___ da fístula."

Referência técnica:
- Maturação adequada para hemodiálise: fluxo > 500–600 ml/min, veia eferente > 6 mm de diâmetro e < 6 mm de profundidade ("regra dos 6").
- Baixo fluxo < 500 ml/min sugere risco de falência.
- Hiperfluxo > 2000 ml/min associa-se a risco de isquemia distal e sobrecarga cardíaca.$c$, version = version + 1, updated_at = now()
   where id = 'e4f92ba3-8aa6-42b5-9563-50f06dea44e0' and status = 'validated' and md5(content) = 'ac107d87165b101eb5f59d378fa54c3c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'e4f92ba3-8aa6-42b5-9563-50f06dea44e0', n; end if;
  -- DOPPLER_FISTULA_AV DIRETO_OBJETIVO regra doppler-fistula-av-regra-fluxo-inadequado: trocas 7
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- baixo fluxo
- hiperfluxo
- fluxo volumétrico
- maturação

REGRA — FLUXO VOLUMÉTRICO INADEQUADO

No corpo:
"Fluxo volumétrico estimado em ___ ml/min na veia eferente, ___ (reduzido / elevado)."

Na conclusão:
"Fluxo volumétrico ___ da fístula."

Referência técnica:
- Maturação adequada para hemodiálise: fluxo > 500–600 ml/min, veia eferente > 6 mm de diâmetro e < 6 mm de profundidade ("regra dos 6").
- Baixo fluxo < 500 ml/min sugere risco de falência.
- Hiperfluxo > 2000 ml/min associa-se a risco de isquemia distal e sobrecarga cardíaca.$c$, version = version + 1, updated_at = now()
   where id = '61b4f03a-dfce-400e-8997-7b4996eb5f75' and status = 'validated' and md5(content) = 'ac107d87165b101eb5f59d378fa54c3c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '61b4f03a-dfce-400e-8997-7b4996eb5f75', n; end if;
  -- DOPPLER_FISTULA_AV DETALHADO_PROTOCOLAR regra doppler-fistula-av-regra-fluxo-inadequado: trocas 7
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- baixo fluxo
- hiperfluxo
- fluxo volumétrico
- maturação

REGRA — FLUXO VOLUMÉTRICO INADEQUADO

No corpo:
"Fluxo volumétrico estimado em ___ ml/min na veia eferente, ___ (reduzido / elevado)."

Na conclusão:
"Fluxo volumétrico ___ da fístula."

Referência técnica:
- Maturação adequada para hemodiálise: fluxo > 500–600 ml/min, veia eferente > 6 mm de diâmetro e < 6 mm de profundidade ("regra dos 6").
- Baixo fluxo < 500 ml/min sugere risco de falência.
- Hiperfluxo > 2000 ml/min associa-se a risco de isquemia distal e sobrecarga cardíaca.$c$, version = version + 1, updated_at = now()
   where id = '1a176de8-5e5b-4fe6-9975-75646028bc92' and status = 'validated' and md5(content) = 'ac107d87165b101eb5f59d378fa54c3c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '1a176de8-5e5b-4fe6-9975-75646028bc92', n; end if;
  -- DOPPLER_FISTULA_AV OBJETIVO regra doppler-fistula-av-regra-fluxo-inadequado: trocas 7
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- baixo fluxo
- hiperfluxo
- fluxo volumétrico
- maturação

REGRA — FLUXO VOLUMÉTRICO INADEQUADO

No corpo:
"Fluxo volumétrico estimado em ___ ml/min na veia eferente, ___ (reduzido / elevado)."

Na conclusão:
"Fluxo volumétrico ___ da fístula."

Referência técnica:
- Maturação adequada para hemodiálise: fluxo > 500–600 ml/min, veia eferente > 6 mm de diâmetro e < 6 mm de profundidade ("regra dos 6").
- Baixo fluxo < 500 ml/min sugere risco de falência.
- Hiperfluxo > 2000 ml/min associa-se a risco de isquemia distal e sobrecarga cardíaca.$c$, version = version + 1, updated_at = now()
   where id = '58f9e53f-869a-402f-aafd-68d012ec0ff8' and status = 'validated' and md5(content) = 'ac107d87165b101eb5f59d378fa54c3c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '58f9e53f-869a-402f-aafd-68d012ec0ff8', n; end if;
  -- DOPPLER_RENAL CLASSICO_COMPLETO conclusao doppler-renal-conclusao-estenose-significativa: trocas 31
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "VPS > 250", "VPS maior que 250", "RAR > 3,2", "RAR maior que 3", "estenose renal significativa", "estenose hemodinamicamente significativa", "estenose ≥ 60%", "tardus-parvus", "tardus parvus", "padrão tardus", "ascensão sistólica retardada", "aceleração sistólica prolongada", "doença renovascular", "hipertensão renovascular".

CONCLUSÃO — ESTENOSE HEMODINAMICAMENTE SIGNIFICATIVA (≥ 60%)

Use as frases verbatim conforme cenário:

CENÁRIO 1 — Estenose unilateral confirmada (VPS > 250 cm/s OU RAR > 3,2):
"X) Artéria renal [DIREITA/ESQUERDA] com sinais ecográficos de estenose hemodinamicamente significativa em seu terço [proximal/médio/distal] (VPS de ___ cm/s e RAR de ___)."

CENÁRIO 2 — Estenose bilateral:
"X) Sinais ecográficos de estenose hemodinamicamente significativa em ambas as artérias renais (VPS de ___ cm/s à direita e ___ cm/s à esquerda; RAR de ___ e ___, respectivamente)."

CENÁRIO 3 — Padrão tardus-parvus distal (IR < 0,55):
"X) Padrão espectral intrarrenal compatível com estenose proximal (padrão tardus-parvus à [DIREITA/ESQUERDA], com IR de ___)."

RECOMENDAÇÃO (incluir SOMENTE se médico mencionou contexto clínico de avaliação para intervenção):
"X) Convém, a critério clínico, complementar com angiotomografia ou arteriografia renal para confirmação diagnóstica e planejamento terapêutico."

CRITÉRIOS DIAGNÓSTICOS (referência):
- VPS > 250 cm/s na artéria renal principal: critério primário (acurácia 87% — JVB 2005).
- RAR > 3,2: critério secundário (acurácia 85,6%).
- Padrão tardus-parvus distal (tempo de aceleração > 0,07s OU IR < 0,55): sugere estenose proximal significativa.

NÃO INVENTAR:
- Não citar valores não mencionados pelo médico nos achados.
- Não recomendar conduta cirúrgica/intervencionista; correlação clínica só quando o médico ditar, na redação dele.
- Não classificar percentual de estenose por Doppler (não tem precisão suficiente).$c$, version = version + 1, updated_at = now()
   where id = '88fee5b3-de26-444e-9995-e5f8843d94b2' and status = 'validated' and md5(content) = 'be93fafbbf3b0e11cd773f2dfd2fc196';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '88fee5b3-de26-444e-9995-e5f8843d94b2', n; end if;
  -- DOPPLER_RENAL DIRETO_OBJETIVO conclusao doppler-renal-conclusao-estenose-significativa: trocas 31
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "VPS > 250", "VPS maior que 250", "RAR > 3,2", "RAR maior que 3", "estenose renal significativa", "estenose hemodinamicamente significativa", "estenose ≥ 60%", "tardus-parvus", "tardus parvus", "padrão tardus", "ascensão sistólica retardada", "aceleração sistólica prolongada", "doença renovascular", "hipertensão renovascular".

CONCLUSÃO — ESTENOSE HEMODINAMICAMENTE SIGNIFICATIVA (≥ 60%)

Use as frases verbatim conforme cenário:

CENÁRIO 1 — Estenose unilateral confirmada (VPS > 250 cm/s OU RAR > 3,2):
"X) Artéria renal [DIREITA/ESQUERDA] com sinais ecográficos de estenose hemodinamicamente significativa em seu terço [proximal/médio/distal] (VPS de ___ cm/s e RAR de ___)."

CENÁRIO 2 — Estenose bilateral:
"X) Sinais ecográficos de estenose hemodinamicamente significativa em ambas as artérias renais (VPS de ___ cm/s à direita e ___ cm/s à esquerda; RAR de ___ e ___, respectivamente)."

CENÁRIO 3 — Padrão tardus-parvus distal (IR < 0,55):
"X) Padrão espectral intrarrenal compatível com estenose proximal (padrão tardus-parvus à [DIREITA/ESQUERDA], com IR de ___)."

RECOMENDAÇÃO (incluir SOMENTE se médico mencionou contexto clínico de avaliação para intervenção):
"X) Convém, a critério clínico, complementar com angiotomografia ou arteriografia renal para confirmação diagnóstica e planejamento terapêutico."

CRITÉRIOS DIAGNÓSTICOS (referência):
- VPS > 250 cm/s na artéria renal principal: critério primário (acurácia 87% — JVB 2005).
- RAR > 3,2: critério secundário (acurácia 85,6%).
- Padrão tardus-parvus distal (tempo de aceleração > 0,07s OU IR < 0,55): sugere estenose proximal significativa.

NÃO INVENTAR:
- Não citar valores não mencionados pelo médico nos achados.
- Não recomendar conduta cirúrgica/intervencionista; correlação clínica só quando o médico ditar, na redação dele.
- Não classificar percentual de estenose por Doppler (não tem precisão suficiente).$c$, version = version + 1, updated_at = now()
   where id = '92edb567-b3e7-4583-8b69-22eae07e4579' and status = 'validated' and md5(content) = 'be93fafbbf3b0e11cd773f2dfd2fc196';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '92edb567-b3e7-4583-8b69-22eae07e4579', n; end if;
  -- DOPPLER_RENAL DETALHADO_PROTOCOLAR conclusao doppler-renal-conclusao-estenose-significativa: trocas 31
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "VPS > 250", "VPS maior que 250", "RAR > 3,2", "RAR maior que 3", "estenose renal significativa", "estenose hemodinamicamente significativa", "estenose ≥ 60%", "tardus-parvus", "tardus parvus", "padrão tardus", "ascensão sistólica retardada", "aceleração sistólica prolongada", "doença renovascular", "hipertensão renovascular".

CONCLUSÃO — ESTENOSE HEMODINAMICAMENTE SIGNIFICATIVA (≥ 60%)

Use as frases verbatim conforme cenário:

CENÁRIO 1 — Estenose unilateral confirmada (VPS > 250 cm/s OU RAR > 3,2):
"X) Artéria renal [DIREITA/ESQUERDA] com sinais ecográficos de estenose hemodinamicamente significativa em seu terço [proximal/médio/distal] (VPS de ___ cm/s e RAR de ___)."

CENÁRIO 2 — Estenose bilateral:
"X) Sinais ecográficos de estenose hemodinamicamente significativa em ambas as artérias renais (VPS de ___ cm/s à direita e ___ cm/s à esquerda; RAR de ___ e ___, respectivamente)."

CENÁRIO 3 — Padrão tardus-parvus distal (IR < 0,55):
"X) Padrão espectral intrarrenal compatível com estenose proximal (padrão tardus-parvus à [DIREITA/ESQUERDA], com IR de ___)."

RECOMENDAÇÃO (incluir SOMENTE se médico mencionou contexto clínico de avaliação para intervenção):
"X) Convém, a critério clínico, complementar com angiotomografia ou arteriografia renal para confirmação diagnóstica e planejamento terapêutico."

CRITÉRIOS DIAGNÓSTICOS (referência):
- VPS > 250 cm/s na artéria renal principal: critério primário (acurácia 87% — JVB 2005).
- RAR > 3,2: critério secundário (acurácia 85,6%).
- Padrão tardus-parvus distal (tempo de aceleração > 0,07s OU IR < 0,55): sugere estenose proximal significativa.

NÃO INVENTAR:
- Não citar valores não mencionados pelo médico nos achados.
- Não recomendar conduta cirúrgica/intervencionista; correlação clínica só quando o médico ditar, na redação dele.
- Não classificar percentual de estenose por Doppler (não tem precisão suficiente).$c$, version = version + 1, updated_at = now()
   where id = '7294761d-9cc8-435f-9c4b-2b494b0868f8' and status = 'validated' and md5(content) = 'be93fafbbf3b0e11cd773f2dfd2fc196';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7294761d-9cc8-435f-9c4b-2b494b0868f8', n; end if;
  -- DOPPLER_RENAL OBJETIVO conclusao doppler-renal-conclusao-estenose-significativa: trocas 31
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "VPS > 250", "VPS maior que 250", "RAR > 3,2", "RAR maior que 3", "estenose renal significativa", "estenose hemodinamicamente significativa", "estenose ≥ 60%", "tardus-parvus", "tardus parvus", "padrão tardus", "ascensão sistólica retardada", "aceleração sistólica prolongada", "doença renovascular", "hipertensão renovascular".

CONCLUSÃO — ESTENOSE HEMODINAMICAMENTE SIGNIFICATIVA (≥ 60%)

Use as frases verbatim conforme cenário:

CENÁRIO 1 — Estenose unilateral confirmada (VPS > 250 cm/s OU RAR > 3,2):
"X) Artéria renal [DIREITA/ESQUERDA] com sinais ecográficos de estenose hemodinamicamente significativa em seu terço [proximal/médio/distal] (VPS de ___ cm/s e RAR de ___)."

CENÁRIO 2 — Estenose bilateral:
"X) Sinais ecográficos de estenose hemodinamicamente significativa em ambas as artérias renais (VPS de ___ cm/s à direita e ___ cm/s à esquerda; RAR de ___ e ___, respectivamente)."

CENÁRIO 3 — Padrão tardus-parvus distal (IR < 0,55):
"X) Padrão espectral intrarrenal compatível com estenose proximal (padrão tardus-parvus à [DIREITA/ESQUERDA], com IR de ___)."

RECOMENDAÇÃO (incluir SOMENTE se médico mencionou contexto clínico de avaliação para intervenção):
"X) Convém, a critério clínico, complementar com angiotomografia ou arteriografia renal para confirmação diagnóstica e planejamento terapêutico."

CRITÉRIOS DIAGNÓSTICOS (referência):
- VPS > 250 cm/s na artéria renal principal: critério primário (acurácia 87% — JVB 2005).
- RAR > 3,2: critério secundário (acurácia 85,6%).
- Padrão tardus-parvus distal (tempo de aceleração > 0,07s OU IR < 0,55): sugere estenose proximal significativa.

NÃO INVENTAR:
- Não citar valores não mencionados pelo médico nos achados.
- Não recomendar conduta cirúrgica/intervencionista; correlação clínica só quando o médico ditar, na redação dele.
- Não classificar percentual de estenose por Doppler (não tem precisão suficiente).$c$, version = version + 1, updated_at = now()
   where id = 'a92c17a0-7aae-4ee0-8dbf-8f745c1078be' and status = 'validated' and md5(content) = 'be93fafbbf3b0e11cd773f2dfd2fc196';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'a92c17a0-7aae-4ee0-8dbf-8f745c1078be', n; end if;
  -- DOPPLER_RENAL CLASSICO_COMPLETO regra doppler-renal-regra-nefroesclerose: trocas 0
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "IR > 0,80", "IR maior que 0,80", "IR 0,8", "IR 0,9", "IR elevado", "nefroesclerose", "doença microvascular", "doença renal crônica", "DRC", "diabetes mellitus", "hipertensão de longa data", "rins reduzidos", "rins atróficos", "perda de diferenciação córtico-medular".

REGRA — IR INTRARRENAL ELEVADO BILATERAL (≥ 0,80)

Quando médico mencionar IR ≥ 0,80 BILATERAL (não unilateral), adicionar na conclusão:

"X) Índices de resistência intrarrenais bilateralmente elevados (IR ___ à direita e ___ à esquerda), achado inespecífico que pode estar associado a nefroesclerose hipertensiva, doença renal crônica de etiologia microvascular ou outras nefropatias parenquimatosas."

═══════════════════════════════════════════════════
CONTEXTOS QUE REFORÇAM O ACHADO (mas NÃO determinam diagnóstico)
═══════════════════════════════════════════════════

- Paciente diabético/hipertenso de longa data.
- Perda de diferenciação córtico-medular ao modo B.
- Redução de dimensões renais bilateral (< 9 cm bipolar).
- Aumento da ecogenicidade cortical.

═══════════════════════════════════════════════════
DIAGNÓSTICOS DIFERENCIAIS — NÃO afirmar sem critério
═══════════════════════════════════════════════════

- Nefroesclerose hipertensiva (mais comum).
- Nefropatia diabética.
- Glomerulonefrites crônicas.
- Estenose distal bilateral (raro).

NÃO escrever diagnóstico específico (ex: "compatível com nefropatia diabética") — apenas listar como possibilidade. A diferenciação não é por Doppler.

CASO UNILATERAL (IR alto só de um lado): NÃO usar esta regra. Investigar outras causas (obstrução, infarto, pielonefrite — fora do escopo do Doppler renal padrão).$c$, version = version + 1, updated_at = now()
   where id = '61e6a9f8-c184-4a35-adf3-fb9089420934' and status = 'validated' and md5(content) = '6e817f803d964b33bff33d2f93dbc04c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '61e6a9f8-c184-4a35-adf3-fb9089420934', n; end if;
  -- DOPPLER_RENAL DIRETO_OBJETIVO regra doppler-renal-regra-nefroesclerose: trocas 0
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "IR > 0,80", "IR maior que 0,80", "IR 0,8", "IR 0,9", "IR elevado", "nefroesclerose", "doença microvascular", "doença renal crônica", "DRC", "diabetes mellitus", "hipertensão de longa data", "rins reduzidos", "rins atróficos", "perda de diferenciação córtico-medular".

REGRA — IR INTRARRENAL ELEVADO BILATERAL (≥ 0,80)

Quando médico mencionar IR ≥ 0,80 BILATERAL (não unilateral), adicionar na conclusão:

"X) Índices de resistência intrarrenais bilateralmente elevados (IR ___ à direita e ___ à esquerda), achado inespecífico que pode estar associado a nefroesclerose hipertensiva, doença renal crônica de etiologia microvascular ou outras nefropatias parenquimatosas."

═══════════════════════════════════════════════════
CONTEXTOS QUE REFORÇAM O ACHADO (mas NÃO determinam diagnóstico)
═══════════════════════════════════════════════════

- Paciente diabético/hipertenso de longa data.
- Perda de diferenciação córtico-medular ao modo B.
- Redução de dimensões renais bilateral (< 9 cm bipolar).
- Aumento da ecogenicidade cortical.

═══════════════════════════════════════════════════
DIAGNÓSTICOS DIFERENCIAIS — NÃO afirmar sem critério
═══════════════════════════════════════════════════

- Nefroesclerose hipertensiva (mais comum).
- Nefropatia diabética.
- Glomerulonefrites crônicas.
- Estenose distal bilateral (raro).

NÃO escrever diagnóstico específico (ex: "compatível com nefropatia diabética") — apenas listar como possibilidade. A diferenciação não é por Doppler.

CASO UNILATERAL (IR alto só de um lado): NÃO usar esta regra. Investigar outras causas (obstrução, infarto, pielonefrite — fora do escopo do Doppler renal padrão).$c$, version = version + 1, updated_at = now()
   where id = '80857101-f772-4b62-b925-4e887f6dd698' and status = 'validated' and md5(content) = '6e817f803d964b33bff33d2f93dbc04c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '80857101-f772-4b62-b925-4e887f6dd698', n; end if;
  -- DOPPLER_RENAL DETALHADO_PROTOCOLAR regra doppler-renal-regra-nefroesclerose: trocas 0
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "IR > 0,80", "IR maior que 0,80", "IR 0,8", "IR 0,9", "IR elevado", "nefroesclerose", "doença microvascular", "doença renal crônica", "DRC", "diabetes mellitus", "hipertensão de longa data", "rins reduzidos", "rins atróficos", "perda de diferenciação córtico-medular".

REGRA — IR INTRARRENAL ELEVADO BILATERAL (≥ 0,80)

Quando médico mencionar IR ≥ 0,80 BILATERAL (não unilateral), adicionar na conclusão:

"X) Índices de resistência intrarrenais bilateralmente elevados (IR ___ à direita e ___ à esquerda), achado inespecífico que pode estar associado a nefroesclerose hipertensiva, doença renal crônica de etiologia microvascular ou outras nefropatias parenquimatosas."

═══════════════════════════════════════════════════
CONTEXTOS QUE REFORÇAM O ACHADO (mas NÃO determinam diagnóstico)
═══════════════════════════════════════════════════

- Paciente diabético/hipertenso de longa data.
- Perda de diferenciação córtico-medular ao modo B.
- Redução de dimensões renais bilateral (< 9 cm bipolar).
- Aumento da ecogenicidade cortical.

═══════════════════════════════════════════════════
DIAGNÓSTICOS DIFERENCIAIS — NÃO afirmar sem critério
═══════════════════════════════════════════════════

- Nefroesclerose hipertensiva (mais comum).
- Nefropatia diabética.
- Glomerulonefrites crônicas.
- Estenose distal bilateral (raro).

NÃO escrever diagnóstico específico (ex: "compatível com nefropatia diabética") — apenas listar como possibilidade. A diferenciação não é por Doppler.

CASO UNILATERAL (IR alto só de um lado): NÃO usar esta regra. Investigar outras causas (obstrução, infarto, pielonefrite — fora do escopo do Doppler renal padrão).$c$, version = version + 1, updated_at = now()
   where id = '9d738bae-2a29-437e-aa0c-dcf4ace67ca3' and status = 'validated' and md5(content) = '6e817f803d964b33bff33d2f93dbc04c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '9d738bae-2a29-437e-aa0c-dcf4ace67ca3', n; end if;
  -- DOPPLER_RENAL OBJETIVO regra doppler-renal-regra-nefroesclerose: trocas 0
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "IR > 0,80", "IR maior que 0,80", "IR 0,8", "IR 0,9", "IR elevado", "nefroesclerose", "doença microvascular", "doença renal crônica", "DRC", "diabetes mellitus", "hipertensão de longa data", "rins reduzidos", "rins atróficos", "perda de diferenciação córtico-medular".

REGRA — IR INTRARRENAL ELEVADO BILATERAL (≥ 0,80)

Quando médico mencionar IR ≥ 0,80 BILATERAL (não unilateral), adicionar na conclusão:

"X) Índices de resistência intrarrenais bilateralmente elevados (IR ___ à direita e ___ à esquerda), achado inespecífico que pode estar associado a nefroesclerose hipertensiva, doença renal crônica de etiologia microvascular ou outras nefropatias parenquimatosas."

═══════════════════════════════════════════════════
CONTEXTOS QUE REFORÇAM O ACHADO (mas NÃO determinam diagnóstico)
═══════════════════════════════════════════════════

- Paciente diabético/hipertenso de longa data.
- Perda de diferenciação córtico-medular ao modo B.
- Redução de dimensões renais bilateral (< 9 cm bipolar).
- Aumento da ecogenicidade cortical.

═══════════════════════════════════════════════════
DIAGNÓSTICOS DIFERENCIAIS — NÃO afirmar sem critério
═══════════════════════════════════════════════════

- Nefroesclerose hipertensiva (mais comum).
- Nefropatia diabética.
- Glomerulonefrites crônicas.
- Estenose distal bilateral (raro).

NÃO escrever diagnóstico específico (ex: "compatível com nefropatia diabética") — apenas listar como possibilidade. A diferenciação não é por Doppler.

CASO UNILATERAL (IR alto só de um lado): NÃO usar esta regra. Investigar outras causas (obstrução, infarto, pielonefrite — fora do escopo do Doppler renal padrão).$c$, version = version + 1, updated_at = now()
   where id = 'c69f88b5-9ace-4621-a5ba-0a69d9f1619b' and status = 'validated' and md5(content) = '6e817f803d964b33bff33d2f93dbc04c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c69f88b5-9ace-4621-a5ba-0a69d9f1619b', n; end if;
  -- DOPPLER_VENOSO_MMII CLASSICO_COMPLETO excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: trocas 32
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
- Não prescrever conduta; correlação clínica só quando o médico ditar, na redação dele.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = 'dcae3abd-59e7-4b29-bbde-f8379a4cf55d' and status = 'validated' and md5(content) = 'a76b3ef5b5b9cfe1dd7b7700254f3482';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'dcae3abd-59e7-4b29-bbde-f8379a4cf55d', n; end if;
  -- DOPPLER_VENOSO_MMII DIRETO_OBJETIVO excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: trocas 32
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
- Não prescrever conduta; correlação clínica só quando o médico ditar, na redação dele.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = '2fe28a1c-4ffa-435f-9516-5f8055caba0d' and status = 'validated' and md5(content) = 'a76b3ef5b5b9cfe1dd7b7700254f3482';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2fe28a1c-4ffa-435f-9516-5f8055caba0d', n; end if;
  -- DOPPLER_VENOSO_MMII DETALHADO_PROTOCOLAR excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: trocas 32
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
- Não prescrever conduta; correlação clínica só quando o médico ditar, na redação dele.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = 'd50b5afd-f8ab-4aa5-a7f8-7f44218e5b3d' and status = 'validated' and md5(content) = 'a76b3ef5b5b9cfe1dd7b7700254f3482';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'd50b5afd-f8ab-4aa5-a7f8-7f44218e5b3d', n; end if;
  -- DOPPLER_VENOSO_MMII OBJETIVO excecao doppler-venoso-mmii-excecao-tvp-idade-indeterminada: trocas 32
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
- Não prescrever conduta; correlação clínica só quando o médico ditar, na redação dele.
- Honestidade descritiva é parte do Article IV (No Invention): "indeterminada" é uma classificação legítima quando os critérios faltam.$c$, version = version + 1, updated_at = now()
   where id = '8ff638e3-a1e4-4c17-9d5f-963a5f221c2d' and status = 'validated' and md5(content) = 'a76b3ef5b5b9cfe1dd7b7700254f3482';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '8ff638e3-a1e4-4c17-9d5f-963a5f221c2d', n; end if;
  -- ESCROTAL CLASSICO_COMPLETO conclusao escrotal-conclusao-com-recomendacao-clinica: trocas 21,22
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Nódulo testicular sólido**:
   "Convém, a critério clínico, correlacionar com exame físico, dosagem de marcadores tumorais (alfa-fetoproteína, beta-HCG, LDH) e avaliação urológica."

2. **Microlitíase clássica ou difusa**:
   "Convém, a critério clínico, considerar seguimento ecográfico periódico."

3. **Suspeita de torção testicular**:
   "Encaminhamento urológico em caráter de urgência."

4. **Orqui-epididimite aguda**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

5. **Achado incidental em paciente assintomático** (ex: pequeno cisto, varicocele subclínica):
   "Achado de provável relevância clínica reduzida — correlacionar com queixa clínica." — só quando o médico ditar, na redação dele.

6. **Hidrocele complexa / septada**:
   "Convém, a critério clínico, descartar processo inflamatório ou hemorrágico associado."

Boa prática: anexar recomendação ao MESMO item numerado do achado, sem deixar recomendações soltas no final.$c$, version = version + 1, updated_at = now()
   where id = '1c112961-844c-424c-be78-4f10277d910f' and status = 'validated' and md5(content) = '4b0216a18600909d8e84a59b19a4ec43';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '1c112961-844c-424c-be78-4f10277d910f', n; end if;
  -- ESCROTAL DIRETO_OBJETIVO conclusao escrotal-conclusao-com-recomendacao-clinica: trocas 21,22
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Nódulo testicular sólido**:
   "Convém, a critério clínico, correlacionar com exame físico, dosagem de marcadores tumorais (alfa-fetoproteína, beta-HCG, LDH) e avaliação urológica."

2. **Microlitíase clássica ou difusa**:
   "Convém, a critério clínico, considerar seguimento ecográfico periódico."

3. **Suspeita de torção testicular**:
   "Encaminhamento urológico em caráter de urgência."

4. **Orqui-epididimite aguda**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

5. **Achado incidental em paciente assintomático** (ex: pequeno cisto, varicocele subclínica):
   "Achado de provável relevância clínica reduzida — correlacionar com queixa clínica." — só quando o médico ditar, na redação dele.

6. **Hidrocele complexa / septada**:
   "Convém, a critério clínico, descartar processo inflamatório ou hemorrágico associado."

Boa prática: anexar recomendação ao MESMO item numerado do achado, sem deixar recomendações soltas no final.$c$, version = version + 1, updated_at = now()
   where id = 'a4ca8f8c-9cc2-4ddd-a406-8d52a195d9da' and status = 'validated' and md5(content) = '4b0216a18600909d8e84a59b19a4ec43';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'a4ca8f8c-9cc2-4ddd-a406-8d52a195d9da', n; end if;
  -- ESCROTAL DETALHADO_PROTOCOLAR conclusao escrotal-conclusao-com-recomendacao-clinica: trocas 21,22
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Nódulo testicular sólido**:
   "Convém, a critério clínico, correlacionar com exame físico, dosagem de marcadores tumorais (alfa-fetoproteína, beta-HCG, LDH) e avaliação urológica."

2. **Microlitíase clássica ou difusa**:
   "Convém, a critério clínico, considerar seguimento ecográfico periódico."

3. **Suspeita de torção testicular**:
   "Encaminhamento urológico em caráter de urgência."

4. **Orqui-epididimite aguda**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

5. **Achado incidental em paciente assintomático** (ex: pequeno cisto, varicocele subclínica):
   "Achado de provável relevância clínica reduzida — correlacionar com queixa clínica." — só quando o médico ditar, na redação dele.

6. **Hidrocele complexa / septada**:
   "Convém, a critério clínico, descartar processo inflamatório ou hemorrágico associado."

Boa prática: anexar recomendação ao MESMO item numerado do achado, sem deixar recomendações soltas no final.$c$, version = version + 1, updated_at = now()
   where id = 'eba05b95-3109-4be9-b89a-44f3bd59b1e0' and status = 'validated' and md5(content) = '4b0216a18600909d8e84a59b19a4ec43';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'eba05b95-3109-4be9-b89a-44f3bd59b1e0', n; end if;
  -- ESCROTAL OBJETIVO conclusao escrotal-conclusao-com-recomendacao-clinica: trocas 21,22
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Nódulo testicular sólido**:
   "Convém, a critério clínico, correlacionar com exame físico, dosagem de marcadores tumorais (alfa-fetoproteína, beta-HCG, LDH) e avaliação urológica."

2. **Microlitíase clássica ou difusa**:
   "Convém, a critério clínico, considerar seguimento ecográfico periódico."

3. **Suspeita de torção testicular**:
   "Encaminhamento urológico em caráter de urgência."

4. **Orqui-epididimite aguda**:
   "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial." — só quando o médico ditar, na redação dele.

5. **Achado incidental em paciente assintomático** (ex: pequeno cisto, varicocele subclínica):
   "Achado de provável relevância clínica reduzida — correlacionar com queixa clínica." — só quando o médico ditar, na redação dele.

6. **Hidrocele complexa / septada**:
   "Convém, a critério clínico, descartar processo inflamatório ou hemorrágico associado."

Boa prática: anexar recomendação ao MESMO item numerado do achado, sem deixar recomendações soltas no final.$c$, version = version + 1, updated_at = now()
   where id = '61177b73-78aa-4d7f-866d-27bb4b18500f' and status = 'validated' and md5(content) = '4b0216a18600909d8e84a59b19a4ec43';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '61177b73-78aa-4d7f-866d-27bb4b18500f', n; end if;
  -- ESCROTAL CLASSICO_COMPLETO regra escrotal-regra-hidrocele: trocas 14
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

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita."$c$, version = version + 1, updated_at = now()
   where id = 'a6bf0cf8-ced5-4265-b769-e0afd3699371' and status = 'validated' and md5(content) = '4c1f6bc22b2b04601664ae97ac370c59';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'a6bf0cf8-ced5-4265-b769-e0afd3699371', n; end if;
  -- ESCROTAL DIRETO_OBJETIVO regra escrotal-regra-hidrocele: trocas 14
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

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita."$c$, version = version + 1, updated_at = now()
   where id = '6546bd02-25ad-4913-aaf9-11da4d90cf19' and status = 'validated' and md5(content) = '4c1f6bc22b2b04601664ae97ac370c59';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '6546bd02-25ad-4913-aaf9-11da4d90cf19', n; end if;
  -- ESCROTAL DETALHADO_PROTOCOLAR regra escrotal-regra-hidrocele: trocas 14
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

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita."$c$, version = version + 1, updated_at = now()
   where id = '9b4544d0-4881-4524-904a-622cb7d287ad' and status = 'validated' and md5(content) = '4c1f6bc22b2b04601664ae97ac370c59';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '9b4544d0-4881-4524-904a-622cb7d287ad', n; end if;
  -- ESCROTAL OBJETIVO regra escrotal-regra-hidrocele: trocas 14
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

Atenção: se houver septações, debris hiperecoicos ou parede espessada, considerar hidrocele complicada/infectada — descrever na conclusão como "Hidrocele complexa à direita."$c$, version = version + 1, updated_at = now()
   where id = '8867d54c-a5b1-478c-b0e1-316151e30211' and status = 'validated' and md5(content) = '4c1f6bc22b2b04601664ae97ac370c59';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '8867d54c-a5b1-478c-b0e1-316151e30211', n; end if;
  -- ESCROTAL CLASSICO_COMPLETO regra escrotal-regra-orquite-epididimite: trocas 13
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- orquite
- epididimite
- orqui-epididimite
- processo inflamatório
- hiperemia
- vascularização aumentada
- testículo aumentado e doloroso

REGRA — ORQUITE E EPIDIDIMITE

Achados ecográficos sugestivos de processo inflamatório agudo:

Epididimite:
- Epidídimo aumentado de volume, com ecogenicidade reduzida e heterogênea.
- Hiperemia ao Doppler colorido (vascularização aumentada).
- Pode haver hidrocele reacional associada.

Orquite (geralmente acompanha epididimite):
- Testículo aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida.
- Hiperemia significativa ao Doppler.
- Espessamento da pele escrotal pode estar presente.

No corpo (exemplo orqui-epididimite à direita):
"Testículo direito aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida. Epidídimo homolateral também aumentado. Ao Doppler colorido, observa-se hiperemia acentuada em ambas as estruturas. Discreta lâmina líquida reacional associada."

Na conclusão:
"Sinais de orqui-epididimite à direita."

Observação: descartar torção testicular como diagnóstico diferencial em quadros agudos — se houver dúvida, o achado de fluxo arterial preservado favorece orquite ao invés de torção.$c$, version = version + 1, updated_at = now()
   where id = '10f02bdd-88e9-45ea-b7ab-cf72f90f5b75' and status = 'validated' and md5(content) = 'd89b89c42dc0344ac35187b1c8594e0c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '10f02bdd-88e9-45ea-b7ab-cf72f90f5b75', n; end if;
  -- ESCROTAL DIRETO_OBJETIVO regra escrotal-regra-orquite-epididimite: trocas 13
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- orquite
- epididimite
- orqui-epididimite
- processo inflamatório
- hiperemia
- vascularização aumentada
- testículo aumentado e doloroso

REGRA — ORQUITE E EPIDIDIMITE

Achados ecográficos sugestivos de processo inflamatório agudo:

Epididimite:
- Epidídimo aumentado de volume, com ecogenicidade reduzida e heterogênea.
- Hiperemia ao Doppler colorido (vascularização aumentada).
- Pode haver hidrocele reacional associada.

Orquite (geralmente acompanha epididimite):
- Testículo aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida.
- Hiperemia significativa ao Doppler.
- Espessamento da pele escrotal pode estar presente.

No corpo (exemplo orqui-epididimite à direita):
"Testículo direito aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida. Epidídimo homolateral também aumentado. Ao Doppler colorido, observa-se hiperemia acentuada em ambas as estruturas. Discreta lâmina líquida reacional associada."

Na conclusão:
"Sinais de orqui-epididimite à direita."

Observação: descartar torção testicular como diagnóstico diferencial em quadros agudos — se houver dúvida, o achado de fluxo arterial preservado favorece orquite ao invés de torção.$c$, version = version + 1, updated_at = now()
   where id = '9da1efe8-e318-40af-b64b-008ef8d0bad1' and status = 'validated' and md5(content) = 'd89b89c42dc0344ac35187b1c8594e0c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '9da1efe8-e318-40af-b64b-008ef8d0bad1', n; end if;
  -- ESCROTAL DETALHADO_PROTOCOLAR regra escrotal-regra-orquite-epididimite: trocas 13
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- orquite
- epididimite
- orqui-epididimite
- processo inflamatório
- hiperemia
- vascularização aumentada
- testículo aumentado e doloroso

REGRA — ORQUITE E EPIDIDIMITE

Achados ecográficos sugestivos de processo inflamatório agudo:

Epididimite:
- Epidídimo aumentado de volume, com ecogenicidade reduzida e heterogênea.
- Hiperemia ao Doppler colorido (vascularização aumentada).
- Pode haver hidrocele reacional associada.

Orquite (geralmente acompanha epididimite):
- Testículo aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida.
- Hiperemia significativa ao Doppler.
- Espessamento da pele escrotal pode estar presente.

No corpo (exemplo orqui-epididimite à direita):
"Testículo direito aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida. Epidídimo homolateral também aumentado. Ao Doppler colorido, observa-se hiperemia acentuada em ambas as estruturas. Discreta lâmina líquida reacional associada."

Na conclusão:
"Sinais de orqui-epididimite à direita."

Observação: descartar torção testicular como diagnóstico diferencial em quadros agudos — se houver dúvida, o achado de fluxo arterial preservado favorece orquite ao invés de torção.$c$, version = version + 1, updated_at = now()
   where id = 'bbf4eaee-ec21-4030-aab3-881793aacfdb' and status = 'validated' and md5(content) = 'd89b89c42dc0344ac35187b1c8594e0c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'bbf4eaee-ec21-4030-aab3-881793aacfdb', n; end if;
  -- ESCROTAL OBJETIVO regra escrotal-regra-orquite-epididimite: trocas 13
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- orquite
- epididimite
- orqui-epididimite
- processo inflamatório
- hiperemia
- vascularização aumentada
- testículo aumentado e doloroso

REGRA — ORQUITE E EPIDIDIMITE

Achados ecográficos sugestivos de processo inflamatório agudo:

Epididimite:
- Epidídimo aumentado de volume, com ecogenicidade reduzida e heterogênea.
- Hiperemia ao Doppler colorido (vascularização aumentada).
- Pode haver hidrocele reacional associada.

Orquite (geralmente acompanha epididimite):
- Testículo aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida.
- Hiperemia significativa ao Doppler.
- Espessamento da pele escrotal pode estar presente.

No corpo (exemplo orqui-epididimite à direita):
"Testículo direito aumentado de volume, com ecotextura heterogênea e ecogenicidade reduzida. Epidídimo homolateral também aumentado. Ao Doppler colorido, observa-se hiperemia acentuada em ambas as estruturas. Discreta lâmina líquida reacional associada."

Na conclusão:
"Sinais de orqui-epididimite à direita."

Observação: descartar torção testicular como diagnóstico diferencial em quadros agudos — se houver dúvida, o achado de fluxo arterial preservado favorece orquite ao invés de torção.$c$, version = version + 1, updated_at = now()
   where id = '64ad0f13-2886-42da-a1b0-2d7ec9365a23' and status = 'validated' and md5(content) = 'd89b89c42dc0344ac35187b1c8594e0c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '64ad0f13-2886-42da-a1b0-2d7ec9365a23', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO conclusao glandulas-salivares-conclusao-nodulo-tumoral: trocas 6
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "nódulo parótida", "nódulo submandibular", "tumor salivar", "Warthin", "tumor de Warthin", "adenoma pleomórfico", "tumor misto benigno", "lesão focal glândula salivar", "nódulo glandular".

CONCLUSÃO — NÓDULO FOCAL EM GLÂNDULA SALIVAR

═══════════════════════════════════════════════════
CARACTERÍSTICAS ECOGRÁFICAS DOS TIPOS COMUNS (referência)
═══════════════════════════════════════════════════

ADENOMA PLEOMÓRFICO (tumor misto benigno) — mais comum, ~65% dos tumores salivares:
- Lesão sólida hipoecoica.
- Contornos bem definidos, lobulados.
- Geralmente homogêneo (heterogêneo se grandes).
- Vascularização periférica predominante ao Doppler.
- Frequente no lobo SUPERFICIAL da parótida.
- Pode ter pequenas calcificações em lesões antigas.

TUMOR DE WARTHIN (cistadenolinfoma) — ~10% dos tumores parotídeos, BENIGNO:
- Frequentemente MÚLTIPLO e BILATERAL (até 10% dos casos).
- Acomete PARÓTIDA (raríssimo na submandibular).
- Áreas císticas/anecoicas dentro do nódulo são típicas.
- Contornos bem definidos.
- Vascularização interna ao Doppler.
- Mais comum em homens, > 50 anos, tabagistas.

CARCINOMA MUCOEPIDERMOIDE / OUTRAS NEOPLASIAS MALIGNAS:
- Contornos IRREGULARES, mal definidos.
- Ecotextura heterogênea.
- Pode ter áreas císticas/necróticas centrais.
- Vascularização caótica/aumentada ao Doppler.
- Suspeição maior quando localizado no LOBO PROFUNDO da parótida ou na submandibular.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Nódulo único de aspecto benigno (sem rotular tipo específico):
"X) Nódulo sólido em [lobo superficial / profundo] da glândula parótida [direita / esquerda], medindo ___ x ___ x ___ mm, com contornos regulares e bem definidos, ecotextura [hipo/iso]ecoica homogênea, vascularização periférica preservada ao Doppler. Características ecográficas predominantemente benignas, podendo estar relacionado a etiologias como adenoma pleomórfico ou outras lesões sólidas benignas."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica e etiológica."

CENÁRIO 2 — Nódulo com características sugestivas de Warthin (parotídeo, com áreas císticas):
"X) Nódulo em [lobo superficial] de glândula parótida [lado], medindo ___ x ___ x ___ mm, com contornos regulares, ecotextura heterogênea com áreas císticas/anecoicas internas, vascularização ao Doppler. Características ecográficas compatíveis com lesão de comportamento benigno, podendo corresponder a tumor de Warthin."

CENÁRIO 3 — Múltiplos nódulos (suspeita Warthin bilateral ou outras):
"X) Múltiplos nódulos em glândulas parótidas [unilateral/bilateral], com características predominantemente sólido-císticas, o maior medindo ___ x ___ x ___ mm em [lado]. Achados sugestivos de natureza benigna, podendo corresponder a tumores de Warthin múltiplos (frequência aumentada em tabagistas)."

CENÁRIO 4 — Nódulo com características suspeitas de malignidade:
"X) Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm, com contornos IRREGULARES e/ou mal definidos, ecotextura heterogênea, [com/sem] áreas císticas/necróticas internas, vascularização [aumentada/caótica] ao Doppler. Características ecográficas suspeitas de atipia, sem permitir definição diagnóstica por imagem isoladamente."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica, dado o padrão ecográfico suspeito."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- NÃO diagnosticar tipo histológico definitivo (adenoma pleomórfico, Warthin, carcinoma) pelo US isoladamente — apenas SUGERIR baseado em padrão ecográfico.
- NÃO classificar como "benigno definitivo" ou "maligno definitivo" — usar "predominantemente benigno" / "suspeito de atipia".
- NÃO recomendar tipo específico de procedimento (PAAF, parotidectomia superficial, exérese) — sugerir avaliação por especialista.
- NÃO atribuir Warthin sem caracterização ecográfica adequada (lesão sólido-cística parotídea).
- NÃO estender suspeição a lesões não descritas pelo médico.

═══════════════════════════════════════════════════
LIMITAÇÃO DIAGNÓSTICA — DECLARAR
═══════════════════════════════════════════════════

Frase obrigatória ao final da conclusão de nódulo:
"O diagnóstico histológico definitivo requer avaliação por especialista e, quando indicado, citologia/biópsia."$c$, version = version + 1, updated_at = now()
   where id = '9016dd79-d2f8-44bf-bb8f-b721e80287ba' and status = 'validated' and md5(content) = '4a9121d0ceae88c00cfd052242d87099';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '9016dd79-d2f8-44bf-bb8f-b721e80287ba', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO conclusao glandulas-salivares-conclusao-nodulo-tumoral: trocas 6
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "nódulo parótida", "nódulo submandibular", "tumor salivar", "Warthin", "tumor de Warthin", "adenoma pleomórfico", "tumor misto benigno", "lesão focal glândula salivar", "nódulo glandular".

CONCLUSÃO — NÓDULO FOCAL EM GLÂNDULA SALIVAR

═══════════════════════════════════════════════════
CARACTERÍSTICAS ECOGRÁFICAS DOS TIPOS COMUNS (referência)
═══════════════════════════════════════════════════

ADENOMA PLEOMÓRFICO (tumor misto benigno) — mais comum, ~65% dos tumores salivares:
- Lesão sólida hipoecoica.
- Contornos bem definidos, lobulados.
- Geralmente homogêneo (heterogêneo se grandes).
- Vascularização periférica predominante ao Doppler.
- Frequente no lobo SUPERFICIAL da parótida.
- Pode ter pequenas calcificações em lesões antigas.

TUMOR DE WARTHIN (cistadenolinfoma) — ~10% dos tumores parotídeos, BENIGNO:
- Frequentemente MÚLTIPLO e BILATERAL (até 10% dos casos).
- Acomete PARÓTIDA (raríssimo na submandibular).
- Áreas císticas/anecoicas dentro do nódulo são típicas.
- Contornos bem definidos.
- Vascularização interna ao Doppler.
- Mais comum em homens, > 50 anos, tabagistas.

CARCINOMA MUCOEPIDERMOIDE / OUTRAS NEOPLASIAS MALIGNAS:
- Contornos IRREGULARES, mal definidos.
- Ecotextura heterogênea.
- Pode ter áreas císticas/necróticas centrais.
- Vascularização caótica/aumentada ao Doppler.
- Suspeição maior quando localizado no LOBO PROFUNDO da parótida ou na submandibular.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Nódulo único de aspecto benigno (sem rotular tipo específico):
"X) Nódulo sólido em [lobo superficial / profundo] da glândula parótida [direita / esquerda], medindo ___ x ___ x ___ mm, com contornos regulares e bem definidos, ecotextura [hipo/iso]ecoica homogênea, vascularização periférica preservada ao Doppler. Características ecográficas predominantemente benignas, podendo estar relacionado a etiologias como adenoma pleomórfico ou outras lesões sólidas benignas."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica e etiológica."

CENÁRIO 2 — Nódulo com características sugestivas de Warthin (parotídeo, com áreas císticas):
"X) Nódulo em [lobo superficial] de glândula parótida [lado], medindo ___ x ___ x ___ mm, com contornos regulares, ecotextura heterogênea com áreas císticas/anecoicas internas, vascularização ao Doppler. Características ecográficas compatíveis com lesão de comportamento benigno, podendo corresponder a tumor de Warthin."

CENÁRIO 3 — Múltiplos nódulos (suspeita Warthin bilateral ou outras):
"X) Múltiplos nódulos em glândulas parótidas [unilateral/bilateral], com características predominantemente sólido-císticas, o maior medindo ___ x ___ x ___ mm em [lado]. Achados sugestivos de natureza benigna, podendo corresponder a tumores de Warthin múltiplos (frequência aumentada em tabagistas)."

CENÁRIO 4 — Nódulo com características suspeitas de malignidade:
"X) Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm, com contornos IRREGULARES e/ou mal definidos, ecotextura heterogênea, [com/sem] áreas císticas/necróticas internas, vascularização [aumentada/caótica] ao Doppler. Características ecográficas suspeitas de atipia, sem permitir definição diagnóstica por imagem isoladamente."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica, dado o padrão ecográfico suspeito."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- NÃO diagnosticar tipo histológico definitivo (adenoma pleomórfico, Warthin, carcinoma) pelo US isoladamente — apenas SUGERIR baseado em padrão ecográfico.
- NÃO classificar como "benigno definitivo" ou "maligno definitivo" — usar "predominantemente benigno" / "suspeito de atipia".
- NÃO recomendar tipo específico de procedimento (PAAF, parotidectomia superficial, exérese) — sugerir avaliação por especialista.
- NÃO atribuir Warthin sem caracterização ecográfica adequada (lesão sólido-cística parotídea).
- NÃO estender suspeição a lesões não descritas pelo médico.

═══════════════════════════════════════════════════
LIMITAÇÃO DIAGNÓSTICA — DECLARAR
═══════════════════════════════════════════════════

Frase obrigatória ao final da conclusão de nódulo:
"O diagnóstico histológico definitivo requer avaliação por especialista e, quando indicado, citologia/biópsia."$c$, version = version + 1, updated_at = now()
   where id = '6f14d81e-df64-4a9c-b9a8-0bef5a02387e' and status = 'validated' and md5(content) = '4a9121d0ceae88c00cfd052242d87099';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '6f14d81e-df64-4a9c-b9a8-0bef5a02387e', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR conclusao glandulas-salivares-conclusao-nodulo-tumoral: trocas 6
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "nódulo parótida", "nódulo submandibular", "tumor salivar", "Warthin", "tumor de Warthin", "adenoma pleomórfico", "tumor misto benigno", "lesão focal glândula salivar", "nódulo glandular".

CONCLUSÃO — NÓDULO FOCAL EM GLÂNDULA SALIVAR

═══════════════════════════════════════════════════
CARACTERÍSTICAS ECOGRÁFICAS DOS TIPOS COMUNS (referência)
═══════════════════════════════════════════════════

ADENOMA PLEOMÓRFICO (tumor misto benigno) — mais comum, ~65% dos tumores salivares:
- Lesão sólida hipoecoica.
- Contornos bem definidos, lobulados.
- Geralmente homogêneo (heterogêneo se grandes).
- Vascularização periférica predominante ao Doppler.
- Frequente no lobo SUPERFICIAL da parótida.
- Pode ter pequenas calcificações em lesões antigas.

TUMOR DE WARTHIN (cistadenolinfoma) — ~10% dos tumores parotídeos, BENIGNO:
- Frequentemente MÚLTIPLO e BILATERAL (até 10% dos casos).
- Acomete PARÓTIDA (raríssimo na submandibular).
- Áreas císticas/anecoicas dentro do nódulo são típicas.
- Contornos bem definidos.
- Vascularização interna ao Doppler.
- Mais comum em homens, > 50 anos, tabagistas.

CARCINOMA MUCOEPIDERMOIDE / OUTRAS NEOPLASIAS MALIGNAS:
- Contornos IRREGULARES, mal definidos.
- Ecotextura heterogênea.
- Pode ter áreas císticas/necróticas centrais.
- Vascularização caótica/aumentada ao Doppler.
- Suspeição maior quando localizado no LOBO PROFUNDO da parótida ou na submandibular.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Nódulo único de aspecto benigno (sem rotular tipo específico):
"X) Nódulo sólido em [lobo superficial / profundo] da glândula parótida [direita / esquerda], medindo ___ x ___ x ___ mm, com contornos regulares e bem definidos, ecotextura [hipo/iso]ecoica homogênea, vascularização periférica preservada ao Doppler. Características ecográficas predominantemente benignas, podendo estar relacionado a etiologias como adenoma pleomórfico ou outras lesões sólidas benignas."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica e etiológica."

CENÁRIO 2 — Nódulo com características sugestivas de Warthin (parotídeo, com áreas císticas):
"X) Nódulo em [lobo superficial] de glândula parótida [lado], medindo ___ x ___ x ___ mm, com contornos regulares, ecotextura heterogênea com áreas císticas/anecoicas internas, vascularização ao Doppler. Características ecográficas compatíveis com lesão de comportamento benigno, podendo corresponder a tumor de Warthin."

CENÁRIO 3 — Múltiplos nódulos (suspeita Warthin bilateral ou outras):
"X) Múltiplos nódulos em glândulas parótidas [unilateral/bilateral], com características predominantemente sólido-císticas, o maior medindo ___ x ___ x ___ mm em [lado]. Achados sugestivos de natureza benigna, podendo corresponder a tumores de Warthin múltiplos (frequência aumentada em tabagistas)."

CENÁRIO 4 — Nódulo com características suspeitas de malignidade:
"X) Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm, com contornos IRREGULARES e/ou mal definidos, ecotextura heterogênea, [com/sem] áreas císticas/necróticas internas, vascularização [aumentada/caótica] ao Doppler. Características ecográficas suspeitas de atipia, sem permitir definição diagnóstica por imagem isoladamente."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica, dado o padrão ecográfico suspeito."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- NÃO diagnosticar tipo histológico definitivo (adenoma pleomórfico, Warthin, carcinoma) pelo US isoladamente — apenas SUGERIR baseado em padrão ecográfico.
- NÃO classificar como "benigno definitivo" ou "maligno definitivo" — usar "predominantemente benigno" / "suspeito de atipia".
- NÃO recomendar tipo específico de procedimento (PAAF, parotidectomia superficial, exérese) — sugerir avaliação por especialista.
- NÃO atribuir Warthin sem caracterização ecográfica adequada (lesão sólido-cística parotídea).
- NÃO estender suspeição a lesões não descritas pelo médico.

═══════════════════════════════════════════════════
LIMITAÇÃO DIAGNÓSTICA — DECLARAR
═══════════════════════════════════════════════════

Frase obrigatória ao final da conclusão de nódulo:
"O diagnóstico histológico definitivo requer avaliação por especialista e, quando indicado, citologia/biópsia."$c$, version = version + 1, updated_at = now()
   where id = '6dcd0324-2c4b-4b29-8393-8fd1eb731af2' and status = 'validated' and md5(content) = '4a9121d0ceae88c00cfd052242d87099';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '6dcd0324-2c4b-4b29-8393-8fd1eb731af2', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO conclusao glandulas-salivares-conclusao-nodulo-tumoral: trocas 6
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "nódulo parótida", "nódulo submandibular", "tumor salivar", "Warthin", "tumor de Warthin", "adenoma pleomórfico", "tumor misto benigno", "lesão focal glândula salivar", "nódulo glandular".

CONCLUSÃO — NÓDULO FOCAL EM GLÂNDULA SALIVAR

═══════════════════════════════════════════════════
CARACTERÍSTICAS ECOGRÁFICAS DOS TIPOS COMUNS (referência)
═══════════════════════════════════════════════════

ADENOMA PLEOMÓRFICO (tumor misto benigno) — mais comum, ~65% dos tumores salivares:
- Lesão sólida hipoecoica.
- Contornos bem definidos, lobulados.
- Geralmente homogêneo (heterogêneo se grandes).
- Vascularização periférica predominante ao Doppler.
- Frequente no lobo SUPERFICIAL da parótida.
- Pode ter pequenas calcificações em lesões antigas.

TUMOR DE WARTHIN (cistadenolinfoma) — ~10% dos tumores parotídeos, BENIGNO:
- Frequentemente MÚLTIPLO e BILATERAL (até 10% dos casos).
- Acomete PARÓTIDA (raríssimo na submandibular).
- Áreas císticas/anecoicas dentro do nódulo são típicas.
- Contornos bem definidos.
- Vascularização interna ao Doppler.
- Mais comum em homens, > 50 anos, tabagistas.

CARCINOMA MUCOEPIDERMOIDE / OUTRAS NEOPLASIAS MALIGNAS:
- Contornos IRREGULARES, mal definidos.
- Ecotextura heterogênea.
- Pode ter áreas císticas/necróticas centrais.
- Vascularização caótica/aumentada ao Doppler.
- Suspeição maior quando localizado no LOBO PROFUNDO da parótida ou na submandibular.

═══════════════════════════════════════════════════
FRASES VERBATIM
═══════════════════════════════════════════════════

CENÁRIO 1 — Nódulo único de aspecto benigno (sem rotular tipo específico):
"X) Nódulo sólido em [lobo superficial / profundo] da glândula parótida [direita / esquerda], medindo ___ x ___ x ___ mm, com contornos regulares e bem definidos, ecotextura [hipo/iso]ecoica homogênea, vascularização periférica preservada ao Doppler. Características ecográficas predominantemente benignas, podendo estar relacionado a etiologias como adenoma pleomórfico ou outras lesões sólidas benignas."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica e etiológica."

CENÁRIO 2 — Nódulo com características sugestivas de Warthin (parotídeo, com áreas císticas):
"X) Nódulo em [lobo superficial] de glândula parótida [lado], medindo ___ x ___ x ___ mm, com contornos regulares, ecotextura heterogênea com áreas císticas/anecoicas internas, vascularização ao Doppler. Características ecográficas compatíveis com lesão de comportamento benigno, podendo corresponder a tumor de Warthin."

CENÁRIO 3 — Múltiplos nódulos (suspeita Warthin bilateral ou outras):
"X) Múltiplos nódulos em glândulas parótidas [unilateral/bilateral], com características predominantemente sólido-císticas, o maior medindo ___ x ___ x ___ mm em [lado]. Achados sugestivos de natureza benigna, podendo corresponder a tumores de Warthin múltiplos (frequência aumentada em tabagistas)."

CENÁRIO 4 — Nódulo com características suspeitas de malignidade:
"X) Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm, com contornos IRREGULARES e/ou mal definidos, ecotextura heterogênea, [com/sem] áreas císticas/necróticas internas, vascularização [aumentada/caótica] ao Doppler. Características ecográficas suspeitas de atipia, sem permitir definição diagnóstica por imagem isoladamente."

"X) Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica, dado o padrão ecográfico suspeito."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- NÃO diagnosticar tipo histológico definitivo (adenoma pleomórfico, Warthin, carcinoma) pelo US isoladamente — apenas SUGERIR baseado em padrão ecográfico.
- NÃO classificar como "benigno definitivo" ou "maligno definitivo" — usar "predominantemente benigno" / "suspeito de atipia".
- NÃO recomendar tipo específico de procedimento (PAAF, parotidectomia superficial, exérese) — sugerir avaliação por especialista.
- NÃO atribuir Warthin sem caracterização ecográfica adequada (lesão sólido-cística parotídea).
- NÃO estender suspeição a lesões não descritas pelo médico.

═══════════════════════════════════════════════════
LIMITAÇÃO DIAGNÓSTICA — DECLARAR
═══════════════════════════════════════════════════

Frase obrigatória ao final da conclusão de nódulo:
"O diagnóstico histológico definitivo requer avaliação por especialista e, quando indicado, citologia/biópsia."$c$, version = version + 1, updated_at = now()
   where id = 'c54dccb2-3cdd-4a29-8828-a55fced8caa8' and status = 'validated' and md5(content) = '4a9121d0ceae88c00cfd052242d87099';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c54dccb2-3cdd-4a29-8828-a55fced8caa8', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO conclusao glandulas-salivares-conclusao-sialoadenite: trocas 23
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

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica." — só quando o médico ditar, na redação dele.

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
   where id = '154b5289-57a5-4a5a-9bd8-43eca0ce233e' and status = 'validated' and md5(content) = '856e598cb744f8b71671041cc1c4b754';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '154b5289-57a5-4a5a-9bd8-43eca0ce233e', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO conclusao glandulas-salivares-conclusao-sialoadenite: trocas 23
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

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica." — só quando o médico ditar, na redação dele.

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
   where id = 'ca410a09-3942-4771-8229-ed8c7c9e45d3' and status = 'validated' and md5(content) = '856e598cb744f8b71671041cc1c4b754';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'ca410a09-3942-4771-8229-ed8c7c9e45d3', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR conclusao glandulas-salivares-conclusao-sialoadenite: trocas 23
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

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica." — só quando o médico ditar, na redação dele.

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
   where id = '1576f72a-c6e7-4497-84e0-899d0e3598a4' and status = 'validated' and md5(content) = '856e598cb744f8b71671041cc1c4b754';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '1576f72a-c6e7-4497-84e0-899d0e3598a4', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO conclusao glandulas-salivares-conclusao-sialoadenite: trocas 23
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

"X) Convém, a critério clínico, complementar com correlação clínica para definição etiológica." — só quando o médico ditar, na redação dele.

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
   where id = 'c893fc4b-1c20-48e6-a82d-ee7fb26a8774' and status = 'validated' and md5(content) = '856e598cb744f8b71671041cc1c4b754';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'c893fc4b-1c20-48e6-a82d-ee7fb26a8774', n; end if;
  -- GLANDULAS_SALIVARES CLASSICO_COMPLETO regra glandulas-salivares-regra-medidas-padrao: trocas 8,9
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "dimensões parótida", "medidas glândula salivar", "ducto Stensen", "ducto Stenon", "ducto Wharton", "ducto principal", "parótida medindo", "submandibular medindo", "submaxilar medindo", "nódulo glandular medidas", "calibre ducto", "pedra no ducto", "caroço na parótida", "caroço submandibular".

REGRA — APRESENTAÇÃO DE MEDIDAS NO LAUDO DE GLÂNDULAS SALIVARES

═══════════════════════════════════════════════════
ESTRUTURA POR GLÂNDULA — QUANDO MEDIDAS FOREM INFORMADAS
═══════════════════════════════════════════════════

Apresentar as medidas APENAS quando o médico informar valores (em conformidade com AIUM: mensurar quando apropriado, especialmente em assimetria ou doença autoimune). Quando informadas, apresentar bilateralmente (direita + esquerda) seguindo essa ordem:

1. PARÓTIDA — DIMENSÕES + DUCTO:
   "Glândula parótida direita: dimensões AP ___ x longitudinal ___ mm (eixos anteroposterior x longitudinal). Ecotextura ___. Ducto de Stensen [não-visível / visível com diâmetro ___ mm]."
   "Glândula parótida esquerda: idem com valores."

2. SUBMANDIBULAR — DIMENSÕES + DUCTO:
   "Glândula submandibular direita: dimensões AP ___ x longitudinal ___ mm. Ecotextura ___. Ducto de Wharton [não-visível / visível com diâmetro ___ mm]."
   "Glândula submandibular esquerda: idem."

3. SUBLINGUAIS (mencionar somente se avaliadas):
   "Glândulas sublinguais avaliadas parcialmente, sem aumento volumétrico ou alteração focal."

═══════════════════════════════════════════════════
NÓDULO GLANDULAR — DIMENSÕES
═══════════════════════════════════════════════════

Quando houver nódulo na parótida ou submandibular, apresentar TRÊS dimensões:

"Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm (AP x transverso x longitudinal). [DESCRIÇÃO ECOGRÁFICA: contornos, ecotextura, vascularização, calcificações]."

Localização anatômica precisa:
- PARÓTIDA: especificar lobo (SUPERFICIAL = lateral ao plano facial; PROFUNDO = medial, parcialmente acessível ao US).
- SUBMANDIBULAR: superfície (anterior, médio, posterior).

═══════════════════════════════════════════════════
CÁLCULO (SIALOLITÍASE) — DIMENSÕES + LOCALIZAÇÃO
═══════════════════════════════════════════════════

Quando houver cálculo ductal ou glandular:
"Cálculo em [ducto de Stensen / ducto de Wharton / corpo glandular] de [glândula], medindo ___ mm, com [presença/ausência] de sombra acústica posterior, [com/sem] dilatação ductal a montante (calibre ___ mm)."

LIMITAÇÃO: cálculos < 2 mm podem não gerar sombra acústica. Mencionar quando relevante.

═══════════════════════════════════════════════════
DILATAÇÃO DUCTAL — REFERÊNCIAS CONTEXTUAIS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: os valores abaixo são REFERÊNCIAS para apoiar interpretação contextual. Diâmetros próximos do limite podem representar variação fisiológica (especialmente pós-estímulo salivar, citrato/limão) — NÃO inferir obstrução automaticamente.

- DUCTO DE STENSEN — comumente considerado dilatado quando > 2 mm. Zona cinzenta 1,5-2 mm: pode ser fisiológica ou inicial de processo obstrutivo.
- DUCTO DE WHARTON — comumente considerado dilatado quando > 3 mm. Zona cinzenta 2-3 mm: idem.

Quando o médico documentar dilatação ductal e juízo clínico de processo obstrutivo:
"Ducto de [Stensen/Wharton] de [glândula] dilatado, com calibre máximo de ___ mm. [Quando aplicável: associado a [cálculo / processo inflamatório a jusante / outro], sugerindo processo obstrutivo.]"

Quando só houver dilatação leve sem causa identificada:
"Ducto de [Stensen/Wharton] de [glândula] com calibre de ___ mm."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não citar dimensões se médico não mediu.
- Não inferir lobo profundo da parótida (parcialmente inacessível).
- Não estimar tamanho de cálculo se não foi medido.
- Não declarar "ducto pérvio" — apenas "ducto não-visível" ou "ducto visível com diâmetro X".$c$, version = version + 1, updated_at = now()
   where id = '20026fd8-486c-47fe-947b-9a213330ed94' and status = 'validated' and md5(content) = 'a49393db8f605e988b1e2d936ebb83f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '20026fd8-486c-47fe-947b-9a213330ed94', n; end if;
  -- GLANDULAS_SALIVARES DIRETO_OBJETIVO regra glandulas-salivares-regra-medidas-padrao: trocas 8,9
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "dimensões parótida", "medidas glândula salivar", "ducto Stensen", "ducto Stenon", "ducto Wharton", "ducto principal", "parótida medindo", "submandibular medindo", "submaxilar medindo", "nódulo glandular medidas", "calibre ducto", "pedra no ducto", "caroço na parótida", "caroço submandibular".

REGRA — APRESENTAÇÃO DE MEDIDAS NO LAUDO DE GLÂNDULAS SALIVARES

═══════════════════════════════════════════════════
ESTRUTURA POR GLÂNDULA — QUANDO MEDIDAS FOREM INFORMADAS
═══════════════════════════════════════════════════

Apresentar as medidas APENAS quando o médico informar valores (em conformidade com AIUM: mensurar quando apropriado, especialmente em assimetria ou doença autoimune). Quando informadas, apresentar bilateralmente (direita + esquerda) seguindo essa ordem:

1. PARÓTIDA — DIMENSÕES + DUCTO:
   "Glândula parótida direita: dimensões AP ___ x longitudinal ___ mm (eixos anteroposterior x longitudinal). Ecotextura ___. Ducto de Stensen [não-visível / visível com diâmetro ___ mm]."
   "Glândula parótida esquerda: idem com valores."

2. SUBMANDIBULAR — DIMENSÕES + DUCTO:
   "Glândula submandibular direita: dimensões AP ___ x longitudinal ___ mm. Ecotextura ___. Ducto de Wharton [não-visível / visível com diâmetro ___ mm]."
   "Glândula submandibular esquerda: idem."

3. SUBLINGUAIS (mencionar somente se avaliadas):
   "Glândulas sublinguais avaliadas parcialmente, sem aumento volumétrico ou alteração focal."

═══════════════════════════════════════════════════
NÓDULO GLANDULAR — DIMENSÕES
═══════════════════════════════════════════════════

Quando houver nódulo na parótida ou submandibular, apresentar TRÊS dimensões:

"Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm (AP x transverso x longitudinal). [DESCRIÇÃO ECOGRÁFICA: contornos, ecotextura, vascularização, calcificações]."

Localização anatômica precisa:
- PARÓTIDA: especificar lobo (SUPERFICIAL = lateral ao plano facial; PROFUNDO = medial, parcialmente acessível ao US).
- SUBMANDIBULAR: superfície (anterior, médio, posterior).

═══════════════════════════════════════════════════
CÁLCULO (SIALOLITÍASE) — DIMENSÕES + LOCALIZAÇÃO
═══════════════════════════════════════════════════

Quando houver cálculo ductal ou glandular:
"Cálculo em [ducto de Stensen / ducto de Wharton / corpo glandular] de [glândula], medindo ___ mm, com [presença/ausência] de sombra acústica posterior, [com/sem] dilatação ductal a montante (calibre ___ mm)."

LIMITAÇÃO: cálculos < 2 mm podem não gerar sombra acústica. Mencionar quando relevante.

═══════════════════════════════════════════════════
DILATAÇÃO DUCTAL — REFERÊNCIAS CONTEXTUAIS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: os valores abaixo são REFERÊNCIAS para apoiar interpretação contextual. Diâmetros próximos do limite podem representar variação fisiológica (especialmente pós-estímulo salivar, citrato/limão) — NÃO inferir obstrução automaticamente.

- DUCTO DE STENSEN — comumente considerado dilatado quando > 2 mm. Zona cinzenta 1,5-2 mm: pode ser fisiológica ou inicial de processo obstrutivo.
- DUCTO DE WHARTON — comumente considerado dilatado quando > 3 mm. Zona cinzenta 2-3 mm: idem.

Quando o médico documentar dilatação ductal e juízo clínico de processo obstrutivo:
"Ducto de [Stensen/Wharton] de [glândula] dilatado, com calibre máximo de ___ mm. [Quando aplicável: associado a [cálculo / processo inflamatório a jusante / outro], sugerindo processo obstrutivo.]"

Quando só houver dilatação leve sem causa identificada:
"Ducto de [Stensen/Wharton] de [glândula] com calibre de ___ mm."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não citar dimensões se médico não mediu.
- Não inferir lobo profundo da parótida (parcialmente inacessível).
- Não estimar tamanho de cálculo se não foi medido.
- Não declarar "ducto pérvio" — apenas "ducto não-visível" ou "ducto visível com diâmetro X".$c$, version = version + 1, updated_at = now()
   where id = '965edf26-715e-4d5c-b0af-e80f579c8684' and status = 'validated' and md5(content) = 'a49393db8f605e988b1e2d936ebb83f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '965edf26-715e-4d5c-b0af-e80f579c8684', n; end if;
  -- GLANDULAS_SALIVARES DETALHADO_PROTOCOLAR regra glandulas-salivares-regra-medidas-padrao: trocas 8,9
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "dimensões parótida", "medidas glândula salivar", "ducto Stensen", "ducto Stenon", "ducto Wharton", "ducto principal", "parótida medindo", "submandibular medindo", "submaxilar medindo", "nódulo glandular medidas", "calibre ducto", "pedra no ducto", "caroço na parótida", "caroço submandibular".

REGRA — APRESENTAÇÃO DE MEDIDAS NO LAUDO DE GLÂNDULAS SALIVARES

═══════════════════════════════════════════════════
ESTRUTURA POR GLÂNDULA — QUANDO MEDIDAS FOREM INFORMADAS
═══════════════════════════════════════════════════

Apresentar as medidas APENAS quando o médico informar valores (em conformidade com AIUM: mensurar quando apropriado, especialmente em assimetria ou doença autoimune). Quando informadas, apresentar bilateralmente (direita + esquerda) seguindo essa ordem:

1. PARÓTIDA — DIMENSÕES + DUCTO:
   "Glândula parótida direita: dimensões AP ___ x longitudinal ___ mm (eixos anteroposterior x longitudinal). Ecotextura ___. Ducto de Stensen [não-visível / visível com diâmetro ___ mm]."
   "Glândula parótida esquerda: idem com valores."

2. SUBMANDIBULAR — DIMENSÕES + DUCTO:
   "Glândula submandibular direita: dimensões AP ___ x longitudinal ___ mm. Ecotextura ___. Ducto de Wharton [não-visível / visível com diâmetro ___ mm]."
   "Glândula submandibular esquerda: idem."

3. SUBLINGUAIS (mencionar somente se avaliadas):
   "Glândulas sublinguais avaliadas parcialmente, sem aumento volumétrico ou alteração focal."

═══════════════════════════════════════════════════
NÓDULO GLANDULAR — DIMENSÕES
═══════════════════════════════════════════════════

Quando houver nódulo na parótida ou submandibular, apresentar TRÊS dimensões:

"Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm (AP x transverso x longitudinal). [DESCRIÇÃO ECOGRÁFICA: contornos, ecotextura, vascularização, calcificações]."

Localização anatômica precisa:
- PARÓTIDA: especificar lobo (SUPERFICIAL = lateral ao plano facial; PROFUNDO = medial, parcialmente acessível ao US).
- SUBMANDIBULAR: superfície (anterior, médio, posterior).

═══════════════════════════════════════════════════
CÁLCULO (SIALOLITÍASE) — DIMENSÕES + LOCALIZAÇÃO
═══════════════════════════════════════════════════

Quando houver cálculo ductal ou glandular:
"Cálculo em [ducto de Stensen / ducto de Wharton / corpo glandular] de [glândula], medindo ___ mm, com [presença/ausência] de sombra acústica posterior, [com/sem] dilatação ductal a montante (calibre ___ mm)."

LIMITAÇÃO: cálculos < 2 mm podem não gerar sombra acústica. Mencionar quando relevante.

═══════════════════════════════════════════════════
DILATAÇÃO DUCTAL — REFERÊNCIAS CONTEXTUAIS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: os valores abaixo são REFERÊNCIAS para apoiar interpretação contextual. Diâmetros próximos do limite podem representar variação fisiológica (especialmente pós-estímulo salivar, citrato/limão) — NÃO inferir obstrução automaticamente.

- DUCTO DE STENSEN — comumente considerado dilatado quando > 2 mm. Zona cinzenta 1,5-2 mm: pode ser fisiológica ou inicial de processo obstrutivo.
- DUCTO DE WHARTON — comumente considerado dilatado quando > 3 mm. Zona cinzenta 2-3 mm: idem.

Quando o médico documentar dilatação ductal e juízo clínico de processo obstrutivo:
"Ducto de [Stensen/Wharton] de [glândula] dilatado, com calibre máximo de ___ mm. [Quando aplicável: associado a [cálculo / processo inflamatório a jusante / outro], sugerindo processo obstrutivo.]"

Quando só houver dilatação leve sem causa identificada:
"Ducto de [Stensen/Wharton] de [glândula] com calibre de ___ mm."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não citar dimensões se médico não mediu.
- Não inferir lobo profundo da parótida (parcialmente inacessível).
- Não estimar tamanho de cálculo se não foi medido.
- Não declarar "ducto pérvio" — apenas "ducto não-visível" ou "ducto visível com diâmetro X".$c$, version = version + 1, updated_at = now()
   where id = 'd353af7d-1c65-400c-8852-0e90787f04d3' and status = 'validated' and md5(content) = 'a49393db8f605e988b1e2d936ebb83f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'd353af7d-1c65-400c-8852-0e90787f04d3', n; end if;
  -- GLANDULAS_SALIVARES OBJETIVO regra glandulas-salivares-regra-medidas-padrao: trocas 8,9
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO: "dimensões parótida", "medidas glândula salivar", "ducto Stensen", "ducto Stenon", "ducto Wharton", "ducto principal", "parótida medindo", "submandibular medindo", "submaxilar medindo", "nódulo glandular medidas", "calibre ducto", "pedra no ducto", "caroço na parótida", "caroço submandibular".

REGRA — APRESENTAÇÃO DE MEDIDAS NO LAUDO DE GLÂNDULAS SALIVARES

═══════════════════════════════════════════════════
ESTRUTURA POR GLÂNDULA — QUANDO MEDIDAS FOREM INFORMADAS
═══════════════════════════════════════════════════

Apresentar as medidas APENAS quando o médico informar valores (em conformidade com AIUM: mensurar quando apropriado, especialmente em assimetria ou doença autoimune). Quando informadas, apresentar bilateralmente (direita + esquerda) seguindo essa ordem:

1. PARÓTIDA — DIMENSÕES + DUCTO:
   "Glândula parótida direita: dimensões AP ___ x longitudinal ___ mm (eixos anteroposterior x longitudinal). Ecotextura ___. Ducto de Stensen [não-visível / visível com diâmetro ___ mm]."
   "Glândula parótida esquerda: idem com valores."

2. SUBMANDIBULAR — DIMENSÕES + DUCTO:
   "Glândula submandibular direita: dimensões AP ___ x longitudinal ___ mm. Ecotextura ___. Ducto de Wharton [não-visível / visível com diâmetro ___ mm]."
   "Glândula submandibular esquerda: idem."

3. SUBLINGUAIS (mencionar somente se avaliadas):
   "Glândulas sublinguais avaliadas parcialmente, sem aumento volumétrico ou alteração focal."

═══════════════════════════════════════════════════
NÓDULO GLANDULAR — DIMENSÕES
═══════════════════════════════════════════════════

Quando houver nódulo na parótida ou submandibular, apresentar TRÊS dimensões:

"Nódulo em [glândula], [lobo se parótida], medindo ___ x ___ x ___ mm (AP x transverso x longitudinal). [DESCRIÇÃO ECOGRÁFICA: contornos, ecotextura, vascularização, calcificações]."

Localização anatômica precisa:
- PARÓTIDA: especificar lobo (SUPERFICIAL = lateral ao plano facial; PROFUNDO = medial, parcialmente acessível ao US).
- SUBMANDIBULAR: superfície (anterior, médio, posterior).

═══════════════════════════════════════════════════
CÁLCULO (SIALOLITÍASE) — DIMENSÕES + LOCALIZAÇÃO
═══════════════════════════════════════════════════

Quando houver cálculo ductal ou glandular:
"Cálculo em [ducto de Stensen / ducto de Wharton / corpo glandular] de [glândula], medindo ___ mm, com [presença/ausência] de sombra acústica posterior, [com/sem] dilatação ductal a montante (calibre ___ mm)."

LIMITAÇÃO: cálculos < 2 mm podem não gerar sombra acústica. Mencionar quando relevante.

═══════════════════════════════════════════════════
DILATAÇÃO DUCTAL — REFERÊNCIAS CONTEXTUAIS (NÃO GATES)
═══════════════════════════════════════════════════

ATENÇÃO: os valores abaixo são REFERÊNCIAS para apoiar interpretação contextual. Diâmetros próximos do limite podem representar variação fisiológica (especialmente pós-estímulo salivar, citrato/limão) — NÃO inferir obstrução automaticamente.

- DUCTO DE STENSEN — comumente considerado dilatado quando > 2 mm. Zona cinzenta 1,5-2 mm: pode ser fisiológica ou inicial de processo obstrutivo.
- DUCTO DE WHARTON — comumente considerado dilatado quando > 3 mm. Zona cinzenta 2-3 mm: idem.

Quando o médico documentar dilatação ductal e juízo clínico de processo obstrutivo:
"Ducto de [Stensen/Wharton] de [glândula] dilatado, com calibre máximo de ___ mm. [Quando aplicável: associado a [cálculo / processo inflamatório a jusante / outro], sugerindo processo obstrutivo.]"

Quando só houver dilatação leve sem causa identificada:
"Ducto de [Stensen/Wharton] de [glândula] com calibre de ___ mm."

═══════════════════════════════════════════════════
NÃO INVENTAR
═══════════════════════════════════════════════════

- Não citar dimensões se médico não mediu.
- Não inferir lobo profundo da parótida (parcialmente inacessível).
- Não estimar tamanho de cálculo se não foi medido.
- Não declarar "ducto pérvio" — apenas "ducto não-visível" ou "ducto visível com diâmetro X".$c$, version = version + 1, updated_at = now()
   where id = '6a18785f-58e8-4a48-b575-a935a7c3f5ef' and status = 'validated' and md5(content) = 'a49393db8f605e988b1e2d936ebb83f6';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '6a18785f-58e8-4a48-b575-a935a7c3f5ef', n; end if;
  -- PARTES_MOLES CLASSICO_COMPLETO regra partes-moles-regra-como-descrever-alteracoes: trocas 2,3
  update knowledge_blocks set content = $c$COMO DESCREVER ALTERAÇÕES:

Nódulo/Massa sólida:
Achados: "Imagem nodular sólida, [hipoecoica/isoecoica/hiperecoica/heterogênea], de contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [tecido subcutâneo/plano muscular/interface] da região [local], [com/sem] fluxo ao Doppler colorido."
Conclusão: "Imagem nodular sólida na região [local], a esclarecer." ou "Achados compatíveis com lipoma." (quando hiperecoico, homogêneo, compressível)

Cisto/Coleção:
Achados: "Imagem cística/coleção [anecoica/com ecos internos/septada], de paredes [finas/espessas] e contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [local]."
Conclusão: "Coleção [líquida/complexa] na região [local], podendo corresponder a [abscesso/hematoma/cisto de inclusão epidérmica/higroma]."

Corpo estranho:
Achados: "Imagem linear hiperecoica com reverberação posterior, medindo aproximadamente ___ cm, localizada no [tecido subcutâneo/plano muscular] da região [local], compatível com corpo estranho."
Conclusão: "Imagem compatível com corpo estranho na região [local]."

Hérnia incisional:
Achados: "Solução de continuidade na [aponeurose/fáscia] da região [local], medindo ___ cm, com herniação de [gordura/alça intestinal], [redutível/irredutível] à compressão."
Conclusão: "Hérnia [incisional/epigástrica] na região [local]."$c$, version = version + 1, updated_at = now()
   where id = '00f4ebc2-2157-4f59-b583-431e6609a588' and status = 'validated' and md5(content) = 'fcc53174afa014481bbf2f9fa11db289';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '00f4ebc2-2157-4f59-b583-431e6609a588', n; end if;
  -- PARTES_MOLES DIRETO_OBJETIVO regra partes-moles-regra-como-descrever-alteracoes: trocas 2,3
  update knowledge_blocks set content = $c$COMO DESCREVER ALTERAÇÕES:

Nódulo/Massa sólida:
Achados: "Imagem nodular sólida, [hipoecoica/isoecoica/hiperecoica/heterogênea], de contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [tecido subcutâneo/plano muscular/interface] da região [local], [com/sem] fluxo ao Doppler colorido."
Conclusão: "Imagem nodular sólida na região [local], a esclarecer." ou "Achados compatíveis com lipoma." (quando hiperecoico, homogêneo, compressível)

Cisto/Coleção:
Achados: "Imagem cística/coleção [anecoica/com ecos internos/septada], de paredes [finas/espessas] e contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [local]."
Conclusão: "Coleção [líquida/complexa] na região [local], podendo corresponder a [abscesso/hematoma/cisto de inclusão epidérmica/higroma]."

Corpo estranho:
Achados: "Imagem linear hiperecoica com reverberação posterior, medindo aproximadamente ___ cm, localizada no [tecido subcutâneo/plano muscular] da região [local], compatível com corpo estranho."
Conclusão: "Imagem compatível com corpo estranho na região [local]."

Hérnia incisional:
Achados: "Solução de continuidade na [aponeurose/fáscia] da região [local], medindo ___ cm, com herniação de [gordura/alça intestinal], [redutível/irredutível] à compressão."
Conclusão: "Hérnia [incisional/epigástrica] na região [local]."$c$, version = version + 1, updated_at = now()
   where id = '10a9ba65-5de6-4c79-84da-416c26c0668f' and status = 'validated' and md5(content) = 'fcc53174afa014481bbf2f9fa11db289';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '10a9ba65-5de6-4c79-84da-416c26c0668f', n; end if;
  -- PARTES_MOLES DETALHADO_PROTOCOLAR regra partes-moles-regra-como-descrever-alteracoes: trocas 2,3
  update knowledge_blocks set content = $c$COMO DESCREVER ALTERAÇÕES:

Nódulo/Massa sólida:
Achados: "Imagem nodular sólida, [hipoecoica/isoecoica/hiperecoica/heterogênea], de contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [tecido subcutâneo/plano muscular/interface] da região [local], [com/sem] fluxo ao Doppler colorido."
Conclusão: "Imagem nodular sólida na região [local], a esclarecer." ou "Achados compatíveis com lipoma." (quando hiperecoico, homogêneo, compressível)

Cisto/Coleção:
Achados: "Imagem cística/coleção [anecoica/com ecos internos/septada], de paredes [finas/espessas] e contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [local]."
Conclusão: "Coleção [líquida/complexa] na região [local], podendo corresponder a [abscesso/hematoma/cisto de inclusão epidérmica/higroma]."

Corpo estranho:
Achados: "Imagem linear hiperecoica com reverberação posterior, medindo aproximadamente ___ cm, localizada no [tecido subcutâneo/plano muscular] da região [local], compatível com corpo estranho."
Conclusão: "Imagem compatível com corpo estranho na região [local]."

Hérnia incisional:
Achados: "Solução de continuidade na [aponeurose/fáscia] da região [local], medindo ___ cm, com herniação de [gordura/alça intestinal], [redutível/irredutível] à compressão."
Conclusão: "Hérnia [incisional/epigástrica] na região [local]."$c$, version = version + 1, updated_at = now()
   where id = '25c08b10-07d6-4306-be4f-7e65fee21cd1' and status = 'validated' and md5(content) = 'fcc53174afa014481bbf2f9fa11db289';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '25c08b10-07d6-4306-be4f-7e65fee21cd1', n; end if;
  -- PARTES_MOLES OBJETIVO regra partes-moles-regra-como-descrever-alteracoes: trocas 2,3
  update knowledge_blocks set content = $c$COMO DESCREVER ALTERAÇÕES:

Nódulo/Massa sólida:
Achados: "Imagem nodular sólida, [hipoecoica/isoecoica/hiperecoica/heterogênea], de contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [tecido subcutâneo/plano muscular/interface] da região [local], [com/sem] fluxo ao Doppler colorido."
Conclusão: "Imagem nodular sólida na região [local], a esclarecer." ou "Achados compatíveis com lipoma." (quando hiperecoico, homogêneo, compressível)

Cisto/Coleção:
Achados: "Imagem cística/coleção [anecoica/com ecos internos/septada], de paredes [finas/espessas] e contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [local]."
Conclusão: "Coleção [líquida/complexa] na região [local], podendo corresponder a [abscesso/hematoma/cisto de inclusão epidérmica/higroma]."

Corpo estranho:
Achados: "Imagem linear hiperecoica com reverberação posterior, medindo aproximadamente ___ cm, localizada no [tecido subcutâneo/plano muscular] da região [local], compatível com corpo estranho."
Conclusão: "Imagem compatível com corpo estranho na região [local]."

Hérnia incisional:
Achados: "Solução de continuidade na [aponeurose/fáscia] da região [local], medindo ___ cm, com herniação de [gordura/alça intestinal], [redutível/irredutível] à compressão."
Conclusão: "Hérnia [incisional/epigástrica] na região [local]."$c$, version = version + 1, updated_at = now()
   where id = '04baa87b-bae3-4b94-8e04-334148cd8b68' and status = 'validated' and md5(content) = 'fcc53174afa014481bbf2f9fa11db289';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '04baa87b-bae3-4b94-8e04-334148cd8b68', n; end if;
  -- PROSTATA_TRANSRETAL CLASSICO_COMPLETO regra prostata-transretal-regra-prostatite: trocas 1
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- prostatite
- processo inflamatório

REGRA — PROSTATITE

No corpo:
"Próstata de ecotextura heterogênea, com áreas hipoecoicas e hiperemia ao Doppler."

Na conclusão:
"Alterações ecográficas que podem corresponder a prostatite."$c$, version = version + 1, updated_at = now()
   where id = '1017fabe-25c2-426b-ba9a-4db907304b4f' and status = 'validated' and md5(content) = '2b851ada1450e547d1407da840d38f09';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '1017fabe-25c2-426b-ba9a-4db907304b4f', n; end if;
  -- PROSTATA_TRANSRETAL DIRETO_OBJETIVO regra prostata-transretal-regra-prostatite: trocas 1
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- prostatite
- processo inflamatório

REGRA — PROSTATITE

No corpo:
"Próstata de ecotextura heterogênea, com áreas hipoecoicas e hiperemia ao Doppler."

Na conclusão:
"Alterações ecográficas que podem corresponder a prostatite."$c$, version = version + 1, updated_at = now()
   where id = '7dda8415-f301-4073-b712-02826e0d5675' and status = 'validated' and md5(content) = '2b851ada1450e547d1407da840d38f09';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '7dda8415-f301-4073-b712-02826e0d5675', n; end if;
  -- PROSTATA_TRANSRETAL DETALHADO_PROTOCOLAR regra prostata-transretal-regra-prostatite: trocas 1
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- prostatite
- processo inflamatório

REGRA — PROSTATITE

No corpo:
"Próstata de ecotextura heterogênea, com áreas hipoecoicas e hiperemia ao Doppler."

Na conclusão:
"Alterações ecográficas que podem corresponder a prostatite."$c$, version = version + 1, updated_at = now()
   where id = '698ab5b6-166a-4393-b94e-39b2daef050d' and status = 'validated' and md5(content) = '2b851ada1450e547d1407da840d38f09';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '698ab5b6-166a-4393-b94e-39b2daef050d', n; end if;
  -- PROSTATA_TRANSRETAL OBJETIVO regra prostata-transretal-regra-prostatite: trocas 1
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- prostatite
- processo inflamatório

REGRA — PROSTATITE

No corpo:
"Próstata de ecotextura heterogênea, com áreas hipoecoicas e hiperemia ao Doppler."

Na conclusão:
"Alterações ecográficas que podem corresponder a prostatite."$c$, version = version + 1, updated_at = now()
   where id = '2d0fbd78-5fb7-48d2-9090-da1bf178dbaf' and status = 'validated' and md5(content) = '2b851ada1450e547d1407da840d38f09';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '2d0fbd78-5fb7-48d2-9090-da1bf178dbaf', n; end if;
  -- TRANSFONTANELA CLASSICO_COMPLETO regra transfontanela-regra-ventriculomegalia: trocas 5
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- ventriculomegalia
- dilatação ventricular
- hidrocefalia

REGRA — VENTRICULOMEGALIA

No corpo:
"Dilatação do sistema ventricular, com ___ (índice ventricular / átrio medindo ___), de aspecto ___ (simétrico/assimétrico)."

Na conclusão:
"Ventriculomegalia ___."$c$, version = version + 1, updated_at = now()
   where id = 'f891aa3b-161a-4a7d-973b-c4b5964d8c7e' and status = 'validated' and md5(content) = '2806de0b37d242555a4402d397341900';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'f891aa3b-161a-4a7d-973b-c4b5964d8c7e', n; end if;
  -- TRANSFONTANELA DIRETO_OBJETIVO regra transfontanela-regra-ventriculomegalia: trocas 5
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- ventriculomegalia
- dilatação ventricular
- hidrocefalia

REGRA — VENTRICULOMEGALIA

No corpo:
"Dilatação do sistema ventricular, com ___ (índice ventricular / átrio medindo ___), de aspecto ___ (simétrico/assimétrico)."

Na conclusão:
"Ventriculomegalia ___."$c$, version = version + 1, updated_at = now()
   where id = '4be86a81-b06d-4a3e-92ce-ab5449ecafc1' and status = 'validated' and md5(content) = '2806de0b37d242555a4402d397341900';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '4be86a81-b06d-4a3e-92ce-ab5449ecafc1', n; end if;
  -- TRANSFONTANELA DETALHADO_PROTOCOLAR regra transfontanela-regra-ventriculomegalia: trocas 5
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- ventriculomegalia
- dilatação ventricular
- hidrocefalia

REGRA — VENTRICULOMEGALIA

No corpo:
"Dilatação do sistema ventricular, com ___ (índice ventricular / átrio medindo ___), de aspecto ___ (simétrico/assimétrico)."

Na conclusão:
"Ventriculomegalia ___."$c$, version = version + 1, updated_at = now()
   where id = 'ef0a370e-bef8-4195-9476-1201b5ef9f0f' and status = 'validated' and md5(content) = '2806de0b37d242555a4402d397341900';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'ef0a370e-bef8-4195-9476-1201b5ef9f0f', n; end if;
  -- TRANSFONTANELA OBJETIVO regra transfontanela-regra-ventriculomegalia: trocas 5
  update knowledge_blocks set content = $c$GATILHOS DE APLICAÇÃO:
- ventriculomegalia
- dilatação ventricular
- hidrocefalia

REGRA — VENTRICULOMEGALIA

No corpo:
"Dilatação do sistema ventricular, com ___ (índice ventricular / átrio medindo ___), de aspecto ___ (simétrico/assimétrico)."

Na conclusão:
"Ventriculomegalia ___."$c$, version = version + 1, updated_at = now()
   where id = 'b9e13a43-fffc-4953-81e4-d63811502828' and status = 'validated' and md5(content) = '2806de0b37d242555a4402d397341900';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'b9e13a43-fffc-4953-81e4-d63811502828', n; end if;
  -- VIAS_URINARIAS DIRETO_OBJETIVO conclusao vias-urinarias-conclusao-com-recomendacao-clinica: trocas 22
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Massa renal sólida**:
   "Convém, a critério clínico, complementação com tomografia computadorizada de abdome com contraste e avaliação urológica."

2. **Cisto renal complexo** (Bosniak ≥ II):
   "Convém, a critério clínico, complementação com tomografia computadorizada ou ressonância magnética para classificação Bosniak."

3. **Hidronefrose acentuada com afilamento cortical**:
   "Sugere uropatia obstrutiva crônica — recomenda-se avaliação urológica."

4. **Hidronefrose secundária a cálculo ureteral** em paciente com dor aguda:
   "Encaminhamento urológico em caráter de urgência."

5. **Espessamento difuso de paredes vesicais com trabeculação**:
   "Convém, a critério clínico, correlacionar com obstrução infravesical crônica (ex: hiperplasia prostática em homens, estenose uretral)."

6. **Espessamento focal vesical** (suspeita de neoplasia):
   "Convém, a critério clínico, complementação com cistoscopia."

7. **Volume residual pós-miccional aumentado** (> 100 mL):
   "Convém, a critério clínico, correlacionar com queixas urinárias."

8. **Achado incidental em paciente assintomático** (ex: cisto simples pequeno):
   "Achado de provável relevância clínica reduzida — correlacionar com queixa clínica." — só quando o médico ditar, na redação dele.

Boa prática: anexar a recomendação ao MESMO item numerado do achado.$c$, version = version + 1, updated_at = now()
   where id = 'fb7603be-ea5d-4ec2-bbe2-5bae5c7813da' and status = 'validated' and md5(content) = 'ca59e97a52dc4e1b9bb8f26dc83957ee';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', 'fb7603be-ea5d-4ec2-bbe2-5bae5c7813da', n; end if;
  -- VIAS_URINARIAS DETALHADO_PROTOCOLAR conclusao vias-urinarias-conclusao-com-recomendacao-clinica: trocas 22
  update knowledge_blocks set content = $c$REGRA — RECOMENDAÇÃO CLÍNICA NA CONCLUSÃO

Achados que devem vir acompanhados de recomendação clínica explícita:

1. **Massa renal sólida**:
   "Convém, a critério clínico, complementação com tomografia computadorizada de abdome com contraste e avaliação urológica."

2. **Cisto renal complexo** (Bosniak ≥ II):
   "Convém, a critério clínico, complementação com tomografia computadorizada ou ressonância magnética para classificação Bosniak."

3. **Hidronefrose acentuada com afilamento cortical**:
   "Sugere uropatia obstrutiva crônica — recomenda-se avaliação urológica."

4. **Hidronefrose secundária a cálculo ureteral** em paciente com dor aguda:
   "Encaminhamento urológico em caráter de urgência."

5. **Espessamento difuso de paredes vesicais com trabeculação**:
   "Convém, a critério clínico, correlacionar com obstrução infravesical crônica (ex: hiperplasia prostática em homens, estenose uretral)."

6. **Espessamento focal vesical** (suspeita de neoplasia):
   "Convém, a critério clínico, complementação com cistoscopia."

7. **Volume residual pós-miccional aumentado** (> 100 mL):
   "Convém, a critério clínico, correlacionar com queixas urinárias."

8. **Achado incidental em paciente assintomático** (ex: cisto simples pequeno):
   "Achado de provável relevância clínica reduzida — correlacionar com queixa clínica." — só quando o médico ditar, na redação dele.

Boa prática: anexar a recomendação ao MESMO item numerado do achado.$c$, version = version + 1, updated_at = now()
   where id = '545ac93b-c02d-4747-bf25-ea068b37b4c2' and status = 'validated' and md5(content) = 'ca59e97a52dc4e1b9bb8f26dc83957ee';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bloco % mudou desde a leitura (esperado 1, veio %)', '545ac93b-c02d-4747-bf25-ea068b37b4c2', n; end if;
end
$correlacionar$;
commit;
