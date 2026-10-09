import type { ObstetricaFindings } from "./OBSTETRICA";

export const CONCLUSAO_GESTACAO_INICIAL = [
  "Gestação inicial.",
  "Convém realizar nova ultrassonografia no prazo de duas semanas, com o objetivo de acompanhar a evolução.",
];

export function temEmbriaoNaoVisualizado(f: ObstetricaFindings): boolean {
  return f.gestacao_inicial && (f.embriao_visualizado === false || Boolean(f.sacos_gestacionais?.some(s => s.embriao_visualizado === false)));
}
const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const medidas = (m: number[] | null | undefined) => m?.map(numero).join(" x ");
const dsm = (m: number[] | null | undefined, direto: number | null | undefined) =>
  direto ?? (m?.length === 3 ? m.reduce((a, b) => a + b, 0) / 3 : null);

/** Estado explícito: nenhuma frase fetal ou normalidade é inferida da ausência. */
export function blocoGestacaoInicial(f: ObstetricaFindings): { corpo: string[]; conclusao: string[] } {
  const corpo: string[] = [];
  const conclusoesFetais: string[] = [];
  const sacos = f.sacos_gestacionais?.length ? f.sacos_gestacionais : [{
    rotulo: null, embriao_visualizado: f.embriao_visualizado ?? null,
    vesicula_vitelina_visualizada: f.vesicula_vitelina_visualizada ?? null,
    feto_indice: null, diametro_medio_mm: f.saco_gestacional_mm,
    medidas_mm: f.saco_gestacional_medidas_mm, localizacao: f.saco_gestacional_localizacao ?? null,
  }];
  const utero = f.utero_posicao || f.utero_medidas_cm
    ? `Útero${f.utero_posicao ? ` em ${f.utero_posicao}` : ""}${f.utero_medidas_cm ? `, medindo ${medidas(f.utero_medidas_cm)} cm` : ""}` : null;
  if (sacos.length > 1 && utero) corpo.push(`${utero}.`);
  for (const [i, saco] of sacos.entries()) {
    const medio = dsm(saco.medidas_mm, saco.diametro_medio_mm);
    const descricao = `${sacos.length > 1 ? `saco gestacional ${saco.rotulo ?? String.fromCharCode(65 + i)}` : "saco gestacional"}${medio !== null ? ` medindo ${numero(medio)} mm de diâmetro médio` : ""}${saco.localizacao ? `, situado ${saco.localizacao}` : ""}`;
    const imagem = sacos.length === 1 ? f.saco_gestacional_aspecto : null;
    if (sacos.length === 1 && utero) {
      corpo.push(imagem ? `${utero}, apresentando ${imagem}, que corresponde a ${descricao}.` : `${utero}, contendo ${descricao}.`);
    } else {
      corpo.push(`${imagem ? `${imagem.charAt(0).toUpperCase()}${imagem.slice(1)}, que corresponde a ` : ""}${!imagem ? descricao.charAt(0).toUpperCase() + descricao.slice(1) : descricao}.`);
    }
    if (saco.embriao_visualizado === false) {
      corpo.push(saco.vesicula_vitelina_visualizada === false
        ? "Embrião e vesícula vitelínica ainda não visualizados."
        : "Embrião ainda não visualizado.");
    } else if (saco.embriao_visualizado === true && saco.feto_indice !== null) {
      const ft = f.fetos[saco.feto_indice];
      if (ft) {
        corpo.push("Embrião visualizado.");
        if (ft.bcf_alteracao === "ausente") {
          corpo.push("Batimentos cardíacos embrionários não identificados.");
          conclusoesFetais.push(`Embrião sem vitalidade (saco ${saco.rotulo ?? String.fromCharCode(65 + i)}).`);
        }
        else if (ft.bcf_bpm !== null) corpo.push(`Batimentos cardíacos presentes (BCF = ${numero(ft.bcf_bpm)} bpm).`);
        if (ft.ccn_mm !== null) corpo.push(`Comprimento crânio-nádegas (CCN) de ${numero(ft.ccn_mm)} mm.`);
      }
    }
    if (saco.vesicula_vitelina_visualizada === true) {
      corpo.push(f.vesicula_vitelina_mm != null && sacos.length === 1
        ? `Vesícula vitelina aumentada, medindo ${numero(f.vesicula_vitelina_mm)} mm.`
        : "Vesícula vitelina de forma e dimensões normais.");
    }
  }
  if (f.ovarios_normais === true && !f.ovario_achado) corpo.push("Ovários de aspecto normal.");
  if (f.ovario_achado) {
    const tamanho = f.ovario_achado_medida_cm != null ? `, medindo ${numero(f.ovario_achado_medida_cm)} cm` : "";
    corpo.push(`Ovário${f.ovario_lado ? ` ${f.ovario_lado}` : ""}${f.ovario_medidas_cm ? `, medindo ${medidas(f.ovario_medidas_cm)} cm` : ""}, apresentando ${f.ovario_achado === "cisto_simples" ? "cisto simples" : "imagem com conteúdo em vidro fosco, compatível com endometrioma"}${tamanho}.`);
  }
  if (f.hematoma_perigestacional_medidas) corpo.push(`Hematoma perigestacional${f.hematoma_perigestacional_lado ? ` à ${f.hematoma_perigestacional_lado}` : ""}, medindo ${f.hematoma_perigestacional_medidas}.`);
  if (f.achados_adicionais?.trim()) corpo.push(f.achados_adicionais.trim());
  const conclusao = [...CONCLUSAO_GESTACAO_INICIAL, ...conclusoesFetais];
  if (f.gestacao_inviavel === true) {
    // Só diagnóstico explícito; não tornar a recomendação evolutiva a conclusão de uma perda confirmada.
    const medio = dsm(f.saco_gestacional_medidas_mm, f.saco_gestacional_mm);
    conclusao.splice(0, conclusao.length, `Ausência de embrião em saco gestacional com diâmetro médio (DSM) de ${medio !== null ? numero(medio) : "____"} mm, permitindo preencher critérios ultrassonográficos de inviabilidade gestacional.`);
  }
  return { corpo, conclusao };
}

export function preambuloGestacaoInicial(f: ObstetricaFindings): string {
  return f.via_exame === "transvaginal"
    ? "COMENTÁRIOS:\nExame realizado pela via transvaginal."
    : f.via_exame === "abdominal" ? "COMENTÁRIOS:\nExame realizado pela via abdominal." : "";
}

export function renderGestacaoInicial(f: ObstetricaFindings, objetivo = false): string {
  const { corpo, conclusao } = blocoGestacaoInicial(f);
  return ["ULTRASSONOGRAFIA OBSTÉTRICA", "", preambuloGestacaoInicial(f), "", objetivo ? "ACHADOS:" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:", corpo.join("\n"), "", objetivo ? "IMPRESSÃO:" : "CONCLUSÃO:", conclusao.map((s, i) => `${i + 1}) ${s}`).join("\n")].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
