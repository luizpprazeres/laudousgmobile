-- 0016 — MUSCULOESQUELETICO_V2: reforço de cobertura no modelo + limpeza da
-- categoria antiga.
--
-- Fase 2 da curadoria MSK (decisões Luiz 2026-06-17): o modelo V2 já trazia o
-- roteiro por segmento, mas o LLM falhava de forma inconsistente — omitia
-- estruturas (descrevia só a alteração), punha "X ecograficamente normal" no
-- corpo, copiava a descrição na conclusão e errava a nomenclatura das polias.
-- Prepende uma REGRA #1 proeminente de cobertura completa ao modelo (todos os
-- estilos). Validado em showcase antes/depois.
--
-- Também remove a categoria MUSCULOESQUELETICO antiga (já inativa e sem uso —
-- 0 reports/audit/blocos). O code interno MUSCULOESQUELETICO_V2 é mantido (o app
-- publicado o envia como category_hint; renomear o code exige release coordenado).
--
-- Idempotente: o prepend só ocorre se o marcador ainda não estiver no content.

DELETE FROM categories
WHERE code = 'MUSCULOESQUELETICO' AND active = false;

UPDATE knowledge_blocks
SET content = $reforco$═══════════════════════════════════════════════════
⚠️ REGRA #1 — COBERTURA COMPLETA DO CORPO (a falha mais comum — LEIA PRIMEIRO)
═══════════════════════════════════════════════════
Em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", SEMPRE descreva TODAS as estruturas do roteiro do segmento (ver REGRAS DE ESTRUTURA), UMA POR LINHA, INCLUSIVE quando normais.

- Segmento NORMAL: é PROIBIDO escrever apenas "{Segmento} ecograficamente normal." no corpo. Descreva cada estrutura do roteiro com sua frase de normalidade no corpo; o "{Segmento} {lat} ecograficamente normal." vai SÓ na CONCLUSÃO.
  Exemplo CORRETO (pé direito normal):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Fáscia plantar com espessura e ecotextura preservadas.
  Estruturas tendíneas avaliadas com espessura, continuidade e ecotextura preservadas.
  Não há sinais de coleções, lesões expansivas ou alterações ecográficas relevantes no segmento avaliado.
  CONCLUSÃO:
  Pé direito ecograficamente normal.

- Segmento COM ALTERAÇÃO: descreva as estruturas normais do roteiro que NÃO foram alteradas + a(s) alteração(ões). NUNCA descreva só a alteração omitindo o resto.
  Exemplo CORRETO (mão direita com tenossinovite):
  OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
  Tendões flexores e extensores dos quirodáctilos com continuidade preservada.
  Espessamento sinovial na topografia da polia A2 do terceiro e quarto quirodáctilos, sem sinais de rotura tendínea associada.
  CONCLUSÃO:
  Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.

- O CORPO descreve a morfologia; a CONCLUSÃO traz o diagnóstico. NUNCA escreva o diagnóstico ("Tendinopatia", "Tenossinovite", "Bursite") no corpo, nem copie a frase do corpo na conclusão.

- QUEBRA DE LINHA, NÃO LINHA EM BRANCO: os achados da mesma seção ficam em linhas ADJACENTES (uma quebra simples entre eles), SEM linha em branco no meio. Pule linha (parágrafo) APENAS entre seções/cabeçalhos: após o TÍTULO, e entre o fim de "OS SEGUINTES ASPECTOS..." e "CONCLUSÃO:". NUNCA pule linha entre dois achados.

- NOMENCLATURA: polias dos dedos são A1, A2, A3, A4, A5 — sempre "A"+número colado ("polia A2", JAMAIS "polia a 2"). Use "quirodáctilo", não "dedo".

- MÚLTIPLOS SEGMENTOS: é comum o exame trazer vários (ombro D + ombro E + mão + pé). Gere um laudo COMPLETO e SEPARADO por segmento, cada um com cobertura completa do corpo.

$reforco$ || content
WHERE category_code = 'MUSCULOESQUELETICO_V2'
  AND kind = 'modelo'
  AND content NOT LIKE '%REGRA #1 — COBERTURA COMPLETA DO CORPO%';
