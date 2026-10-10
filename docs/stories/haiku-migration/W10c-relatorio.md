# W10c — Prompt de mamas/axilas e da tireoide (10/10/2026)

Worktree `~/laudousg-wt/w10c`, branch `fix/mama-tireoide-prompt` (a partir de `feat/haiku-migration` 0c0be729).
Sem push, PR, deploy, `vercel env` ou escrita no banco (só leitura). Rodadas e HTML com dados reais em
`tmp-review/bench-haiku/w10c/` (gitignored). Modelo gerador sempre com `BENCH_MODEL=claude-haiku-5-5` explícito.

## Método (o da W9, com as restrições da W10)

1. **Placar determinístico contra o laudo final**, sem juiz: `scripts/bench-haiku/placar-mama.ts` e
   `scripts/bench-haiku/placar-tireoide.ts` (generalizam o `placar-msk.ts`).
2. **Padrões do médico**: os 29 laudos finais de mama e os 20 de tireoide dos últimos 90 dias (todos no estilo clássico).
3. **Prompt enxuto**, medido com `scripts/bench-haiku/prompt-tamanho.ts` (o system que o writer recebe de fato).
4. Iterações só com o Haiku gerando e o placar; **juiz (Opus 5.5, cego) só na rodada final**, concorrência 2.
5. Biblioteca do banco: **não alterada**. A proposta foi injetada só na bancada (`BENCH_BUNDLE_PATCH`) e o SQL está abaixo.

## MAMARIA — writer completo (Haiku 5.5)

### O que os finais mostram (29 laudos, 90 dias)

- **Documentação fotográfica sem "em 06 fotos" em 26 de 29 finais** — o contrato obrigava "06 fotos" ("é proibido trocar
  06 fotos por outro número") e o global proíbe "em XX fotos": as duas regras se contradiziam e o Haiku escrevia as fotos
  em 6 casos.
- Achado no corpo: "Imagem anecoica **de** mama direita, com margem circunscrita, medindo …, situada no …, às "HH horas",
  distando … do seu centro até a pele [e … até o mamilo]." O modelo da biblioteca ensinava "**em** mama" (22 de 50
  linhas do Haiku fora do padrão).
- Sem conclusão ditada, o médico usa a conclusão da casa (a mesma do renderer): "Cistos simples em mama esquerda,
  subcentimétricos.", "Imagem sólida em mama direita no quadrante superolateral." — o Haiku escrevia "Imagem em mama
  esquerda." (descritiva).
- Em 5 finais o médico acrescentou BI-RADS que não ditou (3 numa sólida circunscrita, 2 num cisto). Pela regra vigente
  (não inferir BI-RADS de achado) isso fica com ele; o placar separa essa coluna.
- Ditado por voz: o médico corrige sem comentar ("0.3 por 0,1" → 0,3 x 0,1; "2 9 cm" → 2,9 cm; "do 60 até a perna" →
  do seu centro até a pele). O Haiku marcava [REVISAR] narrando o erro de transcrição em 19 dos 29 casos.

### Contradições no system da mama (36,1 mil caracteres, ~9 mil tokens)

| Trecho | Tamanho | Problema |
|---|---|---|
| Global + CoT (W10b) | ~23 mil | líquido amniótico, FIGO, placenta, biometria, MSK, "NÃO infira BI-RADS 1 default" (contra a decisão 12) — repassado à W10b pelo orquestrador |
| Biblioteca (7 blocos) | 7,0 mil | modelo com axilas e cisto; "Mamas de constituição fibroglandular usual", "Axilas sem linfonodopatia", "Sem nódulos ou cistos visíveis" (frases que não são da casa); "manter ____ em medida"; "em mama"; "se o médico disse nódulo, escreva nódulo" |
| Contrato | 4,8 mil | "06 fotos"; 30 linhas de proibições genéricas |

### O que mudou

- **Contrato** (`prompts/contracts/MAMARIA.ts`, 4,8 → 4,2 mil): escopo de axilas como pergunta objetiva ao ditado (o rótulo
  "Mamas e axilas" da tela não conta); modelo literal com a documentação dos finais; achado com 3 exemplos reais curtos
  (medidas trocadas); conclusão da casa sem ditado; BI-RADS só ditado e no item de maior categoria; normal = BI-RADS 1;
  correção silenciosa da transcrição; `[REVISAR]` só no lugar de número ou lado ausentes. `MAMARIA_MODELO_BASE` sem "06 fotos".
- **Biblioteca proposta** (SQL abaixo): o modelo vira o laudo normal só das mamas (571 caracteres) e os 6 blocos restantes
  são arquivados (o conteúdo útil está no contrato).
- Tamanho do system: **36,1 → 35,4 mil** só com o contrato; **28,7 mil (−20%, ~7,2 mil tokens)** com a biblioteca proposta.

### Iterações (placar, 29 casos, sem juiz — todas recalculadas na rodada `w10c/2026-10-10T11-49-22-mamaria`)

Soma de graves = axilas inventadas/omitidas + BI-RADS ditado faltando ou a mais + medida ausente + diagnóstico no corpo +
frase normal alheia + "____" + título errado.

| Candidato | Soma de graves | Frases fixas omitidas (de 147) | "em 06 fotos" | [REVISAR] | "em mama" no corpo | Numeração fora do padrão |
|---|---|---|---|---|---|---|
| Produção (gpt-4.1-mini, renderer de ago–set) | 18 | 14 | 3 | 10 | 0 | 13 (rodapé numerado) |
| Haiku — prompt atual (B) | 25 | 16 | 6 | 19 | 22 | 0 |
| Haiku — contrato novo, biblioteca atual (B3) | 13 | 2 | 0 | 5 | 5 | 2 |
| Haiku — contrato + biblioteca proposta (B4) | 14 | 3 | 0 | 5 | 1 | 2 |
| B5 (escopo "o rótulo não pede axilas") | 12 | 5 | 0 | 4 | 2 | 4 |
| B6 (escopo "axilas entram quando…") | 21 | 3 | 0 | 5 | 2 | 4 |
| B7 (escopo como pergunta + último item numerado) | 13 | 2 | 0 | 10 | 1 | 0 |
| **B8 — contrato final + biblioteca proposta** | **10** | 3 | 0 | 8 | 1 | 0 |
| B9 — contrato final, biblioteca atual | 18 | 4 | 0 | 8 | 8 | 0 |

- **B4 → B5 → B7:** com a biblioteca enxuta, o rótulo "Mamas e axilas" que a mensagem do usuário traz ("EXAME ESCOLHIDO
  PELO MÉDICO: Mamas e axilas (MAMARIA)") passou a puxar axilas em 4 casos; redigir o escopo como "entram quando…" piorou
  (5); como pergunta objetiva ("a palavra axila aparece no DITADO?") zerou. O W1 vai trocar o rótulo (pedido do orquestrador).
- **B8 × B9:** sem o SQL da biblioteca, o modelo antigo volta a ensinar "em mama" (8) e as frases normais alheias (2).
  **O ganho completo depende do SQL.**

### Rodada final com juiz

Pendente: o orquestrador pediu para medir em cima do global novo da W10b (`GLOBAL-FINAL`), com merge de
`fix/abdome-vias-prompt`. Resultado será acrescentado aqui.

### SQL proposto (NÃO executado — precisa de GO do Luiz)

Só o estilo clássico (é o único com laudos nos 90 dias). Os estilos DIRETO_OBJETIVO e DETALHADO_PROTOCOLAR têm os mesmos 7
blocos (ids no fim); aplicar a eles só depois de medir. O OBJETIVO fica no renderer. Recompor embeddings pelo fluxo aprovado.

```sql
BEGIN;
DO $w10c$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM knowledge_blocks
  WHERE category_code = 'MAMARIA' AND status = 'validated' AND version = 1
    AND id IN ('9673f401-b603-4549-a852-5e9876cd5d55','f0d166bb-9755-4ca8-9dd9-e14035812437','2fdb036d-7e71-45db-9a14-b964d174311c',
               '5a77fca1-bdcd-4521-8bf4-2cdbca8d285a','e433b653-1ca8-4ad8-a063-060d26c10615','ba4218f1-7e92-4efb-afc7-c507eef7568f',
               'ab669197-2f7c-4305-b9d1-49706d388322');
  IF n <> 7 THEN RAISE EXCEPTION 'W10c: blocos/versões mudaram; revisar antes'; END IF;

  UPDATE knowledge_blocks SET content = $m$ULTRASSONOGRAFIA DAS MAMAS

COMENTÁRIOS:
Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas.
A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Mamas com ecotextura de fundo com aspecto heterogêneo.
Não há sinais evidentes de imagem nodular sólida, cística ou complexa.

CONCLUSÃO:
Mamas ecograficamente normais (Categoria BI-RADS® 1).

Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).$m$,
    version = version + 1, embedding = NULL, updated_at = now()
  WHERE id = '9673f401-b603-4549-a852-5e9876cd5d55' AND version = 1;

  UPDATE knowledge_blocks SET status = 'archived', updated_at = now()
  WHERE id IN ('f0d166bb-9755-4ca8-9dd9-e14035812437','2fdb036d-7e71-45db-9a14-b964d174311c','5a77fca1-bdcd-4521-8bf4-2cdbca8d285a',
               'e433b653-1ca8-4ad8-a063-060d26c10615','ba4218f1-7e92-4efb-afc7-c507eef7568f','ab669197-2f7c-4305-b9d1-49706d388322')
    AND status = 'validated';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'W10c: quantidade arquivada inesperada; rollback'; END IF;
END
$w10c$;
COMMIT;
```

Os mesmos blocos nos outros estilos clássicos — DIRETO_OBJETIVO: 49fd0251 (modelo), f3d5b23c, 21d63925, ec402ee4, 2bde09c0,
48d1997e, c4a94127; DETALHADO_PROTOCOLAR: 50936bd8 (modelo), 49668811, afdded34, 4a9b5fa1, f93a665b, 9fad6db2, bcb8d096.

## TIREOIDE — renderer + Haiku extrator

O texto é do renderer (tabela de Domingos confirmada pelo Luiz, ACR separado). O que muda entre candidatos é a extração;
o placar lê o texto renderizado e o final com o mesmo parser e compara por eixo, imagem a imagem (pareadas pela medida).

### Erros de extração do Haiku (prompt antigo), conferidos no `descricao_raw` de cada imagem

- Transcrição: "sem classificações" (= sem calcificações) deixava o eixo nulo; "anecoico nos ecos" virava "anecoica
  homogênea"; "isoecoica com áreas" (truncado) virava isoecoica pura (2 pontos em vez de 1).
- Localização sem preposição: "situada terço médio" em 9 de 20 laudos (o prompt pedia "no terço…").
- Estrutura sem nome depois dos lobos ("e medindo 2,4 x 0,2 x 2,4") — o médico lê como istmo.
- **Não são erro de extração:** "sem calcificações" em imagem anecoica não ditada (presunção que o gpt fazia e o médico
  tolerou; 0 ponto); "com áreas anecoicas" ditado e retirado pelo médico no final (3 imagens); vascularização e halo que só
  o final traz (TI-2).

### O que mudou

- **Prompt de extração** (`renderer/categories/TIREOIDE.ts`): 5,0 → 3,3 mil caracteres; system real da extração
  5,8 → 4,1 mil (−29%). Regras positivas para lobo da imagem, istmo sem nome, localização com preposição, "com áreas",
  artéria do pico como ditada; enums mantidos.
- **Normalizador de ASR** (`pipeline/asrClinical.ts`, só TIREOIDE, flag `ASR_CLINICAL`): "sem classificações" →
  sem calcificações; "anecoico nos ecos" → com finos ecos; "iso/isso ecoica" → isoecoica. Teste: `asr-clinical.manual.ts` (12/12).
- **Renderer**: "situada terço …" → "situada no terço …" (completa só o que veio sem preposição); **TI-3** — rodapé do escore
  só com imagem nodular (sem imagem o médico o apagou em 7 de 10 finais; com imagem manteve em 10 de 10).

### Resultado — 20 laudos, rodada `w10c/2026-10-10T11-53-39-tireoide`

Placar (erros de extração prováveis):

| Candidato | Soma | "situada terço" | Rodapé sem nódulo | Eco ≠ final | Calcificação ≠ final |
|---|---|---|---|---|---|
| Produção (gpt-4.1-mini) | 30 | 2 | 7 | 5 | 0 |
| Haiku — prompt antigo | 61 | 9 | 7 | 11 | 13 |
| **Haiku — prompt novo** | **47** | **0** | **0** | 9 | 11 |

Juiz (Opus 5.5, cego):

| Candidato | Nota | ≤ 4 | Omissões | Invenções | Medida/lado | Impressão ok |
|---|---|---|---|---|---|---|
| Produção (gpt-4.1-mini) | **6,15** | 8 | 18 | 37 | 2 | 10/20 |
| Haiku — prompt antigo | 5,50 | 7 | 42 | 27 | 1 | 8/20 |
| **Haiku — prompt novo** | 5,95 | **5** | 43 | **21** | 2 | 9/20 |

Origem dos graves do Haiku novo (≤ 5), conferida no ditado, em `calls.jsonl` e no código:

- **Erro do juiz / decisão de produto**: a Nota de Domingos é calculada pelo renderer por desenho, e o juiz a chama de
  "invenção da IA" (f4a6ae2a, 84cd3b13, d7881d71, 42fbb3eb, 3221ca52, a64880d0); a nota abaixo da do médico vem de halo e
  vascularização que só o final pontua (**TI-2, pendente do Luiz**); "equivalência TI-RADS ACR ausente" é a separação
  Domingos × ACR do W7; "cadeia ganglionar I–V" é TI-5 (abaixo).
- **Fora desta frente**: comando literal copiado na conclusão ("A as faça as modificações relacionadas à tireoide de Hashimoto",
  2ff5fa67 e a962a942 — guard de comandos, W1); dois exames colados num ditado (tireoide + cervical, e9dd694d — roteamento).
- **Limite do schema** (proposta, não feita): imagens múltiplas ("duas imagens… a maior medindo", 4 de 32 imagens) e
  "reforço acústico" não têm campo; vascularização ditada nunca é escrita (Chammas só pontua) — 42fbb3eb.
- **Erro de extração restante**: atribuição de lobo num ditado ambíguo ("…terço inferior, medindo …, no lado esquerdo,
  apresentando…", be38150d).

HTML local: `tmp-review/bench-haiku/w10c/2026-10-10T11-53-39-tireoide/relatorio.html`.

## Gates

`pnpm -F api typecheck` ok. Testes: `w10c-mama-tireoide.manual.ts` (9, novo), `asr-clinical` (12), `tireoide-23c1-clinical-matrix`
(40), `tireoide-objetivo-golden` (39), `tireoide-pico-null` (12), `tireoide-objetivo-boletim`, `w7-regras-da-casa` (71),
`alteracoes`, `mamaria-golden` (35), `mamaria-23c2` (6/6), `mamaria-birads-guard` (17), `mamaria-boletim`,
`mamaria-objetivo-golden` (25), `mamaria-objetivo-boletim` — todos passam. `PROMPT_VERSION` v1.8 → v1.9.

## Decisões / pendências

1. **SQL da biblioteca da mama** (acima) — GO do Luiz; sem ele o contrato novo entrega só parte do ganho (B9 × B8).
2. **TI-5** — a frase "como também a cadeia ganglionar cervical de I a V": nos 20 finais o médico nunca a tirou nem a pôs
   (igual ao gpt em 20/20); hoje só sai com linfonodos descritos (o código explica: ela afirma que as cadeias foram examinadas).
   Mantida. Luiz: sempre no modelo, ou só quando ditada?
3. **TI-2** (eixo não ditado) e **vascularização no texto** — o médico às vezes escreve "com vascularização periférica maior
   que a central"; o renderer nunca escreve.
4. **Schema da tireoide**: quantidade/"a maior" e reforço acústico (como o MA-1 da mama).
5. Para a W10b (global, repassado): "NÃO infira BI-RADS 1 default" e o bloco obstétrico/FIGO/MSK no system da mama.
6. Para o W1: rótulo do exame da mama na mensagem do writer (repassado); guard de comandos (T1) ainda copia comando na conclusão da tireoide.

## Commits

`dfe6ad31` bancada (placares, tamanho, patch de biblioteca) · `7ca763ed` tireoide · `3eb744dd` mama.
