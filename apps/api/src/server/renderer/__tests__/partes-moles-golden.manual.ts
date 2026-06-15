/**
 * GOLDEN de render local de PARTES MOLES estilo CLÁSSICO. Determinístico (sem LLM):
 * renderPartesMoles(findings) → asserções de estrutura (cabeçalhos Clássico),
 * normal (silêncio → normalidade), e descrição+conclusão por tipo de lesão.
 * Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/partes-moles-golden.manual.ts
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

// ── Estrutura clássica (cabeçalhos) ──
{
  const l = renderPartesMoles(F({}));
  check("estrutura: título 'ULTRASSONOGRAFIA DE PARTES MOLES'", /^ULTRASSONOGRAFIA DE PARTES MOLES/.test(l), l);
  check("estrutura: cabeçalho 'COMENTÁRIOS:'", /\nCOMENTÁRIOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:'", /\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'CONCLUSÃO:'", /\nCONCLUSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do objetivo", !/TÉCNICA:|ACHADOS:|IMPRESSÃO:/.test(l), l);
  check("estrutura: transdutor de 12 MHz", /transdutor de 12 MHz/.test(l), l);
}

// ── Normal (silêncio → normalidade) ──
{
  const l = renderPartesMoles(F({}));
  check("normal: frase de planos normais", /Planos musculares e tecidos subcutâneos com ecogenicidade e ecotextura normais\./.test(l), l);
  check("normal: 'Não há evidência de coleção, massa ou alteração focal'", /Não há evidência de coleção, massa ou alteração focal\./.test(l), l);
  check("normal: conclusão 'Ausência de alterações detectáveis pelo método'", /Ausência de alterações detectáveis pelo método\./.test(l), l);
  // "coleção" aparece na frase normal fixa ("Não há evidência de coleção..."),
  // então checamos só descritores de LESÃO (que nunca aparecem no normal).
  check("normal: nenhuma lesão inventada", !/nodular|cística|herniação|corpo estranho|Linfonodo|esclarecer/i.test(l), l);
}

// ── Região ditada entra no COMENTÁRIOS ──
{
  const l = renderPartesMoles(F({ regiao: "antebraço direito" }));
  check("região: COMENTÁRIOS reflete região ditada", /abrangendo a região antebraço direito\./.test(l), l);
}

// ── Nódulo sólido (a esclarecer) ──
{
  const l = renderPartesMoles(
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
  check("nódulo: descrição 'Imagem nodular sólida, hipoecoica'", /Imagem nodular sólida, hipoecoica/.test(l), l);
  check("nódulo: contornos irregulares", /de contornos irregulares/.test(l), l);
  check("nódulo: medidas 1 casa decimal", /2,1 x 1,4 x 1,0 cm/.test(l), l);
  check("nódulo: plano muscular", /no plano muscular/.test(l), l);
  check("nódulo: fluxo ao Doppler", /com fluxo ao Doppler colorido/.test(l), l);
  check("nódulo: conclusão 'a esclarecer'", /Imagem nodular sólida na região da coxa esquerda, a esclarecer\. Correlacionar com dados clínicos\./.test(l), l);
}

// ── Lipoma ──
{
  const l = renderPartesMoles(
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
  check("lipoma: descrição 'Imagem nodular hiperecoica, homogênea'", /Imagem nodular hiperecoica, homogênea/.test(l), l);
  check("lipoma: subcutâneo", /no tecido celular subcutâneo/.test(l), l);
  check("lipoma: conclusão 'compatíveis com lipoma'", /Achados compatíveis com lipoma no dorso\./.test(l), l);
}

// ── Cisto ──
{
  const l = renderPartesMoles(
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
  check("cisto: descrição 'Imagem cística anecoica'", /Imagem cística anecoica/.test(l), l);
  check("cisto: conteúdo e paredes", /com finos ecos internos, de paredes finas/.test(l), l);
  check("cisto: conclusão cisto de inclusão epidérmica", /podendo corresponder a cisto de inclusão epidérmica/.test(l), l);
}

// ── Coleção (com natureza ditada) ──
{
  const l = renderPartesMoles(
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
  check("coleção: descrição 'Coleção com ecos internos'", /Coleção com ecos internos, de paredes espessas/.test(l), l);
  check("coleção: conclusão natureza ditada", /Coleção na região glútea direita, podendo corresponder a abscesso\./.test(l), l);
}

// ── Coleção sem natureza → 'a esclarecer' ──
{
  const l = renderPartesMoles(
    F({ lesoes: [Les({ tipo: "colecao", medidas_cm: [2.0, 1.0, 1.0], localizacao: "no antebraço" })] }),
  );
  check("coleção sem natureza: conclusão 'a esclarecer'", /Coleção no antebraço, a esclarecer\. Correlacionar com dados clínicos\./.test(l), l);
}

// ── Corpo estranho (medida única) ──
{
  const l = renderPartesMoles(
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
  check("corpo estranho: descrição 'linear hiperecoica com reverberação'", /Imagem linear hiperecoica com reverberação posterior/.test(l), l);
  check("corpo estranho: medida única 1,5 cm", /medindo aproximadamente 1,5 cm/.test(l), l);
  check("corpo estranho: conclusão 'compatível com corpo estranho'", /Imagem compatível com corpo estranho na região plantar do pé direito\./.test(l), l);
}

// ── Hérnia ──
{
  const l = renderPartesMoles(
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
  check("hérnia: descrição 'Solução de continuidade da aponeurose'", /Solução de continuidade da aponeurose na linha média infraumbilical/.test(l), l);
  check("hérnia: herniação de gordura", /com herniação de gordura/.test(l), l);
  check("hérnia: redutível", /redutível à compressão/.test(l), l);
  check("hérnia: conclusão 'Hérnia incisional'", /Hérnia incisional na linha média infraumbilical\./.test(l), l);
}

// ── Linfonodo ──
{
  const l = renderPartesMoles(
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
  check("linfonodo: descrição", /Linfonodo, de contornos regulares, medindo 1,0 x 0,6 x 0,4 cm/.test(l), l);
  check("linfonodo: conclusão", /Linfonodo na região inguinal direita\./.test(l), l);
}

// ── Múltiplas lesões → conclusão numerada ──
{
  const l = renderPartesMoles(
    F({
      lesoes: [
        Les({ tipo: "lipoma", ecogenicidade: "hiperecoica", medidas_cm: [2.0, 1.0, 0.5], localizacao: "no braço direito" }),
        Les({ tipo: "cisto", ecogenicidade: "anecoica", medidas_cm: [1.0, 0.8, 0.7], localizacao: "no braço esquerdo" }),
      ],
    }),
  );
  check("múltiplas: conclusão numerada '1.' e '2.'", /\n1\. /.test(l) && /\n2\. /.test(l), l);
}

// ── Achados adicionais ──
{
  const l = renderPartesMoles(F({ achados_adicionais: "Discreto edema difuso do subcutâneo." }));
  check("adicionais: aparece no corpo", /Discreto edema difuso do subcutâneo\./.test(l), l);
}

// ── Placeholder de medida ausente ──
{
  const l = renderPartesMoles(F({ lesoes: [Les({ tipo: "nodulo_solido", ecogenicidade: "hipoecoica" })] }));
  check("placeholder: '____ x ____ x ____ cm' quando sem medida", /____ x ____ x ____ cm/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
