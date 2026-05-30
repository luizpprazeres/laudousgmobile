---
id: pelve-feminina-regra-figo-nao-inferir
category: PELVE_FEMININA
kind: regra
tags: [pelve-feminina, mioma, figo, nao-inferir, anti-invencao]
priority: 97
priority_tier: universal
version: 0.1.0
status: draft
source_path: Article IV — No Invention (LaudoUSG constitution) + FIGO PALM-COEIN classification (Munro MG et al — 2018 revisions; Int J Gynecol Obstet 2018; doi 10.1002/ijgo.12666) requires explicit % measurement and component description, not estimation
source_extracted_at: 2026-05-30
---

REGRA UNIVERSAL — NÃO INFERIR CLASSIFICAÇÃO FIGO DE MIOMA

Esta regra é UNIVERSAL na categoria PELVE_FEMININA: sempre se aplica quando houver descrição de mioma. Espelha a decisão clínica de MAMARIA/excecao/birads-nao-inferir.md.

═══════════════════════════════════════════════════
ERROS PROIBIDOS
═══════════════════════════════════════════════════

É proibido:
- Inferir categoria FIGO numérica (0-8) sem que o médico tenha mencionado explicitamente o número OU a localização anatômica detalhada.
- Estimar percentual intramural ("mais de 50%", "menos de 50%") quando o médico não mencionou.
- Classificar como FIGO 1 vs FIGO 2 (submucoso) ou FIGO 5 vs FIGO 6 (subseroso) sem dado de % explícito.
- Atribuir FIGO 8 (especiais: cervical, parasitário, ligamento largo) sem caracterização clara.

═══════════════════════════════════════════════════
QUANDO INCLUIR FIGO NA CONCLUSÃO
═══════════════════════════════════════════════════

Incluir a classificação FIGO numérica APENAS quando uma das condições for verdadeira:

1. O médico CITOU EXPLICITAMENTE o número FIGO (ex: "mioma FIGO 4", "categoria FIGO 2").
2. O médico descreveu a localização anatômica de forma TOTALMENTE UNÍVOCA, conforme o quadro abaixo. Descrições parciais (ex: "predominantemente intramural") NÃO são suficientes — exigem dado adicional sobre relação com endométrio e/ou serosa.

═══════════════════════════════════════════════════
MAPEAMENTO UNÍVOCO (USAR APENAS QUANDO TODOS OS CRITÉRIOS DA LINHA ESTIVEREM EXPLÍCITOS)
═══════════════════════════════════════════════════

| Descrição UNÍVOCA do médico | FIGO |
|---|---|
| "Pediculado intracavitário" + "100% intracavitário" + "sem componente intramural" | FIGO 0 |
| "Submucoso" + "intramural menos de 50%" (ou "<50% intramural") + "componente cavitário" | FIGO 1 |
| "Submucoso" + "intramural 50% ou mais" (ou ">=50% intramural") + "componente cavitário" | FIGO 2 |
| "Intramural" + "tocando endométrio" (ou "contato endometrial") + "sem protrusão na cavidade" | FIGO 3 |
| "100% intramural" + "sem contato com endométrio" + "sem contato com serosa" | FIGO 4 |
| "Subseroso" + "intramural 50% ou mais" + "componente subseroso" | FIGO 5 |
| "Subseroso" + "intramural menos de 50%" + "predominantemente subseroso" | FIGO 6 |
| "Subseroso" + "pediculado" + "100% extra-uterino" | FIGO 7 |
| Localização específica explícita (cervical / parasitário / ligamento largo) | FIGO 8 |

═══════════════════════════════════════════════════
HÍBRIDOS X-Y (TRANSMURAIS)
═══════════════════════════════════════════════════

Mapeamento X-Y requer descrição EXPLÍCITA dos DOIS componentes (relação endometrial + relação serosa):

| Descrição UNÍVOCA | FIGO híbrido |
|---|---|
| "Transmural" + "submucoso ≥50% intramural" + "subseroso ≥50% intramural" | FIGO 2-5 |
| "Transmural" + "tocando endométrio" + "subseroso ≥50% intramural" | FIGO 3-5 |

═══════════════════════════════════════════════════
QUANDO REGEX DO INPUT NÃO CASA UNIVOCAMENTE
═══════════════════════════════════════════════════

Se a descrição do médico não casar exatamente com nenhuma linha das tabelas acima:

CORRETO: usar apenas a descrição anatômica que o médico mencionou, SEM atribuir número FIGO.
- "nódulo miomatoso intramural" (sem FIGO)
- "nódulo miomatoso subseroso" (sem FIGO)
- "nódulo miomatoso submucoso" (sem FIGO)
- "mioma com componente cavitário" (sem FIGO)

ERRADO: inferir número FIGO baseado em descrição parcial.

═══════════════════════════════════════════════════
QUANDO USAR APENAS DESCRIÇÃO ANATÔMICA (SEM NÚMERO FIGO)
═══════════════════════════════════════════════════

Se o médico mencionou apenas a localização VAGA (ex: "mioma intramural", "mioma subseroso" sem percentual), usar a descrição anatômica simples na conclusão SEM atribuir número FIGO:

CORRETO: "nódulo miomatoso intramural"
ERRADO: "nódulo miomatoso intramural (categoria FIGO 4)" — não há como saber se é FIGO 3 ou FIGO 4 sem dado adicional de contato endometrial.

CORRETO: "nódulo miomatoso subseroso"
ERRADO: "nódulo miomatoso subseroso (categoria FIGO 6)" — não há como saber se é FIGO 5, 6 ou 7 sem dado de % intramural.

═══════════════════════════════════════════════════
QUANDO O MÉDICO DÁ NÚMERO FIGO IMPOSSÍVEL
═══════════════════════════════════════════════════

Se o médico ditar "FIGO 9" ou outro número fora do intervalo 0-8: NÃO incluir no laudo. Sinalizar como warning interno (sanity check rule, não-bloqueante) — NÃO escrever no laudo.

═══════════════════════════════════════════════════
NOTA EXPLICATIVA FIGO
═══════════════════════════════════════════════════

Quando uma classificação FIGO numérica for incluída no laudo, a nota explicativa "FIGO: Federação Internacional de Ginecologia e Obstetrícia." deve aparecer ao final do laudo (regra única em regra/miomas.md, seção "REGRA TRANSVERSAL DE MIOMAS").

═══════════════════════════════════════════════════
NÃO INVENTAR — RESUMO
═══════════════════════════════════════════════════

- Não inferir FIGO sem critério explícito.
- Não estimar percentual intramural.
- Não recomendar tratamento (decisão clínica).
- Não escrever FIGO fora do intervalo 0-8.
