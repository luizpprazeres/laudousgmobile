/**
 * Categoria piloto — Abdome Total.
 *
 * A Vesícula é o órgão com motor determinístico interativo (piloto). Os demais
 * órgãos entram com frase normal padrão por enquanto — serão promovidos a módulos
 * interativos nas próximas entregas. O compositor (compose.ts) monta o laudo
 * canônico completo a partir disto.
 */

import type { OrganModule } from '../types'
import { bacoModule } from './baco'
import { figadoModule } from './figado'
import { pancreasModule } from './pancreas'
import { rimDireitoModule, rimEsquerdoModule } from './rim'
import { vesiculaModule } from './vesicula'
import { viasBiliaresModule } from './viasBiliares'

/** Entrada de seção do exame: ou um módulo interativo, ou texto normal fixo. */
export interface ExamSection {
  /** Id estável (chave no estado e na sub-nav). */
  id: string
  /** Rótulo na sub-nav. */
  label: string
  /** Grupo na sub-nav (Cabeçalho / Órgãos / Conclusão). */
  group: 'cabecalho' | 'orgaos' | 'conclusao'
  /** Módulo interativo (Estado/Conteúdo/Paredes). Ausente = seção de frase fixa. */
  module?: OrganModule
  /** Frase normal padrão (para seções ainda não interativas). */
  normalBody?: string
}

export interface ExamCategory {
  id: string
  name: string
  /** Título do laudo (caixa alta). */
  title: string
  /** Bloco de TÉCNICA / COMENTÁRIOS. */
  tecnica: string
  /** Cabeçalho que abre a seção de achados. */
  achadosHeader: string
  sections: ExamSection[]
  /** Frase de fechamento quando não há nenhuma alteração para a conclusão. */
  conclusionNormal: string
}

export const abdomeTotal: ExamCategory = {
  id: 'ABDOMEN_TOTAL',
  name: 'Abdome Total',
  title: 'ULTRASSONOGRAFIA DO ABDOME TOTAL',
  tecnica:
    'Exame realizado com transdutor convexo, avaliando o abdome superior em jejum e o abdome inferior com adequada repleção vesical. Documentação fotográfica conforme protocolo.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    {
      id: 'figado',
      label: 'Fígado',
      group: 'orgaos',
      module: figadoModule,
    },
    { id: 'vesicula', label: 'Vesícula', group: 'orgaos', module: vesiculaModule },
    {
      id: 'vias_biliares',
      label: 'Vias biliares',
      group: 'orgaos',
      module: viasBiliaresModule,
    },
    {
      id: 'pancreas',
      label: 'Pâncreas',
      group: 'orgaos',
      module: pancreasModule,
    },
    {
      id: 'baco',
      label: 'Baço',
      group: 'orgaos',
      module: bacoModule,
    },
    {
      id: 'rim_direito',
      label: 'Rim direito',
      group: 'orgaos',
      module: rimDireitoModule,
    },
    {
      id: 'rim_esquerdo',
      label: 'Rim esquerdo',
      group: 'orgaos',
      module: rimEsquerdoModule,
    },
  ],
  conclusionNormal: 'Exame ultrassonográfico do abdome total dentro dos limites da normalidade.',
}

export const CATEGORIES: Record<string, ExamCategory> = {
  [abdomeTotal.id]: abdomeTotal,
}
