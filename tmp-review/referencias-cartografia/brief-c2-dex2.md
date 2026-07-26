# BRIEF C2 — Rede venosa normal em baixa opacidade (sobre a base aprovada)

**Para:** Dex2 (GPT-Image, modo EDIÇÃO sobre a v2)
**Base aprovada pelo Luiz:** `tmp-review/referencias-cartografia/silhuetas-8vistas-v2.png`
**Referências reais:** `prancha-4vistas-2018.jpg` e `prancha-4vistas-2023.jpg` (mesma pasta)
**Plano:** `docs/plano-cartografia-4vistas-proximos-passos.md`

## Objetivo

EDITAR a v2 (NÃO regenerar as silhuetas — elas estão aprovadas) adicionando a
**rede venosa superficial NORMAL** em cada uma das 8 células, em **azul claro /
baixa opacidade** — as veias são o "estado normal"; alterações serão recoloridas
por cima pelo motor tube-recolor (mesma lógica da arte anterior
`apps/mobile/assets/venous/venoso-lineart-veias.png`: veia azul recolorível).

## O que desenhar por vista (MID e MIE iguais, adaptado ao lado)

- **Medial (M):** veia **safena magna COMPLETA** — nasce na croça/junção
  safeno-femoral na prega inguinal (que a v2 já desenha), desce a face medial da
  coxa, passa atrás do côndilo medial do joelho, segue a face medial da perna até
  o maléolo medial/dorso do pé. Trajeto contínuo, ORGÂNICO (curvas suaves
  seguindo a silhueta, nunca reta). 1–2 tributárias mediais discretas na perna.
- **Posterior (P):** veia **safena parva** — da fossa poplítea (junção
  safeno-poplítea) descendo a linha média da panturrilha até o maléolo lateral.
  Arco discreto na fossa poplítea marcando a JSP.
- **Anterior (A):** tributária(s) anterior(es) da magna na coxa/perna — 1–2
  ramos finos, discretos.
- **Lateral (L):** 1 tributária/rede lateral fina e discreta na coxa/perna.

## Regras de estilo (inegociáveis)

- Veias em **azul claro, traço fino, baixa opacidade** — visivelmente mais
  "leves" que o contorno preto da silhueta. Nas pranchas reais o traço normal é
  fino azul; é esse o espírito.
- **NÃO alterar as silhuetas** (contornos, poses, rótulos das células, grade,
  margens) — só ADICIONAR as veias.
- Sem rótulos de veias, sem números, sem legendas, sem setas.
- MID e MIE consistentes entre si (mesma rede, lado correspondente).
- As margens laterais continuam LIVRES (recebem anotação manuscrita no C5).

## Entrega

1. Salvar `tmp-review/referencias-cartografia/veias-8vistas-v1.png` (mesma
   resolução da base, 2048×3072).
2. Resumo (prompt usado, ressalvas) em
   `tmp-review/referencias-cartografia/resultado-c2-dex2.md`.
3. NÃO seguir para C3 (coords) — Claude revisa e o Luiz valida antes.

## Critérios de aceite

- [ ] Silhuetas idênticas à v2 aprovada (nada regenerado)
- [ ] Magna completa na M (croça→maléolo medial), orgânica, contínua
- [ ] Parva na P (JSP→maléolo lateral)
- [ ] Tributárias discretas em A e L
- [ ] Azul claro baixa opacidade, sem rótulos/números
- [ ] Margens laterais livres
