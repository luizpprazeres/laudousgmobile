# Instagram Quadro: entrega de 22/10/2026

Pronto para revisão local na branch `feat/admin-instagram-quadro`, no worktree `~/.worktrees/laudousg-admin-instagram-quadro`, criado a partir da F3 e rebaseado sobre `42792955`, o commit em que a migração F3 foi renomeada para a versão aplicada (`20261022225129_admin_social_f3.sql`). Escopo: [story admin-instagram-quadro](../stories/2026-10-22-admin-instagram-quadro.md). Pedido do Luiz: "ver a prévia das imagens no estilo mapa mental e reorganizar ou aprovar várias ao mesmo tempo".

Não houve push, deploy, env, migração aplicada, chamada à API da Meta nem publicação. Nada fora de `apps/admin`, `supabase/migrations` e `docs/` foi tocado.

**Há migração nova, não aplicada:** `supabase/migrations/20261022230954_admin_social_quadro.sql`. Ela é posterior à F3. Sem ela, o Quadro abre e aprova em lote, e o envio de imagens funciona. Só **mover** e **reordenar** falham, com a mensagem "O banco não respondeu" (a função não existe, nada é gravado).

## O que entrou

### Tela `/admin/instagram/quadro`

A aba **Quadro** fica ao lado de Semana e Mês, nas duas telas.

- **Quatro colunas**, S1 a S4, de segunda a domingo. Sem `?d=`, o quadro começa na semana do primeiro post a partir desta semana; hoje, isso é 26/10, o S1 do calendário. As setas andam uma semana; "Início" volta ao padrão.
- **Dentro de cada coluna, um grupo por dia.** Cada post é um cartão com:
  - a caixa de seleção;
  - a alça de arrastar, o id e o formato;
  - o selo da F3: Rascunho, Agendado, Atrasado, Manual, Publicando, Publicado e Falhou, com a dica no `title`;
  - **as miniaturas de todos os slides em fileira**, numeradas;
  - o título, que leva ao editor;
  - o dia e a hora;
  - "Falta imagem em N slides" e o motivo do bloqueio, quando há;
  - o erro e "Ver no Instagram ↗" vindos da F3.
- **Stories** ficam numa faixa própria por dia, com cartões menores e miniaturas 9:16.
- **Lightbox:** clicar numa miniatura abre a imagem grande. Usa o `<dialog>` nativo, sem biblioteca. As setas na tela e no teclado (← →) passam de slide e o Esc fecha. Ao fechar, o foco volta para a miniatura. Num carrossel em rascunho, há "Mover para a posição N", que é a alternativa por teclado ao arrastar. Há também "Abrir no editor".
- **Claro e escuro:** só os tokens de cor que o painel já usa (`--surface`, `--brand-2`, `--warn`…). Não há cor nova fixa no CSS, fora o fundo do lightbox e o selo numérico das miniaturas. No celular, as colunas rolam na horizontal com snap.

### Reorganizar (só rascunho)

- **Arrastar o cartão** pela alça ⋮⋮ para outro dia. A hora fica a mesma, no fuso de São Paulo. Dias passados não aceitam o cartão.
- **Dia e hora no cartão:** o próprio "seg 26/10 · 12:15" abre um seletor com o dia (os 28 do quadro) e a hora (`<input type="time">`), mais o botão "Aplicar". Enter também aplica. Serve para trocar só a hora e é a alternativa por teclado ao arrastar.
- **Reordenar slides:** arrastar uma miniatura sobre outra leva o slide para aquela posição e desloca os demais. A troca é atômica, numa função SQL nova. Pelo teclado, a mesma coisa se faz no lightbox.
- **Aprovado não se move:** o cartão não tem alça e diz "Para mover ou reordenar, volte para rascunho." O banco também recusa.
- HTML5 nativo (`draggable`, `dataTransfer`), sem dependência nova.

### Seleção e lote

- Caixa em cada cartão. "Selecionar semana" (e "Desmarcar semana") no topo de cada coluna. **"Selecionar tudo que está pronto (N)"** seleciona os rascunhos que passam hoje nas regras de aprovação: imagem em todos os slides, quantidade certa de slides e horário futuro.
- **Barra fixa embaixo:** "N selecionados · K prontos para aprovar", **Aprovar selecionados**, **Voltar para rascunho** e Limpar seleção.
- **Confirmação na própria barra**, sem `confirm()`: "Aprovar 7 posts? Eles serão publicados automaticamente nos horários marcados." A barra avisa também quantos são stories manuais e quantos não vão passar nas regras. Depois vem o botão "Aprovar 7 posts" ou Cancelar.
- **Resultado:** "5 de 7 aprovados. 2 posts não mudaram:", com a lista por post (link para o editor e motivo), por exemplo "Falta imagem em pelo menos um slide…" ou "O horário já passou…". Quem aprovou sai da seleção; quem não aprovou continua selecionado, para corrigir e tentar de novo.
- Cada post passa por `social_set_status`, a mesma função do editor. As regras são as de hoje, conferidas no banco com a linha travada.

### Envio de imagens em lote

Fica num painel recolhível no topo do Quadro.

- **Entrada:** soltar arquivos ou pastas (lidas recursivamente; a pasta `_fontes` nem é aberta), "Escolher arquivos" ou "Escolher pasta" (`webkitdirectory`).
- **O nome define o destino:**
  - `s1-02-3.jpg` → post s1-02, slide 3;
  - `st-1026-1.jpg` → story st-1026-1, slide 1. Como o id já termina em número, o nome exato do id vale como slide 1; `st-1026-1-1.jpg` também serve.
  - Maiúsculas não importam; `.jpeg` também vale.
- **Prévia do mapeamento antes de enviar** (arquivo → destino → situação). Pode dar OK, "OK (substitui a imagem atual)" ou um destes motivos:
  - post inexistente neste quadro;
  - slide inexistente;
  - o post não está em rascunho;
  - não é JPEG (pela extensão e pela assinatura do arquivo);
  - dimensão errada, com o tamanho lido e o exigido ("Tamanho 1080×1920; carrossel pede 1080×1350");
  - acima de 4,4 MB;
  - vazio;
  - dois arquivos para o mesmo slide (nenhum dos dois vai);
  - nome ambíguo.

  A dimensão e a assinatura são lidas no navegador pelo mesmo `dimensoesJpeg`/`validarImagem` do servidor. A leitura é do começo do arquivo; se o SOF estiver mais adiante, lê o arquivo inteiro.
- **Ignorados**, numa lista recolhida com o motivo: prévias (`-v1`, `-v2`, `-v2a`, `-v2b-com-gravacao-do-site`…), qualquer coisa dentro de `_fontes/`, arquivos ocultos (`.DS_Store`, `._*`) e nomes fora do padrão (`s1-01-captura.jpg`). Arquivo que não é imagem (`revisao.html`) aparece como "Não é JPEG".
- **"Enviar N imagens":** manda **uma por vez** para a rota de upload que já existe (`POST /admin/api/social/midia`), que valida tudo de novo: formato vindo do banco, assinatura, dimensão e rascunho. Há barra de progresso ("12 de 40"), resultado por arquivo e "Parar depois desta". No fim, o quadro é recarregado do servidor.
- **Limite de 4,4 MB por arquivo:** a Vercel recusa corpo de função acima de ~4,5 MB antes do handler; a folga é para o envelope multipart. Um 413 aparece como "Recusada pelo servidor por tamanho".

### Rota `POST /admin/api/social/lote`

Só aceita `application/json`, até 16 KB.

| Corpo | Faz |
|---|---|
| `{ acao: "aprovar" \| "rascunho", ids }` | 1 a 100 ids (repetidos são ignorados); `social_set_status` em cada um, 4 por vez; resposta `{ total, ok, resultados: [{ id, resultado }] }` na ordem do pedido |
| `{ acao: "mover", id, de, data, hora? }` | novo horário = `data` + a hora atual em São Paulo (ou `hora`); passado é recusado antes do banco; `social_reschedule(id, de, para)` |
| `{ acao: "reordenar", id, ordem }` | `ordem` precisa ser permutação de 1..n (até 20); `social_reorder_items` |

- **Segurança:** a mesma porta das rotas atuais (`autorizarAdmin`): origem do POST (`contextoPost`), sessão, allowlist, MFA conforme a config e `profiles.role = 'admin'`. Falhou → 404, sem tocar no banco. Pedido malformado → 400 `{ erro: "pedido" }`. O middleware também barra (404) quem não tem sessão. Resposta com `Cache-Control: no-store`.
- **Upload em JSON:** com `Accept: application/json`, a rota `midia` responde `{ resultado }` em vez do redirect 303. As checagens são as mesmas e o caminho de código também; sem esse cabeçalho, nada muda para o editor.

## Migração nova (não aplicada)

`supabase/migrations/20261022230954_admin_social_quadro.sql`:

```sql
BEGIN;

CREATE FUNCTION public.social_reschedule(p_id text, p_de timestamptz, p_para timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_quando timestamptz;
BEGIN
  SELECT status, scheduled_at INTO v_status, v_quando FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF v_status <> 'draft' THEN RETURN 'status'; END IF;
  IF p_de IS NULL OR v_quando IS DISTINCT FROM p_de THEN RETURN 'mudou'; END IF;
  IF p_para IS NULL OR p_para <= now() THEN RETURN 'passado'; END IF;
  UPDATE public.social_posts SET scheduled_at = p_para WHERE id = p_id;
  RETURN 'ok';
END $$;

CREATE FUNCTION public.social_reorder_items(p_id text, p_ordem integer[])
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_status text; v_n integer; v_max integer; v_distintas integer;
BEGIN
  SELECT status INTO v_status FROM public.social_posts WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'nao_encontrado'; END IF;
  IF v_status <> 'draft' THEN RETURN 'status'; END IF;
  SELECT count(*), coalesce(max(position), 0) INTO v_n, v_max FROM public.social_media_items WHERE post_id = p_id;
  IF v_n = 0 OR v_max <> v_n THEN RETURN 'ordem'; END IF;
  IF p_ordem IS NULL OR coalesce(array_ndims(p_ordem), 1) <> 1 OR cardinality(p_ordem) <> v_n THEN RETURN 'ordem'; END IF;
  SELECT count(DISTINCT x) INTO v_distintas FROM unnest(p_ordem) AS x WHERE x BETWEEN 1 AND v_n;
  IF v_distintas <> v_n THEN RETURN 'ordem'; END IF;
  UPDATE public.social_media_items a
     SET storage_path = b.storage_path, public_url = b.public_url, slide_text = b.slide_text,
         visual_brief = b.visual_brief, alt_text = b.alt_text
    FROM unnest(p_ordem) WITH ORDINALITY AS o(antiga, nova)
    JOIN public.social_media_items b ON b.post_id = p_id AND b.position = o.antiga
   WHERE a.post_id = p_id AND a.position = o.nova AND o.antiga <> o.nova;
  RETURN 'ok';
END $$;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON FUNCTION public.social_reschedule(text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.social_reorder_items(text,integer[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.social_reschedule(text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.social_reorder_items(text,integer[]) TO service_role;

COMMIT;
```

São só duas funções no padrão da F1: `SECURITY INVOKER`, `search_path = ''`, trava do post com `FOR UPDATE`, só rascunho e execução só para o `service_role`. Não há tabela, coluna, policy nem grant de tabela novos. A ordem do GO é a mesma de sempre: aplicar a migração → deploy. Se o deploy vier antes, a tela funciona, e mover e reordenar respondem "O banco não respondeu".

## Evidência de validação

```
pnpm --filter @laudousg/admin typecheck   → tsc --noEmit sem erros
pnpm --filter @laudousg/admin test        → tests 120 · pass 119 · fail 0 · skipped 1
pnpm --filter @laudousg/admin build       → Compiled successfully; /instagram/quadro (10,1 kB) e /api/social/lote geradas
```

O teste pulado é o mesmo da F1 (calendário real não versionado). `apps/admin/tests/instagram-quadro.test.ts` tem 16 testes:

- **Nomes válidos:**
  - `s1-02-3.jpg`, com pasta, maiúsculas, `.jpeg` e caminho do Windows;
  - `st-1026-1.jpg` e `st-1026-1-1.jpg`;
  - `s1-01.jpg`;
  - "substitui" quando o slide já tem imagem.
- **Inválidos com motivo:**
  - slide 0 e slide 6 de um carrossel de 5;
  - slide 2 de um story;
  - post inexistente;
  - aprovado e publicado ("não está em rascunho");
  - `.png` e `.html`;
  - acima de 4,4 MB e vazio;
  - ambíguo (`x-1.jpg` com os posts `x` e `x-1`).
- **Ignorados:**
  - as seis variações de prévia, com os nomes reais de `output/instagram/semana-1`;
  - `_fontes` em qualquer nível e caixa;
  - `s1-01-captura.jpg`, `foto final.jpg`, `.DS_Store`, `._*`.
- **Duplicado:** dois arquivos para o mesmo slide derrubam os dois, e o resto segue.
- **Mover no fuso:**
  - 12:15 de 27/10 → 29/10 às 12:15;
  - o story das 21:00, que já é o dia seguinte em UTC, vai para 30/10 às 21:00 (`2026-10-31T00:00Z`);
  - troca de hora;
  - data e hora inválidas;
  - só `draft` move;
  - passado recusado.
- **Reordenação:** arrastar para frente e para trás, identidade, `aplicarOrdem`, permutações inválidas e mais de 20 slides.
- **Montagem S1–S4:** intervalos em UTC, post no dia de São Paulo, ordem dos slides, faltam/pronto/bloqueio, aprovado não editável, post fora das 4 semanas fica fora e o catálogo do envio.
- **Tela (renderizada no servidor):**
  - as 4 semanas, "Selecionar tudo que está pronto (1)" e "Selecionar semana" ×4;
  - a caixa de seleção, "Falta imagem em 1 slide" e a trava do aprovado;
  - o link do título para o editor e as miniaturas;
  - a alça arrastável só no rascunho, a faixa de stories e o envio em lote com `webkitdirectory`.
- **Rota de lote (repositório falso):**
  - sem admin → 404 nas três ações, sem chamar o banco;
  - 16 pedidos malformados → 400 (tipo errado, JSON ruim, corpo grande, ação desconhecida, 0 ou 101 ids, id inválido, mover sem `de`, data e hora inválidas, permutação ruim);
  - aprovação mista com 8 ids e motivos: `ok`, `sem_imagem`, `passado`, `status`, `slides`, `nao_encontrado`, `falha`; contagem certa, ordem do pedido e repetido removido;
  - voltar para rascunho;
  - mover manda `de` e o novo horário mantendo a hora; passado não chega no banco; reordenar.
- **SQL real (PGlite, as três migrações):**
  - funções só para o `service_role`, `SECURITY INVOKER`, RLS ligado, sem policy;
  - aprovação em lote pela rota sobre o SQL: s1-01 e o story aprovam; o carrossel com 3 de 5 imagens dá `sem_imagem`, o vencido dá `passado`, o publicado dá `status` e o inexistente dá `nao_encontrado`;
  - "voltar para rascunho" em lote: aprovados voltam, rascunho e publicado não;
  - reagendar: `mudou` com o horário errado e também na segunda aba depois de mudado, `passado`, `ok`, `nao_encontrado`; aprovado → `status` sem mudar nada;
  - mover pela rota, de ponta a ponta, mantendo as 21:00 de São Paulo;
  - reordenação completa leva imagem, texto, briefing e alt juntos (duas permutações seguidas conferidas linha a linha); identidade não muda nada; 7 permutações inválidas, incluindo `null` e array 2D → `ordem` sem mudar nada; aprovado → `status` sem mudar nada.
- **Upload em JSON:** `ok`, `dimensao` (story com arte de feed), `tipo`, `status` e `nao_encontrado`; sem `Accept`, o redirect 303 continua; sem admin, 404.
- **Código:**
  - a rota ligada à instância, `autorizarAdmin`, 404 sem admin;
  - os dois componentes com `"use client"` e sem `confirm(`, service role, `NEXT_PUBLIC_` nem `localStorage`;
  - a página com `exigirAdmin` e sem `"use client"`;
  - `quadro.ts` sem import de Node nem de servidor;
  - a aba Quadro na tela atual.

Um teste antigo mudou: `instagram.test.ts` trava a lista exata de rotas em `api/social/` e ganhou `lote`.

**Mutações feitas à mão:** as oito foram pegas.

- reordenar sem a checagem de rascunho;
- reagendar sem o `mudou`;
- reagendar sem o `passado`;
- prévia não ignorada;
- `_fontes` não ignorada;
- mover com a hora em UTC em vez de São Paulo;
- duplicado não derrubado;
- lote sem o limite de 100.

## Decisões tomadas por conta própria

1. **Migração com duas funções, em vez de reaproveitar o que existe.**
   - Reordenar com `social_move_item` exigiria até 10 trocas vizinhas por carrossel. Uma falha no meio deixaria uma ordem pela metade.
   - Mover com `social_save_post` exigiria ler e reescrever legenda, hashtags e alt, com risco de sobrescrever uma edição feita no editor ao mesmo tempo.
   - As duas funções novas são atômicas e só tocam o necessário.
2. **Mover com compare-and-swap** (`p_de` = o horário que a tela mostrou). Se outra aba mudou o post, a segunda tentativa recebe "O horário mudou em outra aba" e a tela é recarregada.
3. **Mover para o passado é recusado** (na rota e no banco). O editor ainda aceita salvar no passado, como antes. No Quadro, isso nunca é o que se quer, e aprovar ia bloquear depois de qualquer jeito.
4. **"Pronto" é o mesmo `motivoBloqueioAprovacao` do editor:** imagem em tudo, quantidade de slides e horário futuro. O banco é quem decide na hora de aprovar.
5. **Selecionar e aprovar valem para stories manuais também.** Aprovar um manual não publica nada: ele entra na faixa "Para publicar à mão agora" da F3. A confirmação avisa quantos são.
6. **A seleção aceita qualquer status.** O resultado explica, por post, quem não mudou ("Só rascunho pode ser aprovado.", "Só aprovado… ou com falha volta para rascunho."). Assim "Selecionar semana" seguido de "Voltar para rascunho" funciona para a semana inteira.
7. **Upload em lote reaproveita a rota `midia`**, com `Accept: application/json` para responder `{ resultado }`. Não foi criada uma rota nova de upload; as validações são as mesmas.
8. **Limite de 4,4 MB no envio em lote** (a rota continua aceitando 8 MB, como na F1). Acima de ~4,5 MB, a Vercel recusa antes do handler.
9. **`<id>.jpg` vale como slide 1** quando o id existe. É o caso dos stories em `output/instagram` (`st-1026-1.jpg`). Se o nome casar com dois posts, é "ambíguo" e não vai.
10. **"Post inexistente" é em relação às 4 semanas exibidas.** O catálogo do envio é o próprio quadro; o calendário inteiro (26/10 a 22/11) cabe nele.
11. **Arrastar pelo cabeçalho do cartão (alça ⋮⋮), não pelo cartão inteiro.** Assim os campos de dia e hora e a caixa de seleção continuam clicáveis em todos os navegadores. A imagem de arrasto é o cartão inteiro (`setDragImage`).
12. **Miniaturas são links** (`<a href=imagem>`) que abrem o lightbox. Arrastam no Firefox (botão não arrasta) e, sem JavaScript, ainda abrem a imagem.
13. **Sem atualização otimista:** depois de cada ação o quadro recarrega do servidor (`router.refresh()`). O banco é a verdade.
14. **Sem prévia local (blob) das imagens antes de enviar:** o CSP do painel (`img-src 'self' data: <bucket>`) não libera `blob:`, e não mexi nele.
15. **Um post com id `quadro`** não abriria no editor (a rota estática ganha de `/instagram/[id]`). O calendário não tem esse id.

## Pendências e riscos

- **Aplicar a migração** `20261022230954_admin_social_quadro.sql` (orquestrador, depois do GO), depois da F3, que já foi aplicada.
- **Validação visual no navegador com sessão real** não foi feita. Não há Supabase local nem sessão de admin neste ambiente. Os componentes foram renderizados no servidor em teste e o build passou. Vale conferir com o Luiz:
  - arrastar no Safari, no Chrome e no Firefox;
  - soltar a pasta `output/instagram` inteira;
  - o lightbox no celular.
- **Envio de 111 imagens:** uma por vez, cada uma com a validação e o upload no Storage. Leva alguns minutos e a aba precisa ficar aberta. "Parar depois desta" interrompe sem perder o que já foi.
- O selo do quadro não muda sozinho na hora em que o cron publica; é preciso recarregar a página, como no calendário.
