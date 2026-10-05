# Tireoide com Doppler (`TIREOIDE`, modo `com_doppler`): auditoria do lote 3

- Data: 05/10/2026. Base: `06c88cd` (worktree). A execução rodou na main `407362d`, que não altera nenhum arquivo citado aqui em relação a `06c88cd`.
- Laudário: não observado, porque não havia navegador. Só se confirmou a existência no catálogo: linha 9 de `catalogo-ultrassonografia-2026-10-02.json` ("Tireoide com Doppler", grupo `pequenas_partes`). Nenhuma redação do concorrente foi usada.
- Fora do escopo, porque o estudo está concluído: a tireoide sem Doppler e o TI-RADS (`cases/tireoide-2026-10-02.md`, `crosswalk-tireoide-2026-10-02.md`). O bloco linfonodal deve seguir o contrato proposto em `audits/lote2/cervical-linfonodos-2026-10-05.md`.
- Prova: `audits/probes/probe-tireoide-doppler-2026-10-05.ts`, executada duas vezes: com `TIREOIDE_PICO_OMIT=true` (valor de produção) e sem a flag. Estilos `CLASSICO_COMPLETO` e `OBJETIVO`. A saída foi lida por inteiro.

## Decisão de forma

**(b) Modo do contrato `TIREOIDE` existente, sem categoria nova.** O código canônico proposto continua `TIREOIDE`, e o Doppler vira um bloco `doppler` dentro dele. Motivo: o modo já existe (`com_doppler`, título, picos e Chammas), e criar outro contrato duplicaria lobos, nódulos, Domingos e ACR. Hoje o problema é o modo estar raso e afirmar coisas por padrão, não a falta de um formulário.

## 1. Estado por plataforma

| Plataforma | Evidência | Classificação |
|---|---|---|
| Web (tela) | O botão "Doppler" na barra (`LaudarWebExperience.tsx:1754-1758`) muda `doppler`. O pico sistólico só aparece com Doppler e fora do istmo (`TireoideFormPanel.tsx:192-204`, com a dica "> 40–50 cm/s sugerem hipervascularização"). A vascularização do nódulo (Chammas) fica **sempre visível**, com ou sem Doppler (`:414-420`) | estruturado ativo, parcial |
| Web (estado) | `organs/tireoide.ts:82` (`doppler: boolean`), `:100-102` e `:195-196` (`avaliarLinfonodos: true`, `linfonodos: 'preservados'`). **Não existe campo de padrão vascular do parênquima** | parcial |
| Web (adaptador) | `tireoideParaCatalogo.ts:314` (`com_doppler`), `:319-322` (artéria fixada em `"inferior"`; picos descartados sem Doppler), `:328-329` (linfonodos descritos = toggle) | parcial |
| Renderer | `categories/TIREOIDE.ts`: título com Doppler só no clássico (`:989-991`); lobo sem nódulo com "vascularização normais" (`:769-770`); picos (`:941-958`); Chammas pontua Domingos (`:66-73`, `:408`) e o ACR não usa vascularização (`:1227-1245`); objetivo com título e técnica fixos (`:1323-1324`) | estruturado ativo (migrada em 21/08) |
| API ditado | Mesmo renderer e extrator (`:284-287` com_doppler; `:303-305` ecotextura difusa em verbatim, "Graves" incluído). Não há campo de padrão vascular. `RENDERER_CATEGORIES` vazio (`env.ts:74`) → writer | estruturado dormente → writer |
| Android/RN | `apps/mobile/src/ui/tokens.ts:151`, só ditado | genérico |
| iOS | `Category.swift:142` ("Tireoide com Doppler quando indicado"). O atalho **"Normal" insere "Vascularização ao Doppler colorido sem alterações"**, e o atalho "Hashimoto" insere "vascularização aumentada ao Doppler" (`Features/Generate/GenerateViewModel.swift:37-40`) | genérico, com afirmação de Doppler embutida |
| shared | nada em `packages/shared/src/clinicalModels/` | ausente |
| Conhecimento | `snippets/TIREOIDE/regra/doppler-informado.md` (título e "vascularização" só com Doppler; picos só quando informados); `regra/linfonodos-cervicais.md` diz que **linfonodos NÃO são padrão** no laudo de tireoide | publicado, contrariado pelo padrão da Web |

## 2. Inventário de controles do modo Doppler (Web)

| Campo | Opções | Padrão inicial |
|---|---|---|
| `doppler` | ligado / desligado (botão da barra) | desligado |
| `picoDireito` / `picoEsquerdo` | texto livre em cm/s (só com Doppler; lobos D/E) | vazio |
| artéria do pico | **inexistente na tela** (o adaptador fixa "inferior") | inferior |
| `nodulo.vascularizacao` | ausente / periférica / periférica > central / central > periférica / exclusivamente central | nulo; **visível sem Doppler** |
| padrão vascular do parênquima | **inexistente** | n/a |
| IR/IP, VPS de nódulo | inexistentes | n/a |
| `avaliarLinfonodos` / `linfonodos` | sim / não; preservados / suspeitos | **sim / preservados** |

## 3. Provas (dados sintéticos)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
|---|---|---|---|---|---|
| T1 | estado inicial, sem Doppler | lobos com "____" e "ecogenicidade e ecotextura normais"; **"…compatíveis com linfonodos de morfologia preservada"**; técnica "**cadeia ganglionar cervical de I a V**". No objetivo: "Não há evidência de linfonodomegalias" | "Tireoide de **volume normal (____ ml)**, sem … imagem nodular" | nenhuma | `defeito confirmado`: o indício do lote 2 se confirma. Linfonodos preservados e cadeias I–V examinadas são afirmados sem nenhum dado, contra a regra publicada. (O "volume normal" em branco é da tireoide base e já está registrado em `TireoideFormPanel.tsx:479-483`.) |
| T1b | só o botão Doppler | título "COM DOPPLER COLORIDO"; lobos D/E "de ecogenicidade, ecotextura **e vascularização normais**"; com a flag de produção, nenhuma linha de pico; sem a flag, "____ cm/s" dos dois lados | igual a T1 | nenhuma | `defeito confirmado`: vascularização normal afirmada só porque o botão foi ligado |
| T2a | Doppler, picos 78/82 cm/s, ecotextura normal (pretendido: hipervascular difuso) | "vascularização normais" **e**, logo abaixo, picos de 78 e 82 cm/s. Objetivo: título **sem** Doppler e técnica sem Doppler, mas imprime os picos | "…sem evidência de alteração…"; objetivo: "dentro dos padrões da normalidade" | nenhuma | `defeito confirmado`: não há como registrar o parênquima hipervascular; o corpo se contradiz e a conclusão ignora o Doppler |
| T2b | idem + ecotextura heterogênea nos lobos | lobos "com ecotextura heterogênea"; a vascularização **some** do texto; ficam só os picos | "Tireoide de volume normal" + "Sinais ecográficos de tireoidopatia" | nenhuma | `defeito confirmado`: o achado Doppler principal (hipervascularização difusa) não chega ao laudo |
| T2c | Doppler, só o pico direito | linha só do lado direito (com a flag); "____" no esquerdo (sem a flag) | normal | nenhuma | `observado no LaudoUSG`: comportamento coerente com a D5 |
| T3a→T3b | nódulo sólido hipoecoico de 1,4 cm no LD; vascularização nula → "exclusivamente central" | **mesmo corpo** nos dois casos (Chammas nunca escrito) | Domingos **NOTA 5 → 9** ("provavelmente benignas" → "intermediárias"); **ACR TI-RADS 4 nos dois**; objetivo só com ACR 4 | nenhuma | `observado no LaudoUSG`: o ACR não usa o Doppler (correto). Domingos incorpora o Chammas por desenho. `candidato a lacuna`: o achado Doppler muda a nota sem aparecer em lugar nenhum do texto |
| T4 | Doppler **desligado**, Chammas "exclusivamente central" e picos digitados | título sem Doppler, picos descartados (bom) | **NOTA 9** mantida | nenhuma | `defeito confirmado`: com o Doppler "não realizado", o padrão vascular ainda pontua a escala de Domingos |
| T5 | remoção: Doppler desligado, nódulo removido, linfonodos de volta a preservados; depois "não avaliar" | sem resíduo de Doppler ou nódulo; com "não avaliar", a técnica perde "I a V" e a frase de linfonodo some | normal | nenhuma | `observado no LaudoUSG`: a remoção é limpa. O único caminho honesto para os linfonodos exige desmarcar um padrão |

## 4. Lacunas concretas (Web e paridade)

- **D1, P0, `defeito confirmado`.** `avaliarLinfonodos: true` + `'preservados'` por padrão (`organs/tireoide.ts:195-196`) escreve linfonodos normais e cadeias I–V examinadas sem nenhum dado (T1). Isso contraria `regra/linfonodos-cervicais.md`. O padrão deve ser "não informado", que não escreve nada; "preservados" só vale depois de um clique.
- **D2, P0, `defeito confirmado`.** Ligar o Doppler afirma "vascularização normais" sem nenhum dado vascular (T1b) e convive com picos que o médico marcou como elevados (T2a). A frase de vascularização normal deve exigir um padrão do parênquima informado como normal.
- **D3, P0, `defeito confirmado`.** Chammas pontua com o Doppler desligado (T4). O campo fica visível sem Doppler (`TireoideFormPanel.tsx:414-420`) e o adaptador repassa o valor (`tireoideParaCatalogo.ts:198`). A vascularização do nódulo deve ficar desabilitada e ser zerada, ou gerar pendência bloqueante, quando o Doppler não foi realizado.
- **D4, P1, `candidato a lacuna`.** Não existe padrão vascular do parênquima (normal / aumentado focal / aumentado difuso / acentuadamente aumentado difuso / reduzido), nem por lobo. O hipertireoidismo difuso e a tireoidite em fase de hiperfluxo não têm onde ser registrados (T2a, T2b).
- **D5, P1, `defeito confirmado`.** No estilo objetivo, o título e a técnica nunca indicam Doppler, mas os picos são impressos (T2a). O próprio gate já menciona isso (`tireoide-ponta-a-ponta.manual.ts`, comentário do estilo).
- **D6, P1, `candidato a lacuna`.** Os picos não trazem leitura: não há aviso quando estão altos e a conclusão não muda. A artéria fica fixa em "inferior" (`tireoideParaCatalogo.ts:319,321`) e não há escolha entre superior e inferior. Limiar só como `candidato`: VPS da artéria tireoidiana inferior acima de cerca de 40–50 cm/s, como aviso e nunca como diagnóstico (fonte provável: a dica já na tela, `TireoideFormPanel.tsx:201-203`; literatura de Graves × tireoidite destrutiva, a confirmar).
- **D7, P2, `candidato a lacuna`.** A vascularização do nódulo nunca é escrita, por regra da casa (`TIREOIDE.ts:15-16`). Num exame vendido "com Doppler", o achado só aparece como nota. Fica a decisão para o Luiz: manter a regra ou descrever o padrão no corpo do texto, sem citar Chammas.
- **D8, P2, `defeito confirmado` (iOS).** O atalho "Normal" do iOS afirma Doppler sem alterações em todo exame de tireoide (`GenerateViewModel.swift:39`). O extrator lê isso como `com_doppler = true` e o laudo sai "COM DOPPLER". O Android não tem atalho e depende só do ditado.

## 5. Requisitos originais

### 5.1 Modelo normal (modo Doppler)

| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
|---|---|---|---|
| Técnica | `doppler.realizado = sim` | citar o Doppler colorido (e espectral, se houver pico) na técnica, nos dois estilos | nenhuma |
| Parênquima | padrão vascular por lobo = normal | vascularização preservada no lobo | silêncio |
| Artérias tireoidianas | pico informado por lado e por artéria | uma linha por artéria medida; lado não medido omitido | silêncio se não houver aviso confirmado |
| Nódulo | padrão vascular informado | descrever o padrão (se o Luiz aprovar, D7) | sem item próprio; o ACR nunca muda |
| Linfonodos | lado e nível avaliados (contrato do lote 2) | só o que foi avaliado | só o que estiver alterado |

### 5.2 Biblioteca de alterações do modo Doppler

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
|---|---|---|---|---|
| `hiperfluxo_difuso` | lobos afetados; grau (aumentado / acentuadamente aumentado) | parênquima com vascularização difusamente aumentada ao Doppler colorido, por lobo | aumento difuso da vascularização glandular; correlacionar com a função tireoidiana | não nomear Graves nem tireoidite (o extrator já proíbe inferir o tipo, `TIREOIDE.ts:299`); exige Doppler realizado |
| `hiperfluxo_focal` | lobo, localização | área de vascularização aumentada no lobo X | item factual por lobo | lado obrigatório |
| `hipofluxo_difuso` | lobos | vascularização reduzida | vascularização glandular reduzida | idem |
| `vps_elevada` | lado, artéria, VPS (cm/s) | linha de pico | só com confirmação do médico; sem confirmação, apenas aviso na tela | a unidade fica fixa em cm/s; o limiar é só `candidato` |
| `vasc_nodulo` | nódulo, padrão (5 opções) | conforme D7 | entra na nota de Domingos e **nunca** no ACR | campo desabilitado sem Doppler |

### 5.3 Formulário Web

- **Seção Doppler** (só aparece com `doppler.realizado = sim`): `realizado` ∈ {sim, não} (padrão: **não**). Para cada lobo D e E, `padrao_parenquima` ∈ {normal, aumentado focal, aumentado difuso, acentuadamente aumentado difuso, reduzido}, padrão **vazio**. Para cada lado, `arteria` ∈ {inferior, superior} (padrão vazio, exigido quando há VPS) e `vps_cms` numérico entre 5 e 200 (fora da faixa: aviso de digitação).
- **Dependências:** o padrão do parênquima é exigido para escrever "vascularização normal". A vascularização do nódulo fica desabilitada sem Doppler. Desligar o Doppler limpa os picos, o padrão do parênquima e a vascularização dos nódulos, e mostra o aviso "a nota de Domingos foi recalculada".
- **Derivados:** nenhum diagnóstico. Só o aviso de VPS acima do limiar `candidato`, com a frase de conclusão oferecida para o médico confirmar.
- **Pendências bloqueantes:** Doppler "sim" sem padrão do parênquima em nenhum lobo; VPS sem artéria; vascularização de nódulo com Doppler "não".
- **Linfonodos:** o padrão passa a ser "não informado". Ao clicar, abre a grade de lado × nível do contrato `CERVICAL` (lote 2, L1/L4). A técnica só cita "cadeia I a V" quando todos os níveis tiverem sido marcados como avaliados.

### 5.4 Prompt mobile (extrator)

Extrair: Doppler realizado (as negações vencem), padrão vascular do parênquima por lobo, VPS com lado e artéria, padrão vascular do nódulo e linfonodos só quando mencionados. Nunca presumir: vascularização normal porque "com Doppler" foi dito; hiperfluxo a partir de "Graves" ou "Hashimoto"; artéria inferior quando não for dita; linfonodos preservados.

### 5.5 Casos de aceitação sintéticos

1. Estado inicial → nenhuma frase de linfonodo; técnica sem "cadeia I a V"; sem Doppler.
2. Doppler sim, sem padrão nem VPS → bloqueia, pedindo o padrão do parênquima.
3. Doppler sim, padrão normal D/E, VPS inferior D 22 / E 24 → "vascularização preservada" e duas linhas de pico; título e técnica com Doppler **nos dois estilos**.
4. Doppler sim, aumentado difuso D/E, VPS 78/82 → corpo com hiperfluxo difuso; aviso de VPS; a conclusão só traz o item depois da confirmação; nenhum nome de doença.
5. Doppler não, vascularização de nódulo "exclusivamente central" → bloqueia (ou o campo fica desabilitado); a nota não muda.
6. O mesmo nódulo com vascularização nula × central e Doppler sim → o ACR TI-RADS é idêntico; só Domingos muda.
7. Liga o Doppler, preenche e desliga → o laudo fica idêntico ao do caso 1 com as mesmas medidas, sem resíduo.
8. Só o VPS esquerdo informado → só a linha esquerda sai; nenhum "____".

## 6. Perguntas para a rodada no concorrente (não observado no concorrente)

1. "Tireoide com Doppler" é um modelo separado ou um interruptor dentro da tireoide? A técnica muda?
2. Há uma escala do padrão vascular do parênquima? Por lobo ou global?
3. Pede VPS? De qual artéria? Interpreta o valor ou só o registra?
4. A vascularização do nódulo é escrita no texto? Ela entra na classificação apresentada?
5. Os linfonodos começam em branco ou "normais"?

## 7. Ordem de implementação sugerida

1. P0: padrão dos linfonodos em "não informado" e técnica condicionada ao que foi avaliado (D1).
2. P0: "vascularização normais" só com o padrão do parênquima informado; pendência quando o Doppler está "sim" sem padrão (D2).
3. P0: Chammas desabilitado e zerado sem Doppler (D3).
4. P1: campo de padrão do parênquima por lobo e biblioteca de hiperfluxo/hipofluxo (D4).
5. P1: título e técnica do estilo objetivo com Doppler (D5); artéria selecionável e aviso de VPS como `candidato` (D6).
6. P2: decisão do Luiz sobre descrever a vascularização do nódulo (D7); corrigir o atalho "Normal" do iOS (D8).
