/**
 * Contrato da categoria ABDOMEN_TOTAL — VERBATIM do LaudoUSG original
 * (lib/categoryDefaults.ts:403-592, DEFAULT_CATEGORY_PROMPTS.ABDOMEN_TOTAL).
 *
 * Este texto é injetado como o PRIMEIRO bloco do system message, antes do
 * GLOBAL_RULES_BLOCK. Define função, objetivo, regras gerais, modelo-base,
 * modelo alternativo (Doppler) e os 17 ajustes validados.
 *
 * Os 17 ajustes também são exportados como blocos RAG (kind=frase ou excecao)
 * em packages/db/src/seeds/abdomenTotal.ts — o writer recebe ambos: o contrato
 * inteiro como guia + os ajustes específicos retornados pelo retriever
 * com base nos achados atuais.
 *
 * Fonte: _extraction/from-laudousg-original/03-models-by-category/ABDOMEN_TOTAL.md
 */

export const ABDOMEN_TOTAL_CONTRACT = `FUNÇÃO:
Gerar laudos de ULTRASSONOGRAFIA DO ABDOME TOTAL com redação elegante, neutra, objetiva e tecnicamente coerente, seguindo RIGOROSAMENTE o modelo-base abaixo e realizando apenas os ajustes informados pelo usuário para cada caso.

OBJETIVO:
Montar o laudo final já pronto, em português médico, sem comentários extras, sem explicações, sem inventar dados e sem alterar a estrutura fixa do modelo, exceto quando o usuário mandar modificar algum trecho específico.

REGRAS GERAIS:
1. NÃO reescreva o modelo inteiro de forma livre. Use o modelo-base fixo e substitua apenas:
   - frases específicas ditadas pelo usuário
   - medidas
   - localização dos achados
   - conclusão correspondente aos achados

2. NÃO invente informações ausentes.
3. Quando o usuário ditar alterações "misturadas", reorganize tudo com lógica médica e textual, mantendo coerência interna.
4. O texto deve sair já finalizado, sem notas explicativas, sem cabeçalhos adicionais, sem observações ao usuário.
5. Quando houver mais de um achado, organizar a conclusão em itens numerados, com linguagem objetiva.
6. Preferir os termos:
   - imagem anecoica homogênea
   - imagem hiperecoica
   - imagem hipoecoica
   - margem regular / contornos mal delimitados
   - situada no segmento IV, VII etc. (usar algarismo romano para segmentos hepáticos)
   - medindo X x Y x Z cm
   - ocasionando sombra acústica
   - móveis
   - aderidas às suas paredes
   - sem evidência de cálculos
   - sem septações

7. Se o usuário pedir "abdome total com Doppler", adaptar o modelo para incluir:
   - estudo Doppler no COMENTÁRIOS
   - descrição do fluxo no corpo do texto ou
   - tabela final intitulada "DOPPLER DO SISTEMA ESPLÂNCNICO", se ele solicitar tabela

8. Se houver conflito entre um termo padronizado do modelo e um achado patológico informado pelo usuário, priorizar o dado patológico ditado.

9. NÃO usar linguagem alarmista. A hipótese diagnóstica entra preferencialmente na CONCLUSÃO.

10. Se o usuário mandar "use o modelo anterior" ou "ajuste a partir do modelo abaixo", respeite o modelo mais recente fornecido por ele.

11. Caso alguma estrutura não foi possível avaliar corretamente devido a gases intestinais, substituir apenas a frase em questão, por exemplo se o baço não pode ser visualizado corretamente "Baço visualizado parcialmente devido à interposição de gases intestinais.".

REGRAS DE ESTILO:
- Não usar bullets fora da estrutura do laudo.
- Não usar comentários metalinguísticos.
- Não dizer "segue o laudo".
- Não explicar raciocínio.
- Não corrigir o usuário em voz alta.
- Apenas entregar o laudo pronto.

CHECKLIST INTERNO ANTES DE RESPONDER:
1. O modelo usado foi o correto?
2. Todos os achados ditados foram incorporados?
3. As frases normais conflitantes foram substituídas?
4. A conclusão está coerente com o corpo do laudo?
5. Não foi chamado de "cisto simples" algo com margem irregular/calcificação?
6. Segmentos hepáticos estão em algarismo romano?
7. O Doppler foi incluído da forma pedida?
8. O texto final saiu limpo e pronto para uso?

SAÍDA ESPERADA:
Entregar apenas o laudo final, completo, já formatado, sem explicações adicionais.`;

/**
 * Reforço de pólipos da vesícula opt-in (de-risk do 95760f4, que embutia isto
 * ALWAYS-ON no contrato). Injetado em ABDOMEN_TOTAL SOMENTE quando o ditado
 * menciona pólipo; abdome sem pólipo fica byte-idêntico ao controle.
 */
export const ABDOMEN_POLIPO_BLOCK = `FRASE CANÔNICA — PÓLIPOS DA VESÍCULA BILIAR:
Quando o usuário ditar imagens hiperecoicas imóveis à mudança de decúbito, sem sombra acústica/fenômenos acústicos, ou pedir explicitamente "pólipos da vesícula biliar (benigno)", NÃO transformar o achado em cálculo ou litíase.
No corpo, preserve a quantidade e as medidas reais ditadas, descrevendo as imagens como hiperecoicas, imóveis à mudança de decúbito e sem ocasionar fenômenos acústicos. Não invente quantidade nem medida ausente.
Usar exatamente na conclusão:
"Pólipos de colesterol na vesícula biliar (benigno)."
Nunca imprimir o comando "pode colocar pólipos" no laudo. O comando deve ser consumido e substituído pelas frases canônicas acima.`;

/**
 * Modelo-base padrão de ABDOMEN_TOTAL — bloco RAG kind=modelo, priority alta.
 */
export const ABDOMEN_TOTAL_MODELO_BASE = `ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor de 4.0 MHz, inicialmente do abdome superior com paciente em jejum e posteriormente com a bexiga repleta do abdome inferior. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal como também em ortostase. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fígado de dimensões normais, contornos regulares e ecotextura homogênea.
Os vasos intra-hepáticos são bem visíveis e de calibre anatômico.
Veia porta de calibre normal.
Vesícula biliar de topografia usual e de parede fina, sem cálculo.
Canal hepático e canal colédoco de calibre normal.
Baço de dimensões normais e ecotextura sólida e homogênea.
Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam dimensões normais.
Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.
Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.
Veia cava inferior de calibre e contornos normais.
Aorta abdominal de calibre e contornos normais.
Bexiga de forma, contorno e ecotextura normais.

CONCLUSÃO:
1. Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas.`;

/**
 * Modelo alternativo (com Doppler esplâncnico).
 */
export const ABDOMEN_TOTAL_MODELO_DOPPLER = `COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial, abrangendo todo o abdome superior com paciente em jejum. Foram realizados múltiplos cortes, abrangendo todo o abdome, em decúbito dorsal, em decúbitos laterais, como também em ortostase. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
Fígado de margem regular, dimensões e ecotextura normais. Os vasos intra-hepáticos são bem visíveis e de calibre anatômico. Ausência de sinais evidentes de processo expansivo hepático.
Veia porta de calibre normal e com fluxo hepatopetal. Veias hepáticas de calibre e fluxo normais.
Vesícula biliar de topografia usual e de parede fina, sem sinais evidentes de cálculo.
Canal hepático e canal colédoco de calibre normal.
Pâncreas de ecotextura habitual para a faixa etária. A cabeça, o corpo e a cauda apresentam espessuras normais.
Baço de dimensões normais e ecotextura sólida homogênea.
Rim direito com diâmetros longitudinais e ântero-posterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.
Rim esquerdo com diâmetros longitudinais e ântero-posterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico medular normais.
Veia cava inferior e aorta abdominal de calibres e contornos normais.
Alças intestinais de aspecto ecográfico e peristaltismo habituais.
Bexiga de contornos regulares, parede fina e ecotextura anecoica homogênea.
Ausência de linfonodomegalias detectáveis ao método.

DOPPLER DO SISTEMA ESPLÂNCNICO
| VASO | ESPESSURA (cm) | VELOCIDADE (cm/s) | SENTIDO DO FLUXO |
|---|---:|---:|---|
| Tronco da veia porta |  |  | Hepatopetal |
| Veia porta direita |  |  | Hepatopetal |
| Veia porta esquerda |  |  | Hepatopetal |
| Veia esplênica |  |  | Hepatopetal |
| Veia mesentérica superior |  |  | Hepatopetal |
| Artéria hepática comum (VPS) |  |  |  |`;

/**
 * Os 17 AJUSTES VALIDADOS — cada um vira um bloco RAG.
 * Estrutura: { id_seq, title, kind, priority, content, tags, trigger_keywords }
 *
 * trigger_keywords vai como `tags` no knowledge_blocks. Útil pra filtros
 * adicionais antes da busca semântica.
 */
export const ABDOMEN_TOTAL_AJUSTES = [
  {
    seq: 1,
    title: "Esteatose hepática leve",
    kind: "frase" as const,
    priority: 80,
    content:
      'No corpo: "Fígado de dimensões normais, com discreto aumento da ecogenicidade parenquimatosa."\n' +
      'Na conclusão: "Esteatose hepática, grau leve."',
    tags: ["esteatose", "leve", "figado", "ecogenicidade"],
  },
  {
    seq: 2,
    title: "Esteatose hepática moderada",
    kind: "frase" as const,
    priority: 80,
    content:
      'No corpo: "Fígado de dimensões normais, apresentando aumento difuso da ecogenicidade parenquimatosa e atenuação sonora. Os vasos intra-hepáticos e o diafragma foram visualizados parcialmente."\n' +
      'Na conclusão: "Esteatose hepática, grau moderado."',
    tags: ["esteatose", "moderada", "figado", "atenuacao"],
  },
  {
    seq: 3,
    title: "Doença hepática crônica",
    kind: "frase" as const,
    priority: 80,
    content:
      'No corpo: "Fígado de dimensões normais, apresentando modificação da ecogenicidade e ecotextura parenquimatosa."\n' +
      'Na conclusão: "Sinais de doença hepática crônica."',
    tags: ["doenca-hepatica-cronica", "figado"],
  },
  {
    seq: 4,
    title: "Área poupada da esteatose",
    kind: "frase" as const,
    priority: 75,
    content:
      'No corpo: "Imagem hipoecoica, de contornos mal delimitados, medindo aproximadamente X x Y x Z cm, situada no segmento IV/V/VI/VII etc."\n' +
      'Na conclusão: "Imagem hipoecoica no segmento IV/V/VI/VII do fígado, cujo diagnóstico mais provável é área poupada da esteatose."',
    tags: ["area-poupada", "esteatose", "figado", "hipoecoica"],
  },
  {
    seq: 5,
    title: "Cisto hepático simples",
    kind: "frase" as const,
    priority: 75,
    content:
      'No corpo: "Imagem anecoica homogênea, com margem regular, medindo X x Y x Z cm, sem calcificações, situada no segmento VII."\n' +
      'Na conclusão: "Cisto hepático sem septações no segmento VII."',
    tags: ["cisto", "hepatico", "anecoica"],
  },
  {
    seq: 6,
    title: "Litíase da vesícula biliar",
    kind: "frase" as const,
    priority: 90,
    content:
      'Quando houver um cálculo: "Vesícula biliar de topografia usual e parede fina, apresentando imagem hiperecoica, móvel, medindo 1.2 centímetros no seu maior eixo, ocasionando sombra acústica."\n' +
      'Quando houver múltiplos cálculos: "Vesícula biliar de topografia usual e parede fina, apresentando múltiplas imagens hiperecoicas, a menor medindo aproximadamente 1.1 centímetros, móveis, ocasionando sombras acústicas."\n' +
      'Na conclusão: "Litíase da vesícula biliar."',
    tags: ["litiase", "vesicula", "calculo", "hiperecoica"],
  },
  {
    seq: 7,
    title: "Colédoco alargado",
    kind: "frase" as const,
    priority: 70,
    content:
      'No corpo: "Canal hepático de calibre normal e canal colédoco medindo 0.8 centímetros."\n' +
      'Na conclusão: "Canal colédoco acima dos limites usuais em sua porção intrapática, sem evidência de cálculos."',
    tags: ["coledoco", "alargado", "via-biliar"],
  },
  {
    seq: 8,
    title: "Ateromatose / placas de ateroma na aorta",
    kind: "frase" as const,
    priority: 70,
    content:
      'No corpo: "Aorta abdominal de calibre normal, apresentando imagens hiperecoicas aderidas às suas paredes."\n' +
      'Na conclusão: "Placas de ateromas na aorta abdominal."',
    tags: ["aorta", "ateroma", "placa"],
  },
  {
    seq: 9,
    title: "Cisto simples renal",
    kind: "frase" as const,
    priority: 80,
    content:
      'No corpo: "Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando imagem anecoica homogênea, com margem regular, medindo X x Y x Z cm, situada no polo superior / terço médio."\n' +
      'Na conclusão: "Cisto simples no rim esquerdo."',
    tags: ["cisto", "renal", "anecoica", "rim"],
  },
  {
    seq: 10,
    title: "Achado cístico renal complexo (NÃO chamar de cisto simples)",
    kind: "excecao" as const,
    priority: 95,
    content:
      "Se houver margem irregular, calcificação periférica, septações ou componente sólido, NÃO escrever \"cisto simples\".\n" +
      'Use na conclusão: "Imagem cística no rim esquerdo com calcificação periférica puntiforme."',
    tags: ["cisto", "renal", "complexo", "excecao", "calcificacao"],
  },
  {
    seq: 11,
    title: "Litíase renal",
    kind: "frase" as const,
    priority: 85,
    content:
      'No corpo: "Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando imagem hiperecoica, medindo 0.6 cm no seu maior eixo, situada em cálices superiores."\n' +
      'Na conclusão: "Litíase renal direita."',
    tags: ["litiase", "renal", "rim", "calculo"],
  },
  {
    seq: 12,
    title: "Derrame pleural",
    kind: "frase" as const,
    priority: 70,
    content:
      'No corpo: "Moderada quantidade de líquido no espaço pleural, bilateralmente."\n' +
      'Na conclusão: "Derrame pleural moderado bilateralmente."',
    tags: ["derrame-pleural", "liquido"],
  },
  {
    seq: 13,
    title: "Volume pré-miccional",
    kind: "frase" as const,
    priority: 60,
    content:
      'Quando informado: "Bexiga de forma, contorno e ecotextura normais. Volume pré-miccional de X mL/cm³."',
    tags: ["bexiga", "volume", "premiccional"],
  },
  {
    seq: 14,
    title: "Doppler esplâncnico",
    kind: "regra" as const,
    priority: 65,
    content:
      "Quando o usuário informar velocidades/fluxo, preencher exatamente com os dados ditados.",
    tags: ["doppler", "esplancnico", "fluxo"],
  },
  {
    seq: 15,
    title: "Baço e pâncreas — escolher uma opção, nunca duas",
    kind: "regra" as const,
    priority: 75,
    content:
      "Quando o modelo trouxer opções com traço: escolher apenas a opção correta, nunca deixar as duas opções simultaneamente no laudo final.",
    tags: ["baco", "pancreas", "opcao"],
  },
  {
    seq: 16,
    title: "Colecistectomia",
    kind: "frase" as const,
    priority: 75,
    content:
      'No corpo: "Ausência da imagem da vesícula biliar (paciente submetida a colecistectomia)."\n' +
      "Na conclusão: não mencionar.",
    tags: ["colecistectomia", "vesicula", "ausente"],
  },
  {
    seq: 17,
    title: "Conclusão final — fechamento padrão",
    kind: "conclusao" as const,
    priority: 70,
    content:
      "A conclusão deve refletir SOMENTE os achados informados.\n" +
      'Se houver achados específicos, terminar com: "Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas."',
    tags: ["conclusao", "fechamento"],
  },
];

export const ABDOMEN_TOTAL_MODELO_OBJETIVO = `ULTRASSONOGRAFIA DO ABDOME TOTAL

TÉCNICA:
Exame realizado com transdutor convexo multifrequencial.

ACHADOS:
Fígado: [achado direto, medida/localização se informadas].
Vesícula biliar e vias biliares: [achado direto, medida se informada].
Pâncreas e baço: [descrever somente se informados].
Rins:
1- Rim direito: [achado direto, medida se informada].
2- Rim esquerdo: [achado direto, medida se informada].
Bexiga, aorta e demais estruturas: [descrever somente se informadas].

IMPRESSÃO:
1- [diagnóstico principal].
2- [se houver outro diagnóstico relevante].`;
