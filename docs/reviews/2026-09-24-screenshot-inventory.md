# Inventário de screenshots — referência de concorrente (Laudário) — 2026-09-24

Fonte: 20 fotos HEIC (`~/Downloads/imagensparaver/IMG_8018`–`8026` e `8028`–`8038`), convertidas via `sips` para PNG em
`tmp-review/clinical-ui-20260924/images/` (gitignored; 5712×4284). Leitura visual feita em cópias reduzidas (2200 px).

**Convenções**

- **[OBS]** = observação direta na imagem. **[INF]** = inferência minha (não está visível). **[?]** = ilegível/ambíguo — não inventei.
- Nomes de controles e opções são registrados como rótulos de UI. **Frases do laudo do concorrente NÃO foram transcritas**; só parafraseei o efeito.
- Nenhum dado pessoal de paciente foi copiado (o formulário "Dados do Paciente" aparece vazio em 8018).
- Isto é inventário de UX/lógica de seleção, **não validação clínica** e não é conteúdo a copiar.

**Limitações gerais das fotos**: são fotos de um monitor (ângulo, moiré, brilho). Os controles não selecionados aparecem esmaecidos (cinza claro) e vários rótulos ficam quase ilegíveis; a rolagem corta o formulário no rodapé de cada foto. O laudo à direita só mostra texto de **próstata/técnica**; em **nenhuma** foto uma seleção de bexiga aparece refletida na prévia (todas as seleções de bexiga estão em "não citar").

---

## 0. Correção de escopo (importante)

O pedido diz "IMG_8018–8026 = bexiga". Pelo que vejo, **todas as 9 fotos são do editor "Próstata Transretal"**; a **bexiga é uma seção desse exame** (menu lateral: Dados do Paciente · Técnica · Indicação · **Bexiga** · Próstata · Vesículas Seminais · Cartograma · Exames Comparativos · Achados Adicionais · Recomendações).

| Foto | Conteúdo real |
|---|---|
| 8018 | Aba "Dados do Paciente" (vazia) + laudo-base normal na prévia |
| 8019 | Aba "Técnica" (aparelho, sonda, **repleção vesical**, limitações) |
| 8020 | Bexiga: **Situação** + **Avaliação funcional** (volume pré-miccional, espessura do detrusor) |
| 8021 | Bexiga: continuação da avaliação funcional + **Esvaziamento vesical** + início de Jatos |
| 8022 | Bexiga: **Jatos ureterais** + início de **Achados** |
| 8023 | Bexiga: **Achados** (debris, cistite, cálculo, coágulo, bexiga de esforço) |
| 8024 | Bexiga: **Achados** (bexiga de esforço marcada, ureterocele, massa vesical, endometriose vesical, sonda) |
| 8025 | **Próstata** (fim de cisto/utrículo, **Prostatite/abscesso**, Lesões focais) — não é bexiga |
| 8026 | **Próstata** (Situação/padrão principal: normal × HPB, Medidas e cálculos) — não é bexiga |

---

## 1. BEXIGA (prioridade) — IMG_8019 a IMG_8024

### 1.1 Estrutura geral da UI [OBS]

- Formulário em coluna única, **seções com título** (Situação · Avaliação funcional · Esvaziamento vesical · Jatos ureterais · Achados).
- **Padrão dominante = radio de "grupo exclusivo" com a 1ª opção "não citar"** (selecionada por padrão): quem não mexe não gera texto.
- **Achados = checkboxes**, cada um com **sub-opções** (checkboxes, listas suspensas `▾` e campos numéricos) que só fazem sentido dentro do achado-pai.
- Listas suspensas (`▾`) aparecem **dentro da linha da opção**, para lateralidade (direita/…) e para sub-classes (ex.: mobilidade, padrão de massa, topografia).
- Medidas: campos numéricos com unidade fixa (`cm`, `mm`, `mL`) ao lado; produtos `A × B × C cm (_ mL)` mostram **volume calculado** entre parênteses.
- Ausência de agrupamento bilateral: lateralidade é resolvida **por lista suspensa por item**, não por dois blocos.

### 1.2 Inventário por foto

#### IMG_8019 — Técnica (relevante para bexiga)

- **Aparelho** (radio): `não citar` [OBS, marcado].
- **Sonda** (radio): `não citar`; `sonda endocavitária via transretal` [OBS, marcado].
- **Repleção vesical** (radio, 4 opções + ausente): `adequada`; `parcial`; `excessiva (esvaziamento parcial realizado)` [OBS, marcado]; `ausente`. (Nesta foto "adequada/parcial/ausente" aparecem esmaecidos e a marcada é "excessiva…".) O rótulo da 1ª opção da lista pode ter "não citar" acima, cortado [?].
- **Limitações mais comuns** (checkboxes, esmaecidos, provavelmente nenhum marcado): `meteorismo intestinal`; `biotipo (obesidade)`; `limitações de posicionamento`; lista continua abaixo do corte [?].
- **Seleção → laudo [OBS, comparando 8018 × 8019]:** com "excessiva…" marcada, a frase de **Técnica** ganha uma ressalva de **avaliação vesical prejudicada por preparo inadequado**; em 8018 (sem seleção) essa ressalva não existe. **[INF]** a causa é a repleção excessiva/parcial; qual opção produz qual variação não é observável (só uma foto marcada).

#### IMG_8020 — Bexiga: Situação + Avaliação funcional

- **Situação** (radio): `não citar` [OBS, marcado]; `boa repleção`; `moderada repleção`; `pequena repleção`; `vazia`; `bexigoma / retenção urinária`.
- **Avaliação funcional** (checkboxes de bloco, esmaecidos):
  - `volume pré-miccional:` 3 campos numéricos `× × cm (_ mL)` → **volume calculado exibido**; linha abaixo `volume: [ ] mL` (campo direto). [OBS] Dois modos de entrada: 3 dimensões (calcula) **ou** volume direto.
  - `espessura do detrusor` → `medida 1 / medida 2 / medida 3` (mm) + `resultado:` (traço = valor calculado, **[INF]** média das 3 medidas).
- Seleção → laudo: nenhuma (tudo em "não citar"/desmarcado).

#### IMG_8021 — Bexiga: Esvaziamento vesical (+ fim da espessura do detrusor)

- **Esvaziamento vesical** (radio): `não citar` [OBS, marcado]; `volume desprezível`; `resíduo pós-miccional:` (3 campos `× × cm (_ mL)` + `volume: [ ] mL`); `dupla micção` → `1ª micção:` (3 dims + volume mL) e `2ª micção:` (3 dims + volume mL).
- **Checkboxes soltos (esmaecidos):** `classificação na conclusão`; `paciente sondado / sem avaliação de resíduo`.
- Seleção → laudo: nenhuma visível. **[INF]** `classificação na conclusão` faria o resíduo ser classificado (ex.: desprezível/aumentado) na conclusão; **não há foto mostrando o efeito** [?].
- Início de **Jatos ureterais**: `não citar` marcado.

#### IMG_8022 — Jatos ureterais + início de Achados

- **Jatos ureterais** (radio): `não citar` [OBS, marcado]; `presentes e simétricos`; `presentes, reduzidos à [direita ▾]`; `não caracterizados durante o período de observação`; `ausência unilateral completa [direita ▾]` → sub-checkbox `cálculo associado no trajeto ureteral ipsilateral [ ] mm`.
- **Lateralidade** = lista suspensa **dentro** da opção (valores além de "direita" não visíveis [?]; **[INF]** direita/esquerda).
- **Achados** (checkboxes com sub-opções):
  - `material ecogênico em suspensão / sedimento (debris)` → lista suspensa `móvel às mudanças de decúbito ▾` (texto parcialmente ilegível [?]; **[INF]** lista de mobilidade) + checkbox `formando nível líquido-líquido`.
  - `cistite / espessamento parietal medindo [ ] cm` → sub-checkboxes `debris`, `cistite enfisematosa`, `sugerir cistite`.
  - `cálculo vesical medindo [ ] cm` → `móvel às mudanças de decúbito`, `impactado na JUV [direita ▾]`, `múltiplos cálculos menores`.

#### IMG_8023 — Achados (mesma região, rolada)

- Confirma 8022 e acrescenta:
  - `coágulo / hematoma medindo [ ] × [ ] cm` → `sem fluxo ao Doppler`, `móvel à mudança de decúbito/compressão`.
  - `bexiga de esforço / neurogênica` → sub-bloco `medidas do detrusor` (`medida 1/2/3` mm + `resultado`) (o mesmo bloco de espessura do detrusor de 8020 reaparece **dentro do achado** [OBS]).
- Seleção → laudo: nenhuma visível.

#### IMG_8024 — Achados (final visível)

- **`bexiga de esforço / neurogênica`: marcada** [OBS] (única seleção da bexiga nas 5 fotos) — **a prévia do laudo à direita não muda por causa dela** [OBS]. **[INF]** ou a prévia não atualizou, ou o achado só gera texto com o sub-bloco preenchido; **ambíguo [?]**.
- `ureterocele [direita ▾]` → `medidas: [ ] × [ ] cm`; `cálculo associado medindo [ ] mm`.
- `massa vesical [polipoide ▾]` → `medindo [ ] × [ ] × [ ] cm`; `topografia: [trígono ▾]`; `vascularizada ao Doppler`; `calcificação de permeio`. Lista do tipo de massa mostra "polipoide" como valor exibido (demais valores ilegíveis [?]); topografia mostra "trígono" (demais [?]).
- `endometriose vesical` → `medindo [ ] × [ ] × [ ] cm (vol.: 0,0 cm³)`; `mucosa preservada`.
- `sonda vesical de demora` → sub-opção sobre bexiga vazia ao redor do balão (texto completo parcialmente ilegível [?]).
- A lista pode continuar abaixo do corte [?].

### 1.3 Padrões de interação da bexiga (para a interface própria) — [INF]

1. **Radio "não citar" + estados** para o que é estado (repleção, esvaziamento, jatos) — equivalente a uma **lista única** na nossa UI (ex.: "Repleção ▾"), poupando o rótulo "Estado".
2. **Achados = checklist** com sub-opções condicionais; muitos sub-itens repetem: `móvel às mudanças de decúbito`, `Doppler`, `medindo`, `lateralidade`.
3. **Lateralidade** por item (JUV, ureterocele, ausência de jato) → seletor curto D/E, não duas colunas.
4. **Medidas**: 1 dimensão (cm/mm), 2 dimensões, 3 dimensões com volume calculado. Bloco "detrusor 3 medidas → resultado" reutilizado em dois lugares.
5. **Tabs/menu lateral** separando Técnica × Bexiga × Próstata: informação de bexiga se distribui em **Técnica (repleção/limitação)** e **Bexiga (achados)**.

### 1.4 Gap inicial × schemas locais (leitura apenas)

Locais, hoje **4 módulos de bexiga divergentes**:

| Exame | Arquivo | Campos atuais |
|---|---|---|
| Abdome total | `organs/bexigaAbdome.ts` | replecao (adequada/insuficiente), parede (normal/espessada/trabeculada), conteudo (debris, cálculo, sonda, divertículo), volume_pre, espessura_parede, residuo |
| Vias urinárias | `organs/viasUrinarias.ts` | avaliada (sim/não), parede (checklist), conteudo (debris, cálculo, sonda), volume_pre (kind volume), espessura_parede, residuo |
| Próstata suprapúbica | `organs/prostataSuprapubica.ts` | achados (espessamento, trabeculação, cálculo, divertículo), volume_pre, residuo (não informado/desprezível/valor+mL) |
| Pelve feminina | `organs/pelveFeminina.ts` | só `estado: normal` (sem alterações; via TV não avalia) |

Gaps em relação ao que a foto mostra (candidatos, **não** decisão clínica):

- **Sem** situação/repleção graduada (boa/moderada/pequena/vazia/bexigoma) além de adequada/insuficiente.
- **Sem** espessura do detrusor por 3 medidas, **sem** esvaziamento com dupla micção, **sem** "paciente sondado".
- **Sem** jatos ureterais (com lateralidade e cálculo associado).
- **Sem** cistite (enfisematosa), coágulo/hematoma, bexiga de esforço/neurogênica, ureterocele, massa vesical (tipo/topografia/Doppler/calcificação), endometriose vesical; divertículo existe só em 2 dos 4 módulos.
- **Sem** sub-opções (mobilidade, impactação na JUV, múltiplos cálculos, nível líquido-líquido).
- **Sem** lateralidade nos achados; **sem** reuso — a pelve não tem alterações, o que contradiz o pedido "mesmo bloco no abdome e na pelve".
- Unidade do resíduo diverge entre módulos (mL × cm³ em vias urinárias). **[OBS no código, não na foto]**

---

## 2. PRÓSTATA (fora do escopo pedido, mas nas fotos 8025–8026) — resumo

- **8025:** `formação cística` (radio) → `topografia: [linha média ▾]`, `medindo × × cm (vol.: 0,0 cm³)`, sub-checkboxes `conteúdo espesso/hemorrágico`, `extensão cranial / ducto de Müller`, `comunicação uretral / utrículo`. **Prostatite / abscesso** (radio): `ausente / não citar`; `sinais de prostatite` [marcado] → `padrão: [hipoecogenicidade difusa ▾]` (valor selecionado visível), checkbox `hiperemia ao Doppler` [marcado], `prostatite crônica / granulomatosa`, `abscesso medindo × × cm (vol.)`. **Lesões focais / nódulos**: botões `+ Adicionar lesão` / `− Remover última`; texto de ajuda diz que cada item é uma lesão, com checkbox para incluir no laudo e **hora (1–12) opcional** (posição em relógio).
  - **Seleção → laudo [OBS]:** com prostatite/hipoecogenicidade/hiperemia, a prévia passa a descrever aumento de dimensões, hipoecogenicidade difusa e aumento da vascularização ao Doppler no corpo, e a **conclusão** ganha uma linha sobre processo inflamatório/infeccioso prostático. **[?]** o "aumento de dimensões" não é explicado por nada visível (volume está 0,0).
- **8026:** **Situação/padrão principal** (radio): `próstata normal / habitual` [marcado]; `hiperplasia prostática benigna (HPB)` → `padrão: [tipo 1 – crescimento lateral ▾]`, `cistos de degeneração`, `calcificações na pseudocápsula cirúrgica`, `uretra prostática: [sem alterações significativas ▾]`; `ausente / status pós-prostatectomia`. **Medidas e cálculos:** `medidas × × cm`, `volume` e `peso` calculados, nota de referência de volume normal, checkbox `manter próstata normal mesmo com volume acima da referência`, checkbox `citar aumento volumétrico prostático na conclusão` [marcado]. Depois: "Variações da normalidade / achados incidentais".
  - **[?]** Em 8026 "próstata normal" está marcado mas a prévia ainda descreve o quadro de prostatite de 8025 — a prévia não atualizou ou a foto capturou o estado antes do refresh.

---

## 3. RECOMENDAÇÕES — IMG_8028

Contexto: aba **Recomendações** do exame "Próstata Transretal" (última entrada do menu lateral; **aparece também nos menus de elastografia e cotovelo** — 8029, 8035 — logo é um bloco transversal a todos os exames) [OBS].

- **Interruptor mestre** (checkbox destacado, desmarcado): `incluir bloco de RECOMENDAÇÕES no laudo final`. **[INF]** desmarcado = bloco não aparece; nada abaixo entra sem ele (não há foto do estado marcado).
- Grupo **Complementares** (checkboxes, todos desmarcados): `correlação clínica`; `acompanhamento ultrassonográfico seriado`; `ressonância magnética para complementação`; `correlação com resultado de biópsia`; `ressonância magnética multiparamétrica de próstata`; `correlação com PSA / avaliação urológica`.
  - **[INF]** os 4 primeiros são genéricos e reutilizáveis entre exames; os 2 últimos são específicos de próstata → o bloco tem **itens genéricos + itens por exame**.
- Grupo **Recomendações adicionais**: apenas o título é visível; o corpo (provavelmente texto livre) está fora do enquadramento [?].
- Seleção → laudo: **nenhuma observável** (nada marcado). A prévia mostra só técnica/análise/opinião; não há seção de recomendações renderizada [OBS].
- Sobre "categorias que ainda não temos": nesta foto só há **uma** categoria nomeada (Complementares) + "Recomendações adicionais". Se havia outras categorias, não estão visíveis [?].
- Gap local: não encontrei módulo/campo de "recomendações" no compositor (`compose.ts`/`types.ts`); recomendações existem hoje só como **frases fixas dentro de alguns órgãos** (ex.: vesícula em porcelana; observação na próstata suprapúbica).

---

## 4. ELASTOGRAFIA HEPÁTICA — IMG_8029, 8030, 8031

Exame separado ("Medicina Interna › Elastografia Hepática", URL `laudo=elastografiaHepatica`). Menu lateral [OBS, 8029]: Dados do Paciente · Técnica e Protocolo · Indicação · Medições e Qualidade · Interpretação (Regra dos 4) · Fatores de Confusão · Seguimento / Comparação · Elastografia Esplênica · Quant. Gordurosa · Tabela evolutiva · Exames Comparativos · Recomendações.
Observação estrutural: **elastografia esplênica e quantificação de gordura são abas do mesmo exame** (8031, 8032).

### IMG_8029 — Dados do Paciente (vazio) + prévia
- Formulário do paciente vazio [OBS]; nada a inventariar de controles clínicos.
- **Prévia = laudo-base já preenchido por padrão**, com: título; bloco "técnica e protocolo" (técnica 2D-SWE, menção a equipamento e a "5 medições (padrão recomendado)"); **tabela de interpretação** de rigidez com 5 faixas em kPa e coluna de significado; bloco de "considerações técnicas" (fatores de confusão); **referência bibliográfica** ao final (consenso SRU, Barr et al., Radiology 2020;296:263-274) [OBS].
- **[INF]** esse texto/tabela é **estático por padrão** (aparece sem nenhuma seleção nas abas vistas). As frases não foram transcritas.

### IMG_8030 — mesma prévia, ampliada/rolada
- Confirma que a interpretação é uma **tabela real de 2 colunas** (faixa × significado), com 5 linhas: `< 5,0`, `> 5,0 a < 9,0`, `9,0 a 13,0`, `> 13,0`, `> 17,0` kPa [OBS]. As faixas se sobrepõem (> 13,0 e > 17,0 coexistem) — foi como estava na tela [OBS]; se é intencional (regra dos 4 / níveis) não dá para afirmar [?].
- Aparece o tooltip da barra de formatação (sublinhado) — irrelevante para o conteúdo.
- Tabela e referência **fazem parte do texto editável** do laudo (editor rico) [INF].

### IMG_8031 — Elastografia Esplênica
- Topo (cortado): grupo de radios sobre a realização/qualidade: `realizada, qualidade adequada` (cortado); `realizada, qualidade técnica limitada (com ressalva)`; `não realizável por limitação técnica`. O título do grupo não é visível [?]. Nenhuma marcação legível [?].
- **Número de medições e valor mediano esplênico:** `nº medições` [campo]; `mediana` [campo] `kPa`; `mediana` [campo] `m/s`; `IQR` [campo] `kPa`; `IQR/M` [campo] `%`. **[INF]** kPa e m/s são a mesma grandeza em duas unidades (possível conversão automática — não observada [?]); IQR/M é razão calculável.
- **Interpretação esplênica – Modelo Baveno VII-SSM:** `Classe identificada: –` (campo **calculado**, vazio) + tabela de 3 linhas: `SSM < 21 kPa`, `SSM 21 a 50 kPa`, `SSM > 50 kPa`, cada uma com um significado clínico curto. Nota em texto muito fraco indicando que a linha correspondente ao valor digitado é **destacada automaticamente** (parcialmente legível [?]).
- Seleção → laudo: nenhuma observável.

---

## 5. QUANTIFICAÇÃO GORDUROSA — IMG_8032, 8033, 8034

Aba **Quant. Gordurosa** do exame de elastografia hepática. Observação: os títulos de seção que aparecem ao rolar (Fabricante e tecnologia → Condições técnicas → Nº de medidas → Conformidade com jejum → Valores e Qualidade → Interpretação → Contexto clínico → Achados complementares → Fatores de Confusão) sugerem **uma página longa com âncoras** no menu lateral (**[INF]**; em 8033 aparece "Valores e Qualidade", que não é item do menu — o menu diz "Medições e Qualidade" [?]).

### IMG_8032
- **Fabricante e tecnologia** (radio, 6 opções, todas com fabricante + tecnologia): `SAMSUNG Medison – QUS (USFF: TAI™ + TSI™)` [marcada]; `SAMSUNG Medison – QUS (TAI isolado)`; `GE Healthcare – UGAP`; `Canon Medical – ATI`; `Siemens Healthineers – UDFF`; `Philips / Outro (Atten)`. + `modelo do aparelho:` [campo de texto].
- **Condições técnicas de aquisição** (radio, 3): `janela acústica adequada, avaliação completa` [marcada]; `… parcialmente limitada, avaliação subótima`; `exame tecnicamente não realizável`.
- **Número de medidas realizadas** (radio): `5 medidas (padrão recomendado)` [marcada]; `3 a 4 medidas:` [campo]; `menos de 3 medidas (abaixo do mínimo):` [campo].
- Seleção → laudo: o padrão (Samsung + 5 medições) **coincide** com o que a prévia da 8029 já mostra (equipamento Samsung, 5 medições) — **[INF fraca]**: pode ser default compartilhado com "Técnica e Protocolo"; não dá para provar a ligação [?].

### IMG_8033
- No topo: um campo `distância: 2,0 cm` (rótulo/seção cortados) [OBS]; o contexto (distância de quê) não é legível [?].
- **Conformidade com o protocolo de jejum:** checkbox `jejum não confirmado ou inferior a 2 horas (citar ressalva)`. **[INF]** marcar acrescenta ressalva de jejum ao laudo.
- **Valores e Qualidade → Valor quantificado:** `USFF (TAI/TSI):` [campo] `%`; checkbox `abaixo do limite de detecção (< 3%)`. **[INF]** o rótulo do campo acompanha a tecnologia escolhida (não observável com outra opção [?]).
- **Índice de qualidade** (`desejável ≥ 0,60`): `Índice de Qualidade R²:` [campo].
- **Interpretação → Classificação automática:** texto de placeholder mandando preencher o valor na aba de valores (**cálculo automático**, vazio) [OBS].
- **Contexto clínico:** lista suspensa com valor exibido `não especificado / MASLD geral` (demais valores não visíveis [?]).

### IMG_8034
- **Contexto clínico** (lista suspensa, mesma da 8033) `não especificado / MASLD geral ▾`.
- **Achados complementares** (checkboxes, desmarcados): `concordância com modo B`; `discordância com modo B`; `limitação do modo B isolado`; `correlação com MRI-PDFF`. **[INF]** "concordância" e "discordância" são mutuamente exclusivas mas aparecem como checkboxes (não como radio) [OBS].
- **Fatores de Confusão → Fatores que podem interferir na quantificação** (checkboxes, esmaecidos): `fibrose hepática avançada conhecida`; `obesidade acentuada`; `lesão focal hepática na região de aquisição`; `doença infiltrativa ou depósito não gorduroso`; `ascite volumosa`; `hepatite aguda em atividade`; a lista pode continuar [?].
- Seleção → laudo: nenhuma observável.

### Gap local (leitura apenas), seções 4–5
- Não há módulo de elastografia (hepática/esplênica) nem de quantificação de gordura em `apps/web/src/lib/deterministic/organs/`. A busca por "elastograf/esteatose/gordurosa" só acha **graus de esteatose** em `figado.ts` (leve/moderada/acentuada, por ecotextura), sem valor quantitativo, fabricante ou classificação automática.
- Necessidades visíveis: campos numéricos com **cálculo/classificação automática** (IQR/M, Baveno, faixas em kPa), tabelas de referência no texto, referência bibliográfica, e **seletor de tecnologia** que muda o rótulo/limiares (INF).

---

## 6. MUSCULOESQUELÉTICO (COTOVELO) — IMG_8035, 8036, 8037, 8038

Exame "Ultrassonografia › Cotovelo" (URL `laudo=cotovelo`). Menu lateral [OBS, 8035]: Dados do Paciente · Técnica · Indicação · Identificação · Pele e Subcutâneo · Plano Muscular · Superfície Óssea · Articulação · T. Distal do Bíceps · T. Extensor Comum · T. Flexor Comum · T. Tríceps Braquial · Bursas · N. Ulnar · N. Radial e Mediano · Exames Comparativos · Achados Adicionais (e Recomendações, cortado).

### IMG_8035 — Dados do Paciente + prévia
- Formulário do paciente vazio [OBS].
- Título da prévia inclui o **lado** (`… DO COTOVELO DIREITO`) [OBS]; a aba **Identificação** provavelmente define o lado, mas não foi fotografada [?].
- **Prévia (padrão normal):** **um parágrafo por estrutura** do menu — pele/subcutâneo; superfícies ósseas; derrame articular; bíceps; extensores+flexores comuns numa só frase; tríceps; bursas; nervo ulnar; …. **[INF forte]** cada item do menu = uma frase normal independente; estruturas afins podem ser fundidas quando normais (extensores + flexores).

### IMG_8036 — Tendão Extensor Comum (Face Lateral) à Direita
- **Título da seção já traz estrutura + face + lado** [OBS].
- **Padrão ecográfico** (radio): `normal` [marcada]; `tendinopatia`; `rotura parcial` → `grau:` [▾ `baixo grau (< 50%)`]; `tipo:` [▾ `articular (profundo)`]; `localização:` [▾ `porção insercional (footprint)`]; `medidas (E × T × L):` [campo]×[campo]×[campo] `cm`; `rotura completa` → `extensão transversa:` [campo] `cm`; `retração do coto:` [▾ `sem retração significativa do coto tendíneo`]; `pós-operatório` → `fibras:` [▾ `integridade aparente das fibras tendíneas`]; `indefinição técnica`.
  - **Sub-controles ficam visíveis (esmaecidos) mesmo com "normal" marcado** [OBS] — o mesmo padrão de bexiga. Valores exibidos nas listas são os **defaults** (1º item); demais valores ilegíveis [?].
  - `tendinopatia` **não** mostra sub-opções na foto [OBS] (pode não ter, ou ficar oculto [?]).
- **Achados complementares** (checkboxes, esmaecidos): `tendinopatia calcária`; `entesopatia no epicôndilo lateral`; mais itens abaixo do corte [?].

### IMG_8037 — Tendão Flexor Comum (Face Medial) à Direita
- **Estrutura de controles idêntica à 8036** (mesmo radio, mesmos sub-campos, mesmos defaults) [OBS].
- **O que muda:** título (flexor/face medial) e o achado complementar `entesopatia no epicôndilo medial` (na 8036: lateral); `tendinopatia calcária` igual [OBS].
- Conclusão **[INF forte]**: o "padrão de tendão" é **um único bloco parametrizado por (nome, face/lado, epicôndilo/entese)** — exatamente o reaproveitamento pedido.

### IMG_8038 — Nervos Radial e Mediano à Direita (e à Esquerda)
- **Nervo radial / NIP:** checkbox `avaliar nervo radial / NIP` → `achado:` [▾ `normal`]; `AST:` [campo] `mm²`; `Doppler:` [▾ `sem hipervascularização intraneural`].
- **Nervo mediano:** checkbox `avaliar nervo mediano` → mesmos 3 controles (achado ▾, AST mm², Doppler ▾) [OBS]. **[INF]** AST = área de secção transversa.
- **Achados complementares:** `causa compressiva estrutural identificada` → `estrutura:` [▾ `cisto sinovial adjacente`] (demais valores ilegíveis [?]); `comparação com lado contralateral realizada`.
- **Bilateral no mesmo formulário:** logo abaixo aparece o cabeçalho `Nervos Radial e Mediano à Esquerda` com `Nervo radial / NIP` repetido [OBS] → o competidor **repete o bloco por lado**, direita primeiro. Não vejo controle de "adicionar lado" nem por que o título da prévia diz só "direito" (8035) [?].
- Padrão de nervo: **checkbox de inclusão + lista de achado + medida + lista de Doppler**, o mesmo para radial e mediano.

### Padrões reaproveitáveis (MSK) — [INF]
1. Bloco "tendão": `{normal, tendinopatia, rotura parcial(grau, tipo, localização, medidas), rotura completa(extensão, retração), pós-operatório(fibras), indefinição técnica}` + complementares por estrutura.
2. Bloco "nervo": `{avaliar, achado ▾, AST mm², Doppler ▾}` + complementares (causa compressiva, comparação contralateral).
3. Lateralidade por **repetição de seção com título "à Direita/à Esquerda"**.
4. Listas suspensas com **1º item = padrão normal**, para não gerar clique em normal.

### Gap local (leitura apenas)
- `organs/musculoesqueletico.ts`: cada estrutura tem só `estado: normal|alterado` + 2 campos de **texto livre** (descrição e diagnóstico); segmento e lado são **controles globais do exame**, não por estrutura; sem grau/tipo/localização/medidas/retração/pós-operatório; sem bloco de nervos (AST/Doppler); sem achados complementares; segmento cotovelo tem 4 estruturas (extensores, flexores, bíceps/tríceps distais, derrame) contra ~13 abas do competidor (pele, plano muscular, superfície óssea, articulação, tríceps, bursas, ulnar, radial/mediano, …).
- Não há "adicionar lado" / exame contralateral hoje além do seletor Direito/Esquerdo único.

---

## 7. Cobertura e ambiguidades

**Cobertura: 20/20 imagens lidas e inventariadas.**

| Foto | Tema | Lida | Seleção→laudo observável? |
|---|---|---|---|
| 8018 | Dados do paciente (próstata) | ✔ | — (base de comparação) |
| 8019 | Técnica/repleção | ✔ | **Sim** (8018×8019: ressalva vesical) |
| 8020 | Bexiga: situação/avaliação funcional | ✔ | Não |
| 8021 | Bexiga: esvaziamento | ✔ | Não |
| 8022 | Bexiga: jatos/achados | ✔ | Não |
| 8023 | Bexiga: achados | ✔ | Não |
| 8024 | Bexiga: achados (bexiga de esforço marcada) | ✔ | **Não** (ambíguo) |
| 8025 | Próstata: prostatite | ✔ | **Sim** (corpo + conclusão) |
| 8026 | Próstata: situação/medidas | ✔ | Ambíguo (prévia parece desatualizada) |
| 8028 | Recomendações | ✔ | Não |
| 8029 | Elastografia: paciente + prévia | ✔ | — (texto padrão) |
| 8030 | Elastografia: prévia ampliada | ✔ | — |
| 8031 | Elastografia esplênica | ✔ | Não |
| 8032 | Quant. gordurosa: tecnologia/aquisição | ✔ | Possível (Samsung/5 medições) — não provado |
| 8033 | Quant. gordurosa: valores/qualidade | ✔ | Não |
| 8034 | Quant. gordurosa: contexto/complementares | ✔ | Não |
| 8035 | Cotovelo: paciente + prévia | ✔ | — (texto padrão) |
| 8036 | Cotovelo: extensor comum | ✔ | Não |
| 8037 | Cotovelo: flexor comum | ✔ | Não |
| 8038 | Cotovelo: nervos radial/mediano | ✔ | Não |

**Ambiguidades / o que ficou sem prova**

1. **Bexiga**: só 1 par antes/depois útil (8018×8019, repleção → técnica). Nenhum achado de bexiga (cálculo, cistite, massa, ureterocele…) teve o texto gerado fotografado; **a relação seleção→frase da bexiga precisa ser especificada por nós**, não copiada. A "bexiga de esforço" marcada em 8024 não alterou a prévia [OBS].
2. **Valores das listas suspensas** (lateralidade, mobilidade, tipo de massa, topografia, contexto clínico, achado do nervo, causa compressiva) só mostram o **valor padrão**; as demais opções estão ilegíveis. Não as inventei.
3. **Fotos de monitor**: moiré e esmaecimento; textos em cinza-claro (controles não selecionados) foram lidos com cautela e marcados [?] quando duvidosos.
4. **Lista de Achados da bexiga** pode continuar abaixo do corte da 8024 (após "sonda vesical de demora").
5. **Prévia da 8026** ainda descreve prostatite com "próstata normal" marcada — desatualização ou estado intermediário [?].
6. **Recomendações**: só 1 categoria visível; o estado "incluir bloco" marcado não foi fotografado.
7. **Bilateral no MSK**: existe repetição por lado, mas não se sabe se o laudo inclui os dois lados ou só o marcado (título da prévia diz "direito").
8. **Faixas de kPa** da tabela hepática se sobrepõem na tela [OBS]; interpretação clínica **não validada** aqui — precisa de fonte (SRU/Baveno VII) antes de virar conteúdo nosso.
9. **Nada disto é validação clínica**: é inventário de interface e lógica de seleção de um produto de terceiros; frases, faixas e classificações precisam de referência própria (CBR, SRU, ACR etc.) antes de implementar.

**Critério GO:** 20/20 imagens cobertas com evidência (observação × inferência separadas) e ambiguidades listadas. **Nenhum código foi alterado.**
