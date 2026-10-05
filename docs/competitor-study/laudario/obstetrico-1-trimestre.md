# Obstétrico 1º trimestre (com e sem Doppler)

## Concorrente

**Observado (02/10/2026, `competitor-research/laudario/cases/obstetrico-1t-2026-10-02.md`):**
- Blocos separados: técnica, indicação, datação (DUM, IG informada, DPP, FIV, correção por exame
  anterior), útero, colo, ovários, saco gestacional, embrião/feto, vesícula vitelina, viabilidade,
  marcadores, pré-eclâmpsia, comparação, achados adicionais, recomendações.
- Uma medida de CCN atualiza IG, DPP, corpo e conclusão ao mesmo tempo; a data do exame entra no cálculo.
- Atividade cardíaca ausente muda corpo e conclusão de forma coordenada e é relacionada a um limiar de CCN.
- Descrição dos marcadores, cálculo de risco, interpretação qualitativa e publicação dos números são
  estados distintos; os números só entram após uma escolha explícita.
- O ducto venoso qualitativo não entra no cálculo de risco (exige IP numérico).

**Não observado:** CCN abaixo do limiar com atividade ausente; saco sem embrião; gestação de
localização indeterminada; DUM discordante; FIV; gemelar no 1º trimestre; Doppler (uterinas, ducto com IP).

## LaudoUSG (repo)

- Sem card de 1º trimestre na Web; `apps/web/src/lib/deterministic/organs/obstetrica.ts:8` declara
  escopo >14 semanas e deixa "gestação inicial (saco/CCN)" pendente.
- O `MORFOLOGICO` 1t coleta CCN e FCF, mas não deriva IG/DPP do CCN (crosswalk de 02/10).
- A API aceita BCF ausente e conclui ausência de vitalidade sem validar CCN mínimo (crosswalk de 02/10).
- Motor de trissomias compartilhado existe; na Web fica atrás de `NEXT_PUBLIC_FMF_TRISOMY_VALIDATION`.
- Fundação de IG em `apps/web/src/lib/ig` (DUM e IG informada), sem fórmula de CCN própria.

## Backlog (sugestão)

**Modelo basal necessário:** gestação tópica com saco intrauterino e embrião/feto com atividade
cardíaca — só por escolha explícita do modelo normal; formulário em branco não conclui nada.

**Alterações essenciais (v1):**
1. Ausência de atividade cardíaca com CCN informado.
2. Saco gestacional sem embrião (com diâmetro médio do saco).
3. Gestação de localização não determinada (sem saco intrauterino).
4. Descolamento/hematoma subcoriônico com medidas.
5. Discordância entre IG pela DUM e pelo CCN (descritiva, sem redatar sozinho).

**Campos obrigatórios:** data do exame; número de sacos; localização do saco; CCN (mm) quando houver
embrião; atividade cardíaca (presente/ausente/não avaliada); FCF (bpm) quando presente; método de
datação escolhido. **Opcionais:** DUM, vesícula vitelina, diâmetro médio do saco, TN e marcadores,
corpo lúteo, colo, Doppler das uterinas com IP, cálculo de risco com inclusão explícita.

**Riscos fail-closed:**
- Ausência de vitalidade só conclui com CCN acima do critério aprovado, método de confirmação e
  confirmação médica; abaixo do critério, apenas descrição e pendência.
- Sem saco intrauterino não há "gestação tópica"; sem embrião não há "embrião vivo".
- IG/DPP pelo CCN com fórmula e versão registradas; divergência de 1 dia com o concorrente investigada antes.
- Marcador "não avaliado" nunca vira normal; números de risco só com inclusão explícita.
- Unidade explícita (mm) com faixa plausível para CCN e FCF.

## Perguntas para a rodada manual (não observado)

CCN abaixo do limiar com atividade ausente; saco sem embrião; localização indeterminada; o que
acontece com IG/DPP ao trocar o método de datação; se "não avaliado" existe por marcador.
