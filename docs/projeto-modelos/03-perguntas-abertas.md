# Perguntas abertas — decisões que dependem do responsável

- **Data:** 2026-08-09
- Só entram aqui perguntas cuja resposta **muda materialmente a arquitetura** ou
  **representa risco**. Dúvidas resolvíveis por inspeção foram resolvidas por inspeção.

---

## ✅ DECISÕES TOMADAS — 2026-08-09 (Luiz)

| # | Pergunta | Decisão |
|---|---|---|
| **Q1** | Base real de usuários | **Mobile/iOS é o foco.** A web é secundária. Construir no **banco A** (`yldtkqrsbgcnwlydrrot`), custo de migração de dados **zero**. A web se alinha depois. Não é preciso acesso ao banco B agora. |
| **Q2** | Filosofia de personalização | **Operações sobre o modelo-base**, ancoradas em `slot.id`. Com `replace_section` como válvula de escape para reescrita ampla. **Não** template integral. |
| **Q3** | Escopo | **Usuário, com a chave preparada:** modelar `(scope_type, scope_id)` desde a v1, aceitando apenas `scope_type = 'user'`. |
| **Q4** | Próximo passo | **Validar a viabilidade do renderer-como-interpretador agora** (read-only + prova de conceito local). |

Consequências diretas:
- A web (`~/laudousg`, banco B) **sai do caminho crítico**. Seu modelo de personalização
  (`templates`, `style_preferences`) permanece como referência de UX, não como fonte a migrar.
- `01-arquitetura-proposta.md` está **confirmada** nas seções §3.2 (operações) e §3.3 (banco A).
- Q5 (autorizações operacionais) e Q6 (renomear env / futuro do estilo OBJETIVO)
  seguem **abertas** — serão levantadas no momento em que forem necessárias.

---

## Q1 — Onde estão os usuários reais? 🔴 bloqueia a priorização

**Fato:** o banco A (mobile/iOS/lab/web-v2) tem **6 perfis**, **4 usuários geraram laudo
em 60 dias**, **2 ativos em 30 dias**. Todas as métricas de qualidade do projeto refletem
essencialmente um único médico.

O banco B (`laudousg.com`, a web em produção) está em outra organização Supabase, à qual
não tenho acesso — **não sei quantos usuários tem**.

**Por que muda a arquitetura:** se a base real está na web (banco B), o registry canônico
deveria nascer lá ou considerar a migração de personalizações **existentes** — e há
personalizações reais lá (`templates`, `style_preferences`). Se a base real é mobile,
podemos construir no banco A com custo de migração zero.

**O que preciso:** ou o acesso ao projeto Supabase `gimxiyjfuaqptahssqgb`, ou os números
(usuários ativos, laudos/mês, quantos usam `templates` e `style_preferences`).

---

## Q2 — Qual é a filosofia de personalização? 🔴 decisão de produto

Existem duas em produção, incompatíveis:

| | **A — Template integral** (web hoje) | **B — Operações sobre o base** (proposta) |
|---|---|---|
| O usuário faz | cola/edita o modelo inteiro | edita frases pontuais ancoradas em slot |
| Modelo-base evolui | usuário fica congelado no modelo antigo | usuário herda melhorias; conflita só onde tocou |
| Proteger invariante clínica | difícil (é texto solto) | validável operação a operação |
| Compatível com renderer determinístico | **não** | **sim** |
| Já tem usuários | **sim**, na web | não |

**Minha recomendação: B**, com uma operação `replace_section` como válvula de escape para
reescritas amplas. Razão: o briefing diz que "a maioria das alterações será pequena" e
exige "impedir que uma personalização comprometa regras clínicas essenciais" — o template
integral não permite nem uma coisa nem outra.

**O custo de escolher B:** se houver usuários com `templates` na web, é preciso um
importador que converta template integral → conjunto de operações (ou aceite conviver com
os dois modelos por um tempo). Isso depende de Q1.

---

## Q3 — Personalização é do usuário ou de uma conta/clínica?

**Fato:** hoje é **do usuário individual** nos dois bancos. Não existe tabela de
organização, clínica ou equipe em lugar nenhum. `profiles.plan` tem o valor `clinic`,
mas é só um rótulo de plano — sem entidade por trás.

Se "conta/clínica" (vários médicos compartilhando modelos) é objetivo de produto, é muito
mais barato modelar a chave como `owner_id + owner_type` **agora** do que migrar depois.
Se não é, introduzir a entidade é overhead puro.

**Recomendação:** modelar a chave como `(scope_type, scope_id)` desde o início —
com `scope_type = 'user'` como único valor aceito na v1. Custa ~nada agora, e evita
uma migração dolorosa depois. **Preciso apenas do seu sim/não sobre o objetivo de produto.**

---

## Q4 — O renderer determinístico pode ser convertido em interpretador de spec?

Esta é a questão técnica central, e a única que ainda não consigo responder por inspeção.

**Fato:** 13 categorias em produção montam o laudo em **código TypeScript**
(`renderer/categories/*.ts`, algumas com >1000 linhas). Nelas, hoje, **não há como o
usuário mudar uma frase**.

**Proposta (`01-arquitetura-proposta.md`):** extrair o modelo do código para a spec
estruturada (que já existe para 5 categorias em `writerV2/specs/*.json`) e fazer o
renderer **ler a spec**.

**O que não sei ainda:** se a spec de OBSTETRICA cobre 100 % do que o
`renderer/categories/OBSTETRICA.ts` produz, ou se o renderer tem lógica que a spec não
expressa (formatação condicional, cálculos, ramificações finas).

**Não preciso da sua decisão para isso** — preciso executar a validação. É o primeiro
passo técnico que proponho, e o critério é objetivo: **saída byte-a-byte idêntica nos
52 casos golden, com zero customizações.** Se não passar, a arquitetura muda e eu volto.

---

## Q5 — Autorizações operacionais que vou precisar (não agora)

Nada disso será feito sem confirmação explícita, item a item, no momento:

1. **Criar tabelas novas no banco A.** Só há um projeto Supabase — dev e prod são o mesmo
   banco. Proponho usar **Supabase branches** para testar a migration antes; preciso saber
   se o plano da conta permite.
2. **Ligar qualquer feature flag em produção.**
3. **Arquivar `apps/lab`** (verifiquei que não quebra nada — mas é decisão sua).
4. **Acesso ao banco B**, se Q1 apontar para lá.

---

## Q6 — Duas perguntas menores, com recomendação embutida

- **`WRITER_V2_ABDOME_USER_ID` × `WRITER_V2_USER_ID`** — o env de produção tem um nome,
  o código lê outro. Isso mantém o Writer V2 desligado, o que **é** o estado desejado
  hoje. Recomendo apenas renomear a env para o nome correto e deixá-la vazia, para que o
  desligamento seja intencional e não acidental. *Não faço sem seu ok.*
- **Estilo OBJETIVO** — nenhum laudo foi gerado nesse estilo desde **03/06/2026**, e os
  452 existentes usam cabeçalhos que a documentação diz terem sido rejeitados. O projeto
  pede "clássico e objetivo claramente representados". **Confirma que o OBJETIVO continua
  sendo um objetivo de produto?** Se sim, ele precisa de conteúdo curado próprio — hoje é
  o clássico com cabeçalhos trocados em runtime.
