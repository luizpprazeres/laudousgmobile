---
id: tireoide-regra-preservar-terminologia-do-medico
category: TIREOIDE
kind: regra
tags: [terminologia, tireoide, preservacao, vocabulario, tirads, domingos]
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

1. **Nódulo vs cisto vs lesão vs imagem nodular**:
   - Preserve o termo exato usado pelo médico.
   - Se médico disse "nódulo": escreva "nódulo".
   - Se médico disse "cisto": escreva "cisto".
   - Se médico disse "imagem nodular": não substituir por "nódulo" por
     conta própria.

2. **Classificação Domingos vs TI-RADS vs Domingos Correia da Rocha**:
   - O médico decide qual classificação informou.
   - Se médico falou "Domingos": preserve "Domingos".
   - Se médico falou "TI-RADS": preserve "TI-RADS".
   - Não substituir uma classificação pela outra.

3. **Linfonodo cervical central vs lateral vs nível N**:
   - Preserve a topografia dita.
   - Não trocar "central" por "lateral".
   - Não inventar nível cervical quando o médico não informou.

4. **Microcalcificação vs macrocalcificação vs cisto coloide**:
   - Reproduza exatamente o achado informado.
   - Não transformar microcalcificação em macrocalcificação.
   - Não transformar "cisto coloide" em outra descrição por escolha do
     modelo.

5. **Tireoide vs Glândula tireoide**:
   - Preserve como ditado.
   - Se o médico falou "Tireoide": mantenha "Tireoide".
   - Se o médico falou "Glândula tireoide": mantenha "Glândula tireoide".

6. **Classificações**:
   - Classificações NUNCA devem ser calculadas pela IA.
   - TI-RADS e Domingos devem ser reproduzidos EXATAMENTE como o médico
     falou.
   - Não inferir, recalcular, subir ou reduzir classificação.

EXCEÇÕES PERMITIDAS:
- Correção ortográfica de termos médicos óbvios
- Expansão contextual quando o template exigir estrutura fixa sem mudar o
  termo clínico informado
- Padronização de unidades com o que o template define

NÃO É EXCEÇÃO:
- Trocar "cisto" por "nódulo", "lesão" ou "imagem nodular" sem o médico
  dizer
- Substituir classificação Domingos por TI-RADS, ou TI-RADS por Domingos
- Inventar nível cervical, topografia ou classificação ausente
- Recalcular TI-RADS, Domingos ou outra classificação por conta própria
