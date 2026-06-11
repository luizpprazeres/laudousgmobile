-- DET-2 MORFOLOGICO — artefato de revisão, NAO EXECUTADO.
-- Parse mental:
-- - Usa apenas UPDATE por category_code/title/status e INSERT...SELECT por writing_styles.
-- - Mantem curadoria mobile validada; semeia apenas complemento verbatim da fonte.
-- - Reexecutar nao duplica seeds: NOT EXISTS exige title + writing_style_id + tag seed:det-2.
-- - O UPDATE dos modelos antigos exclui tags seed:det-2 para nao arquivar o seed novo em rerun.

begin;

-- 1) Arquivar modelos reescritos. Regras mobile ficam validated.
update public.knowledge_blocks
set status = 'archived', updated_at = now()
where category_code = 'MORFOLOGICO'
  and status = 'validated'
  and not ('seed:det-2' = any(tags))
  and title in (
    'morfologico-modelo-template-1t',
    'morfologico-modelo-template-2t',
    'morfologico-modelo-template-3t'
  );

-- 2) Seed complementar verbatim: funcao/extracao/conduta geral da fonte viva.
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
  'MORFOLOGICO',
  ws.id,
  'regra'::rag_block_kind,
  'morfologico-regra-funcao-e-extracao',
  $c$FUNÇÃO: Gerar e editar laudos de ultrassonografia morfológica obstétrica do primeiro, segundo e terceiro trimestres, seguindo rigorosamente os modelos fixos.

- Se houver imagens em anexo: extrair a biometria correspondente ao exame.
- No morfológico do primeiro trimestre, extrair principalmente CCN, TN, BCF e demais achados morfológicos descritos.
- No morfológico do segundo e terceiro trimestres, extrair a biometria fetal completa e os marcadores morfológicos descritos no modelo.
- Se houver mais de um feto (gemelar, trigemelar), manter a mesma estrutura do modelo solicitado, só que individualizada para cada feto. Além disso, adicionar um parágrafo com o peso médio dos fetos e a discordância ponderal entre os fetos, quando houver peso fetal estimado disponível.
- Se eu informar a data da primeira USG, acrescentar no início do exame: "Primeira USG: dia/mes/ano, com x semanas e x dias. Hoje com x semanas e x dias." Se não informar, OMITIR essa linha completamente.
- Se eu informar a DUM (data da última menstruação), usar em vez da linha anterior: "DUM: dia/mes/ano. Hoje com x semanas e x dias." Se não informar, OMITIR essa linha completamente.
- A placenta pode ser "homogênea" ou "heterogênea, de acordo com a fase da gestação".
- Se o usuário pedir morfológico e solicitar Doppler adicional:
  • manter o modelo do morfológico
  • acrescentar o bloco DOPPLERVELOCIMETRIA imediatamente antes da conclusão
  • acrescentar na conclusão os itens correspondentes do modelo obstétrico com Doppler, sem alterar a estrutura base do morfológico
- Nos morfológicos, manter exatamente as frases padronizadas do modelo, mesmo que o usuário não cite cada uma delas individualmente, removendo ou alterando apenas se ele pedir explicitamente.
- Ossos longos: repetir o mesmo valor informado para os lados direito e esquerdo, quando o modelo exigir bilateralidade e o usuário fornecer apenas um valor.$c$,
  'validated'::rag_block_status,
  99,
  1,
  array[
    'seed:det-2',
    'morfologico',
    'regra',
    'funcao',
    'extracao',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:219-232'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'MORFOLOGICO'
      and kb.writing_style_id = ws.id
      and kb.title = 'morfologico-regra-funcao-e-extracao'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

-- 3) Seed verbatim: modelo 1T.
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
  'MORFOLOGICO',
  ws.id,
  'modelo'::rag_block_kind,
  'morfologico-modelo-template-1t',
  $c$ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único de situação variável.
Batimentos cardíacos presentes, bem caracterizados pelo modo Doppler (FC = ____ bpm).
Movimentos fetais são ativos.
Comprimento crânio-nádegas (CCN) de ____ mm.
Medida da translucência nucal (TN) de ____ mm.
Presença de osso nasal.
Ducto venoso com aspecto de onda trifásica (sístole ventricular, diástole ventricular e sístole atrial positivas).

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
2) Líquido amniótico de quantidade normal.
3) Doppler do ducto venoso normal.
4) Morfologia fetal normal para esta fase da gestação.$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'morfologico',
    'modelo',
    '1t',
    'variant:1t',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:256-276'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'MORFOLOGICO'
      and kb.writing_style_id = ws.id
      and kb.title = 'morfologico-modelo-template-1t'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

-- 4) Seed verbatim: modelo 2T.
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
  'MORFOLOGICO',
  ws.id,
  'modelo'::rag_block_kind,
  'morfologico-modelo-template-2t',
  $c$ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida em 18 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação __________________, com dorso __________________.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ____ bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
Nariz e narinas presentes.
Lábio superior sem solução de continuidade.
Coração com quatro câmaras visíveis.
O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.
A aorta abdominal fetal apresenta calibre normal.
Genitália externa __________________.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de ____ mm.
Circunferência da cabeça (CC) de ____ mm.
Cerebelo mede ____ mm.
Cisterna magna mede ____ mm.
Distância binocular de ____ mm.
Circunferência abdominal (CA) de ____ mm.
Comprimento do fêmur direito de ____ mm.
Comprimento do fêmur esquerdo de ____ mm.
Comprimento da tíbia direita de ____ mm.
Comprimento da tíbia esquerda de ____ mm.
Comprimento da fíbula direita de ____ mm.
Comprimento da fíbula esquerda de ____ mm.
Comprimento do úmero direito de ____ mm.
Comprimento do úmero esquerdo de ____ mm.
Comprimento do rádio direito de ____ mm.
Comprimento do rádio esquerdo de ____ mm.
Comprimento da ulna direita de ____ mm.
Comprimento da ulna esquerda de ____ mm.
Peso fetal estimado em ____ g (+- ____ g, percentil ____).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização __________________, com ecotextura __________________.
{LINHA_LIQUIDO_AMNIOTICO}

Orifício interno do colo uterino encontra-se fechado.

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
{CONCLUSAO_LIQUIDO_AMNIOTICO}
3) Morfologia fetal sem evidência de alteração detectável pelo método.$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'morfologico',
    'modelo',
    '2t',
    'variant:2t',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:278-330'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'MORFOLOGICO'
      and kb.writing_style_id = ws.id
      and kb.title = 'morfologico-modelo-template-2t'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

-- 5) Seed verbatim: modelo 3T.
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
  'MORFOLOGICO',
  ws.id,
  'modelo'::rag_block_kind,
  'morfologico-modelo-template-3t',
  $c$ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida em 18 fotos, segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação __________________, com dorso __________________.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ____ bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
Nariz e narinas presentes.
Lábio superior sem solução de continuidade.
Coração com quatro câmaras visíveis.
O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.
A aorta abdominal fetal apresenta calibre normal.
Genitália externa __________________.
Intestinos com ecogenicidade compatível com a maturidade intestinal para a fase da gestação.
Pulmões com ecogenicidade compatível com a maturidade pulmonar para a fase da gestação.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de ____ mm.
Circunferência da cabeça (CC) de ____ mm.
Cerebelo mede ____ mm.
Cisterna magna mede ____ mm.
Distância binocular de ____ mm.
Circunferência abdominal (CA) de ____ mm.
Comprimento do fêmur direito de ____ mm.
Comprimento do fêmur esquerdo de ____ mm.
Comprimento da tíbia direita de ____ mm.
Comprimento da tíbia esquerda de ____ mm.
Comprimento da fíbula direita de ____ mm.
Comprimento da fíbula esquerda de ____ mm.
Comprimento do úmero direito de ____ mm.
Comprimento do úmero esquerdo de ____ mm.
Comprimento do rádio direito de ____ mm.
Comprimento do rádio esquerdo de ____ mm.
Comprimento da ulna direita de ____ mm.
Comprimento da ulna esquerda de ____ mm.
Peso fetal estimado em ____ g (+- ____ g, percentil ____).

Análise extra-fetal:
Cordão umbilical com duas artérias e uma veia.
Placenta de localização __________________, com ecotextura __________________.
{LINHA_LIQUIDO_AMNIOTICO}

Orifício interno do colo uterino encontra-se fechado.

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
{CONCLUSAO_LIQUIDO_AMNIOTICO}
3) Morfologia fetal sem evidência de alteração detectável pelo método.$c$,
  'validated'::rag_block_status,
  100,
  2,
  array[
    'seed:det-2',
    'morfologico',
    'modelo',
    '3t',
    'variant:3t',
    'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
    'source_lines:332-386'
  ]::text[]
from public.writing_styles ws
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'MORFOLOGICO'
      and kb.writing_style_id = ws.id
      and kb.title = 'morfologico-modelo-template-3t'
      and kb.status = 'validated'
      and 'seed:det-2' = any(kb.tags)
  );

commit;
