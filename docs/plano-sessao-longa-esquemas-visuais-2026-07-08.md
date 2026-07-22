# Plano — Sessão longa autônoma: esquemas visuais + cartografia + revisão de laudos (2026-07-08)

> Sessão de ~2-3h com o Luiz acompanhando pelo celular. Eu tomo **todas as decisões que puder** sozinho, consulto o Dex para arte/imagem, chego a conclusões com ele, registro tudo e só escalo o estritamente necessário. Este doc é o mapa vivo — vou marcando progresso.

## Princípio operacional (autonomia)
- Decido sozinho: estilo visual, thresholds de detecção, estrutura de dados, prompts de imagem, coordenadas, composição, arquitetura de código.
- Consulto o Dex para: gerar/traçar imagens (a parte visual), pareceres.
- **Regras invioláveis:** toda mudança de produto/produção fica atrás de **flag OFF** por padrão; texto do laudo continua soberano; nunca SQL direto em `auth.users`; commits atômicos e **sem push** (push é do @devops); não ligar flag em produção sem o Luiz.
- Escalo ao Luiz só: critérios clínicos de asseveração (grau/estenose/FIGO), decisões de produto (onde aparece no app, cobrança), e qualquer ativação em produção.

---

## Track A — Cartografia venosa: completar

### A0 — Estudo: variações anatômicas venosas MMII (representar quando ditado) ⏳
Cobrir para o motor saber desenhar quando o achado aparecer:
- Duplicação de safena magna / veia femoral / poplítea.
- Safena acessória anterior e posterior da coxa.
- Veia de Giacomini (comunica parva↔magna).
- Aplasia/hipoplasia de segmento (safena magna segmentar).
- Terminação alta/baixa da safena parva; variação da JSP.
- Perfurantes nomeadas por topografia: **Hunter/Dodd** (coxa), **Boyd** (joelho), **Cockett/paratibiais** (perna), **de Maio/gastrocnêmias** (panturrilha posterior).

### A1 — Perfurantes no desenho
Conectores curtos superficial↔profundo + glifo (círculo aberto = perfurante de reentrada; preenchido = refluxante — vocabulário do print 1 do OneVASC). Perfurante é curta ⇒ conector reto curto é aceitável; posição por topografia.

### A2 — Safena parva (vista posterior)
Parva é posterior; a base atual é anterior. **Decisão:** gerar uma **prancha POSTERIOR** das pernas (Dex/GPT-Image) para o mapa completo do MEDIDAS. No anterior, parva entra como projeção tracejada.

### A3 — Duas categorias (implementar TVP-only primeiro)
1. **DOPPLER_VENOSO_MMII — pesquisa de TVP (SÓ trombose). IMPLEMENTAR PRIMEIRO.**
   Mapa foca sistema profundo + patência; realce vinho onde há trombo; legenda mínima (pérvio · TVP oclusiva · parcial · recanalizada). Menos informação, mais limpo.
2. **DOPPLER_VENOSO_MMII_MEDIDAS — completo.** Refluxo (safenas/junções/perfurantes) + calibres + varizes + variações. Legenda rica.

### A4 — Paridade visual com "esquemas visuais" do iOS + fluxo
Estudar `VenousCartographyView`/`VenousSegmentCatalog` (Swift) e casar a identidade. Fluxo alvo (iOS): gerar laudo → edição/símbolos → "esquema visual" → enviar p/ **sala do auxiliar** → renderiza lá. Depois portar Android.

---

## Track B — BUG: esquemas visuais não filtrados por categoria (sala do auxiliar)
**Sintoma (Luiz):** na sala do auxiliar, a seção de esquemas visuais mostra esquemas de OUTRAS categorias. Ex.: mama exibe esquema de mama **e** de útero; tireoide exibe tireoide **e** útero; o esquema dos **miomas aparece em todos** os exames.
**Hipótese:** listagem não filtra por `category_code` (mostra todos os esquemas disponíveis).
**Ação:** localizar a fonte dos esquemas e a listagem na sala (`apps/api/src/app/sala/[token]` + registro de esquemas), achar a causa-raiz, propor/implementar o filtro por categoria (seguro, testado). — investigação em background.

---

## Track C — Esquema visual dos miomas (FIGO) — mesma lógica da cartografia
A lógica que funcionou (arte generativa + composição/recolor por cima) se aplica igual.
### C1 — Base do útero minimalista (linhas finas, nossa identidade), SEM miomas — Dex/GPT-Image.
### C2 — Uma imagem por tipo FIGO (0-8), cada mioma como overlay posicionável:
- 0 submucoso pediculado intracavitário · 1 submucoso <50% intramural · 2 ≥50% intramural
- 3 100% intramural em contato com endométrio · 4 intramural
- 5 subseroso ≥50% intramural · 6 subseroso <50% · 7 subseroso pediculado
- 8 outro (cervical/parasitário)
### C3 — Motor de composição: sobrepõe os miomas ditados sobre a base do útero conforme o caso (ex.: intramural FIGO 4 + subseroso FIGO 6), igual à composição da cartografia.
### C4 — Integração na categoria de útero/pelve (esquema visual do útero com miomas).

> Depende de C-Track do bug B (filtro por categoria) para o esquema aparecer só onde deve.

---

## Track D — Revisão dos laudos da última semana + HTML de melhorias
- Extrair laudos dos últimos 7 dias (Supabase): `generated_output` (saída real da IA, pós-guards) vs `final_output` (correção manual do médico).
- Classificar **padrões de correção** (o que o médico muda com frequência) → mapear para melhorias no engine/writers/guards/snippets.
- Entregar **HTML priorizado** de sugestões (defeito → evidência → proposta → esforço).
- Semântica das colunas: ver memória `boletim-semantica-colunas` (generated = IA certa/errada; final = correção do médico).

---

## Ordem de execução e paralelismo
| Frente | Depende de | Como |
|---|---|---|
| B (bug filtro) | — | **background agent** (investigação) |
| D (revisão laudos) | acesso Supabase | **background agent** (extração + análise) |
| C1/C2 (arte útero+miomas) | Dex/GPT-Image | **delegar Dex** cedo |
| A2 (prancha posterior) | Dex/GPT-Image | **delegar Dex** cedo |
| A0 (estudo variações) | — | eu, em paralelo |
| A3 (TVP-only) | base atual (pronta) | eu, sem bloqueio |
| A1 (perfurantes) | coords/arte | eu + Dex |
| C3 (composição miomas) | C1/C2 | eu, quando arte chegar |

## Registro de decisões (append-only)
- 2026-07-08: cartografia venosa = arte GPT-Image + recolor por tubo (VALIDADO pelo Luiz). Não desenhar SVG anatômico do zero.
- 2026-07-08: TVP-only antes do MEDIDAS. Prancha posterior para safena parva. Miomas seguem a mesma lógica (base + overlays FIGO compostos).
- 2026-07-08: miomas = útero (arte GPT-Image) + miomas paramétricos SVG por FIGO (não gerar 9 imagens; o mioma é forma simples, vetor dá controle total de tamanho/posição/composição).

## Progresso da sessão (append-only)
- ✅ **A0** estudo de variações anatômicas → `docs/estudo-variacoes-anatomicas-venosas-2026-07-08.md`.
- ✅ **A1/A3** cartografia v4: modos TVP-only vs completo + perfurantes (glifo refluxante). Artifact `cd69ca1b`. (`tmp-review/cartografia-venosa-prototipo.html`)
- ⏳ **A2** prancha posterior gerada (`tmp-review/venoso-mmii-posterior.png`); Dex2 traçando safena parva → integrar depois.
- ✅ **B** bug esquemas visuais: causa-raiz achada (sala lista por user_id, sem filtro de categoria) + fix aplicado, testado (tsc 0) e commitado em branch `fix/sala-schemas-category-filter` (SEM push). Só filtro client-side (Option A). Descoberta: esquemas visuais já existem no iOS (MyomaSchemaExporter/BreastSchemaSheet/ThyroidSchemaSheet) via `/api/sala/push-schema`.
- ✅ **C1-C3** esquema de miomas: útero base (`tmp-review/utero-base.png`) + motor de composição FIGO. Artifact `09f3656e`. (`tmp-review/miomas-prototipo.html`)
- ✅ **D** revisão dos laudos (132 laudos, 68 corrigidos, 12 padrões) → HTML artifact `34a3d95e`. Insight: eixo obstétrico = 81% do retrabalho; renderers determinísticos ~0%.
- ⏳ **D+** agente localizando diffs exatos dos 4 quick-wins ([REVISAR], DUM:, medidas, numeração) p/ virar correções em branch.
- ⬜ **A4** paridade com esquemas visuais do iOS + fluxo sala (pendente).
- ⬜ **C4** integrar miomas na categoria + reconciliar com iOS (pendente).
- ⬜ Backend: fundação schema venoso estruturado (fase 2 plano-motor) — grande, para depois.
- ✅ **D-quickwins** medidas cm/mm + join "x" e remoção de linha DUM inválida → branch `fix/laudo-quick-wins` (utils testados 20/20, tsc 0, sem push). Ver [[melhorias-laudos-rulings-0708]].
- ✅ **A2** vista posterior (safena parva) publicada, artifact `2f1b8343`.

## Rulings do Luiz sobre os laudos (08/07) — ver memória `melhorias-laudos-rulings-0708`
- [REVISAR] MANTÉM; só troca (não apaga) após validar highlights (amarelo=revisar, roxo=placeholder) OU correção sugerida (aprovar/descartar).
- Aprovados p/ implementar: garble ASR (dicionário canônico), técnica transvaginal (gatilhos via), placenta (não dropar), placeholder (manter).
- Épico IG: frase 1ª US determinística + de-dup (writer confunde comando c/ ditado); rotular "DUM/US precoce" na extração.
- Biometria ÷10: bug clínico de parsing — investigando p/ fix em branch.
- Esquemas visuais (venoso+miomas): aprovados ("incríveis, seguir nessa linha").
- **Print-friendly (ajuste fino de cores 08/07):** cartografias MANTÊM cores; esquemas visuais (miomas/tireoide/mama) o mais **branco/preto** possível (economia de tinta em impressoras ruins). Miomas: útero line-art branco + contorno rosa (nova base `utero-base-bw.png`) + mioma preto (contorno). Tireoide: nova base `tireoide-base.png` + protótipo TI-RADS. Artifacts: miomas `09f3656e` (atualizado), tireoide `8e22fad3` (novo 🦋). Mesma lógica (base gerada + composição) — a imagem antiga da tireoide não era boa; nova é line-art de qualidade.

## Conjunto de esquemas visuais (print-friendly) — COMPLETO 08/07
Todos com a mesma lógica (arte GPT-Image via Dex + composição vetorial dirigida pelo laudo estruturado; voz→estrutura→esquema):
- **Miomas** (útero line-art branco + mioma preto por FIGO) — artifact `09f3656e`, `tmp-review/miomas-prototipo.html` + `utero-base-bw.png`.
- **Tireoide** (line-art + nódulos por lobo, TI-RADS) — artifact `8e22fad3`, `tmp-review/tireoide-prototipo.html` + `tireoide-base.png`.
- **Mama** (mamas line-art + nódulos por relógio/distância do mamilo, BI-RADS) — artifact `d4ff3825`, `tmp-review/mama-prototipo.html` + `mama-base.png`.
- **Cartografia venosa** anterior `cd69ca1b` + posterior `2f1b8343` (mantêm cores por decisão do Luiz).
Próximo p/ TODOS: (a) validar posições com Luiz; (b) schema estruturado no backend (extração → objeto por-lesão); (c) reconciliar com iOS (MyomaSchemaExporter/BreastSchemaSheet/ThyroidSchemaSheet); (d) fluxo edição→"esquema visual"→sala (o bug do filtro já corrigido no branch).

## Biometria ÷10 — CONCLUSÃO (agente 08/07)
- **O fix JÁ EXISTE no `main`**, atrás da flag `OBST_BIOMETRIA_DET` (default OFF) — `biometriaFetal.ts` (`mergeBiometriaEstruturada` + `reconcileBiometriaUnidade`), lido em `renderer.ts:463` de main. (feat/android-parity está atrás do main.)
- **AÇÃO (decisão do Luiz — env de produção, não faço sozinho):** ligar `OBST_BIOMETRIA_DET=true` no Vercel de `apps/api` + redeploy. Cobre: bloco da calculadora ecoado sem ×10, e voz com "cm" explícito.
- **Gaps residuais (fix próprio, independentes da flag):** (1) voz com número cru em cm sem unidade falada ("cefálica de 22,9") — CC/CA não corrigidos; (2) garble "7,1 x 3,65 x 0" (dimensão de estrutura em MORFOLOGICO, parsing de tripla medida) — não é biometria fetal.
