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

export function getStyleOverlay(code: WritingStyleCode): string | null {
  switch (code) {
    case "CLASSICO_COMPLETO":
      return null; // sem overlay — é o default
    case "DIRETO_OBJETIVO":
      return DIRETO_OBJETIVO_OVERLAY;
    case "DETALHADO_PROTOCOLAR":
      return DETALHADO_PROTOCOLAR_OVERLAY;
  }
}
