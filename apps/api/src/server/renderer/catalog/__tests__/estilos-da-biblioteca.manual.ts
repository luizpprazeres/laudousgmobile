/**
 * Gate da matriz categoria × estilo mostrada na Biblioteca.
 *
 * Um renderer que ignora `objetivo` não pode virar, por acidente, um modelo
 * objetivo idêntico ao clássico. A disponibilidade é declaração explícita e
 * o resolver precisa falhar fechado para os pares ainda não implementados.
 */
import { categoriasComModeloNormal, laudoPadraoDe } from '../modeloNormalRegistry'
import { estilosComCatalogo, resolveCatalogo } from '../registry'

const ESPERADO: Record<string, string[]> = {
  ABDOMEN_TOTAL: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  OBSTETRICA: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  DOPPLER_OBSTETRICO: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  DOPPLER_CAROTIDAS: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  MORFOLOGICO: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  TIREOIDE: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  MAMARIA: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  PELVE_FEMININA: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  ABDOMEN_SUPERIOR: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  VIAS_URINARIAS: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  PROSTATA_SUPRAPUBICA: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  CERVICAL: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  CERVICOMETRIA: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  PARTES_MOLES: ['CLASSICO_COMPLETO', 'OBJETIVO'],
  MUSCULOESQUELETICO: ['CLASSICO_COMPLETO', 'OBJETIVO'],
}

let verificacoes = 0

for (const categoria of categoriasComModeloNormal()) {
  const esperado = ESPERADO[categoria.categoria]
  if (!esperado) throw new Error(`categoria não inventariada: ${categoria.categoria}`)

  const declarado = [...categoria.estilos]
  if (JSON.stringify(declarado) !== JSON.stringify(esperado)) {
    throw new Error(`${categoria.categoria}: estilos ${JSON.stringify(declarado)}, esperado ${JSON.stringify(esperado)}`)
  }
  verificacoes++

  const resolvidos = estilosComCatalogo(categoria.categoria)
  if (JSON.stringify(resolvidos) !== JSON.stringify(esperado)) {
    throw new Error(`${categoria.categoria}: resolver anuncia ${JSON.stringify(resolvidos)}, esperado ${JSON.stringify(esperado)}`)
  }
  verificacoes++

  if (!esperado.includes('OBJETIVO')) {
    if (laudoPadraoDe(categoria.categoria, 'OBJETIVO') !== null) {
      throw new Error(`${categoria.categoria}: produziu objetivo não implementado`)
    }
    if (resolveCatalogo(categoria.categoria, 'OBJETIVO') !== undefined) {
      throw new Error(`${categoria.categoria}: resolveu catálogo objetivo não implementado`)
    }
    verificacoes += 2
  }
}

if (Object.keys(ESPERADO).length !== categoriasComModeloNormal().length) {
  throw new Error('a matriz contém categoria removida ou o registry ganhou categoria sem atualizar o gate')
}
verificacoes++

console.log(`estilos-da-biblioteca.manual: ${verificacoes} verificações passaram`)
