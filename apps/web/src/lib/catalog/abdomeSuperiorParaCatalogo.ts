import { adaptarAbdome, type EstadoDoAbdome } from './abdomeParaCatalogo'

/**
 * ABDOME SUPERIOR — ponte da tela genérica para o renderer canônico.
 *
 * A tela reutiliza exatamente os mesmos módulos de fígado, vesícula, vias
 * biliares, pâncreas e baço do abdome total. Aproveitamos a tradução já
 * validada e retiramos apenas as estruturas que não pertencem ao andar
 * superior. Veia porta continua sendo derivada do campo `porta` do fígado.
 */
export function adaptarAbdomeSuperior(estado: EstadoDoAbdome) {
  const base = adaptarAbdome(estado)
  const orgaosBase = base.dados.orgaos as Record<string, unknown>

  return {
    dados: {
      orgaos: {
        figado: orgaosBase.figado,
        veia_porta: orgaosBase.veia_porta,
        vesicula: orgaosBase.vesicula,
        vias_biliares: orgaosBase.vias_biliares,
        baco: orgaosBase.baco,
        pancreas: orgaosBase.pancreas,
        aorta: orgaosBase.aorta,
        veia_cava: orgaosBase.veia_cava,
      },
      observacoes_do_medico: null,
    },
    alteracoes: base.alteracoes,
    pendencias: base.pendencias,
  }
}
