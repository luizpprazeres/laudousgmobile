/**
 * Motor de categoria de OBSTETRICA sobre o catálogo.
 *
 * É o código que, no passo 2 do corte vertical (docs/projeto-modelos/ §5),
 * substitui o corpo de renderObstetricaClassico — atrás de flag, e só depois
 * da equivalência byte-a-byte verificada em
 * __tests__/catalog-equivalence.manual.ts (960/960 hoje).
 *
 * Ainda NÃO é chamado pelo pipeline.
 */
import { buildIgInput, computeIg } from "../ig";
import { filterFreeConclusionItems, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { buildDoc, serialize } from "./engine";
import { OBSTETRICA_CLASSICO, conclusaoLiquidoAplicavel, rotuloFeto, varsObstetrica } from "./OBSTETRICA.classico";
import type { Catalog, ReportDoc, Segment, SlotContext } from "./types";

export type ObstetricaFlags = SlotContext<ObstetricaFindings>["flags"];

export const FLAGS_OFF: ObstetricaFlags = {
  igCorrection: false, flexivel: false, grannum: false, objetivo: false,
};

export type RenderArgs = {
  findings: ObstetricaFindings;
  flags?: Partial<ObstetricaFlags>;
  /** Catálogo já com a personalização aplicada (applyCustomization). */
  catalog?: Catalog<ObstetricaFindings>;
  customSlots?: Set<string>;
  extraConclusao?: string[];
};

/** Constrói o documento estruturado. A string só aparece em `renderObstetricaCatalogo`. */
export function buildObstetricaDoc(args: RenderArgs): { doc: ReportDoc; catalog: Catalog<ObstetricaFindings> } {
  const f = args.findings;
  const flags = { ...FLAGS_OFF, ...args.flags };
  const catalog = args.catalog ?? OBSTETRICA_CLASSICO;
  const gemelar = f.numero_fetos >= 2;
  const instancias = gemelar ? f.fetos.map((_, i) => rotuloFeto(f, i)) : ["A"];

  const corionLead = f.corionicidade ? `${f.corionicidade} ` : "";
  const ig = computeIg(
    buildIgInput(
      {
        biometriaSemanas: f.ig_semanas,
        biometriaDias: f.ig_dias,
        dataExame: flags.igCorrection ? f.data_exame : null,
        dum: flags.igCorrection ? f.dum : null,
        primeiraUsData: flags.igCorrection ? f.primeira_us_data : null,
        primeiraUsIgSemanas: flags.igCorrection ? f.primeira_us_ig_semanas : null,
        primeiraUsIgDias: flags.igCorrection ? f.primeira_us_ig_dias : null,
        igRefHojeSemanas: flags.igCorrection ? f.ig_referencia_hoje_semanas : null,
        igRefHojeDias: flags.igCorrection ? f.ig_referencia_hoje_dias : null,
        referenciaFonte: flags.igCorrection ? f.referencia_fonte : null,
        corrigirComando: flags.igCorrection ? f.corrigir_ig : null,
      },
      {
        leadAncora: gemelar ? `Gestação gemelar ${corionLead}em torno de ` : "Gestação em torno de ",
        leadBase: "Gestação em torno de ",
      },
    ),
  );

  const raw = buildDoc({
    catalog,
    findings: f,
    varsFor: varsObstetrica,
    gemelar,
    instancias,
    flags,
    preLinhas: [f.dum ? `\nDUM: ${f.dum}.\n` : "", ig.fraseReferencia ? `${ig.fraseReferencia}\n` : ""],
    customSlots: args.customSlots,
    // Camada flexível (flag FLEXIBLE_CONCLUSION): itens livres do médico entram
    // ao fim da conclusão, após o mesmo dedup determinístico do renderer.
    extraConclusao: [
      ...(flags.flexivel ? filterFreeConclusionItems(f.itens_conclusao_livres) : []),
      ...(args.extraConclusao ?? []),
    ],
  });

  // Itens de conclusão que pertencem ao MOTOR, não ao catálogo:
  //  - a IG é sempre o primeiro item;
  //  - o líquido é omitido no feto único em gestação inicial (ver
  //    conclusaoLiquidoAplicavel).
  const filtrados: Segment[] = conclusaoLiquidoAplicavel(f)
    ? raw.segments
    : raw.segments.filter((s) => !(s.kind === "conclusao" && s.slotId === "liquido_amniotico"));

  const igSeg: Segment = {
    slotId: "concl_ig", variantId: "computed", kind: "conclusao",
    text: ig.conclusaoClassico, origin: "computed",
  };

  const doc: ReportDoc = {
    ...raw,
    segments: [
      ...filtrados.filter((s) => s.kind === "corpo"),
      igSeg,
      ...filtrados.filter((s) => s.kind === "conclusao"),
    ],
  };
  return { doc, catalog };
}

export function renderObstetricaCatalogo(args: RenderArgs): string {
  const { doc, catalog } = buildObstetricaDoc(args);
  return serialize(doc, catalog);
}
