-- DET-2 OBSTETRICA — artefato de revisão, NAO EXECUTADO.
-- Parse mental:
-- - Usa apenas UPDATE por category_code/title/status e INSERT...SELECT por writing_styles.
-- - Dollar quoting $c$...$c$ nao conflita com o conteudo.
-- - Reexecutar nao duplica seeds: NOT EXISTS exige title + writing_style_id + tag seed:det-2.
-- - O UPDATE dos modelos antigos exclui tags seed:det-2 para nao arquivar o seed novo em rerun.

begin;

-- 1) Arquivar modelos reescritos e fragmentos duplicados.
update public.knowledge_blocks
set status = 'archived', updated_at = now()
where category_code = 'OBSTETRICA'
  and status = 'validated'
  and not ('seed:det-2' = any(tags))
  and title in (
    'obstetrica-modelo-template-inicial',
    'obstetrica-modelo-template-padrao',
    'obstetrica-regra-selecao-automatica-modelo',
    'obstetrica-regra-calculo-dsm',
    'obstetrica-regra-modelo-inicial',
    'obstetrica-regra-placenta-morfologicos',
    'obstetrica-frase-primeira-usg-dum',
    'obstetrica-frase-biometria-fetal',
    'obstetrica-frase-inicial-achados',
    'obstetrica-frase-apresentacao-e-vitalidade',
    'obstetrica-frase-comentarios-padrao',
    'obstetrica-frase-placenta-padrao',
    'obstetrica-frase-anatomia-basica',
    'obstetrica-conclusao-gestacao-inicial',
    'obstetrica-conclusao-gestacao-padrao',
    'obstetrica-conclusao-peso-fetal-percentil',
    'obstetrica-excecao-titulo',
    'obstetrica-excecao-marcadores-liquido-amniotico'
  );

-- 2) Seed verbatim da fonte viva: MODELO PADRAO.
insert into public.knowledge_blocks (
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
  'OBSTETRICA',
  ws.id,
  'modelo'::rag_block_kind,
  'obstetrica-modelo-template-padrao',
  $c$ULTRASSONOGRAFIA OBSTÉTRICA

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação __________________, com dorso __________________.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ____ bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
O estômago e a bexiga foram bem identificados e com ecotextura homogênea.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de ____ mm.
Circunferência da cabeça (CC) de ____ mm.
Circunferência abdominal (CA) de ____ mm.
Comprimento do fêmur (CF) de ____ mm.
Peso aproximado de ____ gramas (+- ____ gramas, percentil ____).

Placenta de localização __________________, com ecotextura _________________.
{LINHA_LIQUIDO_AMNIOTICO}

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
{CONCLUSAO_LIQUIDO_AMNIOTICO}$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'obstetrica',
    'modelo',
    'padrao',
    'variant:padrao',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:50-80'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'OBSTETRICA'
      and kb.writing_style_id = ws.id
      and kb.title = 'obstetrica-modelo-template-padrao'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

-- 3) Seed verbatim da fonte viva: MODELO INICIAL.
insert into public.knowledge_blocks (
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
  'OBSTETRICA',
  ws.id,
  'modelo'::rag_block_kind,
  'obstetrica-modelo-template-inicial',
  $c$ULTRASSONOGRAFIA OBSTÉTRICA

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Saco gestacional de forma normal, com diâmetro médio de ____ mm.
Embrião único, de situação ____, com polo cefálico à ____.
Batimentos cardíacos ritmados (BCF = ____ bpm).
Comprimento crânio-nádegas (CCN) de ____ mm.
Vesícula vitelina de forma e dimensões normais.
Líquido amniótico de quantidade normal pela análise subjetiva.
Ovários de aspecto normal.

CONCLUSÃO:
Gestação em torno de ____ semanas e ____ dias.$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'obstetrica',
    'modelo',
    'inicial',
    'variant:inicial',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:82-99'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'OBSTETRICA'
      and kb.writing_style_id = ws.id
      and kb.title = 'obstetrica-modelo-template-inicial'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

-- 4) Seeds do estilo OBJETIVO. OBSTETRICA tem selector inicial/padrao; ambos
-- precisam existir para o gate nao bloquear quando o ditado escolher a variante.
insert into public.knowledge_blocks (
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
  'OBSTETRICA',
  ws.id,
  'modelo'::rag_block_kind,
  'obstetrica-modelo-objetivo-padrao',
  $c$ULTRASSONOGRAFIA OBSTÉTRICA

TÉCNICA:
Exame realizado com transdutor de 4.0 MHz.

ANÁLISE:
Idade gestacional: [semanas e dias informados — obrigatório se ditado].
Gestação: [única ou múltipla, apresentação e BCF].
Placenta: [localização e aspecto se informados].
Líquido amniótico: [descrição se informada].
Colo uterino: [medida se informada].

Feto 1:
1- [apresentação, BCF e demais dados informados].
2- [biometria ou achado adicional se houver].

Feto 2:
1- [usar somente em gestação múltipla].
2- [biometria ou achado adicional se houver].

OPINIÃO DO RELATÓRIO:
1- [conclusão principal, incluindo idade gestacional se informada].
2- [se houver outra conclusão obstétrica relevante].$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'obstetrica',
    'modelo',
    'objetivo',
    'padrao',
    'variant:padrao',
    'source_path:apps/api/src/server/prompts/contracts/OBSTETRICA.ts',
    'source_symbol:OBSTETRICA_MODELO_OBJETIVO'
  ]::text[]
from public.writing_styles ws
where ws.code::text = 'OBJETIVO'
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'OBSTETRICA'
      and kb.writing_style_id = ws.id
      and kb.title = 'obstetrica-modelo-objetivo-padrao'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

insert into public.knowledge_blocks (
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
  'OBSTETRICA',
  ws.id,
  'modelo'::rag_block_kind,
  'obstetrica-modelo-objetivo-inicial',
  $c$ULTRASSONOGRAFIA OBSTÉTRICA

TÉCNICA:
Exame realizado com transdutor de 4.0 MHz.

ANÁLISE:
Idade gestacional: [semanas e dias informados — obrigatório se ditado].
Gestação: [única ou múltipla, apresentação e BCF].
Placenta: [localização e aspecto se informados].
Líquido amniótico: [descrição se informada].
Colo uterino: [medida se informada].

Feto 1:
1- [apresentação, BCF e demais dados informados].
2- [biometria ou achado adicional se houver].

Feto 2:
1- [usar somente em gestação múltipla].
2- [biometria ou achado adicional se houver].

OPINIÃO DO RELATÓRIO:
1- [conclusão principal, incluindo idade gestacional se informada].
2- [se houver outra conclusão obstétrica relevante].$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'obstetrica',
    'modelo',
    'objetivo',
    'inicial',
    'variant:inicial',
    'source_path:apps/api/src/server/prompts/contracts/OBSTETRICA.ts',
    'source_symbol:OBSTETRICA_MODELO_OBJETIVO'
  ]::text[]
from public.writing_styles ws
where ws.code::text = 'OBJETIVO'
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'OBSTETRICA'
      and kb.writing_style_id = ws.id
      and kb.title = 'obstetrica-modelo-objetivo-inicial'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

commit;
