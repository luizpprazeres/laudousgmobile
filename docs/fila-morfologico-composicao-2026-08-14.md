# FILA — Morfológico + Doppler + Cervicometria na mesma página

**Data:** 2026-08-14
**Status:** enfileirado para planejamento — **não iniciado**
**Origem:** relato do Luiz (14/08)

---

## O problema, nas palavras do Luiz

> *"Tanto no primeiro, segundo ou terceiro trimestre é frequente a gente associar [o morfológico] ao doppler obstétrico ou ao exame da pelve transvaginal para medida do colo uterino (cervicometria). A gente precisa organizar de uma forma que fique fluido para o usuário conseguir fazer tudo na mesma página do morfológico, seja com comandos de áudio ou acionando um toggle na página."*

E o sintoma mais concreto:

> *"Atualmente a gente roda a IA para extrair imagens do morfológico, mas se for morfológico com doppler ele deixa as informações do doppler de lado, aí eu acabo tendo que trocar de categoria só pra poder extrair as informações do doppler."*

---

## Por que isto é arquitetura, não UI

O exame **físico** é um só. As **categorias** do sistema são três. Hoje a modelagem obriga o médico a fatiar um exame único em três sessões, e a extração por imagem — que roda por categoria — perde tudo que não pertence à categoria ativa.

Ou seja: **a unidade de trabalho do sistema (categoria) não bate com a unidade de trabalho do médico (exame).**

Isso tem três consequências que se acumulam:

1. **Troca de categoria no meio do exame** — fricção pura, e o médico pode esquecer de voltar.
2. **Extração por imagem descarta dados válidos** — a IA vê o Doppler na imagem e ignora, porque a categoria ativa é morfológico. Perda de informação já capturada.
3. **Cada categoria precisa de catálogo próprio na Biblioteca** — se morfológico, Doppler e cervicometria continuam separados, são três catálogos para personalizar, três para manter, três para portar.

---

## As três arquiteturas possíveis

### A · Fusão — uma categoria "morfológico ampliado"

Uma categoria com todos os campos. Simples de usar, mas o schema vira gigante, o prompt de extração fica sobrecarregado, e o laudo de morfológico puro carrega peso que não usa.

### B · Composição — categoria-base + add-ons ⭐ *hipótese preferida*

`MORFOLOGICO` continua a categoria; `doppler` e `cervicometria` viram **módulos acopláveis** ao exame. O laudo final concatena os blocos ativos.

- **Ativação por toggle** na página **ou** por comando de voz (*"com Doppler"*, *"e a cervicometria"*)
- **Extração por imagem** passa a receber os módulos ativos, e deixa de descartar o Doppler
- Cada módulo tem seu próprio catálogo — **reaproveitando** os que já existem
- O `DOPPLER_OBSTETRICO` **já herda o schema obstétrico** (`DOPPLER_OBSTETRICO.ts:48`), o que é indício forte de que já é add-on disfarçado de categoria

### C · Manter separado, melhorar só a transição

Mais barato, não resolve a extração por imagem, e não reduz o custo da Biblioteca. Provavelmente insuficiente.

---

## Perguntas em aberto

| # | Questão |
|---|---|
| 1 | O morfológico deve ser **uma** categoria com variantes de trimestre, ou **três**? *(em análise pelo Codex, 14/08)* |
| 2 | Se composição: o laudo sai **um** com blocos, ou **vários** laudos vinculados? Muda o que a Sala e o PDF entregam |
| 3 | A cervicometria via **transvaginal** é módulo do morfológico, ou exame próprio que ocorre junto? Tem técnica e consentimento distintos |
| 4 | Como o **comando de voz** ativa o módulo sem virar linguagem de comando decorada? (aprendizado da VX: gatilho decorado é fricção) |
| 5 | A extração por imagem hoje é **por categoria** — precisa virar **por módulos ativos**. Qual o custo? |
| 6 | Precificação/créditos: um exame composto conta como 1 ou como 3? |

---

## ✅ PARECER DO CODEX — 14/08 (11m47s, com dados reais)

> **Chamada final:** *"não segmentar criando mais categorias e não fundir tudo. Manter categorias como **atalhos de produto**, mas parar de usá-las como **unidade clínica e técnica**."*

### A causa técnica da perda do Doppler — encontrada

| Camada | O que acontece |
|---|---|
| Roteamento | *"morfológico com Doppler"* **já** força a categoria para `MORFOLOGICO` (`morfologicoRouteSelection.ts:115`) — remendo de composição que já existe |
| Schema | o morfológico **não tem** IP umbilical, ACM, RCP nem classificações Doppler |
| Renderização | o overlay Doppler só roda no caminho **writer**, dentro de `!useRenderer` (`generate/route.ts:1022`, `:1084`) |
| **Imagem** | o backend aceita **uma** categoria: campos Doppler só sobrevivem em `DOPPLER_OBSTETRICO`, morfológicos só em `MORFOLOGICO` (`vision/extractor.ts:85`) |

**A última linha é exatamente o sintoma relatado.** E um defeito lateral: a análise de imagem do morfológico é desenhada só para **2T** (`vision/client.ts:182`) — sem CCN/TN para o 1T.

### Recomendação por item

| Item | Veredito |
|---|---|
| Morfológico 1T/2T/3T | **uma** categoria com abas. 3T tem 6 laudos. O problema real é o trimestre ser **inferido pelo LLM** — deve ser seleção na interface, pré-preenchida pela IG |
| Morfológico + Doppler + cervix | **composição de módulos** |
| OBSTETRICA × DOPPLER_OBSTETRICO | dois **atalhos**, **um motor** + add-on (o schema Doppler estende o obstétrico, `:48`) |
| CERVICOMETRIA | vira **add-on**, atalho standalone secundário |
| PELVE TA × TV | **não separar** — 121 laudos: 77 TA+TV · 16 TV · 12 TA · 12 pós-abortamento |

### Frequência real (60 dias, 71 morfológicos)

Doppler fetal forte: **4** · avaliação cervical: **8** · os dois juntos: **1**.

> *"O banco não confirma que o exame triplo seja frequente em proporção. Confirma que a combinação existe. O relato do Luiz continua importante porque a amostra é pequena e **a arquitetura atual dificulta justamente registrar a combinação corretamente**."*

Os 9 morfológicos de 1T com uterinas **não** contam como Doppler adicional — é protocolo de 1T.

### ⚠️ O aviso que muda a Fase 5 da Biblioteca

> *"O registry está preso a `(categoria, estilo)` e só conhece `OBSTETRICA/CLASSICO_COMPLETO` (`registry.ts:59`). **Se essa chave não mudar, composição vai gerar explosão combinatória**"* — Morfológico · Morfológico+Doppler · Morfológico+Cervix · Morfológico+Doppler+Cervix, cada um com catálogo próprio.

Com módulos, a Biblioteca personaliza **o catálogo do módulo**, não cada combinação.

### Arquitetura-alvo

```ts
type ExamPlan = {
  base: "OBSTETRICA" | "MORFOLOGICO" | "PELVE_FEMININA" | "…";
  variant: Record<string, string>;      // ex.: { trimestre: "2t" }
  modules: string[];                    // ["DOPPLER_FETAL", "CERVICOMETRIA"]
  output: "composite" | "separate_linked";
};
```

Extração **namespaced** (`obstetric_core` · `morphology` · `doppler` · `cervix`), e um composer que junta segmentos com `moduleId` + `slotId`.

### Migração em 6 passos — sem renomear categoria nenhuma

1. Introduzir `ExamPlan` e gravá-lo na auditoria, traduzindo para os caminhos atuais
2. **Análise de imagem recebe `variant` e `modules`** → elimina a perda Morfológico×Doppler
3. Composição MORFOLOGICO 2T/3T + DOPPLER_FETAL + CERVICOMETRIA atrás de flag
4. Separar `OBSTETRICA_CORE` do módulo Doppler, mantendo os dois botões
5. Biblioteca vira base + abas de variante + seções de add-ons
6. Só então reorganizar a lista visual

### Dois alertas de dados

- **`DOPPLER_RENAL`: 57 laudos em 90 dias, zero em 60.** Queda abrupta — investigar, não aposentar. `CERVICAL` idem (61 → 4)
- **34 categorias ativas** contra 15 com schema → navegação por "Recentes / Favoritos / Outros"

---

## Decisões do Luiz sobre os riscos apontados — 14/08

### 1 · Cervicometria: `orificio_interno_fechado = true` por padrão **fica**

> *"pode deixar padrão orifício interno fechado mesmo, a maioria está fechado"*

Risco residual registrado: o default afirma fechamento mesmo quando não avaliado. **Decisão consciente do médico** — não tratar como bug.

### 2 · Técnica/via: **é problema real e entra como frente própria** ⬅

> *"realmente é um problema que tem acontecido, gostaria que a gente deixasse validado essa parte específica dos comentários quando fosse só transvaginal, só transabdominal, ambos, no abdome da pelve ou da gestante, para que independente da categoria (pelve, obstétrico, morfológico, doppler) ficasse fiel ao método que foi dito nos achados"*

Ver `docs/tecnica-via-fidelidade-2026-08-14.md`.

---

## Dependências

- **Análise de arquitetura de categorias** (Codex, disparada 14/08) — decide se fundir/segmentar antes de desenhar a composição
- **Biblioteca por categoria** — se virar composição, o catálogo passa a ser por **módulo**, o que muda a Fase 5 de `plano-biblioteca-implementacao-2026-08-12.md`

> **Não iniciar antes** da análise de categorias. Desenhar composição sobre uma lista de categorias que vai mudar é retrabalho garantido.
