/** SVGs viram PNG para colagem em editores que não aceitam vetores. */
async function svgClipboardPng(svg: SVGSVGElement): Promise<string> {
  const viewBox = svg.viewBox.baseVal
  const width = Math.max(560, Math.round(viewBox.width || svg.clientWidth || 560))
  const height = Math.round(width * (viewBox.height || svg.clientHeight || 220) / (viewBox.width || svg.clientWidth || 560))
  const cleanSvg = svg.cloneNode(true) as SVGSVGElement
  cleanSvg.querySelectorAll('.clinical-doppler-explore').forEach(node => node.remove())
  const markup = new XMLSerializer().serializeToString(cleanSvg)
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * 2; canvas.height = height * 2
      const context = canvas.getContext('2d')
      if (!context) return resolve('')
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => resolve('')
    image.src = source
  })
}
const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function reportFigureClipboardHtml(root: HTMLDivElement | null): Promise<string> {
  if (!root || typeof XMLSerializer === 'undefined') return ''
  const page = root.querySelector<HTMLElement>('[data-clinical-page]')
  if (page) {
    // Inclui todos os vasos, crescimento, tabela de trissomias e MoM. Funciona
    // mesmo com o <details> recolhido: SVG possui viewBox independente do layout.
    const clone = page.cloneNode(true) as HTMLElement
    const sources = Array.from(page.querySelectorAll<SVGSVGElement>('svg[role="img"]'))
    const targets = Array.from(clone.querySelectorAll('svg[role="img"]'))
    for (let i = 0; i < sources.length; i++) {
      const png = await svgClipboardPng(sources[i]!)
      if (!png) throw new Error('Não foi possível copiar todos os gráficos. Tente novamente.')
      const img = document.createElement('img')
      img.src = png
      img.alt = sources[i]!.getAttribute('aria-label') ?? 'Gráfico clínico'
      img.style.cssText = 'display:block;width:100%;max-width:700px;height:auto'
      targets[i]!.replaceWith(img)
    }
    clone.querySelectorAll('.clinical-doppler-status').forEach(status => status.remove())
    clone.querySelectorAll('svg[aria-hidden="true"]').forEach(svg => svg.remove())
    clone.querySelectorAll('style').forEach(style => style.remove())
    return `<section style="font:12px/1.4 Arial,sans-serif;color:#0f172a">${clone.innerHTML}</section>`
  }
  const svg = root.querySelector<SVGSVGElement>('svg')
  if (!svg) return ''
  const png = await svgClipboardPng(svg)
  if (!png) return ''
  const caption = root.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? 'Gráfico de crescimento fetal'
  return `<figure><img src="${png}" alt="Gráfico de crescimento fetal" style="display:block;width:100%;max-width:700px;height:auto"><figcaption>${escapeHtml(caption)}</figcaption></figure>`
}
