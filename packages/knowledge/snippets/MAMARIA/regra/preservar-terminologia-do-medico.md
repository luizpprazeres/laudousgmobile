---
id: mamaria-regra-preservar-terminologia-do-medico
category: MAMARIA
kind: regra
tags: [mamaria, terminologia, preservacao, vocabulario, birads, axila]
priority: 94
priority_tier: universal
version: 1.0.0
status: published
source_path: padrão cross-category — adaptado de OBSTETRICA/preservar-terminologia
source_extracted_at: 2026-05-21
---

REGRA CRÍTICA — Preservar terminologia do médico (verbatim):

O médico diferencia conscientemente termos clinicamente próximos. Reproduza
EXATAMENTE o termo que ele disse, mesmo se sua intuição clínica sugerir
outro.

CASOS COMUNS:

1. **Nódulo vs cisto vs lesão vs massa vs imagem nodular**:
   - Preserve o termo exato usado pelo médico.
   - Se médico disse "nódulo": escreva "nódulo".
   - Se médico disse "cisto": escreva "cisto".
   - Não trocar "massa", "lesão" ou "imagem nodular" por outro termo por
     conta própria.

2. **BI-RADS**:
   - BI-RADS NUNCA deve ser calculada pela IA.
   - Preserve EXATAMENTE como o médico falou.
   - Se médico informou BI-RADS 1, 2, 3, 4a, 4b, 4c, 5 ou 6, mantenha o
     valor exato e a sub-categoria.
   - Não subir, reduzir, arredondar ou trocar sub-categoria.

3. **Mama densa vs mama heterogenicamente densa vs mama de constituição
   fibroglandular usual**:
   - Preserve a formulação ditada.
   - Não trocar densidade, ecotextura ou constituição por outro termo que
     pareça equivalente.

4. **Microcalcificação vs macrocalcificação vs cálcio puntiforme**:
   - Reproduza exatamente o achado informado.
   - Não substituir a morfologia do cálcio por escolha do modelo.

5. **Axila vs região axilar vs cadeia ganglionar axilar**:
   - Preserve como ditado.
   - Não trocar a abrangência anatômica informada pelo médico.

6. **Linfonodo com hilo preservado vs alterado**:
   - Preserve o estado descrito.
   - Não transformar hilo preservado em alterado ou o inverso.

EXCEÇÕES PERMITIDAS:
- Correção ortográfica de termos médicos óbvios
- Expansão contextual quando o template exigir estrutura fixa sem mudar o
  termo clínico informado
- Padronização de unidades com o que o template define

NÃO É EXCEÇÃO:
- Trocar "cisto" por "nódulo", "lesão", "massa" ou "imagem nodular" sem o
  médico dizer
- Recalcular BI-RADS ou alterar sub-categoria por conta própria
- Trocar padrão de densidade, ecotextura ou constituição mamária ditado
- Alterar a topografia axilar ou o estado do hilo linfonodal informado
