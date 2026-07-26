# BRIEF C4-iOS — Porte do recolor de 4 vistas para o Swift (CoreGraphics)

**Para:** Dex2 (repo Swift `laudousg-swift`, `LaudoUSG/`)
**Contexto:** a cartografia venosa ganhou 4 VISTAS (8 células membro×vista). O motor
de referência (fonte da verdade) foi implementado no monorepo TS e validado:
`packages/schemes/src/vascular/venousRaster.ts` → `recolorVenousPixels4` +
`VenousCoords4` + `venous4ViewCoords.ts` (VENOUS_4VIEW_COORDS). O RN (apps/mobile)
já consome via Skia. Falta o iOS ficar IGUAL.

## O que portar (fiel ao TS, como já foi feito no `VenousOrganicRenderer.swift`)

1. **Modelo de coords 4 vistas:** análogo a `VenousCoords4`:
   `{ width, height, vistas: [ "${lado}__${vista}": [segmento: [[x,y]...]] ] }`.
   Bundlar as coords de `packages/schemes/src/vascular/venous4ViewCoords.ts`
   (VENOUS_4VIEW_COORDS) como JSON no app (Resources/Venous/coords-4view.json).
2. **Asset:** a arte-base das 8 vistas = `apps/mobile/assets/venous/venous-4view.png`
   (2048×3072). Copiar para o imageset do app iOS (Venous4View.imageset).
3. **Recolor:** função `recolorVenousPixels4` em CoreGraphics, porte FIEL de
   `venousRaster.ts::recolorVenousPixels4`:
   - itera as 8 células; para cada segmento com polilinha, lê o estado em
     `mapa.lados[lado].segmentos[seg]`; recolore o tubo (raio=13) só nos pixels-de-veia.
   - **Face lateral:** passo dedicado — a coord `tributaria_lateral` pinta com a cor de
     varicosidade quando `mapa.lesoes` tem, naquele lado, lesão `varicosidade` cujo
     texto (label+sub, lowercased) contém "lateral".
   - Reusar `isVeinPixel`, `distToPolyline`, `tubeRadius`, `VENOUS_STATE_RGB` já portados.
4. **Seleção por asset_version:** o evento SSE `scheme` traz `asset_version`.
   `"venous-4view-1"` → render de 4 vistas (recolorVenousPixels4, SEM callouts em
   pílula — anotações manuscritas são C5, ainda não feitas). `"venoso-anterior-1"` →
   mantém o render atual (vista única + callouts). NÃO quebrar o caminho atual.

## Fonte da verdade (LER antes de portar)
- `packages/schemes/src/vascular/venousRaster.ts` (recolorVenousPixels4 + recolorTube + helpers)
- `packages/schemes/src/vascular/venous4ViewCoords.ts` (coords)
- Golden esperado: `packages/schemes/src/vascular/__tests__/venousRaster4.manual.ts`
  (isolamento por célula: magna→medial, parva→posterior, lateral por texto, conservador)

## Entrega
- Branch no repo Swift (ex.: `feat/venous-4view-recolor`), BUILD SUCCEEDED, SEM push.
- Decode-test do MapaVenoso + um render de fumaça (caso: magna refluxo bilateral).
- Escrever resumo em `/tmp/review-c4-ios-dex2.md` (ou nota medmaestri).
- Responder: C4-IOS-PRONTO.

## Gotchas conhecidos (memória)
- `JSONDecoder.api` tem `.convertFromSnakeCase` que MANGLA `safena_magna`→`safenaMagna`
  — decodificar o evento `scheme` com `JSONDecoder()` PURO + CodingKeys explícitas.
- `lados` é struct (não dict-por-enum). Estado por segmento preserva as chaves snake_case.
