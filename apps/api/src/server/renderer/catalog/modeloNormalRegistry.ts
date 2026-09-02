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
import {
  ABDOMEN_ORGAN_KEYS,
  AbdomenTotalFindingsSchema,
} from "../findingsSchemas/ABDOMEN_TOTAL";
import { renderAbdomenTotalClassico, renderAbdomenTotalObjetivo } from "../phrases/ABDOMEN_TOTAL";
import { DopplerObstetricoFindingsSchema, renderDopplerObstetrico } from "../categories/DOPPLER_OBSTETRICO";
import { DopplerCarotidasFindingsSchema, renderDopplerCarotidas } from "../categories/DOPPLER_CAROTIDAS";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** O que o renderer precisa e não está no código nem no que o médico digitou. */
export type ContextoDeRender = {
  /** Máscara do laudo, de `report_template_variants`. Só o abdome usa. */
  templateBody?: string | null;
};

export type EstiloModeloNormal = "CLASSICO_COMPLETO" | "OBJETIVO";

export type EntradaModeloNormal = {
  categoria: string;
  /** Nome para a interface — o médico não lê CONSTANT_CASE. */
  rotulo: string;
  /** Estilos que este renderer realmente implementa. Nunca inferir pelo fallback clássico. */
  estilos: readonly EstiloModeloNormal[];
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
  /**
   * `ctx` carrega o que NÃO vem do código nem do médico.
   *
   * Hoje só o ABDOMEN_TOTAL usa: a máscara do laudo dele mora em
   * `report_template_variants.template_body`, no banco, e o renderer preenche
   * slots (`{{orgao:figado|…}}`) em vez de montar o texto inteiro. As outras
   * doze têm a máscara no próprio código e ignoram o `ctx`.
   *
   * Fica OPCIONAL de propósito: uma categoria que precise de máscara e não a
   * receba deve devolver `null` (laudo nenhum), nunca um laudo pela metade.
   */
  render: (
    findings: any,
    opts: { objetivo: boolean },
    ctx?: ContextoDeRender,
  ) => string | null;
};

/** Um feto normal — o mínimo para o schema obstétrico passar no `.min(1)`. */
const FETO_NORMAL = {
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: null, dbp_mm: null, cc_mm: null, ca_mm: null,
  cf_mm: null, ccn_mm: null, peso_g: null, peso_variacao_g: null, percentil: null,
  bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null,
  cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
};

/** Os 11 órgãos, todos normais — o modelo do abdome sem achado nenhum. */
const ABDOMEN_ORGAOS_NORMAIS = Object.fromEntries(
  ABDOMEN_ORGAN_KEYS.map((k) => [k, { status: "normal", achados: [] }]),
);

export const MODELOS_NORMAIS: EntradaModeloNormal[] = [
  {
    categoria: "ABDOMEN_TOTAL", rotulo: "Abdome total",
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    schema: AbdomenTotalFindingsSchema,
    seed: {
      orgaos: ABDOMEN_ORGAOS_NORMAIS,
      achados_extra_abdominais: [],
      observacoes_do_medico: "",
    },
    cenarios: [
      {
        nome: "Modelo padrão",
        seed: {
          orgaos: ABDOMEN_ORGAOS_NORMAIS,
          achados_extra_abdominais: [],
          observacoes_do_medico: "",
        },
      },
    ],
    /**
     * A ÚNICA categoria que não monta o laudo sozinha.
     *
     * A máscara dela mora em `report_template_variants.template_body` e o
     * renderer preenche slots. Sem a máscara não há laudo — devolver `null` é
     * o certo: um abdome sem os slots preenchidos sairia como um texto solto
     * de frases, sem título nem seções, e pareceria um laudo.
     *
     * O objetivo é montado em código e não depende da máscara do banco.
     */
    render: (f, o, ctx) => {
      if (o.objetivo) return renderAbdomenTotalObjetivo(f);
      const tpl = ctx?.templateBody;
      if (!tpl || tpl.trim() === "") return null;
      return renderAbdomenTotalClassico(f, tpl);
    },
  },
  {
    categoria: "OBSTETRICA", rotulo: "Obstétrica", schema: ObstetricaFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    seed: { numero_fetos: 1, gestacao_inicial: false, fetos: [FETO_NORMAL] },
    cenarios: [
      { nome: "Gestação padrão", seed: { numero_fetos: 1, gestacao_inicial: false, fetos: [FETO_NORMAL] } },
      { nome: "Gestação inicial", seed: { numero_fetos: 1, gestacao_inicial: true, fetos: [FETO_NORMAL] } },
      { nome: "Gemelar", seed: { numero_fetos: 2, gestacao_inicial: false, fetos: [FETO_NORMAL, FETO_NORMAL] } },
    ],
    /**
     * AS FLAGS DE PRODUÇÃO ATRAVESSAM — o mesmo defeito do `omitPicoNull` da
     * tireoide (D5), achado de novo aqui em 22/08 pelo gate da obstétrica.
     *
     * O registry passava só `objetivo` e descartava as outras três. Efeito:
     * `IG_REFERENCE_CORRECTION` está LIGADA em produção há 65 dias, e ainda
     * assim a frase da primeira ultrassonografia nunca aparecia por este
     * caminho — nem na Biblioteca, nem na web. O médico informava a data da US
     * precoce e ela não saía no laudo.
     *
     * `process.env` direto, e não `env()`: o validado LANÇA quando falta
     * qualquer variável, e `laudoPadraoDe` engole exceção para que uma
     * categoria quebrada não derrube a Biblioteca — a combinação faz a
     * categoria SUMIR em silêncio. Já custou isso uma vez.
     */
    render: (f, o) =>
      renderObstetrica(f, null, {
        objetivo: o.objetivo,
        igCorrection: process.env.IG_REFERENCE_CORRECTION === "true",
        flexivel: process.env.FLEXIBLE_CONCLUSION === "true",
        grannum: process.env.GRANNUM_PLACENTA === "true",
        igSanity: process.env.OBST_IG_SANITY === "true",
      }),
  },
  {
    categoria: "DOPPLER_OBSTETRICO", rotulo: "Doppler obstétrico",
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    schema: DopplerObstetricoFindingsSchema,
    /**
     * Os índices entram no seed porque, sem eles, o renderer escreve
     * "DOPPLERVELOCIMETRIA:" e mais nada — o médico via a seção vazia, que foi
     * um dos defeitos que o Luiz apontou. Os valores em si não aparecem no
     * modelo: `mascararPorComparacao` os troca por lacuna.
     */
    seed: {
      ir_uterina_dir: 0.59, ip_uterina_dir: 0.59,
      ir_uterina_esq: 0.59, ip_uterina_esq: 0.59,
      ip_medio_uterinas: 0.7, perc_medio_uterinas: 50,
      ir_umbilical: 0.58, ip_umbilical: 1.0, perc_umbilical: 50,
      ir_acm: 0.81, ip_acm: 1.8, perc_acm: 50,
      ir_ducto_venoso: 0.4, ip_ducto_venoso: 0.72, perc_ducto_venoso: 50,
      rcp: 1.8, perc_rcp: 50, perfil_hemodinamico: 0.56,
      incisura: false, pre_centralizacao: false, centralizacao: false,
      observacoes_adicionais: null, itens_conclusao_livres: [],
      ig_semanas: null, cervicometria: null,
    },
    /**
     * TODAS as flags de produção atravessam. A varredura de 22/08 achou seis
     * categorias em que o registry repassava só `objetivo` — a terceira vez
     * que o mesmo esquecimento aparece (antes: `omitPicoNull` na tireoide e
     * `igCorrection` na obstétrica). `process.env` direto pelo motivo de
     * sempre: `env()` lança quando falta variável e `laudoPadraoDe` engole a
     * exceção, fazendo a categoria SUMIR em silêncio.
     *
     * `golfBall` e `rawInput` ficam FORA de propósito — dependem do ditado, e
     * o catálogo não tem ditado.
     */
render: (f, o) =>
      renderDopplerObstetrico(f, null as never, {
        objetivo: o.objetivo,
        /**
         * ⚠️ GUARD DE SEGURANÇA. Sem ele, diástole zero ou IP ≥ 1,5 podem sair
         * descritos como "IP normal" — o falso-normal do Doppler umbilical,
         * corrigido como P0 em julho e que o caminho do catálogo ignorava.
         */
        umbilicalSafety: true,
      }),
  },
  {
    categoria: "DOPPLER_CAROTIDAS", rotulo: "Doppler de carótidas e vertebrais",
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    schema: DopplerCarotidasFindingsSchema,
    seed: { classificacao_explicita: "normal" },
    render: (f, o) => renderDopplerCarotidas(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "MORFOLOGICO", rotulo: "Morfológico", schema: MorfologicoFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
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
    render: (f, o) =>
      renderMorfologico(f, null as never, {
        objetivo: o.objetivo,
        igCorrection: process.env.IG_REFERENCE_CORRECTION === "true",
      }),
  },
  {
    categoria: "TIREOIDE", rotulo: "Tireoide", schema: TireoideFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
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
    categoria: "MAMARIA", rotulo: "Mamas e axilas", schema: MamariaFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    /**
     * `escopo_exame` é opcional no schema para aceitar achados antigos, mas o
     * gerador genérico de normalidade representa enum opcional como `null` — e
     * `null` não é um escopo válido. Sem o seed, a categoria inteira sumia da
     * Biblioteca depois que os três escopos foram introduzidos na Sprint 15.
     */
    seed: { escopo_exame: "mamas" },
    render: (f, o) =>
      renderMamaria(f, undefined as never, {
        objetivo: o.objetivo,
        /** Guard que só SINALIZA BI-RADS discrepante; live em produção. */
        biradsGuard: process.env.MAMARIA_BIRADS_GUARD === "true",
      }),
  },
  {
    categoria: "PELVE_FEMININA", rotulo: "Pelve feminina", schema: PelveFemininaFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    render: (f, o) =>
      renderPelveFeminina(f, {
        objetivo: o.objetivo,
        /** Deduplica itens repetidos na conclusão; live em produção. */
        dedup: process.env.PELVE_CONCL_DEDUP === "true",
      }),
  },
  {
    categoria: "ABDOMEN_SUPERIOR", rotulo: "Abdome superior", schema: AbdomenSuperiorFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    render: (f, o) => renderAbdomenSuperior(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "VIAS_URINARIAS", rotulo: "Vias urinárias", schema: ViasUrinariasFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    render: (f, o) => renderViasUrinarias(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "PROSTATA_SUPRAPUBICA", rotulo: "Próstata (suprapúbica)",
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    schema: ProstataSuprapubicaFindingsSchema,
    render: (f, o) => renderProstataSuprapubica(f, null, { objetivo: o.objetivo }),
  },
  {
    categoria: "CERVICAL", rotulo: "Cervical", schema: CervicalFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    render: (f, o) => renderCervical(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "CERVICOMETRIA", rotulo: "Cervicometria", schema: CervicometriaFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    /**
     * Sem a medida do colo a conclusão sai "não caracterizada pelo método
     * [REVISAR]" — o aviso de dado faltando, não o modelo. A medida entra no
     * seed e some do texto por comparação.
     */
    seed: { colo_oi_oe_cm: 3.4 },
    render: (f, o) => renderCervicometria(f, null, { objetivo: o.objetivo }),
  },
  {
    categoria: "PARTES_MOLES", rotulo: "Partes moles", schema: PartesMolesFindingsSchema,
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    render: (f, o) => renderPartesMoles(f, { objetivo: o.objetivo }),
  },
  {
    categoria: "MUSCULOESQUELETICO", rotulo: "Musculoesquelético",
    estilos: ["CLASSICO_COMPLETO", "OBJETIVO"],
    schema: MusculoesqueleticoFindingsSchema,
    /**
     * Sem segmento examinado o MSK não escreve NADA — o laudo dele é sobre "o
     * ombro direito", não sobre um corpo genérico, e `laudos: []` rende texto
     * vazio. O seed dá um segmento para existir modelo; as frases de
     * normalidade do ombro são as mesmas de qualquer outro segmento.
     */
    seed: { laudos: [{ segmento: "ombro", lado: "direito", alteracoes: [] }] },
    render: (f, o) => renderMusculoesqueletico(f, null, { objetivo: o.objetivo }),
  },
];

export function modeloNormalDe(categoria: string): EntradaModeloNormal | undefined {
  return MODELOS_NORMAIS.find((m) => m.categoria === categoria);
}

export function categoriasComModeloNormal(): {
  categoria: string;
  rotulo: string;
  estilos: readonly EstiloModeloNormal[];
}[] {
  return MODELOS_NORMAIS.map((m) => ({
    categoria: m.categoria,
    rotulo: m.rotulo,
    estilos: m.estilos,
  }));
}

export function estilosDoModeloNormal(categoria: string): readonly EstiloModeloNormal[] {
  return modeloNormalDe(categoria)?.estilos ?? [];
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
  ctx?: ContextoDeRender,
): string | null {
  const m = modeloNormalDe(categoria);
  if (!m) return null;
  if (!m.estilos.includes(estilo as EstiloModeloNormal)) return null;
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
    const texto = m.render(parsed.data, { objetivo: estilo === "OBJETIVO" }, ctx);
    /**
     * `null` do renderer é resposta legítima, não falha: é como uma categoria
     * diz "me falta o que preciso" — hoje, o abdome sem a máscara do banco.
     * Laudo pela metade seria pior que laudo nenhum.
     */
    return texto === null || texto.trim() === "" ? null : texto;
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
  ctx?: ContextoDeRender,
): string | null {
  const m = modeloNormalDe(categoria);
  const a = laudoPadraoDe(categoria, estilo, seed, ctx);
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
  /**
   * O CONTEXTO VAI NOS DOIS RENDERS. Sem ele aqui, o `b` do ABDOMEN_TOTAL saía
   * `null` (sem máscara não há laudo), o fail-closed abaixo derrubava o cenário
   * e a categoria ficava sem modelo — a Biblioteca respondia 404 numa categoria
   * que renderiza perfeitamente. O fail-closed estava certo; faltava o dado.
   */
  const b = laudoPadraoDe(categoria, estilo, variarSeed(mesclarFundo(m?.seed ?? {}, seed)), ctx);
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
