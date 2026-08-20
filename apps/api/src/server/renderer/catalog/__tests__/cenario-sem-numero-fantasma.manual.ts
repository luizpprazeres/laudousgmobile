/**
 * UM CENÁRIO NÃO CARREGA NÚMERO — o gate.
 *
 * ## O defeito que ele existe para impedir
 *
 * Um `AlteracaoSpec` descreve um achado clínico. Para o renderer ter o que
 * escrever, foi natural preencher medidas plausíveis no cenário — "1,3 x 1,0 x
 * 1,2 cm", "no terço superior". Elas pareciam inofensivas porque a PRÉVIA as
 * esconde: `previaDaAlteracao` renderiza duas vezes com seeds diferentes e troca
 * por `____` tudo o que variar entre os dois.
 *
 * No laudo REAL não há segundo render nem máscara. Quando chegam `dados` do
 * médico, o que ele não sobrescreveu sai **como está**. Bastava clicar um
 * achado e não digitar o tamanho para o laudo afirmar uma medida que ninguém
 * mediu — dentro de um documento clínico assinado. (Reproduzido pelo Codex em
 * 20/08 na TIREOIDE; as três categorias curadas tinham o mesmo padrão.)
 *
 * ## A regra
 *
 * O seed de um cenário declara **o achado**, nunca **a medida dele**. O que
 * falta, o renderer imprime como `____`, que é o comportamento correto para
 * dado ausente. Consequência aceita: um escore que depende do tamanho
 * (Domingos, O-RADS) sai mais baixo na prévia e sobe quando o médico mede.
 * Isso é honesto — inventar um tamanho para exibir um escore "cheio" é
 * exatamente o que produzia o laudo falso.
 *
 * ## Como este gate testa
 *
 * Ele não lê o código: **renderiza**. Para cada cenário de cada categoria,
 * monta o laudo REAL (com `dados` mínimos, para sair do caminho mascarado) e
 * procura no texto os números literais que o próprio seed carrega. Se um deles
 * aparece, é um número fabricado impresso como fato.
 */

import { alteracoesDe, categoriasComAlteracoes } from "../alteracoes/index";
import { laudoPadraoDe } from "../modeloNormalRegistry";

/**
 * Os TEXTOS do seed que aparecem verbatim no laudo, e que são dado de exame.
 *
 * Número não é a única coisa que se fabrica — foi o furo que o Codex apontou
 * neste gate em 20/08. A MAMÁRIA cravava `horario: "10 horas"` e
 * `localizacao: "no quadrante superior lateral"` em cenários que não tratam de
 * posição, e a PELVE cravava `parede: "parede anterior"`. Um horário é
 * exatamente ONDE a lesão está; um laudo que o afirma sem o médico ter dito
 * inventa a topografia do achado.
 *
 * Nem todo verbatim é fabricação: `ecotextura_alterada` da tireoidite é a
 * própria descrição do achado, e ela DEVE sair no texto. Por isso a exceção é
 * uma lista nomeada — cada uma é uma decisão registrada, não um silêncio.
 */
/**
 * Os campos que dizem ONDE o achado está. Isto é exame, nunca cenário.
 *
 * Um cenário chamado "cisto simples" não sabe em que quadrante, em que horário
 * nem em que parede o cisto está — quem sabe é quem fez o exame. Um `lado`
 * pode ser do cenário quando o próprio nome o declara ("cisto no ovário
 * direito"), e por isso a lista abaixo é conferida contra o id.
 */
const CAMPOS_DE_TOPOGRAFIA = new Set([
  "localizacao", "horario", "quadrante", "parede", "posicao", "topografia", "distancia_pele_cm",
]);

/**
 * `lado` é o caso de fronteira: às vezes é o cenário, às vezes é fabricação.
 *
 * "Cisto no ovário direito" declara o lado no próprio nome — ali o lado É o
 * cenário. Já "Cisto simples" não sabe de que mama se trata, e a MAMÁRIA
 * cravava `lado: "direita"` como DEFAULT do helper de achado: todos os cenários
 * saíam à direita, inclusive os que não tratam de lateralidade. (Achado do
 * Codex, 20/08 — meu filtro deixara passar porque exigia espaço no texto e
 * "direita" não tem.)
 *
 * A conferência é contra o id e o nome do cenário: se ele não declara o lado, o
 * lado é do exame.
 */
const CAMPOS_DE_LATERALIDADE = new Set(["lado", "lateralidade"]);

function cenarioDeclaraOLado(spec: { id: string; nome: string }, lado: string): boolean {
  const alvo = `${spec.id} ${spec.nome}`.toLowerCase();
  const raiz = lado.toLowerCase().replace(/[oa]$/, "");
  return alvo.includes(raiz) || alvo.includes("bilateral");
}

/** Um texto do seed, com o caminho onde ele mora — é o caminho que classifica. */
function textosDoSeed(
  v: unknown,
  prefixo = "",
  out: { caminho: string; campo: string; valor: string }[] = [],
): { caminho: string; campo: string; valor: string }[] {
  if (typeof v === "string") {
    const partes = prefixo.split(".");
    out.push({ caminho: prefixo, campo: partes[partes.length - 1] ?? "", valor: v });
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => textosDoSeed(x, `${prefixo}.${i}`, out));
  } else if (typeof v === "object" && v !== null) {
    for (const [k, x] of Object.entries(v)) textosDoSeed(x, prefixo === "" ? k : `${prefixo}.${k}`, out);
  }
  return out;
}

/** Os números literais que este seed carrega, em qualquer profundidade. */
function numerosDoSeed(v: unknown, out: number[] = []): number[] {
  if (typeof v === "number") out.push(v);
  else if (Array.isArray(v)) for (const x of v) numerosDoSeed(x, out);
  else if (typeof v === "object" && v !== null) for (const x of Object.values(v)) numerosDoSeed(x, out);
  return out;
}

/**
 * Como o número apareceria no laudo em pt-BR.
 *
 * O renderer imprime `1.3` como `1,3` e `5.0` ora como `5` (clássico), ora como
 * `5,0` (objetivo). Procurar as duas formas evita o falso verde de um gate que
 * só conhece uma delas.
 */
function formasNoTexto(n: number): string[] {
  const formas = [n.toFixed(1).replace(".", ","), String(n).replace(".", ",")];
  /**
   * E em MILÍMETROS. Alguns renderers recebem cm e imprimem mm (`× 10`), e um
   * gate que só procura a forma em cm dá verde num laudo que estampa o número
   * fabricado com outra unidade — o falso verde que o Codex previu.
   */
  const mm = n * 10;
  if (Number.isInteger(mm) && mm >= 2) formas.push(String(mm));
  return Array.from(new Set(formas));
}

/**
 * Números que NÃO acusam nada.
 *
 * `0` e `1` aparecem em numeração de itens, em "I a V" e em datas do rodapé;
 * procurá-los daria falso positivo em todo laudo. Um cenário que dependa de
 * distinguir "1" de outro "1" no texto precisa de outro tipo de prova.
 */
const IGNORADOS = new Set([0, 1]);

const ESTILOS = ["CLASSICO_COMPLETO", "OBJETIVO"];

let vazamentos = 0;
let conferidos = 0;
const dividas: string[] = [];
const naoRenderizaram: string[] = [];
const porCategoria = new Map<string, string[]>();

console.log("\n" + "═".repeat(74));
console.log("UM CENÁRIO NÃO CARREGA DADO DE EXAME — nada fabricado em laudo real");
console.log("═".repeat(74));

for (const categoria of categoriasComAlteracoes()) {
  const achados: string[] = [];

  for (const spec of alteracoesDe(categoria)) {
    const numeros = numerosDoSeed(spec.seed).filter((n) => !IGNORADOS.has(n));

    for (const estilo of ESTILOS) {
      if (spec.estilos && !spec.estilos.includes(estilo)) continue;

      /**
       * Renderiza pelo caminho do LAUDO REAL, direto — sem passar por
       * `renderizarSelecao`.
       *
       * Dois motivos. O primeiro é que a prévia MASCARA (renderiza duas vezes e
       * troca o que varia por `____`), e é justamente no laudo real que o
       * número do cenário vaza. O segundo é que `renderizarSelecao` aplica as
       * regras de SELEÇÃO — recusa preset, recusa estilo incompatível —, e este
       * gate não pergunta se o cenário pode ser selecionado: pergunta se o
       * TEXTO que ele produz contém dado que ninguém mediu. Um preset também
       * precisa dessa conferência, e passá-lo por `renderizarSelecao` o faria
       * sumir do gate em silêncio.
       */
      const texto = laudoPadraoDe(categoria, estilo, spec.seed);
      const r = texto === null ? ({ ok: false } as const) : ({ ok: true, texto } as const);
      if (!r.ok) {
        /**
         * Cenário que NÃO renderiza não é um cenário conferido — é um cenário
         * ausente, e um gate que o pula em silêncio dá verde por não ter o que
         * reprovar. Aconteceu nesta sessão: uma flag lida pelo `env()` validado
         * fez a TIREOIDE inteira desaparecer, e este gate imprimiu
         * "✓ TIREOIDE — nenhum dado de exame do cenário no laudo".
         */
        naoRenderizaram.push(`${categoria} · ${spec.id} · ${estilo}`);
        continue;
      }

      conferidos += 1;

      for (const { campo, valor } of textosDoSeed(spec.seed)) {
        /**
         * Só textos que PARECEM prosa. Os enums do seed (`hipoecoica`,
         * `mais_alta_que_larga`) são chaves que o renderer traduz; procurá-los
         * no texto acusaria a tradução legítima do cenário.
         */
        const ehLateralidade = CAMPOS_DE_LATERALIDADE.has(campo);
        /**
         * Prosa ou lateralidade. Os enums do seed (`hipoecoica`,
         * `mais_alta_que_larga`) são chaves que o renderer traduz; procurá-los
         * no texto acusaria a tradução legítima do cenário.
         */
        if (!valor.includes(" ") && !ehLateralidade) continue;
        if (!r.texto.includes(valor)) continue;

        if (ehLateralidade) {
          if (cenarioDeclaraOLado(spec, valor)) continue;
          achados.push(`${spec.id} · ${estilo} · lateralidade fabricada — ${campo}: "${valor}"`);
          vazamentos += 1;
        } else if (CAMPOS_DE_TOPOGRAFIA.has(campo)) {
          /** ONDE o achado está é exame. Isto é falha. */
          achados.push(`${spec.id} · ${estilo} · topografia fabricada — ${campo}: "${valor}"`);
          vazamentos += 1;
        } else {
          /**
           * REDAÇÃO CLÍNICA no cenário — dívida, não falha.
           *
           * É o mesmo defeito estrutural que o `tireoidite_tipo` (D1) resolve na
           * tireoide: o renderer só tem um campo verbatim para o achado, então o
           * cenário precisa escrever a frase. Isso é a "quarta cópia do texto
           * clínico" que a doutrina do catálogo proíbe, e a correção é dar ao
           * renderer um campo ESTRUTURADO — não apagar a frase, que deixaria o
           * cenário sem achado nenhum.
           *
           * Fica listado e contado, para a dívida encolher em vez de sumir.
           */
          dividas.push(`${categoria} · ${spec.id} · ${campo}`);
        }
      }

      for (const n of numeros) {
        for (const forma of formasNoTexto(n)) {
          /**
           * Fronteira de palavra à esquerda e nada de dígito à direita: sem
           * isso, procurar "1,4" casaria dentro de "11,4" e acusaria um total
           * calculado como se fosse número do seed.
           */
          const re = new RegExp(`(^|[^\\d,])${forma.replace(",", "[,.]")}(?![\\d])`);
          if (re.test(r.texto)) {
            const linha = r.texto.split("\n").find((l) => re.test(l))?.trim() ?? "";
            achados.push(`${spec.id} · ${estilo} · ${forma} → ${linha.slice(0, 110)}`);
            vazamentos += 1;
            break;
          }
        }
      }
    }
  }

  porCategoria.set(categoria, achados);
}

for (const [categoria, achados] of porCategoria) {
  if (achados.length === 0) {
    console.log(`\n  ✓ ${categoria} — nenhum dado de exame do cenário no laudo`);
    continue;
  }
  console.log(`\n  ✗ ${categoria} — ${achados.length} dado(s) de exame fabricado(s):`);
  for (const a of achados) console.log(`      ${a}`);
}

if (naoRenderizaram.length > 0) {
  console.log(`\n  ✗ ${naoRenderizaram.length} cenário(s) NÃO RENDERIZARAM — não foram conferidos:`);
  for (const n of naoRenderizaram) console.log(`      ${n}`);
  console.log("     Um cenário ausente não é um cenário aprovado.");
}

const dividasUnicas = Array.from(new Set(dividas)).sort();
if (dividasUnicas.length > 0) {
  console.log(`\n  ⏸ DÍVIDA — ${dividasUnicas.length} cenário(s) que escrevem REDAÇÃO CLÍNICA:`);
  console.log("     o renderer só tem campo verbatim para o achado; a correção é campo");
  console.log("     estruturado, como o tireoidite_tipo faz na tireoide (D1).");
  for (const d of dividasUnicas) console.log(`      ${d}`);
}

console.log("\n" + "═".repeat(74));
if (vazamentos === 0 && naoRenderizaram.length === 0) {
  console.log(`✓ ${conferidos} renderizações · nenhum dado de exame fabricado · ${dividasUnicas.length} dívida(s) de redação`);
} else {
  console.log(`✗ ${vazamentos} vazamento(s) e ${naoRenderizaram.length} não-render em ${conferidos} renderizações`);
  console.log("  Corrija tirando o dado do seed: o que falta o renderer imprime como ____.");
}
console.log("═".repeat(74) + "\n");

process.exit(vazamentos === 0 && naoRenderizaram.length === 0 ? 0 : 1);
