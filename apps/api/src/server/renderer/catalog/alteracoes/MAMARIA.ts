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
    /**
     * O LADO é do exame, não do cenário — e o renderer já sabia disso.
     *
     * `mamaTxt` escreve "mama ____" para lado nulo, com o comentário
     * "NUNCA inventa direita". Este helper cravava `"direita"` como default e
     * todos os cenários saíam à direita, inclusive os que não tratam de
     * lateralidade: o catálogo violava a doutrina do próprio renderer.
     * (Achado do Codex, 20/08.)
     */
    lado: null,
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
    kind: "alteracao",
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
          medidas_cm: null,
          localizacao: null,
          horario: null,
        }),
      ],
    },
  },
  {
    id: "cistos_multiplos",
    nome: "Cistos múltiplos",
    kind: "alteracao",
    descricao: "Cistos simples em ambas as mamas.",
    grupo: "achado_direita",
    seed: {
      achados: [
        achado({
          tipo: "multiplos_cistos",
          lado: null,
          ecogenicidade: "anecoico",
          forma: "oval",
          orientacao: "paralela",
          margem: "circunscrita",
          posterior: "reforco",
          medidas_cm: null,
        }),
      ],
    },
  },
  {
    id: "cisto_complicado",
    nome: "Cisto complicado",
    kind: "alteracao",
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
          medidas_cm: null,
          localizacao: null,
        }),
      ],
    },
  },

  // ── Sólidos ──────────────────────────────────────────────────────────────
  {
    id: "nodulo_solido_benigno",
    nome: "Nódulo sólido de aspecto benigno",
    kind: "alteracao",
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
          medidas_cm: null,
          localizacao: null,
          horario: null,
        }),
      ],
    },
  },
  {
    id: "nodulo_solido_suspeito",
    nome: "Nódulo sólido com critérios de suspeição",
    kind: "alteracao",
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
          medidas_cm: null,
          localizacao: null,
          horario: null,
        }),
      ],
    },
  },
  {
    id: "linfonodo_intramamario",
    nome: "Linfonodo intramamário",
    kind: "alteracao",
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
          medidas_cm: null,
          localizacao: null,
        }),
      ],
    },
  },

  // ── Fora do nódulo ───────────────────────────────────────────────────────
  {
    id: "axilas_atipicas",
    nome: "Linfonodos axilares atípicos",
    kind: "alteracao",
    descricao: "Cadeias axilares com linfonodos fora do padrão — descreva no campo abaixo.",
    grupo: "axilas",
    /**
     * ⚠️ O cenário PAROU de inventar o achado.
     *
     * Ele cravava "Linfonodo axilar **à direita**, de aspecto **arredondado** e
     * com **espessamento cortical**" — lado, forma e espessamento que o médico
     * não informou ao clicar um card que diz apenas "alterados". Isso existia
     * para contornar um defeito do renderer, não porque fosse certo: com
     * `axilas_alteradas` e descrição vazia, o corpo escrevia a frase de
     * NORMALIDADE e a conclusão dizia "alterado" — o laudo se contradizia.
     *
     * O defeito foi corrigido em quatro sítios do renderer (corpo e conclusão,
     * clássico e objetivo), então o cenário volta a afirmar só o que o médico
     * afirma. A palavra "atípico" é dele: em 266 laudos de mama, o único
     * linfonodo axilar fora do padrão conclui "Linfonodo axilar atípico à
     * esquerda". (Aprovado pelo Luiz em 21/08.)
     *
     * A descrição fica como LACUNA: no corpus ele nunca publica linfonodo
     * alterado sem descrever — quando descreve, vem lado, achado e medida.
     */
    lacunas: [
      { caminho: "axilas_descricao", rotulo: "Descrição dos linfonodos axilares", tipo: "texto", esperado: true },
    ],
    seed: {
      // `titulo_com_axilas` é PRÉ-REQUISITO, não enfeite: a frase das axilas só
      // entra no corpo quando o título as inclui (MAMARIA.ts:730). Sem ele o
      // cenário não mudava nada, e `previaDaAlteracao` o descartou — que é o
      // desenho funcionando: spec que não muda o laudo some da lista.
      titulo_com_axilas: true,
      axilas_alteradas: true,
    },
  },
  {
    id: "protese",
    nome: "Portadora de prótese",
    kind: "alteracao",
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
    kind: "alteracao",
    descricao: "Mama masculina, com tecido fibroglandular retroareolar.",
    grupo: "mama_masculina",
    seed: {
      mama_masculina: true,
      achados: [achado({ tipo: "ginecomastia" })],
    },
  },
];
