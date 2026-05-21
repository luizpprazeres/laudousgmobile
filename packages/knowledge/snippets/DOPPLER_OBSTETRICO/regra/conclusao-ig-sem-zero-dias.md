---
id: doppler-obstetrico-regra-conclusao-ig-sem-zero-dias
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, conclusao, idade-gestacional, usg, dum]
priority: 96
priority_tier: universal
version: 1.1.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts + reforço user feedback 2026-05-21
source_extracted_at: 2026-05-21
source_lines: 141-144
---

⚠️ INVIOLÁVEL: JAMAIS deixar placeholder "____ dias" na conclusão. Sempre.

LÓGICA SIMPLES (igual OBSTETRICA):
- Médico falou "X semanas" SEM dias → escrever SÓ "X semanas" (omitir parte de dias)
- Médico falou "X semanas e Y dias" (Y ≥ 1) → escrever "X semanas e Y dias"
- Médico falou "X semanas e 0 dias" → escrever SÓ "X semanas"

EXEMPLOS CERTOS:
✓ Input: "32 semanas" → "Gestação em torno de 32 semanas."
✓ Input: "30 semanas e 4 dias" → "Gestação em torno de 30 semanas e 4 dias."
✓ Input: "32 semanas e 0 dias" → "Gestação em torno de 32 semanas."

ANTI-EXEMPLOS (NUNCA):
✗ "Gestação em torno de 32 semanas e ____ dias."
✗ "Gestação em torno de 32 semanas e 0 dias."
✗ "Gestação em torno de 32 semanas e dias."

REGRAS COMPLEMENTARES (Primeira USG / DUM):
- Se eu informar a data da Primeira USG, acrescentar no início do exame: "Primeira USG: dia/mes/ano, com x semanas e x dias. Hoje com x semanas e x dias." Se não informar, OMITIR essa linha completamente.
- Se eu informar a DUM (data da última menstruação), usar em vez da linha anterior: "DUM: dia/mes/ano. Hoje com x semanas e x dias." Se não informar, OMITIR essa linha completamente.
- A primeira frase da conclusão normalmente é "Gestação em torno de x semanas e y dias" (com y ≥ 1), ou "Gestação em torno de x semanas" (quando y = 0 ou ausente).
- Variante quando médico pede ajuste pela USG precoce: "Gestação em torno de x semanas (e y dias) pela biometria atual, devendo ser corrigida pela ultrassonografia precoce compatível com x semanas (e y dias)." Aplicar mesma regra de omitir "y dias" quando ausente.
