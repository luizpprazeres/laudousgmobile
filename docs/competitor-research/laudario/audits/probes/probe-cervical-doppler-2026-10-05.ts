/**
 * Prova sintética — "Cervical com Doppler" (lote 3, 05/10/2026). Só o efeito do Doppler.
 * Caminho Web real: formulário `cervical` → adaptarCervical → renderizarSelecao("CERVICAL", estilo, [], dados).
 * D3/D4 chamam o renderer com `dados` que a tela NÃO consegue produzir (para isolar o contrato).
 */
import { cervical } from "../../../../../apps/web/src/lib/deterministic";
import { adaptarCervical } from "../../../../../apps/web/src/lib/catalog/cervicalParaCatalogo";
import { renderizarSelecao } from "../../../../../apps/api/src/server/renderer/catalog/alteracoes";
type E = Record<string, any>;
const b = (): E => Object.fromEntries(cervical.sections.filter((s) => s.module).map((s) => [s.id, s.module!.initialState()]));
const com = (e: E, p: E): E => ({ ...e, cervical: { ...e.cervical, ...p } });
function out(nome: string, dados: E, estilo: string, extra = "") {
  const r: any = renderizarSelecao("CERVICAL", estilo as never, [], dados as never);
  console.log(`\n###### ${nome} [${estilo}] ${extra}| com_doppler=${dados.com_doppler}`);
  console.log(r.ok ? r.texto : JSON.stringify(r));
}
function run(nome: string, e: E, estilo = "CLASSICO_COMPLETO") {
  const a = adaptarCervical(e);
  out(nome, a.dados as E, estilo, `| pendências=${JSON.stringify(a.pendencias)} `);
}
const lin = { linfonodo: "alterado", "linfonodo.alterado.nivel": "IIA", "linfonodo.alterado.medidas": "18 x 7 x 6 mm", "linfonodo.alterado.forma": "oval", "linfonodo.alterado.hilo": "presente" };
console.log("estado inicial do campo vasc:", JSON.stringify(b().cervical));
// D1: linfonodo oval com hilo e vascularização hilar (padrão benigno) — o Doppler deveria apoiar "reacional"
run("D1 hilar, oval, hilo presente", com(b(), { ...lin, "linfonodo.alterado.vasc": "hilar" }));
run("D1 objetivo", com(b(), { ...lin, "linfonodo.alterado.vasc": "hilar" }), "OBJETIVO");
// D2: mesmo linfonodo, só o padrão vascular muda para periférico (sinal de atipia isolado ao Doppler)
run("D2 periférica, demais atributos benignos, suspeição desmarcada", com(b(), { ...lin, "linfonodo.alterado.vasc": "periferica" }));
// D2b: Doppler não realizado de fato, mas a tela só tem 'ausente' como padrão
run("D2b vasc deixada no padrão (Doppler não feito)", com(b(), { ...lin }));
// D3: exame com Doppler, todos os linfonodos normais — a tela não representa (com_doppler=alterado)
const d0 = adaptarCervical(b()).dados as E;
out("D3 contrato: com_doppler=true, sem linfonodo alterado", { ...d0, com_doppler: true }, "CLASSICO_COMPLETO");
out("D3 contrato objetivo", { ...d0, com_doppler: true }, "OBJETIVO");
// D4: contrato com vascularização preenchida mas com_doppler=false
const d1 = adaptarCervical(com(b(), { ...lin, "linfonodo.alterado.vasc": "periferica" })).dados as E;
out("D4 contrato: com_doppler=false com vasc periférica preenchida", { ...d1, com_doppler: false }, "CLASSICO_COMPLETO");
