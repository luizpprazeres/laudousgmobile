-- DET-3 — Seed do catálogo report_template_variants + piloto demo (MAMARIA enxuta).
-- Idempotente (ON CONFLICT DO NOTHING). SQL vivo, roda após drizzle migrations.

-- ============================================================================
-- (a) PILOTO DEMO: 2ª variante de MAMARIA ("enxuta") nos knowledge_blocks.
-- Conteúdo de DEMONSTRAÇÃO (versão curta) — substituível por conteúdo clínico
-- real depois, via lab. Tag variant:enxuta casa com o catálogo abaixo.
-- ============================================================================
INSERT INTO knowledge_blocks
  (category_code, writing_style_id, kind, title, content, status, priority, tags)
SELECT
  'MAMARIA',
  ws.id,
  'modelo'::rag_block_kind,
  'mamaria-modelo-template-enxuta',
  $c$ULTRASSONOGRAFIA MAMÁRIA — LAUDO RESUMIDO

TÉCNICA:
Exame realizado com transdutor linear de alta frequência.

ACHADOS:
Mama direita: [achado, medida e localização se informados].
Mama esquerda: [achado, medida e localização se informados].
Axilas: [descrever somente se avaliadas].

CONCLUSÃO:
[diagnóstico principal com categoria BI-RADS, se informada].

[NOTA AO GERADOR: este é o LAUDO RESUMIDO. Use EXATAMENTE o título "ULTRASSONOGRAFIA MAMÁRIA — LAUDO RESUMIDO" e os cabeçalhos TÉCNICA / ACHADOS / CONCLUSÃO acima. NÃO use COMENTÁRIOS nem "OS SEGUINTES ASPECTOS FORAM OBSERVADOS".]$c$,
  'validated'::rag_block_status,
  100,
  ARRAY['mamaria','modelo','variant:enxuta','seed:det-3','demo']
FROM writing_styles ws
WHERE ws.code::text IN ('CLASSICO_COMPLETO','DIRETO_OBJETIVO','DETALHADO_PROTOCOLAR','OBJETIVO')
  AND NOT EXISTS (
    SELECT 1 FROM knowledge_blocks kb
    WHERE kb.category_code='MAMARIA' AND kb.writing_style_id=ws.id
      AND kb.kind='modelo' AND kb.title='mamaria-modelo-template-enxuta'
  );

-- ============================================================================
-- (b) CATÁLOGO: uma linha em report_template_variants por (categoria, estilo,
-- variant_key) de todo modelo validado. variant_key vem da tag variant:<chave>
-- (ou 'padrao' se o modelo não tiver tag). status=validated, approved_at=now().
-- ============================================================================
INSERT INTO report_template_variants
  (category_code, writing_style_id, variant_key, name, status, approved_at)
SELECT DISTINCT
  kb.category_code,
  kb.writing_style_id,
  vk.variant_key,
  CASE vk.variant_key
    WHEN 'padrao' THEN 'Padrão'
    WHEN 'doppler' THEN 'Com Doppler'
    WHEN 'enxuta' THEN 'Enxuta'
    WHEN '1t' THEN '1º trimestre'
    WHEN '2t' THEN '2º trimestre'
    WHEN '3t' THEN '3º trimestre'
    WHEN 'ta' THEN 'Transabdominal'
    WHEN 'tv' THEN 'Transvaginal'
    WHEN 'ta-tv' THEN 'Transabdominal + Transvaginal'
    WHEN 'pos-abortamento' THEN 'Pós-abortamento'
    WHEN 'completo' THEN 'Completo'
    WHEN 'tvp-only' THEN 'Protocolo TVP'
    ELSE initcap(vk.variant_key)
  END,
  'validated'::rag_block_status,
  now()
FROM knowledge_blocks kb
CROSS JOIN LATERAL (
  SELECT COALESCE(
    (SELECT substring(t FROM 9) FROM unnest(kb.tags) t WHERE t LIKE 'variant:%' LIMIT 1),
    'padrao'
  ) AS variant_key
) vk
WHERE kb.kind='modelo' AND kb.status='validated'
ON CONFLICT (category_code, writing_style_id, variant_key) DO NOTHING;
