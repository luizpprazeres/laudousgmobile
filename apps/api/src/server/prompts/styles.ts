import type { WritingStyleCode } from "@laudousg/shared";

/**
 * Estilos de escrita — overlays leves.
 *
 * No LaudoUSG original (lib/promptBuilder.ts:writingStyleOverlay):
 *  - 'classic' (DEFAULT): sem overlay (já é o estilo do prompt nativo)
 *  - 'direct': overlay que pede frases curtas, sem redundância
 *  - 'academic': bypass para 'classic' (declarado mas não implementado)
 *
 * Mapeamento Mobile → original:
 *  - CLASSICO_COMPLETO    → classic (sem overlay)
 *  - DIRETO_OBJETIVO      → direct (overlay)
 *  - DETALHADO_PROTOCOLAR → NOVO no Mobile (overlay próprio)
 */

const DIRETO_OBJETIVO_OVERLAY = `ESTILO ATIVO: DIRETO OBJETIVO

Adapte o laudo para esse estilo, mantendo a TÉCNICA e os ACHADOS intactos:
- Frases curtas, uma ideia por frase.
- Sem redundância. Não repita aspectos normais já implícitos no modelo.
- Foco em achados anormais; aspectos normais ficam compactados.
- Conclusão direta, sem floreio. Itens numerados se múltiplos.
- Mantenha a terminologia técnica padrão (não traduza para leigo).`;

const DETALHADO_PROTOCOLAR_OVERLAY = `ESTILO ATIVO: DETALHADO PROTOCOLAR

Adapte o laudo para esse estilo, mantendo a TÉCNICA e os ACHADOS intactos:
- Cobertura COMPLETA de todas as estruturas previstas no modelo, mesmo as normais.
- Termina cada estrutura com nota explícita do estado ("dentro dos limites normais", etc.).
- Inclui as seções fixas do modelo na ordem prescrita pelo protocolo.
- Vocabulário rigorosamente padronizado conforme template.
- Adequado para auditoria e ensino.`;

const OBJETIVO_OVERLAY = `ESTILO ATIVO: OBJETIVO — INSTRUÇÃO PRIORITÁRIA QUE SOBRESCREVE QUALQUER OUTRA REGRA DE FORMATO.

ESTRUTURA OBRIGATÓRIA — use EXATAMENTE estes 3 cabeçalhos em maiúsculas, nesta ordem, seguidos de dois-pontos:
1. TÉCNICA:
2. ANÁLISE:
3. OPINIÃO DO RELATÓRIO:

PROIBIDO usar cabeçalhos alternativos como "OS SEGUINTES ASPECTOS FORAM OBSERVADOS", "COMENTÁRIOS", "CONCLUSÃO", "ACHADOS", "DESCRIÇÃO", "IMPRESSÃO DIAGNÓSTICA". A presença desses cabeçalhos é falha de execução.

CONTEÚDO — NUNCA OMITIR (a omissão é falha grave, ainda que estilo seja conciso):
- TODAS as medidas numéricas mencionadas no input (mm, cm, ml, gramas, semanas, dias).
- Preserve o termo clínico ditado quando ele for específico, mesmo que exista sinônimo técnico.
- Lateralidade (direita, esquerda, bilateral, 10 horas, 2 horas).
- Achados quantitativos e escores: FIGO, BI-RADS, ITB, IP, IR, BCF, percentil, frequência cardíaca, idade gestacional.
- Termos clínicos específicos do input (esteatose, hipoecogenicidade, cisto, nódulo, onda A positiva, reacional, etc).
- Negações relevantes do input ("sem cálculos", "sem dilatação", "BCF presente").

TOM:
- Frases diretas, até 15 palavras.
- Sem floreios verbais ("nota-se", "observa-se", "constata-se", "evidente", "presença de").
- Sem redundância entre seções.
- Omitir estruturas não mencionadas no input. Não completar o laudo com normalidades presumidas.
- Nunca emitir placeholders "____". Não inventar dados ausentes para preencher modelos.
- OPINIÃO DO RELATÓRIO: sentença única quando todos achados normais; itens numerados quando múltiplos achados.

REGRAS DE ENUMERAÇÃO:
- Quando houver MÚLTIPLOS achados do mesmo tipo (nódulos, cistos, miomas, linfonodos), enumere cada um como 1-, 2-, 3-, com 1 achado por linha.
- Cada item enumerado deve começar em uma NOVA LINHA. É proibido escrever "1- ... 2- ..." na mesma linha.
- Cada item enumerado contém: natureza, localização, medida e escore quando aplicável (BI-RADS, TI-RADS, FIGO etc).
- NÃO use conjunções prosaicas entre itens ("apresentando", "classificado como", "que se caracteriza por", "evidenciando").
- Se houver achado ÚNICO, escreva em frase direta sem enumeração.
- OPINIÃO DO RELATÓRIO: lista numerada quando houver múltiplos diagnósticos.

EXEMPLO CANÔNICO (Abdome total — esteatose):
TÉCNICA: Exame realizado com transdutor convexo multifrequencial.
ANÁLISE: Fígado de dimensões normais. Hiperecogenicidade difusa do parênquima, compatível com esteatose hepática leve. Vesícula biliar sem cálculos. Rins sem dilatação pielocalicial.
OPINIÃO DO RELATÓRIO: Esteatose hepática leve.`;

export function getStyleOverlay(code: WritingStyleCode): string | null {
  switch (code) {
    case "CLASSICO_COMPLETO":
      return null; // sem overlay — é o default
    case "DIRETO_OBJETIVO":
      return DIRETO_OBJETIVO_OVERLAY;
    case "DETALHADO_PROTOCOLAR":
      return DETALHADO_PROTOCOLAR_OVERLAY;
    case "OBJETIVO":
      return OBJETIVO_OVERLAY;
  }
}
