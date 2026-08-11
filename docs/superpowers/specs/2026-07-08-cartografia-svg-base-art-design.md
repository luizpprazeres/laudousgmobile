# Design — Arte-base da cartografia venosa (resolução do gargalo SVG) · 2026-07-08

> Spec de decisão. Resolve o gargalo real do protótipo de cartografia venosa: **desenhar a anatomia (pernas E vasos) em SVG do zero nunca fica bom**. Complementa `docs/estudo-onevasc-cartografia-venosa-2026-07-08.md`.

## Problema

Tentativas repetidas de gerar o SVG anatômico (silhueta das pernas + vasos) **do zero** produzem resultado ruim:
- **Pernas:** formas orgânicas (coxa, joelho, pé) exigem colocar centenas de coordenadas bézier às cegas — o LLM não enxerga um canvas. Limitação estrutural, não de esforço/modelo.
- **Vasos:** quando desenhados à mão pelo LLM, saem "retos e sem sentido" (feedback do Luiz — já testado).
- **GPT-Image** produz raster lindo, mas **pixels não são vetor endereçável** — não dá para recolorir "a veia femoral" num PNG.

O que **funciona** e deve ser preservado: o **motor** (estados por cor, símbolos, legenda estilo OneVASC, callouts em pílula). Validado pelo Luiz ("ficou muito bom").

## Princípio da solução

**Não inventar nenhuma linha — nem perna, nem vaso.** Toda a arte orgânica vem de fora (GPT-Image); só marcamos/recolorimos o que está alterado.

Decisão do Luiz (2026-07-08): fonte da arte-base = **GPT-Image** (referência de estilo = OneVASC + prints enviados). Wikimedia PD (`Venous_system_en.svg`, domínio público, tem a nomenclatura certa das veias) e Servier CC-BY ficam como alternativas de fallback.

## Arquitetura (2 camadas)

1. **Camada-base (raster, fixa) — do GPT-Image.**
   Prancha combinada: pernas bege front-view **com** a rede venosa normal (linhas azuis, curvas naturais), estilo OneVASC, **sem rótulos**. Legs+veias juntos ⇒ alinhamento automático. Entra como `<image>` (fundo) no SVG. Vetorização (vtracer/potrace) é opcional futura, só se quisermos dark mode / peso menor.

2. **Camada de vasos + achados (vetor, nossa) — o motor aprovado.**
   - **Geometria dos vasos:** obtida **traçando cada veia nomeada UMA vez sobre a prancha gerada** (seguir a curva que já existe — não inventar). Resultado: paths `id="{lado}__{segmento}"`, orgânicos e endereçáveis. Trace via vtracer (separação por cor azul) ou traçado manual sobre a referência.
   - **Render de estado:** segmento alterado → path traçado pintado na cor do estado (refluxo âmbar, TVP vinho, trombose parcial tracejada) + glifo + callout em pílula sobre o fundo. Segmento normal permanece o do fundo.
   - **Legenda:** adotar o vocabulário do print 1 do OneVASC (veia normal, varicosa interfascial/suprafascial, perfurante de reentrada/refluxante, junção normal, refluxo juncional/terminal, sem junção).

## Fluxo

```
GPT-Image (Luiz) → prancha combinada PNG
   → [eu] embutir como fundo no SVG
   → [eu] traçar cada veia nomeada uma vez → paths por segmento (contrato de ids estável)
   → [motor existente] recolorir alterados + glifos + callouts + legenda
   → republicar protótipo (mesma URL do artifact)
```

## Contrato de ids (estável, já definido)

Profundo: `femoral_comum, femoral, femoral_profunda, poplitea, tibial_posterior, tibial_anterior, fibular`
Superficial: `safena_magna, safena_parva, safena_acessoria_anterior, giacomini`
Junções: `jsf, jsp` · Perfurantes: `perf_coxa, perf_perna`
Formato do elemento: `id="{direito|esquerdo}__{segmento}"`.

## Por que resolve

- O "reto e sem sentido" desaparece: geometria do vaso vem da arte; ajuste = traçar sobre curva existente.
- Recolorido por estado continua funcionando (temos os paths).
- O motor validado (estados/legenda/callouts) fica intacto.
- Usa GPT-Image no que é imbatível (raster) e vetor só onde precisa mudar de cor.

## Prompt de geração (prancha combinada)

Ver corpo da conversa (2026-07-08). Requisitos-chave: front-view, pernas bege soft, veias azuis com curvas naturais (great/small saphenous, femoral/popliteal/tibiais), **sem rótulos/texto/números/setas**, margens laterais generosas (espaço p/ pílulas), fundo branco/transparente, portrait, alta resolução.

## Aberto / próximos

- **Alternativa duas-pranchas** (pernas separadas dos vasos) se quisermos controle total de cor + dark mode — exige alinhamento manual de 1 vez.
- Depois de validado o visual: fundação estrutural (schema strict venoso do `plano-motor-doppler-vascular` com chaves de segmento estáveis) → componente `<VascularMap/>` flag-gated no laudo DOPPLER_VENOSO_MMII (texto continua soberano).
- Reconciliar com a cartografia MANUAL já existente no Swift (`VenousCartographyView`/`VenousSegmentCatalog`).
