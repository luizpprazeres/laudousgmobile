# Preflight — Doppler de artérias temporais

Data: 03/10/2026. Rodada preparatória somente de leitura, sem navegador e sem dados de pacientes. Este arquivo não altera código clínico, a fila nem o status do estudo; ele prepara a observação do operador e o crosswalk seguinte.

Este preflight segue o guia (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:15`, `docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:44-50`) e a skill `laudario-product-study` (`~/.codex/skills/laudario-product-study/SKILL.md`), inclusive o formato de caso em `references/record-schema.md`.

## Escopo e limites

- Exame: Doppler de artérias temporais. Ainda não existe linha no mapa canônico (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:26-38`); o código fica para o crosswalk.
- Motivo e prova mínima pela fila: ausente e clinicamente sensível; testar normal, halo e dado unilateral incompleto (`docs/competitor-research/laudario/fila-e-mapa-canonico-2026-10-03.md:13`).
- Limites: um exame, no máximo três cenários sintéticos, interface normal, sem endpoints privados, sem copiar, imprimir ou finalizar, e restaurar o modelo ao final. Achado do concorrente não é requisito clínico (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:19`).

## Concorrente: observado, inferido e não observado

| Rótulo | Conteúdo | Evidência |
| --- | --- | --- |
| `observado` | "Doppler de Artérias Temporais" consta no atalho vascular arterial do catálogo, ao lado de Arterial MMII/MMSS, Carótidas e Vertebrais e FAV | `docs/competitor-research/laudario/catalogo-ultrassonografia-2026-10-02.json:15` |
| `inferido` | nenhuma inferência sobre o comportamento; a única leitura possível é que o concorrente trata o exame como categoria própria, e não como variante de carótidas, porque o catálogo os lista separadamente | mesma linha |
| `não observado` | abas, ramos e segmentos oferecidos, sinais morfológicos (halo, compressão), medidas, limiares, presets, conclusão, recomendações e restauração | nenhuma rodada funcional; o exame está na fila (`docs/competitor-research/laudario/status-estudo-2026-10-03.json:163`) |

## Estado atual no LaudoUSG

Uma busca por `temporais`, `artéria temporal`, `arterite`, `Horton`, `células gigantes`, `vasculite` e `polimialgia` em `apps/web/src`, `apps/mobile/src`, `apps/mobile/app`, `apps/api/src`, `packages/shared/src`, `packages/db/src`, `packages/knowledge/snippets`, `supabase/migrations` e no app iOS não retornou nenhuma ocorrência clínica. Na documentação, o exame aparece só como categoria futura, que "só entra depois de contrato clínico, modelo normal, alterações prioritárias e golden tests" (`docs/stories/2026-09-01-sprint-23-auditoria-clinica-categorias.md:57`; ver também `docs/plano-produto-web-sprints-15-22-2026-08-31.md:115`).

| Camada | Estado | Evidência |
| --- | --- | --- |
| Web | **ausente** | não está em `STRUCTURED_WEB_CATEGORY_CODES` nem em `WRITER_CATEGORY_OPTIONS` (`apps/web/src/lib/writerCategories.ts:2-24`), nem no grupo Vascular (`apps/web/src/components/laudar/categoryGroups.ts:55`) |
| Android/RN | **ausente** | lista esperada do seletor (`apps/mobile/src/features/generate/categories.manual.ts:5-14`) |
| iOS | **ausente** | `ReportCategory` não tem esse caso (`laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift:3-43`) |
| API | **ausente** | nenhum renderer, writer, auditoria ou regra de normalização; um código não canônico detectado cai no `category_hint` (`apps/api/src/server/pipeline/categoryNormalization.ts:156-166`) |
| Banco versionado | **ausente** | não está no seed (`packages/db/src/seeds/data.ts:58-128`) nem nas migrações de `supabase/migrations/` |
| Shared | **ausente** | `ClinicalModelCodeSchema` tem cinco modelos e nenhum de temporais (`packages/shared/src/clinicalModels/contracts.ts:3-9`) |
| Conhecimento | **ausente** | não há pasta da categoria em `packages/knowledge/snippets/`. A busca textual não encontrou termos de temporais ou arterite no ASR; o grupo vascular existente está definido em `apps/api/src/server/asr/medicalGlossary.ts:80` e é associado genericamente às categorias Doppler em `apps/api/src/server/asr/medicalGlossary.ts:186-193` |

Resultado: **gap confirmado por busca** nas três plataformas e no contrato compartilhado. O crosswalk deve repetir essa busca depois da observação.

### Vizinho mais próximo: `DOPPLER_CAROTIDAS`

A artéria temporal superficial é ramo da carótida externa. Por isso, um médico sem categoria própria tende a ditar o exame em Carótidas ou em Livre. Isso é `inferido` sobre o comportamento do usuário e não foi medido.

- Carótidas tem caminho estruturado na Web (`apps/web/src/lib/writerCategories.ts:4`) e render programático na API (`apps/api/src/server/pipeline/renderer.ts:527`).
- O schema tem carótida comum, interna, externa e vertebral, com VPS e VDF, além de placas (`apps/api/src/server/renderer/categories/DOPPLER_CAROTIDAS.ts:17-28`). Há EMI carotídeo e espessura de placa (`DOPPLER_CAROTIDAS.ts:12`, `DOPPLER_CAROTIDAS.ts:18`), mas não há ramos temporais, espessura de parede temporal, halo nem teste de compressão.
- **Falsa normalidade por padrão, verificada no código:**
  - Sem dados ditados, o modo clássico afirma complexo médio-intimal "de aspecto habitual" (`DOPPLER_CAROTIDAS.ts:186`), ausência de placas (`DOPPLER_CAROTIDAS.ts:188`) e vertebral com fluxo anterógrado (`DOPPLER_CAROTIDAS.ts:204`).
  - A técnica fixa declara avaliação bilateral (`DOPPLER_CAROTIDAS.ts:235`).
  - Sem classificação nem placas, a conclusão padrão é estudo "dentro dos limites da normalidade" (`DOPPLER_CAROTIDAS.ts:219-223`).
- **Achado sem conclusão (`inferido`):** um achado temporal só poderia entrar em `achados_adicionais`, que é anexado ao corpo (`DOPPLER_CAROTIDAS.ts:241`) sem alterar a conclusão. Um halo descrito ali conviveria com uma conclusão normal de carótidas.
- **Arterial MMSS:** contrato compartilhado pendente e oculto (`packages/shared/src/clinicalModels/contracts.ts:6`, `packages/shared/src/clinicalModels/contracts.ts:105`). Não cobre território cefálico.

Esses riscos de falsa normalidade descrevem o renderer de carótidas, usado somente quando `DOPPLER_CAROTIDAS` está em `RENDERER_CATEGORIES` (`apps/api/src/server/pipeline/generationPathResolver.ts:24-43`). A verificação mais recente encontrou esse gate vazio em produção (`docs/competitor-research/laudario/crosswalk-doppler-aortorrenal-2026-10-03.md:17`), portanto o caminho pode estar dormente. O comportamento do writer genérico diante de um ditado de artérias temporais não foi avaliado neste preflight.

### Colisão de vocabulário

Hoje "halo" só tem semântica de nódulo tireoidiano no LaudoUSG: no enum do renderer de tireoide (`apps/api/src/server/renderer/categories/TIREOIDE.ts:45-48`) e no extrator de visão (`apps/api/src/server/vision/extractor.ts:12`). É também descritor tendíneo num modelo de MSK (`apps/api/src/server/renderer/categories/MUSCULOESQUELETICO.ts:193`). Um contrato de temporais precisa de um campo próprio para o halo vascular. Reaproveitar enum ou extrator da tireoide misturaria pontuação e semântica (`inferido`).

## Etapa 0 — inventário, sem alterar nada

- Ramos e segmentos oferecidos (tronco comum, ramos frontal e parietal) e se há outros territórios no mesmo modelo, por exemplo axilares. Registre só o que aparecer.
- Se direito e esquerdo são avaliados de forma independente e se existe "não avaliado" por ramo.
- Sinais morfológicos oferecidos: halo, espessura de parede com unidade, teste de compressão, estenose e oclusão.
- Campos de contexto: indicação, uso prévio de corticoide, sintomas. Registre apenas se existem.
- Qualidade técnica, conclusão, recomendações, e se alguma etapa exige confirmação.
- Se a interface mostra limiares ou critérios: registre que existem e onde ficam, sem copiar valores.

## Cenários sintéticos (máximo 3)

Os cenários usam um paciente fictício, sem nome, data real ou imagem. Mude uma variável por vez e restaure o modelo antes do próximo.

### C1 — Normal bilateral (estado inicial)

- Entrada: o modelo como abre.
- Registrar: quais ramos e lados o texto declara normais sem nenhuma medida; se a normalidade é bilateral por padrão; se a conclusão é formulada como ausência de achado ou como exclusão diagnóstica.

### C2 — Halo unilateral

- Entrada: halo apenas no ramo frontal direito, sem preencher espessura nem compressão.
- Registrar: se a conclusão muda sozinha para hipótese diagnóstica; se exige espessura, compressão ou confirmação; se o lado e o ramo chegam corretos à conclusão; se o lado esquerdo continua normal; se aparece recomendação automática.
- Fronteira opcional: acrescentar uma espessura sintética (por exemplo, 0,8 mm), observar o efeito, apagar tudo e registrar se algum texto, classe ou recomendação permanece.

### C3 — Dado unilateral incompleto

- Entrada: lado direito normal; lado esquerdo não avaliado, ou avaliado só no tronco, se a interface permitir.
- Registrar: se o modelo continua afirmando normalidade bilateral; se a conclusão restringe o escopo ao que foi avaliado; se a limitação aparece no corpo e na conclusão.

## Riscos de falsa normalidade e de lateralidade

1. **Normalidade bilateral por padrão:** ramos ou lado não avaliados aparecem como normais, como já ocorre no renderer de carótidas do LaudoUSG.
2. **Conclusão negativa como exclusão:** "sem sinais" formulado como exclusão diagnóstica quando a avaliação foi parcial ou limitada.
3. **Halo no corpo e conclusão normal:** o achado aparece nos achados, mas a conclusão continua normal (`inferido` para o LaudoUSG via `achados_adicionais`).
4. **Diagnóstico por preset:** hipótese de arterite emitida a partir de um único marcador, sem dado mínimo nem confirmação médica.
5. **Lateralidade e ramo:** troca entre direito e esquerdo ou entre ramo frontal e parietal; achado unilateral generalizado como bilateral.
6. **Persistência após desfazer:** halo, espessura ou recomendação que continua no texto.
7. **Unidade e escala:** espessura sem unidade ou em escala incompatível com uma medida de parede.

O que for observado é comportamento do concorrente. Critérios de positividade e qualquer frase de hipótese diagnóstica só entram no LaudoUSG com fonte clínica específica e revisão médica.

## Para o crosswalk

- Definir o código canônico como categoria própria. Não deve ser uma variante implícita de `DOPPLER_CAROTIDAS`.
- O contrato mínimo deve ter lado e ramo com os estados não avaliado, normal, alterado e limitado; halo e compressão como achados tipados; espessura com unidade; contexto clínico opcional; e conclusão restrita ao escopo avaliado, com confirmação médica para qualquer hipótese de vasculite.
- Avaliar uma proteção no LaudoUSG para que conteúdo temporal ditado em Carótidas não termine com a conclusão padrão normal.
- Antes de ativar, testar normal, alterado, incompleto, lateralidade, ramo, unidades e serialização ponta a ponta nas três plataformas (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:66`).
