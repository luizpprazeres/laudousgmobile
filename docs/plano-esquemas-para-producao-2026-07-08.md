# Plano — Esquemas visuais para a PRÁTICA (produção) · 2026-07-08

> Síntese pós-revisão do Dex (Dex1 código, Dex2 arquitetura). Objetivo: sair dos protótipos aprovados e levar os 5 esquemas (venoso ant/post, miomas, tireoide, mama) para produção, servindo iOS + Android + web, dirigidos pelo laudo. Complementa `docs/plano-sessao-longa-esquemas-visuais-2026-07-08.md`.

## Vereditos do Dex (revisão 08/07)
- **`fix/sala-schemas-category-filter` → GO.** Filtro coerente, `Shell` recebe `visibleSchemas`, reset de aba correto, mapa estrito é anti-vazamento intencional. Limite conhecido: laudo multi-categoria (category é string única) esconde tudo em vez de vazar — aceitável. **Mergeável.**
- **`fix/laudo-quick-wins` → era NO-GO pelo guard de DUM; CORRIGIDO.** Dex1: o regex `(.+?)` removeria "DUM: 01/01/2026. Hoje com 10 semanas…" válida. Fix aplicado (commit `23fbb3f`): casa só `DUM: <token-único>.` → pega null/data-impossível/IG-roteada e preserva a linha válida (isolada ou com IG junto). `measureNormalizer` já era conservador o bastante = GO. **Agora mergeável.**
- **`OBST_BIOMETRIA_DET=true` em produção → GO com observação.** Seguro: só OBSTETRICA, feto único, parseia bloco com cabeçalho. **Observação (Dex1):** no tail da `main`, `flagImplausibleMeasures(finalText)` é chamado SEM `{ cfIgAware: true }` (route.ts:953-956) → a flag corrige o bloco da calculadora e a voz com "cm" explícito, mas o cross-check IG×CF não está fiado, então o número-cru-em-cm-sem-unidade continua sem sinal. Fix próprio pendente (não bloqueia).

## ESCOPO CONFIRMADO PELO LUIZ (08/07) — determinístico = DESENHO; laudo = writer
**A parte determinística é só para o DESENHO (esquema/cartografia). O TEXTO do laudo continua sendo gerado pelo writer, sem mudança.** Logo:
- NÃO construir renderer determinístico de TEXTO vascular (o `plano-motor` previa, mas está FORA agora).
- O schema estruturado vira **extrator paralelo (side-channel)**: ditado → achados estruturados → modelo do desenho. O writer gera o texto intacto.
- Caveat: o `____` no TEXTO vascular do writer NÃO é resolvido por isto (seria um guard separado no writer — decisão futura do Luiz).

## Arquitetura de produção (Dex2) — decisão
**Renderer canônico no backend como fonte única + iOS como editor/preview/fallback na transição.**
- O contrato real hoje já é plugável: *alguém gera PNG/PDF e empurra para `POST /api/sala/push-schema`* (route.ts:8) → tabela `sala_schemas` → a sala só lista/exibe PNG (`sala/[token]/schemas/route.ts:24`). Ou seja, dá para trocar QUEM gera sem quebrar a sala.
- **Não jogar fora o iOS atual** (`MyomaSchemaExporter`/`BreastSchemaSheet`/`ThyroidSchemaSheet`/`VenousCartographyView`+`VenousSegmentCatalog`). Ele vira ponte/editor: o backend passa a gerar automaticamente do laudo; o médico ainda pode ajustar/preview no app.
- **Venoso reusa `VenousSegmentCatalog.swift`** (já tem 18 segmentos + paths) — migrar esses ids para o schema canônico (mesma nomenclatura dos protótipos: `{lado}__{segmento}`).

## Fundação — schema estruturado por-lesão (pré-requisito de tudo)
Cada categoria precisa de um objeto por-lesão extraído do ditado (é o input dos motores de composição):
- **Venoso:** `{ lado, segmento_id, view (anterior|posterior), estado (refluxo{tempo}/trombose{extensão,idade}/perfurante_incompetente), posicao_t, label }`.
- **Útero/miomas:** `{ figo (0-8), localizacao (fundo/corpo/istmo/cervical + parede), diametro_cm, pediculado? }`.
- **Tireoide:** `{ lobo (dir/esq/istmo), polo, diametro_cm, composicao (cístico/sólido/misto), tirads }`.
- **Mama:** `{ mama (dir/esq), hora (1-12), distancia_cm, diametro_cm, composicao, birads }`.
Liga-se ao eixo do `plano-motor-doppler-vascular` (extração strict por categoria).

## DECISÃO DE RENDERIZAÇÃO (08/07) — veias orgânicas + tube-recolor, no CLIENTE
- **Renderizador venoso = tube-recolor sobre arte orgânica** (validado pelo Luiz: "ficou como combinamos"). A base é `tmp-review/venoso-lineart-veias.png` (pernas line-art + veias azuis ORGÂNICAS geradas por GPT-Image); o motor recolore só os pixels da veia do segmento alterado dentro de um tubo. Preserva a forma orgânica (não desenha vaso por coordenada). Coords: `tmp-review/venoso-lineart-veias-coords.json`.
- **Desenhar vasos como paths SVG do zero = descartado para o venoso** (fica crude/reto). O `venousSvg.ts` permanece como alternativa vetorial, mas o visual escolhido é o tube-recolor.
- **A composição roda no CLIENTE** (não no servidor): o projeto NÃO tem sharp/canvas/resvg, e o iOS/Android/web já geram e empurram o PNG via `/api/sala/push-schema`. Logo: backend entrega o `MapaVenoso` (schema→buildMapaVenoso) + a arte-base; o cliente decodifica, chama `recolorVenousPixels` e empurra o PNG. Sem nova dependência no backend.
- Módulo de recolor puro (sem dep) commitado: `apps/api/src/server/renderer/vascular/venousRaster.ts` — pronto para virar pacote compartilhado com RN/web/Swift.

## Onde vive a composição
- **Motor de composição = pacote compartilhado** (TS puro), reusando os motores JS já validados nos protótipos (recolor-por-tubo do venoso; overlays SVG de miomas/tireoide/mama).
- **Render primário = SVG determinístico** (leve, tematizável) exibido na sala/web e no app; **rasteriza para PNG/PDF** para manter o fluxo atual de `push-schema` e o download.
- Backend gera e empurra o mesmo PNG/PDF (compatível com a sala de hoje) e serve o SVG para quem quiser interativo.

## Ordem de implementação (faseada, cada uma atrás de flag)
1. **Fundação venoso:** schema strict venoso (fase 2 do plano-motor) + extractor + persistir `structured_findings` por-segmento. (Valor extra: mata placeholders `____` do writer vascular.)
2. **Motor compartilhado + asset venoso** (anterior; depois posterior) → SVG na sala + PNG p/ push-schema, flag OFF. Reconciliar ids com `VenousSegmentCatalog`.
3. **Útero/miomas:** schema FIGO + motor de composição (já pronto no protótipo) → substitui/al­imenta o `MyomaSchemaExporter`.
4. **Tireoide** e **Mama** (schema + motor) na sequência.
5. **iOS/Android:** apontar os esquemas existentes para o renderer/asset canônico; manter edição manual como fallback.

## Riscos (Dex2) e mitigação
- **Asset novo quebrar coordenadas antigas** → ids de segmento estáveis + calibração por asset (como fizemos nos protótipos); versionar o asset.
- **PNG/PDF pesar demais** → SVG como primário; rasterizar só no export; otimizar.
- **Divergência iOS-manual × backend-automático na transição** → faseado atrás de flag por categoria; iOS como fallback; canônico manda.

## Próximos passos imediatos
- Mergear `fix/sala-schemas-category-filter` e `fix/laudo-quick-wins` (ambos GO agora; o NO-GO do quick-wins foi resolvido com o fix da DUM `23fbb3f`) — decisão/PR do Luiz (push é @devops).

## Progresso — Fundação venoso (item 1) — INICIADA 08/07
- ✅ **Schema estruturado** `apps/api/src/server/renderer/findingsSchemas/DOPPLER_VENOSO_MMII.ts` (Zod + JSON Schema strict + prompt de extração) + registrado em `EXTRACTORS` (extraction.ts). Contrato `{ lado → segmentos[] + perfurantes[] }` compartilhado por renderer e composição visual. Testado (parse 3 casos + rejeição + strict-compat) + tsc 0. Commit `b95a5c3`, branch `feat/venoso-estruturado`.
- ⚠️ **Base do branch:** o `git checkout main` abortou pelas mudanças soltas do abdome, então o branch saiu de `feat/android-parity` (atrás da main). O schema é arquivo novo/portável; **@devops deve rebasear na `main`** antes de integrar (extraction.ts pode ter divergido).
- **DORMENTE e seguro:** extração só roda dentro do renderer; sem renderer vascular e fora de `RENDERER_CATEGORIES`, produção segue no writer.
- ✅ **Ponte determinística** `apps/api/src/server/renderer/vascular/venousMap.ts` — `buildMapaVenoso(findings) → MapaVenoso` (estado por segmento + lesões/callouts + perfurantes incompetentes; gravidade trombose>refluxo). SÓ desenho, não toca no writer. Testado 6 casos + tsc 0. Commit `fc6f924`.
- ✅ **Motor de composição SVG** `apps/api/src/server/renderer/vascular/venousSvg.ts` — caminho **(a) SVG vetorial** (escolha do Luiz). `renderVenousSvg(mapa, segCoords, base) → string SVG`: veias como paths recoloridos pelo estado (refluxo/TVP/parcial/normal) + chevrons + callouts. Puro/sem DOM, rasterizável. Testado (recolor + XML bem-formado) + tsc 0. Commit `2621fd7`.
- ✅ **Assets** (Dex): base line-art das pernas `tmp-review/venoso-mmii-lineart.png` (944×1667, contorno fino sem vasos) + coords traçadas `tmp-review/venoso-lineart-coords.json` (11 segmentos × 2 pernas). **Protótipo vetorial** publicado (artifact `5c25af6a`, `tmp-review/venoso-svg-prototipo.html`) — pipeline completo voz→estrutura→SVG rodando.
- ⬜ **Falta:** mover assets (line-art + coords) p/ local de produção (data/asset dir); wiring no fluxo push-schema (rasterizar SVG→PNG/PDF, ex.: resvg/sharp) + persistir; extração side-channel (rodar o extractor sem trocar o texto do writer); depois posterior (parva) + arterial/carótidas; e portar miomas/tireoide/mama (overlays SVG) para o mesmo motor compartilhado.
