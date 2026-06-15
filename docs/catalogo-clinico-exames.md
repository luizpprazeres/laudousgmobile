# Catálogo clínico dos exames — opções e variações por categoria

> **Para que serve este documento.** É a especificação clínica estruturada de
> cada exame: quais estruturas tem, o que é normal por padrão, e cada achado
> possível com suas **opções e variações**. Dupla função:
>
> 1. **Modelo web SEM IA** (seleção de opções): cada estrutura e cada achado
>    aqui vira um campo de formulário; o laudo é montado por construção a partir
>    das seleções, sem LLM.
> 2. **Renderer determinístico (DET-5)**: este catálogo é a fonte do schema de
>    achados + biblioteca de frases de cada categoria (`apps/api/src/server/
>    renderer/`). Migrar uma categoria para o renderer = formalizar a seção dela
>    aqui.
>
> Fonte clínica: revisões do Luiz no showcase + prompts validados em uso real
> (`~/laudousg/lib/categoryDefaults.ts`). **Atualizado conforme cada categoria é
> revisada — ver "Estado por categoria" abaixo.**
> Última atualização: 2026-06-12.

## Convenções de notação

- **Estrutura**: órgão/segmento avaliado. Cada uma tem um **estado**:
  `normal` (frase padrão), `alterado` (um ou mais achados), ou estados especiais
  (`ausente_cirúrgico`, `não_avaliado_por_gases`).
- **Default**: o que é escrito quando o médico não diz nada sobre a estrutura
  (= normal). Princípio: silêncio → normalidade, NUNCA inventar achado.
- **Achado**: alteração com **campos** (medidas, localização, grau…) e
  **variações** (opções mutuamente exclusivas).
- **Medida ausente** → placeholder `____` (nunca inventar número). Algumas
  medidas são opcionais (omite a cláusula inteira se não informada) — marcado.
- **Corpo** = frase em "OS SEGUINTES ASPECTOS FORAM OBSERVADOS"; **Conclusão**
  = item diagnóstico numerado.

## Estrutura fixa do laudo (quase todas as categorias)

```
TÍTULO (caixa alta)
COMENTÁRIOS:          ← técnica/protocolo de aquisição (texto fixo)
OS SEGUINTES ASPECTOS FORAM OBSERVADOS:   ← descrição por estrutura
CONCLUSÃO:            ← itens diagnósticos numerados (1, 2, …)
```
- Conclusão de **item único** → sem numeração "1)".
- Conclusão com achados → último item é o fechamento "Demais … sem evidência
  de alterações" (quando aplicável à categoria).
- Documentação fotográfica: "obtida segundo protocolo internacional…"
  (NUNCA "em N fotos").

## Estado por categoria

| Categoria | Catalogada | Renderer | Pendências |
|---|---|---|---|
| ABDOMEN_TOTAL | ✅ completa | ✅ prod | velocidades na tabela doppler |
| ABDOMEN_SUPERIOR | parcial (herda abdome) | ⬜ writer | aplicar lógica vesícula |
| TIREOIDE | ✅ | ✅ renderer (programático) | VT somado em código; difusa/Graves via `ecotextura_alterada`; bócio via `volume_glandular` ditado; reviews dex1+dex2 aplicados |
| PROSTATA_SUPRAPUBICA | ✅ | ⬜ writer | cálculo volume/peso → renderer |
| DOPPLER_ARTERIAL_MMII | ✅ | ⬜ writer | — |
| MORFOLOGICO (1t/2t/3t) | ✅ | ✅ renderer (programático) | byte-estável |
| OBSTETRICA (+ gemelar) | ✅ | ✅ renderer (programático) | peso médio/divergência calculados em código |
| MUSCULOESQUELETICO_V2 | ✅ | ⬜ writer | antiga inativa (consolidada) |
| DOPPLER_RENAL | ✅ | ⬜ writer | doc nos comentários (writer ainda usa o longo) |
| DOPPLER_VENOSO (completo/TVP) | ✅ | ⬜ writer | revalidar amostra (429 OpenAI) |
| DOPPLER_OBSTETRICO | ✅ | ⬜ writer | — |
| ESCROTAL | ✅ | ⬜ writer | — |
| GLANDULAS_SALIVARES | ✅ | ⬜ writer | — |
| MORFOLOGICO (1t/2t/3t) | ⬜ | ⬜ writer | rework S2 |
| OBSTETRICA (+ gemelar) | ⬜ | ⬜ writer | spec gemelar S2 |
| MUSCULOESQUELETICO | ⬜ | ⬜ writer | consolidar V2 |
| demais (mama, pelve, vias, cervical…) | ⬜ | ⬜ writer | — |

---

# ABDOMEN_TOTAL

**Título:** ULTRASSONOGRAFIA DO ABDOME TOTAL
**Variante Doppler:** título ULTRASSONOGRAFIA DO ABDOME TOTAL COM DOPPLER
COLORIDO + tabela do sistema esplâncnico ao final.
**Comentários (fixo):** "Exame realizado com transdutor de 4.0 MHz,
inicialmente do abdome superior com paciente em jejum e posteriormente com a
bexiga repleta do abdome inferior. … A documentação fotográfica foi obtida
segundo protocolo internacional…"

## Estruturas (ordem fixa no corpo)
fígado · veia porta · vesícula biliar · vias biliares · baço · pâncreas ·
rim direito · rim esquerdo · veia cava inferior · aorta · bexiga.
(extra-abdominal: derrame pleural.)

### Fígado
- **Default:** "Fígado de dimensões normais, contornos regulares e ecotextura
  homogênea. / Os vasos intra-hepáticos são bem visíveis e de calibre anatômico."
- **Achados:**
  - **Esteatose** — variação por grau:
    - leve → corpo "…com discreto aumento da ecogenicidade parenquimatosa." /
      conclusão "Esteatose hepática, grau leve."
    - moderada → corpo "…apresentando aumento difuso da ecogenicidade
      parenquimatosa e atenuação sonora." (vasos parcialmente visualizados) /
      conclusão "Esteatose hepática, grau moderado."
    - (acentuada análoga)
  - **Cisto simples** — campos: medidas, localização (segmento, romano) →
    corpo frase de imagem anecoica / conclusão "Cisto hepático sem septações
    no segmento X."
  - **Doença hepática crônica**, **área poupada de esteatose** (na fonte —
    a catalogar quando entrar no renderer).

### Veia porta · Vias biliares · Baço — default simples
- Veia porta: "Veia porta de calibre normal." (variante doppler: "+ fluxo
  hepatopetal. Veias hepáticas de calibre e fluxo normais.")
- Vias biliares: "Canal hepático e canal colédoco de calibre normal."
  (colédoco alargado: "…canal colédoco medindo X cm." / conclusão "Canal
  colédoco acima dos limites habituais, sem evidência de cálculos.")
- Baço: "Baço de dimensões normais e ecotextura sólida e homogênea."

### Vesícula biliar — ⭐ lógica completa (modelo de referência)
Ordem de decisão (o renderer segue exatamente esta árvore):

1. **Ausência de vesícula** (colecistectomia) →
   corpo: "Ausência da imagem da vesícula biliar (paciente submetida à
   colecistectomia)." — **NÃO entra na conclusão**.
2. **Há vesícula** → o corpo SEMPRE começa com o prefixo:
   - **default:** "Vesícula biliar de topografia usual e parede fina"
   - **parede espessada** (só quando informado): "Vesícula biliar de topografia
     usual, com parede espessada, medindo X cm no seu maior diâmetro"
     → conclusão: "Espessamento da parede da vesícula biliar. Convém, a
     critério clínico, correlacionar com exames laboratoriais para investigação
     da possibilidade de colecistite."
3. **Conteúdo (cálculos)** — anexado ao prefixo com ", apresentando…":
   - **cálculo único:** "…apresentando imagem hiperecoica, {mobilidade},
     medindo X centímetros no seu maior eixo, ocasionando sombra acústica."
   - **múltiplos cálculos:** "…apresentando múltiplas imagens hiperecoicas,
     {mobilidade}[, a menor medindo aproximadamente X centímetros], ocasionando
     sombras acústicas."
   - conclusão (qualquer cálculo): "Litíase da vesícula biliar."
- **Campos / variações:**
  - **mobilidade** (à mudança de decúbito): `móvel` (default) | `imóvel`.
    Plural "móveis/imóveis à mudança de decúbito".
  - **medida do cálculo único:** obrigatória (placeholder ____ se ausente).
  - **"a menor medindo X" (múltiplos):** OPCIONAL — omitir a cláusula inteira
    se não informada (nunca placeholder aqui).
  - terminologia preservada (cálculo vs concreção): o termo do médico é mantido.
- **Regra de ouro do final:** sempre "ocasionando sombra(s) acústica(s)",
  NUNCA "com sombras acústicas".

### Pâncreas
- **Default:** "Pâncreas de ecotextura habitual para a faixa etária. A cabeça,
  o corpo e a cauda apresentam dimensões normais."
- **Não avaliável por gases:** "Pâncreas visualizado parcialmente devido à
  interposição de gases intestinais."

### Rim direito / Rim esquerdo (mesma lógica, lado espelhado)
- **Default:** "Rim {lado} com diâmetros longitudinais e anteroposterior dentro
  dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura
  do seio renal e ecotextura córtico medular normais."
- **Achados:**
  - **cisto simples** — campos medidas + localização (polo superior/terço
    médio/polo inferior) → conclusão "Cisto simples no rim {lado}."
  - **imagem cística complexa** (calcificação/septação/componente sólido) —
    NÃO chamar de cisto simples → corpo descreve a complexidade / conclusão
    "Imagem cística no rim {lado} com {característica}."
  - **litíase** — campos medida (maior eixo) + localização (cálices
    superiores/médios/inferiores) → conclusão "Litíase renal {direita/esquerda}."

### Veia cava · Aorta
- Veia cava: "Veia cava inferior de calibre e contornos normais."
- Aorta default: "Aorta abdominal de calibre e contornos normais."
- **Ateromatose:** "Aorta abdominal de calibre normal, apresentando imagens
  hiperecoicas aderidas às suas paredes." / conclusão "Placas de ateromas na
  aorta abdominal."

### Bexiga
- **Default:** "Bexiga de forma, contorno e ecotextura normais."
- **Volume pré-miccional** (quando informado): "…Volume pré-miccional de X
  mL/cm³."

### Extra-abdominal — Derrame pleural
- corpo: "{Pequena/Moderada/Grande} quantidade de líquido no espaço pleural,
  {bilateralmente/à direita/à esquerda}." / conclusão "Derrame pleural {grau}
  {lateralidade}."

## Conclusão (regras de montagem)
- 0 achados → item único "Órgãos e estruturas abdominais estudadas sem
  evidência de alterações ecográficas."
- ≥1 achado → itens na ordem do corpo, numerados, + fechamento final "Demais
  órgãos e estruturas abdominais estudadas sem evidência de alterações
  ecográficas."

## Estilo OBJETIVO (TÉCNICA/ACHADOS/IMPRESSÃO) — Sprint 3

Estilo alternativo (writing_style OBJETIVO = `44444444-4444-4444-8444-444444444444`),
montado **programaticamente** por `assembleAbdomenObjetivo(...)`
(`renderer/phrases/ABDOMEN_TOTAL.ts`), despachado em `pipeline/renderer.ts` quando
`isEstiloObjetivo(writingStyleId)`. **NÃO usa o `template_body`** (que é clássico e
fica LIVE em prod — 744 laudos/dia — intocado). O fluxo do abdome continua igual
(extração tipada → `renderOrgan` por órgão → `renderFreeSlots` para achados fora
do catálogo); só ao FINAL, se objetivo, monta-se TÉCNICA/ACHADOS/IMPRESSÃO em vez
de preencher o template.

- **Reuso total das frases clínicas:** órgão ALTERADO usa o `body` do `renderOrgan`
  (as MESMAS frases do clássico — o conteúdo clínico não muda, só os cabeçalhos/
  estrutura); órgão NORMAL usa a frase normal por órgão (`ORGAO_NORMAL_OBJETIVO`,
  transcrita do modelo "Abdome Total" do nReport); free-slots (LLM secundário)
  continuam sendo chamados e inseridos no ACHADOS após o corpo do órgão.
- **Cabeçalhos:** `ULTRASSONOGRAFIA DE ABDOME TOTAL` + `TÉCNICA:` + `ACHADOS:` +
  `IMPRESSÃO:`.
- **TÉCNICA:** "Exame realizado com transdutor convexo multifrequencial."
- **ACHADOS:** frases dos órgãos na **ordem fixa** (fígado, veia porta, vias
  biliares, vesícula, pâncreas, baço, rim D, rim E, veia cava, aorta, bexiga) +
  free-slots por órgão + extra-abdominais.
- **IMPRESSÃO:** os itens de conclusão (`renderOrgan.conclusao` + conclusões dos
  free-slots + extra-abdominais), numerados quando >1; 0 itens → "Estudo
  ultrassonográfico do abdome sem alterações significativas." (sem o fechamento
  "Demais órgãos..." do clássico). Colecistectomia descreve no corpo mas NÃO
  entra na impressão (regra curada preservada).
- 1 casa decimal nas medidas (herdada das frases compartilhadas).

**Verificação:** golden `abdomen-objetivo-golden.manual.ts` (testa
`assembleAbdomenObjetivo` + `renderOrgan`, casos só catálogo — sem LLM) + boletim
`docs/abdomen-objetivo-boletim.html`.

---

---

# TIREOIDE

**Título:** ULTRASSONOGRAFIA DA TIREOIDE (variante com Doppler:
ULTRASSONOGRAFIA DA TIREOIDE COM DOPPLER COLORIDO + picos sistólicos das
artérias tireoidianas inferiores ou superiores conforme ditado).
**Comentários (fixo):** transdutor de 12 MHz, todos os segmentos da glândula +
cadeia ganglionar cervical I a V.
**Rodapé fixo:** escore de nódulo Domingos Correia da Rocha + ACR.

## Estruturas: lobo direito · lobo esquerdo · istmo (+ linfonodos cervicais)

### Lobo (direito/esquerdo) e istmo
- **Default (normal):** "Lobo {lado} medindo X x X x X cm (volume de X ml), de
  ecogenicidade, ecotextura e vascularização normais." (sem Doppler: omitir
  "vascularização"). Istmo: "...de ecogenicidade e ecotextura normais."
- **Com achado (imagem nodular)** — ⚠️ NÃO usar a palavra "nódulo" no corpo:
  "Lobo {lado} medindo X x X x X cm, com volume de X ml, apresentando imagem
  {ecogenicidade}, de contornos {regulares/lobulados/irregulares}, mais larga
  do que alta (ou mais alta do que larga), sem calcificações (ou com…),
  medindo X x X x X cm, situada {no terço médio/…}."
  - NÃO escrever "parênquima homogêneo" no lobo que tem achado.
  - **Campos:** ecogenicidade (anecoica/hipoecoica/isoecoica/hiperecoica/
    heterogênea/anecoica com finos ecos), contornos, formato (mais larga do que
    alta = sinal de benignidade), calcificações, localização, medidas.
- **Vascularização (Chammas):** NÃO descrever a classificação de Chammas no
  laudo, mesmo se ditada.

### Conclusão (condicional)
- **Sem nódulo/cisto:** item único "Tireoide de volume normal (VT ml), sem
  evidência de alteração ecotextural ou de imagem nodular." (VT = lobos + istmo)
- **Com nódulo/cisto:**
  1. "Tireoide de volume normal (VT ml)." (SEM a frase de normalidade)
  2. (UM item por lobo; imagens do mesmo lobo no MESMO item, separadas por ";")
     "Lobo {lado} apresentando imagem {ecogenicidade} {localização} com NOTA FINAL
     {N} (características {benignas/provavelmente benignas/intermediárias/
     suspeitas}), equivalente ao TI-RADS {Z} ACR." — **NOTA e TI-RADS CALCULADOS**
     pelo escore Domingos (ver `det-5-tireoide-domingos.md`); ditados pelo médico
     vencem o cálculo (override verbatim).
- **Linfonodos cervicais** (quando descritos): "Linfonodos cervicais com
  morfologia preservada…sem sinais de infiltração neoplásica ao método."

### Renderer (DET-5, programático) — notas de implementação
`apps/api/src/server/renderer/categories/TIREOIDE.ts`. **Spec do escore:
`docs/det-5-tireoide-domingos.md`.** Decisões:
- **Escore Domingos CALCULADO em código** (≠ v1 que reproduzia): a extração
  classifica cada imagem em enums por eixo (ecogenicidade/margem/halo/forma/
  calcificações/vascularização-Chammas) + dimensão pela maior medida; o código
  SOMA → NOTA FINAL → TI-RADS (≤3=1 · 4-5=2 · 6-9=3 · ≥10=4) → características →
  conduta. Vascularização (Chammas) SÓ pontua, nunca escrita. Override: nota/
  TI-RADS ditados vencem o cálculo.
- **Toggles (preferência da conta)** — `show_domingos_score` (default ON; OFF →
  conclusão só "imagem … - TI-RADS Z") e `show_conduct_recommendation` (default
  OFF → quando ON, append da conduta do maior TI-RADS). Renderer já aceita o
  objeto de preferências; wiring DB(JSONB)+route+UI = ONDA 2.
- **VT (volume total)** = soma determinística dos volumes ditados (lobos +
  istmo); `____` se algum faltar (nunca calcula volume de lobo a partir das
  medidas — o médico dita o volume).
- **Corpo do lobo com achado** mantém o volume em parênteses; imagens separadas
  por ";"; ordem ecogenicidade → margem → halo → medida → calcificações → forma →
  localização; terminologia "margem"; Chammas nunca aparece.
- **Título** "ULTRASSONOGRAFIA DA TIREOIDE" / "...DA TIREOIDE COM DOPPLER
  COLORIDO"; artéria tireoidiana inferior OU superior conforme ditado.
- **Alteração difusa** (tireoidite/Graves): campo `ecotextura_alterada` por lobo
  recebe a descrição verbatim do médico e substitui a frase "de ecotextura
  normais" (evita o laudo afirmar lobo normal + glândula heterogênea). Nesse
  caso a conclusão item 1 omite "sem evidência de alteração ecotextural"; a
  síntese diagnóstica fica com o médico (achados_adicionais).
- **Volume glandular** (`volume_glandular`): bócio/aumentado/reduzido conforme
  DITADO pelo médico → "Tireoide de volume {aumentado/reduzido} (VT ml)". Nunca
  inferido por limiar de VT (seria inventar) — silêncio → "normal".
- **Linfonodo alterado:** vai à conclusão como "Linfonodos cervicais de aspecto
  alterado (descrição do médico)." — NUNCA a frase de "morfologia preservada"
  (seria contradição). Normais ficam só no corpo.
- **Vascularização do achado** (`nodulo.vascularizacao`): descrição simples
  (periférica/central/aumentada) entra no corpo; Chammas continua ignorado.
- **Reviews dex1+dex2 (2026-06-13):** 3 bloqueantes corrigidos (linfonodo
  alterado contraditório; bócio saindo "normal"; nota Domingos inválida "0"
  virando "(benigna)") + 2 menores (conclusão distingue múltiplos nódulos por
  localização/medida; vascularização do achado).
- **Limitações conhecidas (v1):** volume só é classificado quando o médico dita
  bócio/aumentado (medidas grandes sem comentário seguem "normal" — decisão
  No-Invention); diagnóstico de tireoidite não é inferido (só descrição verbatim).

### Estilo OBJETIVO (TÉCNICA/ACHADOS/IMPRESSÃO + ACR TI-RADS) — Sprint 1
Estilo de redação alternativo (writing_style OBJETIVO = `44444444-4444-4444-8444-444444444444`),
despachado por `renderTireoide(f, prefs, { objetivo: true })`. Estrutura enxuta
em 3 seções, e **escore ACR TI-RADS** (American College of Radiology) no lugar do
escore de Domingos (Domingos NÃO aparece no objetivo).

**Cabeçalhos:** título `ULTRASSONOGRAFIA DA TIREOIDE` + `TÉCNICA:` + `ACHADOS:` +
`IMPRESSÃO:`.

**Base NORMAL (verbatim do nReport):**
- TÉCNICA: "Exame realizado com transdutor linear de alta frequência."
- ACHADOS: "Glândula tireoide tópica, de dimensões normais e contornos
  preservados." + "Parênquima tireoidiano com ecotextura homogênea. Não foram
  caracterizadas lesões sólidas ou císticas." + linhas de lobos/istmo (medidas +
  volume; `____` quando não ditados) + "Volume total: X ml." + "Não há evidência
  de linfonodomegalias."
- IMPRESSÃO: "Estudo ultrassonográfico dentro dos padrões da normalidade."

**Estados alterados:** bócio/atrofia (`volume_glandular`) refletem em ACHADOS +
IMPRESSÃO; tireoidopatia difusa (`ecotextura_alterada`) descrita em ACHADOS +
IMPRESSÃO "Tireoidopatia difusa"; cada nódulo vira uma frase enxuta no ACHADOS e
um item na IMPRESSÃO com "(ACR TI-RADS N, <texto>)"; cisto (ecogenicidade
anecoica) → "(ACR TI-RADS 1)". VT (volume total) somado dos volumes (lobos+istmo),
igual ao clássico.

**ACR TI-RADS — pontos por eixo (some todos):**

| Eixo | Valor (enum Domingos) | Pontos |
|------|----------------------|--------|
| COMPOSIÇÃO | anecoica_homogenea, anecoica_finos_ecos (cístico) | 0 |
| | anecoica_septos, anecoica_componentes_solidos, solida_areas_anecoicas (misto) | 1 |
| | hipoecoica, isoecoica, hiperecoica, solida_calcificacao_parede (sólido) | 2 |
| ECOGENICIDADE | anecoica_* | 0 |
| | hiperecoica, isoecoica (e solida_* default iso) | 1 |
| | hipoecoica | 2 |
| FORMA | mais_alta_que_larga | 3 |
| | mais_larga_que_alta, null | 0 |
| MARGEM | regular, null | 0 |
| | irregular, espiculada | 2 |
| FOCOS ECOGÊNICOS (calcificações) | sem, null | 0 |
| | grosseiras (macrocalcificações) | 1 |
| | casca_ovo (periféricas) | 2 |
| | micro (puntiformes) | 3 |

**Categoria pela soma:** <2 → TR1 · ==2 → TR2 · ==3 → TR3 · 4-6 → TR4 · ≥7 → TR5.
**Texto:** TR1 "benigno" · TR2 "provavelmente benigno" · TR3 "características
intermediárias" · TR4 "características suspeitas" · TR5 "altamente suspeitas".

**Override:** `ti_rads_ditado` (1-5) vence o cálculo (categoria ditada do médico).
Sem ecogenicidade → não pontua (nódulo sai sem categoria).

**Conduta ACR (por categoria + maior diâmetro = max(medidas_cm) ou
diametro_transverso_cm):** TR1/TR2 sem indicação · TR3 PAAF ≥2,5 cm, controle
≥1,5 cm · TR4 PAAF ≥1,5 cm, controle ≥1,0 cm · TR5 PAAF ≥1,0 cm, controle ≥0,5 cm.
Conduta só com toggle `show_conduct_recommendation` ON → seção própria
"Conduta sugerida:" após a IMPRESSÃO (igual à MAMARIA), usando a maior categoria
entre os nódulos.

**Verificação:** golden `tireoide-objetivo-golden.manual.ts` + boletim
`docs/tireoide-objetivo-boletim.html`.

---

# PROSTATA (transabdominal)

**Título:** ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL).
**Comentários (fixo):** transdutor convexo de 4,0 MHz, por via transabdominal.

## Estruturas (ordem no corpo): bexiga · próstata · vesículas seminais
- **Bexiga (default):** "Bexiga de paredes finas, ecotextura homogênea e
  contornos regulares." + "Volume pré-miccional de X ml." (quando informado).
- **Próstata:** "Próstata medindo X x X x X cm." (formato pt-BR: 5,1 x 4,4 x
  3,9 cm).
- **IPP (índice de protrusão prostática)** — OPCIONAL, substitui "lobo médio
  protruso": corpo "Índice de protrusão prostática (IPP) mede X cm."; conclusão
  "Protrusão prostática intravesical de X cm (Grau N)." — Grau 1 ≤0,5cm; Grau 2
  >0,5–1,0cm; Grau 3 >1,0–1,5cm.
- **Vesículas seminais (default):** "de dimensões, ecogenicidade e ecotextura
  normais."

## Conclusão
1. Bexiga ecograficamente normal.
2. Resíduo pós-miccional de X mL.
3. "Próstata de dimensões normais (peso aproximado de X gramas)." OU "…de
   volume aumentado (peso aproximado de X gramas)." — **só o peso, nunca o
   volume em cm³**. (Cálculo V = D1×D2×D3×0,5233; Peso ≈ V×1,05; só calcular
   com 3 medidas — candidato a renderer p/ cálculo determinístico.)
4. (se IPP) Protrusão prostática intravesical de X cm (Grau N).
5. Vesículas seminais ecograficamente normais.

---

---

# Outras categorias (Lote A — resumo das regras aplicadas)

- **ESCROTAL** — varicocele individualiza os DOIS lados em linhas separadas:
  "Veias do plexo pampiniforme {lado} de calibre aumentado, medindo até X mm,
  com refluxo à manobra de Valsalva com duração maior do que um segundo." +
  "Veias do plexo pampiniforme {outro lado} de calibres normais." Conclusão
  "Varicocele à {lado}." Default normal: testículos + epidídimos + plexo normais.
- **GLANDULAS_SALIVARES** — estrutura COMENTÁRIOS → parótidas/submandibulares
  (dimensões/ecotextura/ductos/nódulos/cálculos) → linfonodos. Conclusão de
  item único sem "1)": "Glândulas salivares maiores ecograficamente normais."
- **DOPPLER_RENAL** — doc fotográfica nos COMENTÁRIOS (nunca no fim). Conclusão
  normal: 1) "Artérias renais com fluxo preservado bilateralmente, sem
  evidência ecográfica de estenose hemodinamicamente significativa." 2)
  "Índices de resistência intrarrenais dentro dos limites da normalidade."
- **DOPPLER_VENOSO completo** — comentários encerram em "compressão distal
  manual aplicada." (sem a lista repetitiva). **TVP-only** — conclusão de item
  único sem "1)"; corpo em frase fluida (segmentos pérvios/compressíveis), não
  fragmentado.
- **DOPPLER_OBSTETRICO** — frase opcional pós-título: "Primeira ultrassonografia
  realizada em DD/MM/AAAA com X semanas e Y dias. Hoje com Z semanas e W dias."
  (data numérica; omitir "e zero dias" quando zero).

---

# OBSTETRICA — Estilo OBJETIVO (TÉCNICA/ACHADOS/IMPRESSÃO) — Sprint 2

Estilo de redação alternativo (writing_style OBJETIVO =
`44444444-4444-4444-8444-444444444444`), despachado por
`renderObstetrica(f, null, { objetivo: true })`. Estrutura enxuta em 3 seções
(sem COMENTÁRIOS / OS SEGUINTES ASPECTOS). **Reusa 100% a extração e os cálculos
determinísticos do clássico** (peso médio/divergência ponderal via `calcPonderal`,
DSM via `calcDsm`, líquido via `liquido`). Decisões: **1 casa decimal em TODAS as
medidas** (mm); peso em gramas inteiras; concordância de gênero; **feto único
NUNCA recebe "(feto A)" nem "ambos os fetos"** (sem alucinação gemelar);
**percentil só é reproduzido** (nunca cruzado/calculado com a IG).

**Cabeçalhos:** título (`ULTRASSONOGRAFIA OBSTÉTRICA` ou `... GEMELAR`) + `TÉCNICA:`
+ `ACHADOS:` + `IMPRESSÃO:`. DUM opcional logo após o título.

**Frases-base (futura versão web sem IA):**
- **TÉCNICA:** "Exame realizado com transdutor convexo multifrequencial."
- **Feto único (2º/3º tri):** "Feto único, em apresentação {cefálica|pélvica|...}
  [, com dorso {lado}]." · "BCF: X bpm. Movimentos fetais ativos." · "Biometria
  fetal:" + "DBP/CC/CA/CF: X mm." (1 casa) · "Peso fetal estimado: X g
  [(+- Y g, percentil Z)]." · placenta · líquido.
- **Gestação inicial (≤13s6d):** "Saco gestacional de forma normal, diâmetro médio
  (DSM): X mm." (DSM determinístico) · "Embrião único, em situação {transversa}." ·
  "BCF: X bpm." · "CCN: X mm." · "Vesícula vitelina de forma e dimensões normais."
  · líquido · "Ovários de aspecto normal."
- **Gemelar (≥2 fetos):** "{Dois|Três|N} fetos: feto {pos} (feto A), em
  apresentação ...; ...." · bloco por feto (BCF + biometria + peso) · "Peso fetal
  médio: X g. Divergência ponderal: Y g (Z%)." · placentas por quantidade ·
  líquido por feto.
- **IMPRESSÃO:** item IG ("Gestação [gemelar {corionicidade}] em torno de X
  semanas e Y dias."); líquido; gemelar acrescenta divergência (significativa se
  ≥20%, senão "pesos concordantes").

**Verificação:** golden `obstetrica-objetivo-golden.manual.ts` + boletim
`docs/obstetrica-objetivo-boletim.html`.

# MORFOLOGICO — Estilo OBJETIVO (TÉCNICA/ACHADOS/IMPRESSÃO) — Sprint 2

Despachado por `renderMorfologico(f, null, { objetivo: true })`. Estrutura enxuta
em 3 seções. **Reusa os mesmos dados/cálculos do clássico** (IP médio das uterinas
no 1t). Decisões: **1 casa decimal nas medidas** (mm/cm); peso em gramas inteiras;
concordância de gênero; trimestres **1t / 2t / 3t**; **percentil só reproduzido**.

**Cabeçalhos:** título por trimestre (`... DO PRIMEIRO|SEGUNDO|TERCEIRO TRIMESTRE`)
+ `TÉCNICA:` + `ACHADOS:` + `IMPRESSÃO:`.

**Frases-base (futura versão web sem IA):**
- **TÉCNICA:** "Exame realizado com transdutor convexo multifrequencial."
- **1º trimestre:** "Feto único de situação variável." · "BCF: X bpm. Movimentos
  fetais ativos." · "CCN: X mm." · "Translucência nucal (TN): X mm." · "Osso nasal
  {presente|ausente}." · "Ducto venoso com onda trifásica (onda A positiva)." (ou
  "onda A reversa") · placenta · líquido · "Artéria uterina direita/esquerda: IP
  X." + "IP médio das artérias uterinas: X." (calculado). IMPRESSÃO: IG; líquido;
  Doppler do ducto venoso normal|alterado; "Morfologia fetal normal para esta fase
  da gestação."; Dopplervelocimetria das uterinas se aferida.
- **2º/3º trimestre:** "Feto único, em apresentação {cefálica}[, com dorso à
  {lado}]." · "BCF: X bpm. Movimentos fetais ativos." · frase única de anatomia
  normal · "Biometria fetal:" + DBP/CC/Cerebelo/Cisterna magna/[Distância binocular
  só 2t]/CA/Fêmur/Tíbia/Fíbula/Úmero/Rádio/Ulna: X mm. · peso · "Genitália externa
  {sexo|não avaliada}." · "Anexos:" + cordão (2 artérias/1 veia) + placenta
  ({homogênea 2t | heterogênea 3t}) + "Índice de líquido amniótico (ILA): X cm." +
  ["Orifício interno do colo uterino fechado." só 2t]. IMPRESSÃO: IG; líquido;
  "Morfologia fetal sem evidência de alteração detectável pelo método."

**Verificação:** golden `morfologico-objetivo-golden.manual.ts` + boletim
`docs/morfologico-objetivo-boletim.html`.

# MAMARIA — Estilo OBJETIVO (TÉCNICA/ACHADOS/IMPRESSÃO) — Sprint 3

Despachado por `renderMamaria(f, prefs, { objetivo: true })`
(`renderer/categories/MAMARIA.ts`); `renderMamaria` virou um dispatcher fino →
`renderMamariaClassico` (corpo LIVE intocado) ou `renderMamariaObjetivo`. Estrutura
enxuta em 3 seções, inspirada no modelo "Mama" do nReport. **Reusa 100% a extração,
o BI-RADS calculável (maior-vence, ditado-vence) e o toggle de conduta do clássico.**

**Cabeçalhos:** título (`ULTRASSONOGRAFIA DAS MAMAS` ou `... E REGIÕES AXILARES`) +
`TÉCNICA:` + `ACHADOS:` + `IMPRESSÃO:` + rodapé BI-RADS®.

**Decisões (idênticas ao clássico, herdadas):**
- **Margem NUNCA "regular"** (circunscrita/indistinta/angular/microlobulada/
  espiculada).
- **"de mama direita/esquerda"** / "ambas as mamas".
- **BI-RADS só no item de MAIOR categoria** (maior-vence; ditado do médico vence o
  cálculo); cistos bilaterais agregam num único item.
- **1 casa decimal** em todas as medidas.
- **Conduta em seção própria** "Conduta sugerida:" após a IMPRESSÃO, só quando o
  toggle `show_conduct_recommendation` estiver ON (default OFF) — usa a conduta da
  maior categoria BI-RADS.

**Frases-base:**
- **TÉCNICA:** "Exame realizado com transdutor linear de alta frequência, abrangendo
  todos os quadrantes das mamas[ e as regiões axilares]."
- **ACHADOS:** "Pele e tecido celular subcutâneo de aspecto preservado." + textura de
  fundo + (sem lesão → "Não há sinais evidentes de imagem nodular sólida, cística ou
  complexa.") + frases dos achados (reusa `achadoCorpo` do clássico) + elastografia +
  axilas (se no título) + achados adicionais.
- **IMPRESSÃO:** itens de conclusão por achado (reusa `achadoConclusaoBase`/
  `conclusao6`) com o rótulo "(Categoria BI-RADS® N)" só no de maior categoria; 0
  achados → "Mamas ecograficamente normais (Categoria BI-RADS® 1)."; axilas;
  correlação com exame prévio.

**Verificação:** golden `mamaria-objetivo-golden.manual.ts` + boletim
`docs/mamaria-objetivo-boletim.html`. Não-regressão do clássico:
`mamaria-golden.manual.ts` (28/28).

# Lote B (reworks) — resumo das regras aplicadas

- **DOPPLER_ARTERIAL_MMII** — título individualizado por membro
  ("ULTRASSONOGRAFIA COM DOPPLER COLORIDO ARTERIAL DO MEMBRO INFERIOR
  {DIREITO/ESQUERDO}"); COMENTÁRIOS; corpo descritivo por vaso (placas,
  velocidades, padrão espectral); conclusão SÓ diagnóstico ("Doença
  aterosclerótica difusa no membro inferior {lado}, sem estenoses
  hemodinamicamente significativas."). **ITB removido** (blocos arquivados).
- **MORFOLOGICO (1t/2t/3t)** — estrutura fixa COMENTÁRIOS / OS SEGUINTES
  ASPECTOS / CONCLUSÃO (writer omitia COMENTÁRIOS e vazava a doc fotográfica
  para a conclusão — corrigido com reforço de estrutura + título exato por
  trimestre, e correção da regra de DUM que herdava o título obstétrico).
  Modelos validados = fonte viva (CCN/TN/osso nasal/ducto venoso no 1t;
  biometria completa + ossos longos bilaterais no 2t).
- **OBSTETRICA gemelar** — título "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR"; 1ª
  frase com quantidade de fetos + individualização (apresentação/dorso/polo);
  BCF/anatomia/biometria por feto (Feto A/Feto B); peso de cada feto + médio +
  divergência (g e %); placentas por quantidade; conclusão item 1 com IG +
  corionicidade ("Gestação gemelar dicoriônica e diamniótica em torno de X
  semanas e Y dias."); comparação ponderal no lugar de item de placentas;
  líquido válido p/ ambos.
- **MUSCULOESQUELETICO** — categoria antiga inativada; V2 é o padrão
  ("Musculoesquelético"). Conclusão RESUME o diagnóstico (nunca copia o
  corpo); regra da tranquilização do manguito com lógica estrita ("Não há
  sinais de ruptura do manguito rotador{lat}." SÓ quando não há ruptura).

> **Nota de arquitetura:** morfológico e obstétrica gemelar foram **portados ao
> renderer** (DET-5) — render PROGRAMÁTICO (100% em código, sem template_body,
> só a extração usa LLM). Estrutura byte-estável por construção e cálculos
> determinísticos (peso médio + divergência ponderal gemelar, IP médio das
> uterinas no 1t). Resolve de vez o writer omitindo seções / errando título /
> não calculando. Próximas categorias podem seguir o mesmo padrão de módulo
> auto-contido em `renderer/categories/`.

---

> **Próximas categorias** serão adicionadas abaixo conforme a revisão do
> showcase (S2) avança — cada uma com a mesma estrutura: título, comentários,
> estruturas com default + achados (campos e variações), regras de conclusão.
> Itens já mapeados como pendência estão no backlog
> `docs/curadoria-showcase-2026-06-12.md`.
