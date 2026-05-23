---
id: doppler-obstetrico-regra-percentis-opcionais
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, percentis, opcional, opt-in, hierarquia]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback 2026-05-22 (percentis aparecendo com placeholder vazio sem médico pedir)
source_extracted_at: 2026-05-22
---

═══════════════════════════════════════════════════
⚠️ REGRA DE HIERARQUIA
═══════════════════════════════════════════════════

Esta regra SOBRESCREVE o template-padrao e o block `ip-medio-uterinas-percentil` no que tange a quando inserir percentis no laudo. Em caso de conflito, ESTA prevalece.

═══════════════════════════════════════════════════
🚨 REGRA CRÍTICA: PERCENTIS SÃO OPT-IN
═══════════════════════════════════════════════════

Percentis das artérias (umbilical, cerebral média, uterinas, ducto venoso) são **OPCIONAIS** no laudo Doppler.

Só incluir percentil quando:
1. **Médico mencionou explicitamente** o percentil no input (ex: "AU IP 1,45 P50", "ACM percentil 75"), OU
2. **Médico forneceu o valor diretamente** (ex: "percentil 50 da AU"), OU
3. **O atalho frontend "Calcular percentis" foi disparado** (insere automaticamente os percentis no textarea como linha estruturada, identificável pela frase `→ Percentis (...)`).

Em todos os outros casos: **NÃO incluir nenhuma menção a percentil no laudo final**.

═══════════════════════════════════════════════════
🚫 ANTI-EXEMPLOS (NÃO FAZER)
═══════════════════════════════════════════════════

✗ ERRADO — médico não falou percentil, mas laudo tem:
   *"IP médio das artérias uterinas mede 1,30 (percentil ____)."*
   (placeholder vazio porque LLM tentou colocar percentil sem ter dado)

✓ CERTO neste caso — apenas a medida:
   *"IP médio das artérias uterinas mede 1,30."*

---

✗ ERRADO — médico não falou percentil, mas laudo tem placeholder mesmo assim:
   *"Artéria umbilical: IP 1,45 (percentil ___)."*

✓ CERTO — sem médico ter pedido, apenas a medida:
   *"Artéria umbilical: IP 1,45."*

---

✗ ERRADO — inventar percentil quando médico não falou:
   Input: "AU IP 1,45"
   Laudo: *"Artéria umbilical: IP 1,45 (percentil 50)."* (assumindo P50 sem evidência)

✓ CERTO — sem médico pedir e sem atalho disparado, apenas a medida:
   *"Artéria umbilical: IP 1,45."*

═══════════════════════════════════════════════════
✅ EXEMPLOS CORRETOS (quando INCLUIR percentil)
═══════════════════════════════════════════════════

Exemplo 1 — médico mencionou percentil explicitamente:
  Input: "AU IP 1,45 percentil 50, ACM 1,8 P75"
  Laudo: *"Artéria umbilical: IP 1,45 (P50). Artéria cerebral média: IP 1,80 (P75)."*

Exemplo 2 — atalho "Calcular percentis" foi disparado (linha estruturada no input):
  Input contém: `→ Percentis (32s0d, Gratacós/FMF): AU IP 1,45 (P50) · ACM IP 1,80 (P75)`
  Laudo aplica os percentis citados nessa linha.

Exemplo 3 — médico forneceu valor numérico:
  Input: "umbilical no percentil 90"
  Laudo: *"Artéria umbilical: IP no percentil 90."*

═══════════════════════════════════════════════════
🔗 RELAÇÃO COM OUTROS BLOCKS
═══════════════════════════════════════════════════

- O block `ip-medio-uterinas-percentil` (priority 70) trata da regra clínica "se percentil > 95, alterar conclusão". Essa regra continua válida **mas só dispara quando o percentil foi efetivamente fornecido/calculado** (não inventa percentil pra disparar).
- O block `peso-fetal-percentil` (kind=regra, priority 75 OBSTETRICA) tem regra similar pra peso — também opt-in.

═══════════════════════════════════════════════════
🎯 OBJETIVO
═══════════════════════════════════════════════════

Laudo do médico que NÃO pediu percentil deve sair **limpo, sem placeholders vazios** e sem percentis inventados. O médico tem o atalho "Calcular percentis" no app pra opt-in quando quiser.
