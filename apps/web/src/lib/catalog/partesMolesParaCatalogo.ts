type Secao = Record<string, unknown>
type Estado = Record<string, unknown>

const secao = (estado: Estado, chave: string): Secao => {
  const valor = estado[chave]
  return valor && typeof valor === 'object' ? valor as Secao : {}
}

const texto = (s: Secao, chave: string): string =>
  typeof s[chave] === 'string' ? (s[chave] as string).trim() : ''

function medidas(bruto: string): number[] | null {
  if (!bruto) return null
  const emMm = bruto.toLowerCase().includes('mm')
  const valores = bruto
    .replaceAll(',', '.')
    .split(/[x×]/i)
    .map((parte) => Number.parseFloat(parte))
    .filter((valor) => Number.isFinite(valor) && valor > 0)
    .map((valor) => emMm ? valor / 10 : valor)
  return valores.length > 0 ? valores : null
}

const ouNulo = (valor: string): string | null => valor || null

/**
 * A tela de Partes moles já é estruturada: ela escolhe o tipo da lesão e
 * coleta os eixos descritivos. Esta ponte apenas traduz nomes de campos e
 * unidades; não interpreta o texto livre nem tenta adivinhar diagnóstico.
 */
export function adaptarPartesMoles(estado: Estado) {
  const s = secao(estado, 'partes_moles')
  const tipo = texto(s, 'lesao') || 'nenhuma'
  if (tipo === 'nenhuma') {
    return {
      dados: { regiao: null, lesoes: [], achados_adicionais: null },
      alteracoes: [],
      pendencias: [],
    }
  }

  const prefixo = `lesao.${tipo}`
  const campo = (chave: string) => texto(s, `${prefixo}.${chave}`)
  const doppler = campo('doppler')

  return {
    dados: {
      regiao: null,
      lesoes: [{
        tipo,
        ecogenicidade: ouNulo(campo('eco')),
        contornos: ouNulo(campo('contornos')),
        plano: ouNulo(campo('plano')),
        doppler: doppler && doppler !== 'na' ? doppler : null,
        conteudo: ouNulo(campo('conteudo')),
        paredes: ouNulo(campo('paredes')),
        reducao: ouNulo(campo('reducao')),
        conteudo_hernia: ouNulo(campo('conteudo_h')),
        parede_hernia: ouNulo(campo('parede')),
        tipo_hernia: ouNulo(campo('tipo_h')),
        natureza_colecao: ouNulo(campo('natureza')),
        medidas_cm: medidas(campo('medidas')),
        localizacao: ouNulo(campo('local')),
        descricao_raw: null,
      }],
      achados_adicionais: null,
    },
    alteracoes: [],
    pendencias: [],
  }
}
