# Preflight da publicação web — 2026-09-14

Auditoria somente leitura, feita no papel de DevOps. Nesta rodada não houve deploy, push,
commit, `git add`, checkout, reset, instalação nem mudança de configuração. O único arquivo
escrito foi este.

## 1. Veredito

**Não publique com push para `main`.** Hoje isso derruba a versão da API usada pelo app iOS
que está em revisão (§3.1).

Caminho recomendado:

1. Commit só do web num branch, a partir do worktree isolado.
2. `vercel deploy --prod` do projeto `laudousg-web`, rodado a partir de um worktree **limpo**
   criado desse commit.
3. Push só do branch. `main` fica parado até a API/IAP (`97b2be8`) entrar junto.

## 2. Projeto e domínio corretos

| Item | Evidência | Valor |
|---|---|---|
| Conta CLI | `vercel whoami` (CLI 53.2.0) | `contato-9443`, team `prazeresapp` |
| Projeto web | `apps/web/.vercel/project.json` e `vercel project inspect laudousg-web` | `laudousg-web` (`prj_5etqM0uBJEoEb5yVLJAKOgAXzALC`) |
| Root Directory | API `/v9/projects/laudousg-web` | `apps/web`, Next.js, Node 24.x, comandos padrão |
| Config no repo | `apps/web/vercel.json` | só `framework: nextjs` |
| Git link | API do projeto | `luizpprazeres/laudousgmobile`, productionBranch `main`, sem Ignored Build Step |
| Domínios de produção | `/v9/projects/laudousg-web/domains` | `www.laudousg.com.br` é o principal. `laudousg.com.br` e `web.laudousg.com` redirecionam para ele |
| Produção atual do web | `/v6/deployments?app=laudousg-web` | `laudousg-nk2ib60qa`, source `git`, `dff9060`, 2026-09-02 |

**O domínio `laudousg.com` NÃO é deste projeto.** `laudousg.com` e `www.laudousg.com` estão no
projeto `laudousg`, ligado a outro repositório (`luizpprazeres/Projeto-laudare`). O doc
`docs/plano-web-workspace-2026-08-20.md:223,244` registra esse domínio como morto. A verificação
pós-deploy deve usar `https://www.laudousg.com.br`.

O DNS do `.com.br` fica na Hostinger e já aponta para a Vercel: apex `216.198.79.1` e
`www` com CNAME `cname.vercel-dns.com`. O "✘" nos nameservers da Vercel é esperado com DNS
externo e não bloqueia.

Não confundir com a raiz do repositório: `.vercel/project.json` → `laudousgmobile` (API).
O `vercel.json` da raiz faz o build de `@laudousg/api`. **Rodar `vercel` na raiz do checkout def
publica a API a partir da árvore suja.**

## 3. Riscos concretos

### 3.1 Push para `main` regride a API de produção (bloqueador)

- `laudousgmobile` está ligado ao mesmo repo e branch (`main`) e não tem Ignored Build Step.
  Qualquer push para `main` refaz o build da API a partir do commit.
- A produção atual da API é `laudousgmobile-17rle442c`, de 2026-09-13T15:31Z, com
  `source: cli`, `gitCommitRef: codex/appstore-186`, `gitCommitSha: dff9060` e `gitDirty: 1`.
  Ou seja, o código publicado **não existe em `main`**.
- Esse código foi commitado depois como `97b2be8` ("preserve clinical routing and secure Apple
  subscriptions") no branch local `codex/appstore-189` (`/tmp/laudousg-release-186`). Esse branch
  **não existe no remoto**: `git ls-remote --heads` mostra só `main` = `dff9060`.
- O app iOS aponta para `https://laudousgmobile.vercel.app` (`apps/mobile/eas.json:22,36`).
  `docs/reviews/opus-release-readiness-2026-09-14.md:63-66` já avisa que um deploy fora do
  worktree de release pode quebrar o IAP durante a revisão.
- Resultado de um push web para `main`: a API volta para `dff9060` + web, sem verifier, repo e
  notificações IAP. **Regressão de IAP em produção durante a revisão da Apple.**

### 3.2 Árvore def contaminada

Fora do web, o `git status` mostra mudanças em `apps/api` (IAP, generate, health), exclusão de
`apps/api/src/server/iap/jws.ts`, `packages/db` (schema e SQL 0028–0030), `packages/shared`
(`doppler_mode`), `apps/mobile`, `.env.example` (variáveis `APPLE_*`), `package.json`
(`validate:iap`) e `pnpm-lock.yaml` (`@apple/app-store-server-library`, `jsonwebtoken`,
`jsrsasign`...). Nada disso pode ir no commit nem no upload.

### 3.3 Produção fora de sincronia com `main` depois do deploy CLI

Depois do deploy CLI, a produção do web aponta para um commit fora de `main`. O próximo push para
`main` que não contenha o commit web regride o web, e um que não contenha `97b2be8` regride a API.
O merge para `main` precisa levar os dois juntos e só pode acontecer quando a janela da Apple
permitir.

### 3.4 ESLint novo pode quebrar o `next build` na Vercel

O worktree de release adiciona `eslint@8.57.1`, `eslint-config-next@15.5.18`, `tsx@4.20.6` e
`apps/web/.eslintrc.json`. `next.config.ts` não define `eslint.ignoreDuringBuilds`. Com o ESLint
instalado, `next build` roda o lint e **falha se houver erro**. No worktree, `node_modules/.bin` não
tem `eslint` nem `tsx`: as dependências novas ainda não foram instaladas. Por isso o `.next`
existente (BUILD_ID de 14/09 19:44) não prova que o build com lint passa. O typecheck continua
desligado no build (`ignoreBuildErrors: true`).

### 3.5 Lockfile

O lock do worktree tem +2533 linhas, só de ferramentas de dev do web, e 0 ocorrências de
`app-store-server-library`. A Vercel instala com lockfile congelado. Se o lock não bater com os
`package.json` do commit, a instalação falha. Validar com `pnpm install --frozen-lockfile` no
worktree limpo antes do deploy.

### 3.6 Upload de artefatos

O deploy CLI envia o diretório local (monorepo inteiro, porque o Root Directory é `apps/web`).
O worktree atual tem `.next` e `node_modules` e está sujo (`gitDirty`). Use um worktree novo e
limpo, criado do commit.

## 4. Dependências do diff web

Comparação: `diff -rq` entre `apps/web` do def e do worktree
`~/.codex/worktrees/web-release-20260914/laudousgmobile`, sem `node_modules`/`.next`.

- **Iguais:** todos os fontes, `public/categories` (18 `.webp`), `public/fonts` (Barlow Condensed +
  OFL) e `tests/`.
- **Diferenças:**
  - `apps/web/package.json` só no worktree: script `test` e devDeps de lint/tsx.
  - `apps/web/.eslintrc.json` só no worktree.
  - `apps/web/src/lib/planos.ts` só no def: regra `clinic` + tier `essencial`, ligada a IAP.
    Ficou fora do worktree de propósito, conforme `docs/stories/2026-09-14-web-release.md`
    ("Excluir alterações IAP, planos...").

Imports, a partir das linhas adicionadas e dos arquivos novos em `apps/web/src`:

- **Workspace:** o único import de `@laudousg/shared` num arquivo alterado é
  `calcularDopplerParcial` (`fetalGrowthParaCatalogo.ts:1`). Ele já existe em `HEAD`
  (`packages/shared/src/calculators/doppler.ts:171`) e o import também já estava em `HEAD`.
  `tests/fetalGrowthSource.manual.ts` usa `classifyFetalGrowth`, que já está em `HEAD`
  (`fetalGrowth.ts:165`) e fica fora do build.
- **O web não depende do diff de `packages/shared`:** não há referência a `doppler_mode`.
  Também não depende de `packages/db`, nem de `apps/api` (sem chamadas a `/api/generate` ou
  `/api/iap`), nem de `apps/mobile`.
- **Pacotes externos de runtime:** só `react`, `react-dom` (`createPortal`) e `lucide-react`,
  todos já declarados. Nenhuma dependência de runtime nova.
- **Variáveis de ambiente:** nenhum `process.env` novo no diff web.
- **Imports que só existem em arquivos não rastreados (entram obrigatoriamente no commit):**
  `BiometryGrowthPanel`, `ExamCategoryPicker`, `IntergrowthPreview`, `PreEclampsiaPrintSheet`,
  `RenalMeasurementsFields`, `biometryGrowthSections`, `examCategoryImages`, `fetalGrowthContext`,
  `renalMeasurementsState`, `lib/calculators/{fetalWeight,intergrowth2020,intergrowthBiometry}` e
  `lib/catalog/dopplerWebMode`. Os assets de `public/categories` são referenciados por
  `examCategoryImages.ts`. Nenhum import aponta para arquivo inexistente.
- **Só em testes:** `esbuild`, `postcss`, `tailwindcss` e `node:*`, em `apps/web/tests/*.browser.*`.
  Ficam fora do `tsconfig` (`include: src/**`) e do grafo do Next. `esbuild` não está declarado
  no web, mas não entra no script `test` do worktree.
- **INTERGROWTH:** fórmulas novas, somente leitura e já autorizadas. Esta auditoria não avaliou
  nem ampliou nada clínico.

## 5. Plano de execução (próxima rodada, com autorização)

Use o worktree `~/.codex/worktrees/web-release-20260914/laudousgmobile` (branch
`codex/web-release-20260914`, base `dff9060`). **Nunca** rode no def.

```bash
WT=~/.codex/worktrees/web-release-20260914/laudousgmobile
cd "$WT"

# 0. Conferir o escopo: só apps/web/**, pnpm-lock.yaml e a story de release
git status --porcelain | grep -vE '^(\?\?| M) (apps/web/|pnpm-lock.yaml|docs/stories/2026-09-14-web-release.md)' && echo "ESCOPO SUJO — parar"

# 1. Gates locais
pnpm install --frozen-lockfile
pnpm --filter @laudousg/web lint
pnpm --filter @laudousg/web test
pnpm --filter @laudousg/web build          # com ESLint instalado, reproduz o build da Vercel

# 2. Commit delimitado (nada fora de apps/web + lock + story)
git add apps/web pnpm-lock.yaml docs/stories/2026-09-14-web-release.md
git diff --cached --name-only | grep -vE '^(apps/web/|pnpm-lock.yaml$|docs/stories/2026-09-14-web-release.md$)' && echo "ABORTAR"
git commit -m "feat(web): ..."             # com o trailer Co-Authored-By

# 3. Worktree limpo, sem .next/node_modules, criado do commit
SHA=$(git rev-parse HEAD)
git worktree add --detach /tmp/laudousg-web-deploy "$SHA"
cd /tmp/laudousg-web-deploy
test -z "$(git status --porcelain)"

# 4. Deploy só do projeto web, sem `vercel link` (IDs por env; nenhum .vercel é gravado)
VERCEL_ORG_ID=team_JFGRLFfKNTqoMuDUiwwmsSAT \
VERCEL_PROJECT_ID=prj_5etqM0uBJEoEb5yVLJAKOgAXzALC \
  vercel deploy --prod --yes --scope prazeresapp
#   Opção mais conservadora: primeiro `vercel deploy` (preview), testar a URL e depois
#   `vercel promote <url> --scope prazeresapp`.

# 5. Push SÓ do branch (gera previews dos 2 projetos, sem alias de produção)
cd "$WT" && git push -u origin codex/web-release-20260914
#   NÃO: git push origin main
```

Verificação pós-deploy:

```bash
vercel ls laudousg-web --scope prazeresapp | head -5            # novo Ready/Production
curl -sI https://www.laudousg.com.br | head -3                    # 200
curl -sI https://web.laudousg.com https://laudousg.com.br | grep -iE '^(HTTP|location)'  # 308 → www
vercel ls laudousgmobile --scope prazeresapp | head -3            # topo continua laudousgmobile-17rle442c
curl -s https://laudousgmobile.vercel.app/api/health              # compare com a resposta de antes
```

Rollback do web: `vercel rollback laudousg-nk2ib60qa-prazeresapp.vercel.app --scope prazeresapp`.

## 6. Pendências de decisão (fora desta rodada)

1. **Merge para `main`:** só com `97b2be8` (API/IAP) e o commit web juntos, depois de validar
   que o build Git da API reproduz `laudousgmobile-17rle442c`. A alternativa (Ignored Build Step
   temporário em `laudousgmobile`) muda configuração e precisa de autorização explícita.
2. **`planos.ts`** (regra clinic/essencial): publicar junto com o pacote IAP, não com este release.
3. Previews de branch da API usam as variáveis de ambiente Preview. Confirme que elas não apontam
   para webhooks/produção Apple com efeito colateral, ou não faça o push do branch até o merge.
