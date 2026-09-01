import { sugerirBiradsMamaria } from "../mamariaBirads";

const casos = [
  { nome: "cisto simples", entrada: { tipo: "cisto_simples" }, esperado: "2" },
  {
    nome: "nódulo provavelmente benigno",
    entrada: { tipo: "nodulo_solido", forma: "oval", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma" },
    esperado: "3",
  },
  {
    nome: "um descritor moderado",
    entrada: { tipo: "nodulo_solido", forma: "oval", margem: "indistinta", orientacao: "paralela", posterior: "nenhuma" },
    esperado: "4A",
  },
  {
    nome: "dois descritores moderados",
    entrada: { tipo: "nodulo_solido", forma: "oval", margem: "indistinta", orientacao: "nao_paralela", posterior: "nenhuma" },
    esperado: "4B",
  },
  {
    nome: "um descritor forte",
    entrada: { tipo: "nodulo_solido", forma: "irregular", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma" },
    esperado: "4C",
  },
  {
    nome: "dois descritores fortes",
    entrada: { tipo: "nodulo_solido", forma: "irregular", margem: "espiculada", orientacao: "paralela", posterior: "nenhuma" },
    esperado: "5",
  },
  {
    nome: "calcificações grosseiras",
    entrada: { tipo: "calcificacoes", calcificacoes: "grosseiras_benignas" },
    esperado: "2",
  },
  {
    nome: "microcalcificações",
    entrada: { tipo: "calcificacoes", calcificacoes: "microcalcificacoes" },
    esperado: "4",
  },
] as const;

for (const caso of casos) {
  const recebido = sugerirBiradsMamaria(caso.entrada);
  if (recebido !== caso.esperado) {
    throw new Error(`${caso.nome}: esperado ${caso.esperado}, recebido ${recebido ?? "null"}`);
  }
}

console.log(`BI-RADS mamário compartilhado: ${casos.length}/${casos.length} casos passaram.`);
