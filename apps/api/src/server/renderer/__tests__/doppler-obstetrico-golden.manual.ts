/**
 * Golden determinístico do renderer DOPPLER_OBSTETRICO (DET).
 * Caso-base = d213131b (RCF real, boletim 28/06): IG Domingos, percentis do input,
 * MBV (não ILA), peso <P3 + Gratacós, boilerplate Doppler normal.
 * Rodar: tsx src/server/renderer/__tests__/doppler-obstetrico-golden.manual.ts
 */
import {
  renderDopplerObstetrico,
  mergeStructuredIg,
  type DopplerObstetricoFindings,
} from "../categories/DOPPLER_OBSTETRICO";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

type Feto = DopplerObstetricoFindings["fetos"][number];
const feto = (p: Partial<Feto>): Feto => ({
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 140, dbp_mm: null, cc_mm: null, ca_mm: null,
  cf_mm: null, ccn_mm: null, peso_g: null, peso_variacao_g: null, percentil: null, bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null, cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
  ...p,
});

const F = (p: Partial<DopplerObstetricoFindings>): DopplerObstetricoFindings => ({
  // obstétrico
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
  fetos: [feto({})], ig_semanas: 24, ig_dias: 6, dum: null,
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: null,
  placenta_ecotextura: null, placenta_grau: null, placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null, liquido_tipo: null,
  liquido_ila_cm: null, liquido_mbv_por_feto_cm: null, liquido_classe: null,
  achados_adicionais: null, itens_conclusao_livres: [], observacoes_corpo_livres: [],
  // doppler
  ip_umbilical: null, perc_umbilical: null, ip_acm: null, perc_acm: null,
  ip_uterina_dir: null, ip_uterina_esq: null, ip_medio_uterinas: null,
  perc_medio_uterinas: null, ducto_venoso_ip: null, ducto_venoso_qualitativo: null,
  rcp: null, umbilical_alterado: null, acm_alterado: null, incisura: null,
  ectasia: null, pre_centralizacao: null, centralizacao: null,
  uterinas_acima_p95: null, restricao_crescimento: null, vitalidade_ausente: null,
  ...p,
});

// Caso-base d213131b: RCF, IG Domingos, percentis, MBV, Doppler normal.
const RCF = (over: Partial<DopplerObstetricoFindings> = {}) =>
  F({
    fetos: [feto({ apresentacao: "cefálica", dorso: "à esquerda", bcf_bpm: 130, dbp_mm: 66.3, cc_mm: 241.3, ca_mm: 208.1, cf_mm: 43.6, peso_g: 775, peso_variacao_g: 113, percentil: 2 })],
    ig_semanas: 24, ig_dias: 6,
    data_exame: "28/06/2026", primeira_us_data: "28/06/2026",
    primeira_us_ig_semanas: 26, primeira_us_ig_dias: 6,
    referencia_fonte: "usg_precoce", corrigir_ig: true,
    restricao_crescimento: true,
    liquido_tipo: "mbv", liquido_mbv_por_feto_cm: [2.9],
    ip_umbilical: 1.27, perc_umbilical: 46, ip_acm: 2.31, perc_acm: 88,
    ip_uterina_dir: 0.97, ip_uterina_esq: 0.76, ip_medio_uterinas: 0.86, perc_medio_uterinas: 37,
    ducto_venoso_ip: 0.46,
    ...over,
  });

// ── Estrutura ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("título com Doppler colorido", /^ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO/.test(l), l);
  check("tem COMENTÁRIOS", /COMENTÁRIOS:/.test(l), l);
  check("tem OS SEGUINTES ASPECTOS", /OS SEGUINTES ASPECTOS FORAM OBSERVADOS:/.test(l), l);
  check("tem DOPPLERVELOCIMETRIA", /DOPPLERVELOCIMETRIA:/.test(l), l);
  check("tem CONCLUSÃO", /CONCLUSÃO:/.test(l), l);
}

// ── IG Domingos (correção >5d) ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check(
    "IG: frase de correção Domingos",
    /Gestação em torno de 24 semanas e 6 dias pela biometria atual, devendo ser corrigida pela ultrassonografia precoce, compatível com 26 semanas e 6 dias\./.test(l),
    l,
  );
}

// ── IG flag OFF: degrada p/ biometria pura (byte-stable) ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: false });
  check("IG OFF: só biometria, sem correção", /Gestação em torno de 24 semanas e 6 dias\./.test(l) && !/devendo ser corrigida/.test(l), l);
}

// ── Percentis do input PRESERVADOS na seção ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("percentil umbilical preservado", /Artéria umbilical: IP 1,27 \(percentil 46\)\./.test(l), l);
  check("percentil ACM preservado", /Artéria cerebral média: IP 2,31 \(percentil 88\)\./.test(l), l);
  check("IP médio uterinas + percentil", /IP médio das artérias uterinas mede 0,86 \(percentil 37\)\./.test(l), l);
  check("ducto venoso IP numérico", /Ducto venoso: IP 0,46\./.test(l), l);
}

// ── Líquido: MBV (NUNCA ILA), frase canônica do Luiz ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("corpo: 'O maior bolsão vertical mede 2,9 cm.'", /O maior bolsão vertical mede 2,9 cm\./.test(l), l);
  check("conclusão: 'Líquido amniótico de quantidade normal (maior bolsão vertical mede 2,9 cm).'", /Líquido amniótico de quantidade normal \(maior bolsão vertical mede 2,9 cm\)\./.test(l), l);
  check("NUNCA rotula bolsão como ILA/índice", !/[íi]ndice d[oe] l[íi]quido amni[óo]tico/i.test(l), l);
}

// ── Placenta com sufixo canônico do Doppler ──
{
  const l = renderDopplerObstetrico(RCF({ placenta_localizacao: "anterior", placenta_ecotextura: "homogênea" }), null, { igCorrection: true });
  check("placenta com 'de acordo com a fase da gestação'", /Placenta de localização anterior, com ecotextura homogênea, de acordo com a fase da gestação\./.test(l), l);
}

// ── Peso usa "g" (não "gramas") ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("peso em 'g' (não 'gramas')", /Peso aproximado de 775 g \(\+- 113 g, percentil 2\)\./.test(l) && !/gramas/.test(l), l);
}

// ── Linha de perfil NÃO aparece no corpo; conclusão mantém a frase ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("sem 'Perfil hemodinâmico fetal: X.' no corpo", !/Perfil hemodinâmico fetal: [0-9]/.test(l), l);
  check("conclusão mantém perfil normal", /Perfil hemodinâmico fetal é normal, menor de 1\.0\./.test(l), l);
}

// ── SEGURANÇA: gestação inicial e óbito → throw (fallback writer) ──
{
  let threw = false;
  try { renderDopplerObstetrico(RCF({ gestacao_inicial: true }), null, { igCorrection: true }); } catch { threw = true; }
  check("gestação inicial → throw (fallback)", threw);
}
{
  let threw = false;
  try { renderDopplerObstetrico(RCF({ vitalidade_ausente: true }), null, { igCorrection: true }); } catch { threw = true; }
  check("óbito/sem vitalidade → throw (fallback)", threw);
}

// ── Peso <P3 → P3 + Gratacós ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("peso abaixo do P3", /O peso fetal encontra-se abaixo do percentil 3 para a idade gestacional\./.test(l), l);
  check("Gratacós estágio I", /Sinais de restrição do crescimento fetal, estágio I de Gratacós\./.test(l), l);
}

// ── Peso 10–95 → SEM item de peso ──
{
  const l = renderDopplerObstetrico(RCF({ fetos: [feto({ apresentacao: "cefálica", dbp_mm: 80, peso_g: 2200, percentil: 45 })], restricao_crescimento: null }), null, { igCorrection: true });
  check("peso 10–95: sem item de peso", !/abaixo do percentil|Gratac[óo]s|P\.?I\.?G/i.test(l), l);
}

// ── Boilerplate Doppler normal completo ──
{
  const l = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("IP normal (3 vasos)", /Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média\./.test(l), l);
  check("ausência de incisuras", /Ausência de sinais de incisuras\./.test(l), l);
  check("sem pré/centralização", /Não há sinais de pré-centralização ou de centralização\./.test(l), l);
  check("perfil normal <1.0", /Perfil hemodinâmico fetal é normal, menor de 1\.0\./.test(l), l);
}

// ── Uterinas > P95 ──
{
  const l = renderDopplerObstetrico(RCF({ perc_medio_uterinas: 97 }), null, { igCorrection: true });
  check("uterinas >P95 na conclusão", /IP médio das artérias uterinas acima do percentil 95 para a idade gestacional\./.test(l), l);
  check("IP normal exclui uterinas", /Índices de pulsatilidade normais nas artérias umbilical e cerebral média\./.test(l), l);
}

// ── Byte-stability: render 2x idêntico ──
{
  const a = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  const b = renderDopplerObstetrico(RCF(), null, { igCorrection: true });
  check("byte-stability (2x idêntico)", a === b);
}

// ── mergeStructuredIg: bloco estruturado do app vence garble de ASR (segurança) ──
{
  // d213131b: prose tinha "hoje com 20...6 dias" (garble); estruturado = DUM 26s6d.
  const raw = "IG pela DUM: 26s6d\nIG pela biometria: 24s6d\n...hoje com 20 e semanas e 6 dias...";
  const m = mergeStructuredIg(F({ ig_semanas: 99, ig_dias: 9, ig_referencia_hoje_semanas: 20, ig_referencia_hoje_dias: 6, referencia_fonte: null }), raw);
  check("merge IG: biometria do bloco (24s6d)", m.ig_semanas === 24 && m.ig_dias === 6, JSON.stringify(m));
  check("merge IG: referência do bloco (26s6d, não 20)", m.ig_referencia_hoje_semanas === 26 && m.ig_referencia_hoje_dias === 6, JSON.stringify(m));
  check("merge IG: fonte = dum", m.referencia_fonte === "dum");
}
{
  const raw = "IG pela ultrassonografia precoce: 41s0d\nIG pela biometria: 38s4d";
  const m = mergeStructuredIg(F({}), raw);
  check("merge IG: US precoce → fonte usg_precoce + 41s0d", m.referencia_fonte === "usg_precoce" && m.ig_referencia_hoje_semanas === 41 && m.ig_referencia_hoje_dias === 0, JSON.stringify(m));
  check("merge IG: âncora biometria 38s4d", m.ig_semanas === 38 && m.ig_dias === 4);
}
{
  // Sem bloco estruturado → findings intocados (confia na extração).
  const orig = F({ ig_semanas: 30, ig_dias: 2, referencia_fonte: "usg_precoce" });
  const m = mergeStructuredIg(orig, "Sonografia obstétrica com doppler, feto cefálico.");
  check("merge IG: sem bloco → intocado", m.ig_semanas === 30 && m.ig_dias === 2 && m.referencia_fonte === "usg_precoce");
}

// SEGURANÇA gemelar (boletim 2026-06-30, 9cb5204c): 2+ fetos → throw → writer.
{
  const twinN = F({ numero_fetos: 2, fetos: [feto({}), feto({})] });
  let threw = false;
  try { renderDopplerObstetrico(twinN, null, { igCorrection: true }); }
  catch { threw = true; }
  check("gemelar (numero_fetos=2) lança → fallback writer", threw);

  const twinArr = F({ numero_fetos: 1, fetos: [feto({}), feto({ apresentacao: "pélvica" })] });
  let threw2 = false;
  try { renderDopplerObstetrico(twinArr, null, { igCorrection: true }); }
  catch { threw2 = true; }
  check("gemelar (fetos.length=2) lança → fallback writer", threw2);

  // Controle: feto único continua renderizando (não regride).
  let single = "";
  try { single = renderDopplerObstetrico(RCF(), null, { igCorrection: true }); } catch { /* */ }
  check("feto único NÃO lança (continua no renderer)", /CONCLUSÃO:/.test(single));
}

// ── Camada flexível (P1 dex1): Doppler herda o schema; deve renderizar os campos
// livres com a flag, senão dropa o inusitado silenciosamente. ──
{
  const base = F({ observacoes_corpo_livres: ["As adrenais fetais têm morfologia normal."], itens_conclusao_livres: ["O exame comparado ao anterior mostra evolução normal."] });
  // Flag OFF: campos livres NÃO aparecem (byte-estável com o legado).
  const off = renderDopplerObstetrico(base, null, { igCorrection: true });
  check("Doppler flexivel OFF: corpo-livre não aparece", !/adrenais/.test(off));
  check("Doppler flexivel OFF: item-livre não aparece", !/evolução normal/.test(off));
  // Flag ON clássico: corpo-livre nos ASPECTOS, item-livre na CONCLUSÃO.
  const on = renderDopplerObstetrico(base, null, { igCorrection: true, flexivel: true });
  const [corpo, concl] = on.split("CONCLUSÃO:");
  check("Doppler flexivel ON: adrenais no corpo", /adrenais/.test(corpo ?? ""));
  check("Doppler flexivel ON: adrenais NÃO na conclusão", !/adrenais/.test(concl ?? ""));
  check("Doppler flexivel ON: comparação na conclusão", /evolução normal/.test(concl ?? ""));
  // Flag ON objetivo: corpo-livre nos ACHADOS.
  const onObj = renderDopplerObstetrico(base, null, { igCorrection: true, flexivel: true, objetivo: true });
  check("Doppler objetivo ON: adrenais nos achados", /adrenais/.test(onObj));
  // Dedup: biometria reditada não duplica.
  const dup = renderDopplerObstetrico(
    F({ fetos: [feto({ dbp_mm: 60 })], observacoes_corpo_livres: ["Diâmetro biparietal (DBP) de 60 mm."] }),
    null,
    { igCorrection: true, flexivel: true },
  );
  check("Doppler flexivel ON: dedup de biometria reditada", (dup.match(/Diâmetro biparietal \(DBP\) de 60 mm/g) ?? []).length === 1);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
