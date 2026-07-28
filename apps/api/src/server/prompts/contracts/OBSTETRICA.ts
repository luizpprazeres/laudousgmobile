/**
 * Contrato da categoria OBSTETRICA — VERBATIM do LaudoUSG original
 * (lib/categoryDefaults.ts:5-135).
 *
 * Fonte: _extraction/from-laudousg-original/03-models-by-category/OBSTETRICA.md
 *        _extraction/from-laudousg-original/05-phrases-and-conclusions/OBSTETRICIA-liquido-amniotico.md
 *
 * Regras críticas (lembrete):
 *  - Título SEMPRE "ULTRASSONOGRAFIA OBSTÉTRICA" (sem "INICIAL", sem trimestre)
 *  - Seleção automática: gatilhos → MODELO INICIAL (≤13s6d); senão MODELO PADRÃO (>14sem)
 *  - {LINHA_LIQUIDO_AMNIOTICO} + {CONCLUSAO_LIQUIDO_AMNIOTICO} seguem protocolo
 *    determinístico nas REGRAS GLOBAIS — NUNCA deixar marcador literal no laudo
 *  - DSM calculado SE médico pedir explicitamente E houver 3 medidas válidas
 *  - Placenta: IG<30 → homogênea; IG≥30 + anterior → heterogênea
 *  - Primeira USG / DUM: omitir linha se médico não informar
 */

export const OBSTETRICA_CONTRACT = `FUNÇÃO: Gerar e editar laudos de ultrassonografia obstétrica sem Doppler, seguindo rigorosamente os modelos fixos.

- Se houver imagens em anexo: extrair biometria (DBP/CC/CA/CF) e peso fetal.
- Se houver mais de um feto: individualizar (FETO A / FETO B / ...) + parágrafo com peso médio e discordância ponderal.
- Se médico informar Primeira USG COM DATA: "Primeira USG: dd/mm/aaaa, com X semanas e X dias. Hoje com X semanas e X dias." Se não informar, OMITIR.
- Se médico informar DUM COM DATA: "DUM: dd/mm/aaaa. Hoje com X semanas e X dias." Se não informar a data, OMITIR esta linha.
- Se a idade gestacional vier em SEMANAS sem data (ex.: "IG por DUM de 24 semanas", "gestação de 24 semanas", "idade gestacional de 24 semanas"): NÃO emita linha de DUM/Primeira USG com data. Registre a IG diretamente — "Idade gestacional de X semanas" (acrescente "e Y dias" SOMENTE se informado) — e leve a IG para a CONCLUSÃO ("Gestação em torno de X semanas e Y dias", omitindo os dias se não informados).
- NUNCA emita datas em placeholder (__/__/____, dd/mm/aaaa literal) nem "____ dias". Se faltar o dado, OMITA a linha inteira.
- Placenta: "homogênea" ou "heterogênea, de acordo com a fase da gestação".
- Priorizar informação por áudio/texto sobre dados extraídos de imagens.

SELEÇÃO AUTOMÁTICA DO MODELO
- Use o MODELO INICIAL (≤ 13 SEMANAS E 6 DIAS) quando QUALQUER gatilho presente:
  • menção a "obstétrica inicial", "primeiro trimestre", "1º trimestre", "1 tri"
  • menção a CCN, DSM, saco gestacional, vesícula vitelina, embrião
  • exame transvaginal sem biometria DBP/CC/CA/CF
  • idade gestacional ≤ 13 semanas e 6 dias informada
- Caso contrário, MODELO PADRÃO (> 14 semanas).
- Título de AMBOS: EXATAMENTE "ULTRASSONOGRAFIA OBSTÉTRICA". NUNCA "INICIAL", NUNCA "1 TRIMESTRE", NUNCA "TRANSVAGINAL".

EXPANSÃO DOS MARCADORES DE LÍQUIDO AMNIÓTICO (modelo padrão)
- {LINHA_LIQUIDO_AMNIOTICO} e {CONCLUSAO_LIQUIDO_AMNIOTICO} → seguir protocolo das REGRAS GLOBAIS DO SISTEMA (seção LÍQUIDO AMNIÓTICO).
- Gestação gemelar: "Maior bolsão vertical de ____ cm (FETO A) e ____ cm (FETO B)."
- Gestação única + líquido NORMAL → {CONCLUSAO_LIQUIDO_AMNIOTICO} OMITIDO.
- NUNCA deixar marcadores literais no laudo final.

CÁLCULO DO DSM (Diâmetro Médio do Saco Gestacional) — modelo inicial:
- Fórmula: DSM = (D1 + D2 + D3) / 3
- GATILHOS: "calcule o DSM", "calcular DSM", "diâmetro médio do saco", "calcule o diâmetro médio", "DSM pelas medidas".
- VALIDAÇÃO antes de calcular:
  • Menos de 3 medidas: NÃO calcular. Reproduzir + "[REVISAR — DSM requer 3 medidas; foram identificadas N]"
  • Medida individual < 2 mm: provavelmente truncação de voz. Reproduzir + "[REVISAR — medida ambígua]"
  • Mais de 3 medidas: usar as 3 mais próximas do comando.
- Vírgulas DENTRO de número decimal NÃO são separadores. "2,5 por 3,1 por 4,2" = TRÊS medidas.
- Arredondar pra 1 casa decimal. Vírgula como decimal. Unidade " mm".

REGRAS DO MODELO INICIAL
- Título SEMPRE "ULTRASSONOGRAFIA OBSTÉTRICA" (sem sufixo).
- CONCLUSÃO NÃO numerada — item único, sem "1)".
- NÃO usar DBP/CC/CA/CF nem peso fetal.
- Se saco gestacional não visualizado: omitir linha e adaptar.
- Se ovários não avaliados: omitir linha.
- NÃO incluir placenta, ILA nem bolsão vertical no modelo inicial.

PLACENTA — REGRA POR IG
- IG < 30 semanas → ecotextura HOMOGÊNEA
- IG ≥ 30 semanas + placenta anterior → ecotextura "heterogênea, de acordo com a fase da gestação"
- NÃO aplicar se médico já informou ecotextura diferente.

BIOMETRIA OBSTÉTRICA
- SEMPRE usar "de" (nunca "é de") — ex: "DBP de 71 mm".
- Preservar valores numéricos como informados (1 casa decimal default).
- Percentil opcional: se não informado, OMITIR "(percentil ____)".
- Percentil decimal → arredondar pra INTEIRO.

PROIBIÇÕES
- NUNCA inferir/calcular biometria que o médico não informou.
- NUNCA escrever "Embrião único" no modelo PADRÃO (>14 sem) — usar "Feto único".
- NUNCA inserir sufixo no título.
- NUNCA usar "oligoidrâmnio" ou "polidrâmnio" — usar "quantidade reduzida/aumentada".

ENTREGA: somente o laudo final, sem explicações.`;

/**
 * Reforço placentário opt-in. O mapa de blocos condicionais injeta este texto
 * somente em OBSTETRICA/DOPPLER_OBSTETRICO quando o ditado menciona placenta.
 */
export const PLACENTA_BLOCK = `PLACENTA — FRASE CANÔNICA CONDICIONAL:
- Quando a placenta for explicitamente ditada, este bloco prevalece sobre a regra de omiti-la no modelo inicial.
- Em linha própria no CORPO: "Placenta de localização {LOCALIZAÇÃO}, com ecotextura {ECOTEXTURA}." Omitir a subcláusula cujo dado não estiver disponível; nunca imprimir placeholder.
- Acrescentar a placenta NÃO substitui nem remove as demais linhas obrigatórias do modelo (líquido amniótico/MBV/ILA, biometria etc.): todas permanecem; a placenta é uma linha ADICIONAL no corpo.
- Preservar integralmente localização e ecotextura ditadas. A topografia pertence somente à placenta e NUNCA pode migrar para apresentação, situação, dorso ou polo fetal.
- Se a ecotextura não foi ditada e a idade gestacional é conhecida: antes de 30 semanas usar "homogênea"; a partir de 30 semanas usar "heterogênea, de acordo com a fase da gestação". Nunca substituir ecotextura ditada.
- Quando o grau for ditado, acrescentar ao fim da frase da placenta o parentético EXATO " (grau {0|I|II|III} de Grannum et al.)", convertendo 0→0, 1→I, 2→II e 3→III. Sem grau ditado, não escrever o parentético nem "____".
- A placenta fica somente no corpo e NUNCA vira item de conclusão.`;

/**
 * Modelo PADRÃO (> 14 semanas) — VERBATIM de lib/categoryDefaults.ts:52-80.
 * Bloco RAG kind=modelo, priority alta. Marcadores {LINHA_LIQUIDO_AMNIOTICO}
 * e {CONCLUSAO_LIQUIDO_AMNIOTICO} expandidos pelas GLOBAL_RULES § LÍQUIDO AMNIÓTICO.
 */
export const OBSTETRICA_MODELO_PADRAO = `ULTRASSONOGRAFIA OBSTÉTRICA

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem que possui várias metodologias.

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
Peso aproximado de ____ gramas (+- ____ gramas, percentil ____).

Placenta de localização __________________, com ecotextura _________________.
{LINHA_LIQUIDO_AMNIOTICO}

CONCLUSÃO:
1) Gestação em torno de ____ semanas e ____ dias.
{CONCLUSAO_LIQUIDO_AMNIOTICO}`;

/**
 * Modelo INICIAL (≤ 13s6d) — VERBATIM de lib/categoryDefaults.ts:84-99.
 * Usado quando gatilhos do MODELO_INICIAL estiverem presentes (ver SELEÇÃO
 * AUTOMÁTICA no contract). Título "ULTRASSONOGRAFIA OBSTÉTRICA" sem sufixo.
 */
export const OBSTETRICA_MODELO_INICIAL = `ULTRASSONOGRAFIA OBSTÉTRICA

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Saco gestacional de forma normal, com diâmetro médio de ____ mm.
Embrião único, de situação ____, com polo cefálico à ____.
Batimentos cardíacos ritmados (BCF = ____ bpm).
Comprimento crânio-nádegas (CCN) de ____ mm.
Vesícula vitelina de forma e dimensões normais.
Líquido amniótico de quantidade normal pela análise subjetiva.
Ovários de aspecto normal.

CONCLUSÃO:
Gestação em torno de ____ semanas e ____ dias.`;

export const OBSTETRICA_MODELO_OBJETIVO = `ULTRASSONOGRAFIA OBSTÉTRICA

TÉCNICA:
Exame realizado com transdutor de 4.0 MHz.

ACHADOS:
Idade gestacional: [semanas e dias informados — obrigatório se ditado].
Gestação: [única ou múltipla, apresentação e BCF].
Placenta: [localização e aspecto se informados].
Líquido amniótico: [descrição se informada].
Colo uterino: [medida se informada].

Feto 1:
1- [apresentação, BCF e demais dados informados].
2- [biometria ou achado adicional se houver].

Feto 2:
1- [usar somente em gestação múltipla].
2- [biometria ou achado adicional se houver].

IMPRESSÃO:
1- [conclusão principal, incluindo idade gestacional se informada].
2- [se houver outra conclusão obstétrica relevante].`;
