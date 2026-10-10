-- W10b (10/10/2026) — PROPOSTA, NÃO APLICADA. Biblioteca do writer de ABDOMEN_TOTAL e VIAS_URINARIAS
-- (estilo CLASSICO_COMPLETO). Medida só na bancada via BENCH_BIBLIOTECA=docs/stories/haiku-migration/W10b-biblioteca-proposta.json.
-- Aplicar só com GO do Luiz, numa transação, conferindo antes que cada UPDATE afeta exatamente 1 linha.
begin;

-- ABDOMEN_TOTAL: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'ABDOMEN_TOTAL' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'abdomen-total-regra-frases-normais-quando-omitido';

-- ABDOMEN_TOTAL: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'ABDOMEN_TOTAL' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'abdomen-total-regra-preservar-terminologia-do-medico';

-- ABDOMEN_TOTAL: reescrever
update knowledge_blocks set content = $w10b$MODELO-BASE PADRÃO — ABDOME TOTAL:

ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz, inicialmente do abdome superior com paciente em jejum e posteriormente com a bexiga repleta do abdome inferior. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal como também em ortostase. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fígado de dimensões normais, contornos regulares e ecotextura homogênea.
Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.
Veia porta de calibre normal.
Vesícula biliar de topografia usual e de parede fina, sem cálculo.
Canal hepático e canal colédoco de calibre normal.
Baço de dimensões normais e ecotextura sólida e homogênea.
Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam dimensões normais.
Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.
Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.
Veia cava inferior de calibre e contornos normais.
Aorta abdominal de calibre e contornos normais.
Bexiga de forma, contorno e ecotextura normais.

CONCLUSÃO:
Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.$w10b$, version = version + 1, updated_at = now()
 where category_code = 'ABDOMEN_TOTAL' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'abdomen-total-modelo-template-padrao';

-- ABDOMEN_TOTAL: reescrever
update knowledge_blocks set content = $w10b$GATILHOS DE APLICAÇÃO:
- esteatose
- fígado
- hepática
- área poupada
- cisto hepático
- doença hepática crônica

1. ESTEATOSE HEPÁTICA LEVE
No corpo: "Fígado de dimensões normais, com discreto aumento da ecogenicidade parenquimatosa."
Na conclusão: "Esteatose hepática, grau leve."

2. ESTEATOSE HEPÁTICA MODERADA
No corpo: "Fígado de dimensões normais, com aumento difuso da ecogenicidade parenquimatosa e atenuação sonora." e, no lugar da linha dos vasos, "Os vasos intra-hepáticos e o diafragma foram visualizados parcialmente."
Na conclusão: "Esteatose hepática, grau moderado."

3. ESTEATOSE HEPÁTICA ACENTUADA
No corpo: "Fígado de dimensões normais, apresentando aumento difuso da ecogenicidade parenquimatosa e importante atenuação sonora." e, no lugar da linha dos vasos, "Os vasos intra-hepáticos e o diafragma foram visualizados parcialmente."
Na conclusão: "Esteatose hepática, grau acentuado."

4. DOENÇA HEPÁTICA CRÔNICA
No corpo: "Fígado de dimensões normais, apresentando modificação da ecogenicidade e ecotextura parenquimatosa."
Na conclusão: "Sinais de doença hepática crônica."

5. ÁREA POUPADA DA ESTEATOSE
No corpo: "Imagem hipoecoica, de contornos mal delimitados, medindo X x Y x Z cm, situada no segmento IV."
Na conclusão: "Imagem hipoecoica no segmento IV hepático, que tem como diagnóstico mais provável área poupada da esteatose."

6. CISTO HEPÁTICO SIMPLES
No corpo: "Imagem anecoica homogênea, com margem regular, medindo X x Y x Z cm, sem calcificações, situada no segmento VII."
Na conclusão: "Cisto hepático sem septações no segmento VII."$w10b$, version = version + 1, updated_at = now()
 where category_code = 'ABDOMEN_TOTAL' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'abdomen-total-regra-figado-variantes';

-- ABDOMEN_TOTAL: reescrever
update knowledge_blocks set content = $w10b$FECHAMENTO DA CONCLUSÃO
- Exame normal: "Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas." (item único, sem número).
- Com achados: um item numerado por achado ("1.", "2."…) e, como ÚLTIMO item numerado, "Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas."

Exemplo:
1. Esteatose hepática, grau leve.
2. Litíase da vesícula biliar.
3. Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.$w10b$, version = version + 1, updated_at = now()
 where category_code = 'ABDOMEN_TOTAL' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'abdomen-total-conclusao-fechamento-com-achados';

-- VIAS_URINARIAS: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-regra-funcao-e-regras-gerais';

-- VIAS_URINARIAS: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-frase-rins-normais';

-- VIAS_URINARIAS: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-conclusao-numeracao-obrigatoria';

-- VIAS_URINARIAS: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-conclusao-fechamento-com-achados';

-- VIAS_URINARIAS: arquivar (redundante ou em conflito com os laudos assinados)
update knowledge_blocks set status = 'archived', updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-conclusao-com-recomendacao-clinica';

-- VIAS_URINARIAS: reescrever
update knowledge_blocks set content = $w10b$MODELO-BASE PADRÃO — ULTRASSONOGRAFIA DAS VIAS URINÁRIAS:

ULTRASSONOGRAFIA DAS VIAS URINÁRIAS

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes dos rins, em decúbito dorsal e ventral. Após repleção vesical foram realizados cortes da pelve com o paciente em decúbito dorsal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Rim direito com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais.
Medida do rim direito: X,X x X,X x X,X cm. (só se ditada)
Medida da espessura do parênquima do rim direito: X,X cm. (só se ditada)
Rim esquerdo com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais.
Medida do rim esquerdo: X,X x X,X x X,X cm. (só se ditada)
Medida da espessura do parênquima do rim esquerdo: X,X cm. (só se ditada)
Bexiga de forma, contorno e ecotextura normais.
Volume pré-miccional de X,X mL. (só se ditado)
Espessura da parede vesical de X,X cm. (só se ditada)

CONCLUSÃO:
1) Rins ecograficamente normais.
2) Não há sinais de dilatação ureteral.
3) Bexiga ecograficamente normal.
4) Resíduo pós-miccional de X,X cm³. (só se ditado; "desprezível" quando assim ditado)$w10b$, version = version + 1, updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-modelo-template-padrao';

-- VIAS_URINARIAS: reescrever
update knowledge_blocks set content = $w10b$EXCEÇÃO — ACHADO CÍSTICO RENAL COMPLEXO

Se houver margem irregular, calcificação periférica, septações, paredes espessadas ou componente sólido, NÃO escrever "cisto simples".
No corpo, na frase do rim: "…, apresentando imagem cística com calcificação periférica puntiforme, medindo 3,2 x 2,8 x 3,0 cm, situada no terço médio."
Na conclusão: "Cisto no rim direito apresentando finos septos, de aspecto inespecífico."
Não usar classificação Bosniak (exclusiva de tomografia/ressonância). Recomendação só quando ditada.$w10b$, version = version + 1, updated_at = now()
 where category_code = 'VIAS_URINARIAS' and writing_style_id = (select id from writing_styles where code = 'CLASSICO_COMPLETO') and status = 'validated' and title = 'vias-urinarias-excecao-achado-cistico-renal-complexo';

-- conferir e então: commit;  (ou rollback;)
