# Plano — Nova versão WEB (laudousg web v2)

> **Status:** 🟢 EM EXECUÇÃO (iniciado 2026-06-19). Plano re-legível: ao retomar,
> leia o **Quadro de sprints** abaixo — o primeiro sem ✅ é o próximo trabalho.
> Cada sprint é autossuficiente (objetivo + arquivos + critério + onde buscar).
> **Você é o chefe (Fable). Pode delegar código denso ao dex1/dex2 via medmaestri.**

---
## ⏯️ ESTADO ATUAL (2026-06-20) — LER PRIMEIRO AO RETOMAR
**Branch web:** `web-v2` (não mexer no main com coisa de web). **Engine:** `main` (prod).

**FEITO e no ar (web.laudousg.com):**
- **S0–S7 ✅:** scaffold, landing, AbacatePay, /precos, auth, checkout/webhook, gerador determinístico.
  **12 categorias** determinísticas + calculadoras (TI-RADS/BI-RADS/O-RADS/FIGO + "Extrair dos achados")
  + **fundação de IG** (`lib/ig/computeIG`, golden 9/9).
- **S9 ✅ (completo):** persistência (tabela `web_reports` no Supabase, RLS *_own) + `/app/historico`
  (web+IA unificado, selo de origem) + `/app/preferencias` (tema claro/escuro + iniciais) + `/app`
  dashboard (hub + últimos laudos). Status de salvamento agora é REAL.
- **Boletim da engine (prod) ✅ ENCERRADO:** todos os P0/riscos clínicos corrigidos (vazamento de
  comando, falso oligoâmnio MBV↔ILA, brain sparing, placeholders, imperativo, IG duplicada Doppler,
  gemelar alucinado). Ver memória `boletim-engine-p0`.

**PRÓXIMO (quando retomar):**
- **S8** (adiado pelo Luiz): gerador com IA + ditado Deepgram + editor B/I/U + **export DOCX**.
  *Os "botões inertes" do /critique (B/I/U, Refazer-IA, pills) ganham função aqui.* Sugestão: começar
  pela fatia isolada de **export DOCX** (radiologista tirar o laudo pro PACS/RIS).
- **Polish visual** (adiado no /critique): contraste gray-on-color (9×), dark-mode no GERADOR
  (/app/gerar segue claro), empty/error states. Rodar `/critique` de novo depois (nota atual 23/40).
- **Validação do Luiz:** logar no site e confirmar salvar→histórico ponta a ponta.
- **Boletim operacional** (não-clínico): geração duplicada, MORFOLÓGICO 39,5s, DOPPLER >13s.
- Restam S10 (iOS sem IAP), S11 (cutover laudousg.com), S12 (polish final).

**Pendências manuais já documentadas:** Supabase redirect URLs (S4) + registrar webhook AbacatePay (S5).
---

## Objetivo
Tirar do papel a **nova web** (`laudousg web`): geração de laudos **determinística
(sem IA, por formulário)** E **com IA**, reusando o engine já existente. Deploy
temporário em **web.laudousg.com**; depois trocar pelo domínio oficial
(laudousg.com) e desativar a web antiga. **Meta final:** alinhar tudo para
**resubmeter o app iOS na App Store SEM compras in-app** — as assinaturas passam a
ser **externas, feitas na web** (compliance Apple).

## Repos e ativos — ONDE ESTÁ CADA COISA
| O quê | Caminho | Papel |
|---|---|---|
| **Monorepo (ESTE)** | `~/laudousgmobile-def` | `apps/api` (engine, prod), `apps/lab` (admin), `apps/mobile` (RN, congelado). **`apps/web` = A CRIAR.** |
| **iOS oficial** | `~/laudousg-swift/LaudoUSG` | Swift. Resubmeter sem IAP (S9, dex1). |
| **Web ORIGINAL (read-only)** | `~/laudousg` | Next 15. **Fonte da landing/UX** — copiar, NÃO tocar (prod em laudousg.com). |
| **Blueprint SEM-IA** | `~/laudousgmobile-def/docs/catalogo-clinico-exames.md` | Cada estrutura/achado = **campo de formulário** do modo determinístico. |
| **Engine de geração** | `apps/api` → `POST /api/generate` (SSE) | Reusável 100%. Renderers em `apps/api/src/server/renderer/categories/*`. |
| **Categorias supported renderer** | `apps/api/src/server/renderer/extraction.ts` (`RENDERER_SUPPORTED_CATEGORIES`, `RENDERER_PROGRAMMATIC_CATEGORIES`) | Quais geram sem IA. |
| **Landing original** | `~/laudousg/app/page.tsx` + `~/laudousg/components/landing/*` (Hero, MobileFirst, VetoresHowItWorks, SalaEquipe, Esquemas, ComOuSemIA, Stores, Pricing, Reveal) | Copiar (a home é IGUAL). |
| **Assets da landing** | `~/laudousg/public/brand/*` (hero-loop-v2.webm/mp4, sala-preview.png, app-preview.png, processo.mp4…) | Copiar p/ `apps/web/public/brand/`. |
| **Pricing original** | `~/laudousg/app/planos/page.tsx` (Stripe — REFAZER com AbacatePay) | Referência de estrutura. |
| **Gerador original (UX)** | `~/laudousg/app/app/generate/page.tsx` | Referência: picker de categoria, voz (Deepgram)/texto/imagem, editor, painéis extras (IG/BI-RADS/Doppler). |
| **Auth/DB** | Supabase (`packages/db/src/schema/profiles.ts` tem `plan` free/pro; `subscriptions.ts` = Apple IAP). | Auth pronto; billing web é NOVO. |
| **Estilos de escrita** | 4 UUIDs (ver `apps/lab/src/app/api/testbench/run/route.ts`): Clássico `1111...`, Direto/Objetivo curto `2222...`, Protocolar `3333...`, Objetivo `4444...`. | A web expõe os 2 reais (Clássico + Objetivo). |

## Referências externas
- **UX de categorias (como deve funcionar):** `https://app-nreport.ionic.health`
  (login `luizp02121@gmail.com` / `03729667lp`). Formulário estruturado por exame
  → monta o laudo. **Re-inspecionar no S5** (via browser/maestri-portal — WebFetch
  não loga). Nossa fonte de campos é o `catalogo-clinico-exames.md`.
- **AbacatePay** (pagamento BR, PIX + cartão, assinatura recorrente):
  docs em `docs.abacatepay.com`. Páginas a consultar no S2: `pages/reference/introduction`
  (base URL + auth Bearer), `pages/products/create` (campo `cycle`: WEEKLY/MONTHLY/
  QUARTERLY/SEMIANNUALLY/ANNUALLY), `pages/subscriptions/create` (checkout recorrente,
  retorna `url`), `pages/webhooks/events/subscriptions`, `pages/devmode`. Também o
  OpenAPI (`openapi.yaml`). **Chave dev:** `abc_dev_xtwK0mJh2DbmqtU0bMuJXZEb`
  (criar produtos/planos do ZERO).

## Decisões (fechadas)
1. **`apps/web`** = novo Next.js 15 (App Router) no monorepo, mesmo stack do original
   (Tailwind + Framer Motion + Lucide + Supabase SSR). Consome o engine via `/api/generate`.
2. **2 modos de geração:**
   - **Determinístico (sem IA):** formulário por categoria (campos do
     `catalogo-clinico-exames.md`) → monta `StructuredFindings` em código → chama o
     **renderer** (sem LLM) → laudo. UX estilo nReport.
   - **Com IA:** texto/voz → `/api/generate` (structurer/writer/renderer) como o iOS.
3. **Pagamento = AbacatePay** (não Stripe). Estrutura de planos (decisão Luiz 2026-06-19):
   - **Free (trial)**: 10 laudos vitalício — porta de entrada, sem cobrança.
   - **Essencial R$ 99,00/mês** (paga via AbacatePay).
   - **Profissional R$ 169,90/mês** (paga via AbacatePay).
   Os 2 pagos são criados do ZERO na AbacatePay via API. O Free é só controle de
   limite no `profiles.plan` (sem checkout).
4. **Assinatura EXTERNA** (Apple): iOS perde o IAP; ganha "assine na web". A web
   atualiza `profiles.plan`; o app lê o plano no JWT.
5. **Landing = cópia** da atual (mesma). **Pricing = página dedicada e destacada.**
6. **Deploy:** novo projeto Vercel → `web.laudousg.com` → depois `laudousg.com` +
   desativar a antiga.

## Arquitetura (alvo)
```
apps/web (Next 15)
 ├─ /                → landing (cópia de ~/laudousg)
 ├─ /precos          → pricing destacado (2 planos) + checkout AbacatePay
 ├─ /login /signup   → Supabase auth (SSR)
 ├─ /app             → área logada
 │   └─ /app/gerar   → 2 modos:
 │        determinístico: <FormCategoria> (catálogo) → buildFindings() → /api/generate (renderer)
 │        IA: texto/voz → /api/generate (writer)
 ├─ /api/checkout    → cria assinatura AbacatePay (retorna url)
 ├─ /api/webhooks/abacate → confirma pagamento → atualiza profiles.plan
 └─ consome: Supabase (auth/DB) + apps/api /api/generate (engine)
```

---

## QUADRO DE SPRINTS (~30 min cada) — o 1º sem ✅ é o próximo

| # | Sprint | Status |
|---|---|---|
| S0 | **Scaffold** `apps/web` (Next 15 + Tailwind + Supabase SSR) + projeto Vercel + subdomínio `web.laudousg.com` (skeleton no ar) | ✅ |
| S1 | **Landing**: portar `~/laudousg` (page.tsx + components/landing/* + public/brand/*) p/ `apps/web`; ajustar imports; deploy | ✅ |
| S2 | **AbacatePay setup**: ler docs concretos + criar os 2 produtos/planos via API (Essencial 99 / Profissional 169,90); guardar IDs em env | ✅ |
| S3 | **Página /precos**: 2 planos destacados + specs (refaz a estrutura do `/planos` original) + botão "assinar" | ✅ |
| S4 | **Auth**: `/login` `/signup` `/forgot` (Supabase SSR) ligados aos `profiles` existentes | ✅ |
| S5 | **Checkout + webhook**: `/api/checkout` (AbacatePay subscription → url) + `/api/webhooks/abacate` → atualiza `profiles.plan`; tela de sucesso | ✅ |
| S6 | **Gerador determinístico — piloto**: `/app/gerar` (Abdome Total + Tireoide). | ✅ |
| S7 | **Expandir categorias determinísticas**: 12 categorias no ar + calculadoras + fundação de IG | ✅ |
| S8 | **Gerador com IA**: input texto + voz (Deepgram) → `/api/generate`; editor do laudo + export DOCX | ⬜ **(ADIADO — próximo)** |
| S9 | **Conta**: `/app` dashboard + histórico (web+IA) + preferências (tema + iniciais) + persistência (`web_reports`) | ✅ |
| S10 | **iOS (dex1)**: remover IAP do app Swift; tela "assine na web"; ler `plan` do JWT; preparar build de resubmissão | ⬜ |
| S11 | **Cutover**: apontar `laudousg.com` p/ a web nova; desativar a antiga; redirecionar | ⬜ |
| S12 | **/critique + /design-taste-frontend polish** final; QA; review dex1/dex2 | ⬜ |

> **Notas de execução por sprint** (objetivo, arquivos-alvo, critério de aceite, onde
> buscar) serão detalhadas À MEDIDA que cada uma começa — para não inchar o plano. O
> essencial (paths, decisões, referências) já está acima e é suficiente para retomar.

### S2 — AbacatePay setup ✅ (2026-06-19)
- **API:** base `https://api.abacatepay.com/v2`, auth `Authorization: Bearer <key>`, resposta
  `{data, success, error}` (checar `success` antes de `data`). Preços em **centavos**.
- **Fluxo de assinatura:**
  - `POST /products/create` com `cycle: MONTHLY` cria o plano recorrente (campos req:
    externalId, name, price, currency=BRL; opcionais: description, cycle, trialDays 1-90).
  - `POST /subscriptions/create` com `items:[{id:prod_..., quantity:1}]` + `completionUrl`/
    `returnUrl` → retorna `data.url` (checkout) e `data.status` (PENDING→PAID). `methods`
    default `["CARD"]` (assinatura só CARD). (usar no S5)
  - **Webhooks** (S5): `subscription.completed` + `subscription.renewed` = pago (status PAID);
    `subscription.trial_started`; `subscription.cancelled` = cancelado. Payload v2:
    `{id, event, apiVersion, data:{subscription, customer, payment, checkout}}`. **Secret do
    webhook:** definido ao registrar a URL no painel (mecanismo a confirmar no S5).
- **Planos criados (modo DEV, ACTIVE, cycle MONTHLY):**
  - **Essencial** R$99,00 (9900¢) → `prod_LEWS1ptgTPRL3LSJqwzUWcT1` (externalId `plano-essencial-mensal`)
  - **Profissional** R$169,90 (16990¢) → `prod_S1M5s2XPr12WPWpUfCdHkdFM` (externalId `plano-profissional-mensal`)
- **Env:** IDs no `apps/web/.env.example` (não-segredo) + `ABACATEPAY_API_KEY` (dev, encrypted),
  `ABACATEPAY_PRODUCT_ESSENCIAL`, `ABACATEPAY_PRODUCT_PROFISSIONAL` no Vercel `laudousg-web`
  (prod/preview/dev). **No cutover:** trocar p/ chave de PROD e **recriar os 2 produtos**
  (os IDs mudam) → atualizar as env vars.

### S3 — Página /precos + legais ✅ (2026-06-19)
- **`/precos`** (`app/precos/page.tsx`+`layout.tsx`): adaptado do `/planos` original.
  Free + **Essencial R$99,00** + **Profissional R$169,90** (mensal apenas), tabela
  comparativa, FAQ (AbacatePay/PIX+cartão). Botão assinar → `/signup?plan=<plan>&redirect=/precos`
  (o **checkout AbacatePay real é o S5** — ligar `/api/checkout` a partir do `SubscribeButton`).
  Removido: toggle anual + lógica Stripe (`/api/billing/*`) do original.
- **`/privacy` + `/terms`** (LGPD; shell `components/legal/LegalPage.tsx`). Contato
  `contato@laudousg.com`. ⚠️ Conteúdo é um ponto de partida — convém revisão jurídica antes do
  lançamento oficial.
- **Landing `Pricing.tsx`:** preços→99,00/169,90, **removido toggle anual** (AbacatePay só tem
  MONTHLY — mostrar anual seria inventar plano inexistente), links `/planos`→`/precos`.
  Removido link `/blog` (nav+rodapé). Rodapé `/privacy` `/terms` agora resolvem.
- Build verde; deploy prod (commit 68cb4dd). Verificado em prod: `/` `/precos` `/privacy`
  `/terms` = 200.
- **404s restantes** (próximos sprints): `/signup` `/login` (S4), `/app` (S9). `/blog` não
  será portado (links removidos).

### S4 — Auth (Supabase SSR) ✅ (2026-06-19)
- Portado de `~/laudousg/app/(auth)/*`: `/login`, `/signup`, `/forgot-password` + `(auth)/layout`
  (noindex). **Email/senha apenas** — Google OAuth REMOVIDO (settings do projeto:
  `google:false`; manter botão seria quebrado).
- `/auth/callback` (exchangeCodeForSession; sem o fetch de welcome do original),
  `/auth/update-password` (reset), `/auth/signout` (POST → signOut → /).
- `/app`: **stub autenticado** (server component lê `profiles.plan`, mostra email+plano+logout).
  Área logada completa fica p/ S8/S9.
- **Middleware** (`lib/supabase/middleware.ts`): protege `/app` (→ `/login?redirect=`),
  e redireciona logado para fora de `/login`/`/signup`.
- **DB (projeto `yldtkqrsbgcnwlydrrot`):** `profiles` com `plan`; trigger `on_auth_user_created`
  cria profile no signup (verificado: novo user → profile `plan=free`).
- **Login verificado E2E** (admin API: criar user → password grant retorna token → trigger ok →
  cleanup). `/app` sem sessão → 307 `/login`. Commit 4f3f6d2; deploy prod OK.
- **⚠️ CONFIG MANUAL PENDENTE (Supabase dashboard, projeto `yldtkqrsbgcnwlydrrot`):** como
  `mailer_autoconfirm=false` (confirmação de e-mail obrigatória) e não há PAT p/ Management API,
  o Luiz precisa em **Authentication → URL Configuration → Redirect URLs** ADICIONAR
  `https://web.laudousg.com/**` (não mexer no Site URL p/ não afetar o app mobile). Sem isso:
  **login com senha funciona**, mas o **link de confirmação do signup** e o **reset de senha**
  não voltam para a web. Google OAuth: opcional, exigiria habilitar o provider + credenciais.

### S5 — Checkout + webhook AbacatePay ✅ (2026-06-19)
- **Mapa de planos** (`lib/abacatepay.ts`): web → enum `profile_plan`:
  **essencial → `pro`** (prod_LEWS1ptgTPRL3LSJqwzUWcT1), **profissional → `clinic`**
  (prod_S1M5s2XPr12WPWpUfCdHkdFM), free → `free`. (Enum do projeto é free/pro/clinic — o app
  mobile já entende; **confirmar com Luiz se a correspondência pro/clinic está correta**.)
- **`POST /api/checkout`**: exige sessão (401 anônimo) → AbacatePay `subscriptions/create`
  (items, methods CARD, `externalId=user.id`, `metadata{userId,email,plan}`,
  completionUrl `/app?assinatura=sucesso`, returnUrl `/precos`) → retorna `url`.
- **`POST /api/webhooks/abacate`**: valida `?webhookSecret` (secret na URL). `completed`/
  `renewed` → seta plan (metadata.plan, fallback product id); `cancelled` → `free`;
  trial/outros → ignora. Atualiza `profiles.plan` via **service role** (`lib/supabase/admin.ts`).
- `/precos` `SubscribeButton`: chama `/api/checkout`; 401 → `/signup?plan=X&redirect=/precos`;
  senão redireciona à URL de pagamento.
- **Envs (Vercel):** `SUPABASE_SERVICE_ROLE_KEY` + `ABACATEPAY_WEBHOOK_SECRET` (encrypted).
- **Verificado E2E:** checkout 401 sem auth; webhook 401 sem/secret errado; `subscriptions/create`
  retorna URL real (`app.abacatepay.com/pay/bill_...`); webhook completed(essencial)→`pro`,
  completed(profissional)→`clinic`, cancelled→`free`. Commit 95c647f; deploy prod OK.
- **⚠️ AÇÃO MANUAL PENDENTE (Luiz):** registrar a URL do webhook no painel AbacatePay (dev):
  `https://web.laudousg.com/api/webhooks/abacate?webhookSecret=<secret>` (secret no sticky note
  e nas env vars). Eventos: subscription.completed/renewed/cancelled. Sem isso, o pagamento
  acontece mas o `profiles.plan` não atualiza automaticamente.

### S6 — Gerador determinístico ✅ (2026-06-19)
- **DESCOBERTA-CHAVE (correção do plano):** o `~/laudousg` JÁ TEM um motor determinístico
  validado e **100% client-side, sem IA e sem API** — `lib/deterministic/` (`composeReport`,
  `composeTireoide`, organs) + UI `components/laudar/` (`LaudarWebExperience`). NÃO foi preciso
  criar `/api/render` nem `buildFindings` do zero (ideias descartadas). Cada órgão é um
  `OrganModule` { schema (campos UI) + compose(state) → frase clínica }.
- **Portado** para `apps/web/src` (cópia limpa, self-contained): `lib/deterministic/*` (11 arq.)
  + `components/laudar/*` (6). `/app/gerar` (server, protegido por auth) monta
  `<LaudarWebExperience />` (seletor Abdome Total / Tireoide). Link no `/app`.
- **Verificado:** `composeReport(abdomeTotal, …)` e `composeTireoide(…)` geram laudo completo
  (TÍTULO/COMENTÁRIOS/ASPECTOS/CONCLUSÃO) — testado via tsx. Build verde; `/app/gerar` 307→login
  sem sessão. Commit 6170e2d; deploy prod OK.
- **Stubs visuais herdados** (não funcionais ainda, faltam sprints): pills "Cálculos", "Ditar",
  "Imagem", "Múltiplos", "Gerar com IA" e o avatar "Helena Almeida" (placeholder). Limpar/ligar
  depois (IA = S8).
- **Pendente:** teste visual/interação logado (precisa de browser+login — o Luiz pode validar).

### S7 — Expandир categorias: PRÓSTATA ✅ (2026-06-19, 1ª entrega)
- **`organs/prostataSuprapubica.ts`**: bexiga (achados + volume pré + resíduo) · próstata
  (3 medidas, peso elipsoide D1×D2×D3×0,5233×1,05 só com 3≥1cm, IPP graduado, calcificações) ·
  vesículas seminais (sempre normais). Fiel ao renderer `categories/PROSTATA_SUPRAPUBICA.ts`.
- **Engine multi-categoria:** `ExamCategory` ganhou `conclusionClosing` + `footer`; `compose.ts`
  generalizado (abdome preservado); `index.ts` tem `GENERIC_CATEGORIES`/`CATEGORIES`;
  `LaudarWebExperience` lê o registro (N categorias + tireoide), estado por categoria.
  **Adicionar categoria nova = só criar o módulo + registrar em GENERIC_CATEGORIES.**
- **Fix reusável:** `OrganFormPanel` agora renderiza `subFields` em campos `segmented`
  (antes só checklist) — necessário p/ IPP e resíduo-valor; vale p/ futuras categorias.
- **Review Dex1 (fidelidade) + Dex2 (adversarial)** → corrigido: subFields no segmented,
  parseCm com unidades (cm/mm), peso sem parênteses duplos, vesículas sempre normais.
  (Mantido por decisão: bexiga com opções fixas (form ≠ LLM); numeração "1." (estilo da web).)
- Verificado via tsx; build verde; deploy prod (commits 5de555a, 6425157).

### S7 — VIAS URINÁRIAS ✅ (2026-06-19, 2ª entrega)
- **`organs/viasUrinarias.ts`**: rim D/E (dimensão, situação/rotação, DRC, hidronefrose grau 1/2/3,
  achados focais INCORPORADOS na frase — litíase→cálices, cisto→terço, nódulo, ectasia, cisto
  complexo "de aspecto inespecífico", múltiplos com ";"; alteração difusa texto livre; medidas
  L×AP×T + espessura), ureteres (dilatação), bexiga (parede/conteúdo/volume/resíduo).
  Fiel ao renderer clássico + golden (frase normal e litíase batem 1:1).
- `compose.ts`: pula bodies vazios (ureteres normal). `parseCmAware` converte mm→cm nas medidas.
- **Review Dex** → corrigido: mm→cm, alteração difusa, bexiga não avaliada suprime volume/resíduo.
- **Divergência consciente (pendente de curadoria):** conclusão POR RIM ("Rim direito ecograficamente
  normal." ×2) em vez do combinado "Rins ecograficamente normais." e DRC bilateral único — o engine
  genérico não cruza seções; exigiria refator p/ seção única "Rins". Conteúdo clínico fiel.
- Verificado via tsx; build verde; deploy prod (commits 9e92f86, cd3a7b4).
- **No ar:** seletor de `/app/gerar` = Abdome Total · Próstata · Vias Urinárias · Tireoide.

### S7 — MAMÁRIA + PELVE ✅ (2026-06-20, 3ª e 4ª entregas)
- **MAMÁRIA** (`organs/mamaria.ts`): seção única "Mamas" (BI-RADS calculável, ditado vence,
  maior vence — todos do maior rank rotulados). Cobre normal, cisto simples/múltiplos, nódulo
  sólido (forma/margem/orientação/posterior→BI-RADS 3/4A/4B/4C/5), calcificações, axilas.
  Review Dex → corrigido: empate rotula todos, defaults do nódulo, BI-RADS maiúsculo.
  Futuro: microcistos/cisto complicado/ginecomastia/próteses/correlação/agregação bilateral.
- **PELVE FEMININA** (`organs/pelveFeminina.ts`, via TA+TV): bexiga, útero (volume elipsoide
  0,523, mioma+FIGO, miomatoso, adenomiose), endométrio (frase ciclo/menopausa/reposição, DIU),
  ovário D/E (volume, cisto simples/complexo/endometrioma/funcional/SOP, atrófico, não-vis).
  Review Dex → corrigido: miomatoso×mioma, adenomiose no corpo. Futuro: volume ditado, múltiplos
  miomas, O-RADS, variantes endométrio, acessórios (istmocele/Naboth/líquido livre), ovários
  combinados, ordem miométrio pós-endométrio, outras vias (tv/ta/pós-aborto — exigem título dinâmico).
- **No ar:** `/app/gerar` = Abdome Total · Próstata · Vias Urinárias · Mamária · Pelve · Tireoide.
- Commits: mamária e044c0f/ (fix) ; pelve 261ffb0/3fb7012.

### S7 — ABDOME SUPERIOR + CERVICAL + PARTES MOLES ✅ (2026-06-20, 5ª–7ª entregas)
- **ABDOME SUPERIOR** (`organs/abdomeSuperior.ts`): reusa figado/vesicula/viasBiliares/
  pancreas/baco (abdome menos rins). Falta aorta/veia cava (consistente com a web abdome).
- **CERVICAL** (`organs/cervical.ts`): níveis de Robbins — normal (frase única) + 1 linfonodo
  alterado (nível/medidas/forma/hilo/vasc) + conclusão suspeito/reacional. Futuro: doppler toggle
  (título dinâmico), múltiplos nós, glândulas salivares/tireoide.
- **PARTES MOLES** (`organs/partesMoles.ts`): 1 lesão (nódulo/lipoma/cisto/coleção/linfonodo/
  corpo estranho/hérnia) com eixos descritivos + conclusão por tipo. Futuro: múltiplas lesões,
  refino descritivo (doppler lipoma, contornos cisto/coleção, default localização).
- Commits: 5db7a66 (abdome sup+cervical), 7249a1f (partes moles + fix técnica).
- **`/app/gerar` no ar com 9 categorias:** Abdome Total · Abdome Superior · Próstata · Vias
  Urinárias · Mamária · Pelve · Cervical · Partes Moles · Tireoide.

**Restam (as complexas/sensíveis):** OBSTÉTRICA + MORFOLÓGICO (biometria fetal + idade
gestacional — ver épico-ig-deterministica / [[epico-ig-deterministica]]) e MUSCULOESQUELÉTICO
(doutrina MSK / [[doutrina-msk]]). Tratar com cuidado/curadoria dedicada (não "grosso" cego).

### S7 — Expandir categorias determinísticas (MÉTODO acordado)
Para cada categoria nova: criar `OrganModule` (schema + compose) no padrão validado, com
**fontes de verdade**: (a) renderers em `apps/api/src/server/renderer/` (frases canônicas) +
(b) `docs/catalogo-clinico-exames.md` (estruturas/achados/defaults). Curadoria com ultrathink +
**review Dex1 (fidelidade) + Dex2 (adversarial)**. Entregar 1–2 categorias por vez, já curadas,
para o Luiz validar. Candidatas (renderers prontos): VIAS_URINARIAS, PROSTATA_SUPRAPUBICA,
MAMARIA, PELVE_FEMININA, CERVICAL, PARTES_MOLES, ABDOMEN_SUPERIOR, OBSTETRICA, MORFOLOGICO, MSK_V2.

### Rodada de UX/refino (2026-06-20) — pedidos do Luiz
- ✅ **Repetições removidas** (todas categorias): sidebar sem header de categoria/"modo auxiliar";
  middle sem repetir categoria/órgão; coluna de órgãos 220→196px.
- ✅ **COMENTÁRIOS:** quebra de linha (igual aos demais cabeçalhos), em todas as categorias.
- ✅ **Vias urinárias:** "Debris"→"Ecos (Debris)"; volume pré-miccional = campo `volume`
  reutilizável (digita direto OU 3 medidas + botão calcular, elipsoide).
- ✅ **Mama:** "Axilas" separada de "Mamas" (seções distintas).
- ✅ **Tireoide:** toggle "avaliar linfonodos cervicais" (opcional); seção "Parênquima" com
  tireoidites (Hashimoto/linfocítica/granulomatosa/Riedel → achados+conclusão); referência do
  pico sistólico no Doppler. (Frases de tireoidite = padrão radiologia, p/ curadoria do Luiz.)
- ✅ **Calculadoras:** seção "Cálculos" por categoria + `CalcPanel` interativo; scripts do app
  portados (tiRads/biRads/oRads). **TI-RADS** (tireoide), **BI-RADS** (mama), **O-RADS + FIGO**
  (pelve) — chips→resultado+copiar. **"Extrair dos achados"** implementado (mecanismo `CalcSpec.extract`)
  com BI-RADS←nódulo da mama funcional. Pendente fino: extract p/ TI-RADS/O-RADS (o form do órgão
  captura menos features que a calc) + pelve controles (via/menopausa) já entregues.
- ✅ **Pelve:** controles de categoria (via TA/TV/ambos → título/técnica dinâmicos, TV sem bexiga;
  checkbox Menopausa global → ovários atróficos + endométrio menopausa); ordem útero→…→bexiga.

## Riscos / armadilhas
- **NÃO tocar** em `~/laudousg` (prod read-only) — só copiar para `apps/web`.
- **Apple compliance:** o app iOS resubmetido NÃO pode ter compra in-app nem botão
  que leve a pagamento externo de forma proibida — seguir as regras (link permitido
  vs proibido). Validar antes de submeter.
- **AbacatePay dev key** (`abc_dev_…`) é de TESTE — criar produtos no modo dev,
  trocar p/ chave de produção no cutover.
- **Engine compartilhado:** a web usa o MESMO `/api/generate` do iOS — não quebrar o
  contrato existente (os deploys recentes de IG/PELVE/sanitizer estão em prod).
- **Determinístico na web:** o `buildFindings()` (form → StructuredFindings) é código
  NOVO; o catálogo é a fonte. Validar o JSON contra o schema da categoria.

## Notas de execução

### S0 — Scaffold ✅ (2026-06-19)
- **`apps/web`** criado: Next 15.5.18 + React 18.3.1 (alinhado ao monorepo /
  `node-linker=hoisted`), Tailwind 3.4.17, Supabase SSR (`@supabase/ssr`).
  Autossuficiente: **sem deps `workspace:*`** (consome o engine por HTTP).
- Arquivos-chave: `src/app/{layout,page,globals.css}`, `src/lib/supabase/{client,server,middleware}.ts`,
  `src/middleware.ts` (refresh de sessão), `tailwind.config.ts` (mínimo — design-tokens
  completos só no S1), `vercel.json` (framework nextjs; **necessário** p/ não cair no
  fallback do `vercel.json` da raiz que builda `@laudousg/api`).
- **Build local verde** (typecheck + `next build`).
- **Git:** branch **`web-v2`** (commits 85e368e scaffold, 7669d96 vercel.json). Push em
  `origin/web-v2`. **Não** mexer em `main`.
- **Vercel:** projeto **`laudousg-web`** (`prj_5etqM0uBJEoEb5yVLJAKOgAXzALC`, team
  PrazeresApp), git-connected ao repo `luizpprazeres/laudousgmobile`, **Root Directory
  `apps/web`**. Envs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (projeto Supabase `yldtkqrsbgcnwlydrrot`) setadas em prod/preview/dev.
  - `productionBranch` ainda é `main` (default). Deploy de prod do S0 foi disparado
    via API a partir de `web-v2` (target=production). **Skeleton no ar:**
    `https://laudousg-web.vercel.app` (HTTP 200). Para os próximos sprints: ou setar
    `productionBranch=web-v2`, ou promover o preview de `web-v2` a prod por sprint.
- **DNS ✅ (2026-06-19):** `web.laudousg.com` resolvendo (`A web → 76.76.21.21` na
  **Hostinger** — DNS de laudousg.com é Hostinger: NS `*.dns-parking.com`, SOA `dns.hostinger.com`).
  Vercel `misconfigured:false`, `verified:true`, cert Let's Encrypt emitido. **Landing no ar
  em https://web.laudousg.com (HTTP 200).**

### S1 — Landing ✅ (2026-06-19)
- Landing portada de `~/laudousg` para `apps/web/src` (estrutura `src/`, imports `@/`
  preservados). Inventário via Explore (a landing é **puramente apresentacional** — sem
  Stripe/Sentry/Supabase/server calls; compatível com React 18).
- **Portados:** `lib/design-tokens.ts`, `tailwind.config.ts` (globs→`src/`, import ajustado),
  fonts Inter+Barlow (`next/font`), 8 componentes `components/landing/*` (Hero está inline
  no `page.tsx`: RecordingTranscript/CtaPill/StatsBar/DiffCard/nav adaptativo), `page.tsx`,
  `LaudoUSGLogo`, `ThemeProvider` (next-themes), `JsonLd`, `globals.css`.
- **layout enxuto e fiel:** dropados PWA/push/toast/`@vercel/analytics`/service-worker
  (fora do escopo do S1; re-adicionar se necessário depois).
- **tsconfig:** `noUncheckedIndexedAccess: false` no `apps/web` (a landing veio 1:1 de um
  projeto que não usa essa flag; o resto do monorepo mantém a flag).
- **Build verde** (typecheck + `next build`; home `/` ~167 kB First Load).
- **Deploy prod** a partir de `web-v2` (commit 2da5652): **landing no ar** em
  `https://laudousg-web.vercel.app` (HTTP 200; todos os 12 assets `/brand/*` + mama/payway/
  icon servem 200; fonts Inter/Barlow carregadas).
- **404s de rota** (a landing linka, mas as páginas não existem ainda):
  - planejados: `/signup` `/login` (S4 auth), `/planos` + `/precos` (S3 pricing).
  - **não estavam no mapa** (rodapé) — DECIDIR onde criar: `/blog` `/privacy` `/terms`.
    No original existem; aqui ficam 404 até serem criados/portados.
- **Review (processo validado): Dex1 fidelidade = landing FIEL** (nenhum componente/token/
  asset faltando; as 3 "DIVERGE" no layout.tsx são intencionais: preços JSON-LD dos planos
  novos + remoção do manifest PWA). **Dex2 adversarial = SEM BLOQUEIOS críticos** (assets
  todos 200; useTheme OK; só os 404 de rota acima + `new Date().getFullYear()` no rodapé,
  risco baixo, mantido por fidelidade).
- **Nota técnica:** o bridge do `medmaestri ask` em background não captura o texto do Dex
  (output 0 bytes); extrair via `medmaestri check "<Dex>"` + filtro de escapes ANSI
  (perl `s/\e\[[0-9;?]*[a-zA-Z]//g` etc.). Para o futuro, considerar pedir ao Dex p/ gravar
  em arquivo no repo em vez de responder na tela.

## Histórico
- 2026-06-19: plano criado após exploração (web app inexistente, catálogo é o
  blueprint, landing/UX no original, AbacatePay para pagamento). Ver memória
  [[arquitetura-ux-modelo]].
- 2026-06-19: S0 concluído (scaffold + Vercel `laudousg-web` no ar; DNS de
  `web.laudousg.com` pendente — ação manual do Luiz). Ver [[plano-web-v2]].
