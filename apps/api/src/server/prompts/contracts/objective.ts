export function toObjectiveHeaders(template: string): string {
  return template
    .replaceAll("OS SEGUINTES ASPECTOS FORAM OBSERVADOS", "ACHADOS")
    .replaceAll("COMENTÁRIOS", "TÉCNICA")
    .replaceAll("CONCLUSÃO", "IMPRESSÃO");
}

export function toObjectiveContract(template: string): string {
  return `${toObjectiveHeaders(template)}

AJUSTE DO CONTRATO PARA O ESTILO OBJETIVO:
- Qualquer regra clássica que proíba bullets, traços ou listas NÃO se aplica à enumeração clínica do modo OBJETIVO.
- Quando houver múltiplos achados do mesmo tipo, use obrigatoriamente linhas iniciadas por 1-, 2-, 3-.
- Cada item enumerado deve começar em nova linha. Não escreva dois itens enumerados na mesma linha.
- Não comprima múltiplos achados na mesma frase com "e", "além de" ou "associado a".
- A enumeração 1-, 2-, 3- é parte do formato obrigatório do modo OBJETIVO, não comentário adicional.`;
}

export function toObjectiveModel(template: string, technique: string): string {
  const renamed = toObjectiveHeaders(template);
  const [title] = renamed.split("\n");
  return `${title}

TÉCNICA:
${technique}

ACHADOS:

IMPRESSÃO:`;
}
