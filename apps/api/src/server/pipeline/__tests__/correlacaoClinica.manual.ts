/**
 * "Correlacionar com dados clínicos" só quando ditado (decisão do Luiz de 10/10) — positivos e negativos.
 * Rodar: npx tsx src/server/pipeline/__tests__/correlacaoClinica.manual.ts
 */
import {
  aplicarCorrelacaoDitada,
  CORRELACAO_CLINICA_RE,
  correlacaoDitada,
  fraseDitada,
  garantirCorrelacaoDitada,
  removerCorrelacaoNaoDitada,
} from "../correlacaoClinica";

let pass = 0;
let fail = 0;
const check = (nome: string, ok: boolean, detalhe?: string) => {
  if (ok) pass++;
  else {
    fail++;
    console.error(`✗ ${nome}${detalhe ? `\n   ${detalhe}` : ""}`);
  }
};

// ── Reconhecimento: genérica sim, específica não ──
for (const s of [
  "Correlacionar com dados clínicos.",
  "Correlacionar com achados clínicos.",
  "a correlacionar clinicamente",
  "Recomenda-se correlação clínica para acompanhamento.",
  "Convém, a critério clínico, correlacionar com quadro clínico-laboratorial.",
  "correlacionar com queixa clínica",
  "devendo ser correlacionado com a história clínica",
  "Convém correlação com os dados clínicos e laboratoriais.",
  "a correlacionar com os demais critérios clínicos e laboratoriais de colecistite aguda",
  "correlação clínico-laboratorial",
  "correlacionar com clínica",
]) check(`reconhece: ${s}`, CORRELACAO_CLINICA_RE.test(s));
for (const s of [
  "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de TSH e T4 livre.",
  "Convém, a critério clínico, correlacionar com exame físico, dosagem de marcadores tumorais e avaliação urológica.",
  "correlacione com a ultrassonografia precoce",
  "recomenda-se correlação com PSA e avaliação urológica",
  "a critério clínico",
  "Não foi possível correlacionar a espessura do endométrio com a fase menstrual.",
]) check(`não reconhece (específica/outra): ${s}`, !CORRELACAO_CLINICA_RE.test(s));

// ── Negativo: não ditado → sai ──
const ditadoSem = "linfonodo cervical nível II direito arredondado sem hilo medindo 1,8 por 1,2 cm";
{
  const t = "CONCLUSÃO:\nLinfonodo de aspecto suspeito no nível II. Correlacionar com achados clínicos.";
  const r = removerCorrelacaoNaoDitada(t, ditadoSem);
  check("frase solta depois do achado sai", r === "CONCLUSÃO:\nLinfonodo de aspecto suspeito no nível II.", r);
}
{
  const t = "CONCLUSÃO:\nÍndices de resistência intrarrenais reduzidos, a correlacionar com dados clínicos.";
  const r = removerCorrelacaoNaoDitada(t, "IR reduzidos");
  check("cláusula colada ao achado sai", r === "CONCLUSÃO:\nÍndices de resistência intrarrenais reduzidos.", r);
}
{
  const t = "CONCLUSÃO:\n1) Esplenomegalia.\n2) Recomenda-se correlação clínica para acompanhamento.\n3) Colelitíase.";
  const r = removerCorrelacaoNaoDitada(t, "baço aumentado, cálculo na vesícula");
  check("item só de conduta sai e a conclusão é renumerada", r === "CONCLUSÃO:\n1) Esplenomegalia.\n2) Colelitíase.", r);
}
{
  const t = "CONCLUSÃO:\n1) Esplenomegalia.\n2) Recomenda-se correlação clínica.";
  const r = removerCorrelacaoNaoDitada(t, "baço aumentado");
  check("sobrou um item: fica sem número", r === "CONCLUSÃO:\nEsplenomegalia.", r);
}
{
  const t = "CONCLUSÃO:\nAchados sugestivos de tireoidite linfocítica. Correlacionar com dados clínicos e laboratoriais.\n\nNota: rodapé.";
  const r = removerCorrelacaoNaoDitada(t, "tireoide heterogênea");
  check("frase com 'e laboratoriais' sai, rodapé fica", r === "CONCLUSÃO:\nAchados sugestivos de tireoidite linfocítica.\n\nNota: rodapé.", r);
}
{
  const t = "CONCLUSÃO:\nPróstata aumentada.\n\nRecomenda-se correlação clínica e urodinâmica para avaliação funcional.";
  const r = removerCorrelacaoNaoDitada(t, "próstata 40 gramas");
  check("parágrafo de conduta do LLM sai sem deixar linha em branco sobrando", r === "CONCLUSÃO:\nPróstata aumentada.", r);
}
{
  const t = "Endométrio medindo 0,9 cm de espessura. Correlação clínica: paciente em uso de tamoxifeno.";
  check("rótulo 'Correlação clínica:' da pelve (contexto ditado) fica", removerCorrelacaoNaoDitada(t, "endométrio 0,9 tamoxifeno") === t);
}
{
  const t = "CONCLUSÃO:\nConvém, a critério clínico, correlacionar com as dosagens laboratoriais de TSH e T4 livre.";
  check("conduta específica (TSH) não é tocada", removerCorrelacaoNaoDitada(t, "tireoide heterogênea") === t);
}
{
  // Caso real 0b2a0c38 (palato): a correlação vinha coordenada com a conduta DITADA — só a correlação sai.
  const t = "CONCLUSÃO:\nCisto de retenção.\n\nConvém correlação com os achados clínicos e complementar a investigação com avaliação especializada do profissional bucomaxilofacial.";
  const r = removerCorrelacaoNaoDitada(t, "complementar com avaliação especializada do profissional bucomaxilofacial");
  check("coordenada com conduta ditada: sai só a correlação", r === "CONCLUSÃO:\nCisto de retenção.\n\nConvém complementar a investigação com avaliação especializada do profissional bucomaxilofacial.", r);
  const r2 = removerCorrelacaoNaoDitada("CONCLUSÃO:\nNódulo.\n\nConvém avaliação urológica e correlação clínica.", "nódulo, avaliação urológica");
  check("'… X e correlação clínica.': sai só a correlação", r2 === "CONCLUSÃO:\nNódulo.\n\nConvém avaliação urológica.", r2);
  const r3 = removerCorrelacaoNaoDitada("CONCLUSÃO:\nNódulo.\n\nRecomenda-se correlação clínica e acompanhamento urológico.", "nódulo, acompanhamento urológico");
  check("resto coordenado que veio do ditado fica", r3 === "CONCLUSÃO:\nNódulo.\n\nRecomenda-se acompanhamento urológico.", r3);
}
{
  // Caso real aed8b784 (próstata): conduta não ditada em item de lista com hífen.
  const t = "CONCLUSÃO:\n1) Próstata aumentada.\n- Recomenda-se correlação clínica e acompanhamento urológico para avaliação funcional e terapêutica.";
  const r = removerCorrelacaoNaoDitada(t, "próstata de 45 gramas");
  check("item com hífen: a conduta não ditada sai", r === "CONCLUSÃO:\n1) Próstata aumentada.", r);
}
check("texto sem correlação volta igual", removerCorrelacaoNaoDitada("CONCLUSÃO:\nColelitíase.", "") === "CONCLUSÃO:\nColelitíase.");

// ── Positivo: ditado → fica (e entra na redação dele se a saída perdeu) ──
{
  const t = "CONCLUSÃO:\nLinfonodo de aspecto atípico. Correlacionar com dados clínicos.";
  check("ditado: a frase fica", removerCorrelacaoNaoDitada(t, "na conclusão, linfonodo de aspecto atípico, correlacionar com dados clínicos") === t);
}
check("correlacaoDitada: sim", correlacaoDitada("Conclusão: seroma. Convém correlação com os dados clínicos e laboratoriais."));
check("correlacaoDitada: não", !correlacaoDitada(ditadoSem) && !correlacaoDitada(null));
check(
  "fraseDitada: 'convém…' na redação do médico",
  fraseDitada("Coleção de 3 por 2 cm. Conclusão: seroma. Convém correlação com os dados clínicos e laboratoriais.") ===
    "Convém correlação com os dados clínicos e laboratoriais.",
  fraseDitada("Coleção de 3 por 2 cm. Conclusão: seroma. Convém correlação com os dados clínicos e laboratoriais.") ?? "null",
);
check(
  "fraseDitada: 'na conclusão, …, correlacionar' → só a correlação",
  fraseDitada("Na conclusão, linfonodo de aspecto atípico, correlacionar com dados clínicos.") === "Correlacionar com dados clínicos.",
  fraseDitada("Na conclusão, linfonodo de aspecto atípico, correlacionar com dados clínicos.") ?? "null",
);
check("fraseDitada: imperativo vira infinitivo", fraseDitada("correlacione com os achados clínicos") === "Correlacionar com os achados clínicos.");
check("fraseDitada: decimal do ASR não corta a frase", fraseDitada("rim com 10.5 cm. sugiro correlação clínica") === "Sugiro correlação clínica.", fraseDitada("rim com 10.5 cm. sugiro correlação clínica") ?? "null");
{
  // Caso real (be6b466c, vias): ditado com a frase e renderer sem ela.
  const t = "CONCLUSÃO:\nCálculo no rim direito.\n\nNota: referência.";
  const d = "rim direito com cálculo de 0,5 cm. Convém correlação com os dados clínicos e laboratoriais.";
  const r = garantirCorrelacaoDitada(t, d);
  check(
    "ditado e perdido (caso be6b466c): entra no fim do bloco da conclusão",
    r === "CONCLUSÃO:\nCálculo no rim direito.\n\nNota: referência.\n\nConvém correlação com os dados clínicos e laboratoriais.",
    r,
  );
  const comRodape = "CONCLUSÃO:\n1) Nódulo.\n2) Cisto.\n\n* Referência ACR.";
  const r2 = garantirCorrelacaoDitada(comRodape, "nódulo e cisto. correlacionar com dados clínicos.");
  check("entra antes do rodapé '*'", r2 === "CONCLUSÃO:\n1) Nódulo.\n2) Cisto.\n\nCorrelacionar com dados clínicos.\n\n* Referência ACR.", r2);
  const reescrita = "CONCLUSÃO:\nÁrea aumentada (11 mm²), cuja relevância pode ser considerada de acordo com o contexto clínico e eletroneuromiográfico.";
  check("reescrita pelo modelo (caso 2117aad0): não duplica", garantirCorrelacaoDitada(reescrita, "11 mm quadrados sendo fundamental a correlação clínica e eletro neuromiográfica") === reescrita);
  const ja = "CONCLUSÃO:\nSeroma.\n\nConvém correlação clínica.";
  check("já presente (outra forma): não duplica", garantirCorrelacaoDitada(ja, "seroma, correlacionar com dados clínicos") === ja);
}
{
  const t = "CONCLUSÃO:\nSeroma.";
  const r = aplicarCorrelacaoDitada(t, "seroma. correlacionar com dados clínicos.");
  check("aplicar: ditado e ausente → entra", r === "CONCLUSÃO:\nSeroma.\n\nCorrelacionar com dados clínicos.", r);
  const r2 = aplicarCorrelacaoDitada("CONCLUSÃO:\nSeroma. Correlacionar com dados clínicos.", "seroma");
  check("aplicar: não ditado → sai", r2 === "CONCLUSÃO:\nSeroma.", r2);
  check("aplicar: idempotente", aplicarCorrelacaoDitada(r, "seroma. correlacionar com dados clínicos.") === r);
}
// Vários laudos: só o 1º recebe, e o título do 2º encerra a conclusão.
{
  const t = "ULTRASSONOGRAFIA A\n\nCONCLUSÃO:\nAchado A.\n\nULTRASSONOGRAFIA B\n\nCONCLUSÃO:\nAchado B.";
  const r = garantirCorrelacaoDitada(t, "achado a, correlacionar com dados clínicos");
  check("vários laudos: entra no 1º", r === "ULTRASSONOGRAFIA A\n\nCONCLUSÃO:\nAchado A.\n\nCorrelacionar com dados clínicos.\n\nULTRASSONOGRAFIA B\n\nCONCLUSÃO:\nAchado B.", r);
}

console.log(`correlação clínica: ${pass}/${pass + fail} verificações${fail ? ` — ${fail} FALHARAM` : ""}`);
if (fail) process.exit(1);
