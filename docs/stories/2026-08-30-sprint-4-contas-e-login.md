# Sprint 4 — Contas, login e recuperação de acesso

## Status

Em andamento.

## Objetivo

Garantir que uma única conta funcione na web, Android e iOS, com confirmação de
email, primeiro login e recuperação de senha sem becos sem saída.

## Diagnóstico inicial

A conta relatada por Luanna (`luannabezerra70@gmail.com`) existe, confirmou o
email 33 segundos após o cadastro e possui perfil correspondente, mas nunca
iniciou sessão. O callback web tratava falha de troca de sessão como link
inválido, mesmo quando o email já havia sido confirmado.

No Android, o cadastro mandava o usuário para a geração mesmo quando o Supabase
retornava conta sem sessão, não definia um destino para o email e não processava
os tokens do deep link. A recuperação também não tinha tela para salvar a nova
senha.

## Critérios de aceite

- [x] Banco atual tem paridade entre `auth.users` e `profiles`.
- [x] Web orienta login quando a confirmação ocorreu sem sessão no navegador.
- [x] Android não entra na aplicação sem sessão após o cadastro.
- [x] Android processa confirmação e recuperação pelo deep link `laudousg://`.
- [x] Android possui tela para definir a nova senha.
- [ ] Configuração real de Site URL, redirects, SMTP e template confirmada.
- [ ] Cadastro, confirmação, login e recuperação validados ponta a ponta nas três plataformas.
- [ ] Correções publicadas em produção e nas lojas de teste.

## File list

- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/app/(auth)/update-password.tsx`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/+native-intent.ts`
- `apps/mobile/src/features/auth/deepLink.ts`
- `apps/mobile/src/features/auth/deepLink.manual.ts`
