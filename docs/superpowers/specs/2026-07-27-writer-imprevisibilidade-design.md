# Design — Writer robusto à imprevisibilidade (escrita pura + reasoning)

> Data: 2026-07-27. Autor: Claude (brainstorming com o Dr. Luiz).
> Contexto: decisão de **voltar ao writer anterior** (escrita pura + guards) e
> aposentar o Writer V2 (plano+montagem). O V2 está desligado em prod
> (`WRITER_V2_CATEGORIES=OFF`). Este design melhora o writer anterior no ponto
> que mais incomoda: **omissão do inesperado**.

## Problema

O writer anterior (LLM escreve o laudo a partir do modelo da categoria + estilo da
casa + few-shots, com guards conferindo depois) funciona bem, mas às vezes
**omite o inesperado**: tanto **comandos de edição** ("coloque uma frase X no fim
da conclusão", "após a frase da bexiga acrescente Y", "não descreva Z") quanto
**achados atípicos** (algo clínico sem lugar fixo no modelo). Causa: a instrução
forte de "usar o modelo na íntegra" faz o writer completar o template e descartar
o que não encaixa. A tensão preservação-vs-completude pende para o lado errado.

Prioridade nº1 do Luiz: **eliminar a omissão do inesperado.** (Alucinação,
quebra-de-modelo e má-colocação são secundários — os guards já ajudam.)

## Princípios de design (o que o Luiz definiu)

1. **Compreensão holística — nunca fragmentar.** A força de falar em linguagem
   natural é a IA entender a mensagem inteira. Qualquer mecanismo que isole um
   trecho e reflita sem o resto pode isolar a área errada ou julgar sem contexto
   (foi o erro do plano+montagem). O writer lê tudo e escreve holisticamente.
2. **Julgar sinal vs ruído — o objetivo NÃO é incluir 100% do transcrito.** Sinal
   (comando, diagnóstico, achado com intenção) vale; ruído (lixo de transcrição,
   frase abandonada, palavra solta) **pode e deve morrer**. Só o que tem intenção
   entra na conta da completude.
3. **Completude do que é MEANINGFUL vence a preservação quando conflitam.** Se um
   comando/achado com intenção não encaixa no modelo, ele **entra assim mesmo**,
   no melhor lugar — não é descartado para manter o template.
4. **Comando se executa pela INTENÇÃO, nunca se ecoa a letra.** "adicione uma
   frase sobre o tórax fetal normal" → escreve "O tórax fetal é normal." no lugar
   pedido; NUNCA insere a string do comando, NUNCA duplica.
5. **Colocação:** achado inesperado → CORPO na posição anatômica coerente
   (morfologia pura); CONCLUSÃO só se o diagnóstico for explicitamente ditado.
   Comando de posição explícito é honrado.
6. **Estilo da casa:** termos usar/evitar e sequência vêm de
   `docs/estilo-casa-regras-gerais.md` + few-shots (não inventar).

## Arquitetura (enxuta, na ordem que minimiza latência)

### Camada 1 — Writer holístico reforçado (defesa principal)
Reforçar o system message do writer para codificar os princípios 1–6 acima, com
destaque para:
- **Regra de completude:** "Não descarte nada que o médico disse com intenção.
  Se um comando ou achado não tem lugar no modelo, inclua-o no melhor lugar —
  incluir o que foi pedido vence preservar o template quando os dois conflitam.
  MAS: ruído de transcrição, frases abandonadas e palavras soltas sem intenção
  clara devem ser ignorados (não force conteúdo sem sentido)."
- **Comandos:** "Trechos que são INSTRUÇÃO ('coloque/acrescente/após a frase/não
  descreva/troque') são executados pela INTENÇÃO — produza o texto que a
  instrução pede, no lugar pedido; nunca escreva as palavras do comando; nunca
  duplique conteúdo que já existe."
- **Colocação:** princípio 5, explícito.
Colocar as regras críticas no **começo e no fim** do prompt (primazia/recência),
com seções claras e prioridades explícitas.

### Camada 2 — Reasoning no writer (auto-check numa chamada só)
Ligar reasoning no modelo do writer. Um modelo que raciocina **relê e se confere
internamente**, numa única chamada — o raciocínio É a segunda leitura, holística,
sem round-trip extra. O writer já tem uma instrução de CoT (`buildCoTInstruction`);
esta camada troca para reasoning de verdade. Resolve a maior parte da omissão sem
custo de latência de uma segunda chamada.

### Camada 3 — Segundo leitor holístico e conservador (rede gated, SÓ SE PRECISAR)
**Não implementar de cara.** Primeiro medir (camadas 1+2). Se ainda escapar
omissão, adicionar: um DETECTOR barato (verbos de comando; ditado maior que o
padrão; conteúdo fora do modelo) marca casos não-triviais; nesses, um **segundo
leitor** relê a MENSAGEM INTEIRA + o laudo e pergunta "ficou faltando alguma
INTENÇÃO clara?" — enviesado ao silêncio (só falha óbvia, nunca ruído), entende
duplicação, executa por intenção. Reparo cirúrgico e dedup-aware. Nunca fragmenta.

## O que NÃO fazer
- **Não reviver RAG** (busca por embeddings, aposentada). A "relevância" é obtida
  por conteúdo estático por categoria (contrato/modelo + estilo + few-shots).
- **Não voltar ao plano+montagem** (formulário rígido de slots).
- **Não isolar trechos** para reflexão fora de contexto.

## Otimização de contexto grande (para o futuro)
Se as instruções crescerem: relevância por categoria (não despejar a biblioteca);
cache de prefixo estável (já usam prompt caching); estruturar para atenção
(regras críticas nas pontas, seções, prioridades); exemplos > regra verbosa;
deduplicar/remover contradições; reasoning para navegar contexto grande. O risco
real é "perdido no meio", mitigado por relevância + estrutura, não por despejar mais.

## Rollout seguro (canário)
O writer serve TODOS os usuários — mudança no prompt é de alto impacto. Portanto:
1. Implementar numa branch, atrás de um **flag/gate** (conta do Luiz ou
   `writer_variant`), como se fez com o V2.
2. **Validar contra laudos reais** (a revisão dos últimos 100 laudos dá casos +
   baseline de defeitos). Rodar o writer melhorado nos ditados reais e comparar
   omissão antes/depois.
3. Só então abrir para todos.

## Validação / métrica de sucesso
Sucesso = **queda mensurável de OMISSÃO** (comandos e achados inesperados que
sobrevivem no laudo) sem aumento de alucinação/quebra-de-modelo, nos casos reais
dos últimos 100 laudos + nos ditados-teste do Luiz (IG, placenta, comando da pelve
renal, "saco solto", o exemplo do tórax).

## Frentes de trabalho (jornada autônoma)
- **F1** — Mapa do stack do prompt atual (Dex1) → base para o reforço.
- **F2** — Revisão dos últimos 100 laudos (Dex2) → defeitos classificados +
  exemplos → insumo do reforço + baseline de validação.
- **F3** — Reforço do prompt (Camada 1) atrás de flag.
- **F4** — Ligar reasoning (Camada 2) + resolver custo/latência.
- **F5** — Validar contra os casos reais; iterar; medir omissão antes/depois.
- **F6** — (Condicional) Camada 3 se a omissão persistir.
- **F7** — Propostas de melhoria de prompt + pontos de atenção (do F2) para o Luiz.

---

## Apêndice — Rascunho dos blocos de reforço (Camada 1, model-agnostic)

Baseado no mapa do Dex1 (global.ts) + achados do Dex2 (omissão de placenta/CCN,
comandos ecoados literais, duplicação obstétrica, diagnóstico inventado). Entram
em `global.ts` (GLOBAL_RULES_BLOCK / buildCoTInstruction) atrás de flag, e resolvem
as contradições que o Dex1 achou. Texto a validar contra os 100 laudos.

### Bloco 1 — COMANDOS DO MÉDICO (executar por INTENÇÃO)
> O médico às vezes dá INSTRUÇÕES de edição, não só descrições. Reconheça-as e
> EXECUTE a intenção — nunca escreva as palavras do comando, nunca duplique.
> - "após/depois da frase de X, acrescente Y" → insira a frase de Y logo após a
>   frase de X, no CORPO, redigida no estilo da casa (ex.: "adicione uma frase de
>   tórax fetal normal" → escreva "O tórax fetal é normal.", NÃO a instrução).
> - "não descreva / remova / sem X" → OMITA a estrutura X do laudo.
> - "troque a frase de X por Y" / "no lugar de X escreva Y" → substitua.
> - "no final da conclusão / item N da conclusão = Z" → posicione conforme pedido.
> Antes de finalizar: confira que cada comando foi CUMPRIDO (a intenção realizada)
> e que o conteúdo NÃO aparece duplicado (uma vez a instrução + uma vez o efeito).

### Bloco 2 — INCLUIR O QUE TEM INTENÇÃO, IGNORAR O RUÍDO
> Inclua TUDO que o médico disse com INTENÇÃO — achados, medidas, ressalvas,
> comandos — mesmo que não haja lugar previsto no modelo (nesse caso, encaixe no
> ponto mais coerente). Incluir o que foi pedido VENCE preservar o template quando
> os dois conflitam. PORÉM: trechos que são claramente RUÍDO — lixo de transcrição,
> frase abandonada/interrompida, palavra solta sem sentido clínico, hesitação —
> devem ser IGNORADOS (não force conteúdo sem intenção só para "não deixar nada de
> fora"). Julgue lendo a mensagem INTEIRA: o que tem intenção fica; o ruído morre.
> Checklist final (amplie o atual): liste TUDO que o médico disse com intenção
> (não só as categorias do template) e confirme que cada um aparece — no corpo, na
> conclusão ou executado como comando. Se faltar algo com intenção, reescreva.

### Bloco 3 — ONDE COLOCAR O ACHADO INESPERADO
> Achado atípico SEM comando de posição: descreva no CORPO, na posição anatômica
> coerente (morfologia pura — ecogenicidade → margens → medida → localização),
> SEM nomear diagnóstico ali. Só leve à CONCLUSÃO se o médico DITAR/pedir o
> diagnóstico — NÃO infira diagnóstico a partir da anormalidade por conta própria.
> Na dúvida sobre o diagnóstico, descreva no corpo e não afirme na conclusão.

### Contradições a resolver (do mapa do Dex1)
- Numeração: unificar em "1)" (remover a exceção "1. 2. 3." de ABDOMEN_TOTAL —
  global.ts:89 e contracts/ABDOMEN_TOTAL.ts:103 — batendo em estilo:59/global:223).
- Diagnóstico: alinhar o exemplo do estilo OBJETIVO (styles.ts:68, hoje com
  "compatível com esteatose" nos ACHADOS) à regra "diagnóstico só na conclusão"
  (estilo:17) — OU documentar explicitamente a exceção do estilo OBJETIVO.

### Validação (offline, sem risco de prod)
Harness que roda os 100 ditados reais (raw_input) pelo writer com prompt A (atual)
vs B (reforçado), e compara: nº de achados/comandos ditados que SOBREVIVEM (queda
de omissão), duplicações, diagnósticos inventados. Rollout só após B ganhar.
