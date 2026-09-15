# Peso fetal estimado (Hadlock) e percentis (Hadlock 1991 / INTERGROWTH-21st): fontes primárias

Data: 2026-09-14 · Autor: Claude Opus 5 (pesquisa) · Escopo: só documentação. Nenhum código ou fórmula foi alterado.

## Legenda de evidência

- **LIDO-PDF**: li o texto integral do artigo, em PDF digitalizado (páginas renderizadas como imagem).
- **LIDO-HTML**: li o texto integral no PMC, por meio de um extrator automático. Os trechos citados vieram do extrator, e os números foram conferidos com o exemplo impresso no próprio artigo (ver testes).
- **SÓ-METADADOS**: consegui apenas citação e resumo, via Europe PMC.
- **NÃO ACESSADO**: 403, captcha ou binário que não consegui decodificar.

Sites de calculadoras (perinatology.com, entre outros) apareceram nas buscas e **não** foram usados.

---

## 1. Peso fetal estimado: Hadlock 4 medidas (DBP, CC, CA, CF)

### Publicação primária

Hadlock FP, Harrist RB, Sharman RS, Deter RL, Park SK. *Estimation of fetal weight with the use of head, body, and femur measurements — a prospective study.* Am J Obstet Gynecol 1985;151(3):333-337. PMID 3881966. DOI 10.1016/0002-9378(85)90298-4.

- Cópia lida (**LIDO-PDF**): https://obgyn.utoronto.ca/sites/default/files/Hadlock%20Model%20for%20EFW%20AC-FL-HC%20-%20AJOG%201985.pdf
- Página do editor (403, **NÃO ACESSADO**): https://www.ajog.org/article/0002-9378(85)90298-4/abstract

### Equação (Tabela II, p. 334; modelos em população combinada, n = 276)

```
log10(peso) = 1.3596 − 0.00386·CA·CF + 0.0064·CC + 0.00061·DBP·CA + 0.0424·CA + 0.174·CF
```

| Item | Valor | Onde |
|---|---|---|
| Logaritmo | base 10 ("Log10 weight") | Tabela II |
| Unidades | medidas em **cm**, peso em **g** | Rodapé da Tabela I: "Fetal measurements in cm; fetal weight in gm". A Tabela II só define as abreviações; assumo cm por ser o mesmo artigo e o mesmo modelo. |
| Erro (1 DP) | 7,4% no modelo 2 (n = 276); 7,5% no modelo 1 (n = 167) | Tabela III |
| Viés (validação prospectiva, n = 109, 4 medidas, modelo 1) | −0,7 ± 7,3% | Tabela I |
| População | 109 pacientes "predominately middle class Caucasian", examinadas até 1 semana antes do parto (a maioria em até 3 dias); incluiu fetos pré-termo, a termo, pós-termo, com restrição de crescimento e macrossômicos | Métodos |
| Faixa de peso validada | estratos de <1500 g a >4000 g | Tabela I |

Outras equações da mesma Tabela II, mesma notação:

- **CC-CA-CF:** `1.326 − 0.00326·CA·CF + 0.0107·CC + 0.0438·CA + 0.158·CF`. É a que os autores recomendam para uso geral (p. 337).
- **CA-CF:** `1.304 + 0.05281·CA + 0.1938·CF − 0.004·CA·CF`.
- **DBP-CA-CF:** `1.335 − 0.0034·CA·CF + 0.0316·DBP + 0.0457·CA + 0.1623·CF`. No PDF, o fim desta linha está parcialmente coberto por uma marcação; confirmar antes de usar.

### Lacunas

- **Domínio de IG:** o artigo não informa. A validação é por peso ao nascer, com exames perto do parto. A Fig. 1 mostra estimativas entre 12 e 42 semanas, mas isso não valida a acurácia fora da janela perinatal.
- **Estudo de derivação** (Hadlock et al., Radiology 1984;150:535-540, PMID 6691115, DOI 10.1148/radiology.150.2.6691115): **SÓ-METADADOS**. Não li os métodos, os coeficientes do modelo 1 nem o domínio.
- **Artigo de 1985:** não traz exemplo numérico que use as equações da Tabela II. O caso de microcefalia (p. 335-337) usa o modelo original de 1984 e não serve como oráculo.
- **Recomendação dos autores:** para o uso geral, recomendam o modelo CC-CA-CF, e não o de 4 medidas.

---

## 2. Curva de peso por IG: Hadlock 1991

Hadlock FP, Harrist RB, Martinez-Poyer J. *In utero analysis of fetal growth: a sonographic weight standard.* Radiology 1991;181(1):129-133. DOI 10.1148/radiology.181.1.1887021.

- Cópia lida (**LIDO-PDF**): https://obgyn.utoronto.ca/sites/default/files/Hadlock%20Growth%20Chart-Radiology-1991.pdf
- Página do editor (403, **NÃO ACESSADO**): https://pubs.rsna.org/doi/10.1148/radiology.181.1.1887021

### Especificação

| Item | Valor (p. 130-131) |
|---|---|
| Modelo da mediana | `ln(peso_g) = 0.578 + 0.332·IG − 0.00354·IG²`, com IG = idade menstrual em semanas ("natural log model"; DP da regressão = 0,12; R² = 99,1%) |
| Dispersão | "uniform variance of ±12.7% (1 standard deviation)", expressa como percentual do peso previsto |
| Peso usado | modelo de Hadlock com DBP, CC, CA e CF (ref. 17 = AJOG 1985) |
| IG | uma medida por feto; IG pela DUM, codificada em décimos de semana (39s3d = 39,4); DUM corroborada no 1º trimestre |
| Domínio | valores previstos de 10 a 41 semanas; **Tabela 1 publicada de 10 a 40 semanas** |
| Sexo | não específica por sexo |
| Amostra | 392 gestantes "predominantly middle-class white" |
| Uso recomendado | p3 e p97 como limites; não usar sem IG confirmada por US precoce (p. 133) |

### Tabela 1 (g), trechos transcritos do PDF

| Sem | p3 | p10 | p50 | p90 | p97 |
|---|---|---|---|---|---|
| 20 | 248 | 275 | 331 | 387 | 414 |
| 24 | 503 | 556 | 670 | 784 | 838 |
| 28 | 908 | 1004 | 1210 | 1416 | 1513 |
| 30 | 1169 | 1294 | 1559 | 1824 | 1949 |
| 32 | 1465 | 1621 | 1953 | 2285 | 2441 |
| 36 | 2110 | 2335 | 2813 | 3291 | 3516 |
| 40 | 2714 | 3004 | 3619 | 4234 | 4524 |

As semanas de 10 a 40 estão todas no PDF. Transcrever a tabela inteira com dupla conferência.

### Inconsistência interna (cálculo meu)

A equação reproduz o p50 da tabela: 20 semanas dá 331 g, 30 dá 1559 g e 40 dá 3619 g.

Já os percentis da tabela são simétricos e lineares, com DP de cerca de **13,3%**, e não 12,7%. Exemplo em 30 semanas: (1559 − 1294)/1559/1,2816 ≈ 0,133.

- Se a implementação calcular pela equação com 12,7%, os percentis **não coincidem** com a Tabela 1.
- É preciso decidir qual das duas é a referência.
- Achado compatível com BJOG 2026, DOI 10.1111/1471-0528.70296 (PMID 42381153, **SÓ-METADADOS**): "Systematic disparity exists between the published chart- and equation-derived centiles…".

---

## 3. INTERGROWTH-21st

### 3a. Padrão de EFW de 2017 (fórmula própria, CA + CC)

Stirnemann J, Villar J, Salomon LJ, et al. *International estimated fetal weight standards of the INTERGROWTH-21st Project.* Ultrasound Obstet Gynecol 2017;49(4):478-486. PMID 27804212. DOI 10.1002/uog.17347.

- **LIDO-HTML**: https://pmc.ncbi.nlm.nih.gov/articles/PMC5516164/

| Item | Valor |
|---|---|
| Fórmula de EFW | `ln(EFW) = 5.084820 − 54.06633·(CA/100)³ − 95.80076·(CA/100)³·ln(CA/100) + 3.136370·(CC/100)` |
| Unidades | "EFW is expressed in g, AC and HC in cm, and the log function designates the natural logarithm" |
| Medidas | só CA e CC. O CF não melhorou a predição. |
| Acurácia | erro absoluto médio de 7,6%; 80%, 90% e 95% das estimativas dentro de 11%, 14% e 18% do peso ao nascer (nascidos até 1 dia após o último exame) |
| Distribuição | Box-Cox de 3 parâmetros (LMS) aplicada a **Y = ln(EFW)** |
| λ(IG) | `−4.257629 − 2162.234·IG⁻² + 0.0002301829·IG³` |
| μ(IG) | `4.956737 + 0.0005019687·IG³ − 0.0001227065·IG³·ln(IG)` |
| σ(IG) | `10⁻⁴·(−6.997171 + 0.057559·IG³ − 0.01493946·IG³·ln(IG))` |
| Escore Z | `Z = [(Y/μ)^λ − 1] / (σ·λ)` quando λ ≠ 0 |
| Centil | `C_p = exp(μ·(1 + λ·σ·z_p)^(1/λ))` (inversão do escore Z) |
| IG | "exact weeks" (semanas + dias/7) |
| Domínio | **22 a 40 semanas** |
| Sexo | sem padrão por sexo |
| Datação | DUM confirmada por CCN (FGLS) ou só CCN (FS) |
| Amostra | FGLS, n = 4231, para os padrões; n = 2404 para avaliar a fórmula |

**Table S1** (centis 3/10/50/90/97 por semana): **NÃO ACESSADO**. O PMC exigiu captcha e o Europe PMC retornou 403.

- O repo tem uma tabela rotulada `intergrowth21st-2016-stirnemann` em `apps/mobile/src/shared/calculators/hadlock.ts:153`.
- O p3, p10 e p90 dessa tabela em 30 semanas batem (±2 g) com meu cálculo manual pelas equações LMS.
- Não conferi as outras semanas.

### 3b. Atualização de 2020 (curvas INTERGROWTH para Hadlock CC-CA-CF)

Stirnemann J, Salomon LJ, Papageorghiou AT. *INTERGROWTH-21st standards for Hadlock's estimation of fetal weight.* Ultrasound Obstet Gynecol 2020;56(6):946-948 (Letter). PMID 32086966. DOI 10.1002/uog.22000.

- Artigo: **NÃO ACESSADO** (Wiley 403).
- Página oficial (https://www.intergrowth21.com/tools-resources/fetal-growth), lida por extrator: diz que as curvas "were updated in 2020 to use the Hadlock formula with three parameters, abdominal circumference, head circumference, and femur length" e são as recomendadas. O extrator deu a faixa ora como 14+0 a 41+0, ora como 14+0 a 40+0: **não confirmado**.
- Documento de equações (https://intergrowth21.com/sites/default/files/2024-09/uog22000-sup-0001-tables1_1.docx) e script R (https://intergrowth21.com/sites/default/files/2023-02/estimated_fetal_weight_r_script_code.docx): baixei, mas **não consegui decodificar** (binário). **Coeficientes de 2020 desconhecidos.**

---

## 4. Testes numéricos rastreáveis

Os valores "esperados" vêm impressos nas fontes. Os "reproduzidos" são cálculo manual meu; nenhum código foi executado.

| # | Fonte | Entrada | Esperado (impresso) | Reproduzido |
|---|---|---|---|---|
| T1 | IG-21st 2017, texto | CA 26 cm, CC 29 cm | ln EFW = 7.312292; EFW = 1499 g | 7.31228; 1499 g |
| T2 | IG-21st 2017, texto | IG = 30,0 semanas, p3 | ln = 7.008552; 1106 g | 7.0083; ≈1106 g |
| T3 | Hadlock 1991, Tab. 1 | IG 20 / 30 / 40, p50 | 331 / 1559 / 3619 g | equação: 331 / 1559 / 3619 g |
| T4 | Hadlock 1991, Tab. 1 | IG 30, p10 / p90 | 1294 / 1824 g | com DP de 12,7%: ≈1305 / ≈1813. **Diverge** (ver §2). |
| T5 | Hadlock 1985, Tab. II (sem exemplo impresso) | DBP 5,7; CC 21,3; CA 28,5; CF 7,5 cm | — | log10 = 3.28334, ≈1920 g. Só teste de regressão; não é oráculo independente. |

**Não existe teste independente publicado para Hadlock 4 medidas.** Recomendação:

- obter o artigo de 1984; ou
- validar contra um software de ultrassom certificado, citando manual e versão, sem usar calculadora web.

---

## 5. Divergências observadas no código atual (só leitura, não alterado)

Arquivo: `apps/mobile/src/shared/calculators/hadlock.ts`.

1. **Coeficientes de Hadlock 4** (`:353-359`): coincidem com a Tabela II de 1985.
2. **Fórmula incompatível com a curva.** O percentil padrão é o INTERGROWTH 2017, mas o peso vem de Hadlock 4. O padrão de 2017 foi construído com a fórmula própria (CA + CC), e o de 2020 com Hadlock **3** (CC-CA-CF), nunca com Hadlock 4.
3. **A tabela "Hadlock 1991" do repo** (`:189-209`, "gardosi-mikolajczyk-2011") **não é** a Tabela 1 primária. Em 30 semanas, p10 e p50 são 1327 e 1546 no repo, contra 1294 e 1559 no artigo. Em 40 semanas, o p50 é 3464 contra 3619.
4. **Cálculo do percentil** (`percentileForBand`, `:123`): usa uma normal simétrica com σ = (p90 − p10)/2,5631, em gramas. Isso não reproduz o LMS assimétrico do INTERGROWTH nem o DP de 12,7% de Hadlock 1991.
5. **Margem de ±15%** (`:363`): não aparece nas fontes lidas, que dão 1 DP ≈ 7,3–7,5%.
6. **`normalizeCm`** (`:310`): a heurística ">20 ⇒ mm" converte errado CA e CC informados em cm acima de 20 cm, e CF abaixo de 20 mm. Não testei em execução.

## 6. Conclusão

**Há especificação suficiente e rastreável para:**

- Hadlock 1985 com 4 medidas: equação, unidades e erro. Falta o domínio de IG.
- Hadlock 1991: equação e tabela, com a inconsistência entre as duas a resolver.
- INTERGROWTH 2017: fórmula e LMS completos, de 22 a 40 semanas, sem sexo.

**Não há especificação suficiente para:**

- o INTERGROWTH 2020 (Hadlock 3), que é a versão hoje recomendada pelo projeto: coeficientes não lidos;
- a Table S1 de 2017;
- os métodos de Hadlock 1984.

Nenhuma das três curvas é específica por sexo.
