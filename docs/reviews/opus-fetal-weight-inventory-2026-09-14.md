# Inventário: peso fetal estimado, percentis e classificação RCF

Data: 2026-09-14 · Tipo: auditoria somente leitura · Autor: agente (Opus)

Escopo lido: `laudousgmobile-def` (ativo), `laudousg` (legado web) e
`laudousg-swift/LaudoUSG` (iOS). Nenhum comando foi executado, nenhum teste foi
rodado e nenhum arquivo além deste foi alterado. As evidências de testes citadas
abaixo vêm de leitura do código ou de stories, não de uma execução nesta auditoria.

## 0. Três coisas diferentes

| Camada | Pergunta que responde | Entrada | Saída |
|---|---|---|---|
| **A. Fórmula de peso** (ex.: Hadlock 4, 1985) | Quantos gramas? | DBP, CC, CA, CF | PFE em g |
| **B. Curva de percentil** (ex.: Intergrowth-21st, Hadlock 1991, WHO 2017) | Onde esse peso cai para a IG? | PFE + IG (+ sexo) | percentil |
| **C. Classificação** (PIG/RCF, Gratacós/FMB 2024) | O que isso significa clinicamente? | percentil + Doppler + confirmações | classe/estágio |

Situação resumida:

- **Web e API (ativo): tudo é manual.** O peso (g) e o percentil são digitados ou
  ditados. O renderer só reproduz esses valores. A camada C existe e é
  determinística, mas depende de um percentil que o médico informou.
- **Mobile RN e iOS: existe uma calculadora de A+B sob demanda.** O médico abre a
  folha, digita as 4 medidas, e o bloco de texto resultante é inserido nos achados.
  Esse bloco segue o fluxo como se fosse texto ditado. Não é automático: nada é
  calculado sem ação do médico, e o resultado não alimenta a camada C.
- Não existe hoje, em nenhum dos três repositórios, cálculo de peso ou percentil
  que rode no pipeline do laudo sem ação do médico.

## 1. Camada A: fórmula de peso

### 1.1 Mobile RN: `apps/mobile/src/shared/calculators/hadlock.ts`

- Linhas 1-12: cabeçalho diz "Port literal do LaudoUSG iOS" com "fidelidade
  numérica absoluta". **Não há teste TS que comprove isso** (ver §5).
- Linhas 24-28: `WeightFormula = "hadlock4_1985"` (única opção).
- Linhas 309-312: `normalizeCm(v) = v > 20 ? v/10 : v`. Heurística de unidade.
- Linha 350: retorna `null` se qualquer medida normalizada for `<= 1` cm.
- Linhas 352-359: `log10(PFE) = 1,3596 − 0,00386·CA·CF + 0,0064·CC + 0,00061·DBP·CA + 0,0424·CA + 0,174·CF` (cm).
  Os coeficientes correspondem à fórmula publicada de Hadlock com DBP, CC, CA e CF
  (Hadlock FP et al., *Am J Obstet Gynecol* 1985;151:333-337). A auditoria iOS de
  2026-06-24 também marcou essa fórmula como verificada.
- Linhas 361-363: peso arredondado; `±15%` fixo (`efw * 0.15`).

### 1.2 iOS: `LaudoUSG/Services/HadlockCalculator.swift`

- Linhas 4-30: `BiometryInput` (dbp, cc, ca, cf, igWeeks, igDays, sex).
- Linhas 81-97: a mesma fórmula, `normalizeCm` e `±15%`.
- Linhas 136-144: `gestationalAgeByFemur` (IG pelo CF, Hadlock 1984). É IG, não
  peso. No ativo, o equivalente é usado só para plausibilidade
  (`apps/api/src/server/renderer/categories/biometriaFetal.ts:18,182`).

### 1.3 Onde o peso entra no laudo (ativo, manual)

- `apps/api/src/server/renderer/categories/OBSTETRICA.ts:52-54`: `peso_g`,
  `peso_variacao_g` e `percentil` são `z.number().nullable()`.
- `OBSTETRICA.ts:460`: prompt do structurer diz "peso_g em gramas; percentil e
  peso_variacao_g só se ditados".
- `OBSTETRICA.ts:812-817` e `1361-1366`: `pesoLinha` e `pesoLinhaObj` só reproduzem.
- `OBSTETRICA.ts:704-713`: peso médio e divergência ponderal no gemelar. É
  determinístico, mas usa os pesos informados.
- `OBSTETRICA.ts:1331` e `MORFOLOGICO.ts:747`: "Percentil é só reproduzido (nunca
  cruzado com a IG)".
- `MORFOLOGICO.ts:88-90`, `243`, `327-333`, `760-767`: o mesmo contrato no morfológico.
- Web: `apps/web/src/lib/deterministic/organs/obstetrica.ts:9` e
  `morfologico.ts:10` marcam "PENDENTE: percentil de peso". O peso é um campo de
  texto em `obstetrica.ts:274` e `morfologico.ts:338`.
- `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts:27-30` diz que o peso "sai do
  renderer, que tem a fórmula". **O renderer não tem fórmula.** Ele reproduz
  `peso_g` (`obstetricaParaCatalogo.ts:100-102`). O comentário descreve uma
  intenção, não o comportamento atual.
- Visão: `apps/api/src/server/vision/client.ts:48-53, 60, 81, 117-118, 147, 197`
  extrai o PFE impresso pelo aparelho. A fórmula e a curva do aparelho são
  desconhecidas.
- Plausibilidade: `apps/api/src/server/pipeline/deterministicSanity/obstetrica.ts:51-65`
  emite o aviso `WEIGHT_IG_MISMATCH`. A origem da tabela de faixas
  (`weightRangeForIG`, linhas anteriores a 46) não foi auditada.

## 2. Camada B: curvas de percentil

### 2.1 Implementação (RN `hadlock.ts` ≡ iOS `PercentileTable+*.swift`)

| Curva | RN | iOS | Faixa | Sexo | Estado |
|---|---|---|---|---|---|
| Intergrowth-21st, rótulo `intergrowth21st-2016-stirnemann` | `hadlock.ts:150-185` | `PercentileTable+Intergrowth.swift:11-65` | 22-40 sem | só unissex | tabela p3/p10/p50/p90/p97 por semana |
| "Hadlock 1991", rótulo `hadlock-1991-gardosi-mikolajczyk-2011` | `hadlock.ts:187-221` | `PercentileTable+Hadlock.swift:3-56` | 24-41 sem | só unissex | tabela por semana |
| WHO Multicentre 2017 (Kiserud) | `hadlock.ts:223-261` | `PercentileTable+WHOMulticentre.swift:3-31` | 14-40 | M/F/unissex | **vazia**, `PENDING-CURATION`, retorna `null` |

Método comum (`hadlock.ts:106-128`; `PercentileTable+Intergrowth.swift:67-73`;
`DopplerCalculator.swift:96`):

1. Interpola linearmente as bandas entre semanas pelos dias.
2. Usa `sigma = (p90 − p10) / 2,5631`, supondo distribuição normal simétrica.
   **p3 e p97 da tabela não são usados.**
3. Calcula `z = (peso − p50) / sigma`, converte z em percentil pela tabela z do
   Doppler Barcelona, arredonda para inteiro.
4. Rótulo: `< 3`, `> 97` ou `percentil N` (`hadlock.ts:130-134`).
5. Sinais: `isSGA = p < 10`, `isLGA = p > 90` (`hadlock.ts:390-391`).

Preferência de curva: iOS `Models/UserPreferences.swift:4-5,43-45` (padrão
Intergrowth) e `Features/Settings/PreferencesSection.swift:42-60`. No RN a curva
padrão está fixa em `hadlock.ts:342` e a folha não oferece escolha
(`HadlockCalculatorSheet.tsx:49-57`).

### 2.2 Legado web (não portado)

- `laudousg/lib/twinsCalculator.ts:33-50`: percentil de PFE gemelar ≥ 24 sem por
  sexo ("FMF Barcelona"). Os coeficientes masculinos (`214000`, `-9400`, `420`,
  `8000`) são números redondos, **com aparência de placeholder**, diferentes dos
  femininos (`225994.844`, …).
- `twinsCalculator.ts:52-59`: < 24 sem, "Hadlock" com `exp(0,578 + 0,332·IG − 0,00354·IG²)` e desvio padrão de 12,7%.
- `twinsCalculator.ts:11-31`: z para percentil por Abramowitz & Stegun.
- `twinsCalculator.ts:173-180`: sIUGR pelo percentil do menor feto `< p10`.

## 3. Camada C: classificação PIG/RCF

### 3.1 Motor atual (fonte de verdade)

`packages/shared/src/calculators/fetalGrowth.ts`, protocolo
`FMB-FETAL-GROWTH-DEFECTS-2024-11` (linhas 17-21).

- Linhas 1-15: "Este módulo NÃO calcula o percentil do peso".
- Contrato de entrada `FetalGrowthInput` (linhas 49-75): `efwPercentile` (0-100),
  `efwPercentileSource` (texto não vazio), IG opcional, Doppler e confirmações.
- Contrato de saída `FetalGrowthResult` (linhas 96-107): `classification`, `stage?`,
  critérios confirmados e pendentes, `warnings`, `conclusion`, `reportReference`,
  `protocolVersion`.
- Validação com exceção (linhas 135-153): `RangeError` ou `TypeError`.
- Regras: `< p3` gera estágio 1 confirmado (linha 177); Doppler só conta se o PFE
  estiver `< p10` (linhas 181-275); PIG exige Doppler completo e normal (linhas
  329-336); aviso antes de 24 sem (linhas 293-300).
- Port iOS: `Services/FetalGrowthCalculator.swift:98-222` (retorna `nil` em vez de
  lançar exceção).

Integração (ativo):

- `apps/api/src/server/renderer/categories/fetalGrowthModule.ts:19-31` define
  `FetalGrowthModuleSchema`, com todos os campos obrigatórios.
- `fetalGrowthModule.ts:97-122`: `renderFetalGrowthModule(module, semanas|null, dias|null)`
  retorna `{ achados[], conclusao[] }`.
- O renderer usa o módulo em `OBSTETRICA.ts:211, 1291-1292, 1726-1727` e
  `MORFOLOGICO.ts:126, 364-366`. O prompt manda usar `null` salvo percentil e fonte
  explícitos (`OBSTETRICA.ts:620-629`, `MORFOLOGICO.ts:268-273`).
- Web, adaptador: `apps/web/src/lib/catalog/fetalGrowthParaCatalogo.ts:21-127`.
  Percentil manual com validação bloqueante (linhas 28-41). Fonte padrão "não
  informada" (linhas 94-97). Doppler recalculado por `calcularDopplerParcial`
  (linhas 52-61).
- Web, UI: `apps/web/src/lib/deterministic/organs/fetalGrowth.ts:3-61`
  (`criarFetalGrowthModule`). Os campos **manuais** "Percentil do peso fetal" e
  "Curva do percentil" estão nas linhas 19-29; `compose` não gera texto (linha 60).
- Mobile: `apps/mobile/src/features/generate/FetalGrowthCalculatorSheet.tsx:43-95`.
  Percentil lido do texto ou digitado, com fonte padrão `"Intergrowth-21st"`
  (linha 44). Isso diverge do web, que agora usa "não informada".

### 3.2 Guard textual de conclusão (ativo)

`apps/api/src/server/pipeline/pesoFetalGuard.ts`, chamado em
`apps/api/src/app/api/generate/route.ts:1215`.

- `extractPesoFetal(rawInput)` (linhas 42-110) retorna `PesoFetalData` a partir de
  regex no ditado.
- `buildPesoFetalItems` (linhas 113-124): `< p3` e `< p10` geram P.I.G. salvo menção
  a restrição; `> p95` gera G.I.G.
- Não infere estágio de Gratacós pelo percentil (linhas 9-14, 141-148).

### 3.3 Legado conflitante

- Snippet `packages/knowledge/snippets/OBSTETRICA/regra/peso-fetal-percentil.md:23-30, 46-55, 74`
  (também existe em `MORFOLOGICO/` e `DOPPLER_OBSTETRICO/`) manda "p ≤ 3: SEMPRE
  estágio I de Gratacós" e "p 3-10 + 'restrição': estágio I". A origem é
  `laudousg/lib/categoryDefaults.ts:124-130, 145-151`.
- `laudousg/lib/rcfCalculator.ts:12-183` usa estágios `2a/2b`, calcula z do Doppler
  com fórmulas próprias, inclui **recomendações de manejo e parto** (linhas 124-181)
  e a lógica `efwPercentil >= 10 ? 'normal' : 'pig'` é inalcançável (linha 49).
  Rota em `laudousg/app/api/rcf-calculator/route.ts:15-16`.

## 4. Lacunas e riscos

Clínicos: exigem decisão do Dr. Luiz, nenhum foi corrigido.

1. **Par fórmula × curva.** O padrão combina PFE de Hadlock com a curva
   Intergrowth-21st. O padrão de PFE Intergrowth (Stirnemann et al., *Ultrasound
   Obstet Gynecol* 2017;49:478-486) foi construído com fórmula própria (CA + CC).
   Aplicar essa curva a um PFE de Hadlock precisa de validação clínica explícita.
2. **Proveniência das tabelas não verificada.** O rótulo "Hadlock 1991" cita
   "Gardosi/Mikolajczyk 2011", que são outra referência. Pela memória do auditor,
   os valores divergem da tabela original de Hadlock 1991 (*Radiology*
   1991;181:129-133): por exemplo, p50 com 40 sem ≈ 3619 g no artigo contra 3464 g
   no código. **Isso precisa ser conferido no artigo, não na memória.** A tabela
   Intergrowth também não foi conferida valor a valor, e o ano do rótulo (2016)
   difere da publicação (2017).
3. **Percentil gaussiano a partir de p10/p90** ignora a assimetria. Os extremos
   (p3, p97), justamente os que mudam a classificação, são os menos confiáveis.
   Já estava aberto como item #5 [CLÍNICO] em
   `laudousg-swift/LaudoUSG/docs/auditoria-calculadoras-2026-06-24.md:20-21`.
4. **IG fora da faixa não é recusada.** Abaixo da primeira semana (22 no
   Intergrowth, 24 no Hadlock) a `fraction` fica negativa e a banda é
   **extrapolada** linearmente (`hadlock.ts:177-184, 213-220`). Acima da última, a
   banda final é repetida. A folha RN oferece de 20 a 41 sem
   (`HadlockCalculatorSheet.tsx:22`), então 20-21 sem (Intergrowth) e 41 sem
   produzem percentis fora da curva, sem aviso.
5. **Limiar de GIG inconsistente:** `isLGA > p90` na calculadora contra `> p95` no
   guard e no snippet.
6. **Três regras diferentes para `< p3`:** o snippet diz "sempre estágio I", o
   guard não infere estágio, e o motor FMB 2024 confirma estágio 1. O snippet
   continua publicado (`status: published`).
7. Variação de ±15% é fixa, sem fonte citada e independente da IG.
8. Texto de ajuda iOS (`Features/Settings/PreferenceInfo.swift:27`) diz que o
   Intergrowth-21st foi "construído pela OMS". O Intergrowth é um consórcio
   independente; a curva multicêntrica da OMS é a de 2017. A "Referência da OMS"
   também aparece em `PreferencesSection.swift:59`.
9. Legado gemelar com coeficientes masculinos suspeitos e RCF com manejo
   desatualizado. **Não portar.**

De código e contrato:

10. `normalizeCm` (`> 20 → ÷10`) é ambígua. Com o valor em cm, CA de 35 cm ou CC de
    30 cm viram 3,5 ou 3,0 cm. Com o valor em mm, medidas ≤ 20 mm (DBP ou CF
    precoces) são lidas como cm. Item #6 da auditoria iOS, **não corrigido no port RN**.
11. `decimal()` usa `parseFloat` e aceita `"72abc"` (`HadlockCalculatorSheet.tsx:184-187`).
12. Percentil retornado como inteiro. Um `2,6` vira `3`, que pula a fronteira do p3
    (`hadlock.ts:117, 127`).
13. Curva de retorno `50` quando falta banda (`hadlock.ts:282, 290`). Hoje é
    inalcançável por causa do clamp, mas é um fallback clínico silencioso.
14. O resultado da calculadora vira texto livre (`generate.tsx:943-947`, `APPEND_TEXT`),
    sem proveniência estruturada (fórmula, curva e versão se perdem após o
    structurer). O bloco escreve "percentil N Intergrowth-21st" sem a palavra
    "curva" (`hadlock.ts:328`).
15. O sexo é sempre `unisex` no RN. A WHO por sexo não existe em lugar nenhum.
16. Não há calculadora de peso nem de percentil no web (`docs/parity/feature-parity-matrix.md:49, 61`).
17. O comentário de `obstetricaParaCatalogo.ts:27-30` contradiz o renderer (§1.3).

## 5. Testes existentes

| Arquivo | Cobre | Observação |
|---|---|---|
| `laudousg-swift/.../LaudoUSGTests/HadlockCalculatorTests.swift:5-111` | A+B (iOS) | Só testa se o resultado não é nulo ou está acima/abaixo de 50. **Nenhum valor numérico esperado.** WHO é pulado. |
| `laudousg-swift/.../LaudoUSGTests/FetalGrowthCalculatorTests.swift` | C (iOS) | Não lido linha a linha. |
| TS para `calcularHadlock` | não existe | Nenhuma referência fora da folha (busca por `calcularHadlock`). |
| `tests/fetal-growth/runner.ts:21-242` | C + integração web→renderer | Limiares p3/p10, confirmações, aviso < 24 sem, OBST/MORFO. |
| `apps/web/tests/fetalGrowthPercentile.manual.ts`, `fetalGrowthSource.manual.ts`, `fetalGrowthContext.manual.ts` | percentil manual e fonte | Execução registrada em `docs/stories/2026-09-14-web-percentil-pendencias.md:32-38` e `...-web-percentil-fonte.md:31-38`. |
| `apps/api/src/server/pipeline/__tests__/pesoFetalGuard.manual.ts` | guard textual | Inclui a ausência de Gratacós com p2 (linha 120). |

Não há golden numérico que compare PFE ou percentil com valores publicados.

## 6. Referências científicas citadas no código

- Hadlock FP et al., 1985: fórmula DBP/CC/CA/CF (`hadlock.ts:2, 352`).
- Hadlock FP et al., 1991: curva de peso intrauterino (rótulo com
  Gardosi/Mikolajczyk 2011, inconsistente).
- INTERGROWTH-21st, Stirnemann et al.: padrão de PFE (rótulo 2016).
- WHO Fetal Growth Charts, Kiserud et al. 2017 (tabela vazia).
- Fetal Medicine Barcelona, "Fetal growth defects", nov/2024: classificação
  (`fetalGrowth.ts:4-7`).
- Tabela z do Doppler Barcelona, reutilizada para o peso (`hadlock.ts:80`).

## 7. Recomendação conservadora

1. **Não ligar cálculo no pipeline agora.** Manter web e API como estão: peso e
   percentil manuais, com a fonte explícita e "não informada" como padrão. Continuar
   chamando isso de manual.
2. **Decisões clínicas antes de qualquer código** (Dr. Luiz):
   - par fórmula × curva padrão (Hadlock + curva compatível, ou fórmula Intergrowth + curva Intergrowth);
   - limiar de GIG (p90 ou p95);
   - faixa de IG aceita por curva (recusar fora dela);
   - aposentar ou reescrever o snippet `peso-fetal-percentil.md` (§4.6);
   - uso do sexo fetal.
3. **Curadoria de fontes:** transcrever as tabelas diretamente dos artigos, com
   DOI, tabela e página por versão, e revisão dupla. Se possível, usar as equações
   publicadas (média/DP, LMS ou quantis) em vez da gaussiana p10/p90.
4. **Motor puro em `packages/shared`,** com três funções separadas: `estimateFetalWeight`
   (A), `efwPercentile` (B) e a `classifyFetalGrowth` que já existe (C).
   - Unidade explícita (mm) sem heurística.
   - Recusar com motivo, em vez de fazer clamp, extrapolar ou devolver 50.
   - Percentil com uma casa decimal e comparação de limiar antes do arredondamento de exibição.
   - Saída com `formulaId`, `curveId`, `curveVersion` e `sexUsed`.
5. **Golden tests** que reproduzam valores publicados (bandas por semana e exemplos
   de PFE) antes de qualquer consumo. Port iOS e RN validados contra o mesmo golden.
6. **Integração em modo sugestão:** o valor calculado aparece como "calculado pelo
   sistema — conferir", o médico aceita explicitamente, e só então preenche
   `percentil`/`efwPercentileSource`. A camada C nunca recebe um percentil calculado
   sem essa confirmação. Nunca inferir PIG ou estágio de Gratacós só pelo cálculo.
7. **Não portar** `laudousg/lib/twinsCalculator.ts` (EFW) nem `rcfCalculator.ts`.
