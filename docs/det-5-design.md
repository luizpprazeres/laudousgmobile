# DET-5 — Design: structured extraction + renderer (piloto ABDOMEN_TOTAL)

> Decisões de design tomadas em 2026-06-12 a partir da máscara curada, das
> regras/frases validadas (knowledge_blocks) e dos 18 casos golden.
> Princípio (ADR-0004): "LLM entende o ditado; o sistema monta o laudo."

## Arquitetura

```
ditado → structurer estendido (json_schema strict DA CATEGORIA, temp 0)
       → achados tipados por órgão
       → RENDERER (TS puro): template_body da variante + biblioteca de frases
         → laudo com estrutura garantida por construção
       → LLM secundário SÓ p/ achados tipo "outro" (slot delimitado, temp 0)
```

- Flag `RENDERER_CATEGORIES` (lista de category_codes, padrão zod string como
  `FAST_PATH_DEFAULT`). Fora da flag → caminho writer atual intocado.
- `runRendererStream` tem a MESMA interface do `runWriterStream`
  (AsyncGenerator<string, {fullText, latencyMs, …}>) — o route troca a função
  e o SSE continua idêntico (`token` + `done`).

## 1. Schema de achados (structurer estendido)

`apps/api/src/server/renderer/findingsSchemas/ABDOMEN_TOTAL.ts` — JSON Schema
strict (OpenAI structured outputs: todos required, additionalProperties false,
nullable via type union) + tipos TS + parser zod.

```
renderer_findings: {
  orgaos: {
    figado | veia_porta | vesicula | vias_biliares | baco | pancreas |
    rim_direito | rim_esquerdo | veia_cava | aorta | bexiga: {
      status: "normal" | "alterado" | "nao_avaliado_gases" | "ausente_cirurgico",
      achados: Achado[]            // vazio quando normal
    }
  },
  achados_extra_abdominais: Achado[],   // ex: derrame pleural
  observacoes_do_medico: string|null    // comandos ficam no fluxo atual
}

Achado: {
  tipo: "esteatose" | "cisto_simples" | "imagem_cistica_complexa" |
        "litiase" | "ateromatose" | "derrame_pleural" |
        "volume_pre_miccional" | "outro",
  grau: "leve"|"moderado"|"acentuado"|null,
  quantidade: "unica"|"multiplas"|null,
  lateralidade: "direita"|"esquerda"|"bilateral"|null,
  localizacao: string|null,            // "polo superior", "terço médio", "segmento VII"
  medidas_cm: number[]|null,           // null → placeholder ____ (NUNCA inventar)
  termo_do_medico: string|null,        // "cálculo" vs "concreção" — verbatim
  descricao_livre: string|null         // obrigatória quando tipo="outro"
}
```

Regras de extração no prompt do structurer: medida não ditada → `null`
(JAMAIS inventar — regra curada `frases-normais-quando-omitido`); termo do
médico preservado verbatim (regra `preservar-terminologia`); "segmento sete"
→ `localizacao: "segmento VII"` (conversão romana é determinística no
renderer, mas o structurer também é instruído).

## 2. template_body com slots (fonte: máscara curada)

Gravado em `report_template_variants.template_body` (vira fonte primária —
previsto desde o DET-3) via SQL vivo `0010`, para as DUAS variantes de
ABDOMEN_TOTAL (padrao e doppler). Sintaxe de slot:

```
{{orgao:rim_esquerdo|Rim esquerdo com diâmetros longitudinais e anteroposterior
dentro dos limites normais, medidos pelo flanco, apresentando topografia,
ecotextura do seio renal e ecotextura córtico medular normais.}}
…
CONCLUSÃO:
{{conclusao}}
```

- `{{orgao:<chave>|<frase normal default>}}` — linha substituída pela frase
  patológica quando o órgão tem achados; senão a default (byte-estável).
- `{{extra_abdominais}}` — linhas adicionais (derrame pleural etc) ou vazio.
- `{{conclusao}}` — montada 100% em código (ver §4).
- Texto fora de slots (título, COMENTÁRIOS, tabela do Doppler na variante
  doppler) é literal.

## 3. Biblioteca de frases (determinística, das regras curadas)

`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts` — transcrição em TS
dos pares já validados nas regras do bundle (fonte viva preservada):

| tipo (órgão) | corpo | conclusão |
|---|---|---|
| esteatose leve | "Fígado de dimensões normais, com discreto aumento da ecogenicidade parenquimatosa." | "Esteatose hepática, grau leve." |
| esteatose moderada | "…aumento difuso da ecogenicidade parenquimatosa, com atenuação sonora." | "Esteatose hepática, grau moderado." |
| cisto_simples (rim X) | frase curada com `medindo {medidas}` + `situada no {localizacao}` | "Cisto simples no rim {lado}." |
| litiase (vesícula, única/múltiplas) | frases curadas | "Litíase da vesícula biliar." |
| litiase (rim X) | frase curada | "Litíase renal {lado}." |
| ausente_cirurgico (vesícula) | "Ausência da imagem da vesícula biliar (paciente colecistectomizado)." | "Ausência da imagem da vesícula biliar para ser submetida a colecistectomia." |
| ateromatose (aorta) | "Aorta abdominal de calibre normal, apresentando imagens hiperecoicas aderidas às suas paredes." | "Placas de ateromas na aorta abdominal." |
| derrame_pleural | "…quantidade de líquido no espaço pleural, {bilateralmente}." | "Derrame pleural {grau} {lateralidade}." |
| cisto hepático / imagem cística complexa / volume pré-miccional / gases | idem regras curadas | idem |

Formatação determinística: medidas pt-BR (`2,1 x 1,8 x 1,6 cm`), medida null
→ `____`, segmentos hepáticos em romano.

`tipo: "outro"` → **LLM secundário** (modelo = OPENAI_MODEL_WRITER, temp 0):
recebe SÓ a descricao_livre + órgão e devolve UMA frase de corpo + UMA de
conclusão, inseridas nos slots; nunca toca em cabeçalhos/ordem/numeração.

## 4. Conclusão (código, nunca LLM)

Regra curada `fechamento-com-achados` vira código:
- 0 achados específicos → item único "Órgãos e estruturas abdominais
  estudadas sem evidência de alterações ecográficas." (sem fechamento)
- ≥1 achado → itens na ordem do corpo, numerados `1.`..`N.`, e fechamento
  "Demais órgãos e estruturas abdominais estudadas sem evidência de
  alterações ecográficas." como ÚLTIMO item numerado.

## 5. Integração no route

- `RENDERER_CATEGORIES` contém a categoria E a variante resolvida tem
  `template_body` não-nulo → structurer estendido + renderer.
  Senão → fluxo writer atual (fallback automático, rollback trivial).
- Post-processors: NÃO rodam no caminho renderer (a estrutura já é garantida;
  rodá-los seria redundância DET-2). Sanity determinístico continua.
- generation_runs: `model_writer` = "renderer/v1" + modelo do slot livre se
  usado; demais campos idem.

## Critérios de aceite (do plano)

1. Golden ABDOMEN_TOTAL 18/18 com a flag ligada.
2. Byte-estável: mesmo input 2× → laudo idêntico (exceto slots livres).
3. Latência ≤ writer (esperado: MUITO menor — 1 chamada LLM pequena de
   structurer + render local vs writer streaming o laudo inteiro).

## Limitações conhecidas do piloto (reviews dex1+dex2, aceitas)

- **Sanity sobre achados do renderer**: o sanity determinístico continua
  comparando o laudo com os `findings` do fluxo antigo (no fast-path,
  mínimos) — os achados tipados da extração não alimentam o sanity ainda.
  Mitigação: estrutura garantida por construção + frases curadas; medidas
  vêm direto da extração. Endereçar no DET-5.1.
- **Template authoring**: `}}` dentro de um default de slot quebra o parser
  (lazy match). Os templates do piloto não têm; validação de template no
  admin/lab fica para quando o CRUD de variantes ganhar UI.
- **commandGuard roda nos dois caminhos** (decisão pós-review): comandos
  explícitos do médico entram na conclusão até o DET-6 tratá-los como
  operações tipadas.

## Riscos aceitos no piloto

- Catálogo de tipos fechado e pequeno → casos reais fora do catálogo caem em
  `outro` (LLM delimitado) — medir taxa via generation_runs.
- Variante doppler: tabela literal no template; velocidades ditadas entram
  como params em DET-5.1 se necessário (golden 15 só exige a tabela presente).
- Comandos do médico (`comandos_do_medico`) continuam no fluxo atual
  (commandGuard) até o DET-6 (operações).
