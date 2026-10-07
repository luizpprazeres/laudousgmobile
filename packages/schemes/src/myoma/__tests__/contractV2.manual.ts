/**
 * Verificador manual do contrato DORMENTE `myoma-scheme/v2`.
 *
 * Rodar: ./node_modules/.bin/tsx packages/schemes/src/myoma/__tests__/contractV2.manual.ts
 */
import assert from "node:assert/strict";
import {
  MYOMA_SCHEME_CONTRACT_VERSION,
  MyomaSchemeContractSchema,
  createMyomaSchemeContract,
  parseMyomaFindings,
} from "../contract";
import * as myomaPublic from "../index";
import {
  MYOMA_SCHEME_V2_CONTRACT_VERSION,
  MyomaFigoV2Schema,
  MyomaFindingV2Schema,
  MyomaSchemeV2ContractSchema,
  canSendMyomaSchemeV2,
  createMyomaSchemeV2Contract,
  formatMyomaFigoV2,
  myomaEllipsoidVolumeCm3,
  myomaMaxAxisMm,
  myomaVolumeLabelV2,
  newMyomaFindingV2,
  parseSendableMyomaSchemeV2,
  resolveMyomaFigoV2,
  type MyomaFigoV2,
  type MyomaFindingV2,
} from "../contractV2";

const simple = (category: number): MyomaFigoV2 => ({ kind: "simples", category });
const hybrid = (endometrial: 2 | 3, serosal: 5 | 6): MyomaFigoV2 => ({ kind: "hibrida", endometrial, serosal });
const finding = (patch: Partial<Omit<MyomaFindingV2, "id">>, id = "m1") => MyomaFindingV2Schema.parse(newMyomaFindingV2(id, patch));

function expectResolved(item: MyomaFindingV2, figo: MyomaFigoV2, source: string, label: string) {
  const resolution = resolveMyomaFigoV2(item);
  assert.equal(resolution.status, "resolvida", `${label}: esperado resolvida, veio ${JSON.stringify(resolution)}`);
  if (resolution.status !== "resolvida") return;
  assert.deepEqual(resolution.figo, figo, `${label}: categoria`);
  assert.equal(resolution.source, source, `${label}: origem`);
}
function expectIncomplete(item: MyomaFindingV2, missing: string[], label: string) {
  const resolution = resolveMyomaFigoV2(item);
  assert.equal(resolution.status, "incompleta", `${label}: esperado incompleta, veio ${JSON.stringify(resolution)}`);
  assert.equal(resolution.figo, null, `${label}: incompleto nunca carrega categoria`);
  if (resolution.status === "incompleta") assert.deepEqual([...resolution.missing].sort(), [...missing].sort(), `${label}: pendências`);
}
function expectConflict(item: MyomaFindingV2, code: string, label: string) {
  const resolution = resolveMyomaFigoV2(item);
  assert.equal(resolution.status, "conflito", `${label}: esperado conflito, veio ${JSON.stringify(resolution)}`);
  assert.equal(resolution.figo, null, `${label}: conflito nunca carrega categoria`);
  if (resolution.status === "conflito") assert.ok(resolution.conflicts.some((conflict) => conflict.code === code), `${label}: código ${code} ausente em ${JSON.stringify(resolution.conflicts)}`);
  assert.equal(createMyomaSchemeV2Contract([item]), null, `${label}: conflito bloqueia o contrato`);
}

// --- Dormência e preservação do v1 ----------------------------------------
assert.ok(!("MyomaSchemeV2ContractSchema" in myomaPublic), "v2 não pode ser exportado por myoma/index.ts enquanto dormente");
assert.equal(MYOMA_SCHEME_CONTRACT_VERSION, "myoma-scheme/v1");
assert.equal(MYOMA_SCHEME_V2_CONTRACT_VERSION, "myoma-scheme/v2");
const v1 = createMyomaSchemeContract(parseMyomaFindings("Mioma FIGO 4 na parede posterior, medindo 2,5 x 2,0 cm."));
assert.ok(v1, "v1 continua gerando contrato");
assert.equal(MyomaSchemeV2ContractSchema.safeParse(v1).success, false, "v2 não aceita payload v1 (sem migração automática)");
const v2Sample = createMyomaSchemeV2Contract([finding({ site: "corpo_uterino", endometrium: "sem_contato", serosa: "sem_contato" })]);
assert.ok(v2Sample);
assert.equal(MyomaSchemeContractSchema.safeParse(v2Sample).success, false, "v1 não aceita payload v2");

// --- FIGO 0–8 derivada só pelas relações ------------------------------------
const corpus = { site: "corpo_uterino" as const };
expectResolved(finding({ ...corpus, endometrium: "intracavitario", serosa: "sem_contato", pedicle: "presente" }), simple(0), "derivada", "FIGO 0");
expectResolved(finding({ ...corpus, endometrium: "submucoso_intramural_menor_50", serosa: "sem_contato" }), simple(1), "derivada", "FIGO 1");
expectResolved(finding({ ...corpus, endometrium: "submucoso_intramural_maior_igual_50", serosa: "sem_contato" }), simple(2), "derivada", "FIGO 2");
expectResolved(finding({ ...corpus, endometrium: "contato_intramural_100", serosa: "sem_contato" }), simple(3), "derivada", "FIGO 3");
expectResolved(finding({ ...corpus, endometrium: "sem_contato", serosa: "sem_contato" }), simple(4), "derivada", "FIGO 4");
expectResolved(finding({ ...corpus, endometrium: "sem_contato", serosa: "subseroso_intramural_maior_igual_50" }), simple(5), "derivada", "FIGO 5");
expectResolved(finding({ ...corpus, endometrium: "sem_contato", serosa: "subseroso_intramural_menor_50" }), simple(6), "derivada", "FIGO 6");
expectResolved(finding({ ...corpus, endometrium: "sem_contato", serosa: "subseroso_exofitico", pedicle: "presente" }), simple(7), "derivada", "FIGO 7");
for (const site of ["cervical", "ligamento_largo", "parasitario", "outro_atipico"] as const) {
  expectResolved(finding({ site }), simple(8), "derivada", `FIGO 8 ${site}`);
}
expectResolved(finding({ site: "cervical", endometrium: "submucoso_intramural_maior_igual_50" }), simple(8), "derivada", "FIGO 8 cervical com relação local não vira 2");

// --- FIGO 0–8 declarada, com e sem relações ---------------------------------
for (let category = 0; category <= 8; category += 1) {
  expectResolved(finding({ declaredFigo: simple(category) }), simple(category), "declarada", `FIGO ${category} só declarada`);
}
expectResolved(
  finding({ ...corpus, wall: "posterior", endometrium: "sem_contato", serosa: "sem_contato", pedicle: "ausente", declaredFigo: simple(4) }),
  simple(4), "declarada_e_derivada", "FIGO 4 declarada e derivada",
);
expectResolved(finding({ site: "cervical", declaredFigo: simple(8) }), simple(8), "declarada_e_derivada", "FIGO 8 declarada e derivada");

// --- Híbridos ---------------------------------------------------------------
const HYBRIDS = [
  { figo: hybrid(2, 5), endometrium: "submucoso_intramural_maior_igual_50", serosa: "subseroso_intramural_maior_igual_50" },
  { figo: hybrid(3, 5), endometrium: "contato_intramural_100", serosa: "subseroso_intramural_maior_igual_50" },
  { figo: hybrid(2, 6), endometrium: "submucoso_intramural_maior_igual_50", serosa: "subseroso_intramural_menor_50" },
  { figo: hybrid(3, 6), endometrium: "contato_intramural_100", serosa: "subseroso_intramural_menor_50" },
] as const;
for (const { figo, endometrium, serosa } of HYBRIDS) {
  const label = formatMyomaFigoV2(figo);
  expectResolved(finding({ ...corpus, endometrium, serosa }), figo, "derivada", `${label} derivada`);
  expectResolved(finding({ declaredFigo: figo }), figo, "declarada", `${label} declarada`);
  expectResolved(finding({ ...corpus, endometrium, serosa, pedicle: "ausente", declaredFigo: figo }), figo, "declarada_e_derivada", `${label} declarada e derivada`);
  const resolution = resolveMyomaFigoV2(finding({ declaredFigo: figo }));
  assert.ok(resolution.status === "resolvida" && resolution.figo.kind === "hibrida", `${label} nunca vira categoria simples`);
  const contract = createMyomaSchemeV2Contract([finding({ declaredFigo: figo })]);
  assert.ok(contract && canSendMyomaSchemeV2(contract), `${label} declarada pode ser enviada`);
  assert.deepEqual(contract.findings[0]!.declaredFigo, figo, `${label} preservada no contrato`);
}
assert.equal(formatMyomaFigoV2(hybrid(2, 5)), "FIGO 2-5");
expectConflict(finding({ ...corpus, endometrium: "submucoso_intramural_maior_igual_50", serosa: "sem_contato", declaredFigo: hybrid(2, 5) }), "declarada_diverge_das_relacoes", "2-5 declarada sem contato seroso");
expectConflict(finding({ ...corpus, endometrium: "submucoso_intramural_maior_igual_50", serosa: "subseroso_intramural_maior_igual_50", declaredFigo: simple(2) }), "declarada_diverge_das_relacoes", "relações 2-5 com FIGO 2 declarada (não reduzir híbrido)");
expectConflict(finding({ ...corpus, endometrium: "submucoso_intramural_menor_50", serosa: "subseroso_intramural_menor_50", declaredFigo: hybrid(2, 6) }), "declarada_diverge_das_relacoes", "1-6 nas relações, 2-6 declarada");
for (const invalid of [
  { kind: "hibrida", endometrial: 0, serosal: 5 },
  { kind: "hibrida", endometrial: 1, serosal: 6 },
  { kind: "hibrida", endometrial: 2, serosal: 7 },
  { kind: "hibrida", endometrial: 4, serosal: 5 },
  { kind: "hibrida", endometrial: 2, serosal: 8 },
  { kind: "simples", category: 9 },
  { kind: "simples", category: 2.5 },
  { kind: "hibrida", endometrial: 2, serosal: 5, category: 2 },
]) {
  assert.equal(MyomaFigoV2Schema.safeParse(invalid).success, false, `FIGO inválida aceita: ${JSON.stringify(invalid)}`);
}

// --- Incompletos: nenhuma categoria presumida --------------------------------
expectIncomplete(finding({}), ["site", "endometrium", "serosa"], "achado vazio");
expectIncomplete(finding({ wall: "posterior" }), ["site", "endometrium", "serosa"], "só parede (termo 'intramural' vago não vira 4)");
expectIncomplete(finding({ endometrium: "sem_contato", serosa: "sem_contato" }), ["site"], "sem sítio não presume corpo uterino");
expectIncomplete(finding({ ...corpus, endometrium: "sem_contato" }), ["serosa"], "serosa não informada não vira 4");
expectIncomplete(finding({ ...corpus, serosa: "sem_contato" }), ["endometrium"], "endométrio não informado não vira 4");
expectIncomplete(finding({ ...corpus, endometrium: "contato_grau_nao_informado", serosa: "sem_contato" }), ["endometrium_grade"], "toca endométrio sem fração não escolhe 1/2/3");
expectIncomplete(finding({ ...corpus, endometrium: "sem_contato", serosa: "contato_grau_nao_informado" }), ["serosa_grade"], "toca serosa sem fração não escolhe 5/6");
expectIncomplete(finding({ ...corpus, endometrium: "submucoso_intramural_maior_igual_50", serosa: "contato_grau_nao_informado" }), ["serosa_grade"], "híbrido sem fração serosa não vira 2");
expectIncomplete(finding({ ...corpus, endometrium: "submucoso_intramural_maior_igual_50" }), ["serosa"], "2 sem serosa não vira 2 nem 2-5");
expectIncomplete(finding({ ...corpus, endometrium: "intracavitario" }), ["pedicle"], "intracavitário sem pedículo informado não vira 0");
expectIncomplete(finding({ ...corpus, serosa: "subseroso_exofitico" }), ["pedicle"], "exofítico sem pedículo informado não vira 7");
expectIncomplete(finding({ ...corpus, pedicle: "presente", endometrium: "contato_grau_nao_informado", serosa: "sem_contato" }), ["endometrium_grade", "pedicle_insertion"], "pedículo sem inserção definida não vira 0");
expectIncomplete(finding({ ...corpus, pedicle: "presente" }), ["endometrium", "serosa", "pedicle_insertion"], "pedículo isolado não vira 0 nem 7");
const incompleteContract = createMyomaSchemeV2Contract([finding({ ...corpus, endometrium: "contato_grau_nao_informado", serosa: "sem_contato" })]);
assert.ok(incompleteContract, "incompleto é aceito no contrato, sem categoria");
assert.equal(canSendMyomaSchemeV2(incompleteContract), false, "incompleto não pode ser enviado");

// --- Conflitos bloqueantes ---------------------------------------------------
expectConflict(finding({ ...corpus, endometrium: "intracavitario", pedicle: "ausente" }), "pediculo_ausente_com_relacao_pediculada", "intracavitário sem pedículo");
expectConflict(finding({ ...corpus, endometrium: "submucoso_intramural_menor_50", serosa: "subseroso_intramural_menor_50" }), "hibrida_anatomicamente_incompativel", "FIGO 1 não forma híbrida com contato seroso");
expectConflict(finding({ ...corpus, serosa: "subseroso_exofitico", pedicle: "ausente" }), "pediculo_ausente_com_relacao_pediculada", "exofítico sem pedículo");
expectConflict(finding({ ...corpus, endometrium: "intracavitario", serosa: "subseroso_intramural_menor_50", pedicle: "presente" }), "pediculado_nao_forma_hibrido", "0 com serosa");
expectConflict(finding({ ...corpus, endometrium: "submucoso_intramural_menor_50", serosa: "subseroso_exofitico", pedicle: "presente" }), "pediculado_nao_forma_hibrido", "7 com endométrio");
expectConflict(finding({ ...corpus, endometrium: "intracavitario", serosa: "subseroso_exofitico", pedicle: "presente" }), "pediculado_nao_forma_hibrido", "0 e 7 ao mesmo tempo");
expectConflict(finding({ ...corpus, endometrium: "sem_contato", serosa: "sem_contato", pedicle: "presente" }), "pediculo_sem_ancoragem", "pedículo sem inserção possível");
expectConflict(finding({ ...corpus, endometrium: "submucoso_intramural_maior_igual_50", serosa: "sem_contato", pedicle: "presente" }), "pediculo_com_relacao_sessil", "pedículo com submucoso séssil");
expectConflict(finding({ ...corpus, endometrium: "sem_contato", serosa: "subseroso_intramural_menor_50", pedicle: "presente" }), "pediculo_com_relacao_sessil", "pedículo com subseroso séssil");
expectConflict(finding({ site: "ligamento_largo", endometrium: "submucoso_intramural_menor_50" }), "sitio_atipico_com_contato_endometrial", "ligamento largo tocando endométrio");
expectConflict(finding({ site: "cervical", wall: "fundica" }), "parede_incompativel_com_sitio", "cervical fúndico");
expectConflict(finding({ site: "corpo_uterino", declaredFigo: simple(8) }), "declarada_diverge_das_relacoes", "FIGO 8 no corpo uterino");
expectConflict(finding({ site: "cervical", declaredFigo: simple(4) }), "declarada_diverge_das_relacoes", "FIGO 4 cervical");
expectConflict(finding({ endometrium: "sem_contato", declaredFigo: simple(2) }), "declarada_diverge_das_relacoes", "FIGO 2 sem contato endometrial");
expectConflict(finding({ endometrium: "contato_grau_nao_informado", declaredFigo: simple(4) }), "declarada_diverge_das_relacoes", "FIGO 4 tocando endométrio");
expectConflict(finding({ pedicle: "presente", declaredFigo: simple(4) }), "declarada_diverge_das_relacoes", "FIGO 4 pediculado");
expectConflict(finding({ pedicle: "ausente", declaredFigo: simple(7) }), "declarada_diverge_das_relacoes", "FIGO 7 sem pedículo");
expectConflict(finding({ serosa: "subseroso_intramural_maior_igual_50", declaredFigo: simple(6) }), "declarada_diverge_das_relacoes", "FIGO 6 com fração de 5");
// Compatível: o informado não contradiz, o resto fica com a declaração.
expectResolved(finding({ endometrium: "contato_grau_nao_informado", declaredFigo: simple(1) }), simple(1), "declarada", "FIGO 1 declarada com contato sem fração");
const conflictIssues = MyomaSchemeV2ContractSchema.safeParse({
  contractVersion: MYOMA_SCHEME_V2_CONTRACT_VERSION,
  examType: "MIOMAS",
  findings: [finding({ ...corpus, endometrium: "intracavitario", pedicle: "ausente" })],
});
assert.ok(!conflictIssues.success && conflictIssues.error.issues.some((issue) => issue.path.join(".") === "findings.0.pedicle"), "conflito aponta o campo no contrato");

// --- Dimensões e volume -----------------------------------------------------
assert.equal(MyomaFindingV2Schema.safeParse(newMyomaFindingV2("x", { dimensions: { unit: "cm", values: [4, 3] } as never })).success, false, "exige três dimensões");
assert.equal(MyomaFindingV2Schema.safeParse(newMyomaFindingV2("x", { dimensions: { values: [4, 3, 2] } as never })).success, false, "exige unidade");
assert.equal(MyomaFindingV2Schema.safeParse(newMyomaFindingV2("x", { dimensions: { unit: "pol", values: [4, 3, 2] } as never })).success, false, "unidade desconhecida");
assert.equal(MyomaFindingV2Schema.safeParse(newMyomaFindingV2("x", { dimensions: { unit: "mm", values: [40, 0, 20] } })).success, false, "eixo zero");
assert.equal(MyomaFindingV2Schema.safeParse(newMyomaFindingV2("x", { dimensions: { unit: "cm", values: [51, 3, 2] } })).success, false, "eixo acima de 500 mm");
assert.equal(MyomaFindingV2Schema.safeParse(newMyomaFindingV2("x", { dimensions: { unit: "mm", values: [500, 3, 2] } })).success, true, "500 mm no limite");

const inCm = { unit: "cm" as const, values: [4, 3, 2] as [number, number, number] };
const inMm = { unit: "mm" as const, values: [40, 30, 20] as [number, number, number] };
const expectedVolume = (Math.PI / 6) * 4 * 3 * 2;
assert.ok(Math.abs(myomaEllipsoidVolumeCm3(inCm)! - expectedVolume) < 1e-9, "elipsoide em cm");
assert.ok(Math.abs(myomaEllipsoidVolumeCm3(inMm)! - expectedVolume) < 1e-9, "elipsoide em mm = em cm");
assert.equal(myomaEllipsoidVolumeCm3(null), null);
assert.equal(myomaMaxAxisMm(inCm), 40);
assert.equal(myomaMaxAxisMm(null), null);

const measured = finding({ declaredFigo: simple(4), dimensions: inCm });
const hiddenVolume = createMyomaSchemeV2Contract([measured]);
assert.ok(hiddenVolume);
assert.equal(hiddenVolume.display.showVolume, false, "exibição de volume desligada por padrão");
assert.equal(myomaVolumeLabelV2(hiddenVolume, measured), null, "sem opt-in não exibe volume");
assert.equal(createMyomaSchemeV2Contract([measured], {})?.display.showVolume, false, "display vazio também fica desligado");
assert.ok(!("volume" in hiddenVolume.findings[0]!), "volume não é gravado no contrato");
const shownVolume = createMyomaSchemeV2Contract([measured], { showVolume: true });
assert.ok(shownVolume);
assert.equal(myomaVolumeLabelV2(shownVolume, measured), "12,6 cm³", "opt-in exibe volume do elipsoide");
assert.equal(myomaVolumeLabelV2(shownVolume, finding({ declaredFigo: simple(4) })), null, "sem medidas não há volume");
assert.equal(createMyomaSchemeV2Contract([measured], { showVolume: "sim" as never }), null, "opt-in precisa ser booleano");

// --- Envelope -----------------------------------------------------------------
assert.equal(createMyomaSchemeV2Contract([]), null, "pelo menos um achado");
assert.equal(createMyomaSchemeV2Contract([finding({ declaredFigo: simple(4) }, "a"), finding({ declaredFigo: simple(5) }, "a")]), null, "ids duplicados bloqueiam");
assert.equal(createMyomaSchemeV2Contract([{ ...finding({ declaredFigo: simple(4) }), figo: 4 }]), null, "campo do v1 não entra no v2");
assert.equal(createMyomaSchemeV2Contract(Array.from({ length: 21 }, (_, index) => finding({ declaredFigo: simple(4) }, `m${index}`))), null, "máximo de 20 achados");
const mixed = createMyomaSchemeV2Contract([
  finding({ declaredFigo: hybrid(2, 5) }, "a"),
  finding({ ...corpus, endometrium: "sem_contato", serosa: "sem_contato" }, "b"),
]);
assert.ok(mixed && canSendMyomaSchemeV2(mixed), "declarado + derivado resolvidos podem ser enviados");
assert.equal(createMyomaSchemeV2Contract([
  finding({ declaredFigo: simple(4) }, "a"),
  finding({ ...corpus, endometrium: "intracavitario", pedicle: "ausente" }, "b"),
]), null, "um achado em conflito bloqueia o contrato inteiro");
assert.equal(canSendMyomaSchemeV2({ contractVersion: MYOMA_SCHEME_V2_CONTRACT_VERSION, examType: "MIOMAS", findings: [] }), false);
const rawWithoutDisplay = {
  contractVersion: MYOMA_SCHEME_V2_CONTRACT_VERSION,
  examType: "MIOMAS",
  findings: [finding({ declaredFigo: simple(4) })],
};
assert.equal(canSendMyomaSchemeV2(rawWithoutDisplay), true, "validação booleana aceita o default sem refinar o objeto cru");
assert.equal("display" in rawWithoutDisplay, false, "o validador não finge ter mutado o objeto cru");
assert.deepEqual(parseSendableMyomaSchemeV2(rawWithoutDisplay)?.display, { showVolume: false }, "o parser devolve o default materializado");

console.log("myoma scheme contract v2 (dormente): OK");
