/**
 * W16C — índices do bloco "Doppler obstétrico:" do app preenchem o que a extração deixou
 * vazio. Nunca sobrescreve; sem módulo Doppler (obstétrico simples) não cria nada.
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/renderer/__tests__/doppler-bloco-det.manual.ts
 */
import assert from "node:assert/strict";
import {
  completarPercentisBarcelona,
  conferirPerfilHemodinamico,
  DopplerObstetricoModuleSchema,
  mergeDopplerBloco,
  parseDopplerObstetricoBloco,
} from "../categories/dopplerObstetricoModule";

let ok = 0;
let falhas = 0;
function check(nome: string, fn: () => void) {
  try {
    fn();
    ok++;
    console.log(`✓ ${nome}`);
  } catch (err) {
    falhas++;
    console.error(`✗ ${nome}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}

const vazio = DopplerObstetricoModuleSchema.parse(
  Object.fromEntries(Object.keys(DopplerObstetricoModuleSchema.shape).map((k) => [k, null])),
);
const BLOCO = `Biometria fetal:
DBP: 8,92 cm

Doppler obstétrico:
IR uterina direita: 0.61
IP uterina direita: 0.91
IP uterina esquerda: 0,71
IP artéria umbilical: 0.95
IP artéria cerebral média: 1.51
IP ducto venoso: 0.52

Feto em apresentação cefálica, IP do ducto venoso de 0,9 dito por voz.`;

check("lê o bloco com rótulos do app (ponto ou vírgula) e para na linha vazia", () => {
  assert.deepEqual(parseDopplerObstetricoBloco(BLOCO), {
    ir_uterina_dir: 0.61,
    ip_uterina_dir: 0.91,
    ip_uterina_esq: 0.71,
    ip_umbilical: 0.95,
    ip_acm: 1.51,
    ip_ducto_venoso: 0.52,
  });
});
check("sem cabeçalho não lê (linhas soltas ditadas por voz)", () => {
  assert.equal(parseDopplerObstetricoBloco("IP uterina direita: 0.91\nIP artéria umbilical: 0.95"), null);
});
check("valor em conflito no bloco fica de fora", () => {
  assert.deepEqual(parseDopplerObstetricoBloco("Doppler obstétrico:\nIP artéria umbilical: 0.95\nIP artéria umbilical: 1.10\nIP ducto venoso: 0.5"), {
    ip_ducto_venoso: 0.5,
  });
});
check("preenche só o vazio; nunca sobrescreve o extraído", () => {
  const d = { ...vazio, ip_uterina_dir: 0.91, ip_ducto_venoso: 0.9 };
  const r = mergeDopplerBloco(d, BLOCO)!;
  assert.equal(r.ip_ducto_venoso, 0.9, "o extraído vence");
  assert.equal(r.ip_uterina_esq, 0.71);
  assert.equal(r.ip_acm, 1.51);
  assert.equal(r.ir_uterina_dir, 0.61);
  assert.equal(d.ip_uterina_esq, null, "a entrada não é mutada");
});
check("sem módulo Doppler (obstétrico simples) nada é criado", () => {
  assert.equal(mergeDopplerBloco(null, BLOCO), null);
  assert.equal(mergeDopplerBloco(undefined, BLOCO), undefined);
});
check("tudo já extraído: devolve o mesmo objeto", () => {
  const d = { ...vazio, ir_uterina_dir: 0.61, ip_uterina_dir: 0.91, ip_uterina_esq: 0.71, ip_umbilical: 0.95, ip_acm: 1.51, ip_ducto_venoso: 0.52 };
  assert.equal(mergeDopplerBloco(d, BLOCO), d);
});

check("perfil hemodinâmico que contradiz os IPs volta ao cálculo, com aviso (61a22347)", () => {
  const d = { ...vazio, ip_umbilical: 0.88, ip_acm: 1.33, perfil_hemodinamico: 1 };
  const r = conferirPerfilHemodinamico(d);
  assert.equal(r.modulo.perfil_hemodinamico, null);
  assert.match(r.aviso ?? "", /Perfil hemodinâmico extraído \(1,00\) não confere .* = 0,66\)/);
});
check("perfil coerente (arredondado) ou sem os dois IPs: nada muda", () => {
  const ok1 = { ...vazio, ip_umbilical: 0.88, ip_acm: 1.33, perfil_hemodinamico: 0.66 };
  assert.equal(conferirPerfilHemodinamico(ok1).modulo, ok1);
  const semAcm = { ...vazio, ip_umbilical: 0.88, perfil_hemodinamico: 1 };
  assert.equal(conferirPerfilHemodinamico(semAcm).modulo, semAcm);
  const pelaRcp = { ...vazio, ip_umbilical: 0.88, ip_acm: 1.33, rcp: 2, perfil_hemodinamico: 0.5 };
  assert.equal(conferirPerfilHemodinamico(pelaRcp).aviso, null, "RCP ditada manda");
});
check("IP médio das uterinas calculado quando o percentil veio sem ele (722892f9)", () => {
  const d = { ...vazio, ip_uterina_dir: 0.91, ip_uterina_esq: 0.71, perc_medio_uterinas: 52 };
  const r = completarPercentisBarcelona(d, { semanas: 28, dias: 5 });
  assert.equal(r.ip_medio_uterinas, 0.81);
  assert.equal(r.perc_medio_uterinas, 52, "o percentil ditado não muda");
});

console.log(`\ndoppler-bloco-det: ${ok}/${ok + falhas}`);
process.exit(falhas ? 1 : 0);
