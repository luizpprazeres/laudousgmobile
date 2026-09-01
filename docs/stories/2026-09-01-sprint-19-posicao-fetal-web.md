# Sprint 19 — posição fetal obstétrica

## Objetivo

Representar de forma visual e determinística a situação fetal já informada nos formulários obstétricos. O desenho deve diferenciar apresentação cefálica, apresentação pélvica e situação transversa/córmica com polo cefálico à direita ou à esquerda, mantendo o dorso opcional.

## Matriz clínica fechada

| Situação | Apresentação / polo | Base visual |
|---|---|---|
| Longitudinal | Cefálica | `longitudinal-cefalica-v1.png` |
| Longitudinal | Pélvica | `longitudinal-pelvica-v1.png` |
| Transversa/córmica | Polo cefálico à direita | `transversa-polo-direita-v1.png` |
| Transversa/córmica | Polo cefálico à esquerda | `transversa-polo-esquerda-v1.png` |

O dorso não escolhe outra imagem. Quando informado, aparece como legenda opcional produzida pelo estado estruturado. Isso evita multiplicar combinações e impede que a ilustração infira um dado que o médico não forneceu.

## Regras de segurança

- Nenhuma imagem é gerada durante o atendimento.
- A seleção é feita apenas por `situacao`, `apresentacao` e `polo_cefalico` do formulário.
- O esquema não altera a classificação clínica nem o texto do laudo.
- A orientação transversal exibe referências explícitas de direita e esquerda maternas.
- A versão Doppler obstétrico isolado não recebe o esquema, pois não coleta posição fetal.
- Morfológico de primeiro trimestre não recebe o esquema de apresentação fetal de 2º/3º trimestre.

## Critérios de aceite

- [x] A matriz fecha as quatro combinações suportadas sem fallback ambíguo.
- [x] Obstétrica e Morfológico de 2º/3º trimestre exibem o botão condicional.
- [x] Alterar o formulário troca imediatamente a imagem e a legenda.
- [x] Dorso é opcional e não produz imagem clínica diferente.
- [x] O esquema pode ser exportado em PNG/PDF e enviado à Sala.
- [x] As imagens permanecem legíveis em preto e branco.
- [x] Testes focados, typecheck, build web e `git diff --check` passam.

## Validação executada

- `pnpm validate:sprint19` — matriz e quatro arquivos aprovados.
- `pnpm validate:sprint6` — 49 verificações de situação fetal e Doppler aprovadas.
- Gate ponta a ponta Obstétrica com as flags de produção — nenhum achado perdido ou invertido.
- `pnpm typecheck` — 8 pacotes aprovados.
- `pnpm --filter @laudousg/web build` — build de produção aprovado.
- `pnpm test` — comando executado; o monorepo ainda não declara tasks `test` no Turbo.
- `pnpm lint` — não automatizável no estado atual: os três apps abrem o assistente interativo de configuração do ESLint.
- `pnpm build` — o build agregado para no app `lab` por ausência de `NEXT_PUBLIC_SUPABASE_URL`; o build web do escopo foi aprovado isoladamente.
- `git diff --check` — aprovado.

## Arquivos

- `apps/web/public/schemas/fetal/README.md`
- `apps/web/public/schemas/fetal/manifest.json`
- `apps/web/public/schemas/fetal/longitudinal-cefalica-v1.png`
- `apps/web/public/schemas/fetal/longitudinal-pelvica-v1.png`
- `apps/web/public/schemas/fetal/transversa-polo-direita-v1.png`
- `apps/web/public/schemas/fetal/transversa-polo-esquerda-v1.png`
- `apps/web/src/lib/visualSchemas/fetalPosition.ts`
- `apps/web/src/lib/visualSchemas/__tests__/fetal-position.manual.ts`
- `apps/web/src/components/visualSchemas/FetalPositionSchema.tsx`
- `apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx`
- `apps/web/src/components/laudar/LaudarWebExperience.tsx`
- `apps/web/src/lib/deterministic/organs/obstetrica.ts`
- `apps/web/src/lib/deterministic/organs/morfologico.ts`
- `apps/web/src/app/api/sala/schema/route.ts`
- `apps/api/src/app/sala/[token]/page.tsx`
- `apps/api/src/server/renderer/catalog/__tests__/obstetrica-ponta-a-ponta.manual.ts`
- `package.json`

## Fora do escopo

Gestação gemelar exige esquema próprio e não será comprimida em um desenho de feto único. Cartografia vascular permanece no Sprint 20.
