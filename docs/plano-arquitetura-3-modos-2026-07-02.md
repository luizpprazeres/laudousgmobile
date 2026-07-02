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

## 2. Os 2 modos (revisado — `renderer_strict` ELIMINADO)

> **Decisão Luiz (02/07):** o `renderer_strict` sai. Motivo: **todo exame tem outlier** — até
> obstétrico (200 gestantes/mês; 10-20% com alterações fora do padrão). Sem escape pro
> inusitado, o strict sempre dropa/ecoa. `strict` vira caso particular de `free_slots` (quando
> não há inusitado). Sobram 2 modos:

1. **`renderer_with_free_slots`** — exame estruturado (obstétrico, tireoide, mama, pelve, abdome):
   o CÓDIGO faz cálculo (IG, peso, volume, percentil) + estrutura; o LLM tece o inusitado no
   SLOT livre (camada flexível: `docs/camada-flexivel-design.md`). Nada é dropado.
2. **`writer_guarded`** — exame de linguagem aberta (MSK, partes moles): o LLM ESCREVE (prompt
   base + roteiro da casa + few-shots + streaming), com guards DETERMINÍSTICOS só pros FATOS
   (não dropar medida/lado; não alucinar) — NÃO pra prosa.

> **Reenquadramento (prova empírica §11):** não é mais VELOCIDADE × compreensão (ambas rápidas).
> É **DETERMINISMO × compreensão**. Escolhe-se o modo pelo que o CAMPO precisa: calculado/seguro →
> determinístico; prosa/inusitado → writer. E eles COMBINAM no free_slots.

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

---

## 11. PROVA EMPÍRICA (02/07) — medição real, não teoria

### 11.A Latência: writer NÃO é mais lento que renderer
Mesmo modelo (gpt-4.1-mini), mesmo caso MSK:
- Renderer (extração LLM): **5.580 ms**.
- Writer (laudo inteiro, streaming): **total 4.653 ms, 1º token 1.220 ms**.
→ O writer foi MAIS RÁPIDO. Ambos fazem 1 chamada LLM de tamanho parecido; o renderer não evita
o LLM (a extração É uma chamada). O "14s" era modelo grande + RAG pesado + multi-estágio + sem
streaming — não uma propriedade do writer. **O medo de latência está resolvido.**

### 11.B Qualidade: protótipo MSK writer_guarded nos casos REAIS do Luiz
Prompt base (regras da casa) → o writer:
- ✅ Multi-segmento nativo (punho+cotovelo; ombro+joelho; 4 segmentos).
- ✅ Garble entendido SEM dicionário (terinopatia→tendinopatia, tenores→tendões, aquática→anecoica, ibos→bursa).
- ✅ corpo≠conclusão; ZERO frase-neutra; ZERO echo; diagnóstico-só → morfologia canônica natural.
- ✅ Medidas preservadas (Baker 2,4cm; nervo mediano 4mm²).
- ❌ (v1) Over-coverage: inventou meniscos/cartilagem/ligamentos fora do roteiro da casa.

### 11.C A rédea: roteiro da casa no prompt mata o over-coverage
v2 = prompt + **ROTEIRO da casa** (estruturas exatas por segmento, que o renderer já tem).
Resultado: cobertura EXATA da casa, invenção de menisco = FALSE, compreensão intacta, ~5-6s.
→ **A rédea certa não é o schema rígido; é o roteiro da casa no prompt do writer.**

**Conclusão:** o `writer_guarded` com roteiro SUBSTITUI biblioteca de morfologia + passthrough +
frase-neutra + guards — uma peça que entende no lugar de mil remendos. É o "parar de enxugar gelo".

## 12. Piloto MSK `writer_guarded` — plano

**Receita:** `prompt base (regras da casa) + roteiro da casa + few-shots (do corpus) + fact-audit
determinístico (não dropar medida/lado; não alucinar estrutura fora do roteiro) + guard de
formato (sectionSpacingGuard, já existe) + modelo rápido + streaming` → route MSK pro writer.

**Passos:**
1. `buildSystemMessage` para MSK (ou bloco `modelo` no bundle): regras + roteiro + few-shots.
2. Few-shots curados do corpus (`aprendizado-correcoes-luiz.md`) — corrige nits (não pôr
   "compatível com X" no corpo; não ecoar garble entre parênteses).
3. Fact-audit pós-writer: toda medida/lado ditado presente? Se dropou fato crítico → rerun.
4. Rotear MSK pro writer (tirar de RENDERER_CATEGORIES ou flag WRITER_OPEN=MSK). Flag-gated, reversível.
5. Validar nos casos reais + comparar lado a lado com o ChatGPT. Medir latência/qualidade. Review dex1.
6. Se aprovado: ligar em prod. Depois: PARTES_MOLES; depois free_slots nas estruturadas.

**Nits do protótipo a corrigir com few-shots:** "compatível com X" no corpo (corpo=morfologia
pura); eco de garble entre parênteses ("ibos"); linha em branco após título (sectionSpacingGuard).

## 13. Review dex1 do piloto (02/07) — refinamentos

**Veredito:** GO no piloto. *"Se o writer já é tão rápido quanto a extração e entende melhor,
insistir em renderer MSK é apego à arquitetura antiga. Mas não é 'voltar ao writer antigo' — é
outro produto: writer + roteiro da casa + few-shots + auditoria determinística de fatos."*

Refinamentos exigidos:
- **Fact-audit → rerun:** UMA tentativa automática com o feedback do audit. **Nada de loop.**
  Registrar no audit: quantos reruns, quais fatos falharam, latência total.
- **Guard de over-coverage (item a):** além do fact-audit de DROP, um check determinístico de
  ESTRUTURA-FORA-DO-ROTEIRO (o roteiro por segmento é lista conhecida → varrer o corpo por nomes
  de estrutura fora da lista do segmento → flag/rerun). Blinda o "meniscos normais" falso.
- **Golden set real ≥30 casos do Luiz** antes de prod: multi-segmento, só-diagnóstico, laudo
  colado, medidas, garbles, casos que antes inventavam estrutura, comandos misturados.
- **Comparação lado a lado** por caso: renderer atual × writer_guarded × ChatGPT/esperado. Critério
  NÃO é passar teste sintático — é **"o Luiz assinaria isso"**.
- **Observabilidade:** logar modelo, TTFT/total, audit pass/fail, motivo do rerun, se corrigiu,
  estruturas fora do roteiro, medidas ausentes.
- **Prod gradual:** conta do Luiz / flag por usuário → 10% → geral. Observar antes de expandir p/ partes moles.
- **Código (menor blast radius):** reusar `runWriterStream` + `buildSystemMessage` + bundle `modelo`
  do MSK; não criar caminho novo. Modelo: começar gpt-4.1-mini (provado ~5s), testar rápido depois.
