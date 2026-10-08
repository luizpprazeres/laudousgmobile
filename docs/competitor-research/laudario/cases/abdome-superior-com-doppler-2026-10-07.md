# Laudário — Abdome Superior com Doppler

Observado em 07/10/2026 em conta autorizada, com dados exclusivamente sintéticos e pela interface normal, sem copiar, imprimir, assinar ou finalizar. O relato chegou ao Claude Code por escrito (`/tmp/laudario-live-facts-B.md`); nesta sessão o Claude Code não teve acesso ao navegador. Por isso, **observado** aqui significa “visto na interface e relatado”. O que o relato não citou consta como **não observado**. O roteiro veio do preflight `/tmp/laudario-abdome-superior-doppler-preflight-2026-10-07.md`. O modelo foi reaberto e voltou ao baseline. As frases do concorrente estão descritas pela função, sem transcrição.

```yaml
competitor: Laudário
observed_at: 2026-10-07 (-03:00), relato escrito
exam: Abdome Superior com Doppler
catalog_ref: catalogo-ultrassonografia-2026-10-02.json:38 (grupo abdome)
baseline:
  controls: módulo anatômico do abdome superior combinado com módulo de Doppler hepático no mesmo exame
  report_structure: sem nenhuma medida, normalidade publicada para fígado, veia porta, vias biliares, vesícula, pâncreas, baço e líquido livre (bloco anatômico) e para veia porta, colaterais, veia esplênica, artéria esplênica, veia mesentérica superior e veias hepáticas (bloco Doppler)
scenarios:
  - id: C1-trombose-portal-parcial
    input: no bloco Doppler, veia porta com trombose parcial
    cascades: o formulário ativou sozinho trombo benigno sem vascularização interna e extensão ao ramo direito
    output: esses atributos entraram no corpo; a conclusão registrou trombose portal parcial; a aba de recomendações mostrou cinco sugestões, que não foram abertas nem publicadas
    incoherence: I1 (o bloco anatômico manteve a veia porta pérvia, de calibre e trajeto habituais)
    reset_verified: true (pela reabertura do modelo)
  - id: C2-porta-nao-avaliada-limitacao-tecnica
    input: no bloco Doppler, veia porta não avaliada por limitação técnica
    cascades: o bloco Doppler retirou a normalidade portal e concluiu não avaliação
    output: o texto ganhou interposição gasosa, meteorismo acentuado e janela acústica desfavorável, sem escolha dessas causas
    incoherence: I1 (o bloco anatômico manteve a porta pérvia e habitual) e I2 (causas presumidas)
    reset_verified: true (pela reabertura do modelo)
evidence:
  observed: ver a seção “Evidência e classificação”
  inferred: ver a seção “Evidência e classificação”
crosswalk:
  laudousg_paths_checked: ver crosswalk-abdome-superior-com-doppler-2026-10-07.md
  status: partial
next_probe: ver a seção “Próxima sondagem”
```

## Baseline e inventário dos controles

O exame **combina dois módulos** no mesmo laudo: um anatômico, com os órgãos do abdome superior, e um de Doppler hepático. Sem nenhuma medida, os dois publicam normalidade:

- **bloco anatômico:** fígado, veia porta, vias biliares, vesícula, pâncreas, baço e líquido livre;
- **bloco Doppler:** veia porta, colaterais, veia esplênica, artéria esplênica, veia mesentérica superior e veias hepáticas.

A veia porta aparece **nos dois blocos**. A normalidade vascular, incluindo colaterais e artéria esplênica, é **presumida pelo modelo**, não derivada de medida.

Controles citados no relato:

- estado da veia porta no bloco Doppler, com as opções **trombose parcial** e **não avaliada por limitação técnica**;
- atributos do trombo: caráter (benigno, sem vascularização) e extensão (ramo direito);
- aba de **recomendações**, com sugestões separadas do texto.

O relato não descreveu a técnica, o jejum, os campos de medida (calibre, velocidade, índices), os controles do bloco anatômico nem a presença de aorta, veia cava inferior ou rins.

## Cenário 1 — trombose portal parcial

**Entrada:** no bloco Doppler, veia porta com trombose parcial. Nada mais foi alterado.

**Observado:**

- o formulário marcou sozinho dois atributos do trombo, **benigno sem vascularização interna** e **extensão ao ramo direito**, sem escolha do operador;
- esses atributos **entraram no corpo**;
- a **conclusão** registrou trombose portal parcial;
- o **bloco anatômico** continuou afirmando a veia porta pérvia, de calibre e trajeto habituais;
- a aba de recomendações exibiu **cinco sugestões**, que não foram abertas nem publicadas.

**Contradição confirmada (I1):** o mesmo laudo declara a veia porta pérvia no bloco anatômico e com trombose no bloco Doppler.

## Cenário 2 — veia porta não avaliada por limitação técnica

**Entrada:** no bloco Doppler, veia porta não avaliada por limitação técnica, partindo do baseline.

**Observado:**

- o bloco Doppler **retirou a normalidade portal** e passou a concluir que a veia não foi avaliada;
- o texto ganhou **três causas específicas**, interposição gasosa, meteorismo acentuado e janela acústica desfavorável, **sem que nenhuma tenha sido escolhida**;
- o **bloco anatômico** continuou afirmando a veia porta pérvia e habitual.

**Defeitos confirmados:** causas da limitação presumidas (I2) e nova contradição entre o módulo anatômico e o Doppler (I1).

## Restauração

O modelo foi reaberto e o baseline foi restaurado. A restauração **não** foi feita desfazendo cada controle, então não se sabe se desmarcar a trombose ou a limitação remove atributos, conclusão e sugestões no mesmo passo.

## Evidência e classificação

**Observado** (relato da interface):

- baseline com módulo anatômico e módulo de Doppler hepático combinados, ambos normais sem medidas;
- normalidade presumida de colaterais e da artéria esplênica;
- líquido livre presente no bloco anatômico;
- trombose parcial com caráter e extensão preenchidos automaticamente e publicados no corpo;
- conclusão de trombose portal parcial;
- cinco recomendações sugeridas e não publicadas;
- veia porta não avaliada removendo a normalidade portal e concluindo não avaliação;
- causas de limitação acrescentadas sem seleção (I2);
- bloco anatômico inalterado nos dois cenários (I1);
- baseline restaurado pela reabertura.

**Inferido** (sem teste de fronteira):

- o bloco Doppler reutiliza o módulo do exame Doppler Hepático. Os mesmos padrões de trombo (sem vascularização, ramo direito) apareceram em 02/10 naquele exame (`cases/doppler-hepatico-2026-10-02.md:78`);
- os dois blocos são montados por fontes independentes, sem regra que leia o estado vascular para reescrever a frase anatômica da veia porta;
- as três causas da limitação são um texto fixo da opção “limitação técnica”, não uma lista selecionável oculta;
- neste exame, as recomendações não são publicadas sem ação explícita. Em 02/10, no Doppler Hepático isolado, a trombose parcial acrescentou recomendações ao texto (`cases/doppler-hepatico-2026-10-02.md:78`). Não se sabe se a diferença vem da combinação ou da forma como o operador agiu.

**Não observado** (não pode alimentar requisito como fato do concorrente): técnica e jejum; campos e unidades de medida; se a porta exige calibre ou velocidade; aorta, veia cava inferior e rins; controles do bloco anatômico e um cenário hepatobiliar alterado (hepatopatia, esplenomegalia, litíase); integração de modo B com vasos na conclusão; conteúdo das cinco recomendações; trombose completa, transformação cavernomatosa e fluxo hepatofugal; se é possível escolher a causa da limitação; limpeza das derivações ao desfazer cada controle; opção “Doppler não realizado”.

## Próxima sondagem

Um cenário resolve a principal lacuna: com o baseline, alterar **só o bloco anatômico** (por exemplo, fígado com padrão de hepatopatia crônica) e depois acrescentar fluxo portal hepatofugal. Registrar se a conclusão integra os dois módulos ou lista itens independentes. Depois, **desfazer passo a passo**, sem reabrir o modelo, e verificar se a trombose ou a limitação deixam atributos, causas ou sugestões residuais.
