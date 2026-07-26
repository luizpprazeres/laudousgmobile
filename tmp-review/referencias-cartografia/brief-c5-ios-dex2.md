# BRIEF C5-iOS — Anotações manuscritas de 4 vistas no Swift (CoreGraphics)

**Para:** Dex2 (repo Swift `laudousg-swift`, `LaudoUSG/`, branch `feat/venous-4view-recolor`)
**Contexto:** o C5 adiciona anotações manuscritas (medidas ao lado do vaso) sobre a
cartografia de 4 vistas. Núcleo TS pronto e validado (fonte da verdade):
`packages/schemes/src/vascular/venousAnnotations.ts` → `buildVenousAnnotations4` +
`venousMap.ts` (`anotacoes[]` no MapaVenoso). O RN (apps/mobile) já desenha via Skia.

## O que portar (fiel ao TS)

1. **Modelo `anotacoes[]` no MapaVenoso** (Codable): cada item
   `{ lado, tipo: "calibre"|"perfurante"|"refluxo", texto, segmento?, topografia? }`.
   Já vem do backend no evento SSE `scheme` (map). Preservar snake_case (mesma
   estratégia do decode do scheme — JSONDecoder puro + CodingKeys).
2. **Layout `buildVenousAnnotations4(mapa, coords4)`** — porte FIEL de
   `venousAnnotations.ts`: posiciona cada anotação na MARGEM da célula certa
   (magna→medial, parva/perfurante→posterior), `textPos` = borda do texto voltada
   ao vaso (fim do traço-guia), `side` = alinhamento (left = alinhado à direita
   terminando em textPos; right = alinhado à esquerda começando em textPos).
   Anti-overlap por empilhamento em y. Constantes: textWidth=180, lineHeight=46,
   margin=12, minGap=26. Reusar as coords 4-view já bundladas (coords-4view.json).
3. **Render CoreGraphics** (no `VenousOrganicRenderer`, caminho `venous-4view-1`):
   após o recolor, desenhar por anotação: traço-guia (âncora→textPos, cor #7a1f2b,
   ~3pt) + ponto na âncora + texto (medida) alinhado por `side`. Fonte: por ora a
   fonte do app (o RN usa a bold ~52pt em espaço de arte 2048×3072); **fonte
   handwriting fica como refinamento de estilo depois** (asset a decidir).

## Fonte da verdade (LER)
- `packages/schemes/src/vascular/venousAnnotations.ts` (layout — replicar exato)
- `packages/schemes/src/vascular/venousMap.ts` (anotacoes[] — como é preenchido)
- Golden esperado: `__tests__/venousAnnotations.manual.ts` (célula certa, afastado do
  vaso ≥ minGap, sem overlap, omissão de segmento sem coords)
- Referência de render RN: `apps/mobile/src/features/generate/VenousSchemeView.tsx`
  (`drawAnnotationsImage`)

## Entrega
- Mesmo branch Swift, BUILD SUCCEEDED, SEM push.
- Render de fumaça (caso: calibre magna + Ø perfurante) — anotações na margem, não
  sobre o vaso.
- Responder: C5-IOS-PRONTO.
