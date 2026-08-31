/** Gate do contrato de imagem por exame-base + módulos. */
import { mergeBiometricData, validateBiometricData } from "./extractor";

let pass = 0;
let fail = 0;
function check(name: string, condition: boolean) {
  if (condition) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}`);
  }
}

const morfo = validateBiometricData(
  { dbp: "49.8 mm", cerebellum: "22.3 mm", ipUmbilical: "1.02" },
  "MORFOLOGICO",
);
const doppler = validateBiometricData(
  {
    irRightUterine: "0.59",
    ipRightUterine: "0.81",
    irUmbilical: "0.58",
    ipUmbilical: "1.02",
    irMCA: "0.81",
    ipMCA: "1.48",
    dbp: "valor que o leitor Doppler não deveria enviar",
  },
  "DOPPLER_OBSTETRICO",
);
const merged = mergeBiometricData([morfo, doppler], { dopplerAware: true });

check("base morfológica preservada", merged.dbp === "49.8 mm" && merged.cerebellum === "22.3 mm");
check("Doppler descartado pelo parser-base não vaza", morfo.ipUmbilical === undefined);
check("IR e IP entram pelo módulo especializado", merged.irUmbilical === "0.58" && merged.ipUmbilical === "1.02");
check("uterina e ACM mantêm IR/IP separados", merged.irRightUterine === "0.59" && merged.ipRightUterine === "0.81" && merged.irMCA === "0.81" && merged.ipMCA === "1.48");
check("biometria alucinada pelo leitor Doppler não sobrescreve a base", merged.dbp === "49.8 mm");

const invalido = validateBiometricData(
  { irUmbilical: "12.4", ipUmbilical: "08:45", irMCA: "0.72" },
  "DOPPLER_OBSTETRICO",
);
check("barreira elimina falsos índices", invalido.irUmbilical === undefined && invalido.ipUmbilical === undefined);
check("índice plausível sobrevive", invalido.irMCA === "0.72");

const thyroidA = validateBiometricData(
  {
    thyroidRightLobe: { a: "42 mm", b: "1.6 cm", c: "18 mm" },
    thyroidNodules: [
      { lobe: "lobo_direito", c1: "12 mm", c2: "0.9 cm", c3: "8 mm", echogenicity: "hipoecoica", margin: "regular" },
      { lobe: "desconhecido", c1: "1.0" },
    ],
  },
  "TIREOIDE",
);
const thyroidB = validateBiometricData(
  { thyroidLeftLobe: { a: "4.0", b: "1.4", c: "1.7" }, thyroidNodules: [{ lobe: "lobo_esquerdo", c1: "0.7", c2: "0.5" }] },
  "TIREOIDE",
);
const thyroidMerged = mergeBiometricData([thyroidA, thyroidB]);
check("tireoide converte mm para cm", thyroidMerged.thyroidRightLobe?.a === "4.2" && thyroidMerged.thyroidNodules?.[0]?.c1 === "1.2");
check("tireoide preserva lobos de imagens diferentes", thyroidMerged.thyroidLeftLobe?.a === "4");
check("nódulo sem lado conhecido é recusado", thyroidMerged.thyroidNodules?.length === 2);
check("descritores permitidos sobrevivem", thyroidMerged.thyroidNodules?.[0]?.echogenicity === "hipoecoica" && thyroidMerged.thyroidNodules?.[0]?.margin === "regular");

const breastA = validateBiometricData({ breastFindings: [
  { side: "direita", type: "nodulo", c1: "12 mm", c2: "0.9 cm", c3: "8 mm", margin: "circunscrita" },
  { side: "direita", type: "cisto_simples", c1: "0.6", c2: "0.5", c3: "0.4" },
  { side: "desconhecida", type: "nodulo", c1: "1.5" },
] }, "MAMARIA");
const breastB = validateBiometricData({ breastFindings: [
  { side: "esquerda", type: "nodulo", c1: "0.8", c2: "0.7", shape: "irregular" },
] }, "MAMARIA");
const breastMerged = mergeBiometricData([breastA, breastB]);
check("mama preserva múltiplos achados e converte mm", breastMerged.breastFindings?.length === 3 && breastMerged.breastFindings[0]?.c1 === "1.2");
check("achado mamário sem lado é recusado", breastMerged.breastFindings?.every((finding) => finding.side === "direita" || finding.side === "esquerda") === true);
check("visão mamária não cria BI-RADS", breastMerged.breastFindings?.every((finding) => !("birads" in finding)) === true);

const carotids = validateBiometricData({
  carotidMeasurements: [
    { side: "direita", vessel: "interna", psv: "82 cm/s", vdf: "24", ir: "0.71" },
    { side: "esquerda", vessel: "vertebral", psv: "41", flowDirection: "anterogrado" },
    { side: "", vessel: "interna", psv: "90" },
  ],
  carotidPlaques: [
    { side: "direita", location: "bulbo carotídeo", thickness: "2,1 mm" },
    { side: "esquerda", stenosisPercent: "120" },
  ],
  stenosisGrade: "grave",
}, "DOPPLER_CAROTIDAS");
check("carótidas exige lado e vaso", carotids.carotidMeasurements?.length === 2);
check("carótidas normaliza velocidades", carotids.carotidMeasurements?.[0]?.psv === "82");
check("carótidas preserva direção vertebral", carotids.carotidMeasurements?.[1]?.flowDirection === "anterogrado");
check("carótidas rejeita percentual impossível", carotids.carotidPlaques?.[0]?.stenosisPercent === undefined);
check("carótidas não aceita classificação da visão", !("stenosisGrade" in carotids));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
