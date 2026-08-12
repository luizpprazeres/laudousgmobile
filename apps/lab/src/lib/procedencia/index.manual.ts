/**
 * Testes da procedência por correspondência literal.
 * Rodar: pnpm exec tsx apps/lab/src/lib/procedencia/index.manual.ts
 */
import { procedenciaDoLaudo, procedenciaDisponivel, modoDe, rotuloNaoAtribuido, textosLivresDo, numerosDo } from "./index";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, d?: unknown) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}`); if (d !== undefined) console.log("   ", JSON.stringify(d).slice(0, 300)); }
};

console.log("\n[extração de campos]\n");
const so = {
  numero_fetos: 1,
  fetos: [{ bcf_bpm: 142, dbp_mm: 85, apresentacao: "cefálica" }],
  achados_adicionais: "Cisto de plexo coroide à esquerda, medindo 4 mm.",
  placenta_localizacao: "corporal anterior",
  liquido_tipo: "normal",
};
const txt = textosLivresDo(so).map((t) => t.campo);
check("pega textos livres longos", txt.includes("achados_adicionais") && txt.includes("placenta_localizacao"));
check("ignora strings curtas (enum/rótulo)", !txt.includes("liquido_tipo") && !txt.includes("fetos[0].apresentacao"));
check("pega números aninhados",
  numerosDo(so).map((n) => n.campo).includes("fetos[0].dbp_mm"));

console.log("\n[procedência no laudo]\n");
const laudo = [
  "ULTRASSONOGRAFIA OBSTÉTRICA",
  "Feto único, em apresentação cefálica.",
  "Batimentos cardíacos presentes (BCF = 142 bpm).",
  "Diâmetro biparietal (DBP) de 85 mm.",
  "Placenta de localização corporal anterior.",
  "",
  "Cisto de plexo coroide à esquerda, medindo 4 mm.",
].join("\n");

const { trechos, resumo } = procedenciaDoLaudo(laudo, so);
const doLLM = trechos.filter((t) => t.origem === "llm_texto").map((t) => t.texto);
const dados = trechos.filter((t) => t.origem === "llm_dado").map((t) => t.texto);

check("o achado adicional é atribuído ao LLM",
  doLLM.some((t) => t.includes("Cisto de plexo coroide")), doLLM);
check("a localização da placenta é atribuída ao LLM",
  doLLM.some((t) => t.includes("corporal anterior")), doLLM);
check("as medidas são marcadas como dado do LLM",
  dados.includes("142") && dados.includes("85"), dados);
check("a frase de template fica como código",
  trechos.some((t) => t.origem === "codigo" && t.texto.includes("Batimentos cardíacos presentes")));
check("o título fica como código",
  trechos.some((t) => t.origem === "codigo" && t.texto.includes("ULTRASSONOGRAFIA")));
check("a soma dos trechos reconstrói o laudo, sem perder nada",
  trechos.map((t) => t.texto).join("") === laudo);
check("o resumo soma o tamanho do laudo",
  resumo.codigo + resumo.llm_texto + resumo.llm_dado === laudo.length, resumo);

console.log("\n[conservadorismo — não marca o que não pode provar]\n");
check("valor que NÃO está no laudo não vira marca",
  !procedenciaDoLaudo(laudo, { achados_adicionais: "Texto que não aparece no laudo." }).trechos
    .some((t) => t.origem === "llm_texto"));
check("structured vazio deixa tudo como código",
  procedenciaDoLaudo(laudo, {}).trechos.every((t) => t.origem === "codigo"));
check("número que aparece só como parte de outro não é marcado",
  !procedenciaDoLaudo("Peso de 2450 gramas.", { x: 45 }).trechos.some((t) => t.origem === "llm_dado"));

console.log("\n[conversão cm→mm]\n");
check("dita em cm, publicado em mm — reconhece",
  procedenciaDoLaudo("DBP de 74,2 mm.", { dbp: 7.42 }).trechos.some((t) => t.origem === "llm_dado"));

console.log("\n[disponibilidade e leitura do não-atribuído]\n");
check("com structured → disponível", procedenciaDisponivel("[renderer/v1] …", true) && procedenciaDisponivel("FUNÇÃO: …", true));
check("sem structured → indisponível", !procedenciaDisponivel("[renderer/v1] …", false));
// O caminho vem da SYSTEM MESSAGE. `model_writer` guarda o modelo de IA e
// nunca vale "renderer/v1" — a versão anterior deste teste consagrava esse
// engano, e com ele 3 de cada 4 laudos apareciam com o rótulo errado.
check("modo vem da system message, não do modelo de IA",
  modoDe("[renderer/v1] render programático determinístico (OBSTETRICA)") === "renderer" &&
  modoDe("FUNÇÃO: Gerar e editar laudos de ultrassonografia obstétrica") === "writer");
check("o nome de um modelo de IA NÃO indica renderer",
  modoDe("gpt-5.4-mini") === "writer" && modoDe("gpt-4.1-mini") === "writer");
check("system message ausente cai no writer (leitura conservadora)",
  modoDe(null) === "writer");
check("no renderer, não-atribuído é template",
  rotuloNaoAtribuido("renderer").curto === "template");
check("no writer, não-atribuído é redação do LLM — não 'código'",
  rotuloNaoAtribuido("writer").curto.includes("LLM") && !rotuloNaoAtribuido("writer").curto.includes("template"));

console.log(`\n${pass} passaram, ${fail} falharam\n`);
if (fail > 0) process.exit(1);
