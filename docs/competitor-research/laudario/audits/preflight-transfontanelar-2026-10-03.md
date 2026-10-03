# Preflight — Transfontanelar

Data: 03/10/2026. Rodada preparatória, sem acesso ao Laudário e sem dados de pacientes. Este arquivo não altera código clínico, a fila nem o status do estudo; ele só prepara a observação do operador e o crosswalk que virá depois.

## Escopo e limites

- Exame: Transfontanelar, código canônico `TRANSFONTANELA` (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:36`). A regra do mapa é corrigir apenas o rótulo e preservar o código.
- Motivo da prioridade: há writer exposto sem contrato determinístico (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:13`).
- A prova mínima prevista pela fila é: normal; hemorragia; medida incompleta (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:13`).
- Limites operacionais: um exame, no máximo três cenários sintéticos, nenhuma impressão, cópia integral, envio ou endpoint privado, e o modelo deve ser restaurado ao final (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:15`, `docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:21`).

## O que já se sabe do concorrente

| Fato | Rótulo | Evidência |
| --- | --- | --- |
| "Transfontanelar" consta no catálogo de Ultrassonografia, no atalho Pediatria, ao lado de Quadril Infantil | `observado` (rodada de catálogo de 02/10) | `docs/competitor-research/laudario/catalogo-ultrassonografia-2026-10-02.json:20` |
| Abas, campos, presets, escalas de hemorragia, medidas ventriculares, Doppler e recomendações | **não observado** | nenhuma rodada funcional foi registrada; Transfontanelar é o primeiro item da fila (`docs/competitor-research/laudario/status-estudo-2026-10-03.json:143`) |

Não há outro fato do concorrente neste preflight. As perguntas abaixo ficam abertas e devem ser respondidas pela observação, não presumidas.

## Estado atual no LaudoUSG

Classificação pelo critério do guia (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:44-50`):

| Plataforma | Estado | Evidência |
| --- | --- | --- |
| Web | **genérico** (writer por texto) | `apps/web/src/lib/writerCategories.ts:21` inclui `TRANSFONTANELA` em `WRITER_CATEGORY_OPTIONS`; ausente de `STRUCTURED_WEB_CATEGORY_CODES` (`apps/web/src/lib/writerCategories.ts:2-7`); `apps/web/src/components/laudar/LaudarWebExperience.tsx:1410-1411` abre `WriterCategoryWorkspace`, que é um textarea livre (`apps/web/src/components/laudar/WriterCategoryWorkspace.tsx:136`); a rota autenticada só aceita a allowlist do writer (`apps/web/src/app/api/generate/route.ts:25`, `apps/web/src/lib/writerContract.ts:13-16`); o seletor agrupa o exame em "Outros exames" (`apps/web/src/components/laudar/categoryGroups.ts:60`) |
| Android/RN | **genérico** | seletor em `apps/mobile/src/ui/tokens.ts:163`, conferido pelo teste `apps/mobile/src/features/generate/categories.manual.ts:13`; `isClinicalModelCode` devolve falso, porque o código não está no enum compartilhado (`apps/mobile/app/generate.tsx:123`, `packages/shared/src/clinicalModels/contracts.ts:3-9`); o gate hepático também não se aplica (`apps/mobile/app/generate.tsx:125`); o pedido segue como `category_hint` no fluxo de ditado (`apps/mobile/app/generate.tsx:348`) |
| iOS | **genérico** | `laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:26`; não está em `isPendingClinicalActivation` (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:63-71`) nem em `priority` (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:243-262`); faz parte do conjunto selecionável testado (`laudousg-swift/LaudoUSG/LaudoUSGTests/CategorySelectionTests.swift:22`); nenhuma outra ocorrência em `Features/Generate` |
| API | **genérico** (`writer-pure` + bundle RAG) | sem caminho próprio: `resolveGenerationPath` só usa renderer quando o código está em `RENDERER_CATEGORIES` (`apps/api/src/server/pipeline/generationPathResolver.ts:24-30`, `apps/api/src/server/pipeline/generationPathResolver.ts:41-44`), cujo default é vazio (`apps/api/src/server/env.ts:74`). Não existe renderer, writer dedicado, auditoria de writer nem schema de extração para o exame (busca por `transfontan` em `apps/api/src` retorna apenas os quatro pontos abaixo). Normalização: `apps/api/src/server/pipeline/categoryNormalization.ts:51` |
| Banco | código ativo, **sem contrato** | seed `{ code: "TRANSFONTANELA", label: "Transfontanela" }` sem `active` explícito (`packages/db/src/seeds/data.ts:122`), o que resulta em ativo por default (`packages/db/src/seeds/run.ts:39`). Nenhuma migração versionada menciona o código (`supabase/migrations/`, três arquivos) |
| Contrato compartilhado | **ausente** | `ClinicalModelCodeSchema` contém só cinco modelos (`packages/shared/src/clinicalModels/contracts.ts:3-9`); nada neonatal em `packages/shared/src/clinicalModels/`; também não há snippets em `packages/knowledge/snippets/` |

Dados registrados em auditorias anteriores e **não reverificados nesta rodada**, porque o preflight não consultou o banco de produção:

- `docs/parity/2026-09-30-cross-platform-models-schemes-audit.md:51`: 48 blocos de conhecimento validados, caminho writer/RAG.
- `docs/sprint-24-inventario-2026-09-12.md:49`: 4 laudos em 90 dias, 1 médico, 0 editados.
- `docs/sprint-24-inventario-2026-09-12.md:80`: o gabarito neonatal ainda não existe. A graduação de hemorragia é classificação e, segundo o mesmo documento, deve ser derivada pelo renderer.

### Fonte de verdade

Hoje existe uma única fonte: o texto que o writer produz a partir do ditado. Não há formulário, cálculo, conclusão derivada, esquema visual nem contrato para divergir. O risco não é divergência entre fontes. O risco é a ausência de qualquer derivação determinística ou guard específico entre o ditado e o laudo.

### Achados técnicos do preflight

Todos são `candidato a lacuna` até o crosswalk:

1. **Extrator de Levene órfão.** O valor é extraído em `apps/api/src/server/pipeline/deterministicSanity/extractor.ts:731-738` e tipado em `apps/api/src/server/pipeline/deterministicSanity/types.ts:135-136`, mas nenhuma regra o consome: `TRANSFONTANELA` não está em `CATEGORY_SPECIFIC_CHECKS` (`apps/api/src/server/pipeline/deterministicSanity.ts:59-66`). O segundo padrão aceita o número sem unidade e grava como mm (`extractor.ts:734`). Um "1,2 cm" ditado viraria 1,2 mm caso alguma regra futura passe a usar esse campo.
2. **Lateralidade só por presença.** `checkLaterality` só verifica se `direit*`/`esquerd*` aparece em algum lugar do texto (`apps/api/src/server/pipeline/deterministicSanity.ts:191-229`). Num laudo transfontanelar que descreve os dois ventrículos, uma hemorragia trocada de lado não seria detectada (inferido).
3. **Glossário de ASR desalinhado.** O exame herda apenas termos do grupo vascular (`apps/api/src/server/asr/medicalGlossary.ts:180`); "Papile" aparece só na lista global de classificações (`apps/api/src/server/asr/medicalGlossary.ts:150`). O efeito real na transcrição não foi medido.
4. **Rótulo divergente.** Os nomes são "Transfontanela" no rótulo compartilhado (`packages/shared/src/categoryPresentation.ts:42`), no seed, no RN e no iOS (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:97`); e "Transfontanelar" no workspace do writer Web (`apps/web/src/lib/writerCategories.ts:21`). O seletor Web usa o rótulo compartilhado (`apps/web/src/components/laudar/categoryGroups.ts:70-71`), então o mesmo exame aparece com dois nomes na Web. O mapa canônico já prevê corrigir apenas o rótulo.

## Cenários sintéticos para o operador (máximo 3)

Os cenários usam um recém-nascido fictício, sem nome, data real, prontuário ou imagem. Registre primeiro o estado inicial das abas, sem alterar nada. Em cada cenário, mude uma variável ou um preset por vez e restaure o modelo antes do cenário seguinte.

### C1 — Normal

- Entrada: exame sem alterações, preenchido com os defaults do próprio modelo. Se houver campo de idade gestacional ou corrigida, registre se ele é obrigatório e deixe-o em branco na primeira passada.
- Registrar: quais estruturas o texto normal afirma (ventrículos, plexos, linha média, parênquima, fossa posterior, espaços extra-axiais, Doppler, se houver); se a normalidade aparece sem nenhuma medida numérica; se idade, via de acesso (fontanela) ou qualidade técnica entram no texto.
- Pergunta-chave: o modelo afirma normalidade ventricular sem medida?

### C2 — Hemorragia unilateral

- Entrada: hemorragia da matriz germinativa e/ou intraventricular **à esquerda**, sem dilatação ventricular, mantendo o lado direito normal.
- Registrar: a escala oferecida (Papile, Volpe ou outra), sem presumir nenhuma; se o grau é escolhido pelo médico ou derivado automaticamente; quais campos mudam sozinhos; se a lateralidade chega ao corpo e à conclusão; se alguma recomendação (controle seriado, por exemplo) entra sem confirmação.
- Fronteira opcional, ainda dentro do C2: acrescentar dilatação ou lesão parenquimatosa e ver se o grau sobe sozinho. Desfazer em seguida e registrar se algum texto ou grau permanece.

### C3 — Medida incompleta

- Entrada: dilatação ventricular descrita qualitativamente, sem medida, ou com medida em apenas um lado.
- Registrar: se o modelo classifica ventriculomegalia ou hidrocefalia sem número; se exige índice ventricular, largura do corno anterior ou outra medida, e com qual unidade; se o lado sem medida é declarado normal; o que acontece ao apagar a medida depois de preenchida.

## Riscos clínicos a observar

1. **Falsa normalidade residual:** o texto normal do ventrículo ou do parênquima continua presente depois de marcar hemorragia ou dilatação.
2. **Classificação sem dados mínimos:** um grau de hemorragia ou o diagnóstico de ventriculomegalia é derivado de preset, sem medida ou sem descrição do componente que define o grau.
3. **Escala misturada:** o modelo mistura critérios de escalas diferentes ou trata infarto hemorrágico periventricular como mera progressão de grau.
4. **Lateralidade:** um achado unilateral vira bilateral, perde o lado na conclusão ou mantém o lado oposto como "normal" sem avaliação.
5. **Persistência após desfazer:** grau, recomendação ou medida derivada continua no laudo depois de remover o achado.
6. **Limitação técnica ignorada** (fontanela pequena, janela ruim): o texto mantém normalidade completa mesmo assim.
7. **Unidade e idade:** a medida aparece em cm ou mm sem padronização; a idade gestacional ou corrigida não é registrada quando a interpretação depende dela.
8. **Recomendação automática:** conduta ou controle entra no texto final sem confirmação explícita.

O que for observado nesses pontos é comportamento do concorrente, não requisito. Nenhuma regra clínica deve ser criada no LaudoUSG sem revisão médica e fonte apropriada (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:19`).

## Para o crosswalk que virá depois

- Confirmar ou descartar os quatro candidatos acima, com busca completa nas três plataformas antes de usar o rótulo `gap confirmado`.
- O contrato mínimo a propor deve ter estados explícitos para não avaliado, normal, alterado e limitado, por lado. A graduação de hemorragia deve ser derivada de forma determinística e confirmada pelo médico, como já ocorre com Graf no Quadril Infantil (`packages/shared/src/clinicalModels/contracts.ts:362-373`).
- Antes de ativar, testar casos normais, alterados, incompletos, lateralidade, unidades, limites e serialização ponta a ponta nas três plataformas (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:66`).
- Gabarito neonatal do Luiz: ainda inexistente segundo `docs/sprint-24-inventario-2026-09-12.md:80`. É dependência clínica do contrato, não do estudo.
