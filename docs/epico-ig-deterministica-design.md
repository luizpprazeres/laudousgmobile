# Épico IG determinística — Design técnico (DET, 2026-06-17)

> Implementação da regra Dr. Domingos para a **idade gestacional (IG)** da conclusão
> obstétrica + frase da 1ª US/DUM como dado estruturado + percentis Doppler usando a
> IG de referência. Afeta **OBSTETRICA, MORFOLOGICO, DOPPLER_OBSTETRICO**.
>
> Plano-mãe: `docs/plano-ig-deterministica.md`. Memória: `[[epico-ig-deterministica]]`.

## 1. Estado atual (verificado no código, 2026-06-17)

- `renderer/categories/OBSTETRICA.ts` e `MORFOLOGICO.ts` montam a conclusão com
  `formatIg(ig_semanas, ig_dias)` → `"Gestação em torno de X semanas e Y dias."`,
  **direto da biometria ditada**. A referência (1ª US/DUM) NÃO entra na conclusão;
  `dum` é só impresso como linha `DUM: X.` no topo.
- `pipeline/dopplerOverlay.ts` **não recebe IG**. Percentis são ditados; a frase de
  uterinas >P95 é genérica ("...para a idade gestacional").
- **Reuso disponível:** `packages/shared/src/calculators/gestationalAge.ts` já tem a
  aritmética de datas pura (`calcByUSG`, `calcByDUM`, `parseDateBR`, `addDays`,
  `diffDays`) e gera `insertBloco` quase no formato desejado. **PORÉM** seu
  `checkConcordance` usa thresholds **ACOG PB 700 por IG (5/7/10/14/21 dias)** e trata
  **DUM como base** (troca p/ USG quando discorda) — doutrina OPOSTA à do Dr. Domingos
  (âncora = biometria atual). → Reusar só a aritmética; a REGRA é nova.

## 2. Princípio clínico (Dr. Domingos) — a regra

**A âncora é SEMPRE a biometria atual.** A referência precoce (US precoce **ou** DUM,
escolha do médico) só aparece na conclusão quando há divergência relevante.

| Caso | Condição | Conclusão (Clássico) |
|---|---|---|
| sem_referencia | sem 1ª US/DUM | `Gestação em torno de {A}.` |
| concordante | \|A − R_hoje\| = 0 | `Gestação em torno de {A}.` |
| divergente_leve | \|A − R_hoje\| ≤ threshold | `Gestação em torno de {A}.` (só biometria) |
| divergente | \|A − R_hoje\| > threshold **e** corrigir=true | `Gestação em torno de {A} pela biometria atual, devendo ser corrigida pela {fonte}, compatível com {R_hoje}.` |
| divergente (sem correção) | > threshold **e** corrigir=false | `Gestação em torno de {A}.` (âncora pura) |

- `A` = IG da biometria atual (ditada). `R_hoje` = IG de referência **corrigida p/ a
  data do exame**.
- **Objetivo** (estilo TÉCNICA/ACHADOS/IMPRESSÃO) no caso `divergente`: 2 itens —
  `1) Gestação em torno de {A} pela biometria atual.`
  `2) Gestação em torno de {R_hoje} corrigido pela {fonte}.`
- `{fonte}`: USG precoce → `ultrassonografia precoce`; DUM → `data da última menstruação`.

### Frase da referência (prosa, no corpo) — dado estruturado, NÃO texto da IA
- USG precoce: `Primeira ultrassonografia realizada {data} com {IG_na_data}. Hoje com {R_hoje}.`
- DUM (rascunho, CONFIRMAR): `Data da última menstruação em {data}, correspondente a {R_hoje} na data do exame.`

## 3. Cálculo de R_hoje (determinístico)
- **USG precoce:** `R_hoje_days = (sem_na_data*7 + dia_na_data) + diffDays(data_exame, data_us)`.
- **DUM:** `R_hoje_days = diffDays(data_exame, data_dum)`.
- **R_hoje ditado direto** ("hoje está com 20 e 3"): usa direto, sem aritmética.
- `diff = A_days − R_hoje_days` (com sinal); `caso` decide por `|diff|`.
- `threshold(A_sem)`: **default plano = 5 dias** (Domingos, conforme briefing).
  Parametrizado numa função → trocar p/ ACOG por-IG é 1 linha. **[QUESTÃO ABERTA #1]**

## 4. Toggle / comando de correção
- `corrigir` (bool) controla SÓ o caso `divergente`: se false, nunca emite a cláusula
  "devendo ser corrigida" / 2º item — âncora pura na biometria. A frase-prosa da
  referência pode continuar (informativa).
- Fonte do valor (precedência): **comando de voz** ("correlacione com a primeira US" /
  "corrija pela DUM" → true; "não corrigir" → false) **>** toggle da conta
  (`renderer_preferences.correct_ig_by_reference`) **>** default.
- Default proposto: **true** (doutrina do épico). **[QUESTÃO ABERTA #2]**

## 5. Fluxo de dados — app passa DADOS, não frase
Dois caminhos que convergem no mesmo `IgInput`:
- **(B1) Extração do ditado** (sem mudança no app, vale já): estender o schema de
  extração de OBSTETRICA/MORFOLOGICO com `primeira_us {data, ig_semanas, ig_dias}`,
  `data_exame`, e reusar `dum`. O LLM extrai da prosa ditada.
- **(B2) Campos estruturados no GenerateRequest** (robusto; iOS/dex1 depois):
  `obstetric_context { data_exame, primeira_us{...}, dum, corrigir_ig }`. Seed/override
  da extração no route.
- **Determinismo da "data de hoje":** NUNCA usar `now()` do servidor (quebra
  byte-stability E é a determinação errada). `data_exame` vem do app (device today) ou
  do ditado. Sem `data_exame` e sem `R_hoje` ditado direto → não corrige (degrada p/
  biometria pura), nunca quebra.

## 6. Percentis Doppler usam a IG de referência
- `dopplerOverlay` passa a aceitar uma IG de referência opcional (`R_hoje` quando
  existe, senão biometria). Hoje os percentis são ditados — a parametrização habilita
  o cálculo determinístico futuro de percentil de uterinas a partir da IG correta.
  Escopo desta fase: **parametrizar a entrada**, sem mudar a frase genérica ainda.

## 7. Arquitetura — "fluxograma como dados" (1º candidato)
Módulo PURO único `apps/api/src/server/renderer/ig.ts` com TODA a regra Domingos +
construção de frases (clássico/objetivo) + `R_hoje`. Reusa a aritmética de
`gestationalAge.ts`. OBSTETRICA, MORFOLOGICO e o Doppler importam dele. A regra fica
num lugar só, auditável, testável, e é o embrião da tabela-de-decisão declarativa.

## Decisões (pós pressure-test Dex1+Dex2, 2026-06-17 — IMPLEMENTADO)
1. **Threshold:** plano 5 dias (Domingos). Dex1 endossou; parametrizado em
   `igThresholdDays()` — trocar p/ ACOG por-IG é 1 linha. `diff === 5` = leve (não
   corrige; golden explícito do off-by-one). **[ainda confirmar com o Luiz se 5 plano
   é a doutrina final ou se quer ACOG por-IG.]**
2. **Default `corrigir` = true** (Domingos; Dex1 confirmou). Precedência: voz > toggle
   da conta > true. `DEFAULT_CORRIGIR_IG` em ig.ts.
3. **Frase DUM:** clássico cita "data da última menstruação"; prosa = "Data da última
   menstruação em {data}, correspondente a {R_hoje} na data do exame." (rascunho —
   **confirmar redação com o Luiz**).
4. **biometria ausente:** caso `sem_biometria` → placeholder `____`, NUNCA referência
   como âncora (Dex1+Dex2 CRÍTICO). Referência pode ir na prosa do corpo.
5. **Wording:** mantido VERBATIM do briefing do Luiz ("devendo ser corrigida pela
   {fonte}, compatível com {R_hoje}"). Dex1 sugeriu alternativa "com idade gestacional
   corrigida pela ..." — **registrado para o Luiz escolher** (é a voz clínica dele).
6. **Precedência 1ª US vs DUM** (Dex2 #6): **US precoce vence DUM** (clinicamente mais
   confiável). `buildIgInput` checa USG primeiro. `dum` segue impresso como cabeçalho.
7. **Gemelar/CCN** (Dex2 #7/#8): a conclusão data a GESTAÇÃO (não cada feto) — âncora =
   `ig_semanas/ig_dias` global ditada (= comportamento atual). IG por feto fica fora do
   escopo. Inicial/CCN: IG vem de `ig_semanas` (o aparelho deriva do CCN; o médico dita
   a IG) — sem cálculo CCN→IG; sem IG ditada → placeholder.

## Status de implementação (2026-06-17)
- `apps/api/src/server/renderer/ig.ts` — módulo puro (regra + frases + R_hoje + adaptador
  `buildIgInput`). Parse ESTRITO (rejeita rollover). Importa só `parseDateBR` (sem now()).
- Extração estendida em OBSTETRICA/MORFOLOGICO (data_exame, primeira_us_*, ig_referencia_hoje_*, corrigir_ig).
- Renderers fiados (clássico + objetivo, OBST + MORFO), atrás da flag **`IG_REFERENCE_CORRECTION`**
  (env, default OFF). Flag OFF = byte-idêntico ao legado.
- Bombas dex2 defusadas: #1 (sem now), #2 (parseDataStrict), #3 (igParaPercentil com fonte
  explícita, sem fallback silencioso). #11 (uterinasAcimaP95 fora de hasDopplerData) = fix
  separado, registrado.
- Testes: `__tests__/ig.manual.ts` (40) + `ig-renderer.manual.ts` (11) + harnesses
  OBST/MORFO existentes (76) verdes. Typecheck limpo.
- **PENDENTE:** GenerateRequest.obstetric_context (B2, iOS/dex1); ligar a flag em prod
  após validação do Luiz; consumo de `igParaPercentil` no Doppler (futuro).
