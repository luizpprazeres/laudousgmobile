# Camada flexível (inusitado) + Coringa — Design

> Motor generativo que faz o app "entender o que o médico fala" como o GPT, sem
> perder o determinismo dos cálculos. Mesmo motor, dois alcances:
> - **Camada flexível:** slot generativo DENTRO de um laudo renderer (pro inusitado).
> - **Coringa:** laudo inteiro generativo para categorias SEM renderer (nunca bloquear).
>
> Origem: análise GPT×app (2026-06-18). Ver `[[arquitetura-ux-modelo]]`. 1ª pedra
> (never-block: renderer falha → writer) já em prod (commit `9a17c66`).

## O problema (revisão)
O renderer é um colete-de-força: o schema só tem campos conhecidos. Conteúdo
clínico que não mapeia (ex.: "o exame atual comparado ao anterior mostra evolução
normal" — caso real 6) é **dropado**. O GPT generativo tece em prosa → "entende".

## Princípio: 3 tipos de fala (NÃO transcrever tudo)
A regra de ouro do "nunca dropar o inusitado" é **classificar a intenção**:

| Tipo | Exemplo | Tratamento |
|---|---|---|
| **Conteúdo clínico** | "comparado ao anterior de 19/05, evolução normal" | **PRESERVAR** limpo (vai pro laudo) |
| **Comando** | "adicione um item", "vírgula", "corrija o item 1" | **EXECUTAR** (DET-6), nunca transcrever |
| **Ruído** | "é… deixa eu ver… então" | **DESCARTAR** |

As "frases nada a ver" dos laudos antigos eram comando/ruído transcritos como
conteúdo. A camada flexível **interpreta** — não despeja.

## Arquitetura (camada flexível — escopo renderer)
1. **Extração estendida:** além dos campos estruturados, capturar:
   - `itens_conclusao_livres: string[]` — afirmações clínicas LIMPAS que o médico
     quer na conclusão e que não têm campo (ex.: comparação com exame anterior).
   - `observacoes_corpo_livres: string[]` — idem para o corpo.
   - Regra de extração: capturar a SUBSTÂNCIA nas palavras do médico, SEM as
     palavras de comando ("adicione um item", "no final coloque") e SEM ruído.
     NUNCA inventar; só o que foi realmente dito como conteúdo.
2. **Renderer insere** esses itens livres APÓS os itens determinísticos
   (numeração contínua), preservando "corpo descreve / conclusão conclui".
3. **Comandos** (replace_phrase, remove_item, "vírgula"→",") → operações DET-6
   (já existe o aplicador `applyOperations` + `commandOperations`).

## Arquitetura (coringa — escopo categoria sem renderer)
- Tier de fallback generativo: prompt GENERALISTA (regras globais: estrutura
  COMENTÁRIOS/ASPECTOS/CONCLUSÃO, descreve no corpo / conclui na conclusão sem
  repetir, executa comandos, menos alucinação — fonte: `~/laudousg/globalRules.ts`).
- Modelo que "pensa mais" (orçamento ~15s, é fallback → reasoning ACEITÁVEL aqui):
  candidato gpt-4.1 cheio ou gpt-5/low-reasoning. A definir por benchmark de
  qualidade (não de velocidade — fallback pode ser lento).
- Já existe `runWriterStream`; o coringa é o writer com prompt generalista quando
  não há bundle/renderer (hoje cai em BUNDLE_EMPTY → bloqueio; o never-block já
  redireciona renderer→writer, falta o writer ter um prompt generalista de último
  recurso para categoria SEM bundle).

## Risco central + mitigação
O perigo é a camada flexível virar porta de alucinação/lixo (o oposto do objetivo).
Mitigações:
- Extração `temp 0` + instrução estrita "só conteúdo DITADO, limpo; nunca comando,
  nunca ruído, nunca inventar".
- Itens livres entram SEMPRE depois dos determinísticos, nunca os sobrescrevem.
- Golden com ditados reais (caso 6 = comparação) garante que captura a substância
  e NÃO o "adicione um item"/"vírgula".

## PoC (2026-06-18) — resultado com ditados REAIS
Harnesses: `__tests__/camada-flexivel-poc.manual.ts` (isolado) e `-poc2.manual.ts`
(schema completo). Achados:
- ✅ **Conteúdo extra genuíno é captado LIMPO.** Caso 6 → `itens_conclusao_livres =
  ["exame atual comparado ao anterior, realizado 19/05/2026 mostra evolução normal"]`
  — só a comparação, sem "adicione um item", sem ruído.
- ⚠️ **Risco confirmado: DUPLICAÇÃO.** Quando o médico dita VERBATIM algo que já é
  determinístico (caso 3: ditou a frase inteira da correção de IG), a extração às
  vezes joga isso nos itens livres → IG sairia DUAS vezes. Inconsistente (caso 6 não
  duplicou, caso 3 sim).
- 🔑 **O campo livre PRECISA conviver com o schema completo** — isolado, super-captura
  (joga IG/1ªUS nos livres por não ter onde mais pôr).

### Mitigação obrigatória (cinto-de-segurança)
1. **Prompt estrito:** "NÃO repita em itens_conclusao_livres nada já capturado por
   campo próprio (IG, correção, 1ª US, líquido, peso), MESMO que o médico tenha
   ditado a frase inteira — isso já é gerado pelo sistema."
2. **Guard determinístico no renderer:** remover itens livres cujo texto bata com os
   padrões já produzidos deterministicamente (regex: "pela biometria atual, devendo
   ser corrigida", "Gestação em torno de", "Líquido amniótico", "Peso aproximado").
   Código pega o que o prompt deixar passar. É o mesmo princípio do resto do sistema.

## Fases sugeridas
1. ✅ **PoC de extração** — feito (acima): conteúdo extra captado limpo; risco de
   duplicação mapeado + mitigação definida.
2. Estender schema OBSTETRICA (e depois transversal) com `itens_conclusao_livres`
   + prompt estrito + **guard de dedup determinístico**.
3. Renderer insere os itens livres (após os determinísticos), passando pelo guard.
4. Coringa: prompt generalista de último recurso no writer (categoria sem bundle).
5. Golden com ditados reais (caso 6 = captura; caso 3 = NÃO duplica) + review dex1/dex2.
