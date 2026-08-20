import type { AlteracaoSpec } from "../alteracoes";

/**
 * As alterações da TIREOIDE — categoria-piloto do desenho (Codex, 19/08).
 *
 * Ela foi escolhida por ser a mais difícil, não a mais fácil: o nódulo é um
 * objeto dentro de um array, com medidas, localização e seis eixos, e o escore
 * de Domingos sai da COMBINAÇÃO deles. Um desenho que só funcionasse em campos
 * booleanos não provaria nada.
 *
 * Aqui só existe o CENÁRIO: nome clínico e o patch. A frase, a conclusão e a
 * classificação continuam saindo de `renderTireoide` — que é quem sabe somar os
 * pontos e escolher a conduta. Se alguém digitasse a redação aqui, teríamos a
 * quarta cópia do texto clínico, e a que divergiria primeiro.
 *
 * As MEDIDAS destes cenários não aparecem no modelo: `previaDaAlteracao`
 * renderiza duas vezes com seeds diferentes e troca por `____` tudo o que
 * variar. Os números abaixo existem para o renderer ter o que calcular, não
 * para o médico ler.
 */

/** O lobo normal, como o modelo derivado o monta — base dos patches por lobo. */
const LOBO_NORMAL = { medidas_cm: [5.0, 1.6, 1.5], volume_ml: 6.0, ecotextura_alterada: null, nodulos: [] };

/** Um nódulo com todos os eixos preenchidos — o renderer exige a forma inteira. */
function nodulo(over: Record<string, unknown>) {
  return {
    ecogenicidade: null,
    margem: null,
    halo: null,
    forma: null,
    calcificacoes: null,
    vascularizacao: null,
    medidas_cm: null,
    diametro_transverso_cm: null,
    localizacao: null,
    descricao_raw: null,
    nota_domingos_ditada: null,
    ti_rads_ditado: null,
    ...over,
  };
}

export const ALTERACOES_TIREOIDE: AlteracaoSpec[] = [
  // ── Nódulos ──────────────────────────────────────────────────────────────
  {
    id: "nodulo_cistico_simples",
    nome: "Cisto simples",
    descricao: "Anecoico, homogêneo, de margem regular — o achado benigno mais comum.",
    grupo: "nodulo_lobo_direito",
    seed: {
      lobo_direito: {
        ...LOBO_NORMAL,
        nodulos: [
          nodulo({
            ecogenicidade: "anecoica_homogenea",
            margem: "regular",
            halo: "fino_regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
            medidas_cm: [0.9, 0.7, 0.6],
            localizacao: "no terço médio",
          }),
        ],
      },
    },
  },
  {
    id: "nodulo_solido_benigno",
    nome: "Nódulo sólido de aspecto benigno",
    descricao: "Isoecoico, margem regular, halo fino — sem critérios de suspeição.",
    grupo: "nodulo_lobo_direito",
    seed: {
      lobo_direito: {
        ...LOBO_NORMAL,
        nodulos: [
          nodulo({
            ecogenicidade: "isoecoica",
            margem: "regular",
            halo: "fino_regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
            vascularizacao: "periferica",
            medidas_cm: [1.4, 1.1, 1.0],
            localizacao: "no terço médio",
          }),
        ],
      },
    },
  },
  {
    id: "nodulo_solido_suspeito",
    nome: "Nódulo sólido com critérios de suspeição",
    descricao: "Hipoecoico, margem irregular, mais alto que largo, com microcalcificações.",
    grupo: "nodulo_lobo_direito",
    seed: {
      lobo_direito: {
        ...LOBO_NORMAL,
        nodulos: [
          nodulo({
            ecogenicidade: "hipoecoica",
            margem: "irregular",
            halo: "sem_halo",
            forma: "mais_alta_que_larga",
            calcificacoes: "micro",
            vascularizacao: "exclusiva_central",
            medidas_cm: [1.3, 1.0, 1.2],
            localizacao: "no terço superior",
          }),
        ],
      },
    },
  },
  {
    id: "nodulo_lobo_esquerdo",
    nome: "Nódulo no lobo esquerdo",
    descricao: "Um nódulo sólido isoecoico à esquerda — combina com achados do lobo direito.",
    grupo: "nodulo_lobo_esquerdo",
    seed: {
      lobo_esquerdo: {
        ...LOBO_NORMAL,
        nodulos: [
          nodulo({
            ecogenicidade: "isoecoica",
            margem: "regular",
            halo: "fino_regular",
            forma: "mais_larga_que_alta",
            calcificacoes: "sem",
            medidas_cm: [1.1, 0.8, 0.8],
            localizacao: "no terço inferior",
          }),
        ],
      },
    },
  },

  // ── Alterações difusas ───────────────────────────────────────────────────
  {
    id: "tireoidite_cronica",
    nome: "Tireoidite crônica (Hashimoto)",
    descricao: "Ecotextura difusamente heterogênea, com micronodulações.",
    grupo: "ecotextura",
    seed: {
      lobo_direito: { ...LOBO_NORMAL, ecotextura_alterada: "difusamente heterogênea, com micronodulações" },
      lobo_esquerdo: { ...LOBO_NORMAL, ecotextura_alterada: "difusamente heterogênea, com micronodulações" },
    },
  },
  {
    id: "volume_aumentado",
    nome: "Bócio (volume aumentado)",
    descricao: "Glândula de volume acima do normal.",
    grupo: "volume",
    seed: { volume_glandular: "aumentado" },
  },
  {
    id: "volume_reduzido",
    nome: "Volume reduzido",
    descricao: "Glândula hipotrófica.",
    grupo: "volume",
    seed: { volume_glandular: "reduzido" },
  },

  // ── Linfonodos ───────────────────────────────────────────────────────────
  {
    id: "linfonodos_alterados",
    nome: "Linfonodos cervicais alterados",
    descricao: "Cadeias com linfonodos de aspecto suspeito.",
    grupo: "linfonodos",
    /**
     * `linfonodos_descricao` é o VERBATIM do médico: o renderer o empurra
     * inteiro como linha do corpo (TIREOIDE.ts:910) e o repete entre
     * parênteses na conclusão (TIREOIDE.ts:627). Por isso aqui vai uma frase
     * completa, não um fragmento — um fragmento sai solto no meio do laudo.
     *
     * ⚠️ O mesmo campo servir de linha e de aposto faz a conclusão repetir
     * "Linfonodos cervicais". É aspereza do renderer, encontrada por este
     * piloto; corrigir é decisão à parte, e não cabe a um cenário.
     */
    seed: {
      linfonodos_descritos: true,
      linfonodos_alterados: true,
      linfonodos_descricao:
        "Linfonodos cervicais de aspecto arredondado, com perda do hilo ecogênico.",
    },
  },
];
