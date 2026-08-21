/**
 * OS SEIS EIXOS DO NÓDULO — as opções que a tela oferece, iguais às do canônico.
 *
 * ## Por que isto existe (D2)
 *
 * Até aqui a tela pedia ao médico a **nota de Domingos** (1 a 6) e o **TI-RADS**
 * já prontos, escolhidos à mão. O renderer canônico não recebe nota: ele SOMA os
 * pontos dos seis eixos e calcula. As duas escalas não são a mesma coisa, e no
 * meio da faixa elas se invertem:
 *
 * | valor | a tela (grau 1–6) | o canônico (soma de pontos) |
 * |---|---|---|
 * | 4 | intermediárias | TI-RADS 2 → provavelmente benignas |
 * | **5** | **provavelmente malignas** | TI-RADS 2 → **provavelmente benignas** |
 * | **6** | **malignas** | TI-RADS 3 → intermediárias |
 *
 * Repassar o grau como se fosse nota trocaria "provavelmente maligna" por
 * "provavelmente benigna" no laudo. Era por isso que o nódulo estava bloqueado
 * de migrar, e é o que estas listas destravam: o médico classifica o que ele
 * VÊ, e quem pontua é o renderer.
 *
 * Escolher os eixos também é menos trabalho do que parecia: antes ele precisava
 * saber a tabela de Domingos de cabeça para converter o que via num número.
 *
 * ## A autoridade continua sendo o servidor
 *
 * Estas listas são um espelho dos enums de `apps/api/.../categories/TIREOIDE.ts`,
 * porque o `apps/web` não depende de pacote do workspace. O espelho é seguro
 * porque **os pontos não estão aqui** — só rótulo e valor. A tela nunca calcula
 * nota nem TI-RADS; ela manda os eixos e recebe o laudo pronto. Se uma chave
 * divergir, o Zod do `/render` recusa: falha visível, não número errado.
 */

export type Opcao = { value: string; label: string }

/** Nove estados, do cisto simples ao sólido. A ordem é a da tabela de Domingos. */
export const ECOGENICIDADE_EIXOS: Opcao[] = [
  { value: 'anecoica_homogenea', label: 'Anecoica homogênea' },
  { value: 'anecoica_finos_ecos', label: 'Anecoica c/ finos ecos' },
  { value: 'anecoica_septos', label: 'Anecoica c/ septos' },
  { value: 'anecoica_componentes_solidos', label: 'Anecoica c/ componentes sólidos' },
  { value: 'solida_areas_anecoicas', label: 'Sólida c/ áreas anecoicas' },
  { value: 'solida_calcificacao_parede', label: 'Sólida c/ calcificação parietal' },
  { value: 'hiperecoica', label: 'Hiperecoica' },
  { value: 'isoecoica', label: 'Isoecoica' },
  { value: 'hipoecoica', label: 'Hipoecoica' },
]

export const MARGEM_EIXOS: Opcao[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'espiculada', label: 'Espiculada' },
]

export const HALO_EIXOS: Opcao[] = [
  { value: 'fino_regular', label: 'Fino e regular' },
  { value: 'espesso_irregular', label: 'Espesso e irregular' },
  { value: 'sem_halo', label: 'Sem halo' },
]

export const FORMA_EIXOS: Opcao[] = [
  { value: 'mais_larga_que_alta', label: 'Mais larga que alta' },
  { value: 'mais_alta_que_larga', label: 'Mais alta que larga' },
]

export const CALCIFICACOES_EIXOS: Opcao[] = [
  { value: 'sem', label: 'Sem' },
  { value: 'casca_ovo', label: 'Casca de ovo' },
  { value: 'grosseiras', label: 'Grosseiras c/ sombra' },
  { value: 'micro', label: 'Microcalcificações' },
]

/**
 * Vascularização pelo padrão de Chammas. **Pontua e nunca é escrita no laudo** —
 * entra na nota, não no texto. Por isso o rótulo da tela avisa que é Doppler:
 * sem Doppler não há o que classificar, e deixar em branco é a resposta certa.
 */
export const VASCULARIZACAO_EIXOS: Opcao[] = [
  { value: 'sem', label: 'Ausente' },
  { value: 'periferica', label: 'Periférica' },
  { value: 'periferica_maior_central', label: 'Periférica > central' },
  { value: 'central_maior_periferica', label: 'Central > periférica' },
  { value: 'exclusiva_central', label: 'Exclusivamente central' },
]
