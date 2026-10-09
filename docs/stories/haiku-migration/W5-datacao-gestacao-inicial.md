# W5 — Datação escolhida pelo médico + gestação inicial sem embrião (backend)

Terminal: o da W2 (Codex gpt-6.1-sol), **depois** de entregar a variante mínima (`fix/obst-extracao-minima`).
Branch nova a partir de `feat/haiku-migration` **depois** de o orquestrador integrar a variante mínima:
`feat/obst-datacao-escolhida`. Leia `_comum.md`. A web (W6) trabalha em paralelo com o contrato abaixo.

## Decisões do Dr. Luiz (09/10/2026, texto dele resumido)

1. **Só há IG de referência (sem IG pela biometria)** → a conclusão usa a de referência (nunca em branco).
2. **A divergência deixa de ser decidida por limiar** (hoje `ig.ts:338` mantém a biometria quando a diferença é pequena).
   Passa a ser uma ESCOLHA, com três frases para o item 1 da conclusão:

   | Modo | Frase |
   |---|---|
   | `biometria` | `Gestação em torno de {IG biometria}.` |
   | `us_precoce` | `Gestação em torno de {IG referência}, corrigida pela ultrassonografia precoce.` |
   | `biometria_e_us_precoce` | `Gestação em torno de {IG biometria} pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com {IG referência}.` (a frase atual de `ig.ts:352`) |

   - **Web:** o médico escolhe explicitamente (caixas de seleção — W6). O backend recebe o modo e obedece.
   - **Ditado (iOS/Android), sem modo explícito — prioridade:** (1) se há referência pela 1ª US → `us_precoce`;
     (2) senão → `biometria`; (3) se o médico pedir no ditado para **relacionar/correlacionar/comparar** com a 1ª US
     (ou ditar a própria frase "devendo ser corrigida…") → `biometria_e_us_precoce`. Se ele pedir para **manter a
     biometria** → `biometria`. Só referência, sem biometria → `us_precoce` (decisão 1).
   - "N semanas e D dias": use o formato que o renderer já usa ("36 semanas e 4 dias"; "1 dia" no singular).
3. **Gestação inicial sem embrião visível:** substituir as frases de embrião, batimentos e CCN por
   `Embrião ainda não visualizado.`; se também não há vesícula vitelínica: `Embrião e vesícula vitelínica ainda não
   visualizados.` (e sem a linha da vesícula). Exemplo do Luiz (modelo dele, transvaginal):

   ```
   Útero em anteversão, medindo X.X x X.X x X.X cm, apresentando imagem anecoica homogênea, que corresponde a saco
   gestacional medindo X.X mm de diâmetro médio, situado na região superior da cavidade endometrial.
   Embrião ainda não visualizado.
   Vesícula vitelina de forma e dimensões normais.
   Ovários de aspecto normal.

   CONCLUSÃO:
   1) Gestação inicial.
   2) Convém realizar nova ultrassonografia no prazo de duas semanas, com o objetivo de acompanhar a evolução.
   ```

## Contrato (fixo — a W6 depende dele)

- Entrada de renderização (catálogo/renderer obstétrico, morfológico e obstétrico com Doppler): opção
  `datacaoConclusao?: "biometria" | "us_precoce" | "biometria_e_us_precoce"`. Ausente = regra do ditado acima.
  Exponha-a no caminho que a web usa (`/api/catalog/[category]/render` e o estado do exame do catálogo — confira
  `apps/web/src/lib/catalog/obstetricaParaCatalogo.ts` e a rota) **sem quebrar clientes antigos** (campo opcional).
- Extração (ditado): o pedido do médico vira dado. Hoje existe `corrigir_ig` (boolean: true = "corrija/correlacione").
  "Corrigir" e "relacionar" agora levam a frases diferentes: proponha a menor mudança de contrato (ex.: enum
  `datacao_pedido: "corrigir" | "relacionar" | "manter_biometria" | null`), **com prompt, schema Zod, JSON Schema,
  consumidor e testes na mesma leva** (regra do README para o `OBSTETRICA_JSON_SCHEMA`), mantendo leitura de `corrigir_ig`
  antigo nos achados salvos.
- Data do exame: quando não ditada, para calcular a IG de referência de hoje a partir de "1ª US em DATA com X semanas",
  use a **data de geração do laudo (America/Sao_Paulo)** — proponha e documente; nunca a deixe implícita no modelo.

## Gestação inicial sem embrião — contrato

- Permitir `fetos = []` **somente** com `gestacao_inicial = true` e ausência de embrião explicitamente ditada; acrescente o
  estado de visualização (ex.: `embriao_visualizado`, `vesicula_vitelina_visualizada`) — a W2 já desenhou isto no
  `W2-relatorio.md` (seção "Proposta: gestação inicial sem embrião"): siga a proposta.
- Nesse estado o renderer omite presença, BCF, CCN, peso, anatomia e movimentos; mantém útero/saco/DSM, vesícula e
  anexos conforme ditado; conclusão "Gestação inicial." + a recomendação do exemplo.
- `gestacao_inviavel` **não** é acionado por "embrião ainda não visualizado".
- Casos reais para provar: 87bfacbe e a328ecec (bancada). Gemelar: um estado por saco, sem reduzir o número de sacos.

## Testes e bancada

Os 7 gates da W2 + testes novos dos três modos de datação (incluindo só-referência e só-biometria) e dos dois textos de
gestação inicial; `catalog-equivalence` vai mudar onde a política mudou — explique cada diferença. Bancada R,A em
OBSTETRICA, DOPPLER_OBSTETRICO e MORFOLOGICO (45 dias) contra a variante mínima.

## Fora do escopo

Web (W6). Motor/pipeline (W1). Não mexa em iOS/Android: o default do ditado é resolvido no backend.

## Entregável

Commits em `feat/obst-datacao-escolhida` + `docs/stories/haiku-migration/W5-relatorio.md`; status em `status/W5.md`.
