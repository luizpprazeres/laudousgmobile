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
import {
  COMENTARIOS_CERVICO,
  COMENTARIOS_DOPPLER,
  filterFreeBodyItems,
  filterFreeConclusionItems,
  inserirComentariosExtras,
  type ObstetricaFindings,
} from "../categories/OBSTETRICA";
import { renderCervicometriaBloco } from "../categories/CERVICOMETRIA";
import { renderDopplerModule } from "../categories/dopplerObstetricoModule";
import { renderFetalGrowthModule } from "../categories/fetalGrowthModule";
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
  /** Ditado cru — o módulo Doppler usa para não afirmar o que não foi medido. */
  rawInput?: string;
  umbilicalSafety?: boolean;
};

/**
 * COMPLEMENTOS DO EXAME — Doppler, cervicometria e crescimento fetal.
 *
 * Eles não são slots do catálogo: são MÓDULOS, com schema e renderer próprios,
 * compartilhados com o Doppler isolado e com o morfológico. O catálogo os chama,
 * em vez de reescrevê-los, por dois motivos. O texto sai idêntico ao do renderer
 * clássico (é o mesmo código), e uma regra clínica corrigida em um lugar vale nos
 * três exames — foi a duplicação do módulo em 26cb805 que fez o IR reaparecer no
 * obstétrico com Doppler, o erro que o médico relatou em 15/09/2026.
 *
 * O que a personalização alcança, então, é o exame principal (os slots) e o
 * preâmbulo. Os complementos seguem escritos pelo sistema. É a divisão certa: o
 * médico personaliza a normalidade que ele redige, não a medida que ele mediu.
 */
function complementosDoExame(
  f: ObstetricaFindings,
  args: { rawInput?: string; umbilicalSafety?: boolean },
): { corpo: string[]; conclusao: string[]; comentarios: Array<string | null>; comDoppler: boolean } {
  const corpo: string[] = [];
  const conclusao: string[] = [];

  // A ORDEM É A DO RENDERER CLÁSSICO: cervicometria, Doppler, crescimento.
  if (f.cervicometria) {
    const cervico = renderCervicometriaBloco(f.cervicometria, f.ig_semanas);
    corpo.push("\nCERVICOMETRIA:", ...cervico.achados);
    conclusao.push(...cervico.conclusao);
  }
  if (f.doppler) {
    // indices: "ip" — no exame COMBINADO o laudo cita só o IP. O IR é do Doppler
    // isolado (decisão do médico, 15/09/2026).
    const doppler = renderDopplerModule(f.doppler, {
      rawInput: args.rawInput,
      umbilicalSafety: args.umbilicalSafety,
      indices: "ip",
    });
    corpo.push("\nDOPPLERVELOCIMETRIA:", ...doppler.achados);
    conclusao.push(...doppler.conclusao);
  }
  if (f.crescimento_fetal) {
    const growth = renderFetalGrowthModule(f.crescimento_fetal, f.ig_semanas, f.ig_dias);
    corpo.push("\nCRESCIMENTO FETAL:", ...growth.achados);
    conclusao.push(...growth.conclusao);
  }

  return {
    corpo,
    conclusao,
    comentarios: [f.doppler ? COMENTARIOS_DOPPLER : null, f.cervicometria ? COMENTARIOS_CERVICO : null],
    comDoppler: Boolean(f.doppler),
  };
}

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

  const comp = complementosDoExame(f, { rawInput: args.rawInput, umbilicalSafety: args.umbilicalSafety });

  const raw = buildDoc({
    catalog,
    findings: f,
    varsFor: varsObstetrica,
    gemelar,
    instancias,
    flags,
    // O título ganha o sufixo do Doppler; a base continua vindo do catálogo.
    titulo: comp.comDoppler
      ? `${catalog.titulo({ findings: f, fetoIndex: 0, gemelar, flags })} COM DOPPLER COLORIDO`
      : undefined,
    // A técnica dos complementos entra DENTRO do parágrafo de comentários — o do
    // catálogo, inclusive quando o médico o personalizou.
    preambulo: catalog.preambulo ? inserirComentariosExtras(catalog.preambulo, comp.comentarios) : undefined,
    preLinhas: [f.dum ? `\nDUM: ${f.dum}.\n` : "", ig.fraseReferencia ? `${ig.fraseReferencia}\n` : ""],
    customSlots: args.customSlots,
    // Camada flexível (flag FLEXIBLE_CONCLUSION), lado do CORPO: observação
    // clínica que o médico ditou fora dos slots. Mesmo dedup do renderer.
    extraCorpo: [
      ...(flags.flexivel ? filterFreeBodyItems(f.observacoes_corpo_livres) : []),
      // Os complementos SEMPRE fecham o corpo, depois dos itens livres.
      ...comp.corpo,
    ],
    // Camada flexível (flag FLEXIBLE_CONCLUSION): itens livres do médico entram
    // ao fim da conclusão, após o mesmo dedup determinístico do renderer.
    extraConclusao: [
      ...(flags.flexivel ? filterFreeConclusionItems(f.itens_conclusao_livres) : []),
      ...comp.conclusao,
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
