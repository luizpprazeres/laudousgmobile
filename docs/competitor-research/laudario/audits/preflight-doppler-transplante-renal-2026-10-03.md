# Preflight — Doppler de transplante renal

Data: 03/10/2026. Rodada preparatória somente de leitura, sem navegador e sem dados de pacientes. Este arquivo não altera código clínico, a fila nem o status do estudo. Ele prepara a observação do operador e o crosswalk seguinte.

## Escopo e limites

- Exame: Doppler de transplante renal. No mapa canônico, transplante e Doppler renal nativo têm **códigos distintos**, e o transplante não é variante implícita do modelo nativo (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:38`). Nenhum código foi escolhido. O nome definitivo fica para o crosswalk.
- Motivo da prioridade: exame ausente, com material preliminar em quarentena. A prova mínima exigida é o **inventário e as fontes antes de qualquer cenário** (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:13`).
- Limites da rodada: um exame, no máximo três cenários sintéticos, sem endpoints privados, sem copiar, imprimir ou finalizar laudos, e restaurar o modelo ao final (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:15`, `docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:21`). Um achado do concorrente não vira requisito clínico (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:19`).

## O que já se sabe do concorrente

| Fato | Rótulo | Evidência |
| --- | --- | --- |
| "Doppler de Transplante Renal" consta no atalho de vascular abdominal do catálogo, ao lado de Doppler Aortorrenal, Aorta e Ilíacas, Mesentéricas e Hepático | `observado` (inventário de catálogo de 02/10) | `docs/competitor-research/laudario/catalogo-ultrassonografia-2026-10-02.json:17` |
| Controles, campos, cálculos, limiares, presets, recomendações e texto do modelo | **não observado** | nenhuma rodada funcional; o exame é o primeiro da fila (`docs/competitor-research/laudario/status-estudo-2026-10-03.json:149`) |

O comportamento observado no Doppler Aortorrenal **não** deve ser projetado sobre o transplante. Aquele caso (`docs/competitor-research/laudario/cases/doppler-aortorrenal-2026-10-03.md:5-28`) trata do rim nativo. O "inventário de transplante" citado na rodada de Doppler Hepático (`docs/competitor-research/laudario/00-metodo-e-progresso.md:32`) se refere ao fígado, não ao rim.

## Material preliminar em quarentena

Encontrei um único arquivo preliminar: `packages/knowledge/snippets/DOPPLER_RENAL/excecao/__rev__/rim-transplantado.md`. A busca por `transplant`, `enxerto renal`, `quarentena`/`quarantine` e pastas `__rev__` no monorepo, em `tmp-review`, `study`, `_extraction`, `output`, `copy`, `scratchpad`, `docs` e no repositório iOS não encontrou outro material renal.

| Aspecto | Evidência | Leitura |
| --- | --- | --- |
| Situação editorial | `status: draft`, versão 0.1.0, tag `pendente-curadoria` (`packages/knowledge/snippets/DOPPLER_RENAL/excecao/__rev__/rim-transplantado.md:5-9`) | rascunho, não curado |
| Fonte | Diretriz geral de transplantes de órgãos sólidos, marcada como **pendente** de curadoria contra uma diretriz específica de transplante renal (`.../rim-transplantado.md:10`) | fonte não fechada |
| Limiares | O próprio arquivo os declara "REFERÊNCIA preliminar" que "PRECISAM ser validados" (`.../rim-transplantado.md:16`); lista em `.../rim-transplantado.md:37-41` | **não usar como critério nem como gabarito para julgar o concorrente** |
| Frases prontas de conclusão | `.../rim-transplantado.md:43-47` | não validadas; não servem de texto da casa |
| Salvaguardas úteis | Não classificar tipo de rejeição por Doppler e não inferir complicação sem critério ditado (`.../rim-transplantado.md:49-51`) | princípios compatíveis com a doutrina do estudo; precisam de revisão clínica antes de virar regra |

### A quarentena realmente bloqueia o uso?

- **Webhook do GitHub:** ignora qualquer caminho com `/__rev__/` (`apps/api/src/app/api/admin/github-webhook/route.ts:136-142`).
- **Ingestor manual:** percorre subpastas recursivamente e **não exclui `__rev__`** (`apps/api/scripts/ingest-knowledge.ts:90-95`). Uma ingestão real da categoria `DOPPLER_RENAL` gravaria o arquivo no banco. Pelo frontmatter, ele entraria como `draft` (`apps/api/scripts/ingest-knowledge.ts:154-157`, `apps/api/scripts/ingest-knowledge.ts:256-260`). O padrão sem `NODE_ENV=production` é `--dry-run` (`apps/api/scripts/ingest-knowledge.ts:57`).
- **Montagem do bundle:** carrega só blocos com status `validated` (`apps/api/src/server/pipeline/bundleLoader.ts:242`). Assim, um bloco `draft` não chegaria ao prompt mesmo que fosse ingerido.
- **Conclusão:** a quarentena depende de duas barreiras, a pasta (só no webhook) e o status `draft` (no bundle). O crosswalk de 03/10 descreve o material como "corretamente fora da ingestão ativa" (`docs/competitor-research/laudario/crosswalk-doppler-aortorrenal-2026-10-03.md:21`). Isso vale para o webhook, mas não para o script manual. Se alguém mover o arquivo para fora de `__rev__` **e** trocar o status para `published`, os limiares preliminares entram no RAG de `DOPPLER_RENAL` sem passar por revisão clínica (`candidato a lacuna`). O comentário do webhook cita uma promoção via `/api/blocks/promote`, mas essa rota não existe em `apps/api/src/app/api/` no checkout atual.

## Estado atual no LaudoUSG

Classificação pelo critério do guia (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:44-50`). Uma busca textual por `transplant`, `enxerto renal`, `fossa ilíaca` e `anastomo` em `apps/web/src`, `apps/mobile/src`, `apps/mobile/app`, `apps/api/src`, `packages/shared/src`, `packages/db/src`, `supabase/migrations` e no app iOS não retornou nada clínico. A única ocorrência em código ativo é um comentário sem relação em `packages/shared/src/hepatic/contracts.ts:155`.

| Plataforma | Estado para transplante renal | Vizinho mais próximo: `DOPPLER_RENAL` |
| --- | --- | --- |
| Web | **ausente** | writer genérico no grupo Vascular (`apps/web/src/lib/writerCategories.ts:20`, `apps/web/src/components/laudar/categoryGroups.ts:55`); os sinônimos de busca não incluem transplante ou enxerto (`apps/web/src/components/laudar/categoryGroups.ts:107`) |
| Android/RN | **ausente** | "Doppler Renal", subtítulo "Artérias renais" (`apps/mobile/src/ui/tokens.ts:145`) |
| iOS | **ausente** | `case dopplerRenal` (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:34`), subtítulo "Artérias renais" (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:167`) |
| API | **ausente** | writer dedicado só quando `DOPPLER_RENAL` está em `RENDERER_CATEGORIES` (`apps/api/src/server/pipeline/renderer.ts:437-470`); fora desse gate, writer genérico. O gate estava vazio em produção em 03/10 (`docs/competitor-research/laudario/crosswalk-doppler-aortorrenal-2026-10-03.md:17`). A normalização não tem nenhuma regra renal ou de transplante (`apps/api/src/server/pipeline/categoryNormalization.ts:41-77`) |
| Banco versionado | **ausente** | seed só de `DOPPLER_RENAL` (`packages/db/src/seeds/data.ts:117`); nenhuma migração menciona transplante |
| Contrato compartilhado | **ausente** | não existe para transplante nem para renal nativo (`packages/shared/src/clinicalModels/contracts.ts:3-9`) |
| Conhecimento ativo | só rim nativo | o modelo publicado declara como fonte a diretriz de Doppler da **artéria renal nativa** (`packages/knowledge/snippets/DOPPLER_RENAL/modelo/template-padrao.md:10`); o crosswalk renal mantém transplante fora do primeiro contrato (`docs/competitor-research/laudario/crosswalk-doppler-aortorrenal-2026-10-03.md:61`) |

### Fonte de verdade

Não há fonte própria para o exame. Hoje, um ditado de enxerto só tem para onde ir se o médico escolher `DOPPLER_RENAL`, `VIAS_URINARIAS` ou `LIVRE`, e nenhuma dessas categorias foi desenhada para transplante.

### Riscos técnicos do desvio para `DOPPLER_RENAL`

São `inferido`: nenhum laudo de transplante foi gerado nesta rodada.

1. **Critério nativo aplicado a enxerto.** O prompt dedicado só reconhece estenose pela VPS da artéria renal ou pela relação aorto-renal, ambos critérios nativos (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:98`, `apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:104`). A auditoria usa os mesmos limiares (`apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts:220-221`) e a mesma faixa de IR normal (`apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts:153`). O cabeçalho fixo é "artérias renais" (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:74`).
2. **Localização confundida com lateralidade.** A auditoria liga cada medida a "direita/esquerda" pela proximidade da palavra (`apps/api/src/server/pipeline/dopplerRenalWriterAudit.ts:35-44`). Num enxerto em fossa ilíaca direita, "direita" é a localização do enxerto, não o lado de uma artéria renal. O texto poderia afirmar uma artéria renal direita que não existe, ou acusar uma troca de lado inexistente.
3. **Ausência de estruturas próprias.** Os papéis ditados de anastomose arterial, artéria ilíaca doadora, veia do enxerto, coleções perienxerto e via excretora do enxerto não aparecem no schema mínimo (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:23-33`) nem no roteiro do prompt (`apps/api/src/server/renderer/categories/DOPPLER_RENAL.ts:85-91`).
4. **Fora do gate dedicado,** o writer genérico usa o bundle validado de `DOPPLER_RENAL`. Esse bundle é de rim nativo e não tem bloco de transplante validado no repositório.

## Etapa 0 — inventário, antes de qualquer cenário

A fila exige o inventário primeiro. Abra o modelo e registre o estado inicial sem alterar nada:

- abas e blocos, e a ordem em que aparecem;
- se a localização do enxerto (fossa ilíaca direita, esquerda, pelve) é um campo próprio ou se é tratada como "lado";
- se os rins nativos entram no mesmo exame ou ficam fora;
- estruturas vasculares oferecidas: artéria do enxerto por segmento, anastomose, artéria ilíaca, veia do enxerto, veia ilíaca, artérias múltiplas;
- parâmetros e unidades oferecidos (velocidades, razões, IR, IP, tempo de aceleração) e quais são calculados automaticamente;
- parênquima, via excretora, coleções perienxerto e bexiga;
- campos de contexto: tempo desde o transplante, tipo de anastomose, indicação clínica;
- se existe qualidade técnica ou "não avaliado" por estrutura;
- como as recomendações aparecem e se exigem confirmação;
- se a interface mostra alguma referência ou limiar. Registre só que existe e onde fica; não copie valores como verdade clínica.

## Cenários sintéticos (máximo 3)

Os cenários usam um paciente fictício, sem nome, data real ou imagem. Mude uma variável por vez e restaure o modelo antes do cenário seguinte. Os valores numéricos abaixo servem para provocar o comportamento; não representam critério do LaudoUSG.

### C1 — Enxerto normal (estado inicial)

- Entrada: o modelo como abre, sem alterações. Se a localização for um campo, escolha uma única fossa ilíaca.
- Registrar: quais estruturas o texto normal afirma sem nenhuma medida; se aparece normalidade de estrutura que o modelo nem oferece como campo; se a localização chega ao corpo e à conclusão; se o texto usa termos de rim nativo (aorta, relação aorto-renal, artérias renais direita e esquerda).

### C2 — Velocidade elevada na anastomose arterial, sem medida comparativa

- Entrada: só uma VPS sintética alta na anastomose arterial (por exemplo, 350 cm/s), sem medida da artéria doadora.
- Registrar: se o modelo conclui estenose só com essa medida; se exige ou calcula uma razão; se um alerta substitui a conclusão ou se a conclusão muda sozinha; se existe uma etapa de confirmação médica.
- Fronteira opcional, ainda no C2: acrescentar uma velocidade sintética da artéria doadora e ver se surge uma razão derivada e qual vaso ela usa como referência. Depois apagar as duas medidas e registrar se algum derivado, alerta ou frase permanece.

### C3 — IR intrarrenal elevado isolado

- Entrada: só um IR intrarrenal sintético alto (por exemplo, 0,90), com o restante normal.
- Registrar: qual hipótese o modelo escreve (rejeição, necrose tubular, obstrução, outra ou nenhuma); se nomeia um tipo de rejeição; se recomenda biópsia ou contato com a equipe automaticamente; se pede IR em mais de um ponto do enxerto.
- Fronteira opcional, ainda no C3: marcar a veia do enxerto como não avaliada, se houver essa opção, e verificar se a frase normal da veia sai do texto e da conclusão.

## Riscos clínicos a observar

1. **Critério de rim nativo aplicado ao enxerto:** relação aorto-renal ou limiares nativos usados no transplante.
2. **Diagnóstico por medida isolada:** estenose de anastomose concluída por uma velocidade sem medida comparativa nem confirmação.
3. **Rejeição presumida:** IR elevado convertido em rejeição, ou tipo de rejeição nomeado, sem dado que sustente.
4. **Trombose ou ausência de fluxo** sem destaque de urgência, ou, ao contrário, afirmada a partir de um preset.
5. **Coleção perienxerto classificada** como linfocele, urinoma ou hematoma só pela aparência, sem que o médico escolha.
6. **Localização confundida com lateralidade,** ou rins nativos descritos como se fizessem parte do enxerto.
7. **Falsa normalidade residual:** a frase normal de anastomose, veia ou parênquima permanece depois de um achado alterado ou de uma limitação.
8. **Persistência após desfazer:** razão, alerta ou recomendação que continua no texto depois de apagar a medida.
9. **Recomendação automática** publicada sem confirmação.

O que for observado é comportamento do concorrente. Nenhum limiar, do concorrente ou do arquivo em quarentena, deve virar regra sem fonte específica de transplante renal e revisão médica.

## Para o crosswalk que virá depois

- Decidir e registrar o código canônico. Ele não pode ser uma variante implícita de `DOPPLER_RENAL` (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:38`). Também é preciso delimitar a fronteira com "Aparelho urinário com Doppler" (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:17`).
- Fechar a curadoria da fonte de transplante renal antes de promover qualquer conteúdo de `__rev__`.
- Avaliar se o ingestor manual deve excluir `__rev__` como o webhook já faz. Isso é governança de conhecimento, não código clínico, e não foi alterado nesta rodada.
- Para evitar que um ditado de enxerto passe pelo writer nativo, considerar um bloqueio ou aviso quando um ditado de enxerto chegar ao writer `DOPPLER_RENAL`.
- O contrato mínimo deve ter localização do enxerto separada de lateralidade, estruturas do enxerto com os estados não avaliado, normal, alterado e limitado, derivações determinísticas que preservem as medidas de origem, e confirmação médica antes de qualquer conclusão de estenose, trombose ou disfunção.
- Antes de ativar, testar normal, alterado, incompleto, localização, unidades, limites e serialização ponta a ponta nas três plataformas (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:66`).
