/// Aplica o corretor determinístico sobre os transcripts crus do bench, para
/// medir o ganho da tabela SEPARADO do ganho dos keyterms.
import fs from "fs";
import { correctMedicalTerms } from "../../apps/api/src/server/asr/medicalTermCorrector";
const res = JSON.parse(fs.readFileSync(process.argv[2], "utf8")) as Record<string, string>;
const out: Record<string, string> = {};
for (const [k, v] of Object.entries(res)) out[k] = correctMedicalTerms(v);
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
