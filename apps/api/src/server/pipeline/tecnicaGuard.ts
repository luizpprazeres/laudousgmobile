/**
 * W15 — ajuste determinístico da seção COMENTÁRIOS depois de qualquer caminho (renderer, writer, catálogo).
 * A frase padrão vem da tabela única (`@laudousg/schemes` tecnica); aqui só entra o que o médico DITOU:
 *
 * 1. documentação unificada ("que possuem várias metodologias"; sem "obtida em segundo");
 * 2. variantes antigas trocadas pela frase da casa (MSK "abrangendo a avaliação do {segmento}"; parede);
 * 3. via ditada na família obstétrica (TV, TA+TV) troca a frase da técnica — o título não muda
 *    (decisão do Luiz). Corrige os laudos com "transvaginal" ditado que saíam transabdominais;
 * 4. frequência do transdutor ditada ("transdutor de 9 MHz") troca só o número;
 * 5. contexto clínico ditado (idade de criança/recém-nascido, urgência, mama masculina, estudo
 *    comparativo) entra no FIM da seção, se ainda não estiver no laudo.
 *
 * Silêncio no ditado → só os itens 1 e 2. Estilo objetivo (TÉCNICA:) não é tocado.
 */
import {
  CATEGORIAS_VIA_SEM_TITULO,
  COMPLEMENTO_CERVICOMETRIA,
  COMPLEMENTO_DOPPLER_FETAL,
  DOCUMENTACAO_FOTOGRAFICA,
  MSK_TECNICA,
  PAREDE_TECNICA,
  contextoDoDitado,
  fraseTecnica,
  mhzDoDitado,
  viaDoDitado,
  viaDoTexto,
} from "@laudousg/schemes";

export type AjusteTecnica = { texto: string; trocas: string[] };

const RE_SECAO = /(COMENT[ÁA]RIOS\s*:[ \t]*\n(?:[ \t]*\n)*)([\s\S]*?)(?=\n[ \t]*\n|\n[ \t]*OS SEGUINTES ASPECTOS|\n[ \t]*ACHADOS\s*:|$)/;

const frasesDe = (p: string) => p.replace(/\.(?=[A-ZÁÉÍÓÚ])/g, ". ").split(/(?<=\.)\s+/).map((f) => f.trim()).filter(Boolean);

/** Frase da técnica (via/transdutor/cortes), em oposição a complementos, documentação e contexto. */
function ehFraseDeVia(f: string): boolean {
  if (f === COMPLEMENTO_CERVICOMETRIA || f === COMPLEMENTO_DOPPLER_FETAL) return false;
  if (/documenta[çc][ãa]o fotogr|cervicometria|Doppler/i.test(f)) return false;
  return /transdutor|Após a micção|múltiplos cortes|técnica trans|via trans/i.test(f);
}

function unificarDocumentacao(p: string): string {
  return p
    .replace(/(Serviços de Imagem)\s+que\s+(possu)/g, "$1, que $2")
    .replace(/que possui várias metodologias/g, "que possuem várias metodologias")
    .replace(/\bobtida\s+em\s+segundo\b/g, "obtida segundo");
}

function variantesAntigas(p: string, categoria: string): string {
  if (categoria === "MUSCULOESQUELETICO_V2") {
    // "Exame realizado com transdutor linear de alta frequência, abrangendo a avaliação do joelho direito." (+ cortes, se houver)
    return p.replace(
      /Exame realizado com transdutor linear de alta frequência(?: \(?12 MHz\)?)?, abrangendo a avaliação d[oa]s? [^.]+\.(?:\s*Foram realizados múltiplos cortes[^.]*\.)?(?:\s*Avaliação dinâmica quando aplicável\.)?/,
      MSK_TECNICA,
    );
  }
  if (categoria === "PAREDE_ABDOMINAL") {
    return p.replace(/Exame realizado com transdutor[^.]*parede abdominal[^.]*\./, PAREDE_TECNICA);
  }
  return p;
}

function trocarVia(p: string, categoria: string, ditado: string, trocas: string[]): string {
  if (!(CATEGORIAS_VIA_SEM_TITULO as readonly string[]).includes(categoria)) return p;
  const via = viaDoDitado(ditado);
  if (!via) return p;
  const atual = viaDoTexto(p);
  if (atual === via || atual === null) return p;
  const nova = fraseTecnica(categoria, via);
  if (!nova) return p;
  // Linha a linha: a técnica fica na linha em que está; as outras linhas (ex.: 1ª US) não mudam.
  const linhas = p.split("\n");
  const i = linhas.findIndex((l) => frasesDe(l).some(ehFraseDeVia));
  if (i < 0) return p;
  const frases = frasesDe(linhas[i]!);
  const primeira = frases.findIndex(ehFraseDeVia);
  const resto = frases.filter((f) => !ehFraseDeVia(f));
  resto.splice(primeira, 0, nova);
  linhas[i] = resto.join(" ");
  trocas.push(`via ${atual}→${via}`);
  return linhas.join("\n");
}

function trocarMhz(p: string, ditado: string, trocas: string[]): string {
  const mhz = mhzDoDitado(ditado);
  if (!mhz) return p;
  const ocorrencias = [...p.matchAll(/(?<![-\d.,])(\d{1,2}(?:[.,]\d)?)\s*MHz/g)];
  if (ocorrencias.length !== 1) return p; // TA+TV tem duas frequências: ambíguo, não mexe
  const atual = ocorrencias[0]![1]!;
  if (atual.replace(",", ".") === mhz) return p;
  trocas.push(`transdutor ${atual}→${mhz} MHz`);
  return p.replace(/(?<![-\d.,])(\d{1,2}(?:[.,]\d)?)(\s*MHz)/, `${mhz}$2`);
}

export function ajustarComentarios(laudo: string, args: { categoria: string | null | undefined; ditado: string | null | undefined }): AjusteTecnica {
  const trocas: string[] = [];
  const m = RE_SECAO.exec(laudo);
  if (!m) return { texto: laudo, trocas };
  const categoria = args.categoria ?? "";
  const ditado = args.ditado ?? "";
  const original = m[2]!;
  let p = original.replace(/\s+$/, "");

  let q = unificarDocumentacao(p);
  if (q !== p) trocas.push("documentação");
  p = q;
  q = variantesAntigas(p, categoria);
  if (q !== p) trocas.push("variante antiga");
  p = q;
  p = trocarVia(p, categoria, ditado, trocas);
  p = trocarMhz(p, ditado, trocas);

  for (const c of contextoDoDitado(ditado, categoria)) {
    if (c.chave.test(laudo) || c.chave.test(p)) continue;
    p = `${p}${/[.!?]$/.test(p) ? "" : "."} ${c.frase}`;
    trocas.push(`contexto: ${c.frase}`);
  }

  if (!trocas.length) return { texto: laudo, trocas };
  const fim = original.slice(original.replace(/\s+$/, "").length);
  return { texto: laudo.slice(0, m.index) + m[1] + p + fim + laudo.slice(m.index + m[0].length), trocas };
}

export { DOCUMENTACAO_FOTOGRAFICA };
