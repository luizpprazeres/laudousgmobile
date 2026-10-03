# Laudário — Histerossonografia com infusão salina

Observado em 03/10/2026 com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T14:27:00-03:00
exam: Histerossonografia com infusão salina
surface: Laudos > Ultrassonografia > Ginecologia > Histerossonografia com Infusão Salina
baseline:
  controls: sonda Foley 08; solução salina; modo 2D; condições adequadas; canal pérvio; cavidade normal; distensão adequada
  report_structure: técnica do procedimento; canal endocervical; cavidade endometrial; opinião
scenarios:
  - id: polipo_endometrial_sintetico
    input: pólipo na parede anterior, homogêneo, pediculado, de contornos definidos, com pedículo vascular e medidas de 1,2 x 0,7 x 0,5 cm
    cascades: a seleção geral publicou conclusão positiva antes de individualizar a lesão; após preencher os campos, o corpo recebeu topografia, morfologia, vascularização e medidas; histeroscopia com estudo histológico foi sugerida fora do laudo
    output: conclusão de lesão polipoide endometrial
    reset_verified: true
  - id: distensao_inadequada
    input: distensão insuficiente e exame parcialmente limitado
    cascades: criou seção de considerações técnicas e sugeriu reexame fora do laudo
    output: manteve simultaneamente a frase de cavidade adequadamente distendida e a conclusão normal, apesar de também declarar avaliação comprometida
    reset_verified: true
evidence:
  observed: controles, medidas sintéticas, texto, sugestões automáticas e restauração foram conferidos na interface normal do navegador
  inferred: achado principal, individualização da lesão e qualidade técnica são estados independentes; sem regras de exclusão, o texto pode publicar diagnóstico incompleto ou normalidade incompatível
crosswalk:
  laudousg_paths_checked:
    - packages/db/src/seeds/data.ts
    - packages/shared/src/categoryPresentation.ts
    - apps/api/src/server/prompts/contracts/PELVE_FEMININA.ts
    - apps/api/src/server/renderer/categories/PELVE_FEMININA.ts
    - apps/api/src/server/renderer/catalog/alteracoes/PELVE_FEMININA.ts
    - packages/knowledge/snippets/PELVE_FEMININA
    - apps/web/src/lib/deterministic/organs/pelveFeminina.ts
    - apps/web/src/lib/catalog/pelveParaCatalogo.ts
    - apps/mobile/src/features/generate/categories.manual.ts
    - apps/mobile/src/ui/tokens.ts
    - ../laudousg-swift/LaudoUSG/LaudoUSG/Models/Category.swift
  status: confirmed_gap_with_reusable_pelvic_components
  notes: histerossonografia não existe como categoria ou procedimento; PELVE_FEMININA cobre parcialmente pólipo, sinéquia e istmocele, mas não cateterização, infusão, distensão, intercorrências ou conclusão específica do procedimento
next_probe: aprovar o escopo do contrato dormente, reaproveitar apenas os subtipos anatômicos da pelve e criar gates de completude e qualidade antes de qualquer ativação
```

## Pólipo endometrial

Ao marcar apenas o achado geral de pólipo, antes de ativar e preencher uma lesão, o concorrente já publicou uma conclusão positiva e colocou no corpo uma indicação de que não havia individualização. Depois do preenchimento, topografia, medidas, ecogenicidade, contornos, aspecto pediculado e pedículo vascular foram incorporados corretamente.

O LaudoUSG não deve concluir pólipo a partir de um cabeçalho selecionado. A lesão precisa de identidade própria e campos mínimos confirmados. Medidas, topografia, morfologia e vascularização devem permanecer fatos separados; a recomendação de histeroscopia deve ser opt-in e independente da conclusão.

## Distensão inadequada

O cenário incompleto revelou uma contradição importante: o texto manteve que a cavidade estava adequadamente distendida e sem lesões, ao mesmo tempo em que declarou distensão insuficiente e avaliação comprometida. A opinião repetiu normalidade e limitação no mesmo bloco.

No LaudoUSG, distensão inadequada deve suspender qualquer normalidade que dependa da avaliação completa da cavidade. O contrato precisa separar `não avaliado`, `parcialmente avaliado` e `avaliado sem alteração`, com escopo por segmento quando a limitação for parcial.

## Restauração

O pólipo e seus atributos foram retirados, as medidas sintéticas foram apagadas, a cavidade voltou ao estado normal, a distensão retornou a adequada e a limitação foi desmarcada. As sugestões de histeroscopia e reexame foram retiradas. O editor voltou integralmente ao laudo basal.

O cruzamento técnico está em [crosswalk-histerossonografia-2026-10-03.md](../crosswalk-histerossonografia-2026-10-03.md).
