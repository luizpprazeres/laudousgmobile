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
| TIREOIDE | ⬜ | ⬜ writer | revisão S2 |
| PROSTATA_SUPRAPUBICA | ⬜ | ⬜ writer | revisão S2 |
| DOPPLER_ARTERIAL_MMII | ⬜ | ⬜ writer | rework S2 |
| DOPPLER_RENAL / VENOSO / OBSTETRICO | ⬜ | ⬜ writer | revisão S2 |
| ESCROTAL / GLANDULAS_SALIVARES | ⬜ | ⬜ writer | revisão S2 |
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

---

> **Próximas categorias** serão adicionadas abaixo conforme a revisão do
> showcase (S2) avança — cada uma com a mesma estrutura: título, comentários,
> estruturas com default + achados (campos e variações), regras de conclusão.
> Itens já mapeados como pendência estão no backlog
> `docs/curadoria-showcase-2026-06-12.md`.
