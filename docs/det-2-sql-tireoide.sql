-- DET-2 TIREOIDE — artefato revisavel.
-- Nao executar sem revisar. Arquiva duplicatas/rewrite suspeito e semeia
-- novamente a variante Doppler em forma verbatim do contrato/fonte viva.

begin;

update knowledge_blocks
set status = 'archived',
    updated_at = now()
where category_code = 'TIREOIDE'
  and status = 'validated'
  and not ('seed:det-2' = any(coalesce(tags, array[]::text[])))
  and title in (
    'tireoide-modelo-template-com-doppler',
    'tireoide-regra-estrutura-fixa',
    'tireoide-regra-titulo-com-doppler',
    'tireoide-regra-grafia-istmo-sem-acento',
    'tireoide-regra-repetir-frase-completa-por-segmento',
    'tireoide-regra-doppler-informado',
    'tireoide-frase-comentarios-fixo',
    'tireoide-frase-lobos-e-istmo-normal',
    'tireoide-frase-descritores-de-nodulo',
    'tireoide-frase-pico-sistolico-tireoidiana',
    'tireoide-frase-linfonodos-cervicais-preservados',
    'tireoide-conclusao-volume-total-normal',
    'tireoide-conclusao-linfonodos-cervicais',
    'tireoide-excecao-classificacoes-nao-calcular',
    'tireoide-excecao-rodape-fixo',
    'tireoide-comentario_tecnico-recomendacoes-acr-tirads-2017'
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
select distinct
  'TIREOIDE',
  src.writing_style_id,
  'modelo'::rag_block_kind,
  'tireoide-modelo-template-com-doppler',
  $c$ULTRASSONOGRAFIA DE TIREOIDE COM DOPPLER

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo todos os segmentos da glândula tireoide, como também a cadeia ganglionar cervical de I a V. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Lobo direito medindo ____ x ____ x ____ cm (volume de ____ ml), de ecogenicidade, ecotextura e vascularização normais.
Lobo esquerdo medindo ____ x ____ x ____ cm (volume de ____ ml), de ecogenicidade, ecotextura e vascularização normais.
Istmo medindo ____ x ____ x ____ cm (volume de ____ ml), de ecogenicidade e ecotextura normais.

Pico sistólico da artéria tireoidiana inferior direita de ____ cm/s.
Pico sistólico da artéria tireoidiana inferior esquerda de ____ cm/s.

CONCLUSÃO:
Tireoide de volume normal (____ ml), sem evidência de alteração ecotextural ou de imagem nodular.

*ESCORE DE NÓDULO TIREOIDEANO - Domingos Correia da Rocha - Material baseado em 2588 nódulos puncionados - 2003 | Atualizada em 2013 - Total de 5134 nódulos puncionados
ACR - American College of Radiology*$c$,
  'validated'::rag_block_status,
  95,
  1,
  array[
    'tireoide',
    'modelo',
    'doppler',
    'variant:doppler',
    'seed:det-2',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:715-739'
  ]::text[]
from knowledge_blocks
  src
where src.category_code = 'TIREOIDE'
  and not exists (
    select 1
    from knowledge_blocks kb
    where kb.category_code = 'TIREOIDE'
      and kb.writing_style_id = src.writing_style_id
      and kb.title = 'tireoide-modelo-template-com-doppler'
      and kb.status = 'validated'
      and 'seed:det-2' = any(coalesce(kb.tags, array[]::text[]))
  );

update knowledge_blocks
set tags = case
    when not ('variant:padrao' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:padrao')
    else tags
  end,
  updated_at = now()
where category_code = 'TIREOIDE'
  and status = 'validated'
  and kind = 'modelo'
  and title = 'tireoide-modelo-template-padrao';

update knowledge_blocks
set tags = case
    when not ('variant:doppler' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:doppler')
    else tags
  end,
  updated_at = now()
where category_code = 'TIREOIDE'
  and status = 'validated'
  and kind = 'modelo'
  and title = 'tireoide-modelo-template-com-doppler';

commit;
