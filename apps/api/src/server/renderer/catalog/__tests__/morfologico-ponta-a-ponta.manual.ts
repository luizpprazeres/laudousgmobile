/**
 * MORFOLÓGICO — o gate da 5ª categoria da troca de motor.
 *
 * Esta ficou bloqueada dois dias, e o motivo vale registrar: o canônico não
 * tinha onde pôr o DIAGNÓSTICO. A tela descreve a anatomia por sistema e, no
 * alterado, pede descrição (corpo) e diagnóstico (conclusão) — mas o canônico
 * só tinha `achados_adicionais`, que chega ao corpo, e afirmava
 * incondicionalmente "Morfologia fetal sem evidência de alteração detectável".
 *
 * Migrar antes teria produzido o pior laudo possível: descreve a malformação
 * no corpo e a nega na conclusão. Foi preciso primeiro dar ao renderer o canal
 * `itens_conclusao_livres` e tornar a frase de normalidade condicional.
 *
 * O gate persegue as duas pontas: que o achado CHEGUE (corpo e conclusão) e que
 * a normalidade não seja afirmada por cima dele.
 *
 * ## ⚠️ Rode com as flags de PRODUÇÃO
 *
 * ```bash
 * IG_REFERENCE_CORRECTION=true GRANNUM_PLACENTA=true FLEXIBLE_CONCLUSION=true \
 *   pnpm exec tsx --env-file=../../.env \
 *   src/server/renderer/catalog/__tests__/morfologico-ponta-a-ponta.manual.ts
 * ```
 */

import { readFileSync } from "node:fs";
import { renderizarSelecao } from "../alteracoes";
import { alteracoesDe } from "../alteracoes/index";
import { adaptarMorfologico } from "../../../../../../web/src/lib/catalog/morfologicoParaCatalogo";
import { morfologico } from "../../../../../../web/src/lib/deterministic";

const ESTILO = "CLASSICO_COMPLETO";

type Caso = {
  nome: string;
  porque: string;
  estado: Record<string, unknown>;
  opcoes?: Record<string, string | string[]>;
  exige?: string[];
  exigeNaConclusao?: string[];
  proibe?: string[];
  proibeNaConclusao?: string[];
  pendente?: string;
};

function inicial(): Record<string, unknown> {
  const st: Record<string, unknown> = {};
  for (const s of morfologico.sections) if (s.module) st[s.id] = s.module.initialState();
  return st;
}
const com = (b: Record<string, unknown>, secao: string, patch: Record<string, unknown>) => ({
  ...b,
  [secao]: { ...(b[secao] as object), ...patch },
});

/** Um morfológico de 20 semanas com tudo medido. */
function medido(): Record<string, unknown> {
  let st = inicial();
  st = com(st, "ig", { bio_sem: "20", bio_dias: "4" });
  st = com(st, "feto", { apresentacao: "cefálica", bcf: "148" });
  st = com(st, "biometria", {
    dbp: "51", cc: "190", cerebelo: "21", cisterna: "5", binocular: "32",
    ca: "168", femur: "34", tibia: "29", fibula: "28", umero: "32", radio: "27",
    ulna: "30", peso: "390",
  });
  st = com(st, "extrafetal", { placenta_loc: "anterior", ila: "14" });
  return st;
}

const CASOS: Caso[] = [
  {
    nome: "morfológico normal, tudo medido",
    porque: "o caso de todos os 279 morfológicos reais.",
    estado: medido(),
    exige: ["51", "190", "34", "148"],
    exigeNaConclusao: ["sem evidência de alteração detectável"],
  },
  {
    /** A razão de a categoria ter ficado bloqueada. */
    nome: "SNC alterado — descrição E diagnóstico",
    porque:
      "o caso que travou a migração. A descrição vai ao corpo, o diagnóstico à conclusão, e a frase de normalidade NÃO pode sair por cima.",
    estado: com(medido(), "anatomia", {
      snc: "alterado",
      "snc.alterado.corpo": "Ventriculomegalia bilateral de 12 mm",
      "snc.alterado.diag": "Ventriculomegalia bilateral leve",
    }),
    exige: ["Ventriculomegalia bilateral de 12 mm"],
    exigeNaConclusao: ["Ventriculomegalia bilateral leve"],
    proibeNaConclusao: ["sem evidência de alteração detectável"],
  },
  {
    nome: "DOIS sistemas alterados",
    porque: "os dois diagnósticos têm de chegar; um não pode engolir o outro.",
    estado: com(medido(), "anatomia", {
      snc: "alterado",
      "snc.alterado.corpo": "Ventriculomegalia bilateral de 12 mm",
      "snc.alterado.diag": "Ventriculomegalia bilateral leve",
      coracao: "alterado",
      "coracao.alterado.corpo": "Comunicação interventricular de 3 mm",
      "coracao.alterado.diag": "Comunicação interventricular",
    }),
    exigeNaConclusao: ["Ventriculomegalia bilateral leve", "Comunicação interventricular"],
  },
  {
    nome: "sistema alterado e EM BRANCO",
    porque:
      "marcar alterado sem escrever nada faria o laudo concluir morfologia normal, negando o que foi marcado. O adaptador BLOQUEIA.",
    estado: com(medido(), "anatomia", { face: "alterado" }),
    pendente: "bloqueio de propósito — sem texto não há o que dizer, e afirmar normal seria pior",
  },
  {
    nome: "oligoâmnio pelo ILA",
    porque: "a classe sai do renderer, dos limiares dele — a tela informa a medida.",
    estado: com(medido(), "extrafetal", { ila: "3" }),
    exigeNaConclusao: ["Oligoâmnio"],
    proibeNaConclusao: ["quantidade normal"],
  },
  {
    nome: "genitália não avaliada",
    porque:
      "'na' na tela quer dizer NÃO AVALIADA. O renderer traduz `null` para 'não avaliada'; deixar o 'na' atravessar imprime literalmente \"Genitália externa na.\" no laudo — testei mutando o adaptador, e a primeira versão desta asserção (que só proibia 'masculina' e 'feminina') deixava passar.",
    estado: medido(),
    exige: ["Genitália externa não avaliada"],
    proibe: ["Genitália externa na.", "Genitália externa masculina", "Genitália externa feminina"],
  },
  {
    nome: "genitália feminina",
    porque: "o contrapeso: quando ele informa, tem de sair, e por extenso.",
    estado: com(medido(), "anatomia", { genitalia: "feminina" }),
    exige: ["Genitália externa feminina"],
  },
  {
    nome: "3º trimestre",
    porque:
      "o trimestre é controle de categoria e muda o laudo — a distância binocular sai só no 2º.",
    estado: medido(),
    opcoes: { trimestre: "3t" },
    proibe: ["Distância binocular"],
  },
  {
    nome: "referência por US precoce",
    porque: "a regra do Dr. Domingos vive no renderer; a tela informa a fonte.",
    estado: com(medido(), "ig", {
      referencia: "usg",
      "referencia.usg.us_data": "12/01/2026",
      "referencia.usg.us_ig_sem": "8",
      "referencia.usg.us_ig_dias": "2",
      "referencia.usg.exame_data": "20/06/2026",
    }),
    exige: ["12/01/2026"],
  },
  {
    nome: "achado adicional em texto livre",
    porque: "a observação solta do médico, que não é de nenhum sistema.",
    estado: com(medido(), "achados", { texto: "Cisto de plexo coroide à esquerda." }),
    exige: ["Cisto de plexo coroide"],
  },
];

// ---------------------------------------------------------------------------

/**
 * TODA CHAVE DA TELA É LIDA PELO ADAPTADOR?
 *
 * O estado é um `Record<string, unknown>`: nada é garantido pelo compilador. Um
 * campo novo, ou renomeado, não quebra o build — ele para de chegar ao laudo,
 * em silêncio.
 */
function camposCobertos(): number {
  const tela = readFileSync(
    new URL("../../../../../../web/src/lib/deterministic/organs/morfologico.ts", import.meta.url),
    "utf8",
  );
  const adaptador = readFileSync(
    new URL("../../../../../../web/src/lib/catalog/morfologicoParaCatalogo.ts", import.meta.url),
    "utf8",
  );
  const chaves = [...new Set([...tela.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]!))];

  /** Ausências que são DECISÃO, não esquecimento. */
  const foraDePropósito: Record<string, string> = {
    desc: "chega por `axilas.alteradas.desc`, lido pelo nome completo",
  };

  let faltando = 0;
  for (const k of chaves) {
    if (k in foraDePropósito) continue;
    if (!new RegExp(`\\b${k}\\b`).test(adaptador)) {
      console.log(`  ✗ CAMPO ÓRFÃO: a tela tem "${k}" e o adaptador não o lê — sumiria do laudo em silêncio`);
      faltando++;
    }
  }
  console.log(
    faltando === 0
      ? `  ✓ ${chaves.length} campos da tela, todos lidos pelo adaptador`
      : `  ✗ ${faltando} campo(s) órfão(s)`,
  );
  return faltando;
}

let falhas = 0;
let pendentes = 0;
const linhas = (t: string) => t.split("\n").filter((l) => l.trim() !== "");

console.log("═".repeat(74));
console.log("MORFOLÓGICA — a travessia para o renderer canônico");
console.log("═".repeat(74));
console.log("\n▸ cobertura de campo");
falhas += camposCobertos();

for (const caso of CASOS) {
  console.log(`\n\n▸ ${caso.nome}`);
  console.log(`  ${caso.porque}`);

  const { dados, alteracoes, pendencias } = adaptarMorfologico(caso.estado, caso.opcoes ?? {});

  for (const p of pendencias) {
    console.log(`  ${p.bloqueia ? "⛔ BLOQUEIA" : "⚠ degrada"} — ${p.onde}: ${p.valor}`);
    console.log(`    ${p.motivo}`);
  }
  if (pendencias.some((p) => p.bloqueia)) {
    if (caso.pendente) pendentes += 1;
    else { falhas += 1; console.log("  ✗ bloqueado sem decisão registrada"); }
    continue;
  }

  const specs = alteracoes
    .map((id) => alteracoesDe("MORFOLOGICO").find((s) => s.id === id))
    .filter((s) => s !== undefined);

  const r = renderizarSelecao("MORFOLOGICO", ESTILO, specs, dados as never);
  if (!r.ok) {
    const motivo = "conflitos" in r ? r.conflitos.map((c) => c.motivo).join(" · ") : r.erro;
    if (caso.pendente) { console.log(`  ⏸ NÃO RENDERIZA (previsto): ${motivo}`); pendentes += 1; }
    else { console.log(`  ✗ NÃO RENDERIZA: ${motivo}`); falhas += 1; }
    continue;
  }

  const b = r.texto;
  const registrar = (msg: string) => {
    if (caso.pendente) console.log(`  ⏸ perda confirmada — ${msg}`);
    else { console.log(`  ✗ ${msg}`); falhas += 1; }
  };

  for (const t of caso.exige ?? []) if (!b.includes(t)) registrar(`PERDEU: não contém "${t}"`);
  for (const t of caso.proibe ?? []) {
    if (b.toLowerCase().includes(t.toLowerCase())) registrar(`AFIRMA INDEVIDAMENTE: "${t}"`);
  }

  const conclusao = b.split(/CONCLUS[ÃA]O:\n/)[1]?.split("\n\n")[0] ?? "";
  for (const t of caso.exigeNaConclusao ?? []) {
    if (!conclusao.includes(t)) registrar(`PERDEU NA CONCLUSÃO: "${t}"`);
  }
  for (const t of caso.proibeNaConclusao ?? []) {
    if (conclusao.toLowerCase().includes(t.toLowerCase())) {
      registrar(`AFIRMA O CONTRÁRIO: a conclusão diz "${t}"`);
    }
  }

  if (caso.pendente) { console.log(`  ⏸ pendente: ${caso.pendente}`); pendentes += 1; }
  console.log(`  ✓ renderiza · ${linhas(b).length} linhas`);
  console.log(`  conclusão: ${conclusao.replace(/\n/g, " | ").slice(0, 190)}`);
}

console.log("\n\n" + "═".repeat(74));
console.log(falhas === 0 ? "✓ nenhum achado perdido nem invertido em silêncio" : `✗ ${falhas} falha(s)`);
console.log(`  ${pendentes} caso(s) o canônico ainda NÃO cobre — o médico os perderia hoje.`);
console.log("═".repeat(74));
process.exit(falhas ? 1 : 0);
