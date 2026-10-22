# Story admin-instagram-quadro — Quadro visual: prévia das artes, reorganizar e aprovar em lote

**Status:** InReview · **Criada:** 22/10/2026 · **Pedido do Luiz em 22/10:** "ver a prévia das imagens no estilo mapa mental e reorganizar ou aprovar várias ao mesmo tempo" · **Base:** [F3](2026-10-22-admin-instagram-f3.md) (branch `feat/admin-instagram-f3`, rebaseado sobre `42792955`; a migração F3 já foi aplicada como `20261022225129_admin_social_f3.sql`)

## Contexto

O calendário tem 80 posts e 111 slides (S1 a S4, de 26/10 a 22/11). Hoje o Luiz abre post por post, sobe slide por slide e aprova um a um. O Quadro junta as quatro semanas numa tela só, com as miniaturas de todos os slides, e permite mover, reordenar, enviar as artes e aprovar em lote, sempre com as regras de hoje.

## Critérios de aceite

1. **Quadro visual** em `/admin/instagram/quadro` (aba ao lado de Semana/Mês): uma coluna por semana (S1–S4), grupos por dia; cada post é um cartão com as miniaturas de todos os slides em fileira, id, dia/hora, formato, selo de status (os mesmos da F3) e alerta de slide sem imagem. Stories numa faixa própria por dia, menores. Miniatura → imagem grande (lightbox sem biblioteca nova) com setas entre slides; título → editor. Claro/escuro como o painel.
2. **Reorganizar** (só `draft`; o cartão do aprovado diz que precisa voltar para rascunho):
   - arrastar o cartão para outro dia mantém a hora; seletor de horário no cartão troca a hora;
   - arrastar as miniaturas reordena os slides do carrossel (reordenação completa e atômica);
   - drag-and-drop nativo (HTML5) com alternativa por teclado/botões, sem dependência nova.
3. **Seleção e lote:** caixa em cada cartão, "selecionar semana", "selecionar tudo que está pronto" (rascunhos que passam nas regras de aprovação). Barra: **Aprovar selecionados**, **Voltar para rascunho**, com confirmação na própria barra (sem `confirm()`). Cada post passa pelas regras de hoje; o resultado mostra quantos aprovaram e o motivo, por post, de quem não aprovou.
4. **Envio em lote de imagens:** soltar vários arquivos ou escolher uma pasta. `<id-do-post>-<slide>.jpg` define o destino. Prévia do mapeamento (OK ou motivo: post inexistente, slide inexistente, post fora de rascunho, tamanho/dimensão errada, não é JPEG) e "Enviar N imagens". Uma por vez para a rota de upload existente (limite de ~4,5 MB da Vercel, dimensão por formato), com barra de progresso. Nome fora do padrão: ignorado com aviso. Prévias (`-v2`…) e a pasta `_fontes`: ignoradas.
5. **Segurança:** sessão de admin + checagem de origem em tudo; lote em `POST /admin/api/social/lote` (até 100 ids). Função SQL nova só por migração no padrão (RLS, revoke, só `service_role`), **não aplicada**.
6. **Testes:** mapeamento de nomes (válidos, inválidos, prévias, `_fontes`), aprovação em lote mista com motivos, mover de dia mantendo a hora em America/Sao_Paulo, só `draft` move/reordena, reordenação completa. `typecheck`, `test` e `build` verdes.

## Fora do escopo

Publicação, chamada à API da Meta, push, deploy, env, migração aplicada. Mudanças fora de `apps/admin`, `supabase/migrations` e `docs/`.

## Tarefas

- [x] Migração nova (reagendar e reordenar), sem aplicar
- [x] Regras puras: nome de arquivo → destino, mover mantendo a hora, permutação, montagem do quadro
- [x] Rota `POST /admin/api/social/lote` (aprovar, rascunho, mover, reordenar) e resposta JSON no upload
- [x] Tela `/instagram/quadro`: cartões, lightbox, drag-and-drop + teclado, seleção, barra de lote, envio em lote
- [x] Aba "Quadro" ao lado de Semana/Mês
- [x] Testes, typecheck, build
- [x] Entrega em `docs/admin/entrega-instagram-quadro.md`

## File List

- `supabase/migrations/20261022230954_admin_social_quadro.sql` (nova, **não aplicada**: `social_reschedule` e `social_reorder_items`)
- `apps/admin/src/lib/social/quadro.ts` (novo: semanas S1–S4, mover mantendo a hora, permutação, montagem do quadro, nome do arquivo → destino, mensagens)
- `apps/admin/src/lib/social/lote.ts` (novo: `POST /api/social/lote` — aprovar, rascunho, mover, reordenar)
- `apps/admin/src/lib/social/servidor.ts` (`RepositorioLote`, `repositorioLote`; `ResultadoAcao` com `mudou` e `ordem`)
- `apps/admin/src/lib/social/rotas.ts` (`autorizarAdmin` exportado, `querJson`, `respostaJson`; `midia` responde JSON com `Accept: application/json`)
- `apps/admin/src/lib/social/instancia.ts` (`rotaLote`), `apps/admin/src/app/api/social/lote/route.ts` (novo)
- `apps/admin/src/components/QuadroInstagram.tsx` (novo, cliente: cartões, lightbox, arrastar e soltar + teclado, seleção, barra de lote)
- `apps/admin/src/components/EnvioLote.tsx` (novo, cliente: envio em lote com prévia do mapeamento e progresso)
- `apps/admin/src/app/(painel)/instagram/quadro/page.tsx` (novo), `apps/admin/src/app/(painel)/instagram/page.tsx` (aba Quadro), `apps/admin/src/app/globals.css` (estilos `qd-*`)
- `apps/admin/tests/instagram-quadro.test.ts` (novo, 16 testes), `apps/admin/tests/instagram.test.ts` (lista de rotas com `lote`)
- `docs/admin/entrega-instagram-quadro.md` (novo)

## Change Log

- 22/10/2026 — @dev: story criada a partir do pedido do Luiz; Draft → InProgress (branch `feat/admin-instagram-quadro`, worktree `~/.worktrees/laudousg-admin-instagram-quadro`, base `54522da7` da F3).
- 22/10/2026 — @dev: rebase sobre `42792955` (migração F3 renomeada para a versão aplicada); migração do Quadro com timestamp `20261022230954`, posterior a ela, **não aplicada**.
- 22/10/2026 — @dev: implementação concluída; typecheck, test (119 pass, 1 skip) e build verdes; 8 de 8 mutações pegas. InProgress → InReview, aguardando @qa. Entrega em `docs/admin/entrega-instagram-quadro.md`.
