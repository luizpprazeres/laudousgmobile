# BRIEF C1 — Arte-base: 8 silhuetas de perna (cartografia venosa 4 vistas)

**Para:** Dex2 (GPT-Image)
**De:** Claude (terminal laudousgmobile-def)
**Contexto:** LaudoUSG — cartografia venosa de MMII. Hoje temos SÓ a vista anterior
(`apps/mobile/assets/venous/venoso-lineart-veias.png` + coords), com motor de
tube-recolor validado e no ar. Vamos expandir para 4 vistas × 2 membros.
Plano completo: `docs/plano-cartografia-4vistas-proximos-passos.md`.

## O que gerar (C1 = SÓ a base, sem veias ainda)

**UMA prancha única** (portrait, alta resolução, fundo branco ou transparente) com
**8 silhuetas de perna** em grade **2 linhas × 4 colunas**:

- **Linha de cima = MID** (membro inferior DIREITO)
- **Linha de baixo = MIE** (membro inferior ESQUERDO)
- **Colunas, na ordem: L (lateral) · A (anterior) · M (medial) · P (posterior)**
- Cada silhueta = membro inferior completo (da raiz da coxa/quadril ao pé), em pé.
- Rotular cada célula discretamente (texto pequeno tipo "MID — Lateral") no topo da célula.

## Estilo (decisões do Luiz — NÃO negociar)

- **D2: traço clínico SIMPLES**, como nos esquemas de laudo vascular impressos.
  **Referências reais (OBRIGATÓRIO olhar antes de gerar):**
  - `tmp-review/referencias-cartografia/prancha-4vistas-2018.jpg`
  - `tmp-review/referencias-cartografia/prancha-4vistas-2023.jpg`
  Essas 2 pranchas são EXATAMENTE o layout-alvo (grade MID/MIE × L-A-M-P) e o
  estilo-alvo de traço: contorno limpo, linha fina, SEM sombreamento, SEM dedos
  detalhados no pé, SEM músculos — silhueta de esquema médico, não ilustração
  anatômica artística. Contêm dados de paciente: uso interno como referência de
  estilo apenas, NÃO reproduzir nomes/medidas na arte gerada.
- **Margens laterais GENEROSAS em cada célula** — vai receber anotação manuscrita
  (cm/mm/profundidade) ao lado dos vasos na fase C5. As pernas devem ocupar o centro
  da célula com folga dos dois lados.
- Sem rótulos de veias, sem legendas, sem números — só as silhuetas + o rótulo da célula.
- Consistência entre as 8: mesmo estilo de traço, mesma escala, mesmo alinhamento
  vertical (joelho na mesma altura em todas as células da linha).
- As vistas L/M/P são a MESMA perna vista de lado/medial/costas — anatomia da
  silhueta deve refletir a vista (ex.: posterior mostra calcanhar/panturrilha;
  lateral mostra o perfil do pé apontando para um lado).
- MID e MIE são espelhados quando aplicável (lateral do MID aponta para um lado,
  do MIE para o outro).

## Processo

1. Gerar a prancha via GPT-Image (mesmo pipeline da arte anterior `venoso-mmii-base.png`).
2. Salvar em `tmp-review/referencias-cartografia/silhuetas-8vistas-v1.png`.
3. Escrever um resumo curto (o que gerou, prompt usado, ressalvas) em
   `tmp-review/referencias-cartografia/resultado-c1-dex2.md`.
4. NÃO seguir para C2 (rede venosa) ainda — o Luiz valida o layout da base primeiro.

## Critérios de aceite

- [ ] 8 células legíveis, grade 2×4 na ordem L/A/M/P por linha (MID em cima, MIE embaixo)
- [ ] Traço clínico simples (comparável às pranchas de referência, não à arte bege atual)
- [ ] Margens laterais amplas em cada célula
- [ ] Fundo branco/transparente, portrait, resolução alta (≥2000px no lado maior)
- [ ] Sem veias, sem rótulos anatômicos (isso é C2+)
