/**
 * Equivalência byte-a-byte: catálogo × renderer atual (OBSTETRICA clássico).
 *
 * Critério de aceitação do projeto docs/projeto-modelos/ (§5, passo 2):
 * com ZERO personalizações, o catálogo tem de reproduzir exatamente o que o
 * renderer produz hoje. Enquanto este harness não estiver 100%, o catálogo
 * está incompleto e nada avança.
 *
 * Varre uma matriz combinatória de findings em vez de casos escolhidos a dedo —
 * casos escolhidos a dedo escondem justamente as variações que faltam.
 *
 * Rodar: pnpm exec tsx apps/api/src/server/renderer/__tests__/catalog-equivalence.manual.ts
 */
import { renderObstetricaClassico, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { renderObstetricaCatalogo, type ObstetricaFlags } from "../catalog/OBSTETRICA.render";

type Flags = ObstetricaFlags;

// ---------------------------------------------------------------------------
// Matriz combinatória
// ---------------------------------------------------------------------------

const FETO_BASE = {
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 142, dbp_mm: 85, cc_mm: 310, ca_mm: 295,
  cf_mm: 62, ccn_mm: null, peso_g: 2450, peso_variacao_g: null, percentil: null, bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null, cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
} satisfies ObstetricaFindings["fetos"][number];

function base(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false, fetos: [{ ...FETO_BASE }],
    ig_semanas: 32, ig_dias: 4, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null, placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null, itens_conclusao_livres: [], observacoes_corpo_livres: [],
    ...over,
  };
}

type Dim = { nome: string; aplicar: (f: ObstetricaFindings) => ObstetricaFindings };

const D_GESTACAO: Dim[] = [
  { nome: "padrao", aplicar: (f) => f },
  {
    nome: "inicial",
    aplicar: (f) => ({
      ...f, gestacao_inicial: true, ig_semanas: 8, ig_dias: 2,
      saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
      fetos: f.fetos.map((x) => ({ ...x, ccn_mm: 16.4, dbp_mm: null, cc_mm: null, ca_mm: null, cf_mm: null, peso_g: null })),
    }),
  },
];

const D_FETOS: Dim[] = [
  { nome: "unico", aplicar: (f) => f },
  {
    nome: "gemelar",
    aplicar: (f) => ({
      ...f, numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
      fetos: [
        { ...f.fetos[0]!, rotulo: "A", bcf_bpm: 140, peso_g: f.fetos[0]!.peso_g === null ? null : 2100 },
        { ...f.fetos[0]!, rotulo: "B", bcf_bpm: 148, dbp_mm: f.fetos[0]!.dbp_mm === null ? null : 83, peso_g: f.fetos[0]!.peso_g === null ? null : 2380, posicao_relativa: "à direita" },
      ],
    }),
  },
  {
    nome: "gemelar-divergente",
    aplicar: (f) => ({
      ...f, numero_fetos: 2, corionicidade: "monocoriônica e diamniótica",
      fetos: [
        { ...f.fetos[0]!, rotulo: "A", bcf_bpm: 140, peso_g: f.fetos[0]!.peso_g === null ? null : 1400 },
        { ...f.fetos[0]!, rotulo: "B", bcf_bpm: 150, peso_g: f.fetos[0]!.peso_g === null ? null : 2400 },
      ],
    }),
  },
];

const D_LIQUIDO: Dim[] = [
  { nome: "subjetivo", aplicar: (f) => f },
  { nome: "ila", aplicar: (f) => ({ ...f, liquido_tipo: "ila", liquido_ila_cm: 12.4 }) },
  { nome: "mbv", aplicar: (f) => ({ ...f, liquido_tipo: "mbv", liquido_mbv_por_feto_cm: f.numero_fetos >= 2 ? [4.1, 5.2] : [4.1] }) },
  { nome: "oligo", aplicar: (f) => ({ ...f, liquido_tipo: "alterado", liquido_classe: "oligoâmnio" }) },
];

const D_PLACENTA: Dim[] = [
  { nome: "ausente", aplicar: (f) => f },
  { nome: "localizacao", aplicar: (f) => ({ ...f, placenta_localizacao: "corporal anterior" }) },
  { nome: "grau", aplicar: (f) => ({ ...f, placenta_grau: "2" }) },
  { nome: "loc+grau+eco", aplicar: (f) => ({ ...f, placenta_localizacao: "fúndica", placenta_grau: "1", placenta_ecotextura: "homogênea" }) },
];

const D_EXTRAS: Dim[] = [
  { nome: "limpo", aplicar: (f) => f },
  { nome: "dum", aplicar: (f) => ({ ...f, dum: "12/01/2026" }) },
  { nome: "peso-extras", aplicar: (f) => ({ ...f, fetos: f.fetos.map((x) => ({ ...x, peso_variacao_g: x.peso_g === null ? null : 350, percentil: 42 })) }) },
  { nome: "apres+dorso", aplicar: (f) => ({ ...f, fetos: f.fetos.map((x) => ({ ...x, apresentacao: "pélvico", dorso: "à esquerda", polo_cefalico: "à direita" })) }) },
  { nome: "achados", aplicar: (f) => ({ ...f, achados_adicionais: "Cisto de plexo coroide à esquerda, medindo 4 mm." }) },
  // CAMADA FLEXÍVEL — o que o médico ditou fora dos slots, nos DOIS lados.
  // Esta dimensão faltava, e a ausência dela escondia um bug real: o catálogo
  // renderizava os itens livres da conclusão mas PERDIA as observações livres
  // do corpo, que o renderer preserva. Achado da revisão do Codex, 11/08.
  {
    nome: "livres",
    aplicar: (f) => ({
      ...f,
      observacoes_corpo_livres: [
        "Adrenais fetais de dimensões aumentadas bilateralmente.",
        "Cordão umbilical com três vasos.",
      ],
      itens_conclusao_livres: ["Adrenais fetais aumentadas, a esclarecer."],
    }),
  },
  // Referência precoce (épico IG determinística) — só tem efeito com igCorrection.
  {
    nome: "ref-1aUS",
    aplicar: (f) => ({
      ...f, dum: "05/01/2026", data_exame: "09/08/2026",
      primeira_us_data: "20/02/2026", primeira_us_ig_semanas: 9, primeira_us_ig_dias: 3,
      referencia_fonte: "usg_precoce", corrigir_ig: true,
    }),
  },
  {
    nome: "ref-hoje",
    aplicar: (f) => ({
      ...f, dum: "05/01/2026", ig_referencia_hoje_semanas: 31, ig_referencia_hoje_dias: 0,
      referencia_fonte: "dum", corrigir_ig: true,
    }),
  },
  // Camada flexível — itens livres, incluindo um que o dedup deve descartar.
  {
    nome: "itens-livres",
    aplicar: (f) => ({
      ...f,
      itens_conclusao_livres: [
        "Comparado ao exame anterior de 19/05/2026, evolução normal da gestação.",
        "Gestação em torno de 32 semanas pela biometria atual.", // deve ser deduplicado
      ],
    }),
  },
];

/** Combinações de flags que importam — incluindo as que estão ON em produção. */
const D_FLAGS: { nome: string; flags: Flags }[] = [
  { nome: "off", flags: { igCorrection: false, flexivel: false, grannum: false, objetivo: false } },
  { nome: "grannum", flags: { igCorrection: false, flexivel: false, grannum: true, objetivo: false } },
  { nome: "igCorr", flags: { igCorrection: true, flexivel: false, grannum: false, objetivo: false } },
  { nome: "flexivel", flags: { igCorrection: false, flexivel: true, grannum: false, objetivo: false } },
  { nome: "prod-like", flags: { igCorrection: true, flexivel: true, grannum: true, objetivo: false } },
];

// ---------------------------------------------------------------------------

let total = 0;
const falhas: { nome: string; diff: string }[] = [];

function primeiroDiff(a: string, b: string): string {
  const la = a.split("\n"), lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return `      L${i + 1}\n        renderer: ${JSON.stringify(la[i])}\n        catálogo: ${JSON.stringify(lb[i])}`;
    }
  }
  return "      (diferença invisível)";
}

for (const g of D_GESTACAO)
  for (const n of D_FETOS)
    for (const l of D_LIQUIDO)
      for (const p of D_PLACENTA)
        for (const e of D_EXTRAS)
          for (const fl of D_FLAGS) {
            const nome = `${g.nome}/${n.nome}/${l.nome}/${p.nome}/${e.nome}/${fl.nome}`;
            const f = e.aplicar(p.aplicar(l.aplicar(n.aplicar(g.aplicar(base())))));
            total++;
            let esperado: string, obtido: string;
            try {
              esperado = renderObstetricaClassico(
                f, fl.flags.igCorrection, fl.flags.flexivel,
                // 4º e 5º parâmetros são golfBall e igSanity — recursos que o
                // catálogo ainda não conhece; a equivalência é medida com eles
                // desligados, e o renderer.ts trava o catálogo quando estão on.
                null, false, fl.flags.grannum,
              );
              obtido = renderObstetricaCatalogo({ findings: f, flags: fl.flags });
            } catch (err) {
              falhas.push({ nome, diff: `      EXCEÇÃO: ${(err as Error).message}` });
              continue;
            }
            if (esperado !== obtido) falhas.push({ nome, diff: primeiroDiff(esperado, obtido) });
          }

console.log(`\nEquivalência OBSTETRICA × CLASSICO_COMPLETO — ${total} combinações\n`);
if (falhas.length === 0) {
  console.log(`  ✓ ${total}/${total} byte-a-byte idênticas ao renderer atual\n`);
} else {
  const porPrefixo = new Map<string, number>();
  for (const f of falhas) {
    const k = f.nome.split("/").slice(0, 4).join("/");
    porPrefixo.set(k, (porPrefixo.get(k) ?? 0) + 1);
  }
  console.log(`  ✗ ${falhas.length}/${total} divergentes\n`);
  console.log("  Concentração das falhas:");
  for (const [k, v] of [...porPrefixo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${String(v).padStart(3)}×  ${k}`);
  }
  console.log("\n  Primeiras divergências:\n");
  for (const f of falhas.slice(0, 6)) console.log(`    ${f.nome}\n${f.diff}\n`);
  process.exit(1);
}
