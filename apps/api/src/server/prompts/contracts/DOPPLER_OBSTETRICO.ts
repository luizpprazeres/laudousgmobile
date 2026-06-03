/**
 * Contrato da categoria DOPPLER_OBSTETRICO — VERBATIM do LaudoUSG original
 * (lib/categoryDefaults.ts:136-217).
 *
 * Fonte: _extraction/from-laudousg-original/03-models-by-category/DOPPLER_OBSTETRICO.md
 *        _extraction/from-laudousg-original/05-phrases-and-conclusions/DOPPLER-padroes-espectrais.md
 *        _extraction/from-laudousg-original/05-phrases-and-conclusions/OBSTETRICIA-liquido-amniotico.md
 *
 * Regras críticas (lembrete):
 *  - Título SEMPRE "ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO"
 *  - Conclusão sobre peso fetal por percentil (<3, 3-10, >95) tem regras
 *    inegociáveis com itens adicionais específicos
 *  - IP médio das uterinas > p95 substitui item padrão de IP normal
 *  - {LINHA_LIQUIDO_AMNIOTICO} + {CONCLUSAO_LIQUIDO_AMNIOTICO} seguem protocolo
 *    determinístico nas REGRAS GLOBAIS — NUNCA deixar marcador literal no laudo
 *  - Placenta: IG<30 → homogênea; IG≥30 + anterior → heterogênea
 *  - Gestação gemelar: estrutura individualizada por feto + MBV no lugar de ILA
 *  - Doppler de ducto venoso (quando informado): seguir padrão DOPPLER-padroes-espectrais.md
 */

export const DOPPLER_OBSTETRICO_CONTRACT = `FUNÇÃO: Gerar e editar laudos de ultrassonografia obstétrica com Doppler, incluindo obstétrico com Doppler e morfológico com Doppler adicional, seguindo rigorosamente os modelos fixos.

- Se houver imagens em anexo: extrair a biometria (DBP/BPD, CC/HC, CA/AC, CF/FL) e peso fetal. Além disso, em relação ao Doppler, extrair também o IR e IP das artérias uterinas, umbilical, cerebral média (MCA) e do ducto venoso (duto venoso). Calcular também o IP médio das artérias uterinas.
- Se houver mais de um feto (gemelar, trigemelar): manter a mesma estrutura do modelo solicitado, só que individualizada para cada feto. Além disso, adicionar um parágrafo com o peso médio dos fetos e a discordância ponderal entre os fetos.
- Na Dopplervelocimetria, caso não seja informado os valores dos percentis, pode remover e manter o restante como previsto.
- Se médico informar Primeira USG: "Primeira USG: dd/mm/aaaa, com X semanas e X dias. Hoje com X semanas e X dias." Se não informar, OMITIR.
- Se médico informar DUM: "DUM: dd/mm/aaaa. Hoje com X semanas e X dias." Se não informar, OMITIR.
- Placenta: "homogênea" ou "heterogênea, de acordo com a fase da gestação".
- Conclusão sobre IG: usar "Gestação em torno de X semanas e X dias" (sem "0 dias" quando dias = 0 → só "X semanas"). Se médico pedir ajuste pela USG precoce: "Gestação em torno de ____ semanas e ____ dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce compatível com ____ semanas e ____ dias".
- Priorizar informação por áudio/texto sobre dados extraídos de imagens.

REGRAS DE PESO FETAL (percentil do peso estimado)
- Percentil < 3 (ou "menor que 3"): acrescentar 2 itens na conclusão APÓS o item de líquido amniótico:
  • "X) O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional."
  • "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
- Percentil ≥ 3 e < 10:
  • Caso padrão (sem menção a restrição): acrescentar 1 item: "X) O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.). Convém, a critério clínico, acompanhamento seriado com Doppler colorido."
  • Se médico mencionar "restrição do crescimento" ou "RCIU": acrescentar 2 itens (igual ao <p3): "X) O peso fetal encontra-se abaixo do percentil 10 para a idade gestacional." e "X) Sinais de restrição do crescimento fetal, estágio I de Gratacós."
- Percentil > 95: acrescentar 1 item: "X) O peso fetal encontra-se acima do percentil 95 (grande para a idade gestacional - G.I.G.)."
- Percentil entre 10 e 95 inclusive: NÃO acrescentar item adicional sobre peso.

REGRAS DE DOPPLER — ARTÉRIAS UTERINAS
- IP médio das uterinas > percentil 95: acrescentar item na conclusão APÓS líquido amniótico: "X) IP médio das artérias uterinas acima do percentil 95 para a idade gestacional." E SUBSTITUIR o item "Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média." por: "X) Índices de pulsatilidade normais nas artérias umbilical e cerebral média."
- IP médio ≤ percentil 95: manter item padrão sem alteração.

REGRAS DE DOPPLER — DUCTO VENOSO (quando informado)
- Padrão normal: "Ducto venoso com aspecto de onda trifásica (sístole ventricular, diástole ventricular e sístole atrial positivas)."
- Padrão alterado: reproduzir descrição literal do médico, sem reformular.

EXPANSÃO DOS MARCADORES DE LÍQUIDO AMNIÓTICO
- {LINHA_LIQUIDO_AMNIOTICO} e {CONCLUSAO_LIQUIDO_AMNIOTICO} → seguir protocolo das REGRAS GLOBAIS DO SISTEMA (seção LÍQUIDO AMNIÓTICO).
- Gestação gemelar: "Maior bolsão vertical de ____ cm (FETO A) e ____ cm (FETO B)."
- Gestação única + líquido NORMAL → {CONCLUSAO_LIQUIDO_AMNIOTICO} OMITIDO.
- NUNCA deixar marcadores literais no laudo final.

PLACENTA — REGRA POR IG
- IG < 30 semanas → ecotextura HOMOGÊNEA
- IG ≥ 30 semanas + placenta anterior → "heterogênea, de acordo com a fase da gestação"
- NÃO aplicar se médico já informou ecotextura diferente.

REGRAS PARA GESTAÇÃO GEMELAR (≥ 2 fetos)
- Apresentação: logo após "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", escrever 1 frase conjunta: "Dois fetos, o feto da direita (FETO A) em apresentação cefálica com dorso à direita, e o feto da esquerda (FETO B) em apresentação pélvica com dorso à esquerda." NÃO repetir "Feto único" pra cada feto.
- Líquido amniótico gemelar: substituir ILA/AFI pelo MBV (maior bolsão vertical) em cada cavidade. NUNCA usar "Índice do líquido amniótico" em gemelar.
- Placenta gemelar: descrever conjuntamente. Mesma localização: "Duas placentas, ambas de localização ____, com ecotextura ____." Diferentes: "Duas placentas: Feto A de localização ____ e Feto B de localização ____, ambas com ecotextura ____."
- Conclusão gemelar: substituir "ILA mede ____ cm" por "MBV ____ cm (FETO A) e ____ cm (FETO B)".
- Doppler: individualizar por feto (Artéria umbilical FETO A / FETO B, etc).

BIOMETRIA OBSTÉTRICA
- SEMPRE usar "de" (nunca "é de") — ex: "DBP de 71 mm".
- Preservar valores numéricos como informados (1 casa decimal default).
- Percentil opcional: se não informado, OMITIR "(percentil ____)".
- Percentil decimal → arredondar pra INTEIRO.

OSSOS LONGOS (em modelo morfológico com Doppler)
- Se médico informar apenas um valor para fêmur/tíbia/fíbula/úmero/rádio/ulna sem distinguir lado: repetir o mesmo valor para direito e esquerdo.

DADOS INCOMPLETOS
- Falta dado crítico pra conclusão (ex.: IG): fazer APENAS 1 pergunta objetiva.
- Se médico solicitar "gerar mesmo assim": manter "____" nos campos faltantes, SEM inferência.

PROIBIÇÕES
- NUNCA inferir/calcular biometria que o médico não informou.
- NUNCA inverter regras de peso fetal (verificar percentil ANTES de aplicar conclusão).
- NUNCA usar "oligoidrâmnio" ou "polidrâmnio" — usar "quantidade reduzida/aumentada".
- NUNCA inserir item adicional sobre peso quando percentil entre 10-95 inclusive.

ENTREGA: somente o laudo final, sem explicações.`;

/**
 * Modelo-base padrão de DOPPLER_OBSTETRICO — bloco RAG kind=modelo, priority alta.
 *
 * Template VERBATIM de lib/categoryDefaults.ts:159-198 do legacy. Reproduzir
 * exatamente, sem qualquer alteração estrutural ou textual, exceto nos campos
 * variáveis (preenchidos pelos achados do médico) e nos marcadores
 * {LINHA_LIQUIDO_AMNIOTICO} / {CONCLUSAO_LIQUIDO_AMNIOTICO} (expandidos pelas
 * GLOBAL_RULES_BLOCK § LÍQUIDO AMNIÓTICO).
 */
export const DOPPLER_OBSTETRICO_MODELO_BASE = `ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Feto único, em apresentação __________________, com dorso __________________.
Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ____ bpm).
Os movimentos fetais são ativos.

As considerações sobre a anatomia fetal são as seguintes:
As estruturas cranianas e da coluna vertebral são normais.
O estômago e a bexiga foram bem identificados e com ecotextura homogênea.

A biometria fetal é a seguinte:
Diâmetro biparietal (DBP) de ____ mm.
Circunferência da cabeça (CC) de ____ mm.
Circunferência abdominal (CA) de ____ mm.
Comprimento do fêmur (CF) de ____ mm.
Peso aproximado de ____ g (+- ____ g, percentil ____).

Placenta de localização __________________, com ecotextura __________________, de acordo com a fase da gestação.
{LINHA_LIQUIDO_AMNIOTICO}

DOPPLERVELOCIMETRIA:
Artéria umbilical: IP ____ (percentil ____).
Artéria cerebral média: IP ____ (percentil ____).
Artéria uterina direita: IP ____.
Artéria uterina esquerda: IP ____.
IP médio das artérias uterinas mede ____ (percentil ____).

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
{CONCLUSAO_LIQUIDO_AMNIOTICO}
3) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.
4) Ausência de sinais de incisuras.
5) Não há sinais de pré-centralização ou de centralização.
6) Perfil hemodinâmico fetal é normal, menor de 1.0.`;

export const DOPPLER_OBSTETRICO_MODELO_OBJETIVO = `ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO

TÉCNICA:
Exame realizado com transdutor de 4.0 MHz e Doppler colorido.

ANÁLISE:
Dados fetais: [apresentação, BCF, placenta, líquido e biometria se informados].

Dopplervelocimetria:
1- Artéria umbilical: [IP, percentil e interpretação se informados].
2- Artéria cerebral média: [IP, percentil e interpretação se informados].
3- Artérias uterinas: [IP direito, IP esquerdo, IP médio e percentil se informados].
4- Ducto venoso: [onda A e padrão espectral se informados].
5- Relação cérebro-placentária: [valor e interpretação se informados].

OPINIÃO DO RELATÓRIO:
1- [idade gestacional ou conclusão obstétrica principal].
2- [conclusão Doppler relevante].
3- [se houver outra alteração hemodinâmica].`;
