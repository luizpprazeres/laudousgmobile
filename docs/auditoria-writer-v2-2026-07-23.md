# Auditoria do Writer + proposta de arquitetura V2 (discussão)

**Data:** 23/07/2026 · **Contexto:** brief do Luiz sobre simplificar/flexibilizar o Writer sem perder velocidade e estabilidade. Este doc é o **passo 1-3 da seção 13** do brief (auditar o caminho atual, achar contradições, separar regras universais × categoria × pessoais). Nada foi alterado no fluxo de produção.

## 1. Descoberta central: já existem DOIS writers, e o "ideal" já roda

O `generationPathResolver.ts` bifurca em dois caminhos:

| | Caminho **advisory-only** | Caminho **full** |
|---|---|---|
| Quem usa | LIVRE, TESTE, modo "laudo difícil" | todas as demais categorias |
| System prompt | `LIVRE_SYSTEM_PROMPT` (**34 linhas, por princípios**) | contrato + `GLOBAL_RULES_BLOCK` (**~200 linhas**) + few-shots + proibições + CoT |
| Bundle/RAG | não | sim (bundle determinístico) |
| Guards pós-geração | nenhum | sanitizeDictationArtifacts, normalizeMeasures, stripInvalidDumLines, flagImplausibleMeasures, deterministicSanity, overlays obstétricos |
| Velocidade | ~2–3s | ~2–3s (parecido) |

**O `LIVRE_SYSTEM_PROMPT` É essencialmente o "núcleo universal" da seção 6 do brief.** Ensina princípios (corpo descreve/conclusão conclui, vocabulário da casa, sem redundância, lateralidade, conduta só se ditada, "na dúvida OMITA em vez de inventar") e é agnóstico de categoria. É por isso que a categoria **Livre lida bem com casos incomuns** — não tem as travas do caminho full.

## 2. Onde está a "poluição" (mapa sintoma → regra)

Cada sintoma que o Luiz observou tem origem concreta no caminho **full**:

| Sintoma observado | Causa no código |
|---|---|
| **Deixa "____" em branco** | `GLOBAL_RULES_BLOCK` linhas 56–65 ("mantenha a linha visível com ____ literal") + `writer.ts buildRawUserMessage` regra 1. O LIVRE **não tem** essa regra → ele omite em vez de deixar buraco. |
| **Ignora informação incomum** | "use APENAS as frases-padrão definidas no contrato" (linha 38) + aviso dos few-shots "NUNCA mencione achados que estejam APENAS nos exemplos" + mentalidade do bundle determinístico. |
| **Descarta info por erro de transcrição** | guard `sanitizeDictationArtifacts` (remove "artefatos" do ditado) + regras de ambiguidade "NÃO presuma, sinalize [REVISAR]" (linhas 77–83). |
| **Reproduz só frases previstas** | bundle determinístico (só blocos `validated`) + "frases-padrão". |
| **Não cumpre pedido de ajuste / trava em caso diferente** | o peso de ~200 linhas de restrição sufoca o raciocínio; o modelo "joga seguro" e não redige o inédito. |

## 3. Contradições com o estilo da casa que ACABAMOS de aprovar (23/07)

O caminho **full** hoje briga com as regras que o Luiz validou nesta sessão:

- `GLOBAL_RULES_BLOCK` linha 45: **'use sempre "compatível com X"'** — mas o Luiz pediu (e limpamos 15 snippets) para usar **"que tem como diagnóstico mais provável"** e tirar "compatível com" do corpo. **Conflito direto.**
- `GLOBAL_RULES_BLOCK` linhas 43–47: **"NUNCA dar conduta clínica... NUNCA 'recomenda-se'"** — mas o estilo da casa TEM conduta ("Convém, a critério clínico...") e a conclusão do adenoma de paratireoide inclui conduta. Isso explica por que **a conduta do paratireoide caiu** no smoke: o caminho full proíbe conduta; o LIVRE permite (se ditada).
- Ou seja: as duas fontes de verdade (GLOBAL_RULES antigo × estilo-casa novo) divergiram. O GLOBAL_RULES ficou defasado.

## 4. Bloat obstétrico injetado em toda categoria

~60% do `GLOBAL_RULES_BLOCK` é regra obstétrica/gineco (líquido amniótico ILA×MBV, placenta, percentil, DUM, MCDA gemelar, FIGO miomas, biometria) — mas é injetado em **TODA** geração, inclusive carótidas, escrotal, ocular. É token à toa + risco de contaminação cruzada (o modelo pode aplicar regra obstétrica num Doppler de carótida). Essas regras deveriam viver no **contrato da categoria obstétrica**, não no global.

## 5. O que a arquitetura V2 realmente exige (delta pequeno, não reescrita)

A hipótese da seção 6 do brief é montável reaproveitando o que já existe:

```
System = NÚCLEO UNIVERSAL (≈ LIVRE_SYSTEM_PROMPT, enxuto)
       + CONTRATO DA CATEGORIA (pequeno: campos obrigatórios, unidades, lateralidade, validações)
       + LAUDO-BASE oficial (o modelo normal / com placeholders — kind=modelo do bundle)
       + PERFIL DE ESCRITA do usuário (overlay leve)
       + DITADO + instruções
       + few-shots SÓ quando relevantes (opcional, testar se agregam)
```

Infra que **já suporta** isso: `generationPathResolver`, `buildSystemMessage` (já injeta contrato + modelo + few-shots), o bundle por (categoria, estilo), e o mecanismo `status draft/published/validated` (base da governança da biblioteca — seção 12). O trabalho de V2 é sobretudo:
1. Escrever um **núcleo universal curto** (evolução do LIVRE_SYSTEM_PROMPT, incorporando o §8d do estilo-casa).
2. **Mover** as regras obstétricas do global para o contrato obstétrico.
3. **Reconciliar** as contradições (compatível com / conduta) a favor do estilo-casa novo.
4. Trocar a regra de placeholder: **"omita a sub-cláusula ausente"** (comportamento do LIVRE) em vez de "____ literal" — exceto onde o placeholder é intencional (modelo com placeholders de medidas: Doppler carótidas, obstétrico).

## 6. Experimento controlado (seção 10 do brief)

**Categoria `ABDOME_TOTAL_WRITER_V2` (privada, flag-gated).** Uma variável por vez.

- **Controle:** ABDOME_TOTAL atual (caminho full, como está em prod).
- **Candidato V2:** núcleo universal curto + contrato mínimo de abdome + laudo-base normal oficial + perfil do Luiz + ditado. SEM (na 1ª rodada): cabeçalhos personalizados, múltiplos few-shots, modelos editáveis, agentes diferentes.
- **Corpus de teste (8 cenários do brief):** normal; alteração frequente; achado incomum; pedido de ajuste específico; erro linguístico evidente; ruído de transcrição; informação contraditória; ambiguidade de medida/lateralidade/negação.
- **Métrica:** fidelidade (nada omitido/inventado), ausência de "____" órfão, cumprimento de pedido de ajuste, correção de erro óbvio, separação corpo/conclusão, velocidade, estilo. Comparar lado a lado (controle × candidato) nos 8 cenários.

## 7. Preservação (seção 9)

O fluxo atual **não muda**. V2 nasce como categoria privada por flag (OFF), testável isoladamente, como fizemos com LIVRE/TESTE e DOPPLER_RENAL. Só depois de vencer o controle nos 8 cenários é que se considera migrar outras categorias.

## 8. Ligações com o resto da plataforma
- **Biblioteca (seção 5/11/12):** o "laudo-base oficial" do V2 é o mesmo modelo que alimenta a Biblioteca web (Frente 5) e o seletor de categoria (Frente 2). Modelos imutáveis oficiais + cópias editáveis do usuário = o mecanismo `status` + ownership. Convergem.
- **Cabeçalhos semânticos (seção 3/4):** internamente o sistema já reconhece COMENTÁRIOS/ACHADOS/CONCLUSÃO como funções (renderer OBJETIVO já renomeia para TÉCNICA/ACHADOS/IMPRESSÃO via `toObjectiveHeaders`). Personalização de cabeçalho é um overlay de apresentação sobre funções fixas — factível sem tocar no writer.

## 9. Próximos passos propostos (aguarda decisão do Luiz)
1. [este doc] Auditoria + mapa da poluição. ✅
2. Converter as "correções negativas" importantes em **princípios positivos** e em **casos de teste** (seção 13.4) — extrair do GLOBAL_RULES o que é regra clínica real (unidades, lateralidade, FIGO, ILA×MBV) vs. o que é "medo" acumulado.
3. Redigir o **núcleo universal V2** (rascunho).
4. Definir o **contrato mínimo de ABDOME_TOTAL**.
5. Montar o **corpus de 8 cenários** com ditados reais/sintéticos.
6. Criar a categoria experimental por flag e comparar.

> **Decisão pendente do Luiz:** seguir para os passos 2–6 (montar o experimento V2 do abdome), ou ajustar a direção antes.
