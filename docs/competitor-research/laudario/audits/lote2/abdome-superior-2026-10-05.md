# Abdome Superior (`ABDOMEN_SUPERIOR`): auditoria do lote 2

- Data: 05/10/2026. Base: `01155d0` (main = worktree).
- Laudário: não observado (sem navegador). Só a existência no catálogo, linha 7 de `catalogo-ultrassonografia-2026-10-02.json` ("Abdome Superior" e "Abdome Superior com Doppler"). Nenhuma redação do concorrente foi usada.
- Vizinho já estudado: Abdome Total (`cases/abdome-total-2026-10-02.md`, `crosswalk-abdome-total-2026-10-02.md`). Este documento cobre só o que é **diferente** no andar superior.
- Prova: `audits/probes/probe-abdome-superior-2026-10-05.ts`, executada com `npx tsx` contra a main. A saída foi lida integralmente.

## 1. Estado por plataforma

| Plataforma | Evidência | Classificação |
|---|---|---|
| Web (formulário) | `apps/web/src/lib/deterministic/organs/abdomeSuperior.ts:27-33`: cinco seções (fígado, vesícula, vias biliares, pâncreas, baço), reaproveitando os módulos do abdome total | estruturado ativo |
| Web (adaptador) | `apps/web/src/lib/catalog/abdomeSuperiorParaCatalogo.ts:11-31`: reaproveita `adaptarAbdome` e recorta oito órgãos, **incluindo aorta e veia cava**, que não têm seção na tela | parcial (defeito, ver L1) |
| Web (renderer) | `apps/api/src/server/renderer/categories/ABDOMEN_SUPERIOR.ts:52-57` (chaves), `:296-297` (frases normais de aorta/VCI), `:166` (status `nao_avaliado_gases` existe, mas a Web nunca o emite) | estruturado ativo (migrada em 31/08, `migradas.ts`) |
| API ditado | O mesmo renderer, com `ABDOMEN_SUPERIOR_EXTRACTION_PROMPT` (`:193`), é ligado por `RENDERER_CATEGORIES` (`env.ts:74`, padrão vazio; vazio em produção na verificação de 03/10) | estruturado dormente → writer |
| Android/RN | `apps/mobile/src/ui/tokens.ts:138`. Atalhos de abdome comuns a todos os `ABDOMEN*` em `apps/mobile/app/generate.tsx:1221-1224`; o texto de colecistectomia (`:1170-1171`) fixa o gênero feminino | genérico (ditado + atalhos) |
| iOS | `Models/Category.swift:6`; atalhos compartilhados com abdome total em `Features/Generate/GenerateViewModel.swift:47-50`, onde o atalho de colecistectomia também fixa o feminino | genérico (ditado + atalhos) |
| shared | Não há `clinicalModels` de abdome em `packages/shared/src/clinicalModels/` | ausente |
| Conhecimento | `packages/knowledge/snippets/ABDOMEN_SUPERIOR/` (modelo, cinco frases, oito regras, incluindo `pos-colecistectomia.md` e `pancreas-visualizacao-limitada.md`) | publicado, mas diverge do renderer (L3, L4) |
| Variante com Doppler | Não há `ABDOMEN_SUPERIOR_DOPPLER`. `categoryNormalization.ts:30-33` só promove `ABDOMEN_TOTAL` para Doppler, e `:49` captura "abdome superior" antes da regra genérica de Doppler (`:75`) | ausente (fronteira, ver §7) |

## 2. Inventário de controles do formulário Web

| Seção | Campo → opções | Padrão inicial |
|---|---|---|
| Fígado | dimensões (normais/aumentado + lobos D/E cm); ecotextura (homogênea, esteatose leve/moderada/acentuada, hepatopatia crônica); lesões (cisto, hemangioma, nódulo + mm + lobo); porta (normal/dilatada + mm); raros (calcificação, cistos múltiplos, líquido peri-hepático) | normais, homogênea, nenhuma, normal |
| Vesícula | aspecto (normal, contraída, distendida, ausente); conteúdo (anecoico, colelitíase [1/2+/repleta, mm, móvel/impactado], lama, pólipos); paredes (finas, espessada aguda, espessada crônica); seis raros | normal, `["anecoico"]`, finas, **móvel** |
| Vias biliares | intra (normais/dilatadas); colédoco (normal/dilatado + mm); coledocolitíase + mm | normais |
| Pâncreas | visualização (adequada/prejudicada); ecotextura (normal/heterogênea/lipomatose); Wirsung (normal/dilatado); lesões (cisto, nódulo + mm) | adequada, normal |
| Baço | dimensões (+ eixos cm); ecotextura; cisto, calcificação, acessório | normais |
| Aorta / VCI | **sem controle** | afirmadas normais pelo adaptador |
| Técnica | fixa, com "paciente em jejum" (`ABDOMEN_SUPERIOR.ts:284`) | sempre |

## 3. Provas (dados sintéticos, estilo `CLASSICO_COMPLETO`)

| # | Controle e estado | Corpo (resumo) | Conclusão (resumo) | Pendência | Veredito |
|---|---|---|---|---|---|
| A1 | estado inicial, nada preenchido | 9 frases normais, incluindo **aorta e VCI "de calibre e contornos normais"**, sem qualquer medida | "Órgãos e estruturas abdominais estudadas sem evidência de alterações" | nenhuma | `observado no LaudoUSG`; `defeito confirmado` em aorta/VCI afirmadas sem controle |
| A2 | esteatose moderada + colelitíase 2+ de 9 mm | atenuação sonora e vasos/diafragma parcialmente visualizados; "múltiplas imagens… móveis… a maior 0,9 cm" | 1. esteatose moderada 2. litíase 3. demais sem alterações | nenhuma | `observado no LaudoUSG`: correto; conversão de mm para cm ok |
| A2b | colelitíase sem medida, mobilidade no padrão | "imagem hiperecoica, **móvel à mudança de decúbito**", sem medida e sem `____` | litíase | nenhuma | `defeito confirmado`: mobilidade afirmada sem confirmação e medida ausente sem pendência (mesmo risco do abdome total) |
| A3a | vesícula ausente | "Ausência… (paciente **submetida** à colecistectomia)" | "sem evidência de alterações", **sem mencionar a colecistectomia** | nenhuma | `defeito confirmado`: gênero fixo (`phrases/ABDOMEN_TOTAL.ts:213`); conclusão omite o estado pós-operatório pedido por `regra/pos-colecistectomia.md` |
| A3b | vesícula contraída (jejum inadequado) | "Vesícula biliar contraída, com avaliação do conteúdo parcialmente prejudicada" | item 1 repete a limitação; item 2 "demais sem alterações" | nenhuma | `observado no LaudoUSG`; a técnica continua dizendo "paciente em jejum" (contradição). Não existe opção "não visualizada" |
| A4 | pâncreas com visualização prejudicada | "avaliação parcialmente prejudicada pela interposição gasosa, sem alterações evidentes nas porções visibilizadas" + **"Ducto pancreático principal de calibre normal"** | 1. limitação 2. demais sem alterações | nenhuma | `defeito confirmado`: o Wirsung continua afirmado normal sob limitação; não é possível indicar qual segmento (cabeça/corpo/cauda) foi visto |
| A5 | A2 desfeito, com subcampos da colelitíase ainda preenchidos | idêntico a A1 | idêntico a A1 | nenhuma | `observado no LaudoUSG`: remoção limpa |

## 4. Lacunas concretas (Web e paridade)

- **L1, P0, `defeito confirmado`.** Aorta abdominal e VCI são afirmadas normais sem controle nem dado na tela (`abdomeSuperiorParaCatalogo.ts:25-26` → `ABDOMEN_SUPERIOR.ts:296-297`). Exigir uma seção "Aorta e VCI" com a opção "não avaliadas" ou omitir as frases quando não avaliadas.
- **L2, P0, `defeito confirmado`.** Litíase afirmada como móvel por padrão (`vesicula.ts`, `initialState`, e `phrases/ABDOMEN_TOTAL.ts:203`), e cálculo sem medida passa sem pendência. A mobilidade deve começar como "não avaliada".
- **L3, P1, `defeito confirmado`.** Colecistectomia: a frase fixa o feminino (renderer `:213`, RN `generate.tsx:1171`, iOS `GenerateViewModel.swift:50`), e a conclusão "normal" omite o estado pós-cirúrgico. A base de conhecimento pede o item na conclusão. Também falta o colédoco pós-colecistectomia com medida explícita.
- **L4, P1, `defeito confirmado`.** Pâncreas "prejudicado" é binário: não indica o segmento visto e mantém o Wirsung normal. O renderer já tem `nao_avaliado_gases` (`:166`), mas o adaptador não o usa.
- **L5, P1, `candidato a lacuna`.** Faltam "vesícula não visualizada" (sem antecedente cirúrgico, por exemplo jejum inadequado) como estado distinto de "ausente" e de "contraída", e uma técnica condicional ao jejum.
- **L6, P2, `candidato a lacuna`.** Não há controles para veias hepáticas, líquido livre no andar superior nem calibre do colédoco quando normal. O "fígado de dimensões normais" sem medida do lobo direito é aceitável como modelo, mas só se o médico confirmar.
- **L7, P2, `inferido`.** Mobile e iOS dependem do ditado e de atalhos genéricos. Com `RENDERER_CATEGORIES` vazio, o ditado cai no writer, e o renderer estruturado não é usado.

## 5. Requisitos originais

### 5.1 Modelo normal

| Estrutura | Dado mínimo para "normal" | Intenção no corpo | Intenção na conclusão |
|---|---|---|---|
| Fígado | confirmação de dimensões, contornos e ecotextura | órgão de tamanho, contorno e textura preservados, sem lesão focal | entra no fecho global |
| Veia porta | calibre visto (medida opcional) | calibre preservado | fecho global |
| Vesícula | estado escolhido explicitamente (normal / contraída / ausente por cirurgia / não visualizada) | parede fina, conteúdo anecoico, sem cálculo | estado pós-cirúrgico e "não visualizada" viram item próprio |
| Vias biliares | colédoco visto (medida recomendada) | calibres preservados | fecho global |
| Pâncreas | segmentos vistos (cabeça, corpo, cauda) | descrever só os segmentos vistos | limitação vira item quando há segmento não visto |
| Baço | dimensões confirmadas | tamanho e textura preservados | fecho global |
| Aorta / VCI | "avaliadas" marcado | calibre preservado | fecho global; omitir se não avaliadas |

### 5.2 Biblioteca de alterações (diferenças em relação ao abdome total)

| id | Dados mínimos | Corpo | Conclusão | Salvaguardas |
|---|---|---|---|---|
| `colecistectomia` | antecedente confirmado; colédoco (mm, opcional) | ausência da vesícula por cirurgia prévia, com flexão de gênero conforme o paciente | item "estado pós-colecistectomia" | gênero vem do cadastro; sem cadastro, forma neutra |
| `vesicula_nao_visualizada` | motivo (jejum insuficiente / gás / outro) | vesícula não caracterizada, com o motivo | item de limitação com sugestão de repetir em jejum, a critério clínico | nunca afirmar conteúdo nem parede |
| `pancreas_parcial` | segmentos vistos ⊂ {cabeça, corpo, cauda} | descrever os vistos; declarar os não vistos | item de limitação nomeando os segmentos | suprimir o Wirsung se não visto |
| `litiase_vesicular` | quantidade; maior medida (mm); mobilidade avaliada (sim/não) | descrever a mobilidade só se avaliada | litíase | medida ausente gera pendência não bloqueante |
| `aorta_vci_nao_avaliadas` | marcação | omitir as frases | sem item | nunca afirmar normal |

### 5.3 Formulário Web

- Seções: as cinco atuais, mais "Aorta e VCI" (avaliadas / não avaliadas / alteradas) e "Técnica" (jejum adequado / inadequado).
- Padrões: nenhum "móvel" pré-marcado; vesícula sem estado presumido quando houver antecedente informado.
- Pendências bloqueantes: litíase sem quantidade; pâncreas parcial sem segmentos.
- Avisos: cálculo sem medida; colédoco não medido em paciente colecistectomizado.

### 5.4 Prompt mobile (extrator)

Extrair: antecedente de colecistectomia, segmentos pancreáticos vistos, mobilidade **somente se dita**, menção a aorta/VCI e qualidade do jejum. Nunca presumir: mobilidade, gênero, normalidade de aorta/VCI não citadas, Wirsung em pâncreas parcial nem Doppler (menções a fluxo/Doppler devem sinalizar a fronteira descrita no §7).

## 6. Perguntas para a rodada no concorrente (não observado no concorrente)

1. O modelo normal de "Abdome Superior" lista aorta e VCI? Há aba "Aorta e Retroperitôneo" como no total?
2. Como o concorrente diferencia vesícula ausente (cirurgia), não visualizada e contraída? A conclusão registra o estado pós-cirúrgico?
3. O pâncreas aceita visualização por segmento? A frase do Wirsung some?
4. A mobilidade do cálculo começa marcada?
5. "Abdome Superior com Doppler" adiciona quais vasos (porta com velocidade, veias hepáticas, artéria hepática)? É um modelo separado ou um anexo?

## 7. Fronteira com Doppler

- `ABDOMEN_TOTAL_DOPPLER` existe (`CLINICAL_MODELS_V1.ts:334`, aprovado em `generationPathResolver.ts:15`). `DOPPLER_HEPATICO` existe na Web (`organs/dopplerHepatico.ts`, migrada).
- Ditado "abdome superior com Doppler": `inferido` que cai em `ABDOMEN_SUPERIOR` sem campos de Doppler (regra `:49` antes de `:75`, sem promoção em `DOPPLER_UPGRADE`). O risco é que o fluxo portal ditado seja descartado ou vire texto livre. Requisito: ou promover para `DOPPLER_HEPATICO` + abdome superior (composição), ou criar a variante com bloco portal/hepático reaproveitando o contrato do `DOPPLER_HEPATICO`. Decisão do Luiz.

## 8. Ordem de implementação sugerida

1. P0: seção "Aorta e VCI" com "não avaliadas" e remoção da afirmação implícita (L1).
2. P0: mobilidade da litíase sem padrão e pendência de medida (L2, compartilhado com o abdome total).
3. P1: colecistectomia com gênero do cadastro e item na conclusão (L3; atalhos do RN e do iOS juntos).
4. P1: pâncreas por segmento via `nao_avaliado_gases` e supressão do Wirsung (L4).
5. P1: estado "vesícula não visualizada" e técnica condicional ao jejum (L5).
6. P2: fronteira com Doppler (§7) e ativação do renderer no ditado após gate.
