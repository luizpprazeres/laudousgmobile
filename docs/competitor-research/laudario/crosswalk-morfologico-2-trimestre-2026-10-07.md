# Cruzamento Laudário × LaudoUSG — Morfológico 2º Trimestre (cenários clínicos)

Data: 07/10/2026. Base LaudoUSG: `main` @ `ca0b55e`. Observação do concorrente em [cases/morfologico-2-trimestre-2026-10-07.md](cases/morfologico-2-trimestre-2026-10-07.md). O complemento de gráficos do mesmo exame está em [crosswalk-morfologico-2-trimestre-graficos-2026-10-07.md](crosswalk-morfologico-2-trimestre-graficos-2026-10-07.md) e [cases/morfologico-2-trimestre-graficos-2026-10-07.md](cases/morfologico-2-trimestre-graficos-2026-10-07.md). A auditoria de requisitos de base é [audits/lote2/morfologico-2-trimestre-2026-10-05.md](audits/lote2/morfologico-2-trimestre-2026-10-05.md).

O estado do LaudoUSG foi provado com o probe sintético `audits/probes/probe-morfologico-2026-10-05.ts`, executado em `ca0b55e` sem alterar o repositório. Afirmações sobre o LaudoUSG sem execução estão marcadas como inferidas do código.

Rótulos: `observado` (concorrente, nesta rodada); `inferido`; `candidato a lacuna`; `gap confirmado` (ausente no Web, Android/RN, iOS e no contrato compartilhado aplicável); `defeito confirmado` (comportamento errado provado por execução no LaudoUSG).

## 1. Estado por plataforma (inalterado desde 05/10, exceto onde indicado)

| Plataforma | Onde | Classificação |
| --- | --- | --- |
| Web | `apps/web/src/lib/deterministic/organs/morfologico.ts` + `apps/web/src/lib/catalog/morfologicoParaCatalogo.ts` → renderer canônico | **estruturado ativo**, anatomia em 4 sistemas com Normal/Alterado/Limitada (`morfologico.ts:355-420`) |
| API (ditado) | `apps/api/src/server/renderer/categories/MORFOLOGICO.ts` (`render2t3t` :1011) | **estruturado dormente** (`RENDERER_CATEGORIES` default vazio, `env.ts:74`) |
| Writer | `packages/knowledge/snippets/MORFOLOGICO/`; `pipeline/writerV2/specs/MORFOLOGICO.json:314` (descrição literal do trato urinário) | **genérico** com template de normalidade embutida |
| Android/RN | fluxo genérico de ditado | **genérico** |
| iOS | fluxo genérico de ditado; nenhuma ocorrência de pelve renal, pielectasia ou pé torto no repositório Swift | **genérico** |
| shared | sem modelo clínico de anatomia fetal em `packages/shared/src` | **ausente** |

## 2. Cenários lado a lado

| Cenário | Laudário (`observado`) | LaudoUSG `ca0b55e` | Classificação |
| --- | --- | --- | --- |
| Baseline sem dados | laudo normal detalhado publicado; anatomia por 9 regiões; conclusão de morfologia normal com IG em branco | 4 sistemas nascem normais (`morfologico.ts:405`), líquido nasce normal (`:518`); conclusão: IG `____`, líquido normal e morfologia sem alteração. Cordão, orifício interno e biometria vazios já são omitidos (correção de 06/10) | **defeito confirmado nos dois produtos** (P0) |
| Pelve renal esquerda 7 mm, direita vazia, sem IG | classe A2-3 automática; corpo com 7,00 mm e placeholder no lado direito; conclusão A2/A3 sem IG; cinco recomendações; remoção limpa | Web: só via “Vísceras alterado” com texto livre; a frase de estômago, bexiga, rins e aorta **some inteira**; a descrição vai para o fim do corpo; sem classe e sem recomendação (probe M2). API: `OBSTETRICA.classico.ts:701-713` tem variante de pielectasia por lado com conduta por IG (corte de 32 semanas), mas **só no catálogo obstétrico** e com `____` na pelve não medida (`:385-386`, `inferido` do código, não executado) | granularidade renal: **defeito confirmado** (M2). Classificação urinária A1/A2-3: **gap confirmado**. Pielectasia lateral no MORFOLOGICO: **gap confirmado**; no OBSTETRICA da API: parcial |
| Pé torto direito | controle de membros; corpo e conclusão laterais; síntese normal retirada; recomendações de eco fetal, medicina fetal e genética; remoção limpa | sem grupo de membros; só por texto livre em Achados adicionais, que agora **bloqueia** sem conclusão correspondente (`morfologicoParaCatalogo.ts:110`; probe M3). Sem lado estruturado e sem recomendação | membros e pé torto estruturados: **gap confirmado** (nenhuma ocorrência em Web, API, RN, iOS, shared ou snippets) |

## 3. Comportamento útil do concorrente

- Anatomia organizada por região anatômica completa: cabeça/SNC, face, cervical, coluna, tórax, coração, abdome, pelve e membros (`observado`). Corresponde ao modelo por estrutura proposto em §5.1 da auditoria de 05/10.
- Malformação de membro com controle próprio e lado estruturado, gerando item de conclusão e retirando a síntese global (`observado`).
- Medida renal lateral chegando ao corpo e à conclusão (`observado`).
- Remoção limpa: desmarcar o achado restaura o laudo normal, sem resíduo de classe ou recomendação (`observado`). O LaudoUSG já se comporta assim (probe M6).

## 4. Comportamento que não deve ser reproduzido

- **Normalidade publicada sem dado** na abertura do modelo (`observado`). Contraria o requisito de estado explícito por estrutura.
- **Classificação da dilatação urinária sem IG** (`observado`). O limiar muda com a idade gestacional (`candidato`, consenso de dilatação do trato urinário, corte a aprovar). Sem IG, a classe deve ficar pendente, nunca escolhida em silêncio. O LaudoUSG já aplica essa regra à conduta da pielectasia obstétrica (`OBSTETRICA.classico.ts:418-436`).
- **Placeholder no lado não medido** (`observado`). O lado sem valor deve ser omitido ou registrado como não medido. O catálogo obstétrico do LaudoUSG tem o mesmo risco (`inferido` do código).
- **Duas casas decimais em milímetros** (7,00 mm) (`observado`): precisão espúria.
- **Pacote amplo de recomendações automáticas** (eco fetal para achado renal; investigação genética para pé torto) (`observado`). Recomendações devem ser sugeridas, confirmadas e publicadas em estados separados, com revisão médica do conteúdo. O estado de publicação no concorrente não foi determinado nesta rodada.

## 5. Contrato mínimo proposto (original, a aprovar)

Uma identidade por conceito no contrato compartilhado, consumida igualmente pelo formulário Web e pelo extrator do ditado:

| Conceito | Dados mínimos | Corpo | Conclusão | Salvaguardas |
| --- | --- | --- | --- | --- |
| `estrutura_estado` (por região) | `nao_avaliada` / `normal` / `alterada` / `limitada` + motivo | frase da região só quando `normal` ou `alterada` | síntese global só com todas as obrigatórias `normal` | nada nasce `normal`; ação “anatomia normal” explícita e registrada |
| `pelve_renal` | lado + AP em mm (uma casa decimal no máximo) + IG | medida por lado informado; lado não medido omitido | item com lado e medida; classe só com IG e corte aprovado | sem IG → classe pendente; não espelhar o outro lado |
| `pe_torto` | lado (D/E/bilateral) | posição do pé no grupo de membros | item com lado | lado obrigatório; nunca presumir bilateral |
| `recomendacao` | tipo (lista fechada) + vínculo ao achado + estado `sugerida/confirmada/publicada` | — | só quando `publicada` | eco fetal e investigação genética só por confirmação médica; reaproveitar o padrão de `ecocardiografiaFetal.ts:283-298` |

## 6. Melhorias sugeridas ao LaudoUSG

### 6.1 Remover a normalidade inicial da anatomia e do líquido — P0 — corrige **defeito confirmado**

- **Controle:** cada região começa em “não avaliada”; botão “Anatomia normal” marca todas e fica registrado; líquido começa em “não avaliado”.
- **Corpo/conclusão:** região não avaliada não gera frase; a síntese “morfologia sem alteração” só aparece com todas as regiões obrigatórias normais.
- **Salvaguardas:** pendência bloqueante quando a síntese seria emitida sem nenhuma região avaliada.
- **Web:** alterar `initialState` de `anatomiaModule` (`morfologico.ts:405`) e de `extraFetalModule` (`:518`); `anatomia_avaliada` deixa de ser `true` fixo (`morfologicoParaCatalogo.ts:397`).
- **Prompt mobile:** silêncio = não avaliado; nunca afirmar região normal sem menção ou sem “morfologia normal” ditada explicitamente.
- **Evidência:** probe M1 em `ca0b55e`; baseline do concorrente com o mesmo defeito. Validar com o médico se o modelo oficial do ditado mantém a normalidade embutida.

### 6.2 Quebrar “Vísceras” e criar rins por lado com pelve renal estruturada — P1 — corrige **defeito confirmado** (M2) e **gap confirmado**

- **Controle:** estômago, intestino, parede abdominal, bexiga, rim direito e rim esquerdo com estado próprio; pelve renal AP em mm por lado.
- **Corpo/conclusão:** marcar um rim não apaga as demais estruturas; a medida entra no bloco de anatomia, não no fim do corpo; item de conclusão com lado e medida.
- **Salvaguardas:** classe de dilatação só com IG e corte aprovado; sem IG → pendência; lado não medido omitido; uma casa decimal no máximo.
- **Web:** nova lista em `ANATOMIA_SISTEMAS` (`morfologico.ts:355`) e frases correspondentes no renderer (`MORFOLOGICO.ts:587-633`). Reaproveitar a lógica de conduta por IG do catálogo obstétrico (`OBSTETRICA.classico.ts:418-436`) em vez de duplicá-la.
- **Prompt mobile:** extrair lado e medida; sem lado → pendência; nunca concluir classe sem IG.
- **Evidência:** probe M2; C2 do concorrente. Validar com o médico: corte de classificação, se a classe aparece no laudo e o texto da conduta.

### 6.3 Grupo de membros com pé torto lateralizado — P1 — corrige **gap confirmado**

- **Controle:** membros superiores e inferiores com estado por lado; alteração “pé torto” com lado obrigatório.
- **Corpo/conclusão:** descrição no grupo de membros; item lateralizado na conclusão; síntese global retirada.
- **Salvaguardas:** sem lado → pendência bloqueante; nunca bilateral por omissão; `physicianConfirmed` antes de publicar malformação estrutural.
- **Web:** novo grupo na anatomia; hoje o caminho é texto livre com bloqueio (`morfologicoParaCatalogo.ts:110`).
- **Prompt mobile:** pé torto exige lado ditado; sem lado → pendência.
- **Evidência:** C3 do concorrente; probe M3. Validar a redação original no estilo da casa.

### 6.4 Recomendações com estado próprio no morfológico — P1 — melhora algo existente (`candidato a lacuna`)

- **Controle:** lista fechada vinculada ao achado (reavaliação ultrassonográfica, US pós-natal, eco fetal, medicina fetal, aconselhamento genético), com estados sugerida/confirmada/publicada.
- **Corpo/conclusão:** só a recomendação publicada entra, separada do item diagnóstico. A frase de eco fetal hoje embutida no item do golf ball (`golfBall.ts:139`) passaria a ser recomendação vinculada.
- **Salvaguardas:** nenhuma recomendação publicada automaticamente; investigação genética e eco fetal sempre por confirmação médica; desfazer o achado remove a sugestão.
- **Web:** padrão já existente em `ecocardiografiaFetal.ts:283-298`.
- **Prompt mobile:** recomendação só quando ditada; nunca inferida do achado.
- **Evidência:** C2 e C3 do concorrente (pacote amplo e de utilidade clínica discutível). Depende de revisão médica do conteúdo de cada recomendação.

### 6.5 Placeholder da pelve renal não medida no catálogo obstétrico — P1 — `inferido` do código, a provar

- A variante `pielectasia` (`OBSTETRICA.classico.ts:706`) descreve as duas pelves; o lado sem medida vira `____` (`:385-386`). O concorrente mostrou o mesmo padrão.
- **Proposta:** descrever só os lados medidos e incluir a medida do lado afetado entre os placeholders obrigatórios.
- **Validação:** executar um caso sintético com uma só pelve medida antes de classificar como defeito confirmado.

## 7. Provas necessárias antes de ativar

Baseline sem dados sem nenhuma frase anatômica nem síntese normal; pelve renal esquerda com e sem IG (classe pendente sem IG); IG abaixo e acima de 28 semanas no mesmo valor; lado não medido omitido; pé torto sem lado bloqueado; recomendação sugerida fora do laudo até confirmação; remoção de cada achado sem resíduo; paridade entre Web, ditado (API) e writer mobile no mesmo caso.

## 8. Insumo para a síntese clínica

- **Estruturas observadas no concorrente:** cabeça/SNC, face, cervical, coluna, tórax, coração, abdome, pelve, membros; placenta, líquido e cordão.
- **Estados observados:** normal por padrão; alterações selecionáveis por região. Estados limitado/não avaliado **não verificados**.
- **Medidas e unidades:** pelve renal em mm por lado (exibida com duas casas decimais).
- **Dependências:** medida renal → classe A2-3 → estado do trato urinário → recomendações; achado de membro → item lateral → retirada da síntese → recomendações.
- **Corpo:** medida lateral; posição do pé. **Conclusão:** classe da dilatação; pé torto com lado; retirada da síntese normal.
- **Riscos que exigem confirmação médica:** corte da classificação urinária por IG; recomendações de eco fetal, genética e medicina fetal; redação das malformações.

## 9. Pendências para a próxima rodada

Ainda **não observados**: estado limitado/não avaliado por estrutura ou subplano cardíaco; marcador isolado (foco ecogênico) e contagem de marcadores; ossos longos por lado; estado de publicação das recomendações e controle mestre; classificação urinária com IG informada (abaixo e acima de 28 semanas); texto livre gerando ou não item de conclusão.
