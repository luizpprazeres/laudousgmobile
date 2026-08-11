/// Serializa o glossário para JSON, para o bench.py (Python) consumir a MESMA
/// fonte de verdade que a produção usa — sem cópia manual que diverge.
import fs from "fs";
import {
  ALL_MEDICAL_ASR_KEYTERMS,
  medicalAsrKeytermsForCategory,
} from "../../apps/api/src/server/asr/medicalGlossary";
const cats = ["TIREOIDE","ABDOMEN_TOTAL","DOPPLER_VENOSO_MMII","OBSTETRICA","MUSCULOESQUELETICO_V2","MAMARIA"];
const out: Record<string,string[]> = { ALL: [...ALL_MEDICAL_ASR_KEYTERMS] };
for (const c of cats) out[c] = medicalAsrKeytermsForCategory(c);
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 0));
