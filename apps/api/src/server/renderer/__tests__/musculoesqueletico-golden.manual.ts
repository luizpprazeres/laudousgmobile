/**
 * GOLDEN determinístico do renderer MUSCULOESQUELETICO (fase 3b) — montagem pura,
 * sem LLM. Rodar: tsx src/server/renderer/__tests__/musculoesqueletico-golden.manual.ts
 */
import {
  renderMusculoesqueletico,
  type MusculoesqueleticoFindings,
} from "../categories/MUSCULOESQUELETICO";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}
const F = (laudos: MusculoesqueleticoFindings["laudos"]): MusculoesqueleticoFindings => ({ laudos });

// 1) Pé direito NORMAL: descreve estruturas no corpo + fechamento sintético na conclusão.
{
  const l = renderMusculoesqueletico(F([{ segmento: "pe", lado: "direito", alteracoes: [] }]));
  check("pé normal: título", /^ULTRASSONOGRAFIA DO PÉ DIREITO$/m.test(l), l);
  check("pé normal: corpo descreve fáscia plantar", /Fáscia plantar com espessura e ecotextura preservadas\./.test(l), l);
  check("pé normal: corpo descreve estruturas tendíneas", /Estruturas tendíneas avaliadas com espessura/.test(l), l);
  check("pé normal: conclusão sintética", /CONCLUSÃO:\nPé direito ecograficamente normal\.$/.test(l), l);
  check("pé normal: NÃO põe 'ecograficamente normal' no corpo", !/OBSERVADOS:[\s\S]*ecograficamente normal[\s\S]*CONCLUSÃO/.test(l), l);
}

// 2) Ombro com 2 alterações: cobre normais + descreve alteradas + conclusão numerada.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "ombro", lado: "direito",
    alteracoes: [
      { estrutura: "supraespinhal", descricao_corpo: "Tendão supraespinhal com aumento da espessura e alteração ecotextural, sem ruptura.", diagnostico_conclusao: "Tendinopatia do tendão supraespinhal à direita." },
      { estrutura: "bursa", descricao_corpo: "Espessamento da bursa subacromial-subdeltoidea.", diagnostico_conclusao: "Bursite subacromial-subdeltoidea à direita." },
    ],
  }]));
  check("ombro: descreve a alteração do supraespinhal", /Tendão supraespinhal com aumento da espessura/.test(l), l);
  check("ombro: cobre infraespinhal normal (não omitido)", /Tendão infraespinhal de espessura, continuidade e ecotextura preservadas\./.test(l), l);
  check("ombro: cobre subescapular normal", /Tendão subescapular de espessura/.test(l), l);
  check("ombro: conclusão numerada (2 itens)", /CONCLUSÃO:\n1\) Tendinopatia do tendão supraespinhal à direita\.\n2\) Bursite subacromial-subdeltoidea à direita\.$/.test(l), l);
  check("ombro: NÃO repete a descrição do corpo na conclusão", !/CONCLUSÃO:[\s\S]*aumento da espessura/.test(l), l);
}

// 3) Mão com tenossinovite de polia (1 alteração) → conclusão sem numeração.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "mao", lado: "direito",
    alteracoes: [
      { estrutura: "polias", descricao_corpo: "Espessamento sinovial na topografia da polia A2 do 3º e 4º quirodáctilos, sem rotura tendínea associada.", diagnostico_conclusao: "Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos." },
    ],
  }]));
  check("mão: cobre flexores/extensores normais", /Tendões flexores e extensores dos quirodáctilos/.test(l), l);
  check("mão: descreve polia (nomenclatura A2)", /polia A2 do 3º e 4º quirodáctilos/.test(l), l);
  check("mão: conclusão única sem numeração", /CONCLUSÃO:\nSinais de tenossinovite da polia A2/.test(l), l);
}

// 4) Multi-laudo: pé direito normal + pé esquerdo normal → 2 laudos, linha em branco entre eles.
{
  const l = renderMusculoesqueletico(F([
    { segmento: "pe", lado: "direito", alteracoes: [] },
    { segmento: "pe", lado: "esquerdo", alteracoes: [] },
  ]));
  check("multi-laudo: 2 títulos", (l.match(/^ULTRASSONOGRAFIA DO PÉ/gm) ?? []).length === 2, l);
  check("multi-laudo: linha em branco entre laudos", /Pé direito ecograficamente normal\.\n\nULTRASSONOGRAFIA DO PÉ ESQUERDO/.test(l), l);
}

// 5) Formato: quebra simples entre achados, linha em branco só antes de cabeçalhos.
{
  const l = renderMusculoesqueletico(F([{ segmento: "joelho", lado: "direito", alteracoes: [] }]));
  check("formato: sem linha em branco entre achados do corpo", !/preservadas\.\n\n[A-ZÀ-Ú][a-z]/.test(l.split("OS SEGUINTES")[1]?.split("CONCLUSÃO")[0] ?? ""), l);
  check("formato: linha em branco antes de CONCLUSÃO", /\n\nCONCLUSÃO:/.test(l), l);
  check("formato: linha em branco antes de COMENTÁRIOS", /\n\nCOMENTÁRIOS:/.test(l), l);
}

// 6) Normalização de nomenclatura: LLM erra "polia a 2"/"Quirodáctilos" → corrige.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "mao", lado: "direito",
    alteracoes: [
      { estrutura: "polias", descricao_corpo: "Espessamento sinovial na polia a 2 dos Quirodáctilos.", diagnostico_conclusao: "Tenossinovite da polia a 2 à direita." },
    ],
  }]));
  check("nomenclatura: 'polia a 2' → 'polia A2' (corpo)", /polia A2/.test(l) && !/polia a 2/i.test(l), l);
  check("nomenclatura: 'polia a 2' → 'polia A2' (conclusão)", /Tenossinovite da polia A2 à direita\./.test(l), l);
  check("nomenclatura: 'Quirodáctilos' → minúsculo", /dos quirodáctilos/.test(l), l);
}

// 7) "artrose" isolada → "alterações degenerativas"; "Rizartrose" preservada.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "ombro", lado: "direito",
    alteracoes: [
      { estrutura: "acromioclavicular", descricao_corpo: "Irregularidade cortical.", diagnostico_conclusao: "Sinais de artrose da articulação acromioclavicular." },
    ],
  }]));
  check("artrose → alterações degenerativas", /alterações degenerativas da articulação acromioclavicular/.test(l) && !/\bartrose\b/.test(l), l);
  const r = renderMusculoesqueletico(F([{ segmento: "mao", lado: "direito", alteracoes: [{ estrutura: "x", descricao_corpo: "y", diagnostico_conclusao: "Rizartrose." }] }]));
  check("Rizartrose preservada", /Rizartrose\./.test(r), r);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
