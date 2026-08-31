# Sprint 13 — paridade de frases e polimento da web

## Objetivo

Eliminar pequenos movimentos da prévia e tornar as frases pessoais realmente editáveis e sincronizadas entre web, Android, iOS e Sala, sem reabrir escrita direta no banco.

## Entregue

- O aviso de atualização da prévia virou uma camada absoluta: aparece sem empurrar o papel nem alterar a posição de leitura.
- Durante a atualização, o laudo permanece visível com opacidade reduzida e um pequeno indicador circular em movimento.
- O cartão `0 de N / o restante está normal / salvo há 2s` foi removido de todas as categorias.
- A estrela decorativa do menu lateral foi substituída por uma linha verde discreta.
- A página de Preferências da web ganhou CRUD de frases pessoais, com categoria opcional.
- O Android ganhou `Preferências > Minhas frases`, com criação, edição e exclusão.
- O iOS deixou de escrever diretamente no PostgREST e passou a usar a rota autenticada comum.
- A API ganhou `/api/me/user-phrases`, que valida o JWT, limita toda operação ao `user_id` autenticado e executa a escrita apenas no servidor.
- A preferência de variante permanece conectada à API e só aparece quando houver variante validada e marcada como elegível.

## Segurança e banco

O banco atual mantém `insert/update/delete` de `user_phrases` revogados para clientes. A rota usa o cliente de serviço somente depois de validar o JWT e sempre aplica `user_id = usuário autenticado` nas leituras, alterações e exclusões.

A consulta de produção confirmou RLS ativa e políticas por proprietário. Também confirmou que hoje existem zero variantes `validated + preference_eligible`; por isso o seletor fica oculto, em vez de mostrar uma escolha sem efeito.

## Validação

- `pnpm --filter @laudousg/api typecheck`
- `pnpm --filter @laudousg/web typecheck`
- `pnpm --filter @laudousg/mobile typecheck`
- `pnpm --filter @laudousg/web build`
- build iOS Simulator com assinatura desativada
- inspeção ao vivo de colunas, grants, RLS e variantes no Supabase atual

## Aceite manual

1. Alterar um achado na web: o papel não deve se mover; deve apenas perder um pouco de opacidade e mostrar o spinner flutuante.
2. Criar uma frase em Preferências na web e confirmar que ela aparece no iOS, Android e Sala.
3. Editar a frase no iOS ou Android e recarregar a web.
4. Excluir a frase em qualquer plataforma e confirmar que desapareceu nas demais.
