# Laudário — Pélvico Transvaginal - Monitorização Folicular

Observado em 07/10/2026 por um operador autorizado no Chrome, em conta autorizada e com dados exclusivamente sintéticos. Os cenários foram relatados ao Claude Code, que não teve acesso direto ao navegador nesta rodada. Por isso, “observado” aqui significa “visto pelo operador na interface”. Nenhum laudo foi copiado, impresso, assinado ou finalizado. O modelo foi restaurado no fim. As frases do concorrente estão descritas pela função, sem transcrição.

```yaml
competitor: Laudário
observed_at: 2026-10-07 (-03:00), relato do operador
exam: Pélvico Transvaginal - Monitorização Folicular
surface: modelo do pélvico transvaginal com aba própria de monitorização folicular
baseline:
  controls: checkbox de inclusão da monitorização desligado; zero folículos; observação vazia
  report_structure: laudo pélvico transvaginal sem contagem folicular; conclusão normal genérica
scenarios:
  - id: C1-ativado-vazio
    input: monitorização ligada; zero folículos nos dois ovários
    cascades: aparece a seção de folículos e uma tabela de faixas vazia
    output: corpo com contagem zero por ovário; conclusão normal genérica mantida
    reset_verified: true
  - id: C2-dois-de-18-OD
    input: inclusão rápida no OD de 2 folículos de 18 mm
    cascades: criadas duas linhas individuais; coluna 18 da tabela de faixas = 2
    output: corpo com contagem e as duas linhas; conclusão passa a citar o maior folículo (18 mm) e a normalidade das demais estruturas
    reset_verified: true
  - id: C3-eixos-e-contralateral
    input: um folículo do OD alterado para 20 x 16 mm; inclusão de 1 folículo de 12 mm no OE; observação livre
    cascades: média recalculada para 18 mm; coluna 12 preenchida
    output: conclusão resume cada lado pelo seu maior folículo; observação livre entra no corpo com pontuação duplicada quando o texto já termina em ponto
    reset_verified: true
evidence:
  observed: ver a seção “Evidência e classificação”
  inferred: ver a seção “Evidência e classificação”
crosswalk:
  laudousg_paths_checked: ver crosswalk-monitorizacao-folicular-2026-10-07.md
  status: partial
next_probe: ver a seção “Próxima sondagem”
```

## Baseline e inventário dos controles

O modelo abre como um pélvico transvaginal comum. A monitorização fica **desligada**, o laudo não traz contagem folicular e a conclusão é a de normalidade genérica do pélvico. Ou seja, a monitorização é um **módulo opcional sobre o modelo pélvico**, não um laudo à parte.

Controles da aba de monitorização, conforme o relato:

- **checkbox mestre** que inclui a monitorização no laudo;
- **inclusão rápida por lado**, informando quantidade × medida em mm, que cria várias linhas de uma vez;
- **adicionar e remover folículo**, um a um;
- **linhas individuais por folículo**, com **dois diâmetros** e **média calculada automaticamente**;
- **observações livres**, que vão para o corpo do laudo.

Não foram relatados, e portanto **não foram observados**: dia do ciclo ou DUM, tipo de ciclo e medicação, número do exame na série, exame anterior ou comparativo, padrão endometrial próprio da monitorização, corpo lúteo, sinais de ovulação, contagem de antrais, escolha de unidade e comportamento com ovário não visualizado.

## Cenário 1 — monitorização ligada, zero folículos

**Entrada:** checkbox ligado; nenhum folículo em nenhum dos ovários.

**Observado:** o corpo passou a declarar contagem **zero** em cada ovário e exibiu a tabela de faixas de tamanho vazia. A conclusão continuou com a normalidade genérica.

**Implicação:** ligar o módulo sem nenhum dado gera uma afirmação positiva, “nenhum folículo”, que ninguém confirmou. Assim, o estado “não preenchido” fica igual ao estado “zero folículos medidos”, e a conclusão de normalidade não depende do resultado da monitorização.

## Cenário 2 — dois folículos de 18 mm no ovário direito

**Entrada:** inclusão rápida no OD de 2 folículos de 18 mm.

**Observado:**

- o sistema criou **duas linhas individuais** a partir da inclusão rápida;
- o corpo mostrou a contagem do lado e as duas linhas;
- a **coluna de 18 mm** da tabela de faixas recebeu o valor 2;
- a conclusão deixou o texto genérico e passou a citar o **maior folículo (18 mm)** junto com a normalidade das demais estruturas;
- o OE não foi alterado.

**Implicação:** a conclusão é derivada do maior folículo, e não da lista inteira. A inclusão rápida é só um atalho de entrada, porque cada folículo vira uma linha editável.

## Cenário 3 — par de eixos e lado contralateral

**Entrada:** um dos folículos do OD foi alterado para 20 × 16 mm; foi incluído 1 folículo de 12 mm no OE; foi escrita uma observação livre.

**Observado:**

- a média daquela linha foi **recalculada para 18 mm**;
- no OE, a **coluna de 12 mm** foi preenchida;
- a conclusão passou a **resumir cada lado pelo seu maior folículo**;
- a observação livre entrou no corpo, mas, quando o texto digitado já terminava em ponto, o laudo ficou com **pontuação duplicada**.

**Implicação:** dois eixos formam um único folículo, e a média é derivada pelo sistema, nunca digitada. O resumo da conclusão é feito por lado. O texto livre é colado sem normalização.

## Restauração

O checkbox voltou a ficar desligado, os folículos voltaram a zero e a observação ficou vazia. O operador confirmou o retorno ao estado inicial. Nada foi salvo, finalizado ou impresso.

## Evidência e classificação

**Observado** (relato do operador, interface visível):

- monitorização opcional e desligada no estado inicial;
- inclusão rápida quantidade × mm por lado;
- linhas com dois diâmetros e média automática;
- adicionar e remover folículo;
- tabela de faixas por tamanho;
- contagem zero impressa com o módulo vazio;
- conclusão genérica com zero folículos;
- conclusão pelo maior folículo de cada lado;
- recálculo da média;
- independência entre os lados;
- observação livre com pontuação duplicada;
- restauração confirmada.

**Inferido** (ainda sem caso de fronteira):

- a coluna da tabela de faixas é escolhida pela **média** do folículo, e não pelo maior eixo. No C3 não foi relatado em que coluna o folículo de 20 × 16 ficou;
- o “maior folículo” da conclusão é medido pela média;
- a inclusão rápida grava a mesma medida nos dois diâmetros;
- as faixas usam colunas discretas de milímetros, mas o conjunto completo de colunas e os limites de cada uma não foram relatados;
- a remoção de um folículo atualiza a contagem, a tabela e a conclusão. A restauração sugere que sim, mas não houve teste de remoção isolada.

**Não observado** (não pode alimentar requisito como fato do concorrente): contexto do ciclo, padrão endometrial, série ou comparativo, ovulação ou corpo lúteo, rótulo de dominância, limiar de maturidade, conversão de unidade, regra para ovário não visualizado, avisos de plausibilidade.

## Próxima sondagem

Um único cenário resolve as principais inferências: no OD, informar 20 × 16 mm e 17 × 17 mm e registrar:

- em que coluna cada folículo entra;
- qual deles a conclusão chama de maior, comparando eixo e média (os dois têm média próxima de 17 a 18 mm);
- se remover um deles atualiza a tabela e a conclusão sem deixar resíduo.

Depois, marcar o OE como não caracterizado com um folículo incluído, para ver se a interface bloqueia ou contradiz.
