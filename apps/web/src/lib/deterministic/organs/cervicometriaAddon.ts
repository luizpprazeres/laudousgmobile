import type { OrganComposition, OrganModule, OrganState } from '../types'

/**
 * Seção reutilizável: fica desligada por padrão e só então não altera o laudo.
 * Quando ativada, o adaptador envia os dados ao renderer canônico, que é a
 * autoridade sobre redação, conversões e interpretação clínica.
 */
export function criarCervicometriaAddonModule(category: string): OrganModule {
  return {
    schema: {
      id: 'cervicometria',
      name: 'Cervicometria (opcional)',
      category,
      fields: [
        {
          key: 'realizada',
          label: 'Acrescentar cervicometria',
          kind: 'segmented',
          hint: 'opcional',
          options: [
            { value: 'nao', label: 'Não', isDefault: true },
            {
              value: 'sim',
              label: 'Sim',
              subFields: [
                {
                  key: 'colo_cm',
                  label: 'Comprimento do colo OI–OE (cm; ou com "mm")',
                  kind: 'text',
                  placeholder: '3,4 ou 34 mm',
                },
                {
                  key: 'orificio',
                  label: 'Orifício interno',
                  kind: 'mini-segmented',
                  hint: 'obrigatório: sem padrão',
                  options: [
                    { value: 'fechado', label: 'Fechado' },
                    { value: 'aberto', label: 'Aberto' },
                  ],
                },
                {
                  key: 'placenta_cm',
                  label: 'Distância da placenta ao OI (cm ou mm, opcional)',
                  kind: 'text',
                  placeholder: '4,2',
                },
                {
                  key: 'placenta_distante',
                  label: 'Placenta distante, sem medida',
                  kind: 'mini-segmented',
                  options: [
                    { value: 'nao', label: 'Não', isDefault: true },
                    { value: 'sim', label: 'Sim' },
                  ],
                },
                {
                  key: 'cerclagem',
                  label: 'Cerclagem',
                  kind: 'mini-segmented',
                  options: [
                    { value: 'nao', label: 'Não', isDefault: true },
                    { value: 'sim', label: 'Sim' },
                  ],
                },
                {
                  key: 'observacoes',
                  label: 'Observação da cervicometria (opcional)',
                  kind: 'text',
                  placeholder: 'observação adicional',
                },
              ],
            },
          ],
        },
      ],
    },
    initialState: (): OrganState => ({
      realizada: 'nao',
      'realizada.sim.colo_cm': '',
      // Sem padrão: o orifício interno só é descrito depois de o médico escolher.
      'realizada.sim.orificio': '',
      'realizada.sim.placenta_cm': '',
      'realizada.sim.placenta_distante': 'nao',
      'realizada.sim.cerclagem': 'nao',
      'realizada.sim.observacoes': '',
    }),
    compose: (): OrganComposition => ({ body: '', conclusion: [], isNormal: true }),
  }
}
