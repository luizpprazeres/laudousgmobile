import { z } from "zod";

const BladderFindingSchema = z.object({
  tipo: z.enum(["debris", "calculo", "coagulo", "sonda", "diverticulo", "ureterocele", "lesao_focal"]),
  medidas_cm: z.array(z.number().positive()).min(1).max(3).nullable(),
  descricao: z.string().min(1).nullable(),
  mobilidade: z.enum(["movel", "imovel", "juv"]).nullable(),
  lateralidade: z.enum(["direita", "esquerda"]).nullable(),
  multiplos: z.boolean(),
  nivel_liquido: z.boolean(),
  doppler: z.enum(["nao_avaliado", "sem_fluxo", "com_fluxo"]),
  topografia: z.string().min(1).nullable(),
  calculo_associado_mm: z.number().nonnegative().nullable(),
});

export const SharedBladderSchema = z.object({
  replecao: z.enum(["adequada", "moderada", "pequena", "insuficiente", "vazia"]),
  parede: z.enum(["normal", "espessada", "trabeculada"]),
  espessura_parede_mm: z.number().nonnegative().nullable(),
  volume_pre_miccional_ml: z.number().nonnegative().nullable(),
  residuo_estado: z.enum(["nao_informado", "desprezivel", "valor", "dupla_miccao", "sondado"]),
  residuo_pos_miccional_ml: z.number().nonnegative().nullable(),
  residuo_primeira_miccao_ml: z.number().nonnegative().nullable(),
  residuo_segunda_miccao_ml: z.number().nonnegative().nullable(),
  jatos: z.object({
    estado: z.enum(["nao_avaliados", "presentes_simetrico", "reduzido_unilateral", "nao_caracterizados", "ausencia_unilateral"]),
    lateralidade: z.enum(["direita", "esquerda"]).nullable(),
    calculo_associado_mm: z.number().nonnegative().nullable(),
  }),
  achados: z.array(BladderFindingSchema),
}).superRefine((bladder, ctx) => {
  const limited = bladder.replecao === "insuficiente" || bladder.replecao === "vazia";
  const measurements = bladder.espessura_parede_mm !== null || bladder.volume_pre_miccional_ml !== null ||
    bladder.residuo_pos_miccional_ml !== null || bladder.residuo_primeira_miccao_ml !== null || bladder.residuo_segunda_miccao_ml !== null;
  if (limited && (measurements || bladder.parede !== "normal" || bladder.achados.length > 0 || bladder.jatos.estado !== "nao_avaliados")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "repleção insuficiente/vazia conflita com medidas ou achados vesicais" });
  }
  if ((bladder.jatos.estado === "reduzido_unilateral" || bladder.jatos.estado === "ausencia_unilateral") && !bladder.jatos.lateralidade) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["jatos", "lateralidade"], message: "lateralidade obrigatória para jato unilateral" });
  }
  if (bladder.residuo_estado === "valor" && bladder.residuo_pos_miccional_ml === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["residuo_pos_miccional_ml"], message: "volume obrigatório para resíduo pós-miccional" });
  }
  if (bladder.residuo_estado === "dupla_miccao" && (bladder.residuo_primeira_miccao_ml === null || bladder.residuo_segunda_miccao_ml === null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["residuo_estado"], message: "dupla micção exige os dois volumes" });
  }
  for (const [index, finding] of bladder.achados.entries()) {
    if (finding.tipo === "calculo" && finding.mobilidade === "juv" && !finding.lateralidade) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["achados", index, "lateralidade"], message: "lateralidade obrigatória para cálculo na JUV" });
    }
    if (finding.tipo === "ureterocele" && !finding.lateralidade) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["achados", index, "lateralidade"], message: "lateralidade obrigatória para ureterocele" });
    }
    if (finding.tipo === "lesao_focal" && (!finding.topografia || !finding.medidas_cm)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["achados", index], message: "lesão focal exige topografia e dimensões" });
    }
    if (finding.tipo === "coagulo" && !finding.descricao) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["achados", index, "descricao"], message: "coágulo exige descrição morfológica" });
    }
  }
});

export const SharedKidneyFindingSchema = z.object({
  tipo: z.enum(["litiase", "cisto_simples", "cistos_multiplos", "cisto_complexo", "nodulo", "angiomiolipoma", "ectasia", "nefrocalcinose"]),
  medidas_cm: z.array(z.number().positive()).min(1).max(3).nullable(),
  localizacao: z.string().nullable(),
  caracteristica: z.string().nullable(),
  descricao_raw: z.string().nullable(),
});

export const SharedKidneySchema = z.object({
  medidas_cm: z.array(z.number().positive()).min(1).max(3).nullable(),
  espessura_parenquima_cm: z.number().positive().nullable(),
  dimensao: z.enum(["normal", "reduzida_discreta", "reduzida"]).nullable(),
  diferenciacao: z.enum(["preservada", "reduzida"]).default("preservada"),
  situacao_baixa: z.boolean(),
  rotacao: z.boolean(),
  drc: z.boolean(),
  alteracao_difusa: z.string().nullable(),
  hidronefrose: z.enum(["ausente", "leve", "moderada", "acentuada"]).nullable(),
  achados: z.array(SharedKidneyFindingSchema),
});

export type SharedBladder = z.infer<typeof SharedBladderSchema>;
export type SharedKidney = z.infer<typeof SharedKidneySchema>;

const ptBr = (value: number): string =>
  (Number.isInteger(value) ? String(value) : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")).replace(".", ",");

const measures = (values: number[] | null, unit = "cm"): string =>
  values && values.length > 0 ? `${values.map(ptBr).join(" x ")} ${unit}` : "";

const side = (value: "direita" | "esquerda" | null): string =>
  value === "direita" ? "à direita" : value === "esquerda" ? "à esquerda" : "";

export type SharedBladderRender = {
  body: string[];
  conclusion: string[];
  isNormal: boolean;
};

export type SharedKidneyRender = SharedBladderRender;

export function renderSharedBladder(
  bladder: SharedBladder,
  wording?: { normalBody?: string; normalConclusion?: string },
): SharedBladderRender {
  if (bladder.replecao === "insuficiente" || bladder.replecao === "vazia") {
    const empty = bladder.replecao === "vazia";
    return {
      body: [empty
        ? "Bexiga vazia no momento do exame, não permitindo adequada avaliação."
        : "Bexiga com repleção insuficiente no momento do exame, prejudicando a sua adequada avaliação."],
      conclusion: [empty ? "Bexiga vazia, não adequadamente avaliável." : "Bexiga com repleção insuficiente para adequada avaliação."],
      isNormal: false,
    };
  }

  const body: string[] = [];
  const conclusion: string[] = [];
  const altered = bladder.parede !== "normal" || bladder.achados.length > 0;
  const limitedRepletion = bladder.replecao === "moderada" || bladder.replecao === "pequena";
  if (limitedRepletion && altered) {
    body.push(`Bexiga com ${bladder.replecao === "moderada" ? "repleção moderada" : "pequena repleção"} no momento do exame.`);
  }
  if (!altered) {
    body.push(limitedRepletion
      ? `Bexiga com ${bladder.replecao === "moderada" ? "repleção moderada" : "pequena repleção"}, de contornos e paredes regulares, com conteúdo anecoico.`
      : wording?.normalBody ?? "Bexiga de forma, contornos e paredes regulares, com conteúdo anecoico.");
  } else {
    if (bladder.parede === "espessada") {
      body.push(`Bexiga com paredes espessadas${bladder.espessura_parede_mm !== null ? `, medindo ${ptBr(bladder.espessura_parede_mm)} mm` : ""}.`);
      conclusion.push("Espessamento da parede vesical.");
    } else if (bladder.parede === "trabeculada") {
      body.push("Bexiga com paredes trabeculadas.");
      conclusion.push("Trabeculação da parede vesical.");
    }

    for (const finding of bladder.achados) {
      const dimension = measures(finding.medidas_cm);
      switch (finding.tipo) {
        case "debris":
          body.push(`Ecos em suspensão no conteúdo vesical${finding.nivel_liquido ? ", formando nível líquido-líquido" : ""}.`);
          conclusion.push("Debris no interior da bexiga.");
          break;
        case "calculo": {
          const count = finding.multiplos ? "Imagens hiperecogênicas" : "Imagem hiperecogênica";
          const measure = dimension ? `, medindo ${dimension}` : "";
          const mobility = finding.mobilidade === "movel" ? ", móvel às mudanças de decúbito" : finding.mobilidade === "imovel" ? ", sem mobilidade observada" : "";
          const juv = finding.mobilidade === "juv" ? `, impactada na junção ureterovesical ${finding.lateralidade}` : "";
          body.push(`${count} com sombra acústica posterior no interior da bexiga${measure}${mobility}${juv}.`);
          conclusion.push(`${finding.multiplos ? "Cálculos vesicais" : "Cálculo vesical"}${finding.mobilidade === "juv" ? ` na junção ureterovesical ${finding.lateralidade}` : ""}.`);
          break;
        }
        case "coagulo": {
          const doppler = finding.doppler === "sem_fluxo" ? ", sem fluxo detectável ao Doppler" : finding.doppler === "com_fluxo" ? ", com fluxo detectável ao Doppler" : "";
          body.push(`${finding.descricao}${dimension ? `, medindo ${dimension}` : ""}${doppler}.`);
          conclusion.push("Material intracavitário descrito como coágulo/hematoma.");
          break;
        }
        case "sonda":
          body.push("Balão de sonda vesical em seu interior.");
          break;
        case "diverticulo":
          body.push(`Imagem sacular comunicante com a luz vesical${dimension ? `, medindo ${dimension}` : ""}.`);
          conclusion.push("Divertículo vesical.");
          break;
        case "ureterocele":
          body.push(`Imagem cística na topografia da junção ureterovesical ${finding.lateralidade}${dimension ? `, medindo ${dimension}` : ""}${finding.calculo_associado_mm !== null ? `, com cálculo associado de ${ptBr(finding.calculo_associado_mm)} mm` : ""}.`);
          conclusion.push(`Ureterocele ${side(finding.lateralidade)}.`);
          break;
        case "lesao_focal": {
          const doppler = finding.doppler === "sem_fluxo" ? " sem fluxo detectável ao Doppler" : finding.doppler === "com_fluxo" ? " com fluxo detectável ao Doppler" : "";
          const description = finding.descricao ? `${finding.descricao}, ` : "";
          body.push(`Lesão focal vesical ${description}situada em ${finding.topografia}, medindo ${dimension},${doppler || " sem avaliação Doppler informada"}.`);
          conclusion.push("Lesão focal vesical, de natureza indeterminada ao método.");
          break;
        }
      }
    }
  }

  if (bladder.volume_pre_miccional_ml !== null) body.push(`Volume pré-miccional de ${ptBr(bladder.volume_pre_miccional_ml)} mL.`);
  if (bladder.parede === "normal" && bladder.espessura_parede_mm !== null) body.push(`Espessura da parede vesical de ${ptBr(bladder.espessura_parede_mm)} mm.`);

  switch (bladder.jatos.estado) {
    case "presentes_simetrico":
      body.push("Jatos ureterais presentes e simétricos durante o período de observação.");
      break;
    case "reduzido_unilateral":
      body.push(`Jato ureteral reduzido ${side(bladder.jatos.lateralidade)} durante o período de observação.`);
      break;
    case "nao_caracterizados":
      body.push("Jatos ureterais não caracterizados durante o período de observação.");
      break;
    case "ausencia_unilateral":
      body.push(`Ausência de jato ureteral ${side(bladder.jatos.lateralidade)} durante o período de observação${bladder.jatos.calculo_associado_mm !== null ? `, com cálculo ureteral associado de ${ptBr(bladder.jatos.calculo_associado_mm)} mm` : ""}.`);
      conclusion.push(`Jato ureteral não observado ${side(bladder.jatos.lateralidade)} durante o período examinado.`);
      break;
  }

  if (bladder.residuo_estado === "desprezivel") conclusion.push("Resíduo pós-miccional desprezível.");
  if (bladder.residuo_estado === "valor" && bladder.residuo_pos_miccional_ml !== null) conclusion.push(`Resíduo pós-miccional de ${ptBr(bladder.residuo_pos_miccional_ml)} mL.`);
  if (bladder.residuo_estado === "dupla_miccao") {
    if (bladder.residuo_primeira_miccao_ml !== null) body.push(`Volume após a primeira micção de ${ptBr(bladder.residuo_primeira_miccao_ml)} mL.`);
    if (bladder.residuo_segunda_miccao_ml !== null) conclusion.push(`Volume após a segunda micção de ${ptBr(bladder.residuo_segunda_miccao_ml)} mL.`);
  }
  if (bladder.residuo_estado === "sondado") body.push("Paciente sondado; resíduo pós-miccional não avaliado.");

  const abnormalJets = bladder.jatos.estado === "reduzido_unilateral" || bladder.jatos.estado === "ausencia_unilateral";
  const inconclusiveJets = bladder.jatos.estado === "nao_caracterizados";
  const functional = abnormalJets || inconclusiveJets || bladder.residuo_estado === "dupla_miccao" || bladder.residuo_estado === "sondado";
  if (!altered && !limitedRepletion && !functional) {
    conclusion.unshift(wording?.normalConclusion ?? "Bexiga ecograficamente normal.");
  }
  return { body, conclusion, isNormal: !altered && !limitedRepletion && !functional };
}

export function renderSharedKidney(
  kidney: SharedKidney,
  lado: "direito" | "esquerdo",
): SharedKidneyRender {
  const body: string[] = [];
  const conclusion: string[] = [];
  const altered = kidney.dimensao === "reduzida_discreta" || kidney.dimensao === "reduzida" ||
    kidney.diferenciacao === "reduzida" || kidney.situacao_baixa || kidney.rotacao || kidney.drc ||
    kidney.hidronefrose === "leve" || kidney.hidronefrose === "moderada" || kidney.hidronefrose === "acentuada" ||
    kidney.achados.length > 0 || Boolean(kidney.alteracao_difusa);

  const position = kidney.situacao_baixa ? "em situação baixa" : "em topografia habitual";
  const rotation = kidney.rotacao ? ", com rotação alterada" : "";
  const dimension = kidney.dimensao === "reduzida_discreta"
    ? ", de dimensões discretamente reduzidas"
    : kidney.dimensao === "reduzida" || kidney.drc
      ? ", de dimensões reduzidas"
      : ", de dimensões preservadas";
  const differentiation = kidney.diferenciacao === "reduzida" || kidney.drc
    ? ", com redução da diferenciação corticomedular"
    : ", com diferenciação corticomedular preservada";
  body.push(`Rim ${lado} ${position}${rotation}${dimension}${differentiation}.`);

  if (kidney.medidas_cm) body.push(`Medidas do rim ${lado}: ${measures(kidney.medidas_cm)}.`);
  if (kidney.espessura_parenquima_cm !== null) {
    body.push(`Espessura do parênquima do rim ${lado}: ${ptBr(kidney.espessura_parenquima_cm)} cm.`);
  }
  if (kidney.alteracao_difusa) body.push(`${kidney.alteracao_difusa.replace(/\.+$/, "")}.`);

  if (kidney.hidronefrose && kidney.hidronefrose !== "ausente") {
    const degree = kidney.hidronefrose === "leve" ? "leve" : kidney.hidronefrose === "moderada" ? "moderada" : "acentuada";
    body.push(`Dilatação pielocalicial ${degree} no rim ${lado}.`);
    conclusion.push(`Hidronefrose ${degree} no rim ${lado}.`);
  }

  for (const finding of kidney.achados) {
    const dimensionText = measures(finding.medidas_cm);
    const measured = dimensionText ? `, medindo ${dimensionText}` : "";
    const located = finding.localizacao ? `, em ${finding.localizacao.replace(/^(?:em|no|na|nos|nas)\s+/i, "")}` : "";
    switch (finding.tipo) {
      case "litiase":
        body.push(`Imagem hiperecogênica com sombra acústica posterior no rim ${lado}${measured}${located}.`);
        conclusion.push(`Litíase no rim ${lado}${located}.`);
        break;
      case "cisto_simples":
        body.push(`Imagem anecoica homogênea, de margens regulares e com reforço acústico posterior no rim ${lado}${measured}${located}.`);
        conclusion.push(`Cisto simples no rim ${lado}${located}.`);
        break;
      case "cistos_multiplos":
        body.push(`Múltiplas imagens anecoicas corticais, de margens regulares e com reforço acústico posterior no rim ${lado}.`);
        conclusion.push(`Cistos simples múltiplos no rim ${lado}.`);
        break;
      case "cisto_complexo":
        body.push(`Imagem cística complexa no rim ${lado}${measured}${located}${finding.caracteristica ? `, ${finding.caracteristica.replace(/\.+$/, "")}` : ""}.`);
        conclusion.push(`Cisto complexo no rim ${lado}, de aspecto inespecífico.`);
        break;
      case "nodulo":
        body.push(`Imagem nodular sólida no rim ${lado}${measured}${located}.`);
        conclusion.push(`Imagem nodular sólida no rim ${lado}, de natureza indeterminada ao método.`);
        break;
      case "angiomiolipoma":
        body.push(`Imagem nodular hiperecogênica e homogênea no rim ${lado}${measured}${located}.`);
        conclusion.push(`Imagem sugestiva de angiomiolipoma no rim ${lado}.`);
        break;
      case "ectasia":
        body.push(`Ectasia pielocalicial no rim ${lado}${located}.`);
        conclusion.push(`Ectasia pielocalicial no rim ${lado}${located}.`);
        break;
      case "nefrocalcinose":
        body.push(`Calcificações nas pirâmides medulares do rim ${lado}.`);
        conclusion.push(`Nefrocalcinose no rim ${lado}.`);
        break;
    }
  }

  if (kidney.drc) conclusion.unshift(`Sinais ecográficos de doença renal crônica no rim ${lado}.`);
  else {
    if (kidney.dimensao === "reduzida_discreta" || kidney.dimensao === "reduzida") conclusion.unshift(`Redução das dimensões do rim ${lado}.`);
    if (kidney.diferenciacao === "reduzida") conclusion.push(`Redução da diferenciação corticomedular no rim ${lado}.`);
  }
  if (kidney.situacao_baixa) conclusion.push(`Rim ${lado} em situação baixa.`);
  if (kidney.rotacao) conclusion.push(`Rotação alterada do rim ${lado}.`);
  if (!altered) conclusion.push(`Rim ${lado} ecograficamente normal.`);

  return { body, conclusion, isNormal: !altered };
}
