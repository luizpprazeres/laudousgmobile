-- 0015 — DOPPLER_RENAL e DOPPLER_OBSTETRICO no estilo OBJETIVO (44444444).
--
-- Decisão Luiz (2026-06-16): o laudo Doppler é direto e numérico por natureza,
-- então o estilo OBJETIVO deve ser IGUAL ao clássico — apenas cabeçalhos
-- TÉCNICA / ACHADOS / IMPRESSÃO e a TÉCNICA (ex-COMENTÁRIOS) enxuta. Nada de
-- modelo objetivo "abstrato" próprio.
--
--   * OBSTETRICO: faltava biblioteca objetivo (BUNDLE_EMPTY bloqueava em prod).
--   * RENAL: tinha um modelo objetivo próprio que o Luiz reprovou — substituído
--     pelo clássico convertido.
--
-- A biblioteca objetivo é recriada copiando a clássica (11111111): blocos
-- não-modelo (regra/conclusao/frase/excecao) idênticos — valem nos 2 estilos —
-- e o modelo com cabeçalhos objetivo + técnica enxuta. A conversão de cabeçalhos
-- também roda em runtime (toObjectiveHeaders), aqui é defense-in-depth.
--
-- Idempotente (DELETE + INSERT): migrate.ts reaplica todos os SQL a cada run.

DELETE FROM knowledge_blocks
WHERE category_code IN ('DOPPLER_OBSTETRICO', 'DOPPLER_RENAL')
  AND writing_style_id = '44444444-4444-4444-8444-444444444444';

-- 1) Blocos não-modelo: cópia idêntica do clássico (clínica vale nos 2 estilos).
INSERT INTO knowledge_blocks
  (category_code, writing_style_id, kind, title, content, status, priority, version, tags)
SELECT
  category_code,
  '44444444-4444-4444-8444-444444444444',
  kind, title, content, status, priority, version, tags
FROM knowledge_blocks
WHERE category_code IN ('DOPPLER_OBSTETRICO', 'DOPPLER_RENAL')
  AND writing_style_id = '11111111-1111-4111-8111-111111111111'
  AND status = 'validated'
  AND kind <> 'modelo';

-- 2) Modelo OBSTETRICO: cabeçalhos objetivo + TÉCNICA enxuta.
INSERT INTO knowledge_blocks
  (category_code, writing_style_id, kind, title, content, status, priority, version, tags)
SELECT
  category_code,
  '44444444-4444-4444-8444-444444444444',
  kind, title,
  replace(
    replace(
      replace(
        replace(
          content,
          'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.',
          'Exame realizado com transdutor de 4.0 MHz e Doppler colorido.'
        ),
        'COMENTÁRIOS:', 'TÉCNICA:'
      ),
      'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:', 'ACHADOS:'
    ),
    'CONCLUSÃO:', 'IMPRESSÃO:'
  ) AS content,
  status, priority, version, tags
FROM knowledge_blocks
WHERE category_code = 'DOPPLER_OBSTETRICO'
  AND writing_style_id = '11111111-1111-4111-8111-111111111111'
  AND status = 'validated'
  AND kind = 'modelo';

-- 3) Modelo RENAL: cabeçalhos objetivo + TÉCNICA enxuta (2 variações do parágrafo
--    de comentários no guia clássico — exemplo e template-base).
INSERT INTO knowledge_blocks
  (category_code, writing_style_id, kind, title, content, status, priority, version, tags)
SELECT
  category_code,
  '44444444-4444-4444-8444-444444444444',
  kind, title,
  replace(
    replace(
      replace(
        replace(
          replace(
            content,
            'Exame realizado com transdutor convexo (3-5 MHz), com ângulo Doppler ≤ 60°. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
            'Exame realizado com transdutor convexo (3-5 MHz), com ângulo Doppler ≤ 60° para todas as aferições.'
          ),
          'Exame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para todas as aferições. Foram avaliadas a aorta abdominal infrarrenal, as artérias renais principais bilateralmente (segmentos ostial, médio e distal) e o parênquima renal (artérias segmentares/interlobares) com aferição de índice de resistência (IR) e índice de pulsatilidade (IP).',
          'Exame realizado com transdutor convexo (3-5 MHz), com ângulo Doppler ≤ 60° para todas as aferições.'
        ),
        'COMENTÁRIOS:', 'TÉCNICA:'
      ),
      'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:', 'ACHADOS:'
    ),
    'CONCLUSÃO:', 'IMPRESSÃO:'
  ) AS content,
  status, priority, version, tags
FROM knowledge_blocks
WHERE category_code = 'DOPPLER_RENAL'
  AND writing_style_id = '11111111-1111-4111-8111-111111111111'
  AND status = 'validated'
  AND kind = 'modelo';
