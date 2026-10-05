# Preflight — Doppler de carótidas e vertebrais

Data: 05/10/2026. Rodada preparatória somente de leitura, sem navegador e sem dados de pacientes, feita no worktree `docs/laudario-preflights-2026-10-05` (HEAD `4d5ad45`). Este arquivo não altera código clínico, fila nem status do estudo. Ele prepara a observação do operador e o crosswalk.

Segue o guia (`docs/competitor-research/laudario/GUIA-CLAUDE-CODE.md:15`, `:44-50`, `:57-65`) e o formato de caso de `~/.codex/skills/laudario-product-study/references/record-schema.md`.

## 1. Escopo e limites

- Exame do concorrente: "Doppler de Carótidas e Vertebrais". Código LaudoUSG: `DOPPLER_CAROTIDAS`. A busca por `carót` em `fila-e-mapa-canonico-2026-10-03.md` e `status-estudo-2026-10-03.json` não retornou nada; a linha do mapa canônico fica para o crosswalk.
- Limites: um exame, no máximo três cenários sintéticos, só a interface visível, sem endpoints privados, sem copiar, imprimir ou finalizar o laudo, e com o modelo restaurado ao final. Não reproduzir frases do concorrente. Um achado do concorrente não vira requisito clínico (`GUIA-CLAUDE-CODE.md:19`).

## 2. Concorrente: observado, inferido e não observado

| Rótulo | Conteúdo | Evidência |
| --- | --- | --- |
| `observado` | O exame consta no grupo vascular arterial do catálogo, separado de "Artérias Temporais" | `catalogo-ultrassonografia-2026-10-02.json:15` |
| `inferido` | Carótidas e vertebrais formam um único modelo, porque o catálogo as nomeia juntas | mesma linha |
| `não observado` | Segmentos, campos, VPS/VDF, razões, placas, EMI, vertebrais, critérios de estenose, presets, conclusão, recomendações e restauração | nenhuma rodada funcional |

## 3. Estado atual no LaudoUSG

| Camada | Estado | Evidência |
| --- | --- | --- |
| Web | **estruturado ativo** (contrato local da API, não compartilhado) | Está em `STRUCTURED_WEB_CATEGORY_CODES` (`apps/web/src/lib/writerCategories.ts:4`) e fora do writer (`:14-28`). Aparece no grupo **Medicina interna**, não em Vascular (`apps/web/src/components/laudar/categoryGroups.ts:29` vs `:55`), com aliases em `:90`. Formulário por lado e conclusão (`apps/web/src/lib/deterministic/organs/dopplerCarotidas.ts:4-33`; `apps/web/src/components/laudar/DopplerCarotidasFormPanel.tsx:18-49`). Categoria migrada (`apps/web/src/lib/catalog/migradas.ts:37`). Adaptador (`apps/web/src/lib/catalog/dopplerCarotidasParaCatalogo.ts:58-73`) chamado em `LaudarWebExperience.tsx:584-585`. O render é feito por `/api/catalog/[category]/render` → `renderizarSelecao` → registro do modelo normal (`apps/api/src/server/renderer/catalog/modeloNormalRegistry.ts:245-251`). Companion de imagem em `apps/web/src/lib/companionStructured.ts:52-93` |
| Android/RN | **genérico** com assistente de imagem | Aparece no seletor (`apps/mobile/src/ui/tokens.ts:146`; `apps/mobile/src/features/generate/categories.manual.ts:8`). Não é `ClinicalModelCode`, portanto segue o fluxo de ditado de `app/generate.tsx:123`. A extração por imagem existe (`apps/mobile/src/features/imaging/imageAnalysis.ts:17`, `:62-63`, `:81`; `apps/mobile/src/features/companion/CompanionSheet.tsx:164`) |
| iOS | **genérico** com assistente de imagem | `case dopplerCarotidas` (`Models/Category.swift:27`), selecionável (`:50-54`) e fora de `isPendingClinicalActivation` (`:63-71`). Usa o fluxo de ditado de `GenerateView.swift:75`. Imagem vira texto de medidas e placas, incluindo IR (`Services/ImageAnalysisService.swift:146-166`) |
| API — rota de ditado | **renderer dormente** / writer | Normalização `/car[óo]tid/` (`apps/api/src/server/pipeline/categoryNormalization.ts:52`). Renderer e extração existem (`pipeline/renderer.ts:542`, `:851-852`; `renderer/extraction.ts:141`, `:356-359`). O caminho depende de `RENDERER_CATEGORIES`, porque o código não está em `APPROVED_CLINICAL_RENDERERS` (`pipeline/generationPathResolver.ts:83-90`). Esse gate estava vazio em produção em 03/10 (`crosswalk-doppler-aortorrenal-2026-10-03.md:17`), então o ditado vai para o writer genérico com RAG |
| API — writer e contratos | **ausente** | Sem entrada em `CATEGORY_CONTRACTS` (`apps/api/src/server/prompts/contracts/index.ts:36-50`). Não há auditoria nem guard específico de carótidas em `server/` (busca por `carot`) |
| Shared | **ausente** | Não está em `ClinicalModelCodeSchema` (`packages/shared/src/clinicalModels/contracts.ts:3-10`); só tem rótulo (`packages/shared/src/categoryPresentation.ts:34`) |
| Seed | código presente | `packages/db/src/seeds/data.ts:112`. A linha não prova fluxo ativo |
| Conhecimento | **ausente** | Não há `packages/knowledge/snippets/DOPPLER_CAROTIDAS`. O ASR só associa o grupo genérico "vascular" (`apps/api/src/server/asr/medicalGlossary.ts:186`) |
| Testes | parcial | Um teste manual do renderer (`apps/api/src/server/renderer/__tests__/doppler-carotidas.manual.ts`) cobre um caso normal com vertebral anterógrada explícita e um caso alterado com classificação explícita. Não cobre estado vazio, vertebral retrógrada nem conflito entre placa e classificação |

**Conclusão (`observado` no código):** a mesma categoria usa duas fontes diferentes. A Web envia o formulário ao renderer canônico. O mobile envia o ditado ao writer genérico enquanto o gate estiver vazio. Corpo e conclusão podem divergir para o mesmo caso conforme a plataforma.

## 4. Cobertura do schema e do renderer (`apps/api/src/server/renderer/categories/DOPPLER_CAROTIDAS.ts`)

- **Segmentos:** carótida comum, interna e externa, com VPS e VDF cada uma, por lado (`:3-6`, `:17-21`). Não há bulbo, segmentos proximal/médio/distal da ACI, subclávia nem tronco braquiocefálico.
- **Vertebral:** só VPS e direção `anterogrado | retrogrado | ausente` (`:22-25`). Não há VDF, segmento, fluxo bidirecional ou alternante, nem diâmetro.
- **EMI:** um valor por lado, sem local de medida (`:18`). Placas: localização em texto livre, composição, superfície, espessura e "estenose informada" (`:8-15`).
- **Derivados:** o renderer calcula IR para todo vaso que tenha VPS e VDF (`:143-153`). **Não há razão ACI/ACC** nem outro índice. A classificação de estenose não é derivada, só copiada quando ditada (`:134-138`; aviso na Web em `DopplerCarotidasFormPanel.tsx:26`).
- **Classificação:** enum único (`:32-41`) com um só lado (`:42`). Não representa graus diferentes em cada lado, como estenose de 50 a 69% à direita e oclusão à esquerda.

Falsa normalidade e conclusão (`observado` no código; o efeito no texto final ainda é `inferido` e deve ser provado em teste):

1. **Normalidade por omissão no modo clássico:** sem EMI, o texto afirma complexo médio-intimal de aspecto habitual (`:185-186`). Sem placas, afirma ausência de placas também no modo objetivo (`:188`). Sem direção da vertebral, afirma fluxo anterógrado (`:204`), inclusive quando a Web envia "Não informado" (`DopplerCarotidasFormPanel.tsx:46` → `dopplerCarotidasParaCatalogo.ts:45`).
2. **Técnica fixa bilateral:** declara avaliação bilateral de carótidas e vertebrais (`:235`). Não existe estado "não avaliado" ou "limitado" por vaso.
3. **Preset normal na Web:** o estado inicial já marca `classificacao: 'normal'` e `vertebral_direcao: 'anterogrado'` (`apps/web/src/lib/deterministic/organs/dopplerCarotidas.ts:9`, `:18`). Esse estado é materializado ao abrir a categoria (`apps/web/src/lib/deterministic/compose.ts:44-45`; `LaudarWebExperience.tsx:412`). O registro também usa `classificacao_explicita: "normal"` como seed (`modeloNormalRegistry.ts:249`).
4. **Conclusão "normal" ignora os achados:** o caso `normal` (`:219`) não verifica placas, estenose informada, VPS, vertebral retrógrada ou ausente, nem `achados_adicionais`. Na Web, quem adiciona uma placa com estenose informada sem trocar a classificação recebe a placa no corpo e conclusão normal (`inferido`; testar no C2).
5. **Classificação vazia:** sem placas, a conclusão volta a ser normal (`:220-223`), mesmo com vertebral retrógrada ou ausente, ou com velocidades informadas.
6. **`achados_adicionais`** é anexado depois do bloco de achados e nunca chega à conclusão (`:241`). `conclusao_livre` substitui a conclusão inteira (`:209`).
7. **Lateralidade:** a conclusão usa só `lado_classificacao`. Com classificação e lado vazio, sobra um espaço antes do ponto final, como em "50% ." (`:215-218`; o `replace("  ", " ")` não corrige isso). Uma oclusão não diz se é da ACI ou da ACC (`:218`).
8. **Unidades e plausibilidade:** a Web aceita qualquer número positivo, sem faixa (`dopplerCarotidasParaCatalogo.ts:10-13`). Uma EMI digitada como 8 em vez de 0,8 mm passa. A única pendência bloqueante é VDF maior que VPS e percentual acima de 100 (`:19-37`). A extração pede conversão para cm/s e mm (`DOPPLER_CAROTIDAS.ts:138`), mas não registra a unidade original.
9. **Texto:** o enum de composição sai sem acento ("lipidica"; `:160`). O corpo usa "PSV" (`:150`), enquanto o restante do produto usa VPS. Isso precisa de decisão de estilo.

## 5. Etapa 0 — inventário do concorrente, sem alterar nada

- Segmentos oferecidos por lado: ACC, bulbo, ACI (segmentada ou não), ACE, vertebral (segmentos), subclávia e inominada. Registre só o que aparecer.
- Estados por vaso: normal, alterado, não avaliado e limitado. Verifique se existe "não visualizado".
- Velocidades: VPS e VDF por vaso, unidade exibida e se há razão ACI/ACC ou outro índice calculado automaticamente.
- EMI (local e unidade), placas (campos, múltiplas por lado) e estenose (digitada, por critério ou calculada). Se houver critérios, registre que existem e onde ficam, sem copiar valores.
- Vertebral: opções de direção, incluindo fluxo alternante, e se o roubo da subclávia aparece como conclusão.
- Conclusão: automática ou livre, por lado, e se há recomendação.

## 6. Cenários sintéticos (máximo 3)

Use paciente fictício, sem nome, data real ou imagem. Mude uma variável por vez e restaure o modelo antes do próximo.

**C1 — Normal (estado inicial).** Entrada: o modelo como abre. Registrar: quais vasos e lados o texto afirma normais sem nenhuma medida; se a técnica declara avaliação bilateral; se a direção vertebral vem pré-marcada; como a conclusão normal é formulada.

**C2 — Estenose unilateral da ACI direita.** Entrada: só ACI direita com VPS 280 cm/s e VDF 95 cm/s e placa no bulbo direito, valores sintéticos. Deixe o resto intocado. Registrar: se o grau é derivado sozinho e de quais campos; se aparece razão ACI/ACC ou exigência de VPS da ACC; se o lado chega correto à conclusão; se o lado esquerdo continua normal sem dados; se há recomendação. Fronteira opcional: apagar a VPS e verificar se classificação ou texto permanecem.

**C3 — Vertebral alterada ou limitada.** Entrada: vertebral esquerda com fluxo invertido. Se a interface não oferecer essa opção, marque-a como não avaliada ou limitada. Registrar: se a conclusão muda; se surge hipótese de roubo da subclávia e se ela exige dado da subclávia; se a limitação aparece no corpo e na conclusão; se o lado contralateral continua afirmado.

Registrar cada cenário no formato `scenarios[]` do record-schema (`input`, `cascades`, `output`, `reset_verified`).

## 7. Riscos e candidatos a lacuna

Nenhum item é `gap confirmado`, porque a Web tem fluxo estruturado ativo e as três plataformas não estão ausentes ao mesmo tempo.

1. **Falsa normalidade por padrão:** EMI, placas, vertebral anterógrada e técnica bilateral são afirmadas sem dado (§4.1–4.3), em especial na Web, que nasce com a classificação "normal".
2. **Conclusão normal com achado no corpo:** com classificação `normal` ou vazia, a conclusão ignora placa, estenose informada, vertebral retrógrada ou ausente e `achados_adicionais` (§4.4–4.6).
3. `candidato a lacuna` **estados por vaso:** não há "não avaliado" nem "limitado" no schema. Isso vale para a Web (formulário) e para a API (contrato), e falta confirmar no prompt mobile.
4. `candidato a lacuna` **razão ACI/ACC e graus por lado:** não há derivado de razão e só existe uma classificação para o exame (§4, "Classificação").
5. **Divergência entre plataformas:** a Web usa o renderer e o mobile usa o writer genérico, sem contrato compartilhado nem snippets (§3). O mesmo ditado pode gerar conclusões diferentes.
6. `candidato a lacuna` **vertebral incompleta:** sem VDF, segmento ou fluxo alternante. O `ausente` não distingue oclusão de não visualização.
7. **Lateralidade e unidade:** lado vazio na conclusão, oclusão sem vaso, EMI e VPS sem faixa de plausibilidade (§4.7–4.8).

## 8. Melhorias sugeridas ao LaudoUSG

Estas sugestões não são decisões de produto. Critérios de estenose, faixas e limiares dependem de fonte clínica própria, como consenso de sociedade, e de revisão médica. Nenhum limiar do concorrente será adotado.

| # | Controle ou estado | Efeito no corpo e na conclusão | Condições | Web e prompt mobile | Prioridade | Evidência e o que falta validar |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Estado por vaso e lado: `não avaliado`, `normal`, `alterado`, `limitado` | Sem estado normal explícito, o texto não afirma normalidade. A técnica e a conclusão se restringem ao que foi avaliado | O estado inicial é "não avaliado", ou "normal" só com preset explícito do médico | Web: seletor por vaso substitui o preset. Mobile: o prompt pede que o médico diga o que avaliou e ensina que o silêncio não é normalidade | P0 | Melhora o existente (§4.1–4.3). Validar o C1 no concorrente e o efeito no modelo normal da Biblioteca (`modeloNormalRegistry.ts:245-251`) |
| M2 | Guarda de coerência na conclusão | Placa, estenose informada, vertebral retrógrada ou ausente e `achados_adicionais` impedem a conclusão "normal" e geram pendência de classificação | Nunca deriva grau sozinho. Só bloqueia ou sinaliza | Web: pendência bloqueante, como `dopplerCarotidasParaCatalogo.ts:22-37`. Mobile: guard pós-writer só sinaliza | P0 | Melhora o existente (§4.4–4.6). Criar testes de estado vazio, placa sem classificação e vertebral retrógrada |
| M3 | Classificação por lado e vaso (ACI/ACC) | A conclusão lista cada lado com o vaso. Oclusão sempre nomeia o vaso | Grau só por seleção ou ditado do médico até haver critério aprovado | Web: dois seletores (D e E). Mobile: o prompt pede lado e vaso | P1 | `candidato a lacuna` (§7.4). Validar o C2 |
| M4 | Razão ACI/ACC como derivado determinístico | Aparece no corpo como medida. Não classifica | Calcular só com VPS da ACI e da ACC do mesmo lado. Arredondamento e posição definidos pelo médico | Web: campo calculado e somente leitura. Mobile: o writer não calcula; o renderer calcula | P1 | `candidato a lacuna`. Exige decisão clínica sobre utilidade e local de medida da ACC |
| M5 | Vertebral ampliada: VDF, fluxo alternante e não visualizada separada de ausente | Fluxo alternante ou retrógrado vira item da conclusão; não visualizada vira limitação | Hipótese de roubo da subclávia só com confirmação médica | Web: enum ampliado. Mobile: o prompt cobre "invertido" e "alternante" | P1 | `candidato a lacuna`. Validar o C3 |
| M6 | Plausibilidade e unidade (EMI, VPS e placa) | Valor fora da faixa gera pendência em vez de texto | Faixas definidas por fonte clínica | Web: aviso no campo. Mobile: o extrator registra a unidade original | P2 | Melhora o existente (§4.8) |
| M7 | Contrato compartilhado e caminho único no mobile | A mesma fonte gera corpo e conclusão nas três plataformas | Ativar com gate só depois dos testes ponta a ponta (`GUIA-CLAUDE-CODE.md:96`) | Contrato em `packages/shared`, consumido pelo formulário Web e pelo prompt mobile | P1 | §3, §7.5. Decidir entre ligar `RENDERER_CATEGORIES` ou criar contrato v1 |
| M8 | Ajustes de texto: acento em "lipídica", sigla VPS e PSV, espaço antes do ponto final | Só redação | Revisão de estilo Domingos | — | P3 | §4.7, §4.9 |

Mover a categoria para o grupo Vascular da Web (`categoryGroups.ts:29` → `:55`) é uma melhoria de navegação, separada das clínicas acima. Avisar o orquestrador: M1 e M2 também se aplicam a outros renderers Doppler com preset normal, e o preflight de artérias temporais já apontou o risco de `achados_adicionais` (`preflight-doppler-arterias-temporais-2026-10-03.md`).
