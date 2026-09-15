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
```

Formato de caso: ver `cases-01-03.json` (`maternal` + `pe`). Datas em **mm/dd/yyyy**
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

## Próximos passos
- `setTrisomies` (aba `trisomies-tab`): sondar testids da NT/bioquímica e o botão de recálculo equivalente.
- Rodar matrizes maiores (Latin hypercube) e consolidar em `docs/fmf-comparacao-*.md`.
