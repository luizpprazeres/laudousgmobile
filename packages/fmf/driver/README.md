# FMF driver — comparação automática com o app oficial

Controla o **FMF.app** (Electron que carrega `https://fmf.refractionx.com`) pelo protocolo
de depuração do Chromium, preenche as calculadoras por `data-testid`, clica em
**Recalculate** e lê o risco e os MoMs como texto. Sem imagem, sem OCR, sem LLM no
loop: ~20 s por caso, zero tokens por caso. Validado em 15/09/2026 reproduzindo à
risca três leituras manuais (1:290, 1:910, 1:36).

> Aviso: a EULA do software da FMF fala em não "collect or harvest" dados do serviço.
> A decisão de usar este driver, e em que volume, é do titular da licença (Luiz).
> O driver só usa pacientes fictícias (`TESTE DRIVER`).

## Uso

```bash
# 1) fechar o FMF e reabrir com a porta de depuração (trava de instância única)
osascript -e 'tell application "FMF" to quit'; sleep 3
open -a FMF --args --remote-debugging-port=9222     # manter logado

# 2) instalar (uma vez) e rodar
cd packages/fmf/driver && npm i
node run-pe.mjs cases-01-03.json results.json        # ONLY=C02 para um caso só; DEBUG_PE=1 para diagnóstico
../../../node_modules/.bin/tsx compare-pe.mjs cases-01-03.json results.json   # tabela app × motor local
node gen-matrix.mjs                                  # gera cases-matrix.json (44 casos)
node run-tri.mjs cases-tri3.json results-tri3.json      # trissomias (mesmo formato; ver gen-tri3.mjs)
../../../node_modules/.bin/tsx compare-tri.mjs cases-tri3.json results-tri3.json
node gen-tri4.mjs                                    # gera cases-tri4.json (varredura de FCF + combinações)
node extract-graph.mjs                               # extrai as curvas dos gráficos (SVG → dados) em graphs-trisomies.json
```

Formato de caso: ver `cases-01-03.json` (`maternal` + `pe`) e `resultados/cases-tri3.json` (`maternal` + `tri`). Datas em **mm/dd/yyyy**
(formato atual do app). A idade e a IG usadas na comparação são as **lidas do app**.

## Mecânica do app (o que custou descobrir)

| Fato | Consequência no driver |
|---|---|
| Risco só recalcula ao clicar `pe-calculate` ("Recalculate"), que aparece após qualquer edição | `setPreeclampsia` clica e espera o botão sumir; até 3 tentativas |
| Rádios são Pressables que **alternam**: clicar um já selecionado o desmarca | `pressRadio` lê o estado (`:scope > div > div`) e só clica se preciso |
| Selects nativos têm testid `<id>-native`; o `<id>` é o wrapper | `select()` prefere `-native` |
| Datar a gestação abre "Are you sure you want to date the pregnancy?" | `confirmDialog()` clica Confirm; `setMaternal` repete até o exame mostrar a IG pedida |
| Calculadoras (`calculators-accordion`) só existem com exame datado + operador | `ensureExamination`, operador escolhido por JS, `openCalculators` espera |
| Campos de data com máscara: digitar por cima de seleção esvazia o campo; a máscara demora ~0,5 s | `typeInto` apaga com Backspace repetido, digita com barras e verifica com espera |
| Ícone de gráfico abre overlay `close-assessments` que bloqueia cliques | nunca clicar `graph-*`; se acontecer, `close-assessments` |
| Datação Manual dá IG exata; CRL segue Robinson do app | driver usa Manual (`pregnancy-method` → Manual, `ga-weeks/days-manual`, `redate-button-pregnancy`) |

Testids úteis: `search-name/surname`, `date-of-birth`, `add-patient`, `new-pregnancy`,
`new-examination`, `height`, `weight`, `ethnicity-native`, `smoking-yes/no`,
`pregnancy-method-native`, `crl-input`, `crl-redate-button`, `conception-native`,
`preeclampsia-tab`, `trisomies-tab`, `sga-tab`, `pretermHistory-tab`, `pretermCervix-tab`,
`gdm-tab`, `fetalanemia-tab`, `ch/db1/db2/fHist/sle/aps-yes|no`, `nullip`, `multip`,
`prev-pe-yes|no`, `prev-gdm-yes|no`, `multip-date-of-delivery`, `multip-ga-weeks|days`, `bw`,
`fha-present|absent`, `map-sr1 dr1 sl1 dl1 sr2 dr2 sl2 dl2`, `utpi-accordion`,
`utpi-right|left|mean|mom`, `oa-accordion`, `biochemical-accordion`, `pe-calculate`.

## Aba de trissomias (`trisomies-tab`)

Testids: `prev-t21/t18/t13-yes|no`, `fha-present|absent`, `fhr-input`, `fetus-0-crl`, `nt-input`,
`nasal-bone-native` (Present/Absent/Not examined), `tricuspid-native` (No/Yes/Not examined),
`dvawave-native` (Positive/Negative/Reversed flow/Absent DV/Not examined), `dvpi-input`,
`biochemical-accordion` → `pappa-mom`, `freebhcg-mom`; recálculo em `trisomies-calculate`.
Saída: "Trisomy 21: 1 in N" e "Trisomy 13/18: 1 in N" (combinada), com o **prior** por idade/IG
logo acima. `setTrisomies` limpa FCF/DV PI/bioquímica quando o caso não os traz (senão vazam
entre casos) e lê o resultado duas vezes com intervalo (a tela demora a estabilizar).

Achados do app (15/09/2026, 560 leituras válidas em 9 lotes, `resultados/`):

| Fato | Consequência no motor `fmfTrisomy.ts` |
|---|---|
| Prior por idade = Cuckle com **idade decimal na DPP**, piso 0,0007 | implementado (rms 1,4 %) |
| 2 algarismos significativos; teto "<1 in 10000"; **piso "1 in 2"** | `displayCapRatio` 10000 / `displayFloorRatio` 2 |
| LR total dos marcadores nunca cai abaixo de ~0,053; LR da bioquímica/FCF também tem piso ~0,052 por trissomia | `LR_TOTAL_MIN` e `BIO_LR_MIN` |
| NT: mistura com transição deslocada em CRL ≥ 75 vs Wright 2008 | `NT_MIX` + `NT_TRUNC_NODES` reajustados (48 pontos, rms log-LR 0,085) |
| **FCF e bioquímica usam a IG DATADA do exame** (datação manual/DUM), não a IG do CRL; prior e NT usam o CRL | `FmfInput.gaDaysDated` (default = CRL) |
| FCF: Kagan com FCF esperada −1,4 bpm, truncamento [−6,4; +19,4] e médias/SD de T21/T18/T13 reajustadas | `GAUSS_*.fhr` (50 pontos, rms 0,37 → 0,09) |
| Bioquímica T18/T13: médias e SD reajustadas | `GAUSS_MEAN_T18/T13`, `GAUSS_SD` (65 pontos, rms 0,60 → 0,19) |
| Osso nasal ausente ≈ 3,5× mais forte que a extração; tricúspide **"No" não altera o risco** (LR 1) | `NASAL_BONE`/`TRICUSPID` reajustados (53 pontos, rms 0,80 → 0,51); motor ignora "No" |
| **Combinações NB ausente + TR + bioquímica** no app dão risco 13/18 ~2–9× maior que o motor | limitação conhecida (casos já "alto risco" nos dois) |
| Onda A do DV qualitativa (Positive/Negative/Reversed/Absent DV) **não muda o risco**, com ou sem DV PI; só o DV PI conta | motor só usa DV PI (verificado com NT intercaladas) |

Resultado global (`summary-tri.mjs`, 548 comparações não capadas): desvio mediano 5 %, p90 20 %;
classificação de T21 (1:100 / 1:1000) concorda em 256/264, e os 8 divergentes estão a ±16 % do corte.

## Gráficos do app (`graph-nt`, `graph-crl`, `graph-fhr`, `graph-utapi`)

O ícone abre o overlay "Assessments" com um `<svg>` (350×363, viewBox `-28 -0.85 260 270`):
3 `<polyline>` de 80 pontos (mediana em `#0066a5`, percentis 5 e 95 em `#aaaaaa`), grade em
`<line>`, ticks em `<text>` (CRL 45–80 mm no eixo X, NT 0–4 mm no eixo Y) e 1 `<circle>` para o
feto. `extract-graph.mjs` ajusta os eixos pelos ticks e converte as polylines em pares
(CRL, NT) → `resultados/graphs-trisomies.json` (base para replicar o gráfico nas plataformas).
`graph-crl`/`graph-fhr` só renderizam com CRL/FCF preenchidos na aba — pendente.

## Próximos passos
- Modelar a interação osso nasal × tricúspide × bioquímica do app (casos combinados).
- Extrair `graph-crl`, `graph-fhr` e `graph-utapi` com os campos preenchidos.
- Portar a calculadora de trissomias para Android e iOS (só a web consome o motor).
- Apagar as pacientes "TESTE DRIVER" duplicadas (o driver criou ~40 até corrigir o `openPatient`).
