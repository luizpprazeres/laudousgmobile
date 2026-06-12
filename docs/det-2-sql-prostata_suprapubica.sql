-- DET-2 PROSTATA_SUPRAPUBICA — seed deterministico para remocao do RAG.
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
  'PROSTATA_SUPRAPUBICA',
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
      'prostata-suprapubica-modelo-template-padrao',
      $c$ULTRASSONOGRAFIA DA PRÓSTATA (VIA SUPRAPÚBICA)

COMENTÁRIOS:
Exame realizado com transdutor convexo de 4,0 MHz, por via suprapúbica. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Bexiga de forma, ecotextura e contornos regulares.
Próstata medindo ___ x ___ x ___ cm.
Vesículas seminais de dimensões, ecogenicidade e ecotextura normais.

CONCLUSÃO:
1) Bexiga ecograficamente normal.
2) Resíduo pós-miccional de ___ mL.
3) Próstata de dimensões normais (volume de ___ cm³, peso aproximado de ___ gramas).
4) Vesículas seminais ecograficamente normais.

Observação: a avaliação por via suprapúbica possui limitações de resolução para lesões focais. Em caso de suspeita, complementar com via transretal.$c$,
      100,
      array[
        'seed:det-2',
        'prostata-suprapubica',
        'modelo',
        'padrao',
        'variant:padrao',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:4260-4278'
      ]::text[]
    ),
    (
      'regra',
      'prostata-suprapubica-regra-funcao-e-gerais',
      $c$FUNÇÃO: Gerar laudos de ultrassonografia prostática por via suprapúbica, seguindo rigorosamente o modelo e as regras abaixo.

REGRAS GERAIS (OBRIGATÓRIAS):
- Estrutura fixa e imutável, sempre nesta ordem e com estes cabeçalhos:
  ULTRASSONOGRAFIA DA PRÓSTATA (VIA SUPRAPÚBICA)
  COMENTÁRIOS:
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  CONCLUSÃO:
  Observação:
- Nunca inventar dados não fornecidos pelo médico.
- A seção "OS SEGUINTES ASPECTOS FORAM OBSERVADOS" deve conter APENAS descrição morfológica — sem diagnóstico.
- A seção "CONCLUSÃO" deve conter a interpretação diagnóstica dos achados.
- SEMPRE calcular o peso prostático: Peso = 0,52 × DAP × DT × DL × 1,05 (em gramas).
- Se houver protrusão intravesical do lobo mediano, calcular o IPP e classificar: Grau I (<5 mm), Grau II (5–10 mm), Grau III (>10 mm).
- Se houver resíduo pós-miccional informado, incluir o valor em mL.
- Se houver volume pré-miccional da bexiga, incluir.
- SEMPRE incluir a observação final sobre limitações da via suprapúbica.$c$,
      95,
      array[
        'seed:det-2',
        'prostata-suprapubica',
        'regra',
        'funcao',
        'estrutura',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:4227-4243'
      ]::text[]
    ),
    (
      'regra',
      'prostata-suprapubica-regra-calculo-volume-peso',
      $c$CÁLCULO DE VOLUME / PESO PROSTÁTICO (interpretação da fala do médico):
- Fórmula: V = D1 × D2 × D3 × 0,5233 (cm³); Peso ≈ V × 1,05 (gramas). Equivalente a Peso = 0,52 × DAP × DT × DL × 1,05.
- GATILHOS DO COMANDO: "calcule o volume", "calcular volume com as medidas", "calcule o peso da próstata", "calcular peso prostático".
- IDENTIFICAÇÃO DAS 3 MEDIDAS:
  • Procure 3 valores numéricos contíguos (DAP × DT × DL) na frase do comando, separados por "x", "por", "vezes" ou simples espaço.
  • CRITICAMENTE: vírgulas DENTRO de um número decimal (ex.: "4,2") NÃO são separadores de medida — fazem parte do número. Em "3,2 por 4,5 por 5,1" há TRÊS medidas: 3.2, 4.5, 5.1.
- VALIDAÇÃO ANTES DE CALCULAR:
  • Se forem identificadas MENOS DE 3 medidas: NÃO calcule. Reproduza as medidas como ditadas e sinalize "[REVISAR — volume requer 3 medidas; foram identificadas N]".
  • Se uma das medidas estiver fora da faixa anatômica esperada (próstata adulta tipicamente 2–8 cm por dimensão; medida individual < 1 cm é quase certamente truncação de voz): reproduza os valores e adicione "[REVISAR — medida ambígua]", NÃO calcule.
- Sem as 3 medidas presentes nos achados, NUNCA inventar volume — reproduzir somente o valor informado pelo médico.
- Se exame normal, manter o modelo normal exato.$c$,
      94,
      array[
        'seed:det-2',
        'prostata-suprapubica',
        'regra',
        'calculo',
        'volume',
        'peso',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:4245-4255'
      ]::text[]
    ),
    (
      'frase',
      'prostata-suprapubica-frase-comentarios-padrao',
      $c$COMENTÁRIOS:
Exame realizado com transdutor convexo de 4,0 MHz, por via suprapúbica. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.$c$,
      90,
      array[
        'seed:det-2',
        'prostata-suprapubica',
        'frase',
        'comentarios',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:4257-4258'
      ]::text[]
    ),
    (
      'regra',
      'prostata-suprapubica-regra-como-descrever-alteracoes',
      $c$COMO DESCREVER ALTERAÇÕES:

HPB com protrusão:
Achados: "Próstata medindo ___ x ___ x ___ cm, com ecotextura [heterogênea / com nódulos adenomatosos na zona de transição]. Protrusão intravesical do lobo mediano medindo ___ cm."
Conclusão:
"1) Bexiga ecograficamente normal.
2) Resíduo pós-miccional de ___ mL.
3) Próstata de volume aumentado (volume de ___ cm³, peso aproximado de ___ gramas).
4) Índice de protrusão prostática (IPP) de ___ cm, grau ___.
5) Vesículas seminais ecograficamente normais."

Calcificações:
Achados: "Calcificações [puntiformes/grosseiras] na região da cápsula cirúrgica / periuretral."

DADOS INCOMPLETOS:
- Se faltar dado crítico, fazer 1 pergunta objetiva.
- Se o usuário solicitar "gerar mesmo assim", manter "____" nos campos faltantes.$c$,
      80,
      array[
        'seed:det-2',
        'prostata-suprapubica',
        'regra',
        'alteracoes',
        'source_path:/Users/luizprazeres/laudousg/lib/categoryDefaults.ts',
        'source_lines:4280-4296'
      ]::text[]
    )
) as seed(kind, title, content, priority, tags)
where ws.code::text in ('CLASSICO_COMPLETO', 'DETALHADO_PROTOCOLAR', 'DIRETO_OBJETIVO', 'OBJETIVO')
  and not exists (
    select 1
    from public.knowledge_blocks kb
    where kb.category_code = 'PROSTATA_SUPRAPUBICA'
      and kb.writing_style_id = ws.id
      and kb.title = seed.title
      and kb.status = 'validated'
      and 'seed:det-2' = any(coalesce(kb.tags, array[]::text[]))
  );

commit;

-- SEED PROSTATA/PARTES_MOLES PRONTO
