# Arquitetura de 3 modos — comprehension vs formulário (design)

> **Data:** 2026-07-02. **Autores:** Luiz (visão de produto) + Claude + dex1.
> **Origem:** o Luiz sentiu que "estamos enxugando gelo" e que o renderer trata linguagem
> natural como uma "máquina burra preenchendo lista de compras em japonês". Diagnóstico
> confirmado: o renderer é ótimo pra exame-FORMULÁRIO e ruim pra exame-LINGUAGEM.
> **Este doc é DESIGN — nada implementado ainda. Decisões abertas marcadas com ❓.**

---

## 1. O diagnóstico (por que dói)

| | Renderer (hoje, 13 categorias) | Writer |
|---|---|---|
| O que faz | LLM EXTRAI campos → CÓDIGO monta template | LLM ESCREVE o laudo (prompt base + template + ditado) |
| Entende linguagem natural? | **NÃO** — só o que casa com o schema | **SIM** — lê intenção |
| Achado fora do schema | dropa / ecoa cru / **frase-neutra sem sentido** | tece em prosa |
| Comando misturado no ditado | precisa comando pré-setado | entende nativo |
| Velocidade | 2-4s | era 14s (modelo antigo); rápido hoje = 3-5s |
| Segurança | alta (determinístico) | precisa guards de FATO |

**A dor:** ao empurrar TUDO pro renderer (por velocidade), sacrificamos a compreensão.
Categorias ABERTAS (MSK, partes moles) quebram — o espaço de achados é ilimitado, então o
schema rígido sempre dropa/ecoa. A **frase-neutra** ("alteração ecográfica na topografia
avaliada, detalhada na conclusão") é o sintoma máximo: **o sistema sabe que não entendeu e
publica algo genérico** — pior que o writer variável. (Prova: os mesmos achados no ChatGPT
saem perfeitos, porque ele ENTENDE.)

**Fato-chave:** o writer_guarded que resolve isso **já existe ~80%** — `buildSystemMessage`
(prompt base) + bundle RAG (`modelo`/`regra`/`frase`) + few-shots. Só foi desligado (categorias
movidas pro renderer) e roda num modelo rápido sem reasoning (`gpt-4.1-mini`, effort=none).

## 2. Os 3 modos (dex1 + Claude)

1. **`renderer_strict`** — exame É formulário de campos fixos. Rápido, seguro, completo.
2. **`renderer_with_free_slots`** — formulário + SLOT livre pro inusitado (camada flexível:
   `docs/camada-flexivel-design.md`). O LLM tece só o conteúdo que não mapeia; o resto é código.
3. **`writer_guarded`** — exame É linguagem médica aberta. LLM ESCREVE (prompt base + template
   + few-shots + streaming), com guards DETERMINÍSTICOS só pros FATOS críticos (não pra prosa).

> *"Renderer onde o exame é formulário; writer-guarded onde é linguagem."* — dex1

## 3. Classificação das categorias (❓ decisão do Luiz — ele conhece o padrão de ditado)

Proposta inicial (Claude) — o Luiz refina:
| Categoria | Modo proposto | Por quê |
|---|---|---|
| OBSTETRICA / MORFOLOGICO / DOPPLER_OBSTETRICO | renderer_with_free_slots | biometria/Doppler = campos fixos, MAS precisa slot p/ frase livre ("adrenais fetais", comparação) |
| TIREOIDE | renderer_with_free_slots | nódulos = atributos fixos + slot |
| PROSTATA_SUPRAPUBICA / VIAS_URINARIAS / ABDOMEN_* | renderer_with_free_slots | órgãos = catálogo fixo + slot |
| MAMARIA / PELVE_FEMININA | renderer_with_free_slots | lesões catalogadas + slot |
| CERVICAL | ❓ | níveis + achados variáveis |
| **MUSCULOESQUELETICO** | **writer_guarded** | achados ILIMITADOS (qualquer tendão/pathology); o Luiz dita livre |
| **PARTES_MOLES** | **writer_guarded** | lesão de qualquer tipo/topografia |

**Regra prática:** se o Luiz consegue listar TODOS os campos possíveis do exame numa tabela →
renderer. Se o exame é "ele descreve o que vê em prosa" → writer_guarded.

## 4. O `writer_guarded` (o "modelo ideal" do Luiz, já 80% pronto)

Os 3 elementos que o Luiz descreveu = exatamente isto:
1. **Prompt base** — `buildSystemMessage` (global + contrato da categoria + regras da casa).
2. **Template** — bundle RAG (`modelo` = estrutura da casa; `regra`/`frase`/`conclusao`).
3. **LLM extrai o que falo + instruções + aplica o template** — o writer, ENTENDENDO o ditado
   em linguagem natural (medidas + comandos + conteúdo livre, tudo junto), escreve o laudo.

Adições necessárias:
- **Few-shots do CORPUS** — as frases canônicas de `aprendizado-correcoes-luiz.md` viram
  EXEMPLOS no prompt (não guards pós-hoc). O modelo aprende o estilo da casa.
- **Streaming** — o médico vê tokens na hora (velocidade percebida).
- **Modelo rápido + inteligente** — ❓ testar Haiku 4.5 / GPT-5-instant vs gpt-4.1-mini
  (hoje effort=none). Comprehension > velocidade crua aqui.
- **Auditoria de FATO determinística (pós-writer)** — NÃO regex de prosa. Verifica: toda medida
  ditada presente? lado certo? achado ditado no laudo? Se um FATO crítico foi dropado →
  **RE-RODA** com mensagem de correção (dex1: rerun curto > entregar errado), não remenda.
- **Guards clínicos** (vitalidade/gemelar/BI-RADS): alertam ou re-rodam; NUNCA frase-neutra.

## 5. O fluxo de linguagem natural (o requisito matador)
Ditado real do Luiz: *"DBP tal, ACF tal… adicione uma frase sobre adrenais fetais… voltando,
placenta tal"*. O `writer_guarded` lida NATIVO — lê intenção, não exige comando pré-setado.
Isso é o que o ChatGPT faz e o renderer nunca fará. **É o coração do produto.**

## 6. Segurança sem o "inferno de guards" (dex1)
- Guards determinísticos PÓS-writer bastam pra OBJETIVO: placeholder, medida dropada, lado
  trocado, item de conclusão faltando, comando explícito.
- NÃO bastam pra "a prosa ficou clinicamente ruim" — isso vem do modelo/prompt/few-shots.
- Quando o checker detecta perda de fato → **rerun com correção**, não regex no texto final.
- Regra de ouro: **nunca publicar quando não entendeu** (sem frase-neutra) — rerun ou sinaliza.

## 7. O papel do corpus (reenquadrado)
`aprendizado-correcoes-luiz.md` deixa de alimentar GUARDS e passa a alimentar:
- **Few-shots** do writer (exemplos de estilo/frase canônica).
- **Casos de teste da auditoria de fato** (golden: "esta medida ditada tem que aparecer").
Isso é o antídoto do "enxugar gelo": aprendizado vira compreensão + teste, não mais polícia.

## 8. Velocidade — o que mudou
- "14s" = modelo antigo + RAG pesado + sem streaming.
- Hoje: modelo rápido (Haiku 4.5 / GPT-5-instant) + streaming = ~3-5s percebidos como instantâneos.
- Renderer segue pros formulários (mantém os 2-4s onde faz sentido). **Não é tudo-ou-nada.**

## 9. Plano de migração (incremental, reversível, review dex1)
1. **Piloto MSK → writer_guarded**: tirar do RENDERER_CATEGORIES; curar template + few-shots
   (do corpus); testar modelo rápido; auditoria de fato; **comparar com a saída do ChatGPT nos
   casos reais do Luiz**; review dex1. Medir latência/qualidade/custo.
2. **PARTES_MOLES** → writer_guarded.
3. **Free_slots** nas categorias bounded (camada flexível) p/ o ditado misto de linguagem natural.
4. Classificar e DOCUMENTAR o modo de cada categoria (registro central).
5. Corpus → few-shots + golden de auditoria de fato.

## 10. Decisões abertas (❓ — precisam do Luiz)
1. **Classificação** (§3): quais categorias são "formulário" vs "linguagem"? (Luiz decide.)
2. **Modelo**: aceita testar/pagar um modelo mais rápido+inteligente (Haiku 4.5 / GPT-5-instant)
   pro writer_guarded? Orçamento por laudo?
3. **Determinismo**: aceita perder byte-stability nas categorias writer em troca de compreensão?
4. **Rerun-on-fact-failure**: aceita o custo de latência de re-rodar quando um fato crítico é
   dropado (em vez de entregar errado)?
5. **Prioridade**: piloto MSK primeiro (é o que está doendo agora)?
