# Revisão por bancada — renderers determinísticos e prompts de base (W4, 09/10/2026)

Frente W4 da migração para o Claude Haiku 5.5 (`docs/stories/2026-10-09-migracao-haiku.md`).
Nenhum arquivo de produção foi alterado: as propostas abaixo são para o @dev aplicar, com os gates de cada uma.

## Como foi medido

- **Casos:** todos os laudos com laudo final assinado dos últimos 90 dias nas categorias do escopo (banco, só leitura).
  Abdome total e obstétrico ficaram de fora (rodadas de 09/10 do orquestrador).
- **Cenários** (bancada `apps/api/scripts/bench-haiku/bench-abdomen.ts`, Haiku 5.5 pela assinatura):
  - `gpt` — o texto que a produção entregou (`generated_output`).
  - `R` — os achados que a produção extraiu, passados pelo renderer de **hoje**. Só existe para laudo que saiu
    pelo renderer **depois de 11/08**, quando a auditoria passou a gravar os achados do renderer (`51d3e55c`).
  - `A` — Haiku no **caminho atual** da categoria: extrai + renderer; nos writers dedicados (MSK, Pelve, Partes moles)
    escreve com o prompt dedicado; nas categorias de writer genérico escreve com o prompt de hoje.
  - `AR` — Haiku extrai + renderer quando a produção usa outro caminho (Pelve com `PELVE_WRITER=false`; Carótidas com o
    renderer que está desligado).
  - `B2` — Haiku escreve o laudo inteiro com o bundle completo e o patch "corpo descritivo" (o prompt que o W3 vai deixar).
- **Juiz:** Opus 5.5 cego (candidatos embaralhados), régua = laudo final + ditado + regras da casa + regras específicas da
  categoria (BI-RADS, TI-RADS, lateralidade MSK, carótidas…). Nota 10 = assinaria sem editar; 4 = edição clínica.
- **Conferência manual:** todo erro recorrente abaixo teve a origem conferida em `calls.jsonl` (entrada/saída de cada chamada)
  e no código, com `arquivo:linha`. Erros do juiz descartados estão anotados.
- **Prova da bancada:** com as flags de produção (descobertas pela auditoria — ver commit `028a5c15`), o replay reproduz o
  `generated_output` byte a byte em 31 de 40 laudos de renderer desde 11/08; as 9 diferenças são mudanças de código datadas
  (mama 31/08 e 02/09: "regiões axilares", BI-RADS não calculado; tireoide 24/09: ACR TI-RADS por imagem).
- **Viés de ancoragem (ler antes dos números):** o final nasce da edição do texto da produção, então o juiz favorece `gpt`/`R`.
  Similaridade média produção × final: Cervical 0,58 · Tireoide 0,83 · Vias 0,81 · Próstata 0,92 · Mama 0,78 ·
  Parede 0,64 · Carótidas 0,98. **Empate do Haiku é vantagem real; derrota pequena pode ser artefato.**

Rodadas (HTML local com `relatorio.py`; dados de pacientes só em `tmp-review/bench-haiku/w4/`, fora do git):
`16-58-15-cervical`, `16-59-09-tireoide`, `17-04-30-vias_urinarias`, `17-07-00-prostata_suprapubica`,
`17-08-27-mamaria`, `17-14-19-parede_abdominal`, `17-16-00-escrotal+doppler_carotidas`,
`17-17-55-partes_moles+abdomen_superior`, `17-18-53-doppler_carotidas` (AR), `22-21-57-pelve_feminina` (A, AR e B2),
`22-28-37-musculoesqueletico_v2`. Medições determinísticas de banco: `apps/api/scripts/bench-haiku/auditoria-90d.ts`.

## Quadro geral

| Categoria (n) | Caminho em produção | gpt (prod) | R | A (Haiku, caminho atual) | AR | B2 (Haiku escreve) | Recomendação de roteamento |
|---|---|---|---|---|---|---|---|
| MUSCULOESQUELETICO_V2 (71) | writer dedicado (gpt-4.1) | **8,25** (3) | — | 6,21 (14) | — | 4,23 (40) | manter gpt-4.1 se disponível; senão Haiku no writer dedicado só após MK-1 + T4 + nova rodada |
| PELVE_FEMININA (68) | writer dedicado (gpt-4.1) | **7,71** (3) | — | 6,59 (12) | 3,82 (46) | bloqueado 39/68 | **Haiku no writer dedicado** (não renderer, não genérico) + guard de saída |
| MAMARIA (29) | renderer | 5,17 (13) | 4,66 (9) | 4,33 (16) | — | 5,09 (12) | renderer; laudo colado → writer (T2); não Haiku-extrai antes de T3/MA-1 |
| TIREOIDE (20) | renderer | 6,00 (8) | 5,44 (4) | 5,10 (10) | — | **6,10 (1)** | renderer corrigido (TI-1…TI-5); Haiku-extrai só depois |
| PAREDE_ABDOMINAL (15) | writer (gpt-5.4-mini) | 4,60 (10) | — | **6,93 (2)** | — | **6,97 (0)** | **Haiku escritor** |
| VIAS_URINARIAS (13) | renderer | 4,81 (7) | 5,30 (3) | 5,42 (6) | — | **6,00 (4)** | corrigir VU-1 antes de tudo; depois Haiku-extrai ou writer |
| PROSTATA_SUPRAPUBICA (8) | renderer | 6,25 (4) | **7,33** (1) | 5,50 (5) | — | 5,75 (2) | renderer + PR-1; Haiku-extrai aceitável depois |
| CERVICAL (5) | renderer | 5,70 (2) | 6,00 (1) | 5,00 (3) | — | 5,20 (2) | renderer com CE-1; n pequeno |
| ESCROTAL (4) | writer (gpt-5.4-mini) | 6,00 (0) | — | 5,50 (1) | — | **7,12 (0)** | Haiku escritor (B2) |
| DOPPLER_CAROTIDAS (4) | writer (gpt-5.4-mini) | **9,75** (0) | — | 6,00 (0) | 2,38 (4) | 6,50 (0) | Haiku escritor só com contrato de carótidas; renderer não |
| PARTES_MOLES (1) / ABDOMEN_SUPERIOR (1) | writer dedicado / renderer | 7,5 / 9,5 | — / 9,5 | 5 / 9,5 | — | 6 / 7 | abaixo do mínimo — sem recomendação |

Nota do juiz (média); entre parênteses, quantos laudos com nota ≤ 4.

## Achados transversais (valem para várias categorias)

### T1. Guard de comandos acrescenta lixo na conclusão — o médico apaga 80%

`applyConfiguredCommands` (`route.ts:1329` no writer, `:1404` no renderer e writers dedicados) chama
`extractConclusionCommands` (`commandGuard.ts:110-160`). Em 90 dias (503 laudos), 56 itens extraídos do ditado entraram
**literalmente** na conclusão gerada; o médico **apagou 45 (80%)** (`auditoria-90d.ts`, seção 1). Exemplos: "O istmo: 6,1 ml." (de "volume total da
tireoide, **incluindo** o istmo: 6,1 ml"), "Cálculo no rim direito, medindo 0." (corte no ponto decimal de "0.5"),
"1 tracinho e descreve.", "A as seguintes frase.", "Avaliação dinâmica durante a manobra de Valsalva." (3×).

Por caminho: writer genérico 8 apagados × 0 mantidos; writers dedicados 16 × 2; renderer 21 × 9.

**Pior caso — laudo com vários exames (MSK):** `parseConclusion` trata tudo depois do *primeiro* "CONCLUSÃO:" como itens;
com um comando no ditado, o 2º, 3º e 4º laudo viram itens numerados da conclusão do 1º. Visto em produção em 4 laudos de MSK
(seção 2 da auditoria) e reproduzido em 7/7 saídas do Haiku com comando (ver MK-1).

Causas no código:
1. `commandGuard.ts:130` aceita `inclu\w+|adicion\w+|acrescent\w+|coloc\w+` — pega gerúndio, particípio e advérbio
   ("incluindo", "adicionalmente", "colocado").
2. O fim da captura `(?:[.;\n]|$)` corta no ponto decimal do ASR ("medindo 2." de "2.6").
3. `conclusionUtils.ts:35` (`parseConclusion`) trata como item toda linha depois de CONCLUSÃO; ao renumerar, numera o
   rodapé ("2) *ESCORE DE NÓDULO TIREOIDEANO…", "3) ACR - American College of Radiology*", rodapé BI-RADS).

Proposta (ordem):
- **Não acrescentar itens no caminho com LLM escritor** (writer genérico e dedicados): o modelo já obedece ao comando
  (24 apagados × 2 mantidos). Manter só `add_comment`/`replace_phrase` e, se o comando não aparecer no texto, um
  `[REVISAR — comando não aplicado: …]`.
- No renderer: gatilho só imperativo/infinitivo e "na conclusão"; não terminar captura em `\d\.\d`; recusar captura com
  menos de 3 palavras de conteúdo.
- `parseConclusion`: parar a lista na primeira linha de rodapé (`^\*`, `Breast Imaging Reporting`, `ACR -`, `[REVISAR`) e
  devolvê-las depois da lista renumerada.

Simulação feita na bancada: só apertar a regex reduz 88 → 64 capturas — insuficiente sozinha; a mudança de política por
caminho é o que resolve.

```diff
// commandGuard.ts:130 (ilustrativo)
-    /\b(?:acrescent\w+|adicion\w+|inclu\w+|coloc\w+)\s+(?:na\s+conclus[ãa]o[,:\s]+)?(.+?)(?:[.;\n]|$)/gi,
+    /\b(?:acrescent(?:e|ar|a)|adicion(?:e|ar|a)|inclu(?:a|ir|i)|coloqu(?:e)|coloc(?:ar|a))\b\s+(?:na\s+conclus[ãa]o[,:\s]+)?(.+?)(?:[;\n]|\.(?!\d)|$)/gi,
```

### T2. Laudo colado pronto é 11% dos ditados — e o renderer o destrói

56 de 503 ditados de 90 dias já são o laudo formatado (COMENTÁRIOS / OS SEGUINTES ASPECTOS / CONCLUSÃO): Morfológico
12/59, Parede 10/15, Obstétrica 7/125, Mama 6/29, Abdome 5/38, Tireoide 4/20, Pelve 3/68, MSK 2/71, Cervical 2/5.
Nas cinco categorias de renderer medidas:

| Entrada | gpt (prod) | A (Haiku + renderer) | B2 (Haiku escreve) |
|---|---|---|---|
| laudo colado (n=13) | **2,85** | 3,54 | **7,12** |
| ditado de verdade (n=62) | 6,03 | 5,18 | 5,27 |

O renderer re-extrai o texto pronto e o reescreve no modelo dele (perde parágrafos, multiplicidade, ordem); o médico
cola o próprio texto de volta. O MSK já resolve isso com `MSK_PASSTHROUGH` (`MUSCULOESQUELETICO.ts:512`).
**Proposta (alta):** levar `isPreformattedMskReport` para a rota, para todas as categorias: entrada colada → writer em
modo revisão (corrige ASR, aplica regras da casa, guards), nunca re-extração. Independe do roteamento por categoria.

### T3. Haiku como extrator escreve comentários nos campos verbatim

Só no cenário A, nunca no gpt-4.1-mini: 11 de 67 saídas com metatexto colado no laudo pelo renderer — Cervical 2/5
("Conclusão do médico: diagnóstico mais provável de cisto sebáceo. Não se trata de linfonodo."), Vias 3/13
("(ditado: …)"), Mama 6/29 ("Margem ditada como 'lobulada', termo fora do léxico de margem do enum…",
"ilegível; não convertida em dist_mamilo_cm", "tamanho não especificado no ditado").
**Isto vale para a obstétrica do W1/W2** (Haiku extraindo + renderer): `achados_adicionais` e campos `descricao`.
Proposta: (1) regra no prompt-base de extração: "campos de texto recebem só as palavras do médico; nunca comentários sobre o
ditado, o schema ou o que falta — o que faltar fica null"; (2) guard no renderer que recusa string com
`/ditad|enum|verbatim|n[ãa]o especificad|ileg[íi]vel|conclus[ãa]o do m[ée]dico/i` e põe `[REVISAR]`.

### T4. Haiku como escritor: recusa, markdown e comentários

- **Recusa:** com "Exame sem alterações dignas de nota." (Cervical, 2/2) o Haiku não escreve: "não quero assumir esse exame
  sem confirmação". Com "Normal" no abdome não recusou. Causa provável: `buildSystemMessage.ts:166` manda os dados virem
  "EXCLUSIVAMENTE da seção ACHADOS ESTRUTURADOS no user message", mas no fast-path o user traz
  "=== DITADO DO MÉDICO ===" (`writer.ts:251`), e a mensagem não diz o exame escolhido. 5% dos ditados têm menos de 80
  caracteres. Proposta: "ACHADOS ESTRUTURADOS **ou DITADO DO MÉDICO**" e, em `buildRawUserMessage`, a linha
  "Exame escolhido pelo médico: {label}. Não peça confirmação; ditado de normalidade = modelo normal na íntegra."
- **Markdown:** writer genérico ~12% das saídas (`**CONCLUSÃO:**`); writer dedicado da Pelve 18/43. gpt: 0.
- **Comentário depois do laudo / notas ao médico dentro do laudo:** writer dedicado da Pelve ("Observações: Interpretei o
  trecho confuso…"; em 5 dos 12 graves) e do MSK (14/71).
  `normalizeMskWriterFormat` (`mskWriterFormat.ts:10-26`) não limpa nenhum dos dois. Ressalva: na bancada os few-shots
  dos writers dedicados vão no system (o `claude -p` aceita um só prompt); na API eles vão como turnos.
  Proposta: guard de saída para todo writer (remover `**`/`__`, cortar a partir de `---`/"Observações:"/"Notas:" depois
  da conclusão) + "texto puro, sem markdown, nada depois da conclusão" no prompt.

### T5. Prompt base em conflito com as regras da casa

- `global.ts:44` proíbe qualquer conduta ("recomenda-se", "acompanhamento") — mas a regra §4 da casa manda
  "Convém, a critério clínico, … com objetivo de …", o contrato da Pelve (regra 16) idem, e as tireoidites trazem a
  recomendação laboratorial verbatim do Luiz (`TIREOIDE.ts:595-613`). Proposta: "não invente conduta; quando o médico
  ditar ou o modelo da categoria trouxer, use o formato da casa 'Convém, a critério clínico, …'".
- `global.ts:45` impõe "compatível com / sugestivo de"; os finais e o contrato da Pelve (regra 15) usam
  "que tem como diagnóstico mais provável X". O B2 escreveu "de aspecto compatível com cisto sebáceo" onde o final diz
  "que tem como diagnóstico mais provável cisto sebáceo" (ed62c31d). Decisão do Luiz: qual é o padrão geral?

## Por categoria

### TIREOIDE (20) — renderer em produção

gpt 6,00 (8) · R 5,44 (n=8) · A 5,10 (10) · **B2 6,10 (1)**. O Haiku extraindo é pior que a produção; escrevendo, empata
com menos casos graves.

**Recomendação:** não trocar para Haiku-extrai sem antes corrigir TI-1, TI-2 e TI-5 (o A erra mais justamente onde o
schema é frouxo). O writer Haiku é viável clinicamente, mas a tireoide tem esquema visual/web alimentado pelos achados
estruturados — fica no renderer até o inventário do W1; reavaliar com o renderer corrigido.

Defeitos confirmados:
- **TI-1 (enum):** a tabela Domingos (`TIREOIDE.ts:24-35`) não tem "isoecoica com áreas anecoicas". O extrator cai em
  `solida_areas_anecoicas` (1 ponto em vez de 2) e o laudo diz "imagem sólida com áreas anecoicas" — exatamente o que o
  contrato da tireoide proíbe. 42fbb3eb, d7881d71 (A). Proposta: entrada nova no enum; **pontuação é decisão do Luiz**.
- **TI-2 (cálculo):** eixo não ditado vale 0 (`TIREOIDE.ts:395-411`, "default benigno"). O médico pontua halo/vascularização
  que não ditou e a nota calculada sai sempre **abaixo** da dele: f4a6ae2a (NF 2 e 3 × final 3 e 5), 84cd3b13 (3 × 5),
  d7881d71 (3 × 4). Proposta: quando faltar eixo pontuável (halo em sólida; vascularização com Doppler), marcar
  `[REVISAR — nota calculada sem {eixo}]` — decisão do Luiz.
- **TI-3 (rodapé incondicional):** `RODAPE` entra sempre (`TIREOIDE.ts:1143`, constante `:489`). Saiu em 10 laudos sem
  nódulo classificado; o médico apagou em 7. Proposta: só com nódulo classificado.
  ```diff
  -    "",
  -    RODAPE,
  +    ...(temNoduloClassificado ? ["", RODAPE] : []),
  ```
- **TI-4 (diagnóstico no corpo):** `LINFONODOS_NORMAIS` (`TIREOIDE.ts:634`) termina em "compatíveis com linfonodos de
  morfologia preservada" — viola a regra 2 da casa. Proposta: "…de margens regulares, situadas em região cervical, de
  aspecto habitual." (gerado 3×, mantido 1×.)
- **TI-5 (um booleano, duas frases):** `linfonodos_descritos` liga a frase "como também a cadeia ganglionar cervical de I a V"
  dos COMENTÁRIOS (`:481-486`) **e** o parágrafo de linfonodos (`:1012`). O médico mantém a frase da cadeia em 15/15 finais.
  O gpt marca `true` (por causa do comentário colado) e gera o parágrafo não ditado; o Haiku marca `false` e **apaga** a
  frase da cadeia (7 casos no A). Proposta: dois campos (`cadeia_avaliada`, default true no clássico; `linfonodos_descritos`).
- Item "O istmo: 6,1 ml" e rodapé numerado (d9f8a87f, 32ae8748, em todos os candidatos): guard de comandos (T1).
- Erro do juiz descartado: a recomendação laboratorial das tireoidites é texto do Luiz (21/08), não invenção.
- B2: decimais crus do ASR ("3 pontos 6", "1 ponto" → "?,X"), ponto decimal ("4.2 ml"), soma de volume errada (8,4 × 8,6).

### VIAS_URINARIAS (13) — renderer em produção

gpt 4,81 (7) · R 5,30 (n=5) · A 5,42 (6) · **B2 6,00 (4)**.

**Recomendação:** corrigir VU-1 antes de qualquer troca — é o erro mais perigoso desta revisão fora a obstetrícia.
Depois disso, Haiku-extrai é aceitável (empata/supera a produção); o writer Haiku também.

- **VU-1 (grave, schema):** `RimSchema` (`VIAS_URINARIAS.ts:106-117`) não tem rim ausente / nefrectomizado / agenesia /
  não visualizado. Rim ausente sai **normal**, com medidas "____", e a conclusão diz "Rins ecograficamente normais"
  (`:676`). 3/13 laudos: 37234314 (RN com agenesia), 261d5bb7 (nefrectomia + transplante), 01b8b14f (nefrectomia) — no gpt,
  no R e no A. É o mesmo defeito que o W3 corrige no abdome: aplicar a mesma solução aqui (e no `sharedUrinary`).
- **VU-2:** `bexiga.avaliada=false` imprime "repleção insuficiente" (`:510`, `:747`) mesmo com volume pré-miccional de
  277,9 e 152,3 mL (71ca79c4, d3ab0b94). O contrato novo já recusa o conflito (`sharedUrinary.ts:40`); o legado não.
  Proposta: com volume pré-miccional ditado, `avaliada` é true; e tirar "esvaziada" do prompt (`:291`).
- **VU-3:** resíduo "desprezível" vira 0 → "Resíduo pós-miccional de 0,0 cm³" (`:760-762`) (8218c900, 8728e4ea). O
  legado não tem `residuo_estado` (o `sharedUrinary` tem). Proposta: usar o mesmo enum.
- **VU-4:** lesão vesical cai em `achados_adicionais` (código de 14/09) e a conclusão diz "Bexiga ecograficamente normal"
  (8728e4ea). Hoje `bexiga_lesao_focal` resolve, mas a conclusão é a frase fixa "Lesão focal vesical, de natureza
  indeterminada ao método" (`sharedUrinary.ts:248`), que troca a impressão ditada pelo médico.
- Comandos: "Cálculo no rim direito, medindo 0." / "O medindo 2." (T1).

### PROSTATA_SUPRAPUBICA (8) — renderer em produção

gpt 6,25 (4) · R 7,33 (n=3) · A 5,50 (5) · B2 5,75 (2). Estilo do renderer ~9 × B2 5,0 (o writer sai do modelo da casa).

**Recomendação:** manter renderer; Haiku-extrai é aceitável depois de PR-1 (os erros do A são os mesmos do gpt).

- **PR-1:** o peso é **sempre recalculado** (`PROSTATA_SUPRAPUBICA.ts:164-169`, elipsoide × 1,05); o schema não tem peso
  ditado. O peso que o médico dita (do aparelho) difere do gerado em 5/8; ele voltou ao ditado em 3 (0e0138ba 31,1 → 30,7;
  9929267b 31,1 → 30,2; 1b14e682 91,4 → 88). Proposta: `peso_ditado_g` que vence o cálculo (mesmo padrão de
  `nota_domingos_ditada`).
- **PR-2 (menor):** resíduo arredondado para inteiro (`:152`) — o médico aceita, mas 0,1 mL vira "0 mL" (9929267b).
  Proposta: arredondar só ≥ 1.
- "Limite superior da normalidade" ditado vira "dimensões normais" (9929267b, todos os candidatos).
- IPP só com próstata aumentada (`:350`, curadoria A10) — decisão da casa, não defeito.

### MAMARIA (29) — renderer em produção

gpt 5,17 (13) · R 4,66 (n=19) · A 4,33 (16) · **B2 5,09 (12)**; impressão correta: gpt 11 · R 5 · A 10 · **B2 16**.

**Recomendação:** o renderer de hoje (R) é pior que o da produção de agosto — e muito pior em laudo colado (T2).
Haiku-extrai **não** (pior de todos). Corrigir T2 primeiro (6/29 colados); depois decidir entre renderer corrigido e
writer Haiku com o contrato corrigido (MA-2, MA-3). O esquema visual da mama depende dos achados — W1.

- **MA-1:** multiplicidade ("imagens anecoicas…, a maior medindo…") vira imagem única, e a medida "da maior" passa a ser
  "a" medida (b2e91fcd, a177223d, e9c9adde, 09799b79 — gpt e A). O schema do achado não tem quantidade/"a maior".
- **MA-2 (contrato do writer):** `MAMARIA.ts` (contrato) diz no título "axilas avaliadas (ou o médico não menciona
  excluí-las)" mas, no texto axilar, "se as axilas não foram avaliadas: 'Regiões axilares não foram adequadamente
  avaliadas'". O Haiku lê "não mencionou" como "não avaliou" e inventa a frase e o item "Avaliação linfonodal axilar não
  realizada" em 7 casos em que o final traz axilas normais. Proposta: "sem menção às axilas = axilas avaliadas e normais".
- **MA-3 (contrato):** o modelo normal tem "(Categoria BI-RADS® 1)" mas a regra diz "NUNCA inferir BI-RADS" — o Haiku omite
  o BI-RADS 1 do exame normal (5ad732b9, 710b2fcc). Proposta: "exame normal = BI-RADS 1 do modelo".
- BI-RADS 4A calculado sem ditado (jul–ago) já foi corrigido em 31/08 (`permitir_birads_calculado=false`); R e A não repetem.
- A: placeholder de lateralidade ("mama ____") e achado inventado ("Massa heterogênea não nodular", da0808c3); T3 em 6/29.

### CERVICAL (5) — renderer em produção

gpt 5,70 · R 6,00 (n=3) · A 5,00 · B2 5,20. n pequeno; c4f130ba é um Doppler de carótidas ditado na categoria Cervical
(fora da régua).

- **CE-1 (renderer):** campo único `achados_adicionais` vai inteiro ao corpo **e** à conclusão (`CERVICAL.ts:394` e
  `:442`; prompt `:218`). Com o gpt-4.1-mini o campo recebeu só a impressão → o corpo perdeu medidas, nível V e Doppler
  (ed62c31d, nota 2); com o Haiku recebeu a descrição inteira → a conclusão virou o parágrafo descritivo. O mesmo campo
  existe em Tireoide, Mama, Próstata, Vias e Partes moles (só corpo) e Pelve (só conclusão, `PELVE_FEMININA.ts:1185`).
  Proposta: dois campos (`descricao` para o corpo, `impressao` para a conclusão) — a Pelve já separa `observacoes_corpo`.
- Recusa do B2 com ditado curto (T4); 2/5 colados (T2).

### PAREDE_ABDOMINAL (15) — writer genérico (gpt-5.4-mini) em produção

gpt 4,60 (10; impressão 9/15) · **A 6,93 (2; 15/15)** · **B2 6,97 (0; 15/15)**.

**Recomendação:** Haiku escritor — ganho claro.

- **PA-1 (biblioteca, banco):** a regra `parede-abdominal-regra-diastase-retos` não tem limiar: qualquer distância entre os
  retos vira "Afastamento…" no corpo e "Diástase…" na conclusão. A produção diagnosticou diástase com 0,7, 1,1 e 1,3 cm
  que o médico chamou de normais (5ac4f4b3, 38a7b1ba, 855fe6f1, 435012a4, 6da94461). O Haiku acertou. Proposta: limiar
  (decisão do Luiz) e "só diagnosticar diástase se o médico disser".
- **PA-2 (biblioteca):** o modelo padrão difere do padrão real do Luiz (finais: "transdutor de 12 MHz", "06 fotos",
  "Não há sinais de hérnia") e impõe "manobra de Valsalva" e "Ausência de coleções" não ditados. 10/15 ditados são o laudo
  dele colado. Proposta: atualizar o modelo com o texto dos finais.

### ESCROTAL (4) e DOPPLER_CAROTIDAS (4) — writer genérico em produção

- Escrotal: gpt 6,0 · A 5,5 · **B2 7,1**. O A levou "esteatose hepática acentuada" solta no ditado para o laudo escrotal.
- Carótidas: **gpt 9,75** · A 6,0 · B2 6,5 · AR (renderer desligado) 2,4. O Haiku acerta 100% dos números e lados; perde em
  estrutura da casa: conclusão sem "Espessura médio-intimal preservada, sem alterações hemodinâmicas significativas" (4/4),
  sem linha em branco entre os lados (regra §8), parâmetros em prosa, sentido do fluxo vertebral omitido (2125792e).
  Cuidado: o final é quase o texto da produção (similaridade 0,98). A categoria não tem contrato
  (`contracts/index.ts`). Em ffb32f05 o final tem o CMI no lado trocado em relação ao ditado e o Haiku seguiu o ditado.
  **Recomendação:** Haiku escritor **com contrato de carótidas** (estrutura da casa, §8 das regras) antes de trocar; não
  ligar o renderer de carótidas.

### PARTES_MOLES (1) e ABDOMEN_SUPERIOR (1)

Abaixo do mínimo de 3; só registro. Partes moles: gpt 7,5 · A 5 · B2 6 — ninguém usou a frase da casa "Complementamos o
estudo com Doppler colorido…" (§5). Abdome superior: renderer = final (9,5) · B2 7 (omitiu aorta/VCI do modelo).

### PELVE_FEMININA (68) — writer dedicado (`PELVE_WRITER`, gpt-4.1) em produção — **pedido do Luiz**

| Candidato | Nota | ≤ 4 | Impressão correta | Observação |
|---|---|---|---|---|
| Produção (writer dedicado, gpt-4.1) | **7,71** | 3 | 52/68 | similaridade com o final 0,88 (viés de ancoragem) |
| **Haiku no writer dedicado (A)** | **6,59** | 12 | 41/68 | markdown em 18/43; notas de revisão dentro do laudo |
| Haiku extrai + renderer (AR, `PELVE_WRITER=false`) | 3,82 | 46 | 12/68 | |
| Haiku no writer genérico (B2) | 2,14 (5,02 nos 29 válidos) | 48 | 11/68 | **bloqueado em 39/68** |

Ditado de verdade (65): produção 7,64 · A 6,49 · AR 3,85. Laudo colado (3): produção 9,17 · A 8,67 · AR 3,0.

**Recomendação: Haiku no writer DEDICADO da Pelve (`pelveWriter.ts`), não no renderer e não no writer genérico.**
O renderer perde em todas as dimensões (medidas/unidades em 43/68 apontamentos, endométrio 30, normalidade presumida 28,
ovários 26, mioma/FIGO 14, "____" 13). O writer genérico não tem modelo para a via **TA + TV**, a mais comum: o bundle
devolve `BUNDLE_VARIANT_EMPTY ta-tv` em 39/68 (57%) e a rota bloquearia a geração (`route.ts:927-965`).
A diferença de ~1,1 ponto para a produção vem quase toda de formato, corrigível antes do GO:
- **PV-1 (saída do Haiku):** markdown e bloco "Observações / pontos para conferir antes de assinar" dentro do laudo
  (A: 18/43 com markdown; 5 dos 12 graves têm as notas, que o guard de comandos e o `parseConclusion` ainda numeram como
  itens 8–13 da conclusão — T1 + T4). Guard de saída + linha de prompt.
- **PV-2:** unidade mm × cm (saco gestacional 7,1 "cm"; útero em mm escrito como cm) — 3 graves; incluir no prompt dedicado
  a regra de unidade da casa e o sanity de medida (`measureSanity`) para saco gestacional.
- **PV-3:** "endométrio com espessura normal para a fase do ciclo" presumido sem medida ditada (3 graves) — o prompt da
  pelve precisa da exceção "sem espessura ditada: não afirmar normalidade".
- Título/COMENTÁRIOS omitidos em 3 casos (ditado muito curto).
Defeitos do renderer da Pelve (para quem mantiver a pelve no renderer em outro estilo — o objetivo usa o renderer):
- **PV-4:** `ptBr` (`PELVE_FEMININA.ts:407-410`) — os dois ramos do ternário são iguais; inteiro sai "3" e "62 cm³", o
  médico escreve "3,0" e "62,0 cm³". Proposta: inteiro com uma casa.
- Comando "no lugar da frase do miométrio escreva…" não substituiu (abeb74f6): o item do modelo fica e o ditado entra como
  item novo (T1); legenda FIGO numerada como item (T1/`parseConclusion`); mioma duplicado na conclusão (1c1c7438).

### MUSCULOESQUELETICO_V2 (71) — writer dedicado (`MSK_WRITER`, gpt-4.1) em produção

| Recorte | Produção (gpt-4.1) | Haiku no writer dedicado (A) | Haiku no writer genérico (B2) |
|---|---|---|---|
| todos (71) | **8,25** (3 graves) | 6,21 (14) | 4,23 (40) |
| sem os 7 casos destruídos pelo guard | **8,45** (1) | 6,52 (8) | 4,30 (34) |
| vários exames no mesmo ditado (40) | 8,32 (1) | 6,39 (5) | 4,12 (22) |

Similaridade produção × final 0,92 (ancoragem forte), mas a diferença é grande demais para ser só isso.

**Recomendação:** **não migrar o MSK para o Haiku nesta leva.** Se o gpt-4.1 continuar disponível depois de 14/10
(confirmar no W1), manter o MSK nele; se não, Haiku no writer dedicado **só depois** de MK-1 + guard de saída (T4) +
uma iteração do prompt dedicado medida de novo na bancada. Writer genérico, nunca (4,2).

- **MK-1 (grave, produção também):** `applyCommandOperations` → `parseConclusion` (`conclusionUtils.ts:26-41`) trata tudo
  depois do **primeiro** "CONCLUSÃO:" como itens. Num ditado com vários exames (ombro D + ombro E + tornozelos) e um
  comando qualquer, o 2º, 3º e 4º laudo viram itens numerados da conclusão do 1º. Reproduzido em 7/7 saídas do Haiku com
  comando (ex.: 4 laudos → 1) e **visto em produção em 4 laudos de MSK em 90 dias** (19599614, e8f02f03, bbd7e07b,
  52e66a0a — o médico remontou). Proposta: o guard opera **por laudo** (dividir pelo título "ULTRASSONOGRAFIA…"), e,
  no caminho writer, não acrescenta itens (T1).
- **MK-2 (Haiku):** cobertura de estruturas incompleta frente ao modelo (62c42a9b), lado presumido sem aviso (acb94e3c,
  32310472), leitura de ASR clínico pior que a do gpt-4.1 ("supraescapular" mantido onde era subescapular — 92260395;
  "tendustibulares" → fibulares — ed34070e), notas ao médico dentro do laudo (14/71).

## Lista única priorizada

Ordem por impacto clínico × frequência × esforço. "Antes do GO" = precisa estar feito antes de ligar o Haiku na categoria.

| # | Proposta | Impacto clínico | Frequência (90 d) | Esforço | Onde | Quando |
|---|---|---|---|---|---|---|
| 1 | **Guard de comandos por laudo e sem acréscimo no caminho writer** (MK-1 + T1): dividir por título antes de mexer na conclusão; não acrescentar item no writer genérico/dedicado; `parseConclusion` para no rodapé; gatilho só imperativo e sem corte em decimal | multi-laudo destruído (grave) + lixo na conclusão | 56 itens literais, 45 apagados (80%); 4 multi-laudo colapsados em produção; 7/7 no Haiku | médio | `commandGuard.ts:130`, `commandOperations.ts`, `conclusionUtils.ts:26-41`, `route.ts:1329/1404` | **antes do GO** (todas) |
| 2 | **Rim ausente/nefrectomia/agenesia no schema** (VU-1) | rim inexistente descrito normal | 3/13 vias (+ abdome, W3) | baixo | `VIAS_URINARIAS.ts:106-117`, `:676`, `sharedUrinary.ts` | já |
| 3 | **Haiku-extrator sem metatexto** (T3): regra no prompt-base de extração + guard que recusa "ditado/enum/verbatim/não especificado/ilegível" | comentário de IA impresso no laudo | 11/67 saídas A (0 no gpt) | baixo | prompts de extração dos renderers (inclusive obstétrica — W2) + renderer | **antes do GO** de qualquer Haiku-extrai |
| 4 | **Guard de saída para todo writer Haiku** (T4): tirar markdown, cortar "Observações/Notas/---" após a conclusão; prompt "texto puro" | notas ao médico assinadas por engano | Pelve A 18/43 markdown + notas em 5/12 graves; MSK 14/71 notas; genérico ~12% markdown | baixo | `mskWriterFormat.ts:10-26` (+ pós-writer da rota) | **antes do GO** dos writers |
| 5 | **Recusa do writer com ditado curto** (T4): "ACHADOS ESTRUTURADOS ou DITADO" e "exame escolhido pelo médico: {label}" | laudo não sai | 2/2 cervical; 5% dos ditados são curtos | baixo | `buildSystemMessage.ts:166`, `writer.ts:251` | **antes do GO** (W1/W3) |
| 6 | **Laudo colado → writer em modo revisão** (T2) | renderer reescreve o laudo pronto do médico | 56/503 (11%); colado: renderer 2,9–3,5 × writer 7,1 | médio | rota (generalizar `isPreformattedMskReport`) | logo após o GO |
| 7 | **Pelve no writer dedicado, não no genérico** — e, se um dia for ao genérico, criar o modelo `ta-tv` | geração bloqueada | 39/68 (57%) bloqueariam | decisão de roteamento | `route.ts:927-965`, biblioteca | no roteamento do W1 |
| 8 | **Peso da próstata ditado vence o cálculo** (PR-1) | medida divergente do aparelho | 5/8; médico corrigiu 3 | baixo | `PROSTATA_SUPRAPUBICA.ts:164-169` | curto prazo |
| 9 | **Tireoide: rodapé só com nódulo** (TI-3) e **dois campos para cadeia × linfonodos** (TI-5) | texto apagado pelo médico; Haiku apaga a frase da cadeia | rodapé 7/10 apagado; cadeia 7 no A | baixo | `TIREOIDE.ts:1143`, `:481-486`, `:1012` | antes do Haiku-extrai na tireoide |
| 10 | **Parede: limiar de diástase na biblioteca** (PA-1) | diagnóstico falso de diástase | 5/15 na produção | baixo (banco) | regra `parede-abdominal-regra-diastase-retos` | com o GO do Haiku (que já acerta) |
| 11 | **Mama: contrato do writer** (MA-2 axilas, MA-3 BI-RADS 1) e multiplicidade no schema (MA-1) | axila "não avaliada" inventada; BI-RADS 1 omitido; lesões múltiplas viram uma | 7 + 2 casos B2; MA-1 4 casos | baixo/médio | contrato `MAMARIA.ts` (prompts), schema do renderer | antes de qualquer writer na mama |
| 12 | **Cervical: separar descrição × impressão** em `achados_adicionais` (CE-1) — mesmo padrão nas outras categorias | corpo sem medidas ou conclusão = parágrafo | 2/5 graves | médio | `CERVICAL.ts:218/394/442` (+ demais renderers) | curto prazo |
| 13 | **Vias: bexiga com volume nunca "repleção insuficiente"; resíduo "desprezível"** (VU-2, VU-3) | frase falsa | 2 + 2 casos | baixo | `VIAS_URINARIAS.ts:291/510/747/760` | curto prazo |
| 14 | **Prompt base: conduta e "compatível com"** (T5) | conflito com regras da casa | transversal | baixo, após decisão | `global.ts:44-45` | decisão do Luiz |
| 15 | **Tireoide Domingos** (TI-1 enum isoecoica c/ áreas anecoicas; TI-2 eixo não ditado) | nota abaixo da do médico | 5/20 | baixo, após decisão | `TIREOIDE.ts:24-35`, `:395-411` | decisão do Luiz |
| 16 | **Contrato de carótidas** (estrutura da casa §8) | só forma (números certos) | 4/4 | baixo | `contracts/` | antes do GO das carótidas |
| 17 | Pelve renderer: `ptBr` com uma casa (PV-4); TI-4 frase de linfonodos sem diagnóstico; PA-2 modelo da parede = texto do Luiz | estilo | frequente, leve | baixo | `PELVE_FEMININA.ts:407-410`, `TIREOIDE.ts:634`, biblioteca | quando couber |

## Decisões que precisam do Luiz

1. **MSK:** o gpt-4.1 continua depois de 14/10? Se sim, manter o MSK nele nesta leva (Haiku 6,5 × 8,5). Se não, aceitar o
   Haiku no writer dedicado com as correções 1 e 4 e uma rodada nova antes do GO?
2. **Pelve:** aceitar a recomendação "Haiku no writer dedicado" (6,6 × 7,7 da produção; renderer 3,8)? A diferença
   restante é quase toda formato (markdown/notas) e cai com a proposta 4.
3. **Tireoide:** quanto vale "isoecoica com áreas anecoicas" na escala de Domingos (2, como isoecoica?), e a nota calculada
   com eixo não ditado (halo, vascularização) deve sair com `[REVISAR]`?
4. **Parede abdominal:** a partir de que distância entre os retos o laudo pode chamar de diástase (a literatura usa > 2 cm)?
5. **Prompt base:** qual é o padrão da casa para hipótese diagnóstica — "compatível com" (global.ts) ou "que tem como
   diagnóstico mais provável" (seus finais, contrato da pelve)? E a conduta "Convém, a critério clínico…" pode entrar quando
   ditada ou quando o modelo da categoria a traz?
6. **Mama:** confirmar que exame normal leva "(Categoria BI-RADS® 1)" e que "não falou de axilas" = axilas normais.

## W8 — Haiku 5.5 × Sonnet 5.5 como escritor (09/10/2026, noite)

Decisão do Luiz: o gpt-4.1 sai de vez; para MSK, carótidas e pelve (vários laudos no mesmo ditado) a proposta é um modelo
mais forte, Claude Sonnet 5.5. Rodada pela assinatura, com o **código de hoje** (motor Anthropic do W1, regra "corpo
descritivo" do W3 já no prompt — por isso o writer genérico é o cenário `B`, sem patch) e o mesmo esforço (`medium`).
Os cinco candidatos foram julgados **juntos** pelo mesmo juiz (Opus 5.5, cego, regras da casa + MSK).
HTML para o Luiz escolher: `tmp-review/bench-haiku/w8/<rodada>/relatorio.html` (local, contém ditados reais).

### MUSCULOESQUELETICO_V2 (71) — rodada `w8/2026-10-09T23-36-04-musculoesqueletico_v2`

Todos os 71 laudos com laudo final de 90 dias; nenhuma falha de geração.

| Candidato | Nota média | ≤ 4 | Omissões | Invenções | Medida/lado | Impressão ok | Multi-laudo preservado* |
|---|---|---|---|---|---|---|---|
| Produção (gpt-4.1, writer dedicado) | **8,31** | 2 | 13 | 58 | 3 | 64/71 | 37/47 |
| Haiku 5.5 — writer dedicado | 5,90 | 14 | 91 | 119 | 6 | 51/71 | 32/47 |
| **Sonnet 5.5 — writer dedicado** | **6,61** | 10 | 57 | 133 | 7 | 56/71 | 33/47 |
| Haiku 5.5 — writer genérico | 4,38 | 36 | 167 | 164 | 11 | 37/71 | 19/47 |
| Sonnet 5.5 — writer genérico | 5,49 | 16 | 139 | 137 | 8 | 45/71 | 36/47 |

Sem os 10 casos expostos ao defeito do guard de comandos (MK-1: ditado com comando de conclusão e vários laudos no
final — o defeito é do guard e atinge todos os candidatos), n = 61:

| Candidato | Nota média | ≤ 4 | Omissões | Invenções | Medida/lado | Impressão ok | Multi-laudo preservado* |
|---|---|---|---|---|---|---|---|
| Produção (gpt-4.1) | **8,49** | 1 | 12 | 51 | 2 | 56/61 | 31/37 |
| Haiku — dedicado | 6,20 | 8 | 67 | 96 | 2 | 46/61 | 30/37 |
| **Sonnet — dedicado** | **6,93** | 5 | 44 | 109 | 4 | 50/61 | 31/37 |
| Haiku — genérico | 4,43 | 30 | 137 | 146 | 9 | 31/61 | 17/37 |
| Sonnet — genérico | 5,63 | 12 | 117 | 114 | 7 | 39/61 | 32/37 |

\* laudos cujo final tem mais de um exame: o candidato saiu com o mesmo número de "CONCLUSÃO:".

Latência mediana por chamada, pela assinatura (`claude -p`; inclui o próprio CLI — só vale a comparação relativa):
Sonnet dedicado 7,7 s · Haiku dedicado 12,0 s · Sonnet genérico 10,5 s · Haiku genérico 15,7 s.

Leitura:
- **O Sonnet é melhor que o Haiku nos dois writers** (+0,7 no dedicado; +1,2 no genérico): omissões caem de 67 para 44
  no dedicado, menos laudos graves (8 → 5) e menos notas ao médico dentro do laudo (11 → 4 de 71). Markdown: 0 nos dois
  (o guard do W1 resolve).
- **O writer dedicado continua necessário**: no genérico os dois perdem 1,3–1,8 ponto; o Haiku genérico desmonta
  laudos com vários exames (17/37 preservados).
- **Nenhum dos dois alcança a produção** (8,5): o Sonnet fica 1,5 ponto abaixo. O que mais pesa nele é acrescentar
  normalidade/qualificadores não ditados (34 dos apontamentos), algumas leituras erradas do ditado (polia A1 "negada"
  vira sinovite em 2d4ff586; tibiais × fibulares em ed34070e) e a nota ao médico em 4 laudos. Parte da distância é viés
  de ancoragem (o final do médico nasce do texto da produção: similaridade 0,92).
- **Recomendação:** Sonnet 5.5 no **writer dedicado** do MSK — melhor e mais rápido que o Haiku. Antes do GO: corrigir o
  MK-1 (guard por laudo) e o guard de saída para notas; e uma iteração do prompt dedicado contra "normalidade não ditada"
  (o prompt foi escrito para o gpt-4.1), medida de novo nesta bancada.

### PELVE_FEMININA (68) — rodada `w8/2026-10-10T00-02-01-pelve_feminina`

| Candidato | Nota média | ≤ 4 | Omissões | Invenções | Medida/lado | Impressão ok |
|---|---|---|---|---|---|---|
| Produção (gpt-4.1, writer dedicado) | **7,44** | 7 | 23 | 67 | 11 | 49/68 |
| Haiku 5.5 — writer dedicado | 6,10 | 14 | 61 | 79 | 12 | 32/68 |
| **Sonnet 5.5 — writer dedicado** | **7,06** | 8 | 38 | 65 | 16 | 41/68 |
| Haiku 5.5 — writer genérico | 2,00 (4,70 nos 29 válidos) | 53 | 87 | 68 | 13 | 10/68 |
| Sonnet 5.5 — writer genérico | 2,20 (5,15 nos 29 válidos) | 50 | 79 | 61 | 9 | 13/68 |

O writer genérico é **bloqueado em 39/68** (variante "ta-tv" sem modelo na biblioteca — ver PV/proposta 7), então não é
alternativa hoje. Latência mediana: Sonnet dedicado 7,6 s · Haiku dedicado 9,9 s.

Leitura: na pelve o **Sonnet no writer dedicado fica a 0,4 ponto da produção** (7,06 × 7,44), com quase o mesmo número de
laudos graves (8 × 7) e de invenções (65 × 67); o Haiku perde 1,3. O que sobra no Sonnet:
- **PV-5 (prompt dedicado, novo):** sem espessura endometrial ditada, o Sonnet escreve "Endométrio medindo **0,0 cm** de
  espessura" — e diz no laudo que é "marcador" (6d95b36a, 3d1f159e). Causa: a regra 1 do prompt
  (`PELVE_FEMININA.ts:1530`) proíbe "____" sem dizer o que fazer quando a medida falta. Proposta: "medida não ditada →
  omita a medida (ex.: 'Endométrio de aspecto habitual') ou use [REVISAR]; nunca 0,0". O `flagImplausibleMeasures`
  também não marcou o 0,0 — vale estender a ele.
- Lado escolhido em ditado ambíguo ("esquerda direita", 5113302e) e medidas de ditado ambíguo lidas de outro jeito que o
  médico (00f3e8e4, 3ee3065f) — o Sonnet sinaliza a dúvida, mas a escolha fica no laudo.
- "Ausência de produtos retidos" omitida em 2 casos pós-abortamento (7f205bfc, 4df0b110).
- Itens com medida truncada ("medindo 7.", "medindo 2") vêm do guard de comandos (T1), em todos os candidatos.

**Recomendação:** Sonnet 5.5 no writer dedicado da pelve, com PV-5 corrigido e o guard de saída (notas) — é a primeira
categoria em que um modelo Claude chega perto da produção.

### DOPPLER_CAROTIDAS (4) — rodada `w8/2026-10-10T00-15-42-doppler_carotidas`

Não há writer dedicado: o caminho de hoje é o writer genérico, então cada modelo tem duas gerações da mesma configuração.

| Candidato | Notas (2 gerações) | ≤ 4 |
|---|---|---|
| Produção (gpt-5.4-mini) | **9,38** | 0 |
| Haiku 5.5 | 6,12 / 6,62 | 1 / 0 |
| Sonnet 5.5 | 6,75 / 6,88 | 0 / 0 |

Mesmo diagnóstico da revisão: números e lados certos nos dois modelos; a perda é a estrutura da casa (conclusão padrão
"Espessura médio-intimal preservada…", linha em branco entre os lados), sem contrato da categoria; e o final é quase o
texto da produção (similaridade 0,98). n = 4: o Sonnet é ligeiramente melhor e mais estável, mas a amostra não decide.
**Recomendação:** criar o contrato de carótidas (proposta 16) e reavaliar; o modelo vem depois.

### Resumo W8 — o que escolher

| Categoria | Produção | Haiku dedicado | Sonnet dedicado | Recomendação |
|---|---|---|---|---|
| MSK (71) | 8,31 | 5,90 | **6,61** | Sonnet no dedicado, após MK-1 + guard de saída + iteração do prompt contra normalidade não ditada; nova rodada antes do GO |
| Pelve (68) | 7,44 | 6,10 | **7,06** | Sonnet no dedicado, após PV-5 + guard de saída |
| Carótidas (4) | 9,38 | 6,1–6,6 | 6,8–6,9 | contrato da categoria primeiro; amostra pequena |

Em todas, o Sonnet é melhor que o Haiku no mesmo writer e, pela assinatura, mais rápido (7,6–7,7 s × 9,9–12 s na
mediana por chamada; só comparação relativa). O writer genérico não substitui os dedicados (MSK −1,3; pelve bloqueada).

## W9 — Prompt do writer dedicado do MSK: cobertura, sequência descritiva e numeração (10/10/2026)

O Luiz viu no HTML do W8: frases de estruturas normais omitidas (sobretudo no Haiku), sequência descritiva invertida ou
parafraseada (tendão patelar, 1a704f8c) e a numeração da conclusão invadindo os laudos seguintes.

**Medido antes de mudar** (`scripts/bench-haiku/placar-msk.ts`, determinístico, contra o laudo final, por laudo-bloco):
no W8 o Haiku omitia 28,7% das frases de normalidade do roteiro que estão no final (Sonnet 13,9%, produção 8,7%) e seguia o
padrão "frase normal + ', com …'" em 7 de 15 linhas (Sonnet 8/15, produção 15/15). **A invasão de numeração já é
resolvida pelo guard por laudo do W1 (`ce33d744`):** reaplicado à saída crua do W8, 0 de 69 saídas com invasão, nos dois
modelos.

**Padrões reais do médico** (laudos finais de MSK, 90 dias): 482 linhas de estrutura normal copiadas literalmente do
roteiro; 15 no padrão "frase normal + ', com <alteração>'" quando a alteração não compromete a estrutura (nervo mediano com
a área de secção; tendão patelar com osteófitos na origem); as estruturas alteradas usam o mesmo sujeito da frase do
roteiro + a alteração; e **"sem evidência de rotura" está em 30 de 78 laudos finais (74 linhas) e nunca foi ditada** — é a
frase do médico para tendão com alteração ecotextural.

**Prompt reescrito** (`MUSCULOESQUELETICO.ts`, `buildMskWriterSystemMessage`; 6,2 → 8,1 mil caracteres, ~+30%): estruturas na ordem
do roteiro, uma linha cada; estrutura normal ou não citada = frase do roteiro literal; as duas formas de estrutura alterada
com exemplos reais (anonimizados, só a frase); sem paráfrase nem ressalva fora do padrão da casa; numeração só na CONCLUSÃO,
recomeçando em "1)" em cada laudo; conferência final por laudo. Uma 1ª versão proibia "sem evidência de rotura" como
ressalva e o Sonnet passou a tirá-la — corrigido com o dado acima.

**Achado de método:** desde o W1 r3 o motor roteia o MSK para o Sonnet por categoria, e a bancada sem `BENCH_MODEL` usa o
modelo do motor. Duas rodadas que eu tinha rotulado "Haiku" eram Sonnet; foram descartadas, a bancada passou a gravar o
modelo efetivo e o Haiku foi re-rodado com `BENCH_MODEL` explícito. **Toda rodada de Haiku × Sonnet daqui em diante precisa
de `BENCH_MODEL` nos dois lados.**

### Resultado — mesmos 71 laudos do W8, um juiz para os cinco (rodada `w9/2026-10-10T10-51-39-musculoesqueletico_v2`)

Placar determinístico:

| Candidato | Frases normais omitidas | Padrão "normal + , com" | Invasão de numeração | Ressalva inventada |
|---|---|---|---|---|
| Produção (gpt-4.1) | 8,7% | 15/15 | 4 casos | 0 |
| Haiku — prompt antigo | 28,7% | 7/15 | 8 casos | 1 |
| Sonnet — prompt antigo | 13,9% | 8/15 | 8 casos | 0 |
| **Haiku — prompt novo** | **6,6%** | **14/15** | **0** | **0** |
| **Sonnet — prompt novo** | **8,7%** | **15/15** | **0** | **0** |

Juiz (Opus 5.5, cego):

| Candidato | Nota | ≤ 4 | Omissões | Invenções | Medida/lado | Impressão ok | Multi-laudo preservado |
|---|---|---|---|---|---|---|---|
| Produção (gpt-4.1) | **8,15** | 3 | 14 | 61 | 3 | 64/71 | 37/47 |
| Haiku — prompt antigo | 5,55 | 22 | 110 | 131 | 10 | 49/71 | 32/47 |
| Sonnet — prompt antigo | 6,29 | 10 | 53 | 140 | 8 | 53/71 | 33/47 |
| Haiku — prompt novo | 6,15 | 16 | 74 | 121 | 8 | 49/71 | **41/47** |
| **Sonnet — prompt novo** | **6,67** | **6** | 68 | **100** | 10 | **55/71** | **40/47** |

Sem os 10 casos expostos ao MK-1 (n = 61): produção 8,36 · Haiku 5,89 → 6,12 · Sonnet 6,66 → 6,70.

- **Os três defeitos que o Luiz viu foram resolvidos:** omissão de frases normais no nível da produção (6,6–8,7%), padrão
  descritivo da casa em 14–15 de 15 linhas e nenhuma invasão de numeração. No caso 1a704f8c, os dois escrevem agora
  "Tendão patelar de espessura, continuidade e ecotextura preservadas, com osteófitos marginais na origem do tendão
  patelar." ("irregularidade cortical" não estava no ditado — foi acréscimo do médico no final).
- **Nos 8 casos de multi-laudo que a numeração destruía**, os candidatos novos saem com o número certo de laudos em 15 de
  16 saídas (notas do Sonnet: 4–8, contra 2,5–4,5 antes).
- **Sonnet + prompt novo é o melhor candidato Claude** (6,67; 6 graves; invenções −29%). Fora dos casos de multi-laudo, a
  nota fica estável (6,66 → 6,70): o ganho do prompt está em estrutura, cobertura e forma, que o placar mede melhor que a
  nota. A distância para a produção (~1,5) segue concentrada em conclusão incompleta, normalidade/qualificador não ditado,
  e estruturas que o médico acrescentou fora do roteiro (compartimentos restantes, ligamentos colaterais, bíceps femoral).
- Ressalva de método: o juiz conta "sem evidência de rotura" não ditada como invenção (19 apontamentos no Haiku, 14 no
  Sonnet), embora seja a frase-padrão da casa — parte das invenções restantes é erro do juiz. O médico também nem sempre
  a usa: os modelos novos a escrevem em ~45 dos 71 casos; os finais, em 22.
- **Recomendação:** manter o prompt novo com o Sonnet no writer dedicado do MSK. Próximo passo: a conclusão (completar
  os itens e o lado de cada achado) e decidir com o Luiz se "sem evidência de rotura" deve ser sempre usada no tendão
  alterado ou só quando ele ditar.

## W10a — Prompt do writer dedicado da pelve feminina (TA, TV e TA+TV) (10/10/2026)

Método da W9, enxuto: placar determinístico → padrões reais → prompt menor → bancada com `BENCH_MODEL` explícito, juiz
só na rodada final (concorrência 2). Mesmos 68 laudos do W8.

**Placar genérico** (`scripts/bench-haiku/placar.ts`, generaliza o `placar-msk.ts`): as frases-padrão da categoria são as
linhas que se repetem nos próprios laudos finais (números normalizados, ≥ 4 finais — 33 na pelve), mais título, técnica,
"06 fotos", "____"/"0,0", conclusão duplicada, numeração, legenda FIGO e unidade do saco gestacional.

**Padrões reais do médico** (finais de 90 dias) que o prompt antigo contrariava:
- técnica TV: "…A documentação fotográfica foi obtida segundo protocolo…" — o prompt mandava "obtida **em 06 fotos**";
  saiu em 15 laudos e o médico **tirou em 11**;
- ovários: "(o direito com X cm³ e o esquerdo Y cm³)" — a regra da menopausa ensinava "e o esquerdo **com**", e o Haiku
  espalhava para todos (era a frase que ele mais errava, 15×); um few-shot também;
- via não ditada → o médico usa **transabdominal + transvaginal** (43 de 68); o Haiku punha `[REVISAR]` no título e na técnica;
- posição do útero não ditada → **anteversão**;
- "não é possível correlacionar com o ciclo (amenorreia/contraceptivo)": no final o corpo fica só com a medida e a frase vai
  para a **conclusão** do endométrio, no lugar da frase padrão;
- títulos extras: "… PARA CONTAGEM DE FOLÍCULOS"; ausência de gestação ("Ausência de saco gestacional intrauterino." /
  "Ausência de produtos retidos da concepção.").

**Prompt** (`PELVE_FEMININA.ts`, `buildPelveWriterSystemMessage`): **6.241 → 5.541 caracteres (−11%)**; entrada total
medida pelo modelo (system + few-shots + ditado) 9.570 → ~9.230 tokens na mediana. Regra positiva + a frase real; corrige
também PV-5 (medida não ditada → `[REVISAR]`, nunca "0,0"/"____"), PV-3 (endométrio normal só com espessura ditada), PV-2
(unidade ditada do saco gestacional) e a legenda FIGO (uma vez, sem número). Dois few-shots alinhados ao padrão (técnica TV,
"e o esquerdo"). Golden do prompt atualizado (37 checagens).

### Resultado — 68 laudos, um juiz para os cinco (rodada `w10a/2026-10-10T11-45-39-pelve_feminina`)

Placar determinístico:

| Candidato | Frases-padrão faltando | Título ≠ | "06 fotos" a mais | "____"/"0,0" | Numeração | Legenda FIGO |
|---|---|---|---|---|---|---|
| Produção (gpt-4.1) | 5,3% | 5 | 14 | 2 | 6 | 6 |
| Haiku — prompt antigo | 11,6% | 11 | 13 | 0 | 8 | 5 |
| Sonnet — prompt antigo | 6,3% | 10 | 15 | 2 | 6 | 6 |
| **Haiku — prompt novo** | 7,3% | 6 | 1 | 0 | **0** | **0** |
| **Sonnet — prompt novo** | **6,0%** | 8 | 1 | 0 | **0** | **0** |

("Técnica diferente do final" fica em 11–12 nos novos contra 15 na produção: parte é variação do próprio médico nos
finais — "em 06 fotos" em 4, "obtida em segundo protocolo" em 5.)

Juiz (Opus 5.5, cego):

| Candidato | Nota | ≤ 4 | Omissões | Invenções | Medida/lado | Impressão ok |
|---|---|---|---|---|---|---|
| Produção (gpt-4.1) | 7,26 | 11 | 20 | 62 | 10 | 45/68 |
| Haiku — prompt antigo | 6,03 | 15 | 51 | 74 | 10 | 33/68 |
| Sonnet — prompt antigo | 6,90 | 11 | 34 | 62 | 15 | 44/68 |
| **Haiku — prompt novo** | **6,96** | **5** | 45 | 46 | 6 | 39/68 |
| **Sonnet — prompt novo** | **7,36** | **4** | 35 | **38** | 6 | 43/68 |

Comparação pareada (bootstrap, IC95%): Haiku novo − Haiku antigo **+0,93** [+0,48; +1,38]; Sonnet novo − Sonnet antigo
+0,46 [+0,03; +0,88]; **Sonnet novo − Haiku novo +0,40 [+0,06; +0,77]**; Sonnet novo − produção +0,10 [−0,42; +0,63];
Haiku novo − produção −0,30 [−0,87; +0,25]. Por via, o Sonnet novo é o melhor nas três (TA+TV 7,33 · TV 7,42 · TA 7,40);
o Haiku novo fica em 6,9–7,1. Latência mediana pela assinatura: Sonnet 6,1 s, Haiku 11,2 s (comparação relativa).

- O prompt novo melhora os dois modelos; com ele, **os dois ficam no nível da produção** (diferença dentro do ruído do
  juiz), com metade ou menos dos laudos graves (4–5 × 11) e menos invenções e erros de medida/lado.
- **Não é empate:** o Sonnet fica 0,4 acima do Haiku, com intervalo que exclui zero (pequeno, mas consistente nas três vias).
- **Recomendação:** **Sonnet 5.5** no writer dedicado da pelve. Se o Luiz preferir o Haiku pelo custo, ele também fica no
  nível da produção com o prompt novo (−0,30, dentro do ruído) — é uma escolha aceitável, com ~0,4 ponto a menos que o Sonnet.

## W10b — Prompt enxuto do writer: abdome total, vias urinárias e regras globais (10/10/2026)

Relatório completo: `docs/stories/haiku-migration/W10b-relatorio.md`. Branch `fix/abdome-vias-prompt`; GLOBAL-FINAL `356e0224`.

**Medido antes** (`placar-writer.ts`, Haiku, laudos finais de 90 dias): o system do writer do abdome tinha 39,6 mil caracteres,
dos quais 23,9 mil eram global + proibições + CoT, a maior parte obstétrica (protocolo de líquido amniótico, biometria,
placenta, DUM, MCDA) — o mesmo bloco ia para vias, mama, parede… O abdome do Haiku já cobria bem as frases do modelo
(0,6% omitidas), mas numerava a conclusão normal ("1." do modelo da biblioteca) e transformava "antes da conclusão
acrescente" em item. Nas vias, 38,6% das frases do final faltavam: a biblioteca manda fechar com "Demais estruturas…" (0/13
nos finais) e o médico faz a conclusão por estrutura (rins / ureteres / bexiga / resíduo).

**O que mudou:** fora da família obstétrica (que segue byte a byte), `GLOBAL_RULES_LEAN` + reforço só da categoria (FIGO na
pelve, tendões no MSK, mamas na mama, tireoide na tireoide) + conferência curta; contrato do abdome reescrito a partir dos
finais; contrato novo das vias. System: abdome 39,6 → 20,4 mil car. (−49%), vias 35,7 → 19,7 mil, parede 32,7 → 14,5 mil,
mama 36,1 → 18,4 mil. Duas regressões do prompt enxuto foram pegas pelo placar e corrigidas antes do juiz: laudo colado de
outro exame forçado para o modelo da categoria, e paráfrase do laudo colado (regra nova: laudo pronto sai literal).

**Resultado (juiz Opus cego, 66 laudos):** produção 5,67 (31 graves) · Haiku prompt de hoje 7,14 (5) · **Haiku prompt novo
7,83 (2)** — abdome 7,19 → 7,93, vias 6,27 → 6,81, parede 7,77 → 8,43. Com a limpeza proposta da biblioteca (só bancada),
abdome 8,04 e vias 7,19.

**Pendente com o Luiz:** SQL da biblioteca (`W10b-biblioteca-proposta.sql`, não aplicado: arquiva 7 blocos, reescreve 5 —
inclui tirar a recomendação clínica automática das vias); "em 06 fotos" nos laudos colados de parede/inguinal.

## W10c — Prompts enxutos de mamas/axilas e tireoide (10/10/2026)

Relatório completo (números, origem de cada grave, SQL proposto): `docs/stories/haiku-migration/W10c-relatorio.md`.
Placares determinísticos novos: `scripts/bench-haiku/placar-mama.ts`, `placar-tireoide.ts`; tamanho real do system:
`prompt-tamanho.ts`. Biblioteca proposta medida só na bancada (`BENCH_BUNDLE_PATCH`); banco intacto.

### MAMARIA (29) — writer completo, Haiku 5.5

- **Contradição que o Haiku obedecia:** o contrato obrigava "em 06 fotos" (o global proíbe; 26 de 29 finais não têm). Saiu.
- **A biblioteca contradiz o contrato** em 6 de 7 blocos (frases normais que não são da casa, "em mama", "nódulo" no corpo,
  modelo com axilas): proposta de SQL — modelo normal só das mamas e arquivar os outros 6 (system 36,1 → 28,7 mil, −20%).
- Contrato 4,8 → 4,2 mil: escopo das axilas como pergunta ao ditado; achado "Imagem … de mama …" com exemplos reais curtos;
  conclusão da casa quando não ditada; correção silenciosa da transcrição.
- Rodada final sobre o global final da W10b (`w10c/2026-10-10T12-17-31-mamaria`, juiz Opus cego): produção 4,49 (≤ 4: 19) ·
  Haiku prompt antigo 5,93 (3) · **Haiku prompt novo + biblioteca proposta 8,42 (0)** · prompt novo sem a biblioteca 8,09 (0);
  invenções 66 · 15 · 3 · 3; impressão correta 9 · 19 · 28 · 28 de 29. System da mama: 36,1 → 11,1 mil caracteres.
- O global novo ("laudo colado sai literal") tirava o rodapé do BI-RADS dos colados; o contrato da mama o declara obrigatório.

### TIREOIDE (20) — renderer + Haiku extrator

- Prompt de extração 5,0 → 3,3 mil (system real 5,8 → 4,1 mil); garbles de ASR no normalizador ("sem classificações",
  "nos ecos", "iso ecoica"); renderer: "situada no terço" e TI-3 (rodapé só com imagem nodular).
- Placar de extração: Haiku 61 → 47 (produção 30). Juiz: produção **6,15** · Haiku antigo 5,50 · **Haiku novo 5,95**
  (≤ 4: 8 · 7 · 5; invenções 37 · 27 · 21). Rodada `w10c/2026-10-10T11-53-39-tireoide`.
- A distância para a produção é quase toda de decisão pendente ou de outro dono: TI-2 (eixo não ditado), TI-5 (frase da cadeia
  I–V), ACR separado (W7), comando copiado na conclusão (W1), dois exames num ditado, e o schema sem imagens múltiplas.

## W14 (W4) — Correções da revisão W13 na pelve e no MSK (10/10/2026)

Achados corrigidos: A02, A03, auditoria da pelve (sonda da W13), A09, M01 (MSK) e a parte do M03 nos dedicados MSK e pelve
(coordenada com a W10b). A04 e A08 ficaram como estão (pendentes do Luiz). Sem juiz: mudanças enxutas, medidas por cenário
sintético e placar.

**Pelve (`PELVE_FEMININA.ts`, `pelveFewshots.ts`, `pelveWriterAudit.ts`)**
- A02: eixos e volumes do útero e dos ovários marcados como opcionais (`[ ]` = só se ditado); dado não ditado omite a
  oração — nunca "0,0", "____" ou `[REVISAR]` por falta; `[REVISAR]` só para ditado ilegível ou ambíguo. A frase de
  normalidade do ovário ("apresentando imagens anecoicas" / "contendo folículos") foi mantida: está em 51 de 68 finais,
  com o ditado citando em 13 — é frase da casa, não invenção.
- A03: tipo e FIGO ditados entram como ditados; não ditados, nunca inferidos; legenda FIGO só com FIGO no laudo. O
  few-shot 5 trazia "intramural (FIGO 5)" e "(FIGO 4)" sem tipo nem FIGO no ditado (e FIGO 5 chamado de intramural):
  virou um item no plural, sem classificação.
- Auditoria: passa a acusar FIGO não ditado, tipo de mioma não ditado ou omitido, tipo incompatível com a categoria FIGO
  (tabela do `FIGO_RULES`; aceita tipo compatível com FIGO ditado; 0 falso alarme nos 24 finais com FIGO), medida no laudo
  que não está no ditado (aceita o decimal do ASR "8 4" = 8,4) e `[REVISAR]` por dado não ditado. A sonda da W13 agora
  reprova. Os 6 few-shots passam limpos.
- Dado para a W12: nos 24 finais com FIGO, a classificação está só na conclusão (0 no corpo); o médico acrescentou FIGO em
  8 e o tipo em 12 que não ditou. A derivação localização ↔ FIGO pedida pelo Luiz é da W12.

**MSK (`MUSCULOESQUELETICO.ts`, `mskFewshots.ts`)**
- A09: proibido só acrescentar estrutura presumida fora do roteiro; achado ditado fora dele entra em linha própria junto
  da estrutura vizinha (é o que o médico faz nos finais); conferência final sem "e só elas".
- M01: o dedicado não recebe o global, então declara a hipótese na conclusão ("…, que tem como diagnóstico mais provável
  X") e que os exemplos ensinam só o estilo (também na pelve). Few-shots: sem "compatível com alterações degenerativas" no
  corpo, hipótese na fórmula da casa, "sem evidência de rotura" no singular. O exemplo 5 é laudo colado pelo médico e ficou
  como ele escreveu.
- M03: "hipoecoico/a, hiperecoico/a, anecoico/a — nunca hipo/hiper/anecogênico", uma vez em cada dedicado.

**Tamanho:** pelve 5.541 → 5.907 caracteres (+7%), mas a entrada total do modelo foi de 17.343 para 17.519 (+1%) porque o
few-shot encolheu; MSK 8.100 → 8.510 (+5%).

### Cenários sintéticos do Codex, pela assinatura (`scripts/bench-haiku/cenarios-w14.ts`, 8 cenários, 22 checagens)

| | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| Código base (cf903353) | 3/8 cenários (16/22) | 2/8 (15/22) |
| W14 | **8/8 (22/22)** | **8/8 (22/22)** |

No código base: eixos do ovário inventados e `[REVISAR]` por falta (A02), FIGO inventado para mioma sem classificação
(A03), hipótese em "O diagnóstico mais provável é" (M01), "hipoecogênico" (M03). O P5 (FIGO 2 + subseroso) "passava" no
base só porque havia `[REVISAR]` de eixos ausentes; na W14 quem sinaliza é a conferência FIGO × tipo.

### Placar nos casos reais (sem juiz; mesma régua da W10a e da W9)

Pelve, 68 laudos (W10a = prompt anterior, W14 = este):

| | Auditoria reprova | FIGO inventado | `[REVISAR]` por falta | Marcas `[REVISAR]` | Frases-padrão faltando |
|---|---|---|---|---|---|
| Produção (gpt-4.1) | 12 | 6 | 0 | 6 | 5,3% |
| Haiku W10a → W14 | 13 → **2** | 6 → **0** | 6 → **0** | 78 → 30 | 7,3% → 8,0% |
| Sonnet W10a → W14 | 15 → **3** | 6 → **0** | 12 → **1** | — → 35 | 6,0% → 7,3% |

Os `[REVISAR]` que restam apontam ditado ambíguo de verdade ("antever em retroversão", "8 1 x 4 x 5", "ovário direito" duas
vezes), não dado faltando. A piora pequena nas frases-padrão vem sobretudo da legenda FIGO (4 casos), que o médico pôs onde
acrescentou FIGO sem ditar — efeito esperado do A03 até a W12; tirando a legenda, o Haiku fica igual (52 × 51 de 699) e o
Sonnet perde 5 de 699.

MSK, 71 laudos, Haiku (modelo decidido pelo Luiz): frases normais do roteiro omitidas 6,6% (W9) → **4,6%**; frases-padrão
6,8% → 6,2%; invasão de numeração 0; "O diagnóstico mais provável é" 1 → 0; "sem evidência de roturas" 0. Os "sem sinais de
rotura" restantes vêm da biblioteca de morfologia canônica (ditado só-diagnóstico, A08 — pendente), que também acrescenta
"espessamento, perda do padrão fibrilar"; nos dois casos o médico reduziu para "modificação do padrão ecotextural, sem
evidência de rotura". Dado útil para a decisão do A08.

Gates: golden da pelve 44/44, auditoria da pelve 34/34, golden do MSK 31/31, auditoria do MSK 10/10, formato 6/6,
typecheck sem erro.
