import { z } from "zod";

/**
 * Doppler de carótidas e vertebrais — contrato do formulário Web (MVP seguro,
 * pendente de revisão clínica). Usado só pela rota Web `/render`; o renderer
 * compartilhado de DOPPLER_CAROTIDAS (pipeline mobile e Biblioteca) não muda.
 *
 * Regras:
 *  - nada presume normalidade: cada lado declara se foi avaliado, se há placas
 *    e a classificação do médico; campo vazio não vira "aspecto habitual";
 *  - lados independentes, cada um com a sua classificação;
 *  - velocidades, IR e razão ACI/ACC só aparecem quando as medidas de origem
 *    foram preenchidas; nenhuma classificação é derivada das velocidades;
 *  - artéria vertebral só entra quando houver direção ou velocidade informada;
 *  - a conclusão reflete apenas o que foi classificado e informado.
 */
export const DOPPLER_CAROTIDAS_WEB_VERSION = "doppler-carotidas/web-v2" as const;

const Velocidade = z.number().finite().positive().nullable();
const Medidas = z.object({ vps_cms: Velocidade, vdf_cms: z.number().finite().nonnegative().nullable() }).strict();
const Placa = z.object({
  localizacao: z.string().trim().max(200).nullable(),
  composicao: z.enum(["calcificada", "lipidica", "mista"]).nullable(),
  superficie: z.enum(["regular", "irregular", "ulcerada"]).nullable(),
  espessura_mm: z.number().finite().positive().nullable(),
  estenose_percentual: z.number().finite().min(0).max(100).nullable(),
  descricao_raw: z.string().trim().max(500).nullable(),
}).strict();
export const DOPPLER_CAROTIDAS_CLASSIFICACOES = [
  "normal", "ateromatose_sem_estenose_significativa", "estenose_menor_50", "estenose_50_69", "estenose_70_99", "oclusao",
] as const;
const Lado = z.object({
  avaliacao: z.enum(["avaliado", "limitado", "nao_avaliado"]).nullable(),
  limitacao: z.string().trim().max(300).nullable(),
  emi_mm: z.number().finite().positive().nullable(),
  comum: Medidas,
  interna: Medidas,
  externa: Medidas,
  placas_status: z.enum(["ausentes", "presentes"]).nullable(),
  placas: z.array(Placa).max(12),
  vertebral: z.object({ vps_cms: Velocidade, direcao: z.enum(["anterogrado", "retrogrado", "ausente"]).nullable() }).strict(),
  classificacao: z.enum(DOPPLER_CAROTIDAS_CLASSIFICACOES).nullable(),
}).strict();
export const DopplerCarotidasWebSchema = z.object({
  direita: Lado,
  esquerda: Lado,
  conclusao_livre: z.string().trim().max(2000).nullable(),
  achados_adicionais: z.string().trim().max(2000).nullable(),
}).strict();

export type DopplerCarotidasWebInput = z.infer<typeof DopplerCarotidasWebSchema>;
export type DopplerCarotidasWebLado = z.infer<typeof Lado>;
export type DopplerCarotidasWebIssue = { code: string; path: string; message: string };
export type DopplerCarotidasWebValidation = { success: boolean; data: DopplerCarotidasWebInput | null; issues: DopplerCarotidasWebIssue[] };
type LadoId = "direita" | "esquerda";
const LADOS: readonly LadoId[] = ["direita", "esquerda"];
const ROTULO: Record<LadoId, string> = { direita: "Lado direito", esquerda: "Lado esquerdo" };

const ladoVazio = (): DopplerCarotidasWebLado => ({
  avaliacao: null, limitacao: null, emi_mm: null,
  comum: { vps_cms: null, vdf_cms: null }, interna: { vps_cms: null, vdf_cms: null }, externa: { vps_cms: null, vdf_cms: null },
  placas_status: null, placas: [], vertebral: { vps_cms: null, direcao: null }, classificacao: null,
});
export function createInitialDopplerCarotidasWebInput(): DopplerCarotidasWebInput {
  return { direita: ladoVazio(), esquerda: ladoVazio(), conclusao_livre: null, achados_adicionais: null };
}

/** Razão PSV carótida interna / comum, duas casas; só com as duas medidas. */
export function razaoInternaComum(lado: Pick<DopplerCarotidasWebLado, "interna" | "comum">): number | null {
  const i = lado.interna.vps_cms;
  const c = lado.comum.vps_cms;
  if (i === null || c === null || c <= 0) return null;
  return Math.round((i / c) * 100) / 100;
}
export function indiceResistividadeWeb(vps: number | null, vdf: number | null): number | null {
  if (vps === null || vdf === null || vps <= 0 || vdf < 0 || vdf > vps) return null;
  return Math.round(((vps - vdf) / vps) * 100) / 100;
}

/**
 * Faixa de redução luminal coerente com cada classificação (maior placa do lado).
 * Não deriva a classificação: só impede que o laudo traga placa e conclusão
 * contraditórias. "normal" já é bloqueado com placas presentes.
 */
const FAIXA_REDUCAO: Partial<Record<(typeof DOPPLER_CAROTIDAS_CLASSIFICACOES)[number], { min: number; max: number }>> = {
  ateromatose_sem_estenose_significativa: { min: 0, max: 49.99 },
  estenose_menor_50: { min: 0, max: 49.99 },
  estenose_50_69: { min: 50, max: 69.99 },
  estenose_70_99: { min: 70, max: 99.99 },
  oclusao: { min: 100, max: 100 },
};

const temMedidas = (l: DopplerCarotidasWebLado) =>
  l.emi_mm !== null || l.placas.length > 0 || l.vertebral.vps_cms !== null || l.vertebral.direcao !== null
  || [l.comum, l.interna, l.externa].some(m => m.vps_cms !== null || m.vdf_cms !== null);

export function validateDopplerCarotidasWeb(value: unknown): DopplerCarotidasWebValidation {
  const parsed = DopplerCarotidasWebSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false, data: null, issues: parsed.error.issues.map(i => ({ code: "schema", path: i.path.join("."), message: i.message })) };
  }
  const data = parsed.data;
  const issues: DopplerCarotidasWebIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const livre = Boolean(data.conclusao_livre);
  for (const id of LADOS) {
    const l = data[id];
    const r = ROTULO[id];
    if (l.avaliacao === null) { add("avaliacao_pendente", `${id}.avaliacao`, `${r}: informe se foi avaliado.`); continue; }
    if (l.avaliacao === "nao_avaliado") {
      if (temMedidas(l) || l.placas_status !== null || l.classificacao !== null) {
        add("lado_nao_avaliado_com_dados", id, `${r}: marcado como não avaliado, mas há medidas, placas ou classificação.`);
      }
      continue;
    }
    if (l.avaliacao === "limitado" && !l.limitacao) add("limitacao_sem_motivo", `${id}.limitacao`, `${r}: informe o motivo da limitação.`);
    if (l.placas_status === null) add("placas_pendente", `${id}.placas_status`, `${r}: informe se há placas ateromatosas.`);
    if (l.placas_status === "presentes" && l.placas.length === 0) add("placas_sem_registro", `${id}.placas`, `${r}: registre ao menos uma placa.`);
    if (l.placas_status === "ausentes" && l.placas.length > 0) add("placas_conflito", `${id}.placas`, `${r}: placas registradas conflitam com "sem placas".`);
    for (const [nome, m] of [["comum", l.comum], ["interna", l.interna], ["externa", l.externa]] as const) {
      if (m.vps_cms !== null && m.vdf_cms !== null && m.vdf_cms > m.vps_cms) {
        add("vdf_maior_que_vps", `${id}.${nome}`, `${r}: na carótida ${nome}, a VDF não pode superar a PSV.`);
      }
    }
    if (!livre && l.classificacao === null) add("classificacao_pendente", `${id}.classificacao`, `${r}: selecione a classificação do médico ou escreva a conclusão livre.`);
    if (l.classificacao === "normal" && l.placas_status === "presentes") {
      add("normal_com_placas", `${id}.classificacao`, `${r}: classificação normal conflita com placas presentes.`);
    }
    if (l.classificacao === "ateromatose_sem_estenose_significativa" && l.placas_status === "ausentes") {
      add("ateromatose_sem_placas", `${id}.classificacao`, `${r}: ateromatose conflita com "sem placas"; registre as placas ou revise a classificação.`);
    }
    if (l.vertebral.direcao === "ausente" && l.vertebral.vps_cms !== null) {
      add("vertebral_sem_fluxo_com_psv", `${id}.vertebral`, `${r}: artéria vertebral sem fluxo não pode ter PSV; apague a velocidade ou revise a direção.`);
    }
    const faixa = l.classificacao ? FAIXA_REDUCAO[l.classificacao] : undefined;
    const reducoes = l.placas.map(p => p.estenose_percentual).filter((v): v is number => v !== null);
    if (faixa && reducoes.length) {
      const maior = Math.max(...reducoes);
      if (maior < faixa.min || maior > faixa.max) {
        add("reducao_incompativel", `${id}.placas`, `${r}: maior redução luminal informada (${fmt(maior)}%) incompatível com a classificação; revise a placa ou a classificação.`);
      }
    }
  }
  if (LADOS.every(id => data[id].avaliacao === "nao_avaliado")) add("nenhum_lado", "", "Avalie ao menos um lado.");
  return { success: issues.length === 0, data, issues };
}

// ── Redação ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
const fem = (id: LadoId) => (id === "direita" ? "direita" : "esquerda");
const masc = (id: LadoId) => (id === "direita" ? "direito" : "esquerdo");

function linhaVaso(nome: string, m: z.infer<typeof Medidas>): string | null {
  const partes: string[] = [];
  if (m.vps_cms !== null) partes.push(`PSV de ${fmt(m.vps_cms)} cm/s`);
  if (m.vdf_cms !== null) partes.push(`VDF de ${fmt(m.vdf_cms)} cm/s`);
  const ir = indiceResistividadeWeb(m.vps_cms, m.vdf_cms);
  if (ir !== null) partes.push(`IR de ${fmt(ir)}`);
  return partes.length ? `${nome}: ${partes.join(", ")}.` : null;
}

function descricaoPlaca(p: z.infer<typeof Placa>): string {
  if (p.descricao_raw) return `${p.descricao_raw.replace(/[.]$/, "")}.`;
  const detalhes = [
    p.composicao ? `de composição ${p.composicao === "lipidica" ? "lipídica" : p.composicao}` : null,
    p.superficie ? `superfície ${p.superficie}` : null,
    p.espessura_mm !== null ? `espessura de ${fmt(p.espessura_mm)} mm` : null,
    p.estenose_percentual !== null ? `redução luminal informada de ${fmt(p.estenose_percentual)}%` : null,
  ].filter(Boolean);
  return `Placa ateromatosa${p.localizacao ? ` em ${p.localizacao}` : ""}${detalhes.length ? `, ${detalhes.join(", ")}` : ""}.`;
}

const vertebralInformada = (l: DopplerCarotidasWebLado) => l.vertebral.direcao !== null || l.vertebral.vps_cms !== null;
const avaliado = (l: DopplerCarotidasWebLado) => l.avaliacao === "avaliado" || l.avaliacao === "limitado";

function blocoLado(id: LadoId, l: DopplerCarotidasWebLado, objetivo: boolean): string {
  const titulo = objetivo ? (id === "direita" ? "DIREITO" : "ESQUERDO") : `LADO ${id === "direita" ? "DIREITO" : "ESQUERDO"}`;
  if (!avaliado(l)) return `${titulo}\nLado ${masc(id)} não avaliado neste exame.`;
  const linhas: string[] = [];
  if (l.avaliacao === "limitado" && l.limitacao) linhas.push(`Avaliação limitada: ${l.limitacao.replace(/[.]$/, "")}.`);
  if (l.emi_mm !== null) linhas.push(`Espessura do complexo médio-intimal do lado ${masc(id)}: ${fmt(l.emi_mm)} mm.`);
  if (l.placas_status === "ausentes") linhas.push(`Não se observam placas ateromatosas à ${fem(id)}.`);
  else linhas.push(...l.placas.map(descricaoPlaca));
  for (const linha of [
    linhaVaso(`Carótida comum ${fem(id)}`, l.comum),
    linhaVaso(`Carótida interna ${fem(id)}`, l.interna),
    linhaVaso(`Carótida externa ${fem(id)}`, l.externa),
  ]) if (linha) linhas.push(linha);
  const razao = razaoInternaComum(l);
  if (razao !== null) linhas.push(`Razão PSV carótida interna/comum à ${fem(id)}: ${fmt(razao)}.`);
  if (vertebralInformada(l)) {
    const v: string[] = [];
    if (l.vertebral.direcao) v.push(`fluxo ${l.vertebral.direcao === "anterogrado" ? "anterógrado" : l.vertebral.direcao === "retrogrado" ? "retrógrado" : "não detectado"}`);
    if (l.vertebral.vps_cms !== null) v.push(`PSV de ${fmt(l.vertebral.vps_cms)} cm/s`);
    linhas.push(`Artéria vertebral ${fem(id)}: ${v.join(", ")}.`);
  }
  return `${titulo}\n${linhas.join("\n")}`;
}

const FRASE: Record<(typeof DOPPLER_CAROTIDAS_CLASSIFICACOES)[number], (lado: string) => string> = {
  normal: (lado) => (lado === "bilateralmente" ? "Artérias carótidas sem alterações ao estudo Doppler, bilateralmente." : `Artérias carótidas ${lado} sem alterações ao estudo Doppler.`),
  ateromatose_sem_estenose_significativa: (lado) => `Ateromatose carotídea ${lado}, sem estenose hemodinamicamente significativa.`,
  estenose_menor_50: (lado) => `Estenose carotídea inferior a 50% ${lado}.`,
  estenose_50_69: (lado) => `Estenose carotídea de 50 a 69% ${lado}.`,
  estenose_70_99: (lado) => `Estenose carotídea de 70 a 99% ${lado}.`,
  oclusao: (lado) => `Oclusão carotídea ${lado}.`,
};

function conclusao(f: DopplerCarotidasWebInput): string[] {
  if (f.conclusao_livre) return [`${f.conclusao_livre.replace(/[.]$/, "")}.`];
  const d = f.direita;
  const e = f.esquerda;
  const itens: string[] = [];
  const limitado = (l: DopplerCarotidasWebLado) => (l.avaliacao === "limitado" ? " (avaliação limitada)" : "");
  const ambosNormaisCompletos = d.avaliacao === "avaliado" && e.avaliacao === "avaliado" && d.classificacao === "normal" && e.classificacao === "normal";
  if (ambosNormaisCompletos) {
    const vertebraisNormais = d.vertebral.direcao === "anterogrado" && e.vertebral.direcao === "anterogrado";
    itens.push(vertebraisNormais
      ? "Estudo Doppler das artérias carótidas e vertebrais dentro dos limites da normalidade."
      : "Estudo Doppler das artérias carótidas dentro dos limites da normalidade.");
  } else if (avaliado(d) && avaliado(e) && d.classificacao && d.classificacao === e.classificacao && d.avaliacao === e.avaliacao) {
    itens.push(`${FRASE[d.classificacao]("bilateralmente").replace(/\.$/, "")}${limitado(d)}.`);
  } else {
    for (const id of LADOS) {
      const l = f[id];
      if (!avaliado(l)) { itens.push(`Lado ${masc(id)} não avaliado.`); continue; }
      if (!l.classificacao) continue;
      itens.push(`${FRASE[l.classificacao](`à ${fem(id)}`).replace(/\.$/, "")}${limitado(l)}.`);
    }
  }
  for (const id of LADOS) {
    const l = f[id];
    if (!avaliado(l)) continue;
    if (l.vertebral.direcao === "retrogrado") itens.push(`Fluxo retrógrado na artéria vertebral ${fem(id)}.`);
    if (l.vertebral.direcao === "ausente") itens.push(`Fluxo não detectado na artéria vertebral ${fem(id)}.`);
  }
  return itens;
}

export function renderDopplerCarotidasWeb(value: unknown, style: "CLASSICO_COMPLETO" | "OBJETIVO" = "CLASSICO_COMPLETO"): string {
  const validation = validateDopplerCarotidasWeb(value);
  if (!validation.success || !validation.data) throw new Error("dados do Doppler de carótidas incompletos ou conflitantes");
  const f = validation.data;
  const objetivo = style === "OBJETIVO";
  const ladosAvaliados = LADOS.filter(id => avaliado(f[id]));
  const vertebrais = ladosAvaliados.some(id => vertebralInformada(f[id]));
  const escopo = ladosAvaliados.length === 2 ? "bilateral" : `à ${fem(ladosAvaliados[0] ?? "direita")}`;
  const vasos = `das artérias carótidas${vertebrais ? " e vertebrais" : ""}`;
  const tecnica = objetivo
    ? `Exame realizado com transdutor linear de alta frequência, utilizando modos bidimensional, Doppler colorido e espectral, para avaliação ${escopo === "bilateral" ? "bilateral " : ""}${vasos}${escopo === "bilateral" ? "" : ` ${escopo}`}.`
    : `Foram realizados cortes ultrassonográficos com transdutor linear de alta frequência, utilizando os modos bidimensional, Doppler colorido e espectral para avaliação ${escopo === "bilateral" ? "bilateral " : ""}${vasos}${escopo === "bilateral" ? "" : ` ${escopo}`}.`;
  const blocos = [
    "ULTRASSONOGRAFIA DOPPLER DE CARÓTIDAS E VERTEBRAIS",
    `${objetivo ? "TÉCNICA:" : "COMENTÁRIOS:"}\n${tecnica}`,
    `${objetivo ? "ACHADOS:" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:"}\n${blocoLado("direita", f.direita, objetivo)}\n\n${blocoLado("esquerda", f.esquerda, objetivo)}`,
  ];
  if (f.achados_adicionais) blocos.push(f.achados_adicionais);
  const itens = conclusao(f);
  blocos.push(`${objetivo ? "IMPRESSÃO:" : "CONCLUSÃO:"}\n${itens.length > 1 ? itens.map((x, i) => `${i + 1}) ${x}`).join("\n") : itens[0] ?? ""}`);
  return blocos.join("\n\n");
}
