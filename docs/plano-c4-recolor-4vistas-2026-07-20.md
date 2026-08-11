# Plano C4 — Recolor por vista (motor 8 células)

**Data:** 2026-07-20 · Pré-implementação, para aprovação do Luiz antes de tocar código de produção.
Contexto: C1/C2 (arte) + C3 (coords `membro__vista`) prontos. Ver `plano-cartografia-4vistas-proximos-passos.md`.

## Objetivo
Estender o motor de recolorização (`recolorVenousPixels`) do modelo atual
`{direito, esquerdo}` (1 vista anterior, asset 944×1666) para o modelo de **8 células
`membro__vista`** (asset 2048×3072), sem quebrar o caminho atual em produção.

## Princípio de design (por que fica simples)
As coords do C3 **já codificam a pertinência vista↔segmento**: um segmento só tem
polilinha na célula onde é desenhado (`safena_magna` só em `*__medial`, `safena_parva`
só em `*__posterior`). Então o recolor novo **não precisa de tabela de mapeamento** —
ele itera as células, lê o `lado` da chave e pinta os segmentos que existirem ali.

## Mudanças (só no pacote `@laudousg/schemes`, aditivas)
1. **Novo tipo** `VenousCoords4 = { width, height, vistas: Record<"${lado}__${vista}", Record<SegmentoVenoso, Ponto[]>> }`
   em `venousRaster.ts` (ao lado do `VenousCoords` atual, que permanece).
2. **Extrair helpers** já existentes (`isVeinPixel`, `distToPolyline`, `tubeRadius`,
   `VENOUS_STATE_RGB`) — já são reutilizáveis, sem duplicar.
3. **Nova função** `recolorVenousPixels4(pixels, w, h, mapa, coords4, opts)`:
   - para cada `cellKey` em `coords4.vistas`: parse `lado` (`direito|esquerdo`);
   - para cada `seg` com polilinha na célula: `estado = mapa.lados[lado].segmentos[seg]`;
   - se `estado` ≠ normal e há cor: recolore o tubo (mesma lógica atual, bbox+distToPolyline).
   - Retorna nº de pixels alterados.
4. **Recalibrar raio do tubo:** MEDIDO na arte v3 — a veia tem só **~6px** de largura
   (GPT-Image desenhou linhas finas). Raio escala com a ESPESSURA da veia, não com o
   tamanho da imagem. `radius` default = **13** (cobre os ~6px + folga da polilinha, sem
   invadir tributárias vizinhas; só pixels AZUIS são recoloridos, então pele nunca é tocada).
5. **`asset_version`** nova (ex.: `venous-4view-v1`) para o SSE `scheme` distinguir o
   asset/coords que o cliente deve carregar. NÃO altera o writer/texto.
6. **Coords de produção:** mover `coords-8vistas-v1.json` para o pacote como
   `venous4ViewCoords.ts` (padrão do `venousAnteriorCoords.ts`).

## O que NÃO muda neste passo
- `recolorVenousPixels` atual + asset anterior (produção atual segue viva).
- `buildMapaVenoso`, schema `findings.ts`, writer/texto do laudo.
- Clientes (iOS/Android/web) — a **consumação** do novo motor+asset é passo separado
  (C4-clientes), planejado depois. Aqui entrega-se só o motor + testes no pacote.

## Testes (mesmo padrão dos existentes)
- Golden: `MapaVenoso` com `direito.safena_magna = refluxo` → recolor pinta pixels
  **só nas células `*__medial`** e **zero** nas outras vistas (isolamento por célula).
- `safena_parva = trombose_oclusiva` → só `*__posterior`, cor correta.
- Idempotência/bounds: não estoura fora da bbox; conta de pixels > 0.
- `tsc` 0 + testes verdes.

## Vista Lateral (decisão Luiz 20/07: "mapear varicosidade lateral", sem novo segmento)
- O schema NÃO tem tronco lateral nem campo "face". Varicosidade é `tipo` preso a um
  `segmento`; "lateral" só aparece no texto livre (`descricao_livre`/`termo_do_medico`).
- **Implementação:** recolor4 tem um passo dedicado p/ a coord `tributaria_lateral` —
  pinta-a (cor de varicosidade) quando `mapa.lesoes` tem, naquele lado, uma lesão de
  estado `varicosidade` cujo texto (label+sub) menciona "lateral". Conservador: sem
  match → não pinta. Não toca schema nem extractor. Limitação documentada no teste.

## Riscos / decisões abertas
- **Anterior** já mapeia ao segmento real `safena_acessoria_anterior` (recolor direto).
- **Perfurantes / medidas por nível** — v2 (marca e cartografia fina).
- **Backward-compat do SSE** — cliente antigo ignora `asset_version` novo (fail-safe).

## Sequência de execução (após aprovação)
1. Medir espessura da veia na arte → fixar `radius`.
2. Implementar tipo + `recolorVenousPixels4` + helpers extraídos (branch dedicado).
3. Testes golden. `tsc` + test.
4. Mostrar diff ao Luiz. Sem push (— @devops liga flag/asset quando validado em device).
