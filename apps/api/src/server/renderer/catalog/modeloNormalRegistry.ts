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
import { achadoNormalDe, mascararPorComparacao, mesclarFundo, variarSeed } from "./modeloNormal";

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
  /**
   * VARIANTES DE EXAME da categoria — cada uma com o seu seed.
   *
   * Uma categoria não tem um modelo só. O morfológico tem 1º e 2º trimestre e
   * saía apenas com o 1º; a obstétrica escrita já tinha três cenários. Sem
   * isto, metade do modelo de uma categoria fica invisível para o médico, e ele
   * não tem como conferir nem personalizar a outra metade.
   */
  cenarios?: { nome: string; seed: Record<string, unknown> }[];
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
    cenarios: [
      { nome: "Gestação padrão", seed: { numero_fetos: 1, gestacao_inicial: false, fetos: [FETO_NORMAL] } },
      { nome: "Gestação inicial", seed: { numero_fetos: 1, gestacao_inicial: true, fetos: [FETO_NORMAL] } },
      { nome: "Gemelar", seed: { numero_fetos: 2, gestacao_inicial: false, fetos: [FETO_NORMAL, FETO_NORMAL] } },
    ],
    render: (f, o) => renderObstetrica(f, null, { objetivo: o.objetivo }),
  },
  {
    categoria: "DOPPLER_OBSTETRICO", rotulo: "Obstétrica com Doppler",
    schema: DopplerObstetricoFindingsSchema,
    /**
     * Os índices entram no seed porque, sem eles, o renderer escreve
     * "DOPPLERVELOCIMETRIA:" e mais nada — o médico via a seção vazia, que foi
     * um dos defeitos que o Luiz apontou. Os valores em si não aparecem no
     * modelo: `mascararPorComparacao` os troca por lacuna.
     */
    seed: {
      numero_fetos: 1, gestacao_inicial: false, fetos: [FETO_NORMAL],
      ip_umbilical: 1.02, perc_umbilical: 50,
      ip_acm: 1.75, perc_acm: 50,
      ip_uterina_dir: 0.72, ip_uterina_esq: 0.68,
      ip_medio_uterinas: 0.7, perc_medio_uterinas: 50,
      ducto_venoso_ip: 0.45, rcp: 1.71,
    },
    render: (f, o) => renderDopplerObstetrico(f, null as any, { objetivo: o.objetivo }),
  },
  {
    categoria: "MORFOLOGICO", rotulo: "Morfológico", schema: MorfologicoFindingsSchema,
    /**
     * O morfológico tem TRÊS exames diferentes sob o mesmo nome, e o derivado
     * mostrava só o primeiro (o enum começa em "1t"). Metade do modelo ficava
     * invisível: o médico não conseguia conferir nem personalizar o de 2º
     * trimestre, que é o mais usado.
     */
    cenarios: [
      { nome: "Primeiro trimestre", seed: { trimestre: "1t" } },
      { nome: "Segundo trimestre", seed: { trimestre: "2t" } },
      { nome: "Terceiro trimestre", seed: { trimestre: "3t" } },
    ],
    render: (f, o) => renderMorfologico(f, null as any, { objetivo: o.objetivo }),
  },
  {
    categoria: "TIREOIDE", rotulo: "Tireoide", schema: TireoideFindingsSchema,
    /**
     * `omitPicoNull` vem da MESMA flag que a produção lê
     * (`pipeline/renderer.ts:721`). Sem ela aqui, o catálogo renderizava com a
     * política contrária à do laudo real — e o aviso no topo deste arquivo diz
     * exatamente que divergir faz o médico personalizar uma frase que nunca sai
     * no laudo dele.
     *
     * Efeito prático (decisão D5, 20/08): com a flag ligada, um Doppler com um
     * pico só não estampa "____ cm/s" no lado que ninguém mediu. Exigir os dois
     * criaria dado obrigatório que a web nunca exigiu.
     */
    render: (f, o) =>
      renderTireoide(f, undefined as any, {
        objetivo: o.objetivo,
        /**
         * Lido de `process.env` direto, e NÃO do `env()` validado — de
         * propósito.
         *
         * `env()` valida o ambiente inteiro e LANÇA quando falta qualquer
         * variável. Como `laudoPadraoDe` engole exceção para que uma categoria
         * quebrada não derrube a Biblioteca, usar `env()` aqui fazia a TIREOIDE
         * **sumir inteira** de qualquer ambiente sem env completo — em
         * silêncio, com o gate dando verde por não ter o que reprovar. Uma
         * flag de formatação não pode ter poder de apagar uma categoria.
         */
        omitPicoNull: process.env.TIREOIDE_PICO_OMIT === "true",
      }),
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
    /**
     * Sem a medida do colo a conclusão sai "não caracterizada pelo método
     * [REVISAR]" — o aviso de dado faltando, não o modelo. A medida entra no
     * seed e some do texto por comparação.
     */
    seed: { colo_oi_oe_cm: 3.4 },
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
export function laudoPadraoDe(
  categoria: string,
  estilo: string,
  seedExtra?: Record<string, unknown>,
): string | null {
  const m = modeloNormalDe(categoria);
  if (!m) return null;
  try {
    /**
     * MERGE FUNDO, não spread.
     *
     * O spread raso trocava o objeto inteiro: um `seedExtra` que quisesse mudar
     * só `lobo_direito.medidas_cm` apagava `ecotextura_alterada`, `volume_ml` e
     * `nodulos` do achado derivado, e o Zod recusava o laudo por campo
     * faltando. O efeito prático era obrigar todo cliente a reenviar o objeto
     * COMPLETO — e reenviar completo é exatamente como se apaga um achado sem
     * perceber.
     */
    const bruto = mesclarFundo(
      mesclarFundo(achadoNormalDe(m.schema) as Record<string, unknown>, m.seed ?? {}),
      seedExtra ?? {},
    );
    const parsed = (m.schema as any).safeParse(bruto);
    if (!parsed.success) return null;
    const texto = m.render(parsed.data, { objetivo: estilo === "OBJETIVO" });
    return texto.trim() === "" ? null : texto;
  } catch {
    return null;
  }
}

/**
 * Os cenários de uma categoria — as variantes de exame que ela tem.
 *
 * Sem `cenarios` declarados, é um só: o modelo padrão.
 */
export function cenariosDe(categoria: string): { nome: string; seed: Record<string, unknown> }[] {
  const m = modeloNormalDe(categoria);
  if (!m) return [];
  return m.cenarios ?? [{ nome: "Modelo padrão", seed: {} }];
}

/**
 * O laudo padrão de um cenário, com os DADOS já virados lacuna.
 *
 * Renderiza duas vezes — com o seed e com uma variação dele — e troca por
 * `____` o que mudou. É assim que a linha do Doppler aparece como
 * "Artéria umbilical: IP ____ (percentil ____)." em vez de cravar o valor que
 * eu escolhi para o seed. Ver `mascararPorComparacao`.
 */
export function laudoDoCenario(
  categoria: string,
  estilo: string,
  seed: Record<string, unknown>,
): string | null {
  const m = modeloNormalDe(categoria);
  const a = laudoPadraoDe(categoria, estilo, seed);
  if (!a) return null;
  /**
   * Varia o seed COMPLETO — o da categoria mais o do cenário.
   *
   * Variar só o do cenário não muda nada quando os valores que interessam
   * vivem no seed da categoria: foi o que aconteceu com o Doppler, cujos
   * índices de pulsatilidade estão lá. Os dois renders saíam idênticos e o
   * modelo cravava "IP 1,02", o número que EU escolhi para o seed.
   */
  /**
   * Mescla FUNDO também aqui. O render A já usa `mesclarFundo`; deixar o B com
   * spread raso é assimetria à espera de um seed aninhado — os dois renders
   * passariam a partir de bases diferentes e a máscara por comparação marcaria
   * como "dado variável" um campo que só mudou porque o B o perdeu.
   */
  const b = laudoPadraoDe(categoria, estilo, variarSeed(mesclarFundo(m?.seed ?? {}, seed)));
  /**
   * FAIL-CLOSED (achado do Codex, 19/08).
   *
   * Devolver o texto original quando a comparação não roda parecia inofensivo
   * — e é o contrário: o texto original traz os NÚMEROS DO SEED, valores que
   * eu inventei, apresentados ao médico como se fossem o modelo. Uma mudança
   * futura no renderer que quebrasse o segundo render faria isso voltar em
   * silêncio. Sem comparação, sem cenário.
   */
  if (!b) return null;
  const la = a.split("\n");
  const lb = b.split("\n");
  if (la.length !== lb.length) return null;
  return la.map((linha, i) => mascararPorComparacao(linha, lb[i] ?? linha)).join("\n");
}

/** As flags de renderer que valem hoje — a prévia precisa ser o laudo real. */
export function estiloSuportado(estilo: string): boolean {
  void env;
  return estilo === "CLASSICO_COMPLETO" || estilo === "OBJETIVO";
}
