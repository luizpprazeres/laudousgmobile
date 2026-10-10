/**
 * "Correlacionar com dados clínicos" — decisão do Luiz de 10/10/2026: só quando o médico DITAR, na redação dele,
 * em todas as categorias e superfícies. Este módulo reconhece a correlação clínica GENÉRICA (dados, achados,
 * critérios, quadro, queixa ou história clínica; "correlação clínica"; "clinicamente") — não as condutas
 * específicas ("correlacionar com as dosagens de TSH", "com PSA e avaliação urológica", "com a US precoce").
 *
 * Histórico (365 dias, `scripts/bench-haiku/correlacionar-historico.ts`): 32 gerados com a frase, 31 sem pedido
 * no ditado e 1 final assinado que a manteve; o inverso também acontecia (ditado com a frase e renderer sem ela).
 * Por isso o guard da rota faz os dois lados: tira quando não ditada e garante quando ditada.
 */

const ALVO = String.raw`(?:(?:os|as|o|a)\s+)?(?:demais\s+)?(?:(?:dados|achados|aspectos|informa[çc][õo]es|crit[ée]rios|quadro|queixas?|hist[óo]ria|contexto)\s+)?cl[íi]nic(?:o[-\s]laboratorial|[oa]s?)(?:\s+e\s+laboratoriais)?`;

/** Correlação clínica genérica, em qualquer das formas que o sistema e o modelo escreviam. */
export const CORRELACAO_CLINICA_RE = new RegExp(
  String.raw`\b(?:a\s+)?correlacion(?:ar|e|ad[oa])\s+(?:com\s+${ALVO}|clinicamente|cl[íi]nica)(?![\p{L}-])|\bcorrela[çc][ãa]o\s+(?:cl[íi]nic(?:o[-\s]laboratorial|[ao])|com\s+${ALVO})(?![\p{L}-])`,
  "iu",
);

/** "Correlação clínica: <contexto ditado>" (rótulo da pelve) é conteúdo do médico, não a frase automática. */
const ROTULO_RE = /correla[çc][ãa]o\s+cl[íi]nica\s*:/iu;

/** O médico ditou (ou pediu) a correlação clínica? */
export function correlacaoDitada(ditado: string | null | undefined): boolean {
  return !!ditado && CORRELACAO_CLINICA_RE.test(ditado);
}

/** Frase que é só conduta/recomendação (sai inteira). */
const CONDUTA_RE =
  /^\s*(?:conv[ée]m|recomend|suger|sugest|o\s+diagn[óo]stico\s+definitivo|(?:[ée]\s+|sendo\s+)?fundamental|necess[áa]ri|a\s+correlacionar|correla)/iu;
/** Separador antes de uma correlação colada ao achado: "…, a correlacionar …", "…; correlacionar …". */
const COLADA_RE = /\s*(?:[,;]|\s[—–-])\s*(?:(?:a|e|sugerindo|devendo\s+ser|podendo\s+ser)\s+)?$/iu;
const ITEM_RE = /^(\s*)(\d+)(\s*[).-]\s*)/;

/** As palavras de conteúdo do trecho (4+ letras) estão, na maioria, no ditado? */
function veioDoDitado(trecho: string, ditado: string): boolean {
  const norm = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const palavras = norm(trecho).match(/\p{L}{4,}/gu) ?? [];
  if (palavras.length < 2) return false;
  const d = norm(ditado);
  return palavras.filter((p) => d.includes(p)).length / palavras.length >= 0.6;
}

/** Tira a correlação de uma linha; devolve null se a linha ficar vazia. */
function limparLinha(linha: string, ditado: string): string | null {
  // Número de item ("2) ") ou marcador de lista ("- ") ficam fora das frases.
  const prefixo = /^\s*(?:\d+\s*[).-]\s*|[-•*]\s+)?/u.exec(linha)?.[0] ?? "";
  const corpo = linha.slice(prefixo.length);
  const frases = corpo.split(/(?<=[.!?])\s+(?=\S)/u);
  const fica: string[] = [];
  for (const f of frases) {
    const m = CORRELACAO_CLINICA_RE.exec(f);
    if (!m || ROTULO_RE.test(f)) {
      fica.push(f);
      continue;
    }
    const antes = f.slice(0, m.index);
    const depois = f.slice(m.index + m[0].length);
    // Coordenada com outra conduta ("Convém correlação clínica e complementar com X"; "… X e correlação
    // clínica."): sai só a correlação — o resto pode ter sido ditado.
    const e = /^\s*,?\s*e\s+/u.exec(depois);
    const resto = e ? depois.slice(e[0].length) : "";
    if (e && (/^\p{L}+(?:ar|er|ir)\b/u.test(resto) || veioDoDitado(resto, ditado))) {
      fica.push(limparLinha(`${antes}${resto}`, ditado) ?? "");
      continue;
    }
    if (/\s+e\s+(?:a\s+)?$/u.test(antes) && antes.trim().split(/\s+/).length >= 3) {
      fica.push(`${antes.replace(/\s+e\s+(?:a\s+)?$/u, "")}${depois}`);
      continue;
    }
    if (antes.trim() === "" || CONDUTA_RE.test(f)) continue; // só conduta: sai inteira
    if (COLADA_RE.test(antes)) {
      fica.push(`${antes.replace(COLADA_RE, "").trimEnd()}.`); // colada ao achado: sai a cláusula
      continue;
    }
    fica.push(f); // no meio da frase, sem separador: não mexe
  }
  const novo = fica.join(" ").trim();
  return novo ? prefixo + novo : null;
}

/** Remove a correlação clínica genérica que o médico NÃO ditou (renumera a conclusão se um item sumir). */
export function removerCorrelacaoNaoDitada(texto: string, ditado: string | null | undefined): string {
  if (correlacaoDitada(ditado) || !CORRELACAO_CLINICA_RE.test(texto)) return texto;
  const saida: string[] = [];
  let removeuItem = false;
  for (const linha of texto.split("\n")) {
    if (!CORRELACAO_CLINICA_RE.test(linha)) {
      saida.push(linha);
      continue;
    }
    const nova = limparLinha(linha, ditado ?? "");
    if (nova === null) {
      if (ITEM_RE.test(linha)) removeuItem = true;
      continue;
    }
    saida.push(nova);
  }
  let out = saida.join("\n").replace(/\n{3,}/g, "\n\n");
  if (removeuItem) out = renumerarConclusoes(out);
  return texto === texto.trimEnd() ? out.trimEnd() : out;
}

/** Renumera os itens de cada conclusão; item único fica sem número (regra da casa). */
function renumerarConclusoes(texto: string): string {
  const linhas = texto.split("\n");
  let i = 0;
  while (i < linhas.length) {
    if (!/^\s*(?:CONCLUS[ÃA]O|IMPRESS[ÃA]O)\s*:?\s*$/iu.test(linhas[i]!)) {
      i++;
      continue;
    }
    const itens: number[] = [];
    let j = i + 1;
    for (; j < linhas.length; j++) {
      const l = linhas[j]!;
      if (/^\s*ULTRASSONOGRAFIA\b/.test(l) && l === l.toUpperCase()) break;
      if (ITEM_RE.test(l)) itens.push(j);
    }
    itens.forEach((k, n) => {
      linhas[k] = linhas[k]!.replace(ITEM_RE, (_m, esp: string, _num: string, sep: string) =>
        itens.length === 1 ? esp : `${esp}${n + 1}${sep}`,
      );
    });
    i = j;
  }
  return linhas.join("\n");
}

/** A frase de correlação como o médico a ditou ("correlacione com…" vira "Correlacionar com…"). */
export function fraseDitada(ditado: string): string | null {
  const m = CORRELACAO_CLINICA_RE.exec(ditado);
  if (!m) return null;
  // Início da frase: depois do último ponto (não decimal), ";", quebra ou "na conclusão".
  const antes = ditado.slice(0, m.index);
  const corte = Math.max(
    ...[...antes.matchAll(/(?:\.(?!\d)|[;\n]|\bna\s+conclus[ãa]o\s*[,:]?)\s*/giu)].map((x) => (x.index ?? 0) + x[0].length),
    0,
  );
  const frase = ditado.slice(corte, m.index);
  // Da abertura de conduta ("convém", "sugiro"…) se houver; senão da própria correlação.
  const abre = /\b(?:conv[ée]m|recomend\w*|sugir\w*|suger\w*|(?:[ée]\s+|sendo\s+)?fundamental|necess[áa]ri\w*)\b/iu.exec(frase);
  let inicio = abre ? corte + abre.index : m.index;
  if (!abre && /^a\s+/i.test(m[0])) inicio += m[0].indexOf(" ") + 1; // "a correlacionar" solto → "Correlacionar"
  const resto = ditado.slice(inicio);
  const fim = resto.search(/\.(?!\d)|[;\n]|,\s+(?=\p{Lu})/u);
  let t = (fim === -1 ? resto : resto.slice(0, fim)).replace(/\s+/g, " ").trim();
  t = t.replace(/^correlacione\b/i, "correlacionar");
  if (!t) return null;
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? "" : "."}`;
}

/** Rodapé ou próximo laudo: a frase entra antes deles. */
const FIM_DA_CONCLUSAO_RE = /^\s*(?:\*|Breast Imaging Reporting|ACR\s*[-–]|\[REVISAR|FIGO\s*:|ULTRASSONOGRAFIA\b)/u;

/** Garante a correlação DITADA no fim da conclusão do 1º laudo, quando a saída a perdeu. */
export function garantirCorrelacaoDitada(texto: string, ditado: string | null | undefined): string {
  // A saída já traz a correlação, mesmo reescrita ("cuja relevância … de acordo com o contexto clínico"): não duplica.
  if (!correlacaoDitada(ditado) || CORRELACAO_CLINICA_RE.test(texto) || /contexto\s+cl[íi]nico|avalia[çc][ãa]o\s+cl[íi]nica/iu.test(texto)) return texto;
  const frase = fraseDitada(ditado!);
  if (!frase) return texto;
  const linhas = texto.split("\n");
  const h = linhas.findIndex((l) => /^\s*(?:CONCLUS[ÃA]O|IMPRESS[ÃA]O)\s*:?\s*$/iu.test(l));
  if (h === -1) return `${texto.trimEnd()}\n\n${frase}`;
  let ultimo = h;
  for (let j = h + 1; j < linhas.length; j++) {
    const l = linhas[j]!;
    if (FIM_DA_CONCLUSAO_RE.test(l)) break;
    if (l.trim()) ultimo = j;
  }
  linhas.splice(ultimo + 1, 0, "", frase);
  return linhas.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Os dois lados da decisão, na ordem: tira o que não foi ditado, garante o que foi. */
export function aplicarCorrelacaoDitada(texto: string, ditado: string | null | undefined): string {
  return garantirCorrelacaoDitada(removerCorrelacaoNaoDitada(texto, ditado), ditado);
}
