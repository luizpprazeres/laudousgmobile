# Web × motor clínico — o que fazer com o item #11

**Status:** decisão pendente do Luiz. Não é tarefa de implementação.
**Levantado em 19/08, com parecer adversarial do Codex.**

> ## ⚠️ Atualização da noite de 19/08 — o risco deixou de ser hipotético
>
> Hoje o catálogo entrou em produção no mobile e **corrigiu um óbito fetal**: o
> Luiz ditou *"batimentos cardíacos fetais não visualizados pelo modo B e nem
> pelo modo Doppler"* e o renderer clássico escrevia *"Batimentos cardíacos
> ritmados (BCF = ____ bpm)"*. O catálogo escreve a ausência e conclui
> *"Feto sem vitalidade"* (laudo `e113211c`).
>
> **A web não tem como pegar isso.** Verificado no código: o sanity dela extrai
> um BCF **numérico** — `lib/sanityCheck/extractor.ts:60`, faixa 50–280 bpm — e
> não existe regra alguma para AUSÊNCIA de batimentos. Um ditado de óbito fetal
> não produz `bcf_bpm`, não dispara nada, e o texto sai como o LLM escrever.
> O `lib/deterministic/` cobre fígado, rim, baço, pâncreas, tireoide, vesícula e
> vias biliares. **Obstetrícia não está lá.**
>
> Correção ao que este documento dizia antes: a web **não** está sem guard
> nenhum — ela roda normalização de decimais e o sanity determinístico local
> depois do LLM (`app/app/generate/page.tsx:1223`). Mas esses guards são de
> forma, não de conteúdo clínico.
>
> **Decisão operacional tomada com o Codex em 19/08:** o gerador da web (`/app/
> generate` e `app/api/generate`) é **área protegida** até a integração
> canônica. Redesenho de Histórico, Preferências, Biblioteca, Analytics e do
> shell responsivo segue livre — nada disso se perde. O que espera é
> funcionalidade clínica nova e redesenho profundo do gerador.

## O achado

A web (`~/laudousg`) **não tem nada** do trabalho determinístico obstétrico.

| | mobile (`apps/api`) | web (`~/laudousg`) |
|---|---|---|
| Geração obstétrica | renderer + catálogo, determinístico | **LLM puro** (`LLM_BASE_URL`) |
| Guards clínicos | vitalidade, biometria, IG do Domingos, 76 invariantes | nenhum |
| Motor determinístico | por categoria | por ÓRGÃO (fígado, rim, tireoide…), **sem obstétrica** |
| Backend | próprio | próprio e independente |

Ou seja: **um óbito fetal ditado na web corre o mesmo risco que corríamos no
mobile antes do catálogo** — e provavelmente pior, porque lá nem o renderer
clássico existe.

## As saídas

| | Custo | Dívida criada |
|---|---|---|
| **(a) web → API clínica canônica** | integração server-to-server, auth entre dois Supabase | nenhuma — **uma fonte só** |
| (b) extrair para `packages/renderer` | refatorar `@/server/*` em ~10k linhas | nenhuma, mas é (a) com passos a mais |
| (c) portar/duplicar | rápido | **terceira cópia do texto clínico** |

**Recomendação: (a).** (c) garante divergência em semanas — é exatamente a
dívida que recusamos quando decidimos derivar os modelos em vez de escrever
doze catálogos.

## Como o Codex refinou (a)

> *"web → seu próprio backend → API clínica canônica, não navegador → endpoint mobile."*

**Menor primeiro passo:** pilotar **só OBSTETRICA**, por um adaptador
server-to-server. A rota da web continua autenticando o usuário e controlando a
assinatura; chama uma **rota interna nova** do backend canônico com identidade
de sistema, `request_id` idempotente, categoria, ditado e origem; e traduz o SSE
canônico para o formato que a tela já entende.

**Os contratos não batem hoje:**

```
web envia      category / templateId / findingsText   → espera content, done
canônico exige raw_input / category_hint / writing_style_id
canônico emite clarify, blocked, sanity, done.final_text  + cria report no banco
```

### Três armadilhas que o Codex apontou

1. **Não enviar o JWT do Supabase da web** — o backend mobile valida contra
   **outro projeto** Supabase (`auth/verifyJwt.ts`).
2. **Não usar um usuário técnico compartilhado** no `/api/generate` atual: ele
   insere reports e runs **associados ao usuário autenticado**. Produziria
   auditoria e autoria falsas.
3. **Em indisponibilidade, falhar visivelmente** — nunca voltar ao LLM puro em
   silêncio, senão o médico recebe um laudo sem guards achando que tem.

### O que o adaptador precisa decidir

- não duplicar o report no banco mobile; registrar auditoria com `origin=web` e
  `external_request_id`
- a web continua salvando no próprio banco e incrementando a própria cota
- `clarify`, `blocked` e erro precisam ser **traduzidos**, não ignorados

## A decisão de produto que é do Luiz

Hoje a web aplica **template integral, regras pessoais, estilo e laudos de
referência** do médico. O renderer canônico **não consome nada disso**.

Para OBSTETRICA, o Codex escolheria segurança e previsibilidade — e eu
concordo. Mas o usuário precisa **saber** que o template dele não será aplicado
nesse caminho. Isso é troca de produto, não detalhe técnico.

## Sobre (b), se um dia for o caminho

O alias `@/server/*` é o problema fácil. O difícil, nas palavras do Codex: *"o
renderer não é um módulo puro"* — ele lê `env()`, chama guards, toca o banco.
Extraí-lo exige purificá-lo antes.
