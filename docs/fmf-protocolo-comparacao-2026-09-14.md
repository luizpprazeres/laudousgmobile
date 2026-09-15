# Protocolo de comparação: FMF oficial (desktop 1.0.44) × motores locais — 2026-09-14

Autor: agente de pesquisa, a pedido do coordenador. Nenhum arquivo de código foi
alterado; nenhuma automação tocou o software da FMF (a EULA proíbe — ver
`packages/fmf/README.md`, seção "A EULA proíbe validar por script"). Este
documento só orienta Luiz a digitar casos fictícios no app oficial e a
comparar com números já calculados aqui pelos motores do repositório.

## 0. Antes de começar

**Paciente fictícia**: nome `TESTE LAUDOUSG 01` a `TESTE LAUDOUSG 12` (um nome
por caso, 01–08 pré-eclâmpsia, 09–12 trissomias). Data do exame em todos os
casos: **14/09/2026**. Data de nascimento: derivada da idade-alvo de cada caso
e informada em cada tabela. Concepção espontânea, feto único, não fumante em
todos os casos, salvo indicação contrária.

**Motores e versões**:
- Pré-eclâmpsia — `packages/shared/src/calculators/preEclampsiaFmf.ts`, versão
  `FMF/AJOG-2020+cal-2026-08-22`. Janela aceita: **77 a 99 dias** (11+0 a
  14+1) — mais ampla que os clássicos 11+0–13+6 (97 dias); ver nota no caso 08.
  Recusa (fail-closed) fora da janela ou com idade/peso/altura implausíveis —
  nunca devolve `NaN`.
- Trissomias — `packages/shared/src/calculators/fmfTrisomy.ts`, versão
  `FMF-R-extract-2026-06-26/v1`, **`clinicalStatus: "validation-pending"`**.
  Só o componente isolado de TN foi conferido contra um exemplo publicado
  (Wright et al., CCN 60 mm/TN 2,5 mm/LR T21 2,653, tolerância 0,002); o risco
  combinado (idade+TN+bioquímica) **nunca foi comparado com o software oficial
  da FMF**. Os casos 09–12 abaixo são a primeira tentativa dessa comparação.

**"Basal" e "ajustado"**: cada caso de PE mostra dois números do motor local —
*basal* (risco só por história, sem PAM/IP — equivale a escolher, no FMF, o
método de rastreio "somente história") e *ajustado* (história + PAM + IP
uterino — "história + biofísico"). O motor local **não aceita PAPP-A/PlGF
para PE** (ao contrário do rastreio combinado completo que a FMF também
oferece); isso é uma limitação a registrar, não um bug a corrigir aqui — ver
seção de limitações no final.

**O caso 01 é um reteste**: em 14/09/2026 o motor local rodou uma matriz de
28 casos e comparou com um print do FMF oficial fornecido por Luiz. O caso
base deu **1:285 no motor local** contra **1:290 registrado no FMF** (print de
14/09/2026 12:17:20 — ver `docs/stories/2026-09-14-pe-comparacao-local.md`).
A causa não foi demonstrada. Este protocolo reproduz esse caso EXATAMENTE
(mesma idade, peso, altura, IG, PAM, IP) para uma nova tentativa de
reconciliação, e testa a hipótese aventada de "convenção de idade" — ver
o caso 01 abaixo; o resultado do teste está adiantado lá: **não explica a
diferença**.

**Unidades usadas neste documento**: peso em kg, altura em cm, idade
gestacional em semanas+dias e em dias corridos, pressão em mmHg, translucência
nucal e CCN em mm, IP uterino/ducto venoso adimensional, biomarcadores em MoM
(o motor de trissomias exige MoM já corrigido pelo laboratório — não aceita
concentração bruta).

---

## Parte A — Pré-eclâmpsia (casos 01 a 08)

Ordem dos campos conforme o fluxo do FMF: **Patients → New patient** (dados
fixos da paciente) **→ 1st trimester screening → Preeclampsia** (dados do
exame atual). Onde o nome exato do campo na versão 1.0.44 não pôde ser
confirmado neste documento, está indicado "campo equivalente a X".

### Caso 01 — TESTE LAUDOUSG 01 — base normal / nulípara (RETESTE da divergência 1:290×1:285)

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 01 |
| Data de nascimento | 10/03/1996 (→ 30 anos completos em 14/09/2026) |
| campo equivalente a "Racial origin" | White |
| campo equivalente a "Method of conception" | Spontaneous |
| campo equivalente a "Cigarette smoking" | No |
| campo equivalente a "Chronic hypertension" | No |
| campo equivalente a "Diabetes mellitus" | None |
| campo equivalente a "SLE / antiphospholipid syndrome" | No |
| campo equivalente a "Family history of pre-eclampsia" | No |
| campo equivalente a "Parity" | Nulliparous |
| Peso materno | 65,0 kg |
| Altura materna | 165,0 cm |
| Número de fetos | 1 (Singleton) |
| Data do exame | 14/09/2026 |
| CCN (CRL) | 63,4 mm (→ IG calculada ≈ 12 semanas e 5 dias / 89 dias; fórmula Robinson-Fleming, mesma usada pelo motor local) |
| Pressão arterial — braço direito (1ª e 2ª) | 120/75 mmHg, 120/75 mmHg |
| Pressão arterial — braço esquerdo (1ª e 2ª) | 120/75 mmHg, 120/75 mmHg |
| PAM resultante (auto-calculada pelo FMF) | deve mostrar 90,0 mmHg |
| IP artéria uterina direita | 1,50 |
| IP artéria uterina esquerda | 1,50 |
| IP uterino médio (auto-calculado) | deve mostrar 1,50 |

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal (só história) | 0,494% | 0,128% | 0,047% | **1 em 203** |
| Ajustado (história+PAM+IP), idade=31 (idade na DPP, conforme contrato do motor — ver nota) | 0,349% | 0,062% | 0,016% | **1 em 286** |
| Ajustado, idade=30 (idade no exame — reproduz o teste de 2026-09-14) | 0,351% | 0,062% | 0,016% | **1 em 285** |

MoM da PAM ≈ 1,0518–1,0528 (não truncado); MoM do IP uterino ≈ 0,9233–0,9252
(não truncado), dependendo da convenção de idade usada (30 ou 31 anos — a
diferença é mínima). **FMF oficial registrado anteriormente para este mesmo
caso: 1 em 290.** Nenhum risco atinge o corte de alto risco (1:100).

**Conclusão do reteste de convenção de idade**: alimentar o motor com idade
"no exame" (30) versus idade "na data provável do parto" (31 — como o próprio
código do motor documenta: `idade: anos, na data provável do parto`) muda o
resultado local em **apenas 1 unidade** (285→286). Isso **não explica** a
diferença de 5 unidades para o valor oficial de 1:290. A causa da divergência
permanece não identificada — não é a convenção de idade.

**O que fotografar**: a tela de resultado da Preeclampsia mostrando (a) a PAM
e o IP uterino médio calculados pelo próprio FMF (para conferir se batem com
90,0 mmHg e 1,50), e (b) o "Risk of preeclampsia with delivery at <37 weeks"
(ou campo equivalente) em formato 1:N. Se a tela também mostrar risco <34 e
<32 semanas, incluir também.

---

### Caso 02 — TESTE LAUDOUSG 02 — multípara SEM pré-eclâmpsia prévia

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 02 |
| Data de nascimento | 01/03/1996 (→ 30 anos em 14/09/2026) |
| Racial origin | White |
| Method of conception | Spontaneous |
| Cigarette smoking | No |
| Chronic hypertension | No |
| Diabetes mellitus | None |
| SLE / antiphospholipid syndrome | No |
| Family history of pre-eclampsia | No |
| Parity | campo equivalente a "Parous, no previous pre-eclampsia" |
| campo equivalente a "Gestational age at delivery, previous pregnancy" | 39 semanas |
| campo equivalente a "Interval since previous pregnancy" | 3 anos |
| Peso materno | 69,0 kg |
| Altura materna | 164,0 cm |
| Número de fetos | 1 |
| Data do exame | 14/09/2026 |
| CCN (CRL) | 54,0 mm (→ IG ≈ 12 semanas e 0 dias / 84 dias) |
| PA braço direito (1ª e 2ª) | 116/74 mmHg, 112/76 mmHg |
| PA braço esquerdo (1ª e 2ª) | 114/75 mmHg, 118/73 mmHg |
| PAM resultante | deve mostrar 88,0 mmHg |
| IP uterino direito / esquerdo | 1,73 / 1,73 |
| IP uterino médio | deve mostrar 1,73 |

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal | 0,148% | 0,033% | 0,011% | **1 em 675** |
| Ajustado | 0,115% | 0,019% | 0,005% | **1 em 869** |

MoM PAM ≈ 1,0321 (não truncado); MoM IP uterino ≈ 1,0189 (não truncado).
Baixo risco (abaixo do corte 1:100) tanto basal quanto ajustado.

**O que fotografar**: tela de resultado da Preeclampsia com PAM/IP conferidos
e o risco <37 semanas em 1:N.

---

### Caso 03 — TESTE LAUDOUSG 03 — multípara COM pré-eclâmpsia prévia

Idêntico ao caso 02, exceto:

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 03 |
| Parity | campo equivalente a "Parous, previous pre-eclampsia" |
| campo equivalente a "Gestational age at delivery, previous pregnancy" | 32 semanas (parto pré-termo por PE) |
| campo equivalente a "Interval since previous pregnancy" | 3 anos |
| campo equivalente a "Birthweight of previous pregnancy" (percentil/Z-score) | percentil 50 / Z-score 0,0 — **campo equivalente**: o motor local exige o Z-score do peso ao nascer anterior; se o FMF pedir percentil, usar o equivalente a Z=0 (percentil ~50) |

Demais campos (idade, peso 69 kg, altura 164 cm, IG 12+0/84 dias, PAM 88,0
mmHg via as mesmas 4 aferições do caso 02, IP uterino 1,73) idênticos ao caso 02.

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal | 5,579% | 2,119% | 1,004% | **1 em 18** — ALTO RISCO |
| Ajustado | 2,468% | 0,591% | 0,193% | **1 em 41** — ALTO RISCO |

MoM PAM ≈ 1,0011 (não truncado); MoM IP uterino ≈ 0,9166 (não truncado). Ambos
os riscos (basal e ajustado) cruzam o corte de 1:100 — indicação de AAS
segundo o motor local.

**O que fotografar**: tela de resultado, com atenção especial a se o campo de
peso ao nascer anterior aceitou Z-score, percentil ou gramas — anotar qual.

---

### Caso 04 — TESTE LAUDOUSG 04 — hipertensão arterial crônica

Igual ao caso 02 (nulípara, sem outras comorbidades), exceto:

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 04 |
| Parity | Nulliparous |
| Chronic hypertension | **Yes** |
| Peso / Altura | 69,0 kg / 164,0 cm |
| IG | 12+0 (84 dias), CCN 54,0 mm |
| PA (4 aferições) | 116/74, 112/76, 114/75, 118/73 → PAM 88,0 mmHg (mesma leitura do caso 02 — o objetivo é isolar o efeito da HAS crônica, não de uma PA elevada no dia) |
| IP uterino | 1,73 / 1,73 |

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal | 7,129% | 2,837% | 1,387% | **1 em 14** — ALTO RISCO |
| Ajustado | 1,943% | 0,463% | 0,151% | **1 em 51** — ALTO RISCO |

MoM PAM ≈ 0,9027 (cai porque o valor ESPERADO de PAM sobe com HAS crônica, e
a leitura real ficou abaixo do esperado); MoM IP ≈ 1,0189. Nota técnica: a
salvaguarda de Wright 2015 (`min(µ com HAS, µ sem HAS)`) está **desligada**
neste motor porque o software oficial da FMF não a aplica (medido em
22/08/2026 — ver `packages/fmf/README.md`). Se o número da FMF para este caso
vier MENOR que o basal sem HAS equivalente, isso re-confirma essa decisão; se
vier MAIOR, é um sinal para reabrir a discussão.

**O que fotografar**: tela de resultado completa.

---

### Caso 05 — TESTE LAUDOUSG 05 — diabetes mellitus

Igual ao caso 02, exceto:

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 05 |
| Parity | Nulliparous |
| Diabetes mellitus | **Type II** (campo equivalente — o motor local só distingue "tem/não tem diabetes tipo 1 ou 2", sem diferenciar entre os tipos; qualquer um serve para o teste) |
| Peso / Altura / IG / PA / IP | idênticos ao caso 02 (69 kg, 164 cm, 12+0/84d, PAM 88,0, IP 1,73) |

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal | 2,113% | 0,679% | 0,288% | **1 em 47** — ALTO RISCO |
| Ajustado | 1,244% | 0,282% | 0,089% | **1 em 80** — ALTO RISCO |

MoM PAM ≈ 1,0049; MoM IP ≈ 1,0189 (idênticos aos casos sem diabetes, porque
diabetes só entra na média a priori do parto com PE, não nos modelos de MoM
de PAM/IP deste motor).

**O que fotografar**: tela de resultado completa.

---

### Caso 06 — TESTE LAUDOUSG 06 — PAM elevada isolada (sem diagnóstico de HAS crônica)

Igual ao caso 02 (nulípara, normotensa por história), exceto a PA medida no
dia do exame:

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 06 |
| Chronic hypertension | No (a HAS é sobre diagnóstico prévio, não sobre a PA do dia) |
| PA braço direito (1ª e 2ª) | 140/92 mmHg, 138/93 mmHg |
| PA braço esquerdo (1ª e 2ª) | 142/91 mmHg, 136/94 mmHg |
| PAM resultante | deve mostrar 108,0 mmHg |
| IP uterino | 1,73 / 1,73 (mesmo do caso 02) |
| Peso / Altura / IG | 69 kg / 164 cm / 12+0 (84 dias), CCN 54,0 mm |

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal (não usa PAM) | 0,582% | 0,154% | 0,057% | **1 em 172** |
| Ajustado | 2,074% | 0,544% | 0,189% | **1 em 48** — ALTO RISCO |

MoM PAM ≈ 1,2460 (não truncado — o limite de truncamento do MoM da PAM é
±0,1224 em log10, ou seja, fator ~0,754–1,325×; 1,246 está dentro, perto do
limite superior). MoM IP ≈ 1,0189 (igual ao caso 02).

**O que fotografar**: tela de resultado, conferindo se o FMF também mostra
MoM da PAM próximo de 1,25.

---

### Caso 07 — TESTE LAUDOUSG 07 — IP uterino elevado isolado

Igual ao caso 02, exceto o IP uterino:

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 07 |
| PA (4 aferições) | 116/74, 112/76, 114/75, 118/73 → PAM 88,0 mmHg (igual ao caso 02) |
| IP artéria uterina direita | 2,30 |
| IP artéria uterina esquerda | 2,30 |
| IP uterino médio | deve mostrar 2,30 |
| Peso / Altura / IG | 69 kg / 164 cm / 12+0 (84 dias), CCN 54,0 mm |

**Saída esperada do motor local:**

| | risco <37 sem | risco <34 sem | risco <32 sem | 1 em N |
|---|---|---|---|---|
| Basal (não usa IP) | 0,582% | 0,154% | 0,057% | **1 em 172** |
| Ajustado | 0,763% | 0,195% | 0,067% | **1 em 131** |

MoM IP uterino ≈ 1,3545 (não truncado). Abaixo do corte de alto risco apesar
do IP elevado isoladamente — o motor combina PAM+IP+história, um marcador
isolado moderadamente alto nem sempre cruza 1:100.

**O que fotografar**: tela de resultado, conferindo o MoM do IP uterino.

---

### Caso 08 — TESTE LAUDOUSG 08 — limite superior da janela de cálculo (13+6 e 14+0)

**Contexto importante**: o motor local aceita IG de 77 a 99 dias (11+0 a
14+1), mais amplo que a janela clássica de rastreio de PE (11+0–13+6, 97
dias) citada no cabeçalho do próprio arquivo e no `packages/fmf/README.md`.
Isso não foi confirmado como erro — há fundamento oficial da FMF para janelas
de até 14+1 em outras análises (ver `docs/fmf-verificacao-2026-09-14.md`,
item 3) — mas **nunca foi testado se o app 1.0.44 aceita e calcula PE em
13+6 e 14+0 da mesma forma**. Rodar os DOIS sub-casos abaixo na MESMA
paciente fictícia, como se fossem duas visitas.

| Campo no FMF | Valor a digitar (8a — 13+6) | Valor a digitar (8b — 14+0) |
|---|---|---|
| Nome da paciente | TESTE LAUDOUSG 08 | TESTE LAUDOUSG 08 (mesma paciente, nova visita se o app permitir; senão, cadastrar 08b separada) |
| Data de nascimento | 01/03/1996 (30 anos) | idem |
| Racial origin / Method of conception / smoking / HAS / diabetes / SLE / hist. familiar | White / Spontaneous / No / No / None / No / No | idem |
| Parity | Nulliparous | idem |
| Peso / Altura | 69,0 kg / 164,0 cm | idem |
| Data do exame | 14/09/2026 | 14/09/2026 |
| CCN (CRL) | 79,8 mm (→ IG ≈ 13 semanas e 6 dias / 97 dias) | 82,0 mm (→ IG ≈ 14 semanas e 0 dias / 98 dias) |
| PA (4 aferições) | 116/74, 112/76, 114/75, 118/73 → PAM 88,0 mmHg | mesmas 4 leituras → PAM 88,0 mmHg |
| IP uterino direito/esquerdo | 1,73 / 1,73 | 1,73 / 1,73 |

**Saída esperada do motor local:**

| | 8a — 13+6 (97 dias) | 8b — 14+0 (98 dias) |
|---|---|---|
| Basal | 0,582% → **1 em 172** | 0,582% → **1 em 172** (idêntico — basal não depende da IG atual além do prior) |
| Ajustado (risco <37 sem) | 0,575% → **1 em 174** | 0,597% → **1 em 168** |
| MoM PAM | 1,0257 | 1,0272 |
| MoM IP uterino | 1,1652 | 1,1773 |

Nenhum dos dois é recusado pelo motor local (ambos dentro de 77–99 dias).
**Verificação suplementar feita apenas no motor, sem foto necessária**: em
76 dias e 100 dias o motor RECUSA com a mensagem `"idade gestacional de 76
dias fora da janela do modelo de 1º trimestre (77–99 dias)"` (e o mesmo para
100) — confirma o comportamento fail-closed nas duas bordas.

**O que fotografar**: a tela de resultado da Preeclampsia em cada uma das duas
IGs (97 e 98 dias) — e, se o app tiver algum aviso ou bloqueio ao tentar
14+0, fotografar esse aviso também (é exatamente o que este caso quer
descobrir).

---

## Parte B — Trissomias T21/T18/T13 (casos 09 a 12)

Tela: **1st trimester screening → Trisomies** (ou "Combined screening",
dependendo do menu da versão 1.0.44). Idade materna e CCN reaproveitam os
mesmos campos já preenchidos na ficha da paciente. **Aviso**: o motor local
de trissomias está em `clinicalStatus: validation-pending` — nunca foi
comparado com o software oficial antes destes 4 casos. Trate qualquer
divergência aqui como esperada até prova em contrário, não como confirmação
de bug.

**Sobre a bioquímica**: o motor local exige PAPP-A e free β-hCG **já em MoM**
(não aceita concentração bruta em UI/L ou ng/mL). Se a tela do FMF permitir
digitar o MoM diretamente, use os valores fixados abaixo (0,50 e 2,00). Se só
aceitar a concentração bruta e calcular o MoM internamente, o FMF vai aplicar
a própria equação de mediana dele (diferente da nossa) — nesse caso, anote o
MoM que o FMF exibir na tela de resultado e compare esse número (não o
risco final) com 0,50/2,00: se os MoMs baterem, a comparação de risco é
direta; se não baterem, registre como divergência da camada de conversão
MoM, não do modelo de risco combinado.

Comum aos 4 casos: CCN (CRL) = 60,0 mm → IG ≈ 12 semanas e 3 dias (87 dias,
fórmula Robinson-Fleming). Racial origin: White. Não fumante. Sem gestação
anterior com trissomia.

### Caso 09 — TESTE LAUDOUSG 09 — idade 25, TN normal, SEM bioquímica

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 09 |
| Data de nascimento | 20/05/2001 (→ 25 anos em 14/09/2026) |
| CCN (CRL) | 60,0 mm |
| TN (translucência nucal) | 1,8 mm (normal para esse CRL) |
| Osso nasal, regurgitação tricúspide, ducto venoso, FCF, PAPP-A, free β-hCG | não avaliar / deixar em branco |

**Saída esperada do motor local:**

| | T21 | T18 | T13 |
|---|---|---|---|
| Basal | 1 em 981 (intermediário) | 1 em 2352 (baixo) | 1 em 7391 (baixo) |
| Ajustado (idade+TN) | **1 em 4019** (baixo) | 1 em 7638 (baixo) | 1 em 27974 (baixo) |

Marcadores usados: Idade materna, TN. IG calculada: 12 semanas e 3 dias.

**O que fotografar**: tela de resultado das Trissomias mostrando os 3 riscos
(T21/T18/T13) e a IG que o próprio FMF calculou a partir do CCN.

---

### Caso 10 — TESTE LAUDOUSG 10 — idade 25, TN aumentada, COM bioquímica

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 10 |
| Data de nascimento | 20/05/2001 (25 anos) |
| CCN (CRL) | 60,0 mm |
| TN | 4,0 mm (aumentada) |
| PAPP-A | 0,50 MoM |
| free β-hCG | 2,00 MoM |

**Saída esperada do motor local:**

| | T21 | T18 | T13 |
|---|---|---|---|
| Basal | 1 em 981 | 1 em 2352 | 1 em 7391 |
| Ajustado (idade+TN+bioquímica) | **1 em 5** — ALTO RISCO | 1 em 870 (baixo) | 1 em 851 (baixo) |

Marcadores usados: Idade materna, TN, Free β-hCG, PAPP-A.

**O que fotografar**: tela de resultado completa, com atenção ao MoM de
PAPP-A e free β-hCG exibidos pelo FMF (ver nota sobre bioquímica acima).

---

### Caso 11 — TESTE LAUDOUSG 11 — idade 40, TN normal, COM bioquímica

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 11 |
| Data de nascimento | 20/05/1986 (→ 40 anos em 14/09/2026) |
| CCN (CRL) | 60,0 mm |
| TN | 1,8 mm (normal) |
| PAPP-A | 0,50 MoM |
| free β-hCG | 2,00 MoM |

**Saída esperada do motor local:**

| | T21 | T18 | T13 |
|---|---|---|---|
| Basal (só idade, sem TN/bioquímica — mas IG mostrada já entra na conta) | 1 em 92 — ALTO RISCO | 1 em 220 (baixo) | 1 em 690 (baixo) |
| Ajustado (idade+TN+bioquímica) | **1 em 55** — ALTO RISCO | 1 em 5627 (baixo) | 1 em 8859 (baixo) |

**O que fotografar**: tela de resultado completa.

---

### Caso 12 — TESTE LAUDOUSG 12 — idade 40, TN aumentada, SEM bioquímica

| Campo no FMF | Valor a digitar |
|---|---|
| Nome da paciente | TESTE LAUDOUSG 12 |
| Data de nascimento | 20/05/1986 (40 anos) |
| CCN (CRL) | 60,0 mm |
| TN | 4,0 mm (aumentada) |
| PAPP-A / free β-hCG | não avaliar / deixar em branco |

**Saída esperada do motor local:**

| | T21 | T18 | T13 |
|---|---|---|---|
| Basal | 1 em 92 — ALTO RISCO | 1 em 220 (baixo) | 1 em 690 (baixo) |
| Ajustado (idade+TN) | **1 em 4** — ALTO RISCO | **1 em 13** — ALTO RISCO | **1 em 29** — ALTO RISCO |

Este é o caso mais dramático dos 4 (idade alta + TN muito aumentada): as três
trissomias cruzam o corte de alto risco simultaneamente. Bom caso para
conferir se o FMF concorda pelo menos na ordem de grandeza.

**O que fotografar**: tela de resultado completa.

---

## Limitações encontradas ao montar este protocolo

1. **PE não aceita bioquímica (PAPP-A/PlGF)**: o motor de pré-eclâmpsia deste
   repositório só recebe História + PAM + IP uterino. Se a tela oficial do
   FMF tiver uma terceira opção de rastreio "História + biofísico +
   bioquímico" (com PAPP-A/PlGF), ela **não tem equivalente local** — não dá
   para reproduzir nem comparar esse número. Registrar isso se aparecer na
   tela oficial.
2. **Trissomias sem validação externa do risco combinado**: até este
   protocolo, só o componente isolado de TN tinha sido conferido contra um
   exemplo publicado (não contra o software da FMF). Os casos 09–12 são a
   primeira comparação real; qualquer divergência é esperada, não confirma
   bug.
3. **Convenção de idade materna na PE não resolve a divergência conhecida**:
   o código define `idade` como "anos na data provável do parto", diferente
   da idade no dia do exame. Testado no caso 01: a diferença entre as duas
   convenções muda o resultado local em apenas 1 unidade de "1 em N" — não
   explica a diferença de 5 unidades observada contra o FMF (1:285/1:286
   local × 1:290 oficial). A causa dessa divergência específica **continua
   desconhecida**.
4. **Conversão de bioquímica em MoM (trissomias)**: se o FMF só aceitar
   concentração bruta (mIU/mL, ng/mL) e calcular o MoM internamente com a
   própria equação de mediana, o MoM resultante pode não bater com os 0,50 e
   2,00 MoM fixados aqui — ver nota na Parte B.
5. **Janela de cálculo da PE (77–99 dias) mais ampla que a citada no
   README/cabeçalho do código (77–97 dias)**: não é necessariamente um erro
   (há fundamento oficial da FMF citado em `docs/fmf-verificacao-2026-09-14.md`
   para janelas até 14+1 em outras análises), mas nunca foi confirmado se o
   app 1.0.44 também calcula PE normalmente em 98/99 dias, ou se
   bloqueia/avisa. O caso 08 testa exatamente isso.
6. **Nenhum campo obrigatório do motor foi deixado sem valor fixo**: peso,
   altura, etnia, método de concepção, tabagismo, história familiar,
   paridade, intervalo entre gestações e IG do parto anterior foram todos
   fixados explicitamente em cada caso, mesmo quando o valor não é o
   determinante clínico do teste (para isolar o efeito de uma única variável
   por vez, seguindo o mesmo método já usado em
   `packages/fmf/validacao/paridade-fmf.manual.mjs`).
7. **Gemelar não é suportado** por nenhum dos dois motores locais — não
   incluído neste protocolo.

---

## Como reportar

Para cada um dos 12 casos, Luiz manda **um print da tela de resultado**
(Preeclampsia para os casos 01–08, Trisomies para os casos 09–12) mostrando o
risco final em formato "1 em N" (e o percentual, se aparecer). Sempre que a
tela também mostrar o MoM calculado da PAM e/ou do IP uterino (casos de PE) ou
da bioquímica (casos de trissomia), incluir isso no mesmo print ou em um
segundo print — é o dado mais fácil de comparar linha a linha.

**O que comparar:**
- O risco "1 em N" da tela oficial contra a linha "Ajustado" da tabela do
  motor local de cada caso (a linha "Basal" só é comparável se o FMF também
  oferecer a visão "somente história").
- O MoM da PAM e/ou do IP uterino (PE) e das dosagens bioquímicas (trissomia),
  se exibidos.
- Para o caso 08: se a tela aceitou 14+0 sem aviso/erro, e se o número em
  97 vs. 98 dias mudou na mesma direção que o motor local (cai de 1:174 para
  1:168 — risco ligeiramente maior).
- Para o caso 03: qual unidade o campo de "peso ao nascer anterior" pediu
  (percentil, Z-score ou gramas).

**Tolerância aceitável**: diferença de **até 3 unidades** no "1 em N" é
compatível com arredondamento de tela e já é o critério usado nos 8 pontos de
paridade manual documentados em `packages/fmf/README.md` (ex.: FMF mostra
"1 em 38", motor local dá "1 em 35" — aceito). Diferenças de MoM de até
±0,005 também são aceitáveis (resolução de 2 casas decimais da tela). Uma
diferença MAIOR que isso, especialmente se cruzar o corte de 1:100 em um lado
e não no outro, deve ser registrada como divergência real e não descartada
por arredondamento — foi exatamente esse tipo de diferença (5 unidades, sem
cruzar o corte) que ficou pendente no caso 01 e motivou este reteste.

## Scripts usados para gerar os números deste documento

Os valores acima vieram de um script temporário rodado com `tsx`, fora do
repositório (`/private/tmp/.../scratchpad/fmf-protocol/run-cases.ts`), que
importa diretamente `calcularPreEclampsiaFmf` e `calcularTrissomias` sem
alterar nenhum arquivo do código. Nenhuma automação tocou o software da FMF —
todos os valores "FMF oficial" citados vieram de prints já fornecidos por
Luiz em interações anteriores (não coletados nesta rodada).
