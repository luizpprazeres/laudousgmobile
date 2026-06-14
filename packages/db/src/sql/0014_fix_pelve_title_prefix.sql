-- Fix título PELVE (Luiz, backlog UX 2026-06-14): os 3 blocos `modelo` da
-- PELVE_FEMININA TA+TV (um por writing style) começavam com o prefixo "A) "
-- — resíduo do separador de modelos A/B/C/D do prompt original (~/laudousg)
-- que vazou na extração. Esse "A) " aparecia no TÍTULO do laudo gerado.
-- Remove só o prefixo de 3 chars; é o ÚNICO caso de prefixo de letra em
-- knowledge_blocks (kind=modelo). Idempotente (re-run não encontra mais "A) ").
UPDATE knowledge_blocks
SET content = substring(content from 4)
WHERE category_code = 'PELVE_FEMININA'
  AND kind = 'modelo'
  AND content LIKE 'A) %';
