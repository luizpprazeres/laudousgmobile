# LaudoUSG — Backend Mobile (monorepo)

Monorepo que serve **(1) o backend Next.js + packages compartilhados** (consumidos pelo app iOS Swift **e** pelo app Android RN) **e (2) o app Android React Native/Expo** (`apps/mobile`), que está **ATIVO** e em preparação para a Play Store.

> **Origem / correção (2026-07-04):** este repo nasceu como app RN/Expo + backend. Houve uma fase em que o app RN foi congelado em favor do app iOS nativo SwiftUI (em [`~/laudousg-swift/`](../laudousg-swift)). **Mas o app Android RN foi RETOMADO** — hoje é o app Android oficial (Expo 52, RN 0.76.9), em desenvolvimento ativo (paridade com o iOS) e prestes a lançar na Play Store. O README anterior dizia que `apps/mobile` estava congelado — isso está **desatualizado**.
>
> **Android Studio / emular:** o projeto nativo Android fica em **`apps/mobile/android/`** (Gradle — abrir esta pasta no Android Studio). O fluxo recomendado com Expo é `cd apps/mobile && npx expo run:android` (compila o `android/` e instala no device/emulador). Planos: `docs/plano-paridade-android-swift.md` (paridade RN↔Swift) + `docs/plano-android-playstore.md` (publicação) + `docs/parity/` (briefing/auditoria).

---

## O que VIVE aqui hoje

| Pasta | Status | Descrição |
|---|---|---|
| `apps/api/` | 🟢 **VIVO em prod** | Backend Next.js 15. Deploy: `https://laudousgmobile.vercel.app`. Endpoints consumidos pelo app iOS Swift. |
| `packages/db/` | 🟢 Vivo | Drizzle ORM schema + migrations. Usado **só** pelo `apps/api`. |
| `packages/shared/` | 🟢 Vivo | Zod schemas + tipos. Usado por `apps/api` e por `apps/mobile`. |
| `_extraction/from-laudousg-original/` | 📚 Referência | Prompts canônicos, modelos por categoria, regras clínicas, few-shots — extraídos do `laudousg.com`. Não mexer sem revisão. |
| `apps/mobile/` | 🟢 **ATIVO** (Android) | App **Android** React Native/Expo (Expo 52, RN 0.76.9). Retomado; app Android oficial em paridade com o iOS, prestes a lançar na Play Store. Nativo Android em `apps/mobile/android/` (Android Studio). Consome o mesmo backend `apps/api`. |

---

## Relação com outros repos

```
~/laudousg/              → Web em PROD (laudousg.com). NÃO MEXER. Independente.
~/laudousg-swift/        → App iOS nativo (SwiftUI). Consome este backend.
~/laudousgmobile-def/    ← VOCÊ ESTÁ AQUI (backend Next.js + packages)
```

### Quem consome o backend daqui (`apps/api/`)?
- **App iOS Swift** (`~/laudousg-swift/`) — endpoints `/api/generate`, `/api/transcribe`, `/api/reports/[id]`, `/api/me/*`, `/api/sala/*`

### Quem NÃO consome?
- A web `laudousg.com` (em `~/laudousg/`) tem backend próprio, independente

---

## Stack do que está vivo

- **Backend:** Next.js 15 App Router, runtime `nodejs`, streaming SSE
- **DB / Auth:** Supabase (Postgres + RLS + pgvector + Auth)
- **ORM:** Drizzle (schema TS, migrations geradas)
- **IA:** OpenAI (gpt-4.1-mini writer/structurer, Groq llama-3.3-70b fallback, Whisper-1 transcrição)
- **Monorepo:** pnpm workspaces + Turborepo
- **Hosting:** Vercel (config em `vercel.json` — `buildCommand: pnpm --filter @laudousg/api build`)

---

## Estrutura

```
.
├── apps/
│   ├── api/        🟢 Next.js — VIVO em prod
│   ├── mobile/     🟢 Expo — app Android ATIVO
│   └── lab/        🟢 Bancada interna (lab.laudousg.com)
├── packages/
│   ├── shared/     🟢 Zod schemas + tipos
│   └── db/         🟢 Drizzle schema + migrations
├── _extraction/    📚 Referência clínica canônica
├── scripts/        Utilitários (golden-validation, etc)
├── vercel.json     Config Vercel
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Setup local (só pra desenvolver `apps/api`)

```bash
# 1. Dependências
pnpm install

# 2. Env (copie de .env.example e preencha)
cp .env.example .env
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
# OPENAI_API_KEY, LLM_API_KEY (Groq), DATABASE_URL

# 3. DB (Drizzle → Supabase) — só se precisar gerar migration nova
pnpm db:generate
pnpm db:migrate

# 4. Dev
pnpm api:dev    # http://localhost:3000

# 5. Typecheck + build (validação antes de PR)
pnpm -F api typecheck
pnpm -F api build
```

> **App Android (RN/Expo):** `cd apps/mobile && npx expo run:android` (dev build no device/emulador) ou abrir `apps/mobile/android/` no Android Studio. `pnpm mobile:dev` inicia o Metro. É desenvolvimento **ativo** — ver `docs/plano-paridade-android-swift.md`.

---

## Pipeline de geração (resumo, vive em `apps/api`)

1. **Structurer** — gpt-4.1-mini com Structured Outputs strict → `StructuredFindings`
2. **Deterministic validator** — TS puro: medidas, unidades, lateralidade, datas, comandos
3. **Retriever (RAG)** — pgvector HNSW + filtros (categoria, estilo, status, prioridade)
4. **Writer** — gpt-4.1-mini streaming → laudo final
5. **Sanity check** — síncrono, **zero IA** (rodado no client iOS via `SanityChecker.swift`)

> **Decisão trancada:** sanity check NUNCA usa LLM. Determinístico ou nada.

**Precedência (no prompt):** comandos explícitos > achados estruturados > validações > prompt global > contrato categoria > estilo > RAG > exemplos.

---

## Modelo de laudo — catálogo e Biblioteca

O laudo obstétrico é montado a partir de um **catálogo**: as frases vivem como
dado (`renderer/catalog/`), não literais no código. As demais categorias têm o
**modelo derivado** do próprio renderer — não há cópia do texto clínico.

**Ligado em produção (19/08):** `MODEL_CATALOG_CATEGORIES=OBSTETRICA`. Rollback
é remover a variável.

### O que isso corrigiu

| Defeito | Onde estava |
|---|---|
| Feto em óbito saía com *"Batimentos cardíacos ritmados"* | renderer clássico ignorava `bcf_alteracao` — **1 laudo real afetado**, `08f9b6a4` de 18/08 |
| Conclusão gemelar não dizia de qual feto | `instance` existia no segmento e a serialização o descartava |
| *"O cordão umbilical tem aspecto normal"* em 100% dos laudos | `!== null` num campo que chega **ausente** — `undefined !== null` é `true` |
| Embrião × feto errado entre 10s0d e 13s6d | um flag decidia o modelo **e** a palavra |
| Patologias nunca extraídas | 8 dos 10 campos não existiam no contrato de extração |
| Biblioteca só mostrava obstétrica | categoria cravada nos três apps |

### As armadilhas que já custaram caro

1. **Campo AUSENTE ≠ campo NULO.** Em predicado de slot condicional use
   `!= null`. A matriz sintética não pega — o feto-base dela crava tudo como
   `null`. Só `equivalencia-real` pega.
2. **Um campo não pode decidir duas coisas.** Aconteceu 6×: método × classe do
   líquido, topografia × relação da placenta, modelo × substantivo do embrião,
   medida × anormalidade da pielectasia. Achado patológico vira **slot próprio
   condicional**.
3. **Nunca mexer no `OBSTETRICA_JSON_SCHEMA`** sem prompt e consumidor na mesma
   leva — é o contrato vivo da extração, e o `DOPPLER_OBSTETRICO` herda.
4. **`CodingKeys` em snake_case no Swift** briga com o `convertFromSnakeCase` do
   `APIClient` e o decode lança em silêncio. Custou dois deploys.
5. **Verde na matriz não é verde no que você escreveu** — ela fixa os campos
   patológicos em `null`.

### Os gates

```bash
cd apps/api

# equivalência sintética: o catálogo é byte-idêntico ao renderer clássico
pnpm exec tsx src/server/renderer/__tests__/catalog-equivalence.manual.ts

# o que a Biblioteca desenha, por categoria e cenário
pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/modelo-projetado.manual.ts

# o contrato de extração cobre o que o renderer consome
pnpm exec tsx src/server/renderer/__tests__/contrato-extracao-obstetrica.manual.ts

# O GATE QUE MAIS PEGA DEFEITO — catálogo × laudos que a produção gerou.
# EXIGE as flags de produção no comando; sem elas a comparação vira ruído.
OBST_BIOMETRIA_DET=true IG_REFERENCE_CORRECTION=true \
FLEXIBLE_CONCLUSION=true GRANNUM_PLACENTA=true \
  pnpm exec tsx --env-file=../../.env src/server/customization/equivalencia-real.manual.ts
```

> ⚠️ Depois do flip, `equivalencia-real` só compara o **cohort pré-flag** — os
> laudos que a produção montou com o renderer clássico. Ele avisa quando esse
> cohort encolhe; quando chegar a zero, deixa de medir qualquer coisa.

### Personalização — AINDA DESLIGADA

A Biblioteca já **mostra** o modelo em todas as categorias; o que ainda não vale
em laudo nenhum é a redação que o médico publica. `MODEL_CUSTOMIZATION_CATEGORIES`
não existe em produção (default `""` = desligada).

Ligar exige **duas** variáveis, e as duas são fail-closed:

| Variável | O que faz |
|---|---|
| `MODEL_CUSTOMIZATION_CATEGORIES` | quais categorias aceitam personalização |
| `MODEL_CUSTOMIZATION_USER_IDS` | **quais médicos** — vazio é ninguém |

A segunda existe porque *categoria não é canário de usuário*: sem ela, ligar a
categoria valeria para todo médico que já tivesse publicado nela.

**Uma regra só decide se vale** (`server/customization/ativa.ts`), e é a mesma
na tela e no gerador:

```
ativa = usuário liberado && categoria liberada
        && (derivada || catálogo ligado)
        && a categoria não é escrita pelo writer
```

A última perna existe porque o caminho do writer (MSK, PARTES_MOLES, PELVE,
DOPPLER venoso/renal) devolve o texto e **retorna antes** da camada que aplica a
redação do médico. Sem ela, a Biblioteca prometia o que a geração ignorava.
Publicar (não salvar rascunho) responde **403** para quem está fora da
allowlist: uma publicação gravada hoje passaria a valer sozinha no dia em que a
flag mudasse.

As travas, todas com gate:

- **tudo ou nada** — cinco frases publicadas e duas que não casam mais devolvem
  `null`, e o laudo sai inteiro no padrão. Meia personalização é um híbrido que
  o médico nunca revisou.
- **impressão digital do modelo derivado** — o derivado nasce do renderer e
  ficava eternamente em `versao: 0`. Agora a `versao` é o hash de *cenário +
  seção + ids na ordem*, em todos os cenários: linha nova, irmã reescrita ou
  troca de ordem ⇒ republicar.
- **âncora que a própria alteração remove** — `insert_phrase_after` num slot que
  o mesmo conjunto remove passava na validação e sumia em silêncio.
- **fallback em três degraus** — `catálogo + personalização → catálogo-base →
  renderer clássico`. Cair direto no clássico perdia os achados que motivaram o
  catálogo (óbito fetal, ventriculomegalia, hidropsia). Quando a redação é
  descartada, vai um aviso ao médico (evento do stream + `metadata`), **fora do
  texto copiável**.
- **variante de achado só é reescrevível se declarar o termo** que tem de
  sobreviver (`termosObrigatorios`), e a frase não pode NEGÁ-LO — "sem
  ventriculomegalia" conservava a palavra e invertia o diagnóstico. As demais
  ficam travadas até serem liberadas uma a uma.
- **publish e restore com `FOR UPDATE`** — entre ler o rascunho e promovê-lo,
  um PUT de outro aparelho reescrevia `operations` mantendo `status = 'draft'`.
  Em `restaurar()` era pior: o UPDATE ia só por id, e uma publicação simultânea
  fazia a restauração **reescrever a versão publicada** — o histórico, que nunca
  deve ser reescrito, era reescrito.
- **os slots vêm de TODOS os cenários** — a Biblioteca desenha um cenário por
  aba, e os slots vinham só do padrão: no morfológico, 37 linhas do 2º trimestre
  e 35 do 3º apareciam editáveis e eram recusadas com "slot inexistente" ao
  salvar. A *ordem* continua a do cenário padrão — os extras existem para serem
  ancoráveis, não para entrarem no documento.
- **histórico paginado** (20 por vez, nada apagado). O rascunho e o publicado
  são buscados por status, então um histórico longo nunca os empurra para fora.
- **auditoria dos dois caminhos** — `onModelo` não era chamado nas 12 categorias
  derivadas: o laudo saía personalizado sem registro de qual modelo o assinou.

```bash
cd apps/api
# o gate que autoriza ligar
pnpm exec tsx --env-file=../../.env src/server/customization/personalizacao-ponta-a-ponta.manual.ts
# o caminho até o laudo, contra o banco — rodar NOS DOIS estados de flag
pnpm exec tsx --env-file=../../.env src/server/customization/resolve.manual.ts
MODEL_CATALOG_CATEGORIES=OBSTETRICA MODEL_CUSTOMIZATION_CATEGORIES=OBSTETRICA \
  pnpm exec tsx --env-file=../../.env src/server/customization/resolve.manual.ts
```

O aviso chega ao médico pelo card **"N pontos a revisar"** — a única superfície
que iOS, Android e web já desenham. São três códigos:
`personalizacao_descartada` (fallback), `personalizacao_desatualizada` (o
modelo-base mudou) e `personalizacao_indisponivel` (erro/sem modelo).
`inativa` e `sem_publicacao` seguem silenciosos: são o estado normal de quem
não personalizou nada.

### O rollout — TRÊS deploys, nunca um

Revisão adversarial do Codex, 19/08. Misturar o catálogo com a personalização
no mesmo deploy destrói a capacidade de saber qual mudança causou um problema.

> ⚠️ `MODEL_CATALOG_CATEGORIES=OBSTETRICA` está **configurada e não valendo**: a
> variável foi criada depois do último deploy, e na Vercel a env entra no
> build. O catálogo obstétrico ainda não montou nenhum laudo real.

| Deploy | Flags | O que provar |
|---|---|---|
| **A** | catálogo só | 5 casos obstétricos: padrão, inicial 7 sem (embrião), inicial 11 sem (feto), gemelar, patológico |
| **B** | `+ MODEL_CUSTOMIZATION_CATEGORIES=CERVICAL` `+ MODEL_CUSTOMIZATION_USER_IDS=<Luiz>` | rascunho não muda laudo · publicar muda só a linha escolhida · exame alterado não recebe a frase normal · despublicar volta byte a byte |
| **C** | `+ OBSTETRICA` na personalização | padrão, inicial, gemelar e patológico com UMA frase normal personalizada |

**`model_catalog_id` não prova que o catálogo montou o laudo** — o fallback
clássico passa pelo mesmo callback de auditoria. Quem prova é
`system_message_full`, que registra o degrau (`modelo: catálogo` ×
`modelo: catálogo-base` × `modelo: clássico`).

```bash
# o que está publicado, se a versão-base ainda bate, e o degrau dos últimos laudos
pnpm exec tsx --env-file=../../.env src/server/customization/painel.manual.ts
```

> O painel lê o banco corretamente, mas avalia a regra de ativação com o `.env`
> da SUA máquina — ele não prova quais flags estão rodando em produção. Essa
> prova é gerar um laudo e olhar a auditoria.

### Biblioteca

13 categorias, com técnica, corpo e conclusão. O médico reescreve a redação; os
invariantes protegem o laudo: slot que não sai (`removivel`), dado que não some
(`placeholdersObrigatorios` / lacuna), frase obrigatória (`obrigatorio`).

**Dormente:** `MODEL_CUSTOMIZATION_CATEGORIES` está vazia — nenhuma
personalização muda laudo ainda. A Biblioteca **não aparece no Android**: o
componente existe, mas nenhuma tela o abre.

---

## Qualidade & aprendizado contínuo

- **`docs/aprendizado-correcoes-luiz.md`** — corpus vivo ("memória infinita") do que a IA
  erra e o Dr. Luiz corrige à mão, extraído do diff `generated_output` (saída da IA) →
  `final_output` (versão salva após correção). Ranking dos defeitos + biblioteca de frases
  canônicas. Atualizar re-rodando a mineração; consultado pela automação do boletim.
- **`docs/plano-acao-boletins-2026-06-29.md`** — plano de ação consolidado dos boletins.
- **`docs/boletim-diario-prompt.md`** — prompt da automação diária de qualidade. Analisa
  `generated_output` (= saída real da IA, pós-guards). **Não** trocar para `final_output`
  (essa é a versão já corrigida pelo médico).

> Semântica das colunas: `generated_output` = saída da IA; `final_output` = correção manual
> do médico (só gravada quando ele edita). Hoje só 1 usuário salva `final_output`.

## Segurança / LGPD

- Chaves de IA (OpenAI, Groq) **apenas server-side**
- App iOS usa só `SUPABASE_ANON_KEY` + `BACKEND_URL` público
- RLS em todas as tabelas de usuário
- `knowledge_blocks` legível por authenticated, gravável só por admin
- Backend valida JWT Supabase em todo handler (`verifyJwt`)
- Service role só em endpoints específicos (ex: `DELETE /api/me/delete-account` chama `auth.admin.deleteUser`)
- **Não armazenar** dados sensíveis de paciente (nome, CPF, RG) — proibido por design
- **Não armazenar** imagens (JPEG/PNG de ultrassom)

---

## Backlog de limpeza (futuro, não urgente)

- [ ] Renomear pasta local pra `laudousg-backend` (manter repo GitHub como `laudousgmobile` por causa do Vercel git-link)
- [ ] Atualizar referências em `~/laudousg-swift/CLAUDE.md` + `ARCHITECTURE.md` pro novo path

> O item "deletar `apps/mobile/`" saiu do backlog: o app Android foi retomado e
> está ativo.

Plano completo em `~/laudousg-swift/CLAUDE.md` (seção "Relação entre repos").
