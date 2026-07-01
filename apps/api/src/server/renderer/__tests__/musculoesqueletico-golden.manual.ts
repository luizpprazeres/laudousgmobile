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

type Alt = MusculoesqueleticoFindings["laudos"][number]["alteracoes"][number];
/** Helper: monta alteração (achado_tipo/descricao_livre com defaults). */
const alt = (
  estrutura: string,
  diagnostico_conclusao: string,
  opts: { achado_tipo?: string; descricao_livre?: string | null } = {},
): Alt => ({
  estrutura,
  achado_tipo: opts.achado_tipo ?? "outro",
  descricao_livre: opts.descricao_livre ?? null,
  diagnostico_conclusao,
});

// 1) Pé direito NORMAL: descreve estruturas no corpo + fechamento sintético na conclusão.
{
  const l = renderMusculoesqueletico(F([{ segmento: "pe", lado: "direito", alteracoes: [] }]));
  check("pé normal: título", /^ULTRASSONOGRAFIA DO PÉ DIREITO$/m.test(l), l);
  check("pé normal: corpo descreve fáscia plantar", /Fáscia plantar com espessura e ecotextura preservadas\./.test(l), l);
  check("pé normal: corpo descreve estruturas tendíneas", /Estruturas tendíneas avaliadas com espessura/.test(l), l);
  check("pé normal: conclusão sintética", /CONCLUSÃO:\nPé direito ecograficamente normal\.$/.test(l), l);
  check("pé normal: NÃO põe 'ecograficamente normal' no corpo", !/OBSERVADOS:[\s\S]*ecograficamente normal[\s\S]*CONCLUSÃO/.test(l), l);
}

// 2) Ombro com 2 alterações (morfologia DITADA): cobre normais + descreve + conclusão numerada.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "ombro", lado: "direito",
    alteracoes: [
      alt("supraespinhal", "Tendinopatia do tendão supraespinhal à direita.", { achado_tipo: "tendinopatia_supraespinhal", descricao_livre: "Tendão supraespinhal com aumento da espessura e alteração ecotextural, sem ruptura." }),
      alt("bursa", "Bursite subacromial-subdeltoidea à direita.", { achado_tipo: "bursite_subacromial", descricao_livre: "Espessamento da bursa subacromial-subdeltoidea." }),
    ],
  }]));
  check("ombro: descreve a alteração DITADA do supraespinhal", /Tendão supraespinhal com aumento da espessura/.test(l), l);
  check("ombro: cobre infraespinhal normal (não omitido)", /Tendão infraespinhal de espessura, continuidade e ecotextura preservadas\./.test(l), l);
  check("ombro: cobre subescapular normal", /Tendão subescapular de espessura/.test(l), l);
  check("ombro: conclusão numerada (2 itens)", /CONCLUSÃO:\n1\) Tendinopatia do tendão supraespinhal à direita\.\n2\) Bursite subacromial-subdeltoidea à direita\.$/.test(l), l);
  check("ombro: NÃO repete a descrição do corpo na conclusão", !/CONCLUSÃO:[\s\S]*aumento da espessura/.test(l), l);
}

// 3) Mão com tenossinovite de polia (1 alteração ditada) → conclusão sem numeração.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "mao", lado: "direito",
    alteracoes: [
      alt("polias", "Sinais de tenossinovite da polia A2 do 3º e 4º quirodáctilos direitos.", { descricao_livre: "Espessamento sinovial na topografia da polia A2 do 3º e 4º quirodáctilos, sem rotura tendínea associada." }),
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
      alt("polias", "Tenossinovite da polia a 2 à direita.", { descricao_livre: "Espessamento sinovial na polia a 2 dos Quirodáctilos." }),
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
      alt("acromioclavicular", "Sinais de artrose da articulação acromioclavicular.", { descricao_livre: "Irregularidade cortical." }),
    ],
  }]));
  check("artrose → alterações degenerativas", /alterações degenerativas da articulação acromioclavicular/.test(l) && !/\bartrose\b/.test(l), l);
  const r = renderMusculoesqueletico(F([{ segmento: "mao", lado: "direito", alteracoes: [alt("x", "Rizartrose.", { descricao_livre: "y" })] }]));
  check("Rizartrose preservada", /Rizartrose\./.test(r), r);
}

// 8) Tornozelo (antes sem roteiro): normal cobre estruturas; com coleção descreve + cobre.
{
  const norm = renderMusculoesqueletico(F([{ segmento: "tornozelo", lado: "esquerdo", alteracoes: [] }]));
  check("tornozelo normal: corpo NÃO vazio (cobre Aquiles)", /Tendão calcâneo \(de Aquiles\)/.test(norm), norm);
  check("tornozelo normal: corpo cobre recesso tibiotalar", /Recesso articular tibiotalar sem coleções ou derrame\./.test(norm), norm);
  check("tornozelo normal: conclusão sintética", /CONCLUSÃO:\nTornozelo esquerdo ecograficamente normal\.$/.test(norm), norm);

  const altr = renderMusculoesqueletico(F([{
    segmento: "tornozelo", lado: "direito",
    alteracoes: [alt("recesso", "Derrame articular no tornozelo direito.", { descricao_livre: "Pequena coleção líquida no recesso articular anterior do tornozelo." })],
  }]));
  check("tornozelo c/ coleção: descreve a alteração no recesso", /Pequena coleção líquida no recesso articular anterior/.test(altr), altr);
  check("tornozelo c/ coleção: ainda cobre Aquiles normal", /Tendão calcâneo \(de Aquiles\)/.test(altr), altr);
}

// ══════════ Biblioteca de morfologia canônica (ditado só-diagnóstico) ══════════

// 9) Joelho, SÓ-DIAGNÓSTICO "pata de ganso" → corpo canônico (NÃO ecoa o diagnóstico).
{
  const l = renderMusculoesqueletico(F([{
    segmento: "joelho", lado: "direito",
    alteracoes: [alt("pata_de_ganso", "Tendinopatia da pata de ganso à direita.", { achado_tipo: "tendinopatia_pata_de_ganso", descricao_livre: null })],
  }]));
  const corpo = l.split("OBSERVADOS:")[1]?.split("CONCLUSÃO")[0] ?? "";
  check("só-dx pata de ganso: corpo tem MORFOLOGIA canônica", /Tendões da pata de ganso \(grácil, sartório e semitendíneo\) com espessamento/.test(corpo), corpo);
  check("só-dx pata de ganso: corpo NÃO ecoa o diagnóstico", !/Tendinopatia da pata de ganso/.test(corpo), corpo);
  check("só-dx pata de ganso: conclusão tem o diagnóstico", /CONCLUSÃO:\nTendinopatia da pata de ganso à direita\.$/.test(l), l);
  check("só-dx pata de ganso: posição no roteiro (após patelar)", /Tendão patelar[^\n]*\.\nTendões da pata de ganso \(grácil/.test(l), l);
}

// 10) Pé, SÓ-DIAGNÓSTICO "fasciite plantar" → corpo canônico.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "pe", lado: "esquerdo",
    alteracoes: [alt("fascia_plantar", "Fasciite plantar à esquerda.", { achado_tipo: "fasciite_plantar", descricao_livre: null })],
  }]));
  const corpo = l.split("OBSERVADOS:")[1]?.split("CONCLUSÃO")[0] ?? "";
  check("só-dx fasciite: corpo tem morfologia canônica", /Fáscia plantar espessada na sua origem calcânea/.test(corpo), corpo);
  check("só-dx fasciite: corpo NÃO ecoa 'Fasciite plantar'", !/Fasciite plantar/i.test(corpo), corpo);
  check("só-dx fasciite: conclusão correta", /CONCLUSÃO:\nFasciite plantar à esquerda\.$/.test(l), l);
}

// 11) ADVERSARIAL: morfologia DITADA tem prioridade sobre a canônica (não sobrescreve).
{
  const l = renderMusculoesqueletico(F([{
    segmento: "joelho", lado: "direito",
    alteracoes: [alt("pata_de_ganso", "Tendinopatia da pata de ganso à direita.", { achado_tipo: "tendinopatia_pata_de_ganso", descricao_livre: "Tendões da pata de ganso com pequena área focal de espessamento junto à inserção." })],
  }]));
  const corpo = l.split("OBSERVADOS:")[1]?.split("CONCLUSÃO")[0] ?? "";
  check("adversarial: usa a morfologia DITADA", /pequena área focal de espessamento/.test(corpo), corpo);
  check("adversarial: NÃO usa a canônica genérica", !/grácil, sartório e semitendíneo/.test(corpo), corpo);
}

// 12) Achado FORA da biblioteca ("outro") + sem morfologia → frase NEUTRA (não ecoa dx).
{
  const l = renderMusculoesqueletico(F([{
    segmento: "joelho", lado: "direito",
    alteracoes: [alt("partes_moles", "Lesão inespecífica no subcutâneo à direita.", { achado_tipo: "outro", descricao_livre: null })],
  }]));
  const corpo = l.split("OBSERVADOS:")[1]?.split("CONCLUSÃO")[0] ?? "";
  check("outro sem morfologia: corpo usa frase neutra", /Alteração ecográfica na topografia avaliada, detalhada na conclusão\./.test(corpo), corpo);
  check("outro sem morfologia: corpo NÃO ecoa o diagnóstico", !/Lesão inespecífica/.test(corpo), corpo);
  check("outro sem morfologia: conclusão mantém o diagnóstico", /CONCLUSÃO:\nLesão inespecífica no subcutâneo à direita\.$/.test(l), l);
}

// 13) GUARD (dex1): slug INCOMPATÍVEL com a estrutura → NÃO injeta a morfologia errada.
{
  const l = renderMusculoesqueletico(F([{
    segmento: "joelho", lado: "direito",
    alteracoes: [alt("pata_de_ganso", "Tendinopatia da pata de ganso à direita.", { achado_tipo: "tendinopatia_patelar", descricao_livre: null })],
  }]));
  const corpo = l.split("OBSERVADOS:")[1]?.split("CONCLUSÃO")[0] ?? "";
  check("guard: NÃO injeta morfologia do patelar na linha da pata de ganso", !/polo inferior da patela/.test(corpo), corpo);
  check("guard: usa frase neutra p/ slug incompatível", /Alteração ecográfica na topografia avaliada/.test(corpo), corpo);
  check("guard: conclusão intacta (do LLM)", /CONCLUSÃO:\nTendinopatia da pata de ganso à direita\.$/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
