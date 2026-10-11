/**
 * W16C — conferência determinística da extração obstétrica: o critério de saco gestacional
 * sem embrião (gestacao_inviavel) não convive com embrião descrito.
 *
 * Rodar (de apps/api): pnpm exec tsx src/server/renderer/__tests__/obst-conferencia-det.manual.ts
 */
import assert from "node:assert/strict";
import { conferirBcfAlteracao, conferirDiametroMedioSaco, conferirInviabilidadeSemEmbriao, conferirRelacaoPlacenta, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { conferirVitalidadeMorfologico, type MorfologicoFindings } from "../categories/MORFOLOGICO";
import { conferirCrescimentoFetal } from "../categories/fetalGrowthModule";

const base = {
  gestacao_inicial: true,
  embriao_visualizado: true,
  gestacao_inviavel: true,
  fetos: [{ ccn_mm: 14, bcf_bpm: null }],
} as unknown as ObstetricaFindings;

const r = conferirInviabilidadeSemEmbriao(base);
assert.equal(r.findings.gestacao_inviavel, null, "com embrião (CCN 14) o critério sem embrião sai");
assert.match(r.aviso ?? "", /contradiz o embrião descrito \(CCN 14 mm\)/);

const anembrionada = { ...base, embriao_visualizado: false, fetos: [] } as unknown as ObstetricaFindings;
assert.equal(conferirInviabilidadeSemEmbriao(anembrionada).findings, anembrionada, "sem embrião: o critério fica");

const soBcf = { ...base, embriao_visualizado: null, fetos: [{ ccn_mm: null, bcf_bpm: 120 }] } as unknown as ObstetricaFindings;
assert.equal(conferirInviabilidadeSemEmbriao(soBcf).findings.gestacao_inviavel, null, "BCF também é embrião");

const semCriterio = { ...base, gestacao_inviavel: null } as unknown as ObstetricaFindings;
assert.equal(conferirInviabilidadeSemEmbriao(semCriterio).findings, semCriterio);

const sacoErrado = { saco_gestacional_mm: 4.3, saco_gestacional_medidas_mm: [37.1, 45, 4.3] } as unknown as ObstetricaFindings;
assert.equal(conferirDiametroMedioSaco(sacoErrado).saco_gestacional_mm, null, "DSM = uma das 3 medidas → o renderer calcula a média (28,8)");
const dsmDitado = { saco_gestacional_mm: 15.3, saco_gestacional_medidas_mm: null } as unknown as ObstetricaFindings;
assert.equal(conferirDiametroMedioSaco(dsmDitado), dsmDitado, "DSM ditado sem as 3 medidas fica");
const igualMedia = { saco_gestacional_mm: 10, saco_gestacional_medidas_mm: [10, 10, 10] } as unknown as ObstetricaFindings;
assert.equal(conferirDiametroMedioSaco(igualMedia), igualMedia, "coincide com a média: nada muda");

// BCF × classificação (68757f57: BCF 125 → "Bradicardia fetal.")
const bradi125 = { fetos: [{ bcf_bpm: 125, bcf_alteracao: "bradicardia" }] } as unknown as ObstetricaFindings;
const rb = conferirBcfAlteracao(bradi125);
assert.equal(rb.findings.fetos[0]!.bcf_alteracao, null);
assert.match(rb.aviso ?? "", /"bradicardia" com BCF de 125 bpm/);
const bradi95 = { fetos: [{ bcf_bpm: 95, bcf_alteracao: "bradicardia" }] } as unknown as ObstetricaFindings;
assert.equal(conferirBcfAlteracao(bradi95).findings, bradi95, "bradicardia real fica");
const taqui175 = { fetos: [{ bcf_bpm: 175, bcf_alteracao: "taquicardia" }] } as unknown as ObstetricaFindings;
assert.equal(conferirBcfAlteracao(taqui175).findings, taqui175, "taquicardia real fica");
const ausente = { fetos: [{ bcf_bpm: null, bcf_alteracao: "ausente" }] } as unknown as ObstetricaFindings;
assert.equal(conferirBcfAlteracao(ausente).findings, ausente, "BCF ausente nunca é tocado");
const morfo147 = { bcf_bpm: 147, vitalidade: "taquicardia" } as unknown as MorfologicoFindings;
assert.equal(conferirVitalidadeMorfologico(morfo147).findings.vitalidade, null, "morfológico: taquicardia com 147 sai");

// Crescimento fetal sem curva nomeada sai; com curva fica
const cresc = { crescimento_fetal: { efwPercentile: 6.3 } };
assert.equal(conferirCrescimentoFetal(cresc, "Peso fetal estimado: 2776 g\nPercentil: 6.30").crescimento_fetal, null);
assert.equal(conferirCrescimentoFetal(cresc, "PFE no percentil 6 pela curva de Hadlock, avaliar RCF"), cresc);
assert.equal(conferirCrescimentoFetal(cresc, "classificação de Barcelona: PIG"), cresc);

// Placenta: inserção baixa com a borda a 54 mm sai; a 15 mm fica; sem distância fica
const baixa54 = { placenta_relacao_orificio: "insercao_baixa", placenta_distancia_orificio_mm: 54 } as unknown as ObstetricaFindings;
const rp = conferirRelacaoPlacenta(baixa54);
assert.equal(rp.findings.placenta_relacao_orificio, null);
assert.equal(rp.findings.placenta_distancia_orificio_mm, 54, "a distância fica");
assert.match(rp.aviso ?? "", /a 54 mm do orifício interno/);
const baixa15 = { placenta_relacao_orificio: "insercao_baixa", placenta_distancia_orificio_mm: 15 } as unknown as ObstetricaFindings;
assert.equal(conferirRelacaoPlacenta(baixa15).findings, baixa15);
const semDist = { placenta_relacao_orificio: "previa", placenta_distancia_orificio_mm: null } as unknown as ObstetricaFindings;
assert.equal(conferirRelacaoPlacenta(semDist).findings, semDist);

console.log("obst-conferencia-det: 20/20");
