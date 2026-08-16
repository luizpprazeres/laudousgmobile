/**
 * Registro dos catálogos de modelo — quem tem catálogo, e como renderizá-lo.
 *
 * Nasceu dentro de `/api/admin/model-catalog`, mas agora há mais de um
 * consumidor (a bancada do Lab e os endpoints de personalização do médico), e
 * duas cópias divergiriam. Aqui é a única lista.
 *
 * A chave é (categoria, estilo), porque o modelo é diferente em cada estilo —
 * não é o mesmo texto formatado de outro jeito. Hoje só existe o catálogo de
 * OBSTETRICA × CLASSICO_COMPLETO; o do OBJETIVO é o item 2b do plano.
 *
 * Enquanto um par não estiver aqui, a personalização responde 404 para ele —
 * que é o comportamento certo: sem catálogo não há slot a que ancorar uma
 * operação, e gravar uma personalização que nada aplica é pior que recusar.
 */

import { env } from "@/server/env";
import type { ObstetricaFindings } from "../categories/OBSTETRICA";
import { OBSTETRICA_CLASSICO } from "./OBSTETRICA.classico";
import { OBSTETRICA_SAMPLES } from "./OBSTETRICA.samples";
import { buildObstetricaDoc, renderObstetricaCatalogo } from "./OBSTETRICA.render";

/**
 * Os códigos são os do enum `writing_style_code` do banco. Dos quatro, só
 * `CLASSICO_COMPLETO` e `OBJETIVO` estão vivos — `DIRETO_OBJETIVO` e
 * `DETALHADO_PROTOCOLAR` caem no clássico em `generate/route.ts:284`.
 */
export const ESTILOS_VIVOS = ["CLASSICO_COMPLETO", "OBJETIVO"] as const;
export type EstiloVivo = (typeof ESTILOS_VIVOS)[number];

export function ehEstiloVivo(estilo: string): estilo is EstiloVivo {
  return (ESTILOS_VIVOS as readonly string[]).includes(estilo);
}

const OBSTETRICA_ENTRADA = {
  catalog: OBSTETRICA_CLASSICO,
  samples: OBSTETRICA_SAMPLES,
  render: (args: Parameters<typeof renderObstetricaCatalogo>[0]) => renderObstetricaCatalogo(args),
  buildDoc: (args: Parameters<typeof buildObstetricaDoc>[0]) => buildObstetricaDoc(args).doc,
  /**
   * Renderiza o `exemplo` de uma variante sobre o achado-base da categoria, e
   * devolve os segmentos — é o que dá texto às variantes montadas pelo motor na
   * Biblioteca e no Lab. Sem isto, uma patologia aparece na lista sem frase.
   */
  renderizarExemplo: (exemplo: Record<string, unknown>) => {
    const base = OBSTETRICA_SAMPLES[0]!.findings;
    const ex = exemplo as Partial<ObstetricaFindings> & { fetos?: Record<string, unknown>[] };
    /**
     * Mescla RASA no exame, PROFUNDA no feto.
     *
     * Achados por feto (BCF, crânio, cordão) vivem dentro de `fetos[]`. Com
     * mescla rasa o exemplo teria de repetir o feto inteiro — e sem sobrescrever
     * `bcf_bpm` a prévia de bradicardia e taquicardia saía com o mesmo valor do
     * feto-base (defeito #9 da revisão do Codex).
     */
    const findings = {
      ...base,
      ...ex,
      fetos: ex.fetos
        ? ex.fetos.map((f, i) => ({ ...(base.fetos[i] ?? base.fetos[0]!), ...f }))
        : base.fetos,
    } as ObstetricaFindings;
    return buildObstetricaDoc({ findings, flags: flagsDeProducao() }).doc.segments.map((s) => ({
      slotId: s.slotId,
      variantId: s.variantId,
      kind: s.kind,
      text: s.text,
    }));
  },
} as const;

export type EntradaCatalogo = typeof OBSTETRICA_ENTRADA;

/** Chave: `CATEGORIA/ESTILO` — a mesma forma do `catalog.id`. */
const CATALOGOS: Record<string, EntradaCatalogo> = {
  "OBSTETRICA/CLASSICO_COMPLETO": OBSTETRICA_ENTRADA,
};

export function chaveDe(categoria: string, estilo: string): string {
  return `${categoria}/${estilo}`;
}

export function resolveCatalogo(categoria: string, estilo: string): EntradaCatalogo | undefined {
  return CATALOGOS[chaveDe(categoria, estilo)];
}

/** Pares (categoria, estilo) com catálogo — para mensagens de erro úteis. */
export function paresComCatalogo(): { categoria: string; estilo: string }[] {
  return Object.values(CATALOGOS).map((e) => ({
    categoria: e.catalog.categoria,
    estilo: e.catalog.estilo,
  }));
}

export function categoriasComCatalogo(): string[] {
  return [...new Set(Object.values(CATALOGOS).map((e) => e.catalog.categoria))];
}

/** Os estilos com catálogo para uma dada categoria. */
export function estilosComCatalogo(categoria: string): string[] {
  return Object.values(CATALOGOS)
    .filter((e) => e.catalog.categoria === categoria)
    .map((e) => e.catalog.estilo);
}

/**
 * As flags de renderer que valem HOJE em produção afetam o texto. A prévia usa
 * as mesmas — senão o médico veria um laudo diferente do que o sistema gera.
 */
export function flagsDeProducao() {
  const e = env();
  return {
    igCorrection: e.IG_REFERENCE_CORRECTION === "true",
    flexivel: e.FLEXIBLE_CONCLUSION === "true",
    grannum: e.GRANNUM_PLACENTA === "true",
    objetivo: false,
  };
}
