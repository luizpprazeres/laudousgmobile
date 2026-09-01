import type { OrganComposition, OrganModule, OrganState } from '../types'

const aortaModule: OrganModule = {
  schema: {
    id: 'aorta', name: 'Aorta', category: 'ABDOMEN_TOTAL', fields: [
      { key: 'calibre', label: 'Calibre', kind: 'segmented', options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'ectasia', label: 'Ectasia', subFields: [{ key: 'diametro', label: 'Maior diâmetro (cm)', kind: 'text', placeholder: '2,6' }] },
        { value: 'aneurisma', label: 'Aneurisma', subFields: [{ key: 'diametro', label: 'Maior diâmetro (cm)', kind: 'text', placeholder: '4,2' }] },
      ] },
      { key: 'paredes', label: 'Paredes', kind: 'segmented', options: [
        { value: 'regulares', label: 'Regulares', isDefault: true },
        { value: 'ateromatose', label: 'Ateromatose' },
      ] },
    ],
  },
  initialState: () => ({ calibre: 'normal', paredes: 'regulares', 'calibre.ectasia.diametro': '', 'calibre.aneurisma.diametro': '' }),
  compose: (state): OrganComposition => {
    const calibre = (state.calibre as string) || 'normal'
    const ateroma = state.paredes === 'ateromatose'
    const diametro = String(state[`calibre.${calibre}.diametro`] || '').trim()
    const body: string[] = []
    const conclusion: string[] = []
    if (calibre === 'aneurisma') {
      body.push(`Aorta abdominal com dilatação aneurismática${diametro ? `, medindo até ${diametro} cm` : ''}.`)
      conclusion.push(`Dilatação aneurismática da aorta abdominal${diametro ? `, medindo até ${diametro} cm` : ''}.`)
    } else if (calibre === 'ectasia') {
      body.push(`Aorta abdominal ectasiada${diametro ? `, medindo até ${diametro} cm` : ''}.`)
      conclusion.push(`Ectasia da aorta abdominal${diametro ? `, medindo até ${diametro} cm` : ''}.`)
    } else {
      body.push('Aorta abdominal de calibre normal.')
    }
    if (ateroma) {
      body.push('Observam-se imagens hiperecogênicas aderidas às suas paredes, compatíveis com placas ateromatosas.')
      conclusion.push('Placas de ateromas na aorta abdominal.')
    }
    return { body: body.join('\n'), conclusion, isNormal: calibre === 'normal' && !ateroma }
  },
}

const veiaCavaModule: OrganModule = {
  schema: {
    id: 'veia_cava', name: 'Veia cava inferior', category: 'ABDOMEN_TOTAL', fields: [
      { key: 'calibre', label: 'Calibre', kind: 'segmented', options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        { value: 'dilatada', label: 'Dilatada', subFields: [{ key: 'diametro', label: 'Calibre (cm)', kind: 'text', placeholder: '2,5' }] },
      ] },
      { key: 'conteudo', label: 'Conteúdo', kind: 'checklist', hint: 'marque se houver', options: [
        { value: 'trombo', label: 'Material trombótico', subFields: [{ key: 'local', label: 'Localização/extensão', kind: 'text', placeholder: 'segmento infra-hepático' }] },
      ] },
    ],
  },
  initialState: () => ({ calibre: 'normal', conteudo: [], 'calibre.dilatada.diametro': '', 'conteudo.trombo.local': '' }),
  compose: (state): OrganComposition => {
    const dilatada = state.calibre === 'dilatada'
    const trombo = ((state.conteudo as string[]) || []).includes('trombo')
    const diametro = String(state['calibre.dilatada.diametro'] || '').trim()
    const local = String(state['conteudo.trombo.local'] || '').trim()
    const body: string[] = [dilatada ? `Veia cava inferior de calibre aumentado${diametro ? `, medindo ${diametro} cm` : ''}.` : 'Veia cava inferior de calibre normal.']
    const conclusion: string[] = []
    if (dilatada) conclusion.push('Veia cava inferior de calibre aumentado.')
    if (trombo) {
      body.push(`Material ecogênico no interior da veia cava inferior${local ? `, no ${local}` : ''}, compatível com trombo.`)
      conclusion.push(`Material trombótico na veia cava inferior${local ? `, no ${local}` : ''}.`)
    }
    return { body: body.join('\n'), conclusion, isNormal: !dilatada && !trombo }
  },
}

export { aortaModule, veiaCavaModule }
