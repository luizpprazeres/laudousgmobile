# Laudário — Doppler de Artérias Mesentéricas

Observado em 07/10/2026 por um operador autorizado no Chrome, em conta autorizada e com dados exclusivamente sintéticos. O operador relatou os cenários ao Claude Code, que não teve acesso direto ao navegador nesta rodada (preflight `/tmp/laudario-mesentericas-preflight-2026-10-07.md`, status BLOCKED_UI antes do relato). Por isso, “observado” aqui significa “visto pelo operador na interface”. O relato foi curto: o que ele não citou consta como **não observado**. Nenhum laudo foi copiado, impresso, assinado ou finalizado. O modelo voltou ao estado inicial no fim. As frases do concorrente estão descritas pela função, sem transcrição.

```yaml
competitor: Laudário
observed_at: 2026-10-07 (-03:00), relato do operador
exam: Doppler de Artérias Mesentéricas
catalog_ref: catalogo-ultrassonografia-2026-10-02.json:48 (grupo vascular_abdominal)
baseline:
  controls: modelo abre normal; tronco celíaco (TC) e AMS incluídos e normais; AMI opcional e desligada; VPS e VDF vazias
  report_structure: laudo normal para TC e AMS sem nenhuma velocidade registrada; AMI fora do laudo
scenarios:
  - id: C1b-protocolo-pos-prandial
    input: sobre o baseline, protocolo com fase pós-prandial; depois, pós-prandial ligado na AMS
    cascades: a técnica passa a citar a fase pós-prandial; na AMS, os campos de medida pós-prandial ficam vazios e desabilitados
    output: o corpo continua descrevendo só o jejum; a AMS recebe, por padrão, resposta pós-prandial fisiológica normal sem nenhuma medida pós
    incoherence: I1 (técnica e resposta pós-prandial afirmadas sem dado da fase)
    reset_verified: true
  - id: C2-tronco-celiaco-estenose
    input: aorta VPS 100 cm/s; TC com placas e aliasing; VPS 240 cm/s; VDF 60 cm/s
    cascades: razão mesentérico-aórtica (RMA) calculada = 2,4
    output: conclusão de estenose do TC ≥ 50%, sem relato de confirmação médica
    reset_verified: true
  - id: C3-ami
    input: AMI ligada sem medida; depois marcada como não visualizada
    cascades: ao ligar, AMI entra normal; ao marcar não visualizada, corpo e conclusão passam a registrar a limitação
    output: a técnica continua afirmando avaliação adequada das três artérias
    incoherence: I2 (técnica contradiz a limitação registrada)
    reset_verified: true
evidence:
  observed: ver a seção “Evidência e classificação”
  inferred: ver a seção “Evidência e classificação”
crosswalk:
  laudousg_paths_checked: ver crosswalk-doppler-arterias-mesentericas-2026-10-07.md
  status: partial
next_probe: ver a seção “Próxima sondagem”
```

## Baseline e inventário dos controles

O modelo abre **normal**: TC e AMS entram como vasos normais no corpo e na conclusão, **sem VPS nem VDF**. A AMI é **opcional e começa desligada**, ou seja, fica fora do laudo, e não aparece como “normal”. A normalidade do TC e da AMS é, portanto, **presumida pelo modelo**, não derivada de medida.

Controles citados no relato:

- cobertura por vaso: TC e AMS incluídos no modelo; AMI opcional;
- aorta de referência, com VPS;
- por vaso: VPS, VDF, placas, aliasing;
- **protocolo com fase pós-prandial** e, na AMS, um controle de avaliação pós-prandial com campos de medida próprios;
- estado de AMI **não visualizada**;
- **RMA** (razão mesentérico-aórtica) calculada pelo sistema.

## Cenário 1 — baseline e protocolo pós-prandial

**Entrada:** baseline intocado; em seguida, protocolo com fase pós-prandial; depois, pós-prandial ligado na AMS.

**Observado:**

- a **técnica** passou a citar a fase pós-prandial;
- o **corpo** continuou descrevendo só o exame em jejum;
- ao ligar o pós-prandial da AMS, o laudo passou a afirmar, por padrão, uma **resposta pós-prandial fisiológica normal**;
- os campos de medida pós-prandial **ficaram vazios e desabilitados**, e o sistema **não exigiu** medida para emitir essa resposta.

**Incoerência I1:** a técnica e a AMS afirmam uma fase do exame e o resultado dela sem nenhum dado da fase. Na configuração testada, a resposta não dependia de medida; não foi testado se outro estado habilita os campos.

## Cenário 2 — tronco celíaco com aceleração e placas

**Entrada:** aorta de referência com VPS 100 cm/s; TC com placas e aliasing, VPS 240 cm/s e VDF 60 cm/s.

**Observado:**

- o sistema **calculou a RMA = 2,4**;
- a conclusão passou a declarar **estenose do TC ≥ 50%**;
- o relato não cita nenhum passo de confirmação médica antes da graduação.

**Implicação:** a graduação é **automática**, derivada de velocidade e/ou razão. A razão com a aorta é um derivado útil; a graduação automática sem confirmação é o oposto da salvaguarda adotada no LaudoUSG.

## Cenário 3 — AMI ligada e depois não visualizada

**Entrada:** ligar a AMI sem medida; depois marcá-la como não visualizada.

**Observado:**

- ligada sem medida, a AMI entrou **normal**;
- marcada como não visualizada, **corpo e conclusão** registraram a limitação;
- a **técnica** continuou afirmando que as **três artérias** foram adequadamente avaliadas.

**Incoerência I2:** o estado “não visualizada” atualiza corpo e conclusão, mas não a técnica, que é fixa ou derivada de outra fonte. O laudo fica contraditório entre seções.

## Restauração

O operador confirmou o retorno ao baseline. Nada foi salvo, finalizado ou impresso.

## Evidência e classificação

**Observado** (relato do operador, interface visível):

- baseline normal sem VPS/VDF, com TC e AMS incluídos e AMI opcional desligada;
- protocolo pós-prandial alterando a técnica, sem alterar o corpo;
- resposta pós-prandial normal por padrão na AMS, com campos pós vazios e desabilitados (I1);
- RMA calculada (2,4) com aorta 100 e VPS 240;
- conclusão automática de estenose ≥ 50% no TC;
- campos de placas e aliasing por vaso;
- AMI ligada sem medida vira normal;
- AMI não visualizada com limitação no corpo e na conclusão, e técnica inalterada (I2);
- restauração confirmada.

**Inferido** (sem teste de fronteira):

- a RMA é VPS do vaso ÷ VPS da aorta (240 ÷ 100 = 2,4), aplicada também ao TC e não só à AMS;
- a graduação ≥ 50% vem de limiar fixo, mas **não se sabe** se o gatilho foi a VPS, a RMA ou a VDF;
- a técnica é um texto fixo do protocolo, que não lê o estado por vaso;
- placas e aliasing não mudam o grau sozinhos (não foram testados isolados).

**Não observado** (não pode alimentar requisito como fato do concorrente): controle de jejum; graus além de ≥ 50% (por exemplo ≥ 70%) e se há confirmação médica; recomendação ou hipótese de isquemia; comportamento ao apagar a velocidade; graduação sem aorta; AMS com estenose; variação respiratória do TC e ligamento arqueado; oclusão; variantes anatômicas, dissecção e aneurisma visceral; se os campos pós-prandiais podem ser habilitados em algum estado.

## Próxima sondagem

Um único cenário resolve a principal inferência: no TC, repetir VPS 240 **sem aorta** e registrar se a graduação some (gatilho = RMA) ou persiste (gatilho = VPS). Em seguida, apagar a VPS e verificar se grau e conclusão desaparecem sem resíduo. Se houver tempo, ligar o pós-prandial e procurar o estado que habilita as medidas pós.
