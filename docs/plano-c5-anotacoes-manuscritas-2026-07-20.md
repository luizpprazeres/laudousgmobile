# Plano C5 — Anotações manuscritas (D3) na cartografia de 4 vistas

**Data:** 2026-07-20 · Após C1–C4 (arte + coords + motor recolor + clientes RN/iOS).
Ver `plano-cartografia-4vistas-proximos-passos.md`.

## Objetivo (decisão Luiz — D3)
Anotação **manuscrita ao lado do vaso** (cm/mm/profundidade), NÃO callouts em pílula.
Estilo das pranchas reais da Alana: textos curtos junto ao vaso ("43cm", "3,3mm",
"0,2cm-p"), com um traço curto até o ponto. Só quando o ditado trouxer número claro;
senão o texto do laudo resolve.

## O que É viável do schema atual (C5 v1)
O `MapaVenoso` hoje carrega, por lado:
- `lesoes[]` — label + sub (ex.: refluxo "3,1 s"); segmento com coords → posição.
- `perfurantes[]` — topografia (coxa/joelho/perna_medial/panturrilha) + diâmetro_mm +
  refluxo_tempo_s. **Sem coords finas** (só topografia grossa).
- Os `findings` crus (input do bridge) têm `calibre_mm` por segmento — HOJE descartado
  no `buildMapaVenoso`. Dá p/ propagar sem tocar schema/extractor.

**C5 v1 anota:**
1. **Calibre das safenas** (magna→medial, parva→posterior): propagar `calibre_mm`
   do finding p/ uma nova lista `anotacoes[]` no MapaVenoso; posicionar no meio do vaso.
2. **Perfurantes incompetentes**: Ø mm + profundidade, posicionadas por `topografia`
   → y aproximado na vista Posterior/Medial (marca + texto).
3. **Refluxo**: opcional — tempo "X s" junto ao tronco (magna/parva) se ditado.

## O que fica para v2 (schema — cartografia fina)
- **Medida por nível** exata (croça/coxa 3 terços/joelho/perna) e **distância acima da
  face plantar** (os "43cm/41cm" manuscritos): NÃO existem no schema atual. Precisam de
  campos novos em `SegmentoFindingSchema` + extractor. Adiado (plano-motor fase 2).
- **Cadeias de transferência** (tributário anterior↔posterior).

## Implementação (pacote `@laudousg/schemes`, aditivo)
1. `venousMap.ts`: `buildMapaVenoso` passa a preencher `anotacoes: VenousAnnotation[]`
   `{ lado, segmento|topografia, texto, tipo: "calibre"|"perfurante"|"refluxo" }`
   a partir de `calibre_mm` e das perfurantes. Campo NOVO opcional no `MapaVenoso`
   (nullable — clientes antigos ignoram).
2. `venousAnnotations.ts` (novo, análogo a venousCallouts): `buildVenousAnnotations4(
   mapa, coords4)` → posições no espaço da arte: âncora no vaso (célula certa via
   segmento), texto na margem lateral próxima, traço curto até a âncora. Sem overlap
   (empilha por y como os callouts). Estilo manuscrito = decisão de fonte no cliente.
3. Clientes (RN Skia + iOS CoreGraphics): desenhar as anotações no render de 4 vistas
   (hoje sem callouts). Fonte "manuscrita" (ex.: uma handwriting bundlada) ou itálico
   discreto como v1. Mesmo layout nos dois (função compartilhada).

## Testes
- Golden do `buildVenousAnnotations4`: caso com calibre magna + perfurante → posições
  na célula certa (medial/posterior), sem overlap, texto correto. tsc 0.

## Sequência
1. Design (este doc) → 2. Enriquecer buildMapaVenoso (anotacoes) → 3. venousAnnotations.ts
+ golden → 4. render RN → 5. render iOS (Dex2) → 6. validar com Luiz sobre a arte real.
