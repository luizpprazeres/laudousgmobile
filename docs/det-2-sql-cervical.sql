-- DET-2 CERVICAL — artefato revisavel.
-- Nao executar sem revisar. Arquiva duplicatas/reescritas, preservando a
-- curadoria mobile de Robbins e criterios linfonodais.
-- Semeia a fonte viva original como modelo base apenas quando faltar modelo
-- validated para o estilo.

begin;

update knowledge_blocks
set status = 'archived',
    updated_at = now()
where category_code = 'CERVICAL'
  and status = 'validated'
  and not ('seed:det-2' = any(coalesce(tags, array[]::text[])))
  and title in (
    'cervical-modelo-template-padrao',
    'cervical-regra-medidas-padrao',
    'cervical-conclusao-linfonodo-suspeito-malignidade',
    'cervical-conclusao-exame-normal',
    'cervical-conclusao-linfadenopatia-reacional',
    'cervical-excecao-massa-cervical-cistica-adulto'
  );

insert into knowledge_blocks (
  category_code,
  writing_style_id,
  kind,
  title,
  content,
  status,
  priority,
  version,
  tags
)
select
  'CERVICAL',
  ws.id,
  'modelo',
  'cervical-modelo-template-padrao',
  $c$FUNÇÃO: Gerar laudos de ultrassonografia cervical, seguindo rigorosamente o modelo e as regras abaixo.

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
Achados: "Linfonodo de dimensões aumentadas no nível ___, medindo ___ x ___ x ___ cm, de forma arredondada / oval, com periferia hipoecoica e centro hiperecoico / sem hilo ecogênico identificável, com vascularização ___ ao Doppler colorido."
Conclusão: "Linfonodo de aspecto suspeito no nível ___. Correlacionar com achados clínicos."$c$,
  'validated',
  100,
  1,
  array[
    'cervical',
    'modelo',
    'template',
    'seed:det-2',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:3559-3610'
  ]::text[]
from writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO', 'OBJETIVO')
  and not exists (
    select 1
    from knowledge_blocks kb
    where kb.category_code = 'CERVICAL'
      and kb.writing_style_id = ws.id
      and kb.kind = 'modelo'
      and kb.status = 'validated'
  );

commit;

-- SQLs DET-2 DEX2 CORRIGIDOS
