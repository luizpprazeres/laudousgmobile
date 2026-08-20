import type { AlteracaoSpec } from "../alteracoes";

/**
 * As alterações da MAMÁRIA — a segunda categoria, e a prova de que o desenho
 * generaliza.
 *
 * A tireoide provou o mecanismo com o escore de Domingos. A mamária o repete
 * com **outra** classificação calculada, o BI-RADS, montada a partir de outros
 * eixos (forma, orientação, margem, sombra acústica). Se o desenho só soubesse
 * lidar com um esquema de pontuação, seria acaso; funcionando nos dois, é
 * arquitetura.
 *
 * Como na tireoide, aqui só existe o CENÁRIO. Nenhuma frase clínica é escrita:
 * `renderMamaria` continua sendo o único autor do texto, da categoria BI-RADS e
 * da conduta.
 *
 * As MEDIDAS não aparecem no modelo — `previaDaAlteracao` renderiza duas vezes
 * e troca por `____` tudo o que variar entre os dois. Os números existem para o
 * renderer ter o que calcular.
 */

/** Um achado com todos os eixos presentes — o renderer espera a forma inteira. */
function achado(over: Record<string, unknown>) {
  return {
    tipo: "nodulo_solido",
    lado: "direita",
    ecogenicidade: null,
    forma: null,
    orientacao: null,
    margem: null,
    posterior: null,
    calcificacoes: null,
    elasticidade: null,
    descritores: null,
    medidas_cm: null,
    medida_invalida: null,
    localizacao: null,
    horario: null,
    dist_pele_cm: null,
    dist_mamilo_cm: null,
    descricao_nao_nodular: null,
    birads_ditado: null,
    ...over,
  };
}

export const ALTERACOES_MAMARIA: AlteracaoSpec[] = [
  // ── Císticos ─────────────────────────────────────────────────────────────
  {
    id: "cisto_simples",
    nome: "Cisto simples",
    descricao: "Anecoico, circunscrito, com reforço acústico — o achado benigno mais comum.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "cisto_simples",
          ecogenicidade: "anecoico",
          forma: "oval",
          orientacao: "paralela",
          margem: "circunscrita",
          posterior: "reforco",
          calcificacoes: "sem",
          medidas_cm: [1.2, 0.9, 0.8],
          localizacao: "no quadrante superior lateral",
          horario: "10 horas",
        }),
      ],
    },
  },
  {
    id: "cistos_multiplos",
    nome: "Cistos múltiplos",
    descricao: "Cistos simples em ambas as mamas.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "multiplos_cistos",
          lado: "bilateral",
          ecogenicidade: "anecoico",
          forma: "oval",
          orientacao: "paralela",
          margem: "circunscrita",
          posterior: "reforco",
          medidas_cm: [0.8, 0.6, 0.6],
        }),
      ],
    },
  },
  {
    id: "cisto_complicado",
    nome: "Cisto complicado",
    descricao: "Conteúdo espesso, com finos ecos em suspensão.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "cisto_complicado",
          ecogenicidade: "hipoecoico",
          forma: "oval",
          orientacao: "paralela",
          margem: "circunscrita",
          posterior: "reforco",
          medidas_cm: [1.4, 1.0, 0.9],
          localizacao: "no quadrante superior medial",
        }),
      ],
    },
  },

  // ── Sólidos ──────────────────────────────────────────────────────────────
  {
    id: "nodulo_solido_benigno",
    nome: "Nódulo sólido de aspecto benigno",
    descricao: "Oval, paralelo à pele, circunscrito — o padrão do fibroadenoma.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "nodulo_solido",
          ecogenicidade: "hipoecoico",
          forma: "oval",
          orientacao: "paralela",
          margem: "circunscrita",
          posterior: "nenhuma",
          calcificacoes: "sem",
          medidas_cm: [1.6, 1.1, 1.0],
          localizacao: "no quadrante superior lateral",
          horario: "10 horas",
        }),
      ],
    },
  },
  {
    id: "nodulo_solido_suspeito",
    nome: "Nódulo sólido com critérios de suspeição",
    descricao: "Irregular, não paralelo, margem espiculada e sombra acústica posterior.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "nodulo_solido",
          ecogenicidade: "hipoecoico",
          forma: "irregular",
          orientacao: "nao_paralela",
          margem: "espiculada",
          posterior: "sombra",
          calcificacoes: "microcalcificacoes",
          medidas_cm: [1.3, 1.1, 1.2],
          localizacao: "no quadrante superior lateral",
          horario: "11 horas",
        }),
      ],
    },
  },
  {
    id: "linfonodo_intramamario",
    nome: "Linfonodo intramamário",
    descricao: "Achado habitual, com hilo ecogênico preservado.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "linfonodo_intramamario",
          ecogenicidade: "hipoecoico",
          forma: "oval",
          orientacao: "paralela",
          margem: "circunscrita",
          medidas_cm: [0.7, 0.4, 0.4],
          localizacao: "no quadrante superior lateral",
        }),
      ],
    },
  },

  // ── Fora do nódulo ───────────────────────────────────────────────────────
  {
    id: "axilas_alteradas",
    nome: "Linfonodos axilares alterados",
    descricao: "Cadeias axilares com linfonodos de aspecto suspeito.",
    grupo: "axilas",
    /**
     * `axilas_descricao` é o VERBATIM do médico — o renderer o usa como frase.
     * Fragmento sai solto no meio do laudo, como aconteceu com os linfonodos
     * cervicais da tireoide.
     */
    seed: {
      // `titulo_com_axilas` é PRÉ-REQUISITO, não enfeite: a frase das axilas só
      // entra no corpo quando o título as inclui (MAMARIA.ts:730). Sem ele o
      // cenário não mudava nada, e `previaDaAlteracao` o descartou — que é o
      // desenho funcionando: spec que não muda o laudo some da lista.
      titulo_com_axilas: true,
      axilas_alteradas: true,
      axilas_descricao:
        "Linfonodo axilar à direita, de aspecto arredondado e com espessamento cortical.",
    },
  },
  {
    id: "protese",
    nome: "Portadora de prótese",
    // `com_protese` troca o bloco de COMENTÁRIOS (MAMARIA.ts:704) e nada mais —
    // é uma alteração de técnica, não de achado. O nome diz isso, para o médico
    // não esperar uma frase no corpo que não vem.
    descricao: "Troca o texto de técnica do exame. Não descreve achado.",
    grupo: "protese",
    /**
     * ⚠️ SÓ NO CLÁSSICO — e isto é um buraco do renderer, não do cenário.
     *
     * `renderMamariaObjetivo` monta a técnica apenas a partir de
     * `titulo_com_axilas` (MAMARIA.ts:854): no estilo objetivo, uma paciente
     * com prótese recebe o texto de técnica de quem não tem. O cenário se
     * declara para não aparecer numa lista onde clicar não faria nada.
     */
    estilos: ["CLASSICO_COMPLETO"],
    seed: { com_protese: true },
  },
  {
    id: "ginecomastia",
    nome: "Ginecomastia",
    descricao: "Mama masculina, com tecido fibroglandular retroareolar.",
    grupo: "mama_masculina",
    seed: {
      mama_masculina: true,
      achados: [achado({ tipo: "ginecomastia", lado: "bilateral" })],
    },
  },
];
