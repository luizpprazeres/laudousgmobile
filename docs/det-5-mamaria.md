# DET-5 — MAMARIA: renderer programático (BI-RADS reproduzido, não calculado)

> Spec a partir da fonte viva `~/laudousg/lib/categoryDefaults.ts:3183-3411`
> (read-only) + contrato `prompts/contracts/MAMARIA.ts` + blocos curados
> (saneamento DET-2). Decisões do Luiz 2026-06-13: cobrir os **7 tipos** de
> achado; BI-RADS na ordem **5 > 4 > 3 > 0 > 2 > 1**; frases da fonte viva.
> **Diferença-chave vs TIREOIDE:** BI-RADS é REPRODUZIDO verbatim, NUNCA
> calculado/inferido. O "salto" determinístico é a COLOCAÇÃO do BI-RADS no item
> de categoria mais alta + estrutura/título por construção.

## 1. Título dinâmico
- Axilas avaliadas (ou não-excluídas) → `ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES`
- Médico exclui axilas ("sem axilas", "só mamas") → `ULTRASSONOGRAFIA DAS MAMAS`

## 2. COMENTÁRIOS (3 casos; "06 fotos" sempre)
- **Padrão:** "Exame realizado com transdutor de 12 MHz, abrangendo todos os
  quadrantes das mamas.\nA documentação fotográfica foi obtida em 06 fotos,
  segundo protocolo internacional de Serviços de Imagem, que possui várias
  metodologias."
- **Mama masculina:** "...abrangendo a região retroareolar e todos os quadrantes
  de ambas as mamas, bem como as regiões axilares.\n[doc 06 fotos]"
- **Com prótese:** "...abrangendo todos os quadrantes das mamas, bem como as
  regiões axilares. Paciente com próteses mamárias.\n[doc 06 fotos]"

## 3. Corpo (OS SEGUINTES ASPECTOS FORAM OBSERVADOS)
Ordem: TEXTO DE FUNDO → ACHADOS → TEXTO AXILAR.
- **Texto de fundo padrão:** "Mamas com ecotextura de fundo com aspecto
  heterogêneo." (ou o que o médico ditar)
- **Ausência de lesão:** "Não há sinais evidentes de imagem nodular sólida,
  cística ou complexa."
- **Texto axilar:** avaliadas/normais → "Imagens ovais, com a periferia
  hipoecoica e o centro hiperecoico nas axilas."; não avaliadas → "Regiões
  axilares não foram adequadamente avaliadas neste exame."

## 4. Os 7 tipos de achado (frases verbatim da fonte viva)
> ⚠️ **Margem de nódulo: NUNCA "regulares"** (regra curada
> `mamaria-excecao-margens-circunscritas-nunca-regulares`) — opções:
> circunscrita/lobulada/microlobulada/irregular/espiculada.

1. **Cisto simples:** "Imagem anecoica em mama [lado], com margem circunscrita,
   medindo X x Y x Z cm, situada [localização], às "HH horas", distando A cm do
   seu centro até a pele e B cm até o mamilo." (omitir dist. mamilo se ausente)
2. **Múltiplos cistos:** "Imagens anecoicas[, {descritores}] em mama [lado], com
   margens circunscritas, a maior medindo X x Y x Z cm, situada [localização],
   às "HH horas", distando A cm do seu centro até a pele." (preservar descritores
   tipo "coalescentes" logo após "anecoicas"; não pôr "a maior medindo" se só 1 medida)
3. **Nódulo sólido:** "Imagem {hipoecoica/isoecoica} em mama [lado], com margem
   {circunscrita/lobulada/microlobulada/irregular/espiculada}[, maior eixo
   paralelo à pele], medindo X x Y x Z cm, situada [localização], às "HH horas",
   distando A cm do seu centro até a pele e B cm até o mamilo." (omitir "maior
   eixo paralelo à pele" se não informado)
4. **Linfonodo intramamário:** "Imagem oval, com a periferia hipoecoica e o
   centro hiperecoico, de maior eixo paralelo à pele, medindo X x Y x Z cm,
   situada [localização], às "HH horas", distando A cm do seu centro até a pele
   e B cm até o mamilo."
5. **Calcificações:** "Calcificações grosseiras medindo até X cm em seu maior
   eixo, ocasionando sombra acústica posterior, mais evidentes no quadrante
   [localização] da mama [lado]."
6. **Ginecomastia:** "Mama [direita/esquerda] com aumento do tecido fibroglandular
   retroareolar, compatível com ginecomastia."
7. **Próteses (normais):** "Próteses mamárias em topografia habitual, de contornos
   regulares, sem sinais ecográficos evidentes de rotura intracapsular ou
   extracapsular."

**Medidas inválidas:** manter verbatim + `[?]` (ex.: "medindo 0,x x 0,3 x 0,3 [?] cm").
**Localização (vocab forçado):** quadrante superolateral/superomedial/inferolateral/
inferomedial; união dos quadrantes laterais/mediais/superiores/inferiores.
**Horário:** sempre `"HH horas"` (ex.: às "08 horas").

## 5. Conclusão
- **Cada grupo de achados = 1 item** (não juntar achados diferentes).
- **Axilar:** avaliadas/normais → "Linfonodos axilares normais."; não avaliadas →
  "Avaliação linfonodal axilar não realizada neste exame."
- **Normal (sem achado):** "Mamas ecograficamente normais (Categoria BI-RADS® 1)."
- **BI-RADS — REPRODUZIDO, nunca inferido.** Colocado SÓ no item de categoria
  mais alta (ordem **5 > 4(A/B/C) > 3 > 0 > 2 > 1**). Demais itens descrevem sem
  o sufixo "(Categoria BI-RADS® N)".
- **Modelos de conclusão por tipo (verbatim):**
  - Cisto unilateral: "Cisto simples em mama direita (Categoria BI-RADS® 2)."
  - Cistos bilaterais: "Cistos mamários simples, bilaterais, subcentimétricos (Categoria BI-RADS® 2)."
  - Sólido unilateral: "Imagem sólida em mama esquerda (Categoria BI-RADS® 3)."
  - Sólidos bilaterais: "Imagens sólidas bilaterais, de características semelhantes, sendo a maior localizada no quadrante inferolateral da mama direita (Categoria BI-RADS® 4A)."
  - Calcificações: "Calcificações grosseiras de aspecto benigno na mama esquerda (Categoria BI-RADS® 2)."
  - Linfonodo intramamário: "Linfonodo intramamário em mama esquerda (Categoria BI-RADS® 2)."
  - Ginecomastia: "Ginecomastia à esquerda." (sem BI-RADS)

## 6. Correlação com mamografia (opcional, quando ditada)
- Manter: "A correlação com a mamografia realizada em dd/mm/aaaa permite manter esta classificação."
- Reclassificar (só mamografia): "...permite reclassificar para Categoria BI-RADS® X."
- Mamografia + biópsia: "A correlação com a mamografia realizada em dd/mm/aaaa e com o laudo histopatológico da biópsia realizada em dd/mm/aaaa permite reclassificar os achados para Categoria BI-RADS® 2."

## 7. Rodapé fixo
"Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®)."

## 8. "Saltos" determinísticos (o que o código garante)
1. **BI-RADS no item de categoria mais alta** (5>4>3>0>2>1) — o writer erra a colocação.
2. Título dinâmico (axilas) por construção.
3. Margem nunca "regulares" (sempre circunscrita/...).
4. Estrutura/cabeçalhos/rodapé garantidos; vocab de localização + horário travados.
5. BI-RADS reproduzido verbatim, nunca inferido (gate clínico).

## 9. Variantes / fora de escopo v1
- **Estilo "enxuta" (LAUDO RESUMIDO, TÉCNICA/ACHADOS/CONCLUSÃO):** writing style
  separado (demo DET-3) — NÃO é o alvo do renderer CLASSICO desta onda.
- Renderer alvo = estilo CLASSICO (COMENTÁRIOS / OS SEGUINTES ASPECTOS / CONCLUSÃO).

## 10. Workflow do Luiz (prática real, 2026-06-13) — incorporar

### Sequência do descritor no corpo (ACHADOS / OS SEGUINTES ASPECTOS)
Ordem fixa por imagem nodular, **uma imagem por linha**:
`ecogenicidade → lateralidade → margem → [maior eixo paralelo à pele] → medidas
→ [calcificações] → situada em (quadrante) → [às "HH horas"] → distância à pele
→ [distância ao mamilo]`.
Ex.: "Imagem isoecoica de mama direita, com margem lobulada, maior eixo paralelo
à pele, medindo 2,1 x 2,0 x 3,4 cm, situada no quadrante superolateral, às "11
horas", distando 1,4 cm do seu centro até a pele e 2,8 cm até o mamilo." →
próxima linha "Imagem anecoica de mama direita, com margem circunscrita…".
> Nota: o Luiz usou "de mama direita"; a fonte viva usa "em mama [lado]".
> CONFIRMAR a preposição preferida (de/em).

### Axilas
- Título "DAS MAMAS" → descreve só as mamas.
- Título "DAS MAMAS E AXILAS/REGIÕES AXILARES" → corpo inclui "Imagens ovais, com
  a periferia hipoecoica e o centro hiperecoico, nas axilas." + conclusão
  "Linfonodos axilares normais." (se normais; se alterados, a descrição muda).
- **Descrição de linfonodo é genérica** (mesma lógica em qualquer região, incl.
  CERVICAL) → candidato a um helper de linfonodo reutilizável entre categorias.

### Estilo OBJETIVO (≠ Clássico)
- Corpo mais direto: "Mama direita apresentando:" + um parágrafo por nódulo, cada
  um com seu BI-RADS.
- IMPRESSÃO DIAGNÓSTICA resume: cita os nódulos, mas só o **maior BI-RADS** leva o
  rótulo; os demais são citados sem o "(BI-RADS N)" ao lado. Ex.: "mama direita
  apresentando imagem isoecoica em QSL (BI-RADS 3)".
- (Liga com o saneamento: OBJETIVO é 1 dos 2 estilos reais.)

## 11. BI-RADS — calculável (correção do Luiz)
O BI-RADS PODE ser calculado pelo código (≠ "nunca inferir" da v1). Regras-mãe:
**maior BI-RADS vence** (categoria do exame = máxima entre os achados) e **o que o
médico ditar vence** (override verbatim). Default por tipo (fonte viva): cisto/
linfonodo/calcificações benignas = 2; nódulo sólido = 3. **Escalada do sólido
3→4/5 o Luiz vai passar as regras** (provável: margem não-circunscrita/espiculada/
microlobulada, não-paralelo, sombra acústica, microcalcificações → 4/5).
- Reaproveitar dados de categoria do iOS `BIRADSCalculator.swift` (0-6 com
  descrição, conduta e probabilidade de malignidade — já em PT).
- Subcategorias 4A/4B/4C existem (iOS já tem).

## 12. A pedido do Luiz — propor e enriquecer (tarefa do dex, com o PDF)
Fonte: **Atlas BI-RADS 5ª ed, 2ª ed. brasileira (PT)** em
`/Users/luizprazeres/laudousg-swift/ACR BI-RADS 5ª Ed.pdf` — **Seção II
Ultrassonografia** (575 págs no total; ler só a Seção II). Itens:
- **NML (lesões não-nodulares / "non-mass"):** descritores + como laudar; checar
  conflito com a prática do Luiz.
- **Elastografia:** "novos descritores para US de elastografia" (citados no
  prefácio) — extrair e propor frases curtas em PT.
- **Correlação com exames prévios (RNM / mamografia / US anterior):** propor a
  forma mais objetiva, clara e RÁPIDA de referenciar e correlacionar (o Luiz acha
  que as frases atuais não ficaram boas). Manter as frases de correlação da fonte
  viva (§6) como base e melhorar.
- **Cross-check geral:** validar o spec §1-11 contra o Atlas; sinalizar qualquer
  conflito ao Luiz (ele ajusta).

## 13. Decisões finais do Luiz (2026-06-13) — resolvem os conflitos da pesquisa
Pesquisa do dex em `docs/det-5-mamaria-birads-pesquisa.md` (léxico US do Atlas com
páginas citadas). Respostas do Luiz às 10 perguntas §6:

1. **Gradação 4A/4B/4C:** validada — usar a heurística do dex (tripé benigno
   oval+circunscrita+paralela = 3; qualquer feição suspeita → 4; conjunto
   clássico → 4C/5). Override ditado vence.
2. **NML (não-nodular):** tipo próprio `achado_nao_nodular`, no estilo já ensinado
   (descreve no corpo, conclui na conclusão com BI-RADS). Ex.: corpo "área
   heterogênea, sem configuração nodular, medindo aproximadamente ..."; conclusão
   "Massa heterogênea não nodular em QSL (BI-RADS X)."
3. **Preposição:** "**de** mama direita" (não "em").
4. **Axilas:** se o título inclui regiões axilares, a frase axilar normal
   ("Imagens ovais... nas axilas." + "Linfonodos axilares normais.") aparece
   SEMPRE, mesmo sem o médico ditar.
5. **Calcificações intraductais/fora-de-nódulo:** tipo próprio + PODEM escalar BI-RADS.
6. **Elastografia:** só frase adicional no v1, SEM cálculo (não altera BI-RADS).
7. **Microcistos agrupados:** BI-RADS **3**.
8. **Categoria 0:** só por ditado / necessidade explícita de comparação; nunca por cálculo.
9. **Recomendação de conduta:** igual à tireoide — toggle de preferência; se
   habilitado, aparece no final (controle / punção / etc. por categoria BI-RADS).
   Reaproveitar `BIRADSCalculator.swift` (condutas/probabilidades por categoria).
10. **BI-RADS 6** (câncer biopsiado, ditado): aceitar verbatim + frase própria.

### Léxico US → enums (do Atlas, p.195-196) — base do extractor
forma (oval/redonda/irregular) · orientação (paralela/não_paralela) · margem
(circunscrita/indistinta/angular/microlobulada/espiculada) · padrão ecogênico
(anecoico/hipoecoico/isoecoico/hiperecoico/complexo_solido_cistico/heterogeneo) ·
posterior (nenhuma/reforco/sombra/combinado) · calcificações (em_nodulo/fora/
intraductais) · associadas (distorção/ductal/pele/edema/vascularização/
elasticidade macia|intermediária|dura) · casos especiais (cisto_simples/
microcistos_agrupados/cisto_complicado/linfonodo_intramamário/linfonodo_axilar/
necrose_gordurosa/corpo_estranho_implante/MAV/pseudoaneurisma/mondor/coleção_pós-op).

### Correlação com exames prévios (frases curtas — Dex, validar no uso)
Campos: `correlacao = { tipo_exame (mamografia/RM/US), data, efeito (mantem/
reclassifica/biopsia_benigna/discordante/necessaria_indisponivel), birads_final }`.
Frases em `det-5-mamaria-birads-pesquisa.md §5`.

## Status
🟢 **Spec COMPLETO** (workflow do Luiz + léxico do Atlas + 10 decisões finais).
Pronto para codar `apps/api/src/server/renderer/categories/MAMARIA.ts`. Pesquisa
de apoio: `det-5-mamaria-birads-pesquisa.md`.
