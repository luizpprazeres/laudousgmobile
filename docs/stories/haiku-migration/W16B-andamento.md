# W16B — Andamento da geração na tela (10/10/2026)

Parte B da W16 (`W16-latencia-extracao.md`). O lado da API está implementado atrás da flag `PROGRESS_ETAPAS`, na branch
`feat/w16b-andamento`. O app Swift fica só como proposta, com o diff em `W16B-ios.diff`: nada foi compilado nem
enviado.

## Diagnóstico

### Para onde vai o tempo

Medido no `generation_audit`, últimos 3 dias, só leitura. Obstetrícia com Haiku, mediana de 3 laudos:

| Etapa | Tempo |
|---|---|
| Total | 28,0 s |
| Extração | 16,7 s, com cerca de 4,4 mil tokens de saída |
| Sanity | 7,2 s, roda depois do `done` |
| Todo o resto (consultas, renderer, pós-geração, gravações) | 0,7 s |

A espera do médico até o laudo é de cerca de 21 s, e quase toda ela é extração. Isso tem duas consequências:

- **Mostrar o laudo por seções economizaria menos de 1 s.** O renderer e a pós-geração levam milissegundos depois da
  extração.
- **Pré-visualizar o laudo a partir do JSON parcial não é seguro.** O texto mudaria na tela, e a checagem
  fail-closed da obstetrícia existe justamente para não mostrar o que pode ser barrado.

A espera em si diminui com a W16A (extração sem raciocínio). A W16B cuida do que a tela mostra durante essa espera.

### O que a API emite hoje

Com a flag `RENDERER_PROGRESS`, no caminho do renderer:

| Evento | Quando |
|---|---|
| `open` | imediatamente |
| `stage interpretando` "Interpretando o ditado…" | no início da extração |
| `stage achado` (um por campo do JSON parcial) | durante a extração |
| `stage montando` "Montando o laudo…" | no fim da extração |
| `token` (fora da obstetrícia) | texto do renderer, antes da pós-geração |
| `done` | texto final |

Na obstetrícia o texto só sai junto do `done`, depois de três gravações no banco (`updateRunAfterWriter`,
`finalizeReport` e `auto_push`).

Há dois defeitos nesse fluxo:

1. **Os chips mostram campos que ninguém ditou.** O marco "achado" disparava quando o nome do campo aparecia no JSON.
   Como o schema exige todos os campos (com `null` quando não ditados), "peso fetal" e "1ª ultrassonografia" viravam
   chip em todo laudo.
2. **A tela fica parada por 15 a 20 s.** Com o raciocínio ligado, o JSON só começa a chegar depois dele. Até lá a tela
   mostra "Interpretando o ditado…" sem mudar nada, e os chips chegam todos juntos no fim.

### O que o app iOS faz

Conferido em `~/laudousg-swift/LaudoUSG`, branch `main`, c251247, só leitura.

**Como o app lê os eventos:**
- O parser lê só as linhas `data:` e decide o tipo pelo campo `type` do JSON.
- Um `type` desconhecido é descartado sem quebrar o stream, desde o primeiro commit.
- Campo extra é ignorado (comportamento padrão do Decodable).

**O que aparece na tela:**
- O `label` de cada `stage` vira a etapa atual. Um `stage: "achado"` vira chip em "Achados reconhecidos".
- O único texto fixo do app é "Interpretando o ditado…". Não há timer nem barra de progresso.
- O `token` acrescenta texto ao laudo, e o `done` substitui o texto inteiro.

**Limites e casos à parte:**
- O cliente tem limite de 120 s por geração.
- O onboarding ignora o `stage` e fica preso se o stream terminar sem `done`. Isso está fora desta frente.

O app RN valida cada evento com Zod e descarta os inválidos com um `warn`. Ignora o `stage`.

## API — implementado, atrás de `PROGRESS_ETAPAS` (default `false`)

O código está em `apps/api/src/server/pipeline/andamento.ts` e na rota.

| Etapa | Quando | `label` (o que o app atual mostra) |
|---|---|---|
| 1 recebido | logo após o `open` | "Ditado recebido" |
| 2 lendo | extração; no writer, até o primeiro texto | "Lendo o ditado…", depois "Lendo o ditado… 6 s", "… 9 s" (relógio a partir de 4 s, a cada 3 s); no writer, "Escrevendo o laudo… N s"; rótulos próprios do renderer são mantidos ("Conferindo vasos e medidas… N s") |
| 3 montando | fim da extração | "Montando o laudo…" |
| 4 pronto | `done` | `done.timings` |

Como funciona:

- **Funciona no app que já está na loja.** O relógio vai dentro do `label`, que o app já mostra. Os campos novos são
  todos opcionais e ignorados por clientes antigos:
  - `step`, `steps` e `elapsed_ms` no `stage`;
  - `timings` no `done`.
- **Os valores de `stage` não mudam** (`interpretando`, `achado`, `montando`), porque o RN descartaria um valor novo.
- **A flag liga também os eventos do renderer.** Desligada, a rota fica exatamente como antes.
- **Na obstetrícia o texto sai antes das gravações no banco.** A checagem fail-closed (`obstetricaPlainOutputWarning`,
  uma função pura) roda antes delas, e, se estiver limpa, o texto é enviado. Se houver aviso, nada é enviado e a
  checagem original derruba a geração, como antes. Ganho: as três gravações, cerca de 0,1 a 0,5 s.
- **Cada geração gera uma linha de log** sem PHI, para medir em produção:
  `andamento OBSTETRICA: recebido 0.1s · lendo 0.4s · montando 16.8s · texto 16.9s · done 17.2s`.

**Correção sem flag:** os chips só aparecem para campos com valor (número, texto não vazio, `true`, lista ou objeto
com conteúdo). Também foram acrescentados marcos da família obstétrica (saco gestacional, CCN, TN, placenta, líquido,
artéria umbilical, ACM, ducto venoso, uterinas, colo) e da pelve (útero, endométrio, miomas). Com a W16A, os chips
passam a aparecer um a um durante a extração, em vez de todos no fim.

**Testes:**
- `src/server/pipeline/__tests__/andamento.manual.ts`: 26/26, cobrindo:
  - etapas, relógio e tempos;
  - flag desligada sem nenhum evento;
  - eventos válidos no schema compartilhado;
  - chips com valor e sem valor;
  - valor ainda chegando, como `nu…`, não vira chip.
- Typecheck de API, web, mobile e shared limpo.

## App iOS — proposta (`W16B-ios.diff`, aplicar com `git apply` na raiz do `LaudoUSG-app`)

Mudanças em 3 arquivos, compatíveis com servidor sem a flag:

- `StagePayload` ganha `step`, `steps` e `elapsedMs` opcionais. `DonePayload` ganha `timings` opcional.
- **Com `step`:**
  - o rótulo perde o "… N s", para a etapa não animar a cada 3 s;
  - um relógio local (`TimelineView`, 1 s, números monoespaçados) aparece à direita a partir de 3 s, ancorado no
    `elapsed_ms` do servidor;
  - uma barra de 4 segmentos mostra a etapa: recebido, lendo, montando, pronto.
- **Sem `step`** (servidor antigo), o app mostra só o `label`, como hoje.
- `lastGenerationSeconds` guarda o tempo total do `done`, para um "Pronto em N s" se o Luiz quiser. A view não o
  mostra ainda.

Pontos que ficam fora, mas registrados:
- o onboarding preso sem `done`;
- `clarify`, que não aparece na tela de geração.

## Para ligar

1. Deploy da API com `PROGRESS_ETAPAS=true`. O app da loja já mostra as etapas e o relógio pelo `label`.
2. Ler a linha `andamento` nos logs e comparar com a W16A ligada.
3. App: decidir sobre o diff (indicador de etapas e relógio local).
