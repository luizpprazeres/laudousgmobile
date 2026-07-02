/**
 * Golden do gap #6 — PELVE_FEMININA dedup de itens de conclusão IDÊNTICOS.
 * OFF (default) = comportamento atual (pode repetir). ON (flag PELVE_CONCL_DEDUP) =
 * remove duplicata literal, preservando ordem e lateralidade/topografia distintas.
 * Rodar: tsx src/server/renderer/__tests__/pelve-dedup.manual.ts
 */
import { renderPelveFeminina, type PelveFemininaFindings } from "../categories/PELVE_FEMININA";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const ovNormal = (medidas: number[]): PelveFemininaFindings["ovario_direito"] => ({
  visualizado: true, medidas_cm: medidas, volume_ml: null, alterado: false, atrofico: false, achados: [],
});

function F(over: Partial<PelveFemininaFindings>): PelveFemininaFindings {
  const base: PelveFemininaFindings = {
    via: "ta_tv", utero_posicao: "anteversoflexão", utero_medidas_cm: [7.2, 4.0, 5.0],
    utero_volume_ml: null, utero_volume_classe: null, miometrio_descricao: null, miomas: [],
    utero_miomatoso: false, endometrio_espessura_cm: 0.6, endometrio_eco: null,
    endometrio_frase: "padrao", endometrio_motivo: null, endometrio_achado: null, endometrio_conclusao: null,
    ovario_direito: ovNormal([3.0, 2.0, 2.2]), ovario_esquerdo: ovNormal([3.1, 2.1, 2.0]),
    diu: null, diu_descricao: null, istmocele: false, istmocele_descricao: null, istmocele_tipo: null,
    cistos_naboth: false, calcificacao_arqueadas: false, adenomiose: false, adenomiose_conclusao: null,
    liquido_livre: false, liquido_livre_descricao: null, produtos_retidos: false,
    produtos_retidos_quantidade: null, observacoes_corpo: null, achados_adicionais: null,
    referencia_idade_anos: null, referencia_grande_multipara: false,
  };
  return { ...base, ...over };
}

// Extrai só a seção CONCLUSÃO do laudo (após "CONCLUSÃO:").
function conclusaoDe(laudo: string): string {
  return laudo.split("CONCLUSÃO:")[1] ?? "";
}

// 1) Duplicata LITERAL (cistos de Naboth gerado + repetido em achados_adicionais).
{
  const f = F({ cistos_naboth: true, achados_adicionais: "Cistos de Naboth (provável sequela de cervicite)." });
  const off = conclusaoDe(renderPelveFeminina(f, { dedup: false }));
  const on = conclusaoDe(renderPelveFeminina(f, { dedup: true }));
  const nOff = (off.match(/Cistos de Naboth/g) ?? []).length;
  const nOn = (on.match(/Cistos de Naboth/g) ?? []).length;
  check("OFF: item duplicado aparece 2x", nOff === 2, `nOff=${nOff}\n${off}`);
  check("ON: duplicata literal colapsada p/ 1x", nOn === 1, `nOn=${nOn}\n${on}`);
}

// 2) Duplicata com variação só de caixa/pontuação/espaço → também colapsa.
{
  const f = F({ cistos_naboth: true, achados_adicionais: "cistos de naboth (provável sequela de cervicite)" });
  const on = conclusaoDe(renderPelveFeminina(f, { dedup: true }));
  check("ON: colapsa mesmo com caixa/pontuação diferente", (on.match(/[Cc]istos de [Nn]aboth/g) ?? []).length === 1, on);
}

// 3) SEGURANÇA: itens que diferem só por lateralidade NÃO são fundidos.
{
  // Dois ovários alterados individualizados → dois itens distintos "direito"/"esquerdo".
  const ovAlt = (m: number[], lado: string): PelveFemininaFindings["ovario_direito"] => ({
    visualizado: true, medidas_cm: m, volume_ml: null, alterado: true, atrofico: false,
    achados: [{ tipo: "cisto", descricao: `imagem anecoica no ovário ${lado}`, medidas_cm: [2.0, 1.8, 1.9], o_rads: null } as never],
  });
  const f = F({ ovario_direito: ovAlt([4, 3, 3], "direito"), ovario_esquerdo: ovAlt([4, 3, 3], "esquerdo") });
  const on = conclusaoDe(renderPelveFeminina(f, { dedup: true }));
  check("ON: preserva ovário direito E esquerdo (lateralidade discrimina)",
    /direito/i.test(on) && /esquerd/i.test(on), on);
}

// 4) Sem duplicata: dedup é no-op (não altera a conclusão).
{
  const f = F({ cistos_naboth: true, adenomiose: true });
  const off = conclusaoDe(renderPelveFeminina(f, { dedup: false }));
  const on = conclusaoDe(renderPelveFeminina(f, { dedup: true }));
  check("sem duplicata: ON == OFF (no-op)", off === on, `OFF:\n${off}\nON:\n${on}`);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
