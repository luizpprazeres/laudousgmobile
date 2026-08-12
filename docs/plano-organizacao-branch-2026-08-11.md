# Colocar ordem na casa — as 225 mudanças da branch de trabalho

Mapa das frentes acumuladas em `feat/model-resolver-hard-mode` e a ordem para
levá-las à `main` aos poucos, em blocos revisáveis.

Levantado em 11/08/2026. Convenção: **[F]** fato verificado por comando ·
**[I]** inferência · **[?]** não confirmado.

---

## 1. O achado que muda o plano

```
merge-base   e7d4087  19/06/2026
origin/main  86c399a  28/07/2026   ← 96 commits que a branch NÃO tem
branch HEAD  ecda08f  11/08/2026   ← 225 commits que a main não tem
```

**[F] A branch está 225 à frente E 96 ATRÁS.** Ela nunca trouxe a `main` de volta
desde 19/06. Nesses 96 commits a `main` recebeu **ports cirúrgicos de quase tudo
que a branch fez no servidor** — com hashes diferentes.

**[F] `git diff origin/main HEAD` tem 648 arquivos, dezenas deles remoções.** Um
merge da branch **apagaria features que estão em produção agora**:

| Sumiria da produção | O que é |
|---|---|
| `api/edit/route.ts` | edição incremental, `EDIT_INCREMENTAL=true` em prod |
| `pipeline/pelveWriter*.ts` | piloto PELVE writer_guarded |
| `pipeline/mskWriter*.ts` (4 arquivos) | MSK writer_guarded |
| `pipeline/partesMolesWriter*.ts` | PARTES_MOLES writer_guarded |
| `pipeline/dopplerRenalWriter*.ts`, `dopplerVenosoMmiiWriter*.ts` | eixo vascular |
| `categories/CERVICOMETRIA.ts` | categoria em produção |
| `categories/DOPPLER_OBSTETRICO.ts` | renderer em produção |
| `categories/golfBall.ts`, `biometriaFetal.ts` | gaps de auditoria em produção |
| `pipeline/dumFormatGuard.ts` | guard de forma DUM/IG (28/07) |
| ~30 `__tests__/*.manual.ts` | a rede de golden tests |

E dentro de `generate/route.ts` a branch remove o dedup de conclusão e o
fallback `WRITER_V2_ABDOME_USER_ID` — que está ligado em produção.

> ## Regra número um
> **Nunca `git merge feat/model-resolver-hard-mode` na `main`.**
> O caminho é port por frente, sempre a partir de `origin/main`, em worktree
> limpo. É o padrão que já funcionou três vezes: `71ae79e`, `45c939a`, `4a5465c`
> — e agora no port da personalização.

---

## 2. As 13 frentes

| # | Frente | Commits | Toca geração? | Flag nova? | Migration? | Estado |
|---|---|---|---|---|---|---|
| 1 | Web v2 determinística | 40 | não | não | — | **~95% já na main**; sobram 2 commits |
| 2 | Android/RN paridade iOS | 45 | não | não | — | completa, 100% fora |
| 3 | Writer V2 | 26 | sim | — | — | ✅ **já na main** |
| 4 | Projeto modelos / personalização | 25 | sim | 2 | 0022, 0023 | ✅ **portada em 11/08** |
| 5 | Lab / cockpit | 5 | indireto | não | usa 0023 | pela metade |
| 6 | Cartografia venosa 4 vistas | 19 | não | — | — | backend na main; engine + RN fora |
| 7 | ASR / transcrição | 12 | sim | não | — | parcialmente na main |
| 8 | Guards de writer / hard mode | 10 | sim | — | — | 3 commits fora |
| 9 | Writer hardening + blocos condicionais | 10 | sim | `WRITER_HARDENING` | — | pronto, desligado |
| 10 | Conteúdo / snippets (9 categorias) | 6 | sim | **não** | — | completa · ⚠ ver §4 |
| 11 | Edição incremental | 5 | sim | — | — | ✅ **já na main** |
| 12 | Engine quick-wins | 2 | sim | — | — | ✅ **já na main** |
| 13 | Órfãos (docs, chore) | 22 | 5 já na main | — | — | — |

**[F] Só 3 variáveis de ambiente são realmente novas** contra a `main`:
`WRITER_HARDENING`, `MODEL_CATALOG_CATEGORIES`, `MODEL_CUSTOMIZATION_CATEGORIES`.
Todas com default seguro. As outras 11 que aparecem no diff já estão lá.

**[F] Só 2 migrations novas**: `0022` e `0023` — ambas já aplicadas em 11/08.

---

## 3. Dependências

```
[4] projeto modelos ────┬──> [5] Lab: /modelos
    (portada 11/08)     └──> [5] Lab: procedência  (cega sem o onFindings)

[9] WRITER_HARDENING ───────> [5] Lab: /prompts
    conditionalBlocks.ts ───> (admin/prompt-preview importa os dois)

[6] packages/schemes ───────> [2] Android: render venoso 4 vistas
```

**[F] A dependência crítica é `[9] → [5]`**: `admin/prompt-preview/route.ts`
importa `WRITER_HARDENING_BLOCK` e `conditionalBlocks`. **O Lab não compila sem
a frente 9** — foi por isso que essa rota ficou de fora do port da personalização.

As frentes **1, 2, 6, 7 e 10 são independentes** entre si.

---

## 3.1 Estado em 12/08/2026 — 8 dos 10 blocos na main

| # | Frente | Estado |
|---|---|---|
| 13 | docs/chore | ✅ 56 documentos |
| 1 | web workspace | ✅ 8 arquivos |
| 7 | ASR | ✅ **muda transcrição** (77 % → 94 %) |
| 6 | packages/schemes | ✅ inerte |
| 2 | Android | ✅ 87 arquivos, 9 deps novas |
| 9a | `WRITER_HARDENING` | ✅ inerte (flag OFF) |
| 5 | Lab | ✅ + correção do `modoDe()` |
| 8 | guards — *parte* | ✅ só o `discarded`, com duas correções |
| 10 | snippets | ⏳ precisa de janela |
| 9b | `conditionalBlocks` | ⏳ risco desproporcional |

`origin/main` = `98b70a8`. Blocos 3, 11 e 12 saíram da fila: já estavam na main.

### O que o bloco 8 ensinou

Portei o `discarded` (laudo que falha deixa de virar rascunho eterno) e
deployei. A revisão adversarial encontrou **depois** dois defeitos, ambos
piores que o problema resolvido:

1. **cancelar virava descartar** — a classificação era pelo NOME do erro, e o
   abort real às vezes sobe como `DOMException` ou `TypeError: terminated`.
   Isso matava a retomada do laudo. Corrigido: decide pelo `signal.aborted`;
2. **laudo já entregue podia ser rebaixado** — o esquema venoso roda depois do
   `done` sem try/catch próprio, então uma falha dele alcançava o catch e
   descartava um texto que o médico já tinha na tela. Corrigido com a trava
   `laudoEntregue`.

Nenhum dos dois foi pego por typecheck, build, quatro suítes de teste ou pela
inspeção dirigida — todos verificavam o que eu havia pensado.

**Regra que sai daqui: nada que toque `generate/route.ts` vai para a main sem
leitura adversarial ANTES do deploy.**

Os outros dois commits do bloco 8 (orçamento de tokens, `finish_reason`) **não
devem ser portados como estão** — o Codex analisou e cada um carrega dependência
ou falha própria. Ver §4.1.

## 4. Ordem recomendada

| Ordem | Frente | Por quê aqui |
|---|---|---|
| **1** | 13 — docs/chore (17 commits) | risco zero; limpa o histórico |
| **2** | 1 — web workspace (2 commits) | 10 arquivos, app que não é o do médico |
| **3** | 7 — ASR | isolado em `server/asr/`; tem harness de benchmark próprio |
| **4** | 6 — `packages/schemes` | o servidor não executa esse código; não muda texto de laudo |
| **5** | 2 — Android (45 commits) | maior volume, menor risco clínico; 3–4 blocos |
| **6** | 9a — `WRITER_HARDENING` | flag default OFF, com teste; entra inerte e destrava o Lab |
| **7** | 5 — Lab | ferramenta interna, sem usuário final; só depois de 6 |
| **8** | 8 — guards de writer | muda prod sem flag, **mas na direção certa**: hoje um laudo truncado é salvo como sucesso |
| **9** | 10 — snippets | ⚠ **liga 9 categorias em produção pelo próprio push** (§4.1) |
| **10** | 9b — `conditionalBlocks` | refatora mecanismo que está no ar; ganho arquitetural, não clínico |
| — | 3, 11, 12 | **nada a fazer** — já estão na `main` |

### 4.1 O risco não óbvio da frente 10

**[F]** `api/admin/github-webhook/route.ts` observa `packages/knowledge/snippets/`
e dispara **re-ingest automático no Supabase a cada push**. Levar essa frente
**liga 9 categorias em produção sozinha** — sem variável de ambiente, sem deploy,
sem gate.

É a única frente do lote que muda produção por efeito colateral de `git push`.
Precisa de janela combinada e plano de rollback (reverter `published`).

---

## 4.2 Um bug a corrigir ANTES de portar o Lab

**[F] Achado em 11/08, medindo a produção.** A dissecação por procedência do
Lab (`apps/lab/src/lib/procedencia/index.ts`) decide o caminho assim:

```ts
export function modoDe(modelWriter: string | null): ModoProcedencia {
  return modelWriter === "renderer/v1" ? "renderer" : "writer";
}
```

`model_writer` **nunca** vale `"renderer/v1"` — essa coluna guarda o modelo de
IA (`gpt-4.1-mini`, `gpt-5.4-mini`) mesmo quando o laudo é montado em código. O
caminho está na `system_message_full`, que começa com `[renderer/v1] render
programático determinístico (...)`.

Medido em 443 laudos obstétricos da auditoria: **300 são do renderer**, e a
função classificaria os 443 como writer. A tela mostraria o rótulo errado —
"o LLM redigiu" onde é template — em três de cada quatro laudos.

O mesmo erro estava na primeira versão de
`customization/equivalencia-real.manual.ts` e foi corrigido lá: o filtro certo é
`system_message_full.startsWith("[renderer/")`. **Corrigir `modoDe()` antes de o
Lab ir para a main.**

## 5. O que fazer antes de tudo

**[F] Passo 0, inegociável:** antes de qualquer novo port, trazer `origin/main`
para a branch — ou trabalhar sempre em worktrees limpos a partir dela.

Sem isso, todo PR gerado da branch carrega as remoções da §1. Vai gerar conflito
real em `route.ts`, `renderer.ts`, `buildSystemMessage.ts` e nos contracts. É
melhor pagar esse custo uma vez, de propósito, do que descobri-lo dentro de um PR
de feature — foi exatamente o que aconteceu no port da personalização, onde a
`main` tinha evoluído o obstétrico com golf ball, sanity de IG e biometria
determinística que a branch não conhecia.

---

## 5.1 Dívidas descobertas no caminho (nenhuma urgente)

| # | Dívida | Onde |
|---|---|---|
| D1 | O **structurer** roda 100 % em `gpt-4.1-mini` — o writer migrou para `gpt-5.4-mini` em 22/07, ele não. Inclusive na extração do renderer, que é obrigatória | `env.ts:12` |
| D2 | O histórico do Android mostra `discarded` como **"Draft"** — o banco melhorou, a tela não | `apps/mobile/app/historico.tsx:566` |
| D3 | As fotos de onboarding foram redistribuídas num repositório **público**; licença de uso no app ≠ licença de redistribuição | `apps/mobile/assets/onboarding/` |
| D4 | `apps/mobile/package-lock.json` (npm) versionado ao lado do `pnpm-lock.yaml` — os dois podem resolver versões diferentes e ninguém percebe até o build quebrar | — |
| D5 | `db:migrate` nunca listou as migrations **0018–0021**; um ambiente novo não fica completo só com ele | `packages/db/src/migrate.ts` |

## 6. Incertezas

1. **[?] `d2de896`** (`parseProductId` dos Product IDs do ASC) — não determinado
   se já está na `main`.
2. **[?] Quanto do Passo 0 é conflito textual** e quanto o git resolve sozinho.
   Os arquivos que divergem são conhecidos (`renderer.ts` +97/−298,
   `route.ts` +122/−35, `MUSCULOESQUELETICO.ts` +24/−324,
   `PELVE_FEMININA.ts` +9/−162, `OBSTETRICA.ts` +34/−124), mas o merge não foi
   tentado.
3. **[?] Se `371a249`** (`published` das 9 categorias) libera sozinho, ou se ainda
   depende de `RENDERER_CATEGORIES` / linha no Supabase.
4. **[?] Se há trabalho de iOS** correspondente no repo Swift (separado) sem port.
5. **[?] Se o port do Android exige bump de dependências** que afete o build da
   API no mesmo monorepo (`pnpm-lock.yaml` aparece no delta).
