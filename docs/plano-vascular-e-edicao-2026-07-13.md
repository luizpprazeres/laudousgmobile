# Plano: edição incremental (obstétrico/pelve) + redesenho vascular

**Data:** 2026-07-13 · **Autor:** Claude (sessão autônoma) · **Status:** proposto (aguarda GO do Luiz + review Dex)

Dois eixos pedidos pelo Luiz em 13/07, "um passo atrás para dar dois à frente":
1. **Edição incremental** — deixar obstétrico/Doppler-obstétrico/pelve aceitarem comandos livres de ajuste ("adicione", "substitua Y por Z") sem duplicar nem jogar medida na região errada.
2. **Vascular** — (a) escrita 100% writer com liberdade real; (b) desenho no padrão real dos vasculares (4 vistas L/A/M/P, 2 membros, base em baixa opacidade, alterações evidentes).

Ganho rápido JÁ aplicado em prod: `FLEXIBLE_CONCLUSION=true` (conclusão livre sobrevive na OBSTETRICA).

---

## DIREÇÃO ESTRATÉGICA (13/07) — writer-first com espinha determinística

Decisão de arquitetura (Luiz + Dex2 + Claude): em prol da missão, mover o app para **writer-first**, mas SEM jogar fora o que protege. Princípio: **eliminar a REDAÇÃO determinística; manter FATOS e SEGURANÇA determinísticos.**

- **Redação → writer.** Toda a prosa (estrutura, frases, o inusitado) vai pro writer com few-shots da casa. Mata rigidez, "colete-de-força", medida no lugar errado. (Prova: showcase da cartografia venosa saiu fiel.)
- **Cálculo → determinístico, injetado como FATO.** Peso fetal, IG, divergência ponderal, soma do ILA — o LLM NUNCA calcula (alucina número). Fica no código e entra no writer como restrição que ele usa literal.
- **Segurança → guards pós-writer.** Doppler umbilical falso-normal, "processo expansivo ≠ neoplasia" etc. permanecem, independente de writer/renderer.

**Arquitetura "extrai-calcula-escreve":** extrai só os números que precisam de conta/segurança (rápido) → calcula deterministicamente → writer escreve TUDO livre a partir do ditado cru + esses fatos → validador estrutural leve + guards. Velocidade tende a neutra/melhor (writer direto pula a montagem) — MEDIR antes de migrar os carro-chefe.

**Migração:** categoria por categoria, flag-gated, com showcase de validação (como o venoso); os mais usados por ÚLTIMO e com mais cuidado; sempre com a espinha (cálculo + segurança + validador). A edição incremental (Parte A) vem PRIMEIRO — é ortogonal e de-risca a migração.

---

## PARTE A — Edição incremental + interpretador de comandos

### Diagnóstico (confirmado no código)
- OBSTETRICA e PELVE_FEMININA são **renderer determinístico**: re-extração num schema fechado descarta frase livre.
- DOPPLER_OBSTETRICO é **writer**, mas o `commandGuard` só age na conclusão e ignora corpo/substituição.
- **Não existe edição incremental**: todo ajuste re-dita o texto inteiro e re-gera do zero (`apps/mobile/.../state.ts:73-104`) → duplicação + medida deslocada.
- `operations.ts` já existe (puro, auditável): suporta `add_conclusion_item`, `replace_phrase`, `insert_before/after`, `remove_conclusion_item`. Falta o que EXTRAI operações do ditado (hoje só `add_conclusion_item`). O `feat/command-interpreter-v1` (não mergeado) tem o interpretador por LLM + parser pré-geração.

### Solução (opera sobre o TEXTO final, não sobre o schema → vale p/ renderer e writer)
Fluxo de EDIÇÃO separado da GERAÇÃO:
1. Com laudo `done`, o médico dita um ajuste.
2. **Interpretador (LLM, 1 chamada curta)** classifica a intenção: (a) comando de edição, (b) conteúdo novo pra anexar, (c) laudo novo. Se (a)/(b), extrai `ReportOperation[]`.
3. **Aplicador determinístico** (`operations.ts`) aplica as ops ao `final_output` carregado do report — **sem re-extrair** → sem duplicação, sem medida deslocada.
4. Fallback: baixa confiança → mantém comportamento atual (ou pede confirmação).

### Caso de referência (Luiz 13/07) — o padrão-ouro da feature
Laudo obstétrico pronto, mas alucinou a frase do líquido. Médico aperta "Ajustar laudo" e fala: *"muda só a frase do líquido, ILA 10,4"*.
- **Interpretador (não-robótico):** entende a INTENÇÃO, não a letra — "ILA 10,4" vira a frase canônica da casa *"O índice do líquido amniótico mede 10,4 cm."* (NÃO insere "ILA mede 10,4 cm" cru).
- **Aplicação cirúrgica:** localiza SÓ a linha do líquido e troca apenas ela; resto **byte-idêntico**. Zero risco de re-alucinar biometria/placenta/conclusão.
- **Rede de segurança:** validador confirma que **só 1 linha (ou o alvo declarado) mudou** — se o LLM reescrever demais, BARRA e pede confirmação. Diff-check contra o original.
- **Dualidade** = a essência da direção estratégica: LLM ENTENDE + determinístico APLICA.

### Design FECHADO do A1 (Claude 13/07) — "laudo editado inteiro + diff-guard"
Decisão: o interpretador devolve o **laudo EDITADO INTEIRO** (contexto pleno → coloca a frase certa no lugar certo, redação canônica) e um **diff-guard determinístico** trava o escopo. Mais geral e mais seguro contra over-edit que localizar linha "no escuro". (operations.ts fica disponível p/ ops específicas, mas o core é laudo+diff.)

**Build A1-core (backend, flag `EDIT_INCREMENTAL` OFF):**
- `editReport({ baseText, instruction, category, signal }) → { editedText, changedLines, accepted, reason }`.
- **Interpretador (LLM, temp 0):** system = "Você EDITA um laudo de US. Dado o laudo ATUAL e um ajuste falado pelo médico, devolva o laudo editado para satisfazer SÓ aquele ajuste, com a redação canônica da casa, e TODO o resto BYTE-IDÊNTICO. NÃO conserte/reescreva/reordene nada não pedido. Saída = só o laudo inteiro editado." Input = laudo atual + instrução.
- **Diff-guard determinístico:** diff por linha original×editado. Aceita se linhas alteradas ≤ limite (ex.: 3) e nenhuma seção protegida mudou sem ser pedida; senão REJEITA (devolve original + reason "edição ampla, confirme"). Garante "só aquela frase".
- **Goldens:** OBSTETRICA (caso do líquido: "muda a frase do líquido, ILA 10,4" → só a linha do líquido vira "O índice do líquido amniótico mede 10,4 cm."), DOPPLER_OBSTETRICO, PELVE.
- **A1b (depois):** wiring no route (payload `{ edit_of_report_id, instruction }`) + botão "Ajustar laudo" no mobile (estado done → mic → edita → mostra o que mudou).

### Por que resolve o medo "writer = mais lento"
A geração base continua igual. Só o AJUSTE ganha um atalho rápido (1 LLM pequeno de interpretação + apply determinístico). Não reescreve o laudo.

### Fases
- **A1** (núcleo, flag-gated): portar `command-interpreter-v1`; endpoint/caminho de edição `{ report_id, instrução }`; aplicar via `operations.ts`; afordância de "Ajustar laudo" no app. Golden tests + review Dex1/Dex2. Categorias: começar por DOPPLER_OBSTETRICO e OBSTETRICA.
- **A2**: vocabulário de operações no CORPO (não só conclusão) + `replace/insert/remove` a partir do ditado; camada flexível de corpo (`observacoes_corpo_livres`, previsto no design, nunca implementado) + propagar `itens_conclusao_livres` p/ PELVE.
- **A3**: auto-classificação (sem botão) — o app decide sozinho se a fala é ajuste ou laudo novo.
- Rollout: flag OFF → piloto → validar com laudos reais → ligar.

### Riscos
São categorias carro-chefe → **golden tests obrigatórios**, review Dex, flag-gated, rollout gradual. O interpretador não pode confundir "laudo novo" com "edição" (fallback conservador).

---

## PARTE B — Vascular: escrita (writer)

### O que os laudos reais ensinam (Alana de Almeida Mota, 2018 Dra. Sirlene / 2023)
- **Título:** "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DO SISTEMA VENOSO SUPERFICIAL DOS MEMBROS INFERIORES (CARTOGRAFIA)".
- **Estrutura por membro (regra da casa):** blocos separados "Membro Inferior Direito" e "Membro Inferior Esquerdo" — SEMPRE os dois, nunca texto único.
- **Ordem canônica de achados (guia, não camisa-de-força):** segmento fêmoro-poplíteo → junção safeno-femoral → safena magna (+ refluxo/topografia) → medidas por nível (croça; coxa 3 terços; joelho; perna 3 terços) → ramos tributários (localização/calibre/profundidade) → varicosidades → perfurantes → junção safeno-poplítea → safena parva → veias musculares.
- **Localização LIVRE e reiterativa (o coração do pedido):**
  - "…refluxo segmentar na safena magna, desde o nível da região inguinal (válvula pré-terminal insuficiente) até **46 cm acima da face plantar**, onde é drenado através de ramo tributário posterior."
  - Cadeias de transferência: "desde 48 até 39 cm… transferido através de ramo tributário posterior, e drenado através de ramo tributário anterior, e desde 39 até 32 cm…".
  - Medidas seguem o FLUXO da fala: "drenados na magna aos **43 e 41 cm** acima da face plantar, medindo **1,6 e 1,5 mm**, a uma profundidade de **0,2 e 0,2 cm**".
- **Dois estilos** (2018 com bloco "Medidas:" explícito; 2023 em prosa "diâmetros em torno de…") → o writer precisa acomodar variação.
- **Conclusão:** curta, referencia o desenho — "Refluxo segmentar na safena magna bilateralmente (**vide esquema**); Varizes superficiais bilaterais (vide esquema)".

### Plano de escrita
- DOPPLER_VENOSO_MMII **permanece writer_guarded** (já é). Determinístico só no desenho (chave `DOPPLER_VENOSO_MMII_SCHEME`, já separada).
- **Refinar o prompt do writer:** (1) sempre dois blocos por membro; (2) ordem canônica como GUIA; (3) **preservar localização/medida exatamente como ditadas — nunca re-slotar** (se a medida vem depois da região, ela pertence onde o médico associou); (4) convenções da casa ("X cm acima da face plantar", "profundidade de Y cm em relação à pele", mm, "vide esquema").
- **Few-shots** a partir dos laudos reais (anonimizados) — os dois estilos como exemplares.
- **Guards só ESTRUTURAIS** (garantir os dois blocos; conclusão referencia esquema quando há desenho). **Nenhum guard que mexa em conteúdo/medida.**

---

## PARTE C — Vascular: desenho (4 vistas)

### O que os esquemas reais ensinam
- **Layout:** 2 linhas — MID (membro inf. direito) em cima, MIE embaixo. 4 colunas por linha: **L (lateral), A (anterior), M (medial), P (posterior)** — 8 silhuetas.
- **Base:** silhuetas de perna simples, traço fino, **baixa opacidade**.
- **Estruturas na vista pertinente:** safena magna na Medial; safena parva/perfurantes na Posterior; tributárias na Anterior/Medial.
- **Cores/traços:** normal = azul; refluxo/varicoso = **vermelho**; traço **ondulado** p/ varicosidade, mais reto p/ tronco normal. Perfurantes = ovais/marcas vermelhas.
- **Anotações de medida** ao lado do achado: "X cm" (acima da face plantar), diâmetro mm, profundidade "cm-P".

### Plano de desenho (mesma lógica validada: base primeiro, depois estruturas)
- **C1 — nova arte-base:** 8 silhuetas (L/A/M/P × 2 membros), layout 2 linhas. Gerar via GPT-Image (como fizemos a vista anterior). Traço leve.
- **C2 — rede venosa normal** desenhada em cada vista, em **baixa opacidade** (destaque fica pras alterações).
- **C3 — coords por vista:** polilinhas dos segmentos em cada uma das 8 silhuetas (expansão grande das coords atuais, que só têm a vista anterior).
- **C4 — recolor por vista** a partir do MapaVenoso: alterações **mais evidentes** (vermelho saturado, ondulado p/ varicosidade). Reusa o motor `recolorVenousPixels` estendido p/ (membro × vista).
- **C5 — anotações** no estilo dos vasculares (cm/mm/profundidade ao lado do vaso) — evolução dos callouts em pílula que já temos.

### Expansão do schema do DESENHO (não do texto — texto continua livre)
Pra desenhar como os reais, a extração do desenho (`DOPPLER_VENOSO_MMII_SCHEME`) precisa capturar mais estrutura a partir do ditado livre:
- medidas por nível (croça; coxa 3 terços; joelho; perna 3 terços);
- extensão do refluxo (de X até Y cm acima da face plantar);
- tributárias e perfurantes: localização (cm acima da face plantar), diâmetro (mm), profundidade (cm), face (medial/anterior/lateral/posterior);
- cadeias de transferência (drenagem entre tributárias).
Dois leitores do MESMO ditado: **writer** (texto livre) + **extração** (estrutura pro desenho). Arquitetura que já usamos.

---

## Sequência sugerida
1. **Vascular escrita (B)** — refinar writer + few-shots dos laudos reais. Baixo risco, alto valor, valida o estilo com o Luiz. **Primeiro.**
2. **Vascular desenho (C1→C2)** — nova arte-base 4 vistas + rede em baixa opacidade (GPT-Image via Dex). Validar visual antes de coords.
3. **Edição incremental (A1)** — núcleo flag-gated, golden + Dex, piloto nas categorias obstétricas.
4. C3→C5 (coords + recolor por vista + anotações) e A2/A3 depois.

## Parecer Dex (13/07)

**Dex1 (Partes A/B) — GO na arquitetura, NO-GO em merge direto do `command-interpreter-v1`:**
- **B (escrita):** refinar prompt + few-shots reais BASTA — MAS o risco real é que o prompt/template atual de DOPPLER_VENOSO_MMII é UNIVERSAL (TVP + refluxo + cartografia), não o estilo específico de cartografia dos laudos reais (`packages/knowledge/snippets/DOPPLER_VENOSO_MMII/modelo/template-padrao.md:14`). Existe categoria separada `DOPPLER_VENOSO_MMII_MEDIDAS` (mapeamento pré-op) — **reconciliar antes**. O builder de few-shots já PROÍBE copiar medidas/lateralidade/diagnóstico dos exemplos (bom). Os guards universais (sanitização, cm/mm, medida implausível — `route.ts:952`) NÃO re-slotam localização → liberdade do writer é segura.
- **A (edição):** **NÃO** mergear o branch direto. Fazer um **núcleo pequeno primeiro**: endpoint de edição sobre `final_output`, só `replace_phrase` literal + `add_conclusion_item` (+ talvez `add_body_finding`), flag OFF, **golden de OBSTETRICA/DOPPLER_OBSTETRICO/PELVE**. Só DEPOIS portar o interpretador por LLM.

**Dex2 (Parte C) — GO para C1/C2 + um C3/C4 ESTREITO, NO-GO para C3-C5 completo já na v1:**
- Melhor entregar algo **visualmente correto, simples e confiável (mesmo incompleto)** do que tentar cartografia cirúrgica perfeita.
- **v1:** base em baixa opacidade + refluxo/varicosidade/perfurante por vista (ondulado simples; perfurante = marca oval por zona) + **anotação manuscrita SÓ quando o ditado trouxer número claro** (ex.: "1,6 mm a 0,2 cm da pele"); se a relação não estiver clara, NÃO desenha a anotação — deixa o texto resolver.
- **Schema:** quase como está + adição mínima de vista. Expansão fina (medidas_safena, tributarias, perfurantes, transferencias) como **camada OPCIONAL** com campos nullable + raw_text; desenho só usa item com lateralidade + face/vista + nível/zona confiável. **Cadeias de transferência por último** (inicialmente só anotação textual perto do vaso, não setas). → "v2 cartografia".

**Sequência refinada (Dex-validada):** B (escrita: reconciliar categoria + prompt cartografia + few-shots reais + showcase) → C1/C2 (arte 4 vistas + rede baixa opacidade) → C3/C4 estreito (recolor por vista + anotação só com número claro) → A núcleo pequeno (edição sobre final_output, flag OFF, goldens) → interpretador LLM + v2 cartografia.

## Decisões (Luiz, 13/07)
- **D1 (escrita): ✅ SIM** — título + ordem canônica como base do writer.
- **D2 (desenho): ✅ traço CLÍNICO SIMPLES dos laudos reais é o alvo** (não os dedos/detalhe da arte atual).
- **D3 (anotações): ✅ MANUSCRITO ao lado do vaso** (estilo dos reais), não os callouts em pílula.
- **D4 (edição): ✅ botão "Ajustar laudo"** (explícito). Evoluir p/ auto-detecção só depois de validado.
- **D5 (anonimização): ✅ SIM** — anonimizar nome da paciente nos few-shots.
