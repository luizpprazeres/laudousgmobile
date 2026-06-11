-- DET-2 DOPPLER_OBSTETRICO — artefato de revisão, NAO EXECUTADO.
-- Parse mental:
-- - Usa apenas UPDATE por category_code/title/status e INSERT...SELECT por writing_styles.
-- - Mantem a curadoria mobile validada que prevalece em conflito.
-- - Reexecutar nao duplica seeds: NOT EXISTS exige title + writing_style_id + tag seed:det-2.
-- - O UPDATE do modelo antigo exclui tags seed:det-2 para nao arquivar o seed novo em rerun.

begin;

-- 1) Arquivar modelo reescrito e fragmentos duplicados.
update public.knowledge_blocks
set status = 'archived', updated_at = now()
where category_code = 'DOPPLER_OBSTETRICO'
  and status = 'validated'
  and not ('seed:det-2' = any(tags))
  and title in (
    'doppler-obstetrico-modelo-template-padrao',
    'doppler-obstetrico-regra-conclusao-ig-sem-zero-dias',
    'doppler-obstetrico-regra-ossos-longos-morfologico',
    'doppler-obstetrico-frase-comentarios-padrao',
    'doppler-obstetrico-frase-apresentacao-vitalidade-anatomia',
    'doppler-obstetrico-frase-biometria-fetal',
    'doppler-obstetrico-frase-dopplervelocimetria',
    'doppler-obstetrico-conclusao-conclusao-normal',
    'doppler-obstetrico-conclusao-peso-fetal-percentil',
    'doppler-obstetrico-conclusao-ip-medio-uterinas',
    'doppler-obstetrico-excecao-percentis-omitidos',
    'doppler-obstetrico-excecao-marcadores-liquido-amniotico'
  );

-- 2) Seed verbatim da fonte viva: modelo Doppler obstétrico.
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
  'DOPPLER_OBSTETRICO',
  ws.id,
  'modelo',
  'doppler-obstetrico-modelo-template-padrao',
  $c$ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

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
Peso aproximado de ____ g (+- ____ g, percentil ____).

Placenta de localização __________________, com ecotextura __________________, de acordo com a fase da gestação.
{LINHA_LIQUIDO_AMNIOTICO}

DOPPLERVELOCIMETRIA:
Artéria umbilical: IP ____ (percentil ____).
Artéria cerebral média: IP ____ (percentil ____).
Artéria uterina direita: IP ____.
Artéria uterina esquerda: IP ____.
IP médio das artérias uterinas mede ____ (percentil ____).

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
{CONCLUSAO_LIQUIDO_AMNIOTICO}
3) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
4) Ausência de sinais de incisuras.
5) Não há sinais de pré-centralização ou de centralização.
6) Perfil hemodinâmico fetal é normal, menor de 1.0.$c$,
  'validated',
  100,
  2,
  array[
    'seed:det-2',
    'doppler-obstetrico',
    'modelo',
    'padrao',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:157-198'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'DOPPLER_OBSTETRICO'
      and kb.writing_style_id = ws.id
      and kb.title = 'doppler-obstetrico-modelo-template-padrao'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

commit;
