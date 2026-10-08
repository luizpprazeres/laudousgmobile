# Cruzamento Laudário × LaudoUSG — Doppler de Artérias Temporais

Data: 07/10/2026. O lado do Laudário vem de `cases/doppler-arterias-temporais-2026-10-07.md`, relato curto de um operador autorizado, com dados sintéticos e modelo restaurado no fim. O lado do LaudoUSG foi conferido no código da `main` em `0b03101` e do iOS em `bce4604`. Também foram executadas duas provas sintéticas só de leitura pelo caminho real da Web: `initialExamState(dopplerArteriasTemporais)` → `adaptarDopplerArteriasTemporais` → `renderDopplerArteriasTemporaisWeb`. São elas a sonda do lote 2 (`audits/probes/probe-temporais-2026-10-05.ts`) e a prova dos cenários do concorrente (`/tmp/probe-temporais-ui-2026-10-07.ts`, fora do repositório). Nenhum código clínico, teste, índice, status ou commit foi alterado. Referências anteriores: `audits/lote2/doppler-arterias-temporais-2026-10-05.md` (base `01155d0`), `audits/preflight-doppler-arterias-temporais-2026-10-03.md` e o preflight `/tmp/laudario-temporais-preflight-2026-10-07.md`.

Rótulos usados:

- **observado**: visto na UI do concorrente ou na execução do LaudoUSG;
- **inferido**: regra provável, ainda sem teste;
- **candidato**: depende de nova sondagem ou de revisão médica;
- **lacuna confirmada**: no LaudoUSG, ausência comprovada na Web, no RN, no iOS e no shared. Quando o defeito é do concorrente, isso vem escrito.

## Síntese

O concorrente cobre quatro famílias de achado: halo, fluxo, compressibilidade e redução ou oclusão. Ele trabalha por lado e não exige nada antes de afirmar um diagnóstico. A conclusão dele **se contradiz**: no mesmo laudo, nega e afirma arterite, e omite a oclusão descrita no corpo. O LaudoUSG é mais seguro em três pontos:

- abre em branco;
- separa lado e ramo;
- só publica a hipótese com halo, segundo marcador e confirmação médica.

Na mesma combinação de achados, o LaudoUSG **não se contradiz**. Ainda assim, ele não tem uma regra explícita de precedência e agregação da conclusão: cada achado de cada ramo vira uma linha. Também não modela redução de fluxo ou estenose segmentar. E continuam abertos os defeitos do lote 2: ramo limitado que herda o normal, qualquer espessura contando como marcador, pendência em seção oculta e paridade mobile.

| Cenário | Laudário (observado) | LaudoUSG no HEAD (observado na prova) | Classificação |
| --- | --- | --- | --- |
| Baseline | quatro grupos normais; laudo normal sem ação do médico | abre em branco; os dois lados bloqueiam com `COVERAGE_REQUIRED` até a escolha explícita de “Normal” (T1/T1b) | o LaudoUSG é **mais seguro**; não reproduzir o concorrente |
| Halo à direita | corpo e conclusão afirmam arterite e inflamação ativa | halo nos 3 ramos D é descrito no corpo e na conclusão; o lado E fica “sem alterações nos segmentos avaliados”; **nenhuma** hipótese (P1) | o LaudoUSG é mais seguro. A conclusão, porém, repete três linhas iguais por ramo (**defeito confirmado P2**, agregação) |
| Halo bilateral | o corpo reflete os dois lados; a conclusão não foi relatada | 6 linhas de conclusão, uma por ramo e lado; nenhuma síntese bilateral (P2) | mesmo defeito P2 |
| Halo ausente + fluxo ausente + não compressível + oclusão, à esquerda | o corpo lista os achados; a conclusão nega e afirma arterite; a oclusão é omitida | sem contradição: o corpo descreve fluxo não detectado, sem halo e compressão positiva por ramo; a conclusão lista compressão positiva e fluxo não detectado nos 3 ramos E, e o D fica sem alterações (P3); com a hipótese pedida, **bloqueia** por falta de halo (P3b) | **lacuna confirmada do concorrente**; o LaudoUSG é coerente, mas não ordena nem agrupa |
| Fluxo ausente + halo + compressão positiva no mesmo ramo | não testado | publica a hipótese confirmada mesmo num ramo sem fluxo (P4) | **candidato** clínico: interpretar os sinais parietais num segmento ocluído |
| Redução de fluxo ou estenose | grupo próprio “redução/oclusão” | não existe: só `flow: detected/not_detected`, VPS livre (`dopplerArteriasTemporais.ts:24`, `:28`) | **lacuna confirmada** (redução); a oclusão está coberta como “fluxo não detectado” |

## Estado por plataforma

| Plataforma | Evidência | Classificação |
| --- | --- | --- |
| Web | formulário `apps/web/src/lib/deterministic/organs/dopplerArteriasTemporais.ts:9-53`; adaptador `apps/web/src/lib/catalog/dopplerArteriasTemporaisParaCatalogo.ts:18-77`, chamado em `apps/web/src/components/laudar/LaudarWebExperience.tsx:677-678`; `apps/web/src/lib/writerCategories.ts:12`; `apps/web/src/lib/catalog/migradas.ts:51`; grupo `apps/web/src/components/laudar/categoryGroups.ts:55`, aliases `:160`; rótulos `apps/web/src/components/historico/HistoryItem.ts:85` e `apps/web/src/components/analytics/types.ts:54,85` | **estruturado ativo** (MVP) |
| API (render Web) | `apps/api/src/server/catalog-api/structuredRenderers.ts:22` → `apps/api/src/server/renderer/categories/dopplerArterialFistulaWeb.ts:36-37`; 409 com conflitos em `apps/api/src/app/api/catalog/[category]/render/route.ts:66-77` | ativo, fail-closed |
| shared | contrato `packages/shared/src/clinicalModels/dopplerArteriasTemporais.ts:11-41`, “pendente de revisão clínica” (`:4`); fora de `ClinicalModelCodeSchema` (`packages/shared/src/clinicalModels/contracts.ts:3-10`); rótulo `packages/shared/src/categoryPresentation.ts:60` | estruturado `web-v1` |
| API (ditado) | sem regra em `apps/api/src/server/pipeline/categoryNormalization.ts:41-60`; um código desconhecido cai no `category_hint` ou volta cru (`:163-169`) | **ausente** |
| Banco e conhecimento | seed só com os Dopplers de `packages/db/src/seeds/data.ts:112-120`; nada em `supabase/migrations`; sem `packages/knowledge/snippets/DOPPLER_ARTERIAS_TEMPORAIS` | **ausente** |
| Android/RN | nenhuma ocorrência em `apps/mobile/src` e `apps/mobile/app`; seletor `apps/mobile/src/features/generate/categories.manual.ts:8-15` | **ausente** |
| iOS | `LaudoUSG/Models/Category.swift:3-44` sem o caso; busca em `*.swift`/`*.json` sem ocorrência | **ausente** |

**Fonte de verdade:** na Web, corpo e conclusão saem da mesma função (`renderDopplerArteriasTemporais`, `dopplerArteriasTemporais.ts:111-175`), que lê um único estado validado. Por isso não há como emitir uma negativa e uma positiva sobre a mesma doença, e foi isso que a prova mostrou. A conclusão, porém, é uma **lista por ramo** (`:150-161`): não ordena por gravidade nem agrupa por lado. No mobile não há entrada; o ditado de temporais não chega ao contrato. Sala e esquema visual não se aplicam.

## Resultados das provas sintéticas no LaudoUSG (07/10)

| Caso | Entrada | Resultado | Classificação |
| --- | --- | --- | --- |
| T1–T7 do lote 2 | sonda de 05/10 | reproduzidos sem diferença no HEAD | — |
| T7 | Normal + parietal E “limitada” | o corpo afirma, no ramo limitado, “fluxo detectável, sem halo” herdados do preset, em duas linhas (`ParaCatalogo:25`; render `:129-149`) | **defeito confirmado P1** |
| T6 | halo + espessura 0,2 mm + hipótese confirmada | publica “compatíveis com arterite”; qualquer espessura conta como marcador (`shared:61-62`; placeholder `0,3` em `organs/dopplerArteriasTemporais.ts:18`) | **defeito confirmado P1** |
| T6b | ramo limitado com halo + espessura + hipótese | a hipótese sai de um ramo limitado (`shared:62`) | candidato (decisão clínica) |
| T3d | lateralidade “Direita” com dado no lado E | pendência numa seção que a lateralidade ocultou (`organs:48-52`; `shared:73-74`) | **defeito confirmado P2** |
| P1/P2 | halo nos 3 ramos D / D e E | 3 / 6 linhas de conclusão quase iguais; nenhuma síntese por lado ou bilateral | **defeito confirmado P2** (agregação) |
| P3 | E: halo ausente + fluxo não detectado + compressão positiva | coerente; a conclusão alterna compressão e fluxo, ramo a ramo, sem ordem clínica | observado; precedência ausente |
| P3b | P3 + hipótese confirmada | bloqueia (`HYPOTHESIS_DATA_INSUFFICIENT`, `shared:97-99`) | observado: salvaguarda funciona |
| P4 | parietal E: halo + compressão positiva + fluxo não detectado + hipótese confirmada | publica a hipótese; nenhum aviso sobre sinais parietais em ramo sem fluxo | candidato (revisão médica) |
| L8 | conteúdo temporal em `achados_adicionais` de Carótidas | a conclusão normal de carótidas não lê esse campo (`packages/shared/src/clinicalModels/dopplerCarotidasWeb.ts:209-220`, `:257-259`) | **defeito confirmado P1** (carótidas) |

## Lacunas confirmadas

**Do concorrente** (observadas; não reproduzir):

1. **Conclusão contraditória.** Nega sinais de arterite e afirma processo inflamatório arterial ativo no mesmo laudo.
2. **Achado do corpo omitido na conclusão.** A oclusão descrita não aparece na conclusão.
3. **Diagnóstico por marcador único.** O halo isolado basta para afirmar arterite e inflamação ativa.
4. **Normalidade presumida.** O modelo abre com laudo normal pronto.

**Do LaudoUSG** (Web, RN, iOS e shared):

5. **Redução de fluxo ou estenose segmentar por ramo.** O concorrente tem um grupo para isso. No LaudoUSG não existe em nenhuma plataforma; só há “fluxo não detectado” e VPS sem interpretação.
6. **Regra de precedência e agregação da conclusão.** Não existe no contrato (`shared:150-161`). O resultado é coerente, mas fragmentado (P1–P3).
7. **Marcador explícito de “parede espessada”.** A espessura medida é o único gatilho (T6).
8. **Paridade mobile.** Categoria ausente no Android/RN, no iOS, no ditado, no seed e nos snippets. A Web e o shared têm o contrato; os apps não o consomem.

## Comportamento útil do concorrente

- **Família “redução/oclusão” separada de fluxo presente ou ausente.** Lembra que a estenose segmentar faz parte da cobertura do exame.
- **Compressibilidade como grupo próprio.** Confirma que o sinal de compressão deve ter estado próprio, como o LaudoUSG já faz com `compression` em três estados.
- **Lateralidade que só aparece no estado anormal.** Reduz cliques. No LaudoUSG, a lateralidade do exame é global e a escolha do lado é por seção, o que é mais explícito; a ideia vale só como atalho de entrada.

## Comportamento que não deve ser reproduzido

- Abrir com laudo normal pronto (lacuna 4).
- Afirmar o diagnóstico com um único marcador e sem confirmação (lacuna 3).
- Montar a conclusão com regras independentes por grupo, sem conferir a coerência entre elas (lacunas 1 e 2).
- Trabalhar só por lado, sem segmento. O LaudoUSG mantém lado × ramo (tronco comum, frontal, parietal).
- Qualquer frase do concorrente. A redação do LaudoUSG é original, no estilo Domingos, e passa por revisão médica.

## Proposta: regras de precedência clínica da conclusão

Regras originais, para o contrato compartilhado. A ordem e as frases dependem de revisão médica antes de qualquer ativação.

**R0. Uma única fonte.** A conclusão é derivada do mesmo estado validado que gera o corpo. Nenhuma frase da conclusão nasce de uma regra isolada de grupo.

**R1. Simetria entre corpo e conclusão.** Todo achado anormal do corpo (fluxo não detectado, redução segmentar, halo, compressão positiva, parede espessada marcada, halo indeterminado) tem uma linha na conclusão, com lado e ramo. Nenhuma linha da conclusão cita algo que o corpo não descreve.

**R2. Exclusão mútua entre negativa e positiva.** Uma negativa sobre a doença, ou sobre marcadores parietais, só pode sair se **nenhum** ramo incluído tiver marcador parietal (halo presente, compressão positiva ou parede espessada marcada). Havendo um marcador, a negativa é suprimida. Uma afirmação diagnóstica só sai com dados mínimos e confirmação médica (já em `shared:97-101`). Se o estado pedir as duas, a validação bloqueia: o laudo não é publicado com contradição.

**R3. A negativa nunca extrapola o avaliado.** “Sem alterações” vale apenas para os segmentos avaliados e listados. Ramo limitado ou não avaliado vai para a linha de incompletude, nunca para a normalidade (já em `shared:159-161`; o adaptador Web viola isso em T7).

**R4. Ordem de apresentação** (candidata, para revisão médica):

1. ausência de fluxo ou oclusão, por lado e ramo;
2. redução segmentar de fluxo;
3. marcadores parietais (halo, compressão, parede espessada), agrupados por lado;
4. hipótese diagnóstica, só com R2 satisfeita e confirmação;
5. segmentos sem alteração, restritos ao avaliado;
6. incompletude ou limitação;
7. modificadores de sensibilidade (corticoide).

**R5. Agregação.** O mesmo achado em todos os ramos avaliados de um lado vira uma linha por lado. Nos dois lados, vira uma linha bilateral. A agregação nunca inclui ramo não avaliado ou limitado, e nunca generaliza um achado unilateral.

**R6. Conflitos no mesmo segmento** (candidatos, para revisão médica):

- fluxo não detectado com VPS → bloqueia (já em `shared:91`);
- fluxo não detectado com marcadores parietais → aviso para o médico confirmar se os sinais são interpretáveis naquele segmento (P4);
- halo indeterminado → aviso sugerindo marcar o ramo como limitado (lote 2, §5.3).

## Contrato mínimo proposto (evolução de `web-v1`)

```
DOPPLER_ARTERIAS_TEMPORAIS v2   (mantém lado × ramo e os bloqueios de web-v1)
ramo[lado ∈ D,E; id ∈ tronco_comum, frontal, parietal]:
  avaliacao: not_assessed | evaluated | limited(+motivo)
  fluxo: not_assessed | detected | reduced_segmental | not_detected      # reduced_segmental é novo
  halo: not_assessed | absent | present | indeterminate
  compressao: not_tested | negative | positive
  parede: { espessura_mm?, espessada_marcada: bool }                     # só a marcação conta como marcador
  vps_cms?
regras:
  limited ⇒ fluxo e halo nunca herdados do preset (default not_assessed)
  marcador_parietal(ramo) = halo=present ∨ compressao=positive ∨ parede.espessada_marcada
  hipotese ⇒ ∃ ramo evaluated com halo=present ∧ (compressao=positive ∨ parede.espessada_marcada) ∧ confirmacao
  negativa_doenca ⇒ ¬∃ marcador_parietal nos lados incluídos               # R2
  conclusao = precedencia(R4) ∘ agregacao(R5) sobre o estado validado      # R0, R1
  limiares (espessura, critérios de redução) = candidatos versionados, a validar
```

## Provas necessárias antes de ativar

1. Estado vazio bloqueia; “Normal” só por escolha explícita (T1/T1b, já verde).
2. Halo nos 3 ramos D: uma linha por lado na conclusão e nenhuma hipótese.
3. Halo bilateral completo: uma linha bilateral; com o lado E incompleto, nada de bilateral.
4. Cenário do concorrente (halo ausente + fluxo ausente + compressão positiva à esquerda): nenhuma negativa sobre a doença; a ausência de fluxo vem antes; cada achado do corpo aparece na conclusão.
5. Negativa e afirmação pedidas juntas: bloqueia.
6. Ramo limitado: nada de fluxo ou halo herdados (T7).
7. Espessura 0,2 mm sem marcação: não conta como marcador (T6).
8. Lateralidade trocada com dado no lado excluído: ação visível para limpar ou reexibir (T3d).
9. Redução segmentar: aparece no corpo e na conclusão com lado e ramo, sem classificar grau sem critério aprovado.
10. Carótidas: um termo temporal em achados adicionais impede a conclusão normal (L8).
11. Paridade: o mesmo estado gera o mesmo texto pelo formulário Web e pelo ditado no RN e no iOS.

## Melhorias sugeridas ao LaudoUSG

| # | Controle ou dado | Efeito no corpo e na conclusão | Salvaguardas | Web | Prompt mobile | Prioridade | Evidência e pendência | Tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Regras R0–R6 de precedência, exclusão mútua e agregação no renderer compartilhado | conclusão curta, ordenada e sem contradição; todo achado do corpo aparece | bloqueio quando negativa e positiva coexistiriam; agregação nunca inclui ramo não avaliado | sem controle novo; a prévia mostra a conclusão agregada | o extrator não monta a conclusão; o código monta | **P1** | contraexemplo do concorrente (C3); provas P1–P3. A ordem R4 depende de revisão médica | **lacuna confirmada** (regra ausente) |
| 2 | Ramo limitado sem herança do preset | corpo só com a limitação e o que foi visto; conclusão em incompletude | fluxo e halo começam “não informado” no ramo limitado | adaptador (`ParaCatalogo:25`) | ditado “ramo limitado” não implica normal | **P1** | T7 | corrige **defeito confirmado** |
| 3 | Marcação explícita “parede espessada” | a espessura só entra como marcador se for marcada | limiar candidato com fonte (EULAR, a validar) | checkbox por ramo ao lado da espessura | extrair a espessura com unidade; não marcar sem palavra explícita | **P1** | T6 | **lacuna confirmada** |
| 4 | Estado `reduced_segmental` no fluxo, com VPS opcional | corpo: redução segmentar com ramo; conclusão: achado descritivo | sem grau sem critério aprovado; incompatível com fluxo ausente no mesmo ramo | nova opção em “Fluxo” | “redução”, “estenose” ou “aceleração focal” viram o estado, com ramo e lado | **P2** | concorrente observado (grupo redução/oclusão) | **lacuna confirmada**; critérios dependem de revisão médica |
| 5 | Aviso para marcadores parietais em ramo sem fluxo | o médico confirma se os sinais são interpretáveis | aviso, não bloqueio, até a revisão | aviso na seção do ramo | perguntar quando o ditado trouxer os dois | **P2** | P4 | candidato |
| 6 | Guarda em Carótidas para termos temporais | impede a conclusão normal de carótidas com conteúdo temporal | pendência; não reencaminha sozinho | aviso no formulário de carótidas | o classificador encaminha para temporais quando houver a categoria | **P1** | L8 (`dopplerCarotidasWeb.ts:209-220`, `:257`) | corrige **defeito confirmado** |
| 7 | Lateralidade com dado oculto | ao excluir um lado com dados, oferecer limpar ou reexibir | nunca descartar em silêncio | diálogo ao trocar a lateralidade | — | **P2** | T3d | corrige **defeito confirmado** |
| 8 | Paridade: seed, normalização do ditado, categoria e extrator no RN e no iOS consumindo o contrato | o ditado chega ao mesmo contrato da Web | o extrator nunca presume halo ausente, compressão negativa, lado contralateral normal ou hipótese sem pedido explícito | — | roteiro do lote 2, §5.4 | **P1** | busca §Estado por plataforma | **lacuna confirmada** (paridade) |

**Para o orquestrador:** R0–R2 e R5 servem para toda categoria vascular com conclusão por segmento: arterial MMII, FAV, mesentérico, aorta e ilíacas. Vale também a lição de que uma regra de conclusão por grupo, sem verificação cruzada, produz contradição. O defeito de herança do preset em segmento limitado foi apontado também no mesentérico (síntese do lote 2, item 5).

## Ficha de insumo para a síntese clínica

- **Estruturas:** artéria temporal superficial D e E × tronco comum, ramo frontal, ramo parietal. Axilares continuam candidatas (escopo clínico a decidir).
- **Estados selecionáveis por ramo:** avaliação (não avaliado, avaliado, limitado + motivo); fluxo (não informado, detectável, redução segmentar, não detectado); halo (não pesquisado, ausente, presente, indeterminado); compressão (não testado, negativo, positivo); parede espessada (marcação + mm).
- **Alterações vistas no concorrente:** halo; fluxo ausente; não compressibilidade; redução ou oclusão. Lateralidade D, E ou bilateral.
- **Medidas e unidades:** espessura em mm (≤ 3 mm como trava de escala, já validada; limiar de positividade candidato); VPS em cm/s; corticoide em dias.
- **Dependências:** hipótese ← halo + segundo marcador qualificado + confirmação; negativa ← nenhum marcador parietal; ramo limitado ⇒ sem herança; fluxo não detectado ⇒ sem VPS; lado excluído ⇒ sem dados.
- **Corpo:** por lado, os ramos normais agrupados numa linha; depois, por ramo, a limitação e os achados.
- **Conclusão:** ordem R4, agregação R5, negativa restrita ao avaliado (R3), incompletude nomeada, ressalva de corticoide.
- **Riscos que exigem confirmação médica:** hipótese de arterite; limiar de espessura; critério de redução segmentar; leitura de marcadores parietais em segmento sem fluxo; inclusão de axilares; redação final de todas as frases.

## Evidências relacionadas

- `cases/doppler-arterias-temporais-2026-10-07.md` (observação do concorrente)
- `audits/lote2/doppler-arterias-temporais-2026-10-05.md` (provas T1–T7 e requisitos)
- `audits/preflight-doppler-arterias-temporais-2026-10-03.md` (preflight e colisão de vocabulário do halo)
- `audits/probes/probe-temporais-2026-10-05.ts` (sonda reproduzida em `0b03101`)
- `/tmp/probe-temporais-ui-2026-10-07.ts` e `/tmp/laudario-temporais-preflight-2026-10-07.md` (prova P1–P4 e preflight, fora do repositório)
