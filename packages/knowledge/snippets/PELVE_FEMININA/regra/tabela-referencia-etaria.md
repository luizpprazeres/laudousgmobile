---
id: pelve-feminina-regra-tabela-referencia-etaria
category: PELVE_FEMININA
kind: regra
tags: [pelve-feminina, tabela-etaria, domingos-correia-da-rocha, referencia, pediatrica]
priority: 70
priority_tier: contextual
version: 1.0.0
status: published
source_path: /Users/luizprazeres/laudousg/lib/categoryDefaults.ts
source_extracted_at: 2026-05-21
source_lines: 1107-1113
---

GATILHOS DE APLICAÇÃO:
- adicione referência etária
- tabela etária
- Domingos Correia da Rocha
- valores habituais

TABELA DE REFERÊNCIA ETÁRIA (DOMINGOS CORREIA DA ROCHA)
- A tabela de referência etária é OPCIONAL e só deve ser incluída se o usuário pedir explicitamente ("adicione referência etária", "tabela etária" ou equivalente).
- Quando solicitada, incluir ao final do laudo em texto corrido (não tabela), conforme a faixa etária:
  - Adulta (≥ 15 anos): *Valores habituais: útero 30–90 cm³ (até 100–110 cm³ em pacientes com partos prévios); ovários 6–12 cm³ na menacme, até 6 cm³ na pós-menopausa; folículos dominantes até 2,5 cm, cistos funcionais até 4,0 cm.*
  - Pediátrica (≤ 14 anos): *Valores habituais pediátricos: útero pré-puberal 0,3–3,0 cm³ (morfologia tubular esperada); ovários pré-puberais 0,5–1,5 cm³, sem folículos dominantes.*
- O texto de referência deve ser envolvido em itálico (entre asteriscos * no output final).
- Se a idade não for informada e o usuário não pedir a tabela → omitir completamente.
