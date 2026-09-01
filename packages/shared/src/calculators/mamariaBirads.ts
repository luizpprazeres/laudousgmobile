/**
 * Dados morfológicos usados para sugerir uma categoria BI-RADS mamária.
 *
 * A função só produz uma sugestão. A confirmação e a responsabilidade pela
 * categoria final permanecem com o médico e são tratadas pela interface.
 */
export type MamariaBiradsInput = {
  tipo: string;
  forma?: string | null;
  margem?: string | null;
  orientacao?: string | null;
  posterior?: string | null;
  calcificacoes?: string | null;
};

export function sugerirBiradsMamaria(a: MamariaBiradsInput): string | null {
  switch (a.tipo) {
    case "ginecomastia":
    case "proteses":
      return null;
    case "cisto_simples":
    case "multiplos_cistos":
    case "linfonodo_intramamario":
      return "2";
    case "microcistos_agrupados":
    case "cisto_complicado":
      return "3";
    case "calcificacoes":
      return a.calcificacoes === "em_nodulo" ||
        a.calcificacoes === "microcalcificacoes" ||
        a.calcificacoes === "intraductais"
        ? "4"
        : "2";
    case "achado_nao_nodular":
      return "4";
    case "nodulo_solido": {
      const benigno =
        a.forma === "oval" &&
        a.margem === "circunscrita" &&
        a.orientacao === "paralela" &&
        a.posterior !== "sombra" &&
        a.calcificacoes !== "em_nodulo" &&
        a.calcificacoes !== "microcalcificacoes";
      if (benigno) return "3";

      const fortes =
        (a.margem === "espiculada" ? 1 : 0) +
        (a.forma === "irregular" ? 1 : 0) +
        (a.calcificacoes === "microcalcificacoes" || a.calcificacoes === "em_nodulo" ? 1 : 0) +
        (a.posterior === "sombra" && a.orientacao === "nao_paralela" ? 1 : 0);
      const moderadas =
        (a.margem === "microlobulada" || a.margem === "angular" || a.margem === "indistinta" ? 1 : 0) +
        (a.orientacao === "nao_paralela" ? 1 : 0) +
        (a.posterior === "sombra" ? 1 : 0);

      if (fortes >= 2) return "5";
      if (fortes === 1) return "4C";
      if (moderadas >= 2) return "4B";
      return "4A";
    }
    default:
      return null;
  }
}
