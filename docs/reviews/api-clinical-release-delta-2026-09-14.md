# Delta clínico da API para a próxima publicação — 14/09/2026

Auditoria somente leitura. Nenhuma alteração em código, git, banco ou deploy.
Sem PHI nem segredos. Todos os testes executados são sintéticos, sem rede e sem
env de produção. Os testes com mocks usam chaves fictícias definidas no próprio teste.

## Base e método

- Base preservada de produção: `97b2be8` ("preserve clinical routing and secure
  Apple subscriptions"), branch `codex/appstore-189`, filho direto de `HEAD`
  (`dff9060`).
- A comparação foi feita entre os **arquivos físicos** do worktree e os blobs de
  `git show 97b2be8:<path>`, por hash (`git hash-object` × `git rev-parse`),
  e não por `git diff`. Assim, arquivos untracked também entram na comparação.
- Varredura completa de `apps/api/src`, `packages/shared/src` e `packages/db/src`.
- Os testes do worktree foram rodados de novo contra uma cópia de 97b extraída
  por `git archive` em `/tmp`, sem mexer no repositório, para confirmar quais
  correções faltam na base.

### IAP: situação preservada

Todos os arquivos IAP são **byte-idênticos** a 97b: `server/iap/*` (inclusive
`__tests__`), `app/api/iap/*`, `app/api/me/profile/route.ts`, `server/env.ts`,
`packages/db/src/schema/subscriptions.ts` e os SQL 0029/0030. O `generate/route.ts`
físico difere de 97b só em trechos clínicos, sem nenhum hunk de IAP.

### Diferenças fora do escopo clínico (não incluir sem querer)

- `app/api/health/route.ts` (DIF) e `server/health/probes.ts` + `health/__tests__` (novos).
- `packages/db/src/migrate.ts` (DIF) e `packages/db/src/sql/0028_revoke_authenticated_maintenance.sql` (novo).

Esses arquivos não foram auditados aqui.

## Delta dos 7 arquivos-foco (físico × 97b)

| Arquivo | Estado git | 97b → físico | Natureza |
|---|---|---|---|
| `pipeline/renderer.ts` | tracked | +3 | Repassa `includeDoppler` para a extração |
| `pipeline/requestedExam.ts` | **untracked** (existe em 97b) | +18 −4 | `resolveDopplerMode` (padrão combined), `resolveWriterExam`, preserva a escolha OBSTETRICA |
| `pipeline/writer.ts` | tracked | +19 −8 | Exame do writer resolvido, `prepareMorfologicoBlocks`, exceção do Doppler isolado; instrução do exame **movida** para `buildSystemMessage` |
| `prompts/buildSystemMessage.ts` | tracked | +44 −8 | Contratos isolado/combinado, sem blocos do banco no isolado, precedência MORFOLÓGICO, política obstétrica simples |
| `prompts/contracts/MORFOLOGICO.ts` | **untracked** (existe em 97b) | +3 | Percentil sem arredondar, subtítulos, cervicometria |
| `renderer/categories/ABDOMEN_SUPERIOR.ts` | tracked | +7 −2 | Schema público com `.transform(normalizeAbdomenSuperior)` |
| `renderer/categories/MORFOLOGICO.ts` | tracked | +73 −26 | 12 campos laterais de ossos longos (Zod, JSON strict, prompt) e `medidaOsso` |

## Correções clínicas que faltam na produção preservada (97b)

1. **MORFOLÓGICO: lateralidade dos seis ossos longos** (story `morfologico-lateralidade-ossos`).
   Em 97b, o valor genérico é repetido nos dois lados e medidas assimétricas se
   perdem. O teste físico rodado contra 97b dá **81 aprovados e 184 falhas**;
   no worktree, 265/265.
2. **ABDOMEN_SUPERIOR: esteatose com `status` normal** (story `abdomen-superior-esteatose`).
   Em 97b, o parser não normaliza e o achado some do corpo e da conclusão. Contra
   97b: **6 aprovados e 7 falhas**; no worktree, 13/13.
3. **Doppler obstétrico: modo padrão combined para clientes antigos** (story
   `api-obstetrica-doppler`). Em 97b, `DOPPLER_OBSTETRICO` sem `doppler_mode`
   devolve `undefined` (fica com o palpite do structurer). O `requestedExam.manual.ts`
   físico falha contra 97b justamente nessa asserção. Essa decisão substitui o
   padrão isolado da Sprint 2.
4. **Escolha explícita OBSTETRICA preservada** contra o palpite do structurer
   (`requestedExamCategory`).
5. **Writer Doppler**:
   - combined usa o bundle e o contrato Doppler combinados;
   - isolated usa o contrato em código, sem blocos do banco, sem `PLACENTA_BLOCK`
     e com a exceção no user message;
   - na rota, o isolado não carrega bundle e o fallback combined é bloqueado quando o bundle falha;
   - o metadata persiste o modo resolvido.
6. **MORFOLÓGICO no writer**:
   - `prepareMorfologicoBlocks` trata o título e a técnica da cervicometria, a
     linha opcional de datação e apresentação/dorso sem placeholder;
   - remove só as duas instruções globais de arredondamento de percentil;
   - adiciona o bloco de precedência e 3 regras no contrato.

   Contra 97b, `morfologicoPercentilRules` e `morfologico-template` falham
   (adaptador ausente / módulo inexistente).
7. **OBSTETRICA simples com recusa (fail-closed)**:
   - `includeDoppler=false` apenas com `category_hint=OBSTETRICA`;
   - a extração força `doppler: null`;
   - o writer recebe `OBSTETRICA_PLAIN_WRITER_POLICY` e o Writer V2 é desviado;
   - a rota recusa na entrada e na saída (`PIPELINE_FAILURE`), segura os tokens
     e entrega o texto aprovado num único token antes do `done`.

   Fica em `route.ts`, `extraction.ts` e `obstetricaPlainPolicy.ts`, **fora dos 7 arquivos**.

### Riscos de produto nas correções 3 e 7 (decisão do usuário, não defeito)

- Clientes antigos que mandam Doppler sem modo passam a receber o laudo combinado.
- Ditados com Doppler escolhidos como obstétrico simples passam a ser **recusados**,
  quando hoje geram laudo. Pela story, o detector é léxico: ASR ou terminologia
  inesperada podem escapar ou causar falso positivo.
- Com a categoria OBSTETRICA, o streaming vira um token único no fim. A story
  registra compatibilidade só por leitura de código (Android/iOS), **sem prova em dispositivo**.
- Fidelidade ao vivo: a etapa de política só por prompt ficou em **13/18 (NO-GO)**.
  A etapa fail-closed validou só 2 amostras simples ao vivo. A validação clínica
  ao vivo pós-patch está pendente na story.

## Guards de 97b perdidos num `cp` direto só dos 7 arquivos

Nenhuma linha de 97b foi removida sem substituto equivalente nos 7 arquivos.
Os riscos vêm de **cópia parcial**, porque as dependências ficam fora do conjunto:

| Cópia | Efeito |
|---|---|
| `writer.ts` sem `buildSystemMessage.ts` | **Perde o guard de 97b** `+ requestedExamInstruction(...)` (instrução "obstétrico com Doppler / não invente normalidade vascular"), que foi movido para `buildSystemMessage`. Também quebra a compilação: importa `prompts/morfologicoTemplate.ts` (ausente em 97b) e passa `dopplerMode`/`includeDoppler`, que 97b não aceita. |
| `buildSystemMessage.ts` sem `writer.ts` | Quebra a compilação: importa `prompts/obstetricaPlainPolicy.ts` (ausente em 97b). Se compilasse, o writer de 97b duplicaria a instrução do exame combinado. |
| `renderer.ts` sem `renderer/extraction.ts` | Quebra a compilação: `includeDoppler` não existe na assinatura de `runRendererExtraction` em 97b. |
| `requestedExam.ts` sem `generate/route.ts` | A rota de 97b só repassa `doppler_mode` cru. Cliente antigo sem modo teria a categoria forçada para OBSTETRICA, mas sem modo combined na extração e no writer, sem bundle Doppler e sem metadata: **seleção Doppler perdida em silêncio**. O `route.ts` de 97b (checagem pós-geração com `reqInput.doppler_mode !== "isolated"`) também não usaria o modo resolvido. |
| `route.ts` físico sem `obstetricaPlainPolicy.ts` | Quebra a compilação. |
| `renderer/categories/MORFOLOGICO.ts` sozinho | Seguro. Os guards de 97b (`itens_conclusao_livres` required, `sistemasAlterados` 1T) continuam: conclusão-sistemas 18/18 e matriz iOS 23b4 89/89. As saídas legadas sem lateralidade ficam idênticas (hashes da story + goldens). |
| `renderer/categories/ABDOMEN_SUPERIOR.ts` sozinho | Seguro. Os consumidores do schema, que virou `ZodEffects`, são `extraction.ts` (`.parse`) e `modeloNormalRegistry.ts` (`z.ZodTypeAny`); nenhum usa `.shape`/`.extend`. O tipo exportado continua igual. |
| `prompts/contracts/MORFOLOGICO.ts` sozinho | Seguro: só adiciona texto. `contracts/index.ts` é idêntico a 97b. |

### Conjuntos coesos para publicar

- **A, independente e de baixo risco:** `renderer/categories/MORFOLOGICO.ts` e
  `renderer/categories/ABDOMEN_SUPERIOR.ts` (contrato `contracts/MORFOLOGICO.ts` opcional).
- **B, Doppler/MORFO writer/obstétrico simples (tudo junto):**
  `pipeline/requestedExam.ts`, `pipeline/writer.ts`, `pipeline/renderer.ts`,
  `prompts/buildSystemMessage.ts`, `prompts/contracts/MORFOLOGICO.ts`,
  `prompts/morfologicoTemplate.ts` (novo), `prompts/obstetricaPlainPolicy.ts` (novo),
  `renderer/extraction.ts` e `app/api/generate/route.ts`.
  `renderer/categories/dopplerObstetricoModule.ts` e `DOPPLER_OBSTETRICO` contract já são idênticos a 97b.
- Não levar health/db 0028. Não tocar nos arquivos IAP, que já são iguais a 97b.

Atenção: `requestedExam.ts`, `contracts/MORFOLOGICO.ts`, os dois prompts novos e
vários testes estão **untracked** em `main`. Um commit ou cherry-pick baseado em
`git diff` deixaria esses arquivos de fora.

## Testes necessários (puros, sem rede e sem env de produção)

Comando, na raiz: `pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/<teste>`

| Teste | Worktree | Contra 97b | Cobre |
|---|---|---|---|
| `pipeline/__tests__/requestedExam.manual.ts` | 11 ok | falha (padrão combined) | B |
| `pipeline/__tests__/obstetricDopplerFlow.manual.ts` (IO mockado) | 96 ok | — | B |
| `pipeline/__tests__/obstetricaPlainDoppler.manual.ts` (LLM mockado) | 24 ok | — | B |
| `pipeline/__tests__/obstetricaPlainFailClosed.manual.ts` | 19+12+6 ok | — | B |
| `prompts/__tests__/obstetricaPlainWriter.manual.ts` | 16 ok | — | B |
| `prompts/__tests__/morfologicoPercentilRules.manual.ts` | 384 ok | falha | B |
| `pipeline/__tests__/morfologico-template.manual.ts` | 13 ok | módulo ausente | B |
| `pipeline/__tests__/morfologicoBundleVariant.manual.ts` | 10 ok | 10 ok | B |
| `pipeline/__tests__/morfologicoRouteSelection.manual.ts` | 15 ok | — | B |
| `pipeline/__tests__/dumFormatGuard.manual.ts` | 100 ok | — | regressão |
| `renderer/__tests__/doppler-obstetrico-golden.manual.ts` | 26 ok | — | B |
| `renderer/__tests__/obstetrica-objetivo-golden.manual.ts` | 31 ok | — | B |
| `renderer/__tests__/contrato-extracao-obstetrica.manual.ts` | 293 ok | — | B |
| `renderer/__tests__/morfologico-lateralidade.manual.ts` | 265 ok | 81 ok / 184 falhas | A |
| `renderer/__tests__/contrato-extracao-morfologico.manual.ts` | ok | — | A |
| `renderer/__tests__/morfologico-conclusao-sistemas.manual.ts` | 18 ok | — | A (guards 97b) |
| `renderer/__tests__/morfologico-23b4-ios-clinical-matrix.manual.ts` | 89 ok | 89 ok | A (guards 97b) |
| `renderer/__tests__/morfologico-objetivo-golden.manual.ts` | 41 ok | — | A |
| `renderer/__tests__/abdomen-superior-extraction-normalization.manual.ts` | 13 ok | 6 ok / 7 falhas | A |
| `renderer/__tests__/abdomen-superior-golden.manual.ts` | 40 ok | 40 ok | A |
| `renderer/__tests__/abdomen-superior-objetivo-golden.manual.ts` | 40 ok | — | A |
| `renderer/__tests__/abdomen-hepatopatia-cronica.manual.ts` | ok | — | A |

- **Typecheck da API** (`tsc --noEmit --incremental false -p apps/api/tsconfig.json`) no worktree físico: **exit 0**.
- **Falha preexistente:** `prompts/__tests__/writerHardening.manual.ts` falha com o
  hash de ABDOMEN_TOTAL (`40c7a6…` em vez de `055798…`). O hash obtido é **idêntico
  em 97b**, então não é regressão deste delta. O baseline do teste está desatualizado.
- **Não executados (ao vivo, OpenAI real):** `requested-doppler-e2e.manual.ts`
  (exige env válida), `morfologico-lateralidade-live`, `morfologico-fidelity-live`,
  `morfologicoWriterLive`, `obstetric-doppler-live` e `obstetrica-plain-writer-live`.
- **Gates gerais sem valor, segundo as stories:** `npm run lint` pede configuração
  interativa do ESLint e `npm test` roda zero tarefas.

## Pendências antes da publicação

1. Decidir se o conjunto B (recusa do obstétrico simples + padrão combined) entra agora ou só A.
2. Se B entrar: validação clínica ao vivo pós-patch e prova em dispositivo iOS/Android
   do token único e da mensagem de recusa.
3. Garantir que o empacotamento inclua os arquivos untracked e deixe health/db 0028 de fora.
4. Rodar de novo a tabela acima e o typecheck sobre o artefato final, não sobre este worktree.
