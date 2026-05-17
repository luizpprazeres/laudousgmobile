/**
 * Vision API client para análise de imagens de ultrassom obstétrico.
 * Port do laudousg/lib/vision/client.ts — adaptado pro padrão mobile
 * (singleton openai() em vez de new OpenAI(), sem Gemini).
 *
 * Routing por categoria:
 *   DOPPLER_OBSTETRICO  → dupla req paralela (gpt-4.1-mini biometria + gpt-4.1 Doppler)
 *   OBSTETRICA          → gpt-4.1-mini (8 campos)
 *   MORFOLOGICO         → gpt-4.1-mini (18+ campos)
 */

import type OpenAI from "openai";
import { openai } from "../ai/openai";
import { mergeBiometricData, parseVisionResponse } from "./extractor";
import type { BiometricData, Category } from "./types";

interface AnalyzeImageParams {
  imageBase64: string;
  category: Category;
  gemelar?: boolean;
}

export interface AnalyzeImageResult {
  data: BiometricData;
  model: string;
}

// ---------------------------------------------------------------------------
// Prompt builders (port 1:1 do original)
// ---------------------------------------------------------------------------

const COMMON_RULES = `
REGRAS GERAIS:
1. Extraia APENAS valores que estão na coluna de medida obtida — NÃO extraia valores de colunas "esperado", "média" ou "ref".
2. Normalize decimais: substitua vírgula por ponto (ex: 45,2 → 45.2).
3. Preserve a unidade que aparece na imagem (mm, cm, g, kg).
4. NÃO confunda datas (DD/MM/AA) ou horários com medidas.
5. Se um campo não estiver visível ou legível, omita-o do JSON — nunca invente valores.
6. Responda APENAS com o objeto JSON, sem markdown, sem texto adicional.`;

const HEADER_FIELDS_TABLE = `
CAMPOS DO CABEÇALHO DO RELATÓRIO:
| Campo JSON      | Rótulos possíveis no relatório                              |
|-----------------|-------------------------------------------------------------|
| gestAgeLMP      | GA, IG, LMP-GA, Idade Gest., Gest.Age — campo ao lado de   |
|                 | "LMP:" ou "DUM:" no topo do relatório — ex: "39w3d"         |
| gestAgeBiometry | EFW-GA, GA(EFW), IG Biometria, Est.GA, Hadlock GA —        |
|                 | campo dentro da seção EFW/Peso Fetal, próximo de "Hadlock"  |
|                 | ex: "37w3d"                                                 |

ATENÇÃO: gestAgeLMP fica no CABEÇALHO (topo do relatório).
         gestAgeBiometry fica dentro da SEÇÃO EFW/Peso Fetal, próximo de "Hadlock".
         São campos DISTINTOS — nunca misture os dois.
         Formato de saída: "Xws Yd" onde X=semanas Y=dias, ex: "37s3d", "39s0d".
         NÃO inclua "0 dias" como "37s0d" — use apenas "37s" nesse caso.`;

const WEIGHT_VARIATION_NOTE = `
ATENÇÃO — weightVariation:
No relatório, peso e variação geralmente aparecem na mesma linha do EFW:
  ex: "3118g  ±455g" → weight="3118 g", weightVariation="±455 g"
  ex: "3653g  ±533g" → weight="3653 g", weightVariation="±533 g"
O valor após ± É a variação. NÃO confunda com percentil (termina em % ou "th")
nem com S/D ratio. Normalize: "+/-" → "±".`;

function buildVisionPrompt(category: Category): string {
  if (category === "OBSTETRICA") {
    return `Você é um especialista em leitura de telas de aparelhos de ultrassom obstétrico (GE, Philips, Samsung, Mindray, Toshiba/Canon, Siemens).

Analise esta imagem e extraia as medidas biométricas fetais presentes na tabela ou lista de resultados.
${HEADER_FIELDS_TABLE}

ALIASES DE CAMPOS (o aparelho pode usar qualquer um destes rótulos):

| Campo JSON      | Rótulos que o aparelho pode exibir                              |
|-----------------|----------------------------------------------------------------|
| dbp             | DBP, BPD, DBO, D.Bip, Diam.Bip, Biparietal, Diâm.Bip          |
| cc              | CC, HC, CF.Cef, Circ.Cef, Head Circ, H.Circ, Cef               |
| ca              | CA, AC, CF.Abd, Circ.Abd, Abd Circ, A.Circ, Abd                |
| cf              | CF, FL, Femur, Fêmur, Comp.Fem, Fem.L, FemLen                  |
| weight          | PFE, EFW, Peso Est., Peso Fetal, Est.Weight, Wt, BW            |
| weightVariation | ±, +/-, Variação, Var, Margin                                  |
| percentile      | %ile, Percentil, Perc, P, %                                    |
${WEIGHT_VARIATION_NOTE}

FORMATO TÍPICO DOS VALORES:
- Biometria: "45.2 mm" ou "45,2" ou "45.2mm" → extraia como "45.2 mm"
- Peso: "1250 g" ou "1250g ± 183g" ou "1.250 g (±15%)"
- Percentil: "P50" ou "50" ou "50%" → extraia como "50"
- IG: "28s3d" ou "28w3d" ou "28+3" → extraia como "28s3d"

EXEMPLO DE SAÍDA CORRETA:
{
  "gestAgeLMP": "39s3d",
  "gestAgeBiometry": "37s3d",
  "dbp": "9.15 cm",
  "cc": "32.59 cm",
  "ca": "33.17 cm",
  "cf": "7.27 cm",
  "weight": "3118 g",
  "weightVariation": "±455 g",
  "percentile": "48"
}
${COMMON_RULES}`;
  }

  if (category === "DOPPLER_OBSTETRICO") {
    return `Você é um especialista em leitura de telas de ultrassom Doppler obstétrico (GE Voluson, Philips EPIQ, Samsung WS80A, Mindray DC-80).

Analise esta imagem e extraia as medidas biométricas e os índices Doppler presentes.

INSTRUÇÕES DE ANÁLISE — SIGA ESTA SEQUÊNCIA:

PASSO 1 — Cabeçalho:
  Localize no topo do relatório os campos GA (gestAgeLMP) e LMP/DUM.

PASSO 2 — Seção EFW/Biometria:
  Localize a seção EFW ou Peso Fetal e extraia EFW-GA (gestAgeBiometry),
  peso (weight), variação (weightVariation), percentil e biometria (BPD/DBP, HC/CC, AC/CA, FL/CF).

PASSO 3 — Localizar seções Doppler:
  Identifique cada subseção separada por artéria no relatório.
  Cada artéria tem cabeçalho como "Dir. Uterine A.", "Esq. Uterine A.",
  "Umbilical A.", "MCA" ou "ACM", "Ductus Venosus" etc.

PASSO 4 — Extrair apenas IP (PI) de cada artéria:
  Dentro de cada subseção, localize o valor rotulado "PI" ou "IP".
  Ignore completamente colunas "RI" ou "IR".
  Valores esperados para IP: 0.40–2.50. Fora desse range, omita.

PASSO 5 — ACM / MCA:
  Se aparecer dos dois lados, prefira o lado esquerdo ("Esq. MCA").
  Valores negativos em PS/ED são normais — IP da ACM é sempre positivo.

PASSO 6 — Validar:
  IP fora de [0.40–2.50]: omita do JSON (não invente, não aproxime).
${HEADER_FIELDS_TABLE}

ALIASES — BIOMETRIA:

| Campo JSON      | Rótulos possíveis                                              |
|-----------------|----------------------------------------------------------------|
| dbp             | DBP, BPD, DBO, D.Bip                                          |
| cc              | CC, HC, CF.Cef                                                 |
| ca              | CA, AC, CF.Abd                                                 |
| cf              | CF, FL, Femur                                                  |
| weight          | PFE, EFW, Peso Est.                                            |
| weightVariation | ±, +/-, Variação, Margin                                       |
| percentile      | %ile, Percentil, P                                             |
${WEIGHT_VARIATION_NOTE}

ALIASES — DOPPLER VASCULAR (IP apenas):

| Campo JSON        | Rótulos possíveis                                         |
|-------------------|----------------------------------------------------------|
| ipRightUterine    | IP/PI AUt D, Ut.D PI, AUt Dir IP                         |
| ipLeftUterine     | IP/PI AUt E, Ut.E PI, AUt Esq IP                         |
| ipUmbilical       | IP/PI AU, UA PI, Umbilical IP                            |
| ipMCA             | IP/PI ACM, MCA IP, Cerebral Média IP                     |
| ipDuctusVenosus   | IP/PI DV, Ductus Venosus IP                              |

FORMATO TÍPICO DOS VALORES:
- Índices IP: "0.65" ou "0,65" → extraia como "0.65" (2 casas decimais)

EXEMPLO DE SAÍDA CORRETA:
{
  "gestAgeLMP": "39s3d",
  "gestAgeBiometry": "37s3d",
  "dbp": "68.4 mm",
  "cc": "248.1 mm",
  "ca": "230.0 mm",
  "cf": "50.2 mm",
  "weight": "1050 g",
  "percentile": "32",
  "ipRightUterine": "0.81",
  "ipLeftUterine": "0.83",
  "ipUmbilical": "1.02",
  "ipMCA": "1.48"
}
${COMMON_RULES}`;
  }

  if (category === "MORFOLOGICO") {
    return `Você é um especialista em leitura de telas de ultrassom morfológico fetal do 2º trimestre (GE Voluson E10/E8, Philips EPIQ, Samsung WS80A, Mindray DC-80, Canon Aplio).

Analise esta imagem e extraia TODAS as medidas biométricas visíveis — principal e complementar.
${HEADER_FIELDS_TABLE}

ALIASES — BIOMETRIA PRINCIPAL:

| Campo JSON      | Rótulos possíveis                                              |
|-----------------|----------------------------------------------------------------|
| dbp             | DBP, BPD, DBO, D.Bip, Diam.Bip                                |
| cc              | CC, HC, CF.Cef, Head Circ                                      |
| ca              | CA, AC, CF.Abd, Abd Circ                                       |
| cf              | CF, FL, Femur, Fêmur, FemLen                                   |
| weight          | PFE, EFW, Peso Est., Est.Weight                                |
| weightVariation | ±, +/-, Variação, Margin                                       |
| percentile      | %ile, Percentil, P, %                                          |
${WEIGHT_VARIATION_NOTE}

ALIASES — BIOMETRIA COMPLEMENTAR:

| Campo JSON        | Rótulos possíveis                                         |
|-------------------|----------------------------------------------------------|
| tibia             | TIB, Tíbia, TIBIA, Tibia                                 |
| fibula            | FIB, Fíbula, FIBULA, Fibula, FB                          |
| humerus           | UM, ÚM, HUM, HUMERUS, Húmero, Humerus                   |
| radius            | RD, RAD, RADIUS, Rádio, Radius                           |
| ulna              | UL, ULNA, Ulna                                           |
| cerebellum        | TCD, CEREB, Cerebelo, Cerebellum, TransCereb             |
| cisternaMagna     | CM, CIS.MAG, Cisterna Magna, Cist.Magna                  |
| binocularDistance | DB, BOD, Dist.Bin, Binocular, Interorb                   |
| ila               | ILA, AFI, LA Index, Liq.Amn, Líq.Amn                    |
| gender            | Sexo, Sex, Gender — use "masculino" ou "feminino"        |

FORMATO TÍPICO DOS VALORES:
- Ossos longos: "28.5 mm" ou "28,5mm"
- Cerebelo/CM: "24.1 mm"
- ILA: "14.2 cm" (soma dos 4 quadrantes)
- Genitália: o aparelho pode não mostrar — extraia somente se aparecer explicitamente

EXEMPLO DE SAÍDA CORRETA (morfológico 2T com biometria completa):
{
  "gestAgeLMP": "21s4d",
  "gestAgeBiometry": "21s2d",
  "dbp": "49.8 mm",
  "cc": "181.5 mm",
  "ca": "165.2 mm",
  "cf": "36.4 mm",
  "weight": "480 g",
  "weightVariation": "±70 g",
  "percentile": "52",
  "tibia": "33.1 mm",
  "fibula": "31.8 mm",
  "humerus": "34.2 mm",
  "radius": "28.6 mm",
  "ulna": "30.4 mm",
  "cerebellum": "22.3 mm",
  "cisternaMagna": "5.8 mm",
  "binocularDistance": "38.1 mm",
  "ila": "17.4 cm"
}
${COMMON_RULES}`;
  }

  throw new Error(`Análise de imagem não suportada para categoria: ${category}`);
}

function buildBiometryForDopplerPrompt(): string {
  return `Você é especialista em leitura de telas de ultrassom obstétrico.
Analise esta imagem e extraia APENAS as medidas biométricas fetais e os dados do cabeçalho.
NÃO extraia índices Doppler (RI, PI, S/D) — ignore completamente essa parte do relatório.

CAMPOS DO CABEÇALHO:
| Campo JSON      | Rótulos possíveis                                          |
|-----------------|------------------------------------------------------------|
| gestAgeLMP      | GA, IG, LMP-GA — campo ao lado de "LMP:" ou "DUM:" no topo|
| gestAgeBiometry | EFW-GA, GA(EFW), Hadlock GA — dentro da seção EFW/Peso     |

Formato de IG: "Xws Yd" → "37s3d". Use "37s" se dias = 0.

CAMPOS DE BIOMETRIA:
| Campo JSON      | Rótulos possíveis                                              |
|-----------------|----------------------------------------------------------------|
| dbp             | DBP, BPD, DBO, D.Bip, Diam.Bip                                |
| cc              | CC, HC, CF.Cef, Head Circ                                      |
| ca              | CA, AC, CF.Abd, Abd Circ                                       |
| cf              | CF, FL, Femur, Fêmur                                           |
| weight          | PFE, EFW, Peso Est., Peso Fetal                                |
| weightVariation | ±, +/-, Variação — valor após ± na linha do EFW                |
| percentile      | %ile, Percentil, P, %                                          |

REGRAS:
1. Extraia APENAS valores da coluna de medida obtida — não de "esperado" ou "ref".
2. Normalize decimais: vírgula → ponto (45,2 → 45.2). Preserve a unidade original.
3. Normalize weightVariation: "+/-" → "±".
4. Se não visível, omita — nunca invente.
5. Responda APENAS com JSON, sem markdown.

EXEMPLO:
{
  "gestAgeLMP": "39s3d",
  "gestAgeBiometry": "37s3d",
  "dbp": "68.4 mm",
  "cc": "248.1 mm",
  "ca": "230.0 mm",
  "cf": "50.2 mm",
  "weight": "1050 g",
  "weightVariation": "±155 g",
  "percentile": "32"
}`;
}

function buildDopplerOnlyPrompt(): string {
  return `Você é especialista em Doppler obstétrico.
Analise esta imagem e extraia SOMENTE o IP (Índice de Pulsatilidade / PI) de cada artéria.
NÃO extraia RI/IR nem biometria (DBP, HC, AC, FL, peso) — ignore completamente essas partes.

SIGA ESTA SEQUÊNCIA DE PASSOS:

PASSO 0 — Identifique as artérias visíveis:
  Antes de extrair qualquer valor, identifique QUAIS artérias estão nomeadas explicitamente no relatório.
  Mapeamento de rótulos para campos JSON:
    "Ut.D", "Art.Uterina D", "AUt Dir", "Right Uterine" → ipRightUterine
    "Ut.E", "Art.Uterina E", "AUt Esq", "Left Uterine"  → ipLeftUterine
    "Umbilical A.", "AU", "UA", "Umbilical"              → ipUmbilical
    "ACM", "MCA", "Cerebral Média", "Mid.Cerebral"       → ipMCA
    "Ductus Venosus", "DV", "D.Venosus"                  → ipDuctusVenosus
  REGRA FUNDAMENTAL: extraia IP SOMENTE de artérias identificadas pelo nome.
  Se um valor estiver presente mas a artéria NÃO estiver nomeada → não extraia.

PASSO 1 — Extrair IP por artéria identificada:
  Para cada artéria identificada no PASSO 0, localize a coluna "PI" ou "IP" naquela subseção.
  Ignore colunas "RI", "IR", "S/D" ou "EDV" — leia APENAS "PI" ou "IP".

PASSO 2 — ACM/MCA com dois lados:
  Se aparecer ACM direita e esquerda, prefira o lado esquerdo ("Esq. MCA").

PASSO 3 — Validar e normalizar:
  Valores esperados para IP: 0.40–2.50. Fora desse range → omita.
  Normalize decimais: vírgula → ponto (0,65 → 0.65).

CAMPOS A EXTRAIR:
| Campo JSON        | Rótulos na imagem                                         |
|-------------------|-----------------------------------------------------------|
| ipRightUterine    | PI/IP Art.Uterina D / Ut.D PI / AUt Dir IP               |
| ipLeftUterine     | PI/IP Art.Uterina E / Ut.E PI / AUt Esq IP               |
| ipUmbilical       | PI/IP Art.Umbilical / AU PI / UA IP / Umbilical IP        |
| ipMCA             | PI/IP ACM / MCA IP / Cerebral Média IP                    |
| ipDuctusVenosus   | PI/IP DV / Ductus Venosus IP                              |

REGRAS FINAIS:
1. Leia SEMPRE pelo RÓTULO "PI" ou "IP" — ignore colunas "RI" ou "IR".
2. Extraia somente artérias nomeadas explicitamente (PASSO 0).
3. Se não estiver visível, omita — nunca invente.
4. Responda APENAS com JSON. Se não houver Doppler visível, retorne {}.

EXEMPLO:
{
  "ipRightUterine": "0.81",
  "ipLeftUterine": "0.83",
  "ipUmbilical": "1.02",
  "ipMCA": "1.48",
  "ipDuctusVenosus": "0.72"
}`;
}

// ---------------------------------------------------------------------------
// Doppler — dupla requisição paralela
// ---------------------------------------------------------------------------

async function analyzeDopplerObstetrico(
  imageBase64: string,
  gemelar?: boolean,
): Promise<AnalyzeImageResult> {
  const gemelarNote = gemelar
    ? '\n\nATENÇÃO — GESTAÇÃO GEMELAR: Esta é uma gestação gemelar. As imagens podem conter dados de FETO A (ou Feto 1) e FETO B (ou Feto 2). Extraia e identifique os dados de cada feto separadamente quando possível.'
    : "";

  const makeContent = (promptText: string) => [
    { type: "text" as const, text: promptText + gemelarNote },
    {
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`,
        detail: "high" as const,
      },
    },
  ];

  const client = openai();

  const [biometryRes, dopplerRes] = await Promise.allSettled([
    client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Responda APENAS com JSON válido, sem markdown." },
        { role: "user", content: makeContent(buildBiometryForDopplerPrompt()) },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 400,
    }),
    client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "Responda APENAS com JSON válido, sem markdown." },
        { role: "user", content: makeContent(buildDopplerOnlyPrompt()) },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 400,
    }),
  ]);

  const parseOrEmpty = (
    res: PromiseSettledResult<OpenAI.Chat.ChatCompletion>,
  ): BiometricData => {
    if (res.status === "rejected") {
      console.error("[Doppler parallel] request failed:", res.reason);
      return {};
    }
    const content = res.value.choices[0]?.message?.content;
    if (!content) return {};
    try {
      return parseVisionResponse(content, "DOPPLER_OBSTETRICO");
    } catch {
      return {};
    }
  };

  return {
    data: mergeBiometricData(
      [parseOrEmpty(biometryRes), parseOrEmpty(dopplerRes)],
      { dopplerAware: true },
    ),
    model: "gpt-4.1-mini + gpt-4.1 (paralelo)",
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function analyzeImage({
  imageBase64,
  category,
  gemelar,
}: AnalyzeImageParams): Promise<AnalyzeImageResult> {
  if (
    category !== "OBSTETRICA" &&
    category !== "DOPPLER_OBSTETRICO" &&
    category !== "MORFOLOGICO"
  ) {
    throw new Error(`Análise de imagem não suportada para categoria: ${category}`);
  }

  if (category === "DOPPLER_OBSTETRICO") {
    return analyzeDopplerObstetrico(imageBase64, gemelar);
  }

  let prompt = buildVisionPrompt(category);
  if (gemelar) {
    prompt += `\n\nATENÇÃO — GESTAÇÃO GEMELAR: Esta é uma gestação gemelar. As imagens podem conter dados de FETO A (ou Feto 1) e FETO B (ou Feto 2). Extraia e identifique os dados de cada feto separadamente quando possível. Prefixe os valores com "Feto A:" e "Feto B:" nos campos correspondentes.`;
  }
  const model = "gpt-4.1-mini";

  try {
    const response = await openai().chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "Você é um especialista em extração de dados de imagens de ultrassom. Responda APENAS com JSON válido, sem markdown, sem texto adicional.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 1200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Vision API returned empty response");
    }

    return { data: parseVisionResponse(content, category), model };
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401) {
      throw new Error("Erro de autenticação com o serviço de análise");
    }
    if (err?.status === 429) {
      throw new Error("Limite de requisições atingido. Aguarde 1 minuto.");
    }
    if (err?.status === 503) {
      throw new Error("Serviço de análise temporariamente indisponível");
    }
    if (
      err?.code === "ENOTFOUND" ||
      err?.code === "ECONNREFUSED" ||
      err?.code === "ETIMEDOUT" ||
      err?.message?.includes("network") ||
      err?.message?.includes("fetch failed")
    ) {
      throw new Error("Erro ao analisar imagem. Tente novamente.");
    }
    if (err?.message?.includes("extrair dados")) {
      throw error;
    }
    console.error("[vision/client] Vision API error:", error);
    throw new Error("Erro ao analisar imagem. Tente novamente.");
  }
}
