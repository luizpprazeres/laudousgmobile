/**
 * Tira identificadores de um TRECHO curto antes de ele sair para um serviço de terceiros (Jev).
 * Regras da bancada de 11/10/2026 (anonimizar.ts), mais datas → [DATA]. Se algo suspeito sobrar,
 * `hasIdentifierResidue` diz para não mandar.
 */
const RULES: Array<[RegExp, string]> = [
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]"],
  [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[E-MAIL]"],
  [/\(?\b\d{2}\)?\s?9?\d{4}-\d{4}\b/g, "[TELEFONE]"],
  [/\b\d{5}-\d{3}\b/g, "[CEP]"],
  [/\b(RG|R\.G\.)\s*:?\s*[\d.xX-]{5,}/gi, "[RG]"],
  [/\b(prontu[áa]rio|registro|atendimento|matr[íi]cula|pedido|protocolo)\s*(n[ºo°.]*)?\s*:?\s*\d[\d./-]{3,}/gi, "$1 [NÚMERO]"],
  [/\b(CRM|COREN)\s*[-/:]?\s*[A-Z]{0,2}\s*\d+/gi, "[CRM]"],
  [/\b(Rua|R\.|Avenida|Av\.|Travessa|Alameda|Rodovia|Estrada)\s+[^\n,;]{2,60}(,\s*n?[ºo°]?\s*\d+)?/g, "[ENDEREÇO]"],
  [/\b(Paciente|Nome|Nome do paciente|Solicitante|M[ée]dico solicitante|Requisitante)\s*:\s*[^\n.,;]{1,60}/gi, "$1: [NOME]"],
  [/\b(Dr\.?|Dra\.?|Doutor|Doutora)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+(\s+(de|da|do|dos|das)?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+)*/g, "$1 [NOME]"],
  [/\b(Cl[íi]nica|Hospital|Laborat[óo]rio|Centro de Diagn[óo]stico|Instituto)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+(\s+(de|da|do|dos|das|e)?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ú]+)*/g, "[CLÍNICA]"],
  [/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, "[DATA]"],
  [/\b\d{1,2}\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(\s+de\s+\d{4})?/gi, "[DATA]"],
];

export function scrubIdentifiers(text: string): string {
  let out = text;
  for (const [re, rep] of RULES) out = out.replace(re, (...m) => rep.replace("$1", String(m[1] ?? "")));
  return out;
}

const RESIDUE: RegExp[] = [
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, /@[\w-]+\./, /\b9\d{4}-\d{4}\b|\(\d{2}\)\s?\d{4,5}/,
  /\b(Paciente|Nome)\s*:\s*(?!\[NOME\])\S/i, /\b(Dr\.?|Dra\.?)\s+(?!\[NOME\])[A-ZÁÉÍÓÚ]/, /\bCRM\b(?!\])/,
];
export function hasIdentifierResidue(text: string): boolean {
  return RESIDUE.some((re) => re.test(text));
}
