-- 0024_menor_privilegio_escrita.sql
--
-- MENOR PRIVILÉGIO DE ESCRITA — quem pode gravar o quê, pela chave pública.
--
-- Aplicado no banco de produção em 21/08/2026 e versionado aqui depois. As três
-- migrações abaixo já valem em produção; este arquivo existe para que um
-- ambiente novo nasça igual, e para que a decisão fique escrita.
--
-- ============================================================================
-- O DEFEITO
-- ============================================================================
--
-- Qualquer usuário logado podia se promover a administrador, do console do
-- navegador, com a chave anon que está no bundle:
--
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', <o meu>)
--
-- `role = 'admin'` não é enfeite. Duas políticas confiam nele:
--   generation_audit.audit_admin_select      -> SELECT na auditoria de geração
--                                               de TODOS os médicos
--   report_template_variants.rtv_admin_all   -> ALL nos modelos de laudo
--
-- Era escalada de privilégio até o trabalho clínico alheio. No mesmo movimento,
-- `plan = 'clinic'` liberava o plano pago.
--
-- ## Por que passou
--
-- A RLS estava certa: ligada nas 24 tabelas, políticas por dono, nenhuma
-- `USING (true)`. O que faltava era a outra metade — **a RLS autoriza a LINHA,
-- o GRANT autoriza a COLUNA**, e o padrão do Supabase concede
-- INSERT/UPDATE/DELETE de tabela inteira a `anon` e `authenticated`. Onde o
-- dono não deveria escrever certos campos da própria linha, o grant era o
-- buraco.
--
-- ## A armadilha ao consertar
--
-- A primeira tentativa foi `REVOKE UPDATE (colunas)`. O Postgres respondeu
-- sucesso e **não mudou nada**: revoke de COLUNA não subtrai de um grant de
-- TABELA. É preciso derrubar o de tabela e reconceder coluna a coluna — e
-- conferir o resultado, porque o retorno de sucesso não prova nada.
--
-- ============================================================================
-- QUEM ESCREVE DE VERDADE (levantado antes de revogar)
-- ============================================================================
--
-- Varridos os quatro clientes que usam a chave anon: apps/web, apps/mobile,
-- apps/lab e o app iOS Swift — este último não toca tabela alguma, fala só com
-- o backend REST. Tudo o mais é escrito pela API com Drizzle sobre
-- DATABASE_URL, que não passa por estes grants.
--
--   profiles                   mobile grava aceites legais e onboarding
--   reports                    mobile edita e apaga os próprios laudos
--   web_reports                a web salva e apaga os laudos determinísticos
--   user_feedback              mobile envia avaliação
--   category_showcase_samples  o lab faz upsert
--
-- Nenhum outro cliente escreve em nenhuma outra tabela.
--
-- ============================================================================

-- ── 1. `anon` não escreve em lugar nenhum ───────────────────────────────────
--
-- Sem sessão, `auth.uid()` é nulo e nenhuma política casaria: hoje o grant é
-- inútil. É defesa em profundidade — basta UMA política futura com
-- `USING (true)` para um recurso público e ele vira escrita aberta a quem tiver
-- a chave anon.
revoke insert, update, delete on all tables in schema public from anon;

-- ── 2. `profiles`: o dono edita o perfil, não a própria conta ───────────────
--
-- Derruba o grant de tabela (ver "a armadilha" acima) e reconcede só o que o
-- dono tem o direito de mudar.
--
-- FICAM DE FORA e por quê:
--   role        escalada de privilégio (as duas políticas acima)
--   plan        plano pago; quem escreve é o webhook do AbacatePay, com
--               service_role
--   id, email   identidade da linha; trocar é assumir outra conta
--   created_at  origem da linha; reescrever é falsear histórico
revoke update on public.profiles from authenticated;

grant update (
  name,
  crm,
  uf,
  default_writing_style_id,
  terms_accepted_at,
  terms_version_accepted,
  privacy_version_accepted,
  medical_disclaimer_version_accepted,
  onboarding_completed_at,
  updated_at
) on public.profiles to authenticated;

-- ── 3. Tabelas que só o servidor escreve ────────────────────────────────────
--
-- A mais importante desta lista é `report_model_customizations`. O dono podia
-- `update ... set status = 'published'` direto do navegador, passando por cima
-- do 403 que a API aplica a quem está fora da allowlist de personalização — o
-- cenário que o README descreve: "uma publicação gravada hoje passaria a valer
-- sozinha no dia em que a flag mudasse". Podia também forjar
-- `base_versao`/`versao` e derrotar a impressão digital que avisa
-- personalização desatualizada. Toda escrita legítima passa por
-- `server/customization/store.ts`, com Drizzle.
revoke insert, update, delete on
  public.account_report_preferences,
  public.categories,
  public.generation_audit,
  public.generation_runs,
  public.golden_cases,
  public.knowledge_blocks,
  public.learning_suggestions,
  public.product_events,
  public.quality_bulletins,
  public.report_model_customizations,
  public.report_scopes,
  public.report_template_variants,
  public.room_tokens,
  public.sala_annotations,
  public.sala_schemas,
  public.user_phrases,
  public.workspace_inputs,
  public.workspace_sessions,
  public.writing_styles
from authenticated;

-- ── 4. E os que o cliente escreve mesmo, explicitamente ─────────────────────
--
-- Redundante com o estado atual, e de propósito: o passo 1 revoga de `anon` em
-- TODAS as tabelas, inclusive as futuras. Declarar aqui o que `authenticated`
-- precisa faz o arquivo descrever o estado desejado por inteiro, em vez de
-- depender do que o Supabase concedeu por padrão em algum momento.
--
-- A RLS continua sendo quem decide QUAIS linhas — isto é só a permissão de
-- tocar na tabela.
grant insert, update, delete on public.reports to authenticated;
grant insert, update, delete on public.web_reports to authenticated;
grant insert, update on public.user_feedback to authenticated;
grant insert, update on public.category_showcase_samples to authenticated;

-- ============================================================================
-- COMO CONFERIR (o `success` da migração não prova nada)
-- ============================================================================
--
--   set local role authenticated;
--   select has_column_privilege('public.profiles','role','UPDATE')  as deve_ser_false,
--          has_column_privilege('public.profiles','name','UPDATE')  as deve_ser_true,
--          has_table_privilege('public.report_model_customizations','UPDATE') as deve_ser_false,
--          has_table_privilege('public.web_reports','INSERT')       as deve_ser_true;
--
-- Reverter para o padrão do Supabase (não recomendado):
--   grant insert, update, delete on all tables in schema public
--     to authenticated, anon;
