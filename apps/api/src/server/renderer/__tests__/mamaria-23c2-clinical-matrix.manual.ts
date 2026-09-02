import assert from "node:assert/strict";
import { adaptarMamaria } from "../../../../../web/src/lib/catalog/mamariaParaCatalogo";
import { renderizarSelecao } from "../catalog/alteracoes";

type Estado = Record<string, unknown>;

function render(estado: Estado, objetivo = false): string {
  const adaptado = adaptarMamaria(estado);
  assert.equal(adaptado.pendencias.some((p) => p.bloqueia), false, JSON.stringify(adaptado.pendencias));
  const resultado = renderizarSelecao(
    "MAMARIA",
    objetivo ? "OBJETIVO" : "CLASSICO_COMPLETO",
    [],
    adaptado.dados as never,
  );
  assert.equal(resultado.ok, true, resultado.ok ? "" : JSON.stringify(resultado));
  return resultado.ok ? resultado.texto : "";
}

function exame(mamas: Record<string, unknown> = {}, opts: Record<string, unknown> = {}, axilas: Record<string, unknown> = {}): Estado {
  return {
    __opts: { escopo_exame: "mamas_axilas", perfil_mamario: "padrao", doppler_mamario: "nao", ...opts },
    mamas: { fundo: "heterogeneo", achados_ids: [], ...mamas },
    axilas: { axilas: "normais", ...axilas },
  };
}

const checks: Array<[string, () => void]> = [
  ["ecotextura sem redundância", () => {
    const fibroglandular = render(exame({ fundo: "denso" }));
    assert.match(fibroglandular, /predominantemente fibroglandular/);
    assert.doesNotMatch(fibroglandular, /homogênea, predominantemente/);
  }],
  ["tipos antes ocultos no formulário", () => {
    const texto = render(exame({
      achados_ids: ["a", "b", "c"],
      "achados.a.tipo": "microcistos_agrupados",
      "achados.a.lado": "direita",
      "achados.a.medidas": "0,8 x 0,6 x 0,5",
      "achados.a.descritores": "coalescentes",
      "achados.b.tipo": "cisto_complicado",
      "achados.b.lado": "esquerda",
      "achados.b.medidas": "1,1 x 0,9 x 0,8",
      "achados.b.descritores": "com finos ecos internos",
      "achados.c.tipo": "linfonodo_intramamario",
      "achados.c.lado": "direita",
      "achados.c.medidas": "0,9 x 0,5 x 0,4",
    }));
    assert.match(texto, /Microcistos agrupados/);
    assert.match(texto, /Cisto de conteúdo espesso/);
    assert.match(texto, /Linfonodo intramamário/);
  }],
  ["achado não nodular e placeholders", () => {
    const texto = render(exame({
      achados_ids: ["a"],
      "achados.a.tipo": "achado_nao_nodular",
      "achados.a.lado": "esquerda",
      "achados.a.descricao_nao_nodular": "área heterogênea sem configuração nodular",
    }));
    assert.match(texto, /____ por ____ cm/);
    assert.match(texto, /achado categorizável sem categoria BI-RADS|Massa heterogênea não nodular/i);
    assert.doesNotMatch(texto, /Categoria BI-RADS® [2345]/);
  }],
  ["BI-RADS só após confirmação médica", () => {
    const base = {
      achados_ids: ["a"],
      "achados.a.tipo": "nodulo",
      "achados.a.lado": "direita",
      "achados.a.forma": "irregular",
      "achados.a.margem": "espiculada",
      "achados.a.orientacao": "nao_paralela",
      "achados.a.posterior": "sombra",
    };
    assert.doesNotMatch(render(exame(base)), /Categoria BI-RADS® [2345]/);
    assert.match(render(exame({ ...base, "achados.a.birads": "5" })), /Categoria BI-RADS® 5/);
  }],
  ["Doppler opcional e vascularização", () => {
    const estado = exame({
      achados_ids: ["a"],
      "achados.a.tipo": "nodulo",
      "achados.a.lado": "direita",
      "achados.a.vascularizacao": "periferica",
    });
    assert.doesNotMatch(render(estado), /Doppler colorido/);
    const comDoppler = render(exame(estado.mamas as Record<string, unknown>, { doppler_mamario: "sim" }), true);
    assert.match(comDoppler, /Estudo complementar realizado com Doppler colorido/);
    assert.match(comDoppler, /vascularização predominantemente periférica/);
  }],
  ["axila estruturada", () => {
    const texto = render(exame({}, {}, {
      axilas: "alteradas",
      "axilas.alteradas.lado": "esquerda",
      "axilas.alteradas.forma": "redonda",
      "axilas.alteradas.hilo": "ausente",
      "axilas.alteradas.cortical_cm": "0,5",
      "axilas.alteradas.medidas": "1,8 x 1,1",
    }));
    assert.match(texto, /forma redonda/);
    assert.match(texto, /hilo gorduroso ausente/);
    assert.match(texto, /cortical medindo 0,5 cm/);
    assert.match(texto, /axila esquerda/);
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

console.log(`\n23C2: ${checks.length - falhas}/${checks.length} cenários aprovados.`);
process.exit(falhas ? 1 : 0);
