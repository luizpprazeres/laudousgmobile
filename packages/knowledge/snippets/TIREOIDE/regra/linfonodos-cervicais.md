---
id: tireoide-regra-linfonodos-cervicais
category: TIREOIDE
kind: regra
tags: [tireoide, linfonodos, cervical, conclusao, cadeia-ganglionar]
priority: 60
priority_tier: contextual
version: 1.2.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts (priority rebaixada após user feedback 2026-05-21 — frases NÃO devem aparecer como padrão)
source_extracted_at: 2026-05-21
source_lines: 734-735,751-752
---

⚠️ REGRA IMPORTANTE: linfonodos cervicais NÃO são padrão no laudo de tireoide.

SÓ aplicar estas frases QUANDO o médico EXPLICITAMENTE mencionar linfonodos no input. Caso contrário, NÃO incluir nada sobre linfonodos no laudo.

GATILHOS DE APLICAÇÃO (TODOS devem estar presentes no input do médico):
- "linfonodo" ou "linfonodos" (em qualquer forma)
- "cervical" (linfonodo cervical)
- "cadeia ganglionar"
- Frases médicas explícitas tipo "linfonodos preservados", "sem linfonodopatia", "linfonodos aumentados"

ANTI-EXEMPLOS (NÃO APLICAR):
✗ Médico não mencionou linfonodos → NUNCA adicionar "Adicionalmente, evidenciam-se imagens ovais..."
✗ Médico não mencionou linfonodos → NUNCA adicionar "Linfonodos cervicais com morfologia preservada..."
✗ Mesmo se laudo tem nódulos / Doppler / outras alterações — se médico não falou linfonodos, NÃO incluir

QUANDO APLICAR (médico mencionou):

3.3. LINFONODOS CERVICAIS — frase pro CORPO:
"Adicionalmente, evidenciam-se imagens ovais com a periferia hipoecoica e o centro hiperecoico, de margens regulares, situadas em região cervical, compatíveis com linfonodos de morfologia preservada."

4.3. LINFONODOS CERVICAIS — frase pra CONCLUSÃO:
"Linfonodos cervicais com morfologia preservada, com predomínio nos níveis I e II, sem sinais de infiltração neoplásica ao método."

REGRA COMPLEMENTAR (já em outro bloco, mas reforçando aqui):
- Linfonodos NORMAIS ficam APENAS no corpo, NÃO na conclusão (a menos que médico explicite que quer na conclusão).
- Linfonodos ALTERADOS (linfonodopatia, suspeitos) entram na conclusão.
