import { z } from "zod";

/**
 * DET-5 — Renderer de TIREOIDE (render PROGRAMÁTICO, sem template_body).
 *
 * O LLM extrai dados tipados (incl. ENUMS por eixo do nódulo); o código:
 *  - CALCULA a NOTA FINAL Domingos somando os pontos de cada eixo;
 *  - deriva o TI-RADS (categoria), as características e a conduta da NOTA;
 *  - monta o laudo por construção (estrutura/cabeçalhos/numeração garantidos);
 *  - soma o volume total (VT).
 * Override: nota/TI-RADS ditados pelo médico VENCEM o cálculo (reproduz verbatim).
 *
 * Fonte clínica: docs/det-5-tireoide-domingos.md (tabela Domingos + mapeamentos),
 * revisões do Luiz (2026-06-13) e contrato `prompts/contracts/TIREOIDE.ts`.
 * Regras: "istmo" sem acento; corpo usa "imagem" (nunca "nódulo"); Chammas
 * NUNCA escrito (só pontua); linfonodos normais só no corpo; rodapé fixo.
 */

// ---------------------------------------------------------------------------
// Tabela Domingos — pontos por eixo (docs/det-5-tireoide-domingos.md §1)
// ---------------------------------------------------------------------------

const ECOGENICIDADE = {
  anecoica_homogenea: { pts: 0, txt: "anecoica homogênea" },
  anecoica_finos_ecos: { pts: 0, txt: "anecoica com finos ecos" },
  anecoica_septos: { pts: 1, txt: "anecoica com septos" },
  anecoica_componentes_solidos: { pts: 1, txt: "anecoica com componentes sólidos" },
  hipoecoica: { pts: 3, txt: "hipoecoica" },
  isoecoica: { pts: 2, txt: "isoecoica" },
  hiperecoica: { pts: 1, txt: "hiperecoica" },
  solida_areas_anecoicas: { pts: 1, txt: "sólida com áreas anecoicas" },
  solida_calcificacao_parede: { pts: 0, txt: "sólida com calcificação parietal (casca de ovo)" },
} as const;
type EcoKey = keyof typeof ECOGENICIDADE;

const MARGEM = {
  regular: { pts: 0, txt: "com margem regular" },
  irregular: { pts: 1, txt: "com margem irregular" },
  espiculada: { pts: 2, txt: "com margem espiculada" },
} as const;
type MargemKey = keyof typeof MARGEM;

const HALO = {
  fino_regular: { pts: 0, txt: "com halo fino e regular" },
  espesso_irregular: { pts: 2, txt: "com halo espesso e irregular" },
  sem_halo: { pts: 1, txt: "sem halo" },
} as const;
type HaloKey = keyof typeof HALO;

const FORMA = {
  mais_alta_que_larga: { pts: 3, txt: "mais alta do que larga" },
  mais_larga_que_alta: { pts: 0, txt: "mais larga do que alta" },
} as const;
type FormaKey = keyof typeof FORMA;

const CALCIFICACOES = {
  sem: { pts: 0, txt: "sem calcificações" },
  casca_ovo: { pts: 0, txt: "com calcificação em casca de ovo" },
  grosseiras: { pts: 1, txt: "com calcificações grosseiras com sombra acústica" },
  micro: { pts: 3, txt: "com microcalcificações" },
} as const;
type CalcKey = keyof typeof CALCIFICACOES;

// Vascularização (Chammas) — SÓ pontua; nunca escrita no laudo.
const VASCULARIZACAO = {
  sem: 0,
  periferica: 1,
  periferica_maior_central: 2,
  central_maior_periferica: 3,
  exclusiva_central: 4,
} as const;
type VascKey = keyof typeof VASCULARIZACAO;

const ecoKeys = Object.keys(ECOGENICIDADE) as EcoKey[];
const margemKeys = Object.keys(MARGEM) as MargemKey[];
const haloKeys = Object.keys(HALO) as HaloKey[];
const formaKeys = Object.keys(FORMA) as FormaKey[];
const calcKeys = Object.keys(CALCIFICACOES) as CalcKey[];
const vascKeys = Object.keys(VASCULARIZACAO) as VascKey[];

// ---------------------------------------------------------------------------
// Schema de achados
// ---------------------------------------------------------------------------

const NoduloSchema = z.object({
  // Eixos do escore Domingos (enums fechados) — alguns também viram texto no corpo.
  ecogenicidade: z.enum(ecoKeys as [EcoKey, ...EcoKey[]]).nullable(),
  margem: z.enum(margemKeys as [MargemKey, ...MargemKey[]]).nullable(),
  halo: z.enum(haloKeys as [HaloKey, ...HaloKey[]]).nullable(),
  forma: z.enum(formaKeys as [FormaKey, ...FormaKey[]]).nullable(),
  calcificacoes: z.enum(calcKeys as [CalcKey, ...CalcKey[]]).nullable(),
  vascularizacao: z.enum(vascKeys as [VascKey, ...VascKey[]]).nullable(), // Chammas: só pontua
  medidas_cm: z.array(z.number()).nullable(), // [c1,c2,c3] do achado
  diametro_transverso_cm: z.number().nullable(), // só se o médico nomear; senão max(medidas)
  localizacao: z.string().nullable(), // "no terço médio"...
  descricao_raw: z.string().nullable(), // verbatim do médico (auditoria)
  nota_domingos_ditada: z.string().nullable(), // override verbatim — vence o cálculo
  ti_rads_ditado: z.string().nullable(), // override verbatim — vence o cálculo
});

const LoboSchema = z.object({
  medidas_cm: z.array(z.number()).nullable(),
  volume_ml: z.number().nullable(),
  ecotextura_alterada: z.string().nullable(), // alteração DIFUSA verbatim (tireoidite/Graves)
  nodulos: z.array(NoduloSchema),
});

export const TireoideFindingsSchema = z.object({
  com_doppler: z.boolean(),
  volume_glandular: z.enum(["normal", "aumentado", "reduzido"]).nullable(),
  lobo_direito: LoboSchema,
  lobo_esquerdo: LoboSchema,
  istmo: LoboSchema,
  pico_arteria_direita: z.enum(["inferior", "superior"]).nullable(), // default inferior
  pico_sistolico_direito_cms: z.number().nullable(),
  pico_arteria_esquerda: z.enum(["inferior", "superior"]).nullable(),
  pico_sistolico_esquerdo_cms: z.number().nullable(),
  linfonodos_descritos: z.boolean(),
  linfonodos_alterados: z.boolean(),
  linfonodos_descricao: z.string().nullable(),
  achados_adicionais: z.string().nullable(),
});

export type TireoideFindings = z.infer<typeof TireoideFindingsSchema>;
export type TireoideNodulo = z.infer<typeof NoduloSchema>;
export type TireoideLobo = z.infer<typeof LoboSchema>;

/** Preferências do renderer (toggles). Default: Domingos visível, conduta oculta. */
export type TireoidePreferences = {
  show_domingos_score: boolean;
  show_conduct_recommendation: boolean;
};
export const TIREOIDE_DEFAULT_PREFERENCES: TireoidePreferences = {
  show_domingos_score: true,
  show_conduct_recommendation: false,
};

// JSON Schema strict para OpenAI (todos required, nullable via union).
const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const enumNull = (vals: readonly string[]) =>
  ({ type: ["string", "null"], enum: [...vals, null] }) as const;

const NODULO_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "ecogenicidade",
    "margem",
    "halo",
    "forma",
    "calcificacoes",
    "vascularizacao",
    "medidas_cm",
    "diametro_transverso_cm",
    "localizacao",
    "descricao_raw",
    "nota_domingos_ditada",
    "ti_rads_ditado",
  ],
  properties: {
    ecogenicidade: enumNull(ecoKeys),
    margem: enumNull(margemKeys),
    halo: enumNull(haloKeys),
    forma: enumNull(formaKeys),
    calcificacoes: enumNull(calcKeys),
    vascularizacao: enumNull(vascKeys),
    medidas_cm: numArr,
    diametro_transverso_cm: num,
    localizacao: str,
    descricao_raw: str,
    nota_domingos_ditada: str,
    ti_rads_ditado: str,
  },
} as const;

const LOBO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["medidas_cm", "volume_ml", "ecotextura_alterada", "nodulos"],
  properties: {
    medidas_cm: numArr,
    volume_ml: num,
    ecotextura_alterada: str,
    nodulos: { type: "array", items: NODULO_JSON },
  },
} as const;

export const TIREOIDE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "com_doppler",
    "volume_glandular",
    "lobo_direito",
    "lobo_esquerdo",
    "istmo",
    "pico_arteria_direita",
    "pico_sistolico_direito_cms",
    "pico_arteria_esquerda",
    "pico_sistolico_esquerdo_cms",
    "linfonodos_descritos",
    "linfonodos_alterados",
    "linfonodos_descricao",
    "achados_adicionais",
  ],
  properties: {
    com_doppler: { type: "boolean" },
    volume_glandular: enumNull(["normal", "aumentado", "reduzido"]),
    lobo_direito: LOBO_JSON,
    lobo_esquerdo: LOBO_JSON,
    istmo: LOBO_JSON,
    pico_arteria_direita: enumNull(["inferior", "superior"]),
    pico_sistolico_direito_cms: num,
    pico_arteria_esquerda: enumNull(["inferior", "superior"]),
    pico_sistolico_esquerdo_cms: num,
    linfonodos_descritos: { type: "boolean" },
    linfonodos_alterados: { type: "boolean" },
    linfonodos_descricao: str,
    achados_adicionais: str,
  },
} as const;

export const TIREOIDE_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DA TIREOIDE.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada. Sua função
é CLASSIFICAR cada característica de cada imagem nodular nos enums do escore
Domingos — quem calcula a nota e escreve o laudo é o código.

REGRAS:
1. com_doppler: true SOMENTE com avaliação Doppler ativa / pico sistólico / fluxo
   ao Doppler nas artérias tireoidianas. Negações SEMPRE vencem ("sem Doppler",
   "Doppler não realizado", "sem avaliação Doppler hoje") MESMO que apareça a
   palavra "vascularização".
2. volume_glandular: "aumentado" se bócio/glândula aumentada/volume aumentado;
   "reduzido" se atrófica/reduzida; senão null (= normal). NUNCA classifique pelas
   medidas.
3. Cada estrutura (lobo_direito, lobo_esquerdo, istmo):
   - medidas_cm: as 3 medidas do lobo/istmo em cm; null se não ditas.
   - volume_ml: volume do lobo/istmo em ml quando ditado; senão null. NUNCA calcule.
   - ecotextura_alterada: SÓ se a ecotextura for DIFUSAMENTE alterada (tireoidite/
     Graves) — cláusula verbatim do médico ("de ecotextura difusamente
     heterogênea..."); null se normal. NÃO use para nódulos.
   - nodulos: lista de imagens nodulares; [] se a estrutura é normal.
4. Para cada imagem nodular, CLASSIFIQUE nos enums (escolha o mais próximo do
   descrito; null quando o médico não disser o eixo):
   - ecogenicidade: anecoica_homogenea | anecoica_finos_ecos | anecoica_septos |
     anecoica_componentes_solidos | hipoecoica | isoecoica | hiperecoica |
     solida_areas_anecoicas | solida_calcificacao_parede.
   - margem: regular | irregular | espiculada. ("contornos" = margem.)
   - halo: fino_regular | espesso_irregular | sem_halo (só imagem sólida).
   - forma: mais_alta_que_larga | mais_larga_que_alta.
   - calcificacoes: sem | casca_ovo | grosseiras (grosseiras com sombra) |
     micro (microcalcificações).
   - vascularizacao (padrão de Chammas, usado SÓ para pontuar): sem | periferica |
     periferica_maior_central | central_maior_periferica | exclusiva_central.
     "periférica maior que a central" → periferica_maior_central. Se o médico só
     citar "Chammas II/III...", traduza para o enum correspondente.
   - medidas_cm: as 3 medidas do achado em cm; null se não ditas.
   - diametro_transverso_cm: SÓ quando o médico nomear o diâmetro transverso;
     senão null (o código usa a maior das medidas).
   - localizacao: "no terço médio/superior/inferior"...
   - descricao_raw: a descrição verbatim do médico para esta imagem (auditoria).
   - nota_domingos_ditada / ti_rads_ditado: SOMENTE se o médico DITAR a nota e/ou
     o TI-RADS prontos (reproduzir); senão null (o código calcula).
5. picos sistólicos (só Doppler): pico_sistolico_direito_cms /
   pico_sistolico_esquerdo_cms em cm/s; pico_arteria_direita/esquerda = "inferior"
   ou "superior" conforme ditado (default inferior se não especificado).
6. linfonodos_descritos: true se houver descrição de linfonodos cervicais.
   linfonodos_alterados: true se suspeitos/anormais. linfonodos_descricao: texto
   do médico quando alterados; null quando normais ou não descritos.
7. achados_adicionais: SOMENTE alterações reais fora do padrão; null se não houver.`;

// ---------------------------------------------------------------------------
// Cálculo determinístico (Domingos → TI-RADS → características → conduta)
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return String(n).replace(".", ",");
}

function medidasFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) =>
    Number.isFinite(arr[i]) ? ptBr(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}

function volFmt(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}

/** Pontos da dimensão pelo diâmetro transverso (maior medida como fallback). */
function dimensaoPts(nod: TireoideNodulo): number {
  const transv =
    nod.diametro_transverso_cm ??
    (nod.medidas_cm && nod.medidas_cm.length > 0
      ? Math.max(...nod.medidas_cm.filter((n) => Number.isFinite(n)))
      : null);
  if (transv === null || !Number.isFinite(transv)) return 0; // sem medida → não soma
  if (transv < 1.0) return 0;
  if (transv < 3.0) return 1;
  return 2;
}

/**
 * NOTA FINAL Domingos = soma dos eixos. Eixo não classificado → 0 (default
 * benigno, "omitido → normalidade"). Ancorada na ecogenicidade: sem ela o nódulo
 * não é pontuável (retorna null → renderer não inventa nota).
 */
function calcNotaDomingos(nod: TireoideNodulo): number | null {
  if (!nod.ecogenicidade) return null;
  let pts = ECOGENICIDADE[nod.ecogenicidade].pts;
  if (nod.margem) pts += MARGEM[nod.margem].pts;
  // Halo só pontua em imagem SÓLIDA (regra da tabela) — protege contra extração
  // que preencha halo numa imagem anecoica (cisto), evitando superpontuar.
  if (nod.halo && isSolida(nod.ecogenicidade)) pts += HALO[nod.halo].pts;
  if (nod.forma) pts += FORMA[nod.forma].pts;
  if (nod.calcificacoes) pts += CALCIFICACOES[nod.calcificacoes].pts;
  if (nod.vascularizacao) pts += VASCULARIZACAO[nod.vascularizacao];
  pts += dimensaoPts(nod);
  return pts;
}

/** NOTA → TI-RADS (categoria Domingos 1-4). */
function tiradsDaNota(nota: number): number {
  if (nota <= 3) return 1;
  if (nota <= 5) return 2;
  if (nota <= 9) return 3;
  return 4;
}

/**
 * TI-RADS → características (plural). Aceita ACR 5 (quando o médico dita a escala
 * ACR 1-5); fora de 1-5 → null (omite o parêntese, NUNCA "indeterminadas").
 */
function caracteristicasDoTirads(tirads: number): string | null {
  return (
    {
      1: "benignas",
      2: "provavelmente benignas",
      3: "intermediárias",
      4: "suspeitas",
      5: "altamente suspeitas",
    }[tirads] ?? null
  );
}

/** TI-RADS → conduta (tabela Domingos + ACR 5). null fora de 1-5 (omite). */
function condutaDoTirads(tirads: number): string | null {
  return (
    {
      1: "controle anual",
      2: "controle ou punção aspirativa por agulha fina (citopunção)",
      3: "punção aspirativa por agulha fina (citopunção)",
      4: "punção aspirativa por agulha fina (citopunção)",
      5: "punção aspirativa por agulha fina (citopunção)",
    }[tirads] ?? null
  );
}

/** Imagem sólida (≠ anecoica)? Define se o halo conta/é descrito. */
function isSolida(eco: EcoKey | null): boolean {
  return eco !== null && !eco.startsWith("anecoica");
}

/** Resolve nota e TI-RADS do nódulo: ditados vencem o cálculo. */
function classificarNodulo(nod: TireoideNodulo): {
  nota: number | null;
  notaTxt: string | null; // exibida (ditada verbatim ou calculada)
  tirads: number | null;
  tiradsTxt: string | null;
} {
  const notaCalc = calcNotaDomingos(nod);
  const notaDitada = nod.nota_domingos_ditada?.trim() || null;
  // Nota exibida: a ditada (verbatim) tem prioridade; senão a calculada.
  const notaTxt = notaDitada ?? (notaCalc !== null ? String(notaCalc) : null);
  // Valor numérico p/ derivar TI-RADS: MESMA precedência da exibida (a ditada
  // vence) — senão "NOTA FINAL 10" poderia sair com TI-RADS da nota calculada
  // (review dex1). ti_rads_ditado ainda vence tudo abaixo.
  const notaNum =
    notaDitada && /^\d+$/.test(notaDitada) ? Number(notaDitada) : notaCalc;
  const tiradsDitado = nod.ti_rads_ditado?.trim() || null;
  const tirads =
    tiradsDitado && /^\d+$/.test(tiradsDitado)
      ? Number(tiradsDitado)
      : notaNum !== null
        ? tiradsDaNota(notaNum)
        : null;
  const tiradsTxt = tiradsDitado ?? (tirads !== null ? String(tirads) : null);
  return { nota: notaNum, notaTxt, tirads, tiradsTxt };
}

// ---------------------------------------------------------------------------
// Frases fixas
// ---------------------------------------------------------------------------

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 12 MHz, abrangendo todos os segmentos da glândula tireoide, como também a cadeia ganglionar cervical de I a V. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

const RODAPE =
  "*ESCORE DE NÓDULO TIREOIDEANO - Domingos Correia da Rocha - Material baseado em 2588 nódulos puncionados - 2003 | Atualizada em 2013 - Total de 5134 nódulos puncionados\nACR - American College of Radiology*";

const LINFONODOS_NORMAIS =
  "Adicionalmente, evidenciam-se imagens ovais com a periferia hipoecoica e o centro hiperecoico, de margens regulares, situadas em região cervical, compatíveis com linfonodos de morfologia preservada.";

// ---------------------------------------------------------------------------
// Render do corpo
// ---------------------------------------------------------------------------

/** Descritor de uma imagem nodular no corpo (sem "nódulo", sem Chammas). */
function noduloDescritor(nod: TireoideNodulo): string {
  const partes: string[] = [
    `imagem ${nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txt : "nodular"}`,
  ];
  if (nod.margem) partes.push(MARGEM[nod.margem].txt);
  if (nod.halo && isSolida(nod.ecogenicidade)) partes.push(HALO[nod.halo].txt);
  partes.push(`medindo ${medidasFmt(nod.medidas_cm)}`);
  if (nod.calcificacoes) partes.push(CALCIFICACOES[nod.calcificacoes].txt);
  if (nod.forma) partes.push(FORMA[nod.forma].txt);
  if (nod.localizacao) partes.push(`situada ${nod.localizacao}`);
  return partes.join(", ");
}

/** Frase do lobo/istmo no corpo (normal, difusa ou com imagens nodulares). */
function loboCorpo(
  rotulo: string,
  lobo: TireoideLobo,
  comDoppler: boolean,
  isIstmo: boolean,
): string {
  const medVol = `${rotulo} medindo ${medidasFmt(lobo.medidas_cm)} (volume de ${volFmt(
    lobo.volume_ml,
  )} ml)`;
  if (lobo.nodulos.length === 0) {
    const sufixo = lobo.ecotextura_alterada
      ? lobo.ecotextura_alterada.trim().replace(/\.+$/, "")
      : comDoppler && !isIstmo
        ? "de ecogenicidade, ecotextura e vascularização normais"
        : "de ecogenicidade e ecotextura normais";
    return `${medVol}, ${sufixo}.`;
  }
  // Volume MANTIDO em parênteses; imagens separadas por ";".
  const imagens = lobo.nodulos.map(noduloDescritor).join("; ");
  return `${medVol}, apresentando ${imagens}.`;
}

// ---------------------------------------------------------------------------
// Render da conclusão (por lobo, imagens separadas por ";")
// ---------------------------------------------------------------------------

/** Trecho de uma imagem na conclusão (Domingos ON: nota+características+TI-RADS). */
function noduloConclusao(nod: TireoideNodulo, showDomingos: boolean): string {
  const eco = nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txt : "nodular";
  const loc = nod.localizacao ? ` ${nod.localizacao}` : "";
  const base = `imagem ${eco}${loc}`;
  const { notaTxt, tirads, tiradsTxt } = classificarNodulo(nod);
  if (showDomingos && notaTxt !== null) {
    const caracTxt = tirads !== null ? caracteristicasDoTirads(tirads) : null;
    const carac = caracTxt ? ` (características ${caracTxt})` : "";
    const tr = tiradsTxt !== null ? `, equivalente ao TI-RADS ${tiradsTxt} ACR` : "";
    return `${base} com NOTA FINAL ${notaTxt}${carac}${tr}`;
  }
  // Domingos OFF (ou sem nota): só o TI-RADS quando disponível.
  if (tiradsTxt !== null) return `${base} - TI-RADS ${tiradsTxt}`;
  return base;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

export function renderTireoide(
  f: TireoideFindings,
  prefsInput?: Partial<TireoidePreferences> | null,
): string {
  // Mescla com os defaults — aceita o JSONB cru/parcial da preferência da conta
  // (chaves faltando ou null caem no default seguro: Domingos ON, conduta OFF).
  const prefs: TireoidePreferences = {
    ...TIREOIDE_DEFAULT_PREFERENCES,
    ...(prefsInput && typeof prefsInput === "object"
      ? {
          ...(typeof prefsInput.show_domingos_score === "boolean"
            ? { show_domingos_score: prefsInput.show_domingos_score }
            : {}),
          ...(typeof prefsInput.show_conduct_recommendation === "boolean"
            ? { show_conduct_recommendation: prefsInput.show_conduct_recommendation }
            : {}),
        }
      : {}),
  };
  const titulo = f.com_doppler
    ? "ULTRASSONOGRAFIA DA TIREOIDE COM DOPPLER COLORIDO"
    : "ULTRASSONOGRAFIA DA TIREOIDE";

  const aspectos: string[] = [
    loboCorpo("Lobo direito", f.lobo_direito, f.com_doppler, false),
    loboCorpo("Lobo esquerdo", f.lobo_esquerdo, f.com_doppler, false),
    loboCorpo("Istmo", f.istmo, f.com_doppler, true),
  ];

  if (f.com_doppler) {
    const ad = f.pico_arteria_direita ?? "inferior";
    const ae = f.pico_arteria_esquerda ?? "inferior";
    aspectos.push(
      `\nPico sistólico da artéria tireoidiana ${ad} direita de ${
        f.pico_sistolico_direito_cms !== null ? ptBr(f.pico_sistolico_direito_cms) : "____"
      } cm/s.`,
    );
    aspectos.push(
      `Pico sistólico da artéria tireoidiana ${ae} esquerda de ${
        f.pico_sistolico_esquerdo_cms !== null ? ptBr(f.pico_sistolico_esquerdo_cms) : "____"
      } cm/s.`,
    );
  }

  if (f.linfonodos_descritos) {
    aspectos.push(
      `\n${
        f.linfonodos_alterados && f.linfonodos_descricao
          ? f.linfonodos_descricao.trim()
          : LINFONODOS_NORMAIS
      }`,
    );
  }

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }

  // ----- Conclusão -----
  const vt = volumeTotal(f);
  const vtFmt = vt === null ? "____" : ptBr(vt);
  const volStatus =
    f.volume_glandular === "aumentado"
      ? "aumentado"
      : f.volume_glandular === "reduzido"
        ? "reduzido"
        : "normal";

  const lobos: { rotulo: string; lobo: TireoideLobo }[] = [
    { rotulo: "Lobo direito", lobo: f.lobo_direito },
    { rotulo: "Lobo esquerdo", lobo: f.lobo_esquerdo },
    { rotulo: "Istmo", lobo: f.istmo },
  ];
  const lobosComAchado = lobos.filter((l) => l.lobo.nodulos.length > 0);
  const temDifusa = lobos.some((l) => !!l.lobo.ecotextura_alterada);

  const conclusao: string[] = [];
  if (lobosComAchado.length === 0 && !temDifusa) {
    conclusao.push(
      `Tireoide de volume ${volStatus} (${vtFmt} ml), sem evidência de alteração ecotextural ou de imagem nodular.`,
    );
  } else {
    conclusao.push(`Tireoide de volume ${volStatus} (${vtFmt} ml).`);
    // Um item por lobo; imagens do mesmo lobo no mesmo item, separadas por ";".
    for (const l of lobosComAchado) {
      const trechos = l.lobo.nodulos.map((nod) =>
        noduloConclusao(nod, prefs.show_domingos_score),
      );
      conclusao.push(`${l.rotulo} apresentando ${trechos.join("; ")}.`);
    }
  }

  // Linfonodos alterados → item factual (NUNCA "morfologia preservada").
  if (f.linfonodos_descritos && f.linfonodos_alterados) {
    const desc = f.linfonodos_descricao?.trim();
    conclusao.push(
      desc
        ? `Linfonodos cervicais de aspecto alterado (${desc.replace(/\.+$/, "")}).`
        : "Linfonodos cervicais de aspecto alterado.",
    );
  }

  // Conduta (toggle) — append do maior TI-RADS calculado/ditado entre as imagens.
  if (prefs.show_conduct_recommendation) {
    const tiradsList = lobosComAchado
      .flatMap((l) => l.lobo.nodulos)
      .map((nod) => classificarNodulo(nod).tirads)
      .filter((t): t is number => t !== null);
    if (tiradsList.length > 0) {
      const maxTirads = Math.max(...tiradsList);
      const conduta = condutaDoTirads(maxTirads);
      if (conduta) {
        conclusao.push(`Conduta sugerida (TI-RADS ${maxTirads}): ${conduta}.`);
      }
    }
  }

  const conclusaoTxt =
    conclusao.length === 1
      ? (conclusao[0] as string)
      : conclusao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
    titulo,
    "",
    COMENTARIOS,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclusaoTxt,
    "",
    RODAPE,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

/** VT = soma dos volumes (lobos + istmo) — determinístico. null se faltar. */
function volumeTotal(f: TireoideFindings): number | null {
  const vols = [f.lobo_direito.volume_ml, f.lobo_esquerdo.volume_ml, f.istmo.volume_ml];
  if (vols.some((v) => v === null)) return null;
  const total = (vols as number[]).reduce((a, b) => a + b, 0);
  return Math.round(total * 100) / 100;
}
