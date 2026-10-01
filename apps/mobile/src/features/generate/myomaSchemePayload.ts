import {
  createMyomaSchemeContract,
  type MyomaFinding,
  type MyomaSchemeContract,
} from "@laudousg/schemes/myoma";

export type MyomaSalaPayload = {
  reportId?: string | null;
  examType: "MIOMAS";
  examLabel: string;
  contractVersion: MyomaSchemeContract["contractVersion"];
  findings: MyomaSchemeContract["findings"];
  png: string;
};

/** Falha fechado: somente FIGOs confirmados formam o contrato enviado à Sala. */
export function createMyomaSalaPayload(input: {
  reportId?: string | null;
  findings: MyomaFinding[];
  png: string;
}): MyomaSalaPayload | null {
  const contract = createMyomaSchemeContract(input.findings);
  if (!contract) return null;
  return {
    reportId: input.reportId,
    examType: contract.examType,
    examLabel: "Pelve — miomas (FIGO)",
    contractVersion: contract.contractVersion,
    findings: contract.findings,
    png: input.png,
  };
}
