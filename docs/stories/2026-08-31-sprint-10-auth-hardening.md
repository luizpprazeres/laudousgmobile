# Sprint 10 — fechamento de contas e login

## Objetivo

Fechar as lacunas restantes do cadastro compartilhado entre web, Android e iOS, partindo da implementação do antigo Sprint 4 e da investigação da conta da Luanna.

## Diagnóstico confirmado

- O projeto atual é `laudousgmobile` (`yldtkqrsbgcnwlydrrot`) e está saudável.
- Existem 7 usuários de autenticação e 7 perfis; não há usuário sem perfil.
- Todos os 7 emails estão confirmados e apenas uma conta nunca iniciou sessão.
- Os logs recentes mostram login e renovação de sessão funcionando no app.
- A conta relatada não falhou no cadastro: ficou presa entre a confirmação e o primeiro login.

## Critérios de aceite

- [x] Erros de login usam o código estável do Supabase e mantêm compatibilidade com mensagens antigas.
- [x] Falha de rede encerra o estado de carregamento e mostra orientação compreensível.
- [x] Login com email não confirmado oferece reenvio da confirmação.
- [x] Reenvio usa o domínio atual e retorna ao callback da web.
- [x] Destinos externos informados em `redirect` ou `next` são recusados.
- [x] Destinos internos com querystring continuam funcionando.
- [x] Cadastro continua sem registrar email, senha ou mensagem crua nos diagnósticos.
- [x] Nenhum usuário real foi criado, alterado ou removido durante a auditoria.

## Validação

- [x] Adaptador de erros e redirects: 7/7 verificações.
- [x] Erros de cadastro: 6/6 verificações.
- [x] Privacidade do diagnóstico: 8/8 verificações.
- [x] Typecheck web.
- [x] Build web de produção.
- [ ] Cadastro com email novo, confirmação, login e recuperação testados manualmente em produção.

## Pendências operacionais

- Confirmar visualmente no painel do Supabase a Site URL, a lista completa de redirects, SMTP e template do email.
- Avaliar ativação da proteção contra senhas vazadas, apontada pelo advisor do Supabase.

## Arquivos

- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/signup/page.tsx`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/lib/auth/authPresentation.ts`
- `apps/web/src/lib/auth/__tests__/authPresentation.manual.ts`
- `docs/stories/2026-08-31-sprint-10-auth-hardening.md`
