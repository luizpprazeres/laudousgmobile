---
id: doppler-obstetrico-regra-ip-medio-uterinas-auto-calculo
category: DOPPLER_OBSTETRICO
kind: regra
tags: [doppler-obstetrico, uterinas, ip-medio, auto-calculo, hierarquia]
priority: 95
priority_tier: universal
version: 1.0.0
status: published
source_path: user feedback 2026-05-22 (IP médio com placeholder ____ apesar de direita+esquerda informados)
source_extracted_at: 2026-05-22
---

═══════════════════════════════════════════════════
⚠️ REGRA DE HIERARQUIA
═══════════════════════════════════════════════════

Esta regra SOBRESCREVE o template-padrao e qualquer outra fonte. Em caso de conflito, ESTA prevalece.

═══════════════════════════════════════════════════
🚨 REGRA CRÍTICA: CALCULAR IP MÉDIO AUTOMATICAMENTE
═══════════════════════════════════════════════════

Quando o médico informar IP da artéria uterina **direita** E IP da artéria uterina **esquerda** no input, **CALCULAR AUTOMATICAMENTE** o IP médio:

```
IP médio = (IP direita + IP esquerda) / 2
```

Inserir o valor calculado no laudo. **NUNCA deixar placeholder `____`** ou similar quando ambos os valores estão disponíveis.

═══════════════════════════════════════════════════
📐 EXEMPLOS CONCRETOS
═══════════════════════════════════════════════════

Exemplo 1 — médico falou "uterina direita IP 1,2 e uterina esquerda IP 1,4":
  Cálculo: (1,2 + 1,4) / 2 = 1,3
  Laudo:  *"IP médio das artérias uterinas mede 1,30 cm."*
          (ou variação textual coerente — mas NUNCA com placeholder)

Exemplo 2 — médico falou só "uterinas D 0,8, E 1,0":
  Cálculo: (0,8 + 1,0) / 2 = 0,9
  Laudo:  *"IP médio das artérias uterinas mede 0,90."*

Exemplo 3 — médico falou explicitamente o IP médio ("IP médio das uterinas 1,3"):
  NÃO recalcular. Usar o valor que o médico informou diretamente.

Exemplo 4 — médico falou só uma das uterinas (só direita OU só esquerda):
  NÃO calcular IP médio. Apenas reportar a uterina informada com sua medida.
  Exemplo:
  - Input: "uterina direita IP 1,2"
  - Laudo: *"Artéria uterina direita: IP 1,20."*
  - NÃO incluir frase sobre IP médio.

═══════════════════════════════════════════════════
🚫 ANTI-EXEMPLOS (NÃO FAZER)
═══════════════════════════════════════════════════

✗ ERRADO — médico informou direita + esquerda, mas laudo tem:
   *"IP médio das artérias uterinas mede ____ cm."*
   (placeholder vazio mesmo tendo dados pra calcular)

✓ CERTO — calcular (D+E)/2 e inserir o valor.

---

✗ ERRADO — inventar IP médio sem ter direita+esquerda informados:
   Input: "uterina direita IP 1,2"
   Laudo: *"IP médio das artérias uterinas mede 1,2."* (assumindo que esquerda = direita)

✓ CERTO — sem esquerda informada, NÃO calcular nem inventar média. Reportar só a uterina informada.

═══════════════════════════════════════════════════
🔢 FORMATO DO NÚMERO
═══════════════════════════════════════════════════

- Sempre 2 casas decimais
- Vírgula decimal pt-BR (não ponto)
- Exemplos: 1,30 / 0,85 / 2,15

═══════════════════════════════════════════════════
🔗 INTEGRAÇÃO COM ATALHO "Calcular percentis"
═══════════════════════════════════════════════════

O atalho do app iOS (S12.3, commit 928a6c4) já calcula IP médio automaticamente:
```swift
} else if let dir = findings.uterinaDireitaIP, let esq = findings.uterinaEsquerdaIP {
    let media = (dir + esq) / 2
    ...
}
```

Esta regra garante que o LLM-writer faça o MESMO comportamento — mesmo quando o médico digita normal (sem clicar o atalho).
