/**
 * Guard de formato determinístico do MSK writer_guarded (slice 3b).
 *
 * O modelo, raramente, erra a grafia de um cabeçalho ("OS SEGUINTOS ASPECTOS") ou
 * adiciona bullets "- " que não são do estilo da casa. Este guard corrige SÓ o formato
 * (cabeçalhos canônicos, bullets, espaços) — NUNCA toca no conteúdo clínico.
 */

/** Normaliza cabeçalhos mangled + remove bullets + apara espaços. Não mexe no conteúdo. */
export function normalizeMskWriterFormat(text: string): string {
  let out = text;

  // Cabeçalhos canônicos (o modelo às vezes erra a grafia).
  out = out.replace(/^OS\s+SEGUINT\w*\s+ASPECTOS[^\n]*$/gim, "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:");
  out = out.replace(/^COMENT[ÁA]RIOS?\s*:?\s*$/gim, "COMENTÁRIOS:");
  out = out.replace(/^CONCLUS[ÃA]O\s*:?\s*$/gim, "CONCLUSÃO:");

  // Estilo da casa não usa bullets "- "/"• " no início das linhas.
  out = out.replace(/^[ \t]*[-•]\s+/gm, "");

  // Apara espaços à direita das linhas; sem colapsar linhas em branco (o estilo usa
  // linha em branco entre achados e dupla entre laudos).
  out = out.replace(/[ \t]+$/gm, "");

  return out.trim();
}
