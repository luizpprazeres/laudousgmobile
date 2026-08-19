/**
 * A SANIDADE DE IG não pode bloquear o catálogo em laudo que ela não muda.
 *
 * `OBST_IG_SANITY` é uma flag, e estava decidindo se o CATÁLOGO cobria o caso:
 * ligada, o catálogo nunca rodava. Pego em produção no primeiro dia (19/08) —
 * o Luiz ditou "batimentos cardíacos fetais não visualizados" e recebeu
 * "Batimentos cardíacos ritmados (BCF = ____ bpm)", porque o renderer clássico
 * ignora `bcf_alteracao`. Mesmo defeito da biometria determinística em 12/08.
 *
 *   pnpm exec tsx --env-file=../../.env src/server/renderer/__tests__/ig-sanity-nao-bloqueia-catalogo.manual.ts
 */
import { igSanityAltera, renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { renderObstetricaCatalogo } from "../catalog/OBSTETRICA.render";
import { OBSTETRICA_SAMPLES } from "../catalog/OBSTETRICA.samples";

let ok = 0;
const falhas: string[] = [];
const t = (nome: string, cond: boolean, extra = "") => {
  if (cond) ok++;
  else falhas.push(`${nome}${extra ? ` — ${extra}` : ""}`);
};

const FLAGS = { objetivo: false, igCorrection: true, flexivel: false, grannum: false };

console.log("\nA sanidade de IG não bloqueia o catálogo\n");

// 1 · nos cenários reais do catálogo ela não atua — logo o catálogo cobre todos
for (const s of OBSTETRICA_SAMPLES) {
  const f = s.findings as ObstetricaFindings;
  t(`cenário "${s.id}": a sanidade não altera a IG`, !igSanityAltera(f, true));
  // E a prova de que não alterar significa mesmo texto:
  t(
    `cenário "${s.id}": com e sem sanidade o clássico escreve o mesmo laudo`,
    renderObstetrica(f, null, { ...FLAGS, igSanity: false }) ===
      renderObstetrica(f, null, { ...FLAGS, igSanity: true }),
  );
}

// 2 · o caso que motivou tudo: BCF ausente
{
  const base = OBSTETRICA_SAMPLES.find((x) => x.id === "inicial")!.findings as ObstetricaFindings;
  const semVitalidade = {
    ...base,
    fetos: [{ ...(base.fetos?.[0] ?? {}), bcf_bpm: null, bcf_alteracao: "ausente" }],
  } as ObstetricaFindings;

  t("a sanidade não atua no laudo de óbito fetal", !igSanityAltera(semVitalidade, true));

  const classico = renderObstetrica(semVitalidade, null, { ...FLAGS, igSanity: true });
  const catalogo = renderObstetricaCatalogo({ findings: semVitalidade, flags: FLAGS });

  t("o CLÁSSICO afirma batimentos que não existem",
    classico.includes("Batimentos cardíacos ritmados"),
    "se isto falhar, o clássico foi corrigido e o teste precisa mudar");
  t("o CATÁLOGO diz que não foram visualizados",
    catalogo.includes("não visualizados pelo modo B ou pelo modo Doppler"),
    catalogo.split("\n").find((l) => l.includes("Batimento")) ?? "sem linha de BCF");
  t("…e conclui a ausência de vitalidade",
    /sem vitalidade/i.test(catalogo),
    catalogo.split("CONCLUS")[1]?.slice(0, 120) ?? "");
  t("o clássico NÃO conclui nada sobre vitalidade",
    !/sem vitalidade/i.test(classico));
}

// 3 · quando a sanidade REALMENTE atua, o catálogo se abstém
{
  // Divergência implausível: referência precoce muito distante da biometria.
  const f = {
    ...(OBSTETRICA_SAMPLES[0]!.findings as ObstetricaFindings),
    ig_referencia_data: "2026-01-05",
    ig_referencia_semanas: 6,
    ig_referencia_dias: 0,
  } as ObstetricaFindings;
  const atua = igSanityAltera(f, true);
  console.log(`  [diag] cenário de divergência: a sanidade ${atua ? "ATUA" : "não atua"}`);
  if (atua) {
    t("quando atua, os dois caminhos divergem — e o catálogo deve se abster",
      renderObstetrica(f, null, { ...FLAGS, igSanity: false }) !==
        renderObstetrica(f, null, { ...FLAGS, igSanity: true }));
  }
}

const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) console.log(`✓ ${ok}/${total} — a flag não decide mais pelo laudo`);
else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
