# W10 — Rodada de prompts por categoria (método da W9, versão enxuta)

Leia antes: `_comum.md`, a seção W9 de `docs/reviews/2026-10-revisao-renderers-prompts.md` (o modelo a seguir) e
`docs/estilo-casa-regras-gerais.md`.

## Objetivo do Dr. Luiz (10/10/2026)

"Algo que funcione bem, **o mais enxuto possível** para facilitar para a IA (sem comprometer a passagem de informação),
evitando prolixidade e aumentando a taxa de sucesso dos laudos" — como foi feito no MSK. Ordem de prioridade:
**pelve (TA, TV e TA+TV) → abdome → vias urinárias → mamas e axilas → tireoide.**

## Método (igual à W9, com duas restrições novas)

1. **Medir antes** (determinístico, sem juiz, barato): placar por categoria contra o laudo FINAL — frases de normalidade
   do modelo da categoria que estão no final e faltam no candidato; padrões de redação do médico seguidos; invenções
   detectáveis (normalidade presumida, medida/unidade, "____"/"0,0"); cabeçalhos/estrutura; numeração. Reaproveite e
   generalize `scripts/bench-haiku/placar-msk.ts`.
2. **Padrões reais do médico**: laudos finais de 90 dias (banco, **só leitura**); exemplos curtos e anonimizados (só a frase).
3. **Prompt enxuto** — restrição nova: o prompt final da categoria (o system que o modelo recebe de fato: global +
   contrato + estilo + biblioteca/bundle + writer dedicado) deve ficar **igual ou menor** que o atual, salvo justificativa
   medida. Remova redundância, regras contraditórias e instruções de outras categorias (ex.: o protocolo de líquido
   amniótico aparece no prompt do abdome). Prefira uma regra positiva + um exemplo real a várias proibições. Reporte o
   tamanho (caracteres e tokens estimados) antes × depois.
4. **Bancada pela assinatura** com `BENCH_MODEL` **explícito** em todo candidato (achado de método da W9): produção,
   antigo e novo julgados juntos pelo mesmo juiz. Itere com o placar determinístico (só Haiku/Sonnet gerando); **chame o
   juiz só na rodada final**, concorrência 2 — quatro frentes dividem a mesma assinatura e ela já bateu o limite e
   deslogou duas vezes. Se cair ("Not logged in" / limite), registre no status e espere.
5. Testes/gates da categoria + typecheck; HTML local da rodada final para o Luiz.

## Donos de arquivo (para não haver conflito entre frentes)

- `prompts/global.ts`, `prompts/buildSystemMessage.ts`, `prompts/styles.ts`, `prompts/universalCoreV2.ts`: **só a W10b**
  (abdome + vias). Mudança aqui afeta todas as categorias do writer: meça em abdome, vias **e** em pelo menos uma
  terceira categoria antes de commitar. As outras frentes que precisarem mexer: proponham no status, o orquestrador repassa.
- Cada frente edita só o contrato/prompt dedicado/extração da sua categoria.
- **Biblioteca no banco** (`knowledge_blocks`, modelos e regras): **não altere o banco.** Proponha o SQL no relatório e,
  se o efeito precisar ser medido, injete o bloco proposto só na bancada.

## Entregável de cada frente

Branch própria a partir de `feat/haiku-migration`, commits, seção na revisão (`docs/reviews/2026-10-revisao-renderers-prompts.md`),
HTML local, status `status/<W>.md`. Nada de push/deploy.
