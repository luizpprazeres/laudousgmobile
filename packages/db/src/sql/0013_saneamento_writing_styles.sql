-- Saneamento writing styles (Luiz 2026-06-13): consolidar para os 2 estilos
-- reais — CLÁSSICO (CLASSICO_COMPLETO) + OBJETIVO. DIRETO_OBJETIVO e
-- DETALHADO_PROTOCOLAR eram overlays extras (prompts/styles.ts) que não devem
-- aparecer no picker. 0 perfis/preferências apontam para eles → impacto zero.
-- Idempotente. SQL vivo, roda após as drizzle migrations.

-- 1. Desativar os 2 estilos não desejados (somem do picker, que filtra active).
UPDATE writing_styles SET active = false
WHERE code IN ('DIRETO_OBJETIVO', 'DETALHADO_PROTOCOLAR');

-- 2. Remover a variante 'enxuta' da MAMARIA — "enxuta" (LAUDO RESUMIDO) é o
--    ESTILO OBJETIVO, não uma variante. Conflação introduzida na demo DET-3.
DELETE FROM report_template_variants
WHERE category_code = 'MAMARIA' AND variant_key = 'enxuta';
DELETE FROM knowledge_blocks
WHERE category_code = 'MAMARIA' AND title = 'mamaria-modelo-template-enxuta';

-- 3. MAMARIA 'padrao' deixa de ser preference_eligible: sem 2ª variante de
--    estilo para escolher (o estilo Clássico/Objetivo é escolhido no picker de
--    estilo, não como variante de máscara).
UPDATE report_template_variants SET preference_eligible = false
WHERE category_code = 'MAMARIA' AND variant_key = 'padrao';
