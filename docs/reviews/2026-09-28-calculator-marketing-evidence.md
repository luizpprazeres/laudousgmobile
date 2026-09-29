# Evidência para a seção de calculadoras da landing — 28/09/2026

Revisão **somente leitura** (nenhum código alterado). Repos: `laudousgmobile-def` (web + `@laudousg/shared` + Android `apps/mobile`) e `laudousg-swift` (iOS). Nenhum dado de paciente, `.env` ou credencial foi aberto. Fontes online: só sites oficiais (fetalmedicinebarcelona.org, acog.org).

## Resumo executivo

- As quatro famílias existem e rodam **no aparelho** (iOS e Android) e no fluxo do laudo na web. A exceção são as trissomias na web, que estão atrás de flag.
- **Pré-eclâmpsia** tem a evidência externa mais forte: paridade com o app oficial da FMF em 8 pontos lidos à mão, reexecutada hoje. Ela é **escopada** e **não** é certificação.
- **Trissomias** foram calibradas contra o app oficial, com desvio mediano de 5% e p90 de 20%. Não dá para dizer "igual".
- **Doppler:** as equações são da *Fetal Medicine Barcelona*, sem golden externo.
- **IG/DPP:** a regra de concordância cita um documento ACOG com nome errado e tem defeito de faixa (ver §5).
- Não publicar "certificado", "validado pela FMF", "igual ao app da FMF", "95%" ou "Barcelona FMF".

## 1. Doppler obstétrico (percentis)

| Item | Evidência |
|---|---|
| Motor | `packages/shared/src/calculators/doppler.ts:4-5` "fórmulas exatas da Fetal Medicine Barcelona (fetalmedicinebarcelona.org). Coeficientes extraídos do calc.js oficial"; `:61` `FMB-CALCULATOR-V2021`; `:62-63` referência impressa no laudo |
| Parâmetros | AU, ACM, uterinas (média), RCP e ducto venoso (`doppler.ts:7-12`; `DopplerPartialInput` `:42-51`) |
| Web | Percentis calculados automaticamente dentro do formulário Doppler do laudo (`apps/web/src/lib/catalog/dopplerParaCatalogo.ts:1,45-90`); não há calculadora avulsa |
| Android | `apps/mobile/src/features/generate/CalculatorsSheet.tsx:55-56`; tela `DopplerCalculatorSheet.tsx` (motor shared); ducto venoso em tela própria (`ductoVenoso.ts`, local) |
| iOS | `Services/DopplerCalculator.swift:24,114`; DV `Services/DuctoVenosoCalculator.swift:101` "Calculadora v2021 da Fetal Medicine Barcelona" |
| Validação | Só testes unitários de corte e da fórmula (`LaudoUSGTests/DopplerRawPercentileTests.swift:21-55`). **Sem golden contra saídas da calculadora de Barcelona.** |
| Nome oficial (verificado ao vivo) | Site em inglês: **"Fetal Medicine Barcelona"**; site em espanhol: "Medicina Fetal Barcelona"; rodapé cita "Fundación Medicina Fetal Barcelona". **Sem vínculo** com a Fetal Medicine Foundation (Londres). |

**Rótulos errados na interface** (misturam Barcelona com FMF de Londres):
- Android `CalculatorsSheet.tsx:56` "(Barcelona FMF)" e `:91` "(FMF)" no ducto venoso.
- Android `DopplerCalculatorSheet.tsx:133` "fórmulas Barcelona FMF".
- iOS `PlusSheet.swift:234` "Percentis Barcelona FMF".
- iOS `PlusSheet.swift:248` "Hecher 2001". O motor usa Barcelona v2021.

## 2. Idade gestacional / DPP

| Item | Evidência |
|---|---|
| Motor | `packages/shared/src/calculators/gestationalAge.ts:60-75` (DUM, Naegele: DPP = DUM + 280) e `:77-96` (transfere a IG de uma USG anterior informada pelo médico) |
| **Não existe** | IG por CCN/biometria nessas calculadoras. A fórmula de Robinson aparece só dentro de PE/trissomias (Android `PreEclampsiaCalculatorSheet.tsx:23-24`; iOS `TrisomyCalculator.swift:323-325`) |
| Android | `CalculatorsSheet.tsx:48-49`; `IGCalculatorSheet.tsx:10-11,62,70`. Sem checagem de concordância na tela |
| iOS | `Services/GestationalAgeCalculator.swift`; **mostra** concordância DUM × USG em `Components/Sheets/IGCalculatorSheet.swift:26-28,122-127` |
| Web | Não há calculadora avulsa. A DUM ou a 1ª US entram como referência no laudo obstétrico (`apps/web/src/lib/deterministic/organs/obstetrica.ts:66-77`), e o renderer aplica a regra própria (âncora na biometria atual, limiar de 5 dias) em `apps/api/src/server/renderer/ig.ts:10-19,31` |

**Defeitos:** não afirmar "segue o ACOG" até corrigir.
1. **Nome do documento.** O código diz "ACOG Practice Bulletin No. 700 (2022)" (`gestationalAge.ts:7,98`; Android menu `CalculatorsSheet.tsx:49`). O documento oficial é o **Committee Opinion nº 700, "Methods for Estimating the Due Date" (maio de 2017)**, conforme acog.org.
2. **Faixa 14+0–15+6.** O ACOG redata quando a diferença é **> 7 dias**; o código usa 10 (`gestationalAge.ts:127-128`; iOS `GestationalAgeCalculator.swift:65-68`).
3. **Faixa escolhida pela IG de hoje.** `checkConcordance` escolhe o limite por `usg.weeks`, que é a IG **atual** (`gestationalAge.ts:88-90,122`; iOS `GestationalAgeCalculator.swift:49-50,63`). Deveria ser a IG na data do exame. Exemplo: USG feita com 8 semanas e aberta 10 semanas depois recebe limite de 10 dias em vez de 5. **Isso aparece na tela do iOS.**

## 3. Trissomias (rastreamento combinado 11–13+6)

| Item | Evidência |
|---|---|
| Motor | `packages/shared/src/calculators/fmfTrisomy.ts:10` `FMF-R-extract-2026-06-26/v3+cal-2026-09-15c`, parâmetros do código R da FMF (`packages/fmf-trisomy/source/*.csv`) + calibração |
| Web | Só com `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION === 'true'` (`apps/web/src/lib/deterministic/organs/obstetrica.ts:485`, `morfologico.ts:504`). **Status em produção não verificado** (exigiria credenciais) |
| Android | `CalculatorsSheet.tsx:104-105`; `TrisomyCalculatorSheet.tsx:11,163-164` |
| iOS | `Services/TrisomyCalculator.swift` (porte do TS), `TrisomyCalculatorSheet.swift:113,116` |
| Evidência externa | Calibração contra o app oficial v1.0.44, com 560 leituras. **Desvio mediano de 5%, p90 de 20%** (T21: 6%/19%). Classificação T21 concorda em 256/264, e depois 292/301; as discordâncias ficam a ±16% dos cortes 1:100/1:1000 (`docs/fmf-comparacao-resultados-2026-09-14.md:192-232`; `packages/fmf/README.md:93-100`) |
| Ao vivo (28/09) | `apps/web/src/lib/calculators/trisomyFmf.test.mts` **35/35**. É regressão local, não validação externa |
| PDF | Não encontrado; o resultado é inserido como texto no laudo |
| Aviso | Nenhum "não certificado" nas telas de trissomia; apenas "a critério do médico assistente" (`fmfTrisomyFormatter.ts:39`) |

**Risco a levar ao Luiz (fora da landing):** a calibração foi feita "pelo driver CDP" (`fmfTrisomyParams.ts:6,80,94`; `packages/fmf/driver`). Já o gate de PE registra que a EULA da FMF proíbe "collect or harvest" (`packages/fmf/validacao/paridade-fmf.manual.mjs:4-6`). **Não mencionar o método de calibração publicamente** e avaliar a conformidade com a EULA.

## 4. Pré-eclâmpsia (riscos competitivos FMF)

| Item | Evidência |
|---|---|
| Motor | `packages/shared/src/calculators/preEclampsiaFmf.ts:5-13`: Wright D, Wright A, Nicolaides KH, *Am J Obstet Gynecol* 2020;223:12-23; PAM de Wright A 2015 UOG; IP uterino de Tayyar 2015 UOG. `:19` "NÃO é software certificado nem endossado pela FMF." Texto do laudo em `:650-660`: "Não constitui software certificado pela FMF." |
| Não é escore de pontos | O escore por pontos foi removido (Android `PreEclampsiaCalculatorSheet.tsx:51-52`). **Mas o iOS ainda diz** "FMF simplificado — fatores + MAP + uterinas" (`PlusSheet.swift:257`), rótulo incorreto |
| Disponibilidade | Web: `specs.ts:43-47`, exposta em Obstétrica/Morfológico (`obstetrica.ts:484`, `morfologico.ts:503`). Android: `CalculatorsSheet.tsx:97-98`. iOS: `PreEclampsiaCalculatorSheet.swift:97,100` |
| Ao vivo (28/09) | `node packages/fmf/validacao/paridade-fmf.manual.mjs` passa nos **8 pontos** lidos à mão no app oficial v1.0.44: risco em até ±1 unidade de "1 em N" e MoM em ±0,005. `port-typescript.manual.mjs`: **586 casos, 0 divergência** entre o motor validado e o porte TS usado pelos apps. Web `preEclampsia.test.mts` **41/41** |
| Limites registrados | Protocolo de 14/09: caso 01, local 1 em 284 × FMF 1 em 290 (−2%); caso 02, 889 × 910. Resíduo "local sempre um pouco mais alto" não explicado (`packages/fmf/README.md:127-130`; `docs/fmf-comparacao-resultados-2026-09-14.md:21-23`). **Não provado:** outras idades, alturas, etnias e paridades; IP uterino fora do ponto H; fora de 11–14 semanas; gemelar (recusado) (`README.md:143-145`) |

## 5. Copy segura para 4 cards

Tom descritivo, sem superlativo, sem número de desempenho.

1. **Doppler obstétrico**
   Percentis de artéria umbilical, cerebral média, relação cerebroplacentária, uterinas e ducto venoso pelas equações da calculadora da Fetal Medicine Barcelona, calculados a partir dos IPs e da idade gestacional.
2. **Idade gestacional e DPP**
   IG atual e data provável do parto pela DUM ou por uma ultrassonografia anterior, com a frase pronta para o laudo.
   *Não citar ACOG nem "concordância" até corrigir §2.*
3. **Rastreamento de trissomias**
   Risco combinado de T21, T18 e T13 entre 11 e 13+6 semanas, com base no modelo publicado pela Fetal Medicine Foundation, apresentado em "1 em N".
   *Rodapé obrigatório:* "Ferramenta de apoio; não é software certificado pela FMF." *Na web, só anunciar se a flag estiver ligada em produção.*
4. **Risco de pré-eclâmpsia**
   Risco de pré-eclâmpsia antes de 37 semanas pelo modelo de riscos competitivos da FMF (Wright et al., 2020), com história materna, pressão arterial média e IP das uterinas.
   *Rodapé obrigatório:* "Não constitui software certificado pela FMF. A decisão clínica é do médico."

**Não usar:**
- "certificado/validado/endossado pela FMF"
- "resultado igual ao app da FMF"
- "95%" ou qualquer taxa de detecção ou precisão
- "Barcelona FMF" ou "FMF Barcelona"
- "ACOG PB 700 (2022)"
- "IG pelo CCN"
- "relatório em PDF"
- "Hecher 2001"
- "FMF simplificado"
- "funciona igual em web, iOS e Android" (trissomias na web dependem de flag)

## 6. Correções sugeridas (para os donos do código; não aplicadas)

1. Rótulos de interface: Android `CalculatorsSheet.tsx:49,56,91`, `DopplerCalculatorSheet.tsx:133`; iOS `PlusSheet.swift:234,248,257`.
2. `checkConcordance` (shared e iOS): referência ACOG CO 700 (2017), faixa 14–15 semanas = 7 dias, limite escolhido pela IG **na data do exame**.
3. Confirmar em produção a flag `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION` antes de anunciar trissomias na web.
4. Revisão da EULA da FMF quanto à calibração automatizada (§3).

Fontes oficiais consultadas: [Fetal Medicine Barcelona — calculadora](https://fetalmedicinebarcelona.org/calc/), [Fetal Medicine Barcelona — início](https://fetalmedicinebarcelona.org/), [ACOG Committee Opinion 700 — Methods for Estimating the Due Date](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date) (limiares via [PDF oficial](https://www.acog.org/-/media/project/acog/acogorg/clinical/files/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date.pdf); a página HTML respondeu 403 ao acesso automatizado).
