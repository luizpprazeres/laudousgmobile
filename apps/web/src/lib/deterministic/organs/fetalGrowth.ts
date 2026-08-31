import type { OrganComposition, OrganModule, OrganState } from '../types'

export function criarFetalGrowthModule(category: string): OrganModule {
  return {
    schema: {
      id: 'crescimento_fetal',
      name: 'Crescimento fetal',
      category,
      fields: [{
        key: 'avaliar',
        label: 'Classificar crescimento fetal?',
        kind: 'segmented',
        options: [
          { value: 'nao', label: 'Não', isDefault: true },
          {
            value: 'sim',
            label: 'Sim',
            subFields: [
              { key: 'percentil', label: 'Percentil do peso fetal', kind: 'text', placeholder: '8', halfWidth: true },
              {
                key: 'fonte', label: 'Curva do percentil', kind: 'mini-segmented',
                options: [
                  { value: 'Intergrowth-21st', label: 'Intergrowth', isDefault: true },
                  { value: 'Hadlock 1991', label: 'Hadlock' },
                  { value: 'outra', label: 'Outra' },
                ],
              },
              { key: 'fonte_outra', label: 'Outra curva (se aplicável)', kind: 'text', placeholder: 'nome da curva' },
              {
                key: 'rcp_confirmada', label: 'RCP < p5 confirmada >12 h?', kind: 'mini-segmented',
                options: [{ value: 'nao', label: 'Não', isDefault: true }, { value: 'sim', label: 'Sim' }],
              },
              {
                key: 'acm_confirmada', label: 'ACM < p5 confirmada >12 h?', kind: 'mini-segmented',
                options: [{ value: 'nao', label: 'Não', isDefault: true }, { value: 'sim', label: 'Sim' }],
              },
              {
                key: 'ctg', label: 'Cardiotocografia', kind: 'mini-segmented',
                options: [
                  { value: 'nao_avaliada', label: 'Não avaliada', isDefault: true },
                  { value: 'normal', label: 'Normal' },
                  { value: 'patologica', label: 'Patológica' },
                ],
              },
            ],
          },
        ],
      }],
    },
    initialState: (): OrganState => ({
      avaliar: 'nao',
      'avaliar.sim.percentil': '',
      'avaliar.sim.fonte': 'Intergrowth-21st',
      'avaliar.sim.fonte_outra': '',
      'avaliar.sim.rcp_confirmada': 'nao',
      'avaliar.sim.acm_confirmada': 'nao',
      'avaliar.sim.ctg': 'nao_avaliada',
    }),
    compose: (): OrganComposition => ({ body: '', conclusion: [], isNormal: true }),
  }
}
