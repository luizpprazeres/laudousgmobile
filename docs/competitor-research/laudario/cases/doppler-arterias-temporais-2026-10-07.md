# Laudário — Doppler de Artérias Temporais

Observado em 07/10/2026 por um operador autorizado, em conta autorizada e só com dados sintéticos. Os cenários foram relatados ao Claude Code, que não teve acesso direto ao navegador nesta rodada. Por isso, aqui “observado” quer dizer “visto pelo operador na interface”. Nenhum laudo foi copiado, impresso, assinado ou finalizado, e o operador restaurou o estado inicial no fim. As frases do concorrente aparecem descritas pela função, sem transcrição. O relato é curto: o que ele não menciona está marcado como **não observado**.

```yaml
competitor: Laudário
observed_at: 2026-10-07 (-03:00), relato do operador
exam: Doppler de Artérias Temporais
surface: modelo próprio no atalho vascular arterial (catalogo-ultrassonografia-2026-10-02.json:46)
baseline:
  controls: quatro grupos de achado (halo, fluxo, compressibilidade, redução/oclusão), todos no estado normal
  report_structure: laudo normal pronto ao abrir; lateralidade (direita, esquerda ou bilateral) só nos estados anormais
scenarios:
  - id: C1-baseline
    input: modelo aberto sem alteração
    cascades: nenhuma
    output: os quatro grupos normais publicam um laudo normal
    reset_verified: true
  - id: C2-halo-direito
    input: halo presente, lateralidade direita; depois a lateralidade foi trocada para bilateral
    cascades: o lado acompanha a lateralidade escolhida
    output: corpo e conclusão passam a afirmar arterite com processo inflamatório ativo; com bilateral, o corpo descreve o achado nos dois lados
    reset_verified: true
  - id: C3-combinado-esquerdo
    input: halo ausente + fluxo ausente à esquerda + artéria não compressível à esquerda + oclusão à esquerda (várias mudanças de uma vez)
    cascades: não relatadas
    output: o corpo lista os três achados anormais; a conclusão afirma ao mesmo tempo ausência de sinais de arterite e processo inflamatório arterial ativo, e não conclui a oclusão
    reset_verified: true
evidence:
  observed: ver a seção “Evidência e classificação”
  inferred: ver a seção “Evidência e classificação”
crosswalk:
  laudousg_paths_checked: ver crosswalk-doppler-arterias-temporais-2026-10-07.md
  status: partial
next_probe: ver a seção “Próxima sondagem”
```

## Baseline e inventário dos controles

O modelo abre com **laudo normal pronto**. Os controles se organizam em **quatro grupos por tipo de achado**, não por segmento arterial:

- halo;
- fluxo;
- compressibilidade;
- redução ou oclusão.

Cada grupo começa no estado normal. A **lateralidade** (direita, esquerda ou bilateral) só aparece quando o grupo passa a um estado anormal.

O relato não menciona os itens abaixo, que portanto ficam **não observados**:

- divisão por segmento (tronco comum, ramo frontal, ramo parietal) ou artérias axilares;
- estado “não avaliado” ou “limitado” por lado ou segmento;
- espessura parietal com unidade, ou velocidades;
- contexto clínico, como corticoide ou sintomas;
- confirmação médica antes da hipótese diagnóstica;
- recomendações automáticas.

## Cenário 1 — baseline

**Entrada:** o modelo como abre.

**Observado:** os quatro grupos estão normais e o laudo sai normal sem nenhuma ação do médico.

**Implicação:** a normalidade é **presumida**. Não há como diferenciar “avaliado e normal” de “não preenchido”. O mesmo padrão aparece em outros modelos do concorrente (por exemplo, `crosswalk-pelvico-transvaginal-2026-10-06.md`).

## Cenário 2 — halo à direita, depois bilateral

**Entrada:** halo presente com lateralidade direita. Em seguida, a lateralidade foi trocada para bilateral.

**Observado:**

- com halo à direita, o **corpo e a conclusão** passam a falar em arterite e em processo inflamatório ativo;
- ao trocar para bilateral, o **corpo** descreve o achado nos dois lados.

**Não observado:** se a conclusão também passou a ser bilateral; se a interface pediu segundo marcador, espessura ou confirmação; se apareceu recomendação.

**Implicação:** um **único marcador**, o halo, basta para o concorrente afirmar o diagnóstico, sem dado mínimo adicional e sem confirmação explícita.

## Cenário 3 — combinação de achados à esquerda

**Entrada:** halo ausente, fluxo ausente à esquerda, artéria não compressível à esquerda e oclusão à esquerda. As mudanças foram feitas **juntas**, e não uma por vez.

**Observado:**

- o corpo lista os três achados anormais: ausência de fluxo, não compressibilidade e oclusão;
- **conflito na conclusão:** uma frase nega sinais de arterite e outra afirma processo inflamatório arterial ativo, no mesmo laudo;
- a conclusão **não menciona a oclusão** de forma específica, apesar de o corpo descrevê-la.

**Implicação:** a conclusão parece montada por **regras independentes, uma por grupo**, sem verificação de coerência entre elas. O halo ausente gera a frase negativa; a não compressibilidade, um marcador parietal, gera a frase positiva; a oclusão não tem frase própria de conclusão. Essa atribuição de cada frase a um grupo é **inferida**, porque as variáveis mudaram ao mesmo tempo.

## Restauração

O operador confirmou o retorno ao estado inicial, com os quatro grupos normais. Nada foi salvo, finalizado ou impresso.

## Evidência e classificação

**Observado** (relato do operador, interface visível):

- quatro grupos por tipo de achado, todos normais ao abrir;
- laudo normal sem ação do médico;
- lateralidade só nos estados anormais;
- halo à direita leva o corpo e a conclusão a afirmar arterite e inflamação ativa;
- lateralidade bilateral refletida no corpo;
- no cenário combinado, os três achados anormais aparecem no corpo;
- conclusão contraditória: negação e afirmação da doença juntas;
- oclusão ausente da conclusão;
- restauração confirmada.

**Lacuna confirmada do concorrente** (vista diretamente; não deve ser reproduzida):

- **Conclusão incoerente.** No mesmo laudo, uma frase nega sinais de arterite e outra afirma processo inflamatório arterial ativo.
- **Achado do corpo sem correspondente na conclusão.** A oclusão é descrita no corpo e omitida na conclusão.
- **Diagnóstico por marcador único.** O halo isolado basta para afirmar arterite.

**Inferido** (ainda sem caso de fronteira):

- a conclusão é composta por regras independentes por grupo, sem precedência nem exclusão mútua;
- a frase negativa vem do grupo halo no estado ausente, e a positiva vem da não compressibilidade;
- o modelo trabalha por lado, e não por segmento, porque o relato não cita ramos;
- a oclusão não tem regra própria de conclusão, ou essa regra é suprimida por outra.

**Candidato** (depende de nova sondagem ou de revisão médica):

- a conclusão do cenário 2 com bilateral pode ter ficado unilateral (o relato só cobre o corpo);
- “redução” de fluxo pode ter graduação ou critério próprio (não relatado);
- ausência de fluxo e oclusão podem ser estados redundantes que geram texto duplicado.

## Próxima sondagem

Um cenário de cada vez, a partir do baseline, sem combinar variáveis:

1. **Só a não compressibilidade à esquerda**, com halo normal. Registrar se surge a frase de inflamação ativa e se convive com a frase negativa. Isso isola a origem do conflito.
2. **Só a oclusão à esquerda.** Registrar se a conclusão cita a oclusão quando ela está sozinha e se o fluxo muda sozinho.
3. Repetir o **halo bilateral** e registrar a **conclusão**, não só o corpo.
