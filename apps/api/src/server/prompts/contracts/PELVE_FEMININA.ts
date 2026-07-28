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

SELEÇÃO AUTOMÁTICA DO MODELO
- TA + TV → ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL
- Somente TV → ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL
- Somente TA → ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL
- Suspeita de abortamento/produtos retidos → usar MODELO D

ORDEM FIXA – CORPO
Bexiga → Útero → Endométrio → Miométrio → Ovário direito → Ovário esquerdo → Observações

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
 * Reforço anexial opt-in. Só entra no system message de PELVE_FEMININA quando
 * o ditado contém gatilho anexial explícito; pelve sem gatilho mantém o prompt
 * base byte-idêntico ao controle.
 */
export const PELVE_ANEXIAL_BLOCK = `REGIÃO ANEXIAL / ANEXOS:
- Achado explicitamente localizado na região anexial/anexo ocupa uma única linha própria no corpo, adjacente ao ovário do mesmo lado, nunca dentro da frase ovariana; o ovário mantém sua descrição independente.
- Aspecto cístico/anecoico simples DEVE receber "(O-RADS 2)"; NUNCA aplique O-RADS 2 automático se houver componente sólido, septação ou vascularização. Preserve os dados ditados.
- CONCLUSÃO: só inclua o achado anexial se o diagnóstico tiver sido explicitamente ditado; sem diagnóstico ditado, é PROIBIDO criar item de conclusão, mesmo que apenas morfológico.`;

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
Ovário esquerdo:
1- [achado, medida e classificação se informados].
Líquido livre pélvico ou DIU: [descrever somente se informado].

IMPRESSÃO:
1- [conclusão principal].
2- [se houver outro diagnóstico pélvico relevante].`;
