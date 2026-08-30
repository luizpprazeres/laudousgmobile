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

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
