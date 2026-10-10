-- W15 (10/10/2026) — técnica (COMENTÁRIOS) na Biblioteca do writer. NÃO APLICADO (o orquestrador aplica).
-- Fonte: tabela única `packages/schemes/src/tecnica/tecnica.ts`; decisões do Luiz em DECISOES-LUIZ-2026-10-10.md.
--
-- Parte 1 — PRÓSTATA (rodada 2: APROVADO pelo Luiz → aplicar). Frase curta do banco → frase longa dos finais (13/14).
-- Parte 2 — PAREDE ABDOMINAL (só PROPOSTA; decisão 8 já aprovada, mas o pedido foi SQL só como proposta).
--
-- Guardas: troca só a frase exata (replace), só blocos validados cujo conteúdo tem a frase antiga, e cada bloco
-- confere o md5 do conteúdo lido em 10/10 (só leitura). A contagem tem de bater, senão a transação aborta.
-- Os blocos são duplicados por estilo de escrita (4 cada) — por isso 8 e 8 linhas.
-- O bundle do writer é determinístico (sem embedding na seleção); o embedding não precisa ser recalculado.
--
-- Backup antes (exportar o resultado, ex. para tmp-review/haiku-migration/):
--   select id, category_code, kind, title, version, content from knowledge_blocks
--    where id in ('75e97968-8f70-4dd2-a228-2c5a6dfd9359','558429f0-d6c2-4fee-bdcd-f89ac5b63ce7','da15199b-a298-44e0-9229-387cded6e7e6',
--                 'e554bff0-0a35-4b5d-bfb2-f3193d992125','8667c55d-59e7-467c-82e7-22cfa6a8ed75','cdb6c835-eef1-4ef1-b145-326bf07c8ec9',
--                 '36b39f34-1253-4be1-b70a-e765f08555ac','371de411-b7d3-44be-aec9-9a500592f822',
--                 'cfacc2ff-3e07-4e1b-b5ec-03bb88af9920','46d2e691-72b2-4e7c-96b4-ec8c1f9540cd','56db0af7-7438-44d3-a2be-7e2d769bf152',
--                 '2f1d6335-a843-4703-a475-da52f80fb617','00698334-6234-41d5-a702-505507a1873a','580f34ae-8513-4779-973e-d0d51fe2ab95',
--                 '133d1bd1-ff5c-4305-aff5-418f7fe6abd5','b2bc7317-58c2-4184-8793-0b2017eb5906');

-- ── Parte 1 — PRÓSTATA SUPRAPÚBICA (aprovado) ─────────────────────────────────────────────────────────────
begin;

do $w15$
declare n int;
begin
  select count(*) into n from knowledge_blocks
   where category_code = 'PROSTATA_SUPRAPUBICA' and status = 'validated'
     and position('Exame realizado com transdutor convexo de 4,0 MHz, por via transabdominal.' in content) > 0
     and md5(content) in ('da89dfbe85f36315016237e6c19b3e7d', '1a1d96786ea546a30033c64040bd9f5c');
  if n <> 8 then raise exception 'W15 próstata: esperava 8 blocos, achou %', n; end if;
end $w15$;

update knowledge_blocks
   set content = replace(content,
         'Exame realizado com transdutor convexo de 4,0 MHz, por via transabdominal.',
         'Exame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais abrangendo toda a pelve.'),
       version = version + 1, updated_at = now()
 where category_code = 'PROSTATA_SUPRAPUBICA' and status = 'validated'
   and position('Exame realizado com transdutor convexo de 4,0 MHz, por via transabdominal.' in content) > 0
   and md5(content) in ('da89dfbe85f36315016237e6c19b3e7d', '1a1d96786ea546a30033c64040bd9f5c');
-- esperado: UPDATE 8

-- conferência: 0 com a frase antiga, 8 com a nova
select count(*) filter (where content like '%transdutor convexo de 4,0 MHz, por via transabdominal%') as antigas,
       count(*) filter (where content like '%pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes%') as novas
  from knowledge_blocks where category_code = 'PROSTATA_SUPRAPUBICA' and status = 'validated';

commit;

-- ── Parte 2 — PAREDE ABDOMINAL (PROPOSTA; aplicar só com o GO do orquestrador) ─────────────────────────────
-- Os 4 modelos e os 4 exemplos de hérnia umbilical já usam a frase da casa. Os 8 exemplos abaixo (normal e diástase)
-- usam a variante "linear multifrequencial de alta resolução … em repouso e à manobra de Valsalva".
-- begin;
-- do $w15p$
-- declare n int;
-- begin
--   select count(*) into n from knowledge_blocks
--    where category_code = 'PAREDE_ABDOMINAL' and kind = 'exemplo' and status = 'validated'
--      and position('Exame realizado com transdutor linear multifrequencial de alta resolução, com avaliação dinâmica da parede abdominal em repouso e à manobra de Valsalva.' in content) > 0
--      and md5(content) in ('0320fe2919999dfdaf59cdcb07ca4539', '1d3ab529c1f67457af89bc0af42469ea');
--   if n <> 8 then raise exception 'W15 parede: esperava 8 blocos, achou %', n; end if;
-- end $w15p$;
-- update knowledge_blocks
--    set content = replace(content,
--          'Exame realizado com transdutor linear multifrequencial de alta resolução, com avaliação dinâmica da parede abdominal em repouso e à manobra de Valsalva.',
--          'Exame realizado com transdutor linear de alta frequência, com avaliação dinâmica da parede abdominal e manobra de Valsalva.'),
--        version = version + 1, updated_at = now()
--  where category_code = 'PAREDE_ABDOMINAL' and kind = 'exemplo' and status = 'validated'
--    and position('Exame realizado com transdutor linear multifrequencial de alta resolução, com avaliação dinâmica da parede abdominal em repouso e à manobra de Valsalva.' in content) > 0
--    and md5(content) in ('0320fe2919999dfdaf59cdcb07ca4539', '1d3ab529c1f67457af89bc0af42469ea');
-- -- esperado: UPDATE 8
-- commit;
--
-- Sem o SQL da parede, a saída já sai certa: o ajuste pós-geração (tecnicaGuard) troca qualquer frase de técnica
-- da parede abdominal pela da casa.
