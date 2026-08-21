-- 0025 — O CRM VIRA NÚMERO, E O ESTADO VAI PARA O CAMPO DELE
--
-- As colunas `crm` e `uf` existem em `profiles` desde o onboarding, mas nenhuma
-- tela jamais escreveu nelas de forma disciplinada: o que há gravado é texto
-- livre, com o prefixo e o estado dentro da mesma string —
--
--     crm = 'CRM-AL 9446'   uf = NULL
--
-- A tela de preferências (21/08) passa a pedir os dois separados, e a rota
-- canônica passa a exigir só dígitos no CRM. O motivo é o laudo: o CRM sai
-- impresso como identificação profissional, e com o estado embutido na string a
-- linha sairia "CRM-AL 9446 / AL" — o mesmo dado duas vezes, e duas fontes que
-- um dia discordam.
--
-- Esta migração conserta o que está gravado, para que ninguém fique com um
-- perfil que a validação nova recusa e não consiga sequer trocar o próprio nome.
--
-- IDEMPOTENTE: só toca em linhas que ainda casam com o formato antigo. Rodar
-- duas vezes não muda nada na segunda.

BEGIN;

-- O formato antigo, inteiro e reconhecível: 'CRM' opcionalmente seguido do
-- estado, e um número. 'CRM-AL 9446', 'CRM/AL 9446', 'CRM 9446', 'crm al 9446'.
--
-- Só se mexe no que casa com ISTO por completo. Um valor como 'REVIEW0001' (a
-- conta de revisão da Apple) não casa e fica intacto — não se inventa um número
-- de conselho para ninguém, nem para uma conta falsa. Uma primeira versão desta
-- migração usava um padrão frouxo ('qualquer coisa, dígitos, qualquer coisa') e
-- transformava 'REVIEW0001' em '0001', fazendo exatamente o que este parágrafo
-- promete não fazer. O ensaio contra o banco real pegou.
--
-- `\y` e não `\b`: no Postgres a fronteira de palavra é `\y`; `\b` é backspace.
-- Com `\b` o WHERE do estado não casava com nada, e a migração passava sem
-- separar coisa nenhuma — silenciosamente.

-- 1) O estado vai para `uf`, quando está embutido e o campo próprio está vazio.
--    Se o médico já informou a UF, ela é a verdade: uma sigla no meio de texto
--    livre não sobrescreve o que ele preencheu de propósito.
UPDATE public.profiles
   SET uf = upper((regexp_match(crm, '^\s*CRM[\s/-]*([A-Za-z]{2})[\s/-]*\d{4,10}\s*$', 'i'))[1]),
       updated_at = now()
 WHERE crm IS NOT NULL
   AND (uf IS NULL OR uf = '')
   AND crm ~* '^\s*CRM[\s/-]*[A-Za-z]{2}[\s/-]*\d{4,10}\s*$'
   AND upper((regexp_match(crm, '^\s*CRM[\s/-]*([A-Za-z]{2})[\s/-]*\d{4,10}\s*$', 'i'))[1]) IN (
     'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
     'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
   );

-- 2) Sobra o número — e só nos valores que são reconhecidamente o formato antigo.
UPDATE public.profiles
   SET crm = (regexp_match(crm, '(\d{4,10})\s*$'))[1],
       updated_at = now()
 WHERE crm IS NOT NULL
   AND crm !~ '^\d{4,10}$'
   AND crm ~* '^\s*CRM[\s/-]*([A-Za-z]{2}[\s/-]*)?\d{4,10}\s*$';

COMMIT;

-- O que NÃO se faz aqui, de propósito:
--
--   * nenhum CHECK novo na coluna. Sobra dado que não casa com o formato novo
--     ('REVIEW0001'), e uma constraint faria a migração falhar ou obrigaria a
--     apagar o valor de alguém. A regra vive na rota, onde recusa a ESCRITA nova
--     sem destruir o que já está gravado;
--   * nenhum preenchimento de `uf` por adivinhação. Quem tem CRM sem estado
--     reconhecível continua sem estado, e a tela pede.
