# Sprint 11 — sincronização entre web, iOS e Android

## Objetivo

Confirmar que as três plataformas usam a mesma conta e a mesma base atual, mapear os contratos compartilhados e corrigir divergências que faziam uma preferência ou personalização parecer local ao aparelho.

## Fonte de verdade confirmada

- Supabase atual: `laudousgmobile`, ref `yldtkqrsbgcnwlydrrot`.
- Web em produção: projeto Vercel `laudousgmobile`, com `SUPABASE_URL` apontando para a mesma ref.
- Android: `EXPO_PUBLIC_SUPABASE_URL` aponta para a mesma ref nos perfis preview e production.
- iOS: `AppConfig.supabaseURL` aponta para a mesma ref.
- O checkout `/Users/luizprazeres/laudousg` não participa do produto atual.

## Auditoria por domínio

| Domínio | Web | iOS | Android | Resultado |
| --- | --- | --- | --- | --- |
| Autenticação | Supabase Auth | Supabase Auth | Supabase Auth | mesma identidade (`auth.users.id`) |
| Perfil e plano | `/api/me/profile` | `/api/me/profile` | `/api/me/profile` | mesma linha de `profiles`; plano é somente leitura |
| Estilo preferido | perfil compartilhado | lê e gera com o perfil | salvava no perfil, mas a geração ignorava | Android corrigido |
| Biblioteca | customizações por conta, categoria e estilo | mesma API | mesma API | iOS e Android agora alternam Clássico/Objetivo |
| Histórico | `reports` com RLS | `reports` com RLS | `reports` com RLS | leitura, edição e exclusão isoladas por usuário |
| Frases pessoais | consumidas pela Sala | CRUD no iOS | ainda sem tela própria | dado é compartilhado e protegido; falta paridade de interface no Android/web |
| Preferência por variante | API compartilhada | disponível no iOS | sem tela equivalente | armazenamento sincronizado; falta paridade de interface |
| Celular conectado | companion sessions/events | envia eventos | envia eventos | mesma sessão e mesmo usuário |

## Correções entregues

1. A geração e a retomada após perguntas no Android deixaram de usar Clássico fixo e passaram a recarregar `default_writing_style_id` da conta ao entrar na tela.
2. A tela de preferências do Android deixou de oferecer `DIRETO_OBJETIVO` e `DETALHADO_PROTOCOLAR`, inativos no banco, e passou a oferecer os dois estilos ativos: Clássico e Objetivo.
3. O schema local do Android passou a reconhecer `OBJETIVO`, preservando compatibilidade de leitura com os códigos antigos.
4. As bibliotecas de iOS e Android passaram a selecionar explicitamente Clássico ou Objetivo e enviam o estilo em carregar, salvar, publicar, restaurar e voltar ao padrão.

## Segurança verificada no banco

As tabelas `profiles`, `reports`, `user_phrases`, `account_report_preferences`, `report_scopes`, `report_model_customizations`, `companion_sessions` e `companion_events` estão com RLS ativa. As políticas de dados do usuário restringem acesso por `auth.uid()`; customizações são vinculadas ao escopo pertencente ao usuário.

Não houve migração nem alteração de dados neste sprint. As sete contas atuais estão sem preferência explícita de estilo, portanto continuam no Clássico por fallback até o usuário escolher Objetivo.

## Validação

- `pnpm --filter @laudousg/mobile typecheck`
- `npm run typecheck`: 8 pacotes aprovados
- `npm test`: comando aprovado; o monorepo não possui tarefas `test` cadastradas no Turbo
- build iOS para Simulator com assinatura desativada: aprovado
- `git diff --check` nos dois repositórios

O gate `npm run lint` continua bloqueado pela configuração preexistente do monorepo: `next lint` abre o assistente interativo de criação do ESLint em `api`, `web` e `lab`. Nenhuma configuração foi criada silenciosamente neste sprint.

## Pendências conscientes

A sincronização do armazenamento está correta, mas ainda há diferenças de interface: frases pessoais têm editor apenas no iOS; preferência por variante de modelo também está exposta no iOS, não no Android/web. Essas diferenças devem virar uma sprint de paridade funcional, sem criar tabelas paralelas nem duplicar dados localmente.
