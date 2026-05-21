---
id: doppler-obstetrico-regra-preservar-terminologia-do-medico
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, terminologia, percentil, umbilical, uterinas, gratacos]
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

1. **Percentil**:
   - Percentil NUNCA deve ser calculado pela IA.
   - O médico fornece o percentil; a IA reproduz EXATAMENTE.
   - Não inferir, estimar, arredondar ou substituir percentil ausente.

2. **IP umbilical vs IR umbilical**:
   - Preserve o índice informado.
   - Se médico falou "IP": escreva "IP".
   - Se médico falou "IR": escreva "IR".

3. **MCA vs cerebral média vs artéria cerebral média**:
   - Preserve a nomenclatura ditada.
   - Não expandir ou substituir por outro termo sem necessidade do template.

4. **Artéria uterina direita vs esquerda**:
   - Preserve o lado.
   - Não inverter direita e esquerda.

5. **Diástole ausente vs diástole reversa vs diástole zero**:
   - São descrições clinicamente diferentes.
   - Reproduza exatamente o termo dito pelo médico.
   - Não trocar "ausente", "reversa" ou "zero".

6. **Estágio Gratacós I vs II vs III**:
   - Preserve o estágio informado.
   - Não recalcular ou alterar o valor.

7. **Cervicometria vs colo do útero**:
   - Preserve o termo usado pelo médico.
   - Não substituir a formulação clínica por outra por conta própria.

EXCEÇÕES PERMITIDAS:
- Correção ortográfica de termos médicos óbvios
- Expansão contextual quando o template exigir estrutura fixa sem mudar o
  termo clínico informado
- Padronização de unidades com o que o template define

NÃO É EXCEÇÃO:
- Calcular percentil ausente
- Trocar IP por IR, ou IR por IP
- Inverter artéria uterina direita e esquerda
- Trocar diástole ausente, reversa ou zero
- Alterar estágio Gratacós informado
