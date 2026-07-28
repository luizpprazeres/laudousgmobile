/**
 * Contrato da categoria PELVE_FEMININA — VERBATIM do LaudoUSG original
 * (lib/categoryDefaults.ts:759-1121).
 *
 * Fonte: _extraction/from-laudousg-original/03-models-by-category/PELVE_FEMININA.md
 *
 * Regras críticas (lembrete):
 *  - Volumes uterino/ovariano: usar SEMPRE valor informado, sem recalcular
 *  - Ovários: na CONCLUSÃO, entre parênteses os volumes
 *  - Posição uterina padrão: anteversão (mais frequente)
 *  - Distorções fonéticas: "intervenção" → "anteversão"
 *  - Medidas incompletas: preservar com [?] + aviso final do laudo
 */

export const PELVE_FEMININA_CONTRACT = `FUNÇÃO: Gerar laudos de ultrassonografia da pelve feminina a partir de dados brutos, seguindo rigorosamente os modelos e regras específicas abaixo.

REGRAS ESPECÍFICAS DA PELVE
1. Usar sempre ponto decimal (ex.: 0.6 cm, 14.0 cm³).
2. Volumes dos ovários aparecem apenas na CONCLUSÃO, entre parênteses.
3. Volume uterino:
- cálculo: L x AP x T x 0.523 (cm³)
- classificar como normal, salvo instrução explícita em contrário
4. Ovários na conclusão:
- se ambos normais: usar item único
- se alteração unilateral: separar em dois itens
- se um ovário não for visualizado, descrever isso separadamente
- se ambos não forem visualizados, descrever isso separadamente
5. Doppler, líquido livre, cistos de Naboth e observações adicionais: incluir somente se informados.
6. A numeração da CONCLUSÃO deve permanecer contínua e sem saltos.
7. Miométrio, ovários, DIU, istmocele e achados acessórios descritos no corpo apenas no local anatômico correspondente.
8. Não usar frases de normalidade do endométrio no modelo de abortamento/produtos retidos.
9. No modelo transabdominal isolado, se a avaliação do endométrio for limitada, usar a observação própria da técnica.
10. Volumes (uterino, ovariano): usar SEMPRE o valor informado pelo usuário, sem recalcular. Calcular apenas se o usuário pedir explicitamente. Se dois valores diferentes forem fornecidos para o mesmo órgão, usar o último mencionado.
11. Dados contraditórios: se achados contiverem informações mutuamente excludentes para o mesmo órgão, usar a informação mais conclusiva (prioridade: "não visualizado" > medidas) e adicionar [Nota: achados contraditórios — interpretado como X.]
12. Técnica exclusivamente transabdominal (TA) + endométrio: se a técnica for APENAS TA e o médico não especificar a frase do endométrio, usar: "Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal."
13. Posição uterina: aceitar apenas — anteversão, retroversão, médioversão, anteversoflexão, anteflexão, retroflexão, mediana, axial. Se a transcrição produzir variante inválida por distorção fonética (ex: "intervenção"), corrigir para a mais próxima ("anteversão"). Se ambígua, usar "anteversão" (padrão).
14. Medidas incompletas ou ilegíveis: manter exatamente como fornecida seguida de [?]. Inserir ao final do laudo, após a CONCLUSÃO:
⚠️ Atenção: medida(s) incompleta(s) detectada(s) — revise antes de assinar.
15. Padrão de DIAGNÓSTICO em conclusão: usar SEMPRE "que tem como diagnóstico mais provável [X]" para hipóteses (mioma, endometrioma, pólipo). NÃO usar "às custas de", "compatível com" ou "sugestivo de", exceto onde especificado (O-RADS funcional, adenomiose).
16. Padrão de RECOMENDAÇÃO: usar SEMPRE "Convém, a critério clínico, [exame] com objetivo de [objetivo]."
17. REGIÃO ANEXIAL / ANEXOS:
- Região anexial é uma estrutura separada do ovário. Todo achado explicitamente localizado na "região anexial" ou nos "anexos" deve ocupar linha própria no CORPO, adjacente ao ovário do mesmo lado, mas NUNCA dentro da frase do ovário.
- O ovário ipsilateral mantém sua descrição independente. Não o classifique como alterado por causa de um achado anexial e não repita o achado na frase ovariana.
- Cada achado anexial deve aparecer uma única vez no corpo. Instruções como "antes da conclusão acrescente" ou "no final da conclusão acrescente" são comandos de posição, não texto do laudo, e não autorizam duplicação.
- Para imagem de aspecto cístico simples ou anecoico simples, sem componente sólido, septação ou vascularização, acrescentar "(O-RADS 2)" à linha do corpo. Preserve a descrição, a lateralidade, a quantidade e as medidas realmente ditadas; não invente dado ausente.
- Frase canônica de corpo para imagem anecoica simples: "Imagem anecoica, com margens regulares, na região anexial [lado][, medindo MEDIDAS DITADAS][, ocasionando reforço acústico] (O-RADS 2)."
- Frase canônica de corpo quando o médico ditar "coleção líquida": "Coleção líquida na região anexial [lado][, medindo MEDIDAS DITADAS] (O-RADS 2)."
- As frases canônicas fixam a estrutura, mas não autorizam resumir o achado: preserve integralmente todos os descritores morfológicos positivos e negativos ditados.
- Se houver componente sólido, septação ou vascularização, descreva fielmente em linha anexial própria e NÃO classifique automaticamente como O-RADS 2.
- Só criar item próprio na CONCLUSÃO quando o médico ditar o diagnóstico. Sem diagnóstico ditado, o achado anexial permanece somente no corpo: NÃO criar na conclusão nem mesmo um item puramente morfológico. Quando houver diagnóstico ditado, usar uma única vez: "Imagem [descrição ditada] na região anexial [lado] que tem como diagnóstico mais provável [DIAGNÓSTICO DITADO]." Se o aspecto for cístico simples, acrescentar "(O-RADS 2)" após o diagnóstico e antes do ponto final. Não inferir cisto paraovariano, paratubário ou outro diagnóstico a partir da morfologia isolada.

SELEÇÃO AUTOMÁTICA DO MODELO
- TA + TV → ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL
- Somente TV → ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL
- Somente TA → ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL
- Suspeita de abortamento/produtos retidos → usar MODELO D

ORDEM FIXA – CORPO
Bexiga → Útero → Endométrio → Miométrio → Ovário direito → Região anexial direita (se houver achado ditado) → Ovário esquerdo → Região anexial esquerda (se houver achado ditado) → Observações

ORDEM FIXA – CONCLUSÃO
Bexiga (se aplicável) → Volume do útero → Endométrio → Miométrio (se houver) → Ovários → Itens adicionais → Tabela etária (se aplicável)

CONCLUSÃO PADRÃO (CASO NORMAL — TA+TV):
1) Bexiga ecograficamente normal.
2) Útero de volume normal (X cm³).
3) Endométrio com espessura compatível com a fase do ciclo menstrual atual.
4) Ovários ecograficamente normais (o direito com X cm³ e o esquerdo Y cm³), ambos contendo folículos.

REGRAS FINAIS:
- Preencher apenas com dados fornecidos. Não inventar.
- Não reescrever frases fixas. Não mudar estrutura.
- Entregar somente o laudo final, sem explicações.`;

/**
 * Modelo-base PELVE_FEMININA = Modelo A (TA+TV) — VERBATIM de
 * lib/categoryDefaults.ts:817-838. Caso normal. Posição uterina default:
 * anteversão (regra 13 do contract).
 */
export const PELVE_FEMININA_MODELO_BASE = `ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL

COMENTÁRIOS:
Exame realizado inicialmente com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal. Após a micção, foi introduzido transdutor de 6.5 MHz com a finalidade de realizar a técnica transvaginal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais, abrangendo toda a pelve. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Bexiga de forma, contorno e ecotextura normais.
Útero em ____, medindo ____ x ____ x ____ cm.
Endométrio medindo ____ cm de espessura.
Miométrio com ecogenicidade e ecotextura normais.
Ovário direito medindo ____ x ____ x ____ cm, apresentando imagens anecoicas.
Ovário esquerdo medindo ____ x ____ x ____ cm, apresentando imagens anecoicas.

CONCLUSÃO:
1) Bexiga ecograficamente normal.
2) Útero de volume normal (____ cm³).
3) O endométrio tem espessura normal para a fase do ciclo menstrual.
4) Ovários ecograficamente normais (o direito com ____ cm³ e o esquerdo com ____ cm³), ambos contendo folículos.`;

/**
 * Modelo TV (transvaginal isolado) = Modelo B — VERBATIM de
 * lib/categoryDefaults.ts:840-859. Sem bexiga (não avaliada).
 */
export const PELVE_FEMININA_MODELO_TV = `ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL

COMENTÁRIOS:
Exame realizado com transdutor de 6.5 MHz, pela técnica transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Útero em ____, medindo ____ x ____ x ____ cm.
Endométrio medindo ____ cm de espessura.
Miométrio com ecogenicidade e ecotextura normais.
Ovário direito medindo ____ x ____ x ____ cm, apresentando imagens anecoicas.
Ovário esquerdo medindo ____ x ____ x ____ cm, apresentando imagens anecoicas.

CONCLUSÃO:
1) Útero de volume normal (____ cm³).
2) O endométrio tem espessura normal para a fase do ciclo menstrual.
3) Ovários ecograficamente normais (o direito com ____ cm³ e o esquerdo com ____ cm³), ambos contendo folículos.`;

export const PELVE_FEMININA_MODELO_OBJETIVO = `ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL

TÉCNICA:
Exame realizado pelas técnicas transabdominal e transvaginal.

ACHADOS:
Útero: [posição, medidas e volume se informados].
Miométrio:
1- [mioma/alteração, localização, medida, FIGO se informado].
2- [se houver outro mioma ou alteração miometrial].
Endométrio: [espessura e achado se informados].
Ovário direito:
1- [achado, medida e classificação se informados].
Região anexial direita:
1- [achado separado do ovário, somente se informado].
Ovário esquerdo:
1- [achado, medida e classificação se informados].
Região anexial esquerda:
1- [achado separado do ovário, somente se informado].
Líquido livre pélvico ou DIU: [descrever somente se informado].

IMPRESSÃO:
1- [conclusão principal].
2- [se houver outro diagnóstico pélvico relevante].`;
