/**
 * O catálogo reproduz os laudos REAIS, não só os cenários sintéticos?
 *
 * Rodar de apps/api:
 *   pnpm exec tsx --env-file=.env.local src/server/customization/equivalencia-real.manual.ts
 *
 * POR QUE ISTO EXISTE. A equivalência sintética (catalog-equivalence.manual.ts)
 * cobre 4320 combinações de 8 dimensões e é forte — mas é uma matriz que EU
 * construí. Ela não conhece a combinação que um médico de verdade produz num
 * plantão: o achado que ninguém previu, a medida no limite, o ditado que gera
 * um campo que nenhum cenário meu tem.
 *
 * Este harness fecha essa lacuna: pega os laudos obstétricos que a produção
 * gerou, remonta cada um pelo catálogo a partir dos MESMOS achados, e compara
 * byte a byte com o que o renderer produziu na hora.
 *
 * SOMENTE LEITURA. Não grava nada, não altera nada, e não expõe conteúdo
 * clínico: as divergências são reportadas por posição e trecho curto, e o
 * relatório completo fica no scratchpad (gitignorado), nunca no terminal.
 *
 * ATENÇÃO ÀS FLAGS. As flags de renderer mudam o texto, e este script lê as do
 * AMBIENTE onde roda. Um `.env.local` sem elas cai no default "false" e a
 * comparação vira ruído — na primeira execução isso deu 2/9, e com as flags de
 * produção (IG_REFERENCE_CORRECTION, FLEXIBLE_CONCLUSION, GRANNUM_PLACENTA)
 * deu 8/9. Rode assim:
 *
 *   IG_REFERENCE_CORRECTION=true FLEXIBLE_CONCLUSION=true GRANNUM_PLACENTA=true \
 *     pnpm exec tsx --env-file=.env.local src/server/customization/equivalencia-real.manual.ts
 *
 * DEPENDE de `structured_output` estar preenchido, o que só passou a acontecer
 * com o `onFindings` (em produção desde 11/08). Laudos anteriores não têm o
 * dado e são ignorados — o script diz quantos.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";
import { renderObstetricaCatalogo } from "@/server/renderer/catalog/OBSTETRICA.render";
import { stripInvalidDumLines } from "@/server/pipeline/dumValidation";
import { sanitizeDictationArtifacts } from "@/server/pipeline/dictationSanitizer";
import { normalizeMeasures } from "@/server/pipeline/measureNormalizer";
import {
  mergeBiometriaEstruturada,
  reconcileBiometriaUnidade,
} from "@/server/renderer/categories/biometriaFetal";
import { normalizeDumFormat, dedupeConclusionItems } from "@/server/pipeline/dumFormatGuard";
import type { ObstetricaFindings } from "@/server/renderer/categories/OBSTETRICA";

/** As flags como estavam em produção. Sem isto, a comparação é com outro laudo. */
function flagsDeProducao() {
  const e = env();
  return {
    objetivo: false,
    igCorrection: e.IG_REFERENCE_CORRECTION === "true",
    flexivel: e.FLEXIBLE_CONCLUSION === "true",
    grannum: e.GRANNUM_PLACENTA === "true",
  };
}

/**
 * Os guards que o pipeline aplica DEPOIS do render, sobre o texto final.
 *
 * Sem eles a comparação é injusta: o `output_text` gravado é pós-guard, e o
 * catálogo sairia "divergente" por não ter passado pelo mesmo pós-processo.
 * Foi o que aconteceu na primeira execução — a linha `DUM: 31/.` apareceu como
 * defeito do catálogo quando na verdade o RENDERER também a emite e o
 * `stripInvalidDumLines` a remove adiante (generate/route.ts:1149).
 *
 * Espelha a ordem real de `route.ts` para a família obstétrica.
 */
function guardsPosRender(texto: string): string {
  // Medido: aplicar `normalizeDumFormat` e `dedupeConclusionItems` PIORA a
  // comparação (8/9 → 3/9), o que prova que o `output_text` gravado não passou
  // por eles neste caminho. Aplicar um guard que a produção não aplicou é
  // inventar divergência.
  //
  // `sanitizeDictationArtifacts` é o oposto: a produção O APLICA (route.ts, no
  // finalText), e não aplicá-lo aqui é que inventava divergência. Ele
  // recapitaliza o início de linha, e os `achados_adicionais` do médico chegam
  // em minúscula — o laudo real saía "Genitália externa masculina" e o catálogo
  // recalculado, "genitália". Diferença do harness, não do catálogo.
  // A ORDEM é a da produção (route.ts): sanitize → medidas → strip de DUM.
  // Inverter muda o resultado — o strip remove linhas, e o sanitize colapsa
  // linhas em branco; aplicados fora de ordem, sobra ou falta uma quebra.
  return stripInvalidDumLines(normalizeMeasures(sanitizeDictationArtifacts(texto)));
}

/** Primeira linha em que dois textos divergem — para localizar sem despejar o laudo. */
/**
 * A única diferença é a concordância que o catálogo passou a acertar?
 *
 * Aplica ao texto ANTIGO a mesma correção que o formatador faz hoje. Se depois
 * disso os dois coincidem, a divergência era só essa — e é melhoria, não
 * regressão. Qualquer outra diferença sobrevive à normalização e continua
 * sendo relatada.
 */
function ehSoConcordancia(esperado: string, obtido: string): boolean {
  const corrigir = (t: string) =>
    t.replace(/\b1 dias\b/g, "1 dia").replace(/\b1 semanas\b/g, "1 semana");
  return corrigir(esperado) === corrigir(obtido) && esperado !== obtido;
}

function primeiraDivergencia(a: string, b: string): { linha: number; esperado: string; obtido: string } | null {
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return { linha: i + 1, esperado: (la[i] ?? "(fim)").slice(0, 120), obtido: (lb[i] ?? "(fim)").slice(0, 120) };
    }
  }
  return null;
}

/**
 * O laudo tem achado que o renderer CLÁSSICO ignora?
 *
 * Estes campos entraram no contrato de extração em 16/08 e só o catálogo os
 * consome. Enquanto a flag não subir, o clássico escreve normalidade por cima
 * deles — que é o defeito que ligar o catálogo corrige.
 */
function temAchadoQueOClassicoIgnora(f: ObstetricaFindings): boolean {
  const fetos = f.fetos ?? [];
  return (
    fetos.some((ft) => ft.bcf_alteracao != null) ||
    fetos.some((ft) => ft.cranio_achado != null) ||
    fetos.some((ft) => ft.cordao_vasos != null) ||
    fetos.some((ft) => ft.movimentos_fetais != null) ||
    f.placenta_achado != null ||
    f.placenta_relacao_orificio != null
  );
}

/**
 * A divergência é EXPLICADA pelo achado — ou há outra coisa junto?
 *
 * Presença de campo não basta (crítica do Codex, 19/08): um laudo pode ter
 * `cordao_vasos` preenchido E uma divergência de biometria sem relação
 * nenhuma. Classificar pela mera presença mascararia o segundo bug.
 *
 * O teste é direto: renderiza o catálogo com os campos de achado ZERADOS. Se o
 * resultado bate byte a byte com o que a produção entregou, então TODA a
 * diferença vem do achado — e só dele. Sobrou qualquer outra coisa, é
 * divergência de verdade e precisa ser investigada.
 */
function aDivergenciaEhExplicadaPeloAchado(f: ObstetricaFindings, esperado: string): boolean {
  if (!temAchadoQueOClassicoIgnora(f)) return false;
  const semAchado: ObstetricaFindings = {
    ...f,
    fetos: (f.fetos ?? []).map((ft) => ({
      ...ft,
      bcf_alteracao: null,
      cranio_achado: null,
      cranio_medida_mm: null,
      cranio_lateralidade: null,
      cordao_vasos: null,
      movimentos_fetais: null,
    })),
    placenta_achado: null,
    placenta_achado_medidas: null,
    placenta_relacao_orificio: null,
    placenta_distancia_orificio_mm: null,
  };
  try {
    return (
      guardsPosRender(renderObstetricaCatalogo({ findings: semAchado, flags: flagsDeProducao() })) ===
      esperado
    );
  } catch {
    return false;
  }
}

function descreverAchado(f: ObstetricaFindings): string {
  const partes: string[] = [];
  for (const ft of f.fetos ?? []) {
    if (ft.bcf_alteracao) partes.push(`vitalidade: ${ft.bcf_alteracao}`);
    if (ft.cranio_achado) partes.push(`crânio: ${ft.cranio_achado}`);
    if (ft.cordao_vasos) partes.push(`cordão: ${ft.cordao_vasos} vasos`);
    if (ft.movimentos_fetais) partes.push(`movimentos: ${ft.movimentos_fetais}`);
  }
  if (f.placenta_achado) partes.push(`placenta: ${f.placenta_achado}`);
  if (f.placenta_relacao_orificio) partes.push(`orifício: ${f.placenta_relacao_orificio}`);
  return partes.join(" · ") || "achado";
}

async function main() {
  const e = env();
  const sb = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("generation_audit")
    .select("id,created_at,model_writer,structured_output,output_text,system_message_full,raw_input")
    .eq("category", "OBSTETRICA")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const todos = data ?? [];
  let semAchados = 0;
  let naoRenderer = 0;
  let semTexto = 0;
  let comparados = 0;
  let iguais = 0;
  let corrigidos = 0;
  let posFlag = 0;
  const correcoes: { id: string; quando: string; achado: string }[] = [];
  const divergentes: { id: string; quando: string; linha: number; esperado: string; obtido: string }[] = [];

  for (const r of todos) {
    // Só o caminho do renderer: no writer o LLM escreve o texto e não há
    // equivalência a estabelecer.
    //
    // O caminho está na SYSTEM MESSAGE, não em `model_writer` — esta coluna
    // guarda o modelo de IA (gpt-4.1-mini, gpt-5.4-mini) mesmo quando o laudo
    // foi montado em código. Filtrar por ela descartava 100% dos laudos, e foi
    // o que a primeira versão deste script fez.
    if (!((r.system_message_full ?? "") as string).startsWith("[renderer/")) { naoRenderer++; continue; }

    const s = r.structured_output as Record<string, unknown> | null;
    if (!s || Object.keys(s).length === 0 || !("fetos" in s)) { semAchados++; continue; }

    const esperado = (r.output_text ?? "") as string;
    if (esperado.trim() === "") { semTexto++; continue; }

    // Se a personalização já estava aplicada naquele laudo, a comparação com o
    // catálogo-base não faz sentido — pula.
    if ((r.system_message_full ?? "").includes("personalização v")) continue;

    /**
     * LAUDO JÁ GERADO PELO CATÁLOGO — não serve de referência (achado do
     * Codex, 19/08).
     *
     * Depois de `MODEL_CATALOG_CATEGORIES=OBSTETRICA`, o `output_text` passa a
     * ser a saída do PRÓPRIO catálogo. Comparar o catálogo com ele é
     * tautológico: dá 100% sempre, inclusive se o catálogo estiver errado, e o
     * harness perde a única função que tem. O cohort válido é o pré-flag —
     * laudos que a produção montou com o renderer CLÁSSICO.
     */
    if ((r.system_message_full ?? "").includes("modelo: catálogo")) { posFlag++; continue; }

    let obtido: string;
    // Fora do `try` porque a classificação da divergência precisa dele depois.
    let findings: ObstetricaFindings = s as unknown as ObstetricaFindings;
    try {
      // O pipeline reconcilia a biometria ANTES de renderizar (flag
      // OBST_BIOMETRIA_DET) e entrega o resultado tanto ao renderer quanto ao
      // catálogo. Sem reproduzir isso aqui, a comparação acusaria uma
      // divergência de 10× em medida (288,9 mm × 28,9 mm) que a produção não
      // tem — foi o que apareceu na 3ª execução.
      const findingsBrutos = s as unknown as ObstetricaFindings;
      findings =
        env().OBST_BIOMETRIA_DET === "true" && typeof r.raw_input === "string"
          ? reconcileBiometriaUnidade(
              mergeBiometriaEstruturada(findingsBrutos, r.raw_input),
              r.raw_input,
            )
          : findingsBrutos;
      obtido = guardsPosRender(
        renderObstetricaCatalogo({ findings, flags: flagsDeProducao() }),
      );
    } catch (err) {
      divergentes.push({
        id: r.id as string,
        quando: (r.created_at as string).slice(0, 10),
        linha: 0,
        esperado: "(o renderer produziu texto)",
        obtido: `EXCEÇÃO: ${(err as Error).message.slice(0, 100)}`,
      });
      comparados++;
      continue;
    }

    comparados++;
    if (obtido === esperado) {
      iguais++;
    } else if (ehSoConcordancia(esperado, obtido)) {
      /**
       * SEGUNDA espécie de correção: a CONCORDÂNCIA.
       *
       * Laudos antigos saíram com "7 semanas e 1 dias". O erro estava no
       * formatador de idade gestacional, e havia um remendo em
       * `dumFormatGuard` que só valia no pipeline da IA — o caminho do
       * catálogo passava ao largo. Corrigido na origem em 21/08.
       *
       * O texto guardado continua com a forma errada, para sempre: é o que foi
       * entregue ao médico naquele dia. Contar isso como divergência marcaria
       * o catálogo de errado justamente onde ele ficou certo.
       */
      corrigidos++;
      correcoes.push({
        id: r.id as string,
        quando: (r.created_at as string).slice(0, 10),
        achado: "concordância de número (\"1 dias\" → \"1 dia\")",
      });
    } else if (aDivergenciaEhExplicadaPeloAchado(findings, esperado)) {
      /**
       * DIVERGÊNCIA ESPERADA — o catálogo está CORRIGINDO o renderer.
       *
       * O renderer clássico não conhece `bcf_alteracao`, `cranio_achado`,
       * `cordao_vasos` nem `placenta_achado`: ele os ignora e escreve a frase
       * de normalidade. Quando o médico dita um desses achados, os dois textos
       * TÊM de divergir — e a divergência é justamente o motivo de ligar o
       * catálogo.
       *
       * Contar isso como falha deixaria o harness vermelho para sempre a partir
       * do primeiro laudo com patologia, e ele perderia a única função que tem:
       * avisar quando o catálogo diverge onde NÃO deveria.
       */
      corrigidos++;
      correcoes.push({
        id: r.id as string,
        quando: (r.created_at as string).slice(0, 10),
        achado: descreverAchado(findings),
      });
    } else {
      const d = primeiraDivergencia(esperado, obtido);
      divergentes.push({
        id: r.id as string,
        quando: (r.created_at as string).slice(0, 10),
        linha: d?.linha ?? 0,
        esperado: d?.esperado ?? "",
        obtido: d?.obtido ?? "",
      });
    }
  }

  console.log(`\nEquivalência contra laudos REAIS — OBSTETRICA\n`);
  console.log(`  laudos examinados na auditoria: ${todos.length}`);
  console.log(`    fora do caminho renderer:     ${naoRenderer}`);
  console.log(`    já gerados PELO catálogo:     ${posFlag}  (pós-flag — comparação seria tautológica)`);
  console.log(`    sem achados gravados:         ${semAchados}  (anteriores ao onFindings de 11/08)`);
  console.log(`    sem texto de saída:           ${semTexto}`);
  console.log(`  COMPARADOS:                     ${comparados}`);
  console.log(`    byte-a-byte idênticos:        ${iguais}`);
  console.log(`    CORRIGIDOS pelo catálogo:     ${corrigidos}  (o clássico ignora o achado)`);
  console.log(`    divergentes (a investigar):   ${divergentes.length}`);

  if (correcoes.length > 0) {
    console.log(`\n  Laudos em que o catálogo CORRIGE o renderer:\n`);
    for (const c of correcoes) {
      console.log(`   ${c.quando}  ${c.id.slice(0, 8)}  ${c.achado}`);
    }
  }

  if (comparados === 0) {
    console.log(`
  Ainda não há laudo real com achados gravados. O \`onFindings\` entrou em
  produção em 11/08; rode de novo depois de alguns dias de uso — é este número
  que autoriza ligar MODEL_CATALOG_CATEGORIES com evidência de campo, e não só
  com a matriz sintética.
`);
    process.exit(0);
  }

  if (divergentes.length > 0) {
    console.log(`\n  Primeiras divergências (trecho curto, sem despejar o laudo):\n`);
    for (const d of divergentes.slice(0, 10)) {
      console.log(`   ${d.quando}  ${d.id.slice(0, 8)}  linha ${d.linha}`);
      console.log(`      renderer: ${d.esperado}`);
      console.log(`      catálogo: ${d.obtido}`);
    }
    if (divergentes.length > 10) console.log(`   … e mais ${divergentes.length - 10}.`);
  }

  const pct = comparados === 0 ? 0 : (100 * (iguais + corrigidos)) / comparados;
  console.log(
    `\n  ${iguais}/${comparados} byte-a-byte equivalentes` +
      (corrigidos > 0
        ? ` + ${corrigidos} divergência(s) clínica(s) INTENCIONAL(is) revisada(s)`
        : "") +
      `${divergentes.length > 0 ? ` + ${divergentes.length} A INVESTIGAR` : ""}.\n`,
  );
  if (comparados > 0 && posFlag > 0) {
    console.log(
      `  ⚠️  ${posFlag} laudo(s) já saíram do catálogo e ficaram FORA da comparação.\n` +
        `      O cohort pré-flag encolhe a cada laudo novo; quando chegar a zero,\n` +
        `      este harness deixa de medir qualquer coisa.\n`,
    );
  }
  process.exit(divergentes.length === 0 ? 0 : 1);
}

void main();
