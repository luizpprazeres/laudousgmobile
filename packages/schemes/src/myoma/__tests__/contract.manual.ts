import assert from "node:assert/strict";
import {
  MYOMA_SCHEME_CONTRACT_VERSION,
  createMyomaSchemeContract,
  parseMyomaFindings,
} from "../index";

const vague = parseMyomaFindings("Nódulo miomatoso intramural na parede posterior, medindo 2,5 cm.");
assert.equal(vague.length, 1);
assert.equal(vague[0]!.figoConfirmed, false, "termo intramural vago não pode inferir FIGO");
assert.equal(createMyomaSchemeContract(vague), null, "FIGO não confirmado bloqueia envio");
const withoutLocation = parseMyomaFindings("Nódulo miomatoso FIGO 4, medindo 2,5 cm.");
assert.equal(withoutLocation[0]!.location, "not_informed", "localização ausente não pode virar anterior");
const explicitAnterior = parseMyomaFindings("Nódulo miomatoso FIGO 4 na face anterior, medindo 2,5 cm.");
assert.equal(explicitAnterior[0]!.location, "anterior", "face anterior explícita deve ser preservada");
const repeated = parseMyomaFindings("Mioma FIGO 4 medindo 2,0 cm. Mioma FIGO 4 medindo 2,0 cm.");
assert.equal(repeated.length, 2, "achados distintos com mesmos descritores não podem ser deduplicados");
const mixed = parseMyomaFindings("Mioma FIGO 4 medindo 2,0 cm. Outro mioma FIGO 5 na parede posterior. Conclusão: miomas uterinos.");
assert.equal(mixed.length, 2, "achado sem medida não pode sumir quando outro tem medida");

const explicit = parseMyomaFindings("Mioma FIGO 4 na parede posterior, hipoecoico, medindo 2,5 x 2,0 cm.");
const contract = createMyomaSchemeContract(explicit);
assert.ok(contract);
assert.equal(contract.contractVersion, MYOMA_SCHEME_CONTRACT_VERSION);
assert.equal(contract.findings[0]!.figo, 4);
assert.equal(contract.findings[0]!.location, "posterior");
assert.equal(contract.findings[0]!.sizeMaxMm, 25);

assert.equal(createMyomaSchemeContract([{ ...explicit[0]!, id: "a" }, { ...explicit[0]!, id: "a" }]), null, "ids duplicados bloqueiam contrato");
console.log("myoma scheme contract: OK");
