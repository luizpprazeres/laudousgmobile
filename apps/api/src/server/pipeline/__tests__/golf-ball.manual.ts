/**
 * Golden PURO do snippet golf ball / foco ecogênico intracardíaco (sem LLM).
 * Auditoria 2026-07-01 gap #1. Rodar: tsx src/server/pipeline/__tests__/golf-ball.manual.ts
 */
import {
  detectGolfBall,
  golfBallCorpo,
  golfBallConclusao,
  stripGolfBallEcho,
} from "../../renderer/categories/golfBall";
import {
  renderMorfologico,
  MorfologicoFindingsSchema,
  type MorfologicoFindings,
} from "../../renderer/categories/MORFOLOGICO";
import {
  renderObstetrica,
  ObstetricaFindingsSchema,
  type ObstetricaFindings,
} from "../../renderer/categories/OBSTETRICA";
import {
  renderDopplerObstetrico,
  DopplerObstetricoFindingsSchema,
  type DopplerObstetricoFindings,
} from "../../renderer/categories/DOPPLER_OBSTETRICO";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

/** Fixture: todos os campos do schema em null (arrays em []). */
function nulled<T extends { shape: Record<string, unknown> }>(schema: T): Record<string, unknown> {
  return Object.fromEntries(Object.keys(schema.shape).map((k) => [k, null]));
}

// ───────────── Detecção ─────────────

check("dispara: golf ball + lado", (() => {
  const g = detectGolfBall("presença de golf ball no ventrículo esquerdo");
  return g !== null && g.lado === "esquerdo" && g.medida === null;
})());

check("dispara: foco ecogênico intracardíaco sem lado (lado=null, nunca inventa)", (() => {
  const g = detectGolfBall("foco ecogênico intracardíaco");
  return g !== null && g.lado === null;
})());

check("dispara: foco ecogênico + ventrículo direito + medida cm", (() => {
  const g = detectGolfBall("foco ecogênico no ventrículo direito medindo 0.3 centímetros");
  return g !== null && g.lado === "direito" && g.medida === "0,3 cm";
})());

check("dispara: hiperecoica puntiforme + ventrículo + medida mm", (() => {
  const g = detectGolfBall("imagem hiperecoica puntiforme no ventrículo esquerdo de 3 mm");
  return g !== null && g.lado === "esquerdo" && g.medida === "3 mm";
})());

check("NÃO dispara: foco ecogênico renal (sem contexto cardíaco)", detectGolfBall("foco ecogênico renal à direita") === null);
check("NÃO dispara: ditado sem o achado", detectGolfBall("DBP 54, CC 200, líquido normal") === null);

// Negação (review dex1) — jamais gerar achado positivo a partir de negação.
check("NÃO dispara: 'sem foco ecogênico intracardíaco'", detectGolfBall("Coração sem foco ecogênico intracardíaco.") === null);
check("NÃO dispara: 'ausência de golf ball'", detectGolfBall("ausência de golf ball") === null);
check("NÃO dispara: 'não há foco ecogênico no ventrículo'", detectGolfBall("não há foco ecogênico no ventrículo esquerdo") === null);
check("dispara mesmo com negação em OUTRA sentença", (() => {
  const g = detectGolfBall("Sem derrame pericárdico. Golf ball no ventrículo esquerdo.");
  return g !== null && g.lado === "esquerdo";
})());
check("stripGolfBallEcho preserva sentença NEGATIVA", (() => {
  const t = stripGolfBallEcho("Sem foco ecogênico intracardíaco. Pelve renal distendida.");
  return /sem foco ecog/i.test(t) && /Pelve renal distendida/.test(t);
})());

check("lado em outra sentença (fallback pro ditado inteiro)", (() => {
  const g = detectGolfBall("Golf ball. Presente no ventrículo esquerdo.");
  return g !== null && g.lado === "esquerdo";
})());

// ───────────── Frases canônicas ─────────────

check("corpo canônico com lado + medida", golfBallCorpo({ lado: "esquerdo", medida: "0,3 cm" }) ===
  "Imagem hiperecoica puntiforme no ventrículo esquerdo, medindo 0,3 cm no seu maior eixo.");
check("corpo sem lado não inventa lateralidade", golfBallCorpo({ lado: null, medida: null }) ===
  "Imagem hiperecoica puntiforme, intracardíaca.");
check("conclusão canônica (Golf Ball + eco fetal 28s)", (() => {
  const c = golfBallConclusao({ lado: "esquerdo", medida: null });
  return c.includes("Foco ecogênico intracardíaco no ventrículo esquerdo de aspecto inespecífico (Golf Ball).") &&
    c.includes("ecocardiografia fetal em torno de 28 semanas");
})());

// ───────────── Dedup do eco ─────────────

check("stripGolfBallEcho remove só a sentença do foco", (() => {
  const t = stripGolfBallEcho("Foco ecogênico intracardíaco no ventrículo esquerdo. Pelve renal com discreta distensão.");
  return !/foco ecog/i.test(t) && /Pelve renal com discreta distensão/.test(t);
})());

// ───────────── Integração: MORFOLOGICO 2º trimestre ─────────────

const morfoBase = {
  ...nulled(MorfologicoFindingsSchema),
  trimestre: "2t",
} as MorfologicoFindings;

{
  const g = { lado: "esquerdo" as const, medida: "0,3 cm" };
  const laudo = renderMorfologico(morfoBase, null, { golfBall: g });
  const linhas = laudo.split("\n");
  const iCoracao = linhas.findIndex((l) => l === "Coração com quatro câmaras visíveis.");
  check("MORFO: corpo logo após 'Coração com quatro câmaras visíveis.'",
    iCoracao >= 0 && linhas[iCoracao + 1] === "Imagem hiperecoica puntiforme no ventrículo esquerdo, medindo 0,3 cm no seu maior eixo.",
    laudo.slice(0, 400));
  check("MORFO: conclusão tem o item Golf Ball", /\(Golf Ball\)/.test(laudo));
  check("MORFO: genérica vira 'Demais aspectos da morfologia fetal…'",
    laudo.includes("Demais aspectos da morfologia fetal sem evidência de alteração detectável pelo método.") &&
    !laudo.includes("Morfologia fetal sem evidência"));
  check("MORFO: item do foco vem antes da genérica",
    laudo.indexOf("(Golf Ball)") < laudo.indexOf("Demais aspectos da morfologia fetal"));
}

check("MORFO sem flag/detecção: laudo intocado (sem Golf Ball)", (() => {
  const laudo = renderMorfologico(morfoBase, null, {});
  return !/Golf Ball|hiperecoica puntiforme/.test(laudo) &&
    laudo.includes("Morfologia fetal sem evidência de alteração detectável pelo método.");
})());

check("MORFO: eco em achados_adicionais deduplicado (snippet substitui)", (() => {
  const f = { ...morfoBase, achados_adicionais: "Foco ecogênico intracardíaco no ventrículo esquerdo. Pelve renal discretamente distendida." } as MorfologicoFindings;
  const laudo = renderMorfologico(f, null, { golfBall: { lado: "esquerdo", medida: null } });
  const ocorrencias = laudo.match(/[Ff]oco ecog[êe]nico/g) ?? [];
  return ocorrencias.length === 1 && laudo.includes("Pelve renal discretamente distendida");
})());

// ───────────── Integração: OBSTETRICA clássico (não-inicial) ─────────────

const obsBase = {
  ...nulled(ObstetricaFindingsSchema),
  numero_fetos: 1,
  gestacao_inicial: false,
  fetos: [],
  itens_conclusao_livres: [],
} as unknown as ObstetricaFindings;

{
  const laudo = renderObstetrica(obsBase, null, { golfBall: { lado: "direito", medida: null } });
  const linhas = laudo.split("\n");
  const iAnat = linhas.findIndex((l) => l.includes("O estômago e a bexiga"));
  check("OBST: corpo logo após a linha do estômago/bexiga",
    iAnat >= 0 && linhas[iAnat + 1] === "Imagem hiperecoica puntiforme no ventrículo direito.",
    laudo.slice(0, 400));
  check("OBST: conclusão tem o item Golf Ball + eco fetal", /\(Golf Ball\)/.test(laudo) && /ecocardiografia fetal/.test(laudo));
}

check("OBST sem detecção: laudo intocado", (() => {
  const laudo = renderObstetrica(obsBase, null, {});
  return !/Golf Ball|hiperecoica puntiforme/.test(laudo);
})());

// Gemelar (review dex1): o wire passa golfBall=null (feto único apenas); o achado
// ditado é preservado literal em achados_adicionais (nunca dropado).
{
  const gem = {
    ...obsBase,
    numero_fetos: 2,
    fetos: [],
    achados_adicionais: "Foco ecogênico intracardíaco no ventrículo esquerdo do feto B.",
  } as unknown as ObstetricaFindings;
  // Simula o wire: gemelar → golfBall=null (sem canonização, sem strip).
  const laudo = renderObstetrica(gem, null, { golfBall: null });
  check("OBST gemelar: achado preservado literal (não dropado, não canonizado)",
    laudo.includes("Foco ecogênico intracardíaco no ventrículo esquerdo do feto B.") &&
    !/\(Golf Ball\)/.test(laudo),
    laudo.slice(-300));
}

// ───────────── Integração: DOPPLER_OBSTETRICO clássico ─────────────

const dopBase = {
  ...nulled(DopplerObstetricoFindingsSchema),
  numero_fetos: 1,
  gestacao_inicial: false,
  vitalidade_ausente: false,
  fetos: [],
  itens_conclusao_livres: [],
} as unknown as DopplerObstetricoFindings;

{
  const laudo = renderDopplerObstetrico(dopBase, null, { golfBall: { lado: "esquerdo", medida: "0,4 cm" } });
  check("DOPPLER: corpo com a linha canônica no bloco de anatomia",
    laudo.includes("O estômago e a bexiga foram bem identificados e com ecotextura homogênea.\nImagem hiperecoica puntiforme no ventrículo esquerdo, medindo 0,4 cm no seu maior eixo."),
    laudo.slice(0, 500));
  check("DOPPLER: conclusão tem o item Golf Ball", /\(Golf Ball\)/.test(laudo));
}

check("DOPPLER sem detecção: laudo intocado", (() => {
  const laudo = renderDopplerObstetrico(dopBase, null, {});
  return !/Golf Ball|hiperecoica puntiforme/.test(laudo);
})());

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
