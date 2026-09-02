import assert from "node:assert/strict";
import { adaptarPelve } from "../../../../../web/src/lib/catalog/pelveParaCatalogo";
import { renderizarSelecao } from "../catalog/alteracoes";
import { alteracoesDe } from "../catalog/alteracoes/index";

type Estado = Record<string, unknown>;

function base(): Estado {
  return {
    utero: {
      posicao: "anteversão",
      medidas: "7,0 x 4,0 x 5,0",
      volume_classe: "normal",
      miomatoso: [], mioma: [], mioma2: [], mioma3: [], adenomiose: [], istmocele: [], cistos_naboth: [],
    },
    endometrio: {
      espessura: "0,8", eco: "homogeneo", frase: "padrao", achado: "", achado_tipo: "nenhum",
      achado_medidas: "", vascularizacao: "", diu: "nenhum", diu_descricao: "", liquido_livre: [],
      produtos_retidos: "nao", produtos_retidos_quantidade: "moderada",
    },
    ovario_direito: { visualizado: "sim", medidas: "3,0 x 2,0 x 1,8", achado: "nenhum", atrofico: [], foliculos_mm: "" },
    ovario_esquerdo: { visualizado: "sim", medidas: "3,1 x 2,1 x 1,9", achado: "nenhum", atrofico: [], foliculos_mm: "" },
  };
}

function com(estado: Estado, secao: string, patch: Record<string, unknown>): Estado {
  return { ...estado, [secao]: { ...(estado[secao] as Record<string, unknown>), ...patch } };
}

function render(estado: Estado, opcoes: Record<string, string | string[]> = {}, objetivo = false): string {
  const adaptado = adaptarPelve(estado, { via: "ta_tv", modo_pelve: "rotina", ...opcoes });
  assert.equal(adaptado.pendencias.some((p) => p.bloqueia), false, JSON.stringify(adaptado.pendencias));
  const specs = adaptado.alteracoes
    .map((id) => alteracoesDe("PELVE_FEMININA").find((spec) => spec.id === id))
    .filter((spec) => spec !== undefined);
  const resultado = renderizarSelecao(
    "PELVE_FEMININA",
    objetivo ? "OBJETIVO" : "CLASSICO_COMPLETO",
    specs,
    adaptado.dados as never,
  );
  assert.equal(resultado.ok, true, resultado.ok ? "" : JSON.stringify(resultado));
  return resultado.ok ? resultado.texto : "";
}

const checks: Array<[string, () => void]> = [
  ["rotina mantém defaults e placeholders", () => {
    const texto = render(base());
    assert.match(texto, /Útero em anteversão/);
    assert.match(texto, /Endométrio homogêneo/);
    assert.doesNotMatch(texto, /Doppler colorido/);
  }],
  ["três miomas individualizados e FIGO", () => {
    let estado = base();
    estado = com(estado, "utero", {
      mioma: ["sim"], "mioma.sim.classificacao": "submucoso", "mioma.sim.medidas": "2,0 x 1,8 x 1,5", "mioma.sim.parede": "parede anterior", "mioma.sim.figo": "1",
      mioma2: ["sim"], "mioma2.sim.classificacao": "intramural", "mioma2.sim.medidas": "3,0 x 2,5 x 2,2", "mioma2.sim.parede": "parede posterior", "mioma2.sim.figo": "4",
      mioma3: ["sim"], "mioma3.sim.classificacao": "subseroso", "mioma3.sim.medidas": "1,7 x 1,5 x 1,2", "mioma3.sim.parede": "região fúndica", "mioma3.sim.figo": "6",
    });
    const texto = render(estado);
    assert.match(texto, /a primeira medindo/);
    assert.match(texto, /a segunda medindo/);
    assert.match(texto, /a terceira medindo/);
    assert.match(texto, /FIGO: Federação Internacional/);
  }],
  ["endométrio estruturado e DIU deslocado", () => {
    const texto = render(com(base(), "endometrio", {
      achado_tipo: "polipo", achado_medidas: "0,9 x 0,6", diu: "deslocado",
      diu_descricao: "DIU com extremidade inferior no canal cervical",
    }));
    assert.match(texto, /sugestiva de pólipo endometrial/);
    assert.match(texto, /0,9 x 0,6 cm/);
    assert.match(texto, /DIU deslocado/);
    assert.doesNotMatch(texto, /espessura normal para a fase/);
  }],
  ["achado endometrial livre não conclui normalidade", () => {
    const texto = render(com(base(), "endometrio", { achado: "Imagem ecogênica focal na cavidade endometrial" }));
    const conclusao = texto.split("CONCLUSÃO:")[1] ?? "";
    assert.match(conclusao, /Imagem ecogênica focal na cavidade endometrial/);
    assert.doesNotMatch(conclusao, /espessura normal para a fase/);
  }],
  ["O-RADS somente após confirmação médica", () => {
    const estado = com(base(), "ovario_direito", {
      achado: "cisto_simples",
      "achado.cisto_simples.medidas": "3,2 x 2,8 x 2,5",
    });
    assert.doesNotMatch(render(estado), /O-RADS/);
    const confirmado = render(com(estado, "ovario_direito", { "achado.cisto_simples.orads": "2" }));
    assert.match(confirmado, /\(O-RADS 2\)/);
    assert.match(confirmado, /O-RADS® US:/);
  }],
  ["Doppler complementar sem criar categoria", () => {
    const estado = com(base(), "ovario_esquerdo", {
      achado: "lesao_solida",
      "achado.lesao_solida.medidas": "2,4 x 2,0 x 1,8",
      "achado.lesao_solida.vascularizacao": "intensa",
      "achado.lesao_solida.orads": "4",
    });
    const texto = render(estado, { modo_pelve: "doppler", via: "tv" }, true);
    assert.match(texto, /Estudo complementar realizado com Doppler colorido/);
    assert.match(texto, /vascularização intensa ao Doppler colorido/);
    assert.match(texto, /O-RADS 4/);
  }],
  ["monitorização folicular no mesmo exame", () => {
    let estado = com(base(), "ovario_direito", { foliculos_mm: "8; 12; 18" });
    estado = com(estado, "ovario_esquerdo", { foliculos_mm: "7; 10" });
    const texto = render(estado, { modo_pelve: "monitorizacao_folicular", via: "tv" });
    const objetivo = render(estado, { modo_pelve: "monitorizacao_folicular", via: "tv" }, true);
    assert.match(texto, /MONITORIZAÇÃO FOLICULAR/);
    assert.match(texto, /folículos medindo 8, 12, 18 mm/);
    assert.match(texto, /Monitorização folicular — ovário direito: 8 mm, 12 mm, 18 mm; ovário esquerdo: 7 mm, 10 mm/);
    assert.match(objetivo, /folículos medindo 8, 12, 18 mm/);
  }],
  ["pós-abortamento e acessórios", () => {
    let estado = com(base(), "endometrio", { produtos_retidos: "sim", produtos_retidos_quantidade: "pequena", liquido_livre: ["sim"], "liquido_livre.sim.descricao": "pequena quantidade no fundo de saco de Douglas" });
    estado = com(estado, "utero", { istmocele: ["sim"], "istmocele.sim.tipo": "simples", cistos_naboth: ["sim"] });
    const texto = render(estado, { modo_pelve: "pos_abortamento", via: "tv" });
    assert.match(texto, /AVALIAÇÃO PÓS-ABORTAMENTO/);
    assert.match(texto, /Pequena quantidade de produtos retidos/);
    assert.match(texto, /Nicho de cicatriz cesárea/);
    assert.match(texto, /Cistos de Naboth/);
    assert.match(texto, /fundo de saco de Douglas/);
  }],
];

let falhas = 0;
for (const [nome, check] of checks) {
  try {
    check();
    console.log(`✓ ${nome}`);
  } catch (error) {
    falhas += 1;
    console.error(`✗ ${nome}`);
    console.error(error);
  }
}
console.log(`\n23C3: ${checks.length - falhas}/${checks.length} cenários aprovados.`);
process.exit(falhas ? 1 : 0);
