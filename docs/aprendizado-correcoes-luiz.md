# Aprendizado das correções do Luiz — corpus vivo ("memória infinita")

> **O que é:** arquivo curado do que a IA erra e o Dr. Luiz corrige à mão, extraído do
> diff `generated_output` (saída da IA) → `final_output` (versão que o Luiz salvou após
> corrigir) na tabela `reports` (banco MOBILE `yldtkqrsbgcnwlydrrot`).
> **Para que serve:** (1) priorizar o que tornar determinístico; (2) biblioteca de frases
> canônicas/snippets; (3) ser consultado pela automação do boletim para aprender com as
> correções. **Atualizar** periodicamente re-rodando a mineração.
> **Fonte desta versão:** 226 laudos corrigidos (status=generated, final≠generated),
> mineração de 2026-06-29. Todos de 1 usuário (o Luiz).

---

## 1. Ranking dos tipos de correção (multi-rótulo; um laudo pode ter vários)

| # | Tipo | Laudos (~/226) | Natureza | Alavanca |
|---|---|---|---|---|
| 1 | **ESTRUTURA_SECAO** | ~66 (29%) | template abandonado, passthrough quebrado, conclusão renumerada, seção/2º exame perdido | Renderer/passthrough determinístico |
| 2 | **PLACEHOLDER `____`** | ~41 (18%) | lacunas onde havia valor; cabeçalhos auto-injetados | Suprimir/preencher determinístico |
| 3 | **COMANDO_NAO_EXECUTADO** | ~40 (18%) | comando ditado ecoado literal ou ignorado | Parser de comandos ("divisor de águas") |
| 4 | **MEDIDA_RESTAURADA** | ~34 (15%) | medida ditada dropada (CCN/percentis Doppler/colo) | Nunca dropar medida ditada |
| 5 | **TERMO_NORMALIZACAO** | ~34 (15%) | typo/termo, percentil "<", default errado | Dicionário central |
| 6 | **ESTILO_COSMETICO** | ~33 (15%) | numeração da conclusão, tags `[REVISAR]`, rodapés | Regras de formatação determinísticas |
| 7 | **IG_DOMINGOS** | ~32 (14%) | re-datação/âncora/frase de correção | Renderer IG (Domingos) + estender ao Doppler |
| 8 | **ACHADO_RESTAURADO** | ~22 (10%) | achado/conduta/recomendação dropada | **Segurança** + snippets de conduta |
| 9 | **ALUCINACAO_REMOVIDA** | ~20 (9%) | achado/medida/lateralidade inventada | **Segurança** (guards de validação) |
| 10 | **DATA_DUM** | ~19 (8%) | DUM inválida/derivada de IG | Nunca derivar DUM de IG + sanidade |
| 11 | **LIQUIDO_ROTULO** | ~17 (8%) | MBV↔ILA, falso oligoâmnio | Rótulo fiel + classe por faixa |
| 12 | **MEDIDA_IMPLAUSIVEL** | ~13 (6%) | BCF/medidas absurdas (ASR) | Sanidade de medidas |
| — | OUTRO / ruído de dado | ~14 (6%) | `final` é outro exame (ver §5: categorias bloqueadas) | Não é padrão de correção |

**Leitura:** os 6 tipos do topo (≈ estrutura, placeholder, comando, medida, termo, estilo)
são quase todos **mecânicos/determinísticos** — não precisam de "inteligência", precisam de
template/guard. Os tipos 8–9 (achado dropado / alucinação) são menores em volume mas
**alta severidade clínica** → camada de validação separada (§4).

---

## 2. Biblioteca de frases canônicas (snippets — texto EXATO do Luiz)

### IG (regra Dr. Domingos)
- **Cabeçalho (1ª US):** `Primeira ultrassonografia realizada {DD/MM/AAAA} com {IG1}. Hoje com {IG_hoje}.`
- **Conclusão item 1 (divergência >5d):** `Gestação em torno de {IG_biometria_atual} pela biometria atual, devendo ser corrigida pela ultrassonografia precoce compatível com {IG_âncora}.`
- Âncora da conclusão = **biometria atual**; referência = 1ª US/DUM do input. A IA ecoa "vírgula" literal, põe a frase como item 3, ou inventa âncora (corrigir).

### DUM / datas
- **Nunca derivar `DUM: dd/mm/aaaa` da IG em semanas.** Só emitir `DUM:` se data real ditada.
- Datas inválidas vistas: `32/06/0000`, `32/32/0000`, `null`, `39s2d`. Suprimir.

### Líquido amniótico (segurança — falso oligoâmnio)
- Se ditou bolsão: `O maior bolsão vertical mede {N} cm.` (nunca "índice do líquido amniótico").
- Conclusão: `Líquido amniótico de quantidade normal.` (+ `(maior bolsão vertical mede {N} cm)`).
- Classe por faixa: **MBV normal ~2–8 cm; ILA 5–25 cm.** MBV 2,7–5,7 NÃO é "reduzida".

### Doppler obstétrico — conclusão normal (boilerplate fixo)
```
Líquido amniótico de quantidade normal (maior bolsão vertical mede {N} cm).
Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
Ausência de sinais de incisuras.
Não há sinais de pré-centralização ou de centralização.
Perfil hemodinâmico fetal é normal, menor de 1.0.
```
- **Variante gestação inicial** (AU/ACM não medidas): trocar as 3 linhas Doppler por
  `Dopplervelocimetria normal das artérias uterinas.` e remover pré-centralização/perfil.
- **Percentis JÁ vêm no `raw_input`** (`→ Percentis (Gratacós/FMF): AU IP .. (P46) · ACM (P88) · Uterinas (P37)`) e a IA descarta. Re-emitir `(percentil NN)` é 100% determinístico.
- Percentil: nunca `(percentil < 3)`; usar `(percentil 3)`.

### Golf ball / foco ecogênico intracardíaco (segurança — falha de seguimento)
- **Corpo (após "Coração com quatro câmaras visíveis."):** `Imagem hiperecoica puntiforme no ventrículo {esquerdo/direito}, medindo {N} cm no seu maior eixo.`
- **Conclusão (item próprio):** `Foco ecogênico intracardíaco no ventrículo {esquerdo/direito} de aspecto inespecífico (Golf Ball). Convém, a critério clínico, realizar ecocardiografia fetal em torno de 28 semanas de idade gestacional com o objetivo de acompanhar a evolução.`
- **Aplicável a OBSTETRICA, DOPPLER_OBSTETRICO e MORFOLOGICO.**
- Conclusão genérica vira `Demais aspectos da morfologia fetal sem evidência de alteração detectável pelo método.`

### Peso fetal
- PIG: `Peso fetal abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.).`
- GIG: `O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.).`
- Não inventar PIG/GIG sem suporte de percentil.

### Colo / cervicometria / transvaginal
- Corpo: `A distância entre o orifício interno e o orifício externo do colo uterino mede {X} cm.`
- Conclusão: `Colo uterino ecograficamente normal.`
- Bloco 2º exame transvaginal (boilerplate): título `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL` + COMENTÁRIOS (transdutor 6.5 MHz) + distância OI–OE + `Orifício interno do colo uterino fechado.` + distância da placenta ao OI.

### Condutas / comparação (snippets)
- Gestação inicial: `Convém realizar nova ultrassonografia no prazo de duas semanas, com o objetivo de acompanhar a evolução.`
- Comparação: `O exame atual comparado ao anterior, realizado {data}, mostra a evolução normal da gestação.`
- Pelve renal: `Pequenas distensões na pelve renal bilateralmente. Convém, a critério clínico, reavaliar ultrassonograficamente no prazo de 4 a 6 semanas com o objetivo de acompanhar a evolução.`
- BCF baixo (embrião <3 mm): `Frequência cardíaca abaixo dos valores usuais, mas ainda compatível com embrião abaixo de 3 mm. Convém, a critério clínico, reavaliar ultrassonograficamente em duas semanas, com objetivo de acompanhar a evolução.`

### Ovário menopáusico (segurança — não inventar O-RADS)
- Corpo: `Ovário {direito/esquerdo} medindo X x Y x Z cm, apresentando poucas imagens anecoicas.`
- Conclusão endométrio: `O endométrio tem espessura normal para a faixa etária da menopausa.`
- Conclusão ovários: `Ovários ecograficamente normais (o direito com X cm³ e o esquerdo com Y cm³), ambos praticamente sem folículos.`
- **Nunca** atribuir O-RADS/coleção a ovário atrófico.

### Próstata suprapúbica (template da casa)
- Título `ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)`; COMENTÁRIOS + OS SEGUINTES ASPECTOS (Bexiga, `Próstata medindo AxBxC cm`, Vesículas seminais); CONCLUSÃO numerada (Bexiga / Resíduo pós-miccional mL / Próstata volume + peso g / IPP cm grau romano I–III / Vesículas seminais); rodapé fixo `Observação: a avaliação do parênquima prostático pela via suprapúbica é limitada.`

### Bexiga (vias urinárias)
- **Bug:** IA imprime default `Bexiga com repleção insuficiente...` mesmo com bexiga cheia (ex.: 269 mL). Canônico: `Bexiga de forma, contorno e ecotextura normais.` / conclusão `Bexiga ecograficamente normal.`

### Mama
- Rodapé `Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).` fica **FORA** da lista numerada.
- `Linfonodos axilares normais.` é item numerado da conclusão.

### MSK / partes moles (passthrough)
- Quando o `raw_input` já vem formatado (TÍTULO/COMENTÁRIOS/OS SEGUINTES/CONCLUSÃO), o renderer deve fazer **passthrough fiel preservando quebras de linha** e o COMENTÁRIOS do médico — **não** substituir por boilerplate nem juntar achados em parágrafo.
- `coleção líquida` → `derrame articular`; `sem alterações ecográficas relevantes` → `ecograficamente normal`.

### Tireoide
- Preencher `Tireoide de volume normal ({vol} ml)`; remover linhas de pico sistólico não ditadas.
- **NOTA FINAL (escore Domingos→TI-RADS)** corrigida (7→8, 7→9) — impacto clínico direto.

### Normalizações de termo (dicionário)
`encefálica→cefálica` · `de coriônica→dicoriônica` · `RADS 2→O-RADS 2` · `fúngica→fúndica` ·
placenta truncada `com ecotextura`→`com ecotextura heterogênea, de acordo com a fase da gestação` ·
percentil `< N`→`N` · `DUM: null` → omitir.

---

## 3. Regras determinísticas derivadas (o que virar guard/renderer)
1. **Renderer determinístico do DOPPLER_OBSTETRICO** (resolve IG, percentis, boilerplate, placeholder, líquido — ~47 laudos).
2. **Nunca dropar medida ditada** (CCN/BCF/SG/colo/percentis); se faltar valor real, avisar — não inventar `____`.
3. **Parser de comandos** que consome imperativos de ditado ("acrescente", "na conclusão escreva", "no lugar de X escreva Y", "pode colocar", "vou te falar", "correlacione") e os executa no alvo certo (COMENTÁRIOS vs CONCLUSÃO), nunca os imprime.
4. **Suprimir** placeholders `____` e tags internas `[REVISAR — magnitude]` antes da entrega; nunca derivar `DUM` de IG.
5. **Numeração da conclusão**: 1 item → sem número; N itens → `1) 2) …`.
6. **Líquido**: rótulo fiel ao ditado (MBV vs ILA) + classe por faixa (anti-falso-oligoâmnio).
7. **Passthrough fiel** de input MSK/partes-moles pré-formatado.
8. **Snippets canônicos** (golf ball, PIG/GIG, condutas, ovário menopáusico, próstata, bexiga) como blocos fixos disparados por gatilho.

---

## 4. Camada de SEGURANÇA — casos críticos (guards de validação, não template)
| id | categoria | risco |
|---|---|---|
| `cf262e82` | DOPPLER | **óbito perdido**: Doppler "normal" gerado p/ embrião sem vitalidade |
| `c53bbc1f` | DOPPLER | **feto inventado** (gemelar em gestação única) |
| `0bfc84f7` | OBSTETRICA | ventriculomegalia 14 mm + Dandy-Walker dropados da conclusão |
| `6e6f3dbb` | OBSTETRICA | seção Doppler inteira + itens 4–7 dropados (gemelar) |
| `2b8afff8` | DOPPLER | incisura protodiastólica bilateral mascarada ("ausência de incisuras") |
| `42678c62` | OBSTETRICA | BCF 72 (bradicardia) não sinalizado |
| `88543eea` | MAMARIA | BI-RADS 4A superestimado (→3) |
| `3553d87e` | MAMARIA | BI-RADS omitido (→ inserido cat. 3) |
| `89856e33`/`6095b8a6` | TIREOIDE | NOTA FINAL (TI-RADS) errada + linfonodos inventados |
| falso oligoâmnio | múltiplos | b13dc94b, 294f6ccf, f8626599, b396da07, dc19341e, 963af7fb… |
| implausíveis | múltiplos | CCN 24→2,4 mm; DBP 354→35,4 mm; BCF 41 (escapou) |
| `4af148ef` | MSK | ASR perigoso "Pneumonia do subescapular" (era tendinopatia) impresso |

> Estes pedem **guards de validação** (vitalidade/gemelar/incisura/BI-RADS/bradicardia/
> medida-zero), independentes do determinismo de template.

---

## 5. Ruído de dado — EXCLUIR do treino
~14 laudos têm `final_output` de um exame **totalmente diferente** do `category_code`
(ex.: ABDOMEN_TOTAL com laudo de partes moles do ombro; joelho gerando obstétrico).
**Causa (confirmada pelo Luiz):** categorias **bloqueadas** (sem laudos validados) — o
médico reaproveitou o slot para outro exame / refez à mão. Não é padrão de correção do
modelo; ver no plano o item "desbloquear categorias + fallback genérico". IDs de ruído
conhecidos: `685158d0`, `b6f80fa3`, `396fff62`, `cde0efd1` (OBSTETRICA) + os ABDOMEN
roteados para outro exame (`d8ecf472`, `f2903c2a`, `75aea4d7`, `4cf6f236`, `14b67def`).

---

## Status de promoção (atualizar conforme implementa)
- [ ] Renderer Doppler · [ ] Golf ball snippet · [ ] Não-dropar-medida · [ ] Parser de comandos
- [ ] Suprimir ____/[REVISAR]/DUM-de-IG · [ ] Líquido fiel · [ ] Numeração conclusão
- [ ] Passthrough MSK · [ ] Snippets de conduta · [ ] Guards de segurança · [ ] Desbloquear categorias
