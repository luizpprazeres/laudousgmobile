-- DET-2 PARTES_MOLES — seed deterministico para remocao do RAG.
-- Nao executar sem revisar. Categoria sem blocos validated no DB mobile no
-- momento desta analise; semeia os 4 estilos ativos para evitar BUNDLE_EMPTY
-- e BUNDLE_NO_TEMPLATE quando o bundle deterministico substituir o RAG.

begin;

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
  'PARTES_MOLES',
  ws.id,
  seed.kind::rag_block_kind,
  seed.title,
  seed.content,
  'validated'::rag_block_status,
  seed.priority,
  1,
  seed.tags
from public.writing_styles ws
cross join lateral (
  values
    (
      'modelo',
      'partes-moles-modelo-template-padrao',
      $c$ULTRASSONOGRAFIA DE PARTES MOLES

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo a região solicitada. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Planos musculares e tecidos subcutâneos com ecogenicidade e ecotextura normais.
Não há evidência de coleção, massa ou alteração focal.

CONCLUSÃO:
Ausência de alterações detectáveis pelo método.$c$,
      100,
      array[
        'seed:det-2',
        'partes-moles',
        'modelo',
        'padrao',
        'variant:padrao',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:3612-3624'
      ]::text[]
    ),
    (
      'regra',
      'partes-moles-regra-funcao-e-gerais',
      $c$FUNÇÃO: Gerar laudos de ultrassonografia de partes moles, seguindo rigorosamente o modelo e as regras abaixo.

REGRAS GERAIS (OBRIGATÓRIAS):
- Estrutura fixa e imutável, sempre nesta ordem e com estes cabeçalhos:
  ULTRASSONOGRAFIA DE PARTES MOLES
  COMENTÁRIOS:
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  CONCLUSÃO:
- Nunca inventar dados não fornecidos pelo médico.
- A seção "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" deve conter APENAS descrição morfológica — sem diagnóstico.
- A seção "CONCLUSÃO" deve conter a interpretação diagnóstica dos achados.
- Descrever: localização anatômica, ecogenicidade, ecotextura, forma, contornos, dimensões, vascularização ao Doppler quando informada.
- Se exame normal, manter o modelo normal exato.$c$,
      95,
      array[
        'seed:det-2',
        'partes-moles',
        'regra',
        'funcao',
        'estrutura',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:3598-3610'
      ]::text[]
    ),
    (
      'frase',
      'partes-moles-frase-comentarios-padrao',
      $c$COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo a região solicitada. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.$c$,
      90,
      array[
        'seed:det-2',
        'partes-moles',
        'frase',
        'comentarios',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:3616-3617'
      ]::text[]
    ),
    (
      'regra',
      'partes-moles-regra-como-descrever-alteracoes',
      $c$COMO DESCREVER ALTERAÇÕES:

Nódulo/Massa sólida:
Achados: "Imagem nodular sólida, [hipoecoica/isoecoica/hiperecoica/heterogênea], de contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [tecido subcutâneo/plano muscular/interface] da região [local], [com/sem] fluxo ao Doppler colorido."
Conclusão: "Imagem nodular sólida na região [local], a esclarecer. Correlacionar com dados clínicos." ou "Achados compatíveis com lipoma." (quando hiperecoico, homogêneo, compressível)

Cisto/Coleção:
Achados: "Imagem cística/coleção [anecoica/com ecos internos/septada], de paredes [finas/espessas] e contornos [regulares/irregulares], medindo ___ x ___ x ___ cm, localizada no [local]."
Conclusão: "Coleção [líquida/complexa] na região [local], podendo corresponder a [abscesso/hematoma/cisto de inclusão epidérmica/higroma]. Correlacionar com dados clínicos."

Corpo estranho:
Achados: "Imagem linear hiperecoica com reverberação posterior, medindo aproximadamente ___ cm, localizada no [tecido subcutâneo/plano muscular] da região [local], compatível com corpo estranho."
Conclusão: "Imagem compatível com corpo estranho na região [local]."

Hérnia incisional:
Achados: "Solução de continuidade na [aponeurose/fáscia] da região [local], medindo ___ cm, com herniação de [gordura/alça intestinal], [redutível/irredutível] à compressão."
Conclusão: "Hérnia [incisional/epigástrica] na região [local]."$c$,
      80,
      array[
        'seed:det-2',
        'partes-moles',
        'regra',
        'alteracoes',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:3626-3642'
      ]::text[]
    )
) as seed(kind, title, content, priority, tags)
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO', 'OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'PARTES_MOLES'
      and kb.writing_style_id = ws.id
      and kb.title = seed.title
      and kb.status = 'validated'
      and 'seed:det-2' = any(coalesce(kb.tags, array[]::text[]))
  );

commit;
