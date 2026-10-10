/**
 * W15 — golden do ajuste de COMENTÁRIOS (categoria × via, transdutor, contexto, documentação).
 * Ditados sintéticos; os três primeiros reproduzem o padrão dos 3 laudos reais com TV ditada que saíam TA.
 * Rodar (de apps/api): pnpm exec tsx src/server/pipeline/__tests__/tecnica-guard.manual.ts
 */
import { aplicarTecnicaPreferida, comentariosPadrao, contextoDoDitado, fraseTecnica, mhzDoDitado, viaDoDitado } from "@laudousg/schemes";
import { ajustarComentarios } from "../tecnicaGuard";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, info = "") {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${info ? `\n   ${info}` : ""}`); }
}
const laudo = (cat: string, comentarios: string, titulo = "ULTRASSONOGRAFIA OBSTÉTRICA") =>
  `${titulo}\n\nCOMENTÁRIOS:\n${comentarios}\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nÚtero gravídico.\n\nCONCLUSÃO:\n1) Gestação tópica.`;
const sec = (t: string) => /COMENTÁRIOS:\n([\s\S]*?)\n\n/.exec(t)?.[1] ?? "";
const OBST_TA = comentariosPadrao("OBSTETRICA")!;
const aj = (cat: string, ditado: string, coment = OBST_TA, titulo?: string) => ajustarComentarios(laudo(cat, coment, titulo), { categoria: cat, ditado });

// ── Via no ditado ──
check("via: silêncio = null", viaDoDitado("Ultrassonografia obstétrica, feto único, BCF 140.") === null);
check("via: 'fiz transvaginal' = tv", viaDoDitado("Obstétrica inicial, fiz transvaginal, saco gestacional de 18 mm.") === "tv");
check("via: 'transabdominal e transvaginal' = ta_tv", viaDoDitado("pelve transabdominal e transvaginal") === "ta_tv");
check("via: ASR 'transapdominal ou transvaginal' = ta_tv", viaDoDitado("Transapdominal ou transvaginal, com o útero") === "ta_tv");
check("via: ASR 'transabdômen e transvaginal' = ta_tv", viaDoDitado("pelve, transabdômen e transvaginal com útero") === "ta_tv");
check("via: ASR 'abdominial e transvaginal' = ta_tv", viaDoDitado("Ultrassonografia da pelve. Abdominial e transvaginal com útero") === "ta_tv");
check("via: 'pelve transvaginal' sem TA = tv (decisão 10)", viaDoDitado("Ultrassonografia da pelve transvaginal com útero em anteversão") === "tv");
check("via: cervicometria transvaginal não é a via do exame", viaDoDitado("Morfológico. Cervicometria transvaginal 3,4 cm.") === null);
check("via: 'colo uterino pela via transvaginal' não é a via", viaDoDitado("colo uterino avaliado pela via transvaginal medindo 3,1") === null);
// Bancada W15F2: recomendação de outro exame e grafias do ASR não são a via do exame.
check("via: recomendação 'realizar ultrassonografia da pelve transvaginal' não é a via", viaDoDitado("Obstétrica 18 semanas. Conclusão: a critério clínico, realizar ultrassonografia da pelve transvaginal com o objetivo de medir o coluterino.") === null);
check("via: 'complementar com ultrassonografia transvaginal' não é a via", viaDoDitado("Morfológico normal. Convém, a critério clínico, complementar com ultrassonografia transvaginal.") === null);
check("via: ASR 'serbicometria transvaginal' não é a via", viaDoDitado("placenta anterior, Interserbicometria transvaginal com distância de 3,5 cm") === null);
check("via: 'realizar a técnica transvaginal' continua tv", viaDoDitado("Obstétrica inicial com a finalidade de realizar a técnica transvaginal") === "tv");
check("via: 'circunferência abdominal' não é TA", viaDoDitado("circunferência abdominal 30,2") === null);
check("via: 'sem transvaginal' não é TV", viaDoDitado("pelve transabdominal, sem transvaginal") === "ta");

// ── Obstétrica: os 3 padrões reais (TV ditada → saía TA) ──
{
  const a = aj("OBSTETRICA", "Ultrassonografia obstétrica inicial, exame transvaginal, saco gestacional de 7,6 mm.");
  check("defeito 1: TV ditada → frase TV", sec(a.texto).startsWith("Exame realizado com transdutor de 6.5 MHz, com a finalidade de realizar a técnica transvaginal. A documentação"), sec(a.texto));
  check("defeito 1: título não muda", a.texto.startsWith("ULTRASSONOGRAFIA OBSTÉTRICA\n"));
  const b = aj("OBSTETRICA", "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL COMENTÁRIOS: Exame realizado com transdutor de 6.5 MHz, com a finalidade de realizar a técnica transvaginal. Saco gestacional medindo 6,8 mm.");
  check("defeito 2: laudo colado TV → frase TV", /^Exame realizado com transdutor de 6\.5 MHz, com a finalidade/.test(sec(b.texto)), sec(b.texto));
  const c = aj("OBSTETRICA", "Ultrassonografia da pelve transabdominal transvaginal com útero em anteversão, ausência de saco gestacional.");
  check("defeito 3: TA+TV ditada → texto da pelve", /^Exame realizado inicialmente com transdutor de 4\.0 MHz[\s\S]*Após a micção[\s\S]*toda a pelve\. A documentação/.test(sec(c.texto)), sec(c.texto));
}
{
  const s = aj("OBSTETRICA", "Ultrassonografia obstétrica, feto único cefálico.");
  check("obstétrica sem via ditada = TA, intocada", s.trocas.length === 0 && sec(s.texto) === OBST_TA);
  const d = aj("DOPPLER_OBSTETRICO", "Doppler obstétrico, fiz transvaginal.", comentariosPadrao("DOPPLER_OBSTETRICO", { complementos: ["Foi utilizado Doppler colorido para avaliação hemodinâmica fetal."] })!);
  check("Doppler: TV troca a técnica e preserva o complemento Doppler", /^Exame realizado com transdutor de 6\.5 MHz, com a finalidade de realizar a técnica transvaginal\. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal\. A documentação/.test(sec(d.texto)), sec(d.texto));
  const m = aj("MORFOLOGICO", "Morfológico de segundo trimestre, cervicometria transvaginal 3,4 cm.", comentariosPadrao("MORFOLOGICO", { complementos: ["Foi realizada avaliação complementar do colo uterino pela via transvaginal."] })!);
  check("morfológico com cervicometria: nada muda", m.trocas.length === 0, JSON.stringify(m.trocas));
  const r = aj("OBSTETRICA", "obstétrica, fiz transvaginal", `${OBST_TA}\nA primeira ultrassonografia realizada em 06/05/2026 com 8 semanas.`);
  check("linha extra na seção é preservada", /\nA primeira ultrassonografia realizada/.test(sec(r.texto)) && /^Exame realizado com transdutor de 6\.5/.test(sec(r.texto)), sec(r.texto));
  const p = aj("PELVE_FEMININA", "pelve transvaginal", comentariosPadrao("PELVE_FEMININA")!, "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL");
  check("pelve: o ajuste não troca via (título/bexiga são do renderer/writer)", !p.trocas.some((t) => t.startsWith("via")));
}

// ── Documentação e variantes antigas ──
{
  const d = aj("DOPPLER_OBSTETRICO", "Doppler obstétrico.", OBST_TA.replace("que possuem", "que possui"));
  check("documentação: 'possui' → 'possuem'", sec(d.texto) === OBST_TA && d.trocas.includes("documentação"));
  const e = aj("PELVE_FEMININA", "pelve", "Exame realizado com transdutor de 6.5 MHz, pela técnica transvaginal. A documentação fotográfica foi obtida em segundo protocolo internacional de Serviços de Imagem que possui várias metodologias.");
  check("documentação: 'obtida em segundo' e vírgula", /obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias\.$/.test(sec(e.texto)), sec(e.texto));
  const msk = aj("MUSCULOESQUELETICO_V2", "joelho direito", "Exame realizado com transdutor linear de alta frequência, abrangendo a avaliação do joelho direito. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.", "ULTRASSONOGRAFIA DO JOELHO DIREITO");
  check("MSK: variante antiga → padrão", sec(msk.texto) === comentariosPadrao("MUSCULOESQUELETICO_V2"), sec(msk.texto));
  const par = aj("PAREDE_ABDOMINAL", "parede", "Exame realizado com transdutor de 12 MHz, abrangendo a avaliação da parede abdominal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.", "ULTRASSONOGRAFIA DA PAREDE ABDOMINAL");
  check("parede: sempre linear com Valsalva", sec(par.texto) === comentariosPadrao("PAREDE_ABDOMINAL"), sec(par.texto));
  const pro = aj("PROSTATA_SUPRAPUBICA", "próstata", "Exame realizado com transdutor convexo de 4,0 MHz, por via transabdominal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.", "ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)");
  check("próstata: frase curta → longa (rodada 2)", sec(pro.texto) === comentariosPadrao("PROSTATA_SUPRAPUBICA"), sec(pro.texto));
  const ing = aj("PAREDE_ABDOMINAL", "região inguinal direita", "Exame realizado com transdutor de 12 MHz, abrangendo a avaliação da região inguinal direita. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.", "ULTRASSONOGRAFIA DA REGIÃO INGUINAL DIREITA");
  check("parede: região inguinal não é trocada", ing.trocas.length === 0);
}

// ── Transdutor ditado ──
{
  check("mhz: 'transdutor de 15 MHz'", mhzDoDitado("usei o transdutor de 15 MHz") === "15");
  check("mhz: dois valores = ambíguo", mhzDoDitado("transdutor de 4 MHz e transdutor de 6,5 MHz") === null);
  const t = aj("TIREOIDE", "Tireoide, usei o transdutor de 15 MHz.", comentariosPadrao("TIREOIDE")!, "ULTRASSONOGRAFIA DA TIREOIDE");
  check("tireoide: só o número do transdutor muda", sec(t.texto) === comentariosPadrao("TIREOIDE")!.replace("12 MHz", "15 MHz"), sec(t.texto));
  const tt = aj("PELVE_FEMININA", "transdutor de 9 MHz", comentariosPadrao("PELVE_FEMININA")!, "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL");
  check("TA+TV (duas frequências): não mexe", tt.trocas.length === 0);
  const faixa = ajustarComentarios("DOPPLER\n\nCOMENTÁRIOS:\nExame realizado com transdutor convexo (3-5 MHz), com ângulo Doppler.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nx", { categoria: "DOPPLER_RENAL", ditado: "transdutor de 9 MHz" });
  check("faixa '(3-5 MHz)' não vira número", faixa.trocas.length === 0, faixa.texto);
}

// ── Contexto clínico no fim da seção ──
{
  const v = aj("VIAS_URINARIAS", "Vias urinárias, recém-nascido de 3 dias de vida, rins tópicos.", comentariosPadrao("VIAS_URINARIAS")!, "ULTRASSONOGRAFIA DAS VIAS URINÁRIAS");
  check("recém-nascido no fim da seção", sec(v.texto).endsWith("que possuem várias metodologias. Exame realizado em um recém-nascido de 3 dias de vida."), sec(v.texto));
  const c = aj("ABDOMEN_TOTAL", "abdome total, criança de quatro anos, fígado normal", comentariosPadrao("ABDOMEN_TOTAL")!, "ULTRASSONOGRAFIA DO ABDOME TOTAL");
  check("criança (número por extenso)", sec(c.texto).endsWith("Exame realizado em uma criança de 4 anos."), sec(c.texto));
  const u = aj("ABDOMEN_TOTAL", "exame realizado na urgência, vesícula com cálculo", comentariosPadrao("ABDOMEN_TOTAL")!, "ULTRASSONOGRAFIA DO ABDOME TOTAL");
  check("urgência", sec(u.texto).endsWith("Exame realizado em contexto de urgência."), sec(u.texto));
  const mm = aj("MAMARIA", "Exame realizado em mama masculina, por queixa de nódulo palpável. Mama esquerda com…", comentariosPadrao("MAMARIA")!, "ULTRASSONOGRAFIA DA MAMA ESQUERDA");
  check("mama masculina com a queixa", sec(mm.texto).endsWith("Exame realizado em mama masculina, por queixa de nódulo palpável."), sec(mm.texto));
  const ja = ajustarComentarios(laudo("VIAS_URINARIAS", `${comentariosPadrao("VIAS_URINARIAS")} Exame realizado em um recém-nascido de 3 dias de vida.`, "ULTRASSONOGRAFIA DAS VIAS URINÁRIAS"), { categoria: "VIAS_URINARIAS", ditado: "recém-nascido de 3 dias" });
  check("contexto já escrito não duplica", ja.trocas.length === 0);
  check("obstétrica: idade/gestante não viram contexto", contextoDoDitado("gestante de 28 semanas, criança de 5 anos em casa", "OBSTETRICA").length === 0);
  check("contexto negado não entra", contextoDoDitado("não é urgência, exame realizado na urgência? não", "ABDOMEN_TOTAL").length <= 1);
  check("idade só se ditada: nada ditado → nada", contextoDoDitado("abdome total normal", "ABDOMEN_TOTAL").length === 0);
}

// ── Frase preferida do usuário (por categoria) ──
{
  const pref = "Exame realizado com transdutor convexo multifrequencial de 5 MHz";
  const base = laudo("ABDOMEN_TOTAL", comentariosPadrao("ABDOMEN_TOTAL")!, "ULTRASSONOGRAFIA DO ABDOME TOTAL");
  const t = aplicarTecnicaPreferida(base, "ABDOMEN_TOTAL", pref);
  check("preferida: troca a frase padrão e mantém a documentação", sec(t) === `${pref}. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.`, sec(t));
  check("preferida vazia: intocado", aplicarTecnicaPreferida(base, "ABDOMEN_TOTAL", "  ") === base);
  const tv = laudo("OBSTETRICA", comentariosPadrao("OBSTETRICA", { via: "tv" })!);
  check("preferida não troca outra via (TV escolhida/ditada)", aplicarTecnicaPreferida(tv, "OBSTETRICA", "Minha frase TA.") === tv);
  const dop = laudo("DOPPLER_OBSTETRICO", comentariosPadrao("DOPPLER_OBSTETRICO", { complementos: ["Foi utilizado Doppler colorido para avaliação hemodinâmica fetal."] })!);
  check("preferida mantém o complemento Doppler", /^Minha frase TA\. Foi utilizado Doppler colorido/.test(sec(aplicarTecnicaPreferida(dop, "DOPPLER_OBSTETRICO", "Minha frase TA."))));
  check("preferida: categoria fora da tabela, intocado", aplicarTecnicaPreferida(base, "LIVRE", pref) === base && fraseTecnica("LIVRE") === null);
}

// ── Estilo objetivo e silêncio ──
{
  const obj = "ULTRASSONOGRAFIA OBSTÉTRICA\n\nTÉCNICA:\nExame realizado com transdutor de 4.0 MHz.\n\nACHADOS:\nx";
  check("estilo objetivo (TÉCNICA:) intocado", ajustarComentarios(obj, { categoria: "OBSTETRICA", ditado: "fiz transvaginal" }).texto === obj);
  const t = laudo("ABDOMEN_TOTAL", comentariosPadrao("ABDOMEN_TOTAL")!, "ULTRASSONOGRAFIA DO ABDOME TOTAL");
  check("silêncio: byte-idêntico", ajustarComentarios(t, { categoria: "ABDOMEN_TOTAL", ditado: "abdome total normal" }).texto === t);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
