# web.laudousg.com — o que existe e o que falta

**Documento de retomada.** Leia depois do `README.md`.
Escrito em 20/08/2026, ao fim de uma sessão longa.

---

## 0. O mapa, porque é fácil se perder aqui

Existem **dois** sites. Confundi-los custou horas de trabalho nesta sessão.

| | `laudousg.com` | **`web.laudousg.com`** |
|---|---|---|
| estado | ☠️ **MORTO** — ninguém usa | ✅ **é este que vale** |
| código | `~/laudousg` (repo à parte) | **`laudousgmobile-def/apps/web`** |
| projeto Vercel | `laudousg` | `laudousg-web` |
| Supabase | `gimxiyjfuaqptahssqgb` (próprio) | **`yldtkqrsbgcnwlydrrot` — o mesmo do iOS, Android e API** |
| geração | LLM puro, prompt próprio | determinístico por cliques |

> **Não trabalhe em `~/laudousg`.** Ele continua no ar e recebeu melhorias em 20/08
> (histórico master-detail, preferências, contraste, Barlow). Foi trabalho perdido
> — fica lá, sem incomodar, e serve de fonte para portar o desenho.

**Consequência que muda o desenho:** o web real **compartilha o banco canônico e
tem o médico logado**. Não há duas contas, não há migração de banco a fazer. A
Biblioteca dele pode ser completa — com personalização — chamando
`/api/me/report-customizations` com o JWT do médico, a mesma rota do iOS.

---

## 1. A regra da reconciliação

`apps/web/src/lib/deterministic/organs/` tem **18 arquivos, ~180 KB** de texto
clínico próprio: obstétrica, mamária, pelve, tireoide, morfológico, vias
urinárias, próstata, MSK, partes moles, abdome, baço, fígado, pâncreas, rim,
vesícula, vias biliares, cervical. É uma **terceira cópia** da redação clínica —
a do renderer canônico, a do catálogo, e esta.

Ao comparar tireoide, as duas implementações revelaram regras **espelhadas**:

| | web | canônico |
|---|---|---|
| volume | **calcula** `a×b×c×0,52` | *"NUNCA calcule"* — vem ditado |
| TI-RADS / Domingos | *"NUNCA calculados"* — médico seleciona | **calcula** dos eixos |
| título | `ULTRASSONOGRAFIA DE TIREOIDE` | `...DA TIREOIDE` |
| com Doppler | `COM DOPPLER` | `COM DOPPLER COLORIDO` |

Cada regra trancada proíbe exatamente o que a outra faz. Mas a divergência não é
toda do mesmo tipo, e tratá-la como se fosse levaria à decisão errada:

> ### 🔑 A regra
>
> **TEXTO CLÍNICO: o canônico ganha, sempre.** Uma fonte só. "DE" × "DA",
> "COM DOPPLER" × "COM DOPPLER COLORIDO" — isso é divergência a eliminar.
>
> **CÁLCULO: depende do canal de entrada, e divergir é CORRETO.**
> No app o médico **dita**; três eixos ditados podem ser mal ouvidos, e um volume
> calculado de um número errado é apresentado como fato. Por isso o canônico não
> calcula: ele usa o que recebe.
> No web o médico **digita** nos campos. O dado é confiável, e o web **pode e
> deve** calcular e mostrar — decisão do Luiz, 20/08.

**O mecanismo já suporta isso sem conflito.** O web calcula o volume dos eixos
digitados e envia `volume_ml` em `dados`; o renderer canônico recebe um volume
que não calculou — exatamente o que a regra dele manda. Zero atrito.

**Uma exceção dentro da exceção:** a **classificação clínica** (TI-RADS, BI-RADS,
O-RADS, escore de Domingos) sai do `/render`, nunca do navegador. Calculá-la nos
dois lados criaria duas autoridades sobre o mesmo laudo, e um dia a tela diria um
número e o laudo, outro. Cálculo puro (volume, IG, peso fetal) pode ser
client-side; **classificação, não**.

---

## 2. O que já existe e funciona

### 2.1 O catálogo canônico

Modelo normal derivado dos renderers de produção, **13 categorias × 2 estilos**.
`apps/api/src/server/renderer/catalog/`.

### 2.2 As alterações — o que se clica para sair do normal

`renderer/catalog/alteracoes/`. **Escreve-se o CENÁRIO, nunca a frase:**

```ts
AlteracaoSpec = id clínico + nome + patch estruturado + grupo de conflito + estilos?
```

A frase, a conclusão e a classificação continuam saindo do renderer. Digitar
redação num spec seria a quarta cópia do texto clínico.

| categoria | cenários | o que provou |
|---|---|---|
| TIREOIDE | 8 | escore de Domingos → **TI-RADS** calculado |
| MAMARIA | 9 | outra classificação → **BI-RADS** calculado |
| PELVE_FEMININA | 14 | **variedade**: achado em 3 lugares, FIGO, O-RADS, lados independentes |

Gate: `renderer/__tests__/alteracoes.manual.ts` — **163/163**.

**Faltam 10 categorias.** Expandir é curadoria de cenários, não infraestrutura
nova. Por uso em 90 dias: DOPPLER_OBSTETRICO (348), MORFOLOGICO (269),
CERVICAL (63), PROSTATA (47), VIAS_URINARIAS (41). OBSTETRICA (696) já tem 18
achados pelo catálogo escrito, por outro mecanismo.

### 2.3 As rotas do catálogo

```
GET  /api/catalog/[category]?estilo=   modelo, cenários, projeção e alterações
POST /api/catalog/[category]/render    { estilo, alteracoes[], dados } → laudo
```

O `/render` é o coração: **a tela manda os ids e o que o médico digitou; o
RENDERER recompõe**. `dados` entra por último e vence os números do cenário —
eles existem para o renderer ter o que calcular, não para aparecerem no laudo de
alguém. Combinação impossível responde **409** com os conflitos nomeados.

Auth de sistema (`CATALOG_SERVICE_TOKEN`, tempo constante, fail-closed 503).
Gate: `catalog-api/contrato.manual.ts` — **37/37**.

> ⚠️ **Decisão pendente:** o `apps/web` tem o JWT do médico. As rotas podem
> passar a aceitar autenticação de usuário em vez do token de sistema — ou
> manter as duas. O token nasceu de uma premissa errada (a de que a web não
> tinha identidade); ele continua útil, mas não é mais obrigatório.

### 2.4 A personalização

Ligada em produção para **um usuário** (`MODEL_CUSTOMIZATION_USER_IDS`), em
**CERVICAL e OBSTETRICA**. Os dois pilotos validados em 20/08.

Regra única em `customization/ativa.ts`:
```
ativa = usuário liberado && categoria liberada
        && (derivada || catálogo ligado) && caminhoDeGeracao(...) !== "writer"
```

As três operações valem nas derivadas: alterar, **acrescentar** e remover.

---

## 3. O que falta em web.laudousg.com

### 3.1 Telas — o que o Luiz pediu, verificado no código

| tela | linhas | estado | o que fazer |
|---|---|---|---|
| `/app` | 118 | hub com atalhos | **sair** — o menu (`LaudarRail`) já cobre. Cuidado: é destino pós-login |
| `/app/historico` | 48 | lista simples | **duas colunas**: lista à esquerda, visualização à direita. Já implementado em `~/laudousg/components/history/ReportDetail.tsx` — portar |
| `/app/preferencias` | 90 | só tema + iniciais no localStorage | **plano atual, o que ele inclui, botão de upgrade, e perfil: nome, CRM, e-mail (imutável)**. O `profiles` canônico já tem `crm`, `uf`, `default_writing_style_id`. Card pronto em `~/laudousg/components/settings/PlanoCard.tsx` — portar |
| `/app/analytics` | 109 | — | aproveitar a largura; grade em vez de coluna |
| `/app/seguranca` | 256 | documento legal | prosa jurídica: `max-w-4xl` está **certo**, não alargar |
| **Biblioteca** | — | **não existe** | o `LaudarRail` já reserva o slot com `soon: true` |

### 3.2 A troca do motor — ✅ FEITA na TIREOIDE (21/08)

> **Estado.** A TIREOIDE não compõe mais texto no navegador: `LaudarWebExperience`
> chama `POST /api/catalog/TIREOIDE/render` e mostra o que o renderer devolve. O
> compositor local dela **foi apagado**, não desativado.
>
> O bloqueio era o nódulo (D2): a tela pedia um GRAU de 1 a 6 e o canônico soma
> pontos dos eixos — escalas diferentes com o mesmo nome, que se invertem na
> ponta maligna. Resolvido tirando a tradução do caminho: a tela passou a
> oferecer os seis eixos com as chaves do renderer.
>
> Também entrou o controle de **volume glandular**, que faltava: a web concluía
> "volume normal" para qualquer volume digitado, inclusive um bócio.
>
> O gate `tireoide-ponta-a-ponta.manual.ts` mudou de premissa (não há mais texto
> local com que comparar) e fecha **0 pendências**.
>
> **Falta:** as demais categorias, uma por vez. `lib/deterministic` só sai quando
> a última sair.

### O desenho original

`LaudarWebExperience.tsx` (23 KB) compõe o texto localmente com
`lib/deterministic`. O alvo:

```
cliques + medidas digitadas → documento estruturado → /render → laudo
```

É o mesmo desenho que o Codex propôs para o writer, sem a IA. Ordem sugerida:

1. **Uma categoria piloto** — TIREOIDE, que já tem alterações e é a mais difícil
   (array de nódulos, classificação calculada)
2. **Prova diferencial**: o mesmo caso pelos dois caminhos, diff adjudicado
   linha a linha. Onde divergir, o canônico ganha no TEXTO; onde for cálculo,
   aplicar a regra do §1
3. Só então as demais, uma por vez
4. `lib/deterministic` sai quando a última categoria sair — não antes

**Falta um contrato:** as `lacunas` de cada `AlteracaoSpec` — quais campos a tela
deve pedir ao médico (medida, lado, localização) e com que rótulo. Hoje o
`/render` aceita `dados` livres validados pelo Zod; a tela precisa saber **o que
perguntar**.

### 3.3 Entrada pelo celular

O plano de 20/07 (`plano-evolucao-web-workspace-2026-07-20.md`) já desenha o
celular como microfone, câmera e controle remoto da sessão aberta no computador.
Existe `WorkspaceInputDock.tsx` e as flags `WEB_MOBILE_COMPANION`,
`WEB_AGENT_SUGGESTIONS`, `WEB_RICH_EDITOR`, `WEB_WORKSPACE_V2` no projeto Vercel.
**Não auditado nesta sessão.**

---

## 4. Pendências fora da web

| item | estado |
|---|---|
| **TestFlight** | funciona (build 147), mas **falta credencial de upload nesta máquina**. Gerar chave da App Store Connect API (papel App Manager), salvar o `.p8` e anotar Issuer ID + Key ID. Sem isso, cada correção de iOS exige reinstalar por cabo/rede, e o build expira em ~7 dias |
| **Frente C** (correções no laudo) | `projeto-modelos/08-correcoes-no-laudo.md`. Só a separação de cor foi feita (roxo = falta, âmbar = divergência). Falta o contrato de pendências, riscado + sugestão + botão aceitar |
| **CAS `expectedUpdatedAt`** | save×save entre aparelhos é last-write-wins. Necessário antes de liberação geral |
| **Cursor do histórico** | hoje é limite de 20 + `historico_truncado`; nenhum cliente consome a flag |
| **Painel administrativo** | `customization/painel.manual.ts` cobre o piloto. Painel só antes de abrir para mais médicos |
| **Aviso do passthrough MSK** | a tela deve dizer que "modelos pessoais não alteram laudos colados prontos" |

---

## 5. As armadilhas que custaram caro

1. **Dois sites com nome parecido.** `laudousg.com` está morto;
   `web.laudousg.com` é o que vale. Confirme o Supabase antes de trabalhar:
   o real é `yldtkqrsbgcnwlydrrot`.
2. **Um campo não pode decidir duas coisas.** Aconteceu 8×. A pior variante é
   **flag × caso**: `OBST_BIOMETRIA_DET` e `OBST_IG_SANITY` decidiam se o
   CATÁLOGO cobria o laudo, e ambas ligadas em produção o desligavam em 100% dos
   casos. A pergunta certa nunca é "a flag está ligada", é "isto muda ESTE laudo".
3. **Cor de estado com hex fixo.** Nove cores da família semântica eram hex fixo
   desenhado para o tema claro. O aviso de personalização desatualizada rodou em
   produção pela primeira vez e saiu **invisível** — branco sobre quase-branco.
4. **O cenário difere do normal SÓ naquilo de que trata.** Cravei medidas de
   ovário para ilustrar; 5,7 ml ficou abaixo do limiar de 6, e todo cenário de
   ovário saía com "volume reduzido" que ninguém pediu.
5. **`git add -A` no `~/laudousg`** arrasta ~18 arquivos untracked de outra
   frente. Adicione por caminho. (Repo morto, mas a regra vale.)

---

## 6. A mudança de domínio: `web.laudousg.com` → `laudousg.com.br`

Decidido pelo Luiz em 20/08. O domínio novo é `laudousg.com.br`, e o alvo é
mover a estação de laudos para lá. `laudousg.com` continua **morto** — a
migração não o ressuscita, e é justamente por ele estar morto que o ápice do
domínio novo pode ser o produto.

### 6.1 O que já está pronto (verificado, não presumido)

| fato | como foi verificado |
|---|---|
| `laudousg.com.br` registrado em nome do Luiz, `status: ACTIVE` | `whois laudousg.com.br` |
| já delegado à Hostinger (`helios`/`aster.dns-parking.com`) | `dig laudousg.com.br NS` |
| **nenhuma troca de nameserver é necessária** | idem — o DNS já se gerencia no painel da Hostinger |
| a API aceita qualquer origem (`Access-Control-Allow-Origin: *`) | `apps/api/src/server/cors.ts` |
| o código de auth é agnóstico de domínio (usa `window.location.origin` e o `origin` da request) | `app/auth/callback/route.ts`, `(auth)/signup`, `(auth)/forgot-password` |

### 6.2 Hostinger — os registros de DNS

Painel da Hostinger → domínio `laudousg.com.br` → **Zona DNS**. Dois registros:

**O que está lá HOJE** (conferido com `dig` em 20/08) — são registros de
estacionamento da Hostinger, e eles têm de ser **substituídos**, não acrescentados:

| tipo | nome | valor atual | o que é |
|---|---|---|---|
| `A` | `@` | `2.57.91.91` | página de estacionamento (responde 200) |
| `CNAME` | `www` | `laudousg.com.br` | aponta o www para o próprio ápice |

**O que passa a ser:**

| tipo | nome | valor | TTL |
|---|---|---|---|
| `A` | `@` | `216.198.79.1` | 300 |
| `CNAME` | `www` | `cname.vercel-dns.com` | 300 |

Estes não são valores de memória: são **os mesmos que já funcionam nesta conta**
— `laudousg.com` (ápice) resolve para `216.198.79.1` e `www.laudousg.com` é
`CNAME cname.vercel-dns.com`, ambos servidos pela Vercel hoje.

> **Edite os dois registros existentes; não crie um segundo.** Dois `A` no mesmo
> nome fazem o domínio resolver ora para a Vercel, ora para a página de
> estacionamento — intermitência é o pior modo de falhar, porque parece
> "funcionou para mim".

TTL 300 durante a migração; suba depois de estabilizar.

### 6.3 Vercel — projeto `laudousg-web`

Settings → Domains:

1. **Adicionar `laudousg.com.br`** e marcar como **Primary Domain** (é ele que
   passa a aparecer na barra e nos links canônicos).
2. **Adicionar `www.laudousg.com.br`** com **Redirect to `laudousg.com.br`** (308).
3. **Manter `web.laudousg.com` no projeto**, trocado para **Redirect to
   `laudousg.com.br`** (308). Não remover: é o endereço que o Luiz já usa, que
   está em favoritos e no histórico dos navegadores. Um domínio removido dá
   `DEPLOYMENT_NOT_FOUND`; um redirecionado leva o médico ao lugar certo.

Prazo para aposentar `web.laudousg.com`: no mínimo até o Luiz confirmar que
ninguém mais chega por ele.

### 6.4 O que quebra em silêncio se for esquecido

Esta é a parte que não aparece no painel de DNS.

**1. Supabase — allowlist de redirect (o que mais quebra).**
Projeto `yldtkqrsbgcnwlydrrot` → Authentication → URL Configuration:

- **Site URL:** `https://laudousg.com.br`
- **Redirect URLs:** acrescentar `https://laudousg.com.br/**` **e manter**
  `https://web.laudousg.com/**` enquanto o redirect existir.

O código monta `emailRedirectTo` a partir de `window.location.origin`, mas quem
valida é o Supabase. Fora da allowlist ele **não dá erro** — troca silenciosamente
pela Site URL. O sintoma é confirmação de cadastro e recuperação de senha
levando ao domínio errado, e é fácil culpar o DNS por isso.

**2. As URLs cravadas no código.** Dez arquivos do `apps/web` escrevem
`laudousg.com` — o domínio MORTO — inclusive o `metadataBase`, o `canonical` e o
Open Graph do `app/layout.tsx`. Ou seja: **hoje o web já anuncia ao Google um
site que não existe mais.** A migração é a hora de corrigir para
`laudousg.com.br`:

```
app/layout.tsx            metadataBase, alternates.canonical, openGraph.url,
                          twitter, softwareAppSchema.url, organizationSchema.url+logo
app/precos/layout.tsx     canonical + OG
app/privacy/page.tsx      canonical + corpo
app/terms/page.tsx        canonical + corpo
app/app/seguranca/page.tsx
app/excluir-conta/page.tsx  (cita `web.laudousg.com` no corpo)
```

**3. AbacatePay.** Conferir no painel as URLs de retorno de checkout e o webhook
(`/api/webhooks/abacate`). Se apontarem para `web.laudousg.com`, continuam
funcionando pelo redirect — mas um POST de webhook seguindo 308 é frágil.
Apontar direto para o domínio novo.

### 6.5 A ordem, para não ficar fora do ar

1. Vercel: adicionar os dois domínios novos (fica pendente de verificação)
2. Hostinger: criar `A @` e `CNAME www` — a Vercel verifica e emite o TLS
3. Supabase: acrescentar as Redirect URLs **antes** de virar o Primary
4. Vercel: marcar `laudousg.com.br` como Primary
5. Deploy do `apps/web` com as URLs do §6.4-2 corrigidas
6. Só então: `web.laudousg.com` → Redirect

Os passos 1-3 não tiram nada do ar; a virada acontece no 4.
