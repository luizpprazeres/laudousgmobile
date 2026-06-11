-- DET-2 MAMARIA — artefato revisavel.
-- Nao executar sem revisar. Arquiva duplicatas e o modelo sem axilas atual,
-- pois a decisao mesclar resolve axilas por seletor/escopo, nao por mascara reescrita.
-- Corrigido: o estilo OBJETIVO recebe seed proprio para nao ficar sem modelo
-- apos o arquivamento de mamaria-modelo-template-mamas-sem-axilas.

begin;

update knowledge_blocks
set status = 'archived',
    updated_at = now()
where category_code = 'MAMARIA'
  and status = 'validated'
  and title in (
    'mamaria-modelo-template-mamas-sem-axilas',
    'mamaria-regra-protocolo-e-erros-proibidos',
    'mamaria-regra-titulo-e-estrutura-fixa',
    'mamaria-regra-localizacao-vocabulario-forcado',
    'mamaria-regra-medidas-invalidas-localizacao-horario',
    'mamaria-regra-conclusoes-em-itens-separados',
    'mamaria-regra-cisto-simples',
    'mamaria-regra-multiplos-cistos',
    'mamaria-regra-calcificacoes',
    'mamaria-regra-correlacao-com-mamografia',
    'mamaria-regra-ginecomastia',
    'mamaria-regra-linfonodo-intramamario',
    'mamaria-regra-proteses-mamarias',
    'mamaria-frase-comentarios-padrao',
    'mamaria-frase-texto-fundo-padrao',
    'mamaria-frase-ausencia-de-lesao',
    'mamaria-frase-texto-axilar-padrao',
    'mamaria-conclusao-axilar-padrao',
    'mamaria-conclusao-calcificacoes-linfonodo-ginecomastia',
    'mamaria-conclusao-cistos-birads',
    'mamaria-excecao-rodape-fixo'
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
  'MAMARIA',
  ws.id,
  'modelo'::rag_block_kind,
  'mamaria-modelo-template-padrao',
  $c$ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES

TÉCNICA:
Exame realizado com transdutor de 12 MHz.

ANÁLISE:
Composição mamária: [tipo informado].

Mama direita apresentando os seguintes achados:
1- [natureza, localização, medida]. [BI-RADS se informado].
2- [se houver outro achado no mesmo lado].

Mama esquerda apresentando os seguintes achados:
1- [natureza, localização, medida]. [BI-RADS se informado].
2- [se houver outro achado no mesmo lado].

Regiões axilares: [descrever somente se avaliadas ou informadas].

OPINIÃO DO RELATÓRIO:
1- [conclusão principal].
2- [se houver outro diagnóstico ou categoria relevante].$c$,
  'validated'::rag_block_status,
  100,
  1,
  array[
    'mamaria',
    'modelo',
    'objetivo',
    'variant:padrao',
    'seed:det-2',
    'source_path:apps/api/src/server/prompts/contracts/MAMARIA.ts',
    'source_lines:158-181'
  ]::text[]
from writing_styles ws
where ws.code::text = 'OBJETIVO'
  and not exists (
    select 1
    from knowledge_blocks kb
    where kb.category_code = 'MAMARIA'
      and kb.writing_style_id = ws.id
      and kb.kind = 'modelo'
      and kb.status = 'validated'
  );

update knowledge_blocks
set tags = case
    when not ('variant:padrao' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:padrao')
    else tags
  end,
  updated_at = now()
where category_code = 'MAMARIA'
  and status = 'validated'
  and kind = 'modelo';

commit;
