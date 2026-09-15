# Comparação FMF 1.0.44 × motor local — resultados

Prints do software oficial (versão 1.0.44) enviados por Luiz em 14/09/2026, 23:28–23:54.
Motor local: `packages/shared/src/calculators/preEclampsiaFmf.ts` (FMF/AJOG-2020+cal-2026-08-22),
recalculado com os valores EXATOS exibidos pelo FMF (idade, IG em dias, intervalo),
não com os do protocolo. Script: scratchpad `fmf-protocol/recheck2.ts`.

## Ajustes de entrada observados no FMF

| Item | Protocolo previa | FMF usou | Efeito |
|---|---|---|---|
| Caso 01, data de nascimento | 10/03/1996 → 30 anos | campo em dd/mm interpretou 03/10/1996 → **29 anos** | local 285 → 284 |
| CRL 54,0 mm | 12+0 (84 d) | **11+6 (83 d)** | local 866 → 889 no caso 02 |
| Intervalo entre gestações | 3 anos | 3,02 e 3,13 anos (calculado pela data do parto) | desprezível |
| Peso ao nascer anterior (caso 03) | Z = 0 | campo deixado **em branco** | ver hipóteses abaixo |

## Resultados (risco de PE < 37 semanas, "History, MAP, UtA-PI")

| Caso | FMF | Local (entradas do FMF) | Diferença | MoM PAM FMF / local | MoM IP FMF / local |
|---|---|---|---|---|---|
| 01 nulípara base | **1 em 290** | 1 em 284 | −2 % (local mais alto) | 1,05 / 1,0539 | 0,92 / 0,9213 |
| 02 multípara sem PE | **1 em 910** | 1 em 889 | −2,3 % | 1,03 / 1,0320 | 1,01 / 1,0084 |
| 03 multípara com PE (32 sem) | **1 em 36** | 1 em 42 | +17 % (local mais BAIXO) | 1,00 / 1,0010 | **0,98 / 0,9072** |

Basal local (só história): 01 → 1 em 203; 02 → 1 em 672; 03 → 1 em 18.

## Leitura

1. **Casos 01 e 02**: os MoMs batem nas duas casas (PAM e IP). A diferença de ~2 %
   no risco final é sistemática (local sempre um pouco mais alto) e fica FORA da
   tolerância de ±3 unidades apenas no caso 02 (889 × 910). Como os MoMs coincidem,
   a diferença está no prior (história) ou nos parâmetros da verossimilhança, não
   na conversão das medidas. Precisa do risco "só história" do FMF para separar.
2. **Caso 03**: o MoM da PAM bate (1,00) mas o **MoM do IP uterino não**: FMF 0,98,
   local 0,907. A mediana esperada do IP em multípara com PE prévia é diferente.
   O modelo local (Tayyar 2015, Tab. 2) aplica, em log10: +0,004971 (PE prévia)
   − 0,006836·Z(peso ao nascer) − 0,005120·(IG do parto − 40). Com IG 32 e Z = 0,
   isso soma +0,0459. O FMF aplicou apenas ≈ +0,013 (intervalo 0,011–0,015 pelo
   arredondamento do MoM). Hipóteses testadas no motor local:
   - ignorar o termo da IG do parto (IG = 40): MoM 0,997 e risco 1 em 194 — não é isso;
   - Z = −1 ou −2: MoM 0,893 / 0,879 — afasta ainda mais;
   - IG do parto = 36: MoM 0,951 — ainda longe.
   Nenhuma combinação simples dos coeficientes locais reproduz 0,98. O risco
   final do FMF (1 em 36) é coerente com o próprio MoM 0,98 e um prior parecido
   com o local (1 em 18): o desvio é do modelo de mediana do IP, não do prior.

## Testes complementares pedidos a Luiz (mesma paciente 03, só mudar um campo e Calcular)

| # | Mudar | Fotografar |
|---|---|---|
| 03a | Gestation at delivery: 32 → **40** semanas (peso ao nascer em branco) | MoM do IP e risco |
| 03b | Gestation at delivery de volta a 32; Birth weight: **1500 g** | MoM do IP e risco |
| 03c | Birth weight: **2500 g** (mantendo 32 sem) | MoM do IP e risco |
| 01h | Paciente 01: apagar as 4 pressões e os 2 IPs, Calcular | linha "History: 1 in N" (risco só por história) |

Com 03a–03c dá para estimar os coeficientes da IG do parto e do Z-score que o
FMF realmente usa; com 01h separa-se prior de verossimilhança nos 2 % dos casos 01/02.

## Rodada 2 — 15/09/2026 10:10 (prints 03a, 03b, 03c; 01h impossível)

| Teste | FMF | Local (Z = 0) | Observação |
|---|---|---|---|
| 03a: IG do parto 40 sem, peso em branco | **1 em 210** (MoM IP não visível, seção recolhida) | 1 em 194 (MoM 0,997) | local 8 % mais alto |
| 03b: IG 32 sem, peso 1500 g (FMF: percentil 2) | **1 em 36** | 1 em 45 com Z = −2 | FMF não muda com o peso |
| 03c: IG 32 sem, peso 2500 g (FMF: percentil 99) | **1 em 36** | 1 em 39 com Z = +2 | idem |
| 01h: só história | não calcula — o FMF exige as pressões | 1 em 203 | prior não isolável por essa via |

**Conclusões desta rodada**

1. **O FMF ignora o peso ao nascer anterior** no cálculo de PE: 1500 g (p2) e 2500 g
   (p99) dão o mesmo 1 em 36. O motor local aplica −0,006836·Z na mediana do IP
   (Tayyar 2015) e o risco muda de 1:39 a 1:45. O termo do Z-score deve ser
   removido (ou zerado) para paridade com o software oficial. Isso também elimina a
   recusa "multípara com PE anterior exige o Z-score", que hoje bloqueia o cálculo.
2. **Prior e verossimilhança batem no caso 03**: forçando MoM IP = 0,98 (o valor do
   FMF) no motor local, o risco sai 1 em 35 contra 1 em 36 do FMF. Toda a
   divergência de 42 × 36 está na mediana esperada do IP uterino em PE prévia.
3. **Tamanho do ajuste do FMF para PE prévia com parto em 32 sem**: +0,0124 em log10
   (intervalo 0,010–0,015 pelo arredondamento do MoM). O local aplica +0,0459
   (= 0,00497 fixo + 0,00512·8 semanas). Com parto em 40 sem, o FMF dá 1:210, que
   no motor local corresponde a MoM ≈ 0,96–0,97, ou seja, ajuste ≈ +0,017–0,022 —
   MAIOR que em 32 sem, o oposto do sinal do termo local. Falta ver o MoM do IP que
   o FMF exibe em 40 sem para fechar o coeficiente.

**Pendente**: prints de 03 (32 sem), 03a (40 sem) e um novo 03d (36 sem) com a seção
"Uterine artery PI" ABERTA, para ler o MoM em três pontos e estimar o coeficiente
da IG do parto que o FMF usa de fato.

## Rodada 3 — 15/09/2026 10:16 (MoM do IP visível em 32, 36 e 40 sem)

| IG do parto | FMF MoM IP | FMF risco | Local ANTES (Z=0) | Local DEPOIS (cal-2026-09-15) |
|---|---|---|---|---|
| 32 | 0,98 | 1 em 36 | 1 em 42 (MoM 0,907) | 1 em 35 (MoM 0,980) |
| 36 | 0,98 | 1 em 71 | — | 1 em 68 |
| 40 | 0,98 | 1 em 210 | 1 em 194 (MoM 0,997) | 1 em 202 |

**Fechado**: o app usa ajuste constante para PE prévia na mediana do IP, sem IG do
parto nem Z-score. Implementado `CAL_UTA_PI_PE_PREVIA = 0,0124` nos três motores
(mjs de referência, TypeScript, Swift), Z-score não exigido, golden regenerado
(342 casos, 10 recusas), versão `FMF/AJOG-2020+cal-2026-09-15`.

**Resíduo aberto**: local 2–4 % mais alto em todos os cinco pontos (MoMs iguais).
Próximo passo: casos 04–08 do protocolo para ver se o viés é constante; se for,
uma correção única no prior/PAM resolve.

## Rodada 4 — 15/09/2026, comparação AUTOMÁTICA (driver CDP, `packages/fmf/driver`)

72 casos lidos do app pelo driver (matriz de 44 + varredura de 28 idades), zero erros
na execução final. Dados brutos em `packages/fmf/driver/resultados/`. Todos os riscos
"History, MAP, UtA-PI" a 12+0, 164 cm, 69 kg, branca, salvo indicação.

### O que bate (desvio ≤ 3 %, MoMs iguais nas 2 casas)
Peso 45–140 kg, altura 150–185 cm, negra, sul-asiática, FIV, história familiar,
diabetes tipo 2, PAM alta (MoM 1,29) e baixa (0,79), IP baixo (0,35) e alto (1,75),
IG 11+0 a 14+0, multíparas sem PE (intervalo 0,5–15 a; parto 34–42 sem), multíparas
com PE (intervalo 1–10 a; parto 24–36 sem), HAS + PE prévia, combinação de alto risco.

### O que NÃO bate e por quê

| Termo | App | Local | Diagnóstico |
|---|---|---|---|
| **Idade materna** (16–48 a) | MoM PAM **constante** (1,04); MoM IP 0,86→0,89 | MoM PAM 1,053→1,020; MoM IP 0,855→0,921 | mediana da PAM **sem termo de idade** no app; IP com coeficiente ≈ −5,8·10⁻⁴/ano (local −1,01·10⁻³). Risco: −9 % a +14 % |
| **Prior ≥ 35 anos** | — | com MoMs do app injetados, local ainda +5…8 % acima de 35 | app usa **idade decimal na DPP** (exame + 196 d a 12+0). Com essa idade, desvio médio 0,3 %, máx 2,6 % |
| Janela | recusa **14+1** | aceita até 14+1 (99 d) | limitar a 98 d |
| Asiática oriental | MoM IP 0,86 | 0,883 | app tem termo de IP (≈ +0,012 log10) |
| Mista branca-negra | MoM IP 0,85 | 0,883 | app trata etnias mistas com efeito parcial |
| Tabagismo | MoM PAM 1,06 | 1,049 | coeficiente ≈ 1,8× o publicado |
| Diabetes tipo 1 | MoM IP 0,93; risco 1:83 | 0,883; 1:95 | app tem termo de IP para DM1 (≈ −0,024 log10) e distingue DM1 de DM2 (DM2: 1:96 = local) |
| HAS | 1:65 / 1:14 | 1:61 / 1:13 | MoMs iguais; prior 3–6 % |

Coeficientes definitivos saem da varredura de termos (55 casos, 2 níveis de medida)
em andamento; ver `fit-terms.mjs`.

## Rodada 5 — 15/09/2026, varredura de termos (55 casos) e calibração `cal-2026-09-15b`

Coeficientes estimados do app (Δ em log10 da mediana esperada, 2 níveis de medida,
`fit-terms.mjs` / `fit-base.mjs`) e adotados nos três motores:

| Termo | PAM: app (publicado) | IP: app (publicado) |
|---|---|---|
| Idade materna (por ano) | **0** (+4,39·10⁻⁴) | **−6,8·10⁻⁴** (−1,12·10⁻³) |
| IG (por dia) | publicado | **−4,69·10⁻³** (−4,41·10⁻³) |
| Intercepto | 1,937277 | 0,263177 |
| Negra | −0,0039 (−0,0015) | +0,0246 (+0,0181) |
| Sul-asiática | 0 (0) | 0 (0) |
| Asiática oriental | 0 | **+0,0092** (não publicado) |
| Qualquer etnia mista | 0 | **+0,0135** (não publicado); prior como branca |
| Tabagismo | **−0,0090** (−0,0045) | 0 |
| Diabetes tipo 1 | +0,0040 (+0,0044) | **−0,0243** (não publicado) |
| Diabetes tipo 2 | +0,0040 (+0,0044) | 0 |
| História familiar | **+0,0080** (+0,0060) | 0 |
| HAS crônica | **0,0505** (0,0510; 15/09 sugere 0,053, 22/08 ≤ 0,051) | 0 |
| FIV | 0 (0) | 0 (0) |
| Peso | truncado em **120 kg** nas medianas (não no prior) | idem |
| Prior: idade | **decimal na DPP** = (exame + 280 − IG − nascimento)/365,25 | — |
| Janela | 77 a **98** dias (app recusa 14+1) | — |

Resultado offline com o motor recalibrado contra os 127 pontos lidos do app
(idade decimal na DPP): matriz 43 casos, idades 28, termos 55 — desvio médio
0,2 %, máximo 6 % (HAS a 120/75: 1:65 × 1:61, prior), classificação divergente só
em 1:100 exato (o app não chama 1 em 100 de alto risco; o local sim). Gate dos 8
pontos de 22/08 mantido; port TS fiel; golden regenerado (346 casos, 21 recusas).

Pendente de produto (não é motor): os formulários web/Android/iOS ainda pedem
idade inteira e não oferecem "mista" nem "diabetes tipo 1" — sem isso o motor
não recebe esses termos.

## Rodada 6 — 15/09/2026, TRISSOMIAS pelo driver (62 casos + 12 refeitos; grade fina de 90 em curso)

Motor local: `packages/shared/src/calculators/fmfTrisomy.ts` (FMF-R-extract-2026-06-26/v1,
`validation-pending`). Só a web consome; Android e iOS ainda não têm a calculadora.
O app exibe o **prior** (só idade + IG) e o risco final, com **2 algarismos
significativos** e teto em "<1 in 10000"; T13 e T18 saem **combinadas** ("Trisomy 13/18").

| Componente | App × local | Diagnóstico / ação |
|---|---|---|
| Prior T21 por idade (20 idades, 16–48) | local 12–35 % mais baixo | app = Cuckle 1987 com **idade decimal na DPP** e sem o −0,5 ano; piso 0,0007. Implementado: rms 1,4 %, máx 2,8 % |
| Prior T13/18 | razão prior(13/18)/prior(21) = 0,55 em todas as idades | igual ao local (prevalências relativas de Snijders) |
| Prior vs IG (CRL 45–84) | app 1:520→1:570; local 1:636→1:701 | diferença é só a idade; a forma de Snijders bate |
| Bioquímica (PAPP-A, β-hCG em MoM) | LR app/local 0,97–1,00 (fora do teto) | OK |
| DV PI 1,2 / 1,6 | ×0,98 / ×0,97 | OK (0,8 cai no teto) |
| Trissomia 21 prévia | ×0,98 | OK |
| Osso nasal presente | ×1,07 | OK |
| **Osso nasal ausente** | LR app 72 × local 20 (T21); 25 × 7,5 (13/18) | app 3,4–3,6× mais forte — a calibrar |
| **Tricúspide "Não"** | app LR 1,00; local 0,67 | app não credita regurgitação ausente — a calibrar |
| Tricúspide "Sim" | app 61 × local 42 (T21) | ×1,46 — a calibrar |
| Onda A do DV (qualitativa) | app não muda com Positive/Negative/Reversed | driver confirmou o select aplicado; a checar com DV PI preenchido (grade em curso) |
| **NT** (0,8–6,0 mm, CRL 60) | LR app/local cai de 0,68 (NT 1,8) a 0,21 (NT 6,0) | modelo de mistura do app difere do Wright 2008 portado — grade NT×CRL de 48 pontos em curso para ajustar |
| Teto | app mostra "<1 in 10000" | local deve capar a exibição em 1:10000 |
| Saída combinada 13/18 | app | local deve expor p13+p18 |

## Rodada 7 — 15/09/2026, TRISSOMIAS: calibração `cal-2026-09-15c` (9 lotes, 560 leituras válidas)

Lotes do driver: matriz (62), b40 (20), grade NT×CRL (48), NB/TR (54), FCF fina + combinações (52),
FCF intercalada + bioquímica 13/18 (54), releituras + onda A (32), datação (12). Duas armadilhas
do próprio driver foram descobertas e corrigidas nesta rodada: **leituras estagnadas** (o app não
registrava a mudança de um campo numérico e mostrava o resultado do caso anterior — detectadas
por lotes intercalados e por `mark-suspect.mjs`, 63 leituras descartadas) e **bioquímica oculta**
(MoMs do caso anterior continuavam valendo com o acordeão fechado).

| Componente | App × motor (antes → depois) | O que mudou no motor |
|---|---|---|
| NT (48 pontos) | rms log-LR 0,14 → 0,085; zona de transição em CRL 84 de −60 % para ±5 % | `NT_MIX` + limites de truncamento livres por CRL (`NT_TRUNC_NODES`) |
| FCF (50 pontos) | rms 0,37 → 0,09 | o app usa a **IG datada** (não a do CRL) na FCF esperada; médias/SD de T21/T18/T13 e truncamento reajustados; `gaDaysDated` na entrada |
| Bioquímica 13/18 (65 pontos) | rms 0,60 → 0,19 | médias de T18/T13 e SD reajustadas; piso da LR por trissomia (`BIO_LR_MIN` 0,052) |
| Osso nasal / tricúspide (53 pontos) | rms 0,80 → 0,51 | coeficientes reajustados; "No" na tricúspide é neutro |
| Onda A do DV | idêntica à base em todas as opções, com e sem DV PI | nada (motor já só usa DV PI) |
| Combinações NB ausente + TR + bio | app 1:13 × motor 1:118 (13/18) | **não resolvido**: o app parece ter interação entre marcadores; ambos "alto risco" |

Global (548 comparações não capadas): desvio mediano **5 %**, p90 **20 %**; T21 6 %/19 %, T13/18 5 %/23 %.
Classificação de T21 concorda em 256/264; os 8 divergentes estão a ±16 % dos cortes 1:100/1:1000.
Web: formulário de trissomias agora pede data de nascimento (idade decimal), mostra T13/18 combinada
e aplica teto/piso de exibição como o app. Android/iOS ainda não têm a calculadora de trissomias.
