# Resultado C3 v1 — coords por vista (Claude, tracer por pixels)

**Feito por:** Claude (script `trace-c3.js`, mesma técnica de inspeção de pixels
do coords anterior — não "a olho"). Fonte: `veias-8vistas-v2.png` (2048×3072, C2 aprovado).

## Modelo de dados (novo)
Expandido de `{direito, esquerdo}` (1 vista) para **8 células `membro__vista`**:
```
{ width, height, vistas: { "direito__medial": { safena_magna: [[x,y],...] }, ... } }
```
Arquivo: `coords-8vistas-v1.json`. Overlay de validação: `coords-overlay-v1.png` (polilinha em vermelho sobre a arte).

## Cobertura v2 — AS 4 VISTAS (após C2-bis reforçar Anterior/Lateral)
Fonte: `veias-8vistas-v3.png`. Arquivo `coords-8vistas-v2.json`; overlay `coords-overlay-v2.png`.
- `*__medial.safena_magna` — 89/83 pts (croça→tornozelo, ambas) ✓
- `*__posterior.safena_parva` — 44/45 pts (panturrilha, ambas) ✓
- `*__anterior.safena_acessoria_anterior` — 88/89 pts (coxa→tornozelo, ambas) ✓
- `*__lateral.tributaria_lateral` — 87/85 pts (ambas) ✓ **[chave provisória]**

### Nota sobre `tributaria_lateral`
O schema (`SEGMENTOS_VENOSOS` em findings.ts) NÃO tem tronco lateral nomeado
(só magna, parva, safena_acessoria_anterior, giacomini). A coord lateral está
capturada mas com chave provisória `tributaria_lateral` → o recolor C4 a IGNORA
(não existe em `mapa.segmentos`) até decidirmos se: (a) adicionar segmento ao schema,
ou (b) mapear varicosidades de face lateral para essa coord. Decisão de v2.

## Adiado para v2
- **`tributaria_lateral`**: precisa de segmento no schema p/ ser recolorível (acima).
- **Perfurantes** (marcas ovais na Posterior): são MARCA (C5), não recolor de tubo.
- **Medidas por nível / cadeias de transferência**: cartografia fina, schema v2.

## Próximo (C4)
Estender `recolorVenousPixels` (packages/schemes/src/vascular/venousRaster.ts) do
modelo `direito/esquerdo` para iterar as 8 células `membro__vista`, mapeando cada
segmento do `MapaVenoso` para a(s) célula(s) onde ele aparece (magna→medial,
parva→posterior). Realces evidentes (vermelho saturado; ondulado p/ varicosidade).
