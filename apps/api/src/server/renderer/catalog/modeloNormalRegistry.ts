/**
 * Quais categorias têm modelo normal, e como renderizar o laudo padrão de cada.
 *
 * Uma entrada por categoria viva. O `seed` existe porque o achado derivado do
 * schema é quase sempre suficiente, mas não sempre: `fetos: []` não passa no
 * `.min(1)`, e o musculoesquelético não escreve nada sem saber qual estrutura
 * foi examinada. São ajustes de 1 a 3 campos, não modelos escritos à mão.
 *
 * ⚠️ O renderer chamado aqui é o MESMO de produção, com as MESMAS flags. Se
 * divergir, o médico personaliza uma frase que nunca sai no laudo dele.
 */
import type { z } from "zod";
import { env } from "@/server/env";
import { achadoNormalDe } from "./modeloNormal";

import { AbdomenSuperiorFindingsSchema, renderAbdomenSuperior } from "../categories/ABDOMEN_SUPERIOR";
import { CervicalFindingsSchema, renderCervical } from "../categories/CERVICAL";
import { CervicometriaFindingsSchema, renderCervicometria } from "../categories/CERVICOMETRIA";
import { MamariaFindingsSchema, renderMamaria } from "../categories/MAMARIA";
import { MorfologicoFindingsSchema, renderMorfologico } from "../categories/MORFOLOGICO";
import { MusculoesqueleticoFindingsSchema, renderMusculoesqueletico } from "../categories/MUSCULOESQUELETICO";
import { PartesMolesFindingsSchema, renderPartesMoles } from "../categories/PARTES_MOLES";
import { PelveFemininaFindingsSchema, renderPelveFeminina } from "../categories/PELVE_FEMININA";
import { ProstataSuprapubicaFindingsSchema, renderProstataSuprapubica } from "../categories/PROSTATA_SUPRAPUBICA";
import { TireoideFindingsSchema, renderTireoide } from "../categories/TIREOIDE";
import { ViasUrinariasFindingsSchema, renderViasUrinarias } from "../categories/VIAS_URINARIAS";
import { ObstetricaFindingsSchema, renderObstetrica } from "../categories/OBSTETRICA";
import { DopplerObstetricoFindingsSchema, renderDopplerObstetrico } from "../categories/DOPPLER_OBSTETRICO";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type EntradaModeloNormal = {
  categoria: string;
  /** Nome para a interface — o médico não lê CONSTANT_CASE. */
  rotulo: string;
  schema: z.ZodTypeAny;
  /** Campos que o achado derivado não consegue inferir sozinho. */
  seed?: Record<string, unknown>;
  render: (findings: any, opts: { objetivo: boolean }) => string;
};

/** Um feto normal — o mínimo para o schema obstétrico passar no `.min(1)`. */
const FETO_NORMAL = {
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: null, dbp_mm: null, cc_mm: null, ca_mm: null,
  cf_mm: null, ccn_mm: null, peso_g: null, peso_variacao_g: null, percentil: null,
  bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null,
  cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
};

export const MODELOS_NORMAIS: EntradaModeloNormal[] = [
  {
    categoria: "OBSTETRICA", rotulo: "Obstétrica", schema: ObstetricaFindingsSchema,
    seed: { numero_fetos: 1, gestacao_inicial: false, fetos: [FETO_NORMAL] },
    render: (f, o) => renderObstetrica(f, null, { objetivo: o.objetivo }),
  },
  {
    categoria: "DOPPLER_OBSTETRICO", rotulo: "Obstétrica com Doppler",
    schema: DopplerObstetricoFindingsSchema,
    seed: { numero_fetos: 1, gestacao_inicial: false, fetos: [FETO_NORMAL] },
    render: (f, o) => renderDopplerObstetrico(f, null as any, { objetivo: o.objetivo }),
  },
  {
    categoria: "MORFOLOGICO", rotulo: "Morfológico", schema: MorfologicoFindingsSchema,
    render: (f, o) => renderMorfologico(f, null as any, { objetivo: o.objetivo }),
  },
  {
    categoria: "TIREOIDE", rotulo: "Tireoide", schema: TireoideFindingsSchema,
    render: (f, o) => renderTireoide(f, undefined as any, { objetivo: o.objetivo }),
  },
  {
    categoria: "MAMARIA", rotulo: "Mamária", schema: MamariaFindingsSchema,
    render: (f, o) => renderMamaria(f, undefined as any, { objetivo: o.objetivo }),
  },
  {
    categoria: "PELVE_FEMININA", rotulo: "Pelve feminina", schema: PelveFemininaFindingsSchema,
    render: (f, o) => renderPelveFeminina(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "ABDOMEN_SUPERIOR", rotulo: "Abdome superior", schema: AbdomenSuperiorFindingsSchema,
    render: (f, o) => renderAbdomenSuperior(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "VIAS_URINARIAS", rotulo: "Vias urinárias", schema: ViasUrinariasFindingsSchema,
    render: (f, o) => renderViasUrinarias(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "PROSTATA_SUPRAPUBICA", rotulo: "Próstata (suprapúbica)",
    schema: ProstataSuprapubicaFindingsSchema,
    // Só clássico: este renderer não tem variante objetiva.
    render: (f) => renderProstataSuprapubica(f),
  },
  {
    categoria: "CERVICAL", rotulo: "Cervical", schema: CervicalFindingsSchema,
    render: (f, o) => renderCervical(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "CERVICOMETRIA", rotulo: "Cervicometria", schema: CervicometriaFindingsSchema,
    render: (f) => renderCervicometria(f),
  },
  {
    categoria: "PARTES_MOLES", rotulo: "Partes moles", schema: PartesMolesFindingsSchema,
    render: (f, o) => renderPartesMoles(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "MUSCULOESQUELETICO", rotulo: "Musculoesquelético",
    schema: MusculoesqueleticoFindingsSchema,
    /**
     * Sem segmento examinado o MSK não escreve NADA — o laudo dele é sobre "o
     * ombro direito", não sobre um corpo genérico, e `laudos: []` rende texto
     * vazio. O seed dá um segmento para existir modelo; as frases de
     * normalidade do ombro são as mesmas de qualquer outro segmento.
     */
    seed: { laudos: [{ segmento: "ombro", lado: "direito", alteracoes: [] }] },
    render: (f) => renderMusculoesqueletico(f),
  },
];

export function modeloNormalDe(categoria: string): EntradaModeloNormal | undefined {
  return MODELOS_NORMAIS.find((m) => m.categoria === categoria);
}

export function categoriasComModeloNormal(): { categoria: string; rotulo: string }[] {
  return MODELOS_NORMAIS.map((m) => ({ categoria: m.categoria, rotulo: m.rotulo }));
}

/**
 * O laudo padrão da categoria, renderizado pelo renderer de produção.
 *
 * Devolve `null` — nunca lança — quando a categoria não renderiza: uma
 * categoria quebrada não pode derrubar a Biblioteca inteira.
 */
export function laudoPadraoDe(categoria: string, estilo: string): string | null {
  const m = modeloNormalDe(categoria);
  if (!m) return null;
  try {
    const bruto = { ...(achadoNormalDe(m.schema) as Record<string, unknown>), ...(m.seed ?? {}) };
    const parsed = (m.schema as any).safeParse(bruto);
    if (!parsed.success) return null;
    const texto = m.render(parsed.data, { objetivo: estilo === "OBJETIVO" });
    return texto.trim() === "" ? null : texto;
  } catch {
    return null;
  }
}

/** As flags de renderer que valem hoje — a prévia precisa ser o laudo real. */
export function estiloSuportado(estilo: string): boolean {
  void env;
  return estilo === "CLASSICO_COMPLETO" || estilo === "OBJETIVO";
}
