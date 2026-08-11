# Integração dos esquemas visuais em produção — o que falta alinhar (iOS + Android) · 2026-07-08

> Resposta a: "o que fica faltando alinhar com o @devops para colocar em prática mesmo no Android e no iOS?". Estado atual: o motor determinístico está pronto e testado em `packages/@laudousg/schemes` (venoso). Falta a camada de INTEGRAÇÃO por cliente + infra. Enriquecer com o parecer do Dex.

## Contrato compartilhado (a fonte da verdade)
`packages/@laudousg/schemes/vascular`: schema `DOPPLER_VENOSO_MMII` (Zod+JSON+prompt) · `buildMapaVenoso(achados)→MapaVenoso` · `recolorVenousPixels` (tube-recolor) · `venousSvg` (alternativa). Ids de segmento canônicos (15). **Regra:** determinístico = DESENHO; texto do laudo = writer. Composição roda no CLIENTE.

---

## Backend (`apps/api`) — pendências
1. **Extração side-channel:** rodar o extractor `DOPPLER_VENOSO_MMII` para produzir o `MapaVenoso` a partir do ditado SEM rotear o texto do laudo pelo renderer (o texto continua no writer). Hoje a extração só roda dentro de `runRendererStream` (que substitui o texto) — precisa de um caminho paralelo que extraia os achados e NÃO troque `finalText`.
2. **Expor o `MapaVenoso`** ao cliente: no payload do `/api/generate` (campo extra) ou endpoint dedicado. O cliente recebe o objeto e desenha.
3. **Hospedar a arte-base + coords** como assets de produção: `venoso-lineart-veias.png` + `venoso-lineart-veias-coords.json` (hoje em `tmp-review/`). Mover para asset servido (static/CDN) versionado.
4. Flag `VASCULAR_MAP` (default OFF) — igual ao padrão da casa.
- **Maior risco:** fiar a extração paralela sem afetar a saída do writer (aditivo, flag-gated).

## Android (RN — `apps/mobile`) — pendências
1. **Consumir `@laudousg/schemes` direto** (é TS) — resolver o pacote no Metro/bundler do RN (workspace). Confirmar que o Metro resolve `@laudousg/schemes/vascular`.
2. **Rasterização do tube-recolor:** `recolorVenousPixels` precisa de acesso a pixels RGBA. RN não tem canvas DOM. Opções: (a) **WebView** com `<canvas>` (reusa o protótipo quase 1:1); (b) **@shopify/react-native-skia** (pixels nativos, performático); (c) gerar **SVG** via `venousSvg` e renderizar com `react-native-svg` (já é dep) — mas perde o recolor orgânico da foto. Decisão de produto/UX.
3. Enviar o PNG resultante via `/api/sala/push-schema` (fluxo já existente para os outros esquemas — hoje só iOS envia).
- **Maior risco/decisão:** mecanismo de rasterização no RN (WebView vs Skia vs SVG).

## iOS (Swift — repo `laudousg-swift`) — pendências
1. **O pacote é TS; Swift não o executa.** Já existe `VenousCartographyView`/`VenousSegmentCatalog` (18 segmentos) + `MyomaSchemaExporter`/etc. → `push-schema`. Duas rotas:
   - (a) **Portar** `buildMapaVenoso` + tube-recolor para Swift, reconciliando `VenousSegmentCatalog` com os ids canônicos do pacote (o pacote vira a ESPECIFICAÇÃO; o Swift implementa).
   - (b) **Backend gera** o esquema (sharp está presente transitivamente — dá pra rasterizar server-side) e o iOS só exibe/empurra — evita duplicar a lógica em Swift, mas move a composição pro servidor (contraria a decisão client-side; reavaliar só para o iOS).
2. Alinhar a arte-base: usar a mesma `venoso-lineart-veias.png` (ou o `VenousCartographyView` atual) — decidir se substitui a cartografia manual do Swift pela automática.
- **Maior risco/decisão:** porte Swift × drift do canônico TS (a rota (a) exige disciplina de manter os dois em sincronia; a rota (b) centraliza mas precisa de raster no backend).

## @devops — pendências
1. **Asset hosting** das artes-base (venoso, e depois útero/tireoide/mama) + coords JSON — static/CDN versionado; decidir onde (Vercel static, bucket).
2. **Resolução do pacote workspace no bundle RN** (Metro) e no build do backend (já ok — tsc 0).
3. **Flag** `VASCULAR_MAP` no Vercel (default OFF) + rollout por categoria.
4. `push-schema` já existe e é plugável (só troca quem gera) — sem mudança de contrato.
5. Avaliar habilitar `sharp` (transitivo) como dep direta SE optarmos por rasterização server-side (rota iOS (b)).
- **Maior decisão:** onde hospedar os assets + se a composição é 100% cliente ou se o iOS usa server-side.

## Ordem sugerida de rollout
1. Backend: extração side-channel + expor `MapaVenoso` + hospedar assets (flag OFF).
2. Android RN (consumo direto do pacote) — decidir rasterização; validar no fluxo push-schema.
3. iOS: decidir porte Swift vs server-side; reconciliar `VenousSegmentCatalog`.
4. Ligar flag por categoria; expandir posterior/arterial/carótidas + miomas/tireoide/mama.

---

## Parecer do Dex (incorporado) — refinamentos por frente
**Chamada do Dex:** o BACKEND entrega o `MapaVenoso`; nem Swift nem RN devem reimplementar `buildMapaVenoso`. Cada cliente só porta o RENDER (o recolor). Isso minimiza drift.

**Backend (decisão: canal de transporte do MapaVenoso sem tocar no texto do writer):**
- Extração side-channel do `DOPPLER_VENOSO_MMII` com o extractor já existente, em paralelo ao writer.
- Entregar por: **evento SSE novo** `{ type: "scheme", exam_type, map, asset_version }` durante a geração, OU **endpoint** `/api/reports/:id/schemes/venous-map`.
- **Auditoria:** falha da extração side-channel NUNCA pode derrubar o laudo — logar e seguir.
- **Flag separada** `VENOUS_SCHEME_MAP=true` (default OFF) — não misturar com outras.
- Mover assets de `tmp-review/` → `packages/schemes/assets/vascular/`, `apps/api/public/scheme-assets/`, ou storage/CDN.

### INVENTÁRIO iOS (pesquisa Dex2, 08/07) — muito já existe; escopo menor do que parecia
O app Swift JÁ TEM cartografia venosa e todo o pipeline de esquema:
- **Cartografia venosa em SwiftUI VETORIAL** (não é PNG/CoreGraphics): segmentos traçados por `VenousSegmentCatalog.path(for:)` e coloridos por `VenousFinding.Status` (`VenousCartographyView.swift:54`). Arquivos: `VenousCartographyView.swift`, `Models/VenousSegmentCatalog.swift`, `Models/VenousFinding.swift`, `Services/VenousFindingsParser.swift`, `Components/VenousSchemaSheet.swift`, `Components/VenousSchemaEditor.swift`.
- **Dados hoje:** `VenousFindingsParser.parse(reportText)` (regex do texto) + editor manual por chips.
- **SSE:** `ReportService`→`SSEStreamer`→`GenerateSSEEvent.swift`→`GenerateViewModel`. Eventos desconhecidos são **ignorados** (SSEStreamer só age em .token/.done/.error) → o novo `scheme` é **seguro** (app antigo ignora), mas precisa de um `case scheme` novo p/ usar.
- **Export/push:** `MyomaSchemaExporter` (SwiftUI→PNG/PDF→`SalaSchemaUploader`, examType "MIOMAS"), idem MAMA/TIREOIDE; `VenousSchemaSheet` já mostra preview/editor.
- **Assets:** `Assets.xcassets`; o venoso é desenhado em SwiftUI (não há PNG orgânico no bundle).

**DECISÃO DO LUIZ (08/07): rota (B) — portar o look ORGÂNICO pro iOS ficar IDÊNTICO ao web/RN.**

**DECISÃO iOS (nova, importante):** o iOS já desenha a cartografia venosa em SwiftUI vetorial. Duas rotas:
- **(A) Reusar a cartografia SwiftUI existente** e só alimentá-la do `MapaVenoso` (mapear estados→`VenousFinding.Status`, alinhar ids) + parsear o `scheme` SSE. **Muito menos trabalho; NÃO precisa portar tube-recolor nem embutir a arte orgânica.** Visual = o vetorial do Swift (difere do orgânico do web/RN).
- **(B) Portar o look orgânico** (bundle da arte PNG + coords + tube-recolor via CoreGraphics) para ficar idêntico ao web/RN. Mais trabalho; consistência visual entre plataformas.

**Veredito do Dex — além do "miolo" (Codable + regra de estados + SSE case), FALTA:** camada de estado no fluxo de geração (guardar o `map` recebido; hoje só token/done/error mexem no estado); **contrato de versionamento** do asset (`asset_version`→qual arte/coords); se rota (B), o exporter renderiza a imagem composta via CoreGraphics; o Apple Watch consome o mesmo SSE — não precisa implementar, mas **não pode quebrar** no evento novo; testes snapshot/pixel do recolor. **Resumo: não é só plugar Codable+CoreGraphics** — o maior é decidir (A) vs (B) e a camada de estado/versionamento.

**iOS Swift (decisão: NÃO portar buildMapaVenoso):**
- Modelos `Codable` para `MapaVenoso`/`EstadoSegmento`/`SegmentoVenoso`.
- Portar SÓ o tube-recolor (`isVeinPixel` + distância ponto-polilinha) via **CoreGraphics**.
- Alinhar/aposentar o `VenousFinding`/`VenousSegmentCatalog` antigo (regex vira fallback, não fonte).
- Criar `VenousSchemaExporter` (espelhando `MyomaSchemaExporter`/Breast/Thyroid) + enviar via `SalaSchemaUploader.upload(examType:…)`.
- `VenousSchemaSheet` passa a preferir o `MapaVenoso` do backend; regex = fallback manual.
- Embutir a arte-base orgânica + coords em assets versionados do app (não `tmp-review`).

**Android RN (`apps/mobile`) (decisão: mecanismo de render):**
- Adicionar `@laudousg/schemes` ao `apps/mobile/package.json` + garantir que o **Metro resolve** o pacote (ver risco devops).
- Backend entregando o `MapaVenoso`, o app só valida/usa o payload (pode até consumir `buildMapaVenoso` do TS se quiser).
- Render: **(baixo risco)** `react-native-svg` (já instalado) desenhando paths; **(orgânico real)** `@shopify/react-native-skia` para o recolor; WebView-canvas funciona mas é frágil.
- Atualizar o schema SSE local do mobile se o backend emitir o evento novo.

**@devops (decisão: fonte de verdade de assets + pacote):**
- Assets **embutidos** nos apps (robustez offline, sem latência) × **CDN** (atualização sem release). Recomendação: embutir por ora.
- **`@laudousg/schemes` como source-TS pode quebrar no bundle mobile (Metro)** — ajustar build/transpile do pacote para RN. **Item concreto do devops.**
- Flags por camada (backend extrai · iOS mostra/envia · Android mostra/envia).

## Resumo executivo (o que falta para "colocar em prática")
1. **Backend:** side-channel + canal (SSE `scheme` ou endpoint) + flag `VENOUS_SCHEME_MAP` + assets num home de produção. *(aditivo, flag OFF — dá para começar já)*
2. **iOS:** Codable + porte do recolor (CoreGraphics) + `VenousSchemaExporter` + trocar regex→MapaVenoso. *(repo Swift)*
3. **Android:** dep do pacote + decisão de render (svg-overlay vs Skia) + consumir o payload. *(apps/mobile)*
4. **@devops:** Metro/bundle do pacote + hosting dos assets + flags. *(desbloqueia iOS+Android)*
O caminho crítico é o **backend entregar o MapaVenoso** (1) — destrava iOS e Android em paralelo.
