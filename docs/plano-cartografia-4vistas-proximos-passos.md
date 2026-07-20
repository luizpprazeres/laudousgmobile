# Cartografia venosa — 4 vistas: próximos passos (retomada)

**Data:** 2026-07-20 · Retomar após reconectar o Dex. Ver também docs/plano-vascular-e-edicao-2026-07-13.md (Parte C) + memória [[onevasc-cartografia-vascular]].

## Estado atual
- **NO AR:** cartografia de **vista anterior única** (recolor `recolorVenousPixels`) + **callouts em pílula**. iOS (Swift `feat/venous-scheme-organic`) + RN (`feat/venous-scheme-mobile`) + backend SSE (`VENOUS_SCHEME_MAP=true`). Assets: `apps/mobile/assets/venous/venoso-lineart-veias.png` + `...-coords.json`.
- **Escrita cartografia (Parte B):** variante `cartografia` de DOPPLER_VENOSO_MMII pronta (showcase aprovado), na `feat/venous-scheme-mobile` — **ainda NÃO mergeada na main**.
- **Edição incremental (Parte A):** PRONTA e no ar (alvo corpo/conclusão/ambos + voz + substituição). Não é cartografia — só contexto.

## Decisões do Luiz (valem pro desenho)
- **D2:** traço **clínico SIMPLES** dos laudos reais (NÃO os dedos/detalhe da arte anterior atual).
- **D3:** anotação **MANUSCRITA ao lado do vaso** (cm/mm/profundidade), NÃO os callouts em pílula.
- Parecer Dex2: **v1 simples/confiável**; cartografia fina (medidas por nível, cadeias de transferência) = **v2**.

## Passos (C1 → C5)
- **C1 — arte-base (Dex2, GPT-Image): ✅ CONCLUÍDO E APROVADO (20/07).** 8 silhuetas de perna em **2 linhas** (topo MID = membro inf. direito; baixo MIE = esquerdo), **4 colunas por linha: L (lateral), A (anterior), M (medial), P (posterior)**. Traço clínico simples (D2). Margens laterais generosas. Arte final = `tmp-review/referencias-cartografia/silhuetas-8vistas-v2.png` (2048×3072). v2 corrigiu vs v1: Medial sobe até a virilha (ancora croça/JSF), Posterior com prega glútea — fiel às pranchas reais (`prancha-4vistas-2018/2023.jpg`). Referências reenviadas (paciente Alana, exames 2018+2023) salvas na mesma pasta; `tmp-review/` adicionado ao `.gitignore` (dados de paciente).
- **C2 — rede venosa normal (Dex2, GPT-Image): ✅ CONCLUÍDO E APROVADO (20/07).** Rede venosa normal desenhada por cima da base (edição, silhuetas travadas): magna completa na Medial (croça→maléolo, mais evidente); parva na Posterior (JSP→maléolo lateral); tributárias discretas em Anterior e rede fina em Lateral. Azul claro `#7FB6D8` baixa opacidade. Hierarquia Medial>Posterior>Anterior/Lateral. Arte final = `tmp-review/referencias-cartografia/veias-8vistas-v2.png` (2048×3072). v2 refinou vs v1: Lateral afinada, magna reforçada, risco preto removido.
- **C3 — coords por vista: ✅ CONCLUÍDO — AS 4 VISTAS (20/07, Claude — tracer por pixels).** Modelo expandido de `{direito,esquerdo}` p/ 8 células `membro__vista`. Após o **C2-bis** reforçar Anterior/Lateral (v3), as 4 vistas traçaram cheias (85-89 pts): `*__medial.safena_magna` + `*__posterior.safena_parva` + `*__anterior.safena_acessoria_anterior` + `*__lateral.tributaria_lateral`. Fonte `veias-8vistas-v3.png`; coords `coords-8vistas-v2.json`; overlay `coords-overlay-v2.png`; script `trace-c3.js`. **PENDÊNCIA v2:** `tributaria_lateral` = chave provisória (schema não tem tronco lateral nomeado → recolor a ignora até decidir add-segmento vs mapear-varicosidade); perfurantes = marca (C5). Detalhe: `resultado-c3.md`.
- **C4 — recolor por vista: ✅ MOTOR CONCLUÍDO (20/07, branch `feat/venous-4view-recolor`, sem push).** `recolorVenousPixels4` + tipo `VenousCoords4` + helper `recolorTube` compartilhado, no `packages/schemes/src/vascular/venousRaster.ts` (aditivo — o recolor anterior segue vivo). Coords no pacote: `venous4ViewCoords.ts` (`VENOUS_4VIEW_COORDS`, 8 células). Face lateral: passo dedicado que ativa `tributaria_lateral` por varicosidade de texto "lateral" (decisão Luiz). Raio=13 (veia ~6px). Golden verde (`__tests__/venousRaster4.manual.ts`: isolamento por célula, magna→medial, parva→posterior, lateral por texto, conservador). tsc 0. **E2E validado na arte real** (caso Alana 2023): `tmp-review/.../render-c4-demo.png`. Plano: `docs/plano-c4-recolor-4vistas-2026-07-20.md`.
- **C4-clientes RN+backend: ✅ CONCLUÍDO (20/07, mesmo branch, commit 328eaba, sem push).** Backend: flag `VENOUS_SCHEME_4VIEW` (OFF) → SSE `scheme` anuncia `asset_version` `venous-4view-1` vs `venoso-anterior-1` (MapaVenoso igual). RN: `asset_version` threadado no `state.ts`→`VenousSchemeView`, que ramifica (`venous-4view-*` = `venous-4view.png` 2048×3072 + `VENOUS_4VIEW_COORDS` + `recolorVenousPixels4`, sem callouts; vista única intacta). Asset em `apps/mobile/assets/venous/venous-4view.png`. Verificado: tsc mobile 0 + bundle Metro (expo export android) OK. Web sem render venoso (nada a fazer).
- **C4-clientes iOS: EM ANDAMENTO** — porte CoreGraphics delegado ao Dex2 (repo Swift `laudousg-swift`, brief `tmp-review/.../brief-c4-ios-dex2.md`, seleção por asset_version).
- **FALTA:** validar em device (RN Android + iOS) + @devops (home de prod do asset se sair do bundle + ligar flag quando validado). C5 anotações manuscritas.
- **C5 — anotações manuscritas (D3): 🟡 NÚCLEO NO PACOTE FEITO (20/07, branch `feat/venous-4view-recolor`).** `buildMapaVenoso` propaga `anotacoes[]` (calibre das safenas via `calibre_mm`; Ø das perfurantes) — aditivo/nullable. `venousAnnotations.ts::buildVenousAnnotations4(mapa, coords4)` posiciona cada medida ao lado do vaso na célula certa (magna→medial, parva/perfurante→posterior), traço até a âncora, empilhado sem overlap. Golden verde (`__tests__/venousAnnotations.manual.ts`). Demo visual: `tmp-review/.../render-c5-demo.html`. Plano: `docs/plano-c5-anotacoes-manuscritas-2026-07-20.md`. **FALTA:** validar estilo/posição com Luiz → fiar render nos clientes (RN Skia + iOS CoreGraphics, fonte manuscrita). **v2 (schema):** medida por nível exata + distância acima da face plantar (os "43cm" manuscritos) não existem no schema atual.
- **Schema (v2):** camada opcional nullable — medidas por nível (croça/coxa 3 terços/joelho/perna), tributárias/perfurantes (cm acima da face plantar, mm, profundidade cm, face), cadeias de transferência.

## Como retomar (quando o Dex voltar)
1. **Reenviar as imagens de referência** dos esquemas reais (as 2 pranchas DIAGNOSE de 4 vistas da paciente Alana — foram limpas do temp).
2. Delegar **C1** ao Dex2 via GPT-Image (arte-base das 8 silhuetas, traço clínico simples).
3. Claude revisa + mostra o layout ao Luiz antes de C2.
4. Seguir C2 → C3 → C4 → C5.

## Bloqueio que motivou a pausa
Canal `medmaestri` (Dex) fora do ar nesta sessão + Claude Code não tem geração de imagem nativa → C1 (arte) depende do Dex2/GPT-Image. Luiz vai reiniciar o contexto e reconectar o Dex.
