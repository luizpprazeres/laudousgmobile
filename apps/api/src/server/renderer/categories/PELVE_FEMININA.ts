import { z } from "zod";

/**
 * DET-5 — Renderer de PELVE_FEMININA (ultrassonografia pélvica ginecológica),
 * estilo CLÁSSICO (TÍTULO / COMENTÁRIOS: / OS SEGUINTES ASPECTOS FORAM
 * OBSERVADOS: / CONCLUSÃO:).
 *
 * O LLM extrai dados tipados; o código monta o laudo por CONSTRUÇÃO (cabeçalhos,
 * ordem fixa, numeração contínua garantidos). Cálculos determinísticos:
 *  - volume uterino e ovariano pela fórmula do elipsóide (L x AP x T x 0,523);
 *  - escolha do MODELO (título/técnica/comentários) pela VIA do exame.
 *
 * A PELVE tem 4 VARIANTES por via (campo `via`):
 *  - "ta_tv" (TA + TV) — título "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E
 *     TRANSVAGINAL" (default quando não detectável).
 *  - "tv" (somente transvaginal) — "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL".
 *  - "ta" (somente transabdominal) — "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL"
 *     (endométrio limitado pela técnica).
 *  - "pos_abortamento" — "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL – AVALIAÇÃO
 *     PÓS-ABORTAMENTO" (avalia produtos retidos da concepção).
 *
 * Fonte clínica: modelos clássicos validados no DB (writing_style_id Clássico,
 * 4 variantes) + regras do prompt vivo lib/categoryDefaults.ts (PELVE_FEMININA).
 *
 * Regras-chave reproduzidas FIELMENTE:
 *  - volume MANTÉM o valor ditado (não recalcula); calcula só por construção
 *    quando há medidas e nenhum volume ditado;
 *  - ovários: item único se ambos normais; itens separados se alteração
 *    unilateral; item específico se não visualizado(s);
 *  - numeração CONTÍNUA sem saltos (montada em código);
 *  - achados (mioma/cisto/DIU/istmocele/pólipo/endometrioma/SOP/Naboth/
 *    adenomiose/líquido livre/pós-aborto) entram só quando informados.
 */

// ---------------------------------------------------------------------------
// Schema de achados
// ---------------------------------------------------------------------------

const ViaEnum = ["ta", "tv", "ta_tv", "pos_abortamento"] as const;

/** Lesão miometrial (mioma). FIGO opcional; classificação intramural/etc. */
const MiomaSchema = z.object({
  classificacao: z.string().nullable(), // "intramural" | "subseroso" | "submucoso"...
  medidas_cm: z.array(z.number()).nullable(),
  parede: z.string().nullable(), // "parede anterior" | "região fúndica"...
  relacao: z.string().nullable(), // texto livre (relação serosa/mucosa)
  figo: z.string().nullable(), // categoria FIGO (ex.: "4"); null se não dita
});

/** Achado ovariano focal (cisto simples/complexo/endometrioma/SOP/funcional). */
const OvarioAchadoSchema = z.object({
  lado: z.enum(["direito", "esquerdo"]),
  tipo: z
    .enum([
      "cisto_simples",
      "cisto_complexo",
      "endometrioma",
      "funcional",
      "sop",
      "outro",
    ])
    .nullable(),
  medidas_cm: z.array(z.number()).nullable(), // medidas da imagem (não do ovário)
  descricao: z.string().nullable(), // verbatim do médico p/ o achado
});

const OvarioSchema = z.object({
  visualizado: z.boolean(),
  medidas_cm: z.array(z.number()).nullable(), // [L, AP, T] do ovário
  volume_ml: z.number().nullable(), // ditado; null → calcula das medidas
  alterado: z.boolean(), // true se há achado anormal neste ovário
  atrofico: z.boolean(), // menopausa: "poucas imagens anecoicas"
  achados: z.array(OvarioAchadoSchema),
});

export const PelveFemininaFindingsSchema = z.object({
  via: z.enum(ViaEnum).nullable(), // null → default "ta_tv"

  // Útero
  utero_posicao: z.string().nullable(), // "anteversão", "anteversoflexão"...
  utero_medidas_cm: z.array(z.number()).nullable(), // [L, AP, T]
  utero_volume_ml: z.number().nullable(), // ditado; null → calcula das medidas
  utero_volume_classe: z.string().nullable(), // "normal" | "aumentado" | "reduzido"...
  miometrio_descricao: z.string().nullable(), // verbatim quando alterado (adenomiose)
  miomas: z.array(MiomaSchema),
  utero_miomatoso: z.boolean(), // múltiplos nódulos não individualizáveis

  // Endométrio
  endometrio_espessura_cm: z.number().nullable(),
  endometrio_eco: z.string().nullable(), // "homogêneo" | "heterogêneo"...
  endometrio_frase: z
    .enum([
      "padrao",
      "menopausa",
      "reposicao_hormonal",
      "nao_correlacionavel",
      "ta_limitado",
    ])
    .nullable(),
  endometrio_motivo: z.string().nullable(), // só p/ "nao_correlacionavel"
  endometrio_achado: z.string().nullable(), // descrição patológica verbatim (pólipo/espessado)
  endometrio_conclusao: z.string().nullable(), // item de conclusão patológico verbatim

  // Ovários
  ovario_direito: OvarioSchema,
  ovario_esquerdo: OvarioSchema,

  // Acessórios / observações
  diu: z.enum(["bem_posicionado", "deslocado"]).nullable(),
  diu_descricao: z.string().nullable(),
  istmocele: z.boolean(),
  istmocele_descricao: z.string().nullable(),
  istmocele_tipo: z.string().nullable(), // "simples" | "complexo"
  cistos_naboth: z.boolean(),
  calcificacao_arqueadas: z.boolean(),
  adenomiose: z.boolean(),
  adenomiose_conclusao: z.string().nullable(), // frase de conclusão verbatim
  liquido_livre: z.boolean(),
  liquido_livre_descricao: z.string().nullable(),

  // Pós-abortamento (via = "pos_abortamento")
  produtos_retidos: z.boolean(),
  produtos_retidos_quantidade: z.string().nullable(), // "pequena" | "moderada" | "grande"

  observacoes_corpo: z.string().nullable(), // texto livre p/ o corpo
  achados_adicionais: z.string().nullable(), // texto livre p/ a conclusão
  // Referência etária (Domingos): SÓ por comando. A idade dispara uma LINHA única
  // de valores de referência no rodapé (não a tabela inteira). grande_multipara
  // afeta o útero na faixa 50–60 anos.
  referencia_idade_anos: z.number().nullable(),
  referencia_grande_multipara: z.boolean(),
});

export type PelveFemininaFindings = z.infer<typeof PelveFemininaFindingsSchema>;
export type PelveOvario = z.infer<typeof OvarioSchema>;
export type PelveMioma = z.infer<typeof MiomaSchema>;

// ---------------------------------------------------------------------------
// JSON Schema strict para OpenAI (todos required, nullable via union)
// ---------------------------------------------------------------------------

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const bool = { type: "boolean" } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const enumNull = (vals: readonly string[]) =>
  ({ type: ["string", "null"], enum: [...vals, null] }) as const;

const MIOMA_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["classificacao", "medidas_cm", "parede", "relacao", "figo"],
  properties: {
    classificacao: str,
    medidas_cm: numArr,
    parede: str,
    relacao: str,
    figo: str,
  },
} as const;

const OVARIO_ACHADO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["lado", "tipo", "medidas_cm", "descricao"],
  properties: {
    lado: { type: "string", enum: ["direito", "esquerdo"] },
    tipo: enumNull([
      "cisto_simples",
      "cisto_complexo",
      "endometrioma",
      "funcional",
      "sop",
      "outro",
    ]),
    medidas_cm: numArr,
    descricao: str,
  },
} as const;

const OVARIO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["visualizado", "medidas_cm", "volume_ml", "alterado", "atrofico", "achados"],
  properties: {
    visualizado: bool,
    medidas_cm: numArr,
    volume_ml: num,
    alterado: bool,
    atrofico: bool,
    achados: { type: "array", items: OVARIO_ACHADO_JSON },
  },
} as const;

export const PELVE_FEMININA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "via",
    "utero_posicao",
    "utero_medidas_cm",
    "utero_volume_ml",
    "utero_volume_classe",
    "miometrio_descricao",
    "miomas",
    "utero_miomatoso",
    "endometrio_espessura_cm",
    "endometrio_eco",
    "endometrio_frase",
    "endometrio_motivo",
    "endometrio_achado",
    "endometrio_conclusao",
    "ovario_direito",
    "ovario_esquerdo",
    "diu",
    "diu_descricao",
    "istmocele",
    "istmocele_descricao",
    "istmocele_tipo",
    "cistos_naboth",
    "calcificacao_arqueadas",
    "adenomiose",
    "adenomiose_conclusao",
    "liquido_livre",
    "liquido_livre_descricao",
    "produtos_retidos",
    "produtos_retidos_quantidade",
    "observacoes_corpo",
    "achados_adicionais",
    "referencia_idade_anos",
    "referencia_grande_multipara",
  ],
  properties: {
    via: enumNull(ViaEnum),
    utero_posicao: str,
    utero_medidas_cm: numArr,
    utero_volume_ml: num,
    utero_volume_classe: str,
    miometrio_descricao: str,
    miomas: { type: "array", items: MIOMA_JSON },
    utero_miomatoso: bool,
    endometrio_espessura_cm: num,
    endometrio_eco: str,
    endometrio_frase: enumNull([
      "padrao",
      "menopausa",
      "reposicao_hormonal",
      "nao_correlacionavel",
      "ta_limitado",
    ]),
    endometrio_motivo: str,
    endometrio_achado: str,
    endometrio_conclusao: str,
    ovario_direito: OVARIO_JSON,
    ovario_esquerdo: OVARIO_JSON,
    diu: enumNull(["bem_posicionado", "deslocado"]),
    diu_descricao: str,
    istmocele: bool,
    istmocele_descricao: str,
    istmocele_tipo: str,
    cistos_naboth: bool,
    calcificacao_arqueadas: bool,
    adenomiose: bool,
    adenomiose_conclusao: str,
    liquido_livre: bool,
    liquido_livre_descricao: str,
    produtos_retidos: bool,
    produtos_retidos_quantidade: str,
    observacoes_corpo: str,
    achados_adicionais: str,
    referencia_idade_anos: num,
    referencia_grande_multipara: { type: "boolean" },
  },
} as const;

// ---------------------------------------------------------------------------
// Prompt de extração
// ---------------------------------------------------------------------------

export const PELVE_FEMININA_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DA PELVE FEMININA
(ginecológica). Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente
nada. Quem escolhe o modelo, calcula volumes e monta o laudo é o código.

REGRAS:
1. via: a TÉCNICA do exame —
   - "ta_tv": transabdominal E transvaginal (default quando ambíguo/não dito).
   - "tv": somente transvaginal ("apenas transvaginal", "só TV").
   - "ta": somente transabdominal ("apenas transabdominal", "endométrio limitado").
   - "pos_abortamento": controle/avaliação pós-abortamento ou produtos retidos.
   Se não for possível determinar, use null (o código assume "ta_tv").
2. ÚTERO:
   - utero_posicao: variante válida — anteversão, retroversão, médioversão,
     anteversoflexão, anteflexão, retroflexão, mediana, axial. Corrija distorções
     fonéticas para a mais próxima ("intervenção" → "anteversão"). Se não dita,
     use null (o código assume "anteversão").
   - utero_medidas_cm: [L, AP, T] em cm; null se não ditas. PRESERVE a casa
     decimal (vírgula → ponto): "7,2" → 7.2.
   - utero_volume_ml: SÓ se o médico DITAR o volume (em cm³/ml); senão null
     (o código calcula L x AP x T x 0,523). Se dois valores p/ o mesmo órgão,
     use o ÚLTIMO mencionado.
   - utero_volume_classe: "normal" (default), "aumentado", "reduzido" ou texto
     ditado ("acentuadamente aumentado"). Use null = normal.
   - miometrio_descricao: SÓ se o miométrio for descrito como ALTERADO
     (adenomiose etc.) — verbatim do médico; null se normal.
   - miomas: lista de nódulos miomatosos. Para cada um: classificacao
     (intramural/subseroso/submucoso...), medidas_cm [a,b,c], parede ("parede
     anterior"/"região fúndica"...), relacao (texto), figo (só se dito). [] se
     não houver.
   - utero_miomatoso: true SOMENTE quando o útero for descrito como miomatoso
     com nódulos não individualizáveis (coalescentes); senão false.
3. ENDOMÉTRIO:
   - endometrio_espessura_cm: espessura em cm; null se não dita. PRESERVE decimal.
   - endometrio_eco: "homogêneo"/"heterogêneo"... quando dito; null caso contrário.
   - endometrio_frase: escolha da frase de conclusão de NORMALIDADE —
     "padrao" (fase do ciclo), "menopausa", "reposicao_hormonal",
     "nao_correlacionavel" (com endometrio_motivo), "ta_limitado" (técnica
     transabdominal não avaliou). null se houver achado patológico
     (use endometrio_achado/endometrio_conclusao).
   - endometrio_achado: descrição patológica verbatim p/ o CORPO (pólipo,
     espessamento...); null se normal.
   - endometrio_conclusao: item de conclusão patológico verbatim (pólipo
     endometrial, espessamento c/ recomendação); null se normal.
4. OVÁRIOS (ovario_direito, ovario_esquerdo), cada um:
   - visualizado: false se "ovário não visualizado"/"não caracterizado".
   - medidas_cm: [L, AP, T] do ovário em cm; null se não ditas.
   - volume_ml: SÓ se ditado; senão null (o código calcula das medidas).
   - alterado: true se há achado anormal (cisto/endometrioma/SOP/funcional).
   - atrofico: true p/ ovário atrófico de menopausa ("poucas imagens anecoicas").
   - achados: lista de achados focais; para cada um: lado, tipo (cisto_simples |
     cisto_complexo | endometrioma | funcional | sop | outro), medidas_cm da
     imagem, descricao verbatim. [] se ovário normal.
5. ACESSÓRIOS (só quando informados; senão null/false/[]):
   - diu: "bem_posicionado" | "deslocado"; diu_descricao verbatim.
   - istmocele: true se nicho de cicatriz de cesárea; istmocele_descricao
     verbatim; istmocele_tipo "simples"/"complexo".
   - cistos_naboth: true se descritos.
   - calcificacao_arqueadas: true se calcificação das artérias arqueadas.
   - adenomiose: true se achados de adenomiose; adenomiose_conclusao = a frase
     de conclusão ditada ("Achados compatíveis com adenomiose difusa"...).
   - liquido_livre: true se houver líquido livre na pelve; liquido_livre_descricao
     verbatim (ex.: "pequena quantidade no fundo de saco de Douglas").
6. PÓS-ABORTAMENTO (via "pos_abortamento"):
   - produtos_retidos: true se há produtos retidos da concepção (imagens
     hiperecoicas amorfas na cavidade); false se ausentes.
   - produtos_retidos_quantidade: "pequena"/"moderada"/"grande" (default
     "moderada" se não dita e houver produtos).
7. observacoes_corpo: texto livre adicional p/ o CORPO (verbatim); null se nada.
8. achados_adicionais: SOMENTE alterações reais que devam ir à CONCLUSÃO, nas
   palavras do médico; null se exame normal. NUNCA frases de normalidade
   redundantes.
9. referencia_idade_anos: SOMENTE se o médico pedir a REFERÊNCIA etária para uma
   paciente de idade específica (ex.: "coloque a referência para uma paciente de
   40 anos com 3 filhos") → a idade em anos (40). null se não pedir.
   referencia_grande_multipara: true se mencionar "grande multípara" ou ≥3 partos/
   filhos junto do pedido de referência; senão false.`;

// ---------------------------------------------------------------------------
// Formatação e cálculos determinísticos
// ---------------------------------------------------------------------------

/** Número pt-BR com vírgula decimal; inteiro sem casa, fração com as casas. */
function ptBr(n: number): string {
  const r = Math.round(n * 100) / 100;
  return (Number.isInteger(r) ? String(r) : String(r)).replace(".", ",");
}

/** Medidas "L x AP x T cm" (placeholder ____ por dimensão faltante). */
function medidasFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) =>
    Number.isFinite(arr[i] as number) ? ptBr(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}

/** Medidas curtas "a x b cm" (2 dimensões; p/ imagens focais). */
function medidas2Fmt(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ cm";
  const vals = [0, 1].map((i) =>
    Number.isFinite(arr[i] as number) ? ptBr(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}

/** Espessura em cm (placeholder se null). */
function espFmt(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}

/**
 * Volume pelo elipsóide: L x AP x T x 0,523 (cm³), 1 casa decimal.
 * Mantém o valor DITADO quando presente (não recalcula). null = sem dado.
 */
function calcVolume(medidas: number[] | null, volumeDitado: number | null): number | null {
  if (volumeDitado !== null && Number.isFinite(volumeDitado)) return volumeDitado;
  if (!medidas || medidas.length < 3) return null;
  const [a, b, c] = medidas;
  if (![a, b, c].every((x) => Number.isFinite(x as number))) return null;
  return Math.round((a as number) * (b as number) * (c as number) * 0.523 * 10) / 10;
}

function volFmt(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}

/** Classe de volume uterino para a conclusão; default "normal". */
function volClasseFmt(s: string | null): string {
  if (!s) return "normal";
  const t = s.trim().toLowerCase();
  if (t === "normal" || t.includes("normal")) return s.trim();
  return s.trim();
}

/**
 * Classe do volume ovariano derivada do valor (cm³) para a CONCLUSÃO.
 * Limiares dos valores habituais (ovários 6–12 cm³ na menacme): acima de 12 →
 * "aumentado", abaixo de 6 → "reduzido", entre 6–12 → "normal". Sem volume
 * calculável → placeholder "____".
 */
function classeVolumeOvario(vol: number | null): string {
  if (vol === null || !Number.isFinite(vol)) return "____";
  if (vol > 12) return "aumentado";
  if (vol < 6) return "reduzido";
  return "normal";
}

/** Achado ovariano anecoico (cisto simples / coleção líquida funcional). */
function achadoOvarioAnecoico(a: z.infer<typeof OvarioAchadoSchema> | undefined): boolean {
  if (!a) return false;
  if (a.tipo === "cisto_simples" || a.tipo === "funcional") return true;
  // Princípio: toda imagem anecoica = coleção líquida; detecta verbatim anecoico.
  return !!a.descricao && /anec[oó]ic/i.test(a.descricao);
}

/** Posição uterina; default "anteversão". */
function posicaoFmt(s: string | null): string {
  return s && s.trim() !== "" ? s.trim() : "anteversão";
}

// ---------------------------------------------------------------------------
// Frases fixas por VIA (modelo)
// ---------------------------------------------------------------------------

type Via = (typeof ViaEnum)[number];

function resolveVia(via: Via | null): Via {
  return via ?? "ta_tv";
}

function tituloDaVia(via: Via): string {
  switch (via) {
    case "tv":
      return "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL";
    case "ta":
      return "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL";
    case "pos_abortamento":
      return "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL – AVALIAÇÃO PÓS-ABORTAMENTO";
    case "ta_tv":
    default:
      return "ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL";
  }
}

function comentariosDaVia(via: Via): string {
  switch (via) {
    case "tv":
      return "COMENTÁRIOS:\nExame realizado com transdutor de 6.5 MHz, pela técnica transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";
    case "ta":
      return "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais, abrangendo toda a pelve. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";
    case "pos_abortamento":
      return "COMENTÁRIOS:\nExame realizado com transdutor de 6.5 MHz, pela técnica transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
    case "ta_tv":
    default:
      return "COMENTÁRIOS:\nExame realizado inicialmente com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta e paciente em decúbito dorsal. Após a micção, foi introduzido transdutor de 6.5 MHz com a finalidade de realizar a técnica transvaginal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais, abrangendo toda a pelve. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";
  }
}

/** A bexiga entra (corpo e conclusão) em TA, TA+TV e pós-abortamento; não em TV puro. */
function temBexiga(via: Via): boolean {
  return via !== "tv";
}

/**
 * Linha ÚNICA de referência etária (tabela Domingos Correia da Rocha) — valores
 * canônicos do docx, selecionados pela idade (+ paridade na faixa 50–60). Só é
 * renderada por comando (referencia_idade_anos != null). Rodapé enxuto, 1 linha.
 */
export function domingosReferenceLine(idade: number, grandeMultipara: boolean): string {
  const i = Math.round(idade);
  const p = `*Valores de referência (Domingos) — paciente de ${i} anos: `;
  // ≤ 14 anos (pediátrica) — útero + ovários.
  if (i <= 2) return `${p}útero até 2,0 cm³; ovários até 1,0 cm³.*`;
  if (i <= 8) return `${p}útero até 5,0 cm³; ovários até 1,5 cm³.*`;
  if (i <= 11) return `${p}útero até 10,0 cm³; ovários até 2,0 cm³.*`;
  if (i <= 13) return `${p}útero até 25,0 cm³; ovários até 5,0 cm³.*`;
  if (i <= 14) return `${p}útero até 50,0 cm³; ovários até 6,0 cm³.*`;
  // ≥ 15 anos (adulta).
  if (i < 18) return `${p}ovários até 8,0 cm³; endométrio 0,3–1,5 cm.*`; // 15–18: útero não tabelado
  if (i < 50) return `${p}útero até 110 cm³; ovários até 11,0 cm³; endométrio 0,3–1,5 cm.*`;
  if (i < 60)
    return `${p}útero até ${grandeMultipara ? "130" : "110"} cm³; ovários até 8,0 cm³.*`;
  return `${p}útero até 80 cm³; ovários até 6,0 cm³; endométrio até 0,4 cm.*`; // > 60 (menopausa)
}

const NOTA_FIGO = "FIGO: Federação Internacional de Ginecologia e Obstetrícia.";

// ---------------------------------------------------------------------------
// Helpers de miomas
// ---------------------------------------------------------------------------

/** Frase do miométrio no corpo (normal, alterado verbatim ou com miomas). */
function miometrioCorpo(f: PelveFemininaFindings): string {
  if (f.utero_miomatoso) {
    return "Miométrio apresentando múltiplas imagens hipoecoicas e heterogêneas, coalescentes, ocasionando atenuação sonora, que impede a avaliação individualizada.";
  }
  if (f.miometrio_descricao && f.miometrio_descricao.trim() !== "") {
    return f.miometrio_descricao.trim().replace(/\.+$/, "") + ".";
  }
  const miomas = f.miomas ?? [];
  if (miomas.length === 0) {
    return "Miométrio com ecogenicidade e ecotextura normais.";
  }
  if (miomas.length === 1) {
    const m = miomas[0] as PelveMioma;
    const partes = ["Miométrio apresentando imagem hipoecoica e heterogênea, com margens regulares"];
    partes.push(`medindo ${medidasFmt(m.medidas_cm)}`);
    if (m.parede) partes.push(`situada na ${m.parede}`);
    if (m.relacao) partes.push(m.relacao.trim());
    return `${partes.join(", ")}.`;
  }
  if (miomas.length === 2) {
    const [m1, m2] = miomas as [PelveMioma, PelveMioma];
    const d1 = `A primeira medindo ${medidasFmt(m1.medidas_cm)}${m1.parede ? `, situada na ${m1.parede}` : ""}${m1.relacao ? `, ${m1.relacao.trim()}` : ""}.`;
    const d2 = `A segunda medindo ${medidasFmt(m2.medidas_cm)}${m2.parede ? `, situada na ${m2.parede}` : ""}${m2.relacao ? `, ${m2.relacao.trim()}` : ""}.`;
    return `Miométrio apresentando duas imagens hipoecoicas e heterogêneas, com margens regulares. ${d1} ${d2}`;
  }
  // 3 ou mais
  const ordinais = ["a primeira", "a segunda", "a terceira", "a quarta", "a quinta"];
  const descr = miomas
    .map((m, i) => {
      const ord = ordinais[i] ?? `a ${i + 1}ª`;
      return `${ord} medindo ${medidasFmt(m.medidas_cm)}${m.parede ? `, situada na ${m.parede}` : ""}`;
    })
    .join("; ");
  return `Miométrio apresentando múltiplas imagens hipoecoicas e heterogêneas. As maiores assim descritas: ${descr}.`;
}

/** Item(ns) de conclusão dos miomas. Retorna [] se não houver. */
function miomasConclusao(f: PelveFemininaFindings): string[] {
  const miomas = f.miomas ?? [];
  if (f.utero_miomatoso || miomas.length === 0) return [];
  const cls = (m: PelveMioma): string => {
    const base = m.classificacao ? `nódulo miomatoso ${m.classificacao}` : "nódulo miomatoso";
    const figo = m.figo ? ` (categoria FIGO ${m.figo})` : "";
    return `${base}${figo}`;
  };
  if (miomas.length === 1) {
    return [`Miométrio apresentando imagem sólida, que tem como diagnóstico mais provável ${cls(miomas[0] as PelveMioma)}.`];
  }
  if (miomas.length === 2) {
    const [m1, m2] = miomas as [PelveMioma, PelveMioma];
    return [
      `Miométrio apresentando duas imagens sólidas, que têm como diagnóstico mais provável nódulos miomatosos: o primeiro ${cls(m1).replace(/^nódulo miomatoso ?/, "")}, e o segundo ${cls(m2).replace(/^nódulo miomatoso ?/, "")}.`.replace(/  +/g, " "),
    ];
  }
  const lista = miomas.map((m) => cls(m).replace(/^nódulo miomatoso ?/, "")).join(", ");
  return [`Miométrio apresentando múltiplas imagens sólidas, que têm como diagnóstico mais provável nódulos miomatosos. Os maiores: ${lista}.`];
}

function temMiomasComFigo(f: PelveFemininaFindings): boolean {
  return !f.utero_miomatoso && (f.miomas ?? []).some((m) => !!m.figo);
}

// ---------------------------------------------------------------------------
// Helpers de endométrio
// ---------------------------------------------------------------------------

/** Linha do endométrio no corpo. null = omitir (TA limitado sem medida). */
function endometrioCorpo(f: PelveFemininaFindings, via: Via): string | null {
  // Achado patológico verbatim vence.
  if (f.endometrio_achado && f.endometrio_achado.trim() !== "") {
    return f.endometrio_achado.trim().replace(/\.+$/, "") + ".";
  }
  // TA puro com avaliação limitada e sem espessura → frase própria da técnica.
  if (via === "ta" && f.endometrio_espessura_cm === null && f.endometrio_frase !== "padrao") {
    return "A técnica transabdominal não permite avaliar detalhadamente a espessura do endométrio.";
  }
  if (f.endometrio_espessura_cm === null && f.endometrio_eco === null) {
    return via === "ta" ? null : "Endométrio medindo ____ cm de espessura.";
  }
  const eco = f.endometrio_eco ? `${f.endometrio_eco.trim()}, ` : "";
  const sufixo = via === "pos_abortamento" ? " máxima" : "";
  return `Endométrio ${eco}medindo ${espFmt(f.endometrio_espessura_cm)} cm de espessura${sufixo}.`;
}

/**
 * Override determinístico de MENOPAUSA. Se o ditado mencionar "menopausa" (não
 * "pré-menopausa" nem negação), marca AMBOS os ovários como atróficos ("poucas
 * imagens anecoicas" / conclusão "ambos praticamente sem folículos") e o
 * endométrio com a frase da menopausa ("faixa etária da menopausa"). O "como
 * escrever" já existe no renderer; isto garante o GATILHO automático ("só falar
 * menopausa") sem depender da extração LLM (mineração: ajuste frequente do Luiz).
 * Vale p/ TA e TV. Achados individualizados por lado continuam vencendo (a
 * precedência de achados/conclusão patológica já está no renderer).
 */
export function mergeMenopausaPelve(
  f: PelveFemininaFindings,
  rawInput: string,
): PelveFemininaFindings {
  const t = rawInput.toLowerCase();
  const menopausa =
    /menop[áa]usic|\bmenopausa\b/.test(t) &&
    !/pr[ée]-?\s*menopausa/.test(t) &&
    !/n[ãa]o\s+(?:est[áa]\s+)?(?:na\s+|em\s+)?menopausa/.test(t);
  if (!menopausa) return f;
  return {
    ...f,
    ovario_direito: { ...f.ovario_direito, atrofico: true },
    ovario_esquerdo: { ...f.ovario_esquerdo, atrofico: true },
    endometrio_frase: "menopausa",
  };
}

/**
 * ANTI-ALUCINAÇÃO (boletim 2026-06-30, laudo 900c411c): a extração LLM às vezes
 * DUPLICA uma coleção peri-ovariana (O-RADS 2) também como `liquido_livre`, gerando
 * um "líquido livre na cavidade pélvica" INEXISTENTE (corpo + conclusão). Se a
 * descrição do líquido livre repete a de um achado ovariano (≥60% dos tokens
 * significativos), é a MESMA coleção contada 2x → suprime o líquido livre.
 * Conservador: só suprime na sobreposição alta; líquido livre com descrição própria
 * (ex.: "moderada quantidade no fundo de saco") é preservado.
 */
export function mergePelveLiquidoLivre(
  f: PelveFemininaFindings,
): PelveFemininaFindings {
  if (!f.liquido_livre) return f;
  const desc = (f.liquido_livre_descricao ?? "").toLowerCase().trim();
  if (!desc) return f;
  const tokens = desc.match(/\p{L}{4,}/gu) ?? [];
  if (tokens.length === 0) return f;
  const ovarioDescs = [
    ...f.ovario_direito.achados,
    ...f.ovario_esquerdo.achados,
  ]
    .map((a) => (a.descricao ?? "").toLowerCase())
    .filter((d) => d.trim() !== "");
  const duplicado = ovarioDescs.some((od) => {
    const hits = tokens.filter((t) => od.includes(t)).length;
    return hits / tokens.length >= 0.6;
  });
  return duplicado
    ? { ...f, liquido_livre: false, liquido_livre_descricao: null }
    : f;
}

/** Item de conclusão do endométrio. */
function endometrioConclusao(f: PelveFemininaFindings, via: Via): string {
  if (f.endometrio_conclusao && f.endometrio_conclusao.trim() !== "") {
    return f.endometrio_conclusao.trim().replace(/\.+$/, "") + ".";
  }
  switch (f.endometrio_frase) {
    case "menopausa":
      return "O endométrio tem espessura normal para a faixa etária da menopausa.";
    case "reposicao_hormonal":
      return "O endométrio tem espessura normal para a paciente submetida a terapêutica de reposição hormonal.";
    case "nao_correlacionavel":
      return `Endométrio medindo ${espFmt(f.endometrio_espessura_cm)} cm de espessura. Não foi possível correlacionar a espessura do endométrio com a fase menstrual${f.endometrio_motivo ? `, pois ${f.endometrio_motivo.trim().replace(/\.+$/, "")}` : ""}.`;
    case "ta_limitado":
      return "Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal.";
    case "padrao":
      return "O endométrio tem espessura normal para a fase do ciclo menstrual.";
    default:
      // Sem frase escolhida: TA puro limitado → frase da técnica; senão padrão.
      if (via === "ta" && f.endometrio_espessura_cm === null) {
        return "Não foi possível avaliar detalhadamente a espessura do endométrio pela técnica transabdominal.";
      }
      return "O endométrio tem espessura normal para a fase do ciclo menstrual.";
  }
}

// ---------------------------------------------------------------------------
// Helpers de ovários
// ---------------------------------------------------------------------------

const ROTULO_OVARIO = { direito: "Ovário direito", esquerdo: "Ovário esquerdo" } as const;

/** Frase do ovário no corpo. */
function ovarioCorpo(lado: "direito" | "esquerdo", ov: PelveOvario): string {
  const rotulo = ROTULO_OVARIO[lado];
  if (!ov.visualizado) {
    return `${rotulo} não visualizado.`;
  }
  // Achados focais verbatim vencem a frase padrão.
  const achados = ov.achados ?? [];
  if (achados.length > 0) {
    const descr = achados
      .map((a) => (a.descricao ? a.descricao.trim().replace(/\.+$/, "") : descreveAchadoOvario(a)))
      .filter((s) => s !== "")
      .join("; ");
    return `${rotulo} medindo ${medidasFmt(ov.medidas_cm)}, apresentando ${descr}.`;
  }
  if (ov.atrofico) {
    return `${rotulo} medindo ${medidasFmt(ov.medidas_cm)}, apresentando poucas imagens anecoicas.`;
  }
  return `${rotulo} medindo ${medidasFmt(ov.medidas_cm)}, apresentando imagens anecoicas.`;
}

/** Descrição genérica de um achado ovariano quando não há verbatim. */
function descreveAchadoOvario(a: z.infer<typeof OvarioAchadoSchema>): string {
  const med = a.medidas_cm ? `, medindo ${medidasFmt(a.medidas_cm)}` : "";
  switch (a.tipo) {
    case "cisto_simples":
      return `imagem anecoica de paredes finas e regulares${med}`;
    case "cisto_complexo":
      return `imagem cística de conteúdo heterogêneo${med}`;
    case "endometrioma":
      return `imagem de baixa ecogenicidade com aspecto em vidro fosco${med}, sem componente sólido ou septações`;
    case "funcional":
      return `coleção líquida de aspecto funcional${med}`;
    case "sop":
      return "mais de 20 folículos antrais distribuídos na periferia";
    default:
      return `imagem${med}`;
  }
}

/** Itens de conclusão dos ovários (item único se ambos normais). */
function ovariosConclusao(f: PelveFemininaFindings): string[] {
  const od = f.ovario_direito;
  const oe = f.ovario_esquerdo;
  const volOD = calcVolume(od.medidas_cm, od.volume_ml);
  const volOE = calcVolume(oe.medidas_cm, oe.volume_ml);

  const naoVisDir = !od.visualizado;
  const naoVisEsq = !oe.visualizado;
  const altDir = od.alterado || (od.achados ?? []).length > 0;
  const altEsq = oe.alterado || (oe.achados ?? []).length > 0;
  const atrofDir = od.atrofico;
  const atrofEsq = oe.atrofico;

  // Ambos não visualizados.
  if (naoVisDir && naoVisEsq) {
    return ["Ovários não visualizados pela técnica empregada."];
  }

  const itens: string[] = [];

  // Ovário atrófico bilateral (menopausa) — item único especial.
  if (atrofDir && atrofEsq && !altDir && !altEsq && !naoVisDir && !naoVisEsq) {
    return [
      `Ovários ecograficamente normais (o direito com ${volFmt(volOD)} cm³ e o esquerdo com ${volFmt(volOE)} cm³), ambos praticamente sem folículos.`,
    ];
  }

  // Ambos normais (sem alteração, atrofia ou não-visualização) → item único.
  if (!altDir && !altEsq && !naoVisDir && !naoVisEsq && !atrofDir && !atrofEsq) {
    return [
      `Ovários ecograficamente normais (o direito com ${volFmt(volOD)} cm³ e o esquerdo ${volFmt(volOE)} cm³), ambos contendo folículos.`,
    ];
  }

  // Caso contrário, itens separados por ovário.
  const itemOvario = (
    lado: "direito" | "esquerdo",
    ov: PelveOvario,
    vol: number | null,
    naoVis: boolean,
    alt: boolean,
    atrof: boolean,
  ): string => {
    const nome = lado === "direito" ? "direito" : "esquerdo";
    if (naoVis) return `Ovário ${nome} não visualizado pela técnica empregada.`;
    if (alt) {
      const achados = ov.achados ?? [];
      const primeiro = achados[0];
      // TODO ovário alterado leva o volume + classe na conclusão (decisão Luiz).
      const classe = classeVolumeOvario(vol);
      const vc = `de volume ${classe} (${volFmt(vol)} cm³)`;
      if (primeiro?.tipo === "endometrioma") {
        return `Ovário ${nome} ${vc}, apresentando imagem de baixa ecogenicidade que tem como diagnóstico mais provável endometrioma (O-RADS 2).`;
      }
      if (primeiro?.tipo === "funcional") {
        return `Ovário ${nome} ${vc}, apresentando coleção líquida provavelmente funcional (O-RADS 2).`;
      }
      if (primeiro?.tipo === "sop") {
        return `Ovário ${nome} de volume aumentado (${volFmt(vol)} cm³), contendo mais de 20 folículos.`;
      }
      // Imagem anecoica (cisto simples / coleção) → coleção líquida (O-RADS 2).
      if (achadoOvarioAnecoico(primeiro)) {
        return `Ovário ${nome} ${vc}, apresentando coleção líquida (O-RADS 2).`;
      }
      const desc = primeiro?.descricao ? ` (${primeiro.descricao.trim().replace(/\.+$/, "")})` : "";
      return `Ovário ${nome} ${vc}, apresentando${desc || " alteração"}.`;
    }
    if (atrof) {
      return `Ovário ${nome} ecograficamente normal (${volFmt(vol)} cm³), praticamente sem folículos.`;
    }
    return `Ovário ${nome} ecograficamente normal (${volFmt(vol)} cm³), contendo folículos.`;
  };

  itens.push(itemOvario("direito", od, volOD, naoVisDir, altDir, atrofDir));
  itens.push(itemOvario("esquerdo", oe, volOE, naoVisEsq, altEsq, atrofEsq));
  return itens;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/** Numeração contínua: item único sem número; 2+ → "1) ", "2) "... */
function numerar(itens: string[]): string {
  if (itens.length === 1) return itens[0] ?? "";
  return itens.map((it, i) => `${i + 1}) ${it}`).join("\n");
}

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior; objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO (mais enxuto).
 */
export function renderPelveFeminina(
  f: PelveFemininaFindings,
  opts?: { objetivo?: boolean },
): string {
  if (opts?.objetivo) return renderPelveFemininaObjetivo(f);
  return renderPelveFemininaClassico(f);
}

/**
 * Monta o laudo de PELVE FEMININA por construção (estilo CLÁSSICO).
 * Estrutura/cabeçalhos/numeração garantidos; silêncio → normalidade.
 */
function renderPelveFemininaClassico(f: PelveFemininaFindings): string {
  const via = resolveVia(f.via);
  const titulo = tituloDaVia(via);
  const comentarios = comentariosDaVia(via);
  const comBexiga = temBexiga(via);

  // ----- CORPO -----
  const aspectos: string[] = [];

  if (comBexiga) {
    aspectos.push("Bexiga de forma, contorno e ecotextura normais.");
  }

  // Útero.
  aspectos.push(`Útero em ${posicaoFmt(f.utero_posicao)}, medindo ${medidasFmt(f.utero_medidas_cm)}.`);

  // Istmocele (antes do endométrio, conforme modelo).
  if (f.istmocele) {
    aspectos.push(
      f.istmocele_descricao && f.istmocele_descricao.trim() !== ""
        ? f.istmocele_descricao.trim().replace(/\.+$/, "") + "."
        : "Imagem anecoica no istmo, de forma triangular.",
    );
  }

  // Endométrio.
  const endoCorpo = endometrioCorpo(f, via);
  if (endoCorpo) aspectos.push(endoCorpo);

  // DIU (após o endométrio).
  if (f.diu) {
    if (f.diu_descricao && f.diu_descricao.trim() !== "") {
      aspectos.push(f.diu_descricao.trim().replace(/\.+$/, "") + ".");
    } else {
      aspectos.push("Imagem hiperecoica linear na cavidade endometrial, compatível com DIU.");
    }
  }

  // Cavidade (pós-abortamento).
  if (via === "pos_abortamento") {
    if (f.produtos_retidos) {
      aspectos.push("Imagens hiperecoicas amorfas na cavidade endometrial.");
    }
    aspectos.push("Ausência de saco gestacional.");
  }

  // Miométrio (+ miomas).
  aspectos.push(miometrioCorpo(f));

  // Cistos de Naboth (topografia do colo).
  if (f.cistos_naboth) {
    aspectos.push("Imagens anecoicas na topografia do colo uterino.");
  }

  // Ovários.
  aspectos.push(ovarioCorpo("direito", f.ovario_direito));
  aspectos.push(ovarioCorpo("esquerdo", f.ovario_esquerdo));

  // Líquido livre.
  if (f.liquido_livre) {
    aspectos.push(
      f.liquido_livre_descricao && f.liquido_livre_descricao.trim() !== ""
        ? `Presença de líquido livre na cavidade pélvica (${f.liquido_livre_descricao.trim().replace(/\.+$/, "")}).`
        : "Presença de líquido livre na cavidade pélvica.",
    );
  }

  // Observações livres do corpo.
  if (f.observacoes_corpo && f.observacoes_corpo.trim() !== "") {
    aspectos.push(f.observacoes_corpo.trim());
  }

  // ----- CONCLUSÃO -----
  const conclusao: string[] = [];

  if (comBexiga) {
    conclusao.push("Bexiga ecograficamente normal.");
  }

  // Útero (volume) — útero miomatoso tem item próprio.
  const volUtero = calcVolume(f.utero_medidas_cm, f.utero_volume_ml);
  if (f.utero_miomatoso) {
    const classe = volClasseFmt(f.utero_volume_classe || "acentuadamente aumentado");
    conclusao.push(`Útero globoso (miomatoso), de volume ${classe} (${volFmt(volUtero)} cm³).`);
  } else if (f.calcificacao_arqueadas) {
    conclusao.push(
      `Útero de dimensões normais (volume de ${volFmt(volUtero)} cm³), apresentando calcificação das artérias arqueadas sem significado patológico.`,
    );
  } else {
    conclusao.push(`Útero de volume ${volClasseFmt(f.utero_volume_classe)} (${volFmt(volUtero)} cm³).`);
  }

  // Endométrio (pós-abortamento usa item de produtos retidos no lugar).
  if (via === "pos_abortamento") {
    if (f.produtos_retidos) {
      const qtd = (f.produtos_retidos_quantidade && f.produtos_retidos_quantidade.trim()) || "moderada";
      conclusao.push(`${qtd.charAt(0).toUpperCase()}${qtd.slice(1)} quantidade de produtos retidos da concepção.`);
    } else {
      conclusao.push("Ausência de produtos retidos da concepção.");
    }
  } else {
    conclusao.push(endometrioConclusao(f, via));
  }

  // Miomas (itens próprios, quando individualizados).
  conclusao.push(...miomasConclusao(f));

  // Istmocele.
  if (f.istmocele) {
    const tipo = f.istmocele_tipo && f.istmocele_tipo.trim() !== "" ? f.istmocele_tipo.trim() : "simples";
    conclusao.push(`Nicho de cicatriz cesárea, tipo ${tipo}.`);
  }

  // Adenomiose.
  if (f.adenomiose) {
    conclusao.push(
      f.adenomiose_conclusao && f.adenomiose_conclusao.trim() !== ""
        ? f.adenomiose_conclusao.trim().replace(/\.+$/, "") + "."
        : "Achados compatíveis com adenomiose.",
    );
  }

  // Cistos de Naboth.
  if (f.cistos_naboth) {
    conclusao.push("Cistos de Naboth (provável sequela de cervicite).");
  }

  // Ovários.
  conclusao.push(...ovariosConclusao(f));

  // SOP: recomendação de FSH/LH quando algum ovário é SOP.
  const temSop = [f.ovario_direito, f.ovario_esquerdo].some((ov) =>
    (ov.achados ?? []).some((a) => a.tipo === "sop"),
  );
  if (temSop) {
    conclusao.push(
      "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de FSH e LH com objetivo de investigar síndrome dos ovários policísticos.",
    );
  }

  // DIU.
  if (f.diu) {
    conclusao.push(f.diu === "bem_posicionado" ? "DIU bem posicionado." : "DIU deslocado.");
  }

  // Líquido livre.
  if (f.liquido_livre) {
    conclusao.push(
      f.liquido_livre_descricao && f.liquido_livre_descricao.trim() !== ""
        ? `Líquido livre na cavidade pélvica (${f.liquido_livre_descricao.trim().replace(/\.+$/, "")}).`
        : "Líquido livre na cavidade pélvica.",
    );
  }

  // Achados adicionais (texto livre do médico para a conclusão).
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    conclusao.push(f.achados_adicionais.trim());
  }

  // ----- Rodapés -----
  const rodapes: string[] = [];
  if (temMiomasComFigo(f)) rodapes.push(NOTA_FIGO);
  if (f.referencia_idade_anos !== null)
    rodapes.push(domingosReferenceLine(f.referencia_idade_anos, f.referencia_grande_multipara));

  const corpo = [
    titulo,
    "",
    comentarios,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    numerar(conclusao),
    rodapes.length > 0 ? `\n${rodapes.join("\n\n")}` : "",
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO (mais enxuto)
// ===========================================================================
//
// O objetivo REUSA 100% a extração, os cálculos (volume uterino/ovariano pela
// fórmula do elipsóide) e a lógica de achados do clássico (útero, endométrio,
// ovários com volume+classe, miomas/FIGO, cistos/O-RADS, endometrioma, SOP,
// pós-aborto). Muda só a redação: cabeçalhos TÉCNICA/ACHADOS/IMPRESSÃO, frases
// mais curtas, sem o ritual do clássico. Mantém os ajustes clínicos já feitos:
// ovário alterado leva "de volume {classe} ({X} cm³)"; imagem anecoica → "coleção
// líquida (O-RADS 2)"; endometrioma "imagem de baixa ecogenicidade". 1 casa
// decimal, concordância. A TÉCNICA varia pela VIA (ta/tv/ta_tv/pos_abortamento).

/** Frase de TÉCNICA do objetivo, derivada da VIA (inspirado no nReport). */
function tecnicaObjetivo(via: Via): string {
  switch (via) {
    case "tv":
      return "Exame realizado com transdutor endocavitário multifrequencial, pela técnica transvaginal.";
    case "ta":
      return "Exame realizado com transdutor convexo multifrequencial, pela técnica transabdominal com a bexiga repleta.";
    case "pos_abortamento":
      return "Exame realizado com transdutor endocavitário multifrequencial, pela técnica transvaginal, para avaliação pós-abortamento.";
    case "ta_tv":
    default:
      return "Exame realizado com transdutores convexo e endocavitário multifrequenciais, pelas técnicas transabdominal (com a bexiga repleta) e transvaginal.";
  }
}

/** Frase enxuta (objetivo) de um ovário no ACHADOS — reusa cálculos do clássico. */
function ovarioAchadoObjetivo(lado: "direito" | "esquerdo", ov: PelveOvario): string {
  const nome = lado === "direito" ? "Ovário direito" : "Ovário esquerdo";
  if (!ov.visualizado) return `${nome} não caracterizado pela técnica empregada.`;
  const vol = calcVolume(ov.medidas_cm, ov.volume_ml);
  const medVol = `medindo ${medidasFmt(ov.medidas_cm)} (volume de ${volFmt(vol)} cm³)`;
  const achados = ov.achados ?? [];
  if (achados.length > 0) {
    const descr = achados
      .map((a) => (a.descricao ? a.descricao.trim().replace(/\.+$/, "") : descreveAchadoOvario(a)))
      .filter((s) => s !== "")
      .join("; ");
    return `${nome} ${medVol}, apresentando ${descr}.`;
  }
  if (ov.atrofico) {
    return `${nome} ${medVol}, com poucas imagens anecoicas (aspecto atrófico).`;
  }
  return `${nome} ${medVol}, com folículos de permeio.`;
}

/**
 * Render do estilo OBJETIVO: TÉCNICA / ACHADOS / IMPRESSÃO.
 * Reusa extração + cálculos + lógica de achados do clássico (conclusão).
 */
function renderPelveFemininaObjetivo(f: PelveFemininaFindings): string {
  const via = resolveVia(f.via);
  const titulo = tituloDaVia(via);
  const tecnica = tecnicaObjetivo(via);
  const comBexiga = temBexiga(via);

  // ----- ACHADOS -----
  const achados: string[] = [];

  if (comBexiga) {
    achados.push("Bexiga de paredes regulares e finas, com conteúdo anecoico.");
  }

  // Útero (posição, medidas, volume calculado/ditado).
  const volUtero = calcVolume(f.utero_medidas_cm, f.utero_volume_ml);
  achados.push(
    `Útero em ${posicaoFmt(f.utero_posicao)}, medindo ${medidasFmt(f.utero_medidas_cm)} (volume de ${volFmt(volUtero)} cm³).`,
  );

  // Istmocele.
  if (f.istmocele) {
    achados.push(
      f.istmocele_descricao && f.istmocele_descricao.trim() !== ""
        ? f.istmocele_descricao.trim().replace(/\.+$/, "") + "."
        : "Imagem anecoica de forma triangular no istmo (nicho de cicatriz).",
    );
  }

  // Endométrio (reusa a mesma lógica do corpo clássico).
  const endoCorpo = endometrioCorpo(f, via);
  if (endoCorpo) achados.push(endoCorpo);

  // DIU.
  if (f.diu) {
    achados.push(
      f.diu_descricao && f.diu_descricao.trim() !== ""
        ? f.diu_descricao.trim().replace(/\.+$/, "") + "."
        : "Imagem hiperecoica linear na cavidade endometrial, compatível com DIU.",
    );
  }

  // Cavidade (pós-abortamento).
  if (via === "pos_abortamento") {
    if (f.produtos_retidos) {
      achados.push("Imagens hiperecoicas amorfas na cavidade endometrial.");
    }
    achados.push("Ausência de saco gestacional.");
  }

  // Miométrio (+ miomas) — reusa a frase do clássico.
  achados.push(miometrioCorpo(f));

  // Cistos de Naboth.
  if (f.cistos_naboth) {
    achados.push("Imagens anecoicas na topografia do colo uterino (cistos de Naboth).");
  }

  // Ovários (frase enxuta com volume calculado).
  achados.push(ovarioAchadoObjetivo("direito", f.ovario_direito));
  achados.push(ovarioAchadoObjetivo("esquerdo", f.ovario_esquerdo));

  // Líquido livre.
  if (f.liquido_livre) {
    achados.push(
      f.liquido_livre_descricao && f.liquido_livre_descricao.trim() !== ""
        ? `Líquido livre na cavidade pélvica (${f.liquido_livre_descricao.trim().replace(/\.+$/, "")}).`
        : "Líquido livre na cavidade pélvica.",
    );
  } else {
    achados.push("Ausência de líquido livre na cavidade pélvica.");
  }

  // Observações livres do corpo.
  if (f.observacoes_corpo && f.observacoes_corpo.trim() !== "") {
    achados.push(f.observacoes_corpo.trim());
  }

  // ----- IMPRESSÃO -----
  // Reusa a MESMA lógica de conclusão do clássico (volume uterino/ovariano,
  // miomas/FIGO, O-RADS, endometrioma, SOP, pós-aborto) — só sem a bexiga e sem
  // numerar com ")" (a impressão objetiva numera com ".").
  const impressao: string[] = [];

  // Útero.
  if (f.utero_miomatoso) {
    const classe = volClasseFmt(f.utero_volume_classe || "acentuadamente aumentado");
    impressao.push(`Útero globoso (miomatoso), de volume ${classe} (${volFmt(volUtero)} cm³).`);
  } else if (f.calcificacao_arqueadas) {
    impressao.push(
      `Útero de dimensões normais (volume de ${volFmt(volUtero)} cm³), com calcificação das artérias arqueadas sem significado patológico.`,
    );
  } else {
    impressao.push(`Útero de volume ${volClasseFmt(f.utero_volume_classe)} (${volFmt(volUtero)} cm³).`);
  }

  // Endométrio / pós-aborto.
  if (via === "pos_abortamento") {
    if (f.produtos_retidos) {
      const qtd = (f.produtos_retidos_quantidade && f.produtos_retidos_quantidade.trim()) || "moderada";
      impressao.push(`${qtd.charAt(0).toUpperCase()}${qtd.slice(1)} quantidade de produtos retidos da concepção.`);
    } else {
      impressao.push("Ausência de produtos retidos da concepção.");
    }
  } else {
    impressao.push(endometrioConclusao(f, via));
  }

  // Miomas (itens próprios, quando individualizados).
  impressao.push(...miomasConclusao(f));

  // Istmocele.
  if (f.istmocele) {
    const tipo = f.istmocele_tipo && f.istmocele_tipo.trim() !== "" ? f.istmocele_tipo.trim() : "simples";
    impressao.push(`Nicho de cicatriz cesárea, tipo ${tipo}.`);
  }

  // Adenomiose.
  if (f.adenomiose) {
    impressao.push(
      f.adenomiose_conclusao && f.adenomiose_conclusao.trim() !== ""
        ? f.adenomiose_conclusao.trim().replace(/\.+$/, "") + "."
        : "Achados compatíveis com adenomiose.",
    );
  }

  // Cistos de Naboth.
  if (f.cistos_naboth) {
    impressao.push("Cistos de Naboth (provável sequela de cervicite).");
  }

  // Ovários (reusa a MESMA lógica do clássico: item único se ambos normais;
  // separados com volume+classe se alteração; O-RADS/endometrioma/SOP).
  impressao.push(...ovariosConclusao(f));

  // SOP: recomendação de FSH/LH.
  const temSop = [f.ovario_direito, f.ovario_esquerdo].some((ov) =>
    (ov.achados ?? []).some((a) => a.tipo === "sop"),
  );
  if (temSop) {
    impressao.push(
      "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de FSH e LH com objetivo de investigar síndrome dos ovários policísticos.",
    );
  }

  // DIU.
  if (f.diu) {
    impressao.push(f.diu === "bem_posicionado" ? "DIU bem posicionado." : "DIU deslocado.");
  }

  // Líquido livre.
  if (f.liquido_livre) {
    impressao.push(
      f.liquido_livre_descricao && f.liquido_livre_descricao.trim() !== ""
        ? `Líquido livre na cavidade pélvica (${f.liquido_livre_descricao.trim().replace(/\.+$/, "")}).`
        : "Líquido livre na cavidade pélvica.",
    );
  }

  // Achados adicionais.
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    impressao.push(f.achados_adicionais.trim());
  }

  const impressaoTxt =
    impressao.length === 1
      ? (impressao[0] as string)
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  // ----- Rodapés (mantém FIGO + tabela quando aplicável) -----
  const rodapes: string[] = [];
  if (temMiomasComFigo(f)) rodapes.push(NOTA_FIGO);
  if (f.referencia_idade_anos !== null)
    rodapes.push(domingosReferenceLine(f.referencia_idade_anos, f.referencia_grande_multipara));

  const corpo = [
    titulo,
    "",
    "TÉCNICA:",
    tecnica,
    "",
    "ACHADOS:",
    achados.join("\n"),
    "",
    "IMPRESSÃO:",
    impressaoTxt,
    rodapes.length > 0 ? `\n${rodapes.join("\n\n")}` : "",
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
