# Laudário — Avaliação Multiparamétrica Hepática

Observado em 02/10/2026, com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial ao final. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-02T10:53:52-03:00
exam: Avaliação Multiparamétrica Hepática
surface: Laudos > Ultrassonografia > Abdome > Avaliação Multiparamétrica Hepática
baseline:
  controls: abdome superior e Doppler hepático normais; Samsung QUS/USFF e 2D-SWE Samsung preselecionados, sem valores medidos
  report_structure: abdome superior; Doppler hepático; quantificação de gordura; elastografia; interpretação; fatores; seguimento; referências
scenarios:
  - id: estado_inicial_sem_medidas
    input: nenhuma medida sintética
    cascades: técnicas e referências de quantificação e elastografia já aparecem; não há conclusão positiva de gordura ou rigidez
    output: conclusão normal para ultrassonografia e Doppler, com blocos técnicos quantitativos sem resultado
    reset_verified: true
  - id: usff_12_porcento
    input: USFF 12% e índice de qualidade R² 0,75
    cascades: classificação S1 e conclusão de esteatose leve surgiram após o percentual, antes do índice de qualidade
    output: quantificação por Samsung QUS/USFF, valor, qualidade e classificação leve
    reset_verified: true
  - id: rigidez_14_kpa
    input: mediana 14,0 kPa e IQR/mediana 20%
    cascades: derivação automática de 2,2 m/s e interpretação compatível com doença hepática crônica avançada compensada
    output: rigidez, qualidade e interpretação pelo esquema SRU 2020 exibido pela interface
    reset_verified: true
evidence:
  observed: controles, valores derivados, tabelas, mudanças no corpo e na conclusão vistos na interface normal do navegador
  inferred: a interpretação automática usa o método e a tabela selecionados; a validade clínica em etiologias específicas não foi testada
crosswalk:
  laudousg_paths_checked:
    - apps/web/src/components/laudar/LiverQuantificationPanel.tsx
    - apps/web/src/lib/deterministic/liverQuantification.ts
    - apps/web/src/components/laudar/LaudarWebExperience.tsx
    - apps/web/src/lib/deterministic/organs/figado.ts
    - apps/web/src/lib/webReports.ts
    - apps/api/src/app/api/sala/latest/route.ts
    - apps/mobile/app/generate.tsx
    - LaudoUSG/LaudoUSG/Models/Category.swift
  status: partial
  notes: Web possui bloco complementar conservador; faltam categorias próprias, contrato compartilhado, paridade móvel e travessia Web para a Sala
next_probe: comparar o exame independente Elastografia Hepática e verificar diferenças de protocolo, qualidade e interpretação
```

## Estrutura do modelo

O exame reúne Abdome Superior, Doppler Hepático, Gordura Hepática, Elastografia e Outros. O módulo de Doppler separa artéria hepática, veia porta, tributárias, veias hepáticas, transplante e TIPS. A quantificação de gordura varia por fabricante e tecnologia. A elastografia separa técnica, medições, interpretação, fatores de confusão, seguimento, avaliação esplênica e tabela evolutiva.

Essa amplitude é útil como referência de cobertura, mas mistura camadas diferentes: anatomia, aquisição, qualidade, cálculo, interpretação e publicação. No LaudoUSG, essas camadas precisam permanecer identificáveis para que uma medida incompleta não se transforme silenciosamente em diagnóstico.

## Cenário 1 — estado inicial sem medidas

**Entrada:** nenhuma medida quantitativa.

**Observado:** o abdome superior e o Doppler hepático abriram como normais. Samsung QUS/USFF e 2D-SWE Samsung vieram selecionados por padrão, com cinco medidas e locais de aquisição já descritos. Mesmo sem valores, o laudo incluiu técnica de quantificação de gordura, técnica de elastografia e tabelas de referência. A conclusão permaneceu restrita à ultrassonografia e ao Doppler normais.

**Implicação:** o método utilizado, o fabricante, o número de aquisições, o local da ROI e o jejum não devem ser afirmados apenas porque o modelo foi aberto. O contrato precisa de um estado explícito de procedimento realizado e deve diferenciar seleção padrão de confirmação médica.

**Reset verificado:** verdadeiro; o cenário não alterou o estado inicial.

## Cenário 2 — fração de gordura por USFF

**Entrada:** USFF sintético de 12% e R² de 0,75.

**Observado:** o percentual isolado classificou o resultado como S1 e acrescentou esteatose leve à conclusão antes de o índice de qualidade ser preenchido. Depois do R², o laudo passou a registrar o valor e o limiar desejável, sem mudar a classificação. A interface exibiu para Samsung USFF os pontos de corte de 5,7%, 14,1% e 16,7% entre S0, S1, S2 e S3. Os operadores nas fronteiras exatas não foram registrados nesta rodada e precisam de sondagem própria antes de qualquer reutilização.

A tela ofereceu Samsung QUS com USFF/TAI/TSI, Samsung TAI, GE UGAP, Canon ATI, Siemens UDFF e Philips ou outro método de atenuação. Também havia estados de qualidade, número de medidas, lobo, distância da cápsula, jejum, concordância com modo B, correlação com ressonância e fatores de confusão.

**Implicação clínica:** os cortes observados pertencem ao método e à versão apresentados pelo concorrente; não são uma regra universal para o LaudoUSG. Classificação e conclusão devem exigir qualidade mínima definida para cada tecnologia, fonte versionada e confirmação médica. Sem qualidade suficiente, o sistema pode conservar a medida, mas deve mostrar pendência em vez de concluir o grau.

**Reset verificado:** verdadeiro; USFF e R² foram apagados, e o resultado e a conclusão quantitativa desapareceram. O método padrão permaneceu selecionado.

## Cenário 3 — rigidez hepática aumentada

**Entrada:** mediana sintética de 14,0 kPa e IQR/mediana de 20%.

**Observado:** a interface derivou automaticamente 2,2 m/s e classificou o resultado como compatível com doença hepática crônica avançada compensada. A tabela exibida seguia cinco intervalos: abaixo de 5 kPa, 5 a menos de 9 kPa, 9 a menos de 13 kPa, 13 a menos de 17 kPa e 17 kPa ou mais. O IQR/mediana desejável era até 30%.

Havia contextos etiológicos e fatores capazes de alterar a interpretação, incluindo hepatites, doença esteatótica, álcool, colestase, congestão, inflamação aguda, doença infiltrativa, insuficiência cardíaca, obesidade, ascite, esteatose intensa e lesão focal.

Durante a restauração apareceu uma falha relevante: apagar kPa e IQR/mediana não apagou os 2,2 m/s derivados. O valor residual continuou sustentando a conclusão positiva. A conclusão só desapareceu após apagar também m/s.

**Implicação clínica:** um valor derivado não pode ter vida independente da sua fonte. Se a medida original for apagada, alterada ou invalidada, toda derivação e interpretação dependente deve ser removida ou recalculada atomicamente. O LaudoUSG também não deve converter kPa e m/s por uma regra universal nem inferir estágio sem método, etiologia, qualidade e confirmação apropriados.

**Reset verificado:** verdadeiro; kPa, m/s e IQR/mediana foram apagados, e o laudo retornou ao estado inicial.

## Requisitos extraídos

O contrato proposto deve preservar indicação, método, fabricante e tecnologia, unidade original, valores brutos, número e local das aquisições, jejum, qualidade, variabilidade, fatores de confusão, fonte e versão do critério, interpretação sugerida e interpretação confirmada. Valores derivados precisam registrar sua origem e desaparecer quando ela deixa de ser válida.

A elastografia esplênica e a tabela evolutiva foram observadas como superfícies do modelo, mas não foram testadas. Permanecem candidatas a lacuna até uma rodada que confirme seus campos, cálculos, dependências e efeito no laudo; não fazem parte ainda do contrato recomendado como requisito aprovado.

Quantificação de gordura e rigidez devem funcionar como módulos reutilizáveis em Abdome total e Abdome superior e também sustentar exames próprios. A apresentação pode sugerir uma interpretação apenas quando houver uma regra validada para o método selecionado; o laudo revisado e enviado à Sala deve conservar a decisão final do médico.

## Próxima sondagem

O próximo lote deve comparar o exame independente Elastografia Hepática para saber se ele exige protocolo e qualidade diferentes ou apenas reutiliza este módulo, incluindo elastografia esplênica e evolução longitudinal. Depois, o Doppler Hepático deve ser estudado separadamente, pois a avaliação multiparamétrica expôs controles vasculares sem testá-los em cenários alterados.

O cruzamento técnico inicial está em [crosswalk-avaliacao-multiparametrica-hepatica-2026-10-02.md](../crosswalk-avaliacao-multiparametrica-hepatica-2026-10-02.md).
