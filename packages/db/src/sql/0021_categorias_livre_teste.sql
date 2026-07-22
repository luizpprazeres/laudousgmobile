-- Categorias de writer puro. TESTE é filtrada no endpoint de categorias e só
-- fica visível para TESTE_ALLOWED_USER_ID; não é exposta ao restante dos usuários.
insert into public.categories (code, label, active)
values
  ('LIVRE', 'Livre', true),
  ('TESTE', 'Teste', true)
on conflict (code) do nothing;
