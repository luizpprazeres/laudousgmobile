# Evidência documental: registro de qualidade da avaliação multiparamétrica e elastografia hepática

Data: 02/10/2026
Status: **documento de evidência para revisão médica. Nada aqui foi aprovado nem ativado.** Nenhum código, contrato, registro, categoria ou teste foi alterado. Não foram usados dados de pacientes nem material do concorrente.

> **Decisão desta revisão:** `APPROVED_HEPATIC_QUALITY_CRITERIA` **permanece vazio**. O registro ainda não pode ser preenchido, nem com as entradas que têm evidência suficiente, até que os pré-requisitos bloqueantes P1–P9 (seção 5.1) estejam resolvidos.

Base lida:
- [`docs/stories/2026-10-02-hepatic-contract.md`](../stories/2026-10-02-hepatic-contract.md).
- `packages/shared/src/hepatic/contracts.ts` (`hepatic-assessment/v1`).
- `apps/api/src/server/hepaticReports/qualityRegistry.ts`, no estado de `HEAD` 529337d.

## 1. Regras desta pesquisa

- **Fontes aceitas:**
  - diretrizes e documentos oficiais de sociedades (WFUMB, EASL, QIBA/RSNA, Baveno);
  - documentos oficiais publicados pelo próprio fabricante: páginas, quick cards e white papers;
  - 510(k) do FDA, com data de decisão conferida no openFDA.
- **Excluídos:** distribuidores, blogs, notícias e artigos não publicados pelo fabricante. Também foram excluídas as afirmações que eu não consegui reconferir no texto da fonte.
- **O que não foi feito:** conversão entre aparelhos, unidades ou métodos, e extrapolação de limiar de um método para outro.
- **Sem texto completo acessível:** SRU 2020 (Barr et al., Radiology 2020;296:263–274), EFSUMB 2017 e AASLD 2025 (avaliação não invasiva por imagem). Nenhum critério técnico é atribuído a essas três fontes aqui.
- **Manuais de operador (IFU):** nenhum manual completo estava acessível publicamente, de nenhum fabricante.

## 2. Três camadas que o registro precisa separar

| Camada | O que é | Entra no registro de qualidade? |
|---|---|---|
| **A. Critério técnico de qualidade** | Aceitação do conjunto de aquisições: número de medidas, dispersão, índice de confiabilidade do aparelho | **Sim** |
| **B. Unidade e faixa física** | Unidade nativa e domínio de medida do aparelho | Só como validação de dado de entrada |
| **C. Intervalo clínico** | Cortes de fibrose, esteatose ou cACLD | **Não.** Exige registro clínico próprio, por método, aparelho e etiologia |

Passar na camada A não diz nada sobre a camada C. Um limiar da camada A também não se transfere de um aparelho para outro.

## 3. Evidência de sociedades

### 3.1 WFUMB 2024, Parte 1 (rigidez), Tabela 1

Ferraioli G et al. Ultrasound Med Biol 2024;50(8):1071–1087, doi:10.1016/j.ultrasmedbio.2024.03.013. Texto integral (versão publicada, cópia institucional SDU). A Tabela 1 é um protocolo recomendado **sem grau de evidência**.

Itens técnicos:
- Jejum de 4 h e repouso de pelo menos 10 min.
- Supino ou leve decúbito lateral esquerdo (até 30°), braço direito em abdução máxima, abordagem intercostal.
- pSWE: medida a 15–20 mm abaixo da cápsula.
- 2D-SWE: ROI de pelo menos 10 mm, caixa de medida a 15–20 mm abaixo da cápsula.
- Apneia em respiração neutra; imagens independentes, no mesmo local.
- 2D-SWE, por aquisição: coeficiente de variação "<0.25 for stiffness values between 8.8 and 11.9 kPa and <0.10 for stiffness ≥12.0 kPa".
- Número de aquisições: TE, 10; pSWE, 5–10; 2D-SWE, 3–5.
- Resultado expresso pela mediana, junto com o IQR/M.
- IQR/M "≤30%" em kPa e "≤15%" em m/s.

O texto também diz que cortes "cannot be interchangeably used between US systems", que o seguimento deve usar o mesmo sistema e que o laudo deve identificar o aparelho.

### 3.2 WFUMB 2024, Parte 2 (gordura), Tabela 5

Ferraioli G et al. Ultrasound Med Biol 2024;50(8):1088–1098, doi:10.1016/j.ultrasmedbio.2024.03.014. Texto integral. As recomendações "were not formally graded".

A tabela vale **somente para o coeficiente de atenuação**:
- Jejum não obrigatório se a medida for feita isoladamente. Na abordagem multiparamétrica, o paciente fica em jejum e prevalece o protocolo de rigidez.
- Apneia, espaço intercostal direito.
- Caixa com 3 cm de comprimento, borda superior a 2 cm abaixo da cápsula.
- "IQR/M ≤ 15%".
- "Median (or mean) value of three to five acquisitions".
- "follow the manufacturer quality criterion when available".

Sobre o IQR do CAP, o mesmo texto registra propostas conflitantes (30% da mediana, 40 dB/m, <30 dB/m) e diz que a abordagem "was not validated".

### 3.3 QIBA/RSNA: perfil de Shear Wave Speed

"Clinically Feasible Profile", 15/01/2024, Stage 3, doi:10.1148/QIBA/20240115. Texto integral.

Requisitos com "Shall":
- Jejum de pelo menos 4 h; se não houver jejum, isso deve ser comunicado ao radiologista.
- ROI no tamanho padrão do fabricante, com o centro a 2 cm abaixo da cápsula e a menos de 7,0 cm do transdutor.
- Número de medidas independentes especificado pelo fabricante (Apêndice D) ou, se não especificado, 10.
- Mais de 50% de preenchimento de cor.
- Medidas seriadas, sempre que possível, no mesmo sistema ou no mesmo fabricante.

O texto "IQR/median ≤ 0.30 if in kPa, or < 0.15 if in m/s" aparece como critério de qualificação do operador, não como aceitação formal de cada exame. O **Apêndice D** traz instruções escritas por cada fabricante e é a principal fonte de fabricante usada na seção 4.

### 3.4 EASL e Baveno

- **EASL-ALEH 2015** (doi:10.1016/j.jhep.2015.04.006), texto integral. A TE é válida com:
  - "a number of valid shots of at least 10";
  - "a success rate … above 60%";
  - IQR <30% da mediana.

  Para pSWE e 2D-SWE, os critérios de qualidade estão "not well defined".
- **EASL 2021** (doi:10.1016/j.jhep.2021.05.025), texto integral:
  - "a minimum of 3 hours fasting is required";
  - CAP: "Quality criteria have been proposed (CAP IQR <30 or 40 dB/m) but not externally validated".
- **Baveno VII:** não traz critério de qualidade técnica. A recomendação de repetir em jejum uma LSM ≥10 kPa é conduta clínica.

## 4. Evidência de fabricantes

Siglas usadas nas tabelas:
- **QIBA-D.n** = Apêndice D do perfil QIBA 2024, texto fornecido pelo fabricante.
- **Integral** = documento inteiro lido.
- **Página** = página oficial lida e reconferida.

### 4.1 Echosens: elastografia transitória (TE) e CAP

| Item | Evidência | Fonte |
|---|---|---|
| Medidas | "At least 10 measurements at the same spot shall be performed with one single probe." | "FibroScan® procedure for users", página global, dateModified 05/03/2026 |
| IQR/M | "Liver stiffness IQR/Median ratio (%) shall remain ≤30% when final median stiffness result exceeds 7.1 kPa." A regra é **condicional** | idem |
| Taxa de sucesso | Não consta da página oficial atual. Aparece só na EASL-ALEH 2015 | idem; EASL-ALEH 2015 |
| Preparo | Jejum "at least 3 hours", só líquidos claros; 5 min deitado antes do exame | idem |
| Sonda | Ferramenta automática baseada na distância sonda–cápsula, "and not on the patient's BMI". PCD máximo recomendado de 45 mm com SmartExam e 35 mm sem | idem; página SmartExam, dateModified 23/06/2026 |
| Faixa | Rigidez 2,0–75 kPa; CAP 100–400 dB/m | 510(k) K223902 (02/03/2023) |
| Formato do CAP | 1ª geração: "CAP median and interquartile range (IQR)". 2ª geração (CAPc) e FibroScan 230: "CAP mean and standard deviation" | K223902; K203273 (25/03/2021): o CAPc "is calculated as a mean value rather than the median value" |
| CAP e rigidez | O CAP "is calculated only if the stiffness measurement is valid" | "FibroScan and the role of liver stiffness", datePublished 10/04/2021 |
| CAP na sonda S+ | "CAP™ on S+ probe is only available with SmartExam capability." | K223902 |
| Critério de IQR do CAP | Não há limiar numérico publicado pela Echosens. A página SmartExam diz que medidas de CAP fora dos critérios "are automatically rejected", sem dizer quais são os critérios | página SmartExam |

### 4.2 pSWE e 2D-SWE

| Fabricante / método | Família, SW, transdutor | Evidência técnica | Fonte |
|---|---|---|---|
| Siemens 2D-SWE | ACUSON Sequoia VA50; 5C1, 9C2, DAX | "Obtain 5 measurements at same site"; IQR/M "≤ 0.3 for values in kilopascals and ≤ 0.15 for values in meters per second"; ROI pelo menos 1,5–2 cm abaixo da cápsula; jejum de pelo menos 4 h | Siemens Healthineers Academy, quick card VT 2D SWE Liver, Sequoia VA50 (página) |
| Siemens Auto pSWE | Sequoia VA50 (2.5); DAX, 9C2; vigência 10/04/2023 | "up to 15 individual … measurements"; IQR/M ≤0,3 em kPa e ≤0,15 em m/s; ROI pelo menos 1,5–2 cm abaixo da cápsula; jejum de pelo menos 4 h | quick card Sequoia VA50 Auto pSWE (página) |
| Siemens Auto pSWE (conflito) | linha ACUSON | "Auto pSWE: < 30% (m/s), < 60% (kPa)"; pSWE e 2D-SWE: "< 15% (m/s), < 30% (kPa)" | pôster Siemens US_UDFF_Liver_Poster_A3 V8, 11726, ©2022 (integral) |
| Siemens pSWE e SWE (genérico) | S2000/S3000 VC20A+; Sequoia, Redwood e Juniper VA10A+ | "Acquire and store 10 total valid measurements at the same imaging location"; "Ensure IQR/Median is less than 0.3" (unidade não especificada); descartar leituras "X.XX m/s" | QIBA-D.7 |
| Canon 2D-SWE | Aplio i-series V1.1+ (i600 V2.0+), a-series, 300/400/500, Xario 200 | "Repeat at least 5 measurements from the same window"; ROI circular de 1 cm; posicionar onde o mapa de propagação mostra linhas lisas e paralelas. Sem limiar de IQR/M | QIBA-D.1 |
| GE 2D-SWE | LOGIQ E9 R5, E10/E10s R1, S8 R3 (C1-6-D); P7/P9 R3 (C1-5-RS, 4C-RS) | "10 measurements recommended"; cáliper ≥1 cm; cáliper vermelho = baixa confiança, não medir; IQR/M ">30%" (kPa) ou ">15%" (m/s) = "not reliable" | QIBA-D.3 |
| Philips ElastQ (2D-SWE) | EPIQ Evolution 3.0; C5-1 | "minimum of 8 to 10" medidas; topo da ROI 1,0–1,5 cm abaixo da cápsula | QIBA-D.5 |
| Philips ElastQ (conflito) | EPIQ | "at least five calipers on five different frames", no máximo 2 por quadro, mediana; "If the IQR/Med is <30%, the measurements in kPa are consistent"; cine de pelo menos 6 s; ROI 1,5–2 cm abaixo da cápsula | white paper 4522 991 33411, mai/2018 (integral) |
| Philips ElastQ (quick guide) | EPIQ Elite Release 4.0 | "IQR/Med from kPa of less than 0.3"; consultar o IQR/M "upon acquisition of at least 5 measurements"; IQR/M em m/s sai menor que em kPa; limiar de confiança recomendado de 60% | 4522 991 44641, jan/2019 (integral) |
| Philips ElastPQ (pSWE) | EPIQ, Affiniti, iU22 | "Literature suggests that minimum of 10 measurements should be obtained out of which 60% should be 'good'", com média | 4522 991 17041 (integral) |
| Samsung S-Shearwave | RS80A v2.0+, RS85 v1.0+, V8 v1.0+ | "10 times or more"; ROI pelo menos 1,5 cm abaixo da cápsula, profundidade de até 6 cm; RMI "0.4 or higher … very reliable"; o auto-profiling remove RMI <0,4 até restarem mais de 5 medidas com "IQR/MED is less than 0.3" | QIBA-D.6; o white paper WP201703 (01/12/2017) define o RMI sem limiar |
| Fujifilm SWM e SWE | ARIETTA 850/750 Ver.1+, 70/65 Ver.3+, Ascendus Step 4+ | "10 measurements"; ROI pelo menos 2 cm abaixo da cápsula e a menos de 6,5 cm do transdutor; VsN exibido como índice de confiabilidade, sem limiar | QIBA-D.4 |
| Esaote | MyLab 9, X8, Twice, Eight (versões no apêndice) | pSWE: "10 measurements or more"; 2D-SWE: "5 measurements or more"; ROI cerca de 1 cm abaixo da cápsula | QIBA-D.2 |
| Hologic SuperSonic | Aixplorer V12.5+; MACH 20/30/40 V3.0 SP2+ | "3 valid measurements" em 3 aquisições independentes, com **média**; a partir da V10.0, rejeitar Stability Index <90% (kPa) ou <80% (m/s); caixa SWE pelo menos 2 cm abaixo da cápsula | QIBA-D.8 |

### 4.3 Gordura por ultrassom

| Fabricante / método | Evidência técnica | Fonte |
|---|---|---|
| Siemens UDFF (%) | Sequoia VA50 (DAX, 5C1, 9C2; vigência 10/04/2023): "Obtain 5 measurements at same site"; ROI pelo menos 1,5–2 cm abaixo da cápsula; jejum de pelo menos 4 h; apneia. Nenhum critério de dispersão; a imagem de exemplo mostra IQR/Median 0,4, sem regra | quick card Sequoia VA50 UDFF (página) |
| Siemens UDFF: regulatório | K183575 (20/03/2019): ROI de "3-cm by 3-cm", índice "useful as an aid to the physician". K211859 (20/07/2021): UDFF no Sequoia. K221500 (14/06/2022): transdutor 9C2 | FDA |
| Canon ATI (dB/cm/MHz) | O aparelho mostra o R² do ajuste: "R2 90% excellent 80% good <80% poor". O white paper usa a média de 10 medidas nos casos, como desenho de estudo e não como regra | white paper ULWP13175US, ©2020 (integral); K161843 (21/09/2016): "Attenuation Imaging … New feature" |
| GE UGAP (dB/cm/MHz) | Exibe mapa de qualidade. Nenhum número de medidas ou limiar de dispersão em fonte oficial acessível | guia GE JB08032XX, jun/2021 (integral); K200158 (17/04/2020): UGAP "similar to ATI on Aplio"; K211488 (10/09/2021) |
| GE UGFF (%) | "five measurements are performed or recommended per examination". Fora do enum v1 | white paper JB35927XX, jan/2026 (integral); K251985 e K251963 (29/10/2025) |
| Philips LFQ (atenuação) | Mapa de confiança; início da região de atenuação a "about twice the abdominal wall thickness". Fora do enum v1 | white paper Philips Liver Fat Quantification (integral) |
| USFF; Samsung TAI/TSI; Mindray UAP e STE/STQ; Fujifilm iATT | Nenhum documento técnico oficial verificável | — |

## 5. O que o `qualityRegistry.ts` atual consegue expressar

Leitura de `apps/api/src/server/hepaticReports/qualityRegistry.ts`, sem edição:

| Aspecto | Comportamento atual | Consequência para a evidência |
|---|---|---|
| Conteúdo | `APPROVED_HEPATIC_QUALITY_CRITERIA` é `[]`; qualquer critério recebe `QUALITY_CRITERION_UNAPPROVED` | Nada está aprovado. Esta é a postura correta enquanto D1–D10 não forem decididas |
| Seleção da entrada | Igualdade exata de `module`, `method`, `manufacturer`, `equipmentModel`, unidade da mediana, `minimumAcquisitions` e `reference` (`id`, `version`, `citation`) | Falta casar versão de software e sonda, embora várias regras dependam deles: VA50, V10.0+, SmartExam, S+. Também não há entrada genérica por família ou sociedade: cada modelo precisa de entrada própria |
| Unidade | Usa a unidade da medida com `role: "median"` | Modos baseados em média (CAPc, FibroScan 230, Hologic) nunca casam com uma entrada |
| Regras de métrica | `allowed_values` ou `range` com `min ≤ valor ≤ max`, ambos inclusivos | Expressa "≤" e "≥". **Não expressa "<" estrito** (Siemens QIBA-D.7, Philips, Samsung) sem inventar um valor de borda. Também não expressa regra condicional (Echosens 7,1 kPa; CV por faixa da WFUMB) |
| Métricas | Lista plana, um valor por código; o valor vem do cliente | Não representa métricas por aquisição (R² do ATI, RMI, Stability Index, VsN, CV). Não liga o IQR/M informado à derivação `iqr-median-percent` nem às medidas de mediana e IQR. Falta convenção de unidade da métrica (razão 0,3 contra 30%) |
| Ator | `quality.physicianId` precisa ser o ator autenticado | Compatível com a regra de que a adequação é ato médico |
| Efeito de regra violada | `apps/api/src/server/hepaticReports/service.ts:133` lança `hepatic_quality_criterion_unapproved` com **HTTP 422** para qualquer issue do registro, inclusive `QUALITY_METRIC_VALUE_UNAPPROVED` | Hoje, valor fora da faixa **bloqueia** a geração. Não é um aviso |

### 5.1 Pré-requisitos bloqueantes (revisão central)

Enquanto estes itens não forem resolvidos em story própria, o registro **permanece vazio**. Nenhuma entrada da seção 7 pode ser cadastrada, nem as classificadas como "evidência suficiente".

| # | Pré-requisito | Situação atual verificada | Por que bloqueia |
|---|---|---|---|
| P1 | Métricas vinculadas às medidas e derivações | `quality.metrics` é uma lista livre `{code, value, unit}` informada pelo cliente; não há ligação com a mediana, o IQR ou a derivação `iqr-median-percent` | Um IQR/M informado à mão poderia contradizer as medidas do próprio exame e ainda assim ser aprovado |
| P2 | Chave com versão de software e sonda | A busca do registro ignora `equipment.softwareVersion` e `equipment.probe` | Regras da seção 4 dependem disso: VA50, Stability Index a partir da V10.0, SmartExam, sonda S+. Sem esses campos, uma entrada valeria para versões que a fonte não cobre |
| P3 | Ciclo de vida ativo × histórico | As entradas não têm estado (ativo, retirado), vigência nem histórico; a `reference.version` só é comparada por igualdade | Não há como retirar um critério ou trocar de versão sem perder a reprodutibilidade de laudos antigos |
| P4 | Validação de faixa física | O contrato aceita qualquer número finito ≥0 (`NonNegative`); o registro não valida domínio | Nada impede, por exemplo, TE fora de 2,0–75 kPa ou CAP fora de 100–400 dB/m (K223902) |
| P5 | Dependência do CAP em relação a uma TE válida | Os módulos de gordura e rigidez são avaliados de forma independente | A Echosens diz que o CAP "is calculated only if the stiffness measurement is valid", e o contrato não modela essa dependência |
| P6 | Protocolo, jejum e ROI estruturados | `acquisition.protocol` é só uma referência; `roi` e `position` são texto livre; `capsuleDistanceCm` é opcional; o registro não lê jejum nem profundidade | As regras de preparo e de posição da ROI das seções 3 e 4 não podem ser verificadas nem registradas como parte do critério |
| P7 | Semântica de violação: bloqueio ou aviso | Hoje é bloqueio com 422 (`service.ts:133`) | É preciso decidir, por regra, o que bloqueia e o que só sinaliza. Este documento não chama de "aviso" uma regra que hoje bloqueia |
| P8 | UGAP em dB/m | `contracts.ts:180` restringe UGAP a `dB/cm/MHz` | O guia GE JB08032XX exibe também o "Attenuation rate" em dB/m; essa unidade nativa se perde |
| P9 | Unicidade e ID estável | As entradas não têm `id`; a busca usa a primeira que casar; duplicatas e sobreposições não são recusadas | Sem isso não há auditoria nem garantia de qual entrada aprovou o exame |

## 6. Cruzamento das decisões D1–D10 com o registro atual

| # | Decisão | Fontes em conflito | O registro atual expressa? | Situação |
|---|---|---|---|---|
| D1 | Jejum mínimo para rigidez | 3 h (Echosens, EASL 2021) × 4 h (WFUMB, QIBA, Siemens VA50) | Não. O jejum fica no módulo do contrato; o registro não lê horas | **Bloqueada**: decisão médica pendente; fora do escopo do registro |
| D2 | IQR/M na TE | condicional a mediana >7,1 kPa (Echosens) × ≤30% universal (WFUMB, EASL-ALEH) | Só a versão universal (`range` 0–30). A condicional não | **Bloqueada** |
| D3 | Taxa de sucesso na TE | >60% (EASL-ALEH 2015) × ausente da fonte atual do fabricante | Sim, como `range`, se aprovada | **Sem fonte primária suficiente**: falta fonte atual do fabricante |
| D4 | Siemens Auto pSWE | quick card VA50 (≤0,15 m/s; ≤0,3 kPa) × pôster V8 (<30% m/s; <60% kPa) | O card, sim; o pôster exigiria "<" estrito | **Bloqueada**: duas fontes oficiais do mesmo fabricante divergem, e o card não dá número mínimo de medidas |
| D5 | Unidade do "IQR/Median less than 0.3" (QIBA-D.7) | unidade não dita × WFUMB ≤15% em m/s | Não: unidade ambígua e "<" estrito | **Bloqueada** para S2000/S3000 e configurações fora da VA50 |
| D6 | Mínimo de aquisições quando as fontes divergem | Siemens 2D-SWE 5 (card VA50) × 10 (QIBA-D.7); Philips ElastQ 5 (white paper) × 8–10 (QIBA-D.5); WFUMB 3–5 (2D-SWE) × fabricante | Sim (`minimumAcquisitions`), depois de decidido | **Bloqueada** onde fontes do mesmo fabricante divergem; nos demais casos, o QIBA manda seguir o fabricante |
| D7 | R² mínimo do ATI | "excellent" ≥90% × "good" ≥80% (Canon) | Não: R² é por aquisição | **Bloqueada** |
| D8 | Gordura sem critério do fabricante | WFUMB P2 (AC: IQR/M ≤15%; 3–5 aquisições) manda seguir o fabricante "when available" | Sim para UGAP, se aprovado; para UDFF não há regra a expressar | UGAP: **sem fonte primária suficiente** do fabricante. UDFF: só o mínimo de aquisições tem fonte |
| D9 | Dados em média ± DP | CAPc, FibroScan 230, Hologic | Não: o casamento exige mediana | **Bloqueada** (exige extensão do contrato) |
| D10 | Composição multiparamétrica | WFUMB P2: jejum e prioridade ao protocolo de rigidez | Fora do escopo do registro | **Bloqueada**: decisão médica pendente |

Mesmo decididas, as escolhas D1–D10 dependem dos pré-requisitos da seção 5.1 para valerem no registro:
- D1 e D10 dependem de P6, porque protocolo e jejum não são estruturados.
- D2, D4, D5 e D6 dependem de P1 (IQR/M vinculado às medidas) e de P2 (versão de software e sonda).
- D9 e o CAP dependem de P5 (CAP condicionado à TE válida).
- D8 (UGAP) depende de P8 (unidade dB/m).
- Todas dependem de P3, P7 e P9.

## 7. Classificação das entradas candidatas

Critérios usados:
**Nenhuma entrada é segura para implementar hoje**: todas dependem dos pré-requisitos bloqueantes P1–P9 (seção 5.1).

- **Segura após P1–P9:** fonte oficial verificada, sem conflito entre fontes oficiais do mesmo fabricante, e tudo que a fonte exige como número cabe no esquema sem inventar borda. Mesmo depois de P1–P9, a entrada depende da lista real de modelos atendidos e da assinatura do responsável clínico, e a adequação permanece manual.
- **Bloqueada:** a fonte existe, mas há conflito, decisão pendente ou o esquema atual não expressa a regra.
- **Sem fonte primária suficiente:** não há documento oficial verificável para a regra.

| Entrada candidata | Classificação | Escopo depois de P1–P9 | Motivo |
|---|---|---|---|
| Siemens UDFF, Sequoia VA50 (DAX, 5C1, 9C2), % | **Segura após P1–P9**, só o mínimo | `minimumAcquisitions = 5`, sem métrica obrigatória | Card oficial verificado. Não existe regra de dispersão a aplicar, e a regra de AC da WFUMB não se transfere. A versão VA50 não é casada pelo registro: registrar o limite na entrada |
| GE 2D-SWE, LOGIQ E9/E10/E10s/S8/P7/P9, kPa | **Segura após P1–P9** | `minimumAcquisitions = 10`; IQR/M `range` 0–30 (%) | QIBA-D.3 usa ">30%" como não confiável, então ≤30 inclusivo é fiel. O cáliper vermelho continua sendo julgamento visual |
| GE 2D-SWE, idem, m/s | **Segura após P1–P9** | `minimumAcquisitions = 10`; IQR/M `range` 0–15 (%) | idem |
| Canon 2D-SWE, modelos do QIBA-D.1 | **Segura após P1–P9**, só o mínimo | `minimumAcquisitions = 5`, sem métrica obrigatória | O fabricante não publica limiar de dispersão; o mapa de propagação é julgamento visual |
| Fujifilm SWM e SWE, modelos do QIBA-D.4 | **Segura após P1–P9**, só o mínimo | `minimumAcquisitions = 10` | Limiar do VsN não publicado |
| Esaote pSWE e 2D-SWE, modelos do QIBA-D.2 | **Segura após P1–P9**, só o mínimo | pSWE: 10; 2D-SWE: 5 | Sem limiar de dispersão do fabricante |
| Siemens 2D-SWE, Sequoia VA50 | **Bloqueada** (D6) | — | Card VA50 (5) × QIBA-D.7 (10). A regra de IQR/M (≤0,3 kPa; ≤0,15 m/s) é expressável depois da decisão |
| Siemens Auto pSWE, Sequoia VA50 | **Bloqueada** (D4) | — | Fontes oficiais divergentes; sem mínimo explícito ("up to 15") |
| Siemens pSWE/VTQ, S2000/S3000 e Sequoia fora da VA50 | **Bloqueada** (D5) | — | Unidade do limiar não declarada; "<" estrito |
| Echosens TE, kPa | **Bloqueada** (D1, D2, D3) | — | O mínimo de 10 é verificado, mas a regra de IQR/M é condicional |
| Echosens CAP (1ª geração e CAPc) | **Bloqueada** (D9) e **sem fonte primária suficiente** para dispersão | — | Sem limiar oficial de dispersão; o CAPc usa média e DP |
| Philips ElastQ | **Bloqueada** (D6) | — | White paper (5) × QIBA-D.5 (8–10); a fonte usa "<30%" estrito |
| Philips ElastPQ | **Sem fonte primária suficiente** | — | Documento de 2016 baseado em "literature suggests", com média |
| Samsung S-Shearwave | **Bloqueada** | — | O RMI é por aquisição, e o "less than 0.3" é estrito e sem unidade |
| Hologic SuperSonic | **Bloqueada** (D9) | — | Média de 3 medidas; Stability Index por aquisição |
| Canon ATI | **Bloqueada** (D7) | — | R² por aquisição; limiar a decidir |
| GE UGAP | **Sem fonte primária suficiente** | — | Nenhum critério numérico do fabricante acessível. A WFUMB P2 só serviria por decisão D8 |
| GE UGFF; Philips LFQ | **Bloqueada** (contrato) | — | Fora do enum `Method` v1. Não mapear para UDFF, USFF, ATI ou UGAP |
| USFF; Samsung TAI/TSI; Mindray STE/STQ e UAP; Fujifilm iATT | **Sem fonte primária suficiente** | — | Nenhum documento técnico oficial verificável |
| Qualquer entrada genérica de sociedade, sem fabricante e modelo | **Bloqueada** (esquema) | — | O registro exige fabricante e modelo exatos |

Nas entradas "segura após P1–P9":
- A `reference` deve apontar para a fonte da seção 8, com versão, ID estável e estado de ciclo de vida (P3, P9).
- As entradas da GE dependem de P1: o IQR/M precisa vir das medidas do exame, não de métrica livre.
- As entradas com versão mínima de software (Siemens VA50; GE R1/R3/R5; versões do QIBA-D.1, D.2 e D.4) dependem de P2.
- O efeito de uma violação, bloqueio 422 ou sinalização, depende de P7.

## 8. Referências e versionamento

| ID proposto | Documento | Versão / data | Acesso |
|---|---|---|---|
| `wfumb-2024-p1-t1` | WFUMB Part 1, doi:10.1016/j.ultrasmedbio.2024.03.013 | UMB 2024;50(8) | integral |
| `wfumb-2024-p2-t5` | WFUMB Part 2, doi:10.1016/j.ultrasmedbio.2024.03.014 | UMB 2024;50(8) | integral |
| `qiba-sws-2024-01-15` e `…-appD-{canon,esaote,ge,fujifilm,philips,samsung,siemens,hologic}` | QIBA US SWS Profile, doi:10.1148/QIBA/20240115 | 15/01/2024, Stage 3 | integral |
| `easl-aleh-2015` | doi:10.1016/j.jhep.2015.04.006 | 2015 | integral |
| `easl-2021-nit` | doi:10.1016/j.jhep.2021.05.025 | 2021 | integral |
| `baveno-vii` | Baveno VII consensus | 2022 | integral |
| `echosens-procedure-global` | echosens.com/fibroscanprocedure/ | dateModified 05/03/2026 | página |
| `echosens-smartexam` | echosens.com/products/smart-exam/ | dateModified 23/06/2026 | página |
| `echosens-role-liver-stiffness` | echosens.com/fibroscan-and-the-role-of-liver-stiffness/ | datePublished 10/04/2021 | página |
| `fda-K203273`, `fda-K223902` | 510(k) Echosens | 25/03/2021; 02/03/2023 | integral |
| `siemens-sequoia-va50-2dswe-liver` | Academy, vt-2d-swe-quick-card-liver-sequoia-va50 | VA50 | página |
| `siemens-sequoia-va50-autopswe` | Academy, sequoia-va50-auto-pswe | VA50, vigência 10/04/2023 | página |
| `siemens-sequoia-va50-udff` | Academy, sequoia-va50-udff | VA50, vigência 10/04/2023 | página |
| `siemens-udff-liver-poster-v8` | US_UDFF_Liver_Poster_A3 V8, 11726 | ©2022 | integral |
| `fda-K183575`, `K211859`, `K221500` | 510(k) Siemens | 20/03/2019; 20/07/2021; 14/06/2022 | integral |
| `canon-ati-ulwp13175us` | Canon, Assessment of NAFLD with ATI | ©2020 | integral |
| `fda-K161843` | 510(k) Canon Aplio i-series | 21/09/2016 | integral |
| `ge-jb08032xx` | GE, guia de estadiamento LOGIQ E10 | jun/2021 | integral |
| `ge-ugff-jb35927xx` | GE, white paper UGFF | jan/2026 | integral |
| `fda-K200158`, `K211488`, `K251985`, `K251963` | 510(k) GE | 17/04/2020; 10/09/2021; 29/10/2025; 29/10/2025 | integral |
| `philips-elastq-wp-33411` | Philips ElastQ white paper, 4522 991 33411 | mai/2018 | integral |
| `philips-elastq-r4-44641` | Philips EPIQ Elite R4.0 ElastQ Liver Analysis, 4522 991 44641 | jan/2019 | integral |
| `philips-elastpq-17041` | Philips ElastPQ, 4522 991 17041 | 2016 | integral |
| `samsung-sshearwave-wp201703` | Samsung, white paper S-Shearwave | 01/12/2017 | integral |

Para páginas sem número de revisão, a versão registrada é a data exibida pela própria página. Antes de ativar qualquer entrada, é preciso obter o IFU do modelo e do software efetivamente usados e reconfirmar a linha correspondente.

## 9. Ordem sugerida

1. Story própria para os pré-requisitos bloqueantes P1–P9: métricas vinculadas às medidas, chave com software e sonda, ciclo de vida, faixas físicas, dependência CAP–TE, protocolo/jejum/ROI estruturados, semântica bloqueio × aviso, UGAP em dB/m, unicidade e ID estável. Na mesma linha ficam média e DP, métricas por aquisição, desigualdade estrita e regra condicional.
2. O responsável clínico decide D1–D10 e lista os equipamentos, versões e sondas realmente usados.
3. Só depois, as entradas "segura após P1–P9" da seção 7 entram no registro, para esses modelos, com referência versionada e testes de fronteira.

Até lá, o registro continua vazio e a adequação continua sendo avaliação médica manual.
