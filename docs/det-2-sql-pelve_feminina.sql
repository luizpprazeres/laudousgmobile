-- DET-2 PELVE_FEMININA — artefato revisavel.
-- Nao executar sem revisar. Este script arquiva duplicatas do contrato/fonte e
-- preserva curadorias mobile validadas. Nao ha INSERT: os 4 modelos ja existem.

begin;

update knowledge_blocks
set status = 'archived',
    updated_at = now()
where category_code = 'PELVE_FEMININA'
  and status = 'validated'
  and title in (
    'pelve-feminina-regra-regras-gerais-pelve',
    'pelve-feminina-regra-selecao-ordem-roteamento',
    'pelve-feminina-regra-posicao-medidas-diagnostico-recomendacao',
    'pelve-feminina-regra-endometrio-e-ovarios',
    'pelve-feminina-regra-miomas',
    'pelve-feminina-regra-sindrome-ovarios-policisticos',
    'pelve-feminina-regra-tabela-referencia-etaria',
    'pelve-feminina-regra-adenomiose',
    'pelve-feminina-regra-calcificacao-arqueadas-cistos-naboth',
    'pelve-feminina-regra-cisto-ovariano-funcional-orads',
    'pelve-feminina-regra-diu',
    'pelve-feminina-regra-endometrioma',
    'pelve-feminina-regra-istmocele',
    'pelve-feminina-regra-menopausa-endometrio-espessado',
    'pelve-feminina-regra-menopausa-ovarios-atroficos',
    'pelve-feminina-regra-modelo-pos-abortamento',
    'pelve-feminina-regra-polipo-endometrial',
    'pelve-feminina-frase-frases-endometrio',
    'pelve-feminina-conclusao-conclusao-pos-abortamento',
    'pelve-feminina-conclusao-conclusao-ta-normal',
    'pelve-feminina-conclusao-conclusao-ta-tv-normal',
    'pelve-feminina-conclusao-conclusao-tv-normal'
  );

update knowledge_blocks
set tags = case
    when not ('variant:ta-tv' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:ta-tv')
    else tags
  end,
  updated_at = now()
where category_code = 'PELVE_FEMININA'
  and status = 'validated'
  and kind = 'modelo'
  and title = 'pelve-feminina-modelo-template-ta-tv';

update knowledge_blocks
set tags = case
    when not ('variant:ta' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:ta')
    else tags
  end,
  updated_at = now()
where category_code = 'PELVE_FEMININA'
  and status = 'validated'
  and kind = 'modelo'
  and title = 'pelve-feminina-modelo-template-ta';

update knowledge_blocks
set tags = case
    when not ('variant:tv' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:tv')
    else tags
  end,
  updated_at = now()
where category_code = 'PELVE_FEMININA'
  and status = 'validated'
  and kind = 'modelo'
  and title = 'pelve-feminina-modelo-template-tv';

update knowledge_blocks
set tags = case
    when not ('variant:pos-abortamento' = any(coalesce(tags, array[]::text[]))) then array_append(coalesce(tags, array[]::text[]), 'variant:pos-abortamento')
    else tags
  end,
  updated_at = now()
where category_code = 'PELVE_FEMININA'
  and status = 'validated'
  and kind = 'modelo'
  and title = 'pelve-feminina-modelo-template-pos-abortamento';

commit;
