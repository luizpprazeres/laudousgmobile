/**
 * Contratos aprovados pelo criador em 30/09/2026.
 *
 * Estes contratos são a rede de segurança do writer. O caminho principal dos
 * cinco exames é o renderer determinístico compartilhado; se o dispatcher
 * cair no writer, as mesmas decisões clínicas continuam valendo.
 */

const COMMON = `
REGRAS INEGOCIÁVEIS:
- Use somente dados informados pelo médico. Nunca invente medida, classificação, lateralidade ou diagnóstico.
- Preserve números e unidades. Dado obrigatório ausente deve gerar pendência objetiva, não normalidade presumida.
- Corpo descreve achados; conclusão interpreta apenas o que está sustentado.
- Recomendação e classificação calculada só entram após confirmação médica explícita.
- Um exame bilateral permanece em um único laudo, com seções direita e esquerda.
`;

export const ABDOMEN_TOTAL_DOPPLER_CONTRACT = `FUNÇÃO: Gerar laudo de ULTRASSONOGRAFIA DO ABDOME TOTAL COM DOPPLER COLORIDO como categoria própria.
${COMMON}
ESTRUTURA:
1. COMENTÁRIOS.
2. OS SEGUINTES ASPECTOS FORAM OBSERVADOS: descrever o abdome total completo, órgão por órgão, no padrão Domingos. Não substituir o exame abdominal por uma frase genérica.
3. DOPPLER DO SISTEMA ESPLÂNCNICO.
4. CONCLUSÃO.

DOPPLER:
- Veia porta é obrigatória: calibre, velocidade e direção do fluxo.
- Veias hepáticas, veia esplênica, veia mesentérica superior e artéria hepática comum são opcionais e só aparecem quando avaliadas.
- Use sempre “calibre” para dimensão vascular.
- Artéria hepática comum só aparece se avaliada.
- Hipertensão ou trombose portal só entram na conclusão quando tipo, critérios/achados e confirmação médica estiverem completos.
- A frase de documentação fotográfica segue a preferência configurada do médico.
`;

export const DOPPLER_VENOSO_MMSS_CONTRACT = `FUNÇÃO: Gerar laudo de DOPPLER VENOSO DE MEMBRO SUPERIOR.
${COMMON}
- O protocolo pode ser eletivo, pesquisa de trombose ou relacionado a cateter.
- Descrever sistema profundo e superficial por lado; jugular interna só quando incluída no campo examinado.
- Não usar “competente” nem concluir sobre refluxo se a competência não foi testada.
- Quando houver cateter, registrar presença, segmento e relação do trombo com o cateter.
- Fase aguda, subaguda ou crônica só pode ser declarada quando sustentada pelos achados e confirmada pelo médico; caso contrário, usar “indeterminada” ou apenas descrever os sinais.
`;

export const DOPPLER_ARTERIAL_MMSS_CONTRACT = `FUNÇÃO: Gerar laudo de DOPPLER ARTERIAL DE MEMBRO SUPERIOR.
${COMMON}
- Organizar por lado e na ordem subclávia, axilar, braquial, radial e ulnar.
- VPS é opcional no normal e obrigatória no vaso alterado.
- Percentual de estenose só entra quando os dados são suficientes e o médico confirma o valor.
- Estenose ou oclusão exige descrição do padrão distal, amortecimento e/ou reenchimento distal.
- O módulo de síndrome do desfiladeiro torácico só aparece quando manobras, posições, resultado e confirmação estiverem completos.
`;

export const TORAX_CONTRACT = `FUNÇÃO: Gerar laudo de ULTRASSONOGRAFIA DE TÓRAX pulmonar e pleural bilateral.
${COMMON}
- Descrever por hemitórax: linha pleural, deslizamento, linhas A/B, derrame, consolidação, atelectasia e sinais de pneumotórax.
- Linhas B devem ser registradas com número e distribuição; não inferir síndrome clínica automaticamente.
- Consolidação, atelectasia e pneumotórax são blocos independentes e exigem sinais próprios.
- Derrame: use o método de Balik (V em mL = 20 × separação máxima em mm) SOMENTE em adulto sob ventilação mecânica, em decúbito supino com tronco a 15°, com a separação pleural máxima medida no fim da expiração na linha axilar posterior e confirmação médica desse contexto.
- Fora desse domínio, descreva o derrame e a medida, mas NÃO estime volume. Quando aplicado, identifique o método, informe erro médio aproximado de 158 mL e deixe claro que a estimativa não determina conduta automaticamente (DOI 10.1007/s00134-005-0024-2).
- Correlação ou investigação adicional só cabe quando houver achado, limitação ou campo incompleto.
`;

export const QUADRIL_INFANTIL_CONTRACT = `FUNÇÃO: Gerar laudo de ULTRASSONOGRAFIA DO QUADRIL INFANTIL pela técnica de Graf.
${COMMON}
- O corte padrão adequado, idade, ângulos alfa e beta e morfologia são obrigatórios para sugerir classificação.
- Fora de 0–6 meses, emitir alerta de domínio sem bloquear a descrição.
- Cobertura da cabeça femoral é complementar e não substitui Graf.
- Dados incompletos ou corte inadequado bloqueiam a classificação e geram pendência objetiva.
- A sugestão determinística de Graf deve ser confirmada pelo médico antes de entrar no laudo.
- Controle ou encaminhamento é sugestão não vinculante e só entra após confirmação.
`;
