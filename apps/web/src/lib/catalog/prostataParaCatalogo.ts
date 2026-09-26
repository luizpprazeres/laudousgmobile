import {
  bladderStateConflicts,
  bladderInputIssues,
  normalizeBladderState,
} from '../deterministic/organs/urinaryShared'
import { lerMedidaProstataCm, lerVesiculasSeminais, prostataInputIssues } from '../deterministic/organs/prostataSuprapubica'

type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

/** Medida estrita da próstata; inválida vira `null` aqui e pendência bloqueante abaixo. */
function medidaCm(s: Secao, chave: string): number | null {
  const lida = lerMedidaProstataCm(s[chave])
  return lida === 'invalida' ? null : lida
}

const BEXIGA: Record<string, string> = {
  espessamento: 'espessamento parietal',
  trabeculacao: 'trabeculação parietal',
  calculo: 'imagem hiperecogênica com sombra acústica de permeio (cálculo)',
  diverticulo: 'imagem sacular comunicante (divertículo)',
}

export function adaptarProstataSuprapubica(estado: Estado) {
  const bexiga = secao(estado, 'bexiga')
  const bexigaDetalhada = normalizeBladderState(bexiga)
  const prostata = secao(estado, 'prostata')
  const alteracoesBexiga = Array.isArray(bexiga.achados)
    ? (bexiga.achados as unknown[])
        .filter((valor): valor is string => typeof valor === 'string')
        .map((valor) => BEXIGA[valor])
        .filter((valor): valor is string => Boolean(valor))
    : []
  const extrasProstata = Array.isArray(prostata.extra)
    ? (prostata.extra as unknown[]).filter((valor): valor is string => typeof valor === 'string')
    : []
  const aumentada = texto(prostata, 'volume') === 'aumentada'

  const pendencias = [
    ...[...bladderStateConflicts(bexigaDetalhada), ...bladderInputIssues(bexiga)].map((motivo) => ({
      onde: 'bexiga', valor: bexigaDetalhada.replecao, motivo, bloqueia: true,
    })),
    ...prostataInputIssues(prostata).map((motivo) => ({
      onde: 'próstata', valor: 'medida ou opção inválida', motivo, bloqueia: true,
    })),
  ]
  const vesiculas = lerVesiculasSeminais(secao(estado, 'vesiculas_seminais'))
  pendencias.push(...vesiculas.issues.map((motivo) => ({
    onde: 'vesículas seminais', valor: 'opção inválida', motivo, bloqueia: true,
  })))
  // Medidas parciais não são impressas pela metade: o laudo só recebe as três juntas.
  const d1 = medidaCm(prostata, 'd1')
  const d2 = medidaCm(prostata, 'd2')
  const d3 = medidaCm(prostata, 'd3')
  const completas = d1 !== null && d2 !== null && d3 !== null

  return {
    dados: {
      prostata_d1_cm: completas ? d1 : null,
      prostata_d2_cm: completas ? d2 : null,
      prostata_d3_cm: completas ? d3 : null,
      hiperplasia: aumentada,
      calcificacoes: extrasProstata.includes('calcificacoes'),
      ipp_cm: aumentada ? medidaCm(prostata, 'volume.aumentada.ipp') : null,
      bexiga_achado: alteracoesBexiga.length > 0 ? alteracoesBexiga.join(', ') : null,
      // Campos vesicais legados espelham o estado compartilhado já validado; o
      // renderer usa `bexiga_detalhada` quando presente.
      volume_pre_miccional_ml: bexigaDetalhada.volume_pre_miccional_ml,
      residuo_pos_miccional_ml: bexigaDetalhada.residuo_estado === 'valor' ? bexigaDetalhada.residuo_pos_miccional_ml : null,
      residuo_desprezivel: bexigaDetalhada.residuo_estado === 'desprezivel',
      bexiga_detalhada: bexigaDetalhada,
      // Opcional: ausente = frase normal histórica (payload igual ao antigo).
      ...(vesiculas.contrato ? { vesiculas_seminais: vesiculas.contrato } : {}),
      achados_adicionais: null,
    },
    alteracoes: [],
    pendencias,
  }
}
