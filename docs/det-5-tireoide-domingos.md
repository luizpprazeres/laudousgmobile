# DET-5 — TIREOIDE: escore Domingos calculável + TI-RADS automático

> Spec a partir das recomendações do Luiz (2026-06-13) + tabela oficial Domingos
> (screenshot anexado na sessão). **Mudança de direção vs. v1:** o renderer passa
> a CALCULAR a NOTA FINAL Domingos e derivar o TI-RADS por conta própria, em vez
> de só reproduzir o que foi ditado. Encaixa no princípio do DET-5 ("o código
> monta o laudo") e é o maior salto da categoria.

## 1. Escore Domingos — soma de pontos por característica

A NOTA FINAL é a SOMA dos pontos. Cada eixo contribui:

### Ecogenicidade — ANECOICA
| característica | pontos |
|---|---|
| Anecoica homogênea | 0 |
| Anecoica com finos ecos / área ecogênica que ocasiona reverberação do som | 0 |
| Anecoica com septos | 1 |
| Anecoica com componentes sólidos | 1 |

### Ecogenicidade — SÓLIDA
| característica | pontos |
|---|---|
| Hipoecoica | 3 |
| Isoecoica | 2 |
| Hiperecoica | 1 |
| Com áreas anecoicas (inclui isoecoica com áreas anecoicas) | 1 |
| Sólida com calcificação de parede (casca de ovo) | 0 |

### Margem
| característica | pontos |
|---|---|
| Regular | 0 |
| Irregular | 1 |
| Espiculada | 2 |

### Halo hipoecóico (somente na imagem sólida)
| característica | pontos |
|---|---|
| Fino e regular | 0 |
| Espesso e irregular | 2 |
| Sem halo | 1 |

### Forma
| característica | pontos |
|---|---|
| Mais alto que largo | 3 |
| (mais larga do que alta / não informado) | 0 |

### Dimensões (diâmetro transverso)
| característica | pontos |
|---|---|
| Até 0,9 cm | 0 |
| ≥1,0 até 2,9 cm | 1 |
| ≥3,0 cm | 2 |

### Calcificações
| característica | pontos |
|---|---|
| Sem | 0 |
| Casca de ovo | 0 |
| Grosseiras com sombra | 1 |
| Micro-calcificação | 3 |

### Vascularização (Chammas) — usada só para PONTUAR, NUNCA escrita no laudo
| característica | Tipo | pontos |
|---|---|---|
| Sem | I | 0 |
| Periférica | II | 1 |
| Periférica > Central | III | 2 |
| Central > Periférica | IV | 3 |
| Exclusivamente Central | V | 4 |

## 2. NOTA FINAL → TI-RADS (Categoria) → Características → Conduta

| NOTA FINAL | TI-RADS | Características | Conduta |
|---|---|---|---|
| até 3 | 1 | benignas | Controle Anual |
| 4 a 5 | 2 | provavelmente benignas | Controle ou Citopunção |
| 6 a 9 | 3 | intermediárias | Citopunção |
| ≥10 | 4 | suspeitas | Citopunção |

Exemplo (Luiz): imagem isoecoica (2) + margem regular (0) + 1,2×1,0×1,0 cm
(dimensão ≥1,0 → 1) + sem calcificações (0) + vascularização [periférica?] (1) =
**NOTA 4 → TI-RADS 2 (provavelmente benignas)**.
> ⚠️ AMBIGUIDADE A: no exemplo, "periférica > central" foi contado como 1, mas a
> tabela diz Tipo III (Periférica > Central) = 2 (→ NOTA 5, ainda TI-RADS 2).
> A tabela é a fonte. CONFIRMAR com o Luiz se "periférica" simples (Tipo II) = 1
> era a intenção.

## 3. Override verbatim (segurança)

Se o médico DITAR a nota, ela VENCE o cálculo de Domingos (reproduzir verbatim).
O campo `ti_rads_ditado` preserva a categoria ACR ditada, separada da faixa de
Domingos derivada da nota. Cálculo automático só quando o médico descreve as
características e NÃO fornece a nota pronta. (Mantém a regra antiga de "nunca
alterar valor ditado" como caso particular.)

## 4. Formatação do corpo (estilo clássico)

- Lobo normal: `Lobo direito medindo 3,1 x 1,2 x 1,8 cm (volume de 4,5 ml), de
  ecogenicidade, ecotextura e vascularização normais.` (sem Doppler: sem
  "vascularização").
- Lobo com achado — MANTÉM o volume em parênteses (≠ v1, que usava "com volume
  de"): `Lobo direito medindo 3,1 x 1,2 x 1,8 cm (volume de 4,5 ml), apresentando
  imagem isoecoica, com margem regular, medindo 1,3 x 1,4 x 1,5 cm, sem
  calcificações, mais larga do que alta, situada no terço inferior.`
  - Ordem: ecogenicidade → margem → medida → calcificações → forma → localização.
  - Terminologia "margem" (não "contornos").
  - Vascularização (Chammas) NÃO aparece no corpo.
- Múltiplos nódulos no mesmo lobo: separados por **";"**:
  `...situada no terço inferior; imagem hipoecoica, com margem espiculada, ...
  situada no terço médio.`

## 5. Conclusão e separação das escalas (W7, 09/10/2026)

A Nota de Domingos é uma escala própria. Não equivale ao ACR TI-RADS.
No clássico, com `show_domingos_score=true`, cada imagem apresenta `NOTA FINAL N
(características … pela escala de Domingos)`. Quando houver os cinco grupos
ACR suficientes, a categoria ACR aparece separadamente, calculada por esses grupos.
Com o toggle de Domingos desligado, só a classificação ACR independente é exibida,
se disponível; sem dados suficientes, não se inventa categoria.

## 6. Conferência com a tabela do Luiz, eixo a eixo

As tabelas das seções 1 e 2 foram conferidas com W7: anecoicas 0/0/1/1;
sólidas 3/2/1/1/0; margens 0/1/2; halo sólido 0/2/1; mais alto que largo 3;
diâmetro transverso 0/1/2; calcificações 0/0/1/3; Chammas I–V 0/1/2/3/4.
Faixas da Nota de Domingos: ≤3 categoria 1, 4–5 categoria 2, 6–9 categoria 3,
≥10 categoria 4. Não há categoria Domingos 5.

Foram acrescentados `isoecoica_areas_anecoicas`, `hipoecoica_areas_anecoicas` e
`hiperecoica_areas_anecoicas`, todos com 1 ponto e descrição que preserva a
ecogenicidade de base com áreas anecoicas. `isoecoica` sem esse componente mantém 2 pontos,
conforme a tabela. O Luiz confirmou nesta sessão W7: isoecoica = 2, hipoecoica = 3
e com áreas anecoicas = 1. A mensagem anterior com isoecoica = 3 está esclarecida;
não há divergência pendente de pontuação.

A medida explicitamente nomeada transversa prevalece. Sem ela, permanece a decisão
anterior de usar a maior das medidas. Os eixos omitidos continuam com zero e a
ecogenicidade continua ancorando o cálculo (TI-2 pendente, sem mudança nesta frente).
A tabela assume valores de diâmetro em décimos; o código compara `<1` e `<3`, sem
arredondar silenciosamente medidas mais precisas.

## 7. Recomendações de conduta

O toggle `show_conduct_recommendation` permanece desligado por padrão.
No clássico com Domingos visível e o toggle ligado, cada imagem com nota disponível
recebe conduta identificada como **TI-RADS de Domingos**: categoria 1 controle anual;
2 controle ou citopunção; 3 e 4 citopunção. A nota ditada vence o cálculo.
Sem nota disponível, não se emite recomendação de Domingos.
No clássico sem Domingos visível e no objetivo, permanece a conduta ACR independente,
com seus próprios critérios de categoria e diâmetro. Não se converte Nota de Domingos
em ACR, nem se usa a conduta de uma escala rotulada como a outra.

## 8. Estilo DIRETO/ENXUTO (web, sem IA) — NÃO confundir com o clássico

Variante separada (writing style enxuto). Corpo:
`Lobo direito medindo x x x cm (volume de x ml).` → linha `imagem isoecoica, …
(TI-RADS 2).` → linha `imagem hipoecoica… (TI-RADS 4).` Conclusão resume citando
nódulo + localização + TI-RADS, mantendo o item do volume. **Fora do escopo desta
onda (é outra variante); registrar para não misturar.**

## 9. Títulos e artérias

- Sem Doppler: `ULTRASSONOGRAFIA DA TIREOIDE`.
- Com Doppler: `ULTRASSONOGRAFIA DA TIREOIDE COM DOPPLER COLORIDO`, e ANTES da
  conclusão as linhas de pico sistólico das artérias tireoidianas.
- A artéria pode ser **inferior OU superior** conforme ditado (v1 fixava
  "inferior"): `Pico sistólico da artéria tireoidiana {inferior|superior}
  {direita|esquerda} de X cm/s.`
> ⚠️ AMBIGUIDADE B: o contrato/fonte viva usa "ULTRASSONOGRAFIA DE TIREOIDE";
> o Luiz escreveu "DA TIREOIDE". CONFIRMAR "DE" vs "DA".

## 10. Decisões (resolvidas 2026-06-13)

- A) Vascularização "periférica > central" = **2** (segue a tabela; Luiz confirmou). ✅
- B) Título = **"DA TIREOIDE"** (Luiz confirmou). ✅
- C) Diâmetro transverso = **a maior das 3 medidas** (ou o valor nomeado
  "transverso" quando o médico especificar — Dex1). ✅
- D) Halo: só na imagem sólida; não informado → 0 (default benigno). ✅
- E) Eixos não ditados → **0 pontos** (default benigno, "omitido → normalidade"),
  EXCETO ecogenicidade que ancora o cálculo (sem ela e sem nota ditada → sem nota).

## 11. Arquitetura (recomendação Dex1, aplicada)

- Extração devolve **enums por eixo** (ecogenicidade/margem/halo/forma/
  calcificações/vascularização) + `descricao_raw` p/ auditoria; **código soma**
  (zero LLM no cálculo). Robustez via enums fechados + normalização, não prompts.
- **Override verbatim:** nota/TI-RADS ditados pelo médico vencem o cálculo.
- **Toggles** em `account_report_preferences` (coluna **JSONB**, não tabela nova),
  carregados na MESMA query DET-3 → sem latência; route passa
  `runRendererStream({ rendererPreferences })`. **Conduta gerada em código**
  (TI-RADS→conduta, função pura), append no fim quando o toggle liga.
- **Faseamento:** ONDA 1 ✅ = renderer determinístico toggle-aware. ONDA 2 ✅ =
  migration JSONB + route lê/passa as prefs + endpoint GET/PATCH. **Resta: UI
  (lab/iOS) dos toggles + aplicar a migration em prod (@data-engineer/@devops).**

### ONDA 2 — arquivos (2026-06-13, reviews dex1+dex2 aplicados)
- `packages/db/src/sql/0012_det5_tireoide_renderer_prefs.sql` — ALTER TABLE
  account_report_preferences ADD COLUMN renderer_preferences jsonb (idempotente).
  **Registrado em `packages/db/src/migrate.ts`** (dex2 achou que faltava — sem
  isso `db:migrate` não criava a coluna e a geração virava 500). Numerado 0012
  para não colidir com `0011_showcase_samples.sql`.
- `packages/db/src/schema/accountReportPreferences.ts` — coluna `rendererPreferences`.
- `apps/api/src/server/db/lookups.ts` — `resolveAccountReportPreference(user, cat)`:
  resolve variante (DET-3) E toggles numa ÚNICA query (review dex1), com LEFT JOIN
  (não perde toggles quando `default_variant_id` é null). Substitui o antigo
  `resolveAccountVariantKey`.
- `apps/api/src/server/pipeline/renderer.ts` — `runRendererStream` recebe
  `rendererPreferences?` e repassa; `renderTireoide` mescla com defaults (robusto
  a parcial/null/lixo).
- `apps/api/src/app/api/generate/route.ts` — uma query resolve variante + prefs;
  passa ao renderer (sem 2ª query).
- `apps/api/src/app/api/me/report-preferences/route.ts` — GET expõe
  `renderer_preferences`; PATCH parcial grava (default_variant_id e os toggles
  independentes; `renderer_preferences:null` grava SQL null = limpa).

## 12. Reviews dex1 + dex2 (2026-06-13) — aplicados

Cálculo dos pontos, mapeamento NOTA→TI-RADS e conduta: **aprovados** (dex1).
Bugs corrigidos:
- **Override (dex1 #4 / dex2 #1, bloqueante):** o valor numérico que deriva o
  TI-RADS passou a respeitar a nota DITADA (antes usava a calculada) — "NOTA
  FINAL 10" não sai mais com "TI-RADS 1".
- **Registro histórico — ACR TI-RADS 5 ditado (dex2 #2):** mapas de características/conduta aceitam 5
  ("altamente suspeitas"); fora de 1-5 → omite (nunca "indeterminadas"/
  "correlação clínica" inventadas).
- **Halo em anecoica (dex2 #5):** halo só pontua/aparece em imagem SÓLIDA (guarda
  determinística) — cisto coloide não superpontua.
- **Sem ecogenicidade (dex2 #6):** "imagem nodular" em vez de "imagem ____".

Decisões mantidas (não bugs):
- **Toggles inertes até ONDA 2 (dex2 #3):** o route ainda não passa prefs;
  default Domingos ON/conduta OFF é o comportamento seguro. Wiring = ONDA 2.
- **Dimensão = maior medida (dex2 #4):** decisão do Luiz; Dex2 alerta over-score
  em nódulo alongado (ex.: 3,2 × 0,8 × 0,7 → dimensão 2 em vez de 0). **Aberto
  para o Luiz reconsiderar** (alternativas: exigir o médico nomear o transverso;
  ou usar a MENOR medida como proxy do transverso).
- **Bócio por VT alto sem a palavra (dex2 #7):** não inferimos volume por limiar
  (No-Invention); só quando o médico dita bócio/aumentado.

### Atualização W7 — limites da confirmação

As seções 10–12 preservam o histórico de decisões e implementação de junho. As
seções 5–7 descrevem o comportamento conferido em outubro; histórico não comprova
estado de produção ou aplicação de migrações. TI-2 segue pendente. Nenhuma mudança
no banco, nos toggles da interface ou no motor foi realizada por W7.
