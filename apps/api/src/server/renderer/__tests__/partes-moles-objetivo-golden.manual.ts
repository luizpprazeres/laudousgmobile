/**
 * GOLDEN do render PARTES MOLES estilo OBJETIVO. Determinístico (sem LLM):
 * renderPartesMoles(f, { objetivo: true }) → asserções de estrutura
 * (TÉCNICA/ACHADOS/IMPRESSÃO), normal (silêncio → normalidade), e a MESMA
 * descrição+conclusão por tipo de lesão do clássico (reuso de descreveLesao/
 * concluiLesao). Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/partes-moles-objetivo-golden.manual.ts
 */
import {
  renderPartesMoles,
  type PartesMolesFindings,
  type PartesMolesLesao,
} from "../categories/PARTES_MOLES";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

// Fábricas de fixtures.
const F = (p: Partial<PartesMolesFindings>): PartesMolesFindings => ({
  regiao: null,
  lesoes: [],
  achados_adicionais: null,
  ...p,
});
const Les = (p: Partial<PartesMolesLesao> & { tipo: PartesMolesLesao["tipo"] }): PartesMolesLesao => ({
  ecogenicidade: null,
  contornos: null,
  plano: null,
  doppler: null,
  conteudo: null,
  paredes: null,
  reducao: null,
  conteudo_hernia: null,
  parede_hernia: null,
  tipo_hernia: null,
  natureza_colecao: null,
  medidas_cm: null,
  localizacao: null,
  descricao_raw: null,
  ...p,
});

const render = (f: PartesMolesFindings) => renderPartesMoles(f, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos) + normal ──
{
  const l = render(F({}));
  check("estrutura: título 'ULTRASSONOGRAFIA DE PARTES MOLES'", /^ULTRASSONOGRAFIA DE PARTES MOLES/.test(l), l);
  check("estrutura: cabeçalho 'TÉCNICA:'", /\nTÉCNICA:\n/.test(l), l);
  check("estrutura: cabeçalho 'ACHADOS:'", /\nACHADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'IMPRESSÃO:'", /\nIMPRESSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("estrutura: transdutor linear de alta frequência", /transdutor linear de alta frequência/.test(l), l);
}

// ── Normal (silêncio → normalidade) ──
{
  const l = render(F({}));
  check("normal: pele/subcutâneo preservados", /Pele e tecido celular subcutâneo de espessura e ecogenicidade preservadas\./.test(l), l);
  check("normal: planos musculares sem alterações", /Planos musculares sem alterações significativas\./.test(l), l);
  check("normal: sem coleções organizadas", /Não foram caracterizadas coleções organizadas\./.test(l), l);
  check("normal: impressão 'Exame sem alterações significativas'", /Exame sem alterações significativas\./.test(l), l);
  check("normal: nenhuma lesão inventada", !/nodular|cística|herniação|corpo estranho|Linfonodo|esclarecer/i.test(l), l);
}

// ── Nódulo sólido (a esclarecer) — reuso da lógica do clássico ──
{
  const l = render(
    F({
      regiao: "coxa esquerda",
      lesoes: [
        Les({
          tipo: "nodulo_solido",
          ecogenicidade: "hipoecoica",
          contornos: "irregulares",
          plano: "muscular",
          doppler: "com_fluxo",
          medidas_cm: [2.1, 1.4, 1.0],
          localizacao: "na região da coxa esquerda",
        }),
      ],
    }),
  );
  check("nódulo: ACHADOS 'Imagem nodular sólida, hipoecoica'", /Imagem nodular sólida, hipoecoica/.test(l), l);
  check("nódulo: contornos irregulares", /de contornos irregulares/.test(l), l);
  check("nódulo: medidas 1 casa decimal", /2,1 x 1,4 x 1,0 cm/.test(l), l);
  check("nódulo: plano muscular + Doppler", /no plano muscular/.test(l) && /com fluxo ao Doppler colorido/.test(l), l);
  check("nódulo: IMPRESSÃO 'a esclarecer'", /Imagem nodular sólida na região da coxa esquerda, a esclarecer\. Correlacionar com dados clínicos\./.test(l), l);
}

// ── Lipoma ──
{
  const l = render(
    F({
      lesoes: [
        Les({
          tipo: "lipoma",
          ecogenicidade: "hiperecoica",
          contornos: "regulares",
          plano: "subcutaneo",
          medidas_cm: [3.0, 1.5, 0.8],
          localizacao: "no dorso",
        }),
      ],
    }),
  );
  check("lipoma: ACHADOS 'Imagem nodular hiperecoica, homogênea'", /Imagem nodular hiperecoica, homogênea/.test(l), l);
  check("lipoma: subcutâneo", /no tecido celular subcutâneo/.test(l), l);
  check("lipoma: IMPRESSÃO 'compatíveis com lipoma'", /Achados compatíveis com lipoma no dorso\./.test(l), l);
}

// ── Cisto ──
{
  const l = render(
    F({
      lesoes: [
        Les({
          tipo: "cisto",
          ecogenicidade: "anecoica",
          conteudo: "com finos ecos internos",
          paredes: "de paredes finas",
          medidas_cm: [1.2, 1.0, 0.9],
          localizacao: "na região cervical posterior",
        }),
      ],
    }),
  );
  check("cisto: ACHADOS 'Imagem cística anecoica'", /Imagem cística anecoica/.test(l), l);
  check("cisto: conteúdo e paredes", /com finos ecos internos, de paredes finas/.test(l), l);
  check("cisto: IMPRESSÃO cisto de inclusão epidérmica", /podendo corresponder a cisto de inclusão epidérmica/.test(l), l);
}

// ── Coleção (com natureza ditada) ──
{
  const l = render(
    F({
      lesoes: [
        Les({
          tipo: "colecao",
          conteudo: "com ecos internos",
          paredes: "de paredes espessas",
          natureza_colecao: "abscesso",
          medidas_cm: [4.0, 2.5, 2.0],
          localizacao: "na região glútea direita",
        }),
      ],
    }),
  );
  check("coleção: ACHADOS 'Coleção com ecos internos'", /Coleção com ecos internos, de paredes espessas/.test(l), l);
  check("coleção: IMPRESSÃO natureza ditada", /Coleção na região glútea direita, podendo corresponder a abscesso\./.test(l), l);
}

// ── Hérnia ──
{
  const l = render(
    F({
      lesoes: [
        Les({
          tipo: "hernia",
          parede_hernia: "aponeurose",
          conteudo_hernia: "gordura",
          reducao: "redutível à compressão",
          tipo_hernia: "incisional",
          medidas_cm: [1.8],
          localizacao: "na linha média infraumbilical",
        }),
      ],
    }),
  );
  check("hérnia: ACHADOS 'Solução de continuidade da aponeurose'", /Solução de continuidade da aponeurose na linha média infraumbilical/.test(l), l);
  check("hérnia: herniação de gordura + redutível", /com herniação de gordura/.test(l) && /redutível à compressão/.test(l), l);
  check("hérnia: IMPRESSÃO 'Hérnia incisional'", /Hérnia incisional na linha média infraumbilical\./.test(l), l);
}

// ── Corpo estranho (medida única) ──
{
  const l = render(
    F({
      lesoes: [
        Les({
          tipo: "corpo_estranho",
          plano: "subcutaneo",
          medidas_cm: [1.5],
          localizacao: "na região plantar do pé direito",
        }),
      ],
    }),
  );
  check("corpo estranho: ACHADOS 'linear hiperecoica com reverberação'", /Imagem linear hiperecoica com reverberação posterior/.test(l), l);
  check("corpo estranho: medida única 1,5 cm", /medindo aproximadamente 1,5 cm/.test(l), l);
  check("corpo estranho: IMPRESSÃO 'compatível com corpo estranho'", /Imagem compatível com corpo estranho na região plantar do pé direito\./.test(l), l);
}

// ── Linfonodo ──
{
  const l = render(
    F({
      lesoes: [
        Les({
          tipo: "linfonodo",
          contornos: "regulares",
          medidas_cm: [1.0, 0.6, 0.4],
          localizacao: "na região inguinal direita",
        }),
      ],
    }),
  );
  check("linfonodo: ACHADOS descrição", /Linfonodo, de contornos regulares, medindo 1,0 x 0,6 x 0,4 cm/.test(l), l);
  check("linfonodo: IMPRESSÃO", /Linfonodo na região inguinal direita\./.test(l), l);
}

// ── Múltiplas lesões → IMPRESSÃO numerada ──
{
  const l = render(
    F({
      lesoes: [
        Les({ tipo: "lipoma", ecogenicidade: "hiperecoica", medidas_cm: [2.0, 1.0, 0.5], localizacao: "no braço direito" }),
        Les({ tipo: "cisto", ecogenicidade: "anecoica", medidas_cm: [1.0, 0.8, 0.7], localizacao: "no braço esquerdo" }),
      ],
    }),
  );
  check("múltiplas: IMPRESSÃO numerada '1.' e '2.'", /\n1\. /.test(l) && /\n2\. /.test(l), l);
}

// ── Achados adicionais ──
{
  const l = render(F({ achados_adicionais: "Discreto edema difuso do subcutâneo." }));
  check("adicionais: aparece no ACHADOS", /Discreto edema difuso do subcutâneo\./.test(l), l);
}

// ── Placeholder de medida ausente ──
{
  const l = render(F({ lesoes: [Les({ tipo: "nodulo_solido", ecogenicidade: "hipoecoica" })] }));
  check("placeholder: '____ x ____ x ____ cm' quando sem medida", /____ x ____ x ____ cm/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
