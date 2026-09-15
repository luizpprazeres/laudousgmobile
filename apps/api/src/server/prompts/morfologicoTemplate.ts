import type { RagBlockForPrompt } from "@laudousg/shared";

/** Specialize the selected mask, rather than asking the writer to contradict it. */
export function prepareMorfologicoBlocks(blocks: RagBlockForPrompt[], transcript: string): RagBlockForPrompt[] {
  const cervicalNegated = /(?:sem|não\s+(?:realizar|incluir|realizada)|nao\s+(?:realizar|incluir|realizada)|dispensar|cancelar)\s+(?:a\s+)?cervicometria\s+transvaginal/i.test(transcript);
  const sentences = transcript.split(/[\n.;]+/);
  const cervical = !cervicalNegated && sentences.some(sentence =>
    /\bcervicometria\s+transvaginal\b/i.test(sentence) &&
    !/\b(?:sem|não|nao|dispensad\w*|cancelad\w*)\b/i.test(sentence),
  );
  const dateRule = "morfologico-regra-dum-primeiraUSG-opcional";
  const hasPresentation = /apresenta[çc][ãa]o|cef[áa]lic[ao]|p[ée]lvic[ao]|transvers[ao]/i.test(transcript);
  const hasBack = /\bdorso\b/i.test(transcript);
  const optionalPosition = !hasPresentation || !hasBack;
  if (!cervical && !optionalPosition && !blocks.some(b => b.kind === "regra" && b.title === dateRule)) return blocks;
  return blocks.map(block => {
    if (block.kind === "regra" && block.title === dateRule) return {
      ...block,
      content: "LINHA OPCIONAL DE DATAÇÃO: só inclua a linha Primeira USG ou DUM quando a respectiva data tiver sido explicitamente fornecida. Sem data, omita essa linha; não crie data nem placeholder de data, mesmo que seja mencionada a idade gestacional do exame anterior. Nunca derive uma data da idade gestacional. Preserve a idade gestacional atual informada na conclusão, sem substituí-la pela idade de um exame anterior. Havendo data, preserve exatamente a data fornecida e as idades gestacionais associadas. Não calcule idade atual sem os dados necessários.",
    };
    if (block.kind !== "modelo") return block;
    let content = block.content;
    if (!hasPresentation) content = content.replace(/, em apresentação _+/g, "");
    if (!hasBack) content = content.replace(/, com dorso _+/g, "");
    if (!cervical) return content === block.content ? block : { ...block, content };
    content = content.replace(
      /^(ULTRASSONOGRAFIA MORFOLÓGICA DO (?:PRIMEIRO|SEGUNDO|TERCEIRO) TRIMESTRE)(?! COM CERVICOMETRIA TRANSVAGINAL)[ \t]*$/gm,
      "$1 COM CERVICOMETRIA TRANSVAGINAL",
    );
    if (!content.includes("Foi realizada adicionalmente cervicometria transvaginal.")) content = content.replace(
      /^(COMENTÁRIOS:|TÉCNICA:)$/m,
      "$1\nFoi realizada adicionalmente cervicometria transvaginal.",
    );
    if (!content.includes("Colo uterino medindo ____")) content = content.replace(
      /^(Orifício interno do colo uterino[^\n]*)$/m,
      "Colo uterino medindo ____.\n$1",
    );
    if (!content.includes("COMPLEMENTO DESTE MODELO: cervicometria")) content += "\n\nCOMPLEMENTO DESTE MODELO: cervicometria transvaginal associada. Preencha a linha Colo uterino medindo com o valor E a unidade ditados; omita essa linha apenas se a medida não foi informada. Preserve os demais achados cervicais ditados. Na conclusão, preserve a avaliação cervical informada pelo médico. Não conclua apenas com o nome do procedimento. Não invente medida ou normalidade cervical ausente.";
    return { ...block, content };
  });
}
