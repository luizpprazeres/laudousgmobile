/** Converte a figura SVG já renderizada em PNG para colagem em editores externos. */
export async function reportFigureClipboardHtml(root: HTMLDivElement | null): Promise<string> {
  const svg = root?.querySelector('svg')
  if (!svg || typeof XMLSerializer === 'undefined') return ''
  const viewBox = svg.viewBox.baseVal
  const width = Math.max(560, Math.round(viewBox.width || svg.getBoundingClientRect().width || 560))
  const height = Math.max(220, Math.round(viewBox.height || svg.getBoundingClientRect().height || 220))
  const markup = new XMLSerializer().serializeToString(svg)
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  const png = await new Promise<string>((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width * 2
      canvas.height = height * 2
      const context = canvas.getContext('2d')
      if (!context) return resolve('')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => resolve('')
    image.src = source
  })
  if (!png) return ''
  const caption = root?.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? 'Gráfico de crescimento fetal'
  return `<figure><img src="${png}" alt="Gráfico de crescimento fetal" style="display:block;width:100%;max-width:700px;height:auto"><figcaption>${caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</figcaption></figure>`
}
