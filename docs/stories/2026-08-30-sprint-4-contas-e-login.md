# Sprint 4 — Contas, login e recuperação de acesso

## Status

Implementação concluída; validação ponta a ponta em aparelhos reais pendente.

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
- [x] Cadastro público, confirmação obrigatória e provedor de email confirmados no projeto atual.
- [x] Web publicada em produção.
- [x] APK Android de homologação gerado.
- [x] iOS envia confirmação e recuperação com o `redirect_to` nativo correto.
- [x] Build iOS 156 enviada ao TestFlight.
- [ ] Site URL, allowlist completa de redirects, SMTP e conteúdo do template confirmados visualmente no painel.
- [ ] Cadastro, confirmação, login e recuperação validados ponta a ponta nas três plataformas.

## Validação realizada

O banco atual possui sete usuários de autenticação e sete perfis, sem órfãos em
nenhum dos lados. A conta relatada por Luanna confirmou o email, mas nunca criou
uma sessão. Uma conta já existente conseguiu autenticar e acessar a API de perfil
com sucesso. Isso confirma banco, credenciais e sessão; ainda não substitui o
teste completo usando um email novo em cada aparelho.

O callback web foi publicado em `laudousg.com.br`. O Android passou pela
compilação e pelo teste manual dos seis formatos de deep link, e o APK de
homologação foi concluído no EAS como build 8, ID
`66e70bf9-4925-48b1-a0da-6ec4206af0c9`.

No iOS, os testes novos de montagem dos links compilam e a aplicação passou no
build Debug e no Archive Release. O runner do simulador não concluiu a execução
dos testes, portanto esse resultado não foi contado como teste executado. A build
156 foi enviada com sucesso ao App Store Connect e está em processamento.

## File list

- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/mobile/app/(auth)/login.tsx`
- `apps/mobile/app/(auth)/update-password.tsx`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/+native-intent.ts`
- `apps/mobile/src/features/auth/deepLink.ts`
- `apps/mobile/src/features/auth/deepLink.manual.ts`
- `LaudoUSG/Services/AuthService.swift` (repositório iOS)
- `LaudoUSGTests/AuthServiceTests.swift` (repositório iOS)
