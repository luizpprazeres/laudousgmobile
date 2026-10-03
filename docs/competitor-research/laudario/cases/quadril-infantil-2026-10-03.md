# Laudário — Quadril Infantil

Observado em 03/10/2026, com dados exclusivamente sintéticos. O modelo foi restaurado ao estado inicial. Nenhum laudo foi copiado, impresso, assinado ou finalizado.

```yaml
competitor: Laudário
observed_at: 2026-10-03T12:09:24-03:00
exam: Quadril Infantil
surface: Laudos > Ultrassonografia > Pediatria > Quadril Infantil
baseline:
  controls: ambos os quadris em faixas morfológicas normais; idade e ângulos numéricos vazios
  report_structure: técnica; indicação; análise por lado; opinião segundo Graf
scenarios:
  - id: alfa_55_sem_idade
    input: ângulo alfa direito de 55 graus; idade e beta vazios
    cascades: faixa alfa 50–59 selecionada automaticamente; classificação direita suspensa por falta de idade
    output: opinião pediu idade para diferenciar IIa de IIb; quadril esquerdo permaneceu classificado como Ia sem medidas numéricas
    reset_verified: true
  - id: alfa_55_beta_60_idade_10_semanas
    input: idade de 10 semanas; alfa direito 55 graus; beta direito 60 graus
    cascades: classificação direita atualizada automaticamente
    output: opinião classificou o lado direito como IIa- e manteve o esquerdo como Ia
    reset_verified: true
  - id: alfa_45_beta_75_morfologia_deslocada
    input: idade de 10 semanas; alfa direito 45 graus; beta direito 75 graus; cartilagem deslocada superiormente sem alteração estrutural
    cascades: faixas numéricas e morfologia foram atualizadas no corpo
    output: opinião permaneceu IIc após mudar beta e posicionamento, indicando predominância da faixa alfa na regra observada
    reset_verified: true
evidence:
  observed: controles, faixas automáticas, corpo, opinião e restauração foram vistos na interface normal
  inferred: a classificação parece depender principalmente de alfa e idade nas combinações testadas; outros tipos exigem casos próprios
crosswalk:
  status: partial
  notes: o LaudoUSG exige idade, plano adequado, alfa, beta, morfologia e confirmação; a perda da posição do labrum no texto foi identificada e corrigida nesta rodada
next_probe: estudar Doppler arterial de membro inferior
```

## Estrutura observada

O modelo separa os lados direito e esquerdo. Cada lado oferece conformação do teto ósseo, margem óssea lateral, ângulo alfa, configuração e posição da cartilagem hialina, ângulo beta, cobertura opcional e manobra de pistonagem. Os valores numéricos de alfa e beta selecionam automaticamente faixas discretas.

O estado inicial já conclui ambos os quadris como Graf Ia mesmo com idade e ângulos numéricos vazios. Isso decorre das faixas e morfologias normais preselecionadas, não de medidas registradas.

## Faixa alfa intermediária

Ao informar alfa de 55° no lado direito, a interface deixou de emitir uma classe definitiva para esse lado e pediu idade em semanas para separar IIa de IIb. O beta continuou vazio. Depois de informar 10 semanas, a opinião classificou automaticamente como IIa-. Ao acrescentar beta de 60°, a classificação não mudou.

O lado esquerdo permaneceu como Ia durante todo o cenário, embora seus ângulos numéricos não tivessem sido preenchidos. O comportamento é coerente com presets por faixa, mas não comprova uma classificação baseada em medidas completas.

## Faixa crítica e morfologia

Com alfa de 45°, a opinião mudou para IIc. Alterar beta para 75° e deslocar superiormente a cartilagem modificou o corpo descritivo, mas não mudou a classe final no cenário testado. Isso sugere que a regra observada prioriza a faixa alfa e não integra todas as variáveis mostradas no formulário para essa combinação.

Essa conclusão é limitada ao caso sintético. Tipos D, III e IV precisam de testes próprios se forem priorizados em uma rodada futura.

## Restauração

Idade e valores numéricos foram limpos; as faixas alfa e beta retornaram às opções normais; a cartilagem voltou à posição centrada. O texto inicial com Graf Ia bilateral reapareceu. O rascunho não foi finalizado nem enviado.

O cruzamento técnico está em [crosswalk-quadril-infantil-2026-10-03.md](../crosswalk-quadril-infantil-2026-10-03.md).
