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
