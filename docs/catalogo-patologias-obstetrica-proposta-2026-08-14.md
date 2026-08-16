# Proposta — recheio de patologias no catálogo OBSTETRICA

**Data:** 2026-08-14
**Status:** ⏳ **aguardando aprovação clínica do Dr. Luiz**
**Ferramenta de revisão:** `pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/catalogo-lista.manual.ts`

---

## O diagnóstico: o catálogo é quase só normalidade

Levantamento do catálogo obstétrico hoje — **23 slots, 33 variantes**:

| Slot | Variantes hoje | Patológicas |
|---|---|---|
| `placenta` | 5 | **3** ✅ *(inserção baixa · marginal · prévia — feitas em 14/08)* |
| `liquido_amniotico` | 5 | 1 *(`alterado`, genérica)* |
| `feto` · `bcf` | 2 cada | 0 — são variantes de **contexto** (inicial × padrão), não de achado |
| `fetos_resumo` · `feto_header` · `bcf_gemelar` · `ponderal` | 1 cada | 0 — variantes de **gemelaridade** |
| `movimentos_fetais` · `anatomia_cranio` · `anatomia_visceras` · `ovarios` · `vesicula_vitelina` · `saco_gestacional` · `ccn` | 1 cada | **0** |
| `dbp` · `cc` · `ca` · `cf` · `peso_fetal` | 1 cada | **0** |

> **Fora da placenta e do líquido, o catálogo não sabe descrever nenhuma anormalidade.**

### Para onde as patologias vão hoje

Escapam por `achados_adicionais → livre`, que é **texto livre do LLM** — o caminho imprevisível que o projeto vem tentando domar desde a jornada de 27/07.

E há patologias que vivem **fora do catálogo**, em mecanismos paralelos: o `GOLF_BALL_SNIPPET` (foco ecogênico intracardíaco) é um snippet próprio, ligado por flag, em vez de uma variante de `anatomia_visceras`.

> **Este é o ponto:** recheá-lo converte geração imprevisível em **seleção determinística** — a lição da VX aplicada onde mais importa. Cada patologia que entra como variante é uma patologia que sai do texto livre.

---

## Como ler esta proposta

⚠️ **A redação abaixo é PROPOSTA, não texto clínico validado.** Eu não sou médico. Cada linha precisa de uma de três marcas tuas:

- ✅ aprovada como está
- ✏️ aprovada **com a tua redação** (me dá a frase)
- ❌ não entra / não é assim

Marque também o que **falta** — a lista é um ponto de partida, não um gabarito.

---

## 1 · `bcf` — batimentos cardíacos

| # | Variante | Corpo *(proposta)* | Conclusão |
|---|---|---|---|
| 1.1 | `ausente` | "Ausência de batimentos cardíacos fetais." | "Óbito fetal." |
| 1.2 | `bradicardia` | "Batimentos cardíacos presentes, com frequência de {bcf} bpm." | "Bradicardia fetal." |
| 1.3 | `taquicardia` | idem | "Taquicardia fetal." |

> **Crítico:** ausência de BCF é o achado mais grave do exame. Hoje não existe variante — sai por texto livre. **Prioridade máxima.**
> Faixas de bradi/taquicardia precisam ser tuas (o motor pode derivar de `{bcf}`, ou tu dita a classe).

## 2 · `movimentos_fetais`

| # | Variante | Corpo | Conclusão |
|---|---|---|---|
| 2.1 | `ausentes` | "Não foram observados movimentos fetais durante o exame." | *(a definir)* |
| 2.2 | `reduzidos` | "Movimentos fetais reduzidos." | — |

## 3 · `anatomia_cranio`

| # | Variante | Corpo |
|---|---|---|
| 3.1 | `ventriculomegalia` | "Ventriculomegalia, com átrio ventricular medindo {atrio_mm} mm." |
| 3.2 | `cisto_plexo_coroide` | "Cisto de plexo coroide {lateralidade}, medindo {medida}." |
| 3.3 | `fossa_posterior` | *(redação tua)* |
| 3.4 | `cavum_ausente` | *(redação tua)* |

> Ventriculomegalia tem **medida** e limiar clínico (≥10 mm). Candidata a slot com valor + classe, como o líquido.

## 4 · `anatomia_visceras`

| # | Variante | Corpo |
|---|---|---|
| 4.1 | `golf_ball` | **já existe fora do catálogo** — trazer para cá |
| 4.2 | `pielectasia` | "Pielectasia {lateralidade}, com pelve renal medindo {mm} mm." |
| 4.3 | `estomago_nao_visualizado` | *(redação tua)* |
| 4.4 | `bexiga_nao_visualizada` | *(redação tua)* |
| 4.5 | `intestino_hiperecogenico` | *(redação tua)* |
| 4.6 | `ascite` / `derrame_pleural` | *(redação tua)* |

> **A pielectasia é o teu próprio exemplo** — *"Pelve renal direita mede 3 mm e a esquerda mede 4 mm"* foi o comando que tu usou para testar a VX. É bilateral com medida por lado → precisa de **cardinalidade**, como as placentas gemelares.

## 5 · Biometria — `dbp` `cc` `ca` `cf` `peso_fetal`

| # | Variante | Conclusão |
|---|---|---|
| 5.1 | `pig` / `cir` | "Feto pequeno para a idade gestacional (percentil {percentil})." |
| 5.2 | `gig` | "Feto grande para a idade gestacional (percentil {percentil})." |
| 5.3 | `discrepancia_ig` | "Biometria discordante da idade gestacional de referência." |

> O `{percentil}` **já é calculado** pelo sistema. A variante é seleção por faixa — determinística, sem LLM.
> **CIR × PIG são coisas diferentes** e a distinção é clínica (CIR exige Doppler). Precisa da tua regra.

## 6 · `liquido_amniotico` — especializar o `alterado`

Hoje há uma variante genérica `alterado` que ecoa `{liquido_classe}`. Proposta: separar em `oligoamnio` e `polidramnio`, com a conclusão própria de cada — mesmo padrão da placenta.

> Cuidado registrado: `amnioticFluidGuard.ts` existe porque confundir MBV com ILA gerava **falso oligoâmnio**. Qualquer variante aqui precisa passar por ele.

## 7 · `placenta` — completar

| # | Variante | Observação |
|---|---|---|
| 7.1 | `descolamento` / `hematoma_retroplacentario` | achado agudo, alta gravidade |
| 7.2 | `suspeita_acretismo` | conduta específica |
| 7.3 | `lagos_venosos` | achado benigno frequente |

## 8 · `cordao_umbilical` — **SLOT NÃO EXISTE**

Artéria umbilical única é achado frequente e com implicação clínica. Hoje **não há slot de cordão** no catálogo obstétrico.

| # | Variante |
|---|---|
| 8.1 | `normal` — "Cordão umbilical com três vasos." |
| 8.2 | `arteria_unica` — "Cordão umbilical com dois vasos (artéria umbilical única)." |

> **Slot novo.** Entra na ordem entre placenta e líquido? Decisão tua.

## 9 · `ovarios` · `vesicula_vitelina` · `saco_gestacional`

| Slot | Variantes candidatas |
|---|---|
| `ovarios` | cisto simples · endometrioma · cisto de corpo lúteo |
| `vesicula_vitelina` | aumentada · calcificada · não visualizada |
| `saco_gestacional` | irregular · descolamento subcoriônico · gestação anembrionada |

---

## Impacto

| | Hoje | Com a proposta |
|---|---|---|
| Slots | 23 | 24 *(+cordão)* |
| Variantes | 33 | **~70** |
| Patológicas | 4 | **~40** |

Aproximadamente **dobra o catálogo** — e tira cerca de 40 achados do texto livre.

---

## Ordem sugerida

1. **`bcf` ausente** — é óbito fetal saindo por texto livre. Sozinho justifica a frente.
2. **Biometria PIG/GIG** — volume alto, percentil já calculado, risco baixo
3. **`cordao_umbilical`** — slot novo, simples, achado frequente
4. **`anatomia_visceras`** — traz o golf ball para dentro e resolve a pielectasia
5. **`liquido`** — especializar oligo/poli
6. **`anatomia_cranio`** — o mais complexo (medidas + limiares)
7. Demais

Cada variante entra com **exemplo renderizado** (`variante.exemplo`), então aparece na lista de revisão e na Biblioteca desde o primeiro dia.

---

## Método, para as outras categorias

O mesmo roteiro vale para PELVE_FEMININA e as demais:

1. Rodar `catalogo-lista.manual.ts` → ver o que existe
2. Listar as patologias que hoje escapam por texto livre
3. Propor variantes → **tu aprova a redação**
4. Implementar com `exemplo`, e o teste de equivalência garante que nada de normal mudou
