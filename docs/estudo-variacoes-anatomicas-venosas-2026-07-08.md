# Estudo — Variações anatômicas venosas MMII e sua representação no mapa (2026-07-08)

> Insumo do Track A da cartografia venosa. Objetivo: o motor saber **desenhar quando o achado for ditado** (nunca inventar). Cada variação vira um estado/overlay data-driven sobre a arte-base. Fonte: nomenclatura anatômica atual + snippets `packages/knowledge/snippets/DOPPLER_VENOSO_MMII*`.

## Princípio de representação
A arte-base mostra a anatomia **típica**. Variação = **overlay** ou **modificação de estado** de um segmento, acionada só quando o laudo a menciona. Duas classes:
- **Presença/ausência** (liga/desliga um traço extra ou apaga um segmento).
- **Duplicação/curso** (desenha um traço paralelo ou reencaminha).

## Catálogo de variações → representação

| Variação | O que é | Frequência | Representação no mapa |
|---|---|---|---|
| **Duplicação da safena magna** | dois troncos safênicos paralelos num segmento | comum (~20% em algum segmento) | 2ª linha paralela fina ao lado do `safena_magna` no segmento ditado |
| **Duplicação da veia femoral/poplítea** | sistema profundo duplicado | comum (femoral ~20-30%) | 2ª linha paralela ao segmento profundo (relevante p/ TVP: um canal trombosado + outro pérvio) |
| **Safena acessória anterior (SAA)** | tributária anterolateral da coxa que sobe paralela | comum | traço extra anterolateral na coxa (`safena_acessoria_anterior`), liga só se ditada |
| **Safena acessória posterior** | tributária posteromedial | menos comum | traço extra posteromedial |
| **Veia de Giacomini** | comunicação parva ↔ magna pela face posterior da coxa | comum | traço posterior conectando parva (poplíteo) → magna (coxa) — na vista posterior |
| **Aplasia/hipoplasia segmentar da safena magna** | segmento ausente/filiforme | ocasional | segmento apagado/esmaecido (estado `ausente`) |
| **Terminação alta/baixa da safena parva** | JSP em nível variável; extensão cranial (v. femoropoplítea) | comum | ponto da JSP e extensão desenhados conforme ditado (vista posterior) |
| **Perfurantes (por topografia)** | conexões superficial↔profundo | sempre presentes; ditamos as **incompetentes** | ver seção Perfurantes |
| **Veia safena magna "em delta" na crossa** | tributárias da junção safeno-femoral | comum | pequenas tributárias na JSF (só se relevante) |

## Perfurantes — topografia e representação
Nomear por topografia (não por epônimo isolado). Perfurante é **curta** ⇒ conector curto entre superficial e profundo é aceitável (não precisa de arte generativa).

| Grupo (topografia) | Nível aproximado | Uso clínico |
|---|---|---|
| Perfurantes de coxa (canal femoral / "Dodd", "Hunter") | coxa média/distal | insuficiência da magna |
| Perfurante de joelho ("Boyd") | logo abaixo do joelho, medial | ponto de refluxo comum |
| Perfurantes de perna medial ("Cockett" / paratibiais) | terço médio/distal medial da perna | úlcera venosa, refluxo |
| Perfurantes de panturrilha (gastrocnêmias/soleares) | posterior | vista posterior |

**Glifos (vocabulário do print 1 do OneVASC):**
- Perfurante **de reentrada** = círculo **aberto** (contorno).
- Perfurante **refluxante/incompetente** = círculo **preenchido** na cor de refluxo.
Critério de incompetência (snippet da casa): refluxo > 0,5 s **e** diâmetro > 3,5 mm.

## Como o motor consome (contrato)
Estende o `MapaVenoso`:
```
variacoes?: {
  duplicacao?: SegmentoVenoso[];          // desenha traço paralelo
  ausente?: SegmentoVenoso[];             // esmaece/apaga
  acessorias?: ("anterior"|"posterior")[];// liga traço extra na coxa
  giacomini?: boolean;                     // vista posterior
}
perfurantes?: Array<{
  topografia: "coxa"|"joelho"|"perna_medial"|"panturrilha";
  lado: "direito"|"esquerdo";
  competente: boolean;                     // false → glifo preenchido (refluxante)
  diametro_mm?: number;
}>
```
Regra de ouro: só desenha o que o laudo dita. Sem menção ⇒ anatomia típica limpa.

## Decisões (autônomas)
- Perfurantes desenhadas como **overlay nosso** (conector curto + glifo), não dependem de estarem na arte-base.
- Duplicação/acessórias = traço paralelo fino gerado a partir do path do segmento (offset lateral), não precisa de nova arte.
- Giacomini e parva com extensão = **vista posterior** (prancha posterior em geração pelo Dex).
- Ausência/aplasia = estado que esmaece o segmento na base (overlay de "apagar" com cor da pele, ou opacidade).
